# Plans

Executable optimization plans, each with measured baselines reproducible via
[harness/](harness/):

- [Fix A — banded shift-invert inverse iteration for the Möbius notebook's
  flexural modes](mobius-modes-fix-a-inverse-iteration.md): removes dsbgvx's
  O(n³) Q accumulation (85% of an 88%-dominant routine); ~7× on the modes step
  at default resolution and makes max resolution feasible at all.
- [Fix B — dsbtrd rotation blocking in blahpack](blahpack-fix-b-dsbtrd-blocking.md):
  dgemm-opt-style campaign for the band→tridiagonal reduction itself (~140
  MFLOP/s today); benefits every dsbgvx/dsbevx consumer, independent of Fix A.

Harness scripts (run from anywhere; paths are repo-relative):

- `harness/profile-harness.mjs` — full pipeline phases (+ `DENSE=1` for dsygvx);
  designed for `node --cpu-prof`.
- `harness/parse-profile.mjs <file.cpuprofile>` — top functions by self time.
- `harness/dsbtrd-timing.mjs` — Q-accumulation share + one banded factor+solve.
- `harness/rebuild-timing.mjs` — per-frame render-path CPU cost (healthy today).
