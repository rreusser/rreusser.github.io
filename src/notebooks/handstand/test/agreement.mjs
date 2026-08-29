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
  rolloutCost, robustRolloutCost, robustVariants, runScenario, encodeDecision,
  optimizeScenario,
  resolvePlant, resolveNumerics,
  resolveRom, resolveBody, symmetrizeKnots, SYMMETRIC_SCENARIOS, NJ, JOINT_KEYS, widenKnots,
  NUMERICS_DEFAULTS,
} from '../rollout.js';
import { resampleKnots } from '../figure-kit.js';
import { PRESET_TRAJECTORIES, builtinPreset } from '../presets.js';
import {
  techniqueToJSON, techniqueFromJSON, techniqueRunArgs, techniqueSearchArgs, techniqueFreeTimes,
} from '../technique-file.js';

let failures = 0;
function gate(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const D = 180 / Math.PI;
// The timestep both sides use, PER TECHNIQUE. It was one number for the whole
// file -- first written down, then read off NUMERICS_DEFAULTS -- and both were
// second opinions about the one thing this file exists to check they agree on.
// The replay side has always resolved it from the technique, so the moment the
// built-ins started carrying their own integration a global here reported a
// disagreement that was the test's, not the code's.
const dtOf = (stored) => resolveNumerics(stored.numerics).dt;

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
      K: knots[0].length, dt: dtOf(stored), q0, target,
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

  // The start the technique carries, or null where it has none and the
  // scenario solves one. A recorded technique was searched FROM a particular
  // start -- with the start pose itself among the things the search moved --
  // so replacing it with the scenario's solve is not the same movement, and a
  // gate that did so would be comparing two call sites on a technique neither
  // of them was given.
  const q0Stored = stored.q0 ? Float64Array.from(stored.q0) : null;
  // ...and the phrasing it carries, for the same reason. A recorded technique
  // was searched WITH its instants where they are; replayed at even spacing it
  // is a different movement, and every fixture here fell on the floor while
  // both call sites agreed perfectly about how. Two call sites agreeing on the
  // wrong technique is a gate that has stopped asking anything.
  const fracsStored = stored.knotFracs ? Float64Array.from(stored.knotFracs) : null;
  // The ending it aims at is the technique's own, except where the case moves
  // the last knot -- which is what dragging the last storyboard cell does.
  const targetStored = stored.target ? Float64Array.from(stored.target) : null;

  // As shipped: the technique exactly as the picker opens it.
  CASES.push({ label: `${name} as shipped`, m, stored, knots: base, T: stored.T, q0: q0Stored,
    fracs: fracsStored, target: targetStored });

  // A dragged start: the page reads it back out of the run it just made.
  const seed = played(m, stored, base, stored.T, q0Stored, targetStored || targetOf(m, base), fracsStored);
  const q0 = Float64Array.from(seed.rec.q[0]);
  const q0Moved = Float64Array.from(q0);
  const QJ = Object.fromEntries(JOINT_KEYS.map((n, j) => [n, 3 + j]));
  q0Moved[QJ.hipL] += 12 / D; q0Moved[QJ.kneeL] -= 8 / D;     // hip and knee, by hand
  if (SYMMETRIC_SCENARIOS.has(stored.scenario)) {
    q0Moved[QJ.hipR] = q0Moved[QJ.hipL]; q0Moved[QJ.kneeR] = q0Moved[QJ.kneeL];
  }
  CASES.push({ label: `${name} dragged start`, m, stored, knots: base, T: stored.T, q0: q0Moved,
    fracs: fracsStored, target: targetStored });

  // An ending that is not a handstand: the last knot moved, as dragging the
  // last cell of the storyboard does.
  const piked = base.map((k) => Float64Array.from(k));
  piked[JOINT_KEYS.indexOf('hipL')][K0 - 1] += 35 / D;         // fold at the hips
  piked[JOINT_KEYS.indexOf('hipR')][K0 - 1] += 35 / D;
  CASES.push({ label: `${name} pike ending`, m, stored, knots: asEdited(stored, piked), T: stored.T,
    q0: q0Stored, fracs: fracsStored });

  // Phrasing placed by hand, with two poses close together -- the thing the
  // timeline drag exists for.
  CASES.push({ label: `${name} phrased by hand`, m, stored, knots: base, T: stored.T, q0: q0Stored,
    fracs: Float64Array.from(Array.from({ length: K0 }, (_, k) => (k === 0 ? 0 : k === K0 - 1 ? 1
      : [0.1, 0.18, 0.5, 0.72][(k - 1) % 4]))) });

  // A plant that is NOT today's defaults. Until the page began handing its
  // plant to the search, this was the last thing the search still supplied
  // itself: an artifact recorded under one machine, scored on another.
  CASES.push({ label: `${name} on an old plant`, m,
    stored: { ...stored, config: { ...(stored.config || {}), kp: 400, kd: 40, activationTau: 0.08 } },
    knots: base, T: stored.T, q0: q0Stored, fracs: fracsStored, target: targetStored });

  // A different number of poses, refitted as the count control does.
  for (const K of [3, 8]) {
    CASES.push({ label: `${name} at ${K} poses`, m, stored,
      knots: asEdited(stored, resampleKnots(base, stored.T, K)), T: stored.T, q0: q0Stored });
  }
}

let worstQ = 0, worstQd = 0, verdictSplits = 0, splitDetail = '';
for (const c of CASES) {
  const target = c.target || targetOf(c.m, c.knots);
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

// ---------------------------------------------------------------------------
// Gate D: playing a technique back and searching it are ONE problem.
//
// Gates A-C compare two evaluations. This one is upstream of evaluating
// anything: it checks that the two call sites are handed the same problem in
// the first place. They used to be assembled by hand in three places -- the
// page's replay, the postMessage it wrote, and the worker's unpacking of it --
// and the only thing keeping them in step was that somebody kept noticing.
// Every field is derived from the technique now, and this is that claim as a
// test: move every field off its default, push it through the file, and the
// replay's arguments and the search's must still describe the same run.
// ---------------------------------------------------------------------------
{
  const m0 = buildModel({});
  const ws0 = createWorkspace(m0);
  const base = builtinPreset('lowflex');
  const edited = { ...base,
    T: 1.42,
    symmetric: true,
    held: [true, false, false, true, false, true],
    timeHeld: [true, false, true, false, true, true],
    knotFracs: [0, 0.13, 0.31, 0.52, 0.77, 1],
    q0: Array.from({ length: m0.nq }, (_, i) => i * 0.01),
    strength: { shoulder: { t0Vol: 2.1, wmax: 18, wc: 7, amin: 0.7, w1: 0, m: 0.3 } },
    rom: { ...ROM_DEFAULTS, hipFlexStraightKneeMaxDeg: 97, shoulderFlexMaxDeg: 171, wristExtMaxDeg: 128 },
    body: { heightM: 1.63, massKg: 57, straddleDeg: 4, sex: 'female' },
    config: { ...base.config, kp: 1350, dampingRatio: 1.4, loopOmegaTau: 1.7, activationTau: 0.061 },
    numerics: { dt: 1.5e-4, settleT: 1.9 },
    search: { seed: 23, maxGen: 77 },
  };
  const rec = techniqueFromJSON(techniqueToJSON(edited));
  const ra = techniqueRunArgs(rec, m0, ws0);
  const sa = techniqueSearchArgs(rec);
  const j = (v) => JSON.stringify(v && v.length !== undefined && typeof v !== 'string' ? Array.from(v) : v);
  const bad = [];
  const eq = (name, x, y) => { if (j(x) !== j(y)) bad.push(name); };
  eq('scenario', ra.scenario, sa.scenario);
  eq('rom', ra.rom, sa.rom);
  eq('q0', ra.q0, sa.q0);
  eq('target', ra.target, sa.target);
  eq('knotFracs', ra.knotFracs, sa.knotFracs);
  eq('tempo', [ra.T, ra.T], [sa.tLo, sa.tHi]);
  eq('settle', ra.settleT, sa.numerics.settleT);
  for (const k of Object.keys(sa.plant)) eq(`plant.${k}`, ra[k], sa.plant[k]);
  gate('D. the replay and the search are handed the same problem', bad.length === 0,
    bad.length ? `differ: ${bad.join(', ')}` : `${Object.keys(sa.plant).length + 7} fields, all identical`);

  // And the pins the search is given describe THIS technique's own knots --
  // a lock naming an angle the technique does not have is how a search ends
  // up refining something the page is not showing.
  const K = rec.knots[0].length;
  let lockBad = 0;
  for (let k = 0; k < K; k++) {
    if (!sa.locks[k]) { if (rec.held[k]) lockBad++; continue; }
    if (!rec.held[k]) { lockBad++; continue; }
    for (let jj = 0; jj < rec.knots.length; jj++) {
      if (sa.locks[k][jj] !== rec.knots[jj][k]) lockBad++;
    }
  }
  gate('D2. and every pin names the technique\'s own angles', lockBad === 0,
    `${rec.held.filter(Boolean).length} held pose(s), ${lockBad} mismatch(es)`);
  // The one thing that changes the SHAPE of the decision vector has to come
  // from the same flags the pins do.
  gate('D3. and a freed instant is read off the technique that carries it',
    techniqueFreeTimes(rec) === true && techniqueFreeTimes({ ...rec, timeHeld: rec.timeHeld.map(() => true) }) === false,
    'a free interior instant lengthens the vector, all-pinned does not');
}

// ---------------------------------------------------------------------------
// Gate E: a technique that carries its OWN integration is searched under it.
//
// Everything above compares the two call sites on techniques whose numerics
// happen to be the notebook's defaults, so it cannot see the failure this
// gate is for: the search reading the step off a GLOBAL rather than off the
// technique in front of it. Every preset kept before the default last moved
// carries its own dt, and for those the worker scored at the default while
// the page replayed at the technique's -- two integrations, one cost, and a
// technique that succeeded in the search and fell in playback.
//
// Three separate places had to be told: the worker (which overrode dt with a
// default), the nominal robustness variant (which was written as an absolute
// number and so overrode whatever it was handed), and the final check (which
// still named a step the notebook had stopped using). So the gate checks all
// of them, on a technique whose numerics are deliberately nothing like the
// defaults.
// ---------------------------------------------------------------------------
{
  const m0 = buildModel({}), ws0 = createWorkspace(m0);
  const stored = builtinPreset('lowflex');
  const m = pageBody(stored);
  const ODD = { dt: 3e-4, settleT: 1.8 };
  const rec = techniqueFromJSON(techniqueToJSON({ ...stored, numerics: ODD }));
  const sa = techniqueSearchArgs(rec);

  gate('E. the search args carry the technique\'s own integration',
    sa.dt === ODD.dt && sa.numerics.settleT === ODD.settleT,
    `dt ${sa.dt}, settleT ${sa.numerics.settleT} against the default `
    + `${NUMERICS_DEFAULTS.dt} / ${NUMERICS_DEFAULTS.settleT}`);

  // The nominal robustness variant must not override the step. Written as an
  // absolute number it always did, whatever the technique said.
  gate('E2. and the nominal robustness variant leaves it alone',
    robustVariants(sa.dt)[0].dt === undefined
    && Math.abs(robustVariants(sa.dt)[1].dt - sa.dt * 1.6) < 1e-12,
    `nominal inherits, second is ${robustVariants(sa.dt)[1].dt.toExponential(2)}`);

  // And the whole way through: scored as the worker scores it, against the
  // same rollout asked for explicitly at the technique's own step.
  const x = encodeDecision(rec.knots.map((k) => Float64Array.from(k)), rec.T);
  const shared = {
    K: sa.K, q0: sa.q0, target: sa.target, plant: sa.plant, knotFracs: sa.knotFracs,
    locks: sa.locks, timeLocks: sa.timeLocks, numerics: sa.numerics, symmetric: sa.symmetric,
  };
  // The worker names the step (from the technique); a caller holding only a
  // technique names nothing. Both must reach the same rollout -- worst case
  // over the variants, which is the number the search actually minimises.
  const viaWorker = robustRolloutCost(m.model, m.ws, m.prof, sa.rom, sa.scenario, x,
    { ...shared, dt: sa.dt });
  const viaNumerics = robustRolloutCost(m.model, m.ws, m.prof, sa.rom, sa.scenario, x, shared);
  gate('E3. and scores the same whether or not the caller names the step',
    viaWorker.cost === viaNumerics.cost,
    `${viaWorker.cost.toFixed(6)} against ${viaNumerics.cost.toFixed(6)}`);

  // And what the search would report at the end is the run the page replays.
  // This is the whole point: the nominal case, scored and played, is one
  // trajectory. It used to be two whenever the technique carried its own step.
  const scoredNominal = rolloutCost(m.model, m.ws, m.prof, sa.rom, sa.scenario, x,
    { ...shared, variants: [{}] });
  const playedBack = runScenario(m.model, m.ws, m.prof, techniqueRunArgs(rec, m.model, m.ws));
  const a = scoredNominal.rec.com[scoredNominal.rec.com.length - 1];
  const b = playedBack.rec.com[playedBack.rec.com.length - 1];
  gate('E4. and the nominal score is the run the page replays',
    Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-12
    && !!scoredNominal.verdict?.success === !!playedBack.verdict?.success,
    `scored ends at (${a[0].toFixed(6)}, ${a[1].toFixed(6)}), `
    + `replayed at (${b[0].toFixed(6)}, ${b[1].toFixed(6)})`);

  // And the last link: what a real search REPORTS at the end. optimizeScenario
  // re-scores its winner once to produce the number the page prints, and that
  // call named its own step -- a third opinion, and the one a reader would see
  // as "the search says 8.1 and the figure says it falls".
  const r = await optimizeScenario(m.model, m.ws, m.prof, sa.rom, {
    ...sa, maxGen: 1, sigma0: 0.01, robust: false,
  });
  // Including the START the search settled on. This gate is about the page
  // reproducing what the search reports, and when the start is unlocked the
  // search reports one -- adopting the knots and leaving the start behind
  // replays a different problem. It went unnoticed while a one-generation
  // search moved the start too little to see; a technique the search wants to
  // start differently makes it centimetres.
  const replay = runScenario(m.model, m.ws, m.prof, {
    ...techniqueRunArgs(rec, m.model, m.ws),
    knots: r.decoded.knots, T: r.decoded.T,
    q0: r.decoded.q0 || rec.q0 || null,
    // And the phrasing, for the same reason: when the instants are the
    // search's, the search reports those too.
    knotFracs: r.decoded.fracs ? Array.from(r.decoded.fracs) : (rec.knotFracs || null),
  });
  const c = r.finalCheck.rec.com[r.finalCheck.rec.com.length - 1];
  const d = replay.rec.com[replay.rec.com.length - 1];
  gate('E5. and a finished search reports the run the page replays',
    Math.hypot(c[0] - d[0], c[1] - d[1]) < 1e-12
    && !!r.finalCheck.verdict?.success === !!replay.verdict?.success,
    `reported ends at (${c[0].toFixed(6)}, ${c[1].toFixed(6)}), `
    + `replayed at (${d[0].toFixed(6)}, ${d[1].toFixed(6)})`);
}

console.log(`\n${failures === 0 ? 'ALL GATES PASS' : `${failures} GATE(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
