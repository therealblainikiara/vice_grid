// save.js — versioned campaign persistence. Storage is injectable so tests
// run without a browser. Corrupted saves never crash: they return null and
// the raw data is preserved under a .corrupt key for recovery.

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'vicegrid.campaign.v';
export const SETTINGS_KEY = 'vicegrid.settings.v1';

export function newCampaign(agent = 'rhino') {
  return {
    v: SAVE_VERSION,
    createdAt: new Date().toISOString(),
    agent,
    missionIndex: 0,
    newGamePlus: false,
    grades: {},            // { m01: 'A', ... }
    totals: { arrests: 0, kills: 0, evidence: 0, evidenceTotal: 0, civiliansKilled: 0, intel: 0 },
    upgrades: { weapons: 0, armor: 0, mobility: 0, enforcement: 0, intelligence: 0 },
    upgradePoints: 0,
    p2UpgradePoints: 0,
    flags: {},             // narrative flags, e.g. { chromeDogArrested: true }
  };
}

export function serialize(campaign) {
  return JSON.stringify(campaign);
}

export function deserialize(json) {
  let data;
  try { data = JSON.parse(json); } catch { return null; }
  if (!data || typeof data !== 'object' || typeof data.v !== 'number') return null;
  return migrate(data);
}

// Version migration chain. Future versions add steps here.
export function migrate(data) {
  if (data.v > SAVE_VERSION) return null; // save from a newer build
  // v1 is current; no older versions shipped.
  return data.v === SAVE_VERSION ? data : null;
}

export function makeSaveStore(storage) {
  return {
    slots() {
      const out = [];
      for (let i = 0; i < 3; i++) {
        const raw = storage.getItem(SAVE_KEY + SAVE_VERSION + '.slot' + i);
        out.push(raw ? deserialize(raw) : null);
      }
      return out;
    },
    save(slot, campaign) {
      storage.setItem(SAVE_KEY + SAVE_VERSION + '.slot' + slot, serialize(campaign));
    },
    load(slot) {
      const key = SAVE_KEY + SAVE_VERSION + '.slot' + slot;
      const raw = storage.getItem(key);
      if (raw == null) return null;
      const data = deserialize(raw);
      if (data == null) {
        storage.setItem(key + '.corrupt', raw); // preserve for recovery
        storage.removeItem(key);
      }
      return data;
    },
    erase(slot) { storage.removeItem(SAVE_KEY + SAVE_VERSION + '.slot' + slot); },
  };
}

export const DEFAULT_SETTINGS = {
  musicVol: 0.6, sfxVol: 0.8, dialogueVol: 1.0,
  screenShake: 1.0, fxIntensity: 1.0, cameraSmooth: 1.0,
  aimAssist: true, holdToAim: true, subtitles: true, subtitleSize: 1.0,
  speakerLabels: true, highContrastEnemies: false, colorMode: 'default',
  reducedFlash: false, gameSpeed: 1.0, difficulty: 'agent',
  retroFilter: false,
  p1Gamepad: false,   // Player 1 drives with a controller instead of kb+mouse
  bindings: null,     // null = defaults from input.js; else { action: [code,...] }
};

export function loadSettings(storage) {
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(storage, settings) {
  storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
