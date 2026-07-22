// Mobility L3 (combat slide) + L4 (sprint burst). Pins the upgradeEffects gates
// to their levels and drives the sprint-burst state machine directly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upgradeEffects } from '../src/upgrades.js';
import { stepSprint } from '../src/world.js';

test('mobility gates: combat slide at L3, sprint burst at L4', () => {
  // both gates neutral without the upgrade — must not change today's behaviour
  const none = upgradeEffects({});
  assert.equal(none.combatSlide, false);
  assert.equal(none.sprintBurst, false);
  assert.deepEqual(upgradeEffects(undefined).combatSlide, false);

  // combat slide unlocks at L3, still off at L2
  assert.equal(upgradeEffects({ mobility: 2 }).combatSlide, false);
  assert.equal(upgradeEffects({ mobility: 3 }).combatSlide, true);

  // sprint burst unlocks at L4, still off at L3
  assert.equal(upgradeEffects({ mobility: 3 }).sprintBurst, false);
  assert.equal(upgradeEffects({ mobility: 4 }).sprintBurst, true);
});

test('mobility L3 slide tuning is exposed for the sim (longer + farther)', () => {
  const l3 = upgradeEffects({ mobility: 3 });
  assert.ok(l3.slideTimeMul > 1, 'slide lasts longer than a normal dodge');
  assert.ok(l3.slideDistMul > l3.dodgeDistMul, 'slide covers more ground than the L2 dodge');
});

test('mobility L4 sprint tuning: 2x speed, 3s burst, 20s cd', () => {
  const l4 = upgradeEffects({ mobility: 4 });
  assert.equal(l4.sprintSpeedMul, 2);
  assert.equal(l4.sprintDuration, 3);
  assert.equal(l4.sprintCd, 20);
  assert.ok(l4.sprintTapWindow > 0);
});

// --- sprint-burst state machine ---

const ue = upgradeEffects({ mobility: 4 });
const newState = () => ({ sprintTimer: 0, sprintCd: 0, lastDodgeTap: 0 });

// One tap = arm the window (justPressed edge), a release, then a second tap.
function doubleTap(s, opts = {}) {
  const dt = 1 / 60;
  const { moving = true, aiming = false } = opts;
  stepSprint(s, dt, ue, { tapped: true, moving, aiming });   // first tap arms
  const a = stepSprint(s, dt, ue, { tapped: false, moving, aiming }); // release
  const b = stepSprint(s, dt, ue, { tapped: true, moving, aiming });  // second tap
  return a || b;
}

test('sprint: double-tap while moving (not aiming) activates the burst', () => {
  const s = newState();
  const fired = doubleTap(s);
  assert.equal(fired, true, 'second in-window tap fires');
  assert.ok(s.sprintTimer > 0, 'burst timer is set');
  assert.equal(s.sprintCd, 0, 'no cooldown while active');
});

test('sprint: a single tap never activates', () => {
  const s = newState();
  const fired = stepSprint(s, 1 / 60, ue, { tapped: true, moving: true, aiming: false });
  assert.equal(fired, false);
  assert.equal(s.sprintTimer, 0);
});

test('sprint: taps too far apart do not activate', () => {
  const s = newState();
  stepSprint(s, 1 / 60, ue, { tapped: true, moving: true, aiming: false }); // tap 1 arms
  // let the tap window elapse
  for (let i = 0; i < 40; i++) stepSprint(s, 1 / 60, ue, { tapped: false, moving: true, aiming: false });
  const fired = stepSprint(s, 1 / 60, ue, { tapped: true, moving: true, aiming: false });
  assert.equal(fired, false, 'window expired, so this is a fresh first tap');
  assert.equal(s.sprintTimer, 0);
});

test('sprint: no activation while aiming (that path is the L3 slide)', () => {
  const s = newState();
  const fired = doubleTap(s, { aiming: true });
  assert.equal(fired, false);
  assert.equal(s.sprintTimer, 0);
});

test('sprint: expiry starts a cooldown that blocks re-trigger', () => {
  const s = newState();
  assert.equal(doubleTap(s), true);
  // run out the 3s burst
  for (let i = 0; i < 200 && s.sprintTimer > 0; i++) {
    stepSprint(s, 1 / 60, ue, { tapped: false, moving: true, aiming: false });
  }
  assert.equal(s.sprintTimer, 0, 'burst expired');
  assert.ok(s.sprintCd > 0, 'expiry opened a cooldown');

  // trying to double-tap again during cooldown must not re-fire
  const refired = doubleTap(s);
  assert.equal(refired, false, 'cooldown blocks re-trigger');
  assert.equal(s.sprintTimer, 0);

  // once the cooldown drains, it can fire again
  for (let i = 0; i < 60 * 21 && s.sprintCd > 0; i++) {
    stepSprint(s, 1 / 60, ue, { tapped: false, moving: true, aiming: false });
  }
  assert.equal(s.sprintCd, 0, 'cooldown drained');
  assert.equal(doubleTap(s), true, 'ready to fire again');
});
