import { JOINT_ORDER, ALL_JOINTS } from './control.js';
// Static analysis and range-of-motion model for the handstand chain.
//
// Orientation conventions (derived once, used everywhere): world +x points
// toward the fingertips, +y up, angles CCW. In the handstand the belly faces
// -x and the back faces +x, so overbalance (falling toward the fingertips)
// is falling toward the back side; the fingertips are what save it.
//
// Joint angle anatomy. Every joint is relative to its parent, and the stacked
// handstand is every one of them at zero except the wrist at 90 degrees --
// which is the invariant the whole file leans on. Names, not indices: the
// numbers have moved twice, once when the trunk gained a hinge and once when
// the arm gained an elbow and the legs gained feet.
//   wrist    dorsiflexion angle between the flat hand and the arm.
//            90deg = arm vertical. Below 90 leans the arm toward the
//            fingertips (planche lean), which is what a dorsiflexion
//            limit below 90deg forces.
//   elbow    flexion NEGATIVE, like the knee: the arm is pronated in a
//            handstand so it does not fold on the body's front, it folds
//            toward the fingertips. Zero is the straight arm it stands on.
//   shoulder closing angle; anatomical flexion = 180deg - q.
//            Positive tips the torso's hip end toward the belly (-x), the
//            compensation for which is arching (hip extension): the banana.
//   hip      flexion positive (pike folds the legs to the belly side),
//            extension (arch) negative.
//   knee     flexion NEGATIVE (the calf folds onto the hamstring on the back
//            side); anatomical knee flexion = -q.
//   ankle    dorsiflexion positive, measured from the foot in line with the
//            shin. Zero is the pointed toe; 90 is the foot square to the
//            shin, which is where everyone else's ankle numbers start.
//   toe      the ball of the foot, positive lifting the toes toward the shin.
//            PASSIVE: no muscle drives it and no search moves it. Zero is the
//            toes in line with the rest of the foot.
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
  // The low end of wrist extension is NOT what stops you leaning back: with
  // the hand flat, less than 90 degrees of extension just tips the forearm
  // back past vertical toward the heel of the palm, and what ends that is
  // the centre of pressure running off the hand, which the balance solve
  // already models. Carried over from the old q3 pair, this sat at 92 -- two
  // degrees PAST vertical -- and so drew a flexibility wall through the
  // straight-handstand corner of the press corridor, where a slightly arched
  // hip needs 88.7 degrees and the wall stood at 88. It is kept only so
  // every joint has two-sided limits, and set far outside anything a
  // handstand reaches.
  wristExtMinDeg: 70,    // q3 <= 180 - this
  shoulderFlexMaxDeg: 180,   // q4 >= 180 - this
  shoulderHyperDeg: 5,       // q4 >= -this is never allowed below
  shoulderCloseMaxDeg: 110,  // q4 <= this
  // The elbow, flexion NEGATIVE -- the same sense as the knee, and for the
  // same reason. A handstand is held with the elbow pits facing the
  // fingertips, which is the standard cue and the position the arm locks out
  // in, so the joint closes on the +x side: flexing it swings the shoulder
  // toward the fingertips, which is -1 in a CCW convention.
  //
  // This was written positive at first, by analogy with the hip and the spine
  // -- but those fold on the body's front and the arm does not, because the
  // arm is pronated in a handstand and its anterior is no longer the trunk's.
  // Signed that way the arm folded away from the fingers, which is an elbow
  // bending backwards.
  //
  // 145 is an ordinary elbow's flexion; the few degrees the other way are the
  // carrying angle a straight arm actually has, and they matter here because
  // a handstand is held on locked elbows resting ON that stop rather than
  // holding themselves at exactly zero.
  elbowFlexMaxDeg: 145,
  elbowHyperDeg: 5,
  // The ankle, measured from the foot IN LINE with the shin -- the pointed
  // toe, and the zero of the stacked handstand. Positive is dorsiflexion,
  // toes toward the shin, which is again the front-of-the-body direction.
  //
  // So 90 degrees is the foot square to the shin, the anatomical neutral
  // everyone else's ankle numbers are quoted from, and the 110 here is that
  // plus an ordinary 20 degrees of dorsiflexion. The other end is the one
  // worth reading twice: a real ankle plantarflexes about 50 degrees past
  // square, which leaves the FOOT some 40 degrees short of the shin line --
  // but this segment runs from the ankle to the tip of the pointed TOE, and
  // the toes make up that difference. A pointed foot is this model's zero,
  // which is what a pointed foot looks like, and 3 degrees past it is the
  // same courtesy the knee gets.
  anklePointMaxDeg: 3,
  ankleDorsiMaxDeg: 110,
  // The ball of the foot -- the metatarsophalangeal joint -- measured from the
  // toes in line with the rest of the foot, which is the handstand's zero and
  // the geometry the foot had before it could bend. Positive lifts the toes
  // toward the shin, which is the direction they go when you roll over the ball
  // and the one that matters; the other way they curl only a little.
  //
  // Nothing drives this joint. It has a stiffness and it does what the ground
  // tells it, so these two numbers are where it stops rather than where it is
  // asked to go.
  toeLiftMaxDeg: 70,
  toePointMaxDeg: 35,
  hipFlexStraightKneeMaxDeg: 85,
  hamstringCouplingPerDeg: 0.6,
  hipFlexAbsMaxDeg: 140,
  hipExtMaxDeg: 20,
  kneeFlexMaxDeg: 145,
  kneeHyperextDeg: 3,
  // The trunk, positive being flexion -- ribs toward hips, the hollow shape a
  // handstand is made of. Deliberately tighter than anatomy: a lumbar spine
  // flexes about 60 degrees and extends about 25, but a handstand never
  // spends that, and a box bigger than the movement only gives the search
  // room to find shapes that are not handstands.
  spineFlexMaxDeg: 45,
  spineExtMaxDeg: 20,
  // The head. Extension is looking toward the hands, which is what a
  // handstand actually does; flexion is chin to chest.
  //
  // Same rule as the trunk above, and for the same reason: a neck flexes
  // about 45 degrees and extends about 60, and a handstand spends almost
  // none of it. Every start pose in this notebook has the head in line with
  // the trunk and so does the balanced handstand, so the whole travel the
  // skill asks for is a look toward the floor and back.
  //
  // Leaving the box that big was not free, though, because the head is a mass
  // on a lever like anything else: snapping it back and forth is a real
  // momentum kick, and it is the CHEAPEST one on the body. The smoothness term
  // charges the swing of a limb and the flick of a head by the same rule,
  // while the head weighs almost nothing -- so a wag was momentum at a
  // discount. The search found that. The recorded kick-up reference wags the
  // neck +14, -11, -9, -14, +14 degrees on its way up, which is 60 degrees of
  // back-and-forth to travel 14; replayed with that flattened to zero it
  // reaches the same height to the millimetre, holds its whole tempo band and
  // scores 9.22 against 9.46. It bought nothing. It was there because there
  // was room for it, and this is that room.
  neckFlexMaxDeg: 12,
  neckExtMaxDeg: 15,
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
// By NAME, not by index: the indices moved when the trunk gained a hinge, and
// a switch on bare numbers is the kind of thing that renumbers wrongly once
// and then stays wrong quietly.
export const QI = Object.fromEntries(JOINT_ORDER.map((n, j) => [n, 3 + j]));

export function jointLimits(rom, q, jointIndex) {
  // ALL_JOINTS, not JOINT_ORDER: the passive toes have a range of motion like
  // any other joint -- they are held by the same ligaments -- even though
  // nothing drives them and nothing searches them.
  switch (ALL_JOINTS[jointIndex - 3]) {
    case 'wrist': { const w = wristQ3LimitsDeg(rom); return { lo: w.lo * D2R, hi: w.hi * D2R }; }
    case 'shoulder': return {
      lo: Math.max((180 - rom.shoulderFlexMaxDeg), -rom.shoulderHyperDeg) * D2R,
      hi: rom.shoulderCloseMaxDeg * D2R,
    };
    case 'spine': return {
      lo: -(rom.spineExtMaxDeg ?? ROM_DEFAULTS.spineExtMaxDeg) * D2R,
      hi: (rom.spineFlexMaxDeg ?? ROM_DEFAULTS.spineFlexMaxDeg) * D2R,
    };
    case 'neck': return {
      lo: -(rom.neckExtMaxDeg ?? ROM_DEFAULTS.neckExtMaxDeg) * D2R,
      hi: (rom.neckFlexMaxDeg ?? ROM_DEFAULTS.neckFlexMaxDeg) * D2R,
    };
    case 'hipL': case 'hipR': {
      // The hamstring coupling reads THIS leg's knee.
      const knee = jointIndex === QI.hipL ? QI.kneeL : QI.kneeR;
      const kneeFlexDeg = Math.max(0, -q[knee] / D2R);
      return { lo: -rom.hipExtMaxDeg * D2R, hi: hipFlexMaxDeg(rom, kneeFlexDeg) * D2R };
    }
    case 'kneeL': case 'kneeR':
      return { lo: -rom.kneeFlexMaxDeg * D2R, hi: rom.kneeHyperextDeg * D2R };
    case 'elbow': return {
      lo: -(rom.elbowFlexMaxDeg ?? ROM_DEFAULTS.elbowFlexMaxDeg) * D2R,
      hi: (rom.elbowHyperDeg ?? ROM_DEFAULTS.elbowHyperDeg) * D2R,
    };
    case 'ankleL': case 'ankleR': return {
      lo: -(rom.anklePointMaxDeg ?? ROM_DEFAULTS.anklePointMaxDeg) * D2R,
      hi: (rom.ankleDorsiMaxDeg ?? ROM_DEFAULTS.ankleDorsiMaxDeg) * D2R,
    };
    case 'toeL': case 'toeR': return {
      lo: -(rom.toePointMaxDeg ?? ROM_DEFAULTS.toePointMaxDeg) * D2R,
      hi: (rom.toeLiftMaxDeg ?? ROM_DEFAULTS.toeLiftMaxDeg) * D2R,
    };
    default: return { lo: -Infinity, hi: Infinity };
  }
}

// Clamp a pose to the ROM in place; returns a bitmask of clamped joints.
// Knees clamp before hips so the hamstring coupling sees final knee angles.
// Everything else is independent, so it is every remaining joint in order --
// derived from the joint list rather than written out, because the list this
// was written out as went stale twice, and a joint missing from it is a joint
// with no range of motion at all.
const CLAMP_ORDER = [QI.kneeL, QI.kneeR,
  ...JOINT_ORDER.map((n, j) => 3 + j).filter((j) => j !== QI.kneeL && j !== QI.kneeR)];
export function clampPose(q, rom) {
  let clamped = 0;
  for (const j of CLAMP_ORDER) {
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
  for (let j = 3; j < 3 + JOINT_ORDER.length; j++) {
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
  const jointNames = JOINT_ORDER;
  for (let i = 0; i < nHip; i++) {
    for (let j = 0; j < nShoulder; j++) {
      q.fill(0);
      groundHand(model, q);
      q[3 + JOINT_ORDER.indexOf('shoulder')] = shoulder[j] * D2R;
      q[3 + JOINT_ORDER.indexOf('hipL')] = q[3 + JOINT_ORDER.indexOf('hipR')] = hip[i] * D2R;
      const w = solveWristForCom(model, q, ws, targetX);
      if (Number.isNaN(w)) continue;
      q[3] = w;
      const idx = i * nShoulder + j;
      wristNeededDeg[idx] = w / D2R;
      staticAnalysis(model, q, ws, st);
      let util = 0;
      for (let k = 0; k < jointNames.length; k++) {
        const jp = strengthProf[jointNames[k]];
        const t = st.tau[3 + k];
        util = Math.max(util, Math.abs(t) / availableTorque(jp, t, 0));
      }
      utilization[idx] = util;
      let romOk = true;
      // Every joint the body has. Written as [3..8] this stopped checking two
      // joints the moment the trunk gained a hinge, so a pose could be
      // reported feasible with its neck or right knee outside its anatomy.
      for (let jj = 3; jj < model.nq; jj++) {
        const { lo, hi } = jointLimits(rom, q, jj);
        if (q[jj] < lo - 1e-9 || q[jj] > hi + 1e-9) { romOk = false; break; }
      }
      feasible[idx] = romOk && util <= 1 ? 1 : 0;
    }
  }
  return { hipDeg: hip, shoulderDeg: shoulder, wristNeededDeg, utilization, feasible, nHip, nShoulder };
}
