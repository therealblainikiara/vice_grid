// vehicles.js — arcade top-down vehicle physics. Pure; no DOM.
// World integration (collision, occupants, damage events) lives in world.js.

export const SURFACE_MOD = {
  '~': 1.0,
  ',': 0.9,
  '.': 0.7,
  '^': 0.3,
};

export const VEHICLE_TYPES = {
  patrol:  { name: 'Patrol Interceptor', hp: 260, accel: 340, brake: 520, maxSpeed: 430, reverseMax: 120, turnRate: 2.4, grip: 0.985, handbrakeTurn: 1.9, r: 22, color: '#2b4a66', tail: '#ff4040' },
  gangcar: { name: 'Glowline Runner',    hp: 150, accel: 300, brake: 460, maxSpeed: 390, reverseMax: 100, turnRate: 2.2, grip: 0.985, handbrakeTurn: 1.8, r: 21, color: '#2f4d2c', tail: '#ff8a3d' },
  gangbike:{ name: 'Outrider Bike',      hp: 60,  accel: 420, brake: 500, maxSpeed: 470, reverseMax: 80,  turnRate: 3.2, grip: 0.98,  handbrakeTurn: 2.4, r: 14, color: '#3f5c39', tail: '#ff8a3d' },
  truck:   { name: 'Shipment Hauler',    hp: 700, accel: 160, brake: 300, maxSpeed: 300, reverseMax: 60,  turnRate: 1.2, grip: 0.99,  handbrakeTurn: 1.2, r: 30, color: '#4a3c58', tail: '#ffca6b' },
  sedan:   { name: 'Commuter',           hp: 90,  accel: 220, brake: 420, maxSpeed: 300, reverseMax: 90,  turnRate: 2.0, grip: 0.985, handbrakeTurn: 1.6, r: 20, color: '#5a6a7a', tail: '#ff6a6a' },
  armoured:{ name: 'Armoured Transport', hp: 1100,accel: 140, brake: 260, maxSpeed: 270, reverseMax: 50,  turnRate: 1.0, grip: 0.99,  handbrakeTurn: 1.0, r: 32, color: '#3a3f4d', tail: '#ffca6b' },
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
    _maxSpeed: t.maxSpeed,
    tireBlown: false,
  };
}

// Step driving physics from controls {throttle -1..1, steer -1..1, handbrake}.
// world is optional; if provided, samples surface at vehicle center to modulate friction.
// Mutates v; returns {dx, dy} displacement for the caller to collision-check.
export function stepVehicle(v, c, dt, world = null) {
  const t = VEHICLE_TYPES[v.type];
  const maxSpeed = v._maxSpeed ?? t.maxSpeed;
  const accel = t.accel;
  const brake = t.brake;
  const reverseMax = t.reverseMax;
  const turnRate = t.turnRate;
  const handbrakeTurn = t.handbrakeTurn;
  const grip = t.grip;

  let surfaceMod = 1.0;
  if (world) {
    const tx = Math.floor(v.x / world.TILE);
    const ty = Math.floor(v.y / world.TILE);
    const map = world.mission?.map;
    if (map?.[ty]?.[tx]) {
      const tile = map[ty][tx];
      surfaceMod = SURFACE_MOD[tile] ?? 1.0;
    }
  }

  if (v.disabled) {
    v.speed *= Math.pow(0.02, dt);
  } else {
    if (c.throttle > 0) v.speed += accel * c.throttle * dt * surfaceMod;
    else if (c.throttle < 0) {
      if (v.speed > 10) v.speed += brake * c.throttle * dt * surfaceMod;
      else v.speed += accel * 0.6 * c.throttle * dt * surfaceMod;
    }
    v.speed *= Math.pow(c.handbrake ? 0.95 : 0.995, dt * 60);
    v.speed = Math.max(-reverseMax, Math.min(maxSpeed, v.speed));
    let authority = Math.min(1, Math.abs(v.speed) / (maxSpeed * 0.35));
    if (c.handbrake) authority = Math.max(authority, 0.5);
    const rate = c.handbrake ? handbrakeTurn + turnRate : turnRate;
    v.angle += c.steer * rate * authority * dt * Math.sign(v.speed || 1) * surfaceMod;
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

export function blowTires(v) {
  if (!v.tireBlown) {
    v.tireBlown = true;
    v._maxSpeed = Math.max(30, v._maxSpeed * 0.3);
  }
}
