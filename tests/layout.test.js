import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLayout, resolveZone, materializeLayout } from '../src/layout.js';

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

test('office archetype is a fully sealed shell (all four edges walled)', () => {
  const L = buildLayout({ archetype: 'office', size: [34, 22], entrance: 'reception-s' });
  assert.deepEqual(L.edges, { n: 'wall', e: 'wall', s: 'wall', w: 'wall' });
  const { rows, cols } = dims(L.map);
  for (let x = 0; x < cols; x++) {
    assert.equal(at(L.map, x, 0), '#', `north open at ${x}`);
    assert.equal(at(L.map, x, rows - 1), '#', `south open at ${x}`);
  }
  for (let y = 0; y < rows; y++) {
    assert.equal(at(L.map, 0, y), '#', `west open at ${y}`);
    assert.equal(at(L.map, cols - 1, y), '#', `east open at ${y}`);
  }
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

// --- materializeLayout (sim integration) ------------------------------------

test('materializeLayout leaves a raw-map mission untouched (back-compat)', () => {
  const raw = { id: 'x', map: ['###', '#.#', '###'], boss: { type: 'a', x: 1, y: 1 } };
  assert.equal(materializeLayout(raw), raw);
});

test('materializeLayout stamps a concrete map with one spawn and the requested enemies', () => {
  const m = materializeLayout({
    id: 'm-office', enemyPool: ['soldier'],
    layout: { archetype: 'office', size: [34, 22], entrance: 'reception-s', seed: 14 },
    enemies: [{ zone: 'openPlan', count: 5 }, { zone: 'reception', count: 2 }],
  });
  assert.equal(m.map.length, 22);
  assert.equal(m.map[0].length, 34);
  assert.equal(m.map.join('').split('P').length - 1, 1, 'expected exactly one spawn');
  assert.equal(m.map.join('').split('E').length - 1, 7, 'expected 7 enemy markers');
  assert.ok(m.zones && m.edges, 'zones/edges not exposed for renderers');
});

test('materializeLayout resolves a zoned boss to walkable coords inside its zone', () => {
  const m = materializeLayout({
    id: 'm-office', enemyPool: ['soldier'],
    layout: { archetype: 'office', size: [34, 22], entrance: 'reception-s', seed: 14 },
    boss: { type: 'architect', zone: 'exec' },
  });
  assert.equal(typeof m.boss.x, 'number');
  assert.equal(typeof m.boss.y, 'number');
  assert.notEqual(m.map[m.boss.y][m.boss.x], '#', 'boss stamped into a wall');
  assert.ok(
    m.zones.exec.some((r) => m.boss.x >= r.tx && m.boss.x < r.tx + r.tw && m.boss.y >= r.ty && m.boss.y < r.ty + r.th),
    'boss resolved outside the exec zone',
  );
});

test('materializeLayout resolves zoned escalation spawns to walkable coords', () => {
  const m = materializeLayout({
    id: 'm-office', enemyPool: ['soldier'],
    layout: { archetype: 'office', size: [34, 22], entrance: 'reception-s', seed: 14 },
    escalation: { at: 5, spawns: [{ type: 'bruiser', zone: 'reception' }, { type: 'dealer', zone: 'openPlan' }] },
  });
  for (const s of m.escalation.spawns) {
    assert.equal(typeof s.x, 'number');
    assert.notEqual(m.map[s.y][s.x], '#', 'escalation spawn in a wall');
  }
});

test('materializeLayout is deterministic for the same mission', () => {
  const spec = () => ({
    id: 'm-office', enemyPool: ['soldier'],
    layout: { archetype: 'office', size: [34, 22], entrance: 'reception-s', seed: 14 },
    boss: { type: 'architect', zone: 'exec' },
    enemies: [{ zone: 'openPlan', count: 4 }],
  });
  const a = materializeLayout(spec()), b = materializeLayout(spec());
  assert.deepEqual(a.map, b.map);
  assert.deepEqual(a.boss, b.boss);
});

test('materializeLayout stamps a reach gate (X) from gatesZoned', () => {
  const m = materializeLayout({
    id: 'm-office', enemyPool: ['soldier'],
    layout: { archetype: 'office', size: [34, 22], entrance: 'reception-s', seed: 14 },
    gatesZoned: [{ zone: 'exec' }],
  });
  assert.equal(m.map.join('').split('X').length - 1, 1, 'expected exactly one gate');
});

test('materializeLayout auto-dresses office zones when no furnish supplied', () => {
  const m = materializeLayout({
    id: 'm-office', enemyPool: ['soldier'],
    layout: { archetype: 'office', size: [34, 22], entrance: 'reception-s', seed: 14 },
  });
  assert.ok(Array.isArray(m.furnish) && m.furnish.length >= 1, 'no furnish derived');
  assert.ok(m.furnish.map((f) => f.role).includes('cubicles'), 'open-plan not dressed as cubicles');
});

test('materializeLayout keeps an explicitly supplied furnish', () => {
  const given = [{ rect: [2, 2, 4, 4], role: 'storage' }];
  const m = materializeLayout({
    id: 'm-office', enemyPool: ['soldier'], furnish: given,
    layout: { archetype: 'office', size: [34, 22], entrance: 'reception-s', seed: 14 },
  });
  assert.deepEqual(m.furnish, given);
});
