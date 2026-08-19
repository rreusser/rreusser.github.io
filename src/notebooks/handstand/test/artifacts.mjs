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
import { runScenario, resolvePlant, resolveRom, PLANT_DEFAULTS, LEGACY_PLANT } from '../rollout.js';

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
    ...resolvePlant(j.config),
  });
  const want = !!j.verdict.success;
  const got = !!r.verdict.success;
  gate(`replay ${g.file}: success=${want} reproduced`, got === want,
    `recorded ${want}, replay ${got}, comY ${r.verdict.comY.toFixed(2)}`);
}

// Every knob of the plant is accounted for, for every artifact. A trajectory
// replays on the machine that produced it, so each plant setting must either
// be written down in the artifact or have a recorded answer for what runs
// made before that knob existed did. Adding a knob to PLANT_DEFAULTS and
// forgetting LEGACY_PLANT would otherwise silently replay every older run
// with today's value -- which is how a widened wrist limit quietly rewrote
// what the flexible press was.
{
  const keys = Object.keys(PLANT_DEFAULTS);
  const missing = [];
  for (const g of manifest.gallery) {
    const j = JSON.parse(readFileSync(join(runsDir, g.file), 'utf8'));
    const have = new Set([...Object.keys(j.config || {}), ...Object.keys(LEGACY_PLANT)]);
    for (const k of keys) if (!have.has(k)) missing.push(`${g.file}:${k}`);
  }
  gate('every artifact accounts for every plant setting', missing.length === 0,
    missing.length ? missing.slice(0, 6).join(', ') : `${keys.length} settings x ${manifest.gallery.length} artifacts`);
}

// The plant a rollout reports is the whole plant. runScenario assembles what
// it ran on and hands it back, and producers record that rather than a
// hand-made copy of the defaults; this catches a setting added to the
// defaults but never threaded through the rollout, which would be recorded
// as absent and resolve to the legacy value on replay.
{
  const r = runScenario(model, ws, strengthProfile(model.massKg), { scenario: 'hold', T: 0.05, settleT: 0, dt: 1e-3 });
  const reported = new Set(Object.keys(r.plant));
  const absent = Object.keys(PLANT_DEFAULTS).filter((k) => !reported.has(k));
  const extra = [...reported].filter((k) => !(k in PLANT_DEFAULTS));
  gate('a rollout reports every plant setting it ran on', absent.length === 0 && extra.length === 0,
    absent.length || extra.length ? `missing ${absent.join(',')} extra ${extra.join(',')}` : `${reported.size} settings`);
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
const CANONICAL = ['014-kick-rom-peak.json', '015-press-strong-flexible.json',
  '016-press-strong-stiff.json', '021-bent-leg-press-hop.json'];
for (const file of CANONICAL) {
  const j = JSON.parse(readFileSync(join(runsDir, file), 'utf8'));
  const prof = strengthProfile(model.massKg, j.strength ? { overrides: j.strength.overrides || j.strength } : {});
  const rom = resolveRom(j.rom);
  const want = !!j.verdict.success;
  const got = [];
  for (const dt of [1e-4, 2.5e-4, 5e-4, 1e-3]) {
    const r = runScenario(model, ws, prof, {
      scenario: j.scenario, knots: j.knots.map((k) => Float64Array.from(k)), T: j.T,
      settleT: 2.5, dt, rom, ...resolvePlant(j.config),
    });
    got.push({ dt, ok: !!r.verdict.success, comY: r.verdict.comY });
  }
  gate(`timestep convergence ${file}`, got.every((g) => g.ok === want),
    got.map((g) => `${(g.dt * 1e4).toFixed(1)}e-4:${g.ok ? 'ok' : 'FALL'}`).join(' '));
}

console.log(failures ? `\n${failures} artifact(s) FAILED to reproduce` : '\nAll artifacts reproduce their recorded verdicts');
process.exit(failures ? 1 : 0);
