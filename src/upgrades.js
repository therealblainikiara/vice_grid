// upgrades.js — five-category upgrade system with free respec. Pure; no DOM.

export const UPGRADE_DEFS = {
  weapons:      { name: 'Weapons',      max: 4, desc: '+8% damage and steadier aim per level' },
  armor:        { name: 'Armour',       max: 4, desc: '+15 max health per level' },
  mobility:     { name: 'Mobility',     max: 4, desc: '+6% move speed per level' },
  enforcement:  { name: 'Enforcement',  max: 4, desc: '+15% cuff speed and extra intimidation per level' },
  intelligence: { name: 'Intelligence', max: 4, desc: 'Lv1+: evidence compass · Lv3+: reads suspect nerve' },
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
