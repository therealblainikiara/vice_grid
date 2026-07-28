// ui.js — DOM screens, HUD, banners, subtitles. All ids live in index.html.

import { WEAPONS } from './combat.js';
import { SCORE } from './grading.js';
import { summary } from './objectives.js';
import { UPGRADE_DEFS } from './upgrades.js';
import { ACTION_ORDER, ACTION_LABELS, codeLabel } from './input.js';
import { CAMPAIGN, MISSIONS } from './missions.js';
import { ACTS, arrestedBosses, campaignMetrics } from './story.js';

const $ = (id) => document.getElementById(id);

export function makeUI(settings, audio) {
  const screens = ['title', 'menu', 'agent', 'briefing', 'pause', 'results', 'settings', 'credits', 'upgrade', 'missions', 'controls', 'ending', 'recap'];
  let bannerTimer = null, subtitleTimer = null;

  function show(name) {
    for (const s of screens) $('screen-' + s)?.classList.toggle('active', s === name);
    $('hud').classList.toggle('active', name === null || name === 'pause');
    document.body.classList.toggle('gameplay-active', name === null);
    if (name) focusFirst($('screen-' + name));
  }

  function focusFirst(el) {
    el?.querySelector('button, input, select')?.focus();
  }

  // controller/keyboard menu nav: arrows move focus between controls
  document.addEventListener('keydown', (e) => {
    const active = document.querySelector('.screen.active');
    if (!active) return;
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [...active.querySelectorAll('button, input, select')].filter((b) => !b.disabled);
    if (!items.length) return;
    const i = items.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown' ? items[(i + 1) % items.length] : items[(i - 1 + items.length) % items.length];
    next.focus();
    audio.uiMove();
    e.preventDefault();
  });

  function banner(text) {
    const el = $('banner');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function subtitle(speaker, text) {
    if (!settings.subtitles) return;
    const el = $('subtitle');
    el.style.fontSize = `${15 * (settings.subtitleSize ?? 1)}px`;
    el.innerHTML = settings.speakerLabels
      ? `<b>${escapeHtml(speaker)}:</b> ${escapeHtml(stripSpeaker(speaker, text))}`
      : escapeHtml(stripSpeaker(speaker, text));
    el.classList.add('show');
    clearTimeout(subtitleTimer);
    subtitleTimer = setTimeout(() => el.classList.remove('show'), 3400);
  }

  function stripSpeaker(speaker, text) {
    return text.startsWith(speaker + ':') ? text.slice(speaker.length + 1).trim().replace(/^"|"$/g, '') : text;
  }

  const logLines = [];
  function log(text) {
    logLines.unshift(text);
    if (logLines.length > 4) logLines.pop();
    $('log').innerHTML = logLines.map((l) => `<div>${escapeHtml(l)}</div>`).join('');
  }

  function clearLog() { logLines.length = 0; $('log').innerHTML = ''; }

  let hudTick = 0;
  function updateHud(world, force = false) {
    if (++hudTick % 6 !== 0 && !force) return; // 10 Hz DOM updates
    for (const slot of [0, 1]) {
      const p = world.players.find((q) => q.slot === slot);
      const box = $('p' + (slot + 1) + 'box');
      box.style.display = p ? '' : 'none';
      if (!p) continue;
      $('p' + (slot + 1) + 'name').textContent = p.agent.name + (p.downed ? ' — DOWN' : '');
      $('p' + (slot + 1) + 'hp').style.width = `${Math.max(0, (p.hp / p.maxHp) * 100)}%`;
      const ws = p.weapons[p.weaponIdx];
      const def = WEAPONS[ws.key];
      let line = ws.reloading > 0 ? 'RELOADING' : def.melee ? def.name : `${def.name} ${ws.ammo}/${def.mag}`;
      if (p.vehicleId != null) {
        const v = world.vehicles?.find((x) => x.id === p.vehicleId);
        if (v) line = `VEHICLE ${Math.max(0, Math.round((v.hp / v.maxHp) * 100))}% · ${line}`;
      }
      $('p' + (slot + 1) + 'ammo').textContent = line;
    }
    $('score').textContent = String(liveScore(world.stats));
    $('objectives').innerHTML = summary(world.objectives).map((o) => {
      const mark = o.failed ? '✗' : o.done ? '✓' : '·';
      const cls = o.failed ? 'obj-fail' : o.done ? 'obj-done' : '';
      const count = o.type === 'protect' ? '' : o.count > 1 ? ` (${Math.min(o.progress, o.count)}/${o.count})` : '';
      return `<li class="${cls} ${o.primary ? 'obj-primary' : ''}">${mark} ${escapeHtml(o.label)}${count}</li>`;
    }).join('');
  }

  function liveScore(s) {
    return Math.max(0, Math.round(
      s.arrests * SCORE.arrest + s.kills * SCORE.kill + s.evidenceFound * SCORE.evidence +
      (s.intel ?? 0) * SCORE.intel + s.civiliansHurt * SCORE.civilianHurt +
      s.civiliansKilled * SCORE.civilianKilled + s.propertyDamage * SCORE.propertyDamage +
      s.optionalDone * SCORE.optional + (s.bossArrested ? SCORE.bossArrested : 0)
    ));
  }

  function showBriefing(mission, agentName) {
    $('briefing-title').textContent = mission.title;
    $('briefing-body').innerHTML = mission.briefing.lines
      .map((l) => `<p><b>${mission.briefing.speaker}:</b> ${escapeHtml(l)}</p>`).join('');
    $('briefing-agent').textContent = `Deploying: ${agentName}`;
    show('briefing');
  }

  function showRecap(campaign, mission, agentName) {
    const mains = CAMPAIGN.filter((m) => m.type === 'main');
    const idx = mains.findIndex((m) => m.id === mission.id);
    const completed = idx > 0 ? mains.slice(0, idx) : [];
    const isNg = campaign.newGamePlus;
    const cycle = campaign.ngPlusCycle || 0;
    const entry = CAMPAIGN.find((m) => m.id === mission.id);
    const act = ACTS[entry?.act];

    let html = '';
    if (completed.length === 0) {
      html = `<p><b>DISPATCH:</b> Welcome to Cobalt City, ${agentName}. The GLOW epidemic has the city in a chokehold. Halcyon Wellness pumps it in; Civic Shield looks the other way. Two badges. One shot. Let's see what you're made of.</p>`;
    } else {
      const last = completed[completed.length - 1];
      const lastMission = MISSIONS[last.id];
      const grade = campaign.grades[last.id] || '—';
      html = `<p><b>DISPATCH:</b> Last time: <b>${lastMission.title}</b>. Grade <b>${grade}</b>. ${lastMission.debriefWin.lines[0]}</p>`;
      if (completed.length > 1) {
        html += `<p>Since the beginning: <b>${completed.length} operations</b> completed. `;
        const totalArrests = campaign.totals.arrests;
        const totalKills = campaign.totals.kills;
        const totalEv = campaign.totals.evidence;
        html += `${totalArrests} arrests. ${totalKills} lethal. ${totalEv} evidence pieces recovered.</p>`;
      }
      if (isNg) {
        html += `<p class="hint" style="color:var(--gold); margin-top:8px;">NEW GAME+ CYCLE ${cycle} — Halcyon adapts. Enemies hit harder. You hit back.</p>`;
      }
    }

    if (act && (completed.length === 0 || completed.at(-1)?.act !== entry.act)) {
      html += `<p class="hint" style="color:var(--gold); margin-top:8px;"><b>ACT ${entry.act} — ${act.title}</b><br>${act.premise}</p>`;
    }

    const flags = arrestedBosses(campaign, MISSIONS, CAMPAIGN)
      .map(({ missionId, name }) => `${name} in custody (${missionId.toUpperCase()})`);

    const flagsHtml = flags.length
      ? `<div><b>High-Value Targets in Custody:</b> ${flags.join(' · ')}</div>`
      : '<div class="hint">No high-value arrests yet.</div>';

    $('recap-title').textContent = isNg ? `NEW GAME+ CYCLE ${cycle} — STORY SO FAR` : 'STORY SO FAR';
    $('recap-body').innerHTML = html;
    $('recap-flags').innerHTML = flagsHtml;
    $('recap-next').textContent = `Next: ${mission.title}`;
    show('recap');
  }

  function showResults(mission, stats, gradeInfo, win, debrief) {
    $('results-title').textContent = win ? 'SCENE SECURED' : 'MISSION FAILED';
    $('results-title').style.color = win ? 'var(--teal)' : 'var(--red)';
    $('results-grade').textContent = win ? gradeInfo.grade : '—';
    $('results-debrief').innerHTML = debrief.lines.map((l) => `<p><b>${debrief.speaker}:</b> ${escapeHtml(l)}</p>`).join('');
    const rows = [
      ['Time', `${Math.floor(stats.timeSec / 60)}:${String(Math.floor(stats.timeSec % 60)).padStart(2, '0')} (par ${Math.floor(stats.parSec / 60)}:${String(stats.parSec % 60).padStart(2, '0')})`],
      ['Arrests', stats.arrests], ['Lethal', stats.kills],
      ['Civilians hurt / killed', `${stats.civiliansHurt} / ${stats.civiliansKilled}`],
      ['Evidence', `${stats.evidenceFound}/${stats.evidenceTotal}`],
      ['Accuracy', stats.shotsFired ? Math.round((stats.shotsHit / stats.shotsFired) * 100) + '%' : '—'],
      ['Revives', stats.revives],
      ['Property damage', Math.round(stats.propertyDamage)],
      ['Optional objectives', `${stats.optionalDone}/${stats.optionalTotal}`],
      ['Score', liveScore(stats)],
    ];
    $('results-stats').innerHTML = rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
    $('btn-next').style.display = win ? '' : 'none';
    $('btn-retry').style.display = win ? 'none' : '';
    show('results');
  }

  // Campaign ending cinematic
  function showEnding(campaign, ending) {
    const titles = {
      FULL_DISCLOSURE: 'FULL DISCLOSURE',
      JUSTICE: 'JUSTICE',
      COMPROMISED_VICTORY: 'COMPROMISED VICTORY',
      NEW_MANAGEMENT: 'NEW MANAGEMENT',
    };
    const bodies = {
      FULL_DISCLOSURE: `The master key turned every lock. Halcyon's servers dumped their guts onto every screen in Cobalt — shell companies, bribe ledgers, test-subject rosters, the lot. The Mayor resigned at noon. The Civic Shield contract was voided by sunset. WARREN's command files exposed the whole machine. GLOW is dead. The pipeline is severed. You did it, Grid. Every name on a warrant. Every body accounted for.`,
      JUSTICE: `The evidence held. The arrests stuck. WARREN took a plea — life without parole, in exchange for the names above him. Half the city council is under indictment. Civic Shield is being restructured under federal oversight. GLOW production is halted. It's not the clean sweep you wanted, but it's justice. The city can breathe tonight.`,
      COMPROMISED_VICTORY: `The case closed, but the files are thinner than they should be. Halcyon's remaining directors exploit jurisdictional conflicts, sealed records, and judges who golf with the right people. Civic Shield keeps its contract with "reforms." GLOW seizures drop 60%, but the cookers adapt. You saved lives, Grid. Just not all of them.`,
      NEW_MANAGEMENT: `The bodies piled up and the evidence burned. Halcyon's lawyers buried what remained. A new crew moves into the penthouse — different logos, same product. The Mayor calls it "stability." Civic Shield gets a budget increase. You're reassigned to traffic. The city doesn't know it lost tonight. But you do.`,
    };
    const stats = campaignMetrics(campaign);
    const evidencePct = Math.round(stats.evidencePct * 100);
    const arrestRatio = Math.round(stats.arrestRatio * 100);
    $('ending-title').textContent = titles[ending];
    $('ending-body').textContent = bodies[ending];
    $('ending-stats').innerHTML = `Arrests: ${stats.arrests} · Kills: ${stats.kills} · Civilians Lost: ${stats.civiliansKilled} · Evidence: ${evidencePct}% · Arrest Ratio: ${arrestRatio}%`;
    const isPerfect = ending === 'FULL_DISCLOSURE';
    $('btn-ending-ngplus').style.display = isPerfect ? '' : 'none';
    $('btn-ending-ngplus').onclick = () => { audio.uiConfirm(); window.dispatchEvent(new CustomEvent('vg-ngplus')); };
    $('btn-ending-menu').onclick = () => { audio.uiConfirm(); window.dispatchEvent(new CustomEvent('vg-endmenu')); };
    show('ending');
  }

  function buildSettingsPanel(onChange) {
    const defs = [
      ['musicVol', 'Music volume', 'range', 0, 1],
      ['sfxVol', 'Effects volume', 'range', 0, 1],
      ['dialogueVol', 'Dialogue volume', 'range', 0, 1],
      ['screenShake', 'Camera shake', 'range', 0, 1],
      ['fxIntensity', 'Visual effects intensity', 'range', 0.2, 1],
      ['gameSpeed', 'Game speed (single player)', 'range', 0.5, 1],
      ['subtitleSize', 'Subtitle size', 'range', 0.8, 1.6],
      ['aimAssist', 'Aim assist (gamepad)', 'check'],
      ['holdToAim', 'Hold to aim (off = toggle)', 'check'],
      ['subtitles', 'Subtitles', 'check'],
      ['speakerLabels', 'Subtitle speaker labels', 'check'],
      ['highContrastEnemies', 'High-contrast enemies', 'check'],
      ['reducedFlash', 'Reduce flashing', 'check'],
      ['retroFilter', 'Retro scanline filter', 'check'],
      ['p1Gamepad', 'Player 1 uses a controller', 'check'],
      ['touchControls', 'Touch controls', 'select', ['auto', 'on', 'off']],
      ['difficulty', 'Difficulty', 'select', ['rookie', 'agent', 'kingpin']],
    ];
    $('settings-body').innerHTML = defs.map(([key, label, kind, a, b]) => {
      if (kind === 'range') return `<label class="setting"><span>${label}</span><input type="range" min="${a}" max="${b}" step="0.05" data-key="${key}" value="${settings[key]}"></label>`;
      if (kind === 'check') return `<label class="setting"><span>${label}</span><input type="checkbox" data-key="${key}" ${settings[key] ? 'checked' : ''}></label>`;
      return `<label class="setting"><span>${label}</span><select data-key="${key}">${a.map((o) => `<option ${settings[key] === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
    }).join('');
    // Gamepad status line
    const gpStatus = document.createElement('div');
    gpStatus.className = 'setting';
    gpStatus.innerHTML = `<span>Gamepad status</span><span id="gp-status" style="color:#b9c4d4">Checking…</span>`;
    $('settings-body').appendChild(gpStatus);
    // Refresh button
    const refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.textContent = 'Refresh gamepads';
    refreshBtn.style.marginLeft = '8px';
    refreshBtn.onclick = () => { updateGamepadStatus(); };
    gpStatus.appendChild(refreshBtn);
    // BLE help
    const help = document.createElement('div');
    help.className = 'hint';
    help.style.marginTop = '8px';
    help.innerHTML = '<b>Controller setup.</b> USB pads work on plug-in — press any button to wake them (Chrome only sees a pad after a button press). '
      + '<b>Bluetooth:</b> pair in Windows Settings → Bluetooth &amp; devices, then press a button. '
      + 'If a BLE controller does not appear, put it in XInput mode (often hold Start+Home) and re-pair. '
      + 'Xbox, PlayStation (DualShock/DualSense) and most XInput pads map automatically; use the bindings list above to reassign any button.';
    $('settings-body').appendChild(help);
    $('settings-body').querySelectorAll('input, select').forEach((el) => {
      el.addEventListener('input', () => {
        const key = el.dataset.key;
        settings[key] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? parseFloat(el.value) : el.value;
        onChange(key);
      });
    });
    // Update gamepad status periodically AND the instant a pad announces itself
    // (fires on the first button press) so the user gets immediate feedback.
    setInterval(updateGamepadStatus, 1000);
    window.addEventListener('gamepadconnected', updateGamepadStatus);
    window.addEventListener('gamepaddisconnected', updateGamepadStatus);
    updateGamepadStatus();
  }

  function updateGamepadStatus() {
    const pads = navigator.getGamepads?.() ?? [];
    const connected = pads.filter((p) => p && p.connected);
    const el = document.getElementById('gp-status');
    if (!el) return;
    if (connected.length === 0) {
      // Browsers hide a pad until it sends input, so "nothing" usually just
      // means "press a button first" rather than a real detection failure.
      el.innerHTML = 'None yet — <b>press any button on the controller</b> with this window focused (browsers hide a pad until it sends input).';
      el.style.color = '#ffb04f';
    } else {
      const list = connected.map((p, i) => `${i + 1}. ${p.id || 'controller'} (${p.buttons.length} btns, ${p.axes.length} axes)`).join(' | ');
      const needP1 = !settings.p1Gamepad
        ? ' — <b style="color:#ffd94f">tick “Player 1 uses a controller” above to drive P1 with it</b> (otherwise it only joins as Player 2 by pressing Start).'
        : ' — active for Player 1.';
      el.innerHTML = `<span style="color:#58d0ba">${list}</span>${needP1}`;
    }
  }

  // Upgrade / respec screen. onAdjust(key, isBuy) mutates the campaign and
  // re-calls this; the whole panel re-renders from campaign state.
  function showUpgrade(campaign, onAdjust) {
    $('upgrade-points').textContent = campaign.upgradePoints;
    $('upgrade-body').innerHTML = Object.entries(UPGRADE_DEFS).map(([k, d]) => {
      const lvl = campaign.upgrades[k] ?? 0;
      const dots = Array.from({ length: d.max }, (_, i) => `<span class="dot ${i < lvl ? 'on' : ''}"></span>`).join('');
      return `<div class="uprow">
        <div class="upinfo"><b>${d.name}</b><small>${d.desc}</small></div>
        <div class="upctl">
          <button data-dn="${k}" ${lvl <= 0 ? 'disabled' : ''} aria-label="Refund ${d.name}">−</button>
          <span class="dots">${dots}</span>
          <button data-up="${k}" ${lvl >= d.max || campaign.upgradePoints < 1 ? 'disabled' : ''} aria-label="Buy ${d.name}">+</button>
        </div>
      </div>`;
    }).join('');
    $('upgrade-body').querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => onAdjust(b.dataset.up ?? b.dataset.dn, !!b.dataset.up));
    });
    show('upgrade');
  }

  // Rebinding panel. Each action shows up to 3 slots; clicking one listens for
  // the next key / mouse button / wheel notch / pad button and takes it.
  // `input` owns the binding data — the UI only renders and dispatches.
  function buildControlsPanel(input, onChange) {
    const render = () => {
      const b = input.getBindings();
      $('controls-body').innerHTML = ACTION_ORDER.map((a) => {
        const slots = [0, 1, 2].map((i) => {
          const code = b[a]?.[i];
          return `<button class="bindbtn" data-act="${a}" data-slot="${i}" title="${code ? 'Click to change · right-click to clear' : 'Click to bind'}">${escapeHtml(code ? codeLabel(code) : '+')}</button>`;
        }).join('');
        return `<div class="uprow">
          <div class="upinfo"><b>${escapeHtml(ACTION_LABELS[a] ?? a)}</b></div>
          <div class="upctl">${slots}</div>
        </div>`;
      }).join('');
      $('controls-body').querySelectorAll('.bindbtn').forEach((btn) => {
        const act = btn.dataset.act, slot = +btn.dataset.slot;
        btn.addEventListener('click', () => {
          if (input.capturing) return;
          btn.textContent = 'press…';
          btn.classList.add('listening');
          audio.uiMove();
          input.beginCapture((code) => {
            input.setBinding(act, slot, code);
            onChange();
            render();
            audio.uiConfirm();
          });
        });
        btn.addEventListener('contextmenu', (e) => {   // right-click clears
          e.preventDefault();
          input.clearBinding(act, slot);
          onChange();
          render();
        });
      });
    };
    $('btn-controls-reset').onclick = () => { input.resetBindings(); onChange(); render(); audio.uiConfirm(); };
    render();
  }

  // Mission replay list. rows: [{id, title, grade, locked}]
  function showMissionSelect(rows, onPick) {
    $('missions-body').innerHTML = rows.map((r) => `
      <div class="uprow">
        <div class="upinfo"><b>${escapeHtml(r.title)}</b><small>${r.locked ? 'Locked — reach it in the campaign' : r.grade ? `Best grade: ${r.grade}` : 'Cleared'}</small></div>
        <div class="upctl"><button data-mid="${r.id}" ${r.locked ? 'disabled' : ''}>Replay</button></div>
      </div>`).join('');
    $('missions-body').querySelectorAll('button[data-mid]').forEach((b) => {
      b.addEventListener('click', () => onPick(b.dataset.mid));
    });
    show('missions');
  }

  // Ending screen
  // Between-level cinematic runner. Plays a video clip or a styled title card
  // over everything, then calls onDone -> the mission flow continues "from that
  // point". Skippable (click / Esc / Space / Enter); a missing or broken video
  // falls through immediately so the flow never stalls on a bad asset.
  function playCinematic(clip, onDone) {
    const prev = document.getElementById('cinematic');
    if (prev) prev.remove();
    const overlay = document.createElement('div');
    overlay.id = 'cinematic';
    overlay.tabIndex = 0;
    overlay.style.cssText = 'position:fixed;inset:0;background:#000;z-index:9999;display:flex;align-items:center;justify-content:center;overflow:hidden';
    let timer = null, fired = false;
    const finish = () => {
      if (fired) return; fired = true;
      if (timer) clearTimeout(timer);
      overlay.remove();
      onDone?.();
    };

    if (clip.kind === 'video' && clip.src) {
      const video = document.createElement('video');
      video.src = clip.src; video.autoplay = true; video.playsInline = true;
      video.style.cssText = 'max-width:100%;max-height:100%';
      video.addEventListener('ended', finish);
      video.addEventListener('error', finish); // bad/missing asset -> skip
      overlay.appendChild(video);
      Promise.resolve(video.play?.()).catch(finish);
    } else {
      const card = document.createElement('div');
      card.style.cssText = 'text-align:center;color:#e8f0ff;font-family:system-ui,Segoe UI,sans-serif;padding:2rem;max-width:60ch;text-shadow:0 2px 12px #000;animation:cineFade .8s ease';
      card.innerHTML = `<div style="letter-spacing:.35em;font-size:.8rem;color:#7ec8ff;margin-bottom:1rem">VICE GRID</div>`
        + `<h1 style="font-size:2.6rem;margin:0 0 1.2rem;font-weight:800">${escapeHtml(clip.title)}</h1>`
        + clip.lines.map((l) => `<p style="font-size:1.05rem;line-height:1.5;opacity:.9;margin:.4rem 0">${escapeHtml(l)}</p>`).join('');
      overlay.appendChild(card);
      timer = setTimeout(finish, (clip.seconds || 5) * 1000);
    }

    if (clip.skippable) {
      const skip = document.createElement('button');
      skip.textContent = 'Skip ▸';
      skip.style.cssText = 'position:absolute;bottom:1.3rem;right:1.3rem;background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:6px;padding:.5rem 1rem;font-size:.95rem;cursor:pointer';
      skip.addEventListener('click', finish);
      overlay.addEventListener('keydown', (e) => { if (['Escape', ' ', 'Enter'].includes(e.key)) finish(); });
    }

    document.body.appendChild(overlay);
    overlay.focus();
  }

  return { show, banner, subtitle, log, clearLog, updateHud, showBriefing, showResults, showEnding, showRecap,
    buildSettingsPanel, buildControlsPanel, showUpgrade, showMissionSelect, liveScore, playCinematic };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
