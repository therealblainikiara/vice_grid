// input.js — keyboard / mouse / wheel / gamepad with fully rebindable controls.
//
// Every action holds an ARRAY of bindings, so W and Up-Arrow (or E and
// right-click) are the same action rather than competing schemes. Codes are
// plain strings from three families:
//   KeyW / Space / Escape / ArrowUp ...  keyboard event.code
//   Mouse0 | Mouse1 | Mouse2             mouse buttons (2 = right)
//   WheelUp | WheelDown                  wheel pulses, held ~90ms so a single
//                                        notch reads as one clean press
//   Pad0..Pad15 / PadLT / PadRT          gamepad buttons and analogue triggers
//
// settings.bindings persists as { action: [code, ...] }. Saves written before
// multi-binding stored a bare string; those are coerced, not migrated.

export const DEFAULT_BINDINGS = {
  up:       ['KeyW', 'ArrowUp'],
  down:     ['KeyS', 'ArrowDown'],
  left:     ['KeyA', 'ArrowLeft'],
  right:    ['KeyD', 'ArrowRight'],
  fire:     ['Mouse0', 'PadRT'],
  interact: ['Mouse2', 'KeyE', 'Pad0'],     // right-click cuffs / collects
  aim:      ['ShiftLeft', 'PadLT'],         // moved off RMB so interact can own it
  swap:     ['WheelUp', 'WheelDown', 'KeyQ', 'Pad4'],
  dodge:    ['Space', 'Pad1'],
  reload:   ['KeyR', 'Pad2'],
  melee:    ['KeyF', 'Pad3'],
  command:  ['KeyG', 'Pad5'],
  pause:    ['Escape', 'Pad9'],
};

export const ACTION_LABELS = {
  up: 'Move up', down: 'Move down', left: 'Move left', right: 'Move right',
  fire: 'Fire', aim: 'Aim / intimidate (hold)', interact: 'Interact — cuff / revive / collect',
  dodge: 'Dodge', reload: 'Reload', melee: 'Melee', swap: 'Swap weapon',
  command: 'Shout "FREEZE"', pause: 'Pause',
};

// Order the rebinding UI presents actions in — movement first, then combat.
export const ACTION_ORDER = ['up', 'down', 'left', 'right', 'fire', 'aim',
  'interact', 'dodge', 'melee', 'reload', 'swap', 'command', 'pause'];

const PAD_NAMES = {
  Pad0: 'A / Cross', Pad1: 'B / Circle', Pad2: 'X / Square', Pad3: 'Y / Triangle',
  Pad4: 'LB / L1', Pad5: 'RB / R1', Pad8: 'Back', Pad9: 'Start',
  PadLT: 'LT / L2', PadRT: 'RT / R2',
};

export function codeLabel(code) {
  if (!code) return '—';
  if (PAD_NAMES[code]) return PAD_NAMES[code];
  if (code.startsWith('Pad')) return 'Pad ' + code.slice(3);
  if (code === 'Mouse0') return 'Left Click';
  if (code === 'Mouse1') return 'Middle Click';
  if (code === 'Mouse2') return 'Right Click';
  if (code === 'WheelUp') return 'Scroll Up';
  if (code === 'WheelDown') return 'Scroll Down';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'ArrowUp') return '↑';
  if (code === 'ArrowDown') return '↓';
  if (code === 'ArrowLeft') return '←';
  if (code === 'ArrowRight') return '→';
  if (code === 'ShiftLeft') return 'Left Shift';
  if (code === 'ShiftRight') return 'Right Shift';
  if (code === 'ControlLeft') return 'Left Ctrl';
  if (code === 'Space') return 'Space';
  return code;
}

const DEAD = 0.22;
const WHEEL_HOLD_MS = 90;

export function makeInput(canvas, settings) {
  const keys = new Set();
  const mouse = { x: canvas.width / 2, y: canvas.height / 2, buttons: new Set() };
  let wheelDir = null, wheelUntil = 0;
  let capture = null; // rebinding: a callback awaiting the next input

  const binds = (action) => {
    const b = settings.bindings?.[action] ?? DEFAULT_BINDINGS[action] ?? [];
    return Array.isArray(b) ? b : [b]; // tolerate pre-multi-bind saves
  };

  function offerCapture(code) {
    if (!capture) return false;
    const cb = capture;
    capture = null;
    cb(code);
    return true;
  }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Escape' && capture) { capture = null; return; }
    if (offerCapture(e.code)) { e.preventDefault(); return; }
    keys.add(e.code);
    const bound = Object.values(settings.bindings ?? DEFAULT_BINDINGS).flat();
    if (bound.includes(e.code) || ['Enter', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
      if (e.code !== 'F5' && e.code !== 'F12') e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); mouse.buttons.clear(); });

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * canvas.width;
    mouse.y = ((e.clientY - r.top) / r.height) * canvas.height;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (offerCapture('Mouse' + e.button)) { e.preventDefault(); return; }
    mouse.buttons.add(e.button);
    e.preventDefault();
  });
  window.addEventListener('mouseup', (e) => mouse.buttons.delete(e.button));
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // A wheel notch is instantaneous; hold it briefly so a frame-sampled read
  // cannot miss it, and so justPressed still fires exactly once per notch.
  canvas.addEventListener('wheel', (e) => {
    const dir = e.deltaY < 0 ? 'WheelUp' : 'WheelDown';
    if (offerCapture(dir)) { e.preventDefault(); return; }
    wheelDir = dir;
    wheelUntil = performance.now() + WHEEL_HOLD_MS;
    e.preventDefault();
  }, { passive: false });

  function pad(index = 0) {
    const pads = navigator.getGamepads?.() ?? [];
    return pads[index] ?? null;
  }

  function padDown(g, code) {
    if (!g) return false;
    if (code === 'PadLT') return (g.buttons[6]?.value ?? 0) > 0.4;
    if (code === 'PadRT') return (g.buttons[7]?.value ?? 0) > 0.4;
    if (code.startsWith('Pad')) return !!g.buttons[+code.slice(3)]?.pressed;
    return false;
  }

  function isDown(code, g) {
    if (code.startsWith('Mouse')) return mouse.buttons.has(+code.slice(5));
    if (code === 'WheelUp' || code === 'WheelDown') {
      return wheelDir === code && performance.now() < wheelUntil;
    }
    if (code.startsWith('Pad')) return padDown(g, code);
    return keys.has(code);
  }

  const act = (action, g) => binds(action).some((c) => isDown(c, g));

  function axis(v) { return Math.abs(v) > DEAD ? v : 0; }

  function readKeyboard() {
    return {
      moveX: (act('right', null) ? 1 : 0) - (act('left', null) ? 1 : 0),
      moveY: (act('down', null) ? 1 : 0) - (act('up', null) ? 1 : 0),
      aimScreenX: mouse.x, aimScreenY: mouse.y, usesMouseAim: true,
      fire: act('fire', null), aim: act('aim', null), interact: act('interact', null),
      dodge: act('dodge', null), reload: act('reload', null), melee: act('melee', null),
      swap: act('swap', null), command: act('command', null), pause: act('pause', null),
    };
  }

  function readPad(g) {
    const ax = axis(g.axes[0] ?? 0), ay = axis(g.axes[1] ?? 0);
    const rx = axis(g.axes[2] ?? 0), ry = axis(g.axes[3] ?? 0);
    return {
      moveX: ax, moveY: ay, aimDirX: rx, aimDirY: ry, usesMouseAim: false,
      fire: act('fire', g), aim: act('aim', g), interact: act('interact', g),
      dodge: act('dodge', g), reload: act('reload', g), melee: act('melee', g),
      swap: act('swap', g), command: act('command', g), pause: act('pause', g),
    };
  }

  // slot 0 = keyboard+mouse, or a pad when the player opts in; slot 1 = pad.
  // With P1 on a pad, P2 takes the second pad so co-op still works.
  function readControls(slot) {
    if (slot === 0) {
      if (settings.p1Gamepad) {
        const g = pad(0);
        return g ? readPad(g) : readKeyboard();
      }
      return readKeyboard();
    }
    const g = pad(settings.p1Gamepad ? 1 : 0);
    return g ? readPad(g) : null;
  }

  function padJoinPressed() {
    const g = pad(settings.p1Gamepad ? 1 : 0);
    return !!g && !!g.buttons[9]?.pressed;
  }

  function vibrate(strength = 0.5, ms = 90) {
    const g = pad(0);
    g?.vibrationActuator?.playEffect?.('dual-rumble', {
      duration: ms, strongMagnitude: strength, weakMagnitude: strength * 0.6,
    }).catch(() => {});
  }

  // Gamepads fire no events, so rebinding has to poll them.
  function pollCapture() {
    if (!capture) return;
    const g = pad(0);
    if (!g) return;
    for (let i = 0; i < g.buttons.length; i++) {
      if (g.buttons[i]?.pressed) { offerCapture('Pad' + i); return; }
    }
    if ((g.buttons[6]?.value ?? 0) > 0.6) offerCapture('PadLT');
    else if ((g.buttons[7]?.value ?? 0) > 0.6) offerCapture('PadRT');
  }

  function snapshot() {
    const out = {};
    for (const a of ACTION_ORDER) out[a] = [...binds(a)];
    return out;
  }

  return {
    readControls, padJoinPressed, vibrate, pollCapture,
    gamepadConnected: () => !!pad(0),
    menu: {
      up: () => keys.has('ArrowUp') || keys.has('KeyW'),
      down: () => keys.has('ArrowDown') || keys.has('KeyS'),
      confirm: () => keys.has('Enter') || keys.has('Space'),
      back: () => keys.has('Escape'),
    },
    beginCapture(cb) { capture = cb; },
    cancelCapture() { capture = null; },
    get capturing() { return !!capture; },
    getBindings: snapshot,
    setBinding(action, slotIdx, code) {
      const cur = snapshot();
      // a code may only drive one action, or one press fires two things
      for (const a of ACTION_ORDER) {
        if (a !== action) cur[a] = cur[a].filter((c) => c !== code);
      }
      cur[action][slotIdx] = code;
      cur[action] = cur[action].filter(Boolean);
      settings.bindings = cur;
    },
    clearBinding(action, slotIdx) {
      const cur = snapshot();
      cur[action] = cur[action].filter((_, i) => i !== slotIdx);
      settings.bindings = cur;
    },
    resetBindings() {
      settings.bindings = JSON.parse(JSON.stringify(DEFAULT_BINDINGS));
    },
  };
}
