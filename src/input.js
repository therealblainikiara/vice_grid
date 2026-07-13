// input.js — keyboard/mouse/gamepad with remappable bindings and drop-in P2.
// Player 1: keyboard + mouse. Player 2: first connected gamepad.
// Gamepads use a fixed twin-stick layout (left move, right aim, RT fire).

export const DEFAULT_BINDINGS = {
  up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
  fire: 'Mouse0', aim: 'Mouse2', interact: 'KeyE', dodge: 'Space',
  reload: 'KeyR', melee: 'KeyF', swap: 'KeyQ', command: 'KeyG',
  pause: 'Escape',
};

export const ACTION_LABELS = {
  up: 'Move up', down: 'Move down', left: 'Move left', right: 'Move right',
  fire: 'Fire', aim: 'Aim / intimidate', interact: 'Interact / cuff',
  dodge: 'Dodge', reload: 'Reload', melee: 'Melee', swap: 'Swap weapon',
  command: 'Shout "FREEZE"', pause: 'Pause',
};

const PAD = { fire: 7, aimBtn: 6, interact: 0, dodge: 1, reload: 2, melee: 3, swap: 4, command: 5, pause: 9, join: 9 };
const DEAD = 0.22;

export function makeInput(canvas, settings) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, buttons: new Set() };
  let joinRequested = false;
  let anyKeyThisFrame = null; // for rebinding UI
  const bindings = () => settings.bindings ?? DEFAULT_BINDINGS;

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    anyKeyThisFrame = e.code;
    if (Object.values(bindings()).includes(e.code) || ['Escape', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
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
  canvas.addEventListener('mousedown', (e) => { mouse.buttons.add(e.button); anyKeyThisFrame = 'Mouse' + e.button; e.preventDefault(); });
  window.addEventListener('mouseup', (e) => mouse.buttons.delete(e.button));
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  const down = (code) => code?.startsWith('Mouse') ? mouse.buttons.has(+code.slice(5)) : keys.has(code);

  function pad(index = 0) {
    const pads = navigator.getGamepads?.() ?? [];
    return pads[index] ?? null;
  }

  function axis(v) { return Math.abs(v) > DEAD ? v : 0; }

  // Controls snapshot for a player slot. Slot 0 = kb/mouse, slot 1 = gamepad 0.
  function readControls(slot) {
    if (slot === 0) {
      const b = bindings();
      return {
        moveX: (down(b.right) ? 1 : 0) - (down(b.left) ? 1 : 0),
        moveY: (down(b.down) ? 1 : 0) - (down(b.up) ? 1 : 0),
        aimScreenX: mouse.x, aimScreenY: mouse.y, usesMouseAim: true,
        fire: down(b.fire), aim: down(b.aim), interact: down(b.interact),
        dodge: down(b.dodge), reload: down(b.reload), melee: down(b.melee),
        swap: down(b.swap), command: down(b.command), pause: down(b.pause),
      };
    }
    const g = pad(0);
    if (!g) return null;
    const ax = axis(g.axes[0] ?? 0), ay = axis(g.axes[1] ?? 0);
    const rx = axis(g.axes[2] ?? 0), ry = axis(g.axes[3] ?? 0);
    return {
      moveX: ax, moveY: ay, aimDirX: rx, aimDirY: ry, usesMouseAim: false,
      fire: (g.buttons[PAD.fire]?.value ?? 0) > 0.4,
      aim: (g.buttons[PAD.aimBtn]?.value ?? 0) > 0.4,
      interact: !!g.buttons[PAD.interact]?.pressed,
      dodge: !!g.buttons[PAD.dodge]?.pressed,
      reload: !!g.buttons[PAD.reload]?.pressed,
      melee: !!g.buttons[PAD.melee]?.pressed,
      swap: !!g.buttons[PAD.swap]?.pressed,
      command: !!g.buttons[PAD.command]?.pressed,
      pause: !!g.buttons[PAD.pause]?.pressed,
    };
  }

  function padJoinPressed() {
    const g = pad(0);
    return !!g && !!g.buttons[PAD.join]?.pressed;
  }

  function vibrate(strength = 0.5, ms = 90) {
    const g = pad(0);
    g?.vibrationActuator?.playEffect?.('dual-rumble', {
      duration: ms, strongMagnitude: strength, weakMagnitude: strength * 0.6,
    }).catch(() => {});
  }

  return {
    readControls, padJoinPressed, vibrate,
    menu: {
      up: () => keys.has('ArrowUp') || keys.has('KeyW'),
      down: () => keys.has('ArrowDown') || keys.has('KeyS'),
      confirm: () => keys.has('Enter') || keys.has('Space'),
      back: () => keys.has('Escape'),
    },
    consumeAnyKey() { const k = anyKeyThisFrame; anyKeyThisFrame = null; return k; },
    rebind(action, code) {
      const b = { ...(settings.bindings ?? DEFAULT_BINDINGS), [action]: code };
      settings.bindings = b;
    },
    get joinRequested() { return joinRequested; },
  };
}
