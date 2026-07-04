# Fix A — Replace dsbgvx's Q accumulation with banded shift-invert inverse iteration

Status: planned, not started.
Scope: `src/notebooks/mobius-strip/` (modes path) + one regenerated bundle from blahpack.
Companion plan: [Fix B — dsbtrd rotation blocking in blahpack](blahpack-fix-b-dsbtrd-blocking.md)
(independent; Fix A makes the notebook fast, Fix B makes the routine fast for everyone).

## Problem

The "Flexural modes" step calls LAPACK `dsbgvx` with `jobz='V'`. Profiling the
notebook's exact pipeline in Node (V8, same engine as Chrome) at the default
64×10 mesh (n = 2112, bw = 137) attributes **88% of the entire pipeline** to
`dsbtrd`, the band→tridiagonal reduction inside dsbgvx — and isolated timing
shows **84.5% of dsbtrd is Q accumulation**: every bulge-chase Givens rotation
(≈ n²/2 of them) is also applied to a column pair of the full n×n orthogonal
matrix Q. That is O(n³) work with an unblocked level-1 constant, spent building
a 2112×2112 matrix that is then used to back-transform **14** eigenvectors.

Measured baselines (see [harness/](harness/); Node 22, default mesh):

| phase                                   | time      |
|-----------------------------------------|-----------|
| L-BFGS relax (1636 iters)               | ~1.0 s    |
| banded FD Hessian                       | 104 ms    |
| **dsbgvx eigensolve**                   | **17.4 s**|
| — dsbtrd, band reduction only (vect=N)  | 1.74 s    |
| — dsbtrd, with Q accumulation           | 11.3 s    |
| dense path (FD Hessian + dsygvx), total | 12.4 s    |
| one banded factor+solve (dpbsv)         | 60 ms     |

Two consequences worth fixing:

1. **The banded path currently loses to the dense path** (17.5 s vs 12.4 s):
   the dense reduction runs through the register-tiled dgemm, while dsbtrd's Q
   update doesn't block at all.
2. **The max-resolution mesh is effectively unusable**: at 128×32 (n = 12672),
   Q-accumulation flops scale ~216× (order half an hour) and Q itself is a
   12672² Float64Array — **1.28 GB**, which likely OOMs the tab.

## Design

The mass matrix is diagonal (`lumpedMassDiagonal`), so the generalized pencil
reduces to a standard banded problem by a diagonal similarity — no dsbgst, no Q:

1. **Rescale** (O(n·bw)): `K'[i,j] = K[i,j] / sqrt(m_i · m_j)` applied directly
   in lower band storage. If `K'y = λy`, then `x = D^{-1/2}y` solves
   `Kx = λMx`, and y-orthonormality gives M-orthonormality of x for free.
2. **Eigenvalues** (1.7 s today; Fix B shrinks it): `dsbtrd` with `vect='none'`
   on a copy of K' → tridiagonal (d, e); `dstebz` with `range='index'`,
   `il=1, iu=6+nModes` for the lowest eigenvalues. No eigenvectors of T are
   computed and no Q exists anywhere.
3. **Eigenvectors by banded shift-invert inverse iteration** on K' itself
   (not on T — this is what makes Q unnecessary):
   - Only the flexural modes need vectors; the 6 rigid modes are counted from
     the eigenvalue list (λ below threshold) and skipped, exactly as the UI
     already discards them.
   - Group the wanted eigenvalues into clusters (gap-based, e.g. relative gap
     < 10⁻²); for each cluster pick one shift σ (cluster midpoint, perturbed
     off any eigenvalue by ε·‖K'‖ if needed).
   - Factor `K' − σI` once per cluster with **dgbtrf** (banded LU with partial
     pivoting — required because interior shifts make the matrix indefinite;
     banded Cholesky would fail). Storage: general-band layout,
     ldab = 2·kl+ku+1 with kl = ku = bw.
   - For each eigenvalue in the cluster: inverse-iterate with **dgbtrs**
     (2–3 solves from a random start, normalize each pass), then modified
     Gram–Schmidt against the other vectors already computed in the cluster.
     This is the dstein recipe, applied to the band instead of the tridiagonal.
4. **Back-transform and package**: `x = D^{-1/2}y`, then reuse `packMode`'s
   existing normalization (max-deflection scaling + `shapeMassNorm`).
5. **Residual check per pair**: banded matvec (O(n·bw)) to verify
   `‖K'y − λy‖ ≤ tol·‖K'‖`; on any failure, fall back to the classic dsbgvx
   path for the whole solve.

Cost estimate at default mesh: 1.7 s (dsbtrd) + ms (dstebz) + ~3–8 factorizations
× ~60–150 ms + cheap solves ≈ **2.5 s vs 17.4 s (~7×)**, with no n×n allocation.
At 128×32 the win is qualitative: ~90 s (dsbtrd-dominated, see Extensions)
instead of ~35 min + 1.28 GB.

## Prerequisites (blahpack side)

- Regenerate the notebook's eigensolver bundle with named exports
  `{ dsbtrd, dstebz }` alongside the default `dsbgvx` export (both already in
  the bundle, just not exported).
- New small bundle (or additional exports) for `dgbtrf` + `dgbtrs`
  (present in blahpack: `lib/lapack/base/dgbtrf`, `lib/lapack/base/dgbtrs` —
  verified 2026-07).

## Tasks

- [ ] blahpack: add bundle entry points for `dsbtrd`, `dstebz`, `dgbtrf`,
      `dgbtrs`; regenerate `dsbgvx-bundle.js` (+ new `dgbtrf-bundle.js`) and
      copy into `src/notebooks/mobius-strip/`.
- [ ] `modes.js`: add `computeFlexuralModesBandedII(model, X, massDiag, gradFn,
      routines, opts)` implementing steps 1–5, mirroring the existing
      `computeFlexuralModes` return shape (`{eigenvalues, frequencies, modes,
      rigidCount, bw}`). Keep it dependency-injected like the others.
- [ ] Cluster/shift chooser: gap-based clustering + PD-safe σ for the lowest
      cluster (σ < 0 works since K' is PSD); ε-perturbation when σ collides
      with an eigenvalue (dgbtrf exactly singular ⇒ retry with σ+ε).
- [ ] `fem-worker.js`: route the existing "Banded (dsbgvx)" solver choice to
      the new path; add "Banded classic (dsbgvx)" as a hidden/dev option for
      cross-checking. Dense path unchanged.
- [ ] Verification harness (extend `docs/plans/harness/profile-harness.mjs`):
      - eigenvalues match dsbgvx to rel. 1e-10 at 32×6, 64×10, 96×16;
      - flexural vectors match up to sign (and up to rotation within
        degenerate clusters — compare subspace angles, not vectors);
      - M-orthonormality of returned `shapeMassNorm` to 1e-12;
      - residuals `‖Kx − λMx‖` at the same order as dsbgvx's.
- [ ] Timing gate: ≥5× on the eigensolve phase at 64×10 in the harness.
- [ ] Notebook check: modes visually identical, status line reports the same
      frequencies, drag→relax→modes loop unaffected.
- [ ] Optional prose beat for the article once landed: the banded solver spent
      85% of its time building a 2112² matrix used for 14 vectors; the fix is
      the sparsity story told again at the eigensolver level.

## Risks and mitigations

- **Indefinite factorization robustness**: dgbtrf with partial pivoting is the
  standard tool; exact-singular shifts are detected via `info > 0` and
  perturbed. Growth is benign at these sizes.
- **Clustered/repeated eigenvalues** (rigid 6-fold at ~0; near-degenerate
  flexural pairs on symmetric meshes): handled by per-cluster orthogonalization;
  correctness judged by subspace angle, not per-vector comparison.
- **Convergence stalls** (shift far inside a cluster): cap iterations (say 5),
  then re-shift closer to the individual eigenvalue and refactor; ultimate
  fallback is the classic dsbgvx path.
- **Memory**: dgbtrf band storage is (3·bw+1)×n ≈ 6.6 MB at default,
  ~62 MB at max — fine.

## Extensions (out of scope for the first pass)

- At 128×32 the remaining cost is dsbtrd itself (O(n·bw²) ≈ 90 s estimated).
  A shift-invert **Lanczos** on `(K' − σI)^{-1}` (one dgbtrf at σ < 0 plus
  ~O(10–20) dgbtrs applies) computes the lowest eigenpairs without any
  tridiagonalization of the band — seconds even at max resolution. Natural
  follow-on once inverse iteration is in and trusted; also a good candidate
  for a translated ARPACK-style module in blahpack.
- Fix B reduces the dsbtrd term for whoever keeps calling dsbgvx directly.
