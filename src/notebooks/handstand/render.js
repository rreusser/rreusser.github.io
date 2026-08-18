// Canvas 2D rendering of the handstand model: shared by the static pose
// explorer and the dynamic playback figure. No npm imports; theme colors and
// optional per-segment overrides are injected by the caller.

import { fk } from './dynamics.js';

const TAU = Math.PI * 2;

function css([r, g, b], a = 1) {
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
}

// World window: x centered near the hand, y from just below the floor to a
// bit above head height of the inverted body.
export function viewTransform(width, height, { cx = 0.12, yLo = -0.18, yHi = 2.08 } = {}) {
  const scale = height / (yHi - yLo);
  const toX = (wx) => width / 2 + (wx - cx) * scale;
  const toY = (wy) => height - (wy - yLo) * scale;
  return { toX, toY, scale };
}

// Draws the scene and returns screen-space anchors for interaction handles.
// opts: { model, ws, q, width, height, theme, clamped, segmentColors,
//         forces: [{x, y, fx, fy}] (world, Newtons), comTrail: [[x, y], ...],
//         copX (world x of center of pressure, drawn on the patch) }
export function drawScene(ctx, opts) {
  const { model, ws, q, width, height, theme, clamped = 0 } = opts;
  const fg = theme ? theme.foreground : [0.11, 0.12, 0.14];
  const isDark = theme ? theme.isDark : false;

  fk(model, q, null, ws);
  const { toX, toY, scale } = viewTransform(width, height, opts.view);

  let mTot = 0, comX = 0, comY = 0;
  for (let i = 0; i < model.nb; i++) {
    mTot += model.mass[i];
    comX += model.mass[i] * (ws.px[i] + ws.rcx[i]);
    comY += model.mass[i] * (ws.py[i] + ws.rcy[i]);
  }
  comX /= mTot; comY /= mTot;

  // Hand patch endpoints in world coordinates (on the floor).
  const c0 = Math.cos(ws.th[0]), s0 = Math.sin(ws.th[0]);
  const hw = model.wristHeight;
  const heelX = ws.px[0] + c0 * model.patch.x0 + s0 * hw;
  const tipX = ws.px[0] + c0 * model.patch.x1 + s0 * hw;
  const supported = comX >= Math.min(heelX, tipX) && comX <= Math.max(heelX, tipX);

  ctx.clearRect(0, 0, width, height);

  // Floor.
  ctx.fillStyle = css(fg, isDark ? 0.1 : 0.06);
  ctx.fillRect(0, toY(0), width, height - toY(0));
  ctx.strokeStyle = css(fg, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, toY(0));
  ctx.lineTo(width, toY(0));
  ctx.stroke();

  // Support patch: the usable center-of-pressure strip under the hand.
  const patchColor = isDark ? 'rgba(94, 158, 255, 0.5)' : 'rgba(38, 96, 189, 0.4)';
  ctx.strokeStyle = patchColor;
  ctx.lineWidth = Math.max(3, 0.02 * scale);
  ctx.beginPath();
  ctx.moveTo(toX(heelX), toY(0) + ctx.lineWidth * 0.6);
  ctx.lineTo(toX(tipX), toY(0) + ctx.lineWidth * 0.6);
  ctx.stroke();

  // CoM trail (playback).
  if (opts.comTrail && opts.comTrail.length > 1) {
    ctx.strokeStyle = css(fg, 0.35);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    for (let i = 0; i < opts.comTrail.length; i++) {
      const p = opts.comTrail[i];
      if (i === 0) ctx.moveTo(toX(p[0]), toY(p[1]));
      else ctx.lineTo(toX(p[0]), toY(p[1]));
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Segments. A body is drawn as a filled outline when the model carries one
  // (see silhouette.js) and as the bare stick polyline otherwise, so a model
  // built without outlines still renders.
  //
  // Draw order is occlusion order, and the fills are opaque so that later
  // bodies cover earlier ones instead of stacking into dark patches. In a
  // handstand the head hangs between the arms, so the head has to go down
  // before the arm or the two translucent shapes cross-hatch each other. Far
  // leg first, then head and torso, then the arm in front of the head, then
  // the near leg in front of everything.
  const order = [3, 4, 2, 0, 1, 5, 6];
  const bg = theme ? theme.background : [1, 1, 1];
  const mix = (t) => [0, 1, 2].map((k) => bg[k] + (fg[k] - bg[k]) * t);
  const tracePoly = (poly, c, s, px, py, keepPath = false) => {
    if (!keepPath) ctx.beginPath();
    for (let k = 0; k < poly.length; k++) {
      const wx = px + c * poly[k][0] - s * poly[k][1];
      const wy = py + s * poly[k][0] + c * poly[k][1];
      if (k === 0) ctx.moveTo(toX(wx), toY(wy));
      else ctx.lineTo(toX(wx), toY(wy));
    }
  };
  for (const i of order) {
    const alpha = (i === 3 || i === 4) ? 0.45 : 0.95;
    const color = opts.segmentColors?.[i] || css(fg, alpha);
    const c = Math.cos(ws.th[i]), s = Math.sin(ws.th[i]);
    const shape = model.outline?.[i];
    if (shape) {
      // All of a body's subpaths go into ONE path and are filled once, so
      // the neck overlapping the skull and the skull overlapping the chest
      // merge instead of stacking into a dark lens. Stroking the same path
      // leaves those internal edges visible, which is what makes the figure
      // read as a body rather than a blob.
      ctx.beginPath();
      for (const poly of shape) {
        tracePoly(poly, c, s, ws.px[i], ws.py[i], true);
        ctx.closePath();
      }
      // Base fill is opaque so the body occludes; a per-segment colour (the
      // joint-load tint during playback) goes over it rather than replacing
      // it, so a hard-working limb reads as coloured without going neon.
      ctx.fillStyle = css(mix(alpha * (isDark ? 0.30 : 0.18)), 1);
      ctx.fill();
      if (opts.segmentColors?.[i]) {
        ctx.save();
        ctx.globalAlpha = 0.55 * alpha;
        ctx.fillStyle = opts.segmentColors[i];
        ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = opts.segmentColors?.[i] || css(fg, alpha * 0.8);
      ctx.lineWidth = Math.max(1, 0.0035 * scale);
      ctx.lineJoin = 'round';
      ctx.stroke();
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, (0.016 + 0.028 * Math.sqrt(model.mass[i] / mTot)) * scale);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      tracePoly(model.geometry[i], c, s, ws.px[i], ws.py[i]);
      ctx.stroke();
    }

    // Per-segment CoM dot.
    ctx.fillStyle = css(fg, 0.5);
    ctx.beginPath();
    ctx.arc(toX(ws.px[i] + ws.rcx[i]), toY(ws.py[i] + ws.rcy[i]), Math.max(2, 0.008 * scale), 0, TAU);
    ctx.fill();
  }

  // Ground reaction force arrows (playback).
  if (opts.forces) {
    const fScale = 0.9 / (mTot * model.gravity);  // body weight -> ~0.9 m arrow
    ctx.strokeStyle = isDark ? 'rgba(255, 170, 60, 0.9)' : 'rgba(200, 110, 10, 0.9)';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 2;
    for (const f of opts.forces) {
      const mag = Math.hypot(f.fx, f.fy);
      if (mag * fScale * scale < 4) continue;
      const x0 = toX(f.x), y0 = toY(f.y);
      const x1 = toX(f.x + f.fx * fScale), y1 = toY(f.y + f.fy * fScale);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      const ang = Math.atan2(y1 - y0, x1 - x0);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - 7 * Math.cos(ang - 0.4), y1 - 7 * Math.sin(ang - 0.4));
      ctx.lineTo(x1 - 7 * Math.cos(ang + 0.4), y1 - 7 * Math.sin(ang + 0.4));
      ctx.closePath();
      ctx.fill();
    }
  }

  // Center of pressure marker on the patch.
  if (opts.copX !== undefined && Number.isFinite(opts.copX)) {
    ctx.fillStyle = patchColor;
    ctx.beginPath();
    ctx.arc(toX(opts.copX), toY(0), Math.max(3, 0.012 * scale), 0, TAU);
    ctx.fill();
  }

  // Total CoM with a drop line to the floor: green over the patch, red off.
  const comColor = supported
    ? (isDark ? 'rgba(80, 200, 120, 0.95)' : 'rgba(32, 140, 70, 0.95)')
    : (isDark ? 'rgba(255, 110, 100, 0.95)' : 'rgba(190, 55, 45, 0.95)');
  ctx.strokeStyle = comColor;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(toX(comX), toY(comY));
  ctx.lineTo(toX(comX), toY(0));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = comColor;
  ctx.beginPath();
  ctx.arc(toX(comX), toY(comY), Math.max(4, 0.016 * scale), 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(toX(comX), toY(0), Math.max(2.5, 0.008 * scale), 0, TAU);
  ctx.fill();

  // Rings on ROM-clamped joints (joint j is the origin of body j - 2).
  if (clamped) {
    ctx.strokeStyle = isDark ? 'rgba(255, 180, 40, 0.95)' : 'rgba(205, 130, 0, 0.95)';
    ctx.lineWidth = 2.5;
    for (let j = 3; j <= 8; j++) {
      if (!(clamped & (1 << j))) continue;
      const b = j - 2;
      ctx.beginPath();
      ctx.arc(toX(ws.px[b]), toY(ws.py[b]), Math.max(6, 0.03 * scale), 0, TAU);
      ctx.stroke();
    }
  }

  // Screen anchors for drag handles: each handle rotates `joint` about the
  // pivot (the joint's world position); the grab point is the distal
  // reference that the pointer naturally follows.
  const toe = (b) => {
    const c = Math.cos(ws.th[b]), s = Math.sin(ws.th[b]);
    const p = model.geometry[b][model.geometry[b].length - 1];
    return [ws.px[b] + c * p[0] - s * p[1], ws.py[b] + s * p[0] + c * p[1]];
  };
  const H = (joint, grabW, pivotB) => ({
    joint,
    x: toX(grabW[0]), y: toY(grabW[1]),
    pivotX: toX(ws.px[pivotB]), pivotY: toY(ws.py[pivotB]),
  });
  const handles = [
    H(3, [ws.px[2], ws.py[2]], 1),   // shoulder point rotates the arm (wrist)
    H(4, [ws.px[3], ws.py[3]], 2),   // hip point rotates the torso (shoulder)
    H(5, [ws.px[4], ws.py[4]], 3),   // left knee point rotates the left hip
    H(6, toe(4), 4),                 // left toe rotates the left knee
    H(7, [ws.px[6], ws.py[6]], 5),
    H(8, toe(6), 6),
  ];

  return { comX, comY, supported, handles, heelX, tipX };
}
