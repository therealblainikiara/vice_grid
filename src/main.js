// main.js — boot, game-state machine, fixed-timestep loop, campaign flow.

import { makeInput } from './input.js';
import { makeAudio } from './audio.js';
import { makeUI } from './ui.js';
import { createWorld, updateWorld, addPlayer, restoreCheckpoint } from './world.js';
import { draw } from './render.js';
import { draw3d, resize3d } from './render3d.js';
import { gradeMission } from './grading.js';
import { MISSIONS, CAMPAIGN, AGENTS } from './missions.js';
import { makeSaveStore, newCampaign, loadSettings, saveSettings } from './save.js';
import { buyUpgrade, refundUpgrade, respec } from './upgrades.js';

const canvas = document.getElementById('game');
// Probe WebGL2 before anyone claims a context: a canvas can only ever hold one
// context type, and probing with getContext is safe (three reuses the same
// object). No WebGL means we fall back to the 2D renderer rather than a black
// screen — the sim and every other system are identical either way.
const use3d = (() => {
  try { return !!canvas.getContext('webgl2'); } catch { return false; }
})();
const ctx = use3d ? null : canvas.getContext('2d');
// Sandboxed hosts can throw on localStorage ACCESS, not just on writes — probe
// it and fall back to session memory so the demo boots anywhere.
const storage = (() => {
  try {
    const s = window.localStorage;
    s.setItem('__vg_probe', '1');
    s.removeItem('__vg_probe');
    return s;
  } catch {
    const m = new Map();
    return {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: (k) => m.delete(k),
    };
  }
})();

const settings = loadSettings(storage);
const store = makeSaveStore(storage);
const audio = makeAudio(settings);
const ui = makeUI(settings, audio);
const input = makeInput(canvas, settings);

let state = 'title';      // title | menu | agent | briefing | play | pause | results | settings | credits | upgrade | missions
let settingsReturn = 'menu';
let campaign = null;
let world = null;
let coopArmed = false;
let pauseLatch = false;
let replayMode = false;
const GRADE_RANK = { S: 5, A: 4, B: 3, C: 2, D: 1 };

const fx = {
  shot: (k, x, y) => audio.shot(k, x, y),
  hit: (x, y) => audio.hit(x, y),
  down: (x, y) => audio.down(x, y),
  cuff: (x, y) => audio.cuff(x, y),
  pickup: () => audio.pickup(),
  evidence: () => audio.evidence(),
  surrender: (x, y) => audio.surrender(x, y),
  alarm: () => audio.alarm(),
  reloadSfx: () => audio.reload(),
  dodge: () => audio.dodgeWoosh(),
  banner: (t) => ui.banner(t),
  subtitle: (s, t) => ui.subtitle(s, t),
  log: (t) => ui.log(t),
  playerHurt: (slot) => { if (slot === 1) input.vibrate(0.8, 120); },
};

function applyRetroFilter() {
  document.body.classList.toggle('retro', !!settings.retroFilter);
}

function persistSettings() { saveSettings(storage, settings); }

// --- screen flow ---

function toTitle() { state = 'title'; ui.show('title'); }

function toMenu() {
  state = 'menu';
  const slot = store.load(0);
  document.getElementById('btn-continue').disabled = !slot;
  document.getElementById('menu-progress').textContent = slot
    ? `Slot 1 — ${slot.agent.toUpperCase()} — mission ${Math.min(slot.missionIndex + 1, 24)} of 24`
    : 'No campaign in progress';
  ui.show('menu');
  audio.setMusic('menu');
}

function toAgentSelect() { state = 'agent'; ui.show('agent'); }

function startCampaign(agentKey) {
  replayMode = false;
  campaign = newCampaign(agentKey);
  store.save(0, campaign);
  startMission(currentMissionId());
}

function continueCampaign() {
  replayMode = false;
  campaign = store.load(0);
  if (!campaign) return toMenu();
  startMission(currentMissionId());
}

function currentMissionId() {
  const mains = CAMPAIGN.filter((m) => m.type === 'main');
  const entry = mains[Math.min(campaign.missionIndex, mains.length - 1)];
  return entry.implemented ? entry.id : 'm01'; // unbuilt missions fall back during development
}

function startMission(missionId) {
  const mission = MISSIONS[missionId];
  state = 'briefing';
  ui.clearLog();
  ui.showBriefing(mission, AGENTS[campaign.agent].name + (coopArmed ? ' + ' + AGENTS[partnerOf(campaign.agent)].name : ''));
  document.getElementById('btn-deploy').onclick = () => {
    audio.unlock(); audio.uiConfirm();
    world = createWorld(mission, {
      agentKey: campaign.agent, coop: coopArmed,
      settings: { ...settings, upgrades: campaign.upgrades },
      fx,
    });
    state = 'play';
    ui.show(null);
    audio.setMusic('calm');
  };
}

function partnerOf(key) { return key === 'rhino' ? 'viper' : 'rhino'; }

function finishMission(win) {
  const mission = world.mission;
  const stats = world.stats;
  const grade = gradeMission(stats);
  if (win && replayMode) {
    // replay: keep the best grade, totals still count, no campaign advance
    const prev = campaign.grades[mission.id];
    if (!prev || GRADE_RANK[grade.grade] > GRADE_RANK[prev]) campaign.grades[mission.id] = grade.grade;
    campaign.totals.arrests += stats.arrests;
    campaign.totals.kills += stats.kills;
    campaign.totals.evidence += stats.evidenceFound;
    campaign.totals.civiliansKilled += stats.civiliansKilled;
    campaign.totals.intel += stats.intel ?? 0;
    store.save(0, campaign);
  } else if (win) {
    campaign.grades[mission.id] = grade.grade;
    campaign.totals.arrests += stats.arrests;
    campaign.totals.kills += stats.kills;
    campaign.totals.evidence += stats.evidenceFound;
    campaign.totals.evidenceTotal += stats.evidenceTotal;
    campaign.totals.civiliansKilled += stats.civiliansKilled;
    campaign.totals.intel += stats.intel ?? 0;
    campaign.upgradePoints += { S: 3, A: 2, B: 2, C: 1, D: 1 }[grade.grade];
    campaign.missionIndex += 1;
    if (mission.id === 'm01' && stats.bossArrested) campaign.flags.chromeDogArrested = true;
    store.save(0, campaign);
  }
  state = 'results';
  audio.setMusic('menu');
  ui.showResults(mission, stats, grade, win, win ? mission.debriefWin : mission.debriefLose);
}

// --- wire static buttons ---

const on = (id, fn) => document.getElementById(id).addEventListener('click', () => { audio.unlock(); audio.uiConfirm(); fn(); });

on('btn-title-start', toMenu);
on('btn-campaign', () => { coopArmed = false; toAgentSelect(); });
on('btn-coop', () => { coopArmed = true; toAgentSelect(); });
on('btn-continue', continueCampaign);
on('btn-settings', () => { settingsReturn = 'menu'; state = 'settings'; ui.show('settings'); });
on('btn-pause-settings', () => { settingsReturn = 'pause'; state = 'settings'; ui.show('settings'); });
on('btn-credits', () => { state = 'credits'; ui.show('credits'); });
on('btn-credits-back', toMenu);
on('btn-agent-rhino', () => startCampaign('rhino'));
on('btn-agent-viper', () => startCampaign('viper'));
on('btn-agent-back', toMenu);
on('btn-resume', resumeFromPause);
on('btn-restart-cp', () => { restoreCheckpoint(world); resumeFromPause(); });
on('btn-quit', () => { world = null; toMenu(); });
on('btn-retry', () => { restoreCheckpoint(world); state = 'play'; ui.show(null); audio.setMusic('calm'); });
on('btn-next', () => {
  if (replayMode) { replayMode = false; return toMenu(); }
  const mains = CAMPAIGN.filter((m) => m.type === 'main');
  if (campaign.missionIndex >= mains.length) { state = 'credits'; ui.show('credits'); }
  else showUpgradeScreen();
});
on('btn-missions', () => {
  campaign = campaign ?? store.load(0);
  if (!campaign) return;
  state = 'missions';
  const mains = CAMPAIGN.filter((m) => m.type === 'main');
  ui.showMissionSelect(
    mains.map((m, i) => ({
      id: m.id,
      title: `M${String(i + 1).padStart(2, '0')} — ${m.title}`,
      grade: campaign.grades[m.id],
      locked: !m.implemented || i > campaign.missionIndex,
    })),
    (id) => { replayMode = true; startMission(id); },
  );
});
on('btn-missions-back', toMenu);
function showUpgradeScreen() {
  state = 'upgrade';
  ui.showUpgrade(campaign, (key, isBuy) => {
    if ((isBuy ? buyUpgrade : refundUpgrade)(campaign, key)) {
      audio.uiConfirm();
      store.save(0, campaign);
    }
    showUpgradeScreen(); // re-render the panel from campaign state
  });
}
on('btn-upgrade-respec', () => { respec(campaign); store.save(0, campaign); showUpgradeScreen(); });
on('btn-upgrade-continue', () => startMission(currentMissionId()));
on('btn-results-menu', toMenu);
on('btn-settings-back', () => {
  persistSettings();
  if (settingsReturn === 'pause') { state = 'pause'; ui.show('pause'); }
  else toMenu();
});

ui.buildSettingsPanel((key) => {
  if (key === 'musicVol' || key === 'sfxVol') audio.applyVolumes();
  if (key === 'retroFilter') applyRetroFilter();
  persistSettings();
});
ui.buildControlsPanel(input, persistSettings);
on('btn-controls', () => { state = 'controls'; ui.show('controls'); });
on('btn-controls-back', () => { state = 'settings'; ui.show('settings'); });

function resumeFromPause() { state = 'play'; ui.show(null); }

function togglePause() {
  if (state === 'play') { state = 'pause'; ui.show('pause'); }
  else if (state === 'pause') resumeFromPause();
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && (state === 'play' || state === 'pause')) togglePause();
  if (state === 'title' && (e.code === 'Enter' || e.code === 'Space')) { audio.unlock(); toMenu(); }
});

// --- debug hooks for automated verification (developer tooling) ---
window.__vg = {
  get state() { return state; },
  get world() { return world; },
  get campaign() { return campaign; },
  settings,
  skipToPlay(agent = 'rhino', missionId = 'm01') {
    campaign = campaign ?? newCampaign(agent);
    world = createWorld(MISSIONS[missionId], { agentKey: agent, settings: { ...settings, upgrades: campaign.upgrades }, fx });
    state = 'play'; ui.show(null);
  },
  // Deterministically step the sim (used by the campaign validation tool and
  // when the tab is hidden, where requestAnimationFrame is suspended).
  tick(seconds = 1 / 60, doDraw = true) {
    if (!world || state !== 'play') return;
    const controls = { 0: input.readControls(0), 1: input.readControls(1) };
    for (let t = 0; t < seconds - 1e-9; t += STEP) updateWorld(world, STEP, controls);
    if (doDraw) {
      ui.updateHud(world, true);
      render(world);
    }
    if (world.status !== 'playing' && world.endTimer > 1.6) finishMission(world.status === 'success');
  },
};

// --- main loop: fixed 60 Hz simulation, rAF rendering ---

const STEP = 1 / 60;
let acc = 0, last = performance.now();

function render(w) {
  if (use3d) draw3d(canvas, w, settings);
  else draw(ctx, w, settings);
}

function frame(now) {
  const raw = Math.min(0.1, (now - last) / 1000);
  last = now;
  input.pollCapture(); // gamepads emit no events; rebinding must poll them

  if (state === 'play' && world) {
    // adjustable game speed applies to single player only (accessibility)
    const speedMul = world.players.length === 1 ? (settings.gameSpeed ?? 1) : 1;
    acc += raw * speedMul;
    const controls = { 0: input.readControls(0), 1: input.readControls(1) };

    // gamepad drop-in: press Start on the pad to join as the partner agent
    if (!world.players.some((p) => p.slot === 1) && input.padJoinPressed()) {
      addPlayer(world, partnerOf(campaign?.agent ?? 'rhino'), 1);
      ui.log(`${AGENTS[partnerOf(campaign?.agent ?? 'rhino')].name} joined (drop-in)`);
    }

    while (acc >= STEP) {
      updateWorld(world, STEP, controls);
      acc -= STEP;
    }

    if (controls[0]?.pause || controls[1]?.pause) {
      if (!pauseLatch) togglePause();
      pauseLatch = true;
    } else pauseLatch = false;

    audio.setListener(world.cam.x, world.cam.y);
    audio.setMusic(world.threat > 0 ? 'combat' : 'calm');
    ui.updateHud(world);

    if (world.status !== 'playing' && world.endTimer > 1.6) {
      finishMission(world.status === 'success');
    }
  }

  if (world && (state === 'play' || state === 'pause')) render(world);
  requestAnimationFrame(frame);
}

applyRetroFilter();
toTitle();
requestAnimationFrame(frame);
