// Flexural (small-vibration) modes of the relaxed elastic Mobius strip.
//
// At equilibrium x*, modes solve K phi = omega^2 M phi (stiffness K, lumped
// diagonal mass M). Natural vertex ordering (vid(i,j) = i*(nv+1)+j) gives
// Hessian bandwidth ~703 vertices because the Mobius seam (column nu glued to
// column 0 with a row flip) creates long-range connectivity. Interleaving
// columns as (0, nu-1, 1, nu-2, ...) places the seam partners adjacent in the
// new ordering, collapsing bandwidth to ~23 vertices (bw ~ 69 DOFs).
//
// This enables:
//  - Banded FD Hessian with (2*bw+1)-coloring: ~286 gradient evaluations
//    instead of 2*n = 4224 (15x fewer).
//  - dsbgvx (LAPACK banded generalized eigensolver) instead of dense dsygvx:
//    O(n * bw^2) ~ 10M flops vs O(n^3) ~ 9.4G flops for the reduction step
//    (roughly 900x fewer for n = 2112, bw = 69).

// Build interleaved column permutation minimizing Hessian bandwidth.
// Returns { dofPerm, invDofPerm, bw } where dofPerm[oldDof] = newDof.
export function buildPermutation(model) {
  const { nu, nv, tris, nT, nHinges, hingeIdx, Nv } = model;
  const n = 3 * Nv;

  // colPerm[newCol] = oldCol: new col 0 -> old col 0, new col 1 -> old col nu-1, ...
  const colPerm = new Int32Array(nu);
  for (let r = 0; r < nu; r++) colPerm[r] = r % 2 === 0 ? r >> 1 : nu - 1 - (r >> 1);
  const invColPerm = new Int32Array(nu);
  for (let r = 0; r < nu; r++) invColPerm[colPerm[r]] = r;

  // vertPerm[oldV] = newV
  const vertPerm = new Int32Array(Nv);
  const invVertPerm = new Int32Array(Nv);
  for (let i = 0; i < nu; i++) {
    const newI = invColPerm[i];
    for (let j = 0; j <= nv; j++) {
      const oldV = i * (nv + 1) + j;
      const newV = newI * (nv + 1) + j;
      vertPerm[oldV] = newV;
      invVertPerm[newV] = oldV;
    }
  }

  // Compute actual vertex bandwidth from triangles and hinges
  let bvMax = 0;
  function chk(va, vb) {
    const d = Math.abs(vertPerm[va] - vertPerm[vb]);
    if (d > bvMax) bvMax = d;
  }
  for (let k = 0; k < nT; k++) {
    const v0 = tris[k * 3], v1 = tris[k * 3 + 1], v2 = tris[k * 3 + 2];
    chk(v0, v1); chk(v1, v2); chk(v0, v2);
  }
  for (let h = 0; h < nHinges; h++) {
    const b = h * 4;
    for (let a = 0; a < 4; a++) for (let c = a + 1; c < 4; c++) chk(hingeIdx[b + a], hingeIdx[b + c]);
  }

  // DOF bandwidth: vertex distance bvMax -> DOF distance bvMax*3+2
  const bw = bvMax * 3 + 2;

  // dofPerm[oldDof] = newDof
  const dofPerm = new Int32Array(n);
  const invDofPerm = new Int32Array(n);
  for (let v = 0; v < Nv; v++) {
    for (let c = 0; c < 3; c++) {
      dofPerm[v * 3 + c] = vertPerm[v] * 3 + c;
      invDofPerm[vertPerm[v] * 3 + c] = v * 3 + c;
    }
  }

  return { dofPerm, invDofPerm, bw };
}

// Banded central-FD Hessian via (2*bw+1)-column-coloring.
// xPerm is the equilibrium in permuted DOF order (modified in place, restored on return).
// gradFnPerm(xp, gp) computes the gradient in permuted DOF space.
// Returns AB in LAPACK lower-triangular band storage (column-major):
//   AB[band + col*(bw+1)] = K[col+band, col] for band = 0..bw, col = 0..n-1.
export async function fdHessianBanded(n, xPerm, gradFnPerm, bw, h, onProgress) {
  const nColors = 2 * bw + 1;
  const AB = new Float64Array((bw + 1) * n);
  const gradP = new Float64Array(n);
  const gradM = new Float64Array(n);
  const steps = new Float64Array(n);
  for (let j = 0; j < n; j++) steps[j] = h * (1 + Math.abs(xPerm[j]));

  for (let c = 0; c < nColors; c++) {
    // Perturb all columns of color c
    for (let j = c; j < n; j += nColors) xPerm[j] += steps[j];
    gradFnPerm(xPerm, gradP);
    for (let j = c; j < n; j += nColors) xPerm[j] -= 2 * steps[j];
    gradFnPerm(xPerm, gradM);
    for (let j = c; j < n; j += nColors) xPerm[j] += steps[j]; // restore

    // Recover lower-triangle entries: for each color-c column j, fill rows j..j+bw
    for (let j = c; j < n; j += nColors) {
      const inv2step = 1 / (2 * steps[j]);
      const iMax = Math.min(j + bw, n - 1);
      for (let i = j; i <= iMax; i++) {
        AB[(i - j) + j * (bw + 1)] = (gradP[i] - gradM[i]) * inv2step;
      }
    }

    if (onProgress && (c & 7) === 0) await onProgress({ phase: 'hessian', frac: c / nColors });
  }
  return AB;
}

// Compute the lowest flexural modes.
//   model        : mesh from createMobiusMesh
//   X            : relaxed equilibrium positions (length 3*Nv)
//   massDiag     : lumped mass diagonal (length 3*Nv) from lumpedMassDiagonal
//   gradFn(X, g) : analytic gradient callback (zeros g before writing)
//   dsbgvx       : injected blapack dsbgvx (default export of dsbgvx.bundle.js)
//   opts.nModes  : number of flexural modes to return (default 8)
//   opts.fdStep  : FD step base (default 1e-5)
//
// Returns { eigenvalues, frequencies, modes, rigidCount, bw, ... }.
export async function computeFlexuralModes(model, X, massDiag, gradFn, dsbgvx, opts = {}) {
  const { nModes = 8, fdStep = 1e-5, onProgress = null } = opts;
  const Nv = model.Nv;
  const n = 3 * Nv;

  // Build interleaved permutation and actual bandwidth
  const { dofPerm, invDofPerm, bw } = buildPermutation(model);

  // Equilibrium in permuted DOF order: xPerm[newDof] = X[invDofPerm[newDof]]
  const xPerm = new Float64Array(n);
  for (let i = 0; i < n; i++) xPerm[i] = X[invDofPerm[i]];

  // Gradient wrapper: maps permuted DOF space -> permuted DOF space
  const xOld = new Float64Array(n);
  const gOld = new Float64Array(n);
  function gradFnPerm(xp, gp) {
    for (let i = 0; i < n; i++) xOld[invDofPerm[i]] = xp[i]; // unpack to original space
    gradFn(xOld, gOld);
    for (let i = 0; i < n; i++) gp[dofPerm[i]] = gOld[i];    // pack to permuted space
  }

  // Banded stiffness K in lower-triangular band storage
  const AB = await fdHessianBanded(n, xPerm, gradFnPerm, bw, fdStep, onProgress);

  // Diagonal mass matrix in permuted DOF order (banded with kb=0: 1 x n)
  const BB = new Float64Array(n);
  for (let i = 0; i < n; i++) BB[i] = massDiag[invDofPerm[i]];

  if (onProgress) await onProgress({ phase: 'eigensolve', frac: null });

  // Banded generalized eigenproblem: K phi = omega^2 M phi.
  // AB: (bw+1) x n lower-triangular band storage (strideAB1=1, strideAB2=bw+1).
  // BB: 1 x n diagonal band storage (strideAB1=1, strideAB2=1), kb=0.
  // Q: n x n transformation matrix (needed for eigenvectors).
  const want = Math.min(n, 6 + nModes);
  const w = new Float64Array(n);
  const Z = new Float64Array(n * want);
  const Q = new Float64Array(n * n);
  const WORK = new Float64Array(7 * n);
  const IWORK = new Int32Array(5 * n);
  const IFAIL = new Int32Array(n);
  const out = { M: 0 };

  const info = dsbgvx(
    'compute-vectors', 'index', 'lower', n, bw, 0,
    AB, 1, bw + 1, 0,
    BB, 1, 1, 0,
    Q, 1, n, 0,
    0, 0,
    1, want,
    0,
    out,
    w, 1, 0,
    Z, 1, n, 0,
    WORK, 1, 0,
    IWORK, 1, 0,
    IFAIL, 1, 0,
  );
  if (info !== 0) throw new Error(`dsbgvx failed (info=${info})`);
  const M = out.M;

  const rigidCount = Math.min(6, M);

  function packMode(k) {
    // Eigenvector k: Z[newDof + k*n] -> massNorm[oldDof] = Z[dofPerm[oldDof] + k*n]
    const massNorm = new Float64Array(n);
    for (let i = 0; i < n; i++) massNorm[i] = Z[dofPerm[i] + k * n];
    let mx = 0;
    for (let v = 0; v < Nv; v++) {
      const d = Math.hypot(massNorm[v * 3], massNorm[v * 3 + 1], massNorm[v * 3 + 2]);
      if (d > mx) mx = d;
    }
    const s = mx > 0 ? 1 / mx : 1;
    const shape = new Float64Array(n);
    for (let i = 0; i < n; i++) shape[i] = massNorm[i] * s;
    const lambda = w[k];
    return { lambda, omega: Math.sqrt(Math.max(lambda, 0)), shape, shapeMassNorm: massNorm };
  }

  const all = [];
  for (let k = 0; k < M; k++) all.push(packMode(k));
  const flex = all.slice(rigidCount, rigidCount + nModes);

  return {
    eigenvalues: Array.from(w.slice(0, M)),
    frequencies: flex.map((m) => m.omega),
    modes: flex,
    rigidCount,
    rigidEigenvalues: Array.from(w.slice(0, rigidCount)),
    all,
    bw,
  };
}

// Dense FD Hessian: 2n gradient evaluations, full column-major storage.
async function fdHessianDense(n, x, gradFn, h, onProgress) {
  const A = new Float64Array(n * n);
  const gP = new Float64Array(n);
  const gM = new Float64Array(n);
  const xWork = x.slice();
  for (let j = 0; j < n; j++) {
    const step = h * (1 + Math.abs(x[j]));
    xWork[j] = x[j] + step;
    gradFn(xWork, gP);
    xWork[j] = x[j] - step;
    gradFn(xWork, gM);
    xWork[j] = x[j];
    const inv2step = 1 / (2 * step);
    for (let i = 0; i < n; i++) A[i + j * n] = (gP[i] - gM[i]) * inv2step;
    if (onProgress && (j & 15) === 0) await onProgress({ phase: 'hessian', frac: j / n });
  }
  return A;
}

// Compute the lowest flexural modes using the dense symmetric eigensolver dsygvx.
// Same interface as computeFlexuralModes but uses no permutation/bandwidth tricks.
// Cost: 2n gradient evals for the Hessian + O(n^3) for the eigensolver.
export async function computeFlexuralModesDense(model, X, massDiag, gradFn, dsygvx, opts = {}) {
  const { nModes = 8, fdStep = 1e-5, onProgress = null } = opts;
  const n = 3 * model.Nv;
  const want = Math.min(n, 6 + nModes);

  const A = await fdHessianDense(n, X, gradFn, fdStep, onProgress);

  // Full N×N mass matrix (lower triangle, column-major); diagonal only.
  const B = new Float64Array(n * n);
  for (let i = 0; i < n; i++) B[i + i * n] = massDiag[i];

  if (onProgress) await onProgress({ phase: 'eigensolve', frac: null });

  const w = new Float64Array(n);
  const Z = new Float64Array(n * want);
  const lwork = Math.max(8 * n, 64);
  const WORK = new Float64Array(lwork);
  const IWORK = new Int32Array(5 * n);
  const IFAIL = new Int32Array(n);
  const out = { M: 0 };

  const info = dsygvx(
    1, 'compute-vectors', 'index', 'lower', n,
    A, 1, n, 0,
    B, 1, n, 0,
    0, 0,
    1, want,
    0,
    out,
    w, 1, 0,
    Z, 1, n, 0,
    WORK, 1, 0, lwork,
    IWORK, 1, 0,
    IFAIL, 1, 0,
  );
  if (info !== 0) throw new Error(`dsygvx failed (info=${info})`);
  const M = out.M;
  const rigidCount = Math.min(6, M);

  function packMode(k) {
    const massNorm = new Float64Array(n);
    for (let i = 0; i < n; i++) massNorm[i] = Z[i + k * n];
    let mx = 0;
    for (let v = 0; v < model.Nv; v++) {
      const d = Math.hypot(massNorm[v*3], massNorm[v*3+1], massNorm[v*3+2]);
      if (d > mx) mx = d;
    }
    const s = mx > 0 ? 1 / mx : 1;
    const shape = new Float64Array(n);
    for (let i = 0; i < n; i++) shape[i] = massNorm[i] * s;
    return { lambda: w[k], omega: Math.sqrt(Math.max(w[k], 0)), shape, shapeMassNorm: massNorm };
  }

  const flex = [];
  for (let k = rigidCount; k < Math.min(M, rigidCount + nModes); k++) flex.push(packMode(k));

  return {
    eigenvalues: Array.from(w.slice(0, M)),
    frequencies: flex.map((m) => m.omega),
    modes: flex,
    rigidCount,
    bw: n,
  };
}
