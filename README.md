# VICE GRID

An original 2030 arcade narcotics-enforcement action game — a spiritual
successor to late-80s arcade cop fantasies, built as a self-contained
HTML5/Canvas game in the BNS Games house style.

`RIGHTS_MODE = "ORIGINAL_SUCCESSOR"` — every name, map, line of dialogue,
sound, and pixel is original. See [docs/RIGHTS.md](docs/RIGHTS.md).

## Play

```
python -m http.server 8930
# open http://localhost:8930/
```

Any static file server works (ES modules require http://, not file://).
Chrome/Edge/Firefox current versions supported.

- **Single player**: keyboard + mouse (see [docs/CONTROLS.md](docs/CONTROLS.md))
- **Local co-op**: connect a gamepad and press **Start** to drop in as the
  partner agent at any time.

## Development

```
node --test        # run the unit test suite
```

- `src/` — ES modules. Pure logic (combat, arrest, grading, save, objectives)
  is DOM-free and unit-tested; runtime modules (world, render, ui, input,
  audio, main) wire the game together.
- `tests/` — node:test suites.
- `docs/` — design bible, rights register, controls, accessibility, save format.
- `DEVELOPMENT_STATE.md` — living build status, next task, resume commands.

Debugging: the game exposes `window.__vg` with `state`, `world`, `campaign`,
`skipToPlay(agent)`, and `tick(seconds)` (deterministic sim stepping used by
the validation tooling and in hidden tabs where rAF is suspended).
