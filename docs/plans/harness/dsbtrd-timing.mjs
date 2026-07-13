// Isolates dsbtrd's Q-accumulation cost (the Fix A/Fix B headline numbers) and
// times one banded factor+solve (dpbsv), on the notebook's actual stiffness
// structure (n=2112, bw=137).
//
// dsbtrd is internal to dsbgvx-bundle.js, so this script copies the bundle to a
// temp file, appends `export { dsbtrd }`, and imports the patched copy.
//
//   node docs/plans/harness/dsbtrd-timing.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const NB = join(here, '../../../src/notebooks/mobius-strip');

const patched = join(tmpdir(), `dsbgvx-patched-${process.pid}.mjs`);
writeFileSync(patched, readFileSync(join(NB, 'dsbgvx-bundle.js'), 'utf8') + '\nexport { dsbtrd };\n');
const { dsbtrd } = await import(pathToFileURL(patched));

const { createMobiusMesh, energyAndGradient, initialEmbedding } = await import(pathToFileURL(join(NB, 'mobius-fem.js')));
const { buildPermutation, fdHessianBanded } = await import(pathToFileURL(join(NB, 'modes.js')));
const dpbsv = (await import(pathToFileURL(join(NB, 'dpbsv-bundle.js')))).default;

const params = { E: 1.0, poisson: 0.35, thickness: 0.03 };
const model = createMobiusMesh({ length: 2 * Math.PI, width: 1, nu: 64, nv: 10 });
const n = 3 * model.Nv;
const { dofPerm, invDofPerm, bw } = buildPermutation(model);
const X = Float64Array.from(initialEmbedding(model));
const xPerm = new Float64Array(n);
for (let i = 0; i < n; i++) xPerm[i] = X[invDofPerm[i]];
const xOld = new Float64Array(n), gOld = new Float64Array(n);
const gradFnPerm = (xp, gp) => {
  for (let i = 0; i < n; i++) xOld[invDofPerm[i]] = xp[i];
  energyAndGradient(model, xOld, params, gOld);
  for (let i = 0; i < n; i++) gp[dofPerm[i]] = gOld[i];
};
const AB0 = await fdHessianBanded(n, xPerm, gradFnPerm, bw, 1e-5, null);
console.log(`n=${n} bw=${bw}`);

function runDsbtrd(vect) {
  const AB = AB0.slice();
  const d = new Float64Array(n), e = new Float64Array(n - 1);
  const Q = new Float64Array(n * n);
  const WORK = new Float64Array(n);
  const t0 = performance.now();
  dsbtrd(vect, 'lower', n, bw, AB, 1, bw + 1, 0, d, 1, 0, e, 1, 0, Q, 1, n, 0, WORK, 1, 0);
  return performance.now() - t0;
}
runDsbtrd('none'); // warm-up
const tNone = runDsbtrd('none');
const tInit = runDsbtrd('initialize');
console.log(`dsbtrd vect='none'       : ${tNone.toFixed(0)} ms  (band reduction only)`);
console.log(`dsbtrd vect='initialize' : ${tInit.toFixed(0)} ms  (band reduction + accumulate n×n Q)`);
console.log(`Q accumulation share     : ${(100 * (tInit - tNone) / tInit).toFixed(1)}%`);

// One banded factor+solve (the per-shift cost of Fix A's inverse iteration).
// A strong diagonal shift makes the (indefinite, unrelaxed) matrix PD; the
// factorization cost is data-independent.
function timedSolve() {
  const AB = AB0.slice();
  for (let j = 0; j < n; j++) AB[j * (bw + 1)] += 50.0;
  const B = new Float64Array(n);
  for (let i = 0; i < n; i++) B[i] = Math.sin(i);
  const t0 = performance.now();
  const info = dpbsv('lower', n, bw, 1, AB, 1, bw + 1, 0, B, 1, n, 0);
  return [performance.now() - t0, info];
}
timedSolve(); // warm-up
const [ms, info] = timedSolve();
console.log(`dpbsv factor+solve       : ${ms.toFixed(0)} ms (info=${info})`);
