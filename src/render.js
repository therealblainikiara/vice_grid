// render.js — neon-noir 2.5D canvas renderer.
// Static environment (floors, walls, signage, grime) is baked once per mission
// to an offscreen canvas; entities, effects and the lighting layer are drawn
// per frame. Public API is unchanged: draw(ctx, world, settings).

import { TILE, ZOOM } from './world.js';
import { WEAPONS } from './combat.js';

// deterministic per-tile hash for decor variation
function hash(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const NEON = ['#31d3ff', '#ff4fd8', '#ffd94f', '#58d0ba', '#9dff57', '#ff8a3d'];
const SIGNS = [
  ['HALCYON', '#31d3ff'], ['GLOW⁰', '#9dff57'], ['NOODLE-24', '#ff8a3d'],
  ['CREDIT NOW', '#ffd94f'], ['BAIL BONDS', '#ff4fd8'], ['QUICKCELL', '#58d0ba'],
  ['PAWN + AMMO', '#ffd94f'], ['LIVE ODDS', '#ff4fd8'],
];
const CIV_OUTFITS = ['#8d95a8', '#a89b8d', '#7d96a0', '#a08d99', '#96a08d', '#9a8da8'];
const SKINS = ['#e8c39e', '#c68e5f', '#8d5524', '#f1d5b8', '#a56a3f'];

const cache = { key: null, base: null, lights: [], light: null };

export function draw(ctx, w, settings) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  w.viewW = W; w.viewH = H;
  const fx = settings.fxIntensity ?? 1;
  const now = performance.now();
  const shakeAmt = (settings.reducedFlash ? 0 : w.cam.shake) * 6 * (settings.screenShake ?? 1);
  const shx = (Math.random() - 0.5) * shakeAmt;
  const shy = (Math.random() - 0.5) * shakeAmt;
  // world -> screen for the lighting pass
  const sx = (x) => (x - w.cam.x) * ZOOM + W / 2 + shx;
  const sy = (y) => (y - w.cam.y) * ZOOM + H / 2 + shy;

  if (cache.key !== w.mission.id) bakeStatic(w);

  ctx.fillStyle = '#05070c';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2 + shx, H / 2 + shy);
  ctx.scale(ZOOM, ZOOM);
  ctx.translate(-w.cam.x, -w.cam.y);

  // 1) baked environment
  ctx.drawImage(cache.base, 0, 0);

  // 2) sign flicker (cheap dynamic sparkle over baked glow)
  for (const s of cache.lights) {
    if (s.kind !== 'sign') continue;
    const fl = hash(s.x | 0, s.y | 0, (now / 120) | 0);
    if (fl < 0.06 && !settings.reducedFlash) { // brief dropout
      ctx.fillStyle = 'rgba(5,7,12,0.75)';
      ctx.fillRect(s.x - s.w / 2 - 2, s.y - 8, s.w + 4, 16);
    }
  }

  // 3) pickups
  for (const pk of w.pickups) drawPickup(ctx, pk, now, fx);

  // 4) props (crates / shelves with damage states)
  for (const pr of w.props) drawProp(ctx, pr);

  // 4.5) reach zones + vehicles (under people, over floor)
  for (const z of w.zones ?? []) {
    if (z.done) continue;
    const pulse = 0.5 + 0.5 * Math.sin(now / 300);
    ctx.save();
    ctx.strokeStyle = hexA('#58d0ba', 0.35 + 0.4 * pulse);
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (0.9 + 0.1 * pulse), 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    tag(ctx, 'INTERCHANGE GATE', z.x, z.y - z.r - 8, '#58d0ba');
    ctx.restore();
  }
  for (const v of w.vehicles ?? []) drawVehicle(ctx, v, settings, fx, now);

  // 5) entities, painter-sorted by y for correct overlap
  const bodies = [...w.civilians, ...w.enemies, ...w.players].sort((a, b) => a.y - b.y);
  for (const e of bodies) drawHumanoid(ctx, w, e, settings, fx, now);

  // 6) bullets — additive tracers
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of w.bullets) {
    const col = b.lethal ? '#ffca6b' : '#63e4ff';
    const grad = ctx.createLinearGradient(b.x - b.vx * 0.03, b.y - b.vy * 0.03, b.x, b.y);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, col);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    line(ctx, b.x - b.vx * 0.03, b.y - b.vy * 0.03, b.x, b.y);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#ffffff';
    line(ctx, b.x - b.vx * 0.008, b.y - b.vy * 0.008, b.x, b.y);
  }
  ctx.restore();

  // 7) effects
  for (const f of w.effects) drawEffect(ctx, f, settings, fx);

  // intelligence upgrades: evidence compass (Lv1+) and suspect nerve (Lv3+)
  const intel = w.settings?.upgrades?.intelligence ?? 0;
  if (intel >= 1) {
    for (const p of w.players) {
      if (p.downed) continue;
      let best = null, bd = Infinity;
      for (const pk of w.pickups) {
        if (pk.kind !== 'evidence') continue;
        const d = Math.hypot(pk.x - p.x, pk.y - p.y);
        if (d < bd) { bd = d; best = pk; }
      }
      if (best && bd > 90) {
        const a = Math.atan2(best.y - p.y, best.x - p.x);
        const pulse = 0.5 + 0.4 * Math.sin(now / 240);
        ctx.save();
        ctx.translate(p.x + Math.cos(a) * 30, p.y + Math.sin(a) * 30);
        ctx.rotate(a);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#ffd94f';
        ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-4, -5); ctx.lineTo(-4, 5); ctx.fill();
        ctx.restore();
      }
    }
  }
  if (intel >= 3) {
    for (const e of w.enemies) {
      if (e.state === 'FIGHT' && e.hp > 0 && e.hp < e.maxHp * 0.45) tag(ctx, 'SHAKEN', e.x, e.y - 34, '#ffd94f');
    }
  }

  ctx.restore();

  // 8) lighting: ambient darkness with light pools cut out
  drawLighting(ctx, w, settings, fx, sx, sy, W, H, now);

  // 9) additive neon washes
  if (!settings.reducedFlash) {
    ctx.save();
    ctx.translate(W / 2 + shx, H / 2 + shy);
    ctx.scale(ZOOM, ZOOM);
    ctx.translate(-w.cam.x, -w.cam.y);
    ctx.globalCompositeOperation = 'lighter';
    for (const s of cache.lights) {
      const pulse = 0.75 + 0.25 * Math.sin(now / 700 + s.x);
      radial(ctx, s.x, s.y, s.r * 1.4, hexA(s.color, 0.05 * fx * pulse));
    }
    for (const f of w.effects) {
      if (f.kind === 'muzzle') radial(ctx, f.x, f.y, 130, hexA('#ffd98a', 0.22 * fx * (1 - f.t / f.dur)));
    }
    ctx.restore();
  }

  // 10) player-hurt vignette
  const hurt = Math.max(...w.players.map((p) => p.hitFlash ?? 0), 0);
  if (hurt > 0 && !settings.reducedFlash) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, H / 2.6, W / 2, H / 2, H / 1.1);
    vg.addColorStop(0, 'transparent');
    vg.addColorStop(1, `rgba(255,40,40,${(hurt / 0.12) * 0.35})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  // 11) frame vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, H / 2.1, W / 2, H / 2, H * 1.05);
  vg.addColorStop(0, 'transparent');
  vg.addColorStop(1, 'rgba(2,3,8,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- lighting

function drawLighting(ctx, w, settings, fx, sx, sy, W, H, now) {
  if (!cache.light || cache.light.width !== W) {
    cache.light = document.createElement('canvas');
    cache.light.width = W; cache.light.height = H;
  }
  const lc = cache.light.getContext('2d');
  lc.globalCompositeOperation = 'source-over';
  lc.fillStyle = 'rgba(4,6,18,0.26)';
  lc.fillRect(0, 0, W, H);
  lc.globalCompositeOperation = 'destination-out';

  const cut = (x, y, r, a = 1) => {
    const cx = sx(x), cy = sy(y), cr = r * ZOOM;
    const g = lc.createRadialGradient(cx, cy, cr * 0.15, cx, cy, cr);
    g.addColorStop(0, `rgba(0,0,0,${a})`);
    g.addColorStop(1, 'transparent');
    lc.fillStyle = g;
    lc.fillRect(cx - cr, cy - cr, cr * 2, cr * 2);
  };

  for (const p of w.players) cut(p.x, p.y, 260, 0.95);
  for (const v of w.vehicles ?? []) {
    if (v.disabled) continue;
    // headlights push a pool of light ahead of the car
    cut(v.x + Math.cos(v.angle) * 90, v.y + Math.sin(v.angle) * 90, 150, 0.75);
    if (v.type === 'patrol') cut(v.x, v.y, 200, 0.85);
  }
  for (const s of cache.lights) cut(s.x, s.y, s.r, 0.85);
  for (const pk of w.pickups) cut(pk.x, pk.y, 80, 0.75);
  for (const e of w.enemies) {
    if (e.boss && e.hp > 0) cut(e.x, e.y, 160, 0.65 + 0.2 * Math.sin(now / 300));
    else if (e.state === 'FIGHT') cut(e.x, e.y, 110, 0.55);
  }
  if (!settings.reducedFlash) {
    for (const f of w.effects) if (f.kind === 'muzzle') cut(f.x, f.y, 240, 1);
  }
  ctx.drawImage(cache.light, 0, 0);
}

// ---------------------------------------------------------------- baking

function bakeStatic(w) {
  const bw = w.cols * TILE, bh = w.rows * TILE;
  const c = document.createElement('canvas');
  c.width = bw; c.height = bh;
  const g = c.getContext('2d');
  cache.key = w.mission.id;
  cache.base = c;
  cache.lights = [];

  const wall = (x, y) => w.walls.has(x + ',' + y);
  const road = (x, y) => w.roads.has(x + ',' + y);

  for (let ty = 0; ty < w.rows; ty++) {
    for (let tx = 0; tx < w.cols; tx++) {
      const px = tx * TILE, py = ty * TILE;
      const h0 = hash(tx, ty);
      if (wall(tx, ty)) continue; // walls after floors

      if (road(tx, ty)) {
        // asphalt
        g.fillStyle = h0 > 0.5 ? '#171b26' : '#161a24';
        g.fillRect(px, py, TILE, TILE);
        for (let i = 0; i < 5; i++) {
          g.fillStyle = `rgba(255,255,255,${0.015 + hash(tx, ty, i) * 0.02})`;
          g.fillRect(px + hash(tx, ty, i + 9) * TILE, py + hash(tx, ty, i + 17) * TILE, 2, 2);
        }
        if (!road(tx, ty - 1) && road(tx, ty + 1)) {
          g.fillStyle = '#232a3a';
          g.fillRect(px, py, TILE, 3);
        }
        if (road(tx, ty - 1) && !road(tx, ty + 1)) {
          g.fillStyle = '#232a3a';
          g.fillRect(px, py + TILE - 3, TILE, 3);
        }
        if (road(tx, ty - 1) && road(tx, ty + 1) && tx % 2 === 0) {
          g.fillStyle = 'rgba(226,180,91,0.5)';
          g.fillRect(px + 8, py + TILE / 2 - 2, 26, 4);
        }
        if (h0 > 0.93) { // manhole
          g.fillStyle = '#151a26';
          g.beginPath(); g.arc(px + TILE / 2, py + TILE / 2, 9, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#0a0d14';
          g.stroke();
        }
      } else if (rowChar(w, tx, ty) === 'd') {
        // dance floor: glossy colour-cycled panels
        const pal = ['#2a1638', '#16283a', '#1f1330', '#301a2c'];
        g.fillStyle = pal[(tx + ty * 2) % pal.length];
        g.fillRect(px, py, TILE, TILE);
        g.strokeStyle = 'rgba(255,255,255,0.07)';
        g.lineWidth = 1;
        g.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
        const dg = g.createLinearGradient(px, py, px + TILE, py + TILE);
        dg.addColorStop(0, hexA(NEON[(tx + ty) % NEON.length], 0.10));
        dg.addColorStop(1, 'transparent');
        g.fillStyle = dg;
        g.fillRect(px, py, TILE, TILE);
        if (hash(tx, ty, 40) > 0.8) {
          cache.lights.push({ kind: 'dance', x: px + TILE / 2, y: py + TILE / 2, r: 90, color: NEON[(hash(tx, ty, 41) * NEON.length) | 0] });
        }
      } else if (rowChar(w, tx, ty) === ',') {
        // sidewalk slabs
        g.fillStyle = h0 > 0.5 ? '#232837' : '#212633';
        g.fillRect(px, py, TILE, TILE);
        g.strokeStyle = 'rgba(0,0,0,0.5)';
        g.lineWidth = 1;
        g.strokeRect(px + 0.5, py + 0.5, TILE, TILE);
        if (h0 > 0.8) { // crack
          g.strokeStyle = 'rgba(0,0,0,0.55)';
          g.beginPath();
          g.moveTo(px + h0 * 20, py + 4);
          g.lineTo(px + 14 + h0 * 10, py + 22);
          g.lineTo(px + 8 + h0 * 20, py + TILE - 4);
          g.stroke();
        }
      } else {
        // interior floor: dark tiles with grout
        const warm = hash(tx, ty, 3) > 0.5;
        g.fillStyle = warm ? '#1e1a28' : '#1c1926';
        g.fillRect(px, py, TILE, TILE);
        g.strokeStyle = 'rgba(0,0,0,0.6)';
        g.lineWidth = 1;
        g.strokeRect(px + 0.5, py + 0.5, TILE / 2, TILE / 2);
        g.strokeRect(px + TILE / 2 + 0.5, py + TILE / 2 + 0.5, TILE / 2, TILE / 2);
        g.strokeStyle = 'rgba(255,255,255,0.02)';
        g.strokeRect(px + 1.5, py + 1.5, TILE - 2, TILE - 2);
      }

      // grime + puddles on any walkable tile
      if (h0 > 0.86) {
        g.fillStyle = 'rgba(0,0,0,0.13)';
        g.beginPath();
        g.ellipse(px + TILE * hash(tx, ty, 5), py + TILE * hash(tx, ty, 6), 14, 8, h0 * 3, 0, Math.PI * 2);
        g.fill();
      }
      if (hash(tx, ty, 8) > 0.92) {
        const puddleX = px + TILE / 2, puddleY = py + TILE / 2;
        const neon = NEON[(hash(tx, ty, 9) * NEON.length) | 0];
        g.fillStyle = 'rgba(10,14,26,0.85)';
        g.beginPath();
        g.ellipse(puddleX, puddleY, 15, 8, 0, 0, Math.PI * 2);
        g.fill();
        const rg = g.createLinearGradient(puddleX, puddleY - 8, puddleX, puddleY + 8);
        rg.addColorStop(0, hexA(neon, 0.16));
        rg.addColorStop(1, 'transparent');
        g.fillStyle = rg;
        g.beginPath();
        g.ellipse(puddleX, puddleY, 13, 6.5, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
  }

  // walls: pseudo-3D with front faces, bevels, AO and neon signage
  for (let ty = 0; ty < w.rows; ty++) {
    for (let tx = 0; tx < w.cols; tx++) {
      if (!wall(tx, ty)) continue;
      const px = tx * TILE, py = ty * TILE;
      const southOpen = ty + 1 < w.rows && !wall(tx, ty + 1);

      // AO shadow cast down / right onto floor
      if (southOpen) {
        const sh = g.createLinearGradient(px, py + TILE, px, py + TILE + 18);
        sh.addColorStop(0, 'rgba(0,0,0,0.55)');
        sh.addColorStop(1, 'transparent');
        g.fillStyle = sh;
        g.fillRect(px, py + TILE, TILE, 18);
      }
      if (tx + 1 < w.cols && !wall(tx + 1, ty)) {
        const sh = g.createLinearGradient(px + TILE, py, px + TILE + 12, py);
        sh.addColorStop(0, 'rgba(0,0,0,0.4)');
        sh.addColorStop(1, 'transparent');
        g.fillStyle = sh;
        g.fillRect(px + TILE, py, 12, TILE);
      }

      if (southOpen) {
        // top face + front face
        const frontH = 19;
        g.fillStyle = '#2f3a52';
        g.fillRect(px, py, TILE, TILE - frontH);
        const ff = g.createLinearGradient(px, py + TILE - frontH, px, py + TILE);
        ff.addColorStop(0, '#232e4a');
        ff.addColorStop(1, '#141b30');
        g.fillStyle = ff;
        g.fillRect(px, py + TILE - frontH, TILE, frontH);
        g.fillStyle = 'rgba(160,200,255,0.16)';
        g.fillRect(px, py + TILE - frontH, TILE, 1.5);
        if (hash(tx, ty, 12) > 0.7) {
          g.fillStyle = 'rgba(90,140,200,0.13)';
          g.fillRect(px + 10, py + TILE - frontH + 5, TILE - 20, 4);
        }
      } else {
        g.fillStyle = '#2a3448';
        g.fillRect(px, py, TILE, TILE);
      }
      // top-face bevels
      g.fillStyle = 'rgba(170,200,255,0.10)';
      if (!wall(tx, ty - 1)) g.fillRect(px, py, TILE, 2);
      if (!wall(tx - 1, ty)) g.fillRect(px, py, 2, TILE);
      g.fillStyle = 'rgba(0,0,0,0.35)';
      if (!wall(tx + 1, ty)) g.fillRect(px + TILE - 2, py, 2, TILE);
      if (hash(tx, ty, 4) > 0.82) {
        g.fillStyle = 'rgba(0,0,0,0.2)';
        g.fillRect(px + 8, py + 8, TILE - 16, TILE - 16);
      }

      // streetlamp pools on sidewalk-adjacent walls
      if (southOpen && hash(tx, ty, 30) > 0.8) {
        const lx = px + TILE / 2, ly = py + TILE + 14;
        const lg = g.createRadialGradient(lx, ly, 4, lx, ly, 64);
        lg.addColorStop(0, 'rgba(255,214,150,0.20)');
        lg.addColorStop(1, 'transparent');
        g.fillStyle = lg;
        g.fillRect(lx - 64, ly - 64, 128, 128);
        cache.lights.push({ kind: 'lamp', x: lx, y: ly, r: 130, color: '#ffc98a', w: 0 });
      }

      // neon sign on south-facing walls
      if (southOpen && hash(tx, ty, 21) > 0.62) {
        const [text, color] = SIGNS[(hash(tx, ty, 22) * SIGNS.length) | 0];
        const sx = px + TILE / 2, sy = py + TILE - 9;
        g.save();
        g.font = 'bold 9px "Segoe UI", sans-serif';
        g.textAlign = 'center';
        g.shadowColor = color;
        g.shadowBlur = 9;
        g.fillStyle = color;
        g.fillText(text, sx, sy);
        g.shadowBlur = 0;
        g.fillStyle = 'rgba(255,255,255,0.75)';
        g.fillText(text, sx, sy);
        const tw = g.measureText(text).width;
        g.restore();
        cache.lights.push({ kind: 'sign', x: sx, y: sy, r: 110, color, w: tw });
      }
    }
  }

  // city-glow colour wash over the whole bake: cyan uptown, magenta downtown
  const wash1 = g.createLinearGradient(0, 0, bw, bh);
  wash1.addColorStop(0, 'rgba(49,211,255,0.05)');
  wash1.addColorStop(0.5, 'rgba(0,0,0,0)');
  wash1.addColorStop(1, 'rgba(255,79,216,0.05)');
  g.fillStyle = wash1;
  g.fillRect(0, 0, bw, bh);
}

function rowChar(w, tx, ty) {
  return w.mission.map[ty]?.[tx] ?? '.';
}

// ---------------------------------------------------------------- entities

function styleFor(e, settings) {
  if (e.kind === 'player') {
    const rhino = e.agentKey === 'rhino';
    return {
      accent: e.agent.color, outfit: rhino ? '#26404f' : '#3d2440',
      trim: rhino ? '#1a2c38' : '#2a1830', skin: rhino ? SKINS[2] : SKINS[0],
      size: rhino ? 1.18 : 0.98, head: 'visor', bulky: rhino, glow: 16,
    };
  }
  if (e.kind === 'civ') {
    const o = CIV_OUTFITS[e.id % CIV_OUTFITS.length];
    return { accent: 'rgba(255,255,255,0.25)', outfit: o, trim: shade(o, 0.6), skin: SKINS[e.id % SKINS.length], size: 0.92, head: 'bare', glow: 0 };
  }
  const hc = settings.highContrastEnemies;
  const base = {
    lookout: { outfit: '#33422c', size: 0.92, head: 'hood' },
    soldier: { outfit: '#324a2e', size: 1.0, head: 'bare' },
    dealer: { outfit: '#27452f', size: 1.0, head: 'cap' },
    bruiser: { outfit: '#2c4030', size: 1.22, head: 'bare', bulky: true },
    bouncer: { outfit: '#1f3a33', size: 1.18, head: 'bare', bulky: true },
    vipguard: { outfit: '#274044', size: 1.0, head: 'cap' },
    chromedog: { outfit: '#3a4a24', size: 1.42, head: 'chrome', bulky: true },
    midnight: { outfit: '#2c1f45', size: 1.24, head: 'cap' },
  }[e.type] ?? { outfit: '#324a2e', size: 1, head: 'bare' };
  return {
    ...base,
    accent: hc ? '#ff5050' : e.color,
    outfit: hc ? '#5a2323' : base.outfit,
    trim: hc ? '#3a1515' : shade(base.outfit, 0.55),
    skin: SKINS[e.id % SKINS.length],
    glow: e.boss ? 14 : 7,
  };
}

function drawHumanoid(ctx, w, e, settings, fx, now) {
  const st = styleFor(e, settings);
  const dead = e.state === 'DEAD';
  const downed = e.state === 'DOWNED' || e.downed;
  const cuffed = e.state === 'CUFFED';
  const surr = e.state === 'SURRENDER' || e.state === 'FAKE_SURRENDER';
  const s = st.size;
  const a = e.aimAngle ?? 0;

  ctx.save();
  ctx.translate(e.x, e.y);

  // soft shadow
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(2, 6, 13 * s, 6 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  if (dead) {
    ctx.rotate(e.id); // varied fall directions
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = shade(st.outfit, 0.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, 15 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(st.skin, 0.6);
    ctx.beginPath();
    ctx.arc(13 * s, 0, 4.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  const hitGlow = e.hitFlash > 0 && !settings.reducedFlash;

  if (downed || cuffed) {
    // lying pose
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = shade(st.outfit, cuffed ? 0.8 : 0.65);
    ctx.beginPath();
    ctx.ellipse(0, 0, 14 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = st.skin;
    ctx.beginPath();
    ctx.arc(10 * s, 0, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (cuffed) {
      ctx.strokeStyle = '#ffd94f';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 9 * s, 0, Math.PI * 2); ctx.stroke();
      tag(ctx, 'CUFFED', 0, -24 * s, '#ffd94f');
    } else {
      tag(ctx, e.kind === 'player' ? 'DOWN — REVIVE' : 'DOWN — CUFF', 0, -24 * s, '#ff9c9c');
    }
    cuffRing(ctx, e, s);
    ctx.restore();
    return;
  }

  // walking legs (under torso)
  const phase = (e.x + e.y) * 0.09;
  const legSwing = Math.sin(phase) * 4;
  ctx.fillStyle = st.trim;
  ctx.beginPath(); ctx.ellipse(Math.cos(a + 1.57) * 4 + Math.cos(a) * legSwing * 0.6, Math.sin(a + 1.57) * 4 + Math.sin(a) * legSwing * 0.6, 3.6 * s, 3.6 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(Math.cos(a - 1.57) * 4 - Math.cos(a) * legSwing * 0.6, Math.sin(a - 1.57) * 4 - Math.sin(a) * legSwing * 0.6, 3.6 * s, 3.6 * s, 0, 0, Math.PI * 2); ctx.fill();

  if (surr) {
    // body without weapon, arms raised
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = st.outfit;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8.5 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = st.skin;
    ctx.lineWidth = 3.4 * s;
    ctx.lineCap = 'round';
    line(ctx, -6 * s, -6 * s, -12 * s, -19 * s);
    line(ctx, 6 * s, -6 * s, 12 * s, -19 * s);
    drawHead(ctx, st, s, 0, 0);
    tag(ctx, 'HANDS UP', 0, -27 * s, '#ffffff');
    cuffRing(ctx, e, s);
    if (e.boss) tag(ctx, e.name ?? 'BOSS', 0, -37 * s, '#ff5f9e');
    ctx.restore();
    return;
  }

  // rotated body frame: +x = facing
  ctx.save();
  ctx.rotate(a);

  if (hitGlow) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 22; }
  else if (st.glow) { ctx.shadowColor = st.accent; ctx.shadowBlur = st.glow * fx; }

  // torso
  ctx.fillStyle = st.outfit;
  ctx.beginPath();
  ctx.ellipse(0, 0, 8.5 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  if (st.bulky) {
    ctx.fillStyle = shade(st.outfit, 1.35);
    ctx.beginPath(); ctx.ellipse(-1 * s, -10 * s, 5 * s, 4.4 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-1 * s, 10 * s, 5 * s, 4.4 * s, 0, 0, Math.PI * 2); ctx.fill();
  }
  // chest accent stripe
  ctx.fillStyle = st.accent;
  ctx.beginPath();
  ctx.ellipse(3.5 * s, 0, 2.6 * s, 7.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // weapon + hands
  const wkey = e.kind === 'player' ? e.weapons?.[e.weaponIdx]?.key : e.ws?.key;
  const wdef = wkey ? WEAPONS[wkey] : null;
  if (wdef && !wdef.melee) {
    const len = wkey === 'shotgun' || wkey === 'rifle' ? 19 : wkey === 'smg' ? 15 : 12;
    ctx.fillStyle = '#10141c';
    ctx.fillRect(6 * s, 2.5 * s, len, 3.4);
    ctx.fillStyle = '#2b3444';
    ctx.fillRect(6 * s, 2.5 * s, 5, 3.4);
    ctx.fillStyle = st.skin;
    ctx.beginPath(); ctx.arc(7 * s, 4.4 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6 * s + len * 0.6, 3.6 * s, 2.4 * s, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = st.skin;
    ctx.beginPath(); ctx.arc(8 * s, 5 * s, 2.8 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8 * s, -5 * s, 2.8 * s, 0, Math.PI * 2); ctx.fill();
  }

  // head
  drawHead(ctx, st, s, 1.5 * s, 0);

  ctx.restore(); // unrotate

  // rim light
  ctx.strokeStyle = hexA(st.accent.startsWith('#') ? st.accent : '#8fb0d8', 0.55);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, 11.5 * s, -Math.PI * 0.85, -Math.PI * 0.15);
  ctx.stroke();

  cuffRing(ctx, e, s);

  if (e.boss) tag(ctx, e.name ?? 'BOSS', 0, -34 * s, '#ff5f9e');
  if (e.kind === 'enemy' && !e.boss && e.hp < e.maxHp && e.hp > 0) hpPip(ctx, e, s, '#9dff57');
  if (e.boss && e.hp < e.maxHp) hpPip(ctx, e, s, '#ff5f9e');

  ctx.restore();
}

function drawHead(ctx, st, s, hx, hy) {
  ctx.fillStyle = st.head === 'chrome' ? '#c8d4e4' : st.skin;
  ctx.beginPath();
  ctx.arc(hx, hy, 5.6 * s, 0, Math.PI * 2);
  ctx.fill();
  if (st.head === 'visor') {
    ctx.fillStyle = st.accent;
    ctx.beginPath();
    ctx.arc(hx, hy, 5.6 * s, -0.9, 0.9);
    ctx.lineTo(hx, hy);
    ctx.fill();
    ctx.fillStyle = shade(st.outfit, 1.5);
    ctx.beginPath();
    ctx.arc(hx, hy, 5.6 * s, 0.9, Math.PI * 2 - 0.9);
    ctx.lineTo(hx, hy);
    ctx.fill();
  } else if (st.head === 'hood') {
    ctx.strokeStyle = st.outfit;
    ctx.lineWidth = 2.6 * s;
    ctx.beginPath();
    ctx.arc(hx, hy, 5.4 * s, 0, Math.PI * 2);
    ctx.stroke();
  } else if (st.head === 'cap') {
    ctx.fillStyle = shade(st.outfit, 1.4);
    ctx.beginPath();
    ctx.arc(hx, hy, 5.6 * s, -2.4, 2.4);
    ctx.fill();
  } else if (st.head === 'chrome') {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(hx - 1.5 * s, hy - 1.5 * s, 1.8 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function cuffRing(ctx, e, s) {
  if (e.cuffProgress > 0 && e.cuffProgress < 1 && e.state !== 'CUFFED') {
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, 20 * s, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#ffd94f';
    ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.arc(0, 0, 20 * s, -Math.PI / 2, -Math.PI / 2 + e.cuffProgress * Math.PI * 2); ctx.stroke();
  }
}

function hpPip(ctx, e, s, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(-15, -21 * s, 30, 4);
  ctx.fillStyle = color;
  ctx.fillRect(-14, -21 * s + 1, 28 * Math.max(0, e.hp / e.maxHp), 2);
}

function tag(ctx, text, x, y, color) {
  ctx.font = 'bold 9px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  const w2 = ctx.measureText(text).width / 2 + 5;
  ctx.fillStyle = 'rgba(4,6,12,0.78)';
  ctx.beginPath();
  ctx.roundRect(x - w2, y - 8, w2 * 2, 12, 6);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillText(text, x, y + 1);
}

// ---------------------------------------------------------------- props & pickups

function drawProp(ctx, pr) {
  ctx.save();
  ctx.translate(pr.x, pr.y);
  const maxHp = pr.kind === 'shelf' ? 90 : 60;
  const dmg = pr.hp / maxHp;
  const r = pr.r;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(3, r * 0.5 + 3, r, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  if (pr.kind === 'barrier') {
    // concrete jersey barrier
    ctx.fillStyle = '#39414f';
    ctx.beginPath(); ctx.roundRect(-r, -r * 0.55, r * 2, r * 1.1, 4); ctx.fill();
    ctx.fillStyle = '#4a5464';
    ctx.fillRect(-r, -r * 0.55, r * 2, 4);
    ctx.fillStyle = 'rgba(255,217,79,0.5)';
    ctx.fillRect(-r + 3, -2, 8, 4); ctx.fillRect(r - 11, -2, 8, 4);
    ctx.restore();
    return;
  }
  if (pr.kind === 'shelf') {
    ctx.fillStyle = '#2e3c50';
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.fillStyle = '#22303f';
    ctx.fillRect(-r + 3, -r + 3, r * 2 - 6, r * 2 - 6);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = ['#7a4f4f', '#4f6a7a', '#6a7a4f', '#7a6a4f'][i % 4];
      if (dmg > i / 6) ctx.fillRect(-r + 5 + (i % 3) * (r * 0.6), -r + 6 + ((i / 3) | 0) * (r * 0.85), r * 0.5, r * 0.6);
    }
    ctx.strokeStyle = 'rgba(140,180,240,0.18)';
    ctx.strokeRect(-r, -r, r * 2, r * 2);
  } else {
    ctx.fillStyle = '#54432c';
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.fillStyle = '#63513a';
    ctx.fillRect(-r + 2, -r + 2, r * 2 - 4, r * 2 - 4);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    line(ctx, -r, -r, r, r);
    line(ctx, r, -r, -r, r);
    ctx.strokeStyle = 'rgba(255,220,160,0.14)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-r + 1, -r + 1, r * 2 - 2, r * 2 - 2);
  }
  if (dmg < 0.66) {
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.4);
    ctx.lineTo(-r * 0.1, r * 0.15);
    ctx.lineTo(r * 0.4, -r * 0.1);
    ctx.stroke();
  }
  if (dmg < 0.33) {
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.beginPath();
    ctx.moveTo(r * 0.5, -r * 0.7);
    ctx.lineTo(0, 0);
    ctx.lineTo(r * 0.2, r * 0.7);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPickup(ctx, pk, now, fx) {
  const bob = Math.sin(now / 350 + pk.id) * 2.5;
  const pulse = 0.65 + 0.35 * Math.sin(now / 300 + pk.id);
  ctx.save();
  ctx.translate(pk.x, pk.y + bob);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 10 - bob, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  if (pk.kind === 'evidence') {
    ctx.shadowColor = '#ffd94f'; ctx.shadowBlur = 16 * fx * pulse;
    ctx.fillStyle = '#e9c33f';
    ctx.beginPath(); ctx.roundRect(-9, -11, 18, 22, 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#8a6d14';
    ctx.fillRect(-9, -11, 18, 5);
    ctx.fillStyle = '#0a0d12';
    ctx.fillRect(-6, -3, 12, 2); ctx.fillRect(-6, 1, 12, 2); ctx.fillRect(-6, 5, 8, 2);
    tag(ctx, 'EVIDENCE', 0, -20, '#ffd94f');
  } else if (pk.kind === 'medkit') {
    ctx.shadowColor = '#6dff9e'; ctx.shadowBlur = 12 * fx * pulse;
    ctx.fillStyle = '#eef4f0';
    ctx.beginPath(); ctx.roundRect(-10, -8, 20, 16, 3); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#2fae62';
    ctx.fillRect(-2.5, -5.5, 5, 11); ctx.fillRect(-5.5, -2.5, 11, 5);
  } else {
    ctx.shadowColor = '#7db4ff'; ctx.shadowBlur = 12 * fx * pulse;
    ctx.fillStyle = '#141a26';
    ctx.beginPath(); ctx.roundRect(-14, -5, 28, 9, 2); ctx.fill();
    ctx.fillStyle = '#39527a';
    ctx.fillRect(2, -9, 7, 7);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#7db4ff';
    ctx.fillRect(-11, -3, 5, 3);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- vehicles

import { VEHICLE_TYPES } from './vehicles.js';

function drawVehicle(ctx, v, settings, fx, now) {
  const t = VEHICLE_TYPES[v.type];
  const L = v.r * 2.3, W2 = v.r * 1.35;
  ctx.save();
  ctx.translate(v.x, v.y);

  // ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.ellipse(3, 5, L * 0.52, W2 * 0.6, v.angle, 0, Math.PI * 2); ctx.fill();

  ctx.rotate(v.angle);
  const body = v.disabled ? shade(t.color, 0.45) : t.color;

  if (v.hitFlash > 0 && !settings.reducedFlash) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 18; }

  // wheels
  ctx.fillStyle = '#0b0e13';
  for (const [wx, wy] of [[-L * 0.32, -W2 * 0.52], [-L * 0.32, W2 * 0.52], [L * 0.3, -W2 * 0.52], [L * 0.3, W2 * 0.52]]) {
    ctx.fillRect(wx - 5, wy - 3, 10, 6);
  }
  // body
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.roundRect(-L / 2, -W2 / 2, L, W2, 6); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (v.type === 'truck') {
    // cargo box with satirical branding
    ctx.fillStyle = shade(body, 1.25);
    ctx.beginPath(); ctx.roundRect(-L / 2 + 4, -W2 / 2 + 3, L * 0.62, W2 - 6, 3); ctx.fill();
    ctx.save();
    ctx.rotate(Math.PI / 2);
    ctx.font = 'bold 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9dff57';
    ctx.fillText('GLOW⁰', 0, L * 0.12);
    ctx.restore();
    // cab windshield
    ctx.fillStyle = '#101722';
    ctx.fillRect(L * 0.22, -W2 / 2 + 4, 6, W2 - 8);
  } else {
    // roof + windshield
    ctx.fillStyle = shade(body, 0.7);
    ctx.beginPath(); ctx.roundRect(-L * 0.18, -W2 / 2 + 3, L * 0.42, W2 - 6, 4); ctx.fill();
    ctx.fillStyle = '#101722';
    ctx.fillRect(L * 0.22, -W2 / 2 + 4, 5, W2 - 8);
  }

  if (!v.disabled) {
    // headlights + taillights
    ctx.fillStyle = '#fff2ba';
    ctx.fillRect(L / 2 - 3, -W2 / 2 + 2, 3, 5);
    ctx.fillRect(L / 2 - 3, W2 / 2 - 7, 3, 5);
    ctx.fillStyle = t.tail;
    ctx.fillRect(-L / 2, -W2 / 2 + 2, 3, 5);
    ctx.fillRect(-L / 2, W2 / 2 - 7, 3, 5);
  }

  // patrol lightbar
  if (v.type === 'patrol' && !v.disabled) {
    const phase = settings.reducedFlash ? 0.5 : (Math.floor(now / 180) % 2);
    ctx.shadowBlur = settings.reducedFlash ? 6 : 14;
    ctx.shadowColor = phase ? '#ff4040' : '#31a8ff';
    ctx.fillStyle = settings.reducedFlash ? '#b06cff' : (phase ? '#ff4040' : '#31a8ff');
    ctx.fillRect(-4, -W2 / 2 + 4, 8, W2 - 8);
    ctx.shadowBlur = 0;
  }

  ctx.restore();

  // damage smoke (world-space, drifts up)
  if ((v.disabled || v.hp < v.maxHp * 0.4) && !settings.reducedFlash) {
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const tt = ((now / 900) + i * 0.33) % 1;
      ctx.globalAlpha = (1 - tt) * 0.35 * fx;
      ctx.fillStyle = v.disabled ? '#222' : '#555';
      ctx.beginPath();
      ctx.arc(v.x - Math.cos(v.angle) * v.r * 0.6 + Math.sin(now / 300 + i) * 6, v.y - Math.sin(v.angle) * v.r * 0.6 - tt * 30, 4 + tt * 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // hp pip for hostile vehicles
  if (!v.disabled && v.tag && v.hp < v.maxHp) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(v.x - 18, v.y - v.r - 12, 36, 4);
    ctx.fillStyle = v.tag === 'truck' ? '#ffca6b' : '#ff8a3d';
    ctx.fillRect(v.x - 17, v.y - v.r - 11, 34 * (v.hp / v.maxHp), 2);
  }
  if (v.tag === 'truck' && !v.disabled) tag(ctx, 'SHIPMENT', v.x, v.y - v.r - 18, '#ffca6b');
}

// ---------------------------------------------------------------- effects

function drawEffect(ctx, f, settings, fx) {
  const t = f.t / f.dur;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.globalAlpha = Math.max(0, 1 - t) * fx;
  if (f.kind === 'muzzle' && !settings.reducedFlash) {
    ctx.rotate(f.a);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#fff4c8';
    star(ctx, 0, 0, 4, 16, 5);
    ctx.fillStyle = '#ffca6b';
    ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(26, 0); ctx.lineTo(0, 4); ctx.fill();
  } else if (f.kind === 'hit') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 5 + t * 16, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#ffd0a0';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + f.x;
      const rr = 4 + t * 20;
      line(ctx, Math.cos(a) * rr * 0.5, Math.sin(a) * rr * 0.5, Math.cos(a) * rr, Math.sin(a) * rr);
    }
  } else if (f.kind === 'spark') {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#ffd94f';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + f.x;
      const rr = t * 22;
      ctx.fillRect(Math.cos(a) * rr - 1.5, Math.sin(a) * rr - 1.5 - t * t * 10, 3, 3);
    }
  } else if (f.kind === 'debris' || f.kind === 'break') {
    const n = f.kind === 'break' ? 9 : 5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + f.x * 1.3;
      const rr = t * (f.kind === 'break' ? 34 : 20);
      ctx.save();
      ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr + t * t * 14);
      ctx.rotate(a + t * 6);
      ctx.fillStyle = i % 2 ? '#6b573b' : '#4a3c28';
      ctx.fillRect(-3, -2, 6, 4);
      ctx.restore();
    }
  } else if (f.kind === 'swing') {
    ctx.rotate(f.a);
    const g2 = ctx.createLinearGradient(0, -30, 0, 30);
    g2.addColorStop(0, 'rgba(255,255,255,0)');
    g2.addColorStop(0.5, 'rgba(255,255,255,0.9)');
    g2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = g2;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 32, -0.95 + t * 0.7, 0.95 + t * 0.7);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- helpers

function line(ctx, x0, y0, x1, y1) {
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
}

function radial(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function star(ctx, x, y, r0, r1, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? r0 : r1;
    const a = (i / (points * 2)) * Math.PI * 2;
    ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}

function shade(hex, f) {
  if (!hex.startsWith('#')) return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return `rgb(${r},${g},${b})`;
}

function hexA(hex, a) {
  if (!hex.startsWith('#')) return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
