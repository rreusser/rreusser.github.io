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
import { runScenario, resolveConfig, resolveRom } from '../rollout.js';

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
  const rom = resolveRom(j.rom);
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

// Timestep convergence. A verdict that flips when the integrator step
// changes is a property of the integrator, not of the body. The canonical
// entries -- the two the notebook argues from -- must hold their verdict
// across the whole range, not merely at the step they were recorded with.
//
// This is gated because it has been wrong once: the contact damper was
// sized for a quarter of body mass while acting on the 0.85 kg hand, so
// explicit damping was only stable below 0.49 ms, and the canonical kick-up
// inverted between dt = 5e-4 and 1e-3. Hunt-Crossley damping fixed it; this
// stops it coming back.
const CANONICAL = ['014-kick-rom-peak.json', '015-press-strong-flexible.json', '016-press-strong-stiff.json'];
for (const file of CANONICAL) {
  const j = JSON.parse(readFileSync(join(runsDir, file), 'utf8'));
  const prof = strengthProfile(model.massKg, j.strength ? { overrides: j.strength.overrides || j.strength } : {});
  const rom = resolveRom(j.rom);
  const want = !!j.verdict.success;
  const got = [];
  for (const dt of [1e-4, 2.5e-4, 5e-4, 1e-3]) {
    const r = runScenario(model, ws, prof, {
      scenario: j.scenario, knots: j.knots.map((k) => Float64Array.from(k)), T: j.T,
      settleT: 2.5, dt, rom, ...resolveConfig(j.config),
    });
    got.push({ dt, ok: !!r.verdict.success, comY: r.verdict.comY });
  }
  gate(`timestep convergence ${file}`, got.every((g) => g.ok === want),
    got.map((g) => `${(g.dt * 1e4).toFixed(1)}e-4:${g.ok ? 'ok' : 'FALL'}`).join(' '));
}

console.log(failures ? `\n${failures} artifact(s) FAILED to reproduce` : '\nAll artifacts reproduce their recorded verdicts');
process.exit(failures ? 1 : 0);
