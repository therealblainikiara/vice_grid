import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, updateWorld } from '../src/world.js';
import { MISSIONS } from '../src/missions.js';

// The two car chases are opposite verbs sharing one directional endgame:
// pursuit fails if the hauler escapes east; interdiction fails if the convoy
// breaks through the west line. Protect (m10) still delivers at the east edge.
function play(id) {
  return createWorld(MISSIONS[id], { agentKey: 'rhino', settings: {}, fx: {} });
}
const truckOf = (w) => w.vehicles.find((v) => v.tag === 'truck');

test('pursuit convoy heads east, interdiction convoy heads west', () => {
  assert.equal(truckOf(play('m03')).travelDir, 1);
  assert.equal(truckOf(play('m07')).travelDir, -1);
});

test('pursuit: the hauler reaching the east interchange fails the mission', () => {
  const w = play('m03');
  truckOf(w).x = w.cols * 48 - 10; // past the east line
  updateWorld(w, 0.05, { 0: null });
  assert.equal(w.status, 'failed');
});

test('interdiction: the convoy breaking through the west line fails the mission', () => {
  const w = play('m07');
  truckOf(w).x = 60; // past the west line (< 90px)
  updateWorld(w, 0.05, { 0: null });
  assert.equal(w.status, 'failed');
});

test('interdiction lays a spike-strip roadblock that survives the cull', () => {
  const w = play('m07');
  updateWorld(w, 0.05, { 0: null });
  assert.ok(w.props.filter((p) => p.spikes).length > 0);
});
