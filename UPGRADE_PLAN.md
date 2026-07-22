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
- [x] Weapons L3: alt-fire — aim+fire launches a heavy slug (1.8× dmg, heavy KB)
- [x] Weapons L4: incendiary ammo — hits burn for 6 dmg/s over 2.5s
- [x] Armour L2: +10% damage reduction
- [x] Armour L3: knockback resistance
- [x] Armour L4: out-of-combat regen (1 HP/s after ~4s without damage)
- [x] Mobility L2: dodge cooldown −20%, dodge distance +15%
- [x] Mobility L3: combat slide — dodge while aiming, longer + full i-frames, can shoot through
- [x] Mobility L4: sprint burst — double-tap dodge unarmed, 2× speed 3s / 20s CD
- [x] Enforcement L1: +10% intimidate radius (cuff speed half is done)
- [x] Enforcement L2: intimidate flash — FREEZE forces on-the-spot surrenders
- [x] Enforcement L3: auto-cuff downed suspects in range
- [x] Enforcement L4: cuff flashbang — arrests stun/rattle nearby enemies
- [x] Intelligence L1: evidence compass (already gated on the intelligence upgrade)
- [x] Intelligence L2: aimed-suspect highlight (target glows when aimed at)
- [x] Intelligence L3: nerve read — SHAKEN label on breaking suspects (already present)
- [x] Intelligence L4: REDEFINED from inert "hack turrets" (no such entities) to
      Deep scan — through-wall markers over all evidence + every enemy
- [x] No sold-but-inert upgrades remain: all 20 UPGRADE_DEFS levels do what
      their shop text says, with unit tests pinning the effect gates.

## Phase B — Environment believability, pass 2

Per-mission wall/floor themes landed (checkpoint 3). Remaining:

- [x] Per-theme prop dressing: warehouse steel drums / pallet racking, port
      stacked containers + lashed crates, precinct duty desks + filing
      cabinets, office desks-with-monitors + cubicle dividers, lab server
      racks + chemical drums, club booths + speaker stacks, penthouse
      lounges + display shelving. `crate`/`shelf` map primitives keep their
      footprint; only the silhouette changes per `ENVIRONMENTS[].props`.
- [x] 2D fallback renderer (render.js): `ENV_2D` palette tints interior floor
      + wall faces per environment; neon signage / rain puddles / streetlamps
      now gated to outdoor (street/club) scenes only.
- [x] SSAO retuned for the 48px-tile world (kernelRadius 16→28, maxDistance
      0.12→0.2): contact shadows under crates/walls now read.
- [x] m11 blackout torch: raised origin (42→64), widened penumbra (0.45→0.7),
      dropped intensity (90k→52k) — reads as a beam, no white-hole blowout.
- [~] PCFSoftShadowMap: verified NOT a live warning (the earlier warning came
      from the reverted broken build). Left as PCFSoftShadowMap to keep soft
      shadows; nothing to migrate.

## Phase C — Co-op and input verification

- [~] Physical gamepad path CODE-REVIEWED (input.js: analog triggers 6/7,
      left-stick move / right-stick aim, co-op slot routing pad0/pad1,
      Start-to-join, rumble). Correct on review + detection API confirmed in
      browser. FINAL hardware sign-off (real controller drop-in / rumble)
      still needs a physical pad — cannot be done autonomously.
- [x] P2 upgrade-point spending: FIXED. Both agents share one upgrade
      loadout (addPlayer applies the same settings.upgrades to every slot),
      so the co-op point "split" was routing half of every reward into a
      p2UpgradePoints pool nothing could spend — co-op silently lost points.
      Now all earnings go to the shared pool; legacy p2 points are reclaimed
      into it when the upgrade screen opens.
- [x] Gamepad help: removed the dead placeholder wiki link (404'd) and
      expanded the inline controller-setup help (USB/BLE/XInput, auto-mapping
      for Xbox/PlayStation pads, pointer to the rebinding list).

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
