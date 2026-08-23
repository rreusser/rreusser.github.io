// Do the techniques the notebook opens with actually produce a handstand --
// each one on the body it claims to need?
//
// This is the gate that was missing, and its absence cost the notebook nine
// commits of being quietly broken. The presets stopped being RECORDED (a
// checked-in optimizer artifact, replayed on the plant it was made under) and
// became DERIVED (a hand-authored reference, evaluated on today's plant),
// which is the right rule and which turned every built-in technique into a
// claim that nothing tested. The claim was false: the kick-up threw itself
// past its fingers at t = 1.0, the straight-leg press drifted off the back of
// its palms without ever rising, and the bent-leg press fell backwards out of
// the start. Only "hold a handstand", which begins in one, arrived. A reader
// opening the notebook saw "does not arrive" under every technique in the
// picker, and a search warm-started inside that family had nothing to follow:
// every member failed, so the only thing left ranking them was when they fell.
//
// The strength each technique is tested at is NOT a knob to make this pass.
// It is the notebook's central claim, in the prose above the figure -- 1.6
// Nm/kg of shoulder for a kick-up, 2.2 and 2.8 for a press -- and it is
// reproduced independently by holding each reference pose in turn and watching
// where the deep positions of a press become holdable:
//
//     shoulder Nm/kg    press positions the body can hold
//        1.6            only the near-handstand ones
//        2.2            + the entry
//        2.8            + most of the rise
//        3.2            all of them
//
// So a press failing at the default 1.6 is the RESULT, not a bug, and this
// gate asks each technique the only question a starting point has to answer
// yes to: on the body you need, do you arrive?
//
// Run: node src/notebooks/handstand/test/presets-arrive.mjs
import { buildModel } from '../anthropometry.js';
import { createWorkspace, momenta } from '../dynamics.js';
import { strengthProfile, STRENGTH_DEFAULTS } from '../strength.js';
import { ROM_DEFAULTS } from '../statics.js';
import { builtinPresets, BUILTIN_SCENARIOS } from '../presets.js';
import { runScenario, balancedHandstand, kickReference, KICK_T, robustRolloutCost,
  encodeDecision, resolveRom, resolvePlant, PLANT_DEFAULTS } from '../rollout.js';
import { techniqueRunArgs } from '../technique-file.js';

let failures = 0;
function gate(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

// The shoulder each technique needs, in Nm/kg of body mass.
const NEEDS = { lunge: 1.6, hold: 1.6, tuck: 2.8, pike: 2.8 };

const model = buildModel({});
const ws = createWorkspace(model);
const presets = builtinPresets(model, ws, ROM_DEFAULTS);
const comYbal = momenta(model, balancedHandstand(model, ws), new Float64Array(model.nq), ws).comY;

const profAt = (t0Vol) => strengthProfile(model.massKg,
  { overrides: { shoulder: { ...STRENGTH_DEFAULTS.shoulder, t0Vol } } });

function replay(key, t0Vol) {
  const p = presets[key];
  const r = runScenario(model, ws, profAt(t0Vol), techniqueRunArgs(p, model, ws));
  let peak = -Infinity;
  for (let k = 0; k < r.rec.com.length; k++) peak = Math.max(peak, r.rec.com[k][1]);
  return { arrives: !!r.verdict?.success, peak, T: p.T };
}

console.log(`a handstand puts the centre of mass at ${comYbal.toFixed(3)} m\n`);
console.log('  scenario   needs   T      arrives  peak CoM');
const rows = [];
for (const s of BUILTIN_SCENARIOS) {
  const need = NEEDS[s.key] ?? 1.6;
  const row = { ...replay(s.key, need), key: s.key, label: s.label, need };
  rows.push(row);
  console.log(`  ${s.key.padEnd(10)} ${need.toFixed(1).padStart(5)}  ${row.T.toFixed(2)}   ` +
    `${String(row.arrives).padEnd(8)} ${row.peak.toFixed(3).padStart(8)}   ${s.label}`);
}
console.log('');

for (const row of rows) {
  gate(`${row.key}: arrives on the body it needs (${row.need} Nm/kg of shoulder)`,
    row.arrives, `peak CoM ${row.peak.toFixed(3)} m against ${comYbal.toFixed(3)}`);
}

// The kick-up is the one the notebook says an ordinary shoulder can do, so it
// gets the harder questions. A starting point that only works at one timestep
// is a knife edge, not a technique: the search scores every candidate against
// a second rollout at a different step with a jittered start, and the opening
// technique has to survive that too.
{
  const { knots, target } = kickReference(model, ws, 6, ROM_DEFAULTS);
  const c = robustRolloutCost(model, ws, profAt(NEEDS.lunge), resolveRom({}), 'lunge',
    encodeDecision(knots, KICK_T),
    { K: 6, target, plant: resolvePlant({ ...PLANT_DEFAULTS }) });
  gate('lunge: and survives the robustness variants the search scores against',
    c.terms.fall === 0, `worst-case cost ${c.cost.toFixed(1)}, fall term ${c.terms.fall.toFixed(1)}`);
}

// And it should not be balanced on a knife edge in TIME either. The tempo was
// chosen as the middle of the band the throw arrives over rather than the
// value the search stopped at, precisely so this holds.
{
  const p = presets.lunge;
  const prof = profAt(NEEDS.lunge);
  const at = (T) => {
    const r = runScenario(model, ws, prof, { ...techniqueRunArgs(p, model, ws), T });
    return !!r.verdict?.success;
  };
  const margin = [-0.06, -0.03, 0, 0.03, 0.06].map((d) => at(KICK_T + d));
  gate('lunge: and still arrives at +/- 0.06 s of its tempo',
    margin.every(Boolean),
    `${margin.filter(Boolean).length}/5 tempos in [${(KICK_T - 0.06).toFixed(2)}, ${(KICK_T + 0.06).toFixed(2)}]`);
}

console.log(failures ? `\n${failures} GATE(S) FAILED` : '\nALL GATES PASS');
process.exit(failures ? 1 : 0);
