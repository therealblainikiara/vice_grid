// grading.js — mission scoring and S–D grades. Pure; no DOM.

export const SCORE = {
  arrest: 500,
  downedSecured: 350,   // non-lethal takedown, then cuffed
  kill: 150,
  evidence: 250,
  intel: 200,
  civilianHurt: -400,
  civilianKilled: -900,
  propertyDamage: -2,   // per damage point
  optional: 750,
  bossArrested: 1500,
  bossDefeated: 800,
};

// stats: timeSec, parSec, arrests, kills, civiliansHurt, civiliansKilled,
// civiliansTotal, evidenceFound, evidenceTotal, shotsFired, shotsHit,
// revives, propertyDamage, optionalDone, optionalTotal
export function gradeMission(stats) {
  const parts = {};
  parts.time = clamp01(stats.parSec / Math.max(1, stats.timeSec));                       // 1.0 = at or under par
  const suspects = stats.arrests + stats.kills;
  parts.arrests = suspects > 0 ? stats.arrests / suspects : 1;
  const civBase = Math.max(1, stats.civiliansTotal);
  parts.civilians = clamp01(1 - (stats.civiliansHurt + stats.civiliansKilled * 3) / civBase);
  parts.evidence = stats.evidenceTotal > 0 ? stats.evidenceFound / stats.evidenceTotal : 1;
  parts.accuracy = stats.shotsFired > 0 ? clamp01(stats.shotsHit / stats.shotsFired) : 1;
  parts.revives = clamp01(1 - stats.revives * 0.34);
  parts.property = clamp01(1 - stats.propertyDamage / 600);
  parts.optional = stats.optionalTotal > 0 ? stats.optionalDone / stats.optionalTotal : 1;

  const weights = { time: 12, arrests: 22, civilians: 20, evidence: 14, accuracy: 10, revives: 6, property: 6, optional: 10 };
  let total = 0, max = 0;
  for (const k of Object.keys(weights)) { total += parts[k] * weights[k]; max += weights[k]; }
  const pct = (total / max) * 100;

  let grade = 'D';
  if (pct >= 90) grade = 'S';
  else if (pct >= 75) grade = 'A';
  else if (pct >= 60) grade = 'B';
  else if (pct >= 45) grade = 'C';
  return { pct: Math.round(pct), grade, parts };
}

// Compatibility re-export: ending logic belongs to campaign story state.
export { selectEnding } from './story.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
