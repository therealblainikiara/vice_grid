import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WEAPONS, damageAtDistance, effectiveSpread, applyDamage,
  makeWeaponState, canFire, fire, startReload, tickWeapon, blastDamage,
} from '../src/combat.js';
import { tickBurn } from '../src/world.js';

// Minimal fake world for tickBurn: it routes burn through hitEntity, which for a
// still-alive enemy only touches these fields (no down/neutralize path fires as
// long as the enemy keeps positive HP).
const burnWorld = () => ({ cols: 100, rows: 100, walls: new Set(), props: [], effects: [], fx: {}, settings: {} });
const burnEnemy = (over = {}) => ({
  kind: 'enemy', hp: 100, maxHp: 100, armor: 0, state: 'FIGHT',
  x: 500, y: 500, hitFlash: 0, burnTimer: 2.5, burnDps: 6, ...over,
});

test('incendiary burn ticks damage over time and reduces enemy HP', () => {
  const w = burnWorld();
  const e = burnEnemy();
  const before = e.hp;
  for (let i = 0; i < 10; i++) tickBurn(w, e, 0.25); // 2.5s of burn
  assert.ok(e.hp < before, 'burn should reduce HP');
  assert.ok(e.hp > 0, 'burn is non-lethal-safe: does not kill outright');
  assert.ok(before - e.hp >= 12, 'roughly 6 dmg/s over 2.5s (~15)');
  assert.equal(e.burnTimer, 0, 'burn expires after its duration');
});

test('burn stops dealing damage once its timer runs out', () => {
  const w = burnWorld();
  const e = burnEnemy();
  for (let i = 0; i < 10; i++) tickBurn(w, e, 0.25);
  const settled = e.hp;
  for (let i = 0; i < 10; i++) tickBurn(w, e, 0.25); // no burn left
  assert.equal(e.hp, settled, 'no further damage after burn expires');
});

test('damage is full inside falloff range', () => {
  assert.equal(damageAtDistance(WEAPONS.pistol, 100), WEAPONS.pistol.damage);
});

test('damage falls off linearly and floors at 35%', () => {
  const w = WEAPONS.pistol;
  const atMax = damageAtDistance(w, w.range);
  assert.ok(atMax >= w.damage * 0.35 - 1e-9);
  assert.ok(atMax < w.damage);
  assert.equal(damageAtDistance(w, w.range + 1), 0);
});

test('melee only connects within range', () => {
  assert.equal(damageAtDistance(WEAPONS.fists, 30), WEAPONS.fists.damage);
  assert.equal(damageAtDistance(WEAPONS.fists, 60), 0);
});

test('movement widens spread; stability tightens it', () => {
  const w = WEAPONS.smg;
  const still = effectiveSpread(w, { moving: false, stability: 0 });
  const run = effectiveSpread(w, { moving: true, stability: 0 });
  const rhino = effectiveSpread(w, { moving: true, stability: 0.8 });
  assert.ok(run > still);
  assert.ok(rhino < run);
});

test('lethal damage kills at 0 hp', () => {
  const t = { hp: 10, maxHp: 100, armor: 0 };
  const ev = applyDamage(t, 15, { lethal: true });
  assert.equal(ev.result, 'killed');
  assert.equal(t.hp, 0);
});

test('non-lethal damage downs instead of killing', () => {
  const t = { hp: 10, maxHp: 100 };
  const ev = applyDamage(t, 50, { lethal: false, stun: 2 });
  assert.equal(ev.result, 'downed');
  assert.equal(t.stunTimer, 2);
});

test('armor reduces damage and is capped at 80%', () => {
  const t = { hp: 100, maxHp: 100, armor: 0.25 };
  applyDamage(t, 40);
  assert.equal(t.hp, 70);
  const tank = { hp: 100, maxHp: 100, armor: 5 };
  applyDamage(tank, 100);
  assert.equal(tank.hp, 80); // 0.8 cap
});

test('weapon state: fire consumes ammo and enforces rof cooldown', () => {
  const ws = makeWeaponState('pistol');
  assert.ok(canFire(ws));
  assert.ok(fire(ws));
  assert.equal(ws.ammo, 11);
  assert.ok(!canFire(ws)); // cooldown active
  tickWeapon(ws, 1);       // 1s > 1/4.5s
  assert.ok(canFire(ws));
});

test('weapon state: reload refills mag after reload time', () => {
  const ws = makeWeaponState('shotgun');
  ws.ammo = 1;
  assert.ok(startReload(ws));
  assert.ok(!canFire(ws));
  tickWeapon(ws, WEAPONS.shotgun.reload + 0.01);
  assert.equal(ws.ammo, WEAPONS.shotgun.mag);
  assert.ok(canFire(ws));
});

test('weapon state: cannot reload a full mag or the power weapon', () => {
  const full = makeWeaponState('pistol');
  assert.equal(startReload(full), false);
  const power = makeWeaponState('stormcaster');
  power.ammo = 3;
  assert.equal(startReload(power), false);
});

test('blast is lethal at the centre and harmless past the rim', () => {
  assert.equal(blastDamage(90, 0, 120), 90);
  assert.equal(blastDamage(90, 120, 120), 0);
  assert.equal(blastDamage(90, 500, 120), 0);
});

test('blast falls off quadratically: stepping back pays off', () => {
  const half = blastDamage(90, 60, 120);
  assert.ok(half < 90 * 0.5, 'half-radius should already be under half damage');
  assert.ok(half > 0);
  // each step outward hurts less than the last
  const d = [0, 30, 60, 90].map((x) => blastDamage(90, x, 120));
  assert.ok(d[0] - d[1] > d[2] - d[3]);
});

test('empty weapon cannot fire', () => {
  const ws = makeWeaponState('taser');
  ws.ammo = 0;
  assert.equal(canFire(ws), false);
  assert.equal(fire(ws), false);
});
