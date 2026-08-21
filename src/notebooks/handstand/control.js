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
// damping force. The physically applied torque before that bookkeeping is
// published in servo.applied and recorded by simulate() as rec.tauApplied.

import { clampTorque, availableTorque } from './strength.js';
import { rnea, momenta, crbaMassMatrix } from './dynamics.js';

export const JOINT_ORDER = ['wrist', 'shoulder', 'hipL', 'kneeL', 'hipR', 'kneeR'];

// Value and rate of a clamped Catmull-Rom spline at time t in [0, T].
//
// times, when given, are the K instants the knots fall on, in seconds, and
// they need not be evenly spaced: two key poses a tenth of a second apart is
// a snap, and a spline that can only phrase evenly cannot say one. Omitting
// them is the even spacing, on the fast path, which is what every rollout
// took before timing was something you could author.
//
// The uneven case is the standard non-uniform generalization: tangents are
// the two-sided difference over the two-sided time span rather than over two
// even steps. Where the ends run out of neighbours the spacing is mirrored
// rather than the time clamped -- clamping would halve the end tangents and
// make an evenly spaced non-uniform call disagree with the uniform one,
// which is exactly the kind of quiet fork this notebook has paid for before.
export function splineEval(knots, T, t, times = null) {
  const K = knots.length;
  if (K === 1) return { value: knots[0], rate: 0 };
  let i, u, h, m1, m2;
  const p = (n) => knots[Math.min(K - 1, Math.max(0, n))];
  if (!times) {
    const s = Math.min(Math.max(t / T, 0), 1) * (K - 1);
    i = Math.min(Math.floor(s), K - 2);
    u = s - i;
    h = T / (K - 1);
    m1 = (p(i + 1) - p(i - 1)) / 2;
    m2 = (p(i + 2) - p(i)) / 2;
  } else {
    const tc = Math.min(Math.max(t, times[0]), times[K - 1]);
    i = K - 2;
    for (let n = 0; n < K - 1; n++) if (tc < times[n + 1]) { i = n; break; }
    h = times[i + 1] - times[i];
    u = h > 0 ? (tc - times[i]) / h : 0;
    // Mirrored spacing off the ends, so an even set of times reproduces the
    // uniform branch exactly rather than approximately.
    const ts = (n) => (n < 0 ? 2 * times[0] - times[1]
      : n > K - 1 ? 2 * times[K - 1] - times[K - 2] : times[n]);
    // Tangents per unit time, then scaled into the segment's own parameter.
    m1 = h * (p(i + 1) - p(i - 1)) / (ts(i + 1) - ts(i - 1));
    m2 = h * (p(i + 2) - p(i)) / (ts(i + 2) - ts(i));
  }
  const p1 = p(i), p2 = p(i + 1);
  const u2 = u * u, u3 = u2 * u;
  const value = (2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * m1
    + (-2 * u3 + 3 * u2) * p2 + (u3 - u2) * m2;
  const dv = (6 * u2 - 6 * u) * p1 + (3 * u2 - 4 * u + 1) * m1
    + (-6 * u2 + 6 * u) * p2 + (3 * u2 - 2 * u) * m2;
  return { value, rate: h > 0 ? dv / h : 0 };
}

// Fill the six actuated reference angles/rates from knotMatrix[6][K].
export function evalReference(knotMatrix, T, t, qRef, qdRef, times = null) {
  for (let j = 0; j < 6; j++) {
    const r = splineEval(knotMatrix[j], T, t, times);
    qRef[j] = r.value;
    qdRef[j] = r.rate;
  }
}

// Whether a set of fractions says anything the even spacing does not. Even
// phrasing has to be NO phrasing, not merely phrasing that happens to be
// even: the two branches above are the same curve but not the same arithmetic,
// and over twenty thousand integration steps that is a technique differing
// from itself in the last few digits. One rule, applied where the rollout
// starts, so no caller can fork by passing what it means two ways.
export function evenlySpaced(fracs, tol = 1e-12) {
  const K = fracs.length;
  if (K < 2) return true;
  for (let k = 0; k < K; k++) if (Math.abs(fracs[k] - k / (K - 1)) > tol) return false;
  return true;
}

// The K instants the knots fall on, in seconds, from the fractions of the
// duration the technique carries. Absent fractions are the even spacing, so
// everything recorded before timing was authorable reads as what it was.
export function knotTimes(T, K, fracs = null) {
  const out = new Float64Array(K);
  for (let k = 0; k < K; k++) out[k] = (fracs ? fracs[k] : (K === 1 ? 0 : k / (K - 1))) * T;
  return out;
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
//
// Inertia-scaled damping (dampingRatio > 0) and brake-feasible velocity
// (brakeMargin > 0): the two fixes for arrival overshoot. A single scalar kd
// cannot serve this body. The joints it drives span an effective inertia
// from 0.36 kg m^2 (a knee) to 80 kg m^2 (the wrist, which turns the whole
// body about the palm), so kd = 60 leaves the knees overdamped at zeta = 1.8
// and the wrist at zeta = 0.12: a shoulder pressing to vertical arrives with
// several rad/s that nothing is left to absorb, and rings. With
// dampingRatio, kd_j = 2 zeta sqrt(kp M_jj) is refreshed from the mass
// matrix diagonal at inertiaHz, so every joint holds the same damping ratio
// as the configuration (and hence its inertia) changes.
//
// Damping alone is not enough, because the position term is what commands
// the approach: kp/kd * e is 10 rad/s at 45 degrees of error, and the
// shoulder needs 535 degrees of travel to brake from that. So the position
// term is capped at the velocity the joint can still stop in the error that
// remains, sqrt(2 alpha a_brake |e|) -- a proximate time-optimal servo
// (Workman 1987), which reduces to the plain PD law inside the region where
// braking is not binding. The braking authority is the RESERVE, not the cap:
// gravity is already spending part of the envelope holding the body up, so
// a_brake = (cap -/+ tau_gravity) / M_jj. That is what the "strong force for
// a long time, then suddenly nothing to push against" arrival actually needs
// to know.
//
// One limit is not negotiable: a damper the muscle cannot produce is not a
// damper, it is a joint pinned at its cap. Critical damping wants kd = 505
// at the wrist, which spends the whole 70 N m envelope at 0.14 rad/s and
// leaves the balance correction nothing to say; the body then rides the cap
// out over the fingertips exactly as an unassisted servo does. So kd is
// additionally capped at cap_j / dampingSpeed, the damping whose torque at
// dampingSpeed rad/s is the entire voluntary envelope. The wrist is the
// joint this binds hardest, which is the mechanical statement of why
// balancing on hands is harder than balancing on feet: relative to the load
// it carries, the joint is underpowered, and no choice of gain fixes that.
export function createServo(model, strengthProf, {
  kp = 3000, kd = 150, gravityComp = true, ws = null, activationTau = 0.05,
  dampingRatio = 0, brakeMargin = 0, inertiaHz = 200, dampingSpeed = 1.0,
} = {}) {
  const nq = model.nq;
  const damping = new Float64Array(nq);
  for (let j = 3; j < 9; j++) damping[j] = kd;
  const qRef = new Float64Array(6), qdRef = new Float64Array(6);
  const tauG = new Float64Array(nq);
  const zero = new Float64Array(nq);
  // Physically applied torque for the six actuated joints, before the
  // implicit-damping bookkeeping term is added to the command.
  const applied = new Float64Array(6);
  const adaptive = dampingRatio > 0 || brakeMargin > 0;
  const Mbuf = adaptive ? new Float64Array(nq * nq) : null;
  const inertia = new Float64Array(6).fill(1);
  return {
    damping, kp, kd, qRef, qdRef, activationTau, applied,
    dampingRatio, brakeMargin, inertia,
    makeControl(knotMatrix, T, augment = null, times = null) {
      const des = new Float64Array(6);
      const u = new Float64Array(6);
      let lastT = null, lastInertiaT = null;
      return (t, q, qd, tau) => {
        evalReference(knotMatrix, T, Math.min(t, T), qRef, qdRef, times);
        if (t >= T) qdRef.fill(0);
        if (gravityComp && ws) rnea(model, q, zero, zero, tauG, null, { ws });
        // The inertia the servo is tuned against changes with the pose, but
        // on the timescale of the body, not the timestep; refreshing it at
        // inertiaHz keeps the extra mass-matrix factorization off the hot
        // path. (A nervous system does not re-identify its limbs at 5 kHz
        // either.)
        if (adaptive && (lastInertiaT === null || t - lastInertiaT >= 1 / inertiaHz)) {
          crbaMassMatrix(model, q, Mbuf, ws);
          for (let j = 0; j < 6; j++) {
            const jq = 3 + j;
            inertia[j] = Math.max(Mbuf[jq * nq + jq], 1e-4);
            if (dampingRatio > 0) {
              const kdWant = 2 * dampingRatio * Math.sqrt(kp * inertia[j]);
              const kdMax = dampingSpeed > 0
                ? availableTorque(strengthProf[JOINT_ORDER[j]], 0, 0) / dampingSpeed
                : Infinity;
              damping[jq] = Math.min(kdWant, kdMax);
            }
          }
          lastInertiaT = t;
        }
        for (let j = 0; j < 6; j++) {
          const jq = 3 + j;
          const kdj = damping[jq];
          const gff = gravityComp && ws ? tauG[jq] : 0;
          const e = qRef[j] - q[jq];
          let corr = (kp / kdj) * e;
          if (brakeMargin > 0 && corr !== 0) {
            const sBrake = e >= 0 ? -1 : 1;
            const jp = strengthProf[JOINT_ORDER[j]];
            const capBrake = availableTorque(jp, sBrake, qd[jq]);
            const aBrake = Math.max(capBrake - sBrake * gff, 0.05 * capBrake) / inertia[j];
            const vMax = Math.sqrt(2 * brakeMargin * aBrake * Math.abs(e));
            if (Math.abs(corr) > vMax) corr = Math.sign(corr) * vMax;
          }
          des[j] = gff + kdj * (qdRef[j] + corr - qd[jq]);
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
          applied[j] = u[j] * capNow;
          tau[jq] = applied[j] + damping[jq] * qd[jq];
        }
      };
    },
  };
}

// Physically applied joint torques from a recording. Runs made after the
// servo published rec.tauApplied carry it exactly; the fallback reconstructs
// it from a constant-kd recording to within O(dt).
export function appliedTorques(rec, kd = 0) {
  if (rec.tauApplied) return rec.tauApplied.map((row) => Array.from(row));
  return rec.tau.map((tauRow, i) =>
    Array.from(tauRow, (t, j) => t - kd * rec.qd[i][3 + j]));
}

// Balance-augmented hold: joint servos hold qHold while the wrist channel
// additionally runs PD on the horizontal CoM position, the literal wrist
// strategy (Yeadon & Trewartha 2003). More wrist torque pushes the center of
// pressure toward the fingertips, so a CoM drifting toward the fingertips
// demands more torque: tau_wrist += kCom (comX - xTarget) + dCom comVx,
// all still clamped to the strength envelope.
export function createBalanceControl(model, ws, strengthProf, qHold, {
  kp = 800, kd = 60, kCom = 2000, dCom = 1500, targetFrac = 0.35,
  activationTau = 0.05, dampingRatio = 0, brakeMargin = 0, inertiaHz = 200,
  dampingSpeed = 1.0,
} = {}) {
  const servo = createServo(model, strengthProf, {
    kp, kd, ws, activationTau, dampingRatio, brakeMargin, inertiaHz, dampingSpeed,
  });
  const knots = [];
  for (let j = 0; j < 6; j++) knots.push(Float64Array.of(qHold[3 + j], qHold[3 + j]));
  const xTargetLocal = model.patch.x0 + targetFrac * (model.patch.x1 - model.patch.x0);
  const augment = (t, q, qd, des) => {
    const mo = momenta(model, q, qd, ws);
    des[0] += kCom * (mo.comX - (q[0] + xTargetLocal)) + dCom * mo.comVx;
  };
  return {
    damping: servo.damping,
    kd, servo,
    control: servo.makeControl(knots, 1, augment),
  };
}
