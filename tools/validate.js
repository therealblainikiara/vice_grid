// tools/validate.js — campaign validation for CI / release gate.
// Validates every implemented mission for structural soundness.
// Run: node tools/validate.js
// Exit code 0 = all good; non-zero = validation failures.

import { CAMPAIGN, MISSIONS, ENEMY_TYPES } from '../src/missions.js';
import { VEHICLE_TYPES } from '../src/vehicles.js';

const implemented = CAMPAIGN.filter((m) => m.implemented && m.type === 'main');
const ops = CAMPAIGN.filter((m) => m.implemented && m.type === 'op');

let errors = 0;

function err(msg) {
  console.error('[FAIL]', msg);
  errors++;
}

function ok(msg) {
  console.log('[OK]', msg);
}

function walkable(ch) {
  return ch !== '#';
}

function countChar(map, ch) {
  return map.join('').split(ch).length - 1;
}

function validateMission(entry) {
  const m = MISSIONS[entry.id];
  if (!m) return err(`${entry.id}: missing from MISSIONS`);

  // Map rectangularity + sealed borders
  const rows = m.map;
  const cols = rows[0].length;
  for (const r of rows) {
    if (r.length !== cols) return err(`${entry.id}: ragged map row`);
  }
  for (let x = 0; x < cols; x++) {
    if (rows[0][x] !== '#') return err(`${entry.id}: top border open at ${x}`);
    if (rows[rows.length - 1][x] !== '#') return err(`${entry.id}: bottom border open at ${x}`);
  }
  for (const r of rows) {
    if (r[0] !== '#') return err(`${entry.id}: left border open`);
    if (r[cols - 1] !== '#') return err(`${entry.id}: right border open`);
  }

  // Player spawn
  if (countChar(rows, 'P') < 1) return err(`${entry.id}: no player spawn (P)`);

  // Clear objective target count
  const clear = m.objectives.find((o) => o.id === 'clear');
  if (clear) {
    const vehicleFoes = (m.vehicles ?? []).filter((v) => v.tag === clear.tag).length;
    const pool = countChar(rows, 'E') + vehicleFoes;
    if (pool < clear.count) {
      return err(`${entry.id}: only ${pool} targets for clear count ${clear.count} (tag ${clear.tag})`);
    }
  }

  // Evidence pickups
  const evid = m.objectives.find((o) => o.type === 'evidence');
  if (evid) {
    const vCount = countChar(rows, 'V');
    if (vCount !== evid.count) return err(`${entry.id}: evidence pickups (${vCount}) != objective count (${evid.count})`);
  }

  // Vehicle spawns
  for (const vd of m.vehicles ?? []) {
    if (!VEHICLE_TYPES[vd.type]) return err(`${entry.id}: unknown vehicle type ${vd.type}`);
    const row = rows[vd.y] ?? '';
    if (!row[vd.x] || row[vd.x] === '#') return err(`${entry.id}: vehicle ${vd.type} spawns in wall at ${vd.x},${vd.y}`);
  }
  for (const vd of m.escalation?.vehicles ?? []) {
    if (!VEHICLE_TYPES[vd.type]) return err(`${entry.id}: unknown escalation vehicle type ${vd.type}`);
  }
  if (m.playerVehicle && !VEHICLE_TYPES[m.playerVehicle.type]) return err(`${entry.id}: unknown player vehicle type`);

  // Boss
  if (m.boss) {
    if (!ENEMY_TYPES[m.boss.type]?.boss) return err(`${entry.id}: boss type ${m.boss.type} missing/not flagged boss`);
    if (!walkable(rows[m.boss.y]?.[m.boss.x])) return err(`${entry.id}: boss spawns in wall`);
    for (const s of m.boss.phase2Spawns ?? []) {
      if (!ENEMY_TYPES[s.type]) return err(`${entry.id}: unknown phase2 spawn ${s.type}`);
      if (!walkable(rows[s.y]?.[s.x])) return err(`${entry.id}: phase2 spawn in wall at ${s.x},${s.y}`);
    }
  }

  // Escalation spawns
  for (const s of m.escalation?.spawns ?? []) {
    if (!ENEMY_TYPES[s.type]) return err(`${entry.id}: unknown escalation spawn ${s.type}`);
    if (!walkable(rows[s.y]?.[s.x])) return err(`${entry.id}: escalation spawn in wall at ${s.x},${s.y}`);
  }

  // Reach zones - only for on-foot missions (those without playerVehicle or convoyGoal)
  const hasReachObjective = m.objectives?.some((o) => o.type === 'reach') ?? false;
  const isVehicleMission = m.playerVehicle || m.convoyGoal;
  if (hasReachObjective && !isVehicleMission) {
    // zones are marked with 'X' on map
    if (countChar(rows, 'X') < 1) return err(`${entry.id}: has reach objective but no gate marker (X) on map`);
  }

  ok(`${entry.id} (${entry.title})`);
  return true;
}

console.log('=== Campaign Validation ===');
console.log(`Main missions: ${implemented.length}`);
console.log(`OP missions:   ${ops.length}`);
console.log('');

for (const entry of implemented) validateMission(entry);
for (const entry of ops) validateMission(entry);

console.log('');
if (errors === 0) {
  console.log('All missions valid ✓');
  process.exit(0);
} else {
  console.error(`${errors} validation error(s)`);
  process.exit(1);
}