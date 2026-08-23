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
import { evalReference, splineEval, knotTimes } from './control.js';
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
// Derived from the joint list rather than written out, so the figure cannot
// disagree with the model about which channel is which -- which is exactly
// what a hand-written table does the first time a joint is inserted in the
// middle of the order.
const JOINT_LABELS = {
  wrist: 'wrist', shoulder: 'shoulder', spine: 'spine', neck: 'neck',
  hipL: 'hip L', kneeL: 'knee L', hipR: 'hip R', kneeR: 'knee R',
};
export const JOINTS = JOINT_ORDER.map((name, j) => ({ j, qi: 3 + j, label: JOINT_LABELS[name] || name }));

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
  for (let j = 0; j < JOINTS.length; j++) {
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
export function requestPose(model, knots, T, t, out, fracs = null) {
  out.fill(0);
  groundHand(model, out);
  evalReference(knots, T, Math.min(t, T), refVal, refRate,
    fracs ? knotTimes(T, knots[0].length, fracs) : null);
  for (let j = 0; j < JOINTS.length; j++) out[3 + j] = refVal[j];
  return out;
}

// The same technique, said with a different number of poses.
//
// Six poses is a lot of freedom for a movement that lasts two seconds, and
// freedom is not the same as control: every knot is another place the curve
// can kink, and a technique with more knots than the movement has phases is
// harder to smooth by hand than one with fewer. So the count is a setting --
// and changing it REFITS rather than resets. The shape survives; only the
// number of handles on it changes.
//
// The refit is a least-squares projection, not a resampling. Reading the old
// curve at the new knot times and calling those the new knots would be the
// obvious thing, and it is wrong: a Catmull-Rom knot is a point ON the curve,
// so that construction agrees with the original exactly at the new knot times
// and then does whatever the tangent rule says in between -- pinching the
// curve through a handful of samples rather than following it. The result is
// smoothed in a way nobody asked for, and it is not the closest curve the
// coarser spline can draw.
//
// So fit instead. splineEval is linear in its knots, so the curve a knot
// vector c draws at a dense set of times is A c, where column k of A is the
// curve drawn by the unit knot vector e_k. Take the old curve's dense samples
// y and solve min ||A c - y||^2 by normal equations -- A is tall and thin
// (hundreds of rows, at most eight columns), so this is a tiny solve.
//
// The last knot is held fixed rather than fitted: it is the ending pose, the
// one thing in the technique the user set on purpose, and a fit is free to
// move it by a degree to buy accuracy elsewhere. Everything else, including
// the first knot, is free.
//
// Refitting to the same count is the identity to roundoff: the old knots
// already drive the residual to zero, and the normal equations are
// nonsingular, so they are the unique minimizer.
export function resampleKnots(knots, T, newK, fracs = null) {
  const K = Math.max(1, Math.round(newK));
  // The OLD curve is read with the phrasing it was authored in; the new one
  // is fitted evenly spaced. A different number of poses is a different set
  // of instants, so timing you placed by hand cannot survive the change and
  // pretending otherwise would put poses where you did not put them.
  const oldTimes = fracs && fracs.length === knots[0].length
    ? knotTimes(T, knots[0].length, fracs) : null;
  const M = 24 * K + 256;                     // dense enough that the fit is the curve's, not the sampling's
  const basis = [];                           // basis[k][m] = value at t_m of the curve for knots e_k
  const unit = new Float64Array(K);
  for (let k = 0; k < K; k++) {
    const col = new Float64Array(M);
    unit.fill(0); unit[k] = 1;
    for (let m = 0; m < M; m++) col[m] = splineEval(unit, T, (m / (M - 1)) * T).value;
    basis.push(col);
  }
  const n = K - 1;                            // free knots: all but the pinned last one
  if (n <= 0) return knots.map((row) => Float64Array.from([row[row.length - 1]]));

  // The normal matrix depends only on the basis, so it is the same for all six
  // joints; only the right-hand side changes. A whisper of ridge keeps a
  // degenerate basis from exploding instead of leaning on the old knots.
  const normal = [];
  for (let p = 0; p < n; p++) {
    const rowP = new Float64Array(n);
    for (let q = 0; q < n; q++) {
      let s = 0;
      for (let m = 0; m < M; m++) s += basis[p][m] * basis[q][m];
      rowP[q] = s + (p === q ? 1e-9 * M : 0);
    }
    normal.push(rowP);
  }

  const out = [], y = new Float64Array(M), b = new Float64Array(n);
  for (let j = 0; j < JOINTS.length; j++) {
    const row = new Float64Array(K);
    const last = knots[j][knots[j].length - 1];
    row[K - 1] = last;
    for (let m = 0; m < M; m++) {
      y[m] = splineEval(knots[j], T, (m / (M - 1)) * T, oldTimes).value - last * basis[K - 1][m];
    }
    for (let p = 0; p < n; p++) {
      let s = 0;
      for (let m = 0; m < M; m++) s += basis[p][m] * y[m];
      b[p] = s;
    }
    solveInPlace(normal.map((r) => Float64Array.from(r)), b, n);
    for (let p = 0; p < n; p++) row[p] = b[p];
    out.push(row);
  }
  return out;
}

// Gaussian elimination with partial pivoting; n is at most seven here.
function solveInPlace(A, b, n) {
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    if (piv !== c) { const t = A[piv]; A[piv] = A[c]; A[c] = t; const u = b[piv]; b[piv] = b[c]; b[c] = u; }
    const d = A[c][c];
    if (Math.abs(d) < 1e-300) continue;
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / d;
      if (!f) continue;
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < n; k++) s -= A[r][k] * b[k];
    b[r] = Math.abs(A[r][r]) < 1e-300 ? 0 : s / A[r][r];
  }
}

// The same, for a knot taken directly rather than sampled off the spline.
export function knotPose(model, knots, k, out) {
  out.fill(0);
  groundHand(model, out);
  for (let j = 0; j < JOINTS.length; j++) out[3 + j] = knots[j][k];
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
  // The phrasing the run was produced with, read off the run rather than
  // assumed even: a technique whose poses are unevenly spaced tracks a
  // different reference, and scoring it against an even one would report a
  // tracking error the servo was never asked for.
  const refTimes = run.knotFracs && run.knotFracs.length === run.knots[0].length
    ? knotTimes(run.T, run.knots[0].length, run.knotFracs) : null;
  let n = 0, pos = 0, neg = 0;
  for (let k = 0; k < rec.t.length; k++) {
    const dts = k > 0 ? rec.t[k] - rec.t[k - 1] : 0;
    evalReference(run.knots, run.T, Math.min(rec.t[k], run.T), v, r, refTimes);
    const driving = rec.t[k] <= run.T;
    if (driving) n++;
    for (let j = 0; j < JOINTS.length; j++) {
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
// Two lines, each of which refuses to wrap.
//
// As one line it was a sentence whose width changed with its own numbers: a
// digit more of work, or a difference appearing against the baseline, and it
// wrapped or unwrapped and everything under it jumped. In the floating panel,
// which is half the width of the column, it did that constantly. Splitting the
// verdict from the number gives the block a height that does not depend on
// what it says, and tabular figures stop the number itself twitching.
export function verdictHTML(stats, baseline = null) {
  const ok = stats.verdict.success;
  const delta = (now, was, digits) => {
    if (was == null) return '';
    const d = now - was;
    if (Math.abs(d) < 5 * 10 ** -(digits + 1)) return '';
    return `<span style="opacity:.85; color:${d < 0 ? '#2e8b57' : '#c0392b'}">`
      + ` (${d >= 0 ? '+' : ''}${d.toFixed(digits)})</span>`;
  };
  const line = 'display:block; white-space:nowrap; overflow:hidden;'
    + ' text-overflow:ellipsis; font-variant-numeric:tabular-nums;';
  // "body-height lifts" was the unit talking to itself. The number is
  // metabolic energy over m g h -- what the movement costs, in multiples of
  // the cost of raising your own body its own height -- so it says that, in a
  // currency a reader already owns: climbing.
  const why = 'the energy the muscles spend, counted as a multiple of what it '
    + 'takes to raise your own body its own height. Positive work is charged at '
    + 'a quarter efficiency and negative work credited at 1.2, as muscle is. '
    + 'The bracketed number compares with this technique as stored: '
    + 'negative is cheaper.';
  return `<span style="${line}"><strong style="color:${ok ? '#2e8b57' : '#c0392b'}">`
    + `${ok ? '✓ reaches a handstand' : '✗ does not arrive'}</strong></span>`
    + `<span style="${line}" title="${why}">as much energy as climbing `
    + `${stats.metab.toFixed(2)} × your height`
    + delta(stats.metab, baseline?.metab, 2) + '</span>';
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
export function createStrip({
  width: width0, rowH = 18, gutter = 58, dpr = 1, onSeek = null,
  // Dragging a pose along the timeline. onKnotDrag(k, frac, settled) is called
  // with the pose's index, where it now sits as a fraction of the duration,
  // and whether the finger has come off -- so a caller can redraw during the
  // gesture and re-simulate only once, at the end. onKnotPick(k) fires on grab
  // so the figure can select the pose you took hold of. The first and last
  // poses are the two ends of the movement and do not move; everything
  // between them does.
  onKnotDrag = null, onKnotPick = null,
  // The transport. A timeline that can be scrubbed but not played, next to a
  // Play button living in a panel somewhere else, is two halves of one control
  // -- so the button belongs here, on the thing it moves. onPlay(next) is
  // called with the state being asked for; the caller owns the clock and calls
  // back through setPlaying, so the button never disagrees with the animation.
  onPlay = null,
}) {
  const height = JOINTS.length * rowH + 20;
  let width = width0;
  let plotW = width - gutter - 6;
  const canvas = document.createElement('canvas');
  canvas.style.height = `${height}px`;
  canvas.style.display = 'block';
  canvas.height = Math.round(height * dpr);
  const base = document.createElement('canvas');
  base.height = canvas.height;

  const toX = (t, xEnd) => gutter + Math.min(Math.max(t / xEnd, 0), 1) * plotW;
  let state = null;
  // The last thing drawn, kept so a resize can redraw it. The raster behind
  // this strip is computed per simulation, not per frame, so a width change
  // has to re-run that rather than stretch what is already there.
  let lastLayout = null;

  const box = document.createElement('div');
  // On the outer HTML container, not the canvas: without it a touch drag both
  // scrolls the page and dies mid-gesture, because scrolling fires
  // pointercancel.
  box.style.touchAction = 'none';

  // ---- transport ----------------------------------------------------------
  // Drawn rather than typed, for the reason the padlock is: an emoji is a
  // full-colour picture in a figure whose palette is one grey, one blue-to-red
  // ramp and one orange.
  const ICON_PLAY = 'M4.6 3.1 L11.4 7 L4.6 10.9 Z';
  const ICON_PAUSE = 'M4.4 3.1 h2.1 v7.8 h-2.1 Z M8.5 3.1 h2.1 v7.8 h-2.1 Z';
  let playBtn = null, playPath = null, timeEl = null, playing = false, transport = null;
  if (onPlay) {
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex; align-items:center; gap:8px; min-height:26px;'
      + 'margin:0 0 7px; flex-wrap:wrap; row-gap:6px;';
    playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'hs-btn hs-btn--icon';
    // Sized to whatever else lands on this bar, so the transport and the
    // search buttons sit on one baseline instead of one being a control and
    // the other a smaller thing next to it.
    playBtn.style.cssText = 'width:30px; height:26px; display:grid; place-items:center; padding:0;';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 15 14');
    svg.setAttribute('width', '13'); svg.setAttribute('height', '12');
    playPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    playPath.setAttribute('fill', 'currentColor');
    playPath.setAttribute('d', ICON_PLAY);
    svg.appendChild(playPath);
    playBtn.appendChild(svg);
    playBtn.addEventListener('click', () => onPlay(!playing));
    // The playhead's own reading, beside the control that moves it. Tabular,
    // because a number that changes width as it counts is a number that
    // twitches.
    timeEl = document.createElement('span');
    timeEl.style.cssText = 'font-size:11px; opacity:.7; font-variant-numeric:tabular-nums;'
      + 'min-width:4.2em;';
    bar.append(playBtn, timeEl);
    box.appendChild(bar);
    transport = bar;
  }
  const setPlaying = (next) => {
    playing = !!next;
    if (!playBtn) return;
    playPath.setAttribute('d', playing ? ICON_PAUSE : ICON_PLAY);
    playBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    playBtn.setAttribute('aria-label', playing ? 'pause' : 'play');
    playBtn.title = playing ? 'pause' : 'play the movement';
  };
  setPlaying(false);

  box.appendChild(canvas);
  // How close to a pose's line counts as grabbing it rather than scrubbing.
  const GRAB_PX = 6;
  // How close two poses may sit. The reference rate between them goes as one
  // over the gap, so zero would be a step the servo is asked to track in no
  // time at all; two per cent of the duration is a snap and still a number.
  const MIN_GAP = 0.02;
  if (onSeek || onKnotDrag) {
    canvas.style.cursor = 'col-resize';
    let seeking = null, dragging = -1, lastFrac = 0;
    const atX = (e) => {
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) * (width / (r.width || width));
      return Math.min(Math.max((x - gutter) / plotW, 0), 1);
    };
    // Which movable pose, if any, is under the pointer.
    const grab = (e) => {
      if (!onKnotDrag || !state?.knotTimes?.length) return -1;
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) * (width / (r.width || width));
      let best = -1, bestD = GRAB_PX;
      for (let k = 1; k < state.knotTimes.length - 1; k++) {
        const d = Math.abs(toX(state.knotTimes[k], state.xEnd) - x);
        if (d <= bestD) { bestD = d; best = k; }
      }
      return best;
    };
    const dragTo = (e) => {
      const K = state.knotTimes.length;
      const lo = (state.knotTimes[dragging - 1] / state.T) + MIN_GAP;
      const hi = (dragging + 1 < K ? state.knotTimes[dragging + 1] / state.T : 1) - MIN_GAP;
      const frac = (atX(e) * state.xEnd) / state.T;
      lastFrac = Math.min(Math.max(frac, lo), Math.min(hi, 1 - MIN_GAP));
      onKnotDrag(dragging, lastFrac, false);
    };
    canvas.addEventListener('pointerdown', (e) => {
      seeking = e.pointerId;
      canvas.setPointerCapture?.(e.pointerId);
      dragging = grab(e);
      if (dragging > 0) {
        lastFrac = state.knotTimes[dragging] / state.T;
        onKnotPick?.(dragging);
      } else onSeek?.(atX(e) * state.xEnd);
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (seeking !== e.pointerId) {
        // Not dragging: say whether a grab is available here.
        canvas.style.cursor = grab(e) > 0 ? 'ew-resize' : 'col-resize';
        return;
      }
      if (dragging > 0) dragTo(e); else onSeek?.(atX(e) * state.xEnd);
    });
    const stop = (e) => {
      if (seeking !== e.pointerId) return;
      canvas.releasePointerCapture?.(e.pointerId);
      seeking = null;
      // The physics re-runs here and not before. Re-simulating mid-gesture
      // moves the body under the finger, which is the same reason dragging a
      // limb waits for the release.
      if (dragging > 0) onKnotDrag(dragging, lastFrac, true);
      dragging = -1;
    };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
  }

  // Everything that does not move goes into an offscreen canvas once per
  // simulation; the cursor is the only thing redrawn per frame.
  const layout = (args) => {
    lastLayout = args;
    const { run, prof, rom, T, xEnd, theme, knotTimes = [], locks = null } = args;
    state = { xEnd, T, knotTimes };
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
    // the storyboard and the timeline are one picture. The ones you can slide
    // carry a grip at the foot of the line; the two ends of the movement do
    // not, because they are the ends.
    // A bold upright is a RELEASED instant. The line is a time, so what it
    // should report is the time question -- and since a pose is pinned unless
    // you say otherwise, drawing the pinned ones boldly would put a heavy mark
    // on every upright and distinguish nothing. Marked means you handed this
    // one to the search, which is the same rule the caption under the frame
    // follows.
    const rows = JOINTS.length * rowH - 2;
    knotTimes.forEach((kt, k) => {
      const freed = locks ? !locks[k] : false;
      const x = Math.round(toX(kt, xEnd)) + 0.5;
      ctx.strokeStyle = freed ? fgc(0.75) : fgc(0.32);
      ctx.lineWidth = freed ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rows);
      ctx.stroke();
      if (onKnotDrag && k > 0 && k < knotTimes.length - 1) {
        ctx.fillStyle = fgc(freed ? 0.75 : 0.4);
        ctx.beginPath();
        ctx.moveTo(x - 3.5, rows);
        ctx.lineTo(x + 3.5, rows);
        ctx.lineTo(x, rows - 5);
        ctx.closePath();
        ctx.fill();
      }
    });

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
    // A head on the playhead. The poses carry grips at the FOOT of their
    // uprights, so putting this at the top keeps the two kinds of handle from
    // reading as each other -- and a bare line does not say it can be dragged,
    // which this one has always been able to be.
    ctx.fillStyle = `rgba(${rgb},0.85)`;
    ctx.beginPath();
    ctx.moveTo(x - 4, 0);
    ctx.lineTo(x + 4, 0);
    ctx.lineTo(x, 5.5);
    ctx.closePath();
    ctx.fill();
    if (timeEl) timeEl.textContent = `${t.toFixed(2)}s`;
  };

  // Give the strip a new width and redraw what it was last showing.
  const resize = (w) => {
    width = Math.max(gutter + 40, Math.round(w));
    plotW = width - gutter - 6;
    canvas.style.width = `${width}px`;
    canvas.width = Math.round(width * dpr);
    base.width = canvas.width;
    if (lastLayout) layout(lastLayout);
  };
  resize(width0);

  // transport is the bar the play button sits on, handed back so a caller can
  // put the rest of the actions on the same line rather than in a panel
  // somewhere else -- which is the whole point of the button being here.
  return { element: box, layout, draw, resize, setPlaying, transport, height };
}

// ---------------------------------------------------------------------------
// The storyboard: a technique drawn as what it is, in order -- the pose the
// body starts in, then the K poses it asks for. It takes a list of cells
// rather than a knot matrix, because the first of them is not a knot: it is
// where the body BEGINS, which is a different kind of thing and is drawn as
// one (solid, because at t = 0 the body is actually there).
// canLock(k) says whether cell k has a lock at all and, if it does, whether
// the reader may work it. The start pose has none -- it is where the body
// begins, not something the search was ever free to move -- and the ending
// pose is permanently locked, because being the pose the technique aims at is
// what "ending pose" means.
//
// canDelete(k) and canInsertBefore(k) do the same for the other two edits. A
// pose count is a thing you arrive at rather than dial: dropping the one pose
// that is not earning its place, or adding one where the curve needs a handle,
// says what you mean in a way that "6" does not.
export function createStoryboard({
  n, cols: cols0, thumbW: thumbW0, thumbH: thumbH0, view, dpr = 1, onSelect = null,
  onLock = null, canLock = null, onDelete = null, canDelete = null,
  onInsert = null, canInsertBefore = null,
  // Pinning a pose to its instant. It hangs off the time already printed
  // under the frame rather than arriving as a second padlock in the corner:
  // the thing being pinned is the number you can see, and a frame 70 pixels
  // wide has no room for another button anyway.
  onTimeLock = null, canTimeLock = null,
  // A ceiling on how tall a frame gets. Without one the row grows with the
  // figure: expanded, seven thumbnails across 1400px are 170px tall, and a
  // storyboard taking more vertical room than the movement it summarizes is
  // the wrong way round. Past this the frames stop growing and the row stays
  // about as deep as the timeline under it.
  maxThumbH = 110,
}) {
  let K = n;
  const ASPECT = thumbW0 / thumbH0;
  let cols = cols0, thumbW = thumbW0, thumbH = thumbH0;
  const element = document.createElement('div');
  element.style.display = 'grid';
  // Column gap stays tight -- the insert affordance is measured from it -- but
  // a row that wraps needs to read as a new row rather than a crease.
  element.style.columnGap = '4px';
  element.style.rowGap = '10px';
  element.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  element.style.maxWidth = '640px';
  const cells = [];
  const cellLocks = [];
  // Closed, and open: the shackle's right leg leaves the body rather than the
  // whole glyph changing, so the two states are one object in two positions.
  const SHUT = 'M3.4 6.4V4.3a2.6 2.6 0 0 1 5.2 0v2.1';
  const OPEN = 'M3.4 6.4V4.3a2.6 2.6 0 0 1 5.2 0';

  const svgIcon = (paths, box = '0 0 12 14', w = 11, h = 13) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', box);
    svg.setAttribute('width', w); svg.setAttribute('height', h);
    for (const d of paths) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      el.setAttribute('d', d);
      el.setAttribute('fill', 'none');
      el.setAttribute('stroke', 'currentColor');
      el.setAttribute('stroke-width', '1.6');
      el.setAttribute('stroke-linecap', 'round');
      svg.appendChild(el);
    }
    return svg;
  };
  const corner = (side) => 'position:absolute; top:2px; ' + side + ':2px; width:18px; height:18px;'
    + 'padding:0; display:grid; place-items:center; border-radius:4px; background:none;'
    + 'border:1px solid transparent; color:currentColor;';

  function buildCell(k) {
    const canvas = document.createElement('canvas');
    canvas.style.width = `${thumbW}px`;
    canvas.style.height = `${thumbH}px`;
    canvas.style.display = 'block';
    canvas.width = Math.round(thumbW * dpr);
    canvas.height = Math.round(thumbH * dpr);
    const cap = document.createElement('div');
    cap.style.cssText = 'font-size:10px; text-align:center; opacity:.7; font-variant-numeric:tabular-nums;';
    const capName = document.createElement('span');
    const pinnable = onTimeLock && (canTimeLock ? canTimeLock(k) : false);
    // A button only where it does something. The ends of the movement have
    // instants by definition -- 0 and T -- so theirs is a reading, not a
    // control, and it stays plain text.
    const capTime = document.createElement(pinnable ? 'button' : 'span');
    if (pinnable) {
      capTime.type = 'button';
      capTime.style.cssText = 'font: inherit; font-variant-numeric:tabular-nums; color:inherit;'
        + 'background:none; border:none; border-bottom:1.5px solid transparent; padding:0 1px;'
        + 'margin:0; cursor:pointer; line-height:1;';
      capTime.addEventListener('click', (e) => { e.stopPropagation(); onTimeLock(k); });
    }
    cap.append(capName, capTime);
    // A div rather than a button, because the controls on it are buttons and a
    // button inside a button is not a thing. It still behaves like one:
    // pointer, keyboard, and a name for a screen reader.
    const host = document.createElement('div');
    // border-box, because resize() gives this an explicit width: the ring that
    // marks the selected cell is 1.5px of border over 1px of padding, and five
    // pixels a column of unaccounted chrome walked the last frame off the
    // right-hand edge of the figure.
    host.style.cssText = 'position:relative; padding:1px; border:1.5px solid transparent;'
      + 'border-radius:4px; box-sizing:border-box; width:' + (thumbW + 5) + 'px;'
      + (onSelect ? ' cursor:pointer;' : '');
    host.append(canvas, cap);
    if (onSelect) {
      host.tabIndex = 0;
      host.setAttribute('role', 'button');
      host.addEventListener('click', () => onSelect(k));
      host.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(k); }
      });
    }

    let lockBtn = null, shackle = null;
    const lockable = canLock ? canLock(k) : null;
    if (onLock && lockable) {
      lockBtn = document.createElement('button');
      lockBtn.type = 'button';
      lockBtn.style.cssText = corner('right') + (lockable === 'fixed' ? ' cursor:default;' : ' cursor:pointer;');
      // Drawn rather than typed. The obvious padlock is an emoji, and an emoji
      // is a full-colour picture in a figure whose whole palette is one grey,
      // one blue-to-red ramp and one orange -- it reads as a sticker stuck on
      // the storyboard rather than a control belonging to it.
      const svg = svgIcon([SHUT]);
      shackle = svg.querySelector('path');
      const body = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      body.setAttribute('x', '1.4'); body.setAttribute('y', '6.4');
      body.setAttribute('width', '9.2'); body.setAttribute('height', '6.6');
      body.setAttribute('rx', '1.5'); body.setAttribute('fill', 'currentColor');
      svg.appendChild(body);
      lockBtn.appendChild(svg);
      if (lockable !== 'fixed') {
        lockBtn.addEventListener('click', (e) => { e.stopPropagation(); onLock(k); });
      } else {
        lockBtn.disabled = true;
      }
      host.appendChild(lockBtn);
    }

    let delBtn = null;
    if (onDelete && (canDelete ? canDelete(k) : false)) {
      delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.style.cssText = corner('left') + ' cursor:pointer; opacity:.3;';
      delBtn.appendChild(svgIcon(['M3 3l7 7', 'M10 3l-7 7'], '0 0 13 13', 10, 10));
      delBtn.title = 'drop this pose. The others keep their shapes and their '
        + 'timing exactly -- nothing is refitted.';
      delBtn.setAttribute('aria-label', 'delete this pose');
      delBtn.addEventListener('mouseenter', () => { delBtn.style.opacity = '0.95'; });
      delBtn.addEventListener('mouseleave', () => { delBtn.style.opacity = '0.3'; });
      delBtn.addEventListener('click', (e) => { e.stopPropagation(); onDelete(k); });
      host.appendChild(delBtn);
    }

    // The boundary before this cell: a faint rule that is always there, and a
    // plus on it that appears when you reach for it. The rule is what makes the
    // gap a place rather than a space -- without it the plus arrives from
    // nowhere and belongs to neither neighbour.
    let insBtn = null, insLine = null, insIcon = null;
    if (onInsert && (canInsertBefore ? canInsertBefore(k) : false)) {
      insLine = document.createElement('div');
      insLine.style.cssText = 'position:absolute; top:0; width:1px; background:currentColor;'
        + 'opacity:.13; pointer-events:none;';
      host.appendChild(insLine);

      insBtn = document.createElement('button');
      insBtn.type = 'button';
      // The hit area sits below the corner buttons rather than through them.
      // Full height, it lay on top of this cell's delete and under the previous
      // cell's lock, and three controls in one corner is three nobody can hit.
      insBtn.style.cssText = 'position:absolute; padding:0; border:none; background:none;'
        + 'cursor:copy; display:grid; place-items:center; z-index:2; color:currentColor;';
      insIcon = svgIcon(['M6.5 2v9', 'M2 6.5h9'], '0 0 13 13', 11, 11);
      insIcon.style.opacity = '0';
      insBtn.appendChild(insIcon);
      insBtn.title = 'add a pose here. Its angles are read off the curve you '
        + 'already have, so the movement does not change -- you just gain a handle on it.';
      insBtn.setAttribute('aria-label', 'add a pose here');
      const show = () => { insIcon.style.opacity = '1'; insLine.style.opacity = '.4'; };
      const hide = () => { insIcon.style.opacity = '0'; insLine.style.opacity = '.13'; };
      insBtn.addEventListener('mouseenter', show);
      insBtn.addEventListener('mouseleave', hide);
      insBtn.addEventListener('focus', show);
      insBtn.addEventListener('blur', hide);
      insBtn.addEventListener('click', (e) => { e.stopPropagation(); onInsert(k); });
      host.appendChild(insBtn);
    }

    element.appendChild(host);
    cells.push({ canvas, cap, capName, capTime, pinnable, host, lockBtn, delBtn, insBtn, insLine, insIcon });
    cellLocks.push(shackle);
  }

  function buildAll() {
    element.replaceChildren();
    cells.length = 0;
    cellLocks.length = 0;
    for (let k = 0; k < K; k++) buildCell(k);
  }
  buildAll();

  // A different number of cells, in the same element. Rebuilding the whole
  // figure to change the pose count meant every control was recreated and the
  // reader's place in it lost; only the storyboard actually depends on the
  // count.
  const setCount = (nextN) => {
    if (nextN === K) return;
    K = nextN;
    buildAll();
    resize(lastWidth, colsFor ? colsFor(lastWidth) : cols);
  };

  let lastWidth = 640;
  let colsFor = null;
  const setColsFor = (fn) => { colsFor = fn; };

  const GAP = 4;
  const CHROME = 5;                           // the host's own border + padding
  // Lay the storyboard out at a new width. Expanded, the figure is several
  // times wider than the column, and a row of thumbnails that stayed
  // column-sized would leave the space it was given empty.
  function resize(w, colCount = cols) {
    lastWidth = w;
    cols = Math.max(1, colCount);
    const cellW = Math.max(40, Math.floor((w - (cols - 1) * GAP) / cols));
    const room = Math.max(24, cellW - CHROME);
    // Fill the column until the frame hits its ceiling, then hold that size and
    // let the grid space them out instead. The cell is narrowed to the frame
    // rather than the frame centred in the cell, so the lock stays on the
    // frame's own corner instead of drifting off to the column's edge.
    thumbH = Math.min(maxThumbH, Math.round(room / ASPECT));
    thumbW = Math.min(room, Math.round(thumbH * ASPECT));
    element.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    element.style.justifyItems = 'center';
    element.style.maxWidth = `${Math.round(w)}px`;
    const hostW = thumbW + CHROME;
    for (const c of cells) {
      c.host.style.width = `${hostW}px`;
      c.canvas.style.width = `${thumbW}px`;
      c.canvas.style.height = `${thumbH}px`;
      c.canvas.width = Math.round(thumbW * dpr);
      c.canvas.height = Math.round(thumbH * dpr);
    }

    // Where the boundary actually falls, MEASURED. The host is narrower than
    // its grid column once the frames stop growing and is centred in it, so the
    // gap between two frames is the leftover on both sides plus the grid gap --
    // not the 4px the gap property names, and not quite what arithmetic on a
    // floored column width says either. Anchoring to the host's own edge put
    // the plus hard against the right-hand frame; computing the gutter put it
    // a pixel and a half off centre. Reading it back is exact.
    const fallback = Math.max(GAP, cellW - hostW + GAP);
    const rect = cells.map((c) => c.host.getBoundingClientRect());
    for (let k = 0; k < cells.length; k++) {
      const c = cells[k];
      if (!c.insLine && !c.insBtn) continue;
      // This gap, not the average of them: 1fr columns round to sub-pixels
      // independently, so the gutters differ by up to a pixel across the row.
      let gutter = fallback;
      if (k > 0 && rect[k].left > rect[k - 1].right && Math.abs(rect[k].top - rect[k - 1].top) < 1) {
        gutter = rect[k].left - rect[k - 1].right;
      }
      const mid = -gutter / 2;
      const hitW = Math.max(14, Math.min(22, gutter + 8));
      if (c.insLine) {
        // Its own width taken off, so the LINE is centred rather than its left
        // edge sitting on the middle.
        c.insLine.style.left = `${mid - 0.5}px`;
        c.insLine.style.height = `${thumbH}px`;
      }
      if (c.insBtn) {
        c.insBtn.style.left = `${mid - hitW / 2}px`;
        c.insBtn.style.width = `${hitW}px`;
        c.insBtn.style.top = '22px';
        c.insBtn.style.height = `${Math.max(10, thumbH - 22)}px`;
      }
    }
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
      const c = cells[k];
      c.capName.textContent = it.time == null ? it.label : `${it.label} · `;
      c.capTime.textContent = it.time == null ? '' : it.time;
      if (c.pinnable) {
        // Lit means you changed something here, which is the rule the padlock
        // follows too -- and since a pose starts pinned, the lit state is the
        // released one. Pinned sits quiet over a dotted rule whose only job is
        // to say the number can be clicked at all; the ends, which have no
        // choice about their instants, get no rule.
        c.capTime.style.opacity = it.timeLocked ? '0.5' : '1';
        c.capTime.style.borderBottomStyle = it.timeLocked ? 'dotted' : 'solid';
        c.capTime.style.borderBottomColor = it.timeLocked ? 'currentColor' : REQUEST_COLOR;
        c.capTime.setAttribute('aria-pressed', it.timeLocked ? 'true' : 'false');
        c.capTime.setAttribute('aria-label', it.timeLocked
          ? 'pinned in time; let the search move this pose'
          : 'free in time; pin this pose');
        c.capTime.title = it.timeLocked
          ? 'pinned: the search may not move this pose in time. Click to let it.'
          : 'free: the search may slide this pose along the timeline. Click to pin it.';
      }
      const btn = cells[k].lockBtn;
      if (btn) {
        cellLocks[k]?.setAttribute('d', it.locked ? SHUT : OPEN);
        btn.style.opacity = it.locked ? '0.9' : '0.3';
        btn.style.borderColor = it.locked ? REQUEST_COLOR : 'transparent';
        btn.setAttribute('aria-pressed', it.locked ? 'true' : 'false');
        btn.setAttribute('aria-label', it.locked ? 'held; release this pose' : 'free; hold this pose');
        btn.title = btn.disabled
          ? 'the pose the technique ends in — always held'
          : it.locked ? 'held: the search may not move this pose' : 'free: the search may move this pose';
      }
    }
  };
  return { element, draw, resize, setCount, setColsFor, cells, get count() { return K; } };
}
