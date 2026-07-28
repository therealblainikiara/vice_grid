// layout.js — per-environment layout archetypes. Pure; no DOM/THREE.
//
// An archetype turns a size + entrance into a believable floorplan: a shell with
// the RIGHT kind of perimeter (a dock opens to water, an office is walled), an
// entrance that isn't the same bottom-left corner every time, and NAMED ZONES a
// mission places content into (boss in the exec suite, waves at reception) rather
// than hard-coded x,y. Mirrors the furnish.js discipline: one deterministic
// expansion consumed by both the sim (world.js) and the renderers.
//
//   buildLayout(spec) -> { map, zones, spawn, edges, archetype }
//     spec  = { archetype, size:[cols,rows], entrance, seed }
//     map   = string rows (same shape buildMap returns)
//     zones = { name: [{tx,ty,tw,th}, ...] }   tiles, semantic rooms
//     spawn = { x, y }  pixels, derived from the entrance
//     edges = { n,e,s,w } each an EDGE type
//
//   resolveZone(layout, name, busy, seed) -> { tx, ty } | null
//     deterministically picks a free walkable tile inside a named zone.

import { makeRng } from './core.js';

const T = 48;

// Perimeter edge kinds. Collision is unaffected — solidAt() already blocks
// off-map — so an open edge is purely a look + a fall-out band anchor.
export const EDGE = { WALL: 'wall', WATER: 'water', VOID: 'void', FENCE: 'fence', PLAZA: 'plaza' };

export function buildLayout(spec) {
  const [cols, rows] = spec.size;
  const rng = makeRng(spec.seed ?? 1);
  const g = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) =>
      (x === 0 || y === 0 || x === cols - 1 || y === rows - 1 ? '#' : '.')));

  // put() may write the border too (archetypes carve doors / open edges there).
  const put = (x, y, ch) => { if (y >= 0 && y < rows && x >= 0 && x < cols) g[y][x] = ch; };
  const rect = (x, y, w, h, ch) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(i, j, ch); };
  const hwall = (y, x0, x1) => { for (let x = x0; x <= x1; x++) put(x, y, '#'); };
  const vwall = (x, y0, y1) => { for (let y = y0; y <= y1; y++) put(x, y, '#'); };
  const door = (x, y, w = 2) => rect(x, y, w, 1, '.');

  const ctx = { cols, rows, put, rect, hwall, vwall, door, rng, entrance: spec.entrance };
  const arch = ARCHES[spec.archetype] ?? ARCHES.plain;
  const { zones, spawn, edges } = arch(ctx);
  return { map: g.map((r) => r.join('')), zones, spawn, edges, archetype: spec.archetype };
}

// --- archetypes -------------------------------------------------------------

// Office / high-rise: enter through reception (a walled lobby), up a spine into
// the open-plan floor, with the exec suite sealed in the deep corner.
function officeArch({ cols, rows, rect, hwall, vwall, door }) {
  const edges = { n: EDGE.WALL, e: EDGE.WALL, s: EDGE.WALL, w: EDGE.WALL };

  // south entrance: a threshold gap in the bottom wall
  const doorW = 3, doorX = Math.floor(cols / 2) - 1;
  rect(doorX, rows - 1, doorW, 1, ',');

  // reception band along the south, sealed off with a partition + doorway
  const recTh = 4, recTy = rows - 1 - recTh;
  const reception = [{ tx: 1, ty: recTy, tw: cols - 2, th: recTh }];
  const partY = recTy - 1;
  hwall(partY, 1, cols - 2);
  door(doorX, partY, 3);

  // exec suite: a walled room in the north-east corner
  const exW = Math.min(10, Math.floor(cols / 3)), exH = 5;
  const exTx = cols - 1 - exW, exTy = 1;
  const exec = [{ tx: exTx, ty: exTy, tw: exW, th: exH }];
  vwall(exTx - 1, exTy, exTy + exH);
  hwall(exTy + exH, exTx - 1, cols - 2);
  door(exTx + Math.floor(exW / 2), exTy + exH, 2);

  // open plan fills the middle; a spine corridor runs from the reception door up
  const opTy = exTy + exH + 1;
  const opTh = partY - opTy;
  const openPlan = [{ tx: 1, ty: opTy, tw: cols - 2, th: opTh }];
  const corridor = [{ tx: doorX, ty: opTy, tw: 3, th: opTh }];

  const spawn = { x: (doorX + doorW / 2) * T, y: (rows - 2) * T };
  return { zones: { reception, openPlan, exec, corridor }, spawn, edges };
}

// Port / dock: NOT a sealed building. The seaward (north) edge is open water;
// you enter from the landward gate, cross the container yard to the quay apron
// and the manifest office.
function dockArch({ cols, rows, rect, put }) {
  const edges = { n: EDGE.WATER, e: EDGE.WALL, s: EDGE.WALL, w: EDGE.WALL };

  // open the seaward edge to water (~ = the game's existing wet-apron tile)
  for (let x = 1; x < cols - 1; x++) put(x, 0, '~');
  rect(1, 1, cols - 2, 2, '~'); // wet quay apron just inside the water line

  // landward gate: a gap in the west wall
  const gateY = Math.floor(rows / 2) - 1;
  rect(0, gateY, 1, 3, ',');

  const quay = [{ tx: 1, ty: 3, tw: cols - 2, th: 3 }];
  const yard = [{ tx: 1, ty: 6, tw: cols - 2, th: rows - 8 }];
  const office = [{ tx: cols - 9, ty: rows - 6, tw: 8, th: 5 }];

  const spawn = { x: 1.5 * T, y: (gateY + 1.5) * T };
  return { zones: { quay, yard, office }, spawn, edges };
}

// Fallback: a plain sealed box with one generic zone. Keeps buildLayout total
// for environments that haven't been given a signature yet.
function plainArch({ cols, rows }) {
  const edges = { n: EDGE.WALL, e: EDGE.WALL, s: EDGE.WALL, w: EDGE.WALL };
  const area = [{ tx: 1, ty: 1, tw: cols - 2, th: rows - 2 }];
  const spawn = { x: 2.5 * T, y: (rows - 2.5) * T };
  return { zones: { area }, spawn, edges };
}

const ARCHES = { office: officeArch, dock: dockArch, plain: plainArch };

// --- semantic placement -----------------------------------------------------

// Pick a free walkable tile inside a named zone. Deterministic for a given
// (layout, zone, seed, busy-state). Does NOT mutate busy — the CALLER marks the
// returned tile busy so the next call in a shared placement pass avoids it.
// Returns null if the zone is missing or full.
export function resolveZone(layout, name, busy, seed = 1) {
  const rects = layout.zones?.[name];
  if (!rects || !rects.length) return null;
  const cells = [];
  for (const r of rects) {
    for (let ty = r.ty; ty < r.ty + r.th; ty++) {
      for (let tx = r.tx; tx < r.tx + r.tw; tx++) {
        if (layout.map[ty]?.[tx] === '#') continue;
        if (busy.has(tx + ',' + ty)) continue;
        cells.push({ tx, ty });
      }
    }
  }
  if (!cells.length) return null;
  const rng = makeRng(((seed * 2654435761) + cells.length) >>> 0);
  return cells[Math.floor(rng() * cells.length)];
}
