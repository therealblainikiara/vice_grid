# Art Uplift Plan — Interior Fidelity to Reference Standard

Approved direction: procedural art-kit uplift (2026-07-23). Target: indoor
levels must read like the reference office floorplan — real rooms, real
furniture, real lighting — while staying a self-contained, 60fps, top-down
real-time game. Ceiling: stylized-real. Explicitly NOT promised: literal
photoreal parity with an offline archviz render.

## Reference inventory (what the target image actually contains)

Architecture: thin painted partitions with baseboards + top trim; exterior
shell with windows; wood doors IN FRAMES (some ajar); signed doors
(MEN/WOMEN); recessed entrance vestibule with double doors + floor mat;
per-room flooring (carpet, wood, checker tile, stone).

Rooms: reception/lounge (sofas, coffee table, rug, TV), conference room
(long table, chairs, wall TV), private offices (desk, chair, bookshelf,
art), restrooms, storage (shelving + boxes), kitchen/break room (counters,
sink, fridge, vending machine, round tables + chairs), open-plan cubicle
farm (L-desks, glowing monitors, chairs, papers), copier corner, executive
office (wood floor, credenza, coat rack).

Set dressing: potted plants (many), framed wall art, bulletin boards,
whiteboards, wall clock, water cooler, fire extinguisher, floor mats.

Lighting: warm per-room ceiling pools, wall sconces, monitor + vending
glow, soft contact shadows under all furniture.

## Phase 1 — Architecture shell

1. Wall system v2 (extends the thin-partition work already shipped):
   - Baseboard strip + top trim rail on partition bars; painted-wall
     material per environment (warm off-whites for office/precinct).
   - Exterior shell faces get window insets: emissive glass band segments
     on outward-facing walls.
   - Doorway openings get REAL DOORS: frame + wood panel mesh, a few
     rotated ajar; procedural sign plates (canvas texture: MEN / WOMEN /
     EVIDENCE / room numbers) beside marked doors.
   - Entrance vestibule kit: double door + mat + wall lamps.
2. Floor zones: room-scoped floor painting in the ground bake — add wood
   plank and checker-tile painters (carpet/tile/marble exist), plus rug
   decals. Rooms declare their floor via the furnish spec (Phase 3).
3. Per-room lighting: warm ceiling pools baked into the floor texture +
   a pooled set of real PointLights (reuse the neon-light pool pattern);
   wall-sconce fixtures (small emissive quads) on room walls.
4. Contact shadows: soft blob decal under every furniture group (cheap AO).

Acceptance: an empty m14 room shot shows painted trimmed walls, a framed
door with sign, a window band, a warm light pool on distinct flooring.

## Phase 2 — Procedural furniture kit (~18 builders)

Each is a function returning a THREE.Group of primitives with shared
material palettes (wood light/dark, metal, fabric, plastic, glass):

officeDesk (top, side panels, glowing monitor, keyboard, tucked chair) ·
cubicle (3 chest-high partition panels + L-desk + monitor + chair +
papers) · executiveDesk (dark wood + credenza) · officeChair (seat, back,
post, star base) · sofa (base/back/arms/cushions) · coffeeTable · rug ·
conferenceSet (long table + 6-8 chairs + wall TV) · bookshelf (frame +
coloured book rows) · storageShelf (metal frame + cardboard boxes) ·
filingCabinet (drawer fronts + handles) · printerCopier (body, tray,
status light) · kitchenRun (base cabinets + worktop + sink + overhead
cabinets) · fridge · vendingMachine (emissive front) · breakTable (round
top + pedestal) + cafeChairs · plant (pot + foliage, 3 sizes) · wall
decor set (framed art, whiteboard, bulletin board, clock, wall TV) ·
waterCooler · fireExtinguisher · coatRack · floorMat.

Acceptance: a kit gallery test scene renders all builders; each is
recognisable at gameplay zoom; combat-area pieces stay under see-over
height (~34px) so top-down play is not obstructed.

## Phase 3 — Semantic room dressing (furnish spec)

- Missions gain `furnish: [{ rect, role }]` — roles: reception, lounge,
  conference, office, executive, cubicles, kitchen, breakroom, storage,
  restroom, copier, cells, evidence, records.
- A dresser maps each role to a furniture arrangement + floor material +
  lighting + wall decor, guaranteeing walkable aisles and >=1-tile
  doorways; placed furniture registers as solid props for collision/LOS.
- Showcases: re-dress m14 Halcyon HQ (closest match to the reference) and
  m09 precinct to reference density.

Acceptance: side-by-side screenshot of m14 vs the reference — every room
type in the reference has a recognisable counterpart; mission still
completes via the __vg harness.

## Phase 4 — Polish + rollout + performance

- Lighting pass (per-room temperature, monitor/vending glow in bloom
  budget), shadow tuning, wall-trim palettes per environment.
- Roll the kit to remaining indoor missions (m02 club, m04 warehouse, m08
  lab, m11/m12 industrial, m16 penthouse) with their own role sets.
- Performance: static furniture merged/instanced per type; 60fps verified
  on m14 with full dressing; single-file build stays under ~1.2MB.
- Playability guard: harness-run every re-dressed mission to completion.

## Order of work & checkpoints

Phase 1 -> commit -> screenshot review with the user -> Phase 2 (kit in
two batches: desks/seating, then kitchen/decor) -> commit + gallery
review -> Phase 3 showcases -> side-by-side review -> Phase 4 rollout.
Each phase is independently shippable; user reviews screenshots at every
checkpoint so taste corrections land early, not after rollout.
