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
import { jointLimits } from './statics.js';
import { availableTorque } from './strength.js';

const D2R = Math.PI / 180;
const JOINT_KINDS = ['wrist', 'shoulder', 'hipL', 'kneeL', 'hipR', 'kneeR'];

// stopDeg: penetration at full voluntary torque (0 disables stops entirely).
// zeta: damping ratio of the stop against the joint's nominal inertia.
// The inertia is sampled once, at the pose given (or the model's neutral
// pose), because a stop is stiff enough that the factor-of-two the pose can
// move it does not change how it behaves.
export function createJointStops(model, rom, strengthProf, ws, {
  stopDeg = 5, zeta = 0.7, qNominal = null,
} = {}) {
  if (!(stopDeg > 0)) return null;
  const nq = model.nq;
  const M = new Float64Array(nq * nq);
  crbaMassMatrix(model, qNominal || new Float64Array(nq), M, ws);
  const k = new Float64Array(6), b = new Float64Array(6);
  for (let j = 0; j < 6; j++) {
    const jq = 3 + j;
    const cap = availableTorque(strengthProf[JOINT_KINDS[j]], 0, 0);
    k[j] = cap / (stopDeg * D2R);
    b[j] = 2 * zeta * Math.sqrt(k[j] * Math.max(M[jq * nq + jq], 1e-4));
  }
  return { rom, k, b, stopDeg, zeta, torque: new Float64Array(6) };
}

// Adds end-stop torques to the actuated rows of tau. Returns the stop torques
// for instrumentation (nonzero only where the joint is outside its range).
export function applyJointStops(stops, q, qd, tau) {
  const { rom, k, b, torque } = stops;
  for (let j = 0; j < 6; j++) {
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
