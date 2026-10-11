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
import {
  runScenario, resolveRom, resolveBody, resolvePlant, resolveNumerics, SYMMETRIC_SCENARIOS, NJ, widenKnots, JOINT_KEYS,
} from '../rollout.js';
// The q index of each joint, by name -- the same table the modules build.
const QI = Object.fromEntries(JOINT_KEYS.map((n, j) => [n, 3 + j]));
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
  const knots = widenKnots(stored.knots.map((k) => Float64Array.from(k)));
  const K = knots[0].length;
  // Sized and filled from the body, not from two written-down numbers. A
  // nine-long target on an eleven-coordinate body leaves the last two joints
  // undefined, and every comparison against them reads NaN.
  const target = new Float64Array(3 + NJ);
  for (let j = 0; j < NJ; j++) target[3 + j] = knots[j][K - 1];
  return {
    label: `${name} under test`,
    scenario: stored.scenario,
    knots, T: stored.T,
    // The technique's own, not a blank: a recorded built-in carries the
    // phrasing, the start and the holds it was searched with, and a round trip
    // that starts from something else is not a round trip of this technique.
    knotFracs: stored.knotFracs ? Float64Array.from(stored.knotFracs) : null,
    held: stored.held ? Array.from(stored.held, Boolean)
      : Array.from({ length: K }, (_, k) => k === K - 1),
    timeHeld: stored.timeHeld ? Array.from(stored.timeHeld, Boolean)
      : Array.from({ length: K }, () => true),
    startHeld: stored.startHeld !== false,
    symmetric: typeof stored.symmetric === 'boolean'
      ? stored.symmetric : SYMMETRIC_SCENARIOS.has(stored.scenario),
    q0: stored.q0 ? Float64Array.from(stored.q0) : null,
    target: stored.target ? Float64Array.from(stored.target) : target,
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
    // By name: as 5 and 6 these were the six-joint body's left hip and knee,
    // and are the spine and the left hip now. The gate perturbs a start pose
    // and checks it survives a round trip, so it passed either way -- while
    // measuring a perturbation it was not describing.
    q0[QI.hipL] += 9 / D; q0[QI.kneeL] -= 5 / D;
    return { ...t, q0 };
  },
  'a different ending': (t) => {
    const k = t.knots.map((r) => Float64Array.from(r));
    const K = k[0].length;
    k[QI.hipL - 3][K - 1] += 22 / D; k[QI.hipR - 3][K - 1] += 22 / D;
    const target = Float64Array.from(t.target);
    target[QI.hipL] += 22 / D; target[QI.hipR] += 22 / D;
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
  // FLIPPED rather than set: the techniques carry their own pins now, and an
  // edit that writes the value already there changes nothing and would report
  // the field as missing from the file when it is merely unchanged.
  'a pose let loose in time': (t) => ({ ...t,
    timeHeld: t.timeHeld.map((v, k) => (k === 1 ? !v : v)) }),
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
  const base = stateFor('lowflex');
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
  const good = techniqueToJSON(stateFor('press'));
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

// ---------------------------------------------------------------------------
// Gate E: widening. A technique written for an older body reads back as the
// same movement on this one.
//
// This is the claim that makes every stored artifact survive a joint being
// added, and it is only true because of how the joints were chosen: each new
// one is at ZERO in the stacked handstand, so "the body did not have it" and
// "the body held it at neutral" are the same trajectory. If that ever stops
// being true, widening becomes a guess and these files stop being replayable.
// ---------------------------------------------------------------------------
{
  const wide = techniqueFromJSON(techniqueToJSON(stateFor('lowflex')));
  // Narrow it back to each older width by dropping the joints that body did
  // not have, then read it forward again.
  const ORDERS = [
    ['wrist', 'shoulder', 'hipL', 'kneeL', 'hipR', 'kneeR'],
    ['wrist', 'shoulder', 'spine', 'hipL', 'kneeL', 'hipR', 'kneeR', 'neck'],
  ];
  // Only a technique whose absent joints really are at neutral can make the
  // round trip, so each width gets its own: today's technique with everything
  // that body did not have flattened, which is exactly what a recording made
  // on it is.
  const flatten = (order) => {
    const f = techniqueToJSON(wide);
    for (const n of JOINT_KEYS) {
      if (order.includes(n)) continue;
      const j = JOINT_KEYS.indexOf(n);
      f.knots[j] = f.knots[j].map(() => 0);
      f.q0[3 + j] = 0;
      f.target[3 + j] = 0;
    }
    return f;
  };
  let worstK = 0, worstQ = 0, worstT = 0;
  for (const order of ORDERS) {
    const flat = flatten(order);
    const flatRec = techniqueFromJSON(flat);
    const narrow = {
      ...flat,
      knots: order.map((n) => flat.knots[JOINT_KEYS.indexOf(n)]),
      q0: [flat.q0[0], flat.q0[1], flat.q0[2],
        ...order.map((n) => flat.q0[3 + JOINT_KEYS.indexOf(n)])],
      target: [flat.target[0], flat.target[1], flat.target[2],
        ...order.map((n) => flat.target[3 + JOINT_KEYS.indexOf(n)])],
    };
    const back = techniqueFromJSON(narrow);
    for (let j = 0; j < JOINT_KEYS.length; j++) {
      for (let k = 0; k < back.knots[j].length; k++) {
        worstK = Math.max(worstK, Math.abs(back.knots[j][k] - flatRec.knots[j][k]));
      }
      worstQ = Math.max(worstQ, Math.abs(back.q0[3 + j] - flatRec.q0[3 + j]));
      worstT = Math.max(worstT, Math.abs(back.target[3 + j] - flatRec.target[3 + j]));
    }
  }
  gate('E. a technique written for an older body widens to the same movement',
    worstK === 0 && worstQ === 0 && worstT === 0,
    `worst knot ${worstK.toExponential(1)}, start ${worstQ.toExponential(1)}, `
    + `ending ${worstT.toExponential(1)} rad over ${ORDERS.length} older widths`);

  // And it is not vacuous: the narrow forms really are narrower.
  const narrowCount = ORDERS.map((o) => o.length).join(', ');
  gate('E2. and those really were narrower bodies',
    ORDERS.every((o) => o.length < JOINT_KEYS.length),
    `${narrowCount} channels against today's ${JOINT_KEYS.length}`);

  // A width this notebook has never written is refused rather than guessed at.
  let refused = false;
  try {
    const f = techniqueToJSON(wide);
    techniqueFromJSON({ ...f, knots: f.knots.slice(0, 7) });
  } catch (_) { refused = true; }
  gate('E3. and a width it has never written is refused, not guessed', refused);
}

console.log(`\n${failures === 0 ? 'ALL GATES PASS' : `${failures} GATE(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
