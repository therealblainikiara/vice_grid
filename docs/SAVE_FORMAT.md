# Save Format

Storage: browser `localStorage`. Version-prefixed keys; migration chain in
`src/save.js` (`migrate()`); corrupted saves are preserved under a `.corrupt`
suffix and never crash the game.

## Campaign slots — `vicegrid.campaign.v1.slot{0..2}`

```json
{
  "v": 1,
  "createdAt": "2030-01-01T00:00:00.000Z",
  "agent": "rhino",
  "missionIndex": 1,
  "newGamePlus": false,
  "grades": { "m01": "A" },
  "totals": {
    "arrests": 9, "kills": 0, "evidence": 2, "evidenceTotal": 2,
    "civiliansKilled": 0, "intel": 3
  },
  "upgrades": { "weapons": 0, "armor": 0, "mobility": 0, "enforcement": 0, "intelligence": 0 },
  "upgradePoints": 2,
  "flags": { "chromeDogArrested": true }
}
```

- `missionIndex` — index into the main-mission sequence (0-based).
- `grades` — best grade per mission id.
- `flags` — narrative booleans consumed by dialogue/endings.
- A save with `v` greater than the running build is rejected (never mangled).

## Settings — `vicegrid.settings.v1`

Flat JSON merged over `DEFAULT_SETTINGS` (see `src/save.js`); unknown fields
are ignored, missing fields fall back to defaults, parse failures fall back to
defaults entirely. Key bindings live in `settings.bindings`
(`{ action: KeyCode }`, `null` = defaults).

## Mid-mission checkpoints

In-memory `structuredClone` snapshots (players, enemies, civilians, pickups,
props, objectives, stats, escalation/boss flags), captured at mission start,
each objective completion, each arrest, escalation, and boss spawn. Restored
by "Retry from checkpoint". Not persisted to disk by design — a campaign save
records mission-level progress.
