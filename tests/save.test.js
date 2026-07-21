import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SAVE_VERSION, newCampaign, serialize, deserialize, makeSaveStore,
  loadSettings, saveSettings, DEFAULT_SETTINGS,
} from '../src/save.js';

function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _map: m,
  };
}

test('new campaign has current version and sane defaults', () => {
  const c = newCampaign('viper');
  assert.equal(c.v, SAVE_VERSION);
  assert.equal(c.agent, 'viper');
  assert.equal(c.missionIndex, 0);
  assert.ok(!Number.isNaN(Date.parse(c.createdAt)));
});

test('save/load round-trip preserves campaign exactly', () => {
  const store = makeSaveStore(memStorage());
  const c = newCampaign('rhino');
  c.missionIndex = 3;
  c.grades.m01 = 'A';
  c.totals.arrests = 12;
  store.save(0, c);
  assert.deepEqual(store.load(0), c);
});

test('corrupted save returns null and preserves raw data for recovery', () => {
  const storage = memStorage();
  const store = makeSaveStore(storage);
  storage.setItem('vicegrid.campaign.v' + SAVE_VERSION + '.slot1', '{broken json!!');
  assert.equal(store.load(1), null);
  const corruptKeys = [...storage._map.keys()].filter((k) => k.endsWith('.corrupt'));
  assert.equal(corruptKeys.length, 1);
  // slot itself is cleared so the UI shows an empty, usable slot
  assert.equal(store.load(1), null);
});

test('a save from a newer version is rejected, not mangled', () => {
  assert.equal(deserialize(JSON.stringify({ v: SAVE_VERSION + 1 })), null);
});

test('deserialize rejects non-objects and versionless data', () => {
  assert.equal(deserialize('null'), null);
  assert.equal(deserialize('42'), null);
  assert.equal(deserialize('{"agent":"rhino"}'), null);
});

test('empty slots list as null; saved slots round-trip', () => {
  const store = makeSaveStore(memStorage());
  store.save(2, newCampaign());
  const slots = store.slots();
  assert.equal(slots[0], null);
  assert.equal(slots[1], null);
  assert.equal(slots[2].v, SAVE_VERSION);
});

test('settings merge over defaults and survive corruption', () => {
  const storage = memStorage();
  saveSettings(storage, { ...DEFAULT_SETTINGS, musicVol: 0.1 });
  assert.equal(loadSettings(storage).musicVol, 0.1);
  assert.equal(loadSettings(storage).sfxVol, DEFAULT_SETTINGS.sfxVol);
  assert.equal(loadSettings(storage).touchControls, 'auto');
  storage.setItem('vicegrid.settings.v1', '!!!');
  assert.deepEqual(loadSettings(storage), DEFAULT_SETTINGS);
});

test('serialize output is stable JSON', () => {
  const c = newCampaign();
  assert.deepEqual(JSON.parse(serialize(c)), c);
});
