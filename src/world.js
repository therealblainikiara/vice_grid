// world.js — the simulation: level parsing, players, AI, bullets, missions.
// No DOM access; rendering reads this state, main.js drives update ticks.

import { clamp, dist, angleTo, TAU, makeRng } from './core.js';
import {
  WEAPONS, damageAtDistance, effectiveSpread, applyDamage,
  makeWeaponState, canFire, fire, startReload, tickWeapon,
} from './combat.js';
import {
  computeMorale, decideReaction, shouldBetray, isCuffable, tickCuff, searchSuspect,
} from './arrest.js';
import {
  createObjectives, applyEvent, primaryComplete, primaryFailed,
} from './objectives.js';
import { AGENTS, ENEMY_TYPES } from './missions.js';

export const TILE = 48;
const R = 14; // body radius

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
        case 'E': w.enemies.push(makeEnemy(pickEnemy(rng), x, y, w)); break;
        case 'C': w.civilians.push(makeCivilian(x, y)); w.stats.civiliansTotal++; break;
        case 'V': w.pickups.push({ id: id(), kind: 'evidence', x, y }); w.stats.evidenceTotal++; break;
        case 'w': w.pickups.push({ id: id(), kind: 'weapon', weaponKey: rng.chance(0.5) ? 'shotgun' : 'smg', x, y }); break;
        case 'p': w.pickups.push({ id: id(), kind: 'weapon', weaponKey: 'beanbag', x, y }); break;
        case 'm': w.pickups.push({ id: id(), kind: 'medkit', x, y }); break;
      }
    });
  });

  addPlayer(w, opts.agentKey ?? 'rhino', 0);
  if (opts.coop) addPlayer(w, opts.agentKey === 'rhino' ? 'viper' : 'rhino', 1);
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

function pickEnemy(rng) {
  return rng.pick(['lookout', 'soldier', 'soldier', 'dealer', 'dealer', 'bruiser']);
}

function makeEnemy(typeKey, x, y, w) {
  const t = ENEMY_TYPES[typeKey];
  const hp = Math.round(t.hp * (w?.difficulty.enemyHp ?? 1));
  return {
    id: id(), kind: 'enemy', type: typeKey, tag: t.score, boss: !!t.boss,
    x, y, vx: 0, vy: 0, hp, maxHp: hp, armor: t.armor ?? 0, speed: t.speed,
    color: t.color, personality: t.personality,
    ws: makeWeaponState(t.weapon), aimAngle: 0,
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
    players: w.players.map((p) => ({ slot: p.slot, agentKey: p.agentKey, x: p.x, y: p.y, hp: p.hp, weapons: p.weapons, weaponIdx: p.weaponIdx })),
    enemies: w.enemies, civilians: w.civilians, pickups: w.pickups, props: w.props,
    objectives: w.objectives, stats: w.stats,
    escalated: w.escalated, bossSpawned: w.bossSpawned,
  });
}

export function restoreCheckpoint(w) {
  if (!w.checkpoint) return false;
  const c = structuredClone(w.checkpoint);
  w.enemies = c.enemies; w.civilians = c.civilians; w.pickups = c.pickups; w.props = c.props;
  w.objectives = c.objectives; w.stats = c.stats;
  w.escalated = c.escalated; w.bossSpawned = c.bossSpawned;
  w.boss = w.enemies.find((e) => e.boss) ?? null;
  w.bullets = []; w.effects = [];
  for (const snap of c.players) {
    const p = w.players.find((pp) => pp.slot === snap.slot);
    if (!p) continue;
    Object.assign(p, { x: snap.x, y: snap.y, hp: Math.max(snap.hp, p.maxHp * 0.5), weapons: snap.weapons, weaponIdx: snap.weaponIdx, downed: false, reviveProgress: 0, cuffingId: null });
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
  for (const e of w.enemies) updateEnemy(w, e, dt);
  for (const c of w.civilians) updateCivilian(w, c, dt);
  updateBullets(w, dt);
  w.effects = w.effects.filter((f) => (f.t += dt) < f.dur);
  w.props = w.props.filter((pr) => pr.hp > 0);

  // Escalation event
  const clearObj = w.objectives.find((o) => o.id === 'clear');
  const esc = w.mission.escalation;
  if (esc && !w.escalated && clearObj && clearObj.progress >= esc.at) {
    w.escalated = true;
    for (const s of esc.spawns) w.enemies.push(alertEnemy(makeEnemy(s.type, s.x * TILE + TILE / 2, s.y * TILE + TILE / 2, w)));
    w.fx.banner?.(esc.banner); w.fx.alarm?.();
    saveCheckpoint(w);
  }

  // Boss spawn once the crew objective is done
  const bossDef = w.mission.boss;
  if (bossDef && !w.bossSpawned && clearObj?.done) {
    w.bossSpawned = true;
    const b = makeEnemy(bossDef.type, bossDef.x * TILE + TILE / 2, bossDef.y * TILE + TILE / 2, w);
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
      for (const s of def.phase2Spawns) w.enemies.push(alertEnemy(makeEnemy(s.type, s.x * TILE + TILE / 2, s.y * TILE + TILE / 2, w)));
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
  w.cam.shake = Math.max(0, w.cam.shake - dt * 3);

  // Win / lose
  if (primaryFailed(w.objectives)) endMission(w, 'failed');
  else if (primaryComplete(w.objectives)) endMission(w, 'success');
  else if (w.players.length && w.players.every((p) => p.downed)) endMission(w, 'failed');
}

function endMission(w, status) {
  if (w.status !== 'playing') return;
  w.status = status;
  w.endTimer = 0;
}

function alertEnemy(e) { e.state = 'FIGHT'; return e; }

// --- player ---

function updatePlayer(w, p, dt, c) {
  p.hitFlash = Math.max(0, p.hitFlash - dt);
  p.iframes = Math.max(0, p.iframes - dt);
  p.meleeCd = Math.max(0, p.meleeCd - dt);
  p.dodgeCd = Math.max(0, p.dodgeCd - dt);
  p.commandCd = Math.max(0, p.commandCd - dt);
  for (const ws of p.weapons) tickWeapon(ws, dt);
  if (p.downed || !c) { p.cuffingId = null; return; }

  const upgrades = w.settings?.upgrades ?? {};
  const speed = p.agent.speed * (1 + (upgrades.mobility ?? 0) * 0.06);

  // Dodge
  if (p.dodgeTimer > 0) {
    p.dodgeTimer -= dt;
    moveCircle(w, p, p.dodgeDx * p.agent.dodgeSpeed * dt, p.dodgeDy * p.agent.dodgeSpeed * dt);
  } else {
    let mx = c.moveX, my = c.moveY;
    const ml = Math.hypot(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }
    p.moving = ml > 0.01;
    const slow = c.aim && w.settings?.holdToAim ? 0.55 : 1;
    moveCircle(w, p, mx * speed * slow * dt, my * speed * slow * dt);

    if (c.dodge && p.dodgeCd <= 0 && p.moving && justPressed(p, c, 'dodge')) {
      p.dodgeTimer = p.agent.dodgeTime; p.dodgeCd = 0.9;
      p.iframes = p.agent.dodgeTime + 0.08;
      p.dodgeDx = mx / (ml || 1); p.dodgeDy = my / (ml || 1);
      w.fx.dodge?.();
      if (p.agent.dodgeStagger) { // RHINO shove staggers nearby enemies
        for (const e of w.enemies) {
          if (e.hp > 0 && dist(p.x, p.y, e.x, e.y) < 70) e.stunTimer = Math.max(e.stunTimer, 0.8);
        }
      }
    }
  }

  // Aim
  if (c.usesMouseAim) {
    const wx = c.aimScreenX + w.cam.x - w.viewW / 2;
    const wy = c.aimScreenY + w.cam.y - w.viewH / 2;
    p.aimAngle = angleTo(p.x, p.y, wx, wy);
  } else if (Math.hypot(c.aimDirX ?? 0, c.aimDirY ?? 0) > 0.01) {
    p.aimAngle = Math.atan2(c.aimDirY, c.aimDirX);
    if (w.settings?.aimAssist) p.aimAngle = assistAim(w, p, p.aimAngle);
  }
  p.aiming = !!c.aim;

  // Weapon swap
  if (c.swap && justPressed(p, c, 'swap')) {
    p.weaponIdx = (p.weaponIdx + 1) % p.weapons.length;
    w.fx.reloadSfx?.();
  }
  const ws = p.weapons[p.weaponIdx];
  const def = WEAPONS[ws.key];

  // Reload
  if (c.reload && justPressed(p, c, 'reload') && startReload(ws)) w.fx.reloadSfx?.();

  // Fire
  if (c.fire && !def.melee && canFire(ws)) {
    fire(ws);
    w.stats.shotsFired += def.pellets ?? 1;
    const spread = effectiveSpread(def, { moving: p.moving, stability: p.agent.stability + (upgrades.weapons ?? 0) * 0.03 });
    for (let i = 0; i < (def.pellets ?? 1); i++) {
      const a = p.aimAngle + (w.rng() - 0.5) * 2 * spread;
      w.bullets.push({
        x: p.x + Math.cos(a) * (R + 6), y: p.y + Math.sin(a) * (R + 6),
        vx: Math.cos(a) * def.speed, vy: Math.sin(a) * def.speed,
        weaponKey: ws.key, lethal: def.lethal, stun: def.stun ?? 0,
        dmgBase: def.damage * (1 + (upgrades.weapons ?? 0) * 0.08),
        ox: p.x, oy: p.y, fromPlayer: true, life: def.range / def.speed,
        knockback: def.knockback,
      });
    }
    w.fx.shot?.(ws.key, p.x, p.y);
    w.cam.shake = Math.min(1, w.cam.shake + 0.15 * (w.settings?.screenShake ?? 1));
    w.effects.push({ kind: 'muzzle', x: p.x + Math.cos(p.aimAngle) * (R + 10), y: p.y + Math.sin(p.aimAngle) * (R + 10), a: p.aimAngle, t: 0, dur: 0.06 });
  } else if (c.fire && def.melee && canFire(ws)) {
    fire(ws);
    meleeSwing(w, p, def);
  }

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
      if (d < 380 && hasLos(w, p.x, p.y, e.x, e.y)) e.moraleTimer = Math.min(e.moraleTimer, 0.05);
    }
  }

  // Interact: cuff > revive > pickup
  handleInteract(w, p, dt, c);

  rememberPressed(p, c);
}

function justPressed(p, c, key) { return c[key] && !p.prev[key]; }
function rememberPressed(p, c) { p.prev = { ...c }; }

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

function handleInteract(w, p, dt, c) {
  if (!c.interact) { p.cuffingId = null; p.reviveProgress = 0; return; }
  const upgrades = w.settings?.upgrades ?? {};
  const cuffSpeed = p.agent.cuffSpeed * (1 + (upgrades.enforcement ?? 0) * 0.15);

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
    if (target.cuffProgress >= 1 && target.state !== 'CUFFED') {
      target.state = 'CUFFED'; target.stateTime = 0;
      w.fx.cuff?.(target.x, target.y);
      w.fx.log?.(`${enemyLabel(target)} arrested`);
      neutralize(w, target, 'arrested');
      const found = searchSuspect(target, w.rng());
      if (found.found === 'intel') { w.stats.intel = (w.stats.intel ?? 0) + 1; w.fx.log?.('Intel recovered: evidence marked on the grid'); }
      saveCheckpoint(w);
    }
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

// --- enemy AI ---

function updateEnemy(w, e, dt) {
  e.stateTime += dt;
  e.hitFlash = Math.max(0, e.hitFlash - dt);
  e.stunTimer = Math.max(0, e.stunTimer - dt);
  tickWeapon(e.ws, dt);
  if (e.state === 'DEAD' || e.state === 'CUFFED' || e.state === 'DOWNED') return;
  if (e.stunTimer > 0) return;

  const { player, d } = nearestPlayer(w, e.x, e.y);
  if (!player) return;
  const los = d < 700 && hasLos(w, e.x, e.y, player.x, player.y);

  if (e.state === 'IDLE') {
    // aggro on sight, or on nearby gunfire — never a map-wide instant alert
    if ((los && d < 420) || (w.threat > 0 && d < 560)) {
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

  // shoot — enemies fire in a measured cadence, not at player trigger speed
  e.shotTimer -= dt;
  if (los && canFire(e.ws) && e.shotTimer <= 0) {
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
          const dmg = scaledDamage(b);
          pr.hp -= dmg; w.stats.propertyDamage += dmg;
          b.life = 0; consumed = true;
          w.effects.push({ kind: 'debris', x: b.x, y: b.y, t: 0, dur: 0.3 });
          if (pr.hp <= 0) w.effects.push({ kind: 'break', x: pr.x, y: pr.y, t: 0, dur: 0.4 });
          break;
        }
      }
      if (consumed) break;
      const targets = b.fromPlayer ? [...w.enemies, ...w.civilians] : [...w.players, ...w.civilians];
      for (const t of targets) {
        if (t.hp <= 0 || t.state === 'DEAD') continue;
        if (t.kind === 'player' && (t.iframes > 0 || t.downed)) continue;
        if (t.kind === 'enemy' && t.state === 'CUFFED') continue;
        if (dist(b.x, b.y, t.x, t.y) < R + 4) {
          if (b.fromPlayer) w.stats.shotsHit++;
          hitEntity(w, t, scaledDamage(b), { lethal: b.lethal, stun: b.stun, kx: (b.vx / 900) * b.knockback, ky: (b.vy / 900) * b.knockback, fromPlayer: b.fromPlayer });
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

function hitEntity(w, t, dmg, { lethal, stun = 0, kx = 0, ky = 0, fromPlayer }) {
  if (dmg <= 0) return;
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
