// story.js — campaign narrative state and ending selection.
//
// Mission simulation reports facts (arrests, evidence, boss outcome). This
// module turns those facts into persistent story state so UI and gameplay do
// not each maintain their own, easily-divergent interpretation.

export const ACTS = {
  1: { title: 'STREET LEVEL', premise: 'Follow GLOW from street crews to the first distribution hub.' },
  2: { title: 'THE NETWORK', premise: 'Break the supply chain and expose who protects it.' },
  3: { title: 'THE CITY FIGHTS BACK', premise: 'Defend the case as Civic Shield turns the city against the Grid.' },
  4: { title: 'THE SOURCE', premise: 'Take the evidence to Halcyon and end the pipeline at its source.' },
};

// Kept for save compatibility with builds that stored individual booleans.
const LEGACY_BOSS_FLAGS = {
  m01: 'chromeDogArrested', m02: 'midnightArrested', m04: 'stacksArrested',
  m05: 'craneArrested', m06: 'shiverArrested', m07: 'lockjawArrested',
  m08: 'chemistArrested', m09: 'graftArrested', m10: 'wreckerArrested',
  m11: 'fuseboxArrested', m12: 'staticchoirArrested', m13: 'overseerArrested',
  m14: 'architectArrested', m15: 'wardenArrested', m16: 'finalBossArrested',
};

export function recordMissionOutcome(campaign, mission, stats) {
  campaign.flags ??= {};
  if (!mission.boss || !stats.bossArrested) return campaign;

  campaign.flags.bossArrests ??= {};
  campaign.flags.bossArrests[mission.id] = mission.boss.name;

  // Preserve the two flags consumed by saves and older builds.
  if (mission.id === 'm01') campaign.flags.chromeDogArrested = true;
  if (mission.id === 'm16') campaign.flags.finalBossArrested = true;
  return campaign;
}

export function arrestedBosses(campaign, missions, campaignEntries = []) {
  const flags = campaign.flags ?? {};
  const recorded = { ...(flags.bossArrests ?? {}) };

  for (const [missionId, flag] of Object.entries(LEGACY_BOSS_FLAGS)) {
    if (flags[flag] && missions[missionId]?.boss) {
      recorded[missionId] ??= missions[missionId].boss.name;
    }
  }

  const order = new Map(campaignEntries.map((entry, index) => [entry.id, index]));
  return Object.entries(recorded)
    .map(([missionId, name]) => ({ missionId, name }))
    .sort((a, b) => (order.get(a.missionId) ?? 999) - (order.get(b.missionId) ?? 999));
}

export function campaignMetrics(campaign) {
  // Accept the campaign save shape and the former flat shape so callers and
  // old tests remain compatible while the canonical API stays unambiguous.
  const totals = campaign.totals ?? campaign;
  const evidenceFound = totals.evidence ?? totals.evidenceFound ?? 0;
  const evidenceTotal = totals.evidenceTotal ?? 0;
  const arrests = totals.arrests ?? 0;
  const kills = totals.kills ?? 0;
  const suspects = arrests + kills;

  return {
    arrests,
    kills,
    civiliansKilled: totals.civiliansKilled ?? 0,
    evidenceFound,
    evidenceTotal,
    evidencePct: evidenceTotal > 0 ? evidenceFound / evidenceTotal : 0,
    arrestRatio: suspects > 0 ? arrests / suspects : 1,
    finalBossArrested: Boolean(campaign.flags?.finalBossArrested ?? campaign.finalBossArrested),
  };
}

export function selectEnding(campaign) {
  const m = campaignMetrics(campaign);
  if (m.evidencePct >= 1) return 'FULL_DISCLOSURE';
  if (m.arrestRatio >= 0.6 && m.evidencePct >= 0.8 && m.finalBossArrested) return 'JUSTICE';
  if (m.arrestRatio < 0.3 || m.civiliansKilled > 8) return 'NEW_MANAGEMENT';
  return 'COMPROMISED_VICTORY';
}
