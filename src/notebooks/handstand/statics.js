// Static analysis and range-of-motion model for the handstand chain.
//
// Orientation conventions (derived once, used everywhere): world +x points
// toward the fingertips, +y up, angles CCW. In the handstand the belly faces
// -x and the back faces +x, so overbalance (falling toward the fingertips)
// is falling toward the back side; the fingertips are what save it.
//
// Joint angle anatomy (q indices 3..8 = wrist, shoulder, hipL, kneeL, hipR,
// kneeR, all relative, stacked handstand = [90deg, 0, 0, 0, 0, 0]):
//   wrist    q3: dorsiflexion angle between the flat hand and the arm.
//            90deg = arm vertical. q3 < 90 leans the arm toward the
//            fingertips (planche lean), which is what a dorsiflexion
//            limit below 90deg forces.
//   shoulder q4: closing angle; anatomical flexion = 180deg - q4.
//            q4 > 0 tips the torso's hip end toward the belly (-x), the
//            compensation for which is arching (hip extension): the banana.
//   hip      q5/q7: flexion positive (pike folds the legs to the belly
//            side), extension (arch) negative.
//   knee     q6/q8: flexion NEGATIVE (the calf folds onto the hamstring on
//            the back side); anatomical knee flexion = -q.
//
// The hamstring is a two-joint muscle: with straight knees hip flexion caps
// at hipFlexStraightKneeMaxDeg; each degree of knee flexion buys
// hamstringCouplingPerDeg more. This coupling, not any single joint range,
// is what "hamstring flexibility" means here.

import { rnea, momenta } from './dynamics.js';
import { availableTorque } from './strength.js';

const D2R = Math.PI / 180;

// Elementary rather than gymnastic: wrist dorsiflexion of 88 degrees is
// already past the normal range (70-80 is typical), and the few degrees the
// model used to have beyond that were spent leaning further out over the
// hands than an ordinary wrist allows.
export const ROM_DEFAULTS = {
  // Wrist extension, the anatomical quantity: the angle opened at the back
  // of the wrist, 90 degrees when the forearm stands vertical over a flat
  // hand. The joint coordinate q3 runs the other way -- it is measured from
  // the fingertip direction round to the arm -- so extension is 180 - q3,
  // and leaning out over the fingers RAISES extension while lowering q3.
  // These two were previously stored as bounds on q3 under names that said
  // dorsiflexion, which made the limits read backwards: the field called
  // "max" was capping how far the body could lean back toward the heel of
  // the palm. Same numbers, correct end.
  wristExtMaxDeg: 135,   // q3 >= 180 - this
  wristExtMinDeg: 92,    // q3 <= 180 - this
  shoulderFlexMaxDeg: 180,   // q4 >= 180 - this
  shoulderHyperDeg: 5,       // q4 >= -this is never allowed below
  shoulderCloseMaxDeg: 110,  // q4 <= this
  hipFlexStraightKneeMaxDeg: 85,
  hamstringCouplingPerDeg: 0.6,
  hipFlexAbsMaxDeg: 140,
  hipExtMaxDeg: 20,
  kneeFlexMaxDeg: 145,
  kneeHyperextDeg: 3,
};

// Wrist limits as bounds on the joint coordinate q3, in degrees. Accepts
// either the extension fields or the legacy pair that stored q3 bounds
// directly, so every recorded artifact and preset keeps the range it was
// produced under.
export function wristQ3LimitsDeg(rom) {
  if (rom.wristExtMaxDeg !== undefined || rom.wristExtMinDeg !== undefined) {
    return {
      lo: 180 - (rom.wristExtMaxDeg ?? 135),
      hi: 180 - (rom.wristExtMinDeg ?? 92),
    };
  }
  return { lo: rom.wristDorsiMinDeg ?? 45, hi: rom.wristDorsiMaxDeg ?? 88 };
}

// Maximum hip flexion (degrees) available at a given anatomical knee flexion.
export function hipFlexMaxDeg(rom, kneeFlexDeg) {
  return Math.min(
    rom.hipFlexAbsMaxDeg,
    rom.hipFlexStraightKneeMaxDeg + rom.hamstringCouplingPerDeg * Math.max(0, kneeFlexDeg));
}

// Signed limits for each actuated joint given the current pose (the hip
// limits depend on the same leg's knee). Returns {lo, hi} in radians.
export function jointLimits(rom, q, jointIndex) {
  switch (jointIndex) {
    case 3: { const w = wristQ3LimitsDeg(rom); return { lo: w.lo * D2R, hi: w.hi * D2R }; }
    case 4: return {
      lo: Math.max((180 - rom.shoulderFlexMaxDeg), -rom.shoulderHyperDeg) * D2R,
      hi: rom.shoulderCloseMaxDeg * D2R,
    };
    case 5: case 7: {
      const knee = jointIndex + 1;
      const kneeFlexDeg = Math.max(0, -q[knee] / D2R);
      return { lo: -rom.hipExtMaxDeg * D2R, hi: hipFlexMaxDeg(rom, kneeFlexDeg) * D2R };
    }
    case 6: case 8: return { lo: -rom.kneeFlexMaxDeg * D2R, hi: rom.kneeHyperextDeg * D2R };
    default: return { lo: -Infinity, hi: Infinity };
  }
}

// Clamp a pose to the ROM in place; returns a bitmask of clamped joints.
// Knees clamp before hips so the hamstring coupling sees final knee angles.
export function clampPose(q, rom) {
  let clamped = 0;
  for (const j of [6, 8, 3, 4, 5, 7]) {
    const { lo, hi } = jointLimits(rom, q, j);
    if (q[j] < lo) { q[j] = lo; clamped |= 1 << j; }
    else if (q[j] > hi) { q[j] = hi; clamped |= 1 << j; }
  }
  return clamped;
}

// Smooth hinge penalty of ROM violation (for the optimizer): sum of squared
// violations in radians, with the hamstring coupling included.
export function romPenalty(q, rom) {
  let p = 0;
  for (const j of [3, 4, 5, 6, 7, 8]) {
    const { lo, hi } = jointLimits(rom, q, j);
    if (q[j] < lo) p += (lo - q[j]) ** 2;
    else if (q[j] > hi) p += (q[j] - hi) ** 2;
  }
  return p;
}

// Place the hand flat on the floor: base pose with the wrist at its resting
// height. Mutates and returns q.
export function groundHand(model, q) {
  q[0] = 0; q[1] = model.wristHeight; q[2] = 0;
  return q;
}

const zeroQ = new Float64Array(16);

// Static analysis of a hand-supported pose at rest: joint torques (actuated
// rows of RNEA at zero velocity/acceleration), total CoM, and the CoP
// (equal to the CoM abscissa in statics) relative to the palm patch.
export function staticAnalysis(model, q, ws, out = {}) {
  const tau = out.tau || (out.tau = new Float64Array(model.nq));
  rnea(model, q, zeroQ, zeroQ, tau, null, { ws });
  const mo = momenta(model, q, zeroQ, ws);
  const heelX = q[0] + model.patch.x0, tipX = q[0] + model.patch.x1;
  out.comX = mo.comX; out.comY = mo.comY;
  out.copX = mo.comX;
  out.weight = mo.mass * model.gravity;
  // 0 at the palm heel, 1 at the fingertips; outside [0,1] means toppling.
  out.patchFrac = (mo.comX - heelX) / (tipX - heelX);
  out.supported = out.patchFrac >= 0 && out.patchFrac <= 1;
  return out;
}

// Solve for the wrist angle that places the CoM over a target abscissa
// (relative to the wrist), holding all other joints fixed. Bisection over a
// generous wrist range; returns NaN if the target is unreachable.
export function solveWristForCom(model, q, ws, targetX, { loDeg = 20, hiDeg = 160 } = {}) {
  const scratch = q.slice();
  groundHand(model, scratch);
  const comAt = (wrist) => {
    scratch[3] = wrist;
    const mo = momenta(model, scratch, zeroQ, ws);
    return mo.comX - scratch[0];
  };
  let lo = loDeg * D2R, hi = hiDeg * D2R;
  // CoM moves toward +x as the wrist angle decreases (arm tips toward the
  // fingertips), so comAt is decreasing in the wrist angle.
  let fLo = comAt(lo), fHi = comAt(hi);
  if ((fLo - targetX) * (fHi - targetX) > 0) return NaN;
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi);
    if ((comAt(mid) - targetX) * (fLo - targetX) > 0) { lo = mid; fLo = comAt(lo); }
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

// The press corridor: over a grid of (hip flexion, shoulder closing) angles
// with straight symmetric legs, find the wrist angle that balances the CoM
// over the patch center, and report feasibility against the ROM plus the
// static torque utilization against a strength profile.
export function pressCorridor(model, rom, strengthProf, ws, {
  nHip = 36, nShoulder = 36,
  hipLoDeg = -10, hipHiDeg = 130,
  shoulderLoDeg = -5, shoulderHiDeg = 80,
  targetFrac = 0.35,
} = {}) {
  const hip = [], shoulder = [];
  for (let i = 0; i < nHip; i++) hip.push(hipLoDeg + (hipHiDeg - hipLoDeg) * i / (nHip - 1));
  for (let j = 0; j < nShoulder; j++) shoulder.push(shoulderLoDeg + (shoulderHiDeg - shoulderLoDeg) * j / (nShoulder - 1));
  const wristNeededDeg = new Float64Array(nHip * nShoulder).fill(NaN);
  const utilization = new Float64Array(nHip * nShoulder).fill(NaN);
  const feasible = new Uint8Array(nHip * nShoulder);
  const q = new Float64Array(model.nq);
  const targetX = model.patch.x0 + targetFrac * (model.patch.x1 - model.patch.x0);
  const st = {};
  const jointNames = ['wrist', 'shoulder', 'hipL', 'kneeL', 'hipR', 'kneeR'];
  for (let i = 0; i < nHip; i++) {
    for (let j = 0; j < nShoulder; j++) {
      q.fill(0);
      groundHand(model, q);
      q[4] = shoulder[j] * D2R;
      q[5] = q[7] = hip[i] * D2R;
      const w = solveWristForCom(model, q, ws, targetX);
      if (Number.isNaN(w)) continue;
      q[3] = w;
      const idx = i * nShoulder + j;
      wristNeededDeg[idx] = w / D2R;
      staticAnalysis(model, q, ws, st);
      let util = 0;
      for (let k = 0; k < 6; k++) {
        const jp = strengthProf[jointNames[k]];
        const t = st.tau[3 + k];
        util = Math.max(util, Math.abs(t) / availableTorque(jp, t, 0));
      }
      utilization[idx] = util;
      let romOk = true;
      for (const jj of [3, 4, 5, 6, 7, 8]) {
        const { lo, hi } = jointLimits(rom, q, jj);
        if (q[jj] < lo - 1e-9 || q[jj] > hi + 1e-9) { romOk = false; break; }
      }
      feasible[idx] = romOk && util <= 1 ? 1 : 0;
    }
  }
  return { hipDeg: hip, shoulderDeg: shoulder, wristNeededDeg, utilization, feasible, nHip, nShoulder };
}
