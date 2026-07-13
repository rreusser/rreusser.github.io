# Plans

Executable optimization plans, each with measured baselines reproducible via
[harness/](harness/):

- [Fix A — ARPACK shift-invert for the Möbius notebook's flexural
  modes](mobius-modes-fix-a-arpack-shift-invert.md): dsbgvx spends 85% of an
  88%-dominant routine accumulating an n×n Q used for 14 eigenvectors. Rather
  than hand-rolling a replacement (rejected: bespoke numerics with no Fortran
  reference to verify against), translate ARPACK's symmetric shift-invert
  drivers (BSD 3-Clause, Rice) — the reference ecosystem's canonical answer to
  this regime. ~10× on the modes step at default resolution; makes max
  resolution feasible at all.
- [Fix B — dsbtrd rotation blocking in blahpack](blahpack-fix-b-dsbtrd-blocking.md):
  dgemm-opt-style campaign for the band→tridiagonal reduction (~140 MFLOP/s
  today), constrained to memory-schedule changes only: same algorithm, same
  rotation sequence, same per-element arithmetic order, with **bit-identical
  output vs the reference translation** as a hard gate (stricter than the
  dgemm campaign, which reorders summation and is judged by backward error).

Harness scripts (run from anywhere; paths are repo-relative):

- `harness/profile-harness.mjs` — full pipeline phases (+ `DENSE=1` for dsygvx);
  designed for `node --cpu-prof`.
- `harness/parse-profile.mjs <file.cpuprofile>` — top functions by self time.
- `harness/dsbtrd-timing.mjs` — Q-accumulation share + one banded factor+solve.
- `harness/rebuild-timing.mjs` — per-frame render-path CPU cost (healthy today).
