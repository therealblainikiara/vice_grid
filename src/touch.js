// touch.js — landscape twin-stick controls for phones and tablets.

export function normalizedStick(clientX, clientY, rect, deadZone = 0.12) {
  const radius = Math.max(1, Math.min(rect.width, rect.height) / 2);
  let x = (clientX - (rect.left + rect.width / 2)) / radius;
  let y = (clientY - (rect.top + rect.height / 2)) / radius;
  const length = Math.hypot(x, y);
  if (length > 1) { x /= length; y /= length; }
  if (length < deadZone) return { x: 0, y: 0, strength: 0 };
  return { x, y, strength: Math.min(1, length) };
}

export function makeTouchControls(root, settings) {
  const coarsePointer = matchMedia?.('(pointer: coarse)')?.matches ?? false;
  const touchDevice = (navigator.maxTouchPoints ?? 0) > 0 || coarsePointer;
  const sticks = {
    move: { x: 0, y: 0, strength: 0, pointerId: null },
    aim: { x: 0, y: 0, strength: 0, pointerId: null },
  };
  const buttons = { interact: false, dodge: false, swap: false, melee: false, command: false, pause: false };

  const enabled = () => settings.touchControls === 'on' ||
    (settings.touchControls !== 'off' && touchDevice);

  function resetStick(name) {
    Object.assign(sticks[name], { x: 0, y: 0, strength: 0, pointerId: null });
    const knob = root?.querySelector(`[data-stick="${name}"] .touch-knob`);
    if (knob) knob.style.transform = 'translate(0px, 0px)';
  }

  function bindStick(name) {
    const zone = root?.querySelector(`[data-stick="${name}"]`);
    const knob = zone?.querySelector('.touch-knob');
    if (!zone || !knob) return;

    const update = (event) => {
      if (sticks[name].pointerId !== event.pointerId) return;
      const rect = zone.getBoundingClientRect();
      const value = normalizedStick(event.clientX, event.clientY, rect);
      Object.assign(sticks[name], value);
      const travel = Math.min(rect.width, rect.height) * 0.26;
      knob.style.transform = `translate(${value.x * travel}px, ${value.y * travel}px)`;
      event.preventDefault();
    };
    zone.addEventListener('pointerdown', (event) => {
      if (!enabled() || sticks[name].pointerId != null) return;
      sticks[name].pointerId = event.pointerId;
      zone.setPointerCapture?.(event.pointerId);
      update(event);
    });
    zone.addEventListener('pointermove', update);
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      zone.addEventListener(type, (event) => {
        if (sticks[name].pointerId === event.pointerId) resetStick(name);
      });
    }
  }

  function bindButton(action) {
    const button = root?.querySelector(`[data-touch-action="${action}"]`);
    if (!button) return;
    const release = (event) => {
      buttons[action] = false;
      button.classList.remove('pressed');
      event?.preventDefault();
    };
    button.addEventListener('pointerdown', (event) => {
      if (!enabled()) return;
      buttons[action] = true;
      button.classList.add('pressed');
      button.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, release);
  }

  bindStick('move');
  bindStick('aim');
  Object.keys(buttons).forEach(bindButton);

  function syncVisibility() {
    const active = enabled();
    document.body.classList.toggle('touch-enabled', active);
    if (!active) {
      resetStick('move'); resetStick('aim');
      for (const action of Object.keys(buttons)) buttons[action] = false;
    }
    return active;
  }

  function read() {
    if (!syncVisibility()) return null;
    const firing = sticks.aim.strength > 0.18;
    return {
      moveX: sticks.move.x, moveY: sticks.move.y,
      aimDirX: sticks.aim.x, aimDirY: sticks.aim.y, usesMouseAim: false,
      fire: firing, aim: firing, interact: buttons.interact,
      dodge: buttons.dodge, swap: buttons.swap, melee: buttons.melee,
      reload: false, command: buttons.command, pause: buttons.pause,
    };
  }

  syncVisibility();
  return {
    read, syncVisibility,
    blocked: () => enabled() && matchMedia?.('(orientation: portrait)')?.matches,
    get enabled() { return enabled(); },
  };
}
