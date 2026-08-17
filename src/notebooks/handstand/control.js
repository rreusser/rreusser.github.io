// Reference trajectories and joint servos.
//
// References are uniform Catmull-Rom splines through K knots per actuated
// joint over [0, T]; the knot values are exactly the decision variables the
// trajectory optimizer searches over.
//
// The servo is PD with Yeadon-King torque caps. Damping is handled with the
// implicit-inertia trick pinned by test/contact.mjs gate D2: the commanded
// torque (kp e + kd de, clamped to the strength envelope) has +kd*qd added
// back, which pairs with the integrator's implicit -kd*qd_new term to leave
// a small artificial inertia dt*kd instead of an explicitly integrated
// damping force. The physically applied torque is the clamped command to
// within O(dt): reconstruct it from a recording as tau_rec - kd * qd_rec.

import { clampTorque, availableTorque } from './strength.js';
import { rnea, momenta } from './dynamics.js';

export const JOINT_ORDER = ['wrist', 'shoulder', 'hipL', 'kneeL', 'hipR', 'kneeR'];

// Value and rate of a clamped uniform Catmull-Rom spline at time t in [0, T].
export function splineEval(knots, T, t) {
  const K = knots.length;
  if (K === 1) return { value: knots[0], rate: 0 };
  const s = Math.min(Math.max(t / T, 0), 1) * (K - 1);
  const i = Math.min(Math.floor(s), K - 2);
  const u = s - i;
  const p1 = knots[i], p2 = knots[i + 1];
  const p0 = knots[Math.max(0, i - 1)], p3 = knots[Math.min(K - 1, i + 2)];
  const m1 = (p2 - p0) / 2, m2 = (p3 - p1) / 2;
  const u2 = u * u, u3 = u2 * u;
  const value = (2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * m1
    + (-2 * u3 + 3 * u2) * p2 + (u3 - u2) * m2;
  const dv = (6 * u2 - 6 * u) * p1 + (3 * u2 - 4 * u + 1) * m1
    + (-6 * u2 + 6 * u) * p2 + (3 * u2 - 2 * u) * m2;
  return { value, rate: dv * (K - 1) / T };
}

// Fill the six actuated reference angles/rates from knotMatrix[6][K].
export function evalReference(knotMatrix, T, t, qRef, qdRef) {
  for (let j = 0; j < 6; j++) {
    const r = splineEval(knotMatrix[j], T, t);
    qRef[j] = r.value;
    qdRef[j] = r.rate;
  }
}

// Servo factory. makeControl(knotMatrix, T, augment) returns a
// control(t, q, qd, tau) for simulate(); pass servo.damping as simulate's
// jointDamping. After time T the reference holds its final knot with zero
// rate (the "settle" phase). augment(t, q, qd, des), if given, may add to
// the six desired torques before activation (the balance controller's wrist
// strategy hooks in here, so it obeys the same physiology).
//
// Two pieces of realism, both discovered the hard way:
//
// Gravity feedforward: the servo anticipates the static gravity torque at
// the current configuration. Without it, finite kp sags under load, the sag
// displaces the CoM, and the demand creeps until the wrist rides its
// strength cap and the body falls over the fingertips.
//
// Activation dynamics: muscle cannot step its force. The desired torque is
// converted to a normalized drive u = tau/cap in [-1, 1], u follows a
// first-order lag with time constant activationTau (~50 ms), and the
// applied torque is u times the instantaneous Yeadon-King cap at the
// current velocity. Without the lag the optimizer discovers bang-bang
// torque profiles that flip between opposing caps in milliseconds; with it,
// they are impossible by construction.
export function createServo(model, strengthProf, {
  kp = 3000, kd = 150, gravityComp = true, ws = null, activationTau = 0.05,
} = {}) {
  const damping = new Float64Array(model.nq);
  for (let j = 3; j < 9; j++) damping[j] = kd;
  const qRef = new Float64Array(6), qdRef = new Float64Array(6);
  const tauG = new Float64Array(model.nq);
  const zero = new Float64Array(model.nq);
  return {
    damping, kp, kd, qRef, qdRef, activationTau,
    makeControl(knotMatrix, T, augment = null) {
      const des = new Float64Array(6);
      const u = new Float64Array(6);
      let lastT = null;
      return (t, q, qd, tau) => {
        evalReference(knotMatrix, T, Math.min(t, T), qRef, qdRef);
        if (t >= T) qdRef.fill(0);
        if (gravityComp && ws) rnea(model, q, zero, zero, tauG, null, { ws });
        for (let j = 0; j < 6; j++) {
          const jq = 3 + j;
          des[j] = (gravityComp && ws ? tauG[jq] : 0)
            + kp * (qRef[j] - q[jq]) + kd * (qdRef[j] - qd[jq]);
        }
        augment?.(t, q, qd, des);
        const alpha = (lastT === null || activationTau <= 0)
          ? 1
          : 1 - Math.exp(-Math.max(0, t - lastT) / activationTau);
        lastT = t;
        for (let j = 0; j < 6; j++) {
          const jq = 3 + j;
          const jp = strengthProf[JOINT_ORDER[j]];
          const cap = availableTorque(jp, des[j], qd[jq]);
          const uDes = Math.min(1, Math.max(-1, des[j] / Math.max(cap, 1e-9)));
          u[j] += alpha * (uDes - u[j]);
          const capNow = availableTorque(jp, u[j], qd[jq]);
          tau[jq] = u[j] * capNow + kd * qd[jq];
        }
      };
    },
  };
}

// Physically applied joint torques from a recording made with this servo.
export function appliedTorques(rec, kd) {
  return rec.tau.map((tauRow, i) =>
    tauRow.map((t, j) => t - kd * rec.qd[i][3 + j]));
}

// Balance-augmented hold: joint servos hold qHold while the wrist channel
// additionally runs PD on the horizontal CoM position, the literal wrist
// strategy (Yeadon & Trewartha 2003). More wrist torque pushes the center of
// pressure toward the fingertips, so a CoM drifting toward the fingertips
// demands more torque: tau_wrist += kCom (comX - xTarget) + dCom comVx,
// all still clamped to the strength envelope.
export function createBalanceControl(model, ws, strengthProf, qHold, {
  kp = 800, kd = 60, kCom = 2000, dCom = 1500, targetFrac = 0.35,
  activationTau = 0.05,
} = {}) {
  const servo = createServo(model, strengthProf, { kp, kd, ws, activationTau });
  const knots = [];
  for (let j = 0; j < 6; j++) knots.push(Float64Array.of(qHold[3 + j], qHold[3 + j]));
  const xTargetLocal = model.patch.x0 + targetFrac * (model.patch.x1 - model.patch.x0);
  const augment = (t, q, qd, des) => {
    const mo = momenta(model, q, qd, ws);
    des[0] += kCom * (mo.comX - (q[0] + xTargetLocal)) + dCom * mo.comVx;
  };
  return {
    damping: servo.damping,
    kd,
    control: servo.makeControl(knots, 1, augment),
  };
}
