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

// Draw a set of bodies as flat translucent silhouettes: the population of an
// optimizer generation, all at the same moment of their own trajectories.
// These are candidates that were simulated and scored, not fresh rollouts.
//
// Uses the caller's workspace, which it leaves holding the last ghost's
// kinematics -- drawScene runs its own fk before it draws anything, so
// calling this first and drawScene second is safe and is the intended order.
// color overrides the foreground silhouette: a flat body in the colour of
// whatever it stands for, so an underlay can say WHICH of two things it is
// without carrying any detail of its own.
export function drawGhosts(ctx, { model, ws, poses, width, height, theme, view, alpha = 0.14, color = null }) {
  if (!poses?.length) return;
  const fg = theme ? theme.foreground : [0.11, 0.12, 0.14];
  const { toX, toY } = viewTransform(width, height, view);
  ctx.save();
  for (const pose of poses) {
    const q = pose.q instanceof Float64Array ? pose.q : Float64Array.from(pose.q);
    fk(model, q, null, ws);
    if (color) { ctx.globalAlpha = alpha * (pose.weight ?? 1); ctx.fillStyle = color; }
    else ctx.fillStyle = css(fg, alpha * (pose.weight ?? 1));
    for (let i = 0; i < model.nb; i++) {
      const c = Math.cos(ws.th[i]), sn = Math.sin(ws.th[i]);
      const shape = model.outline?.[i];
      if (!shape) continue;
      ctx.beginPath();
      for (const poly of shape) {
        for (let k = 0; k < poly.length; k++) {
          const wx = ws.px[i] + c * poly[k][0] - sn * poly[k][1];
          const wy = ws.py[i] + sn * poly[k][0] + c * poly[k][1];
          if (k === 0) ctx.moveTo(toX(wx), toY(wy));
          else ctx.lineTo(toX(wx), toY(wy));
        }
        ctx.closePath();
      }
      ctx.fill();
    }
  }
  ctx.restore();
}

// Draws the scene and returns screen-space anchors for interaction handles.
// opts: { model, ws, q, width, height, theme, clamped, jointMarks, segmentColors,
//         forces: [{x, y, fx, fy}] (world, Newtons), comTrail: [[x, y], ...],
//         copX (world x of center of pressure, drawn on the patch) }
export function drawScene(ctx, opts) {
  const { model, ws, q, width, height, theme, clamped = 0, clear = true } = opts;
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

  if (clear) ctx.clearRect(0, 0, width, height);

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
  // By NAME, because the body indices moved when the trunk gained a hinge and
  // the head became its own segment -- and a hardcoded list silently stops
  // drawing whatever fell off the end of it, which is exactly what happened
  // to the head.
  const ORDER_NAMES = ['thighL', 'shankL', 'headNeck', 'chest', 'pelvis',
    'hand', 'arm', 'thighR', 'shankR'];
  const order = ORDER_NAMES.map((n) => model.names.indexOf(n)).filter((i) => i >= 0);
  const farLeg = new Set([model.names.indexOf('thighL'), model.names.indexOf('shankL')]);
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
    const alpha = farLeg.has(i) ? 0.45 : 0.95;
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

  // Rings naming the joint that makes a pose impossible: solid for a joint
  // asked for more torque than it has, dashed for one outside its range of
  // motion. jointMarks maps a joint index (3..8) to 'strength' or 'rom'.
  if (opts.jointMarks) {
    const red = isDark ? 'rgba(255, 96, 88, 1)' : 'rgba(198, 40, 30, 1)';
    const halo = isDark ? 'rgba(255, 96, 88, 0.26)' : 'rgba(198, 40, 30, 0.20)';
    for (const [key, kind] of Object.entries(opts.jointMarks)) {
      const b = (+key) - 2;
      if (!(b >= 0 && b < model.nb)) continue;
      const cx = toX(ws.px[b]), cy = toY(ws.py[b]);
      const r = Math.max(11, 0.055 * scale);
      // Filled halo under the ring: at this size a stroke alone disappears
      // against a body that is itself outlined.
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = red;
      ctx.lineWidth = Math.max(3, 0.017 * scale);
      ctx.setLineDash(kind === 'rom' ? [Math.max(5, 0.028 * scale), Math.max(4, 0.020 * scale)] : []);
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Screen anchors for drag handles: each handle rotates `joint` about the
  // pivot (the joint's world position); the grab point is the distal
  // reference that the pointer naturally follows.
  // The far end of a body, in world coordinates: the geometry point furthest
  // from its own origin. Not the LAST point -- the head's polyline runs from
  // the crown back to the neck, so its last point is the pivot itself and the
  // handle would have had nothing to grab.
  const tip = (b) => {
    const g = model.geometry[b];
    let best = g[0], bd = -1;
    for (const p of g) {
      const d = p[0] * p[0] + p[1] * p[1];
      if (d > bd) { bd = d; best = p; }
    }
    const c = Math.cos(ws.th[b]), s = Math.sin(ws.th[b]);
    return [ws.px[b] + c * best[0] - s * best[1], ws.py[b] + s * best[0] + c * best[1]];
  };
  const H = (joint, grabW, pivotB) => ({
    joint,
    x: toX(grabW[0]), y: toY(grabW[1]),
    pivotX: toX(ws.px[pivotB]), pivotY: toY(ws.py[pivotB]),
  });
  // One handle per driven body, WALKED from the tree. This was a hand-written
  // table of six entries in the old body numbering: once the trunk gained a
  // hinge it grabbed the wrong joints -- the handle on the torso turned out to
  // drive a hip -- and it stopped two bodies short, so the feet and the head
  // had no handle at all.
  //
  // Each body is turned about its own origin, and the natural thing to take
  // hold of is its far end: the origin of its first child where it has one,
  // and its own tip where it does not.
  const firstChild = (b) => {
    for (let i = 1; i < model.nb; i++) if (model.parent[i] === b) return i;
    return -1;
  };
  const handles = [];
  for (let b = 1; b < model.nb; b++) {
    const ch = firstChild(b);
    handles.push(H(2 + b, ch >= 0 ? [ws.px[ch], ws.py[ch]] : tip(b), b));
  }

  return { comX, comY, supported, handles, heelX, tipX };
}
