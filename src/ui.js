// ui.js — DOM screens, HUD, banners, subtitles. All ids live in index.html.

import { WEAPONS } from './combat.js';
import { SCORE } from './grading.js';
import { summary } from './objectives.js';
import { UPGRADE_DEFS } from './upgrades.js';

const $ = (id) => document.getElementById(id);

export function makeUI(settings, audio) {
  const screens = ['title', 'menu', 'agent', 'briefing', 'pause', 'results', 'settings', 'credits', 'upgrade'];
  let bannerTimer = null, subtitleTimer = null;

  function show(name) {
    for (const s of screens) $('screen-' + s)?.classList.toggle('active', s === name);
    $('hud').classList.toggle('active', name === null || name === 'pause');
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
      ['difficulty', 'Difficulty', 'select', ['rookie', 'agent', 'kingpin']],
    ];
    $('settings-body').innerHTML = defs.map(([key, label, kind, a, b]) => {
      if (kind === 'range') return `<label class="setting"><span>${label}</span><input type="range" min="${a}" max="${b}" step="0.05" data-key="${key}" value="${settings[key]}"></label>`;
      if (kind === 'check') return `<label class="setting"><span>${label}</span><input type="checkbox" data-key="${key}" ${settings[key] ? 'checked' : ''}></label>`;
      return `<label class="setting"><span>${label}</span><select data-key="${key}">${a.map((o) => `<option ${settings[key] === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
    }).join('');
    $('settings-body').querySelectorAll('input, select').forEach((el) => {
      el.addEventListener('input', () => {
        const key = el.dataset.key;
        settings[key] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? parseFloat(el.value) : el.value;
        onChange(key);
      });
    });
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

  return { show, banner, subtitle, log, clearLog, updateHud, showBriefing, showResults, buildSettingsPanel, showUpgrade, liveScore };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
