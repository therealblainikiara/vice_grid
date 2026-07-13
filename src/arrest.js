// arrest.js — morale model and arrest state machine. Pure; no DOM.
//
// Enemy behaviour states relevant to arrests:
//   FIGHT -> (morale collapse) -> SURRENDER | FAKE_SURRENDER | FLEE
//   SURRENDER + player cuffing -> CUFFED (removed from combat, scores intel)
//   FAKE_SURRENDER -> betrayal after a delay if the player closes in careless
//   DOWNED (non-lethal 0 hp) is always cuffable.

export const PERSONALITIES = {
  timid:  { surrenderAt: 0.55, fakeChance: 0.00, fleeAt: 0.00, label: 'Timid' },
  sly:    { surrenderAt: 0.50, fakeChance: 0.60, fleeAt: 0.00, label: 'Sly' },
  hard:   { surrenderAt: 0.18, fakeChance: 0.10, fleeAt: 0.00, label: 'Hardened' },
  coward: { surrenderAt: 0.40, fakeChance: 0.00, fleeAt: 0.55, label: 'Coward' },
};

// Morale in 0..1. Low = ready to give up.
export function computeMorale(enemy, ctx) {
  const hpFrac = Math.max(0, enemy.hp / enemy.maxHp);
  const alliesFrac = ctx.alliesTotal > 0 ? ctx.alliesDown / ctx.alliesTotal : 0;
  let m = 0.35 + hpFrac * 0.45;          // health is the core of confidence
  m -= alliesFrac * 0.35;                 // watching friends fall is terrifying
  if (ctx.aimedAt && ctx.distToPlayer < 260) m -= 0.12; // gun in your face
  m -= (ctx.intimidation ?? 0) * 0.08;    // agent upgrade / VIPER bonus
  if (enemy.stunTimer > 0) m -= 0.15;
  return Math.max(0, Math.min(1, m));
}

// Decide a reaction for a fighting enemy. `rand` is a 0..1 roll.
export function decideReaction(enemy, morale, rand) {
  const p = PERSONALITIES[enemy.personality] ?? PERSONALITIES.hard;
  if (p.fleeAt > 0 && morale < p.fleeAt && morale >= p.surrenderAt) return 'flee';
  if (morale < p.surrenderAt) {
    return rand < p.fakeChance ? 'fake_surrender' : 'surrender';
  }
  return 'fight';
}

// A fake-surrendered enemy betrays when the player gets close and a timer ran.
export function shouldBetray(enemy, distToPlayer, elapsedInState) {
  return enemy.state === 'FAKE_SURRENDER' && elapsedInState > 1.2 && distToPlayer < 150;
}

export function isCuffable(state) {
  return state === 'SURRENDER' || state === 'FAKE_SURRENDER' || state === 'DOWNED';
}

// Cuffing progress. Returns updated progress in 0..1; 1 => CUFFED.
// baseTime seconds, cuffSpeed multiplier (VIPER 1.4, upgrades add more).
export function tickCuff(progress, dt, { baseTime = 1.6, cuffSpeed = 1 } = {}) {
  return Math.min(1, progress + (dt * cuffSpeed) / baseTime);
}

// Searching a cuffed suspect may reveal intel (evidence ping) or contraband.
export function searchSuspect(suspect, rand) {
  if (suspect.searched) return { found: 'nothing' };
  suspect.searched = true;
  if (suspect.carriesIntel) return { found: 'intel' };
  return rand < 0.5 ? { found: 'contraband' } : { found: 'nothing' };
}
