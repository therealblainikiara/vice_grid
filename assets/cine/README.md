# Between-level cinematics

Drop video clips here (`.mp4` or `.webm`, H.264/VP9) and point a mission at one:

```js
// in src/missions.js, on the mission object:
cinematic: {
  src: 'assets/cine/m14.mp4',   // played full-screen before the mission
  title: 'HALCYON HQ',          // shown if the video is missing/broken (fallback)
  skippable: true,              // default true — click / Esc / Space / Enter to skip
}
```

No `src`? The runner shows a styled **title card** built from `title` + `lines`
(see m14 for an example), so cinematics work with zero video assets and real
clips slot in later. A missing or broken video file skips straight into the
mission — the flow never stalls.

Naming convention: `<missionId>.mp4` (e.g. `m14.mp4`, `m05.mp4`).
