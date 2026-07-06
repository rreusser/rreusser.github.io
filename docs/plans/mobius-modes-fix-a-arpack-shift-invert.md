# Fix A — ARPACK shift-invert for the Möbius notebook's flexural modes

Status: **landed** (2026-07). ARPACK symmetric closure translated in blahpack;
notebook `computeFlexuralModesArpack` wired as the default banded eigensolver,
with dsbgvx kept selectable as a cross-check. See [Results](#results).
Scope: blahpack (translate ARPACK's symmetric drivers) + `src/notebooks/mobius-strip/` (swap the modes path).
Companion plan: [Fix B — dsbtrd rotation blocking in blahpack](blahpack-fix-b-dsbtrd-blocking.md)
(independent: Fix A removes this notebook's dependence on dsbtrd's Q path
entirely; Fix B still improves dsbtrd for every dsbgvx/dsbevx consumer).

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

The root cause is an algorithmic mismatch: "a few extreme eigenpairs of a
large banded pencil" is not dsbgvx's regime. The reference ecosystem's
canonical answer for that regime is **ARPACK** (Lehoucq–Sorensen–Yang;
implicitly restarted Lanczos in the symmetric case), distributed via Netlib
and maintained today as
[arpack-ng](https://github.com/opencollab/arpack-ng). Its documented
shift-invert mode for generalized symmetric pencils — with a banded operator
factored by `dgbtrf`/`dgbtrs` — is exactly this problem, and ARPACK ships a
banded example driver (`EXAMPLES/BAND`, the `dsband` wrapper) doing precisely
this plumbing.

## Approaches considered and rejected

- **Hand-rolled banded inverse iteration** (an earlier draft of this plan):
  diagonal-mass rescale, dsbtrd(`vect='none'`) + dstebz for eigenvalues, then
  per-cluster `dgbtrf`/`dgbtrs` inverse iteration for vectors. Numerically
  sound and fast (~2.5 s estimated), but it relocates the genuinely hard parts
  — shift selection, cluster orthogonalization, convergence heuristics — into
  bespoke notebook code with **no Fortran reference to check number-for-number
  against**, only property checks. That breaks the project's trust model
  (translations validated side by side against the reference), which is the
  point of the whole exercise. Rejected in favor of translating the package
  whose job this is.
- **Default to the dense path** (dsygvx): zero new code and already faster at
  the default mesh (12.4 s vs 17.5 s), but still O(n³) with two n×n
  Float64Arrays — it does nothing for the high-resolution case. Acceptable as
  an interim default while ARPACK is translated; not a fix.

## Design

Translate ARPACK's double-precision symmetric pair into blahpack and drive it
the way ARPACK's own banded examples do:

1. **Routines**: `dsaupd` (reverse-communication implicitly restarted Lanczos)
   and `dseupd` (eigenvector extraction), plus their internal dependency
   closure (`dsaup2`, `dsaitr`, `dsapps`, `dsconv`, `dseigt`, `dsgets`,
   `dsortr`, `dstqrb`, `dgetv0`, …) — the LAPACK/BLAS leaves they call
   (`dsteqr`, `dlarnv`, `dgemv`, …) are already translated.
2. **Driver**: translate (or closely follow) `dsband.f` from ARPACK's
   `EXAMPLES/BAND` — the reference's own banded shift-invert plumbing — rather
   than inventing driver logic. Mode 3 (shift-invert) on the pencil
   `K φ = λ M φ`: OP = (K − σM)⁻¹M with `which='LM'` in the transformed
   spectrum, which converges fastest to the eigenvalues nearest σ.
3. **Problem setup in the notebook**: K in the existing bandwidth-reduced
   ordering (bw = 137); M diagonal (lumped), so K − σM is a diagonal update of
   the band. One σ below the spectrum (σ < 0; K is PSD, so K − σM is then PD
   and the factorization is safe) targets the lowest cluster — rigid and
   flexural modes together. `nev = 6 + nModes`, `ncv ≈ 2·nev`–`4·nev`.
   Factor K − σM once per solve with `dgbtrf` (general band; kl = ku = bw,
   ldab = 3·bw + 1) and apply with `dgbtrs` per Lanczos step.
4. **Post-processing**: dseupd returns M-orthonormal eigenvectors of the
   original pencil directly (mode 3 handles the back-transformation); reuse
   `packMode` unchanged. Rigid modes are identified by λ below threshold and
   discarded, as today.
5. **Fallback**: keep the dsbgvx path callable (dev/solver option) as the
   cross-check, exactly as dsygvx already is for dsbgvx.

Notebook code added by this plan is plumbing only — band assembly, the
factor/solve callbacks, and the reverse-communication loop — with all numerics
in translated reference code.

### Cost estimate

Per solve: one `dgbtrf` at (n = 2112, bw = 137) — the dpbsv analogue measured
60 ms; general-band LU with pivoting is a small multiple of that (~150–250 ms)
— plus a few tens of `dgbtrs` applications (O(n·bw) each, ~5–20 ms) and
O(n·ncv) Lanczos vector work. **Order 1–2 s at the default mesh, vs 17.4 s
(~10×).** No dsbtrd anywhere in the path, so at 128×32 the estimate is tens of
seconds and O(n·bw) memory — versus ~half an hour and 1.28 GB today.

## License

ARPACK is **BSD 3-Clause**, copyright Rice University (Sorensen, Lehoucq,
Yang, Maschhoff), as carried forward by arpack-ng's
[COPYING](https://github.com/opencollab/arpack-ng/blob/master/COPYING) —
one of the cleanly licensed Netlib-era packages, the same situation as LAPACK
(modified BSD). A JavaScript translation is a derivative work: blahpack's
ARPACK-derived modules must retain the Rice copyright notice and BSD
conditions, which is compatible with blahpack's MIT license and identical in
kind to what its LAPACK translations already require. (Contrast COLSYS, which
is genuinely license-less Netlib-era code — ARPACK is not in that bucket.)

## Translation scope and known challenges

- **Reverse communication**: dsaupd returns to the caller for every OP·x; its
  state lives in SAVE variables across calls. The translation needs an
  explicit state object (blahpack has not yet translated a
  reverse-communication routine; this is the main new pattern, and worth
  designing once — ARPACK's nonsymmetric drivers would reuse it).
- **COMMON blocks** (`debug.h`, `stat.h`): translate to a module-level state
  object or strip the debug/stat plumbing — decide once, consistently.
- **Verification**: the usual blahpack side-by-side (Fortran vs JS on
  identical inputs) needs the Fortran state observed across
  reverse-communication round-trips; arpack-ng's test suite (`TESTS/`, plus
  the `dsdrv*`/`dsbdr*` example drivers with known outputs) provides reference
  cases beyond fuzzing.

## Tasks

- [x] blahpack: translate `dsaupd`/`dseupd` + symmetric dependency closure
      (`dsaup2`, `dsaitr`, `dsapps`, `dsconv`, `dseigt`, `dsgets`, `dsortr`,
      `dsesrt`, `dstqrb`, `dgetv0`, `dstats`), with the reverse-communication
      state-object pattern documented; Rice BSD notice retained. (blahpack PR#10.)
- [x] blahpack: verification against arpack-ng — every routine matched its
      Fortran fixture number-for-number (RC drivers to ~1e-14 with exact
      iteration counts); driven by `test/run_fortran.sh arpack <r>`.
- [x] blahpack: translate the `dsband` banded driver as the packaged entry
      point (all six modes; standard + generalized).
- [x] blahpack: bundle entry point for the notebook — `dsband-bundle.js`
      (esbuild, ~184 KB, comparable to the dsbgvx bundle).
- [x] Notebook `modes.js`: `computeFlexuralModesArpack(model, X, massDiag,
      gradFn, dsband, opts)` — assembles the symmetric band from
      `fdHessianBanded` into LAPACK general-band storage (kl = ku = bw), forms
      K − σM implicitly inside dsband (mode 3), returns the existing
      `{eigenvalues, frequencies, modes, rigidCount, bw}` shape (+ `sigma`).
- [x] `fem-worker.js`: routes the eigensolver choice — ARPACK (default),
      dsbgvx (cross-check), dense (dsygvx) — via the `solver` key; the notebook
      select offers all three.
- [x] Cross-checks in the notebook harness: eigenvalues vs dsbgvx to ~1e-9,
      M-orthonormality to ~1e-15, residuals identical to dsbgvx, at 32×6,
      64×10, 96×16. See [Results](#results).
- [x] Timing gate: 9.3× on the eigensolve at 64×10 (≥5× target met); 25× at
      96×16. High-resolution memory ceiling removed (no n×n matrix).
- [ ] Interim (optional, zero-code): superseded — the real path landed.
- [ ] Article beat once landed: dsbgvx spent 85% of its time building a 2112²
      matrix used for 14 vectors; the reference world's answer to this regime
      is ARPACK, so ARPACK is what got translated next. (Prose update pending.)

## Results

Landed 2026-07. Verification/benchmark harness:
[harness/verify-arpack-modes.mjs](harness/verify-arpack-modes.mjs) (runs both
solvers on the real relaxed equilibrium across mesh sizes; `node
docs/plans/harness/verify-arpack-modes.mjs`).

| mesh   | n    | bw  | eig rel-err vs dsbgvx | M-orthonormality | residual parity | dsbgvx   | ARPACK  | speedup |
|--------|------|-----|-----------------------|------------------|-----------------|----------|---------|---------|
| 32×6   | 672  | 89  | 3.2e-10               | 2.0e-15          | exact           | 314 ms   | 152 ms  | 2.1×    |
| 64×10  | 2112 | 137 | 6.2e-10               | 3.6e-15          | exact           | 7.0 s    | 0.76 s  | 9.3×    |
| 96×16  | 4896 | 209 | 3.5e-9                | 3.8e-15          | exact           | 88 s     | 3.5 s   | 25.5×   |

The eigenvalues agree with dsbgvx to ~1e-9 (limited by ARPACK's tolerance, not
the method), the ARPACK modes are M-orthonormal to machine precision, and the
directional-FD residual ‖Kφ − λMφ‖ is identical to dsbgvx's to three figures
(the residual floor is set by the FD Hessian, not the eigensolver). The
eigensolve speedup grows with n, exactly as expected from removing the O(n³)
dsbtrd Q-accumulation: at the 64×10 default mesh it clears the plan's ≥5× gate
(9.3×), and at 96×16 it is 25×. No n×n matrix is ever formed, so the memory
ceiling that made the high-resolution mesh unusable is gone.

**Shift.** σ is scaled to the stiffness (`-1e-3 · maxᵢ Kᵢᵢ/Mᵢᵢ`), which sits
below the lowest cluster while keeping K − σM well-conditioned; it is exposed
as `opts.sigma`. Since K is PSD, any σ < 0 targets the smallest eigenvalues;
the magnitude only trades conditioning against transformed-spectrum separation.

**Dependency bug found and fixed.** Wiring this up surfaced a real correctness
bug in blahpack's `dgbtrf` (banded LU): its **blocked** path (active for
`kl ≥ 32`, i.e. every realistic notebook bandwidth) had a j2/j3 off-by-one in
the trailing-submatrix column counts, giving ~1e-3 solve errors while the
unblocked `dgbtf2` stayed at 1e-16. The fix (`MIN(JU-J+1,KV)` / `MAX(0,
JU-J-KV+1)`, matching reference LAPACK) already existed on a blahpack fix branch
but had never been merged into the ARPACK-foundation branch dsband sits on; it
was cherry-picked in. Without it every ARPACK eigenvalue was wrong (the Lanczos
vectors were still M-orthonormal, which is why only the eigenvalue/residual
cross-check — not the orthonormality check — caught it). Lesson reaffirmed: a
few-vector eigensolver returns B-orthonormal Ritz vectors even when the operator
is wrong, so orthonormality alone is not a correctness check.

## Risks and mitigations

- **Translation effort**: dsaupd's closure is a real project (a dozen routines
  plus the reverse-communication pattern). Mitigated by scope — symmetric
  double precision only — and by the pattern paying for itself across future
  ARPACK surface.
- **Shift-invert robustness**: σ colliding with an eigenvalue makes dgbtrf
  report exact singularity (`info > 0`) → perturb σ and refactor. σ < 0 on a
  PSD pencil avoids indefiniteness entirely for this notebook's use.
- **Clustered rigid modes**: the 6-fold λ ≈ 0 cluster is the best-separated
  region of the shift-inverted spectrum for σ < 0 near zero, and implicit
  restarting handles multiplicity — this is ARPACK's bread and butter, and the
  reason not to hand-roll.
- **Bundle size**: the symmetric closure is comparable to the dsbgvx bundle
  (~180 KB) — acceptable; measure and note in the PR.
