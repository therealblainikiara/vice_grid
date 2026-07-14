# VICE GRID — Development State

Updated: 2026-07-14 (session 3, checkpoint 4)

## Session-3: m02 Club Neon Raid + upgrade screen (browser-verified)
- MISSIONS.m02: nightclub interior (dance floor 'd' tiles, bar, VIP rooms,
  back office, street entrance), 9-strong crew incl. new enemy types
  `bouncer` (melee baton, hard) and `vipguard` (smg, sly); escalation
  "BOUNCERS OFF THE CHAIN"; boss MIDNIGHT (smg, 2 phases, surrenders at 20%).
  E2E: won with 13 arrests, MIDNIGHT arrested, grade B; crowd-safe optional
  survivable (1-strike allowance).
- Upgrade/respec screen between missions: src/upgrades.js (pure, 4 unit
  tests), ui.showUpgrade + screen-upgrade section, flow results → upgrade →
  briefing; buys/refunds/respec persist to slot 0. Verified programmatically
  AND by live human play (user purchased Weapons ×2 mid-session).
- tests/missions.test.js: campaign validation (map rectangular + sealed
  borders, spawn/objective consistency, boss + escalation spawn sanity) runs
  against every `implemented` mission. Suite now 51 tests, all green.
- AI fix: enemies hold fire when a civilian is in the firing lane ("avoid
  obvious friendly fire") — 60 s idle soak in the packed club: 0 civilians
  harmed (was 2 in under a minute).
- Debug API: __vg.tick(seconds, doDraw=false) for fast headless stepping;
  __vg.skipToPlay(agent, missionId).

## Session-2: graphics overhaul (verified in browser)
- render.js rewritten as a neon-noir 2.5D renderer: per-mission baked
  environment (asphalt/sidewalk/interior materials, curbs, lane markings,
  manholes, cracks, grime, neon-reflecting puddles), pseudo-3D walls (front
  faces, bevels, AO shadows, window slits), baked neon signage with flicker +
  streetlamp pools, dynamic lighting layer (ambient dark + light-pool cutouts
  for players/signs/pickups/boss/muzzle flashes) + additive neon washes,
  articulated vector humanoids (walk-cycle legs, shoulders, heads: visor/hood/
  cap/chrome, held weapons, rim light, distinct silhouettes per type, lying
  DOWN pose, hands-up pose, pill status tags), additive bullet tracers,
  particle-based hit/debris/break effects, player-hurt vignette.
- Camera: ZOOM = 1.45 with map-bounds clamping; mouse aim maps through the
  zoom (verified: 6/7 hits on a stationary target).
- Gameplay fix found while testing: players now auto-reload when firing on an
  empty mag.
- All visuals verified live by screenshot; 44 unit tests still green.

## Session-1 verification results (browser, no god mode unless noted)
- Full M01 arc E2E (god-mode harness): 13 arrests / 0 kills, escalation fired,
  CHROME DOG phase 2 + surrender window + boss ARREST, grade B, campaign saved,
  save survives reload ("Slot 1 — RHINO — mission 2 of 24", Continue enabled).
- Fair-fight balance (no god mode): scripted player survived a 65 s firefight
  at 95/150 hp, 160 shots @33% acc, cleared all 8 crew, escalation + boss spawn.
- Standing-still survivability at spawn: ~10 s to 86/150 hp (props block enemy
  line of sight; enemy cadence floor 1.1 s; enemy rounds hit players at 55%;
  1.2 s spawn protection).

## Current working features
- Pure logic layer, fully unit-tested (44 tests green): combat/weapons, arrest
  morale + personalities + fake surrender, S–D grading + 4-ending selection,
  versioned save store with corruption recovery, objective progression.
- Runtime: fixed-60Hz sim loop, tile levels, player controller (move/aim/fire/
  reload/swap/dodge/melee/FREEZE command/interact), enemy AI (idle/fight/flee/
  surrender/fake-surrender/downed/cuffed/dead), civilians (wander/flee/hurt),
  destructible props, pickups (weapon/medkit/evidence), checkpoints + restore,
  escalation events, boss with 2 phases + surrender-arrest window.
- Co-op scaffolding: slot-1 gamepad controls, drop-in via Start, revive system.
- UI: title, main menu, agent select, briefing, HUD (hp/ammo/objectives/score/
  log/banner/subtitles), pause, results with grade + stats, settings +
  accessibility panel (persisted), credits. Arrow-key focus nav on menus.
- Audio: procedural WebAudio adaptive music (menu/calm/combat) + positional SFX.
- Save: campaign slot 0 auto-saved on mission win; settings persisted.
- M01 "Store Siege" fully playable: briefing → combat → escalation →
  CHROME DOG boss → results → campaign advance.
- Debug/validation API: `window.__vg` (state, world, campaign, skipToPlay, tick).

## Completed missions
- m01 Store Siege (Act 1) — implemented and browser-verified.

## Remaining missions
- m02–m16 mains, op1–op8 (defined in CAMPAIGN skeleton, `implemented: false`).
- Vehicles system (Phase 4), upgrade/respec screen, evidence board, NG+,
  endings cinematics, mission select/replay, campaign validation tool
  (tools/validate.js), input rebinding UI (data layer exists), release bundler.

## Known defects
- Browser-pane verification requires `__vg.tick()` because rAF suspends in
  hidden tabs (not a defect in normal play; documented behaviour).
- HUD P2 box only appears after drop-in; untested with a physical gamepad.

## Hard-won environment notes
- ALWAYS serve via `python tools/serve.py 8930` (Cache-Control: no-store).
  Plain `python -m http.server` lets Chrome heuristically cache ES modules —
  edits silently do not run and debugging chases ghosts.

## Placeholders (asset replacement register)
- None. All art/audio is procedural and final-style; later missions may add
  placeholder maps — track them here.

## Exact next task
Session 4: m03 Highway Glow Run — first vehicle mission (Phase 4 pull-forward:
patrol car driving model, pursuit AI, traffic, passenger shooting), then m04
Warehouse Intercept to close Act 1. Backlog: mystery of 1 stray `kill` in the
m02 melee-only harness run (possibly flee-escape accounting) — check
neutralize/flee bookkeeping before building m03.

## Commands required to resume
```
cd C:\Users\PaulRyan\Documents\BNSGames\vice-grid
node --test                   # 44 tests must pass
python tools/serve.py 8930    # no-cache dev server; open http://localhost:8930/
# in the browser console: __vg.skipToPlay('rhino'); __vg.tick(1)  — headless sim stepping
git log --oneline             # checkpoint history
```
