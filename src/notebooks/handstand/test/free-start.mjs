// Can the search be told to choose the pose the body STARTS in?
//
// Every other part of a technique could be handed to the optimizer a piece at
// a time -- a pose, an instant, the whole shape -- except the one the reader
// is least able to get right by hand. The start is not authored: three of the
// four scenarios SOLVE it from the body, and a reader who drags it is guessing
// at a balance the statics already know. "Am I starting in the wrong place?"
// was the one question the search could not answer.
//
// It answers it by carrying the start's joint angles on the end of the
// decision vector. Which makes three things worth gating, because all three
// have been the shape of a real bug in this notebook before:
//
//   1. the tail is not confused with the OTHER optional tail. The interior
//      instants also ride on the end, and for six poses both are the same
//      length as each other to within a couple of entries -- so a decoder that
//      guesses from the vector's length reads one as the other and silently
//      scores a technique nobody asked for.
//   2. the tail is actually USED. A start the scorer decodes and then throws
//      away is worse than no feature: the search spends eight dimensions on
//      it, sees no change in the cost, and wanders.
//   3. what comes back replays. The search reports a cost; the page replays
//      the answer. If the returned q0 is not the q0 that was scored, those are
//      two different movements wearing one number -- which is the failure this
//      notebook has spent its whole history chasing.
//
// Run: node src/notebooks/handstand/test/free-start.mjs
import { buildModel } from '../anthropometry.js';
import { createWorkspace } from '../dynamics.js';
import { strengthProfile } from '../strength.js';
import { ROM_DEFAULTS } from '../statics.js';
import {
  encodeDecision, decodeDecision, rolloutCost, optimizeScenario, runScenario,
  kickReference, KICK_T, startPoseJoints, startPoseFrom, decisionBounds, NJ,
  scenarioStart, startChannels, JOINT_KEYS,
} from '../rollout.js';
import { techniqueSearchArgs, techniqueToJSON, techniqueFromJSON } from '../technique-file.js';

let failures = 0;
function gate(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const D2R = Math.PI / 180;
const model = buildModel({});
const ws = createWorkspace(model);
const prof = strengthProfile(model.massKg, {});
const rom = { ...ROM_DEFAULTS };
const K = 6;
const { knots, target } = kickReference(model, ws, K, rom);

// ---- 1. two tails, told apart ----------------------------------------------
{
  const fracs = Float64Array.from([0, 0.19, 0.37, 0.58, 0.81, 1]);
  const start = Float64Array.from({ length: NJ }, (_, j) => 0.101 * (j + 1));
  const both = encodeDecision(knots, KICK_T, fracs, start);
  gate('a vector carrying both tails is as long as both tails say',
    both.length === NJ * K + 1 + (K - 2) + NJ,
    `${both.length} entries for ${NJ}x${K} knots + T + ${K - 2} instants + ${NJ} start angles`);

  const d = decodeDecision(both, K, NJ);
  gate('the start comes back, to the bit',
    Array.from(d.start).every((v, j) => v === start[j]),
    `${Array.from(d.start).map((v) => v.toFixed(3)).join(', ')}`);
  gate('and so do the instants beside it',
    Array.from(d.fracs).every((v, k) => Math.abs(v - fracs[k]) < 1e-12));
  gate('and the tempo between them', d.T === KICK_T);

  // The one that bites: a vector with ONLY a start tail must not be read as a
  // vector whose instants are free. For six poses the instant tail is four
  // entries and the start tail is eight, so a length-guessing decoder reads
  // the first four start angles as the phrasing.
  const startOnly = encodeDecision(knots, KICK_T, null, start);
  const ds = decodeDecision(startOnly, K, NJ);
  gate('a start tail is not mistaken for free instants', ds.fracs === null,
    ds.fracs ? `read phrasing ${Array.from(ds.fracs).map((v) => v.toFixed(2)).join(', ')}` : 'no phrasing');
  gate('and the start is still read off the end',
    Array.from(ds.start).every((v, j) => v === start[j]));

  // And the box the search samples has to have grown with it, or CMA-ES reads
  // past the end of bounds.lo into undefined -- which clamps to NaN and
  // poisons the run without ever throwing.
  const b = decisionBounds(K, { rom, freeTimes: true, freeStart: true });
  gate('the bounds cover every entry, start angles included',
    b.lo.length === both.length && b.hi.length === both.length
      && Array.from(b.lo).every(Number.isFinite) && Array.from(b.hi).every(Number.isFinite),
    `${b.lo.length} bounds for ${both.length} entries`);
}

// ---- 2. the start the scorer is handed is the start it runs -----------------
{
  const solved = startPoseJoints(model, ws, 'lunge', rom, null);
  // A start with the stance hip a good way from where the scenario solves it.
  const moved = Float64Array.from(solved);
  // The stance hip, BY NAME. Written as index 3 -- "hipL, in JOINT_KEYS order"
  // -- it was hipL for exactly as long as the body had eight joints; on the
  // articulated one index 3 is the spine, whose range is a third as wide, so
  // the gate went on perturbing something and quietly stopped perturbing a hip.
  moved[JOINT_KEYS.indexOf('hipL')] = solved[JOINT_KEYS.indexOf('hipL')] - 25 * D2R;
  const x = encodeDecision(knots, KICK_T, null, moved);
  const c = rolloutCost(model, ws, prof, rom, 'lunge', x,
    { K, dt: 5e-4, target, freeStart: true });
  const got = c.rec.q[0];
  const want = startPoseFrom(model, ws, 'lunge', rom, null, moved, false);
  // Not to the bit: runScenario grounds the hand and lifts a toe through the
  // floor clear before it integrates, and both of those move a joint. The
  // question is whether the start it ran is the one asked for rather than the
  // one the scenario solves.
  const dOffered = Math.max(...Array.from({ length: NJ }, (_, j) => Math.abs(got[3 + j] - want[3 + j])));
  const dSolved = Math.max(...Array.from({ length: NJ }, (_, j) => Math.abs(got[3 + j] - solved[j])));
  gate('the scorer starts from the pose in the vector, not the scenario\'s solve',
    dOffered < dSolved, `${(dOffered / D2R).toFixed(1)} deg from what was asked for, `
    + `${(dSolved / D2R).toFixed(1)} deg from the solve`);

  // And with the start LOCKED the same vector is scored from the solve -- the
  // tail is inert, not merely ignored on the way in.
  const cLocked = rolloutCost(model, ws, prof, rom, 'lunge', x, { K, dt: 5e-4, target });
  const dLocked = Math.max(...Array.from({ length: NJ },
    (_, j) => Math.abs(cLocked.rec.q[0][3 + j] - solved[j])));
  gate('and with the start held, the same vector starts where it always did',
    dLocked < 0.5 * D2R && dSolved > 20 * D2R,
    `held run is ${(dLocked / D2R).toFixed(2)} deg from the solve, `
    + `free run is ${(dSolved / D2R).toFixed(1)} deg from it`);
  gate('which are two different scores, so the dimensions are earning their place',
    Math.abs(c.cost - cLocked.cost) > 1e-6,
    `free ${c.cost.toFixed(3)} vs held ${cLocked.cost.toFixed(3)}`);
}

// ---- 2b. two loose tails at once -------------------------------------------
// The bug this gate exists for. A decision vector has two optional tails --
// the interior instants, then the start pose -- and optimizeScenario used to
// refit a short one by asking, per entry, "is x[NJ*K + k] present?". That is
// the right question only for a vector that can be short at the END. With a
// start tail every one of those entries IS present, and what they hold is the
// start pose's joint angles -- so a technique with a free instant AND a free
// start was phrased in RADIANS. On the kick-up the poses jumped from 0.29,
// 0.59, 0.88, 1.18 to a cluster near 1.2 s and the technique died on the
// first generation.
{
  const solved = startPoseJoints(model, ws, 'lunge', rom, null);
  // The phrasing the technique is actually carrying: deliberately uneven, so
  // "the instants survived" cannot be true by falling back to even spacing.
  const fracs = [0, 0.17, 0.41, 0.63, 0.86, 1];
  // The vector as techniqueSearchArgs used to write it: a start tail and no
  // instants, handed to a search that is about to add instants. This is the
  // shape that has to be refitted, and the refit is where it went wrong.
  const x0 = encodeDecision(knots, KICK_T, null, solved);
  const r = await optimizeScenario(model, ws, prof, rom, {
    scenario: 'lunge', K, seed: 5, maxGen: 1, sigma0: 0.001, robust: false,
    tLo: KICK_T, tHi: KICK_T, target, freeStart: true, freeTimes: true,
    knotFracs: fracs, timeLocks: [0, null, null, null, null, 1], x0,
  });
  const got = Array.from(r.decoded.fracs || []);
  const near = got.length === K && got.every((v, k) => Math.abs(v - fracs[k]) < 0.05);
  gate('a free start does not phrase the movement in radians',
    near, `wrote [${fracs.join(', ')}], searched from [${got.map((v) => v.toFixed(3)).join(', ')}]`);
  // And the same technique with its instants pinned is untouched by the tail
  // sitting behind them.
  const r2 = await optimizeScenario(model, ws, prof, rom, {
    scenario: 'lunge', K, seed: 5, maxGen: 1, sigma0: 0.001, robust: false,
    tLo: KICK_T, tHi: KICK_T, target, freeStart: true, knotFracs: fracs,
    x0: encodeDecision(knots, KICK_T, null, solved),
  });
  gate('and with the instants pinned the vector carries none',
    r2.decoded.fracs === null && r2.decoded.start !== null,
    `fracs ${r2.decoded.fracs ? 'present' : 'null'}, start ${r2.decoded.start ? 'present' : 'null'}`);
  // The start still has to arrive where it was written, not be re-solved.
  const d = Math.max(...Array.from({ length: NJ },
    (_, j) => Math.abs(r.decoded.start[j] - solved[j])));
  gate('and the start it began from is the one that was handed in',
    d < 0.35, `${(d / D2R).toFixed(1)} deg of drift in one generation`);
}

// The writer's side of the same contract: what techniqueSearchArgs hands in is
// the layout the search is about to use, so the refit above is for older
// callers rather than for the notebook's own path.
{
  const t = {
    knots, T: KICK_T, scenario: 'lunge', knotFracs: [0, 0.17, 0.41, 0.63, 0.86, 1],
    timeHeld: [true, false, false, false, false, true], held: [false, false, false, false, false, true],
    startHeld: false, q0: startPoseFrom(model, ws, 'lunge', rom, null, null, false),
    rom, symmetric: false,
  };
  const sa = techniqueSearchArgs(t);
  gate('what the notebook hands the search is already the right length',
    sa.x0.length === NJ * K + 1 + (K - 2) + NJ,
    `${sa.x0.length} entries, wanted ${NJ * K + 1 + (K - 2) + NJ}`);
  const d = decodeDecision(sa.x0, K, NJ);
  gate('with the phrasing in the phrasing slots',
    Array.from(d.fracs).every((v, k) => Math.abs(v - t.knotFracs[k]) < 1e-12),
    `[${Array.from(d.fracs).map((v) => v.toFixed(3)).join(', ')}]`);
  gate('and the start pose in the start slots',
    Array.from(d.start).every((v, j) => Math.abs(v - t.q0[3 + j]) < 1e-12));
}

// ---- 3. what comes back is what was scored ---------------------------------
{
  const r = await optimizeScenario(model, ws, prof, rom, {
    scenario: 'lunge', K, seed: 3, maxGen: 3, sigma0: 0.02, robust: false,
    tLo: KICK_T, tHi: KICK_T, target, freeStart: true,
    x0: encodeDecision(knots, KICK_T, null, startPoseJoints(model, ws, 'lunge', rom, null)),
  });
  gate('a search with the start free hands one back', !!r.decoded.q0,
    r.decoded.q0 ? `${r.decoded.q0.length} coordinates` : 'null');
  // The whole point: replaying the answer the way the page replays it, from
  // the q0 the search returned, reproduces the run the search scored.
  const replay = runScenario(model, ws, prof, {
    scenario: 'lunge', knots: r.decoded.knots, T: r.decoded.T, target, rom,
    q0: r.decoded.q0, ...r.numerics,
  });
  const a = r.finalCheck.rec.com[r.finalCheck.rec.com.length - 1];
  const b = replay.rec.com[replay.rec.com.length - 1];
  gate('and replaying it from that start reproduces what was scored',
    Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6,
    `centre of mass ends at (${a[0].toFixed(4)}, ${a[1].toFixed(4)}) scored, `
    + `(${b[0].toFixed(4)}, ${b[1].toFixed(4)}) replayed`);
  gate('and it agrees about whether the technique arrives',
    !!r.finalCheck.verdict?.success === !!replay.verdict?.success);
}

// ---------------------------------------------------------------------------
// The hands off the floor.
//
// A start pose used to be joint angles and nothing else, because runScenario
// put the palm flat on the floor at the origin whatever it was handed. That is
// a property of the techniques this notebook happened to hold, not of
// handstands: a technique may begin in the air, on its feet, or part way
// through a rotation, and when it does, WHERE the body stands is part of it.
//
// Four things have to be true for that to be a real degree of freedom rather
// than a field nobody reads: the base survives the round trip into a run, it
// is NOT respected when the technique says it is grounded, the decision vector
// grows by exactly three when it is free, and the search actually moves it.
// ---------------------------------------------------------------------------
{
  const solvedQ0 = scenarioStart(model, ws, 'lunge', rom).q0;
  const lifted = Float64Array.from(solvedQ0);
  lifted[0] = 0.22;                    // a fifth of a metre along the floor
  lifted[1] = solvedQ0[1] + 0.35;      // and a third of a metre above it
  lifted[2] = 18 * D2R;                // leaning

  const freeRun = runScenario(model, ws, prof, {
    scenario: 'lunge', knots, T: KICK_T, target, rom, dt: 5e-4, settleT: 0.4,
    q0: lifted, startGrounded: false,
  });
  const g = freeRun.rec.q[0];
  gate('a start that has let go of the floor begins where it says it does',
    Math.abs(g[0] - lifted[0]) < 1e-9 && Math.abs(g[1] - lifted[1]) < 1e-9
    && Math.abs(g[2] - lifted[2]) < 1e-9,
    `asked for (${lifted[0].toFixed(3)}, ${lifted[1].toFixed(3)}, `
    + `${(lifted[2] / D2R).toFixed(1)} deg), began at (${g[0].toFixed(3)}, `
    + `${g[1].toFixed(3)}, ${(g[2] / D2R).toFixed(1)} deg)`);

  const groundedRun = runScenario(model, ws, prof, {
    scenario: 'lunge', knots, T: KICK_T, target, rom, dt: 5e-4, settleT: 0.4,
    q0: lifted, startGrounded: true,
  });
  const h = groundedRun.rec.q[0];
  gate('and the same pose grounded is put back on the floor at the origin',
    Math.abs(h[0]) < 1e-12 && Math.abs(h[1] - model.wristHeight) < 1e-12
    && Math.abs(h[2]) < 1e-12,
    `began at (${h[0].toFixed(3)}, ${h[1].toFixed(3)}, ${(h[2] / D2R).toFixed(1)} deg)`);

  // Nothing may start THROUGH the floor, free base or not -- a contact point
  // below the ground is a penalty spring firing a large impulse at t = 0. A
  // grounded start unfolds a hip to clear it; a free one has somewhere else to
  // go, so it goes up, and the pose is untouched.
  const sunk = Float64Array.from(lifted);
  sunk[1] = -0.3;
  const sunkRun = runScenario(model, ws, prof, {
    scenario: 'lunge', knots, T: KICK_T, target, rom, dt: 5e-4, settleT: 0.4,
    q0: sunk, startGrounded: false,
  });
  const s0 = sunkRun.rec.q[0];
  const sameJoints = Math.max(...Array.from({ length: NJ },
    (_, j) => Math.abs(s0[3 + j] - sunk[3 + j])));
  gate('a free start below the floor is lifted, not folded',
    s0[1] > sunk[1] && sameJoints < 1e-12,
    `raised ${((s0[1] - sunk[1]) * 1000).toFixed(0)} mm, joints moved `
    + `${(sameJoints / D2R).toFixed(3)} deg`);

  // And the decision vector: three more channels, bounded around where the
  // technique already stands rather than around the whole room.
  const nGrounded = decisionBounds(K, { rom, freeStart: true }).lo.length;
  const nFree = decisionBounds(K, { rom, freeStart: true, freeBase: true,
    startBase: [lifted[0], lifted[1], lifted[2]] }).lo.length;
  gate('a free base is exactly three more decisions', nFree - nGrounded === 3,
    `${nGrounded} grounded, ${nFree} free`);
  const bFree = decisionBounds(K, { rom, freeStart: true, freeBase: true,
    startBase: [lifted[0], lifted[1], lifted[2]] });
  const base0 = NJ * K + 1 + NJ;
  gate('and its box is around the start, not the room',
    bFree.lo[base0] < lifted[0] && bFree.hi[base0] > lifted[0]
    && bFree.lo[base0 + 1] >= 0 && bFree.hi[base0 + 2] > lifted[2],
    `x in [${bFree.lo[base0].toFixed(2)}, ${bFree.hi[base0].toFixed(2)}], `
    + `y in [${bFree.lo[base0 + 1].toFixed(2)}, ${bFree.hi[base0 + 1].toFixed(2)}]`);

  // The round trip, which is what makes it part of the TECHNIQUE rather than a
  // runtime argument: saved and read back, a free start still stands where it
  // stood.
  const rec = techniqueFromJSON(techniqueToJSON({
    label: 'free', scenario: 'lunge', knots, T: KICK_T, q0: lifted, target,
    rom, startHeld: false, startGrounded: false, symmetric: false,
    knotFracs: null, held: null, timeHeld: null,
  }));
  gate('and it survives the round trip through a file',
    rec.startGrounded === false && Math.abs(rec.q0[1] - lifted[1]) < 1e-12,
    `startGrounded ${rec.startGrounded}, y ${rec.q0[1].toFixed(4)}`);
  const sa = techniqueSearchArgs(rec);
  gate('and the search is handed a vector with the base on the end',
    sa.startGrounded === false
    && sa.x0.length === NJ * K + 1 + startChannels(true),
    `x0 is ${sa.x0.length} long, base at ${sa.x0[sa.x0.length - 2].toFixed(3)}`);
}

console.log(failures ? `\n${failures} GATE(S) FAILED` : '\nALL GATES PASS');
process.exit(failures ? 1 : 0);
