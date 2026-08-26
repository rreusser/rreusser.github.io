// Passive anatomical end-stops: the ligaments, capsules and packed tissue
// that physically arrest a joint at the end of its range.
//
// Until these existed the range of motion was only a cost term, and a soft
// one: a knee driven forty degrees past hyperextension for a tenth of a
// second cost the optimizer a few hundredths of a cost unit, so it bought
// the injury and spent the savings elsewhere. Bounding the reference knots
// (rollout.js decisionBounds) is not enough, because it is momentum, not the
// reference, that carries a swinging limb past its limit. A joint stops
// because tissue stops it, so the model now says so.
//
// Same construction as the ground contacts, one dimension down: stiffness is
// derived from a penetration target rather than hand-tuned (a joint pushed by
// its own maximum voluntary torque should sink about stopDeg past the limit),
// damping sits near critical for the inertia that joint actually drives, and
// the torque is one-sided and non-adhesive, so a stop can only push back into
// the range and never pull.
//
// These are elastic stops, not walls. Tissue does yield, and a limb thrown
// hard enough will travel some way past its limit and be pushed back, which
// is the honest behavior: the model shows the joint being loaded rather than
// silently clipping the pose. What it can no longer do is spend the whole
// movement outside its anatomy for free.

import { crbaMassMatrix } from './dynamics.js';
import { jointLimits, ROM_DEFAULTS } from './statics.js';
import { availableTorque } from './strength.js';
import { JOINT_ORDER, PASSIVE_JOINTS } from './control.js';

const D2R = Math.PI / 180;
// Derived from the joint list rather than written down beside it. Written
// down, this was a list of six in the OLD order, so when the trunk gained a
// hinge every stop from the spine outward was sized by the wrong joint's
// strength -- and the last two joints on the body, the right knee and the
// neck, got no end-stop at all. A neck with no stop is a head on a string.
const NJ = JOINT_ORDER.length;
const NP = PASSIVE_JOINTS.length;

// stopDeg: penetration at full voluntary torque (0 disables stops entirely).
// zeta: damping ratio of the stop against the joint's nominal inertia.
// The inertia is sampled once, at the pose given (or the model's neutral
// pose), because a stop is stiff enough that the factor-of-two the pose can
// move it does not change how it behaves.
export function createJointStops(model, rom, strengthProf, ws, {
  stopDeg = 5, zeta = 0.7, qNominal = null,
} = {}) {
  const nq = model.nq;
  const M = new Float64Array(nq * nq);
  crbaMassMatrix(model, qNominal || new Float64Array(nq), M, ws);
  const k = new Float64Array(NJ), b = new Float64Array(NJ);
  // stopDeg of 0 turns the DRIVEN joints' end-stops off, which some gates ask
  // for to isolate what the stops do. It cannot turn the passive rest spring
  // off: a joint with no muscle and no spring is not a modelling choice, it is
  // a floppy segment, and the toe would flail on the end of the foot.
  const on = stopDeg > 0;
  for (let j = 0; on && j < NJ; j++) {
    const jq = 3 + j;
    const cap = availableTorque(strengthProf[JOINT_ORDER[j]], 0, 0);
    k[j] = cap / (stopDeg * D2R);
    b[j] = 2 * zeta * Math.sqrt(k[j] * Math.max(M[jq * nq + jq], 1e-4));
  }
  return { rom, k, b, stopDeg, zeta, torque: new Float64Array(NJ) };
}

// Adds end-stop torques to the actuated rows of tau, and the rest spring plus
// end-stops to the passive ones. Returns the stop torques for instrumentation
// (nonzero only where the joint is outside its range).
export function applyJointStops(stops, q, qd, tau) {
  const { rom, k, b, torque } = stops;
  for (let j = 0; j < NJ; j++) {
    const jq = 3 + j;
    const { lo, hi } = jointLimits(rom, q, jq);
    let t = 0;
    if (q[jq] > hi) {
      // Non-adhesive: the stop may push back into range, never pull further out.
      t = Math.min(0, -(k[j] * (q[jq] - hi) + b[j] * qd[jq]));
    } else if (q[jq] < lo) {
      t = Math.max(0, k[j] * (lo - q[jq]) - b[j] * qd[jq]);
    }
    torque[j] = t;
    tau[jq] += t;
  }
  return torque;
}


// ---------------------------------------------------------------------------
// The passive joints: the ball of the foot.
//
// Nothing drives it, so unlike every joint above it needs more than a stop at
// each end -- it needs a REST, or it is not a joint, it is a floppy segment on
// the end of the foot.
//
// This belongs to the BODY, not to whoever assembled the rollout. It was built
// alongside the end-stops at first, which meant every caller that drives
// simulate() directly -- the catch-window sweep, half the contact gates, the
// integrator-order gates -- got a toe with no spring at all and blew up. A
// model with a passive joint has that joint's stiffness in the same sense that
// it has that joint's mass, so simulate() builds this itself and every caller
// gets it whether it knows about it or not.
// ---------------------------------------------------------------------------
export function createPassiveJoints(model, ws, {
  rom = ROM_DEFAULTS, qNominal = null,
  // How far the ball of the foot gives under body weight, and how it settles.
  toeSinkDeg = 20, toeZeta = 0.9,
} = {}) {
  if (!NP || model.nq < 3 + NJ + NP) return null;
  const nq = model.nq;
  const M = new Float64Array(nq * nq);
  crbaMassMatrix(model, qNominal || new Float64Array(nq), M, ws);
  const k = new Float64Array(NP);
  // The damping goes out as a jointDamping row, NOT as a torque, and that is
  // not a stylistic choice. A toe is light -- a sixth of a foot, about
  // 6e-5 kg m^2 -- and damping near critical against a spring sized for body
  // weight is b ~ 0.16, which explicit integration survives only below
  // dt = 2I/b = 0.7 ms. The notebook integrates at 0.5 ms and scores a
  // robustness variant at 0.8, so half the evaluations went unstable and came
  // back NaN. The integrator already treats jointDamping implicitly, which is
  // the same trick the servo uses on the same problem.
  const damping = new Float64Array(nq);
  const W = model.massKg * model.gravity;
  // The lever the load actually acts on: body weight on the ball, the toe
  // holding it up. Sized from that rather than by taste, the way the stops
  // above are sized from voluntary torque.
  const lever = model.footGeom?.Ltoe ?? 0.07;
  for (let i = 0; i < NP; i++) {
    const jq = 3 + NJ + i;
    k[i] = (W * lever) / Math.max(toeSinkDeg * D2R, 1e-6);
    damping[jq] = 2 * toeZeta * Math.sqrt(k[i] * Math.max(M[jq * nq + jq], 1e-6));
  }
  return { rom, k, damping, torque: new Float64Array(NP) };
}

// The rest spring and the end-stops. The damping is not here: it rides in the
// `damping` row above, which the integrator folds into the mass matrix.
export function applyPassiveJoints(passive, q, tau) {
  const { rom, k, torque } = passive;
  for (let i = 0; i < NP; i++) {
    const jq = 3 + NJ + i;
    let t = -k[i] * q[jq];
    const { lo, hi } = jointLimits(rom, q, jq);
    // Past the end of the range the ligament takes over. Ten times the rest
    // spring is a joint that gives, and then stops giving.
    if (q[jq] > hi) t += Math.min(0, -10 * k[i] * (q[jq] - hi));
    else if (q[jq] < lo) t += Math.max(0, 10 * k[i] * (lo - q[jq]));
    torque[i] = t;
    tau[jq] += t;
  }
  return torque;
}
