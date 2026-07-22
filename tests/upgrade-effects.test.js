// Pins the upgrade effect table to the UPGRADE_DEFS shop descriptions: a sold
// upgrade must do exactly what its text promises.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upgradeEffects } from '../src/upgrades.js';

test('no upgrades: every effect is neutral', () => {
  const e = upgradeEffects({});
  assert.equal(e.damageMul, 1);
  assert.equal(e.stabilityBonus, 0);
  assert.equal(e.fireRateMul, 1);
  assert.equal(e.maxHpBonus, 0);
  assert.equal(e.damageTakenMul, 1);
  assert.equal(e.knockbackMul, 1);
  assert.equal(e.regenPerSec, 0);
  assert.equal(e.speedMul, 1);
  assert.equal(e.dodgeCd, 0.9);
  assert.equal(e.dodgeDistMul, 1);
  assert.equal(e.cuffSpeedMul, 1);
  assert.equal(e.intimidateRadiusMul, 1);
  assert.equal(e.autoCuff, false);
  // undefined input behaves like an empty build
  assert.deepEqual(upgradeEffects(undefined), e);
});

test('weapons: damage per level, fire rate + recoil from L2', () => {
  assert.ok(Math.abs(upgradeEffects({ weapons: 1 }).damageMul - 1.08) < 1e-9);
  assert.equal(upgradeEffects({ weapons: 1 }).fireRateMul, 1);
  const l2 = upgradeEffects({ weapons: 2 });
  assert.equal(l2.fireRateMul, 1.12);
  assert.ok(l2.stabilityBonus > upgradeEffects({ weapons: 1 }).stabilityBonus + 0.03); // extra recoil control kicks in
});

test('weapons: alt-fire gate at L3, incendiary gate at L4', () => {
  // gates are off below their level
  assert.equal(upgradeEffects({ weapons: 2 }).altFire, false);
  assert.equal(upgradeEffects({ weapons: 3 }).altFire, true);
  assert.equal(upgradeEffects({ weapons: 3 }).incendiary, false);
  assert.equal(upgradeEffects({ weapons: 4 }).incendiary, true);
  // both gates neutral on an empty build
  assert.equal(upgradeEffects({}).altFire, false);
  assert.equal(upgradeEffects({}).incendiary, false);
  // slug + burn tuning is exposed for the sim to consume from one source
  const l4 = upgradeEffects({ weapons: 4 });
  assert.ok(l4.slugDamageMul > 1 && l4.slugKnockbackMul > 1 && l4.slugCooldownMul > 1);
  assert.ok(l4.slugSpreadMul < 1);
  assert.ok(l4.burnDps > 0 && l4.burnDuration > 0);
});

test('armour: +15 HP per level, DR at L2, knockback resist at L3, regen at L4', () => {
  assert.equal(upgradeEffects({ armor: 1 }).maxHpBonus, 15);
  assert.equal(upgradeEffects({ armor: 1 }).damageTakenMul, 1);
  assert.equal(upgradeEffects({ armor: 2 }).damageTakenMul, 0.9);
  assert.equal(upgradeEffects({ armor: 2 }).knockbackMul, 1);
  assert.equal(upgradeEffects({ armor: 3 }).knockbackMul, 0.45);
  assert.equal(upgradeEffects({ armor: 3 }).regenPerSec, 0);
  assert.equal(upgradeEffects({ armor: 4 }).regenPerSec, 1);
  assert.equal(upgradeEffects({ armor: 4 }).maxHpBonus, 60);
});

test('mobility: speed per level, dodge tier at L2', () => {
  assert.ok(Math.abs(upgradeEffects({ mobility: 1 }).speedMul - 1.06) < 1e-9);
  assert.equal(upgradeEffects({ mobility: 1 }).dodgeCd, 0.9);
  const l2 = upgradeEffects({ mobility: 2 });
  assert.ok(Math.abs(l2.dodgeCd - 0.72) < 1e-9); // -20% of 0.9
  assert.equal(l2.dodgeDistMul, 1.15);
});

test('enforcement: cuff speed + intimidate radius at L1, auto-cuff at L3', () => {
  const l1 = upgradeEffects({ enforcement: 1 });
  assert.ok(Math.abs(l1.cuffSpeedMul - 1.15) < 1e-9);
  assert.ok(Math.abs(l1.intimidateRadiusMul - 1.1) < 1e-9);
  assert.equal(l1.autoCuff, false);
  assert.equal(upgradeEffects({ enforcement: 2 }).autoCuff, false);
  assert.equal(upgradeEffects({ enforcement: 3 }).autoCuff, true);
});

test('enforcement: intimidate flash gate at L2, cuff flashbang gate at L4', () => {
  // intimidate flash: off below L2
  assert.equal(upgradeEffects({}).intimidateFlash, false);
  assert.equal(upgradeEffects({ enforcement: 1 }).intimidateFlash, false);
  assert.equal(upgradeEffects({ enforcement: 2 }).intimidateFlash, true);
  // cuff flashbang: off below L4
  assert.equal(upgradeEffects({ enforcement: 3 }).cuffFlashbang, false);
  assert.equal(upgradeEffects({ enforcement: 4 }).cuffFlashbang, true);
  // tuning exposed from one source for the sim to consume
  const l4 = upgradeEffects({ enforcement: 4 });
  assert.ok(l4.intimidateFlashFear > 0 && l4.intimidateFlashStun > 0);
  assert.ok(l4.cuffFlashbangRadius > 0 && l4.cuffFlashbangStun > 0);
});

test('intelligence: aim-highlight gate at L2, deep-scan gate at L4', () => {
  assert.equal(upgradeEffects({}).aimHighlight, false);
  assert.equal(upgradeEffects({ intelligence: 1 }).aimHighlight, false);
  assert.equal(upgradeEffects({ intelligence: 2 }).aimHighlight, true);
  assert.equal(upgradeEffects({ intelligence: 3 }).deepScan, false);
  assert.equal(upgradeEffects({ intelligence: 4 }).deepScan, true);
});
