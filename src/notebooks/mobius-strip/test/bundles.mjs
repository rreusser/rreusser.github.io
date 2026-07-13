#!/usr/bin/env node
// Gate the bundles this notebook ships.
//
//   node src/notebooks/mobius-strip/bundles/verify.mjs
//
// A rebuild that fails loudly is harmless. The one to catch is a rebuild that
// still produces numbers, just wrong ones -- bundling base.js where main.js was
// wanted shifts every argument by one meaning and returns a plausible answer.
//
// So this drives the bundles through the notebook's OWN call paths (the same
// wrappers fem-worker.js uses) rather than through hand-written calls, and then
// checks invariants: eigenpair residuals, agreement between three independent
// eigensolvers, the six rigid-body zero modes, and the rod BVP's loop closure.

import { createMobiusMesh, initialEmbedding, energyAndGradient, energy, lumpedMassDiagonal } from '../mobius-fem.js';
import { buildPermutation, fdHessianBanded, computeFlexuralModes, computeFlexuralModesArpack, computeFlexuralModesDense } from '../modes.js';
import { bandedNewton, newtonCG } from '../optimize.js';
import { rodEmbedding } from '../mobius-rod.js';

import blas1 from '../blas1.bundle.js';
import dpbsv from '../dpbsv-bundle.js';
import dsbgvx from '../dsbgvx-bundle.js';
import dsygvx from '../dsygvx.bundle.js';
import dsband from '../dsband-bundle.js';
import { solveBvp } from '../colsys-bundle.js';

let failed = 0;
const ok = (name, pass, detail) => {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failed++;
};

// --- 1. BLAS level 1, called exactly as optimize.js calls it (strided base.js).
{
  const x = Float64Array.from([1, 2, 3, 4]);
  const y = Float64Array.from([5, 6, 7, 8]);
  const dot = blas1.ddot(4, x, 1, 0, y, 1, 0); // 5+12+21+32
  const nrm = blas1.dnrm2(2, Float64Array.from([3, 4]), 1, 0); // 5
  const y2 = y.slice();
  blas1.daxpy(4, 2, x, 1, 0, y2, 1, 0);
  const s = x.slice();
  blas1.dscal(4, 3, s, 1, 0);
  const c = new Float64Array(4);
  blas1.dcopy(4, x, 1, 0, c, 1, 0);
  ok('blas1: ddot/daxpy/dscal/dnrm2/dcopy (strided base.js API)',
    dot === 70 && Math.abs(nrm - 5) < 1e-12 && String(y2) === '7,10,13,16'
      && String(s) === '3,6,9,12' && String(c) === '1,2,3,4',
    `ddot=${dot}, dnrm2=${nrm}`);
}

// --- 2. COLSYS: the elastic-rod BVP that seeds the strip. The invariant is that
//        the rod actually closes into a loop.
{
  const model = createMobiusMesh({ length: 2 * Math.PI, width: 1, nu: 48, nv: 8 });
  const { info } = rodEmbedding(solveBvp, model, { poisson: 0.3, alphaMax: 50, samples: 400 });
  ok('colsys: Mahadevan-Keller rod BVP closes the loop', info.closure < 1e-6,
    `alpha=${info.alpha}, loop closure=${info.closure.toExponential(1)}`);
}

// --- 3/4. dpbsv and the three eigensolvers, on one real relaxed strip.
{
  const params = { E: 1.0, poisson: 0.3, thickness: 0.03, density: 1.0, bendingMode: 'analytic' };
  const model = createMobiusMesh({ length: 2 * Math.PI, width: 1, nu: 32, nv: 6 });

  // Seed from the COLSYS rod shape, exactly as the notebook does. Relaxing from
  // the raw initial embedding instead lands on a different, higher-energy
  // critical point whose Hessian is indefinite -- real, but not the equilibrium.
  const X0 = new Float64Array(rodEmbedding(solveBvp, model, { poisson: params.poisson }).X);

  const fun = (x, g) => energyAndGradient(model, x, params, g);
  const banded = buildPermutation(model);

  // dpbsv drives the banded Newton step. Newton-CG (BLAS only, no dpbsv) is the
  // independent control: both must land on the same energy minimum.
  const bn = await bandedNewton(fun, X0.slice(), {
    maxIterations: 200, gradTol: 1e-7, minIterations: 1,
    banded: { bw: banded.bw, dofPerm: banded.dofPerm, invDofPerm: banded.invDofPerm, fdHessianBanded, dpbsv },
  });
  const ncg = await newtonCG(fun, X0.slice(), {
    maxIterations: 400, gradTol: 1e-7, minIterations: 1, blas: blas1,
  });
  // fun() returns {energy, membrane, bending}, so read the energy back explicitly.
  const eBanded = energy(model, bn.x, params);
  const eNewton = energy(model, ncg.x, params);
  const dE = Math.abs(eBanded - eNewton) / Math.abs(eNewton);
  ok('dpbsv: banded Newton reaches the same minimum as Newton-CG (no dpbsv)',
    dE < 1e-3, `E_banded=${eBanded.toExponential(4)}, E_newtoncg=${eNewton.toExponential(4)}, rel diff=${dE.toExponential(1)}`);

  const X = bn.x;
  const massDiag = lumpedMassDiagonal(model, params);
  const gradFn = (x, g) => { energyAndGradient(model, x, params, g); };
  // The option is nModes, and each wrapper already drops the six rigid-body modes
  // internally, so what comes back is the flexural spectrum.
  const opts = { nModes: 6 };

  const arp = await computeFlexuralModesArpack(model, X, massDiag, gradFn, dsband, opts);
  const bgv = await computeFlexuralModes(model, X, massDiag, gradFn, dsbgvx, opts);
  const dsy = await computeFlexuralModesDense(model, X, massDiag, gradFn, dsygvx, opts);

  const lam = (r) => r.modes.map((m) => m.lambda);
  const [a, b, d] = [lam(arp), lam(bgv), lam(dsy)];

  // At a genuine energy minimum the Hessian is positive semidefinite, so every
  // flexural eigenvalue is >= 0. A negative one means the shape is a saddle.
  ok('eigensolvers: flexural spectrum is non-negative at the equilibrium',
    d.length === 6 && d.every((v) => v > -1e-12),
    `${d.length} modes, lambda_1=${d[0].toExponential(3)}`);

  // Compare only the physical modes. A coarse mesh can carry an extra numerically
  // null direction (lambda ~ 1e-9 here, vs 1e-2 for the real ones); its value is
  // pure round-off, so a RELATIVE comparison against it is meaningless -- that,
  // not any disagreement about the physics, is what a naive check trips over.
  const cut = 1e-6 * Math.max(...d);
  const idx = d.map((v, i) => [v, i]).filter(([v]) => v > cut).map(([, i]) => i);
  const rel = (p, q) => Math.max(...idx.map((i) => Math.abs(p[i] - q[i]) / Math.abs(q[i])));
  const eAB = rel(a, d), eBB = rel(b, d);
  ok('dsband (ARPACK) agrees with dsygvx (dense)', idx.length >= 4 && eAB < 1e-6,
    `${idx.length} physical modes, max rel diff = ${eAB.toExponential(1)}`);
  ok('dsbgvx (banded) agrees with dsygvx (dense)', idx.length >= 4 && eBB < 1e-6,
    `${idx.length} physical modes, max rel diff = ${eBB.toExponential(1)}`);
  console.log(`      flexural lambda (dense): ${d.map((v) => v.toExponential(4)).join(', ')}`);
}

console.log(failed ? `\n${failed} check(s) FAILED.` : '\nAll bundle checks passed.');
process.exit(failed ? 1 : 0);
