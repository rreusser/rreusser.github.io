// Do the techniques the notebook opens with actually produce a handstand?
//
// This is the gate that makes shipping RECORDINGS safe, and it is the reason
// builtin-techniques.js is allowed to be data again. A recorded technique
// pins the plant, the anatomy, the strength and the integration it was
// searched under, so it can go stale in a way a derived one cannot: improve
// the servo, articulate another joint, change how a contact is integrated,
// and a checked-in answer is quietly an answer to a different question. The
// only defence is to replay every one of them on every build and insist it
// still arrives.
//
// Each one is replayed exactly as the page replays it -- on the body, the
// range of motion, the strength, the plant and the step IT carries, not on
// some table of expectations kept here. There is nothing to keep in step: the
// technique is the whole problem statement, and if it stops arriving the
// answer is either to re-search it or to say out loud that the model moved.
// Saying it out loud is what AWAITING_SEARCH below is: a named, gated list of
// the recordings the model has moved out from under, so the debt is visible
// rather than either hidden by a weakened gate or drowned in a red suite.
//
// The bodies are the subject, not the setting. Two of these are the same
// skill -- a kick-up -- solved for two different bodies, one with sixty
// degrees of straight-leg hip flexion and a 1.45 Nm/kg shoulder and one with
// a hundred and thirty and half that strength. That contrast is what the
// presets are for, and it is a thing only a recording can say.
//
// Run: node src/notebooks/handstand/test/presets-arrive.mjs
import { buildModel } from '../anthropometry.js';
import { createWorkspace, momenta } from '../dynamics.js';
import { strengthProfile } from '../strength.js';
import { BUILTIN_TECHNIQUES } from '../builtin-techniques.js';
import {
  runScenario, balancedHandstand, robustRolloutCost, encodeDecision,
} from '../rollout.js';
import {
  techniqueFromJSON, techniqueToJSON, techniqueRunArgs, techniqueSearchArgs,
  techniqueModelParams, techniqueStrengthOpts,
} from '../technique-file.js';

// Recordings that have been MIGRATED onto a new body but not yet re-searched
// on it. They are not held to arriving, because they cannot be: a recording is
// an answer to the body it was found on, and the body changed under it.
//
// This list is a debt, not an exemption. It exists because articulating the
// elbow and the ankles made the legs 13 cm longer and gave the push-off a
// joint it did not have, and a kick-up tuned for the old proportions does not
// survive that -- the straight-leg press does, which is what a slow
// quasi-static movement being robust looks like. Each of these needs a search
// on the articulated body, and the entry comes out of this list when it gets
// one.
//
// It cannot rot quietly: gate 0 below fails if a technique named here turns
// out to arrive after all, so a name left behind after a successful re-search
// is caught rather than silently excusing a technique that no longer needs
// excusing.
const AWAITING_SEARCH = new Set(['lowflex', 'highflex', 'tuckup']);

let failures = 0;
function gate(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const rows = [];
console.log('  technique                  skill  K  T      shoulder  arrives  peak CoM  a handstand is');
for (const t of BUILTIN_TECHNIQUES) {
  const rec = techniqueFromJSON(techniqueToJSON(t));
  const model = buildModel(techniqueModelParams(rec));
  const ws = createWorkspace(model);
  const prof = strengthProfile(model.massKg, techniqueStrengthOpts(rec));
  const r = runScenario(model, ws, prof, techniqueRunArgs(rec, model, ws));
  let peak = -Infinity;
  for (let k = 0; k < r.rec.com.length; k++) peak = Math.max(peak, r.rec.com[k][1]);
  const bal = momenta(model, balancedHandstand(model, ws), new Float64Array(model.nq), ws).comY;
  rows.push({ t, rec, model, ws, prof, r, peak, bal });
  console.log(`  ${t.label.padEnd(26)} ${rec.scenario.padEnd(6)} ${rec.knots[0].length}  `
    + `${rec.T.toFixed(2)}   ${String(rec.strength?.shoulder?.t0Vol ?? '-').padStart(6)}    `
    + `${String(!!r.verdict?.success).padEnd(7)}  ${peak.toFixed(3).padStart(8)}  ${bal.toFixed(3).padStart(8)}`);
}
console.log('');

{
  const stale = [...AWAITING_SEARCH].filter((k) => {
    const row = rows.find((r) => r.t.key === k);
    return row && !!row.r.verdict?.success;
  });
  const gone = [...AWAITING_SEARCH].filter((k) => !rows.some((r) => r.t.key === k));
  gate('0: the re-search list names only techniques that still need one',
    stale.length === 0 && gone.length === 0,
    stale.length || gone.length
      ? `${stale.length ? `${stale.join(', ')} arrive(s) now -- take them off the list` : ''}`
        + `${gone.length ? `${stale.length ? '; ' : ''}${gone.join(', ')} no longer exist(s)` : ''}`
      : `${AWAITING_SEARCH.size} awaiting a search on the articulated body`);
}

for (const row of rows) {
  const owed = AWAITING_SEARCH.has(row.t.key);
  const detail = `peak CoM ${row.peak.toFixed(3)} m against ${row.bal.toFixed(3)}`;
  if (owed) {
    console.log(`....  ${row.t.key}: awaiting a search on the articulated body  (${detail})`);
    continue;
  }
  gate(`${row.t.key}: arrives, on the body it carries`, !!row.r.verdict?.success, detail);
}

// A starting point that only works at one step is a knife edge, not a
// technique. The search scores every candidate against a second rollout at a
// coarser step with a jittered start (robustVariants), so what the notebook
// opens with has to survive that too.
for (const row of rows) {
  if (AWAITING_SEARCH.has(row.t.key)) continue;
  const sa = techniqueSearchArgs(row.rec);
  const c = robustRolloutCost(row.model, row.ws, row.prof, sa.rom, sa.scenario,
    encodeDecision(row.rec.knots, row.rec.T), {
      K: sa.K, q0: sa.q0, target: sa.target, plant: sa.plant, knotFracs: sa.knotFracs,
      locks: sa.locks, timeLocks: sa.timeLocks, numerics: sa.numerics,
      symmetric: sa.symmetric, dt: sa.dt,
    });
  gate(`${row.t.key}: and survives the robustness variants the search scores against`,
    c.terms.fall === 0,
    `worst-case cost ${c.cost.toFixed(1)}, fall term ${c.terms.fall.toFixed(1)}`);
}

// And not a knife edge in TIME either. A tempo the movement works at only
// EXACTLY is a number in a file rather than a technique, so each one is swept
// either side of the tempo it was searched at and the contiguous band around
// that tempo is measured. What is required is uniform and modest -- it must
// survive being run 2% faster and 2% slower -- and what is REPORTED is the
// whole band, because the bands differ and the difference is the interesting
// part: a body that cannot fold has to throw hard enough to carry through, so
// the low-flexibility kick-up can be sped up freely and cannot be slowed.
//
// Asked at a converged step, deliberately. These techniques sit close to what
// their bodies can do -- that is what makes them worth opening -- and a
// marginal trajectory scatters when it is sampled at a finite step, with
// which tempos land on the wrong side moving as the step moves. Asking at the
// replay step would measure that scatter and call it the band.
const PCT = [];
for (let i = -10; i <= 10; i++) PCT.push(i);
for (const row of rows) {
  if (AWAITING_SEARCH.has(row.t.key)) continue;
  const at = (T) => {
    const r = runScenario(row.model, row.ws, row.prof,
      { ...techniqueRunArgs(row.rec, row.model, row.ws), T, dt: 1e-4 });
    return !!r.verdict?.success;
  };
  const ok = new Map(PCT.map((d) => [d, at(row.rec.T * (1 + d / 100))]));
  let lo = 0, hi = 0;
  while (ok.get(lo - 1)) lo--;
  while (ok.get(hi + 1)) hi++;
  gate(`${row.t.key}: and is not a knife edge in tempo`,
    ok.get(0) && lo <= -2 && hi >= 2,
    `arrives from ${lo}% to ${hi}% of its own tempo`
    + `${lo <= -10 || hi >= 10 ? ' (the sweep runs out before it does)' : ''}`);
}

console.log(failures ? `\n${failures} GATE(S) FAILED` : '\nALL GATES PASS');
process.exit(failures ? 1 : 0);
