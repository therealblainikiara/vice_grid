import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VEHICLE_TYPES, makeVehicle, stepVehicle, ramDamage, damageVehicle } from '../src/vehicles.js';

const drive = (v, c, secs) => {
  let dx = 0, dy = 0;
  for (let t = 0; t < secs; t += 1 / 60) {
    const d = stepVehicle(v, { throttle: 0, steer: 0, handbrake: false, ...c }, 1 / 60);
    dx += d.dx; dy += d.dy;
    v.x += d.dx; v.y += d.dy;
  }
  return { dx, dy };
};

test('acceleration builds speed and caps at maxSpeed', () => {
  const v = makeVehicle('patrol', 0, 0);
  drive(v, { throttle: 1 }, 8);
  assert.ok(v.speed > VEHICLE_TYPES.patrol.maxSpeed * 0.9);
  assert.ok(v.speed <= VEHICLE_TYPES.patrol.maxSpeed + 1e-6);
});

test('braking stops the car, then reverses up to reverseMax', () => {
  const v = makeVehicle('gangcar', 0, 0);
  drive(v, { throttle: 1 }, 4);
  drive(v, { throttle: -1 }, 6);
  assert.ok(v.speed < 0, 'should be reversing');
  assert.ok(Math.abs(v.speed) <= VEHICLE_TYPES.gangcar.reverseMax + 1e-6);
});

test('steering needs speed: no pivoting in place', () => {
  const v = makeVehicle('patrol', 0, 0);
  const a0 = v.angle;
  drive(v, { steer: 1 }, 2); // parked
  assert.ok(Math.abs(v.angle - a0) < 0.05);
  drive(v, { throttle: 1 }, 2);
  drive(v, { steer: 1 }, 1);
  assert.ok(v.angle > a0 + 0.5, 'turns once moving');
});

test('handbrake sheds speed fast and tightens the turn', () => {
  const a = makeVehicle('patrol', 0, 0);
  const b = makeVehicle('patrol', 0, 0);
  drive(a, { throttle: 1 }, 5);
  drive(b, { throttle: 1 }, 5);
  const s0 = a.speed;
  drive(a, { steer: 1 }, 0.5);
  drive(b, { steer: 1, handbrake: true }, 0.5);
  assert.ok(b.speed < s0 * 0.6, 'handbrake scrubs speed');
  assert.ok(b.angle > a.angle, 'handbrake turns tighter');
});

test('the truck is slower and clumsier than the interceptor', () => {
  const p = makeVehicle('patrol', 0, 0);
  const t = makeVehicle('truck', 0, 0);
  drive(p, { throttle: 1 }, 6);
  drive(t, { throttle: 1 }, 6);
  assert.ok(p.speed > t.speed + 80);
});

test('ram damage scales with impact speed; nudges are free', () => {
  assert.equal(ramDamage(60), 0);
  const soft = ramDamage(200), hard = ramDamage(430);
  assert.ok(soft > 0 && hard > soft * 2);
});

test('vehicle damage disables at 0 hp; wrecks roll to a stop', () => {
  const v = makeVehicle('gangbike', 0, 0);
  assert.equal(damageVehicle(v, 30), 'hit');
  assert.equal(damageVehicle(v, 999), 'disabled');
  assert.ok(v.disabled);
  v.speed = 300;
  drive(v, { throttle: 1 }, 3); // controls ignored while disabled
  assert.ok(Math.abs(v.speed) < 5);
  assert.equal(damageVehicle(v, 50), 'none');
});
