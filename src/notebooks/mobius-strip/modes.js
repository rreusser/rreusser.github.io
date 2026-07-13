// Flexural (small-vibration) modes of the relaxed elastic Mobius strip.
//
// At equilibrium x*, modes solve K phi = omega^2 M phi (stiffness K, lumped
// diagonal mass M). Natural vertex ordering (vid(i,j) = i*(nv+1)+j) gives a
// huge Hessian bandwidth because the Mobius seam (column nu glued to column 0
// with a row flip) creates long-range connectivity. Interleaving columns as
// (0, nu-1, 1, nu-2, ...) places the seam partners adjacent in the new
// ordering, collapsing the bandwidth to a few dozen vertices. The quadratic
// bending model couples each vertex to its full 2-ring (any two vertices
// sharing a Laplacian neighbor interact through that neighbor's mean-curvature
// residual), roughly doubling the vertex bandwidth relative to the old
// dihedral-hinge stencil; the bandwidth below is computed from the true
// stencil, not assumed.
//
// This enables:
//  - Banded FD Hessian with (2*bw+1)-coloring: O(bw) gradient evaluations
//    instead of 2*n (an order of magnitude fewer).
//  - Banded eigensolvers (ARPACK dsband shift-invert / LAPACK dsbgvx) instead
//    of the dense dsygvx: O(n * bw^2) vs O(n^3) where n = 3*Nv.

// Symmetric vertex adjacency (CSR) from the model's Laplacian edge list. This
// edge set contains every triangle edge, so it covers the membrane coupling
// and (as 2-ring pairs) both bending models' stencils.
export function buildVertexAdjacency(model) {
  const { Nv, nLap, lapI, lapJ } = model;
  const deg = new Int32Array(Nv);
  for (let e = 0; e < nLap; e++) { deg[lapI[e]]++; deg[lapJ[e]]++; }
  const off = new Int32Array(Nv + 1);
  for (let v = 0; v < Nv; v++) off[v + 1] = off[v] + deg[v];
  const nbr = new Int32Array(off[Nv]);
  const cur = Int32Array.from(off.subarray(0, Nv));
  for (let e = 0; e < nLap; e++) {
    nbr[cur[lapI[e]]++] = lapJ[e];
    nbr[cur[lapJ[e]]++] = lapI[e];
  }
  return { off, nbr };
}

// Max vertex-index distance between any two coupled vertices under an optional
// permutation (identity when vertPerm is null). Hessian entry (a, b) can be
// nonzero only when a and b lie in some vertex's stencil {v} union N(v)
// (membrane: triangle edges; bending: Laplacian 2-ring; the hinge quadruples
// are a subset of the 2-ring), so the max spread of any stencil under the
// permutation bounds the half-bandwidth exactly.
export function stencilVertexBandwidth(model, vertPerm = null) {
  const { Nv } = model;
  const { off, nbr } = buildVertexAdjacency(model);
  let bvMax = 0;
  for (let v = 0; v < Nv; v++) {
    let mn = vertPerm ? vertPerm[v] : v;
    let mx = mn;
    for (let s = off[v]; s < off[v + 1]; s++) {
      const p = vertPerm ? vertPerm[nbr[s]] : nbr[s];
      if (p < mn) mn = p;
      if (p > mx) mx = p;
    }
    if (mx - mn > bvMax) bvMax = mx - mn;
  }
  return bvMax;
}

// Build interleaved column permutation minimizing Hessian bandwidth.
// Returns { dofPerm, invDofPerm, bw } where dofPerm[oldDof] = newDof.
export function buildPermutation(model) {
  const { nu, nv, Nv } = model;
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

  // Actual vertex bandwidth of the energy's coupling stencil under the
  // permutation. DOF bandwidth: vertex distance bvMax -> DOF distance bvMax*3+2.
  const bvMax = stencilVertexBandwidth(model, vertPerm);
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

// Compute the lowest flexural modes via ARPACK shift-invert (blahpack dsband).
//
// Instead of reducing the whole banded pencil to tridiagonal form (dsbgvx,
// which spends ~85% of its time accumulating an n x n orthogonal Q used only to
// back-transform a handful of vectors), this runs the implicitly restarted
// Lanczos method in shift-invert mode: OP = (K - sigma*M)^-1 M with which='LM'
// in the transformed spectrum converges fastest to the eigenvalues nearest
// sigma. With sigma < 0 (K is PSD, so K - sigma*M is PD and factors safely)
// that cluster is the lowest one -- the rigid and low flexural modes together.
// Per solve: one banded LU (dgbtrf) of K - sigma*M plus a few tens of banded
// solves (dgbtrs), no O(n^3) reduction and no n x n matrix anywhere.
//
//   dsband : injected blahpack dsband (default export of dsband-bundle.js)
//   opts.sigma : shift (default a small negative multiple of the stiffness
//                scale); must lie below the wanted eigenvalues
//   opts.ncvFactor : Lanczos basis size as a multiple of nev (default 2)
//
// Returns the same shape as computeFlexuralModes.
export async function computeFlexuralModesArpack(model, X, massDiag, gradFn, dsband, opts = {}) {
  const { nModes = 8, fdStep = 1e-5, onProgress = null, sigma: sigmaOpt, ncvFactor = 2 } = opts;
  const Nv = model.Nv;
  const n = 3 * Nv;

  const { dofPerm, invDofPerm, bw } = buildPermutation(model);

  const xPerm = new Float64Array(n);
  for (let i = 0; i < n; i++) xPerm[i] = X[invDofPerm[i]];

  const xOld = new Float64Array(n);
  const gOld = new Float64Array(n);
  function gradFnPerm(xp, gp) {
    for (let i = 0; i < n; i++) xOld[invDofPerm[i]] = xp[i];
    gradFn(xOld, gOld);
    for (let i = 0; i < n; i++) gp[dofPerm[i]] = gOld[i];
  }

  // Banded stiffness K in lower-triangular band storage (bw+1) x n.
  const ABlo = await fdHessianBanded(n, xPerm, gradFnPerm, bw, fdStep, onProgress);

  // Permuted diagonal mass.
  const massPerm = new Float64Array(n);
  for (let i = 0; i < n; i++) massPerm[i] = massDiag[invDofPerm[i]];

  // Expand to LAPACK general band storage with kl = ku = bw (what dgbtrf/dgbtrs
  // and dsband expect): element (I,J) lives at KB[(2*bw + I - J) + J*lda], with
  // lda = 3*bw+1 (bw fill rows on top for the LU). K is symmetric, so each
  // lower-band entry is mirrored into the upper band. M is diagonal.
  const lda = (3 * bw) + 1;
  const diagRow = 2 * bw;
  const KB = new Float64Array(lda * n);
  const MB = new Float64Array(lda * n);
  for (let j = 0; j < n; j++) {
    KB[diagRow + (j * lda)] = ABlo[0 + (j * (bw + 1))];
    MB[diagRow + (j * lda)] = massPerm[j];
    for (let d = 1; d <= bw; d++) {
      const i = j + d;
      if (i >= n) break;
      const val = ABlo[d + (j * (bw + 1))];
      KB[(diagRow + d) + (j * lda)] = val;          // subdiagonal (i=j+d, col=j)
      KB[(diagRow - d) + ((j + d) * lda)] = val;    // superdiagonal, by symmetry
    }
  }

  // Shift below the spectrum. K is PSD; sigma < 0 makes K - sigma*M positive
  // definite (safe factorization) and places the wanted low cluster as the
  // largest eigenvalues of the shift-inverted operator. The magnitude only
  // affects conditioning/convergence: scale it to the stiffness so it tracks
  // the problem. A characteristic omega^2 is max_i K[i,i]/M[i,i]; a small
  // fraction of it sits comfortably below the lowest flexural eigenvalues.
  let scale = 0;
  for (let i = 0; i < n; i++) {
    const r = MB[diagRow + (i * lda)];
    if (r > 0) {
      const q = KB[diagRow + (i * lda)] / r;
      if (q > scale) scale = q;
    }
  }
  const sigma = (sigmaOpt !== undefined) ? sigmaOpt : -1e-3 * scale;

  if (onProgress) await onProgress({ phase: 'eigensolve', frac: null });

  const want = Math.min(n, 6 + nModes);
  const nev = want;
  const ncv = Math.min(n, Math.max((ncvFactor * nev) + 1, nev + 2));
  const lworkl = (ncv * ncv) + (8 * ncv);

  const d = new Float64Array(nev);
  const Z = new Float64Array(n * nev);
  const V = new Float64Array(n * ncv);
  const RFAC = new Float64Array(lda * n);
  const resid = new Float64Array(n);
  const workd = new Float64Array(3 * n);
  const workl = new Float64Array(lworkl);
  const iparam = new Int32Array(11);
  iparam[2] = Math.max(300, 3 * nev); // max Arnoldi iterations
  iparam[6] = 3;                      // shift-invert mode
  const iwork = new Int32Array(n);
  const select = new Int32Array(ncv);

  // infoIn = 0: ARPACK generates a (deterministic) random starting residual.
  const info = dsband(
    true, 'all', select,
    d, Z, n, sigma, n,
    KB, MB, lda, RFAC, bw, bw,
    'LM', 'generalized', nev, 0.0,
    resid, ncv, V, n, iparam,
    workd, workl, lworkl, iwork, 0,
  );
  if (info < 0) throw new Error(`dsband failed (info=${info})`);
  const M = iparam[4]; // number of converged Ritz values

  const rigidCount = Math.min(6, M);

  function packMode(k) {
    const massNorm = new Float64Array(n);
    for (let i = 0; i < n; i++) massNorm[i] = Z[dofPerm[i] + k * n];
    let mx = 0;
    for (let v = 0; v < Nv; v++) {
      const dd = Math.hypot(massNorm[v * 3], massNorm[v * 3 + 1], massNorm[v * 3 + 2]);
      if (dd > mx) mx = dd;
    }
    const s = mx > 0 ? 1 / mx : 1;
    const shape = new Float64Array(n);
    for (let i = 0; i < n; i++) shape[i] = massNorm[i] * s;
    const lambda = d[k];
    return { lambda, omega: Math.sqrt(Math.max(lambda, 0)), shape, shapeMassNorm: massNorm };
  }

  const all = [];
  for (let k = 0; k < M; k++) all.push(packMode(k));
  const flex = all.slice(rigidCount, rigidCount + nModes);

  return {
    eigenvalues: Array.from(d.slice(0, M)),
    frequencies: flex.map((m) => m.omega),
    modes: flex,
    rigidCount,
    rigidEigenvalues: Array.from(d.slice(0, rigidCount)),
    all,
    bw,
    sigma,
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
