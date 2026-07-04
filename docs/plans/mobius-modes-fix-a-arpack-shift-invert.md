# Fix A — ARPACK shift-invert for the Möbius notebook's flexural modes

Status: planned, not started.
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

- [ ] blahpack: translate `dsaupd`/`dseupd` + symmetric dependency closure,
      with the reverse-communication state-object pattern documented; retain
      the Rice BSD notice on the derived modules.
- [ ] blahpack: verification against arpack-ng — example drivers (`dsdrv1`,
      `dsdrv4`, `dsbdr*`) reproduced to reference tolerances; side-by-side
      Fortran/JS runs on fuzzed symmetric problems (standard and generalized,
      modes 1–3).
- [ ] blahpack: translate the `dsband` banded driver (or a trimmed
      symmetric-only equivalent) as the packaged entry point.
- [ ] blahpack: bundle entry points for the notebook: `dsband` (or
      dsaupd/dseupd + dgbtrf/dgbtrs individually).
- [ ] Notebook `modes.js`: `computeFlexuralModesArpack(model, X, massDiag,
      gradFn, routines, opts)` — assemble banded K (existing `fdHessianBanded`
      + permutation), form K − σM, run the driver, return the existing
      `{eigenvalues, frequencies, modes, rigidCount, bw}` shape.
- [ ] `fem-worker.js`: route the banded solver choice to the ARPACK path; keep
      "Banded classic (dsbgvx)" as a dev cross-check option; dense unchanged.
- [ ] Cross-checks in the notebook harness: eigenvalues vs dsbgvx to rel.
      1e-10 at 32×6, 64×10, 96×16; subspace angles for degenerate clusters;
      M-orthonormality to 1e-12; residuals ‖Kx − λMx‖ at dsbgvx's level.
- [ ] Timing gate: ≥5× on the eigensolve phase at 64×10
      ([harness/profile-harness.mjs](harness/profile-harness.mjs)); a 128×32
      modes solve completes in under a minute without exceeding ~100 MB.
- [ ] Interim (optional, zero-code): default the notebook's eigensolver to
      dense until this lands, reverting when it does.
- [ ] Article beat once landed: dsbgvx spent 85% of its time building a 2112²
      matrix used for 14 vectors; the reference world's answer to this regime
      is ARPACK, so ARPACK is what got translated next.

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
