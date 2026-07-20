// upgrades.js — five-category upgrade system with free respec. Pure; no DOM.

// Derived effect table consumed by the sim. Keep every number here in lockstep
// with the matching UPGRADE_DEFS level description — a sold upgrade must do
// exactly what its shop text promises, and the tests pin these values.
export function upgradeEffects(upgrades = {}) {
  const u = (k) => upgrades?.[k] ?? 0;
  return {
    // weapons
    damageMul: 1 + u('weapons') * 0.08,
    stabilityBonus: u('weapons') * 0.03 + (u('weapons') >= 2 ? 0.05 : 0),
    fireRateMul: u('weapons') >= 2 ? 1.12 : 1,
    // armour
    maxHpBonus: u('armor') * 15,
    damageTakenMul: u('armor') >= 2 ? 0.9 : 1,
    knockbackMul: u('armor') >= 3 ? 0.45 : 1,
    regenPerSec: u('armor') >= 4 ? 1 : 0,
    regenDelay: 4,
    // mobility
    speedMul: 1 + u('mobility') * 0.06,
    dodgeCd: u('mobility') >= 2 ? 0.72 : 0.9,
    dodgeDistMul: u('mobility') >= 2 ? 1.15 : 1,
    // enforcement
    cuffSpeedMul: 1 + u('enforcement') * 0.15,
    intimidateRadiusMul: u('enforcement') >= 1 ? 1.1 : 1,
    autoCuff: u('enforcement') >= 3,
  };
}

export const UPGRADE_DEFS = {
  weapons: {
    name: 'Weapons',
    max: 4,
    desc: 'Damage, handling and special ammo unlocks',
    levels: [
      '+8% damage, +5% accuracy',
      '+12% fire rate, reduced recoil',
      'Unlock alt-fire mode (hold aim + fire)',
      'Unlock special ammo: incendiary / shock rounds',
    ],
  },
  armor: {
    name: 'Armour',
    max: 4,
    desc: 'Health, damage reduction and survival perks',
    levels: [
      '+15 max HP',
      '+15 max HP, +10% damage reduction',
      '+15 max HP, knockback resistance',
      '+15 max HP, slow HP regen (1 HP/s out of combat)',
    ],
  },
  mobility: {
    name: 'Mobility',
    max: 4,
    desc: 'Speed, dodge and traversal abilities',
    levels: [
      '+6% move speed',
      'Dodge cooldown –20%, dodge distance +15%',
      'Unlock combat slide (crouch + dodge)',
      'Unlock sprint burst (double speed 3s, 20s CD)',
    ],
  },
  enforcement: {
    name: 'Enforcement',
    max: 4,
    desc: 'Cuffing, intimidation and non-lethal tools',
    levels: [
      '+15% cuff speed, +10% intimidate radius',
      'Intimidate flashes nearby suspects (morale hit)',
      'Auto-cuff downed suspects in range',
      'Cuff releases a flashbang (stuns nearby)',
    ],
  },
  intelligence: {
    name: 'Intelligence',
    max: 4,
    desc: 'Information gathering and hacking',
    levels: [
      'Evidence compass points to nearest pickup',
      'Suspects glow when aimed at (highlight)',
      'Read suspect nerve: see morale & surrender chance',
      'Hack nearby turrets / cameras (hold interact)',
    ],
  },
};

export function buyUpgrade(c, key) {
  const d = UPGRADE_DEFS[key];
  if (!d) return false;
  const lvl = c.upgrades[key] ?? 0;
  if (lvl >= d.max || c.upgradePoints < 1) return false;
  c.upgrades[key] = lvl + 1;
  c.upgradePoints -= 1;
  return true;
}

export function refundUpgrade(c, key) {
  if (!UPGRADE_DEFS[key]) return false;
  const lvl = c.upgrades[key] ?? 0;
  if (lvl <= 0) return false;
  c.upgrades[key] = lvl - 1;
  c.upgradePoints += 1;
  return true;
}

// Refund everything. Returns points refunded.
export function respec(c) {
  let n = 0;
  for (const k of Object.keys(UPGRADE_DEFS)) {
    n += c.upgrades[k] ?? 0;
    c.upgrades[k] = 0;
  }
  c.upgradePoints += n;
  return n;
}
