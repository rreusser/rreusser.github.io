// Cross-check + benchmark: ARPACK shift-invert (blahpack dsband) vs banded
// dsbgvx for the Mobius flexural modes, on the real relaxed equilibrium, across
// mesh sizes. Implements the Fix A verification/timing gate.
//
// Run from the repo root: node docs/plans/harness/verify-arpack-modes.mjs
import { createMobiusMesh, initialEmbedding, energyAndGradient, lumpedMassDiagonal } from '../../../src/notebooks/mobius-strip/mobius-fem.js';
import { newtonCG } from '../../../src/notebooks/mobius-strip/optimize.js';
import { computeFlexuralModes, computeFlexuralModesArpack } from '../../../src/notebooks/mobius-strip/modes.js';
import blas1 from '../../../src/notebooks/mobius-strip/blas1.bundle.js';
import dsbgvx from '../../../src/notebooks/mobius-strip/dsbgvx-bundle.js';
import dsband from '../../../src/notebooks/mobius-strip/dsband-bundle.js';

const hrMs = () => Number(process.hrtime.bigint()) / 1e6;
const params = { E: 1.0, poisson: 0.35, thickness: 0.03, density: 1.0 };
const nModes = 8;

// Directional-FD residual ||K x - lambda M x|| / ||lambda M x|| for a mode; K x
// is the second directional derivative of the energy gradient at equilibrium.
function residual(model, X, massDiag, gradFn, n, mode, lambda) {
  const eps = 1e-6;
  const xp = new Float64Array(n), xm = new Float64Array(n), gp = new Float64Array(n), gm = new Float64Array(n);
  for (let i = 0; i < n; i++) { xp[i] = X[i] + eps * mode[i]; xm[i] = X[i] - eps * mode[i]; }
  gradFn(xp, gp); gradFn(xm, gm);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    const Kx = (gp[i] - gm[i]) / (2 * eps);
    const Mx = massDiag[i] * mode[i];
    num += (Kx - lambda * Mx) ** 2; den += (lambda * Mx) ** 2;
  }
  return Math.sqrt(num / (den + 1e-300));
}

async function runMesh(nu, nv) {
  const model = createMobiusMesh({ length: 2 * Math.PI, width: 1, nu, nv });
  const fun = (x, g) => energyAndGradient(model, x, params, g).energy;
  const X = (await newtonCG(fun, initialEmbedding(model).slice(), { maxIterations: 400, gradTol: 1e-7, blas: blas1, yieldEvery: 9e9 })).x;
  const massDiag = lumpedMassDiagonal(model, params);
  const gradFn = (x, g) => { energyAndGradient(model, x, params, g); };
  const n = 3 * model.Nv;

  let t = hrMs();
  const ref = await computeFlexuralModes(model, X, massDiag, gradFn, dsbgvx, { nModes });
  const tRef = hrMs() - t;

  t = hrMs();
  const arp = await computeFlexuralModesArpack(model, X, massDiag, gradFn, dsband, { nModes });
  const tArp = hrMs() - t;

  const kFlex = Math.min(ref.modes.length, arp.modes.length);
  let maxRel = 0;
  for (let i = 0; i < kFlex; i++) {
    maxRel = Math.max(maxRel, Math.abs(ref.modes[i].lambda - arp.modes[i].lambda) / (Math.abs(ref.modes[i].lambda) + 1e-300));
  }
  let resRef = 0, resArp = 0;
  for (const m of ref.modes) resRef = Math.max(resRef, residual(model, X, massDiag, gradFn, n, m.shapeMassNorm, m.lambda));
  for (const m of arp.modes) resArp = Math.max(resArp, residual(model, X, massDiag, gradFn, n, m.shapeMassNorm, m.lambda));
  let ortho = 0;
  for (let a = 0; a < arp.all.length; a++) {
    for (let b = a; b < arp.all.length; b++) {
      let dot = 0;
      for (let i = 0; i < n; i++) dot += arp.all[a].shapeMassNorm[i] * massDiag[i] * arp.all[b].shapeMassNorm[i];
      ortho = Math.max(ortho, Math.abs(dot - (a === b ? 1 : 0)));
    }
  }

  const relPass = maxRel < 1e-8;
  const orthoPass = ortho < 1e-9;
  const resPass = resArp <= 2 * resRef + 1e-12; // ARPACK residual at dsbgvx's level
  console.log(`\n=== ${nu}x${nv}  (n=${n}, bw=${ref.bw}) ===`);
  console.log(`  sigma (ARPACK)          : ${arp.sigma.toExponential(3)}`);
  console.log(`  flexural eig rel-err    : ${maxRel.toExponential(2)}  ${relPass ? 'PASS' : 'FAIL'}  (vs dsbgvx)`);
  console.log(`  M-orthonormality (ARPACK): ${ortho.toExponential(2)}  ${orthoPass ? 'PASS' : 'FAIL'}`);
  console.log(`  residual dsbgvx=${resRef.toExponential(2)}  ARPACK=${resArp.toExponential(2)}  ${resPass ? 'PASS' : 'FAIL'}  (parity)`);
  console.log(`  TIME dsbgvx=${tRef.toFixed(0)}ms  ARPACK=${tArp.toFixed(0)}ms  speedup=${(tRef / tArp).toFixed(1)}x`);
  return { nu, nv, n, bw: ref.bw, maxRel, ortho, resRef, resArp, tRef, tArp, pass: relPass && orthoPass && resPass };
}

const results = [];
for (const [nu, nv] of [[32, 6], [64, 10], [96, 16]]) results.push(await runMesh(nu, nv));

console.log('\n=== SUMMARY ===');
for (const r of results) {
  console.log(`  ${r.nu}x${r.nv} n=${r.n} bw=${r.bw}: ${r.pass ? 'PASS' : 'FAIL'}  relerr=${r.maxRel.toExponential(1)} ortho=${r.ortho.toExponential(1)} | dsbgvx ${r.tRef.toFixed(0)}ms -> ARPACK ${r.tArp.toFixed(0)}ms (${(r.tRef / r.tArp).toFixed(1)}x)`);
}
console.log(results.every(r => r.pass) ? '\nALL PASS' : '\nFAILURES PRESENT');
