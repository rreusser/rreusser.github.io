// Verification gates for reference-spline refitting.
//
// Changing the pose count refits the technique with a different number of
// knots. The refit must be a least-squares projection onto the coarser (or
// finer) Catmull-Rom space, not a resampling: reading the old curve at the new
// knot times is the obvious construction and it is strictly worse, because a
// Catmull-Rom knot is a point ON the curve, so that construction pins the new
// curve through a few samples and lets the tangent rule invent the rest.
//
// Run: node src/notebooks/handstand/test/spline.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splineEval } from '../control.js';
import { resampleKnots } from '../figure-kit.js';
import { widenKnots } from '../control.js';

let failures = 0;
function gate(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const D = 180 / Math.PI;
const runsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'runs');
const cases = fs.readdirSync(runsDir).filter((f) => f.endsWith('.json'))
  .map((f) => ({ f, d: JSON.parse(fs.readFileSync(path.join(runsDir, f), 'utf8')) }))
  .filter(({ d }) => Array.isArray(d.knots) && d.knots.length === 6 && d.T > 0)
  // Widened once, here, so every comparison below is eight channels against
  // eight. Compared un-widened, row 2 of a refit is the spine and row 2 of
  // the stored technique is a hip, and the gate reports 263 degrees of
  // "error" that is really just two different joints.
  .map(({ f, d }) => ({ name: f, knots: widenKnots(d.knots.map((r) => Float64Array.from(r))), T: d.T }));

// The construction the refit replaces, kept here as the thing to beat.
const sampled = (knots, T, K) => knots.map((row) => {
  const r = new Float64Array(K);
  for (let k = 0; k < K; k++) r[k] = splineEval(row, T, K === 1 ? 0 : (k / (K - 1)) * T).value;
  return r;
});

// RMS angular disagreement between two knot matrices, in degrees, over [0, T].
const rms = (a, b, T) => {
  const M = 2001;
  let s = 0, n = 0;
  for (let j = 0; j < a.length; j++) {
    for (let m = 0; m < M; m++) {
      const t = (m / (M - 1)) * T;
      const d = splineEval(a[j], T, t).value - splineEval(b[j], T, t).value;
      s += d * d; n++;
    }
  }
  return Math.sqrt(s / n) * D;
};

const COUNTS = [2, 3, 4, 5, 7, 8, 10];

// ---------------------------------------------------------------------------
// Gate A: refitting to the count a technique already has is the identity. The
// old knots drive the residual to zero and the normal equations are
// nonsingular, so they are the unique minimizer -- anything above roundoff
// means the fit is solving a different problem than the one advertised.
// ---------------------------------------------------------------------------
{
  let worst = 0, where = '';
  for (const c of cases) {
    const back = resampleKnots(c.knots, c.T, c.knots[0].length);
    for (let j = 0; j < c.knots.length; j++) {
      for (let k = 0; k < c.knots[0].length; k++) {
        const e = Math.abs(back[j][k] - c.knots[j][k]) * D;
        if (e > worst) { worst = e; where = c.name; }
      }
    }
  }
  gate('A. refit to the same count is the identity', worst < 1e-4,
    `max ${worst.toExponential(2)} deg${where ? ` in ${where}` : ''}`);
}

// ---------------------------------------------------------------------------
// Gate B: the ending pose survives exactly. The last knot is the one thing in
// the technique that was set on purpose, and a free least-squares fit will
// happily move it a degree to buy accuracy in the middle, so it is pinned
// rather than fitted.
// ---------------------------------------------------------------------------
{
  let worst = 0;
  for (const c of cases) {
    const K0 = c.knots[0].length;
    for (const K of COUNTS) {
      const r = resampleKnots(c.knots, c.T, K);
      for (let j = 0; j < c.knots.length; j++) worst = Math.max(worst, Math.abs(r[j][K - 1] - c.knots[j][K0 - 1]));
    }
  }
  gate('B. the ending pose is preserved exactly', worst === 0, `drift ${(worst * D).toExponential(2)} deg`);
}

// ---------------------------------------------------------------------------
// Gate C: the fit is never worse than reading the curve at the new knot times,
// and is meaningfully better where it matters most -- dropping to two or three
// poses, which is exactly when someone reaches for the control.
// ---------------------------------------------------------------------------
{
  let regressions = 0, worstRatio = 1, coarseGain = 0, nCoarse = 0;
  for (const c of cases) {
    for (const K of COUNTS) {
      const a = rms(sampled(c.knots, c.T, K), c.knots, c.T);
      const b = rms(resampleKnots(c.knots, c.T, K), c.knots, c.T);
      if (b > a + 1e-9) { regressions++; worstRatio = Math.max(worstRatio, b / Math.max(a, 1e-12)); }
      if (K <= 3) { coarseGain += a / Math.max(b, 1e-12); nCoarse++; }
    }
  }
  gate('C. the fit never loses to sampling', regressions === 0,
    `${cases.length * COUNTS.length} refits, worst ratio ${worstRatio.toFixed(3)}x`);
  gate('C2. and wins clearly when dropping to 2-3 poses', coarseGain / nCoarse > 1.1,
    `mean ${(coarseGain / nCoarse).toFixed(2)}x lower error`);
}

// ---------------------------------------------------------------------------
// Gate D: a refit round trip through a coarser count loses detail, and a round
// trip through a finer one nearly does not. This is the projection behaving
// like a projection -- the notebook claims detail finer than the new spacing
// cannot come back, and this is that claim as a number.
// ---------------------------------------------------------------------------
{
  let worstUp = 0, leastLoss = Infinity;
  for (const c of cases) {
    const K0 = c.knots[0].length;
    worstUp = Math.max(worstUp, rms(resampleKnots(resampleKnots(c.knots, c.T, K0 + 4), c.T, K0), c.knots, c.T));
    leastLoss = Math.min(leastLoss, rms(resampleKnots(resampleKnots(c.knots, c.T, 2), c.T, K0), c.knots, c.T));
  }
  gate('D. round trip through a finer count is nearly lossless', worstUp < 1.5, `${worstUp.toFixed(3)} deg`);
  gate('D2. round trip through two poses is not', leastLoss > 5, `${leastLoss.toFixed(1)} deg lost`);
}

console.log(`\n${failures === 0 ? 'ALL GATES PASS' : `${failures} GATE(S) FAILED`}  (${cases.length} stored techniques)`);
process.exit(failures === 0 ? 0 : 1);
