// How body proportions change a handstand, at fixed stature and mass.
//
// Two numbers per body, chosen to answer two different questions:
//
//   balance   how big a shove the wrist can catch. Linearised about the
//             stacked handstand the body is an inverted pendulum pivoting at
//             the wrist, and the CoM's horizontal position x obeys
//
//                 x'' = w^2 (x - u),   w^2 = g h / (h^2 + k^2),
//
//             with h the CoM height above the wrist, k the radius of gyration
//             about the CoM, and u the centre of pressure, confined to the
//             palm. The capture point x + v/w has to stay on the palm, so
//             starting balanced a CoM velocity v is recoverable while
//             v < a w, a the distance from the CoM to the fingertips. A
//             reaction delay d lets the capture point run away for d seconds
//             first, which costs a factor exp(-w d):
//
//                 v_max = a w exp(-w d).
//
//   press     the least shoulder torque a straight-leg press can get away
//             with at its hardest moment, from a pike at 100 degrees of hip
//             flexion up to the stack. For each hip angle, the shoulder
//             angle that balances the CoM over the palm with the smallest
//             shoulder torque; the press is as hard as the worst hip angle.
//             In units of N m per kg of body mass, the units the strength
//             slider speaks. It is a STATIC lower bound -- a real press
//             also has to accelerate the legs -- so its size means less than
//             how it moves between bodies.
//
// No npm imports here: the notebook injects Plot.

import { buildModel, legMassShare, proportionedTable, tableLegFrac } from './anthropometry.js';
import { createWorkspace, momenta, rnea } from './dynamics.js';
import { groundHand, solveWristForCom, wristQ3LimitsDeg, QI, ROM_DEFAULTS } from './statics.js';
import { balancedHandstand, HANDSTAND_TARGET_FRAC } from './rollout.js';
import { drawScene, drawGhosts, viewTransform } from './render.js';

// The reference body, wherever one is drawn behind another.
export const GHOST_COLOR = '#d9622b';

const D2R = Math.PI / 180;
export const REACTION_DELAY_S = 0.15;

export function balanceMetrics(model, ws = createWorkspace(model), { delay = REACTION_DELAY_S } = {}) {
  const q = balancedHandstand(model, ws);
  const qStack = q.slice();
  const mo = momenta(model, q, null, ws);
  // The wrist is the forearm's origin.
  const wx = ws.px[1], wy = ws.py[1];
  let I = 0;
  for (let i = 0; i < model.nb; i++) {
    const x = ws.px[i] + ws.rcx[i] - mo.comX, y = ws.py[i] + ws.rcy[i] - mo.comY;
    I += model.inertia[i] + model.mass[i] * (x * x + y * y);
  }
  const h = Math.hypot(mo.comX - wx, mo.comY - wy);
  const k = Math.sqrt(I / mo.mass);
  const Leq = h + (k * k) / h;
  const w = Math.sqrt(model.gravity / Leq);
  const a = q[0] + model.patch.x1 - mo.comX;   // CoM to fingertips
  return { h, k, Leq, w, a, vMax: a * w * Math.exp(-w * delay), q: qStack };
}

export function pressMetric(model, ws = createWorkspace(model), {
  hipLoDeg = 0, hipHiDeg = 100, hipStepDeg = 10,
  shoulderLoDeg = -ROM_DEFAULTS.shoulderHyperDeg, shoulderHiDeg = 80, shoulderStepDeg = 7,
} = {}) {
  // The wrist has to stay inside its range too, or the cheapest press is one
  // that leans out over the fingers further than a wrist bends.
  const wl = wristQ3LimitsDeg(ROM_DEFAULTS);
  const q = new Float64Array(model.nq), z = new Float64Array(model.nq), tau = new Float64Array(model.nq);
  const tx = model.patch.x0 + HANDSTAND_TARGET_FRAC * (model.patch.x1 - model.patch.x0);
  const torqueAt = (hip, sh) => {
    q.fill(0); groundHand(model, q);
    q[QI.shoulder] = sh * D2R; q[QI.hipL] = q[QI.hipR] = hip * D2R;
    const w = solveWristForCom(model, q, ws, tx);
    if (Number.isNaN(w) || w < wl.lo * D2R || w > wl.hi * D2R) return Infinity;
    q[3] = w;
    rnea(model, q, z, z, tau, null, { ws });
    return Math.abs(tau[QI.shoulder]);
  };
  let worst = 0, worstHip = 0, worstSh = 0;
  for (let hip = hipLoDeg; hip <= hipHiDeg + 1e-9; hip += hipStepDeg) {
    // Coarse scan, then a golden-section polish around the best cell.
    let best = Infinity, bestSh = shoulderLoDeg;
    for (let sh = shoulderLoDeg; sh <= shoulderHiDeg + 1e-9; sh += shoulderStepDeg) {
      const t = torqueAt(hip, sh);
      if (t < best) { best = t; bestSh = sh; }
    }
    let lo = Math.max(shoulderLoDeg, bestSh - shoulderStepDeg);
    let hi = Math.min(shoulderHiDeg, bestSh + shoulderStepDeg);
    const g = (Math.sqrt(5) - 1) / 2;
    for (let i = 0; i < 12; i++) {
      const m1 = hi - g * (hi - lo), m2 = lo + g * (hi - lo);
      if (torqueAt(hip, m1) < torqueAt(hip, m2)) hi = m2; else lo = m1;
    }
    const polished = torqueAt(hip, 0.5 * (lo + hi));
    if (polished < best) { best = polished; bestSh = 0.5 * (lo + hi); }
    if (best > worst) { worst = best; worstHip = hip; worstSh = bestSh; }
  }
  // The pose itself, so a figure can draw the moment the number is about.
  torqueAt(worstHip, worstSh);
  return { nmPerKg: worst / model.massKg, hipDeg: worstHip, shoulderDeg: worstSh, q: q.slice() };
}

// Both metrics for a body given by its parameters.
export function bodyMetrics(params) {
  const model = buildModel(params);
  const ws = createWorkspace(model);
  return { model, ws, ...balanceMetrics(model, ws), press: pressMetric(model, ws) };
}

// The grid over leg length and leg mass, as percent change relative to the
// table body of the same height, mass and sex.
export function proportionGrid({ heightM = 1.75, massKg = 70, sex = 'male',
  legFracs = range(0.47, 0.57, 11), legMassScales = range(0.7, 1.4, 8) } = {}) {
  // Both metrics are ratios to the table body, and both are (almost) scale
  // free: every length goes with stature and every mass with body mass, so
  // the percentages hardly move with height or weight. Only the reaction
  // delay sets a time scale, and it moves the balance column by a tenth of a
  // percent across the height slider. The grid is therefore computed per sex.
  const base = bodyMetrics({ heightM, massKg, sex });
  const cells = [];
  for (const legFrac of legFracs) {
    for (const legMassScale of legMassScales) {
      const m = bodyMetrics({ heightM, massKg, sex, legFrac, legMassScale });
      cells.push({
        legPct: 100 * legFrac, legMassScale,
        share: 100 * m.model.legMassShare,
        balance: 100 * (m.vMax / base.vMax - 1),
        press: 100 * (m.press.nmPerKg / base.press.nmPerKg - 1),
      });
    }
  }
  return { base, cells, legFracs, legMassScales };
}

// The same grid, a row at a time with a yield to the browser between rows, so
// two seconds of statics do not freeze the page on load.
export async function proportionGridAsync(opts = {}, { yieldFn = () => new Promise((r) => setTimeout(r, 0)) } = {}) {
  const { heightM = 1.75, massKg = 70, sex = 'male',
    legFracs = range(0.47, 0.57, 11), legMassScales = range(0.7, 1.4, 8) } = opts;
  const base = bodyMetrics({ heightM, massKg, sex });
  const cells = [];
  for (const legFrac of legFracs) {
    await yieldFn();
    for (const legMassScale of legMassScales) {
      const m = bodyMetrics({ heightM, massKg, sex, legFrac, legMassScale });
      cells.push({
        legPct: 100 * legFrac, legMassScale,
        share: 100 * m.model.legMassShare,
        balance: 100 * (m.vMax / base.vMax - 1),
        press: 100 * (m.press.nmPerKg / base.press.nmPerKg - 1),
      });
    }
  }
  return { base, cells, legFracs, legMassScales };
}

// A canvas that draws one body in a pose over the flat outline of another,
// so a change of proportion shows up as the sliver of colour where the two
// differ. The title and value lines are the panel's to fill.
export function createBodyPanel(html, { w = 200, h = 280 } = {}) {
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d');
  const title = html`<div style="font-weight:600; font-size:13px;"></div>`;
  const value = html`<div style="font-size:13px; line-height:1.35; min-height:4.1em; font-variant-numeric:tabular-nums;"></div>`;
  const element = html`<div style="width:${w}px; flex:0 0 auto;">${title}${canvas}${value}</div>`;
  return {
    element, title, value,
    // body and ghost are { model, ws, q }; ghost is optional.
    draw({ body, ghost = null, theme = null, view }) {
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);
      if (ghost) {
        drawGhosts(ctx, { model: ghost.model, ws: ghost.ws, poses: [{ q: ghost.q }],
          width: w, height: h, theme, view, alpha: 0.55, color: GHOST_COLOR });
      }
      drawScene(ctx, { model: body.model, ws: body.ws, q: body.q, width: w, height: h, theme, view, clear: false });
      // In a stack the two outlines nearly coincide -- same stature -- and
      // what moved is inside them: the hip, and the centre of mass. Mark both
      // for each body, the reference in its colour on top.
      const { toX, toY } = viewTransform(w, h, view);
      const marks = (b, color) => {
        const mo = momenta(b.model, b.q, null, b.ws);
        const hip = b.model.bodies.thighL;
        const hx = b.ws.px[hip], hy = b.ws.py[hip];
        ctx.strokeStyle = color; ctx.lineWidth = 2;
        // The hip: a short bar across the body at the joint.
        const th = b.ws.th[hip] + Math.PI / 2;
        const r = 0.07 * b.model.heightM;
        ctx.beginPath();
        ctx.moveTo(toX(hx - r * Math.cos(th)), toY(hy - r * Math.sin(th)));
        ctx.lineTo(toX(hx + r * Math.cos(th)), toY(hy + r * Math.sin(th)));
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(toX(mo.comX), toY(mo.comY), 5, 0, 2 * Math.PI);
        ctx.stroke();
      };
      const ink = theme?.isDark ? '#eee' : '#222';
      marks(body, ink);
      if (ghost) marks(ghost, GHOST_COLOR);
      ctx.restore();
    },
  };
}

// One window that holds both bodies in either pose: tall enough for the
// taller, wide enough for a pike's legs either side of the hand.
export function panelView(models, aspect) {
  const reach = Math.max(...models.map((m) => m.reachM));
  const yLo = -0.12, yHi = reach + 0.08;
  // aspect is width over height. The pike's legs fold out toward -x by about
  // half the reach; put the left edge just past them.
  const halfW = 0.5 * aspect * (yHi - yLo);
  return { cx: Math.min(0.1, -0.48 * reach + halfW), yLo, yHi };
}

// Two maps on one diverging scale, percent change against the table body:
// left the shove the wrist can catch, right the shoulder torque a press needs.
// Red is harder in both. The current body is the ringed dot.
//
// onHover(cell | null) fires as a mouse moves over either map, and
// onPick(cell) on a click or tap, with the grid cell under the pointer.
export function proportionFigure({ Plot, html, grid, current, width = 640, onHover = null, onPick = null }) {
  const { legFracs, legMassScales } = grid;
  const dx = 100 * (legFracs[1] - legFracs[0]), dy = legMassScales[1] - legMassScales[0];
  const rects = grid.cells.map((c) => ({
    ...c, x1: c.legPct - dx / 2, x2: c.legPct + dx / 2,
    y1: c.legMassScale - dy / 2, y2: c.legMassScale + dy / 2,
  }));
  // Harder is red in both maps: a LOWER catchable shove, a HIGHER press torque.
  const panels = [
    { key: 'balance', sign: -1, title: 'Balance: shove the wrist can catch' },
    { key: 'press', sign: 1, title: 'Press: shoulder torque needed' },
  ];
  const stacked = width < 600;
  const w = stacked ? width : Math.floor((width - 16) / 2);
  const h = Math.round(Math.max(200, Math.min(300, 0.72 * w)));
  const lim = 60;
  const charts = panels.map((p) => Plot.plot({
    width: w, height: h, marginLeft: 46, marginBottom: 36, marginTop: 20,
    x: { label: 'leg length, % of height →', domain: [100 * legFracs[0] - dx / 2, 100 * legFracs.at(-1) + dx / 2] },
    y: { label: '↑ leg mass, × table', domain: [legMassScales[0] - dy / 2, legMassScales.at(-1) + dy / 2] },
    color: { type: 'diverging', scheme: 'rdbu', domain: [lim, -lim], pivot: 0 },
    marks: [
      Plot.rect(rects, {
        x1: 'x1', x2: 'x2', y1: 'y1', y2: 'y2',
        fill: (d) => Math.max(-lim, Math.min(lim, p.sign * d[p.key])),
      }),
      Plot.text(rects, {
        x: 'legPct', y: 'legMassScale', fontSize: 9, fill: (d) => Math.abs(d[p.key]) > 35 ? '#fff' : '#222',
        text: (d) => `${d[p.key] >= 0 ? '+' : ''}${d[p.key].toFixed(Math.abs(d[p.key]) < 10 ? 1 : 0)}`,
      }),
      Plot.dot([current], { x: 'legPct', y: 'legMassScale', r: 7, stroke: 'currentColor', strokeWidth: 2.5, fill: 'none' }),
    ],
  }));
  const cellAt = (chart, e) => {
    const r = chart.getBoundingClientRect();
    const x = chart.scale('x').invert(e.clientX - r.left);
    const y = chart.scale('y').invert(e.clientY - r.top);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    let best = null, bd = Infinity;
    for (const c of grid.cells) {
      const d = Math.abs(c.legPct - x) / dx + Math.abs(c.legMassScale - y) / dy;
      if (d < bd) { bd = d; best = c; }
    }
    return bd <= 1 ? best : null;
  };
  for (const chart of charts) {
    chart.style.cursor = onPick ? 'pointer' : '';
    if (onHover) {
      chart.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') onHover(cellAt(chart, e)); });
      chart.addEventListener('pointerleave', () => onHover(null));
    }
    if (onPick) chart.addEventListener('click', (e) => { const c = cellAt(chart, e); if (c) onPick(c); });
  }
  const boxes = charts.map((c, i) => html`<div style="width:${w}px;">
    <div style="font-weight:600; font-size:13px; margin-bottom:2px;">${panels[i].title}</div>${c}</div>`);
  return html`<div style="display:flex; gap:16px; flex-wrap:wrap;">${boxes}</div>`;
}

function range(a, b, n) {
  return Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
}

export { legMassShare, proportionedTable, tableLegFrac };
