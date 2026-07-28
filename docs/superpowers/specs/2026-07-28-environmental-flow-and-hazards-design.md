# VICE GRID — Environmental Flow & Hazards (A+B)

Design spec. Approved 2026-07-28. Cinematics (C) is a separate later spec.

## Problem

Every indoor level feels the same. Root causes, confirmed in code:

- `buildMap()` (`missions.js:366`) seals all four edges with `#` — a dock is boxed
  like a building.
- Player spawn is hard-coded bottom-left in ~15 of ~19 missions
  (`set(2,17,'P')`, `set(3,16,'P')`, …). Same corner every time.
- `environment` is a **visual skin only** (`render3d.js` ENVIRONMENTS): wall/floor
  materials + furniture. It does nothing to layout, entrances, or flow. New
  furniture on an identical floorplan still feels identical.
- Hazards are limited to exploding `v` vats. No breakable glass, no fall-out, no
  per-environment traps.

`solidAt()` (`world.js:198`) already treats off-map as solid, so removing perimeter
walls is safe — nothing can walk off the map.

## Decisions (locked)

- **Scope:** Level Flow (A) + Hazards (B) as one design. Cinematics separate.
- **Variation:** strong per-environment signature, varied content (archetype
  templates, hand-tunable — not a procedural generator).
- **Content placement:** semantic zones (extend the `furnish` model). Missions
  place content by named zone, not raw `x,y`.
- **Hazards:** full set + fall-out zones.
- **Fall-out scoring:** a fall death counts as a **kill** against grade;
  cuffed/surrendered suspects are **shielded** (mirrors the vat-blast shield at
  `world.js:1073`). The player is vulnerable to falls.

## 1 · Layout archetype system — new `src/layout.js` (mirrors `furnish.js`)

Pure module, no DOM/THREE. A mission declares intent:

```js
environment: 'office',
layout: { archetype: 'office', size: [34, 22], entrance: 'reception-s', variant: 'tower' }
```

`buildLayout(mission)` returns `{ map, zones, spawn, edges }`:
- `map` — string rows (same shape `buildMap` returns today).
- `zones` — `{ reception:[{tx,ty,tw,th}], corridor:[...], openPlan:[...], exec:[...], … }`.
- `spawn` — `{x,y}` derived from the archetype entrance.
- `edges` — `{ n,e,s,w }` each an edge type (see §2).

Both sim and renderer consume the same output so they cannot drift (the `furnish`
discipline).

Archetype signatures:
- **office** — reception/lift lobby → corridor spine → open-plan cubicles → exec suite (deep corner)
- **warehouse/industrial** — roller door OR side personnel door → racking aisles → back office / loading dock
- **port/dock** — landward gate; **open water edge seaward** → container-stack cover lanes → quay apron → manifest office
- **precinct** — sally port → bullpen → holding → command
- **lab** — airlock → lab bays → reactor/vat hall
- **penthouse/high-rise** — lift/roof breach → glass-walled floors
- **street/club** — passthrough (already varied outdoors)

Missions may still author raw map segments for bespoke detail; the archetype
provides the shell, zones, entrance, and edges.

## 2 · Edge types — replace the always-`#` border

Per-side edge type on `edges`: `wall` (default) · `water` (dock seaward) ·
`void` (rooftop/high-rise cliff) · `fence` (yards) · `plaza` (open street).

Collision unchanged (off-map already solid). `water`/`void` edges register a
**fall-out kill band** on the interior tiles adjacent to them (see §4).

## 3 · Semantic content placement — resolver

Extend the mission schema so content is authored by zone; a deterministic
seeded resolver (same RNG discipline as `furnish`) picks free walkable tiles
inside the named zone at build time:

```js
boss: { type:'architect', zone:'exec' },
escalation: { spawns:[{ type:'bruiser', zone:'reception' }] },
enemies: [{ pool, zone:'openPlan', count:6 }],
```

Raw `x,y` remains accepted (back-compat for street/convoy missions). Player
spawn derives from the archetype entrance — no more universal bottom-left.

## 4 · Hazard system — extend the prop model (`world.js`)

- `b` **explosive barrel/drum** — reuses the vat fuse + chain-ignition mechanic
  (`world.js:1034+`), env-flavored skin.
- `g` **breakable glass** — low-hp solid; shot out → passable + opens sightlines;
  if adjacent to a `void`/`water` edge it arms the **fall-out band**.
- **Fall-out band** — an entity knocked in (explosion knockback, melee shove,
  walking off broken glass) falls and dies. Fall death = **kill** for grading;
  **cuffed/surrendered shielded**; player vulnerable.
- **Signature hazard per environment** (`ENVIRONMENTS[env].hazard`): dock =
  crane load-drop · lab = steam/chemical vent · industrial = live wires ·
  office/high-rise = window fall-out · warehouse = barrels + toppling racking.

## 5 · Renderer parity — both renderers (sessions-8 lesson)

Every new element ships in BOTH renderers. `render3d.js`: glass panes + shatter,
water/void edges, barrels, crane, steam. `render.js` 2D fallback: same elements
via the existing `ENV_2D` palette (glass = light-blue segments that shatter to
gaps, water/void tinted, barrels as drums). Parity is a first-class checklist
item; nothing ships 3D-only.

## 6 · Testing & validation

- `tools/validate.js`: replace the sealed-border rule (`validate.js:41-48`) with
  **edge-type-aware** validation — each side matches its declared edge type;
  walls where declared. Verify every `zone` reference resolves to enough free
  tiles. Keep the boss/escalation/phase2-in-wall checks (now zone-resolved).
- Unit tests: archetype walls-where-declared / open-where-open; zone resolver is
  deterministic and never lands in geometry; barrel chain cascade; glass-break
  opens passage; fall-out kills a live enemy, spares a cuffed one, and counts
  against grade.
- Browser-verify each converted mission via `__vg.skipToPlay`/`tick`.

## 7 · Rollout (each stays green before the next)

1. `layout.js` + edge types + zone resolver + validator changes → prove on one
   office (m14) end-to-end (tests + validate + browser + parity).
2. Hazards + fall-out on that same high-rise/office.
3. Convert remaining indoor archetypes: warehouse m04 · port m05 · precinct m09 ·
   lab m08 · industrial m11–m13 · penthouse m16 · ops.
4. Street/club/convoy — light touch (edge types only where useful).

## Non-goals

- Procedural per-playthrough layouts (rejected — strong signature chosen).
- Cinematics / between-level video (separate spec C).
- Reworking outdoor street/highway/convoy flow beyond edge types.
