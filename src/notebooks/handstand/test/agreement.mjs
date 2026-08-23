// Does the search score the technique the page plays back?
//
// The search and the playback are two call sites for one rollout, and they
// have drifted apart before: a start the page solved and the search did not,
// an ending the search pinned to a handstand while the page aimed elsewhere,
// a plant an artifact recorded and the search replaced with its defaults.
// Every one of those reads the same way on screen -- the search succeeds, the
// playback falls -- and none of them is visible in either number alone.
//
// So this gate runs both call sites on the same technique and asserts they
// produce the same trajectory, across the axes the figure can move: a start
// that was dragged, an ending that is not a handstand, and a pose count that
// is not six.
//
// Run: node src/notebooks/handstand/test/agreement.mjs
import { buildModel } from '../anthropometry.js';
import { createWorkspace } from '../dynamics.js';
import { strengthProfile, STRENGTH_DEFAULTS } from '../strength.js';
import { ROM_DEFAULTS } from '../statics.js';
import {
  rolloutCost, runScenario, encodeDecision, resolvePlant, resolveNumerics,
  resolveRom, resolveBody, symmetrizeKnots, SYMMETRIC_SCENARIOS, NJ, JOINT_KEYS, widenKnots,
} from '../rollout.js';
import { resampleKnots } from '../figure-kit.js';
import { PRESET_TRAJECTORIES } from '../presets.js';

let failures = 0;
function gate(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const D = 180 / Math.PI;
// The fine timestep both sides use: rolloutCost's finalCheck and the page's
// replay. The search's coarse generations are deliberately coarser, and the
// finalCheck exists precisely so the number reported at the end is the one a
// replay reproduces.
const DT = 2e-4;

// What the figure's body sliders produce with nothing touched.
function pageBody(stored) {
  const model = buildModel(resolveBody(stored.body)), ws = createWorkspace(model);
  const st0 = stored.strength || null;
  const strength = { ...(st0 || {}),
    shoulder: { ...(st0?.shoulder || STRENGTH_DEFAULTS.shoulder),
      t0Vol: st0?.shoulder?.t0Vol ?? STRENGTH_DEFAULTS.shoulder.t0Vol } };
  const rom = { ...(stored.rom || {}) };
  return { model, ws, prof: strengthProfile(model.massKg, { overrides: strength }), rom: resolveRom(rom) };
}

// The two call sites, given identical inputs.
const scored = (m, stored, knots, T, q0, target, fracs = null) =>
  rolloutCost(m.model, m.ws, m.prof, m.rom, stored.scenario,
    encodeDecision(knots.map((k) => Float64Array.from(k)), T), {
      K: knots[0].length, dt: DT, q0, target,
      // The page hands the search the machine it replays on, exactly as it
      // hands it the body, the anatomy, the start, the ending and the phrasing.
      plant: resolvePlant(stored.config), knotFracs: fracs,
    });

const played = (m, stored, knots, T, q0, target, fracs = null) =>
  runScenario(m.model, m.ws, m.prof, {
    scenario: stored.scenario, knots: knots.map((k) => Float64Array.from(k)), T,
    rom: m.rom, q0, target, knotFracs: fracs,
    ...resolvePlant(stored.config), ...resolveNumerics(stored.numerics),
  });

// The page's own notion of the ending: the last knot, as a pose.
const targetOf = (m, knots) => {
  const q = new Float64Array(m.model.nq);
  for (let j = 0; j < NJ; j++) q[3 + j] = knots[j][knots[j].length - 1];
  return q;
};

// The technique the figure holds, which for a symmetric skill is symmetric:
// the search mirrors left onto right after decoding, so a lopsided technique
// handed to it is straightened before it is scored and the answer describes a
// movement the page was never showing. The figure applies the same rule on the
// way in, and this is that rule.
const asEdited = (stored, knots) =>
  (SYMMETRIC_SCENARIOS.has(stored.scenario) ? symmetrizeKnots(knots) : knots);

const CASES = [];
for (const name of Object.keys(PRESET_TRAJECTORIES)) {
  const stored = PRESET_TRAJECTORIES[name];
  if (!stored?.knots) continue;
  const m = pageBody(stored);
  // Widened before anything indexes it. Un-widened, the "fold at the hips"
  // edit below lands on a spine and a knee, and the dragged-start edit moves
  // whatever coordinates 5 and 6 happen to be -- which after the trunk gained
  // a hinge is a spine and a hip, not a hip and a knee.
  const base = asEdited(stored, widenKnots(stored.knots.map((k) => Float64Array.from(k))));
  const K0 = base[0].length;

  // As shipped: no dragged start, ending is the stored one.
  CASES.push({ label: `${name} as shipped`, m, stored, knots: base, T: stored.T, q0: null });

  // A dragged start: the page reads it back out of the run it just made.
  const seed = played(m, stored, base, stored.T, null, targetOf(m, base), null);
  const q0 = Float64Array.from(seed.rec.q[0]);
  const q0Moved = Float64Array.from(q0);
  const QJ = Object.fromEntries(JOINT_KEYS.map((n, j) => [n, 3 + j]));
  q0Moved[QJ.hipL] += 12 / D; q0Moved[QJ.kneeL] -= 8 / D;     // hip and knee, by hand
  if (SYMMETRIC_SCENARIOS.has(stored.scenario)) {
    q0Moved[QJ.hipR] = q0Moved[QJ.hipL]; q0Moved[QJ.kneeR] = q0Moved[QJ.kneeL];
  }
  CASES.push({ label: `${name} dragged start`, m, stored, knots: base, T: stored.T, q0: q0Moved });

  // An ending that is not a handstand: the last knot moved, as dragging the
  // last cell of the storyboard does.
  const piked = base.map((k) => Float64Array.from(k));
  piked[JOINT_KEYS.indexOf('hipL')][K0 - 1] += 35 / D;         // fold at the hips
  piked[JOINT_KEYS.indexOf('hipR')][K0 - 1] += 35 / D;
  CASES.push({ label: `${name} pike ending`, m, stored, knots: asEdited(stored, piked), T: stored.T, q0: null });

  // Phrasing placed by hand, with two poses close together -- the thing the
  // timeline drag exists for.
  CASES.push({ label: `${name} phrased by hand`, m, stored, knots: base, T: stored.T, q0: null,
    fracs: Float64Array.from(Array.from({ length: K0 }, (_, k) => (k === 0 ? 0 : k === K0 - 1 ? 1
      : [0.1, 0.18, 0.5, 0.72][(k - 1) % 4]))) });

  // A plant that is NOT today's defaults. Until the page began handing its
  // plant to the search, this was the last thing the search still supplied
  // itself: an artifact recorded under one machine, scored on another.
  CASES.push({ label: `${name} on an old plant`, m,
    stored: { ...stored, config: { ...(stored.config || {}), kp: 400, kd: 40, activationTau: 0.08 } },
    knots: base, T: stored.T, q0: null });

  // A different number of poses, refitted as the count control does.
  for (const K of [3, 8]) {
    CASES.push({ label: `${name} at ${K} poses`, m, stored,
      knots: asEdited(stored, resampleKnots(base, stored.T, K)), T: stored.T, q0: null });
  }
}

let worstQ = 0, worstQd = 0, verdictSplits = 0, splitDetail = '';
for (const c of CASES) {
  const target = targetOf(c.m, c.knots);
  const a = scored(c.m, c.stored, c.knots, c.T, c.q0, target, c.fracs || null);
  const b = played(c.m, c.stored, c.knots, c.T, c.q0, target, c.fracs || null);
  // Matched by CLOCK, not by frame index. Scoring thins its recording to
  // about 120 Hz and a replay keeps more, so the two recordings sit on
  // different strides of the same integration -- comparing frame k to frame k
  // compares states a few milliseconds apart and reports the trajectory's own
  // motion as a disagreement.
  const byTime = new Map();
  for (let k = 0; k < b.rec.t.length; k++) byTime.set(b.rec.t[k].toFixed(9), k);
  let dq = 0, dqd = 0, matched = 0;
  for (let k = 0; k < a.rec.t.length; k++) {
    const j = byTime.get(a.rec.t[k].toFixed(9));
    if (j === undefined) continue;
    matched++;
    for (let i = 0; i < a.rec.q[k].length; i++) dq = Math.max(dq, Math.abs(a.rec.q[k][i] - b.rec.q[j][i]));
    for (let i = 0; i < a.rec.qd[k].length; i++) dqd = Math.max(dqd, Math.abs(a.rec.qd[k][i] - b.rec.qd[j][i]));
  }
  if (matched < 8) { console.log(`  ${c.label.padEnd(30)} only ${matched} shared instants -- cannot compare`); failures++; continue; }
  // The verdict is read off the true final state at T + settleT, which both
  // integrate to exactly, so it is compared without any grid to match.
  dq = Math.max(dq, Math.abs(a.verdict.comY - b.verdict.comY), Math.abs(a.verdict.comX - b.verdict.comX));
  worstQ = Math.max(worstQ, dq); worstQd = Math.max(worstQd, dqd);
  const sameVerdict = !!a.verdict?.success === !!b.verdict?.success;
  if (!sameVerdict) {
    verdictSplits++;
    splitDetail = `${c.label}: search ${a.verdict?.success ? 'arrives' : 'falls'}, playback ${b.verdict?.success ? 'arrives' : 'falls'}`;
  }
  console.log(`  ${c.label.padEnd(30)} cost ${a.cost.toFixed(3).padStart(9)}  ` +
    `${(a.verdict?.success ? 'arrives' : 'falls  ')}/${b.verdict?.success ? 'arrives' : 'falls  '}  ` +
    `|dq| ${dq.toExponential(1)}  |dqd| ${dqd.toExponential(1)}  ${matched} instants`);
}
console.log();

// ---------------------------------------------------------------------------
// Gate A: the two call sites integrate the same trajectory. The tolerance is
// accumulated floating point over ~20000 steps, not a modelling allowance --
// any real difference of plant, start, ending or anatomy lands orders of
// magnitude above it.
// ---------------------------------------------------------------------------
gate('A. search and playback integrate the same trajectory',
  worstQ < 1e-9 && worstQd < 1e-9,
  `${CASES.length} configurations, worst |dq| ${worstQ.toExponential(2)} rad, |dqd| ${worstQd.toExponential(2)} rad/s`);

// ---------------------------------------------------------------------------
// Gate B: and therefore never disagree about whether the technique arrives.
// This is the one the reader sees: a search that says it worked and a body
// that falls over is the failure this whole file exists to catch.
// ---------------------------------------------------------------------------
gate('B. and never disagree about arrival', verdictSplits === 0,
  verdictSplits ? splitDetail : `${CASES.length} configurations agree`);

// ---------------------------------------------------------------------------
// Gate C: and the technique the figure holds is one the search can represent.
// Gates A and B compare two evaluations of the SAME knots; this one checks the
// knots themselves, because the failure that started this file was upstream of
// both -- a lopsided pike reaching a search that can only score symmetric ones.
// ---------------------------------------------------------------------------
{
  let worst = 0, where = '';
  for (const c of CASES) {
    if (!SYMMETRIC_SCENARIOS.has(c.stored.scenario)) continue;
    // Paired by name. Written as [[2,4],[3,5]] these were the six-joint
    // body's hip and knee rows; on the articulated body row 2 is the spine.
    const PAIRS = [['hipL', 'hipR'], ['kneeL', 'kneeR']]
      .map(([a2, b2]) => [JOINT_KEYS.indexOf(a2), JOINT_KEYS.indexOf(b2)]);
    for (let k = 0; k < c.knots[0].length; k++) {
      for (const [l, r] of PAIRS) {
        const e = Math.abs(c.knots[l][k] - c.knots[r][k]);
        if (e > worst) { worst = e; where = c.label; }
      }
    }
  }
  gate('C. a symmetric skill is edited symmetrically', worst === 0,
    worst ? `${(worst * D).toFixed(2)} deg of left/right split in ${where}` : 'left and right match exactly');
}

console.log(`\n${failures === 0 ? 'ALL GATES PASS' : `${failures} GATE(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
