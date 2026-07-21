import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  arrestedBosses, campaignMetrics, recordMissionOutcome, selectEnding,
} from '../src/story.js';
import { newCampaign } from '../src/save.js';

test('campaign metrics read the persisted nested totals shape', () => {
  const campaign = newCampaign();
  Object.assign(campaign.totals, {
    arrests: 8, kills: 2, evidence: 9, evidenceTotal: 10, civiliansKilled: 1,
  });
  campaign.flags.finalBossArrested = true;
  assert.deepEqual(campaignMetrics(campaign), {
    arrests: 8, kills: 2, civiliansKilled: 1,
    evidenceFound: 9, evidenceTotal: 10, evidencePct: 0.9,
    arrestRatio: 0.8, finalBossArrested: true,
  });
  assert.equal(selectEnding(campaign), 'JUSTICE');
});

test('recorded boss arrests are data-driven and ordered by campaign', () => {
  const campaign = newCampaign();
  const missions = {
    m01: { id: 'm01', boss: { name: 'CHROME DOG' } },
    m02: { id: 'm02', boss: { name: 'MIDNIGHT' } },
  };
  recordMissionOutcome(campaign, missions.m02, { bossArrested: true });
  recordMissionOutcome(campaign, missions.m01, { bossArrested: true });

  assert.deepEqual(arrestedBosses(campaign, missions, [{ id: 'm01' }, { id: 'm02' }]), [
    { missionId: 'm01', name: 'CHROME DOG' },
    { missionId: 'm02', name: 'MIDNIGHT' },
  ]);
});

test('defeating rather than arresting a boss does not create custody history', () => {
  const campaign = newCampaign();
  const mission = { id: 'm02', boss: { name: 'MIDNIGHT' } };
  recordMissionOutcome(campaign, mission, { bossArrested: false });
  assert.deepEqual(arrestedBosses(campaign, { m02: mission }), []);
});

test('legacy boss flags still appear in story recaps', () => {
  const campaign = newCampaign();
  campaign.flags.midnightArrested = true;
  const missions = { m02: { boss: { name: 'MIDNIGHT' } } };
  assert.deepEqual(arrestedBosses(campaign, missions), [
    { missionId: 'm02', name: 'MIDNIGHT' },
  ]);
});
