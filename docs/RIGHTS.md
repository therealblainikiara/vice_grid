# Rights & Originality Register

```
RIGHTS_MODE = "ORIGINAL_SUCCESSOR"
```

Rationale: no rights-holder source material for N.A.R.C. exists in this repository,
so LICENSED_REIMAGINING is not selectable. Every asset, name, and narrative element
in VICE GRID is original and commercially distinct.

## Originality guarantees

| Element | Original work in VICE GRID | Explicitly NOT used |
|---|---|---|
| Title | VICE GRID | "NARC", "N.A.R.C." |
| Agents | RHINO (Marta Okafor), VIPER (Dez Calloway) | Max Force, Hit Man |
| Villains | The Glowline Syndicate; Halcyon Wellness Group; "Mother Static" | Mr. Big, K.R.A.K. |
| City | Cobalt City (fictional) | original NARC locales |
| Story | Original 4-act script (docs/DESIGN.md) | original NARC script |
| Maps | Original tile layouts | original NARC levels |
| Music | Procedural WebAudio compositions written in-code | original NARC soundtrack |
| Art | Code-drawn canvas vector/neon art | original NARC sprites/logos |

Preserved: broad genre conventions only — arcade narcotics-enforcement action,
arrest-vs-lethal choice, co-op, satirical tone. Game mechanics and genre ideas
are not copyrightable; all expression here is new.

## Asset licence register

| Asset | Source | Licence |
|---|---|---|
| All code | Written for this project | Project-owned |
| All audio | Procedurally synthesised in `src/audio.js` | Project-owned |
| All art | Procedurally generated in `src/render3d.js` / `src/render.js` (geometry, textures and materials are built in code at runtime — no authored art files) | Project-owned |
| Fonts | System font stack only (Segoe UI / system-ui) | OS-provided |
| three.js 0.185.1 | npm, official registry (`node_modules/three`) | **MIT** — © three.js authors. Permissive; attribution retained in the package's LICENSE. Redistribution in the release build is permitted. |

No third-party *art or audio* assets are present: every texture, mesh and sound
is generated procedurally at runtime. three.js is a rendering library, not
content, and is the only third-party dependency. No downloads from unofficial
sources occurred.

## Asset replacement register (placeholders)

Tracked in DEVELOPMENT_STATE.md § Placeholders. Release gate: this table must be empty.
