// combat.js — weapon definitions and damage rules. Pure; no DOM.
// Distances in pixels (48 px = 1 tile), times in seconds, rof in shots/second.

export const WEAPONS = {
  fists:   { name: 'Fists',        lethal: false, melee: true,  damage: 14, range: 42,  rof: 2.4, knockback: 90,  noise: 60 },
  baton:   { name: 'Shock Baton',  lethal: false, melee: true,  damage: 26, range: 50,  rof: 1.8, knockback: 140, stun: 1.4, noise: 80 },
  pistol:  { name: 'GS-9 Pistol',  lethal: true,  damage: 22, pellets: 1, spread: 0.05, range: 620, falloff: 380, rof: 4.5, mag: 12, reload: 1.1, speed: 900, knockback: 40,  noise: 480 },
  smg:     { name: 'Hornet SMG',   lethal: true,  damage: 13, pellets: 1, spread: 0.11, range: 520, falloff: 300, rof: 11,  mag: 30, reload: 1.6, speed: 860, knockback: 26,  noise: 470 },
  shotgun: { name: 'Citybreaker',  lethal: true,  damage: 11, pellets: 6, spread: 0.24, range: 330, falloff: 150, rof: 1.4, mag: 6,  reload: 2.0, speed: 780, knockback: 160, noise: 560 },
  rifle:   { name: 'Longline DMR', lethal: true,  damage: 46, pellets: 1, spread: 0.015,range: 980, falloff: 700, rof: 1.8, mag: 8,  reload: 1.8, speed: 1200,knockback: 90,  noise: 640 },
  beanbag: { name: 'Beanbag Gun',  lethal: false, damage: 30, pellets: 1, spread: 0.07, range: 360, falloff: 200, rof: 1.2, mag: 4,  reload: 2.2, speed: 620, knockback: 220, stun: 2.2, noise: 400 },
  taser:   { name: 'Arc Taser',    lethal: false, damage: 12, pellets: 1, spread: 0.02, range: 200, falloff: 160, rof: 0.8, mag: 2,  reload: 2.6, speed: 700, knockback: 20,  stun: 3.2, noise: 120 },
  // Arcade power weapon — rare pickup, limited ammo, no reload.
  stormcaster: { name: 'Stormcaster', lethal: true, damage: 34, pellets: 3, spread: 0.09, range: 560, falloff: 340, rof: 7, mag: 60, reload: 0, speed: 1000, knockback: 120, noise: 700, power: true },
};

// Damage falls off linearly between `falloff` and `range`; floor 35%.
export function damageAtDistance(weapon, distance) {
  if (weapon.melee) return distance <= weapon.range ? weapon.damage : 0;
  if (distance > weapon.range) return 0;
  const fo = weapon.falloff ?? weapon.range;
  if (distance <= fo) return weapon.damage;
  const t = (distance - fo) / Math.max(1, weapon.range - fo);
  return Math.max(weapon.damage * 0.35, weapon.damage * (1 - t));
}

// Effective spread grows when moving, shrinks with agent stability (0..1).
export function effectiveSpread(weapon, { moving = false, stability = 0 } = {}) {
  if (weapon.melee) return 0;
  let s = weapon.spread * (moving ? 1.7 : 1);
  return s * (1 - 0.5 * stability);
}

// Apply damage to a target {hp, maxHp, armor?}. Non-lethal damage can never
// kill: it downs the target (incapacitated, arrestable) at 0 hp instead.
// Returns an event record; mutates target.
export function applyDamage(target, amount, { lethal = true, stun = 0 } = {}) {
  const resist = clampResist(target.armor ?? 0);
  const dealt = amount * (1 - resist);
  target.hp -= dealt;
  if (stun > 0) target.stunTimer = Math.max(target.stunTimer ?? 0, stun);
  let result = 'hit';
  if (target.hp <= 0) {
    if (lethal) { target.hp = 0; result = 'killed'; }
    else { target.hp = 0; result = 'downed'; }
  }
  return { result, dealt, stun };
}

function clampResist(a) { return Math.max(0, Math.min(0.8, a)); }

// Explosive falloff (vats, fuel, wrecks): full force at the centre, nothing at
// the rim. Quadratic so the killzone is tight and the fringe is survivable —
// standing two steps back should read as a decision that paid off.
export function blastDamage(peak, distance, radius) {
  if (distance >= radius) return 0;
  const t = 1 - distance / radius;
  return peak * t * t;
}

// Weapon runtime state machine: READY -> FIRING(cooldown) -> RELOADING.
export function makeWeaponState(key) {
  const def = WEAPONS[key];
  return { key, ammo: def.mag ?? Infinity, cooldown: 0, reloading: 0, reserve: def.power ? 0 : Infinity };
}

export function canFire(ws) {
  return ws.cooldown <= 0 && ws.reloading <= 0 && ws.ammo > 0;
}

export function fire(ws) {
  const def = WEAPONS[ws.key];
  if (!canFire(ws)) return false;
  if (def.mag) ws.ammo -= 1;
  ws.cooldown = 1 / def.rof;
  return true;
}

export function startReload(ws) {
  const def = WEAPONS[ws.key];
  if (!def.mag || ws.ammo === def.mag || ws.reloading > 0 || def.reload === 0) return false;
  ws.reloading = def.reload;
  return true;
}

export function tickWeapon(ws, dt) {
  const def = WEAPONS[ws.key];
  if (ws.cooldown > 0) ws.cooldown -= dt;
  if (ws.reloading > 0) {
    ws.reloading -= dt;
    if (ws.reloading <= 0) { ws.reloading = 0; ws.ammo = def.mag; }
  }
}
