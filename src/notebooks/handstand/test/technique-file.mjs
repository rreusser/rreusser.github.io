// Does a saved technique load back as the same movement?
//
// Two properties, and the second is the one that bites. First: save, load, run
// -- the trajectory must be identical to the last bit, not merely close.
// Second, and harder: the file must be COMPLETE. A round trip that passes only
// because both sides fall back to the same default proves nothing; so every
// input that changes the rollout is perturbed in turn, and the test insists
// both that the JSON text changes and that the perturbed run still round-trips.
// A field silently dropped from the writer fails the first; a field dropped
// from the reader fails the second.
//
// Run: node src/notebooks/handstand/test/technique-file.mjs
import { buildModel } from '../anthropometry.js';
import { createWorkspace } from '../dynamics.js';
import { strengthProfile, STRENGTH_DEFAULTS } from '../strength.js';
import { runScenario, resolveRom, resolveBody, resolvePlant, resolveNumerics, SYMMETRIC_SCENARIOS } from '../rollout.js';
import { techniqueToJSON, techniqueFromJSON, techniqueRunArgs, TECHNIQUE_FORMAT } from '../technique-file.js';
import { PRESET_TRAJECTORIES } from '../presets.js';

let failures = 0;
function gate(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const D = 180 / Math.PI;

// A page state, as the editor would hold one: a stored technique plus every
// kind of edit the figure can make.
function stateFor(name) {
  const stored = PRESET_TRAJECTORIES[name];
  const knots = stored.knots.map((k) => Float64Array.from(k));
  const K = knots[0].length;
  const target = new Float64Array(9);
  for (let j = 0; j < 6; j++) target[3 + j] = knots[j][K - 1];
  return {
    label: `${name} under test`,
    scenario: stored.scenario,
    knots, T: stored.T,
    knotFracs: null,
    held: Array.from({ length: K }, (_, k) => k === K - 1),
    symmetric: SYMMETRIC_SCENARIOS.has(stored.scenario),
    q0: null, target,
    rom: resolveRom({ ...(stored.rom || {}) }),
    strength: stored.strength || null,
    body: resolveBody(stored.body),
    config: resolvePlant(stored.config),
    numerics: resolveNumerics(stored.numerics),
    search: { seed: 7, maxGen: 120 },
  };
}

// Run a state the way the page does.
function play(t) {
  const model = buildModel(t.body), ws = createWorkspace(model);
  const st0 = t.strength;
  const prof = strengthProfile(model.massKg, { overrides: { ...(st0 || {}),
    shoulder: { ...(st0?.shoulder || STRENGTH_DEFAULTS.shoulder),
      t0Vol: st0?.shoulder?.t0Vol ?? STRENGTH_DEFAULTS.shoulder.t0Vol } } });
  return runScenario(model, ws, prof, techniqueRunArgs(t, model, ws));
}

const sameRun = (a, b) => {
  if (a.rec.t.length !== b.rec.t.length) return { ok: false, why: 'different number of recorded instants' };
  let dq = 0;
  for (let k = 0; k < a.rec.t.length; k++) {
    if (a.rec.t[k] !== b.rec.t[k]) return { ok: false, why: 'different instants' };
    for (let i = 0; i < a.rec.q[k].length; i++) dq = Math.max(dq, Math.abs(a.rec.q[k][i] - b.rec.q[k][i]));
  }
  dq = Math.max(dq, Math.abs(a.verdict.comY - b.verdict.comY), Math.abs(a.verdict.comX - b.verdict.comX));
  return { ok: dq === 0, why: `${dq.toExponential(2)} rad apart` };
};

const roundTrip = (t) => techniqueFromJSON(JSON.parse(JSON.stringify(techniqueToJSON(t))));

// Every way the page can change what gets simulated. Each returns a NEW state
// that must survive the round trip, and must serialize differently from the
// state it came from.
const EDITS = {
  'a dragged knot': (t) => { const k = t.knots.map((r) => Float64Array.from(r)); k[1][2] += 11 / D; return { ...t, knots: k }; },
  'a different duration': (t) => ({ ...t, T: t.T * 0.8 + 0.13 }),
  'hand-placed phrasing': (t) => ({ ...t, knotFracs: Float64Array.from(
    Array.from({ length: t.knots[0].length }, (_, k, a) => (k === 0 ? 0 : k === t.knots[0].length - 1 ? 1
      : [0.08, 0.15, 0.55, 0.78, 0.86, 0.92][(k - 1) % 6]))) }),
  'held poses': (t) => ({ ...t, held: t.held.map((v, k) => v || k === 1 || k === 3) }),
  'a dragged start pose': (t) => {
    const q0 = Float64Array.from(play(t).rec.q[0]);
    q0[5] += 9 / D; q0[6] -= 5 / D;
    return { ...t, q0 };
  },
  'a different ending': (t) => {
    const k = t.knots.map((r) => Float64Array.from(r));
    const K = k[0].length;
    k[2][K - 1] += 22 / D; k[4][K - 1] += 22 / D;
    const target = Float64Array.from(t.target);
    target[5] += 22 / D; target[7] += 22 / D;
    return { ...t, knots: k, target };
  },
  'a weaker shoulder': (t) => ({ ...t, strength: { ...(t.strength || {}),
    shoulder: { ...(t.strength?.shoulder || STRENGTH_DEFAULTS.shoulder), t0Vol: 1.35 } } }),
  'looser hamstrings': (t) => ({ ...t, rom: { ...t.rom, hipFlexStraightKneeMaxDeg: 125 } }),
  'a taller body': (t) => ({ ...t, body: { ...t.body, heightM: 1.9, massKg: 82 } }),
  'an older plant': (t) => ({ ...t, config: { ...t.config, kp: 500, activationTau: 0.07 } }),
  'a shorter settle': (t) => ({ ...t, numerics: { ...t.numerics, settleT: 1.4 } }),
  'a finer timestep': (t) => ({ ...t, numerics: { ...t.numerics, dt: 1e-4 } }),
  'a different search seed': (t) => ({ ...t, search: { seed: 42, maxGen: 260 } }),
  'the legs un-mirrored': (t) => ({ ...t, symmetric: !t.symmetric }),
};

// ---------------------------------------------------------------------------
// Gate A: save, load, run -- identical, for the shipped techniques and for
// every kind of edit the figure can make to them.
// ---------------------------------------------------------------------------
{
  let bad = 0, worst = '';
  const names = Object.keys(PRESET_TRAJECTORIES).filter((n) => PRESET_TRAJECTORIES[n]?.knots);
  for (const name of names) {
    const base = stateFor(name);
    const states = [['as stored', base], ...Object.entries(EDITS).map(([k, f]) => [k, f(base)])];
    for (const [what, st] of states) {
      const r = sameRun(play(st), play(roundTrip(st)));
      if (!r.ok) { bad++; worst = `${name} with ${what}: ${r.why}`; }
    }
  }
  const total = names.length * (1 + Object.keys(EDITS).length);
  gate('A. a saved technique loads back as the same movement', bad === 0,
    bad ? worst : `${total} states, every trajectory identical`);
}

// ---------------------------------------------------------------------------
// Gate B: the file is complete. Every edit above has to show up in the JSON --
// if it does not, the round trip is passing because both sides guessed the
// same default, and the field is silently absent from the saved case.
// ---------------------------------------------------------------------------
{
  const base = stateFor('lunge');
  const baseText = JSON.stringify(techniqueToJSON(base));
  const missing = [];
  for (const [what, f] of Object.entries(EDITS)) {
    if (JSON.stringify(techniqueToJSON(f(base))) === baseText) missing.push(what);
  }
  gate('B. every input that changes the movement is in the file', missing.length === 0,
    missing.length ? `not written: ${missing.join(', ')}` : `${Object.keys(EDITS).length} inputs, all present`);
}

// ---------------------------------------------------------------------------
// Gate C: a file is refused rather than half-read. A truncated or foreign file
// that loads as "mostly right" is worse than one that does not load.
// ---------------------------------------------------------------------------
{
  const good = techniqueToJSON(stateFor('pike'));
  const bad = [
    ['not JSON at all', '{'],
    ['a foreign file', JSON.stringify({ format: 'something-else', version: 1 })],
    ['from a newer notebook', JSON.stringify({ ...good, version: 99 })],
    ['five joints', JSON.stringify({ ...good, knots: good.knots.slice(0, 5) })],
    ['ragged knots', JSON.stringify({ ...good, knots: good.knots.map((r, i) => (i ? r : r.slice(1))) })],
    ['no duration', JSON.stringify({ ...good, T: 0 })],
    ['poses out of order', JSON.stringify({ ...good,
      knotFracs: good.knots[0].map((_, k, a) => (k === 1 ? 0.9 : k / (a.length - 1))) })],
  ];
  const survived = bad.filter(([, text]) => {
    try { techniqueFromJSON(text); return true; } catch (e) { return false; }
  }).map(([what]) => what);
  gate('C. a broken file is refused, not half-read', survived.length === 0,
    survived.length ? `accepted: ${survived.join(', ')}` : `${bad.length} kinds of broken file, all refused`);

  // ...and a good one is not refused.
  let ok = true, why = '';
  try { techniqueFromJSON(JSON.stringify(good)); } catch (e) { ok = false; why = e.message; }
  gate('C2. and a good one is not', ok, why || `format "${TECHNIQUE_FORMAT}"`);
}

console.log(`\n${failures === 0 ? 'ALL GATES PASS' : `${failures} GATE(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
