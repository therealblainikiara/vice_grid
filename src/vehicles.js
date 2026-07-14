// vehicles.js — arcade top-down vehicle physics. Pure; no DOM.
// World integration (collision, occupants, damage events) lives in world.js.

export const VEHICLE_TYPES = {
  patrol:  { name: 'Patrol Interceptor', hp: 260, accel: 340, brake: 520, maxSpeed: 430, reverseMax: 120, turnRate: 2.4, grip: 0.985, handbrakeTurn: 1.9, r: 22, color: '#2b4a66', tail: '#ff4040' },
  gangcar: { name: 'Glowline Runner',    hp: 150, accel: 300, brake: 460, maxSpeed: 390, reverseMax: 100, turnRate: 2.2, grip: 0.985, handbrakeTurn: 1.8, r: 21, color: '#2f4d2c', tail: '#ff8a3d' },
  gangbike:{ name: 'Outrider Bike',      hp: 60,  accel: 420, brake: 500, maxSpeed: 470, reverseMax: 80,  turnRate: 3.2, grip: 0.98,  handbrakeTurn: 2.4, r: 14, color: '#3f5c39', tail: '#ff8a3d' },
  truck:   { name: 'Shipment Hauler',    hp: 700, accel: 160, brake: 300, maxSpeed: 300, reverseMax: 60,  turnRate: 1.2, grip: 0.99,  handbrakeTurn: 1.2, r: 30, color: '#4a3c58', tail: '#ffca6b' },
  sedan:   { name: 'Commuter',           hp: 90,  accel: 220, brake: 420, maxSpeed: 300, reverseMax: 90,  turnRate: 2.0, grip: 0.985, handbrakeTurn: 1.6, r: 20, color: '#5a6a7a', tail: '#ff6a6a' },
};

let nextVid = 1;

export function makeVehicle(typeKey, x, y, opts = {}) {
  const t = VEHICLE_TYPES[typeKey];
  return {
    id: nextVid++, kind: 'vehicle', type: typeKey, tag: opts.tag ?? null,
    x, y, angle: opts.angle ?? 0, speed: 0,
    hp: t.hp, maxHp: t.hp, r: t.r,
    ai: opts.ai ?? null,           // null | 'convoy' | 'escort' | 'traffic'
    laneY: opts.laneY ?? y,        // AI keeps to its lane
    cruise: opts.cruise ?? 0,      // AI target speed
    disabled: false, smokeT: 0, hitFlash: 0,
    driverSlot: null,              // player slot when player-driven
    occupantSpawned: false,
  };
}

// Step driving physics from controls {throttle -1..1, steer -1..1, handbrake}.
// Mutates v; returns {dx, dy} displacement for the caller to collision-check.
export function stepVehicle(v, c, dt) {
  const t = VEHICLE_TYPES[v.type];
  if (v.disabled) {
    v.speed *= Math.pow(0.02, dt); // roll to a stop
  } else {
    if (c.throttle > 0) v.speed += t.accel * c.throttle * dt;
    else if (c.throttle < 0) {
      // braking when moving forward, reversing when stopped
      if (v.speed > 10) v.speed += t.brake * c.throttle * dt;
      else v.speed += t.accel * 0.6 * c.throttle * dt;
    }
    v.speed *= Math.pow(c.handbrake ? 0.95 : 0.995, dt * 60);
    v.speed = Math.max(-t.reverseMax, Math.min(t.maxSpeed, v.speed));
    // steering authority scales with speed (no pivoting in place);
    // the handbrake keeps the rear loose so drifts still rotate
    let authority = Math.min(1, Math.abs(v.speed) / (t.maxSpeed * 0.35));
    if (c.handbrake) authority = Math.max(authority, 0.5);
    const rate = c.handbrake ? t.handbrakeTurn + t.turnRate : t.turnRate;
    v.angle += c.steer * rate * authority * dt * Math.sign(v.speed || 1);
  }
  return { dx: Math.cos(v.angle) * v.speed * dt, dy: Math.sin(v.angle) * v.speed * dt };
}

// Damage from a collision at relative speed (px/s). Gentle nudges are free.
export function ramDamage(relSpeed) {
  const s = Math.abs(relSpeed);
  if (s < 90) return 0;
  return Math.round((s - 90) * 0.22);
}

// Applies damage; flags the wreck. Returns 'disabled' when it just died.
export function damageVehicle(v, dmg) {
  if (v.disabled || dmg <= 0) return 'none';
  v.hp -= dmg;
  v.hitFlash = 0.12;
  if (v.hp <= 0) { v.hp = 0; v.disabled = true; return 'disabled'; }
  return 'hit';
}
