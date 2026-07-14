import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UPGRADE_DEFS, buyUpgrade, refundUpgrade, respec } from '../src/upgrades.js';
import { newCampaign } from '../src/save.js';

const rich = (pts = 10) => { const c = newCampaign(); c.upgradePoints = pts; return c; };

test('buying an upgrade spends a point and raises the level', () => {
  const c = rich();
  assert.ok(buyUpgrade(c, 'weapons'));
  assert.equal(c.upgrades.weapons, 1);
  assert.equal(c.upgradePoints, 9);
});

test('cannot buy past max level or without points', () => {
  const c = rich(UPGRADE_DEFS.armor.max + 5);
  for (let i = 0; i < UPGRADE_DEFS.armor.max; i++) assert.ok(buyUpgrade(c, 'armor'));
  assert.equal(buyUpgrade(c, 'armor'), false);
  const broke = rich(0);
  assert.equal(buyUpgrade(broke, 'mobility'), false);
  assert.equal(buyUpgrade(rich(), 'nonsense'), false);
});

test('refund returns the point; cannot refund below zero', () => {
  const c = rich();
  buyUpgrade(c, 'enforcement');
  assert.ok(refundUpgrade(c, 'enforcement'));
  assert.equal(c.upgrades.enforcement, 0);
  assert.equal(c.upgradePoints, 10);
  assert.equal(refundUpgrade(c, 'enforcement'), false);
});

test('respec refunds every level across categories', () => {
  const c = rich(6);
  buyUpgrade(c, 'weapons'); buyUpgrade(c, 'weapons');
  buyUpgrade(c, 'intelligence'); buyUpgrade(c, 'armor');
  assert.equal(c.upgradePoints, 2);
  assert.equal(respec(c), 4);
  assert.equal(c.upgradePoints, 6);
  for (const k of Object.keys(UPGRADE_DEFS)) assert.equal(c.upgrades[k], 0);
});
