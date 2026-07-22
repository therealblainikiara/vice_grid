// Behavioural tests for the Enforcement L2 intimidate flash and L4 cuff
// flashbang. Gate booleans alone can't see these — they pin the sim effect.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { intimidateFlash, cuffFlashbang } from '../src/world.js';
import { upgradeEffects } from '../src/upgrades.js';

const enemy = (over = {}) => ({
  kind: 'enemy', hp: 100, maxHp: 100, personality: 'timid', state: 'FIGHT',
  x: 100, y: 100, stunTimer: 0, moraleTimer: 1, hitFlash: 0, counted: false, ...over,
});
const flashWorld = (enemies) => ({
  enemies, players: [{ agent: { intimidation: 0 } }], effects: [],
  rng: () => 0.9, fx: {},
});

test('intimidate flash (Enforcement L2) flips a fighting suspect to SURRENDER', () => {
  const e = enemy();
  const w = flashWorld([e]);
  const r = intimidateFlash(w, e, upgradeEffects({ enforcement: 2 }));
  assert.equal(r, 'SURRENDER');
  assert.equal(e.state, 'SURRENDER');
});

test('intimidate flash is a no-op below Enforcement L2 (gated)', () => {
  const e = enemy();
  const w = flashWorld([e]);
  const r = intimidateFlash(w, e, upgradeEffects({ enforcement: 1 }));
  assert.equal(r, null);
  assert.equal(e.state, 'FIGHT'); // would otherwise keep fighting
});

test('intimidate flash never breaks a boss', () => {
  const e = enemy({ boss: true });
  const w = flashWorld([e]);
  assert.equal(intimidateFlash(w, e, upgradeEffects({ enforcement: 2 })), null);
  assert.equal(e.state, 'FIGHT');
});

test('cuff flashbang (Enforcement L4) stuns a nearby threat and emits a blast', () => {
  const near = enemy({ x: 140, y: 100 }); // 40px away, within radius
  const far = enemy({ x: 100, y: 500 });  // 400px away, outside radius
  const w = flashWorld([near, far]);
  const caught = cuffFlashbang(w, 100, 100, upgradeEffects({ enforcement: 4 }));
  assert.equal(caught, 1);
  assert.ok(near.stunTimer > 1, 'nearby enemy is stunned');
  assert.equal(far.stunTimer, 0, 'out-of-range enemy is untouched');
  assert.ok(w.effects.some((f) => f.kind === 'blast'), 'a blast effect is pushed');
});

test('cuff flashbang is a no-op below Enforcement L4 (gated)', () => {
  const e = enemy({ x: 120, y: 100 });
  const w = flashWorld([e]);
  const caught = cuffFlashbang(w, 100, 100, upgradeEffects({ enforcement: 3 }));
  assert.equal(caught, 0);
  assert.equal(e.stunTimer, 0);
  assert.equal(w.effects.length, 0, 'no blast when the upgrade is unowned');
});
