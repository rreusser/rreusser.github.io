#!/usr/bin/env node
// Rebuild the Fortran-translation bundles this notebook ships.
//
//   node src/notebooks/mobius-strip/bundles/build.mjs [--check]
//
// The notebook cannot import blahpack or netlib-ode from npm (they are not
// published), so each routine it needs is bundled to a single self-contained ESM
// file that sits next to index.html. This script regenerates those files from
// the source repos. Point it elsewhere with BLAHPACK= / NETLIB_ODE=.
//
// After building, run test/bundles.mjs -- a rebuild that quietly changes the
// numerics is the failure mode to worry about, not a build error.

import { build } from 'esbuild';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '..'); // the notebook directory itself
const BLAHPACK = process.env.BLAHPACK ?? resolve(homedir(), 'gh/rreusser/notes');
const NETLIB_ODE = process.env.NETLIB_ODE ?? resolve(homedir(), 'gh/rreusser/netlib-ode');

// Which variant of each routine to bundle. This is the part that bites:
//
//   lib/<pkg>/base/<name>/lib/base.js  -- explicit strides and offsets
//        ddot( N, x, strideX, offsetX, y, strideY, offsetY )
//   lib/<pkg>/base/<name>/lib/main.js  -- plain arguments, no strides
//        dsband( rvec, howmny, select, d, Z, ldz, sigma, ... )
//
// The notebook calls BLAS/dpbsv/dsbgvx/dsygvx with strides (base.js) and dsband
// without them (main.js). Bundle the wrong variant and the arguments silently
// shift by one meaning -- you get numbers, just not the right ones.
const BLAHPACK_BUNDLES = [
  {
    out: 'blas1.bundle.js',
    // One default export holding all five level-1 kernels, because optimize.js
    // takes a single `blas` object (see its `blas.ddot(...)` calls).
    contents: `
      import ddot from './lib/blas/base/ddot/lib/base.js';
      import daxpy from './lib/blas/base/daxpy/lib/base.js';
      import dscal from './lib/blas/base/dscal/lib/base.js';
      import dnrm2 from './lib/blas/base/dnrm2/lib/base.js';
      import dcopy from './lib/blas/base/dcopy/lib/base.js';
      export default { ddot, daxpy, dscal, dnrm2, dcopy };
    `,
  },
  {
    out: 'dpbsv-bundle.js',
    contents: `export { default } from './lib/lapack/base/dpbsv/lib/base.js';`,
  },
  {
    out: 'dsbgvx-bundle.js',
    contents: `export { default } from './lib/lapack/base/dsbgvx/lib/base.js';`,
  },
  {
    out: 'dsygvx.bundle.js', // note: dot, not dash. Matches the existing import.
    contents: `export { default } from './lib/lapack/base/dsygvx/lib/base.js';`,
  },
  {
    out: 'dsband-bundle.js',
    // main.js, NOT base.js: modes.js calls dsband without strides.
    contents: `export { default } from './lib/arpack/base/dsband/lib/main.js';`,
  },
];

// COLSYS is a separate project (a TypeScript translation of the Netlib
// boundary-value solver) and carries its own block-structured linear algebra, so
// it shares nothing with blahpack. esbuild reads its TypeScript directly.
const NETLIB_BUNDLE = {
  out: 'colsys-bundle.js',
  entry: resolve(NETLIB_ODE, 'src/index.ts'),
};

const COMMON = {
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  // The @stdlib helpers these routines pull in are CommonJS with only "main".
  mainFields: ['main', 'module'],
  logLevel: 'warning',
};

function requireRepo(path, name, envVar) {
  if (existsSync(path)) return;
  console.error(`error: ${name} not found at ${path}`);
  console.error(`       clone it, or set ${envVar}=/path/to/${name}`);
  process.exit(1);
}

const check = process.argv.includes('--check');

requireRepo(BLAHPACK, 'blahpack', 'BLAHPACK');
requireRepo(NETLIB_ODE, 'netlib-ode', 'NETLIB_ODE');

console.log(`blahpack:   ${BLAHPACK}`);
console.log(`netlib-ode: ${NETLIB_ODE}`);
console.log(`output:     ${OUT}\n`);

const results = [];

for (const b of BLAHPACK_BUNDLES) {
  const r = await build({
    ...COMMON,
    // Feed the entry through stdin so no machine-specific absolute path ends up
    // in a committed file. resolveDir is the blahpack root, which is also what
    // lets the bundled @stdlib imports resolve out of blahpack's node_modules.
    stdin: { contents: b.contents, resolveDir: BLAHPACK, sourcefile: b.out, loader: 'js' },
    outfile: resolve(OUT, b.out),
    write: !check,
  });
  results.push([b.out, check ? r.outputFiles[0].contents.length : null]);
}

const r = await build({
  ...COMMON,
  entryPoints: [NETLIB_BUNDLE.entry],
  outfile: resolve(OUT, NETLIB_BUNDLE.out),
  write: !check,
});
results.push([NETLIB_BUNDLE.out, check ? r.outputFiles[0].contents.length : null]);

for (const [name] of results) console.log(`  ${check ? 'built (not written)' : 'wrote'}  ${name}`);
console.log(`\n${check ? 'Check build succeeded; nothing written.' : 'Done. Now run: node test/bundles.mjs'}`);
