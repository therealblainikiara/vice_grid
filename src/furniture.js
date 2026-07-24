// furniture.js — procedural furniture kit (Art Uplift Phase 2).
// Every builder returns a THREE.Group assembled from primitives at human scale
// on the 48px = ~2m tile grid (desk top 18px ≈ 75cm, partition 29px ≈ 1.2m,
// fridge 43px ≈ 1.8m). Shared material palette; no textures, no external
// assets. Consumed by render3d.js for themed props (Phase 2) and by the room
// dresser (Phase 3). Combat-area pieces stay under ~34px so top-down play can
// see and shoot over them; tall pieces belong against walls.

import * as THREE from 'three';

// Cached one-off colour materials. Minting a fresh material per book/frame
// would defeat the static merge pass in render3d (materials are the merge key).
const COLOR_MATS = new Map();
function colorMat(hex, o = {}) {
  const key = hex + '|' + (o.e ?? '') + '|' + (o.ei ?? '');
  if (!COLOR_MATS.has(key)) {
    COLOR_MATS.set(key, new THREE.MeshStandardMaterial({
      color: hex, roughness: o.r ?? 0.9,
      ...(o.e ? { emissive: o.e, emissiveIntensity: o.ei ?? 0.15 } : {}),
    }));
  }
  return COLOR_MATS.get(key);
}

let M = null;
function mats() {
  if (M) return M;
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.75, metalness: o.m ?? 0.08, ...(o.e ? { emissive: o.e, emissiveIntensity: o.ei ?? 1 } : {}) });
  M = {
    woodLight: std('#8a6a42', { r: 0.6 }),
    woodMid: std('#6e5233', { r: 0.62 }),
    woodDark: std('#4e371f', { r: 0.65 }),
    metal: std('#9aa1a8', { r: 0.35, m: 0.7 }),
    metalDark: std('#565c64', { r: 0.4, m: 0.6 }),
    plastic: std('#2e3238', { r: 0.55 }),
    panelGrey: std('#aab0b6', { r: 0.85 }),
    fabricWhite: std('#d8d4ca', { r: 0.95 }),
    fabricBlue: std('#48597a', { r: 0.95 }),
    paper: std('#e8e4da', { r: 0.9 }),
    screen: std('#0e1420', { r: 0.2, e: '#9fd0ff', ei: 1.5 }),
    screenOff: std('#0e1420', { r: 0.2, e: '#16202c', ei: 0.6 }),
    foliage: std('#3e6b3a', { r: 0.9 }),
    foliageDark: std('#2e5230', { r: 0.9 }),
    pot: std('#7a4a34', { r: 0.8 }),
    cardboard: std('#b08a5a', { r: 0.95 }),
    white: std('#dfe0e2', { r: 0.6 }),
    red: std('#b03a30', { r: 0.55 }),
    cork: std('#a8794a', { r: 0.95 }),
    glassBlue: new THREE.MeshStandardMaterial({ color: '#7ab8d8', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.55 }),
    vendGlow: std('#101820', { r: 0.3, e: '#6fc4ff', ei: 1.8 }),
    lightGreen: std('#183018', { r: 0.4, e: '#66ff88', ei: 2.5 }),
  };
  return M;
}

function box(g, wid, h, d, mat, x = 0, y = 0, z = 0, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(wid, h, d), mat);
  m.position.set(x, y, z);
  if (ry) m.rotation.y = ry;
  m.castShadow = true; m.receiveShadow = true;
  g.add(m); return m;
}
function cyl(g, rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  g.add(m); return m;
}

export function officeChair(opts = {}) {
  const k = mats(), g = new THREE.Group();
  cyl(g, 5, 5, 1, k.plastic, 0, 0.5, 0);          // star base (disc)
  cyl(g, 0.9, 0.9, 8, k.metalDark, 0, 5, 0);      // gas post
  box(g, 9, 2.2, 9, k.fabricBlue, 0, 11, 0);      // seat
  box(g, 9, 11, 2, k.fabricBlue, 0, 17.5, -4);    // back
  if (opts.ry) g.rotation.y = opts.ry;
  return g;
}

export function officeDesk(opts = {}) {
  const k = mats(), g = new THREE.Group();
  box(g, 30, 2.4, 15, k.woodLight, 0, 18, 0);     // top
  box(g, 2.4, 17, 13, k.woodMid, -13.5, 8.5, 0);  // side panels
  box(g, 2.4, 17, 13, k.woodMid, 13.5, 8.5, 0);
  // monitor + keyboard + papers
  box(g, 2.5, 1.2, 2.5, k.plastic, 5, 19.8, -4);
  const scr = box(g, 10, 6.5, 0.8, opts.off ? k.screenOff : k.screen, 5, 24.5, -4.4);
  scr.rotation.x = -0.12;
  box(g, 8, 0.8, 3.4, k.plastic, 3, 19.6, 1.5);
  box(g, 4.5, 0.3, 5.5, k.paper, -8, 19.4, 1, 0.2);
  const ch = officeChair({ ry: Math.PI }); ch.position.set(0, 0, 12); g.add(ch);
  return g;
}

export function cubicle(opts = {}) {
  const k = mats(), g = new THREE.Group();
  const pH = 29;                                   // 1.2m partition — see-over
  box(g, 34, pH, 2, k.panelGrey, 0, pH / 2, -12); // back panel
  box(g, 2, pH, 24, k.panelGrey, -17, pH / 2, 0); // side panel
  box(g, 2, pH * 0.8, 12, k.panelGrey, 17, pH * 0.4, -6); // half panel
  box(g, 28, 2, 11, k.woodLight, -1, 17, -6);     // desk top
  box(g, 11, 2, 12, k.woodLight, -11, 17, 4);     // L return
  box(g, 2.4, 16, 9, k.woodMid, -15.5, 8, -6);
  box(g, 2.4, 16, 9, k.woodMid, 12, 8, -6);
  box(g, 2.5, 1.2, 2.5, k.plastic, 2, 18.8, -8);
  const scr = box(g, 9, 6, 0.8, opts.off ? k.screenOff : k.screen, 2, 23.5, -8.6);
  scr.rotation.x = -0.12;
  box(g, 4.5, 0.3, 5.5, k.paper, -9, 18.3, -4, -0.3);
  box(g, 4, 0.3, 5, k.paper, 8, 18.3, -3, 0.4);
  const ch = officeChair({ ry: Math.PI }); ch.position.set(0, 0, 6); g.add(ch);
  if (opts.flip) g.scale.x = -1;
  return g;
}

export function executiveDesk() {
  const k = mats(), g = new THREE.Group();
  box(g, 36, 3, 18, k.woodDark, 0, 20, 0);
  box(g, 34, 12, 2.5, k.woodMid, 0, 12, 8);       // modesty panel
  box(g, 3, 19, 16, k.woodMid, -16, 9.5, 0);
  box(g, 3, 19, 16, k.woodMid, 16, 9.5, 0);
  box(g, 5, 0.4, 6, k.paper, -6, 21.9, -2, 0.15);
  box(g, 10, 6, 0.8, mats().screen, 8, 26, -4).rotation.x = -0.1;
  const ch = officeChair({ ry: Math.PI }); ch.position.set(0, 0, 14); g.add(ch);
  return g;
}

export function sofa() {
  const k = mats(), g = new THREE.Group();
  box(g, 34, 7, 14, k.fabricWhite, 0, 4.5, 0);    // base
  box(g, 34, 10, 4, k.fabricWhite, 0, 12, -6);    // back
  box(g, 5, 11, 14, k.fabricWhite, -16.5, 7.5, 0);
  box(g, 5, 11, 14, k.fabricWhite, 16.5, 7.5, 0);
  box(g, 14, 2.6, 11, k.fabricWhite, -7.5, 9.3, 1);
  box(g, 14, 2.6, 11, k.fabricWhite, 7.5, 9.3, 1);
  return g;
}

export function coffeeTable() {
  const k = mats(), g = new THREE.Group();
  box(g, 18, 1.8, 10, k.woodMid, 0, 10, 0);
  for (const [lx, lz] of [[-7.5, -3.5], [7.5, -3.5], [-7.5, 3.5], [7.5, 3.5]]) cyl(g, 0.8, 0.8, 9, k.woodDark, lx, 4.8, lz);
  box(g, 5, 0.3, 4, k.paper, 2, 11.1, 0, 0.3);
  return g;
}

export function conferenceSet() {
  const k = mats(), g = new THREE.Group();
  box(g, 58, 2.8, 20, k.woodMid, 0, 18, 0);
  box(g, 8, 16, 14, k.woodDark, -19, 8.5, 0);
  box(g, 8, 16, 14, k.woodDark, 19, 8.5, 0);
  for (const sx of [-19, 0, 19]) for (const sz of [-16, 16]) {
    const ch = officeChair({ ry: sz > 0 ? Math.PI : 0 }); ch.position.set(sx, 0, sz); g.add(ch);
  }
  return g;
}

export function bookshelf() {
  const k = mats(), g = new THREE.Group();
  box(g, 24, 54, 10, k.woodMid, 0, 27, 0);
  for (let i = 0; i < 3; i++) {
    box(g, 21, 8, 8.5, k.plastic, 0, 11 + i * 14, 0.8);
    for (let b = 0; b < 5; b++) {
      const c = ['#8a3a34', '#3a5a7a', '#5a7a3a', '#a08040', '#6a4a7a'][(i * 5 + b) % 5];
      box(g, 3.4, 7, 7.5, colorMat(c), -8.5 + b * 4.2, 11.5 + i * 14, 0.9);
    }
  }
  return g;
}

export function storageShelf() {
  const k = mats(), g = new THREE.Group();
  for (const [px, pz] of [[-11, -5], [11, -5], [-11, 5], [11, 5]]) box(g, 2, 54, 2, k.metalDark, px, 27, pz);
  for (let i = 0; i < 3; i++) {
    box(g, 24, 1.6, 12, k.metal, 0, 10 + i * 17, 0);
    box(g, 8, 7, 8, k.cardboard, -6 + (i * 5) % 10, 14.5 + i * 17, 0, 0.15 * i);
    if (i !== 1) box(g, 6.5, 6, 7, k.cardboard, 6, 14 + i * 17, -1, -0.2);
  }
  return g;
}

export function filingCabinet() {
  const k = mats(), g = new THREE.Group();
  box(g, 14, 44, 16, k.metalDark, 0, 22, 0);
  for (let i = 0; i < 3; i++) {
    box(g, 12, 11, 1, k.metal, 0, 9 + i * 13.5, 8.2);
    box(g, 6, 1.2, 1, k.plastic, 0, 12 + i * 13.5, 8.8);
  }
  return g;
}

export function printerCopier() {
  const k = mats(), g = new THREE.Group();
  box(g, 20, 22, 16, k.panelGrey, 0, 11, 0);
  box(g, 16, 2, 10, k.plastic, 0, 23, 0);
  box(g, 12, 1, 8, k.paper, 0, 24.4, 0);
  box(g, 2, 1, 1, k.lightGreen, 7, 20, 8.2);
  return g;
}

export function kitchenRun() {
  const k = mats(), g = new THREE.Group();
  box(g, 46, 18, 14, k.woodMid, 0, 9, 0);         // base cabinets
  box(g, 48, 2, 16, k.metal, 0, 19, 0);           // worktop
  box(g, 10, 1.2, 8, k.metalDark, -8, 20, 0);     // sink
  box(g, 3, 3, 1, k.metal, -8, 22, -3.4);         // tap
  for (let i = 0; i < 3; i++) box(g, 1, 8, 0.8, k.plastic, -14 + i * 14, 9, 7.2);
  box(g, 40, 11, 8, k.woodMid, 0, 42, -3);        // overhead cabinets (wall)
  return g;
}

export function fridge() {
  const k = mats(), g = new THREE.Group();
  box(g, 18, 44, 18, k.white, 0, 22, 0);
  box(g, 1.2, 14, 1.2, k.metal, 8, 30, 9.2);
  box(g, 1.2, 8, 1.2, k.metal, 8, 14, 9.2);
  return g;
}

export function vendingMachine() {
  const k = mats(), g = new THREE.Group();
  box(g, 20, 50, 16, k.plastic, 0, 25, 0);
  box(g, 13, 30, 0.8, k.vendGlow, -1.5, 30, 8.3);
  box(g, 4, 10, 0.8, k.metalDark, 7, 18, 8.3);
  return g;
}

export function breakTable() {
  const k = mats(), g = new THREE.Group();
  cyl(g, 11, 11, 1.8, k.woodLight, 0, 16, 0, 14);
  cyl(g, 1.8, 1.8, 14, k.metalDark, 0, 8, 0);
  cyl(g, 6, 6, 1, k.metalDark, 0, 0.5, 0, 12);
  return g;
}

export function cafeChair(opts = {}) {
  const k = mats(), g = new THREE.Group();
  box(g, 8, 1.6, 8, k.fabricBlue, 0, 10, 0);
  box(g, 8, 8, 1.4, k.fabricBlue, 0, 15, -3.5);
  for (const [lx, lz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) cyl(g, 0.6, 0.6, 9.5, k.metalDark, lx, 5, lz, 6);
  if (opts.ry) g.rotation.y = opts.ry;
  return g;
}

export function plant(size = 1) {
  const k = mats(), g = new THREE.Group();
  const s = size;
  cyl(g, 4 * s, 3.2 * s, 6 * s, k.pot, 0, 3 * s, 0);
  cyl(g, 0.7 * s, 0.9 * s, 7 * s, k.woodDark, 0, 9 * s, 0, 6);
  const leaf = (x, y, z, r) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 6), Math.random() > 0.5 ? k.foliage : k.foliageDark);
    m.position.set(x, y, z); m.castShadow = true; g.add(m);
  };
  leaf(0, 15 * s, 0, 5.2 * s); leaf(3 * s, 12.5 * s, 1.5 * s, 3.4 * s); leaf(-2.8 * s, 13 * s, -1.6 * s, 3.6 * s);
  return g;
}

export function waterCooler() {
  const k = mats(), g = new THREE.Group();
  box(g, 9, 22, 9, k.white, 0, 11, 0);
  cyl(g, 4, 4, 9, mats().glassBlue, 0, 26, 0);
  return g;
}

export function fireExtinguisher() {
  const k = mats(), g = new THREE.Group();
  cyl(g, 2.2, 2.2, 9, k.red, 0, 4.5, 0);
  box(g, 1, 2.5, 1.6, k.metalDark, 0, 10, 0);
  return g;
}

export function coatRack() {
  const k = mats(), g = new THREE.Group();
  cyl(g, 5, 5, 1, k.woodDark, 0, 0.5, 0);
  cyl(g, 1, 1, 44, k.woodMid, 0, 22, 0, 8);
  for (let i = 0; i < 4; i++) box(g, 6, 1, 1, k.woodDark, 0, 41 - i * 2.2, 0, i * Math.PI / 4);
  return g;
}

// wall decor: flat pieces meant to hang on a wall face (Phase 3 orients them)
export function wallArt(v = 0) {
  const k = mats(), g = new THREE.Group();
  box(g, 12, 9, 1, k.woodDark, 0, 0, 0);
  const c = ['#3a5a7a', '#5a7a5a', '#7a5a3a', '#54547a'][v % 4];
  box(g, 10.2, 7.2, 0.4, colorMat(c, { r: 0.8, e: c, ei: 0.15 }), 0, 0, 0.5);
  return g;
}
export function whiteboard() {
  const k = mats(), g = new THREE.Group();
  box(g, 20, 12, 0.8, k.metal, 0, 0, 0);
  box(g, 18.4, 10.4, 0.4, k.white, 0, 0, 0.5);
  box(g, 16, 0.8, 1.6, k.metal, 0, -6.5, 0.5);
  return g;
}
export function wallTV() {
  const g = new THREE.Group();
  box(g, 20, 11, 1, mats().plastic, 0, 0, 0);
  box(g, 18.6, 9.6, 0.4, mats().screenOff, 0, 0, 0.6);
  return g;
}
export function wallClock() {
  const g = new THREE.Group();
  cyl(g, 3.2, 3.2, 0.8, mats().white, 0, 0, 0).rotation.x = Math.PI / 2;
  box(g, 0.4, 2.2, 0.3, mats().plastic, 0, 0.6, 0.5);
  box(g, 1.6, 0.4, 0.3, mats().plastic, 0.5, 0, 0.5);
  return g;
}

export const FURNITURE = {
  officeDesk, officeChair, cubicle, executiveDesk, sofa, coffeeTable,
  conferenceSet, bookshelf, storageShelf, filingCabinet, printerCopier,
  kitchenRun, fridge, vendingMachine, breakTable, cafeChair, plant,
  waterCooler, fireExtinguisher, coatRack, wallArt, whiteboard, wallTV, wallClock,
};
