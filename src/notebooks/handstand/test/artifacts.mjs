// Replay-fidelity gates for the append-only artifact registry in runs/.
// Every registered trajectory must reproduce its recorded verdict when
// replayed under its OWN recorded configuration (plant, controller, ROM,
// strength). This is the regression net that catches any change to the
// simulation, servo, or scenario construction that silently rewrites what a
// recorded result means: if a change breaks history, this suite says so,
// and the fix is a new artifact, not a quiet reinterpretation.
//
// Run: node src/notebooks/handstand/test/artifacts.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildModel } from '../anthropometry.js';
import { createWorkspace } from '../dynamics.js';
import { strengthProfile } from '../strength.js';
import { ROM_DEFAULTS } from '../statics.js';
import { runScenario, resolveConfig } from '../rollout.js';

let failures = 0;
function gate(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const runsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'runs');
const manifest = JSON.parse(readFileSync(join(runsDir, 'manifest.json'), 'utf8'));

const model = buildModel({});
const ws = createWorkspace(model);

for (const g of manifest.gallery) {
  const j = JSON.parse(readFileSync(join(runsDir, g.file), 'utf8'));
  const strengthOpts = j.strength ? { overrides: j.strength.overrides || j.strength } : {};
  const prof = strengthProfile(model.massKg, strengthOpts);
  const rom = { ...ROM_DEFAULTS, ...(j.rom || {}) };
  const r = runScenario(model, ws, prof, {
    scenario: j.scenario,
    knots: j.knots.map((k) => Float64Array.from(k)),
    T: j.T,
    settleT: 2.5,
    dt: 2e-4,
    rom,
    // resolveConfig, not the raw config: an artifact predating a plant option
    // must replay with that option's PRE-EXISTING behavior, not today's
    // default. Spreading the raw config silently replayed history under the
    // current servo, which is the exact failure this file exists to catch.
    ...resolveConfig(j.config),
  });
  const want = !!j.verdict.success;
  const got = !!r.verdict.success;
  gate(`replay ${g.file}: success=${want} reproduced`, got === want,
    `recorded ${want}, replay ${got}, comY ${r.verdict.comY.toFixed(2)}`);
}

console.log(failures ? `\n${failures} artifact(s) FAILED to reproduce` : '\nAll artifacts reproduce their recorded verdicts');
process.exit(failures ? 1 : 0);
