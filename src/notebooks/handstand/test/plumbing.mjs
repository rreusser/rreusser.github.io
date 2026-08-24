// Does the search search the technique the page is showing?
//
// agreement.mjs answers a narrower question: given identical inputs, the
// scorer and the replay integrate the same trajectory. This file is about the
// step before that -- whether the inputs ARE identical, or whether the search
// quietly adjusts the technique on its way in.
//
// It does adjust it, by design: optimizeScenario clamps x0 into decisionBounds
// before the first generation, because a decision vector outside its bounds is
// not something CMA-ES can hold onto. So everything the page can put on screen
// has to already live inside those bounds, or the search starts somewhere the
// reader never asked for and its answer describes a different movement.
//
// Run: node src/notebooks/handstand/test/plumbing.mjs
import { buildModel } from '../anthropometry.js';
import { createWorkspace } from '../dynamics.js';
import { strengthProfile, STRENGTH_DEFAULTS } from '../strength.js';
import {
  decisionBounds, clampKnotsToRom, encodeDecision, rolloutCost, runScenario, optimizeScenario,
  resolveRom, resolveBody, resolvePlant, resolveNumerics, symmetrizeKnots,
  SYMMETRIC_SCENARIOS, NJ, widenKnots,
} from '../rollout.js';
import { resampleKnots } from '../figure-kit.js';
import { PRESET_TRAJECTORIES } from '../presets.js';

let failures = 0;
function gate(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const D = 180 / Math.PI;
const COUNTS = [2, 3, 4, 5, 6, 7, 8];
// The duration slider's range, which is what the page hands the search.
const T_RANGE = [0.5, 3.5];

const cases = Object.entries(PRESET_TRAJECTORIES)
  .filter(([, v]) => v?.knots)
  // Widened here, once. Compared un-widened, row 2 of a decoded result is the
  // spine and row 2 of a stored technique is a hip, and every gate below
  // reports the difference between two different joints as drift.
  .map(([name, stored]) => ({ name,
    stored: { ...stored, knots: widenKnots(stored.knots.map((k) => Float64Array.from(k))) },
    rom: resolveRom({ ...(stored.rom || {}) }) }));

// How far decisionBounds would move a decision vector -- i.e. how far the
// search moves the technique before it starts.
function driftUnderBounds(knots, T, rom, scenario, locks = null) {
  const K = knots[0].length;
  const x = encodeDecision(knots.map((k) => Float64Array.from(k)), T);
  const { lo, hi } = decisionBounds(K, { tLo: T_RANGE[0], tHi: T_RANGE[1], rom, locks });
  let angle = 0, dur = 0;
  for (let i = 0; i < x.length - 1; i++) angle = Math.max(angle, Math.abs(Math.min(Math.max(x[i], lo[i]), hi[i]) - x[i]));
  dur = Math.abs(Math.min(Math.max(T, lo[x.length - 1]), hi[x.length - 1]) - T);
  return { angle, dur };
}

// ---------------------------------------------------------------------------
// Gate A: a refit is representable. The pose-count control generates knots by
// least squares, and least squares knows nothing about anatomy -- so the fit
// is held inside the same box the search will impose, and this checks that it
// lands there rather than merely near it.
// ---------------------------------------------------------------------------
{
  let worst = 0, where = '';
  for (const c of cases) {
    for (const K of COUNTS) {
      let kn = resampleKnots(c.stored.knots.map((k) => Float64Array.from(k)), c.stored.T, K, c.stored.knotFracs);
      clampKnotsToRom(kn, c.rom);
      if (SYMMETRIC_SCENARIOS.has(c.stored.scenario)) symmetrizeKnots(kn);
      const d = driftUnderBounds(kn, c.stored.T, c.rom, c.stored.scenario);
      if (d.angle > worst) { worst = d.angle; where = `${c.name} at ${K} poses`; }
    }
  }
  gate('A. a refit survives the search\'s own bounds', worst < 1e-12,
    worst ? `${(worst * D).toExponential(1)} deg in ${where}` : 'nothing moves');
}

// ---------------------------------------------------------------------------
// Gate A2: and it would not without the clamp -- otherwise gate A is vacuous.
// ---------------------------------------------------------------------------
{
  let worst = 0, where = '';
  for (const c of cases) {
    for (const K of COUNTS) {
      const kn = resampleKnots(c.stored.knots.map((k) => Float64Array.from(k)), c.stored.T, K, c.stored.knotFracs);
      if (SYMMETRIC_SCENARIOS.has(c.stored.scenario)) symmetrizeKnots(kn);
      const d = driftUnderBounds(kn, c.stored.T, c.rom, c.stored.scenario);
      if (d.angle > worst) { worst = d.angle; where = `${c.name} at ${K} poses`; }
    }
  }
  gate('A2. (an unclamped refit really does leave the box)', worst * D > 0.1,
    `${(worst * D).toFixed(2)} deg in ${where}`);
}

// ---------------------------------------------------------------------------
// Gate B: the duration is not a decision variable. It is pinned to the tempo
// on screen, both ends of its bound being that value -- because a movement
// that arrives only gets cheaper as it slows, so left free the search walks it
// to whatever ceiling it is given and calls that an answer.
// ---------------------------------------------------------------------------
{
  let worst = 0, where = '';
  for (const c of cases) {
    for (const T of [T_RANGE[0], 0.7, 1.0, 1.9, 2.6, T_RANGE[1]]) {
      const K = c.stored.knots[0].length;
      const { lo, hi } = decisionBounds(K, { tLo: T, tHi: T, rom: c.rom });
      const span = hi[NJ * K] - lo[NJ * K];
      const drift = Math.abs(Math.min(Math.max(T, lo[NJ * K]), hi[NJ * K]) - T);
      if (span + drift > worst) { worst = span + drift; where = `${c.name} at T=${T}`; }
    }
  }
  gate('B. the duration is pinned to the tempo on screen', worst < 1e-12,
    worst ? `${worst.toFixed(3)}s of room left in ${where}` : 'no room to move');
}

// ---------------------------------------------------------------------------
// Gate C: the settle horizon travels. It is not a search setting -- it is how
// long the page keeps watching after the movement ends -- and scoring over a
// different one scores a different question.
// ---------------------------------------------------------------------------
{
  const c = cases.find((x) => x.name === 'lunge');
  const model = buildModel(resolveBody(c.stored.body)), ws = createWorkspace(model);
  const st0 = c.stored.strength || null;
  const prof = strengthProfile(model.massKg, { overrides: { ...(st0 || {}),
    shoulder: { ...(st0?.shoulder || STRENGTH_DEFAULTS.shoulder),
      t0Vol: st0?.shoulder?.t0Vol ?? STRENGTH_DEFAULTS.shoulder.t0Vol } } });
  const x = encodeDecision(c.stored.knots.map((k) => Float64Array.from(k)), c.stored.T);
  const end = (numerics) => {
    const r = rolloutCost(model, ws, prof, c.rom, c.stored.scenario, x,
      { K: c.stored.knots[0].length, dt: 2e-4, numerics });
    return r.rec.t[r.rec.t.length - 1];
  };
  const dflt = end(null), short = end({ dt: 2e-4, settleT: 1.0 });
  gate('C. the settle horizon reaches the score',
    Math.abs(dflt - (c.stored.T + 2.5)) < 0.02 && Math.abs(short - (c.stored.T + 1.0)) < 0.02,
    `default ends ${dflt.toFixed(2)}s, settleT 1.0 ends ${short.toFixed(2)}s, T is ${c.stored.T.toFixed(2)}s`);

  // ...and the replay run under the same numerics agrees with it.
  const target = new Float64Array(model.nq);
  for (let j = 0; j < NJ; j++) target[3 + j] = c.stored.knots[j][c.stored.knots[j].length - 1];
  const played = runScenario(model, ws, prof, {
    scenario: c.stored.scenario, knots: c.stored.knots.map((k) => Float64Array.from(k)),
    T: c.stored.T, rom: c.rom, target,
    ...resolvePlant(c.stored.config), dt: 2e-4, settleT: 1.0,
  });
  const scored = rolloutCost(model, ws, prof, c.rom, c.stored.scenario, x,
    { K: c.stored.knots[0].length, dt: 2e-4, target, plant: resolvePlant(c.stored.config),
      numerics: { dt: 2e-4, settleT: 1.0 } });
  gate('C2. and scoring and replaying over it agree',
    Math.abs(scored.verdict.comY - played.verdict.comY) === 0,
    `comY ${scored.verdict.comY.toFixed(6)} vs ${played.verdict.comY.toFixed(6)}`);
}

// ---------------------------------------------------------------------------
// Gate D: and a real search gives the tempo back unchanged. Bounds are the
// mechanism, but the property that matters is the one a reader sees: press
// Optimize and the duration slider does not move.
//
// The technique used is the one that showed the pathology -- the press arrives
// at every duration from 1.6s up and gets monotonically cheaper as it slows,
// so if anything is going to run for the ceiling it is this.
// ---------------------------------------------------------------------------
{
  const c = cases.find((x) => x.name === 'pike');
  const model = buildModel(resolveBody(c.stored.body)), ws = createWorkspace(model);
  const st0 = c.stored.strength || null;
  const prof = strengthProfile(model.massKg, { overrides: { ...(st0 || {}),
    shoulder: { ...(st0?.shoulder || STRENGTH_DEFAULTS.shoulder),
      t0Vol: st0?.shoulder?.t0Vol ?? STRENGTH_DEFAULTS.shoulder.t0Vol } } });
  const K = c.stored.knots[0].length;
  const T = 2.2;                      // well inside the range, with room to slow down
  const target = new Float64Array(model.nq);
  for (let j = 0; j < NJ; j++) target[3 + j] = c.stored.knots[j][K - 1];
  const res = await optimizeScenario(model, ws, prof, c.rom, {
    scenario: c.stored.scenario, seed: 3, maxGen: 20, K, sigma0: 0.05,
    x0: encodeDecision(c.stored.knots.map((k) => Float64Array.from(k)), T),
    target, plant: resolvePlant(c.stored.config), numerics: resolveNumerics(c.stored.numerics),
    tLo: T, tHi: T,
  });
  const moved = Math.abs(res.decoded.T - T);
  gate('D. a real search hands the tempo back unchanged', moved < 1e-9,
    `asked for ${T.toFixed(2)}s, got ${res.decoded.T.toFixed(4)}s`);
  // ...and it did do something with the angles, so the gate is not passing
  // because the search sat still.
  let angle = 0;
  for (let j = 0; j < NJ; j++) for (let k = 0; k < K; k++) {
    angle = Math.max(angle, Math.abs(res.decoded.knots[j][k] - c.stored.knots[j][k]));
  }
  gate('D2. (and it did move the angles)', angle * D > 0.1, `${(angle * D).toFixed(2)} deg`);
}

// ---------------------------------------------------------------------------
// Gate E: a replay does not edit the technique it was handed, and narrowing
// the anatomy and widening it again gives the movement back.
//
// The page had a one-way anatomy. It replayed the technique, then wrote the
// run's own start pose back into the technique as if the reader had authored
// it -- and a run's start is the authored one after it has been clamped into
// the body's range of motion. So narrowing a joint's range truncated the pose
// the movement began from, permanently: widening the range again could not
// restore an angle that no longer existed anywhere. A technique arrived, then
// did not, and then still did not with every slider back where it started.
//
// The rollout layer was never the guilty party -- it copies q0 before
// clamping -- but it is the layer where this must stay true, because the fix
// above depends on it. So: nothing a rollout is given comes back changed, and
// a body taken away and given back is the same body.
// ---------------------------------------------------------------------------
{
  const key = 'lunge';
  const stored = PRESET_TRAJECTORIES[key];
  const model = buildModel(resolveBody(stored.body));
  const ws = createWorkspace(model);
  const prof = strengthProfile(model.massKg, { overrides: stored.strength || {} });
  const romA = resolveRom(stored.rom);
  // Deliberately tighter than the pose the technique starts in, on the joint
  // whose start angle is largest: this is the case that used to truncate.
  const romB = { ...romA, wristExtMaxDeg: 90, spineFlexMaxDeg: 10 };
  // An EXPLICIT start, because that is the state the bug needed: a technique
  // whose start is authored rather than solved.
  const solved = runScenario(model, ws, prof, {
    scenario: stored.scenario, knots: stored.knots.map((k) => Float64Array.from(k)),
    T: stored.T, rom: romA, ...resolvePlant(stored.config), ...resolveNumerics(stored.numerics),
  });
  const rec = {
    scenario: stored.scenario, knots: stored.knots.map((k) => Float64Array.from(k)),
    T: stored.T, q0: Float64Array.from(solved.rec.q[0]),
    rom: romA, config: stored.config, numerics: stored.numerics,
  };
  const before = JSON.stringify({ q0: Array.from(rec.q0), knots: rec.knots.map((k) => Array.from(k)), T: rec.T });

  const play = (rom) => runScenario(model, ws, prof, {
    scenario: rec.scenario, knots: rec.knots.map((k) => Float64Array.from(k)), T: rec.T,
    q0: rec.q0, rom, ...resolvePlant(rec.config), ...resolveNumerics(rec.numerics),
  });
  const a1 = play(romA);
  play(romB);
  const a2 = play(romA);

  const after = JSON.stringify({ q0: Array.from(rec.q0), knots: rec.knots.map((k) => Array.from(k)), T: rec.T });
  gate('E. a replay leaves the technique it was given exactly as it found it',
    before === after, before === after ? 'q0, knots and tempo untouched' : 'the technique came back changed');

  let d = 0;
  for (let i = 0; i < a1.q.length; i++) d = Math.max(d, Math.abs(a1.q[i] - a2.q[i]));
  gate('E2. and narrowing the anatomy and widening it back gives the movement back',
    d === 0 && !!a1.verdict?.success === !!a2.verdict?.success,
    `worst |dq| ${d.toExponential(1)}, ${a1.verdict?.success ? 'arrives' : 'falls'} both times`);
}

console.log(`\n${failures === 0 ? 'ALL GATES PASS' : `${failures} GATE(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
