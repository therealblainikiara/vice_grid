# VICE GRID — Development State

Updated: 2026-07-14 (session 1)

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

## Placeholders (asset replacement register)
- None. All art/audio is procedural and final-style; later missions may add
  placeholder maps — track them here.

## Exact next task
Session 2: verify full M01 E2E in browser (script ready in transcript), commit
checkpoint, then build m02 Club Neon Raid (interior map, hostage rooms) and the
upgrade/respec screen between missions.

## Commands required to resume
```
cd C:\Users\PaulRyan\Documents\BNSGames\vice-grid
node --test                 # 44 tests must pass
python -m http.server 8930  # then open http://localhost:8930/  (or /vice-grid/ from repo root)
# in the browser console: __vg.skipToPlay('rhino'); __vg.tick(1)  — headless sim stepping
git log --oneline           # checkpoint history
```
