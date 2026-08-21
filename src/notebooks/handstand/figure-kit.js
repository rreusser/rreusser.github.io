// The visual vocabulary every figure on this page shares.
//
// Four figures show the same object -- a technique, meaning K reference poses
// plus a duration -- and they used to say it four different ways: a ghost that
// meant "asked for" here and "another candidate" there, effort colours mixed
// per figure, three formats for the same verdict. So the marks are defined
// once, here, and every figure spends them the same way:
//
//   ORANGE body/curve   what is being ASKED FOR (a reference pose, a knot)
//   BLUE-to-RED body    what HAPPENED, tinted by how much strength it took
//
// Two marks, and nothing else is a body. There was a third -- a flat grey one
// meaning "some other technique: the one you started from, or a candidate the
// search is trying" -- and it was cut. A mark whose definition needs the word
// "or" is not a mark, it is two marks sharing a colour, and a reader given
// three overlapping figures in a 100 px thumbnail cannot tell which one the
// panel is about. Comparison against a previous version is not worth a body.

import { drawScene } from './render.js';
import { availableTorque } from './strength.js';
import { jointLimits, groundHand } from './statics.js';
import { JOINT_ORDER } from './control.js';
import { evalReference } from './control.js';
import { WORK_EFFICIENCY } from './rollout.js';

// What the technique asks for: a neutral grey, everywhere a request appears.
// Grey because a request is not a measurement -- it carries no quantity, so it
// should carry no hue, and leaving it colourless frees the whole blue-to-red
// range to mean one thing.
export const REQUEST_COLOR = '#8b9198';
export const REQUEST_FILL = 'rgba(139,145,152,0.20)';
export const REQUEST_FILL_HOVER = 'rgba(139,145,152,0.55)';
// A joint outside its own anatomy. Orange because it is the one mark on the
// strip that is not a measurement but a warning, and it should read as one.
export const ROM_COLOR = '#e8833a';
const R2D = 180 / Math.PI;

// The six actuated joints, named the way a person names them rather than the
// way q indexes them. Every figure lists them in this order.
export const JOINTS = [
  { j: 0, qi: 3, label: 'wrist' },
  { j: 1, qi: 4, label: 'shoulder' },
  { j: 2, qi: 5, label: 'hip L' },
  { j: 3, qi: 6, label: 'knee L' },
  { j: 4, qi: 7, label: 'hip R' },
  { j: 5, qi: 8, label: 'knee R' },
];

// Strength used: blue (idle) to red (at the voluntary torque cap). One ramp,
// spent the same way by the segments of a moving body, the rows of the effort
// strip, and any bar reporting the same quantity, so "red" means the same
// thing wherever it turns up. It is the only hue in the figure, which is what
// makes it readable: nothing else competes for it.
//
// It crosses a NEUTRAL midpoint rather than sweeping through green. Rotating
// hue from 210 to 0 is a rainbow, and a rainbow puts its most eye-catching
// band -- green, which every reader takes for "fine" -- at exactly the effort
// that is neither idle nor maximal. A joint at half its cap is not fine and is
// not alarming; it should look like neither.
const COOL = [59, 110, 176], HOT = [178, 24, 43];
const MID_LIGHT = [206, 206, 206], MID_DARK = [112, 112, 120];
export function effortColor(u, isDark = false, alpha = 1) {
  const uu = Math.min(Math.max(u, 0), 1);
  const mid = isDark ? MID_DARK : MID_LIGHT;
  const [a, b, f] = uu <= 0.5 ? [COOL, mid, uu * 2] : [mid, HOT, (uu - 0.5) * 2];
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * f));
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}

// Segment colours for drawScene. requestTint paints a whole body as a request;
// effortTint paints it as a result.
export const requestTint = () => new Array(7).fill(REQUEST_COLOR);
export function effortTint(run, k, prof, isDark) {
  const out = new Array(7).fill(null);
  for (let j = 0; j < 6; j++) {
    const tau = run.rec.tauApplied[k][j];
    const cap = availableTorque(prof[JOINT_ORDER[j]], tau, run.rec.qd[k][3 + j]);
    out[1 + j] = effortColor(Math.abs(tau) / Math.max(cap, 1e-6), isDark);
  }
  return out;
}

export function frameAt(rec, t) {
  return Math.min(rec.t.length - 1, Math.max(0, Math.round(t / (rec.dt * rec.stride))));
}

// The pose a set of knots asks for at time t, ALWAYS on a hand planted flat at
// the origin.
//
// A reference pose is six joint angles and nothing else -- it has no position,
// because a spline says nothing about where the hand ends up. This used to
// borrow the floating base from the recording, which is wrong in a way that
// only shows once you edit: changing an early pose changes the simulation,
// which moves the hand at every LATER instant, so every later pose was redrawn
// on a frame that had slid, tilted, or (if the edit made the body fall) rotated
// flat onto the floor. Poses nobody touched appeared to fly around, and a pose
// just set snapped somewhere else the moment the drag was released. Planting
// the hand makes a pose depend on exactly the numbers that define it.
const refVal = new Float64Array(6), refRate = new Float64Array(6);
export function requestPose(model, knots, T, t, out) {
  out.fill(0);
  groundHand(model, out);
  evalReference(knots, T, Math.min(t, T), refVal, refRate);
  for (let j = 0; j < 6; j++) out[3 + j] = refVal[j];
  return out;
}

// The same, for a knot taken directly rather than sampled off the spline.
export function knotPose(model, knots, k, out) {
  out.fill(0);
  groundHand(model, out);
  for (let j = 0; j < 6; j++) out[3 + j] = knots[j][k];
  return out;
}

// What a run cost, read off the recording rather than re-scored: the optimizer
// scores at its own timestep on its own plant, and a number that disagrees
// with the body on screen is worse than no number.
export function analyzeRun(run, prof, model) {
  const rec = run.rec;
  const m = run.model || model;
  const peak = new Float64Array(6), satT = new Float64Array(6), err = new Float64Array(6);
  const v = new Float64Array(6), r = new Float64Array(6);
  let n = 0, pos = 0, neg = 0;
  for (let k = 0; k < rec.t.length; k++) {
    const dts = k > 0 ? rec.t[k] - rec.t[k - 1] : 0;
    evalReference(run.knots, run.T, Math.min(rec.t[k], run.T), v, r);
    const driving = rec.t[k] <= run.T;
    if (driving) n++;
    for (let j = 0; j < 6; j++) {
      const tau = rec.tauApplied[k][j];
      const cap = availableTorque(prof[JOINT_ORDER[j]], tau, rec.qd[k][3 + j]);
      const u = Math.abs(tau) / Math.max(cap, 1e-6);
      if (u > peak[j]) peak[j] = u;
      if (u > 0.8) satT[j] += dts;
      const P = tau * rec.qd[k][3 + j];
      if (P > 0) pos += P * dts; else neg -= P * dts;
      if (driving) { const e = v[j] - rec.q[k][3 + j]; err[j] += e * e; }
    }
  }
  return {
    peak: Array.from(peak),
    satT: Array.from(satT),
    trackDeg: Array.from(err, (e) => Math.sqrt(e / Math.max(n, 1)) * R2D),
    metab: (pos / WORK_EFFICIENCY.concentric + neg / WORK_EFFICIENCY.eccentric)
      / (m.massKg * m.gravity * m.heightM),
    verdict: run.verdict,
  };
}

// One sentence, one format, every figure: did it arrive, and what did it cost.
export function verdictHTML(stats, baseline = null) {
  const ok = stats.verdict.success;
  const delta = (now, was, digits) => {
    if (was == null) return '';
    const d = now - was;
    if (Math.abs(d) < 5 * 10 ** -(digits + 1)) return '';
    return `<span style="opacity:.85; color:${d < 0 ? '#2e8b57' : '#c0392b'}">`
      + ` (${d >= 0 ? '+' : ''}${d.toFixed(digits)})</span>`;
  };
  return `<strong style="color:${ok ? '#2e8b57' : '#c0392b'}">`
    + `${ok ? '✓ reaches a handstand' : '✗ does not arrive'}</strong>`
    + ` &nbsp;·&nbsp; work ${stats.metab.toFixed(2)} body-height lifts`
    + delta(stats.metab, baseline?.metab, 2);
}

// ---------------------------------------------------------------------------
// The effort strip: six rows, one per joint, time along x.
//
// It replaced six joint-angle-versus-time charts, which asked a reader to
// decode a wrist "angle" of 90 degrees and a sign-flipped knee before they
// could see anything. Nobody reads a pose off an angle plot. What they want to
// know is what the six charts only implied:
//
//   row colour     how much of that joint's strength the movement is spending
//   orange band    the joint is outside its own range of motion
//   pale uprights  where the K poses fall, so the storyboard above and the
//                  timeline below are one picture rather than two
export function createStrip({ width, rowH = 18, gutter = 58, dpr = 1, onSeek = null }) {
  const height = JOINTS.length * rowH + 20;
  const canvas = document.createElement('canvas');
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.display = 'block';
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const base = document.createElement('canvas');
  base.width = canvas.width;
  base.height = canvas.height;

  const plotW = width - gutter - 6;
  const toX = (t, xEnd) => gutter + Math.min(Math.max(t / xEnd, 0), 1) * plotW;
  let state = null;

  const box = document.createElement('div');
  box.style.touchAction = 'none';
  box.appendChild(canvas);
  if (onSeek) {
    canvas.style.cursor = 'col-resize';
    let seeking = null;
    const seek = (e) => {
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) * (width / (r.width || width));
      if (state) onSeek(Math.min(Math.max((x - gutter) / plotW, 0), 1) * state.xEnd);
    };
    canvas.addEventListener('pointerdown', (e) => {
      seeking = e.pointerId;
      canvas.setPointerCapture?.(e.pointerId);
      seek(e);
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', (e) => { if (seeking === e.pointerId) seek(e); });
    const stop = (e) => {
      if (seeking !== e.pointerId) return;
      canvas.releasePointerCapture?.(e.pointerId);
      seeking = null;
    };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
  }

  // Everything that does not move goes into an offscreen canvas once per
  // simulation; the cursor is the only thing redrawn per frame.
  const layout = ({ run, prof, rom, T, xEnd, theme, knotTimes = [] }) => {
    state = { xEnd, T };
    const rec = run.rec;
    const isDark = theme?.isDark ?? false;
    const fg = theme?.foreground || [0.11, 0.12, 0.14];
    const rgb = fg.map((v) => Math.round(v * 255)).join(',');
    const fgc = (a) => `rgba(${rgb},${a})`;
    const ctx = base.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.font = '10px system-ui, sans-serif';

    const cols = Math.max(2, Math.round(plotW));
    const effort = new Float64Array(cols * 6);
    const outRom = new Uint8Array(cols * 6);
    for (let c = 0; c < cols; c++) {
      const t = (c / (cols - 1)) * xEnd;
      const k = frameAt(rec, t);
      for (let n = 0; n < 6; n++) {
        const J = JOINTS[n];
        const tau = rec.tauApplied[k][J.j];
        const cap = availableTorque(prof[JOINT_ORDER[J.j]], tau, rec.qd[k][3 + J.j]);
        effort[c * 6 + n] = Math.abs(tau) / Math.max(cap, 1e-6);
        const lim = jointLimits(rom, rec.q[k], J.qi);
        const q = rec.q[k][J.qi];
        outRom[c * 6 + n] = (q < lim.lo - 1e-9 || q > lim.hi + 1e-9) ? 1 : 0;
      }
    }

    JOINTS.forEach((J, n) => {
      const y0 = n * rowH + 1, h = rowH - 3;
      for (let c = 0; c < cols; c++) {
        const u = effort[c * 6 + n];
        ctx.fillStyle = effortColor(u, isDark, 0.16 + 0.72 * Math.min(u, 1));
        ctx.fillRect(gutter + c, y0, 1.25, h);
      }
      // Outside its own anatomy: the end-stops are real torques, so this is a
      // ligament being asked to hold the pose, not decoration. A wash over the
      // whole row so it is visible at a glance, and a solid edge so a brief
      // excursion is not lost in it.
      for (let c = 0; c < cols; c++) {
        if (!outRom[c * 6 + n]) continue;
        ctx.fillStyle = 'rgba(232,131,58,0.20)';
        ctx.fillRect(gutter + c, y0, 1.25, h);
        ctx.fillStyle = ROM_COLOR;
        ctx.fillRect(gutter + c, y0, 1.25, 2.5);
      }
      ctx.strokeStyle = fgc(0.16);
      ctx.strokeRect(gutter + 0.5, y0 + 0.5, plotW, h - 1);
      ctx.fillStyle = fgc(0.8);
      ctx.textAlign = 'right';
      ctx.fillText(J.label, gutter - 6, y0 + h / 2 + 3.5);
    });

    // Where the K poses fall. Faint, and neutral like the poses themselves, so
    // the storyboard and the timeline are one picture.
    ctx.strokeStyle = fgc(0.4);
    ctx.lineWidth = 1;
    for (const kt of knotTimes) {
      const x = Math.round(toX(kt, xEnd)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, JOINTS.length * rowH - 2);
      ctx.stroke();
    }

    // Time axis: nothing but the two facts a reader needs, where the driven
    // phase ends and where the picture does.
    const yA = JOINTS.length * rowH + 11;
    ctx.strokeStyle = fgc(0.35);
    ctx.beginPath();
    ctx.moveTo(toX(T, xEnd), 0);
    ctx.lineTo(toX(T, xEnd), JOINTS.length * rowH - 2);
    ctx.stroke();
    ctx.fillStyle = fgc(0.6);
    ctx.textAlign = 'left';
    ctx.fillText('0', gutter, yA);
    ctx.textAlign = 'center';
    ctx.fillText(`T = ${T.toFixed(2)}s`, toX(T, xEnd), yA);
    ctx.textAlign = 'right';
    ctx.fillText(`${xEnd.toFixed(1)}s`, gutter + plotW, yA);
    ctx.textAlign = 'left';
  };

  // t of null draws the strip with no cursor, for a result nobody is scrubbing.
  const draw = (t, theme) => {
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);
    if (!state || t == null) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const fg = theme?.foreground || [0.11, 0.12, 0.14];
    const rgb = fg.map((v) => Math.round(v * 255)).join(',');
    const x = toX(t, state.xEnd);
    ctx.strokeStyle = `rgba(${rgb},0.85)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, JOINTS.length * rowH - 2);
    ctx.stroke();
  };

  return { element: box, layout, draw, height };
}

// ---------------------------------------------------------------------------
// The storyboard: a technique drawn as what it is, in order -- the pose the
// body starts in, then the K poses it asks for. It takes a list of cells
// rather than a knot matrix, because the first of them is not a knot: it is
// where the body BEGINS, which is a different kind of thing and is drawn as
// one (solid, because at t = 0 the body is actually there).
export function createStoryboard({ n, cols, thumbW, thumbH, view, dpr = 1, onSelect = null }) {
  const K = n;
  const element = document.createElement('div');
  element.style.display = 'grid';
  element.style.gap = '4px';
  element.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  element.style.maxWidth = '640px';
  const cells = [];
  for (let k = 0; k < K; k++) {
    const canvas = document.createElement('canvas');
    canvas.style.width = `${thumbW}px`;
    canvas.style.height = `${thumbH}px`;
    canvas.style.display = 'block';
    canvas.width = Math.round(thumbW * dpr);
    canvas.height = Math.round(thumbH * dpr);
    const cap = document.createElement('div');
    cap.style.cssText = 'font-size:10px; text-align:center; opacity:.7; font-variant-numeric:tabular-nums;';
    let host = canvas.parentElement;
    if (onSelect) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.style.cssText = 'padding:1px; background:none; cursor:pointer;'
        + 'border:1.5px solid transparent; border-radius:4px;';
      btn.append(canvas, cap);
      btn.addEventListener('click', () => onSelect(k));
      element.appendChild(btn);
      host = btn;
    } else {
      const div = document.createElement('div');
      div.style.cssText = 'padding:1px; border:1.5px solid transparent;';
      div.append(canvas, cap);
      element.appendChild(div);
      host = div;
    }
    cells.push({ canvas, cap, host });
  }

  // A request is drawn in the request grey; a body is drawn as a body.
  const tint = requestTint();
  const draw = ({ model, ws, items, sel = -1, theme }) => {
    for (let k = 0; k < K && k < items.length; k++) {
      const it = items[k];
      const ctx = cells[k].canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, thumbW, thumbH);
      drawScene(ctx, {
        clear: false, model, ws, width: thumbW, height: thumbH, theme, view,
        q: it.q, segmentColors: it.solid ? null : tint,
      });
      cells[k].host.style.borderColor = k === sel ? REQUEST_COLOR : 'transparent';
      cells[k].cap.textContent = it.label;
    }
  };
  return { element, draw, cells };
}
