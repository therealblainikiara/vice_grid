// cutscene.js — between-level cinematics. Pure; no DOM.
//
// A mission may declare a `cinematic` that plays before its briefing/gameplay:
//   cinematic: { src, title, lines, skippable, seconds }
//     src      -> a video file (drop .mp4/.webm in assets/cine/). kind 'video'.
//     no src   -> a styled title card built from title + lines. kind 'card'.
// resolveCinematic decides WHAT plays (or null to skip straight to the mission),
// honoring the `cinematics` setting. The DOM runner in ui.js consumes the result.

const CARD_SECONDS = 5;

export function resolveCinematic(mission, opts = {}) {
  const c = mission?.cinematic;
  if (!c) return null;
  if (opts.cinematics === false) return null;
  const kind = c.src ? 'video' : 'card';
  return {
    kind,
    src: c.src ?? null,
    title: c.title ?? mission.title ?? '',
    lines: c.lines ?? [],
    skippable: c.skippable ?? true,
    seconds: c.seconds ?? (kind === 'card' ? CARD_SECONDS : null),
  };
}
