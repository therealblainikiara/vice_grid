import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeMorale, decideReaction, shouldBetray, isCuffable, tickCuff, searchSuspect,
} from '../src/arrest.js';

const enemy = (over = {}) => ({ hp: 100, maxHp: 100, personality: 'timid', stunTimer: 0, state: 'FIGHT', ...over });
const ctx = (over = {}) => ({ alliesDown: 0, alliesTotal: 4, aimedAt: false, distToPlayer: 400, intimidation: 0, ...over });

test('healthy backed-up enemy has high morale', () => {
  const m = computeMorale(enemy(), ctx());
  assert.ok(m > 0.7);
});

test('morale collapses with wounds, fallen allies, and a gun in the face', () => {
  const m = computeMorale(
    enemy({ hp: 20 }),
    ctx({ alliesDown: 3, aimedAt: true, distToPlayer: 100, intimidation: 1 })
  );
  assert.ok(m < 0.3);
});

test('timid enemies surrender for real; sly enemies can fake', () => {
  assert.equal(decideReaction(enemy({ personality: 'timid' }), 0.3, 0.9), 'surrender');
  assert.equal(decideReaction(enemy({ personality: 'sly' }), 0.3, 0.1), 'fake_surrender');
  assert.equal(decideReaction(enemy({ personality: 'sly' }), 0.3, 0.9), 'surrender');
});

test('hardened enemies keep fighting at morale a timid enemy quits at', () => {
  assert.equal(decideReaction(enemy({ personality: 'hard' }), 0.4, 0.5), 'fight');
  assert.equal(decideReaction(enemy({ personality: 'timid' }), 0.4, 0.5), 'surrender');
});

test('cowards flee in the morale band above their surrender point', () => {
  assert.equal(decideReaction(enemy({ personality: 'coward' }), 0.5, 0.5), 'flee');
  assert.equal(decideReaction(enemy({ personality: 'coward' }), 0.2, 0.5), 'surrender');
});

test('fake surrender betrays only after delay and at close range', () => {
  const e = enemy({ state: 'FAKE_SURRENDER' });
  assert.equal(shouldBetray(e, 100, 0.5), false); // too soon
  assert.equal(shouldBetray(e, 300, 5), false);   // too far
  assert.equal(shouldBetray(e, 100, 2), true);
  assert.equal(shouldBetray(enemy({ state: 'SURRENDER' }), 100, 5), false);
});

test('cuffable states are surrender, fake surrender, and downed', () => {
  assert.ok(isCuffable('SURRENDER'));
  assert.ok(isCuffable('FAKE_SURRENDER'));
  assert.ok(isCuffable('DOWNED'));
  assert.ok(!isCuffable('FIGHT'));
  assert.ok(!isCuffable('CUFFED'));
});

test('cuff progress completes in baseTime / cuffSpeed seconds', () => {
  let p = 0;
  for (let i = 0; i < 16; i++) p = tickCuff(p, 0.1, { baseTime: 1.6, cuffSpeed: 1 });
  assert.equal(p, 1);
  // VIPER cuffs 40% faster
  let v = 0;
  for (let i = 0; i < 12; i++) v = tickCuff(v, 0.1, { baseTime: 1.6, cuffSpeed: 1.4 });
  assert.equal(v, 1);
});

test('searching a suspect yields intel once, never twice', () => {
  const s = { searched: false, carriesIntel: true };
  assert.equal(searchSuspect(s, 0.9).found, 'intel');
  assert.equal(searchSuspect(s, 0.1).found, 'nothing');
});
