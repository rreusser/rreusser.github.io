// Verification gates for the bending discretization of the Mobius shell FEM.
//
// Context: the legacy dihedral-hinge bending energy carried a lattice
// calibration constant (lbar^2/Abar) that matches the continuum plate energy
// ONLY on the equilateral brick lattice (dv = du*sqrt(3)/2). At other cell
// aspects the effective flexural rigidity was off by an O(1), direction-
// dependent factor that did not vanish with refinement, so the equilibrium
// shape changed whenever the resolution sliders changed the cell aspect.
// The default model is now the quadratic rest-metric bending energy
// (cotan Laplacian of the flat rest metric; Bergou et al. 2006), which needs
// no calibration. These gates demonstrate the hinge failure and the fix.
//
// Run: node src/notebooks/mobius-strip/test/bending.mjs           (~a minute; gate E relaxes 3 meshes)
import {
  createMobiusMesh, createFlatStrip, initialEmbedding, energyAndGradient,
} from '../mobius-fem.js';
import { newtonCG } from '../optimize.js';
import { buildPermutation } from '../modes.js';
import blas1 from '../blas1.bundle.js';

const params = { E: 1, poisson: 0.35, thickness: 0.03, density: 1 };
const D = (params.E * params.thickness ** 3) / (12 * (1 - params.poisson ** 2));

let failures = 0;
function gate(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const maxAbs = (a) => { let m = 0; for (const v of a) m = Math.max(m, Math.abs(v)); return m; };

// ---------------------------------------------------------------------------
// Gate A: flat unglued strip at its flat embedding has zero energy/gradient
// under the quadratic bending model (rest state IS the flat strip).
// ---------------------------------------------------------------------------
{
  let worstE = 0, worstG = 0;
  for (const [nu, nv] of [[16, 4], [64, 10], [128, 32]]) {
    const m = createFlatStrip({ length: 2 * Math.PI, width: 1, nu, nv });
    const g = new Float64Array(m.Nv * 3);
    const r = energyAndGradient(m, m.flatEmbedding(), params, g);
    worstE = Math.max(worstE, Math.abs(r.energy));
    worstG = Math.max(worstG, maxAbs(g));
  }
  gate('A: flat rest state has zero energy and gradient', worstE < 1e-20 && worstG < 1e-12,
    `E<=${worstE.toExponential(1)}, |g|<=${worstG.toExponential(1)}`);
}

// ---------------------------------------------------------------------------
// Gate B: analytic gradient of the full energy (quadratic bending) matches
// central finite differences on a randomly perturbed Mobius configuration.
// ---------------------------------------------------------------------------
{
  const m = createMobiusMesh({ length: 2 * Math.PI, width: 1, nu: 24, nv: 6 });
  const X = initialEmbedding(m);
  let seed = 42;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff - 0.5);
  for (let i = 0; i < X.length; i++) X[i] += 0.05 * rnd();
  const g = new Float64Array(X.length);
  energyAndGradient(m, X, params, g);
  const eps = 1e-6;
  let worst = 0;
  for (let s = 0; s < 60; s++) {
    const i = (s * 37) % X.length;
    const save = X[i];
    X[i] = save + eps; const fp = energyAndGradient(m, X, params, null).energy;
    X[i] = save - eps; const fm = energyAndGradient(m, X, params, null).energy;
    X[i] = save;
    const fd = (fp - fm) / (2 * eps);
    worst = Math.max(worst, Math.abs(fd - g[i]) / Math.max(1e-8, Math.abs(fd)));
  }
  gate('B: analytic gradient matches FD (quadratic bending)', worst < 1e-5,
    `max rel err ${worst.toExponential(2)}`);
}

// ---------------------------------------------------------------------------
// Gate C: rolled-cylinder calibration. Rolling the flat strip onto a cylinder
// of radius R is an isometry, so the discrete bending energy must converge to
// the plate energy D/2 * area / R^2 -- at EVERY cell aspect and roll
// direction. The hinge model fails this off the equilateral aspect; the
// quadratic model must pass. Compared against the analytic energy over the
// interior-vertex quadrature area (the energy skips free-boundary vertices,
// an O(dv) strip whose share vanishes under refinement).
// ---------------------------------------------------------------------------
{
  const R = 1.5, w = 1;
  function cylinder(nu, nv, aspect, direction, bendingMode) {
    const dv = w / nv, du = dv * aspect, L = nu * du;
    const m = createFlatStrip({ length: L, width: w, nu, nv });
    const flat = m.flatEmbedding();
    const X = new Float64Array(m.Nv * 3);
    for (let v = 0; v < m.Nv; v++) {
      const u = flat[v * 3], vv = flat[v * 3 + 1];
      const s = direction === 'along' ? u : vv;
      const t = direction === 'along' ? vv : u;
      const x1 = R * Math.sin(s / R), x3 = R * (1 - Math.cos(s / R));
      if (direction === 'along') { X[v * 3] = x1; X[v * 3 + 1] = t; X[v * 3 + 2] = x3; }
      else { X[v * 3] = t; X[v * 3 + 1] = x1; X[v * 3 + 2] = x3; }
    }
    const r = energyAndGradient(m, X, { ...params, bendingMode }, null);
    let aInt = 0;
    for (let v = 0; v < m.Nv; v++) if (m.bendInterior[v]) aInt += m.bendAreaBar[v];
    // Hinge model has no skipped-vertex quadrature; normalize it by full area.
    const aRef = bendingMode === 'hinge' ? L * w : aInt;
    return r.bending / (0.5 * D * aRef / (R * R));
  }

  console.log('\n  cylinder bend/analytic (want -> 1):   quadratic      hinge');
  let worstQ = 0;
  for (const [nu, nv, aspect, dir] of [
    [64, 10, 1.0, 'along'], [128, 20, 1.0, 'along'],
    [64, 10, 0.5, 'along'], [128, 20, 0.5, 'along'],
    [64, 10, 2.0, 'along'], [128, 20, 2.0, 'along'],
    [64, 10, 1.0, 'across'], [128, 20, 1.0, 'across'],
    [64, 10, 2 / Math.sqrt(3), 'along'],
  ]) {
    const q = cylinder(nu, nv, aspect, dir, 'quadratic');
    const h = cylinder(nu, nv, aspect, dir, 'hinge');
    console.log(`    ${String(nu).padStart(3)}x${String(nv).padEnd(3)} du/dv=${aspect.toFixed(2)} ${dir.padEnd(6)}  ${q.toFixed(4)}        ${h.toFixed(4)}`);
    worstQ = Math.max(worstQ, Math.abs(q - 1));
  }
  gate('C: quadratic bending matches plate energy at all aspects', worstQ < 0.02,
    `max |ratio-1| = ${(worstQ * 100).toFixed(2)}%`);
}

// ---------------------------------------------------------------------------
// Gate D: the permutation's bandwidth bound really contains the Hessian. The
// quadratic bending stencil is a 2-ring, wider than the old hinge stencil; a
// stale bound would silently truncate K in the banded eigensolver path.
// Dense FD Hessian on a small mesh; every entry outside the band must vanish.
// ---------------------------------------------------------------------------
{
  const m = createMobiusMesh({ length: 2 * Math.PI, width: 1, nu: 12, nv: 4 });
  const X = initialEmbedding(m);
  const n = 3 * m.Nv;
  const { dofPerm, bw } = buildPermutation(m);
  const g0 = new Float64Array(n), gp = new Float64Array(n), gm = new Float64Array(n);
  energyAndGradient(m, X, params, g0);
  let maxOutside = 0, maxInside = 0;
  const h = 1e-6;
  for (let j = 0; j < n; j++) {
    const save = X[j];
    X[j] = save + h; energyAndGradient(m, X, params, gp);
    X[j] = save - h; energyAndGradient(m, X, params, gm);
    X[j] = save;
    for (let i = 0; i < n; i++) {
      const K = (gp[i] - gm[i]) / (2 * h);
      if (Math.abs(dofPerm[i] - dofPerm[j]) > bw) maxOutside = Math.max(maxOutside, Math.abs(K));
      else maxInside = Math.max(maxInside, Math.abs(K));
    }
  }
  gate('D: banded Hessian bandwidth contains the full stencil', maxOutside < 1e-6 * maxInside,
    `bw=${bw}, max|K| outside band ${maxOutside.toExponential(1)} vs inside ${maxInside.toExponential(1)}`);
}

// ---------------------------------------------------------------------------
// Gate E: the point of the fix -- the relaxed Mobius equilibrium converges
// under mesh refinement (with the cell aspect changing between meshes, which
// broke the hinge model). Compare total energy and the area-weighted radius
// of gyration (rigid-invariant shape observable) across resolutions.
// ---------------------------------------------------------------------------
{
  async function equilibrium(nu, nv, bendingMode) {
    const m = createMobiusMesh({ length: 2 * Math.PI, width: 1, nu, nv });
    const p = { ...params, bendingMode };
    const fun = (x, g) => energyAndGradient(m, x, p, g).energy;
    const res = await newtonCG(fun, initialEmbedding(m), {
      maxIterations: 400, gradTol: 1e-7, blas: blas1, yieldEvery: 9e9,
    });
    const e = energyAndGradient(m, res.x, p, null);
    // Area-weighted centroid + radius of gyration.
    let A = 0, cx = 0, cy = 0, cz = 0;
    for (let v = 0; v < m.Nv; v++) {
      const a = m.vertexArea[v];
      A += a; cx += a * res.x[v * 3]; cy += a * res.x[v * 3 + 1]; cz += a * res.x[v * 3 + 2];
    }
    cx /= A; cy /= A; cz /= A;
    let rg2 = 0;
    for (let v = 0; v < m.Nv; v++) {
      const dx = res.x[v * 3] - cx, dy = res.x[v * 3 + 1] - cy, dz = res.x[v * 3 + 2] - cz;
      rg2 += m.vertexArea[v] * (dx * dx + dy * dy + dz * dz);
    }
    return { E: e.energy, bend: e.bending, rg: Math.sqrt(rg2 / A), converged: res.converged, it: res.iterations };
  }

  const meshes = [[48, 8], [64, 10], [80, 14]]; // aspects du/dv ~ 1.05, 0.98, 0.89
  console.log('\n  equilibrium vs resolution:            E_total     E_bend      Rgyr    it');
  const results = {};
  for (const mode of ['quadratic', 'hinge']) {
    results[mode] = [];
    for (const [nu, nv] of meshes) {
      const r = await equilibrium(nu, nv, mode);
      results[mode].push(r);
      console.log(`    ${mode.padEnd(9)} ${String(nu).padStart(3)}x${String(nv).padEnd(3)}  du/dv=${((2 * Math.PI / nu) / (1 / nv)).toFixed(2)}   ${r.E.toExponential(3)}  ${r.bend.toExponential(3)}  ${r.rg.toFixed(4)}  ${String(r.it).padStart(3)}${r.converged ? '' : ' (not converged)'}`);
    }
  }
  const spread = (rs, f) => {
    const v = rs.map(f);
    return (Math.max(...v) - Math.min(...v)) / Math.min(...v);
  };
  const qE = spread(results.quadratic, (r) => r.E);
  const hE = spread(results.hinge, (r) => r.E);
  const qR = spread(results.quadratic, (r) => r.rg);
  console.log(`    energy spread across resolutions: quadratic ${(qE * 100).toFixed(1)}%, hinge ${(hE * 100).toFixed(1)}%`);
  gate('E: equilibrium is resolution-consistent (quadratic)', qE < 0.05 && qR < 0.02,
    `E spread ${(qE * 100).toFixed(1)}%, Rgyr spread ${(qR * 100).toFixed(2)}%`);
}

console.log(failures === 0 ? '\nAll gates passed.' : `\n${failures} gate(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
