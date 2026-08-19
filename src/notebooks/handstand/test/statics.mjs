// Verification gates for the static analysis and ROM model.
//
// Run: node src/notebooks/handstand/test/statics.mjs
import { buildModel, handstandPose } from '../anthropometry.js';
import { createWorkspace, fk, momenta, rnea } from '../dynamics.js';
import {
  ROM_DEFAULTS, hipFlexMaxDeg, jointLimits, clampPose, romPenalty,
  groundHand, staticAnalysis, solveWristForCom, pressCorridor, wristQ3LimitsDeg,
} from '../statics.js';
import { strengthProfile } from '../strength.js';

let failures = 0;
function gate(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const D2R = Math.PI / 180;
const model = buildModel({ heightM: 1.75, massKg: 70 });
const ws = createWorkspace(model);
const nq = model.nq;

let seed = 777;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff - 0.5);

// ---------------------------------------------------------------------------
// Gate A: static joint torques equal the hand-computed gravitational moment
// of each joint's distal subtree, tau_j = g * sum_i m_i (x_ci - x_joint).
// ---------------------------------------------------------------------------
{
  const q = new Float64Array(nq);
  groundHand(model, q);
  q[3] = 80 * D2R; q[4] = 25 * D2R; q[5] = 50 * D2R; q[6] = -30 * D2R;
  q[7] = -10 * D2R; q[8] = -5 * D2R;
  const st = staticAnalysis(model, q, ws);
  fk(model, q, null, ws);
  // subtree bodies for each actuated joint (joint i connects body i to parent)
  const subtrees = { 3: [1, 2, 3, 4, 5, 6], 4: [2, 3, 4, 5, 6], 5: [3, 4], 6: [4], 7: [5, 6], 8: [6] };
  let worst = 0;
  for (const [jStr, bodies] of Object.entries(subtrees)) {
    const j = +jStr;
    const jointBody = j - 2;   // body whose origin is this joint
    let m = 0;
    for (const b of bodies) m += model.mass[b] * (ws.px[b] + ws.rcx[b] - ws.px[jointBody]);
    const tauHand = model.gravity * m;
    worst = Math.max(worst, Math.abs(tauHand - st.tau[j]));
  }
  gate('A: static torques equal distal-subtree gravity moments', worst < 1e-9,
    `max err=${worst.toExponential(2)} Nm`);
}

// ---------------------------------------------------------------------------
// Gate B: the stacked handstand is supported (CoP inside the patch) with
// small joint torques; per-joint magnitudes are inside the Kerwin &
// Trewartha balance band (< ~1 Nm/kg).
// ---------------------------------------------------------------------------
{
  const q = handstandPose(model);
  groundHand(model, q);
  const st = staticAnalysis(model, q, ws);
  let maxNmPerKg = 0;
  for (let j = 3; j < 9; j++) maxNmPerKg = Math.max(maxNmPerKg, Math.abs(st.tau[j]) / model.massKg);
  gate('B: stacked pose supported with balance-band torques',
    st.supported && maxNmPerKg < 1.0 && Math.abs(st.weight - 70 * model.gravity) < 1e-9,
    `patchFrac=${st.patchFrac.toFixed(3)}, max |tau|=${maxNmPerKg.toFixed(3)} Nm/kg`);
}

// ---------------------------------------------------------------------------
// Gate C: hamstring coupling. Straight knees cap hip flexion at the
// straight-knee limit; bending the knee buys exactly the coupled allowance;
// clampPose enforces it (knees clamp before hips).
// ---------------------------------------------------------------------------
{
  const rom = { ...ROM_DEFAULTS };
  const straight = hipFlexMaxDeg(rom, 0);
  const bent = hipFlexMaxDeg(rom, 60);
  const expectBent = Math.min(rom.hipFlexAbsMaxDeg,
    rom.hipFlexStraightKneeMaxDeg + 0.6 * 60);
  const q = new Float64Array(nq);
  groundHand(model, q);
  q[5] = 130 * D2R; q[6] = 0;          // deep pike, straight knee: must clamp
  q[7] = 130 * D2R; q[8] = -60 * D2R;  // same pike, bent knee: clamps higher
  const mask = clampPose(q, rom);
  const okL = Math.abs(q[5] / D2R - straight) < 1e-9 && (mask & (1 << 5));
  const okR = Math.abs(q[7] / D2R - expectBent) < 1e-9;
  gate('C: hamstring coupling caps hip flexion by knee angle',
    straight === rom.hipFlexStraightKneeMaxDeg && bent === expectBent && okL && okR,
    `straight=${straight}deg, knee60=${bent}deg, clampedL=${(q[5] / D2R).toFixed(1)}, clampedR=${(q[7] / D2R).toFixed(1)}`);
}

// ---------------------------------------------------------------------------
// Gate D: romPenalty is zero inside limits, positive and smooth outside.
// ---------------------------------------------------------------------------
{
  const rom = { ...ROM_DEFAULTS };
  const q = new Float64Array(nq);
  groundHand(model, q);
  q[3] = 80 * D2R; clampPose(q, rom);
  const inside = romPenalty(q, rom);
  q[3] = (wristQ3LimitsDeg(rom).hi + 10) * D2R;
  const out10 = romPenalty(q, rom);
  q[3] = (wristQ3LimitsDeg(rom).hi + 20) * D2R;
  const out20 = romPenalty(q, rom);
  gate('D: ROM penalty zero inside, quadratic outside',
    inside === 0 && out10 > 0 && Math.abs(out20 / out10 - 4) < 1e-6,
    `p(+10)=${out10.toExponential(2)}, ratio=${(out20 / out10).toFixed(3)}`);
}

// ---------------------------------------------------------------------------
// Gate E: solveWristForCom balances arbitrary poses: the returned wrist angle
// puts the CoM on the target to tight tolerance, and moves the right way
// (smaller wrist angle pushes the CoM toward the fingertips).
// ---------------------------------------------------------------------------
{
  let worst = 0, monotoneOk = true;
  for (let trial = 0; trial < 20; trial++) {
    const q = new Float64Array(nq);
    groundHand(model, q);
    q[4] = 40 * rnd() * D2R;
    q[5] = (30 + 60 * rnd()) * D2R; q[7] = (30 + 60 * rnd()) * D2R;
    q[6] = -(20 + 40 * rnd()) * D2R; q[8] = -(20 + 40 * rnd()) * D2R;
    const target = 0.03 + 0.05 * rnd();
    const w = solveWristForCom(model, q, ws, target);
    if (Number.isNaN(w)) continue;
    q[3] = w;
    const mo = momenta(model, q, new Float64Array(nq), ws);
    worst = Math.max(worst, Math.abs(mo.comX - q[0] - target));
    q[3] = w - 5 * D2R;
    const mo2 = momenta(model, q, new Float64Array(nq), ws);
    if (mo2.comX <= mo.comX) monotoneOk = false;
  }
  gate('E: wrist solve hits CoM target; smaller wrist angle -> CoM toward fingertips',
    worst < 1e-9 && monotoneOk, `max |com err|=${worst.toExponential(2)} m`);
}

// ---------------------------------------------------------------------------
// Gate F: press corridor structure. With generous flexibility the stacked
// region is feasible; slashing the shoulder ROM to 150deg removes the
// open-shoulder (low closing angle) cells that were feasible before, and
// cannot create feasibility anywhere new.
// ---------------------------------------------------------------------------
{
  const prof = strengthProfile(model.massKg);
  const flexible = pressCorridor(model, { ...ROM_DEFAULTS, hipFlexStraightKneeMaxDeg: 130 }, prof, ws, { nHip: 18, nShoulder: 18 });
  const tight = pressCorridor(model, { ...ROM_DEFAULTS, hipFlexStraightKneeMaxDeg: 130, shoulderFlexMaxDeg: 150 }, prof, ws, { nHip: 18, nShoulder: 18 });
  let nFlex = 0, nTight = 0, created = 0, removedOpen = 0;
  for (let idx = 0; idx < flexible.feasible.length; idx++) {
    nFlex += flexible.feasible[idx];
    nTight += tight.feasible[idx];
    if (tight.feasible[idx] && !flexible.feasible[idx]) created++;
    const j = idx % tight.nShoulder;
    if (flexible.feasible[idx] && !tight.feasible[idx] && tight.shoulderDeg[j] < 30) removedOpen++;
  }
  gate('F: corridor shrinks (never grows) under a 150deg shoulder limit',
    nFlex > 20 && nTight < nFlex && created === 0 && removedOpen > 0,
    `feasible ${nFlex} -> ${nTight}, open-shoulder cells removed=${removedOpen}`);
}

// ---------------------------------------------------------------------------
// Gate G: the planche is out of reach, the handstand is not.
//
// This is an anatomy gate, and it exists because the optimizer found the gap.
// Holding a straight body leaned off the handstand line is the planche
// continuum, and its cost climbs steeply: about 1.2 Nm/kg at the shoulder by
// 20 degrees of lean and 1.9 by 30, against 0.19 to hold the handstand
// itself. While the default shoulder was rated 2.0 Nm/kg the model could
// support itself most of the way toward horizontal, so the cheapest way into
// a handstand stopped being a kick-up and became a planche press: a far
// harder skill, silently substituted. A recreational shoulder cannot hold
// that position, which is what keeps the entry honest.
// ---------------------------------------------------------------------------
{
  const model = buildModel({ heightM: 1.75, massKg: 70 });
  const ws = createWorkspace(model);
  const prof = strengthProfile(model.massKg);
  const q = handstandPose(model);
  groundHand(model, q);
  const zero = new Float64Array(model.nq), tau = new Float64Array(model.nq);
  // Shoulder torque to hold the straight body at a given lean off the line.
  const leanCost = (deg) => {
    const qq = Float64Array.from(q);
    qq[4] += deg * Math.PI / 180;
    rnea(model, qq, zero, zero, tau, null, { ws });
    return Math.abs(tau[4]);
  };
  const cap = prof.shoulder.voluntaryIso;
  const hold = leanCost(0), lean10 = leanCost(10), lean30 = leanCost(30);
  gate('G: handstand comfortable, 30 deg of planche lean beyond the shoulder',
    hold < 0.3 * cap && lean10 < cap && lean30 > cap,
    `cap ${cap.toFixed(0)} Nm; hold ${hold.toFixed(0)}, 10deg ${lean10.toFixed(0)}, 30deg ${lean30.toFixed(0)} Nm`);
}

// H: the wrist limit has to run the right way round. Wrist extension is
// 180 - q3, so tightening the extension cap must forbid the LEANED-OUT
// poses, the ones whose centre of mass sits toward the fingertips. This
// gate exists because the limits were previously stored as bounds on q3
// under names that said dorsiflexion, so the slider called "max" was
// capping how far the body could lean back onto the heel of the palm, and
// raising it only ever admitted poses stretched further over the fingers.
{
  const rom = { ...ROM_DEFAULTS };
  const tight = { ...ROM_DEFAULTS, wristExtMaxDeg: ROM_DEFAULTS.wristExtMaxDeg - 20 };
  const wide = wristQ3LimitsDeg(rom), narrow = wristQ3LimitsDeg(tight);
  // Tightening lifts the FLOOR on q3 (less lean over the fingers) and
  // leaves the ceiling (lean back onto the heel) alone.
  const floorRose = narrow.lo > wide.lo;
  const ceilingHeld = narrow.hi === wide.hi;
  // And the pose it forbids must be the one further over the fingertips.
  const comAtQ3 = (deg) => {
    const q = new Float64Array(model.nq);
    groundHand(model, q);
    q[3] = deg * Math.PI / 180;
    return staticAnalysis(model, q, ws, {}).patchFrac;
  };
  const forbidden = comAtQ3(wide.lo), stillAllowed = comAtQ3(narrow.lo);
  gate('H: tightening the wrist extension cap forbids the leaned-out poses',
    floorRose && ceilingHeld && forbidden > stillAllowed,
    `q3 floor ${wide.lo.toFixed(0)} -> ${narrow.lo.toFixed(0)}, ceiling ${wide.hi.toFixed(0)} -> ${narrow.hi.toFixed(0)}; `
    + `patchFrac at floor ${forbidden.toFixed(2)} -> ${stillAllowed.toFixed(2)}`);
}

console.log(failures ? `\n${failures} gate(s) FAILED` : '\nAll statics gates passed');
process.exit(failures ? 1 : 0);
