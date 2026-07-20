# VICE GRID — Revised Upgrade Plan

Drafted 2026-07-17 after a full outstanding-work review (session 11).
Shipped baseline: 16 main missions + 8 OPs, 3D renderer with per-mission
environments, NG+/endings, co-op point split, 83/83 tests, 24/24 validation,
single-file demo. This plan lists everything found still outstanding, in
priority order.

## Phase A — Upgrade system completion (biggest gap)

`UPGRADE_DEFS` promises 20 per-level effects; the sim implements only the five
scalar ones (max HP +15/lvl, speed +6%/lvl, damage +8%/lvl, stability, cuff
speed +15%/lvl). Every named unlock below is currently description-only.
Implement in world.js (pure sim) + input/render support, one test per effect.

- [x] Weapons L2: +12% fire rate, reduced recoil (scale weapon cooldown/spread)
- [ ] Weapons L3: alt-fire mode (hold aim + fire; per-weapon secondary)
- [ ] Weapons L4: special ammo — incendiary / shock rounds (status effects)
- [x] Armour L2: +10% damage reduction
- [x] Armour L3: knockback resistance
- [x] Armour L4: out-of-combat regen (1 HP/s after ~4s without damage)
- [x] Mobility L2: dodge cooldown −20%, dodge distance +15%
- [ ] Mobility L3: combat slide (crouch + dodge chord)
- [ ] Mobility L4: sprint burst (2× speed 3s, 20s cooldown, HUD pip)
- [x] Enforcement L1: +10% intimidate radius (cuff speed half is done)
- [ ] Enforcement L2: intimidate morale flash on nearby suspects
- [x] Enforcement L3: auto-cuff downed suspects in range
- [ ] Enforcement L4: cuff flashbang stun
- [ ] Intelligence L1: gate the evidence compass behind this (today it keys
      off the intel stat, not the upgrade)
- [ ] Intelligence L2: aimed-suspect highlight
- [ ] Intelligence L3: nerve read — show morale/surrender chance on aim
- [ ] Intelligence L4: hackable turrets/cameras — requires adding turret and
      camera props to maps first (none exist in the sim yet)
- [ ] Alternatively: trim any of the above from UPGRADE_DEFS rather than ship
      a shop that sells effects that do nothing. No sold-but-inert upgrades.

## Phase B — Environment believability, pass 2

Per-mission wall/floor themes landed (checkpoint 3). Remaining:

- [ ] Per-theme prop dressing: pallet racks + forklifts (warehouse), gantry
      crane silhouettes (port), holding cells/desks/counters (precinct),
      cubicle clusters + server racks (office/lab), booths + bar (club),
      planters + furniture (penthouse)
- [ ] 2D fallback renderer (render.js) knows nothing about environments —
      port/warehouse/precinct still draw the generic look there
- [ ] SSAO is nearly invisible (~1 luminance delta): retune kernelRadius /
      min/maxDistance for the 48px-tile world scale, or drop the pass
- [ ] m11 blackout: torch spotlight blows out to a white-green hole at the
      player; tame intensity/bloom interaction
- [ ] THREE deprecation warning: PCFSoftShadowMap → migrate shadow config

## Phase C — Co-op and input verification

- [ ] Physical gamepad end-to-end test (drop-in, bindings, vibration) —
      HUD P2 box and pad path are implemented but never hardware-tested
- [ ] Verify P2 upgrade-point spending flow (p2UpgradePoints accrues; confirm
      the upgrade screen lets P2 spend them)
- [ ] Gamepad help panel: replace placeholder BLE pairing guide link

## Phase D — Content & release polish

- [ ] Story recap screen: confirm every mission has recap copy (screen shipped
      mid-session; audit `showRecap` content for all 24 entries)
- [ ] NG+ kingpin difficulty: balance pass (difficulty flips on cycle 1; no
      tuning has been play-verified)
- [ ] Republish the shareable demo artifact from the current build (the
      published artifact predates the rendering repair + environments)
- [ ] README: expand for the public GitHub repo (screenshots, controls,
      build/run instructions)

## Phase E — Infrastructure

- [ ] GitHub Actions CI: run `node --test` + `node tools/validate.js` on push
- [ ] Set git identity for this repo (commits currently carry the
      auto-detected work address)

## Definition of done per phase

Every checkbox: implemented → unit test where the sim is involved →
browser-verified via `__vg.skipToPlay`/`tick` → `node --test` and
`node tools/validate.js` green → committed and pushed to
github.com/therealblainikiara/vice_grid.
