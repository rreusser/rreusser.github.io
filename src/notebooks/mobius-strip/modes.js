// Flexural (small-vibration) modes of the relaxed elastic Mobius strip.
//
// At an equilibrium x*, the natural modes solve the generalized symmetric
// eigenproblem
//
//     K phi = omega^2 M phi,
//
// where K = grad^2 E(x*) is the stiffness (Hessian) and M is the lumped
// (diagonal, positive-definite) mass. K is symmetric and, at a stable
// equilibrium, positive semidefinite with a six-dimensional rigid-body null
// space; the membrane (in-plane) stiffness is several orders larger than the
// bending stiffness, so the problem is strongly graded.
//
// This is exactly a generalized symmetric-definite eigenproblem, so we solve
// it with the user's blapack LAPACK driver `dsygv` (itype = 1): Cholesky of
// M, reduction to a standard symmetric problem, symmetric tridiagonalization,
// tridiagonal QL, then back-transform. It returns eigenvalues in ascending
// order and eigenvectors M-normalized (phi^T M phi = 1), i.e. modal vectors
// directly. This is the numerically correct path for K phi = lambda M phi and
// is independent of the nonsymmetric QR routines.
//
// K is assembled by central finite differences of the analytic gradient,
// which was verified to machine precision in Phase 1. Pure module; `dsygv`
// and the energy/gradient routine are injected.

// Central finite-difference Hessian of E at X. gradFn(X, g) writes the
// analytic gradient into g. Returned column-major and symmetrized.
async function fdHessian(n, X, gradFn, h, onProgress) {
  const K = new Float64Array(n * n); // column-major: K[i + j*n]
  const gp = new Float64Array(n);
  const gm = new Float64Array(n);
  for (let j = 0; j < n; j++) {
    const save = X[j];
    const step = h * (1 + Math.abs(save));
    X[j] = save + step;
    gradFn(X, gp);
    X[j] = save - step;
    gradFn(X, gm);
    X[j] = save;
    const inv = 1 / (2 * step);
    for (let i = 0; i < n; i++) K[i + j * n] = (gp[i] - gm[i]) * inv;
    if (onProgress && (j & 31) === 0) {
      await onProgress({ phase: 'hessian', frac: j / n });
    }
  }
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const a = 0.5 * (K[i + j * n] + K[j + i * n]);
      K[i + j * n] = a;
      K[j + i * n] = a;
    }
  return K;
}

// Compute the lowest flexural modes.
//   model        : mesh from createMobiusMesh
//   X            : relaxed equilibrium positions (length 3 Nv)
//   massDiag     : lumped mass diagonal (length 3 Nv) from lumpedMassDiagonal
//   gradFn(X, g) : analytic gradient callback
//   dsygvx       : injected blapack dsygvx (default export of the bundle)
//   opts.nModes  : number of flexural modes to return (default 8)
//   opts.fdStep  : FD step base (default 1e-5)
//
// Returns { eigenvalues, frequencies, modes, rigidCount, ... } where
// modes[k] = { omega, lambda, shape, shapeMassNorm } with `shape` scaled to
// unit maximum nodal displacement (for animation) and `shapeMassNorm` the
// raw M-normalized eigenvector.
export async function computeFlexuralModes(model, X, massDiag, gradFn, dsygvx, opts = {}) {
  const { nModes = 8, fdStep = 1e-5, onProgress = null } = opts;
  const Nv = model.Nv;
  const n = 3 * Nv;

  // Stiffness via central FD of the analytic gradient (column-major).
  const Kfull = await fdHessian(n, X, gradFn, fdStep, onProgress);

  // The dense generalized eigensolve blocks the main thread; announce it
  // (and let the UI paint) before the call.
  if (onProgress) await onProgress({ phase: 'eigensolve', frac: null });

  // Only the lowest few eigenpairs are wanted (six rigid-body modes plus the
  // requested flexural modes), so use the subset driver dsygvx with
  // range='index', il=1, iu=want. Computing just `want` of n eigenvectors is
  // 2x-4x faster than the full dsygv at our sizes (it skips the full
  // eigenvector accumulation) while remaining machine-precision accurate.
  // dsygvx overwrites A (= K) and B (= M, with its Cholesky factor).
  const want = Math.min(n, 6 + nModes);
  const A = Kfull.slice();
  const B = new Float64Array(n * n);
  for (let i = 0; i < n; i++) B[i + i * n] = massDiag[i];

  const w = new Float64Array(n);          // eigenvalues, first M ascending
  const Z = new Float64Array(n * want);   // eigenvectors, N x M, M-normalized
  const lwork = Math.max(1, 24 * n);
  const WORK = new Float64Array(lwork);
  const IWORK = new Int32Array(5 * n);
  const IFAIL = new Int32Array(n);
  const out = { M: 0 };

  const info = dsygvx(
    1, 'compute-vectors', 'index', 'lower', n,
    A, 1, n, 0,
    B, 1, n, 0,
    0, 0,            // vl, vu (unused for range='index')
    1, want,         // il, iu
    0,               // abstol (<=0 => eps-scaled, machine accuracy)
    out,
    w, 1, 0,
    Z, 1, n, 0,
    WORK, 1, 0, lwork,
    IWORK, 1, 0,
    IFAIL, 1, 0,
  );
  if (info !== 0) throw new Error(`dsygvx failed (info=${info})`);
  const M = out.M;

  // Rigid-body modes: the strip floats freely (no constrained DOFs), so it
  // has exactly six rigid-body modes (3 translations + 3 rotations). These
  // are the six smallest eigenvalues (clustered near zero, up to FD-Hessian
  // noise) and are filtered out. This is exact and needs no gap heuristic --
  // important now that the subset solver returns only the lowest few
  // eigenvalues, so there is no large membrane eigenvalue to scale against.
  const rigidCount = Math.min(6, M);

  function packMode(k) {
    const massNorm = new Float64Array(n);
    for (let i = 0; i < n; i++) massNorm[i] = Z[i + k * n];
    // Display copy: scale so the largest nodal displacement is 1.
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
    K: Kfull,
  };
}
