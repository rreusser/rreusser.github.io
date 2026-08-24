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
} from '../rollout.js';

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
  moved[3] = solved[3] - 25 * D2R;   // hipL, in JOINT_KEYS order
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

console.log(failures ? `\n${failures} GATE(S) FAILED` : '\nALL GATES PASS');
process.exit(failures ? 1 : 0);
