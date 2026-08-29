// Held poses and authored phrasing.
//
// Two things the figure can now say that the search has to honour: a pose
// locked by hand is not a decision variable, and the instants the poses fall
// on are set by the reader rather than assumed even. Both are ways for the
// page and the search to end up describing different techniques, which is the
// failure test/agreement.mjs exists to catch -- these gates check the two new
// mechanisms themselves.
//
// Run: node src/notebooks/handstand/test/keyframes.mjs
import { buildModel } from '../anthropometry.js';
import { createWorkspace } from '../dynamics.js';
import { strengthProfile, STRENGTH_DEFAULTS } from '../strength.js';
import { ROM_DEFAULTS } from '../statics.js';
import { splineEval, knotTimes } from '../control.js';
import {
  optimizeScenario, runScenario, rolloutCost, encodeDecision, decodeDecision, decisionBounds,
  resolvePlant, resolveNumerics, resolveRom, resolveBody, applyLocks, applyTimeLocks,
  symmetrizeKnots, SYMMETRIC_SCENARIOS, MIN_KNOT_GAP, NJ, JOINT_KEYS,
  NUMERICS_DEFAULTS,
} from '../rollout.js';
import { PRESET_TRAJECTORIES } from '../presets.js';

let failures = 0;
function gate(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const D = 180 / Math.PI;

const stored = PRESET_TRAJECTORIES.lowflex;
const model = buildModel(resolveBody(stored.body)), ws = createWorkspace(model);
const st0 = stored.strength || null;
const prof = strengthProfile(model.massKg, { overrides: { ...(st0 || {}),
  shoulder: { ...(st0?.shoulder || STRENGTH_DEFAULTS.shoulder),
    t0Vol: st0?.shoulder?.t0Vol ?? STRENGTH_DEFAULTS.shoulder.t0Vol } } });
const rom = resolveRom({ ...(stored.rom || {}) });
// From the technique, all three of them. A recorded built-in carries its own
// integration, its own start and its own phrasing, and a gate that supplies
// its own instead is comparing two call sites on a technique neither of them
// was given -- which they will happily agree about, having both been handed
// the same wrong thing.
const DT = resolveNumerics(stored.numerics).dt;
const Q0 = stored.q0 ? Float64Array.from(stored.q0) : null;
const FRACS0 = stored.knotFracs ? Float64Array.from(stored.knotFracs) : null;
const knots = stored.knots.map((k) => Float64Array.from(k));
const K = knots[0].length, T = stored.T;
const target = new Float64Array(model.nq);
for (let j = 0; j < NJ; j++) target[3 + j] = knots[j][K - 1];

// ---------------------------------------------------------------------------
// Gate A: uneven phrasing is a real generalization -- it reduces exactly to
// even spacing, passes through its knots, and stays C1 across them. If any of
// those fails the reference the servo chases is not the curve the storyboard
// draws, and every other gate here is measuring the wrong thing.
// ---------------------------------------------------------------------------
{
  const row = Float64Array.from([0.1, -0.4, 1.2, 0.3, -0.9, 0.55]);
  const even = knotTimes(T, 6);
  let dv = 0, dr = 0;
  for (let i = 0; i <= 4000; i++) {
    const t = (i / 4000) * T * 1.2 - 0.1 * T;
    const a = splineEval(row, T, t), b = splineEval(row, T, t, even);
    dv = Math.max(dv, Math.abs(a.value - b.value));
    dr = Math.max(dr, Math.abs(a.rate - b.rate));
  }
  gate('A. even times reproduce the uniform spline', dv < 1e-12 && dr < 1e-10,
    `${dv.toExponential(1)} rad, ${dr.toExponential(1)} rad/s`);

  const uneven = Float64Array.from([0, 0.05, 0.12, 0.5, 0.55, 1].map((f) => f * T));
  let through = 0;
  for (let k = 0; k < 6; k++) through = Math.max(through, Math.abs(splineEval(row, T, uneven[k], uneven).value - row[k]));
  gate('A2. and pass through their knots', through === 0, `${through.toExponential(1)} rad`);

  const e = 1e-7;
  let jump = 0;
  for (let k = 1; k < 5; k++) {
    jump = Math.max(jump, Math.abs(splineEval(row, T, uneven[k] - e, uneven).rate
      - splineEval(row, T, uneven[k] + e, uneven).rate));
  }
  gate('A3. with no jump in rate across them', jump < 1e-3, `${jump.toExponential(1)} rad/s`);
}

// ---------------------------------------------------------------------------
// Gate B: phrasing changes the movement. A gate that passed whether or not the
// times were wired through would be worthless, so this asserts the two differ
// -- an uneven technique must not integrate to the same trajectory as an even
// one.
// ---------------------------------------------------------------------------
const unevenFracs = Float64Array.from([0, 0.1, 0.18, 0.5, 0.72, 1]);
{
  const go = (fracs) => runScenario(model, ws, prof, {
    scenario: stored.scenario, knots: knots.map((k) => Float64Array.from(k)), T, rom, target,
    q0: Q0, knotFracs: fracs, ...resolvePlant(stored.config), ...resolveNumerics(stored.numerics),
  });
  const flat = go(null), bent = go(unevenFracs);
  let d = 0;
  for (let i = 0; i < flat.q.length; i++) d = Math.max(d, Math.abs(flat.q[i] - bent.q[i]));
  gate('B. authored phrasing changes the trajectory', d > 1e-3, `${(d * D).toFixed(1)} deg apart at the end`);

  // ...and an even set of fractions is exactly the same as none at all, to the
  // last bit. The two branches draw the same curve but not with the same
  // arithmetic, so without normalizing even phrasing away this lands around
  // 1e-13 rad -- small, and still a technique differing from itself depending
  // on which caller asked.
  const evenFracs = Float64Array.from({ length: K }, (_, k) => k / (K - 1));
  const same = go(evenFracs);
  let e2 = 0;
  for (let i = 0; i < flat.q.length; i++) e2 = Math.max(e2, Math.abs(flat.q[i] - same.q[i]));
  gate('B2. and even phrasing is no phrasing', e2 === 0, `${e2.toExponential(1)} rad`);
}

// ---------------------------------------------------------------------------
// Gate C: the score and the replay agree about phrasing. Same shape as
// agreement.mjs, on the axis it does not cover.
// ---------------------------------------------------------------------------
{
  const a = rolloutCost(model, ws, prof, rom, stored.scenario,
    encodeDecision(knots.map((k) => Float64Array.from(k)), T),
    { K, dt: DT, q0: Q0, target, plant: resolvePlant(stored.config), knotFracs: unevenFracs });
  const b = runScenario(model, ws, prof, {
    scenario: stored.scenario, knots: knots.map((k) => Float64Array.from(k)), T, rom, target,
    q0: Q0, knotFracs: unevenFracs, ...resolvePlant(stored.config), ...resolveNumerics(stored.numerics),
  });
  const byTime = new Map();
  for (let k = 0; k < b.rec.t.length; k++) byTime.set(b.rec.t[k].toFixed(9), k);
  let d = 0, matched = 0;
  for (let k = 0; k < a.rec.t.length; k++) {
    const j = byTime.get(a.rec.t[k].toFixed(9));
    if (j === undefined) continue;
    matched++;
    for (let i = 0; i < a.rec.q[k].length; i++) d = Math.max(d, Math.abs(a.rec.q[k][i] - b.rec.q[j][i]));
  }
  gate('C. scored and replayed identically when phrased by hand', d === 0 && matched > 8,
    `${matched} shared instants, ${d.toExponential(1)} rad`);
}

// ---------------------------------------------------------------------------
// Gate D: a held pose is not a decision. Locking poses 0 and 2 and running a
// real search, those knots must come back untouched to the last bit while the
// free ones move -- a lock that merely discouraged the search would leave a
// pose a fraction of a degree from where it was put, which is not "held".
// ---------------------------------------------------------------------------
{
  const locks = Array.from({ length: K }, (_, k) => (k === 0 || k === 2 || k === K - 1
    ? Array.from({ length: NJ }, (_, j) => knots[j][k]) : null));
  const res = await optimizeScenario(model, ws, prof, rom, {
    scenario: stored.scenario, seed: 5, maxGen: 12, K, sigma0: 0.05,
    x0: encodeDecision(knots.map((k) => Float64Array.from(k)), T),
    target, plant: resolvePlant(stored.config), locks, tHi: 3.5, t0: 2.2,
  });
  let held = 0, moved = 0;
  for (let k = 0; k < K; k++) {
    for (let j = 0; j < NJ; j++) {
      const d = Math.abs(res.decoded.knots[j][k] - knots[j][k]);
      if (locks[k]) held = Math.max(held, d); else moved = Math.max(moved, d);
    }
  }
  gate('D. a held pose comes back exactly where it was put', held === 0, `${(held * D).toExponential(1)} deg`);
  gate('D2. while the free poses do move', moved > 1e-4, `${(moved * D).toFixed(2)} deg`);

  // And the bounds say so too, so the search does not spend adaptation on
  // dimensions that cannot change the cost.
  const { lo, hi } = decisionBounds(K, { rom, locks });
  let open = 0;
  for (let k = 0; k < K; k++) {
    if (!locks[k]) continue;
    for (let j = 0; j < NJ; j++) open = Math.max(open, hi[j * K + k] - lo[j * K + k]);
  }
  gate('D3. and its bounds are a point, not a range', open === 0, `widest held bound ${open.toExponential(1)} rad`);
}

// ---------------------------------------------------------------------------
// Gate E: locking is applied after the symmetry mirror, so on a symmetric
// skill a held pose is the pose you can see rather than the one it would have
// been straightened into.
// ---------------------------------------------------------------------------
{
  // One row per joint the body has, and the legs deliberately scissored so
  // the mirror has something to do. Written as six rows by hand this threw
  // the moment the trunk gained a hinge, because applyLocks walks the joint
  // list and the seventh row was not there.
  const hipL = JOINT_KEYS.indexOf('hipL'), hipR = JOINT_KEYS.indexOf('hipR');
  const kn = Array.from({ length: NJ }, () => Float64Array.from([0]));
  kn[hipL][0] = 0.3; kn[hipR][0] = 0.9;
  const want = Array.from({ length: NJ }, (_, j) => 0.11 * (j + 1));
  symmetrizeKnots(kn);
  applyLocks(kn, [want]);
  let d = 0;
  for (let j = 0; j < NJ; j++) d = Math.max(d, Math.abs(kn[j][0] - want[j]));
  gate('E. a lock survives the symmetry mirror', d === 0, `${d.toExponential(1)} rad`);
  gate('E2. (and the mirror really would have moved it)',
    SYMMETRIC_SCENARIOS.has('tuck') && Math.abs(0.9 - 0.3) > 0.1, 'hip R was 0.60 rad off hip L');
}

// ---------------------------------------------------------------------------
// Gate F: the instants are searchable, and a pinned one is not.
//
// Same shape as gate D, one axis over: with the duration held fixed at both
// ends, a real search must move the interior poses along the clock, and must
// return a phrasing that is still a movement -- increasing, with room between
// the poses. A pinned instant comes back exactly where it was put.
// ---------------------------------------------------------------------------
{
  // Every pose crammed into the first third, which is a real phrasing fault:
  // the movement is asked for in a rush and then nothing happens for a second
  // and a half, and it does not arrive. Starting from a technique that already
  // WORKS was the mistake in the first version of this gate -- there is almost
  // nothing left to find, so whether a given seed finds it is luck, and the
  // gate was really asserting a die roll. (Seeds 3 and 11 find nothing here in
  // sixty generations; seed 5 finds nothing in thirty and 50 ms in sixty.)
  // From a fault, the search has an obvious repair and reliably makes it:
  // 416 -> 242 at both thirty and fifty generations.
  const startFracs = Float64Array.from({ length: K }, (_, k) =>
    (k === 0 ? 0 : k === K - 1 ? 1 : (k * 0.3) / (K - 1)));
  const PIN = 2;
  const timeLocks = Array.from({ length: K }, (_, k) => (k === PIN ? startFracs[k] : null));
  const res = await optimizeScenario(model, ws, prof, rom, {
    scenario: stored.scenario, seed: 5, maxGen: 30, K, sigma0: 0.05,
    x0: encodeDecision(knots.map((k) => Float64Array.from(k)), T, startFracs),
    target, plant: resolvePlant(stored.config),
    knotFracs: startFracs, freeTimes: true, timeLocks,
    // Both ends of the duration are the tempo on screen, exactly as the page
    // sends it: this gate is about phrasing WITHIN a fixed tempo.
    tLo: T, tHi: T, t0: T,
  });
  const got = res.decoded.fracs;
  gate('F. the search hands back a phrasing', !!got && got.length === K,
    got ? `${K} instants` : 'none');

  let ordered = true, tightest = 1;
  for (let k = 1; k < K; k++) {
    if (!(got[k] > got[k - 1])) ordered = false;
    tightest = Math.min(tightest, got[k] - got[k - 1]);
  }
  gate('F1. and it is still a movement', ordered && got[0] === 0 && got[K - 1] === 1,
    `ends ${got[0]}..${got[K - 1]}, closest two poses ${tightest.toFixed(3)} apart`);
  gate('F2. with the room between poses the decode promises', tightest >= MIN_KNOT_GAP - 1e-12,
    `${tightest.toFixed(4)} against a floor of ${MIN_KNOT_GAP}`);

  const pinned = Math.abs(got[PIN] - startFracs[PIN]);
  let slid = 0;
  for (let k = 1; k < K - 1; k++) if (k !== PIN) slid = Math.max(slid, Math.abs(got[k] - startFracs[k]));
  gate('F3. a pinned pose stays on its instant', pinned === 0,
    `${(pinned * T * 1000).toFixed(1)} ms`);
  gate('F3a. while the free ones are re-phrased', slid > 1e-3,
    `${(slid * T * 1000).toFixed(0)} ms`);
  gate('F3b. and the fault is actually repaired', res.best < 400,
    `cost ${res.best.toFixed(0)} from a start of about 416`);

  // And the tempo itself did not move, which is the whole premise: phrasing
  // must not be a back door to the slower-is-cheaper gradient that got the
  // duration taken out of the search in the first place.
  gate('F5. and the tempo is untouched', Math.abs(res.decoded.T - T) < 1e-9,
    `asked for ${T.toFixed(4)}s, got ${res.decoded.T.toFixed(4)}s`);

  // The bounds say it too.
  const { lo, hi } = decisionBounds(K, { rom, freeTimes: true, timeLocks });
  gate('F6. and a pinned instant is a point, not a range',
    hi[NJ * K + PIN] - lo[NJ * K + PIN] === 0,
    `width ${(hi[NJ * K + PIN] - lo[NJ * K + PIN]).toExponential(1)}`);
}

// ---------------------------------------------------------------------------
// Gate F4: a free instant is a decision, a pinned one is not.
//
// Straight at the mechanism: move an entry in the decision vector by hand and
// see whether the movement changes. No optimizer, so no luck involved -- which
// is what the old version of this gate had accidentally been measuring.
// ---------------------------------------------------------------------------
{
  const PIN = 2, FREE = 1;
  const fracs0 = knotTimes(1, K);
  const timeLocks = Array.from({ length: K }, (_, k) => (k === PIN ? fracs0[k] : null));
  const opts = { K, dt: 5e-4, target, plant: resolvePlant(stored.config), timeLocks };
  const base = encodeDecision(knots.map((k) => Float64Array.from(k)), T, fracs0);
  const nudged = (i) => {
    const x = Float64Array.from(base);
    x[NJ * K + i] += 0.15;
    return rolloutCost(model, ws, prof, rom, stored.scenario, x, opts);
  };
  const ref = rolloutCost(model, ws, prof, rom, stored.scenario, base, opts);
  const spread = (a, b) => {
    let d = 0;
    for (let k = 0; k < Math.min(a.rec.t.length, b.rec.t.length); k++) {
      for (let i = 0; i < a.rec.q[k].length; i++) d = Math.max(d, Math.abs(a.rec.q[k][i] - b.rec.q[k][i]));
    }
    return d;
  };
  const dFree = spread(ref, nudged(FREE));
  const dPinned = spread(ref, nudged(PIN));
  gate('F4. moving a free instant moves the movement', dFree > 1e-3,
    `${(dFree * D).toFixed(1)} deg apart`);
  gate('F4a. and moving a pinned one does nothing at all', dPinned === 0,
    `${(dPinned * D).toExponential(1)} deg`);

}

// ---------------------------------------------------------------------------
// Gate F7: with nothing released, the search is exactly the search it was
// before phrasing was searchable.
//
// This is the default, and it is the default because free instants cost more
// than they bought: measured over two techniques and three seeds, turning them
// all loose won once, tied three times, and twice found nothing at all where
// pinning found an improvement. So the default has to be free of charge -- the
// decision vector the same length, the phrasing read from knotFracs, the cost
// identical to the number the same technique scored before any of this.
// ---------------------------------------------------------------------------
{
  const { lo } = decisionBounds(K, { rom, freeTimes: false });
  gate('F7. nothing released means no extra decisions', lo.length === NJ * K + 1,
    `${lo.length} decisions, was ${NJ * K + 1}`);

  const x = encodeDecision(knots.map((k) => Float64Array.from(k)), T);
  gate('F7a. and the vector is the one it always was', x.length === NJ * K + 1,
    `${x.length} long`);
  const dec = decodeDecision(x, K);
  gate('F7b. carrying no phrasing of its own', dec.fracs === null,
    dec.fracs ? 'it carries instants' : 'the authored phrasing is used');

  // And the number it scores is the authored-phrasing number, to the last bit.
  const opts = { K, dt: DT, q0: Q0, target, plant: resolvePlant(stored.config) };
  const withFracs = rolloutCost(model, ws, prof, rom, stored.scenario, x,
    { ...opts, knotFracs: unevenFracs }).cost;
  const plain = rolloutCost(model, ws, prof, rom, stored.scenario, x,
    { ...opts, knotFracs: unevenFracs }).cost;
  gate('F7c. and scores it deterministically', withFracs === plain,
    `${withFracs.toFixed(6)}`);
}

// ---------------------------------------------------------------------------
// Gate G: the phrasing the search reports is the phrasing it scored.
//
// This is the failure that has bitten this notebook more than any other, in a
// new place: the search finishes, the page adopts the answer, replays it, and
// the body does something else. Here the trap is that the instants live in the
// decision vector while the replay takes them as an argument, so a search that
// returned its knots but not its phrasing would draw the right shapes at the
// wrong moments -- and the cost would not say so.
// ---------------------------------------------------------------------------
{
  const fracs0 = knotTimes(1, K);
  const x = encodeDecision(knots.map((k) => Float64Array.from(k)), T, fracs0);
  // Move two poses inside the vector, the way a generation would.
  x[NJ * K + 1] = 0.12;
  x[NJ * K + 2] = 0.55;
  const scored = rolloutCost(model, ws, prof, rom, stored.scenario, x,
    { K, dt: DT, q0: Q0, target, plant: resolvePlant(stored.config), knotFracs: fracs0 });
  // What the page would do with the answer: read the phrasing off the decode
  // and hand it to a replay.
  const dec = decodeDecision(x, K);
  applyTimeLocks(dec.fracs, null);
  const replay = runScenario(model, ws, prof, {
    scenario: stored.scenario, knots: dec.knots.map((k) => Float64Array.from(k)), T, rom, target,
    q0: Q0, knotFracs: dec.fracs, ...resolvePlant(stored.config), ...resolveNumerics(stored.numerics),
  });
  const byTime = new Map();
  for (let k = 0; k < replay.rec.t.length; k++) byTime.set(replay.rec.t[k].toFixed(9), k);
  let d = 0, matched = 0;
  for (let k = 0; k < scored.rec.t.length; k++) {
    const j = byTime.get(scored.rec.t[k].toFixed(9));
    if (j === undefined) continue;
    matched++;
    for (let i = 0; i < scored.rec.q[k].length; i++) {
      d = Math.max(d, Math.abs(scored.rec.q[k][i] - replay.rec.q[j][i]));
    }
  }
  gate('G. a searched phrasing replays as the movement that was scored',
    d === 0 && matched > 8, `${matched} shared instants, ${d.toExponential(1)} rad`);

  // Falsification: the phrasing really is doing something. Replaying the same
  // knots at the phrasing the search STARTED from -- which is what a page that
  // forgot to adopt res.decoded.fracs would draw -- is a different movement.
  const naive = runScenario(model, ws, prof, {
    scenario: stored.scenario, knots: dec.knots.map((k) => Float64Array.from(k)), T, rom, target,
    q0: Q0, knotFracs: fracs0, ...resolvePlant(stored.config), ...resolveNumerics(stored.numerics),
  });
  let dn = 0;
  for (let k = 0; k < replay.rec.t.length && k < naive.rec.t.length; k++) {
    for (let i = 0; i < replay.rec.q[k].length; i++) {
      dn = Math.max(dn, Math.abs(replay.rec.q[k][i] - naive.rec.q[k][i]));
    }
  }
  gate('G2. (and forgetting to adopt it really would show)', dn > 1e-3,
    `${(dn * D).toFixed(1)} deg apart`);
}

// ---------------------------------------------------------------------------
// Gate H: the decode projects onto "increasing, with room, pins honoured".
// Fed deliberate nonsense -- out of order, on top of each other, outside the
// unit interval -- it must still come back a movement.
// ---------------------------------------------------------------------------
{
  const cases = [
    ['out of order', [0, 0.9, 0.1, 0.5, 0.3, 1]],
    ['all at one instant', [0, 0.5, 0.5, 0.5, 0.5, 1]],
    ['outside the interval', [0, -3, 0.2, 9, 0.4, 1]],
    ['piled on the ending', [0, 1, 1, 1, 1, 1]],
  ];
  let worstOrder = 1, bad = [];
  for (const [what, raw] of cases) {
    const f = applyTimeLocks(Float64Array.from(raw), null);
    for (let k = 1; k < f.length; k++) worstOrder = Math.min(worstOrder, f[k] - f[k - 1]);
    if (f[0] !== 0 || f[f.length - 1] !== 1) bad.push(what);
  }
  gate('H. nonsense decodes to a movement', worstOrder >= 0 && bad.length === 0,
    bad.length ? `ends wrong: ${bad.join(', ')}` : `closest two poses ${worstOrder.toFixed(3)} apart`);

  // A pin is honoured through the projection, not merely used as a starting
  // point for it.
  const pins = [null, null, 0.42, null, null, null];
  const f = applyTimeLocks(Float64Array.from([0, 0.9, 0.1, 0.5, 0.3, 1]), pins);
  gate('H2. and a pin survives it', f[2] === 0.42, `pinned pose landed at ${f[2]}`);
}

