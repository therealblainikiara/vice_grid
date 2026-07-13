// render.js — neon vector canvas renderer. Reads world state; never mutates it.

import { TILE } from './world.js';

export function draw(ctx, w, settings) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  w.viewW = W; w.viewH = H;
  const fx = settings.fxIntensity ?? 1;
  const shakeAmt = (settings.reducedFlash ? 0 : w.cam.shake) * 6 * (settings.screenShake ?? 1);
  const ox = W / 2 - w.cam.x + (Math.random() - 0.5) * shakeAmt;
  const oy = H / 2 - w.cam.y + (Math.random() - 0.5) * shakeAmt;

  ctx.fillStyle = '#0a0d12';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(ox, oy);

  // tiles
  const x0 = Math.max(0, Math.floor((w.cam.x - W / 2) / TILE) - 1);
  const x1 = Math.min(w.cols - 1, Math.ceil((w.cam.x + W / 2) / TILE) + 1);
  const y0 = Math.max(0, Math.floor((w.cam.y - H / 2) / TILE) - 1);
  const y1 = Math.min(w.rows - 1, Math.ceil((w.cam.y + H / 2) / TILE) + 1);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const k = tx + ',' + ty, px = tx * TILE, py = ty * TILE;
      if (w.walls.has(k)) {
        ctx.fillStyle = '#1a2333';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#2b3949';
        ctx.fillRect(px, py, TILE, 6);
      } else if (w.roads.has(k)) {
        ctx.fillStyle = '#11151c';
        ctx.fillRect(px, py, TILE, TILE);
        if (ty % 2 === 0 && tx % 2 === 0) { ctx.fillStyle = '#e2b45b33'; ctx.fillRect(px + TILE / 2 - 12, py + TILE / 2 - 2, 24, 4); }
      } else {
        ctx.fillStyle = (tx + ty) % 2 ? '#12161e' : '#131820';
        ctx.fillRect(px, py, TILE, TILE);
      }
    }
  }

  // pickups
  for (const pk of w.pickups) {
    const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 300 + pk.id);
    ctx.save();
    ctx.translate(pk.x, pk.y);
    if (pk.kind === 'evidence') {
      glow(ctx, '#ffd94f', 16 * fx * pulse);
      ctx.fillStyle = '#ffd94f';
      ctx.fillRect(-9, -12, 18, 24);
      ctx.fillStyle = '#0a0d12';
      ctx.fillRect(-6, -8, 12, 3); ctx.fillRect(-6, -2, 12, 3); ctx.fillRect(-6, 4, 12, 3);
    } else if (pk.kind === 'medkit') {
      glow(ctx, '#6dff9e', 14 * fx * pulse);
      ctx.fillStyle = '#6dff9e';
      ctx.fillRect(-10, -10, 20, 20);
      ctx.fillStyle = '#0a0d12';
      ctx.fillRect(-2, -7, 4, 14); ctx.fillRect(-7, -2, 14, 4);
    } else {
      glow(ctx, '#7db4ff', 14 * fx * pulse);
      ctx.fillStyle = '#7db4ff';
      ctx.fillRect(-14, -5, 28, 10);
      ctx.fillRect(2, -9, 6, 8);
    }
    ctx.restore();
  }

  // props
  for (const pr of w.props) {
    ctx.save();
    ctx.translate(pr.x, pr.y);
    const dmg = pr.hp / (pr.kind === 'shelf' ? 90 : 60);
    ctx.fillStyle = pr.kind === 'shelf' ? '#3a4a5c' : '#5c4a32';
    ctx.strokeStyle = '#00000066';
    ctx.fillRect(-pr.r, -pr.r, pr.r * 2, pr.r * 2);
    ctx.strokeRect(-pr.r, -pr.r, pr.r * 2, pr.r * 2);
    if (dmg < 0.7) { ctx.strokeStyle = '#000000aa'; line(ctx, -pr.r * 0.6, -pr.r * 0.4, pr.r * 0.3, pr.r * 0.5); }
    if (dmg < 0.4) { line(ctx, pr.r * 0.5, -pr.r * 0.6, -pr.r * 0.2, pr.r * 0.6); }
    ctx.restore();
  }

  // civilians
  for (const c of w.civilians) drawBody(ctx, c, '#e8e2d4', settings, fx);

  // enemies
  for (const e of w.enemies) {
    const col = settings.highContrastEnemies ? '#ff5050' : e.color;
    drawBody(ctx, e, col, settings, fx);
  }

  // players
  for (const p of w.players) drawBody(ctx, p, p.agent.color, settings, fx);

  // bullets
  for (const b of w.bullets) {
    ctx.save();
    glow(ctx, b.lethal ? '#ffca6b' : '#63e4ff', 8 * fx);
    ctx.strokeStyle = b.lethal ? '#ffca6b' : '#63e4ff';
    ctx.lineWidth = 2.5;
    line(ctx, b.x - b.vx * 0.015, b.y - b.vy * 0.015, b.x, b.y);
    ctx.restore();
  }

  // effects
  for (const f of w.effects) {
    const t = f.t / f.dur;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.globalAlpha = (1 - t) * fx;
    if (f.kind === 'muzzle' && !settings.reducedFlash) {
      ctx.rotate(f.a);
      glow(ctx, '#fff2ba', 20);
      ctx.fillStyle = '#fff2ba';
      ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(22, 0); ctx.lineTo(0, 5); ctx.fill();
    } else if (f.kind === 'hit') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 6 + t * 14, 0, Math.PI * 2); ctx.stroke();
    } else if (f.kind === 'spark' || f.kind === 'debris') {
      ctx.fillStyle = f.kind === 'spark' ? '#ffd94f' : '#8a7a5a';
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + f.x;
        ctx.fillRect(Math.cos(a) * t * 18 - 2, Math.sin(a) * t * 18 - 2, 4, 4);
      }
    } else if (f.kind === 'break') {
      ctx.fillStyle = '#8a7a5a';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.fillRect(Math.cos(a) * t * 30 - 3, Math.sin(a) * t * 30 - 3, 6, 6);
      }
    } else if (f.kind === 'swing') {
      ctx.rotate(f.a);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 34, -0.9 + t * 0.6, 0.9 + t * 0.6); ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();

  // vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, H / 3, W / 2, H / 2, H);
  vg.addColorStop(0, 'transparent'); vg.addColorStop(1, '#000000aa');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

function glow(ctx, color, blur) { ctx.shadowColor = color; ctx.shadowBlur = blur; }
function line(ctx, x0, y0, x1, y1) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }

function drawBody(ctx, e, color, settings, fx) {
  const dead = e.state === 'DEAD';
  const downed = e.state === 'DOWNED' || e.downed;
  const cuffed = e.state === 'CUFFED';
  const surr = e.state === 'SURRENDER' || e.state === 'FAKE_SURRENDER';
  ctx.save();
  ctx.translate(e.x, e.y);

  // shadow
  ctx.fillStyle = '#00000088';
  ctx.beginPath(); ctx.ellipse(0, 8, 14, 6, 0, 0, Math.PI * 2); ctx.fill();

  if (dead) {
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    line(ctx, -10, -10, 10, 10); line(ctx, 10, -10, -10, 10);
    ctx.restore();
    return;
  }

  if (e.hitFlash > 0 && !settings.reducedFlash) { glow(ctx, '#ffffff', 24); }
  else glow(ctx, color, (e.kind === 'player' ? 18 : 10) * fx);

  // body
  ctx.fillStyle = downed || cuffed ? shade(color, 0.5) : color;
  ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  // facing wedge
  if (!downed && !cuffed && !surr) {
    const a = e.aimAngle ?? 0;
    ctx.fillStyle = '#0a0d12';
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 15, Math.sin(a) * 15);
    ctx.lineTo(Math.cos(a + 2.4) * 9, Math.sin(a + 2.4) * 9);
    ctx.lineTo(Math.cos(a - 2.4) * 9, Math.sin(a - 2.4) * 9);
    ctx.fill();
  }

  // hands-up pose
  if (surr) {
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
    line(ctx, -8, -8, -14, -20); line(ctx, 8, -8, 14, -20);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('HANDS UP', 0, -28);
  }
  if (cuffed) {
    ctx.strokeStyle = '#ffd94f'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 2, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd94f';
    ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('CUFFED', 0, -24);
  }
  if (downed && !cuffed) {
    ctx.fillStyle = '#ff9c9c';
    ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(e.kind === 'player' ? 'DOWN — NEEDS REVIVE' : 'DOWN — CUFF', 0, -24);
  }

  // cuff progress ring
  if (e.cuffProgress > 0 && e.cuffProgress < 1 && !cuffed) {
    ctx.strokeStyle = '#ffd94f'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 22, -Math.PI / 2, -Math.PI / 2 + e.cuffProgress * Math.PI * 2); ctx.stroke();
  }

  // hp pip for enemies/bosses
  if (e.kind === 'enemy' && !dead && !cuffed && e.hp < e.maxHp) {
    ctx.fillStyle = '#00000099';
    ctx.fillRect(-16, -22, 32, 4);
    ctx.fillStyle = e.boss ? '#ff5f9e' : '#9dff57';
    ctx.fillRect(-16, -22, 32 * (e.hp / e.maxHp), 4);
  }

  // boss name
  if (e.boss) {
    ctx.fillStyle = '#ff5f9e';
    ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(e.name ?? 'BOSS', 0, -32);
  }

  ctx.restore();
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}
