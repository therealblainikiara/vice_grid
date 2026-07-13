import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gradeMission, selectEnding } from '../src/grading.js';

const perfect = () => ({
  timeSec: 300, parSec: 420, arrests: 8, kills: 0,
  civiliansHurt: 0, civiliansKilled: 0, civiliansTotal: 6,
  evidenceFound: 3, evidenceTotal: 3, shotsFired: 40, shotsHit: 38,
  revives: 0, propertyDamage: 20, optionalDone: 2, optionalTotal: 2,
});

test('a clean high-arrest run earns S', () => {
  const g = gradeMission(perfect());
  assert.equal(g.grade, 'S');
  assert.ok(g.pct >= 90);
});

test('an all-lethal rampage with civilian casualties tanks the grade', () => {
  const g = gradeMission({
    ...perfect(), arrests: 0, kills: 8, civiliansHurt: 3, civiliansKilled: 2,
    evidenceFound: 0, shotsHit: 10, propertyDamage: 900, optionalDone: 0,
  });
  assert.ok(['C', 'D'].includes(g.grade));
});

test('slow time alone drops but does not destroy a grade', () => {
  const g = gradeMission({ ...perfect(), timeSec: 1200 });
  assert.ok(['A', 'S'].includes(g.grade));
});

test('grade thresholds map correctly', () => {
  // Craft mid stats: half arrests, some civ harm
  const g = gradeMission({
    ...perfect(), arrests: 4, kills: 4, civiliansHurt: 2, evidenceFound: 1,
    shotsHit: 20, optionalDone: 1,
  });
  assert.ok(['B', 'C'].includes(g.grade));
});

test('ending: full evidence unlocks secret regardless of style', () => {
  assert.equal(selectEnding({
    evidenceFound: 40, evidenceTotal: 40, arrests: 10, kills: 40,
    civiliansKilled: 0, finalBossArrested: false,
  }), 'FULL_DISCLOSURE');
});

test('ending: justice needs arrests, evidence and the boss taken alive', () => {
  assert.equal(selectEnding({
    evidenceFound: 33, evidenceTotal: 40, arrests: 60, kills: 20,
    civiliansKilled: 1, finalBossArrested: true,
  }), 'JUSTICE');
});

test('ending: brutality hands the city to new management', () => {
  assert.equal(selectEnding({
    evidenceFound: 5, evidenceTotal: 40, arrests: 5, kills: 60,
    civiliansKilled: 2, finalBossArrested: false,
  }), 'NEW_MANAGEMENT');
});

test('ending: default is compromised victory', () => {
  assert.equal(selectEnding({
    evidenceFound: 20, evidenceTotal: 40, arrests: 30, kills: 30,
    civiliansKilled: 1, finalBossArrested: false,
  }), 'COMPROMISED_VICTORY');
});
