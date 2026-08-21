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
  decisionBounds, clampKnotsToRom, encodeDecision, rolloutCost, runScenario,
  resolveRom, resolveBody, resolvePlant, resolveNumerics, symmetrizeKnots,
  SYMMETRIC_SCENARIOS,
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
  .map(([name, stored]) => ({ name, stored, rom: resolveRom({ ...(stored.rom || {}) }) }));

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
// Gate B: every duration the slider can express survives the search's bounds.
// The floor used to be the search's own -- 0.6, and 1.5 for the pike -- so a
// press set to a second was searched at one and a half.
// ---------------------------------------------------------------------------
{
  let worst = 0, where = '';
  for (const c of cases) {
    for (const T of [T_RANGE[0], 0.7, 1.0, 1.9, 2.6, T_RANGE[1]]) {
      const d = driftUnderBounds(c.stored.knots.map((k) => Float64Array.from(k)), T, c.rom, c.stored.scenario);
      if (d.dur > worst) { worst = d.dur; where = `${c.name} at T=${T}`; }
    }
  }
  gate('B. every duration the slider offers is searchable', worst < 1e-12,
    worst ? `${worst.toFixed(3)}s of stretch in ${where}` : 'nothing moves');
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
  for (let j = 0; j < 6; j++) target[3 + j] = c.stored.knots[j][c.stored.knots[j].length - 1];
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

console.log(`\n${failures === 0 ? 'ALL GATES PASS' : `${failures} GATE(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
