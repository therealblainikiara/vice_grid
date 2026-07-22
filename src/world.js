// world.js — the simulation: level parsing, players, AI, bullets, missions.
// No DOM access; rendering reads this state, main.js drives update ticks.

import { clamp, dist, angleTo, angleDiff, TAU, makeRng } from './core.js';
import {
  WEAPONS, damageAtDistance, effectiveSpread, applyDamage,
  makeWeaponState, canFire, fire, startReload, tickWeapon, blastDamage,
} from './combat.js';
import {
  computeMorale, decideReaction, shouldBetray, isCuffable, tickCuff, searchSuspect,
} from './arrest.js';
import {
  createObjectives, applyEvent, primaryComplete, primaryFailed,
} from './objectives.js';
import { AGENTS, ENEMY_TYPES } from './missions.js';
import { VEHICLE_TYPES, makeVehicle, stepVehicle, ramDamage, damageVehicle, blowTires } from './vehicles.js';
import { upgradeEffects } from './upgrades.js';

export const TILE = 48;
export const ZOOM = 1.45; // camera zoom: world px -> screen px
const R = 14; // body radius

function checkSpikeStrips(v, w) {
  if (v.tireBlown) return;
  for (const p of w.props) {
    if (p.spikes && dist(v.x, v.y, p.x, p.y) < v.r + p.r) {
      blowTires(v);
      w.effects.push({ kind: 'spark', x: p.x, y: p.y, t: 0, dur: 0.25 });
      w.effects.push({ kind: 'debris', x: p.x, y: p.y, t: 0, dur: 0.4 });
      w.fx.tireBlowout?.(p.x, p.y);
      w.fx.tireBurst?.(p.x, p.y);
      p.spikeTriggered = true;
      break;
    }
  }
}

let nextId = 1;
const id = () => nextId++;

export function createWorld(mission, opts) {
  const rng = opts.rng ?? makeRng(Date.now() >>> 0);
  const w = {
    mission, rng, fx: opts.fx ?? {}, settings: opts.settings,
    difficulty: diffMods(opts.settings?.difficulty),
    cols: mission.map[0].length, rows: mission.map.length,
    walls: new Set(), roads: new Set(),
    players: [], enemies: [], civilians: [], bullets: [], pickups: [], props: [], effects: [],
    vehicles: [], zones: [], trafficTimer: 0, truckDown: false,
    vehicleDownTags: new Set(), delivered: false,
    objectives: createObjectives(mission.objectives),
    stats: {
      timeSec: 0, parSec: mission.parSec, arrests: 0, kills: 0, downs: 0,
      civiliansHurt: 0, civiliansKilled: 0, civiliansTotal: 0,
      evidenceFound: 0, evidenceTotal: 0, shotsFired: 0, shotsHit: 0,
      revives: 0, propertyDamage: 0, optionalDone: 0,
      optionalTotal: mission.objectives.filter((o) => !o.primary).length,
      bossArrested: false,
    },
    cam: { x: 0, y: 0, shake: 0 },
    viewW: 1280, viewH: 720,
    status: 'playing', endTimer: 0,
    escalated: false, bossSpawned: false, boss: null,
    threat: 0, checkpoint: null, spawnPoints: [],
  };

  mission.map.forEach((row, ty) => {
    [...row].forEach((ch, tx) => {
      const x = tx * TILE + TILE / 2, y = ty * TILE + TILE / 2;
      switch (ch) {
        case '#': w.walls.add(tx + ',' + ty); break;
        case '~': w.roads.add(tx + ',' + ty); break;
        case 'c': w.props.push({ id: id(), kind: 'crate', x, y, hp: 60, solid: true, r: 20 }); break;
        case 's': w.props.push({ id: id(), kind: 'shelf', x, y, hp: 90, solid: true, r: 22 }); break;
        case 'P': w.spawnPoints.push({ x, y }); break;
        case 'E': w.enemies.push(makeEnemy(pickEnemy(rng, mission.enemyPool), x, y, w)); break;
        case 'C': w.civilians.push(makeCivilian(x, y)); w.stats.civiliansTotal++; break;
        case 'V': w.pickups.push({ id: id(), kind: 'evidence', x, y }); w.stats.evidenceTotal++; break;
        case 'w': w.pickups.push({ id: id(), kind: 'weapon', weaponKey: rng.chance(0.5) ? 'shotgun' : 'smg', x, y }); break;
        case 'p': w.pickups.push({ id: id(), kind: 'weapon', weaponKey: 'beanbag', x, y }); break;
        case 'S': w.pickups.push({ id: id(), kind: 'weapon', weaponKey: 'stormcaster', x, y }); break;
        case 'm': w.pickups.push({ id: id(), kind: 'medkit', x, y }); break;
        case '=': w.props.push({ id: id(), kind: 'barrier', x, y, hp: Infinity, solid: true, r: 20 }); break;
        case 'v': w.props.push({ id: id(), kind: 'vat', x, y, hp: 45, solid: true, r: 19, explosive: true, fuse: null, exploded: false }); break;
        case '^': w.props.push({ id: id(), kind: 'spikes', x, y, r: 16, solid: false, spikes: true }); break;
        case 'X': w.zones.push({ x, y, r: 80, tag: 'gate', done: false }); break;
      }
    });
  });

  w.stats.civiliansTotal += mission.civilianBaseline ?? 0;
  for (const vd of mission.vehicles ?? []) {
    w.vehicles.push(makeVehicle(vd.type, vd.x * TILE, vd.y * TILE + TILE / 2, {
      tag: vd.tag, ai: vd.ai, laneY: vd.y * TILE + TILE / 2, cruise: vd.cruise ?? 0,
    }));
  }
  if (mission.playerVehicle) {
    const pv = makeVehicle(mission.playerVehicle.type, mission.playerVehicle.x * TILE, mission.playerVehicle.y * TILE + TILE / 2);
    w.vehicles.push(pv);
    w.playerVehicleId = pv.id;
  }

  addPlayer(w, opts.agentKey ?? 'rhino', 0);
  if (opts.coop) addPlayer(w, opts.agentKey === 'rhino' ? 'viper' : 'rhino', 1);
  if (w.playerVehicleId) {
    // pursuit missions start behind the wheel
    for (const p of w.players) { p.vehicleId = w.playerVehicleId; }
    const pv = w.vehicles.find((v) => v.id === w.playerVehicleId);
    pv.driverSlot = 0;
    for (const p of w.players) { p.x = pv.x; p.y = pv.y; }
  }
  const sp = w.spawnPoints[0] ?? { x: TILE * 2, y: TILE * 2 };
  w.cam.x = sp.x; w.cam.y = sp.y;
  saveCheckpoint(w);
  return w;
}

function diffMods(d) {
  if (d === 'rookie') return { enemyDmg: 0.6, enemyHp: 0.85, aggro: 0.8 };
  if (d === 'kingpin') return { enemyDmg: 1.5, enemyHp: 1.25, aggro: 1.3 };
  return { enemyDmg: 1, enemyHp: 1, aggro: 1 }; // 'agent'
}

// Missions override the default street-gang pool (weights = repetition).
function pickEnemy(rng, pool) {
  return rng.pick(pool ?? ['lookout', 'soldier', 'soldier', 'dealer', 'dealer', 'bruiser']);
}

function makeEnemy(typeKey, x, y, w) {
  const t = ENEMY_TYPES[typeKey];
  const hp = Math.round(t.hp * (w?.difficulty.enemyHp ?? 1));
  return {
    id: id(), kind: 'enemy', type: typeKey, tag: t.score, boss: !!t.boss,
    x, y, vx: 0, vy: 0, hp, maxHp: hp, armor: t.armor ?? 0, speed: t.speed,
    color: t.color, personality: t.personality,
    ws: makeWeaponState(t.weapon), aimAngle: 0, shield: !!t.shield,
    state: 'IDLE', stateTime: 0, moraleTimer: 1 + Math.random(),
    cuffProgress: 0, searched: false, carriesIntel: Math.random() < 0.35,
    stunTimer: 0, hitFlash: 0, wanderA: Math.random() * TAU,
    counted: false, phase: 1,
    shotTimer: 0.8 + Math.random() * 0.9, // reaction delay before first shot
  };
}

function makeCivilian(x, y) {
  return {
    id: id(), kind: 'civ', x, y, vx: 0, vy: 0, hp: 30, maxHp: 30,
    state: 'WANDER', stateTime: 0, wanderA: Math.random() * TAU,
    speed: 90, hitFlash: 0, counted: false,
  };
}

export function addPlayer(w, agentKey, slot) {
  if (w.players.some((p) => p.slot === slot)) return null;
  const a = AGENTS[agentKey];
  const sp = w.spawnPoints[0] ?? { x: TILE * 2, y: TILE * 2 };
  const upgrades = w.settings?.upgrades ?? {};
  const p = {
    id: id(), kind: 'player', slot, agent: a, agentKey,
    x: sp.x + slot * 40, y: sp.y, vx: 0, vy: 0,
    hp: a.maxHp + (upgrades.armor ?? 0) * 15, maxHp: a.maxHp + (upgrades.armor ?? 0) * 15,
    armor: a.armor, aimAngle: 0, aiming: false, moving: false,
    weapons: [makeWeaponState('pistol'), makeWeaponState('taser')],
    weaponIdx: 0, meleeCd: 0, dodgeTimer: 0, dodgeCd: 0, dodgeDx: 0, dodgeDy: 0,
    dodgeBoost: 1, sliding: false, sprintTimer: 0, sprintCd: 0, lastDodgeTap: 0,
    iframes: 1.2, downed: false, reviveProgress: 0, hitFlash: 0, // brief spawn protection
    cuffingId: null, commandCd: 0, prev: {},
  };
  w.players.push(p);
  return p;
}

export function removePlayer(w, slot) {
  const i = w.players.findIndex((p) => p.slot === slot);
  if (i >= 0 && w.players.length > 1) w.players.splice(i, 1);
}

// --- collision helpers ---

function solidAt(w, x, y) {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= w.cols || ty >= w.rows) return true;
  return w.walls.has(tx + ',' + ty);
}

function tileAt(w, x, y) {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  return w.mission.map[ty]?.[tx] ?? '.';
}

function moveCircle(w, e, dx, dy) {
  // axis-separated slide against walls and solid props
  for (const [mx, my] of [[dx, 0], [0, dy]]) {
    const nx = e.x + mx, ny = e.y + my;
    let blocked = solidAt(w, nx - R, ny) || solidAt(w, nx + R, ny) || solidAt(w, nx, ny - R) || solidAt(w, nx, ny + R);
    if (!blocked) {
      for (const pr of w.props) {
        if (pr.solid && pr.hp > 0 && dist(nx, ny, pr.x, pr.y) < R + pr.r - 6) { blocked = true; break; }
      }
    }
    if (!blocked) { e.x = nx; e.y = ny; }
  }
}

// True when a radius-R circle at (x,y) overlaps any wall/border.
function inSolid(w, x, y, r = R) {
  return solidAt(w, x - r, y) || solidAt(w, x + r, y) || solidAt(w, x, y - r) || solidAt(w, x, y + r);
}

// Find the nearest point clear of walls, spiralling out from (x,y). Used to eject
// an entity that ends up inside geometry (e.g. spilling out of a wrecked car
// against a wall) so it can never be trapped inside a building.
function nearestOpen(w, x, y, r = R) {
  if (!inSolid(w, x, y, r)) return { x, y };
  for (let ring = 1; ring <= 14; ring++) {
    const step = ring * (TILE / 2);
    for (let a = 0; a < 8; a++) {
      const px = x + Math.cos(a / 8 * TAU) * step;
      const py = y + Math.sin(a / 8 * TAU) * step;
      if (!inSolid(w, px, py, r)) return { x: px, y: py };
    }
  }
  return { x, y };
}

function hasLos(w, x0, y0, x1, y1) {
  const d = dist(x0, y0, x1, y1);
  const steps = Math.ceil(d / (TILE / 3));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const sx = x0 + (x1 - x0) * t, sy = y0 + (y1 - y0) * t;
    if (solidAt(w, sx, sy)) return false;
    for (const pr of w.props) {
      if (pr.solid && pr.hp > 0 && dist(sx, sy, pr.x, pr.y) < pr.r) return false;
    }
  }
  return true;
}

function nearestPlayer(w, x, y) {
  let best = null, bd = Infinity;
  for (const p of w.players) {
    if (p.downed) continue;
    const d = dist(x, y, p.x, p.y);
    if (d < bd) { bd = d; best = p; }
  }
  return { player: best, d: bd };
}

// --- events into objectives + stats ---

function objEvent(w, ev) {
  const before = w.objectives.filter((o) => !o.primary && o.done).length;
  applyEvent(w.objectives, ev);
  const after = w.objectives.filter((o) => !o.primary && o.done).length;
  if (after > before) {
    w.stats.optionalDone = after;
    w.fx.log?.('Optional objective complete');
    saveCheckpoint(w);
  }
}

function neutralize(w, e, how) {
  // how: 'killed' | 'arrested'
  if (how === 'killed') { w.stats.kills++; if (!e.counted) { objEvent(w, { type: 'neutralized', tag: e.tag }); e.counted = true; } }
  else if (how === 'arrested') { w.stats.arrests++; objEvent(w, { type: 'arrested', tag: e.tag }); if (!e.counted) { objEvent(w, { type: 'neutralized', tag: e.tag }); e.counted = true; } }
  if (e.boss) {
    w.stats.bossArrested = how === 'arrested';
    objEvent(w, { type: 'bossDown' });
  }
}

function saveCheckpoint(w) {
  w.checkpoint = structuredClone({
    players: w.players.map((p) => ({ slot: p.slot, agentKey: p.agentKey, x: p.x, y: p.y, hp: p.hp, weapons: p.weapons, weaponIdx: p.weaponIdx, vehicleId: p.vehicleId ?? null })),
    enemies: w.enemies, civilians: w.civilians, pickups: w.pickups,
    props: w.props.filter((pr) => pr.hp !== Infinity ? true : true),
    vehicles: w.vehicles, zones: w.zones, truckDown: w.truckDown,
    vehicleDownTags: w.vehicleDownTags, delivered: w.delivered,
    objectives: w.objectives, stats: w.stats,
    escalated: w.escalated, bossSpawned: w.bossSpawned,
  });
}

export function restoreCheckpoint(w) {
  if (!w.checkpoint) return false;
  const c = structuredClone(w.checkpoint);
  w.enemies = c.enemies; w.civilians = c.civilians; w.pickups = c.pickups; w.props = c.props;
  w.vehicles = c.vehicles ?? []; w.zones = c.zones ?? []; w.truckDown = c.truckDown ?? false;
  w.vehicleDownTags = c.vehicleDownTags ?? new Set(); w.delivered = c.delivered ?? false;
  w.objectives = c.objectives; w.stats = c.stats;
  w.escalated = c.escalated; w.bossSpawned = c.bossSpawned;
  w.boss = w.enemies.find((e) => e.boss) ?? null;
  w.bullets = []; w.effects = [];
  for (const snap of c.players) {
    const p = w.players.find((pp) => pp.slot === snap.slot);
    if (!p) continue;
    Object.assign(p, { x: snap.x, y: snap.y, hp: Math.max(snap.hp, p.maxHp * 0.5), weapons: snap.weapons, weaponIdx: snap.weaponIdx, downed: false, reviveProgress: 0, cuffingId: null, vehicleId: snap.vehicleId ?? null });
  }
  w.status = 'playing';
  return true;
}

// --- per-frame update ---

export function updateWorld(w, dt, controlsBySlot) {
  if (w.status !== 'playing') { w.endTimer += dt; return; }
  w.stats.timeSec += dt;
  w.threat = 0;
  for (const e of w.enemies) if (e.state === 'FIGHT' && e.hp > 0) { w.threat = 1; break; }

  for (const p of w.players) updatePlayer(w, p, dt, controlsBySlot[p.slot]);
  updateVehicles(w, dt);
  for (const e of w.enemies) updateEnemy(w, e, dt);
  for (const c of w.civilians) updateCivilian(w, c, dt);
  updateBullets(w, dt);

  // reach zones
  for (const z of w.zones) {
    if (z.done) continue;
    if (w.players.some((p) => dist(p.x, p.y, z.x, z.y) < z.r)) {
      z.done = true;
      objEvent(w, { type: 'reached', tag: z.tag });
      w.fx.log?.('Checkpoint gate reached');
    }
  }

  // Convoy endgame — the same edge means opposite things per mission:
  // pursuit ('stop'): the shipment escaping ends the run in failure;
  // escort ('protect'): the van arriving is the delivery objective.
  const truck = w.vehicles.find((v) => v.tag === 'truck');
  if (truck && !truck.disabled && truck.x > w.cols * TILE - 90) {
    if (w.mission.convoyGoal === 'protect') {
      if (!w.delivered) {
        w.delivered = true;
        truck.ai = null; truck.speed = 0;
        objEvent(w, { type: 'reached', tag: 'delivered' });
        w.fx.banner?.('EVIDENCE DELIVERED');
        saveCheckpoint(w);
      }
    } else {
      w.fx.banner?.('THE SHIPMENT GOT AWAY');
      endMission(w, 'failed');
    }
  }
  w.effects = w.effects.filter((f) => (f.t += dt) < f.dur);
  // burn fuses on breached vats so chains cascade visibly instead of instantly
  for (const pr of w.props) {
    if (pr.fuse == null) continue;
    pr.fuse -= dt;
    if (pr.fuse <= 0) explodeProp(w, pr);
  }
  w.props = w.props.filter((pr) => pr.hp > 0 || pr.fuse != null);

  // Escalation event
  const clearObj = w.objectives.find((o) => o.id === 'clear');
  const esc = w.mission.escalation;
  // Escalation triggers on crew progress (at) OR on the convoy passing the
  // ambush point (atVanFrac) — whichever comes first. A defensive escort that
  // never engages the screen must still meet the ambush, or the primary boss
  // objective can soft-lock.
  const escByCrew = esc && esc.at != null && clearObj && clearObj.progress >= esc.at;
  const escByRoute = esc && esc.atVanFrac != null && truck && !truck.disabled
    && truck.x > w.cols * TILE * esc.atVanFrac;
  if (esc && !w.escalated && (escByCrew || escByRoute)) {
    w.escalated = true;
    for (const s of esc.spawns) w.enemies.push(alertEnemy(makeEnemy(s.type, s.x * TILE + TILE / 2, s.y * TILE + TILE / 2, w)));
    for (const vd of esc.vehicles ?? []) {
      // reinforcement vehicles enter the pursuit from behind the player
      const px = w.players[0]?.x ?? vd.x * TILE;
      const laneY = vd.y * TILE + TILE / 2;
      const v = makeVehicle(vd.type, Math.max(90, px - 560), laneY, { tag: vd.tag, ai: vd.ai, laneY, cruise: vd.cruise ?? 220 });
      v.speed = v.cruise * 0.9;
      w.vehicles.push(v);
    }
    w.fx.banner?.(esc.banner); w.fx.alarm?.();
    saveCheckpoint(w);
  }

  // Boss spawn: after the crew objective, or when the shipment truck is stopped
  const bossDef = w.mission.boss;
  // trigger names a vehicle tag (m03/m07 'truck', m10 'wrecker'); default is
  // the crew objective. The boss climbs out of whichever wreck triggered him.
  const bossReady = bossDef?.trigger
    ? w.vehicleDownTags.has(bossDef.trigger)
    : clearObj?.done;
  if (bossDef && !w.bossSpawned && bossReady) {
    w.bossSpawned = true;
    const wreck = bossDef.trigger ? w.vehicles.find((v) => v.tag === bossDef.trigger && v.disabled) : null;
    const bx = wreck ? wreck.x / TILE : bossDef.x;
    const by = wreck ? wreck.y / TILE : bossDef.y;
    const b = makeEnemy(bossDef.type, bx * TILE + TILE / 2, by * TILE + TILE / 2, w);
    b.name = bossDef.name;
    w.boss = alertEnemy(b);
    w.enemies.push(b);
    w.fx.banner?.(bossDef.name); w.fx.subtitle?.(bossDef.name, bossDef.intro);
    saveCheckpoint(w);
  }

  // Boss phases + surrender window
  if (w.boss && w.boss.hp > 0 && !isCuffable(w.boss.state) && w.boss.state !== 'CUFFED') {
    const b = w.boss, def = w.mission.boss;
    if (b.phase === 1 && b.hp / b.maxHp <= def.phase2At) {
      b.phase = 2; b.speed *= 1.35;
      for (const s of def.phase2Spawns ?? []) w.enemies.push(alertEnemy(makeEnemy(s.type, s.x * TILE + TILE / 2, s.y * TILE + TILE / 2, w)));
      w.fx.banner?.(def.phase2Banner);
    }
    const othersLeft = w.enemies.some((e) => !e.boss && (e.state === 'FIGHT' || e.state === 'IDLE' || e.state === 'FLEE'));
    if (b.hp / b.maxHp <= def.surrenderAt && !othersLeft && b.state === 'FIGHT') {
      b.state = 'SURRENDER'; b.stateTime = 0;
      w.fx.subtitle?.(def.name, `${def.name}: "Alright! ALRIGHT. Cuff me before I change my mind."`);
      w.fx.surrender?.(b.x, b.y);
    }
  }

  // Camera follows player midpoint
  const alive = w.players.filter((p) => !p.downed);
  const anchor = alive.length ? alive : w.players;
  if (anchor.length) {
    const cx = anchor.reduce((s, p) => s + p.x, 0) / anchor.length;
    const cy = anchor.reduce((s, p) => s + p.y, 0) / anchor.length;
    const sm = 1 - Math.pow(0.001, dt * (w.settings?.cameraSmooth ?? 1));
    w.cam.x += (cx - w.cam.x) * sm;
    w.cam.y += (cy - w.cam.y) * sm;
  }
  // Clamp camera so ALL players stay on screen with a safety margin.
  // 3D renderer uses pitch ~58° (1.02 rad), distance 620.
  // Bottom of screen reaches ~1.6x further in world Y than top.
  // We inflate vertical half-view so players never vanish at bottom edge.
  {
    const hw = (w.viewW ?? 1280) / 2 / ZOOM;
    const hh = (w.viewH ?? 720) / 2 / ZOOM;
    const mw = w.cols * TILE;
    const mh = w.rows * TILE;

    // 3D camera pitch fudge: bottom of frustum extends further in +Y
    const VERT_FUDGE = 1.6;
    const effHh = hh * VERT_FUDGE;

    const alive = w.players.filter((p) => !p.downed);
    const anchor = alive.length ? alive : w.players;
    let maxOffsetX = 0, maxOffsetY = 0;
    if (anchor.length) {
      maxOffsetX = Math.max(...anchor.map((p) => Math.abs(p.x - w.cam.x)));
      maxOffsetY = Math.max(...anchor.map((p) => Math.abs(p.y - w.cam.y)));
    }
    const SAFE_FRAC = 0.8; // keep players within inner 80% of half-view
    const minHw = Math.min(hw, maxOffsetX > 0 ? maxOffsetX / SAFE_FRAC : hw);
    const minHh = Math.min(effHh, maxOffsetY > 0 ? maxOffsetY / SAFE_FRAC : effHh);

    if (mw <= hw * 2) w.cam.x = mw / 2;
    else w.cam.x = clamp(w.cam.x, minHw, mw - minHw);
    if (mh <= effHh * 2) w.cam.y = mh / 2;
    else w.cam.y = clamp(w.cam.y, minHh, mh - minHh);
  }
  w.cam.shake = Math.max(0, w.cam.shake - dt * 3);

  // Win / lose
  if (primaryFailed(w.objectives)) endMission(w, 'failed');
  else if (primaryComplete(w.objectives)) endMission(w, 'success');
  else if (w.players.length && w.players.every((p) => p.downed)) endMission(w, 'failed');
}

function endMission(w, status) {
  if (w.status !== 'playing') return;
  if (status === 'success') {
    // surviving a protect objective is completing it
    for (const o of w.objectives) if (o.type === 'protect' && !o.failed) o.done = true;
    w.stats.optionalDone = w.objectives.filter((o) => !o.primary && o.done).length;
  }
  w.status = status;
  w.endTimer = 0;
}

function alertEnemy(e) { e.state = 'FIGHT'; return e; }

// --- player ---

// Mobility L4 sprint-burst state machine (pure — no world/DOM). Mutates and
// reads the carrier's { sprintTimer, sprintCd, lastDodgeTap } each frame and
// returns true only on the frame a burst starts. A burst starts on the SECOND
// dodge tap inside ue.sprintTapWindow while moving and not aiming; when the
// timer runs out it opens a cooldown, and an active burst or live cooldown
// blocks re-triggering. Below L4, ue.sprintBurst is false so it never fires.
export function stepSprint(s, dt, ue, { tapped, moving, aiming }) {
  s.sprintCd = Math.max(0, (s.sprintCd ?? 0) - dt);
  s.lastDodgeTap = Math.max(0, (s.lastDodgeTap ?? 0) - dt);
  if ((s.sprintTimer ?? 0) > 0) {
    s.sprintTimer -= dt;
    if (s.sprintTimer <= 0) { s.sprintTimer = 0; s.sprintCd = ue.sprintCd; } // expiry → cooldown
  } else {
    s.sprintTimer = 0;
  }
  let activated = false;
  if (tapped) {
    if (ue.sprintBurst && moving && !aiming
        && s.lastDodgeTap > 0 && s.sprintTimer <= 0 && s.sprintCd <= 0) {
      s.sprintTimer = ue.sprintDuration; // second tap in-window: fire the burst
      s.lastDodgeTap = 0;
      activated = true;
    } else {
      s.lastDodgeTap = ue.sprintTapWindow; // arm the window for the next tap
    }
  }
  return activated;
}

function updatePlayer(w, p, dt, c) {
  p.hitFlash = Math.max(0, p.hitFlash - dt);
  p.iframes = Math.max(0, p.iframes - dt);
  p.meleeCd = Math.max(0, p.meleeCd - dt);
  p.dodgeCd = Math.max(0, p.dodgeCd - dt);
  p.commandCd = Math.max(0, p.commandCd - dt);
  for (const ws of p.weapons) tickWeapon(ws, dt);
  if (p.downed || !c) { p.cuffingId = null; return; }

  // Safety net: if the agent is ever inside geometry (physics nudge, a wreck
  // spilling them badly, a spawn overlap), eject them to open ground so they
  // can never be trapped in a wall.
  if (p.vehicleId == null && inSolid(w, p.x, p.y)) {
    const open = nearestOpen(w, p.x, p.y);
    p.x = open.x; p.y = open.y;
  }

  const upgrades = w.settings?.upgrades ?? {};
  const ue = upgradeEffects(upgrades);
  const speed = p.agent.speed * ue.speedMul;

  // Armour L4: slow regen once out of combat
  p.sinceHurt = (p.sinceHurt ?? 0) + dt;
  if (ue.regenPerSec > 0 && p.sinceHurt > ue.regenDelay && p.hp < p.maxHp) {
    p.hp = Math.min(p.maxHp, p.hp + ue.regenPerSec * dt);
  }

  // Driving: movement controls go to the vehicle; aiming and shooting stay live
  if (p.vehicleId != null) {
    const v = w.vehicles.find((x) => x.id === p.vehicleId);
    if (!v) { p.vehicleId = null; }
    else {
      if (v.driverSlot === p.slot) {
        const d = stepVehicle(v, { throttle: -c.moveY, steer: c.moveX, handbrake: c.dodge }, dt, w);
        moveVehicle(w, v, d.dx, d.dy);
        checkSpikeStrips(v, w);
      }
      p.x = v.x; p.y = v.y;
      aimPlayer(w, p, c);
      firePlayer(w, p, c, { fromVehicle: v });
      if (c.interact && justPressed(p, c, 'interact')) {
        // step out beside the car
        p.vehicleId = null;
        if (v.driverSlot === p.slot) v.driverSlot = null;
        p.x = v.x + Math.cos(v.angle + Math.PI / 2) * (v.r + 22);
        p.y = v.y + Math.sin(v.angle + Math.PI / 2) * (v.r + 22);
        w.fx.log?.(`${p.agent.name} dismounts`);
      }
      rememberPressed(p, c);
      return;
    }
  }

  // Movement intent — computed before the dodge/slide split because the L4
  // sprint double-tap needs the live move vector (the second tap lands while a
  // dodge is still animating, so p.moving would otherwise be stale).
  let mx = c.moveX, my = c.moveY;
  const ml = Math.hypot(mx, my);
  if (ml > 1) { mx /= ml; my /= ml; }
  p.moving = ml > 0.01;
  const dodgeTapped = c.dodge && justPressed(p, c, 'dodge');

  // Mobility L4: double-tap dodge (moving, not aiming) → sprint burst. The
  // helper ticks the burst timer + cooldown every frame and returns true the
  // frame it fires. Gated: below L4, ue.sprintBurst is false so it never fires.
  const sprinted = stepSprint(p, dt, ue, { tapped: dodgeTapped, moving: p.moving, aiming: !!c.aim });
  if (sprinted) w.fx.dodge?.();
  const sprintMul = p.sprintTimer > 0 ? ue.sprintSpeedMul : 1;

  // Dodge / combat slide
  if (p.dodgeTimer > 0) {
    p.dodgeTimer -= dt;
    if (p.dodgeTimer <= 0) p.sliding = false;
    moveCircle(w, p, p.dodgeDx * p.agent.dodgeSpeed * (p.dodgeBoost ?? 1) * dt, p.dodgeDy * p.agent.dodgeSpeed * (p.dodgeBoost ?? 1) * dt);
  } else {
    const slow = c.aim && w.settings?.holdToAim ? 0.55 : 1;
    moveCircle(w, p, mx * speed * sprintMul * slow * dt, my * speed * sprintMul * slow * dt);

    if (dodgeTapped && p.dodgeCd <= 0 && p.moving) {
      // Mobility L3: dodging WHILE aiming becomes a combat slide — 1.5x duration,
      // more ground, and i-frames for the whole slide. Aiming/firing already run
      // below regardless, so the slide keeps them; its distinct feel is the
      // longer/farther committed movement with full-duration invulnerability.
      const sliding = ue.combatSlide && !!c.aim;
      const dodgeTime = p.agent.dodgeTime * (sliding ? ue.slideTimeMul : 1);
      p.dodgeTimer = dodgeTime; p.dodgeCd = ue.dodgeCd; // Mobility L2 shortens
      p.dodgeBoost = sliding ? ue.slideDistMul : ue.dodgeDistMul;
      p.iframes = dodgeTime + 0.08; // slide keeps i-frames its whole duration
      p.sliding = sliding;
      p.dodgeDx = mx / (ml || 1); p.dodgeDy = my / (ml || 1);
      w.fx.dodge?.();
      if (p.agent.dodgeStagger) { // RHINO shove staggers nearby enemies
        for (const e of w.enemies) {
          if (e.hp > 0 && dist(p.x, p.y, e.x, e.y) < 70) e.stunTimer = Math.max(e.stunTimer, 0.8);
        }
      }
    }
  }

  // Enforcement L3: downed suspects get cuffed by standing over them — no hold
  if (ue.autoCuff && !p.downed) {
    for (const e of w.enemies) {
      if (e.state !== 'DOWNED') continue;
      if (dist(p.x, p.y, e.x, e.y) > 64) continue;
      e.cuffProgress = tickCuff(e.cuffProgress ?? 0, dt * 0.6, { cuffSpeed: p.agent.cuffSpeed });
      if (e.cuffProgress >= 1 && e.state !== 'CUFFED') completeCuff(w, e);
    }
  }

  aimPlayer(w, p, c);

  // Weapon swap
  if (c.swap && justPressed(p, c, 'swap')) {
    p.weaponIdx = (p.weaponIdx + 1) % p.weapons.length;
    w.fx.reloadSfx?.();
  }
  firePlayer(w, p, c, {});
  const def = WEAPONS[p.weapons[p.weaponIdx].key];

  // Melee button always swings fists
  if (c.melee && p.meleeCd <= 0 && justPressed(p, c, 'melee')) {
    p.meleeCd = 0.45;
    meleeSwing(w, p, WEAPONS.fists);
  }

  // FREEZE command — morale shock in a radius with line of sight
  if (c.command && p.commandCd <= 0 && justPressed(p, c, 'command')) {
    p.commandCd = 4;
    w.fx.subtitle?.(p.agent.name, `${p.agent.name}: "VICE GRID — FREEZE!"`);
    for (const e of w.enemies) {
      if (e.hp <= 0 || e.state !== 'FIGHT') continue;
      const d = dist(p.x, p.y, e.x, e.y);
      if (d < 380 * ue.intimidateRadiusMul && hasLos(w, p.x, p.y, e.x, e.y)) {
        e.moraleTimer = Math.min(e.moraleTimer, 0.05);
        // Enforcement L2: force the surrender check right here (no-op below L2),
        // so far more suspects break instead of merely re-rolling next tick.
        intimidateFlash(w, e, ue);
      }
    }
    // a visible shockwave so the flash reads on screen (Enforcement L2)
    if (ue.intimidateFlash) w.effects.push({ kind: 'blast', x: p.x, y: p.y, t: 0, dur: 0.4 });
  }

  // Interact: cuff > revive > pickup
  handleInteract(w, p, dt, c);

  rememberPressed(p, c);
}

function justPressed(p, c, key) { return c[key] && !p.prev[key]; }
function rememberPressed(p, c) { p.prev = { ...c }; }

function aimPlayer(w, p, c) {
  if (c.usesMouseAim) {
    // A perspective renderer installs screenToWorld (a ground-plane raycast);
    // the flat maths below is only correct for an orthographic zoom.
    let wx, wy;
    if (w.screenToWorld) {
      ({ x: wx, y: wy } = w.screenToWorld(c.aimScreenX, c.aimScreenY));
    } else {
      wx = w.cam.x + (c.aimScreenX - w.viewW / 2) / ZOOM;
      wy = w.cam.y + (c.aimScreenY - w.viewH / 2) / ZOOM;
    }
    p.aimAngle = angleTo(p.x, p.y, wx, wy);
  } else if (Math.hypot(c.aimDirX ?? 0, c.aimDirY ?? 0) > 0.01) {
    p.aimAngle = Math.atan2(c.aimDirY, c.aimDirX);
    if (w.settings?.aimAssist) p.aimAngle = assistAim(w, p, p.aimAngle);
  }
  p.aiming = !!c.aim;
}

function firePlayer(w, p, c, { fromVehicle }) {
  const upgrades = w.settings?.upgrades ?? {};
  const ue = upgradeEffects(upgrades);
  const ws = p.weapons[p.weaponIdx];
  const def = WEAPONS[ws.key];

  if (c.reload && justPressed(p, c, 'reload') && startReload(ws)) w.fx.reloadSfx?.();
  if (c.fire && ws.ammo === 0 && ws.reloading <= 0 && startReload(ws)) w.fx.reloadSfx?.();

  if (c.fire && !def.melee && canFire(ws)) {
    fire(ws);
    // Weapons L3: aiming while firing swaps to a single heavy slug shot.
    const slug = ue.altFire && !!c.aim && !def.melee;
    ws.cooldown /= ue.fireRateMul;          // Weapons L2: +12% fire rate
    if (slug) ws.cooldown *= ue.slugCooldownMul; // L3: heavier weapon, slower to re-fire
    const pellets = slug ? 1 : (def.pellets ?? 1);
    w.stats.shotsFired += pellets;
    const muzzleR = fromVehicle ? fromVehicle.r + 14 : R + 6;
    let spread = effectiveSpread(def, {
      moving: p.moving || (!!fromVehicle && Math.abs(fromVehicle.speed) > 60),
      stability: p.agent.stability + ue.stabilityBonus,
    });
    if (slug) spread *= ue.slugSpreadMul;   // L3: tighter grouping
    for (let i = 0; i < pellets; i++) {
      const a = p.aimAngle + (w.rng() - 0.5) * 2 * spread;
      w.bullets.push({
        x: p.x + Math.cos(a) * muzzleR, y: p.y + Math.sin(a) * muzzleR,
        vx: Math.cos(a) * def.speed, vy: Math.sin(a) * def.speed,
        weaponKey: ws.key, lethal: def.lethal, stun: def.stun ?? 0,
        dmgBase: def.damage * ue.damageMul * (slug ? ue.slugDamageMul : 1),
        ox: p.x, oy: p.y, fromPlayer: true, life: def.range / def.speed,
        knockback: def.knockback * (slug ? ue.slugKnockbackMul : 1),
        incendiary: ue.incendiary, slug, // L4 burn tag / L3 heavy-shot visual
        ignoreVehicleId: fromVehicle?.id ?? null,
      });
    }
    w.fx.shot?.(ws.key, p.x, p.y);
    // Slug is a visibly bigger event: heavier shake and a fatter muzzle flash.
    w.cam.shake = Math.min(1, w.cam.shake + (slug ? 0.35 : 0.15) * (w.settings?.screenShake ?? 1));
    w.effects.push({ kind: 'muzzle', x: p.x + Math.cos(p.aimAngle) * (muzzleR + 4), y: p.y + Math.sin(p.aimAngle) * (muzzleR + 4), a: p.aimAngle, t: 0, dur: slug ? 0.12 : 0.06, slug });
  } else if (c.fire && def.melee && canFire(ws) && !fromVehicle) {
    fire(ws);
    meleeSwing(w, p, def);
  }
}

function assistAim(w, p, a) {
  let best = a, bd = 0.18; // ~10 degrees
  for (const e of w.enemies) {
    if (e.hp <= 0 || e.state === 'CUFFED') continue;
    const ea = angleTo(p.x, p.y, e.x, e.y);
    const d = Math.abs(((ea - a + Math.PI) % TAU) - Math.PI);
    if (d < bd && hasLos(w, p.x, p.y, e.x, e.y)) { bd = d; best = ea; }
  }
  return best;
}

function meleeSwing(w, p, def) {
  w.effects.push({ kind: 'swing', x: p.x, y: p.y, a: p.aimAngle, t: 0, dur: 0.12 });
  for (const e of [...w.enemies, ...w.civilians]) {
    if (e.hp <= 0 || e.state === 'DEAD' || e.state === 'CUFFED') continue;
    const d = dist(p.x, p.y, e.x, e.y);
    if (d > def.range + R) continue;
    const da = Math.abs(((angleTo(p.x, p.y, e.x, e.y) - p.aimAngle + Math.PI) % TAU) - Math.PI);
    if (da > 1.1) continue;
    hitEntity(w, e, damageAtDistance(def, d), { lethal: def.lethal, stun: def.stun ?? 0.6, kx: Math.cos(p.aimAngle) * def.knockback, ky: Math.sin(p.aimAngle) * def.knockback, fromPlayer: true });
  }
}

// Shared by held-interact cuffing and the Enforcement L3 auto-cuff.
// Enforcement L2: a FREEZE that doesn't just reset the morale clock but forces
// an on-the-spot surrender check with a heavy fear penalty, so far more suspects
// break than the base shout. Bosses hold; sly types can still fake it. Gated on
// ue.intimidateFlash — a no-op below Enforcement L2. Returns the new state or
// null. Decides directly here because morale isn't stored: a stunned enemy
// early-returns before the periodic FIGHT check, so leaning on stunTimer to lower
// morale would defer (or cancel) the surrender rather than cause it.
export function intimidateFlash(w, e, ue) {
  if (!ue?.intimidateFlash) return null;
  if (e.boss || e.hp <= 0 || e.state !== 'FIGHT') return null;
  const alliesDown = w.enemies.filter((x) => x.counted || x.hp <= 0 || isCuffable(x.state)).length;
  const intimidation = Math.max(0, ...w.players.map((p) => p.agent?.intimidation ?? 0)) + ue.intimidateFlashFear;
  const m = computeMorale(e, {
    alliesDown, alliesTotal: Math.max(w.enemies.length, 1),
    aimedAt: true, distToPlayer: 0, intimidation,
  });
  const r = decideReaction(e, m, w.rng());
  if (r === 'fight') return null;
  e.state = { flee: 'FLEE', surrender: 'SURRENDER', fake_surrender: 'FAKE_SURRENDER' }[r];
  e.stateTime = 0;
  e.stunTimer = Math.max(e.stunTimer ?? 0, ue.intimidateFlashStun);
  if (r !== 'flee') w.fx.surrender?.(e.x, e.y);
  return e.state;
}

// Enforcement L4: completing an arrest pops a flashbang — nearby active threats
// (not cuffed / downed / already surrendering) get stunned and rattled, reusing
// the same stun/morale levers FREEZE and hitEntity use. Gated on ue.cuffFlashbang
// (no-op below Enforcement L4). Returns the number of enemies caught in the burst.
export function cuffFlashbang(w, cx, cy, ue) {
  if (!ue?.cuffFlashbang) return 0;
  let caught = 0;
  for (const e of w.enemies) {
    if (e.hp <= 0 || e.state === 'CUFFED' || e.state === 'DOWNED' || isCuffable(e.state)) continue;
    if (dist(cx, cy, e.x, e.y) > ue.cuffFlashbangRadius) continue;
    e.stunTimer = Math.max(e.stunTimer ?? 0, ue.cuffFlashbangStun);
    e.moraleTimer = Math.min(e.moraleTimer ?? 1, 0.05);
    e.hitFlash = Math.max(e.hitFlash ?? 0, 0.12);
    caught++;
  }
  w.effects.push({ kind: 'blast', x: cx, y: cy, t: 0, dur: 0.5 });
  return caught;
}

function completeCuff(w, target) {
  target.state = 'CUFFED'; target.stateTime = 0;
  w.fx.cuff?.(target.x, target.y);
  w.fx.log?.(`${enemyLabel(target)} arrested`);
  neutralize(w, target, 'arrested');
  const found = searchSuspect(target, w.rng());
  if (found.found === 'intel') { w.stats.intel = (w.stats.intel ?? 0) + 1; w.fx.log?.('Intel recovered: evidence marked on the grid'); }
  // Enforcement L4: flashbang burst on arrest (no-op below L4)
  cuffFlashbang(w, target.x, target.y, upgradeEffects(w.settings?.upgrades));
  saveCheckpoint(w);
}

function handleInteract(w, p, dt, c) {
  if (!c.interact) { p.cuffingId = null; p.reviveProgress = 0; return; }

  // board a nearby working vehicle (tap, not hold)
  if (justPressed(p, c, 'interact')) {
    const v = w.vehicles.find((x) => !x.disabled && !x.ai && dist(p.x, p.y, x.x, x.y) < x.r + 46);
    if (v) {
      p.vehicleId = v.id;
      if (v.driverSlot == null) v.driverSlot = p.slot;
      w.fx.log?.(`${p.agent.name} ${v.driverSlot === p.slot ? 'takes the wheel' : 'rides shotgun'}`);
      return;
    }
  }
  const upgrades = w.settings?.upgrades ?? {};
  const cuffSpeed = p.agent.cuffSpeed * upgradeEffects(upgrades).cuffSpeedMul;

  // 1) cuff nearest cuffable enemy
  let target = null, td = 64;
  for (const e of w.enemies) {
    if (e.state === 'CUFFED' || !isCuffable(e.state)) continue;
    const d = dist(p.x, p.y, e.x, e.y);
    if (d < td) { td = d; target = e; }
  }
  if (target) {
    if (p.cuffingId !== target.id) { p.cuffingId = target.id; target.cuffProgress = target.cuffProgress ?? 0; }
    target.cuffProgress = tickCuff(target.cuffProgress, dt, { cuffSpeed });
    if (target.cuffProgress >= 1 && target.state !== 'CUFFED') completeCuff(w, target);
    return;
  }

  // 2) revive downed partner
  const partner = w.players.find((q) => q !== p && q.downed && dist(p.x, p.y, q.x, q.y) < 70);
  if (partner) {
    p.reviveProgress += dt / 2.2;
    if (p.reviveProgress >= 1) {
      partner.downed = false; partner.hp = partner.maxHp * 0.4; p.reviveProgress = 0;
      w.stats.revives++; w.fx.log?.(`${partner.agent.name} is back up`);
    }
    return;
  }

  // 3) pickups
  for (const pk of w.pickups) {
    if (pk.taken || dist(p.x, p.y, pk.x, pk.y) > 52) continue;
    pk.taken = true;
    if (pk.kind === 'evidence') {
      w.stats.evidenceFound++; w.fx.evidence?.();
      w.fx.log?.('Evidence secured');
      objEvent(w, { type: 'evidence' });
    } else if (pk.kind === 'medkit') {
      p.hp = Math.min(p.maxHp, p.hp + 60); w.fx.pickup?.();
    } else if (pk.kind === 'weapon') {
      const existing = p.weapons.find((ws) => ws.key === pk.weaponKey);
      if (existing) existing.ammo = WEAPONS[pk.weaponKey].mag;
      else { p.weapons.push(makeWeaponState(pk.weaponKey)); p.weaponIdx = p.weapons.length - 1; }
      w.fx.pickup?.(); w.fx.log?.(`Picked up ${WEAPONS[pk.weaponKey].name}`);
    }
  }
  w.pickups = w.pickups.filter((pk) => !pk.taken);
}

function enemyLabel(e) { return e.boss ? e.name : 'SUSPECT'; }

// Weapons L4 incendiary burn: ticks damage-over-time on a struck enemy. Batched
// on a 0.25s accumulator to keep effect spam down, and routed through hitEntity
// with lethal:false so it can only down (never kill) — arrests still work.
export function tickBurn(w, e, dt) {
  if (!(e.burnTimer > 0)) return;
  e.burnTimer = Math.max(0, e.burnTimer - dt);
  if (e.hp <= 0 || e.state === 'DEAD' || e.state === 'CUFFED' || e.state === 'DOWNED') return;
  e.burnAccum = (e.burnAccum ?? 0) + dt;
  if (e.burnAccum >= 0.25) {
    const dmg = (e.burnDps ?? 0) * e.burnAccum;
    e.burnAccum = 0;
    hitEntity(w, e, dmg, { lethal: false, fromPlayer: true });
  }
}

// --- enemy AI ---

function updateEnemy(w, e, dt) {
  e.stateTime += dt;
  e.hitFlash = Math.max(0, e.hitFlash - dt);
  e.stunTimer = Math.max(0, e.stunTimer - dt);
  tickWeapon(e.ws, dt);
  tickBurn(w, e, dt); // Weapons L4 incendiary damage-over-time
  if (e.state === 'DEAD' || e.state === 'CUFFED' || e.state === 'DOWNED') return;
  if (e.stunTimer > 0) return;

  const { player, d } = nearestPlayer(w, e.x, e.y);
  if (!player) return;
  const los = d < 700 && hasLos(w, e.x, e.y, player.x, player.y);

  if (e.state === 'IDLE') {
    // aggro on sight, or on nearby gunfire — never a map-wide instant alert.
    // In a blackout nobody sees far: the dark is the player's arrest tool.
    const sightR = w.mission.blackout ? 240 : 420;
    const noiseR = w.mission.blackout ? 350 : 560;
    if ((los && d < sightR) || (w.threat > 0 && d < noiseR)) {
      e.state = 'FIGHT'; e.stateTime = 0;
      e.shotTimer = Math.max(e.shotTimer, 0.6 + w.rng() * 0.6);
    } else { wander(w, e, dt, 40); return; }
  }

  if (e.state === 'SURRENDER' || e.state === 'FAKE_SURRENDER') {
    if (e.state === 'FAKE_SURRENDER' && shouldBetray(e, d, e.stateTime)) {
      e.state = 'FIGHT'; e.stateTime = 0;
      w.fx.subtitle?.('SUSPECT', 'SUSPECT: "PSYCH — eat it, Grid!"');
    }
    return;
  }

  if (e.state === 'FLEE') {
    const a = angleTo(player.x, player.y, e.x, e.y);
    moveCircle(w, e, Math.cos(a) * e.speed * dt, Math.sin(a) * e.speed * dt);
    if (d > 900) { // escaped: scene control kept, but no arrest credit
      e.state = 'DEAD'; e.hp = 0;
      if (!e.counted) { objEvent(w, { type: 'neutralized', tag: e.tag }); e.counted = true; }
      w.fx.log?.('A suspect escaped the scene');
    }
    if (e.stateTime > 2 && d < 200) { e.state = 'FIGHT'; } // cornered
    return;
  }

  // FIGHT — periodic morale check
  e.moraleTimer -= dt;
  if (e.moraleTimer <= 0) {
    e.moraleTimer = 0.8 + w.rng() * 0.8;
    const downed = w.enemies.filter((x) => x.counted || x.hp <= 0 || isCuffable(x.state)).length;
    const aimedAt = w.players.some((p) => p.aiming && Math.abs(((angleTo(p.x, p.y, e.x, e.y) - p.aimAngle + Math.PI) % TAU) - Math.PI) < 0.25);
    const intimidation = Math.max(...w.players.map((p) => p.agent.intimidation)) + (w.settings?.upgrades?.enforcement ?? 0) * 0.3;
    const m = computeMorale(e, { alliesDown: downed, alliesTotal: Math.max(w.enemies.length, 1), aimedAt, distToPlayer: d, intimidation });
    const r = decideReaction(e, m, w.rng());
    if (r !== 'fight' && !e.boss) {
      e.state = { flee: 'FLEE', surrender: 'SURRENDER', fake_surrender: 'FAKE_SURRENDER' }[r];
      e.stateTime = 0;
      if (r !== 'flee') {
        w.fx.surrender?.(e.x, e.y);
        w.fx.subtitle?.('SUSPECT', 'SUSPECT: "Okay okay okay — hands up! Don\'t shoot!"');
      }
      return;
    }
  }

  // movement: hold preferred range, strafe; simple flank pressure
  const prefer = WEAPONS[e.ws.key].melee ? 40 : (e.ws.key === 'shotgun' ? 170 : 300);
  const a = angleTo(e.x, e.y, player.x, player.y);
  const strafe = Math.sin(w.stats.timeSec * 1.7 + e.id) * 0.8;
  let mx = 0, my = 0;
  if (d > prefer + 40) { mx = Math.cos(a); my = Math.sin(a); }
  else if (d < prefer - 40) { mx = -Math.cos(a); my = -Math.sin(a); }
  mx += -Math.sin(a) * strafe; my += Math.cos(a) * strafe;
  const ml = Math.hypot(mx, my) || 1;
  moveCircle(w, e, (mx / ml) * e.speed * dt * w.difficulty.aggro, (my / ml) * e.speed * dt * w.difficulty.aggro);
  e.aimAngle = a;

  // shoot — enemies fire in a measured cadence, not at player trigger speed,
  // and hold fire when a civilian is standing in the lane (no "oops" kills)
  e.shotTimer -= dt;
  const laneBlocked = los && w.civilians.some((cv) => {
    if (cv.state === 'DEAD') return false;
    const cd = dist(e.x, e.y, cv.x, cv.y);
    if (cd >= d) return false; // civilian is behind the player
    const ca = angleTo(e.x, e.y, cv.x, cv.y);
    const pa = angleTo(e.x, e.y, player.x, player.y);
    return Math.abs(((ca - pa + Math.PI) % TAU) - Math.PI) < Math.atan2(20, cd);
  });
  if (los && !laneBlocked && canFire(e.ws) && e.shotTimer <= 0) {
    const def = WEAPONS[e.ws.key];
    e.shotTimer = Math.max(1.1, 2.2 / def.rof) * (0.8 + w.rng() * 0.5) / w.difficulty.aggro;
    if (!def.melee && d < def.range) {
      fire(e.ws);
      // enemies are not marksmen: wide spread that grows with distance,
      // and their rounds hit players softer (arcade survivability)
      const spread = def.spread * (2.2 + d / 400);
      for (let i = 0; i < (def.pellets ?? 1); i++) {
        const sa = a + (w.rng() - 0.5) * 2 * spread;
        w.bullets.push({
          x: e.x + Math.cos(sa) * (R + 6), y: e.y + Math.sin(sa) * (R + 6),
          vx: Math.cos(sa) * def.speed, vy: Math.sin(sa) * def.speed,
          weaponKey: e.ws.key, lethal: true, stun: 0,
          dmgBase: def.damage * w.difficulty.enemyDmg * 0.55,
          ox: e.x, oy: e.y, fromPlayer: false, life: def.range / def.speed,
          knockback: def.knockback * 0.4,
        });
      }
      w.fx.shot?.(e.ws.key, e.x, e.y);
    } else if (def.melee && d < def.range + R) {
      fire(e.ws);
      hitEntity(w, player, def.damage * w.difficulty.enemyDmg, { lethal: true, kx: Math.cos(a) * def.knockback, ky: Math.sin(a) * def.knockback, fromPlayer: false });
    }
  }
  if (e.ws.ammo === 0) startReload(e.ws);
}

// --- explosive props (GLOW vats) ---

const BLAST_R = 130;
const BLAST_PEAK = 95;
// Ignition reaches further than the killzone: a rupturing tank breaches its
// neighbours at ranges where a person two steps back walks away. Tuned so a
// vat bank (3 tiles apart) cascades along its own row, while the aisles
// between banks (4 tiles) stay firebreaks — one bank, not the whole room.
const CHAIN_R = 150;

function damageProp(w, pr, dmg) {
  if (pr.hp <= 0 || dmg <= 0) return;
  pr.hp -= dmg;
  w.stats.propertyDamage += dmg;
  if (pr.hp > 0) return;
  pr.hp = 0;
  if (pr.explosive) igniteProp(w, pr);
  else w.effects.push({ kind: 'break', x: pr.x, y: pr.y, t: 0, dur: 0.4 });
}

// A breached vat hisses for a beat before it goes: long enough to read the
// warning and run, short enough that a chain still reads as one event.
function igniteProp(w, pr, delay = 0.45) {
  if (pr.exploded || pr.fuse != null) return;
  pr.fuse = delay;
  pr.hp = 0;
  if (delay >= 0.3) w.fx.alarm?.(); // primary breach warns; chain links don't spam
}

function explodeProp(w, pr) {
  if (pr.exploded) return;
  pr.exploded = true;
  pr.fuse = null;
  pr.hp = 0;
  w.stats.propertyDamage += 60;
  w.effects.push({ kind: 'blast', x: pr.x, y: pr.y, t: 0, dur: 0.55 });
  w.fx.explosion?.(pr.x, pr.y);
  w.cam.shake = Math.min(1.4, w.cam.shake + 0.55 * (w.settings?.screenShake ?? 1));

  // cuffed suspects are prone and out of play; riders are shielded by the car
  for (const t of [...w.enemies, ...w.civilians, ...w.players]) {
    if (t.hp <= 0 || t.state === 'DEAD' || t.state === 'CUFFED') continue;
    if (t.kind === 'player' && (t.downed || t.iframes > 0 || t.vehicleId != null)) continue;
    const d = dist(pr.x, pr.y, t.x, t.y);
    const dmg = blastDamage(BLAST_PEAK, d, BLAST_R);
    if (dmg <= 0) continue;
    const a = angleTo(pr.x, pr.y, t.x, t.y);
    hitEntity(w, t, dmg, { lethal: true, kx: Math.cos(a) * 260, ky: Math.sin(a) * 260, fromPlayer: false });
  }
  for (const v of w.vehicles) {
    if (v.disabled) continue;
    const dmg = blastDamage(BLAST_PEAK * 1.6, dist(pr.x, pr.y, v.x, v.y), BLAST_R);
    if (dmg > 0 && damageVehicle(v, dmg) === 'disabled') onVehicleDisabled(w, v, false);
  }
  // neighbours light their own fuses, so a bank of vats goes up in a run
  for (const other of w.props) {
    if (other === pr || !other.explosive) continue;
    if (dist(pr.x, pr.y, other.x, other.y) < CHAIN_R) igniteProp(w, other, 0.18);
  }
}

// --- vehicles ---

function moveVehicle(w, v, dx, dy) {
  for (const [mx, my] of [[dx, 0], [0, dy]]) {
    if (!mx && !my) continue;
    const nx = v.x + mx, ny = v.y + my;
    let blocked = solidAt(w, nx - v.r, ny) || solidAt(w, nx + v.r, ny) || solidAt(w, nx, ny - v.r) || solidAt(w, nx, ny + v.r);
    if (!blocked) {
      for (const pr of w.props) {
        if (pr.solid && pr.hp > 0 && dist(nx, ny, pr.x, pr.y) < v.r + pr.r - 8) {
          if (pr.kind !== 'barrier' && Math.abs(v.speed) > 140) { damageProp(w, pr, Math.max(40, pr.hp)); }
          else blocked = true;
          break;
        }
      }
    }
    if (blocked) {
      const dmg = ramDamage(Math.abs(v.speed)) * 0.5;
      if (damageVehicle(v, dmg) === 'disabled') onVehicleDisabled(w, v, v.driverSlot != null);
      if (dmg > 0) { w.cam.shake = Math.min(1.2, w.cam.shake + 0.3); w.fx.hit?.(v.x, v.y); }
      v.speed *= -0.25;
    } else { v.x = nx; v.y = ny; }
  }
  // run down pedestrians (both factions get out of the way or get hurt)
  if (Math.abs(v.speed) > 120) {
    for (const t of [...w.enemies, ...w.civilians]) {
      if (t.hp <= 0 || t.state === 'DEAD' || t.state === 'CUFFED') continue;
      if (dist(v.x, v.y, t.x, t.y) < v.r + 10) {
        hitEntity(w, t, ramDamage(Math.abs(v.speed)), { lethal: true, kx: Math.cos(v.angle) * 300, ky: Math.sin(v.angle) * 300, fromPlayer: v.driverSlot != null });
      }
    }
  }
}

function updateVehicles(w, dt) {
  const pv = w.vehicles.find((v) => v.driverSlot != null);
  const truck = w.vehicles.find((v) => v.tag === 'truck');

  for (const v of w.vehicles) {
    v.hitFlash = Math.max(0, v.hitFlash - dt);
    if (v.driverSlot != null) continue; // player-driven in updatePlayer
    let c = { throttle: 0, steer: 0, handbrake: false };
    if (!v.disabled && v.ai) {
      const steerToLane = clamp((v.laneY - v.y) * 0.02, -0.8, 0.8);
      const facingEast = Math.cos(v.angle) >= 0;
      if (v.ai === 'convoy') {
        c = { throttle: v.speed < v.cruise ? 0.8 : 0, steer: steerToLane - clamp(v.angle, -0.6, 0.6) * 0.8, handbrake: false };
      } else if (v.ai === 'escort') {
        // shield the truck; sideswipe the interceptor when it closes in
        let targetY = v.laneY;
        if (pv && Math.abs(pv.x - v.x) < 320) targetY = pv.y;
        else if (truck) targetY = truck.laneY + (v.id % 2 ? 60 : -60);
        c = { throttle: v.speed < v.cruise * 1.15 ? 0.9 : 0, steer: clamp((targetY - v.y) * 0.02, -1, 1) - clamp(v.angle, -0.7, 0.7), handbrake: false };
        // drive-by fire: raiders in an escort mission gun for the van,
        // pursuit-mission escorts gun for the interceptor
        const quarry = (w.mission.convoyGoal === 'protect' && truck && !truck.disabled) ? truck : pv;
        v.shotTimer = (v.shotTimer ?? 1.5) - dt;
        if (quarry && v.shotTimer <= 0 && dist(v.x, v.y, quarry.x, quarry.y) < 420) {
          v.shotTimer = 1.4 + w.rng();
          const a = angleTo(v.x, v.y, quarry.x, quarry.y) + (w.rng() - 0.5) * 0.3;
          w.bullets.push({
            x: v.x + Math.cos(a) * (v.r + 12), y: v.y + Math.sin(a) * (v.r + 12),
            vx: Math.cos(a) * 860, vy: Math.sin(a) * 860,
            weaponKey: 'smg', lethal: true, stun: 0, dmgBase: WEAPONS.smg.damage * w.difficulty.enemyDmg * 0.55,
            ox: v.x, oy: v.y, fromPlayer: false, life: 0.6, knockback: 10, ignoreVehicleId: v.id,
          });
          w.fx.shot?.('smg', v.x, v.y);
        }
      } else if (v.ai === 'traffic') {
        const ahead = w.vehicles.find((o) => o !== v && Math.abs(o.y - v.y) < 30 && (facingEast ? o.x - v.x : v.x - o.x) > 0 && Math.abs(o.x - v.x) < 130);
        c = { throttle: ahead ? -0.8 : (Math.abs(v.speed) < v.cruise ? 0.5 : 0), steer: steerToLane * (facingEast ? 1 : -1), handbrake: false };
      }
    }
    // AI wall avoidance: don't ram map geometry. Probe ahead; if a wall is
    // there, brake and steer toward whichever side is clear. Fixes cars and
    // bikes driving straight into buildings.
    if (v.ai && !v.disabled && v.driverSlot == null) {
      const la = v.r + 34;
      if (solidAt(w, v.x + Math.cos(v.angle) * la, v.y + Math.sin(v.angle) * la)) {
        c.throttle = Math.min(c.throttle, -0.25);
        const leftClear = !solidAt(w, v.x + Math.cos(v.angle - 0.9) * la, v.y + Math.sin(v.angle - 0.9) * la);
        c.steer = leftClear ? -0.9 : 0.9;
      }
    }
    const d = stepVehicle(v, c, dt, w);
    moveVehicle(w, v, d.dx, d.dy);
    checkSpikeStrips(v, w);
    // traffic despawn at the map ends
    if (v.ai === 'traffic' && (v.x < 40 || v.x > w.cols * TILE - 40)) v.gone = true;
    // An escort that flees off the map, or wedges against a wall out of reach,
    // still counts toward "disable the escorts" — otherwise the mission
    // soft-locks at 2/3 when a runner drives off past a wrecked interceptor.
    if (v.ai === 'escort' && v.tag === 'escort' && !v.disabled && v.driverSlot == null) {
      const offMap = v.x < 24 || v.x > w.cols * TILE - 24;
      v.wallStuck = (Math.abs(v.speed) < 22 && inSolid(w, v.x, v.y, v.r)) ? (v.wallStuck ?? 0) + dt : 0;
      if (offMap || v.wallStuck > 3) countEscortGone(w, v);
    }
  }
  w.vehicles = w.vehicles.filter((v) => !v.gone);

  // vehicle-vehicle collisions
  for (let i = 0; i < w.vehicles.length; i++) {
    for (let j = i + 1; j < w.vehicles.length; j++) {
      const a = w.vehicles[i], b = w.vehicles[j];
      const dd = dist(a.x, a.y, b.x, b.y);
      if (dd >= a.r + b.r) continue;
      const nx = (b.x - a.x) / (dd || 1), ny = (b.y - a.y) / (dd || 1);
      const overlap = a.r + b.r - dd;
      a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
      b.x += nx * overlap / 2; b.y += ny * overlap / 2;
      const rel = Math.abs(a.speed - b.speed) + 40;
      const dmg = ramDamage(rel);
      if (dmg > 0) {
        w.fx.hit?.((a.x + b.x) / 2, (a.y + b.y) / 2);
        if (a.driverSlot != null || b.driverSlot != null) w.cam.shake = Math.min(1.2, w.cam.shake + 0.35);
        for (const [self, other] of [[a, b], [b, a]]) {
          if (damageVehicle(self, dmg * (self.type === 'truck' ? 0.5 : 1)) === 'disabled') onVehicleDisabled(w, self, other.driverSlot != null);
        }
        const tmp = a.speed; a.speed = a.speed * 0.4 + b.speed * 0.4; b.speed = b.speed * 0.4 + tmp * 0.4;
      }
    }
  }

  // traffic spawner
  const tdef = w.mission.traffic;
  if (tdef) {
    w.trafficTimer -= dt;
    const count = w.vehicles.filter((v) => v.ai === 'traffic').length;
    if (w.trafficTimer <= 0 && count < (tdef.max ?? 7)) {
      w.trafficTimer = tdef.rate ?? 2.5;
      const laneY = (w.rng.pick(tdef.rows)) * TILE + TILE / 2;
      const eastbound = tdef.eastRows?.includes(Math.round((laneY - TILE / 2) / TILE)) ?? true;
      const x = eastbound ? 60 : w.cols * TILE - 60;
      const nearby = w.vehicles.some((v) => Math.abs(v.y - laneY) < 30 && Math.abs(v.x - x) < 240);
      if (!nearby) {
        const car = makeVehicle('sedan', x, laneY, { ai: 'traffic', laneY, cruise: 150 + w.rng() * 90 });
        car.angle = eastbound ? 0 : Math.PI;
        car.speed = car.cruise * 0.8;
        w.vehicles.push(car);
      }
    }
  }
}

// An escort that leaves the fight (fled off-map or wedged) counts once toward
// the objective and despawns, so 3 required escorts always reach 3/3.
function countEscortGone(w, v) {
  if (!v.counted) {
    v.counted = true;
    objEvent(w, { type: 'neutralized', tag: 'escort' });
    w.fx.log?.('Escort runner forced off the road');
    saveCheckpoint(w);
  }
  v.gone = true;
}

function onVehicleDisabled(w, v, byPlayer) {
  w.effects.push({ kind: 'break', x: v.x, y: v.y, t: 0, dur: 0.5 });
  w.fx.explosion?.(v.x, v.y);
  w.cam.shake = Math.min(1.3, w.cam.shake + 0.4);
  if (v.tag) w.vehicleDownTags.add(v.tag);
  // escort missions: losing the ward is losing the mission
  if (v.tag === 'truck' && w.mission.convoyGoal === 'protect') {
    const van = w.objectives.find((o) => o.id === 'van');
    if (van) van.failed = true;
    w.fx.banner?.('THE EVIDENCE VAN IS DOWN');
  }
  if (v.tag === 'wrecker') {
    w.fx.banner?.('THE WRECKER IS STOPPED');
    saveCheckpoint(w);
  }
  if (v.ai === 'traffic') {
    if (!v.harmed) {
      v.harmed = true;
      w.stats.civiliansHurt++;
      objEvent(w, { type: 'civilianHurt' });
      w.fx.log?.('A commuter was caught in the pursuit');
    }
  } else if (v.tag === 'escort') {
    if (!v.counted) { v.counted = true; objEvent(w, { type: 'neutralized', tag: 'escort' }); }
    w.fx.log?.('Escort runner disabled');
    // the driver bails out, rattled and often ready to quit
    const e = makeEnemy('lookout', v.x + 34, v.y, w);
    e.hp = Math.round(e.maxHp * 0.6);
    w.enemies.push(alertEnemy(e));
    saveCheckpoint(w);
  } else if (v.tag === 'truck') {
    w.truckDown = true;
    w.fx.banner?.('SHIPMENT STOPPED');
    saveCheckpoint(w);
  }
  if (v.driverSlot != null) {
    // spilled onto the asphalt
    for (const p of w.players) {
      if (p.vehicleId === v.id) {
        p.vehicleId = null;
        p.hitFlash = 0.12;
        // Spill out beside the wreck, but never into a wall — a car wrecked
        // against a building used to plant the agent inside it, trapped.
        const sx = v.x + Math.cos(v.angle + Math.PI / 2) * (v.r + 24);
        const sy = v.y + Math.sin(v.angle + Math.PI / 2) * (v.r + 24);
        const open = nearestOpen(w, sx, sy);
        p.x = open.x; p.y = open.y;
      }
    }
    v.driverSlot = null;
    w.fx.log?.('Your vehicle is wrecked');
  }
}

function wander(w, e, dt, speed) {
  if (w.rng() < dt * 0.5) e.wanderA += (w.rng() - 0.5) * 2;
  moveCircle(w, e, Math.cos(e.wanderA) * speed * dt, Math.sin(e.wanderA) * speed * dt);
}

// --- civilians ---

function updateCivilian(w, c, dt) {
  c.hitFlash = Math.max(0, c.hitFlash - dt);
  if (c.state === 'DEAD' || c.state === 'HURT') return; // hurt civs cower in place
  if (w.threat > 0) {
    let fx = 0, fy = 0;
    for (const e of w.enemies) {
      if (e.state !== 'FIGHT' || e.hp <= 0) continue;
      const dd = Math.max(60, dist(c.x, c.y, e.x, e.y));
      if (dd < 500) { fx += (c.x - e.x) / dd; fy += (c.y - e.y) / dd; }
    }
    if (fx || fy) {
      const l = Math.hypot(fx, fy);
      moveCircle(w, c, (fx / l) * c.speed * 1.7 * dt, (fy / l) * c.speed * 1.7 * dt);
      return;
    }
  }
  wander(w, c, dt, c.speed * 0.4);
}

// --- bullets & damage ---

function updateBullets(w, dt) {
  for (const b of w.bullets) {
    b.life -= dt;
    const steps = Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 10);
    for (let i = 0; i < steps && b.life > 0; i++) {
      b.x += (b.vx * dt) / steps; b.y += (b.vy * dt) / steps;
      if (solidAt(w, b.x, b.y)) { b.life = 0; w.effects.push({ kind: 'spark', x: b.x, y: b.y, t: 0, dur: 0.15 }); break; }
      let consumed = false;
      for (const pr of w.props) {
        if (pr.hp > 0 && dist(b.x, b.y, pr.x, pr.y) < pr.r) {
          damageProp(w, pr, scaledDamage(b));
          b.life = 0; consumed = true;
          w.effects.push({ kind: 'debris', x: b.x, y: b.y, t: 0, dur: 0.3 });
          break;
        }
      }
      if (consumed) break;
      // vehicles soak bullets
      for (const v of w.vehicles) {
        if (v.id === b.ignoreVehicleId || v.disabled) continue;
        if (dist(b.x, b.y, v.x, v.y) < v.r) {
          if (b.fromPlayer) w.stats.shotsHit++;
          const res = damageVehicle(v, scaledDamage(b) * 0.8);
          w.effects.push({ kind: 'spark', x: b.x, y: b.y, t: 0, dur: 0.15 });
          if (res === 'disabled') onVehicleDisabled(w, v, b.fromPlayer);
          b.life = 0; consumed = true;
          break;
        }
      }
      if (consumed) break;
      const targets = b.fromPlayer ? [...w.enemies, ...w.civilians] : [...w.players.filter((pp) => pp.vehicleId == null), ...w.civilians];
      for (const t of targets) {
        if (t.hp <= 0 || t.state === 'DEAD') continue;
        if (t.kind === 'player' && (t.iframes > 0 || t.downed)) continue;
        if (t.kind === 'enemy' && t.state === 'CUFFED') continue;
        if (dist(b.x, b.y, t.x, t.y) < R + 4) {
          if (b.fromPlayer) w.stats.shotsHit++;
          hitEntity(w, t, scaledDamage(b), { lethal: b.lethal, stun: b.stun, kx: (b.vx / 900) * b.knockback, ky: (b.vy / 900) * b.knockback, fromPlayer: b.fromPlayer, incendiary: b.incendiary });
          b.life = 0;
          break;
        }
      }
    }
  }
  w.bullets = w.bullets.filter((b) => b.life > 0);

  function scaledDamage(b) {
    const def = WEAPONS[b.weaponKey];
    return damageAtDistance(def, dist(b.ox, b.oy, b.x, b.y)) * (b.dmgBase / def.damage);
  }
}

function hitEntity(w, t, dmg, { lethal, stun = 0, kx = 0, ky = 0, fromPlayer, incendiary = false }) {
  if (dmg <= 0) return;
  if (t.kind === 'player') {
    // Armour L2 damage reduction / L3 knockback resistance; regen clock resets
    const ue = upgradeEffects(w.settings?.upgrades);
    dmg *= ue.damageTakenMul;
    kx *= ue.knockbackMul; ky *= ue.knockbackMul;
    t.sinceHurt = 0;
  }
  // Riot shields absorb frontal hits; flank or get behind them. The knockback
  // vector points away from the shooter, so the shooter sits at -k.
  if (t.shield && (kx || ky) && t.state !== 'DOWNED' && !isCuffable(t.state)) {
    const dirToSource = Math.atan2(-ky, -kx);
    if (Math.abs(angleDiff(t.aimAngle ?? 0, dirToSource)) < 1.2) {
      dmg *= 0.12;
      w.effects.push({ kind: 'spark', x: t.x + Math.cos(dirToSource) * 16, y: t.y + Math.sin(dirToSource) * 16, t: 0, dur: 0.15 });
      // holding the line still rattles them
      t.moraleTimer = Math.min(t.moraleTimer ?? 1, 0.4);
    }
  }
  t.hitFlash = 0.12;
  moveCircle(w, t, kx * 0.06, ky * 0.06);
  w.effects.push({ kind: 'hit', x: t.x, y: t.y, t: 0, dur: 0.18 });
  w.fx.hit?.(t.x, t.y);

  if (t.kind === 'player') {
    if (t.iframes > 0) return;
    const ev = applyDamage(t, dmg, { lethal: false, stun });
    w.cam.shake = Math.min(1.2, w.cam.shake + 0.3 * (w.settings?.screenShake ?? 1));
    w.fx.playerHurt?.(t.slot);
    if (ev.result !== 'hit' && !t.downed) {
      t.downed = true; t.reviveProgress = 0;
      w.fx.log?.(`${t.agent.name} is DOWN`);
      w.fx.down?.(t.x, t.y);
    }
    return;
  }

  if (t.kind === 'civ') {
    const ev = applyDamage(t, dmg, { lethal });
    if (ev.result === 'killed') {
      t.state = 'DEAD';
      w.stats.civiliansKilled++;
      objEvent(w, { type: 'civilianHurt' });
      w.fx.log?.('A civilian was killed');
    } else if (t.state !== 'HURT' && (ev.result === 'downed' || t.hp < t.maxHp * 0.5)) {
      t.state = 'HURT';
      w.stats.civiliansHurt++;
      objEvent(w, { type: 'civilianHurt' });
      w.fx.log?.('A civilian was hurt');
    }
    return;
  }

  // enemy
  // Weapons L4: incendiary rounds set suspects (never civilians) on fire.
  if (incendiary && t.hp > 0) {
    const eff = upgradeEffects(w.settings?.upgrades);
    t.burnTimer = Math.max(t.burnTimer ?? 0, eff.burnDuration);
    t.burnDps = eff.burnDps;
  }
  const surrenderedBefore = isCuffable(t.state);
  const ev = applyDamage(t, dmg, { lethal, stun });
  if (surrenderedBefore && lethal && fromPlayer) {
    w.fx.log?.('You shot a surrendering suspect');
    w.stats.propertyDamage += 40; // excessive-force pressure on the grade
  }
  if (ev.result === 'killed') {
    t.state = 'DEAD';
    neutralize(w, t, 'killed');
    w.fx.down?.(t.x, t.y);
    w.fx.log?.(`${enemyLabel(t)} down (lethal)`);
  } else if (ev.result === 'downed' && t.state !== 'DOWNED') {
    t.state = 'DOWNED'; t.stateTime = 0; t.cuffProgress = 0;
    w.stats.downs++;
    w.fx.down?.(t.x, t.y);
    w.fx.log?.(`${enemyLabel(t)} incapacitated — cuff them`);
    if (!t.counted) { objEvent(w, { type: 'neutralized', tag: t.tag }); t.counted = true; }
  }
}
