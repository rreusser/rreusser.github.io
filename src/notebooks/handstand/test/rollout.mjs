// Verification gates for splines, the rollout cost, CMA-ES, and the catch
// window. The optimization gates are budgeted small; the full runs used by
// the notebook presets happen offline via scripts/optimize.mjs.
//
// Run: node src/notebooks/handstand/test/rollout.mjs   (~30 s)
import { buildModel } from '../anthropometry.js';
import { createWorkspace } from '../dynamics.js';
import { strengthProfile } from '../strength.js';
import { ROM_DEFAULTS } from '../statics.js';
import { splineEval } from '../control.js';
import { cmaes } from '../cma-es.js';
import {
  naiveReference, kickReference, encodeDecision, decodeDecision, decisionBounds,
  rolloutCost, optimizeScenario, catchWindow, balancedHandstand,
} from '../rollout.js';

let failures = 0;
function gate(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const model = buildModel({ heightM: 1.75, massKg: 70 });
const ws = createWorkspace(model);
const prof = strengthProfile(model.massKg);
const rom = { ...ROM_DEFAULTS };

// ---------------------------------------------------------------------------
// Gate A: spline interpolation. Endpoints hit the first/last knots, the
// curve passes through interior knots, and the analytic rate matches finite
// differences.
// ---------------------------------------------------------------------------
{
  const knots = Float64Array.of(0.2, -0.5, 1.1, 0.7, 0.3);
  const T = 1.7;
  let worstKnot = 0;
  for (let k = 0; k < knots.length; k++) {
    const t = (k / (knots.length - 1)) * T;
    worstKnot = Math.max(worstKnot, Math.abs(splineEval(knots, T, t).value - knots[k]));
  }
  let worstRate = 0;
  for (let t = 0.05; t < T; t += 0.09) {
    const h = 1e-6;
    const fd = (splineEval(knots, T, t + h).value - splineEval(knots, T, t - h).value) / (2 * h);
    worstRate = Math.max(worstRate, Math.abs(fd - splineEval(knots, T, t).rate));
  }
  const clamped = splineEval(knots, T, -1).value === knots[0] && splineEval(knots, T, 9).value === knots[4];
  gate('A: spline hits knots, analytic rate matches FD, clamps outside [0,T]',
    worstKnot < 1e-12 && worstRate < 1e-6 && clamped,
    `knot err=${worstKnot.toExponential(1)}, rate err=${worstRate.toExponential(1)}`);
}

// ---------------------------------------------------------------------------
// Gate B: decision vector round trip and bounds shape.
// ---------------------------------------------------------------------------
{
  const naive = naiveReference(model, ws, 'lunge', 6);
  const x = encodeDecision(naive.knots, 1.4);
  const dec = decodeDecision(x, 6);
  let worst = 0;
  for (let j = 0; j < 6; j++) {
    for (let k = 0; k < 6; k++) worst = Math.max(worst, Math.abs(dec.knots[j][k] - naive.knots[j][k]));
  }
  const b = decisionBounds(6);
  gate('B: encode/decode round trip, bounds sized 6K+1',
    worst === 0 && dec.T === 1.4 && b.lo.length === 37 && b.hi.length === 37,
    `n=${b.lo.length}`);
}

// ---------------------------------------------------------------------------
// Gate C: rollout cost is deterministic and its terms are finite.
// ---------------------------------------------------------------------------
{
  const x = encodeDecision(naiveReference(model, ws, 'lunge', 6).knots, 1.4);
  const c1 = rolloutCost(model, ws, prof, rom, 'lunge', x, {});
  const c2 = rolloutCost(model, ws, prof, rom, 'lunge', x, {});
  const finite = Object.values(c1.terms).every(Number.isFinite);
  gate('C: rollout cost deterministic and finite', c1.cost === c2.cost && finite,
    `cost=${c1.cost.toFixed(2)}`);
}

// ---------------------------------------------------------------------------
// Gate D: CMA-ES solves the 43-d sphere to high precision and cuts 43-d
// Rosenbrock by >99.5% within budget; identical seeds give identical runs.
// ---------------------------------------------------------------------------
{
  const n = 43;
  const sphere = (x) => x.reduce((s, v) => s + v * v, 0);
  const s1 = await cmaes({ x0: new Float64Array(n).fill(2), sigma0: 0.5, seed: 5, maxGen: 800, objective: sphere });
  const s2 = await cmaes({ x0: new Float64Array(n).fill(2), sigma0: 0.5, seed: 5, maxGen: 800, objective: sphere });
  const rosen = (x) => {
    let s = 0;
    for (let i = 0; i < n - 1; i++) s += 100 * (x[i + 1] - x[i] * x[i]) ** 2 + (1 - x[i]) ** 2;
    return s;
  };
  const r0 = rosen(new Float64Array(n).fill(-1));
  const r = await cmaes({ x0: new Float64Array(n).fill(-1), sigma0: 0.3, seed: 3, maxGen: 1500, objective: rosen });
  gate('D: CMA-ES sphere to 1e-12, Rosenbrock cut >99.5%, seed-deterministic',
    s1.best < 1e-12 && s1.best === s2.best && r.best < 0.005 * r0,
    `sphere=${s1.best.toExponential(1)}, rosen ${r0.toFixed(0)} -> ${r.best.toFixed(1)}`);
}

// ---------------------------------------------------------------------------
// Gate E: a hand-crafted hold trajectory (constant knots at the balanced
// pose) scores as success with near-zero pose cost.
// ---------------------------------------------------------------------------
{
  const qBal = balancedHandstand(model, ws);
  const knots = [];
  for (let j = 0; j < 6; j++) knots.push(new Float64Array(6).fill(qBal[3 + j]));
  const c = rolloutCost(model, ws, prof, rom, 'hold', encodeDecision(knots, 1.0), {});
  gate('E: constant balanced-pose trajectory scores success',
    c.verdict.success && c.terms.pose < 0.5 && c.terms.fall === 0,
    `cost=${c.cost.toFixed(3)}, pose=${c.terms.pose.toFixed(3)}`);
}

// ---------------------------------------------------------------------------
// Gate F: a small-budget kick-up optimization never regresses below its own
// start (the start is a candidate), makes at least some progress, and is
// bitwise-deterministic under the same seed.
// ---------------------------------------------------------------------------
{
  const startX = encodeDecision(kickReference(model, ws, 6, rom).knots, 1.4);
  const startCost = rolloutCost(model, ws, prof, rom, 'lunge', startX, { dt: 2.5e-4 }).cost;
  const o1 = await optimizeScenario(model, ws, prof, rom, { scenario: 'lunge', maxGen: 15, seed: 11, robust: false });
  const o2 = await optimizeScenario(model, ws, prof, rom, { scenario: 'lunge', maxGen: 15, seed: 11, robust: false });
  gate('F: small-budget optimization never regresses, improves, deterministic',
    o1.best <= startCost && o1.best < startCost * 0.99 && o1.best === o2.best,
    `start=${startCost.toFixed(1)}, optimized=${o1.best.toFixed(1)}`);
}

// ---------------------------------------------------------------------------
// Gate G: catch window sanity. The unperturbed balanced pose is caught; a
// huge wrist-rate perturbation is not; the window is monotone enough that
// the success count is strictly between 0 and the full grid.
// ---------------------------------------------------------------------------
{
  const grid = catchWindow(model, ws, prof, {
    thetaLoDeg: -20, thetaHiDeg: 20, nTheta: 5,
    omegaLo: -2.4, omegaHi: 2.4, nOmega: 5,
    T: 2.0,
  });
  const mid = grid.success[2 * 5 + 2];
  const extreme = grid.success[4 * 5 + 4];
  let count = 0;
  for (const s of grid.success) count += s;
  gate('G: catch window catches the center, drops the extreme corner',
    mid === 1 && extreme === 0 && count > 0 && count < 25,
    `caught ${count}/25 cells`);
}

// ---------------------------------------------------------------------------
// Gate H: the metabolic work term charges for churning. Starting from the
// same balanced pose, a reference that pumps the hips back and forth must
// score far more work than the constant hold, even though both end balanced.
// This is the term that makes leg-flailing trajectories read as expensive.
// ---------------------------------------------------------------------------
{
  const qBal = balancedHandstand(model, ws);
  const constKnots = [], pumpKnots = [];
  for (let j = 0; j < 6; j++) {
    constKnots.push(new Float64Array(6).fill(qBal[3 + j]));
    const row = new Float64Array(6).fill(qBal[3 + j]);
    if (j === 2 || j === 4) {
      for (let k = 1; k < 5; k++) row[k] += (k % 2 ? 0.5 : -0.5);
    }
    pumpKnots.push(row);
  }
  const cHold = rolloutCost(model, ws, prof, rom, 'hold', encodeDecision(constKnots, 1.2), {});
  const cPump = rolloutCost(model, ws, prof, rom, 'hold', encodeDecision(pumpKnots, 1.2), {});
  gate('H: pumping the legs multiplies the metabolic work term',
    cPump.terms.work > 5 * Math.max(cHold.terms.work, 0.02),
    `hold work=${cHold.terms.work.toFixed(3)}, pump work=${cPump.terms.work.toFixed(3)} (mgH-normalized, weighted)`);
  gate('H2: pumping the legs multiplies the smoothness (acceleration) term',
    cPump.terms.smooth > 10 * Math.max(cHold.terms.smooth, 0.01),
    `hold smooth=${cHold.terms.smooth.toFixed(3)}, pump smooth=${cPump.terms.smooth.toFixed(3)}`);
}

console.log(failures ? `\n${failures} gate(s) FAILED` : '\nAll rollout gates passed');
process.exit(failures ? 1 : 0);
