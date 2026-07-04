# Fix B — Block dsbtrd's rotation application in blahpack

Status: planned, not started.
Scope: [blahpack](https://github.com/rreusser/blahpack) (`lib/lapack/base/dsbtrd`
plus a new `bench/dsbtrd-opt` campaign); this repo only consumes the resulting
bundle. Companion plan: [Fix A — ARPACK shift-invert for the Möbius
notebook](mobius-modes-fix-a-arpack-shift-invert.md). The two are independent:
Fix A removes the notebook's dependence on dsbtrd's Q path entirely; Fix B
speeds up dsbtrd itself for every consumer of dsbgvx/dsbevx.

## Faithfulness contract

This campaign does **not** change the algorithm. dsbtrd remains Kaufman
bulge-chasing, generating the **same rotation sequence** and applying the
**same arithmetic operations to each element in the same dependent order** as
the current reference translation. The only thing the variants change is the
*memory schedule* — which independent elements are processed together.

That admits a gate stricter than any tolerance:

> **Every variant must produce bit-identical output (d, e, AB, Q) to the
> current reference translation, on the full fuzz matrix.**

This is achievable, and stronger than it may sound, for two reasons:

1. The candidate transformations don't reorder dependent arithmetic. Stride
   specialization changes indexing only. Fusing consecutive rotations applies
   G₁ then G₂ to each element in the original order; blocking across rows of Q
   interleaves *independent* data. Nothing is resummated.
2. JavaScript semantics guarantee it stays that way: every `+`/`*` is a single
   IEEE-754 double operation — no FMA contraction, no reassociation, none of
   the compiler latitude that makes bit-reproducibility hard in C/Fortran.

For contrast: the dgemm-opt campaign's register tiling *does* reorder
summation, and was rightly judged by backward error. This campaign commits to
the stricter standard because it can. If some future variant genuinely needed
arithmetic reordering (e.g. SIMD-style multi-accumulator sums), that is the
moment to introduce an explicit reference-vs-optimized tier split, as BLAS
implementations have always had — it is out of scope here, and nothing below
requires it.

(The general distinction, for the record: a LAPACK routine's *contract* is its
interface and documented numerical behavior — which is all MKL or OpenBLAS
preserve — while blahpack's promise is stronger: a faithful translation of the
reference implementation. This campaign stays within the stronger promise.)

## Problem

The translated `dsbtrd` runs far below the memory/ALU ceiling the dgemm
campaign demonstrated is reachable in JS. Measured on the Möbius notebook's
stiffness matrix (n = 2112, kd = 137, lower storage, Node 22; see
[harness/dsbtrd-timing.mjs](harness/dsbtrd-timing.mjs)):

| configuration            | time    | note |
|--------------------------|---------|------|
| `vect='none'` (band only)| 1.74 s  | ~140 MFLOP/s (6·n·kd² estimate) |
| `vect='initialize'` (+Q) | 11.3 s  | Q update = 84.5% of the routine |

V8 note: in CPU profiles the hot loops attribute to `dsbtrd` itself because
the small helpers (`drot`, `dlargv`, `dlartv`, `dlar2v`) get inlined; the
overwhelming share of samples is rotation application, split between the band
updates and (when vect ≠ 'none') the Q column updates.

## Design

Mirror the dgemm-opt methodology: a benchmark harness, a correctness gate, and
a sequence of measured variants. Ordered by risk (lowest first), since each
must independently hold the bit-identity gate:

1. **Stride-specialized, monomorphic inner loops.** The bundle's inner loops
   compute `offset + i*stride1 + j*stride2` per element with runtime strides.
   Specialize the dominant call shape (strideAB1 = 1, contiguous columns; Q
   column-major with strideQ1 = 1): hoist bases out of loops, iterate with
   unit increments, keep loop bodies free of generic stride algebra so V8
   keeps them monomorphic. Pure indexing — arithmetic untouched by
   construction. Isolates how much of the gap is bookkeeping before any
   blocking lands.
2. **Blocked Q update (the big one).** Rotations generated within one chase
   step share structure; batch g consecutive rotations and apply them to Q in
   one sweep, register-tiling over r rows at a time (start g = 2–4, r = 4–8).
   Each Q element is loaded once per g rotations instead of once per rotation;
   per element, the g rotations are applied in their original order, so the
   dependent-operation chain — and therefore the bits — are unchanged. The Q
   update is memory-bound, so the arithmetic-intensity gain translates
   ~directly. Expected 2–4× on the Q path (84.5% of `vect='initialize'`).
3. **Fused band-update pairs.** `dlartv`/`dlar2v` application to adjacent
   diagonals touches overlapping elements; fusing the two-rotation case halves
   loads on the band path (matters for `vect='none'` — Fix A's world — and all
   dsbevx-family users), again preserving per-element operation order.
4. **Unroll experiments** (2× / 4×) on surviving hot loops, watching for
   deopts (`--trace-deopt` in the bench runner).

## Tasks

- [ ] blahpack: `bench/dsbtrd-opt/` scaffold copied from `bench/dgemm-opt/`
      (runner, timing methodology, report template).
- [ ] Baseline harness: random banded symmetric A (n ∈ {512, 2112, 4096},
      kd ∈ {8, 32, 137, 401}), lower and upper storage, vect ∈
      {'none', 'initialize', 'update'}; record ms and derived MFLOP/s.
- [ ] Correctness gate, run on every variant commit: **bitwise equality** of
      d, e, the overwritten AB, and Q against the current reference
      translation across the full baseline matrix (Float64Array byte
      comparison — no tolerances). Keep the existing analytical sanity checks
      (‖QᵀQ − I‖, ‖QᵀAQ − T‖) as a second line of defense.
- [ ] Variant 1 (stride specialization), measured and reported.
- [ ] Variant 2 (blocked Q update) with g and r swept in the bench; pick by
      measurement, as in the dgemm report.
- [ ] Variant 3 (fused band pairs), then 4 (unrolls) if profitable.
- [ ] Report: `bench/dsbtrd-opt/reports/dsbtrd-optimization.md` in the style
      of the dgemm report — what won, what didn't, why, and an explicit
      statement that all variants are bit-identical to the reference
      translation.
- [ ] Regenerate this repo's `dsbgvx-bundle.js` from the optimized routine and
      re-run [harness/profile-harness.mjs](harness/profile-harness.mjs) here
      to confirm the end-to-end effect on the notebook.

## Acceptance

- Bit-identical outputs everywhere, per the gate above — this is a hard
  requirement, not a target.
- ≥2× on `vect='initialize'` at (n = 2112, kd = 137); no regression at small
  kd (kd = 8).
- Notebook effect: the harness's dsbgvx phase drops proportionally (17.4 s →
  ≤9 s if Fix A hasn't landed; if it has, the gate moves to the
  `vect='none'` line: 1.74 s → ≤0.9 s).

## Risks

- **A variant can't hold bit-identity**: then it is doing more than
  rescheduling memory and is out of scope — drop or redesign it. The gate is
  the definition of the campaign, not an obstacle to it.
- **Ragged edges**: the Kaufman chase's rotation groups end unevenly at the
  band boundary; the blocked paths need a scalar cleanup tail. Use the
  reference loop as that tail so edge cases are trivially correct (and
  trivially bit-identical).
- **Prioritization vs Fix A**: if Fix A lands first, the Q path's real-world
  weight for this notebook drops to zero; the campaign remains worthwhile for
  dsbgvx/dsbevx consumers generally, but re-rank it against other blahpack
  work at that point.
