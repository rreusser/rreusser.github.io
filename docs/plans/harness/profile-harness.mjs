// Profiling harness for docs/plans/mobius-modes-fix-a-inverse-iteration.md:
// replicates the Möbius notebook's solve pipeline at the default 64×10 mesh.
//
//   node --cpu-prof --cpu-prof-dir=/tmp --cpu-prof-name=solve.cpuprofile \
//        docs/plans/harness/profile-harness.mjs
//   node docs/plans/harness/parse-profile.mjs /tmp/solve.cpuprofile
//
// DENSE=1 additionally runs the dense dsygvx path (~12 s).

import {
  createMobiusMesh, energyAndGradient, lumpedMassDiagonal,
  membraneVonMises, bendingStress, gaussianCurvature,
} from '../../../src/notebooks/mobius-strip/mobius-fem.js';
import { lbfgs } from '../../../src/notebooks/mobius-strip/optimize.js';
import blas1 from '../../../src/notebooks/mobius-strip/blas1.bundle.js';
import { buildPermutation, fdHessianBanded } from '../../../src/notebooks/mobius-strip/modes.js';
import dsbgvx from '../../../src/notebooks/mobius-strip/dsbgvx-bundle.js';
import dsygvx from '../../../src/notebooks/mobius-strip/dsygvx.bundle.js';
import { solveBvp } from '../../../src/notebooks/mobius-strip/colsys-bundle.js';
import { rodEmbedding } from '../../../src/notebooks/mobius-strip/mobius-rod.js';

const timings = {};
function phase(name, fn) {
  const t0 = performance.now();
  const out = fn();
  timings[name] = performance.now() - t0;
  console.log(`${name}: ${timings[name].toFixed(1)} ms`);
  return out;
}
async function phaseAsync(name, fn) {
  const t0 = performance.now();
  const out = await fn();
  timings[name] = performance.now() - t0;
  console.log(`${name}: ${timings[name].toFixed(1)} ms`);
  return out;
}

const params = { E: 1.0, poisson: 0.35, thickness: 0.03 };
const model = createMobiusMesh({ length: 2 * Math.PI, width: 1, nu: 64, nv: 10 });
const n = 3 * model.Nv;
console.log(`mesh: nu=${model.nu} nv=${model.nv} Nv=${model.Nv} n=${n}`);

// --- COLSYS rod seed (runs on the MAIN thread in the notebook) --------------
const rod = phase('rod seed (COLSYS)', () =>
  rodEmbedding(solveBvp, model, { poisson: params.poisson, alphaMax: 50, samples: 800 }));
const X0 = Float64Array.from(rod.X);

// --- energyAndGradient microbenchmark ---------------------------------------
const g = new Float64Array(n);
for (let i = 0; i < 20; i++) energyAndGradient(model, X0, params, g);
{
  const REP = 300;
  const t0 = performance.now();
  for (let i = 0; i < REP; i++) energyAndGradient(model, X0, params, g);
  console.log(`energyAndGradient: ${((performance.now() - t0) / REP * 1000).toFixed(1)} µs/call`);
}

// --- per-frame scalar fields (render path, main thread) ---------------------
for (const [name, fn] of [
  ['bendingStress', () => bendingStress(model, X0, params)],
  ['membraneVonMises', () => membraneVonMises(model, X0, params)],
  ['gaussianCurvature', () => gaussianCurvature(model, X0)],
]) {
  for (let i = 0; i < 10; i++) fn();
  const REP = 100;
  const t0 = performance.now();
  for (let i = 0; i < REP; i++) fn();
  console.log(`${name}: ${((performance.now() - t0) / REP * 1000).toFixed(1)} µs/call`);
}

// --- L-BFGS relax (worker's default path) ------------------------------------
const elastic = (x, gg) => energyAndGradient(model, x, params, gg).energy;
const res = await phaseAsync('L-BFGS relax', () =>
  lbfgs(elastic, X0, {
    maxIterations: 50000, gradTol: 1e-9, ftol: 1e-9, ftolWindow: 100,
    minIterations: 1, blas: blas1, m: 30, yieldEvery: 1e9,
  }));
console.log(`  iterations=${res.iterations ?? '?'} converged=${res.converged}`);
const X = res.x;

// --- banded FD Hessian --------------------------------------------------------
const { dofPerm, invDofPerm, bw } = buildPermutation(model);
console.log(`bandwidth bw=${bw}`);
const xPerm = new Float64Array(n);
for (let i = 0; i < n; i++) xPerm[i] = X[invDofPerm[i]];
const xOld = new Float64Array(n), gOld = new Float64Array(n);
function gradFnPerm(xp, gp) {
  for (let i = 0; i < n; i++) xOld[invDofPerm[i]] = xp[i];
  energyAndGradient(model, xOld, params, gOld);
  for (let i = 0; i < n; i++) gp[dofPerm[i]] = gOld[i];
}
const AB = await phaseAsync('banded FD Hessian', () =>
  fdHessianBanded(n, xPerm, gradFnPerm, bw, 1e-5, null));

// --- dsbgvx banded eigensolve --------------------------------------------------
const massDiag = lumpedMassDiagonal(model, params);
const BB = new Float64Array(n);
for (let i = 0; i < n; i++) BB[i] = massDiag[invDofPerm[i]];
phase('dsbgvx eigensolve', () => {
  const want = Math.min(n, 6 + 8);
  const w = new Float64Array(n);
  const Z = new Float64Array(n * want);
  const Q = new Float64Array(n * n);
  const WORK = new Float64Array(7 * n);
  const IWORK = new Int32Array(5 * n);
  const IFAIL = new Int32Array(n);
  const out = { M: 0 };
  const info = dsbgvx('compute-vectors', 'index', 'lower', n, bw, 0,
    AB.slice(), 1, bw + 1, 0, BB.slice(), 1, 1, 0, Q, 1, n, 0,
    0, 0, 1, want, 0, out, w, 1, 0, Z, 1, n, 0, WORK, 1, 0, IWORK, 1, 0, IFAIL, 1, 0);
  console.log(`  info=${info} M=${out.M} omega(flex 1..3)=${[...w.slice(6, 9)].map(v => Math.sqrt(Math.max(v, 0)).toFixed(4)).join(', ')}`);
});

// --- optional: dense path ------------------------------------------------------
if (process.env.DENSE) {
  const A = await phaseAsync('dense FD Hessian (2n gradient evals)', async () => {
    const A = new Float64Array(n * n);
    const gP = new Float64Array(n), gM = new Float64Array(n);
    const xw = Float64Array.from(X);
    for (let j = 0; j < n; j++) {
      const step = 1e-5 * (1 + Math.abs(X[j]));
      xw[j] = X[j] + step; energyAndGradient(model, xw, params, gP);
      xw[j] = X[j] - step; energyAndGradient(model, xw, params, gM);
      xw[j] = X[j];
      const inv2 = 1 / (2 * step);
      for (let i = 0; i < n; i++) A[i + j * n] = (gP[i] - gM[i]) * inv2;
    }
    return A;
  });
  phase('dsygvx dense eigensolve', () => {
    const want = Math.min(n, 14);
    const B = new Float64Array(n * n);
    for (let i = 0; i < n; i++) B[i + i * n] = massDiag[i];
    const w = new Float64Array(n);
    const Z = new Float64Array(n * want);
    const lwork = Math.max(8 * n, 64);
    const WORK = new Float64Array(lwork);
    const IWORK = new Int32Array(5 * n);
    const IFAIL = new Int32Array(n);
    const out = { M: 0 };
    const info = dsygvx(1, 'compute-vectors', 'index', 'lower', n,
      A, 1, n, 0, B, 1, n, 0, 0, 0, 1, want, 0, out,
      w, 1, 0, Z, 1, n, 0, WORK, 1, 0, lwork, IWORK, 1, 0, IFAIL, 1, 0);
    console.log(`  info=${info} M=${out.M}`);
  });
}

console.log('\n=== phase summary (ms) ===');
for (const [k, v] of Object.entries(timings)) console.log(`${v.toFixed(2).padStart(10)}  ${k}`);
