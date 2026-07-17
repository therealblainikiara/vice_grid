// audio.js — fully procedural WebAudio: adaptive music + positional SFX.
// No samples, no licensed material; every sound is synthesised here.

export function makeAudio(settings) {
  let ctx = null;
  let musicGain, sfxGain;
  let musicTimer = null;
  let mode = 'off';           // 'menu' | 'calm' | 'combat' | 'off'
  let step = 0;
  let listener = { x: 0, y: 0 };

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      musicGain = ctx.createGain(); musicGain.connect(ctx.destination);
      sfxGain = ctx.createGain(); sfxGain.connect(ctx.destination);
      applyVolumes();
      return true;
    } catch { return false; }
  }

  function applyVolumes() {
    if (!ctx) return;
    musicGain.gain.value = settings.musicVol * 0.5;
    sfxGain.gain.value = settings.sfxVol;
  }

  function unlock() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
  }

  // --- synth primitives ---
  function osc(type, freq, t0, dur, gain, dest, slideTo) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function noise(t0, dur, gain, dest, hp = 800) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t0); src.stop(t0 + dur);
  }

  // Position SFX relative to the camera listener; simple pan + distance gain.
  function spatial(x, y) {
    if (x == null) return { dest: sfxGain, ok: true };
    const dx = x - listener.x, dy = y - listener.y;
    const d = Math.hypot(dx, dy);
    if (d > 1400) return { ok: false };
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, dx / 700));
    const g = ctx.createGain();
    g.gain.value = Math.max(0.08, 1 - d / 1400);
    p.connect(g); g.connect(sfxGain);
    return { dest: p, ok: true };
  }

  // --- music sequencer: two moods on a shared 8-step clock ---
  const BASS = { menu: [55, 55, 65.4, 49], calm: [55, 0, 55, 0, 65.4, 0, 49, 0], combat: [110, 110, 130.8, 110, 98, 110, 87.3, 130.8] };

  function tickMusic() {
    if (!ctx || mode === 'off') return;
    const t = ctx.currentTime + 0.02;
    const combat = mode === 'combat';
    const bpm = combat ? 148 : 96;
    const stepDur = 60 / bpm / 2;
    const seq = BASS[mode] ?? BASS.calm;
    const b = seq[step % seq.length];
    if (b) osc('sawtooth', b, t, stepDur * 0.9, combat ? 0.30 : 0.16, musicGain);
    if (combat) {
      if (step % 2 === 0) { osc('sine', 150, t, 0.12, 0.9, musicGain, 40); } // kick
      noise(t, 0.03, step % 4 === 2 ? 0.35 : 0.12, musicGain, 6000);          // hats
      if (step % 8 === 4) noise(t, 0.14, 0.4, musicGain, 1500);               // snare
    } else {
      if (step % 8 === 0) osc('triangle', 220, t, stepDur * 4, 0.05, musicGain);
      if (step % 8 === 4) osc('triangle', 174.6, t, stepDur * 4, 0.05, musicGain);
    }
    step++;
    musicTimer = setTimeout(tickMusic, stepDur * 1000);
  }

  return {
    unlock, applyVolumes,
    setListener(x, y) { listener.x = x; listener.y = y; },
    setMusic(next) {
      if (next === mode) return;
      mode = next;
      if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
      if (ctx && next !== 'off') tickMusic();
    },
    shot(weaponKey, x, y) {
      if (!ctx) return;
      const s = spatial(x, y); if (!s.ok) return;
      const t = ctx.currentTime;
      switch (weaponKey) {
        case 'shotgun': noise(t, 0.22, 0.9, s.dest, 300); osc('square', 90, t, 0.18, 0.5, s.dest, 35); break;
        case 'smg': noise(t, 0.06, 0.5, s.dest, 1200); osc('square', 220, t, 0.05, 0.3, s.dest, 90); break;
        case 'rifle': noise(t, 0.3, 0.7, s.dest, 500); osc('square', 140, t, 0.24, 0.45, s.dest, 40); break;
        case 'beanbag': noise(t, 0.12, 0.5, s.dest, 250); break;
        case 'taser': osc('square', 2200, t, 0.25, 0.25, s.dest, 900); break;
        case 'stormcaster': osc('sawtooth', 880, t, 0.16, 0.5, s.dest, 110); noise(t, 0.1, 0.5, s.dest, 900); break;
        default: noise(t, 0.09, 0.6, s.dest, 900); osc('square', 180, t, 0.07, 0.35, s.dest, 60);
      }
    },
    hit(x, y) { if (!ctx) return; const s = spatial(x, y); if (s.ok) { osc('square', 320, ctx.currentTime, 0.06, 0.3, s.dest, 120); } },
    down(x, y) { if (!ctx) return; const s = spatial(x, y); if (s.ok) { osc('sawtooth', 220, ctx.currentTime, 0.4, 0.4, s.dest, 40); } },
    cuff(x, y) { if (!ctx) return; const s = spatial(x, y); if (s.ok) { const t = ctx.currentTime; osc('square', 1400, t, 0.03, 0.3, s.dest); osc('square', 1900, t + 0.07, 0.04, 0.3, s.dest); } },
    pickup() { if (!ctx) return; const t = ctx.currentTime; osc('sine', 660, t, 0.08, 0.3, sfxGain); osc('sine', 990, t + 0.08, 0.1, 0.3, sfxGain); },
    evidence() { if (!ctx) return; const t = ctx.currentTime; [523, 659, 784].forEach((f, i) => osc('sine', f, t + i * 0.07, 0.12, 0.3, sfxGain)); },
    surrender(x, y) { if (!ctx) return; const s = spatial(x, y); if (s.ok) { osc('sine', 500, ctx.currentTime, 0.25, 0.25, s.dest, 350); } },
    alarm() { if (!ctx) return; const t = ctx.currentTime; for (let i = 0; i < 4; i++) osc('square', i % 2 ? 700 : 950, t + i * 0.16, 0.14, 0.22, sfxGain); },
    uiMove() { if (!ctx) return; osc('sine', 440, ctx.currentTime, 0.04, 0.15, sfxGain); },
    uiConfirm() { if (!ctx) return; const t = ctx.currentTime; osc('sine', 660, t, 0.06, 0.2, sfxGain); osc('sine', 880, t + 0.06, 0.08, 0.2, sfxGain); },
    reload() { if (!ctx) return; const t = ctx.currentTime; osc('square', 900, t, 0.03, 0.2, sfxGain); osc('square', 700, t + 0.12, 0.03, 0.2, sfxGain); },
    dodgeWoosh() { if (!ctx) return; noise(ctx.currentTime, 0.12, 0.2, sfxGain, 400); },
    tireBlowout(x, y) {
      if (!ctx) return;
      const s = spatial(x, y); if (!s.ok) return;
      const t = ctx.currentTime;
      noise(t, 0.15, 0.5, s.dest, 800); // hiss
      osc('square', 120, t, 0.08, 0.6, s.dest, 40); // pop
      osc('sine', 80, t + 0.02, 0.12, 0.3, s.dest, 20); // low thump
    },
    explosion(x, y) { if (!ctx) return; const s = spatial(x, y); if (s.ok) { noise(ctx.currentTime, 0.6, 1.0, s.dest, 100); osc('sine', 90, ctx.currentTime, 0.5, 0.8, s.dest, 30); } },
  };
}
