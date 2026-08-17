// Offline catch-window computation for the presets embedded in presets.js.
// Usage: node scripts/catch.mjs [outfile]
import { writeFileSync } from 'node:fs';
import { buildModel } from '../anthropometry.js';
import { createWorkspace } from '../dynamics.js';
import { strengthProfile } from '../strength.js';
import { catchWindow } from '../rollout.js';

const [outfile = null] = process.argv.slice(2);
const model = buildModel({});
const ws = createWorkspace(model);
const prof = strengthProfile(model.massKg, process.env.STRENGTH_JSON ? JSON.parse(process.env.STRENGTH_JSON) : {});

const t0 = Date.now();
const grid = catchWindow(model, ws, prof, {
  thetaLoDeg: -8, thetaHiDeg: 8, nTheta: 33,
  omegaLo: -1.6, omegaHi: 1.6, nOmega: 27,
  T: 2.5,
  onRow: (i, n) => process.stdout.write(`row ${i + 1}/${n}\r`),
});
console.log(`\n${((Date.now() - t0) / 1000).toFixed(1)}s`);

let count = 0;
for (const s of grid.success) count += s;
console.log(`caught ${count}/${grid.success.length}`);
const out = {
  thetasDeg: grid.thetasDeg, omegas: grid.omegas,
  success: Array.from(grid.success), nTheta: grid.nTheta, nOmega: grid.nOmega,
};
if (outfile) { writeFileSync(outfile, JSON.stringify(out)); console.log('wrote', outfile); }
