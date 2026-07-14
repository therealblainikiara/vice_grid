// Campaign validation: every implemented mission must be structurally sound.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGN, MISSIONS, ENEMY_TYPES } from '../src/missions.js';
import { VEHICLE_TYPES } from '../src/vehicles.js';

const implemented = CAMPAIGN.filter((m) => m.implemented);

test('at least one mission is implemented', () => {
  assert.ok(implemented.length >= 1);
});

for (const entry of implemented) {
  test(`${entry.id}: definition is complete and map is sound`, () => {
    const m = MISSIONS[entry.id];
    assert.ok(m, `${entry.id} missing from MISSIONS`);
    assert.ok(m.briefing?.lines?.length >= 1);
    assert.ok(m.debriefWin?.lines?.length >= 1);
    assert.ok(m.debriefLose?.lines?.length >= 1);
    assert.ok(m.parSec > 0);
    assert.ok(m.objectives.some((o) => o.primary));

    // map: rectangular with sealed borders
    const rows = m.map;
    const cols = rows[0].length;
    for (const r of rows) assert.equal(r.length, cols, 'ragged map row');
    for (let x = 0; x < cols; x++) {
      assert.equal(rows[0][x], '#', 'top border open');
      assert.equal(rows[rows.length - 1][x], '#', 'bottom border open');
    }
    for (const r of rows) {
      assert.equal(r[0], '#', 'left border open');
      assert.equal(r[cols - 1], '#', 'right border open');
    }

    const count = (ch) => rows.join('').split(ch).length - 1;
    assert.ok(count('P') >= 1, 'no player spawn');

    const clear = m.objectives.find((o) => o.id === 'clear');
    if (clear) {
      const vehicleFoes = (m.vehicles ?? []).filter((v) => v.tag === clear.tag).length;
      const pool = count('E') + vehicleFoes;
      assert.ok(pool >= clear.count, `only ${pool} targets for clear count ${clear.count}`);
    }

    for (const vd of m.vehicles ?? []) {
      assert.ok(VEHICLE_TYPES[vd.type], `unknown vehicle type ${vd.type}`);
      assert.ok(rows[vd.y]?.[vd.x] && rows[vd.y][vd.x] !== '#', 'vehicle spawns in a wall');
    }
    for (const vd of m.escalation?.vehicles ?? []) {
      assert.ok(VEHICLE_TYPES[vd.type], `unknown escalation vehicle type ${vd.type}`);
    }
    if (m.playerVehicle) assert.ok(VEHICLE_TYPES[m.playerVehicle.type], 'unknown player vehicle type');

    const evid = m.objectives.find((o) => o.type === 'evidence');
    if (evid) assert.equal(count('V'), evid.count, 'evidence pickups != objective count');

    const walkable = (x, y) => rows[y]?.[x] && rows[y][x] !== '#';
    if (m.boss) {
      assert.ok(ENEMY_TYPES[m.boss.type]?.boss, 'boss type missing/not flagged boss');
      assert.ok(walkable(m.boss.x, m.boss.y), 'boss spawns in a wall');
      for (const s of m.boss.phase2Spawns ?? []) {
        assert.ok(ENEMY_TYPES[s.type], 'unknown phase2 spawn type');
        assert.ok(walkable(s.x, s.y), 'phase2 spawn in a wall');
      }
    }
    for (const s of m.escalation?.spawns ?? []) {
      assert.ok(ENEMY_TYPES[s.type], 'unknown escalation spawn type');
      assert.ok(walkable(s.x, s.y), 'escalation spawn in a wall');
    }
  });
}
