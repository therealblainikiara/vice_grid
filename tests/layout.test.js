import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLayout, resolveZone } from '../src/layout.js';

const T = 48;
const dims = (map) => ({ rows: map.length, cols: map[0].length });
const at = (map, tx, ty) => map[ty]?.[tx];
const walkable = (ch) => ch !== '#';
const inRect = (tx, ty, r) => tx >= r.tx && tx < r.tx + r.tw && ty >= r.ty && ty < r.ty + r.th;

// --- office archetype -------------------------------------------------------

test('office archetype builds a map of the requested size', () => {
  const L = buildLayout({ archetype: 'office', size: [34, 22], entrance: 'reception-s' });
  const { rows, cols } = dims(L.map);
  assert.equal(cols, 34);
  assert.equal(rows, 22);
});

test('office archetype walls all four edges except the entrance gap', () => {
  const L = buildLayout({ archetype: 'office', size: [34, 22], entrance: 'reception-s' });
  assert.deepEqual(L.edges, { n: 'wall', e: 'wall', s: 'wall', w: 'wall' });
  // north/east/west fully sealed
  const { rows, cols } = dims(L.map);
  for (let x = 0; x < cols; x++) assert.equal(at(L.map, x, 0), '#', `north open at ${x}`);
  for (let y = 0; y < rows; y++) {
    assert.equal(at(L.map, 0, y), '#', `west open at ${y}`);
    assert.equal(at(L.map, cols - 1, y), '#', `east open at ${y}`);
  }
  // south wall has at least one gap (the entrance)
  let gap = 0;
  for (let x = 0; x < cols; x++) if (at(L.map, x, rows - 1) !== '#') gap++;
  assert.ok(gap >= 1, 'south entrance has no gap');
});

test('office archetype exposes reception, openPlan and exec zones, in-bounds and walkable', () => {
  const L = buildLayout({ archetype: 'office', size: [34, 22], entrance: 'reception-s' });
  for (const key of ['reception', 'openPlan', 'exec']) {
    assert.ok(Array.isArray(L.zones[key]) && L.zones[key].length >= 1, `missing zone ${key}`);
    for (const r of L.zones[key]) {
      assert.ok(r.tx >= 1 && r.ty >= 1 && r.tx + r.tw <= 33 && r.ty + r.th <= 21, `zone ${key} out of bounds`);
    }
  }
});

test('office spawn is inside reception, near the south entrance, on a walkable tile', () => {
  const L = buildLayout({ archetype: 'office', size: [34, 22], entrance: 'reception-s' });
  const tx = Math.floor(L.spawn.x / T), ty = Math.floor(L.spawn.y / T);
  assert.ok(walkable(at(L.map, tx, ty)), 'spawn in a wall');
  assert.ok(L.zones.reception.some((r) => inRect(tx, ty, r)), 'spawn not in reception');
  assert.ok(ty >= 22 - 8, 'spawn not near the south entrance');
});

// --- open edges (dock) ------------------------------------------------------

test('dock archetype opens the seaward edge to water instead of walling it', () => {
  const L = buildLayout({ archetype: 'dock', size: [40, 20], entrance: 'gate-w' });
  assert.equal(L.edges.n, 'water');
  const cols = L.map[0].length;
  // north edge is water (open), not a solid wall run
  let waterOpen = 0;
  for (let x = 1; x < cols - 1; x++) if (at(L.map, x, 0) !== '#') waterOpen++;
  assert.ok(waterOpen >= cols - 4, 'seaward edge is still walled');
});

// --- semantic zone resolver -------------------------------------------------

test('resolveZone picks a free walkable tile inside the named zone, deterministically', () => {
  const L = buildLayout({ archetype: 'office', size: [34, 22], entrance: 'reception-s' });
  const busy = new Set();
  const a = resolveZone(L, 'exec', busy, 1);
  assert.ok(a, 'no tile resolved');
  assert.ok(walkable(at(L.map, a.tx, a.ty)), 'resolved into a wall');
  assert.ok(L.zones.exec.some((r) => inRect(a.tx, a.ty, r)), 'resolved outside the exec zone');
  // deterministic for the same seed + busy set
  const b = resolveZone(L, 'exec', new Set(), 1);
  assert.deepEqual(a, b);
});

test('resolveZone never returns an already-busy tile', () => {
  const L = buildLayout({ archetype: 'office', size: [34, 22], entrance: 'reception-s' });
  const busy = new Set();
  const picks = [];
  for (let i = 0; i < 6; i++) {
    const p = resolveZone(L, 'openPlan', busy, 7);
    assert.ok(p, `ran out of tiles at ${i}`);
    const key = p.tx + ',' + p.ty;
    assert.ok(!busy.has(key), 'returned a busy tile');
    busy.add(key);
    picks.push(key);
  }
  assert.equal(new Set(picks).size, picks.length, 'duplicate placements');
});
