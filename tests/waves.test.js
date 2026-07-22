import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, updateWorld } from '../src/world.js';
import { MISSIONS } from '../src/missions.js';

// Wave-defense (hold-the-line): waves breach in sequence, the next only after
// the last is put down, and clearing the final wave completes a `survive`
// objective and triggers a `trigger:'waves'` boss.
function play(id) {
  return createWorld(MISSIONS[id], { agentKey: 'rhino', settings: {}, fx: {} });
}
const step = (w, secs) => { for (let i = 0; i < secs * 10; i++) updateWorld(w, 0.1, { 0: null }); };
const clearWave = (w, idx) => w.enemies.forEach((e) => { if (e.waveTag === idx) { e.hp = 0; e.state = 'DEAD'; } });

test('m09 is a wave-defense mission with a survive objective', () => {
  const w = play('m09');
  assert.ok(w.mission.waves.length >= 3);
  assert.ok(w.objectives.find((o) => o.id === 'hold' && o.type === 'survive'));
});

test('waves spawn in sequence — the next only after the last is cleared', () => {
  const w = play('m09');
  step(w, 2.5); // initial delay
  assert.equal(w.waveIndex, 0);
  assert.ok(w.enemies.some((e) => e.waveTag === 0));
  clearWave(w, 0);
  step(w, 5);
  assert.equal(w.waveIndex, 1); // second wave has arrived
  assert.ok(w.enemies.some((e) => e.waveTag === 1));
});

test('clearing the last wave completes the survive objective and triggers the boss', () => {
  const w = play('m09');
  for (let wv = 0; wv < w.mission.waves.length; wv++) {
    step(w, 5);
    clearWave(w, wv);
  }
  step(w, 2);
  assert.ok(w.wavesCleared);
  assert.ok(w.objectives.find((o) => o.id === 'hold').done);
  assert.ok(w.bossSpawned);
});
