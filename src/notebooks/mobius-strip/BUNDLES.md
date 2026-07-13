# Rebuilding the Fortran-translation bundles

This notebook runs BLAS, LAPACK, ARPACK and COLSYS in the browser. None of those
are published to npm, so each routine it needs is bundled ahead of time into a
self-contained ESM file sitting next to `index.html`:

| Bundle | Source repo | Routine | Used for |
| --- | --- | --- | --- |
| `blas1.bundle.js` | blahpack | `ddot` `daxpy` `dscal` `dnrm2` `dcopy` | vector kernels inside L-BFGS and Newton-CG |
| `dpbsv-bundle.js` | blahpack | `dpbsv` | banded Cholesky, the banded Newton step |
| `dsband-bundle.js` | blahpack | `dsband` | ARPACK shift-invert Lanczos, the default eigensolver |
| `dsbgvx-bundle.js` | blahpack | `dsbgvx` | banded generalized eigensolver (cross-check) |
| `dsygvx.bundle.js` | blahpack | `dsygvx` | dense generalized eigensolver (cross-check) |
| `colsys-bundle.js` | netlib-ode | `solveBvp` + COLSYS | the Mahadevan–Keller elastic-rod seed shape |

Those six files are committed. You only need to rebuild them when blahpack or
netlib-ode changes.

## Rebuild

```sh
node src/notebooks/mobius-strip/bundles/build.mjs  # writes the six bundles
node src/notebooks/mobius-strip/test/bundles.mjs   # gate them (do not skip)
```

The build expects the source repos at `~/gh/rreusser/notes` (blahpack) and
`~/gh/rreusser/netlib-ode`. Override with environment variables:

```sh
BLAHPACK=/path/to/blahpack NETLIB_ODE=/path/to/netlib-ode \
  node src/notebooks/mobius-strip/bundles/build.mjs
```

`--check` builds everything without writing, to confirm the sources still bundle.

## The one thing that will bite you

blahpack ships each routine in two flavours, and **they take different
arguments**:

- `lib/<pkg>/base/<name>/lib/base.js` — explicit strides and offsets
  `ddot( N, x, strideX, offsetX, y, strideY, offsetY )`
- `lib/<pkg>/base/<name>/lib/main.js` — plain arguments, no strides
  `dsband( rvec, howmny, select, d, Z, ldz, sigma, ... )`

This notebook calls BLAS, `dpbsv`, `dsbgvx` and `dsygvx` **with** strides
(`base.js`), and `dsband` **without** them (`main.js`). Bundle the wrong flavour
and every argument shifts by one meaning: you get no error, just a plausible
wrong answer. `build.mjs` encodes the correct choice per routine; if you add a
routine, check its call site in `modes.js` / `optimize.js` first.

## Verification

The notebook's checks all live in `test/`:

| Script | Checks |
| --- | --- |
| `test/bundles.mjs` | the six bundles (see below) |
| `test/bending.mjs` | the FEM bending model: rest state, analytic gradient vs finite differences, plate-energy agreement across aspect ratios, Hessian bandwidth, resolution-consistency |
| `test/solvers.mjs` | the equilibrium solvers: L-BFGS vs Newton-CG vs banded Newton, judged on total energy |

`test/bundles.mjs` drives the bundles through the notebook's *own* wrappers — the
same ones `fem-worker.js` uses — rather than through hand-written calls, and then
checks invariants rather than hard-coded numbers:

- **BLAS** kernels against known values, in the strided calling convention.
- **COLSYS** solves the rod BVP and the loop actually closes (`closure < 1e-6`).
- **`dpbsv`** drives banded Newton to the same energy minimum that Newton-CG
  reaches without ever calling `dpbsv`. Two independent routes, one minimum.
- **The three eigensolvers** (`dsband`, `dsbgvx`, `dsygvx`) must agree with each
  other on the flexural spectrum, and that spectrum must be non-negative — a
  negative eigenvalue would mean the "equilibrium" is a saddle.

Three independent eigensolvers landing on the same spectrum is much stronger
evidence than any one of them matching a number pasted into a test.

Two traps worth knowing about, both of which produced false failures while this
gate was being written:

- The mode wrappers already strip the six rigid-body modes internally, and the
  option is `nModes`, not `nev`.
- On a coarse mesh (32×6) the spectrum carries an extra numerically null
  direction, λ ≈ 1e-9 against ~1e-2 for the real modes. Its value is round-off,
  so a *relative* comparison against it is meaningless and will report a ~10%
  "disagreement" between solvers that in fact agree to seven digits. The gate
  compares only modes above `1e-6 × λ_max`.

All three are plain Node scripts with no test runner; run them directly.
