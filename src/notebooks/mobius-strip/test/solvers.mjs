// Evidence + integration check for the Mobius equilibrium solvers, mirroring
// how fem-worker.js drives them (gradTol 1e-7).
//
// The decisive metric is total energy: the equilibrium is the global minimum,
// and lower energy = the true smooth shape. The kink (peak/mean bending) metric
// is reported too, but it is NOT a convergence measure -- a wavy, under-resolved
// shape can have a low kink score yet sit well above the minimum.
//
// Findings:
//   * The energy plateaus by gradTol ~1e-7 (E ~ 3.31e-5 at the default config).
//     At 1e-6 the solver stops ~40% high in bending energy -> visible waviness.
//   * Newton-CG and banded-Newton (dpbsv) both reach the true minimum.
//   * L-BFGS converges (even to tiny gradient norm) to a DIFFERENT, higher-
//     energy, wavy critical point it cannot escape: E ~ 4.7e-5, never 3.3e-5.
//     Hence Newton-CG is the default and L-BFGS is only a fast preview.
//
// Run: node src/notebooks/mobius-strip/test/solvers.mjs
import { createMobiusMesh, initialEmbedding, energyAndGradient, bendingStress } from '../mobius-fem.js';
import { newtonCG, lbfgs, bandedNewton } from '../optimize.js';
import { buildPermutation, fdHessianBanded } from '../modes.js';
import blas1 from '../blas1.bundle.js';
import dpbsv from '../dpbsv-bundle.js';

const hrNs = () => Number(process.hrtime.bigint());
const params = { E: 1.0, poisson: 0.35, thickness: 0.03, density: 1.0 };
const model = createMobiusMesh({ length: 2 * Math.PI, width: 1, nu: 64, nv: 10 });
const X0 = initialEmbedding(model);
const fun = (x, g) => energyAndGradient(model, x, params, g).energy;

function kink(x) {
  const bd = bendingStress(model, x, params);
  let peak = 0, sum = 0;
  for (const v of bd) { peak = Math.max(peak, v); sum += v; }
  return peak / (sum / bd.length);
}

async function run(label, fn) {
  const t = hrNs();
  const res = await fn();
  const ms = (hrNs() - t) / 1e6;
  const e = energyAndGradient(model, res.x, params, null);
  let gInf = 0; for (const v of res.g) gInf = Math.max(gInf, Math.abs(v));
  console.log(`  ${label.padEnd(24)} E=${e.energy.toExponential(3)}  bend=${e.bending.toExponential(3)}  kink=${kink(res.x).toFixed(1).padStart(4)}  gInf=${gInf.toExponential(1)}  it=${String(res.iterations).padStart(4)}  ${ms.toFixed(0).padStart(5)}ms`);
  return e.energy;
}

console.log('Default config (len=2pi, nv=10, h=0.03), gradTol=1e-7:\n');
const eN = await run('Newton-CG (default)', () => newtonCG(fun, X0.slice(), { maxIterations: 400, gradTol: 1e-7, blas: blas1, yieldEvery: 9e9 }));
const { dofPerm, invDofPerm, bw } = buildPermutation(model);
const eB = await run('Banded-Newton', () => bandedNewton(fun, X0.slice(), {
  maxIterations: 200, gradTol: 1e-7, yieldEvery: 9e9,
  banded: { bw, dofPerm, invDofPerm, fdHessianBanded, dpbsv },
}));
const eL = await run('L-BFGS m=30', () => lbfgs(fun, X0.slice(), { maxIterations: 6000, gradTol: 1e-7, blas: blas1, m: 30, yieldEvery: 9e9 }));

console.log(`\nNewton-CG and Banded-Newton agree on the minimum: ` +
  `${Math.abs(eN - eB) / eN < 0.02 ? 'YES' : 'NO'} (E_N=${eN.toExponential(3)}, E_B=${eB.toExponential(3)}).`);
console.log(`L-BFGS sits ${((eL / eN - 1) * 100).toFixed(0)}% above the minimum (wavy): E_L=${eL.toExponential(3)}.`);
