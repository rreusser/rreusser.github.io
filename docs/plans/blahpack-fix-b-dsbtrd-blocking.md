# Fix B — Block dsbtrd's rotation application in blahpack

Status: planned, not started.
Scope: [blahpack](https://github.com/rreusser/blahpack) (`lib/lapack/base/dsbtrd`
plus a new `bench/dsbtrd-opt` campaign); this repo only consumes the resulting
bundle. Companion plan: [Fix A — banded inverse iteration in the Möbius
notebook](mobius-modes-fix-a-inverse-iteration.md). The two are independent:
Fix A removes the notebook's need for Q accumulation entirely; Fix B speeds up
dsbtrd itself for every consumer of dsbgvx/dsbevx (and shrinks Fix A's
remaining 1.7 s eigenvalue step).

## Problem

The translated `dsbtrd` runs far below the memory/ALU ceiling the dgemm
campaign demonstrated is reachable in JS. Measured on the Möbius notebook's
stiffness matrix (n = 2112, kd = 137, lower storage, Node 22):

| configuration            | time    | approx. rate |
|--------------------------|---------|--------------|
| `vect='none'` (band only)| 1.74 s  | ~140 MFLOP/s (6·n·kd² estimate) |
| `vect='initialize'` (+Q) | 11.3 s  | rotation-bound, level-1 |

For comparison, the register-tiled dgemm
([bench/dgemm-opt report](https://github.com/rreusser/blahpack/blob/main/bench/dgemm-opt/reports/dgemm-optimization.md))
sustains several× that. dsbtrd is structurally the same situation dgemm was in
before tiling: correct, straight-from-Fortran loops, one element at a time.

V8 note: in CPU profiles the hot loops attribute to `dsbtrd` itself because the
small helpers (`drot`, `dlargv`, `dlartv`, `dlar2v`) get inlined; the
overwhelming share of samples is rotation application, split between the band
updates and (when vect≠'none') the Q column updates.

## Design

Mirror the dgemm-opt methodology: a benchmark harness, a correctness fuzz
against the reference implementation, and a sequence of measured variants.
Candidate variants, in expected order of value:

1. **Blocked Q update (the big one).** Rotations generated within one chase
   step of the KD-loop share structure; batch g consecutive rotations and apply
   them to Q in one sweep, dlasr-style, register-tiling over r rows of Q at a
   time (start g=2–4, r=4–8). Each Q element is then loaded once per g
   rotations instead of once per rotation — the update is memory-bound, so
   arithmetic-intensity gains translate ~directly. Expected 2–4× on the Q
   path (which is 85% of `vect='initialize'`).
2. **Monomorphic, stride-specialized inner loops.** The bundle's inner loops
   compute `offset + i*stride1 + j*stride2` per element with runtime strides.
   Specialize the dominant call shape (strideAB1=1, contiguous columns; Q
   column-major with strideQ1=1): hoist bases out of loops, iterate with unit
   increments, keep loop bodies free of the generic stride algebra so V8 keeps
   them monomorphic and vectorizable.
3. **Fused band-update pairs.** `dlartv`/`dlar2v` application to adjacent
   diagonals touches overlapping elements; fusing the two-rotation case halves
   loads on the band path (matters for `vect='none'`, i.e. Fix A's eigenvalue
   step and all dsbevx-family users).
4. **Unroll experiments** (2× / 4×) on the surviving hot loops, keeping an eye
   on deopts (`--trace-deopt` in the bench runner).

## Tasks

- [ ] blahpack: `bench/dsbtrd-opt/` scaffold copied from `bench/dgemm-opt/`
      (runner, timing methodology, report template).
- [ ] Baseline harness: random banded symmetric A (n ∈ {512, 2112, 4096},
      kd ∈ {8, 32, 137, 401}), lower and upper storage, vect ∈
      {'none','initialize','update'}; record ms and derived MFLOP/s.
- [ ] Correctness fuzz vs the current reference translation: d and e match to
      1e-13·‖A‖; with Q: ‖QᵀQ − I‖ ≤ n·ε·c and ‖QᵀAQ − T‖ ≤ tol; run on every
      variant commit.
- [ ] Variant 2 (stride specialization) first — lowest risk, isolates the
      indexing cost before the algorithmic blocking lands.
- [ ] Variant 1 (blocked Q update) with g and r swept in the bench; pick by
      measurement, as in the dgemm report.
- [ ] Variant 3 (fused band pairs), then 4 (unrolls) if profitable.
- [ ] Report: `bench/dsbtrd-opt/reports/dsbtrd-optimization.md` in the style of
      the dgemm report (what won, what didn't, and why).
- [ ] Regenerate this repo's `dsbgvx-bundle.js` from the optimized routine and
      re-run `docs/plans/harness/profile-harness.mjs` here to confirm the
      end-to-end effect on the notebook.

## Acceptance

- ≥2× on `vect='initialize'` at (n=2112, kd=137) and no regression at small
  kd (kd=8), with all fuzz checks passing.
- The notebook harness's dsbgvx phase drops proportionally (from 17.4 s to
  ≤9 s if Fix A hasn't landed; if Fix A has landed, the gate moves to the
  dsbtrd(`vect='none'`) line: 1.74 s → ≤0.9 s).

## Risks

- Blocked rotation application reorders floating-point operations; the fuzz
  tolerances above (backward-error style, not bitwise) are the right yardstick,
  matching how the dgemm variants were judged.
- The Kaufman chase's rotation groups have ragged edges at the band boundary;
  the blocked path needs a scalar cleanup tail — keep the reference loop as
  that tail so the edge cases stay trivially correct.
- If Fix A lands first, the Q path's real-world weight drops for this notebook;
  the campaign is still worth it for dsbevx/dsbgvx consumers generally, but
  re-rank against other blahpack work at that point.
