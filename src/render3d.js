// render3d.js — WebGL/three.js renderer for VICE GRID.
//
// Reads exactly the same world state as the 2D renderer and never mutates it,
// so combat, arrests, AI and missions are untouched by the switch. Mapping:
// world (x, y) top-down  ->  three (x, height, y), with +Y up.
//
// Performance notes for integrated GPUs: static geometry is instanced and built
// once per mission, neon is carried by emissive materials + bloom rather than
// by real lights (only the nearest few become point lights), bloom runs at
// half resolution.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TILE } from './world.js';
import { WEAPONS } from './combat.js';
import { VEHICLE_TYPES } from './vehicles.js';

const WALL_H = 78;
// Every extra point light is a full per-fragment cost on integrated graphics;
// 6 nearest signs is the measured sweet spot (10 cost ~30ms/frame on Iris Xe).
const MAX_NEON_LIGHTS = 6;

const NEON = ['#31d3ff', '#ff4fd8', '#ffd94f', '#58d0ba', '#9dff57', '#ff8a3d'];
const SIGN_SETS = {
  street: [['HALCYON', '#31d3ff'], ['GLOW⁰', '#9dff57'], ['NOODLE-24', '#ff8a3d'],
    ['CREDIT NOW', '#ffd94f'], ['BAIL BONDS', '#ff4fd8'], ['QUICKCELL', '#58d0ba'],
    ['PAWN + AMMO', '#ffd94f'], ['LIVE ODDS', '#ff4fd8']],
  industrial: [['NO NAKED FLAME', '#ff5f5f'], ['LINE 3 — PRESSURISED', '#31d3ff'],
    ['AUTHORISED ONLY', '#ffd94f'], ['WEAR RESPIRATOR', '#58d0ba'],
    ['HALCYON PROCESS', '#31d3ff'], ['GLOW⁰ DECANT', '#9dff57']],
};
const SKINS = ['#e8c39e', '#c68e5f', '#8d5524', '#f1d5b8', '#a56a3f'];
const CIV_OUTFITS = ['#8d95a8', '#a89b8d', '#7d96a0', '#a08d99', '#96a08d', '#9a8da8'];

// ---------------------------------------------------------------- labels
//
// Diegetic UI (HANDS UP, cuff rings, E-prompts) is not decoration: in a
// perspective view you cannot judge ground distance the way you can top-down,
// so the affordance IS the mechanic. Sprites billboard to camera; textures are
// cached by text+colour because the same few strings recur constantly.

const labelCache = new Map();

function labelTexture(text, color) {
  const k = text + '|' + color;
  if (labelCache.has(k)) return labelCache.get(k);
  const pad = 14, fs = 30;
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = `bold ${fs}px "Segoe UI", sans-serif`;
  const tw = Math.ceil(probe.measureText(text).width);
  const c = document.createElement('canvas');
  c.width = tw + pad * 2; c.height = fs + pad;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(4,6,12,0.82)';
  g.beginPath(); g.roundRect(0, 0, c.width, c.height, 10); g.fill();
  g.strokeStyle = color; g.lineWidth = 2;
  g.beginPath(); g.roundRect(1, 1, c.width - 2, c.height - 2, 10); g.stroke();
  g.font = `bold ${fs}px "Segoe UI", sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = color;
  g.fillText(text, c.width / 2, c.height / 2 + 1);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  labelCache.set(k, { tex: t, w: c.width, h: c.height });
  return labelCache.get(k);
}

function setLabel(sprite, text, color) {
  if (sprite.userData.key === text + color) return;
  sprite.userData.key = text + color;
  const { tex, w, h } = labelTexture(text, color);
  sprite.material.map = tex;
  sprite.material.needsUpdate = true;
  sprite.scale.set(w * 0.42, h * 0.42, 1);
}

function makeLabelSprite() {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, transparent: true }));
  s.renderOrder = 999;
  s.userData = { key: null };
  return s;
}

function shadeHex(hex, f) {
  const n = parseInt(String(hex).slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return (r << 16) | (g << 8) | b;
}

function hash(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

let R = null;

// ---------------------------------------------------------------- init

function init(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(canvas.width, canvas.height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#070a12');
  // fog must start beyond the camera's own 620-unit standoff, or the entire
  // scene sits inside the fog ramp and greys out
  scene.fog = new THREE.Fog('#070a12', 950, 2400);

  const camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 10, 3000);

  // Night city key light: cold moon from the north-west.
  // Intensities below are in physical units (three r155+). Directional light is
  // distance-independent, but every point light is inverse-square over a world
  // measured in PIXELS (48 = 1 tile), so their intensities must be scaled by
  // distance squared — hence the five-figure values, not the usual 1-10.
  const key = new THREE.DirectionalLight('#9fc4ff', 2.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 50;
  key.shadow.camera.far = 1800;
  const S = 640;
  key.shadow.camera.left = -S; key.shadow.camera.right = S;
  key.shadow.camera.top = S; key.shadow.camera.bottom = -S;
  key.shadow.bias = -0.0015;
  key.shadow.normalBias = 2;
  scene.add(key, key.target);

  // Warm rim from the opposite side of the key: a two-tone night (cold moon vs
  // sodium streetlight) is what stops everything reading as one blue smear.
  const rim = new THREE.DirectionalLight('#ff9a4d', 1.1);
  rim.position.set(500, 260, 400);
  scene.add(rim);

  scene.add(new THREE.HemisphereLight('#3a5488', '#241426', 1.7));
  scene.add(new THREE.AmbientLight('#2a3d5e', 0.9));

  const neonLights = [];
  for (let i = 0; i < MAX_NEON_LIGHTS; i++) {
    const l = new THREE.PointLight('#ffffff', 0, 420, 2);
    scene.add(l);
    neonLights.push(l);
  }
  const flashLight = new THREE.PointLight('#ffd98a', 0, 520, 2);
  scene.add(flashLight);
  const blastLight = new THREE.PointLight('#ff9a3d', 0, 900, 2);
  scene.add(blastLight);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(canvas.width / 2, canvas.height / 2), 0.7, 0.6, 0.78);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  R = {
    renderer, scene, camera, composer, bloom, key, neonLights, flashLight, blastLight,
    missionKey: null, statics: new THREE.Group(), signs: [],
    bodies: new Map(), vehicles: new Map(), props: new Map(), blasts: new Map(),
    bullets: null,
    ray: new THREE.Raycaster(), groundPlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    mat: null,
    tmp: new THREE.Vector3(), tmp2: new THREE.Vector2(),
  };
  R.mat = makeMaterials();
  scene.add(R.statics);
  return R;
}

// Façade texture: concrete with a window grid, plus a matching emissive map so
// occupied windows genuinely glow (and feed the bloom). Three variants are
// generated so a wall run reads as separate buildings rather than one extrusion.
function makeWallTexture(variant) {
  const S = 128;
  const c = document.createElement('canvas'); c.width = S; c.height = S;
  const e = document.createElement('canvas'); e.width = S; e.height = S;
  const g = c.getContext('2d');
  const q = e.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S);            // white: instance colour tints it
  q.fillStyle = '#000000'; q.fillRect(0, 0, S, S);            // black: unlit by default

  for (let i = 0; i < 700; i++) {                              // concrete grain
    g.fillStyle = `rgba(0,0,0,${Math.random() * 0.16})`;
    g.fillRect(Math.random() * S, Math.random() * S, 2, 2);
  }
  const cols = [3, 4, 2][variant], rows = [3, 3, 4][variant];
  const pad = 10;
  const wW = (S - pad * (cols + 1)) / cols, wH = (S - pad * (rows + 1)) / rows;
  const warm = ['#ffca6b', '#ffe0a0', '#9fd4ff'];
  for (let ry = 0; ry < rows; ry++) {
    for (let rx = 0; rx < cols; rx++) {
      const x = pad + rx * (wW + pad), y = pad + ry * (wH + pad);
      g.fillStyle = '#11172a';
      g.fillRect(x, y, wW, wH);
      const lit = hash(rx + variant * 7, ry, 60) > 0.55;
      if (lit) {
        const col = warm[(hash(rx, ry, 61 + variant) * warm.length) | 0];
        g.fillStyle = col; g.globalAlpha = 0.55; g.fillRect(x, y, wW, wH); g.globalAlpha = 1;
        q.fillStyle = col; q.fillRect(x, y, wW, wH);
        q.fillStyle = 'rgba(0,0,0,0.55)';                      // blinds break the flat pane
        q.fillRect(x, y + wH * 0.45, wW, wH * 0.16);
      }
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2;
      g.strokeRect(x, y, wW, wH);
    }
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const emissiveMap = new THREE.CanvasTexture(e);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  return { map, emissiveMap };
}

function makeMaterials() {
  const walls = [0, 1, 2].map((v) => {
    const { map, emissiveMap } = makeWallTexture(v);
    return new THREE.MeshStandardMaterial({
      color: '#ffffff', map, emissiveMap, emissive: '#ffffff', emissiveIntensity: 1.15,
      roughness: 0.85, metalness: 0.08,
    });
  });
  return {
    walls,
    wallSide: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, metalness: 0.05 }),
    crate: new THREE.MeshStandardMaterial({ color: '#63513a', roughness: 0.95 }),
    shelf: new THREE.MeshStandardMaterial({ color: '#2e3c50', roughness: 0.7, metalness: 0.2 }),
    barrier: new THREE.MeshStandardMaterial({ color: '#39414f', roughness: 0.95 }),
    vatShell: new THREE.MeshStandardMaterial({ color: '#1b232e', roughness: 0.35, metalness: 0.6 }),
    vatGlow: new THREE.MeshStandardMaterial({ color: '#9dff57', emissive: '#9dff57', emissiveIntensity: 2.2, roughness: 0.2 }),
    tracer: new THREE.MeshBasicMaterial({ color: '#ffca6b' }),
    glass: new THREE.MeshStandardMaterial({ color: '#0d1420', roughness: 0.1, metalness: 0.9 }),
    tyre: new THREE.MeshStandardMaterial({ color: '#0b0e13', roughness: 0.95 }),
    blast: new THREE.MeshBasicMaterial({ color: '#ffdca0', transparent: true, opacity: 0.9, depthWrite: false }),
  };
}

// ---------------------------------------------------------------- ground bake

// The floor is a real material: colour + roughness maps, so puddles are
// mirror-smooth and asphalt stays matte under the same light.
function bakeGround(w) {
  const cw = w.cols * TILE, ch = w.rows * TILE;
  const col = document.createElement('canvas'); col.width = cw; col.height = ch;
  const rgh = document.createElement('canvas'); rgh.width = cw; rgh.height = ch;
  const g = col.getContext('2d');
  const q = rgh.getContext('2d');
  q.fillStyle = '#d8d8d8'; q.fillRect(0, 0, cw, ch);

  const at = (tx, ty) => w.mission.map[ty]?.[tx] ?? '.';
  for (let ty = 0; ty < w.rows; ty++) {
    for (let tx = 0; tx < w.cols; tx++) {
      const px = tx * TILE, py = ty * TILE;
      const h0 = hash(tx, ty);
      const chr = at(tx, ty);
      if (w.roads.has(tx + ',' + ty)) {
        g.fillStyle = h0 > 0.5 ? '#15181f' : '#131720';
        g.fillRect(px, py, TILE, TILE);
        for (let i = 0; i < 6; i++) {
          g.fillStyle = `rgba(255,255,255,${0.02 + hash(tx, ty, i) * 0.03})`;
          g.fillRect(px + hash(tx, ty, i + 9) * TILE, py + hash(tx, ty, i + 17) * TILE, 2, 2);
        }
        if (!w.roads.has(tx + ',' + (ty - 1))) { g.fillStyle = '#2b3344'; g.fillRect(px, py, TILE, 4); }
        if (!w.roads.has(tx + ',' + (ty + 1))) { g.fillStyle = '#2b3344'; g.fillRect(px, py + TILE - 4, TILE, 4); }
        if (w.roads.has(tx + ',' + (ty - 1)) && w.roads.has(tx + ',' + (ty + 1)) && tx % 2 === 0) {
          g.fillStyle = 'rgba(230,190,100,0.55)'; g.fillRect(px + 8, py + TILE / 2 - 2, 26, 4);
        }
      } else if (chr === ',') {
        g.fillStyle = h0 > 0.5 ? '#262c3c' : '#232937';
        g.fillRect(px, py, TILE, TILE);
        g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1;
        g.strokeRect(px + 0.5, py + 0.5, TILE, TILE);
      } else if (chr === 'd') {
        const pal = ['#2f1a3e', '#182c40', '#231536', '#351d31'];
        g.fillStyle = pal[(tx + ty * 2) % pal.length];
        g.fillRect(px, py, TILE, TILE);
        g.strokeStyle = 'rgba(255,255,255,0.08)'; g.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
        q.fillStyle = '#3a3a3a'; q.fillRect(px, py, TILE, TILE); // polished floor
      } else {
        g.fillStyle = hash(tx, ty, 3) > 0.5 ? '#191622' : '#171420';
        g.fillRect(px, py, TILE, TILE);
        g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1;
        g.strokeRect(px + 0.5, py + 0.5, TILE / 2, TILE / 2);
        g.strokeRect(px + TILE / 2 + 0.5, py + TILE / 2 + 0.5, TILE / 2, TILE / 2);
        q.fillStyle = '#9a9a9a'; q.fillRect(px, py, TILE, TILE);
      }
      if (h0 > 0.86) {
        g.fillStyle = 'rgba(0,0,0,0.22)';
        g.beginPath();
        g.ellipse(px + TILE * hash(tx, ty, 5), py + TILE * hash(tx, ty, 6), 15, 9, h0 * 3, 0, Math.PI * 2);
        g.fill();
      }
      if (hash(tx, ty, 8) > 0.9 && chr !== '#') {
        const cx = px + TILE / 2, cy = py + TILE / 2;
        const neon = NEON[(hash(tx, ty, 9) * NEON.length) | 0];
        g.fillStyle = 'rgba(8,12,22,0.9)';
        g.beginPath(); g.ellipse(cx, cy, 17, 9, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = neon + '2e';
        g.beginPath(); g.ellipse(cx, cy, 14, 7, 0, 0, Math.PI * 2); g.fill();
        q.fillStyle = '#0d0d0d';
        q.beginPath(); q.ellipse(cx, cy, 17, 9, 0, 0, Math.PI * 2); q.fill();
      }
    }
  }
  const anis = Math.min(8, R.renderer.capabilities.getMaxAnisotropy());
  const colorTex = new THREE.CanvasTexture(col);
  colorTex.colorSpace = THREE.SRGBColorSpace;
  colorTex.anisotropy = anis;
  const roughTex = new THREE.CanvasTexture(rgh);
  roughTex.anisotropy = anis;
  return { colorTex, roughTex, cw, ch };
}

// ---------------------------------------------------------------- static build

function buildStatic(w) {
  R.statics.clear();
  R.signs.length = 0;
  R.missionKey = w.mission.id;

  const { colorTex, roughTex, cw, ch } = bakeGround(w);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(cw, ch),
    new THREE.MeshStandardMaterial({ map: colorTex, roughnessMap: roughTex, roughness: 1, metalness: 0.15 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(cw / 2, 0, ch / 2);
  ground.receiveShadow = true;
  R.statics.add(ground);

  const wallTiles = [];
  for (let ty = 0; ty < w.rows; ty++) {
    for (let tx = 0; tx < w.cols; tx++) if (w.walls.has(tx + ',' + ty)) wallTiles.push([tx, ty]);
  }
  // three façade variants, one InstancedMesh each: a whole city in 3 draw calls
  const buckets = [[], [], []];
  for (const t of wallTiles) buckets[(hash(t[0], t[1], 42) * 3) | 0].push(t);
  const m4 = new THREE.Matrix4();
  const colr = new THREE.Color();
  buckets.forEach((tiles, v) => {
    if (!tiles.length) return;
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(TILE, WALL_H, TILE), R.mat.walls[v], tiles.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    tiles.forEach(([tx, ty], i) => {
      // vary height so a wall run reads as a row of buildings, not a fence
      const hVar = 1 + hash(tx, ty, 30) * 0.6;
      m4.makeScale(1, hVar, 1);
      m4.setPosition(tx * TILE + TILE / 2, (WALL_H * hVar) / 2, ty * TILE + TILE / 2);
      mesh.setMatrixAt(i, m4);
      colr.setStyle('#3a4668').multiplyScalar(0.62 + hash(tx, ty, 31) * 0.55);
      mesh.setColorAt(i, colr);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    R.statics.add(mesh);
  });

  const signSet = SIGN_SETS[w.mission.signage] ?? SIGN_SETS.street;
  const placed = [];
  for (const [tx, ty] of wallTiles) {
    const southOpen = ty + 1 < w.rows && !w.walls.has(tx + ',' + (ty + 1));
    if (!southOpen || hash(tx, ty, 21) <= 0.62) continue;
    const sx = tx * TILE + TILE / 2, sz = ty * TILE + TILE + 1.5;
    if (placed.some((p) => Math.abs(p.z - sz) < 8 && Math.abs(p.x - sx) < 150)) continue;
    const [text, color] = signSet[(hash(tx, ty, 22) * signSet.length) | 0];
    const mesh = makeSignMesh(text, color);
    mesh.position.set(sx, WALL_H * 0.6, sz);
    R.statics.add(mesh);
    placed.push({ x: sx, z: sz });
    R.signs.push({ x: sx, y: WALL_H * 0.6, z: sz, color: new THREE.Color(color) });
  }
}

function makeSignMesh(text, color) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#000000'; g.fillRect(0, 0, 256, 64);
  g.font = 'bold 28px "Segoe UI", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  // Additive blending sums with whatever is behind, and bloom sums again — a
  // white core on top of a coloured glow lands at pure white and the text stops
  // being readable. Keep the fill coloured and the core faint.
  g.shadowColor = color; g.shadowBlur = 14;
  g.fillStyle = color; g.fillText(text, 128, 34);
  g.shadowBlur = 0;
  g.globalAlpha = 0.28; g.fillStyle = '#ffffff'; g.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, opacity: 0.8,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(100, 25), mat);
}

// ---------------------------------------------------------------- humanoids

function styleFor(e, settings) {
  // `emissive` is a bloom budget, not a colour: the agents are meant to glow and
  // read instantly, everyone else must stay a legible body rather than a blob.
  if (e.kind === 'player') {
    const rhino = e.agentKey === 'rhino';
    return { accent: e.agent.color, outfit: rhino ? '#26404f' : '#3d2440',
      skin: rhino ? SKINS[2] : SKINS[0], scale: rhino ? 1.16 : 0.98, visor: true, emissive: 1.6 };
  }
  if (e.kind === 'civ') {
    return { accent: '#7d8596', outfit: CIV_OUTFITS[e.id % CIV_OUTFITS.length],
      skin: SKINS[e.id % SKINS.length], scale: 0.94, visor: false, emissive: 0 };
  }
  const hc = settings.highContrastEnemies;
  const base = {
    lookout: '#33422c', soldier: '#324a2e', dealer: '#27452f', bruiser: '#2c4030',
    bouncer: '#1f3a33', vipguard: '#274044', chromedog: '#3a4a24', midnight: '#2c1f45',
    tread: '#4a3520', stacks: '#4a4224', crane: '#28394a', shiver: '#1f4048',
    lockjaw: '#2f3644', chemist: '#9aa38c',
    cs_trooper: '#4a3c22', cs_tactical: '#52401f', cs_shield: '#5a4826', graft: '#5e4a24',
    wrecker: '#46321e',
  }[e.type] ?? '#324a2e';
  const big = ['bruiser', 'bouncer', 'chromedog', 'stacks', 'lockjaw', 'tread', 'cs_shield', 'wrecker'].includes(e.type);
  return { accent: hc ? '#ff5050' : e.color, outfit: hc ? '#5a2323' : base,
    skin: SKINS[e.id % SKINS.length], scale: e.boss ? 1.3 : big ? 1.18 : 1.0, visor: false,
    emissive: e.boss ? 0.9 : 0.35, shield: !!e.shield };
}

function buildHumanoid(st) {
  const g = new THREE.Group();
  const outfit = new THREE.MeshStandardMaterial({ color: st.outfit, roughness: 0.72, metalness: 0.12 });
  const skin = new THREE.MeshStandardMaterial({ color: st.skin, roughness: 0.65 });
  const accent = new THREE.MeshStandardMaterial({
    color: st.accent, emissive: st.accent, emissiveIntensity: st.emissive ?? 0.4, roughness: 0.4 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(7.5, 12, 4, 12), outfit);
  torso.position.y = 25; torso.castShadow = true;
  g.add(torso);

  // chest stripe: the faction read at a glance, kept narrow so the bloom rims
  // the body instead of drowning it
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(3, 10, 5), accent);
  stripe.position.set(6, 25, 0); stripe.castShadow = true;
  g.add(stripe);

  const head = new THREE.Mesh(new THREE.SphereGeometry(5.4, 16, 12), st.visor ? outfit : skin);
  head.position.y = 38; head.castShadow = true;
  g.add(head);
  if (st.visor) {
    const visor = new THREE.Mesh(new THREE.SphereGeometry(5.6, 16, 12, 0, Math.PI, 0.55, 1.05), accent);
    visor.position.y = 38; visor.rotation.y = -Math.PI / 2;
    g.add(visor);
  }

  const legL = new THREE.Mesh(new THREE.CapsuleGeometry(3.2, 9, 3, 8), outfit);
  const legR = legL.clone();
  legL.position.set(0, 8, -4); legR.position.set(0, 8, 4);
  legL.castShadow = legR.castShadow = true;
  g.add(legL, legR);

  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(2.6, 8, 3, 8), skin);
  const armR = armL.clone();
  armL.position.set(4, 26, -8); armR.position.set(4, 26, 8);
  armL.castShadow = armR.castShadow = true;
  g.add(armL, armR);

  const gun = new THREE.Mesh(new THREE.BoxGeometry(20, 3.4, 3),
    new THREE.MeshStandardMaterial({ color: '#12161f', roughness: 0.5, metalness: 0.7 }));
  gun.position.set(14, 25, 4); gun.castShadow = true;
  g.add(gun);

  let shieldMesh = null;
  if (st.shield) {
    // the riot shield IS the mechanic's affordance: see it, flank it
    shieldMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 34, 22),
      new THREE.MeshStandardMaterial({
        color: '#8a6f30', emissive: st.accent, emissiveIntensity: 0.35,
        roughness: 0.4, metalness: 0.5, transparent: true, opacity: 0.92,
      }),
    );
    shieldMesh.position.set(13, 22, 0);
    shieldMesh.castShadow = true;
    g.add(shieldMesh);
    // slit window so it reads as equipment, not a wall
    const slit = new THREE.Mesh(new THREE.BoxGeometry(3, 5, 12), R.mat.glass);
    slit.position.set(13.4, 32, 0);
    g.add(slit);
  }

  g.userData = { torso, head, legL, legR, armL, armR, gun, stripe, accent,
    baseEmissive: st.emissive ?? 0.4 };
  g.scale.setScalar(st.scale);
  return g;
}

// Tags live OUTSIDE the rig. The rig rotates to aim and folds flat (rotation.z)
// when downed — anything parented to it swings away with the body, which put
// labels on the floor beside corpses instead of above them.
function makeTagGroup() {
  const t = new THREE.Group();
  const label = makeLabelSprite();
  label.position.y = 54;
  label.visible = false;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(19, 24, 32),
    new THREE.MeshBasicMaterial({ color: '#ffd94f', transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 1.5;
  ring.visible = false;

  const hpBg = new THREE.Sprite(new THREE.SpriteMaterial({ color: '#000000', opacity: 0.7, transparent: true, depthTest: false }));
  hpBg.scale.set(34, 5, 1);
  hpBg.position.y = 46;
  hpBg.renderOrder = 998;
  hpBg.visible = false;
  const hpFill = new THREE.Sprite(new THREE.SpriteMaterial({ color: '#9dff57', depthTest: false, transparent: true }));
  hpFill.scale.set(32, 3, 1);
  hpFill.position.y = 46;
  hpFill.renderOrder = 999;
  hpFill.visible = false;

  t.add(label, ring, hpBg, hpFill);
  t.userData = { label, ring, hpBg, hpFill, ringArc: -1 };
  return t;
}

// A sprite scales about its centre, so a shrinking bar must also slide left to
// stay pinned at its left edge.
function setHpBar(tag, frac, colour, y) {
  const u = tag.userData;
  const full = 32;
  u.hpBg.visible = u.hpFill.visible = true;
  u.hpBg.position.y = y; u.hpFill.position.y = y;
  u.hpFill.scale.x = Math.max(0.001, full * frac);
  u.hpFill.position.x = -(full - full * frac) / 2;
  u.hpFill.material.color.setStyle(colour);
}

// Rebuild the arc only when it visibly moves — geometry churn per frame for a
// progress ring is pure waste.
function setRingProgress(tag, frac) {
  const q = Math.round(frac * 24) / 24;
  if (tag.userData.ringArc === q) return;
  tag.userData.ringArc = q;
  tag.userData.ring.geometry.dispose();
  tag.userData.ring.geometry = new THREE.RingGeometry(19, 24, 32, 1, -Math.PI / 2, q * Math.PI * 2);
}

// `inRange` is computed against the same radius world.js uses for cuffing, so
// the prompt is a promise the sim actually keeps.
function syncHumanoid(g, tag, e, settings, inRange, intel) {
  const u = g.userData;
  const dead = e.state === 'DEAD';
  const downed = e.state === 'DOWNED' || e.downed;
  const cuffed = e.state === 'CUFFED';
  const surr = e.state === 'SURRENDER' || e.state === 'FAKE_SURRENDER';

  g.position.set(e.x, 0, e.y);
  g.rotation.y = -(e.aimAngle ?? 0);

  if (dead || downed || cuffed) {
    g.rotation.z = Math.PI * 0.46; // folded onto the floor
    g.position.y = 7;
    u.gun.visible = false;
  } else {
    g.rotation.z = 0;
    g.position.y = 0;
    const wkey = e.kind === 'player' ? e.weapons?.[e.weaponIdx]?.key : e.ws?.key;
    u.gun.visible = !surr && !(WEAPONS[wkey]?.melee);
    if (surr) {
      u.armL.position.set(-2, 33, -8); u.armR.position.set(-2, 33, 8);
      u.armL.rotation.z = u.armR.rotation.z = Math.PI * 0.85;
    } else {
      u.armL.position.set(4, 26, -8); u.armR.position.set(4, 26, 8);
      u.armL.rotation.z = u.armR.rotation.z = 0;
    }
    // walk cycle driven by world position, so it syncs to actual movement
    const phase = (e.x + e.y) * 0.09;
    u.legL.position.z = -4 + Math.sin(phase) * 2.6;
    u.legR.position.z = 4 - Math.sin(phase) * 2.6;
    u.legL.position.y = 8 + Math.abs(Math.cos(phase)) * 1.4;
    u.legR.position.y = 8 + Math.abs(Math.sin(phase)) * 1.4;
  }
  u.accent.emissiveIntensity = e.hitFlash > 0 && !settings.reducedFlash ? 6 : (u.baseEmissive ?? 0.4);

  // ---- tags: position only, never rotation (see makeTagGroup)
  const t = tag.userData;
  tag.position.set(e.x, 0, e.y);

  let text = null, colour = '#ffffff';
  if (dead) text = null;
  else if (cuffed) { text = 'CUFFED'; colour = '#ffd94f'; }
  else if (downed) {
    text = e.kind === 'player' ? 'DOWN — HOLD E TO REVIVE' : (inRange ? 'HOLD E — ARREST' : 'DOWN — ARREST');
    colour = '#ff9c9c';
  } else if (surr) {
    text = inRange ? 'HOLD E — ARREST' : 'HANDS UP';
    colour = inRange ? '#ffd94f' : '#ffffff';
  } else if (e.boss) { text = e.name ?? 'BOSS'; colour = '#ff5f9e'; }
  // SHAKEN is an Intelligence Lv3 perk — showing it to everyone silently
  // refunds an upgrade the player paid for
  else if (intel >= 3 && e.kind === 'enemy' && e.state === 'FIGHT' && e.hp < e.maxHp * 0.45) {
    text = 'SHAKEN'; colour = '#ffd94f';
  }

  if (text) {
    setLabel(t.label, text, colour);
    t.label.visible = true;
    t.label.position.y = (dead || downed || cuffed) ? 30 : 54;
  } else t.label.visible = false;

  // ---- health: the read that tells you a boss is near giving up
  if (e.kind === 'enemy' && !dead && !cuffed && e.hp > 0 && e.hp < e.maxHp) {
    setHpBar(tag, e.hp / e.maxHp, e.boss ? '#ff5f9e' : '#9dff57', (downed ? 22 : 46));
  } else { t.hpBg.visible = false; t.hpFill.visible = false; }

  // ---- cuff ring / in-range affordance
  const cuffing = e.cuffProgress > 0 && e.cuffProgress < 1 && !cuffed;
  if (cuffing) {
    t.ring.visible = true;
    t.ring.material.color.setStyle('#ffd94f');
    t.ring.material.opacity = 0.95;
    setRingProgress(tag, e.cuffProgress);
  } else if (inRange && !cuffed && !dead) {
    t.ring.visible = true;
    t.ring.material.color.setStyle('#58d0ba');
    t.ring.material.opacity = 0.5;
    setRingProgress(tag, 1);
  } else t.ring.visible = false;
}

// ---------------------------------------------------------------- props

function buildProp(pr) {
  if (pr.kind === 'vat') {
    const g = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(pr.r * 0.85, pr.r * 0.9, 46, 16), R.mat.vatShell);
    shell.position.y = 23; shell.castShadow = true; shell.receiveShadow = true;
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(pr.r * 0.72, pr.r * 0.72, 26, 16), R.mat.vatGlow.clone());
    glow.position.y = 21;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(pr.r * 0.92, pr.r * 0.92, 4, 16), R.mat.barrier);
    cap.position.y = 46; cap.castShadow = true;
    g.add(shell, glow, cap);
    g.userData = { glow };
    return g;
  }
  if (pr.kind === 'barrier') {
    const m = new THREE.Mesh(new THREE.BoxGeometry(pr.r * 2, 26, pr.r * 1.1), R.mat.barrier);
    m.position.y = 13; m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  const h = pr.kind === 'shelf' ? 56 : 38;
  const m = new THREE.Mesh(new THREE.BoxGeometry(pr.r * 2, h, pr.r * 2),
    pr.kind === 'shelf' ? R.mat.shelf : R.mat.crate);
  m.position.y = h / 2; m.castShadow = true; m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------- vehicles

// A car is read at a glance by its silhouette, so these are built from stacked
// tapered volumes (lower body, greenhouse, nose, tail) rather than one box —
// plus real rubber, bumpers and lights. Bikes get an entirely different shape.
function buildVehicle(v) {
  const t = VEHICLE_TYPES[v.type];
  const g = new THREE.Group();
  const heavy = v.type === 'truck' || v.type === 'armoured';
  const bike = v.type === 'gangbike';
  const L = v.r * 2.4, W = v.r * 1.4;
  const paint = new THREE.MeshStandardMaterial({ color: t.color, roughness: 0.32, metalness: 0.65 });
  const trim = new THREE.MeshStandardMaterial({ color: shadeHex(t.color, 0.55), roughness: 0.5, metalness: 0.5 });

  if (bike) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(L * 0.8, 8, W * 0.42), paint);
    frame.position.y = 16; frame.castShadow = true;
    const tank = new THREE.Mesh(new THREE.CapsuleGeometry(5.5, 8, 3, 8), paint);
    tank.rotation.z = Math.PI / 2; tank.position.set(-1, 23, 0); tank.castShadow = true;
    const fairing = new THREE.Mesh(new THREE.ConeGeometry(6, 14, 8), paint);
    fairing.rotation.z = -Math.PI / 2; fairing.position.set(L * 0.42, 22, 0);
    const rider = new THREE.Mesh(new THREE.CapsuleGeometry(5, 12, 3, 8),
      new THREE.MeshStandardMaterial({ color: '#1c2a20', roughness: 0.8 }));
    rider.rotation.z = 0.5; rider.position.set(-4, 32, 0); rider.castShadow = true;
    g.add(frame, tank, fairing, rider);
    for (const wx of [-L * 0.38, L * 0.38]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(9, 3, 8, 16), R.mat.tyre);
      wheel.position.set(wx, 9, 0);
      wheel.castShadow = true;
      g.add(wheel);
    }
  } else if (heavy) {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(L, 16, W), trim);
    chassis.position.y = 14; chassis.castShadow = true;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(L * 0.3, 30, W * 0.94), paint);
    cab.position.set(L * 0.33, 37, 0); cab.castShadow = true;
    const screen = new THREE.Mesh(new THREE.BoxGeometry(2, 13, W * 0.78), R.mat.glass);
    screen.position.set(L * 0.48, 42, 0);
    const boxH = v.type === 'armoured' ? 46 : 42;
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(L * 0.66, boxH, W * 1.04),
      new THREE.MeshStandardMaterial({ color: v.type === 'armoured' ? '#2b3040' : '#3a4258', roughness: 0.72, metalness: 0.3 }));
    cargo.position.set(-L * 0.16, boxH / 2 + 22, 0); cargo.castShadow = true;
    g.add(chassis, cab, screen, cargo);
    // ribs break up the slab side of the box
    for (let i = -2; i <= 2; i++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(3, boxH * 0.9, W * 1.07), trim);
      rib.position.set(-L * 0.16 + i * L * 0.11, boxH / 2 + 22, 0);
      g.add(rib);
    }
    if (v.type === 'armoured') { // slab bumper + window bars read as "armoured"
      const bar = new THREE.Mesh(new THREE.BoxGeometry(5, 18, W * 1.02), trim);
      bar.position.set(L * 0.52, 26, 0); bar.castShadow = true;
      g.add(bar);
    }
  } else {
    const lower = new THREE.Mesh(new THREE.BoxGeometry(L, 15, W), paint);
    lower.position.y = 15; lower.castShadow = true; lower.receiveShadow = true;
    // greenhouse: narrower and shorter than the body, which is what makes a
    // box look like a car instead of a brick
    const green = new THREE.Mesh(new THREE.BoxGeometry(L * 0.46, 13, W * 0.8), paint);
    green.position.set(-L * 0.04, 29, 0); green.castShadow = true;
    const glassF = new THREE.Mesh(new THREE.BoxGeometry(L * 0.1, 12, W * 0.74), R.mat.glass);
    glassF.position.set(L * 0.2, 29, 0);
    const glassB = new THREE.Mesh(new THREE.BoxGeometry(L * 0.08, 11, W * 0.72), R.mat.glass);
    glassB.position.set(-L * 0.28, 29, 0);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(L * 0.14, 9, W * 0.92), trim);
    nose.position.set(L * 0.45, 13, 0);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(L * 0.1, 9, W * 0.92), trim);
    tail.position.set(-L * 0.46, 13, 0);
    g.add(lower, green, glassF, glassB, nose, tail);
  }

  if (!bike) {
    for (const [wx, wz] of [[-L * 0.31, -W * 0.52], [-L * 0.31, W * 0.52], [L * 0.31, -W * 0.52], [L * 0.31, W * 0.52]]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 6, 14), R.mat.tyre);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 8, wz);
      wheel.castShadow = true;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 6.4, 10), trim);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(wx, 8, wz);
      g.add(wheel, hub);
    }
  }

  const lampY = heavy ? 26 : bike ? 22 : 14;
  // Emissive is a bloom budget: lamps must read as lamps, not as white holes.
  const hl = new THREE.Mesh(new THREE.BoxGeometry(2.5, 5, 6),
    new THREE.MeshStandardMaterial({ color: '#fff2ba', emissive: '#fff2ba', emissiveIntensity: 1.4 }));
  hl.position.set(L * 0.5, lampY, bike ? 0 : -W * 0.3);
  g.add(hl);
  if (!bike) {
    const hl2 = hl.clone(); hl2.position.z = W * 0.3;
    const tl = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4, 6),
      new THREE.MeshStandardMaterial({ color: t.tail, emissive: t.tail, emissiveIntensity: 1.2 }));
    tl.position.set(-L * 0.5, lampY, -W * 0.3);
    const tl2 = tl.clone(); tl2.position.z = W * 0.3;
    g.add(hl2, tl, tl2);
  }

  let bar = null;
  if (v.type === 'patrol') {
    // a proper lightbar: two pods on a spine, so it reads as police from above
    bar = new THREE.Group();
    const spine = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, W * 0.72), R.mat.barrier);
    const podL = new THREE.Mesh(new THREE.BoxGeometry(7, 5, W * 0.3),
      new THREE.MeshStandardMaterial({ color: '#31a8ff', emissive: '#31a8ff', emissiveIntensity: 2.2 }));
    podL.position.z = -W * 0.21;
    const podR = new THREE.Mesh(new THREE.BoxGeometry(7, 5, W * 0.3),
      new THREE.MeshStandardMaterial({ color: '#ff4040', emissive: '#ff4040', emissiveIntensity: 2.2 }));
    podR.position.z = W * 0.21;
    bar.add(spine, podL, podR);
    bar.position.set(-L * 0.04, 38, 0);
    bar.userData = { podL, podR };
    g.add(bar);
  }
  const tag = makeTagGroup();
  tag.position.y = 0;
  g.add(tag);
  // `paint` is per-vehicle, so recolouring a wreck cannot bleed onto others
  g.userData = { paint, bar, tag };
  return g;
}

// ---------------------------------------------------------------- frame

export function draw3d(canvas, w, settings) {
  if (!R) init(canvas);
  const now = performance.now();
  const fx = settings.fxIntensity ?? 1;

  if (R.missionKey !== w.mission.id) buildStatic(w);

  // camera: angled tactical view; shake is a positional jitter
  const shake = (settings.reducedFlash ? 0 : w.cam.shake) * 5 * (settings.screenShake ?? 1);
  const D = 620, PITCH = 1.02; // ~58° above horizontal
  const cx = w.cam.x + (Math.random() - 0.5) * shake;
  const cz = w.cam.y + (Math.random() - 0.5) * shake;
  R.camera.position.set(cx, Math.sin(PITCH) * D, cz + Math.cos(PITCH) * D);
  R.camera.lookAt(cx, 0, cz);
  R.key.position.set(w.cam.x - 400, 760, w.cam.y - 520);
  R.key.target.position.set(w.cam.x, 0, w.cam.y);
  R.key.target.updateMatrixWorld();

  // Aiming must raycast the ground plane — perspective, not a flat zoom factor.
  // world.js uses this hook when present and falls back to 2D maths otherwise.
  w.screenToWorld = (sx, sy) => {
    R.tmp2.set((sx / canvas.width) * 2 - 1, -(sy / canvas.height) * 2 + 1);
    R.ray.setFromCamera(R.tmp2, R.camera);
    const hit = R.ray.ray.intersectPlane(R.groundPlane, R.tmp);
    return hit ? { x: hit.x, y: hit.z } : { x: w.cam.x, y: w.cam.y };
  };

  syncBodies(w, settings);
  syncPickups(w, now);
  syncProps(w, now, settings);
  syncVehicles(w, settings, now);
  syncBullets(w);
  syncEffects(w, fx, settings);
  syncNeon(w, fx);
  syncZones(w, now);
  syncCompass(w, now);

  // damage vignette (CSS overlay: a WebGL canvas cannot be painted over)
  if (R.hurtEl === undefined) R.hurtEl = document.getElementById('hurt');
  if (R.hurtEl) {
    const hurt = Math.max(0, ...w.players.map((p) => p.hitFlash ?? 0));
    const allDown = w.players.length > 0 && w.players.every((p) => p.downed);
    R.hurtEl.style.opacity = settings.reducedFlash ? 0
      : allDown ? 0.5 : Math.min(0.8, (hurt / 0.12) * 0.7);
  }

  R.bloom.strength = (settings.reducedFlash ? 0.35 : 0.7) * fx;
  R.composer.render();
}

// Mirrors world.js handleInteract: cuff radius 64, revive radius 70.
function interactableBy(w, e) {
  const cuffable = e.kind === 'enemy'
    && e.state !== 'CUFFED'
    && ['SURRENDER', 'FAKE_SURRENDER', 'DOWNED'].includes(e.state);
  const revivable = e.kind === 'player' && e.downed;
  if (!cuffable && !revivable) return false;
  const r = revivable ? 70 : 64;
  return w.players.some((p) => !p.downed && p !== e
    && Math.hypot(p.x - e.x, p.y - e.y) < r);
}

function syncBodies(w, settings) {
  const intel = w.settings?.upgrades?.intelligence ?? 0;
  const seen = new Set();
  for (const e of [...w.civilians, ...w.enemies, ...w.players]) {
    seen.add(e.id);
    let rec = R.bodies.get(e.id);
    if (!rec) {
      const rig = buildHumanoid(styleFor(e, settings));
      const tag = makeTagGroup();
      R.scene.add(rig, tag);
      rec = { rig, tag };
      R.bodies.set(e.id, rec);
    }
    syncHumanoid(rec.rig, rec.tag, e, settings, interactableBy(w, e), intel);
  }
  for (const [id, rec] of R.bodies) {
    if (seen.has(id)) continue;
    R.scene.remove(rec.rig, rec.tag);
    R.bodies.delete(id);
  }
}

const PICKUP_STYLE = {
  evidence: { colour: '#ffd94f', label: 'EVIDENCE' },
  medkit: { colour: '#6dff9e', label: 'MEDKIT' },
  weapon: { colour: '#7db4ff', label: 'WEAPON' },
};

function buildPickup(pk) {
  const st = PICKUP_STYLE[pk.kind] ?? PICKUP_STYLE.weapon;
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    pk.kind === 'evidence' ? new THREE.BoxGeometry(16, 20, 4)
      : pk.kind === 'medkit' ? new THREE.BoxGeometry(18, 12, 14)
        : new THREE.BoxGeometry(26, 6, 6),
    new THREE.MeshStandardMaterial({ color: st.colour, emissive: st.colour, emissiveIntensity: 1.4, roughness: 0.4 }),
  );
  body.position.y = 16; body.castShadow = true;
  g.add(body);
  // a beacon column: findable across the room, which a flat token never was
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.5, 90, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: st.colour, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 45;
  g.add(beam);
  const label = makeLabelSprite();
  label.position.y = 62;
  setLabel(label, st.label, st.colour);
  g.add(label);
  g.userData = { body, label };
  return g;
}

function syncPickups(w, now) {
  if (!R.pickups) R.pickups = new Map();
  const seen = new Set();
  for (const pk of w.pickups) {
    seen.add(pk.id);
    let g = R.pickups.get(pk.id);
    if (!g) { g = buildPickup(pk); R.scene.add(g); R.pickups.set(pk.id, g); }
    const near = w.players.some((p) => !p.downed && Math.hypot(p.x - pk.x, p.y - pk.y) < 52);
    g.position.set(pk.x, Math.sin(now / 350 + pk.id) * 2.5, pk.y);
    g.rotation.y = now / 1400 + pk.id;
    setLabel(g.userData.label, near ? 'HOLD E' : (PICKUP_STYLE[pk.kind] ?? PICKUP_STYLE.weapon).label,
      near ? '#ffffff' : (PICKUP_STYLE[pk.kind] ?? PICKUP_STYLE.weapon).colour);
    g.userData.body.material.emissiveIntensity = near ? 3 : 1.4;
  }
  for (const [id, g] of R.pickups) {
    if (seen.has(id)) continue;
    R.scene.remove(g);
    R.pickups.delete(id);
  }
}

function syncProps(w, now, settings) {
  const seen = new Set();
  for (const pr of w.props) {
    seen.add(pr.id);
    let m = R.props.get(pr.id);
    if (!m) { m = buildProp(pr); m.position.set(pr.x, 0, pr.y); R.scene.add(m); R.props.set(pr.id, m); }
    if (pr.kind === 'vat' && pr.fuse != null) {
      const blink = !settings.reducedFlash && Math.floor(now / 70) % 2 === 0;
      const glow = m.userData.glow;
      glow.material.color.set(blink ? '#ffffff' : '#ff5f5f');
      glow.material.emissive.set(blink ? '#ffffff' : '#ff5f5f');
      glow.material.emissiveIntensity = 7;
    }
  }
  for (const [id, m] of R.props) {
    if (seen.has(id)) continue;
    R.scene.remove(m);
    R.props.delete(id);
  }
}

function syncVehicles(w, settings, now) {
  const seen = new Set();
  for (const v of w.vehicles ?? []) {
    seen.add(v.id);
    let g = R.vehicles.get(v.id);
    if (!g) {
      g = buildVehicle(v);
      R.scene.add(g);
      // the tag rides in world space: a car tag parented to the car would
      // barrel-roll with it
      R.scene.add(g.userData.tag);
      R.vehicles.set(v.id, g);
    }
    g.position.set(v.x, 0, v.y);
    g.rotation.y = -v.angle;

    const t = g.userData.tag;
    t.position.set(v.x, 0, v.y);
    if (v.tag === 'truck' && !v.disabled) {
      setLabel(t.userData.label, 'SHIPMENT', '#ffca6b');
      t.userData.label.visible = true;
      t.userData.label.position.y = 92;
    } else t.userData.label.visible = false;
    if (v.tag && !v.disabled && v.hp < v.maxHp) {
      setHpBar(t, v.hp / v.maxHp, v.tag === 'truck' ? '#ffca6b' : '#ff8a3d', 74);
    } else { t.userData.hpBg.visible = false; t.userData.hpFill.visible = false; }
    if (v.disabled) { g.rotation.z = 0.1; g.userData.paint.color.setStyle('#2a2d36'); }
    if (g.userData.bar) {
      // alternating pods, not a colour-cycling slab
      const { podL, podR } = g.userData.bar.userData;
      const phase = settings.reducedFlash ? 0.5 : (Math.floor(now / 170) % 2);
      podL.material.emissiveIntensity = v.disabled ? 0 : (settings.reducedFlash ? 1 : (phase ? 0.15 : 2.6));
      podR.material.emissiveIntensity = v.disabled ? 0 : (settings.reducedFlash ? 1 : (phase ? 2.6 : 0.15));
    }
  }
  for (const [id, g] of R.vehicles) {
    if (seen.has(id)) continue;
    R.scene.remove(g, g.userData.tag);
    R.vehicles.delete(id);
  }
}

function syncBullets(w) {
  if (!R.bullets) {
    R.bullets = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), R.mat.tracer, 256);
    R.bullets.frustumCulled = false;
    R.scene.add(R.bullets);
  }
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const n = Math.min(w.bullets.length, 256);
  for (let i = 0; i < n; i++) {
    const b = w.bullets[i];
    const len = Math.min(46, Math.hypot(b.vx, b.vy) * 0.03);
    q.setFromAxisAngle(up, -Math.atan2(b.vy, b.vx));
    pos.set(b.x, 22, b.y);
    scl.set(len, 1.6, 1.6);
    m4.compose(pos, q, scl);
    R.bullets.setMatrixAt(i, m4);
  }
  R.bullets.count = n;
  R.bullets.instanceMatrix.needsUpdate = true;
}

function syncEffects(w, fx, settings) {
  // muzzle flash and blasts drive real lights — the whole point of going 3D
  const muzzle = w.effects.find((f) => f.kind === 'muzzle');
  if (muzzle && !settings.reducedFlash) {
    R.flashLight.position.set(muzzle.x, 26, muzzle.y);
    R.flashLight.intensity = 260000 * fx * (1 - muzzle.t / muzzle.dur);
  } else R.flashLight.intensity = 0;

  const blast = w.effects.find((f) => f.kind === 'blast');
  if (blast) {
    R.blastLight.position.set(blast.x, 40, blast.y);
    R.blastLight.intensity = 900000 * fx * (1 - blast.t / blast.dur);
  } else R.blastLight.intensity = 0;

  // Blasts, plus the small impact reads (hit/spark/debris/swing) that the 2D
  // build had: without them a firefight has no feedback that rounds connect.
  const seen = new Set();
  for (const f of w.effects) {
    if (!['blast', 'hit', 'spark', 'debris', 'break', 'swing'].includes(f.kind)) continue;
    if (settings.reducedFlash && f.kind !== 'blast') continue;
    seen.add(f);
    let m = R.blasts.get(f);
    if (!m) {
      m = f.kind === 'blast' || f.kind === 'hit'
        ? new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), R.mat.blast.clone())
        : new THREE.Sprite(new THREE.SpriteMaterial({ color: '#ffd94f', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      R.scene.add(m);
      R.blasts.set(f, m);
    }
    const t = f.t / f.dur;
    if (f.kind === 'blast') {
      m.position.set(f.x, 26, f.y);
      m.scale.setScalar(12 + t * 118);
      m.material.opacity = (1 - t) * 0.55 * fx;
      m.material.color.setStyle(t < 0.3 ? '#fff6d8' : '#ff8a3d');
    } else if (f.kind === 'hit') {
      m.position.set(f.x, 24, f.y);
      m.scale.setScalar(3 + t * 14);
      m.material.opacity = (1 - t) * 0.85 * fx;
      m.material.color.setStyle('#ffffff');
    } else if (f.kind === 'swing') {
      m.position.set(f.x + Math.cos(f.a) * 26, 24, f.y + Math.sin(f.a) * 26);
      m.scale.setScalar(30 * (1 - t) + 8);
      m.material.opacity = (1 - t) * 0.5 * fx;
      m.material.color.setStyle('#ffffff');
    } else { // spark / debris / break
      m.position.set(f.x, 12 + t * 16, f.y);
      m.scale.setScalar((f.kind === 'break' ? 26 : 14) * (0.4 + t));
      m.material.opacity = (1 - t) * 0.8 * fx;
      m.material.color.setStyle(f.kind === 'spark' ? '#ffd94f' : '#8a7a5a');
    }
  }
  for (const [f, m] of R.blasts) {
    if (seen.has(f)) continue;
    R.scene.remove(m);
    R.blasts.delete(f);
  }
}

// Reach-zone objectives (m03/m07 gates) were invisible in 3D: an objective you
// cannot see is an objective that does not exist.
function syncZones(w, now) {
  if (!R.zones) R.zones = new Map();
  const seen = new Set();
  for (const z of w.zones ?? []) {
    if (z.done) continue;
    seen.add(z);
    let g = R.zones.get(z);
    if (!g) {
      g = new THREE.Group();
      const disc = new THREE.Mesh(
        new THREE.RingGeometry(z.r * 0.82, z.r, 48),
        new THREE.MeshBasicMaterial({ color: '#58d0ba', transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }),
      );
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = 2;
      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(z.r * 0.9, z.r * 0.9, 160, 24, 1, true),
        new THREE.MeshBasicMaterial({ color: '#58d0ba', transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
      );
      column.position.y = 80;
      const label = makeLabelSprite();
      label.position.y = 172;
      setLabel(label, 'INTERCHANGE GATE', '#58d0ba');
      g.add(disc, column, label);
      g.position.set(z.x, 0, z.y);
      R.scene.add(g);
      R.zones.set(z, g);
    }
    g.children[0].material.opacity = 0.35 + 0.25 * Math.sin(now / 300);
  }
  for (const [z, g] of R.zones) {
    if (seen.has(z)) continue;
    R.scene.remove(g);
    R.zones.delete(z);
  }
}

// Intelligence Lv1+: a compass needle toward the nearest un-collected evidence.
function syncCompass(w, now) {
  const intel = w.settings?.upgrades?.intelligence ?? 0;
  if (!R.compass) {
    R.compass = new THREE.Mesh(
      new THREE.ConeGeometry(6, 16, 4),
      new THREE.MeshBasicMaterial({ color: '#ffd94f', transparent: true, depthTest: false }),
    );
    R.compass.renderOrder = 997;
    R.scene.add(R.compass);
  }
  const p = w.players.find((q) => !q.downed);
  let best = null, bd = Infinity;
  if (intel >= 1 && p) {
    for (const pk of w.pickups) {
      if (pk.kind !== 'evidence') continue;
      const d = Math.hypot(pk.x - p.x, pk.y - p.y);
      if (d < bd) { bd = d; best = pk; }
    }
  }
  if (!best || bd < 90) { R.compass.visible = false; return; }
  const a = Math.atan2(best.y - p.y, best.x - p.x);
  R.compass.visible = true;
  R.compass.position.set(p.x + Math.cos(a) * 40, 40, p.y + Math.sin(a) * 40);
  R.compass.rotation.set(Math.PI / 2, 0, -a - Math.PI / 2);
  R.compass.material.opacity = 0.5 + 0.4 * Math.sin(now / 240);
}

// Only the nearest few signs become real lights; the rest stay emissive + bloom.
function syncNeon(w, fx) {
  const near = R.signs
    .map((s) => ({ s, d: (s.x - w.cam.x) ** 2 + (s.z - w.cam.y) ** 2 }))
    .sort((a, b) => a.d - b.d)
    .slice(0, MAX_NEON_LIGHTS);
  R.neonLights.forEach((l, i) => {
    const hit = near[i];
    if (!hit) { l.intensity = 0; return; }
    l.position.set(hit.s.x, hit.s.y, hit.s.z + 14);
    l.color.copy(hit.s.color);
    l.intensity = 20000 * fx; // ~2 lux at 100px; see the units note in init()
  });
}

export function resize3d(canvas) {
  if (!R) return;
  R.renderer.setSize(canvas.width, canvas.height, false);
  R.camera.aspect = canvas.width / canvas.height;
  R.camera.updateProjectionMatrix();
  R.composer.setSize(canvas.width, canvas.height);
}
