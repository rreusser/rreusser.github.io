// Scenario construction and rollout for the dynamic phases. A scenario is an
// initial state (hands always planted; feet placed by solving toe-ground
// contact) plus a reference trajectory as spline knots for the six actuated
// joints. M2 uses hand-authored references for demonstration; the trajectory
// optimizer replaces the knots in M3.

import { fk, momenta } from './dynamics.js';
import {
  groundHand, solveWristForCom, romPenalty, clampPose, hipFlexMaxDeg, ROM_DEFAULTS,
} from './statics.js';
import { createContacts } from './contact.js';
import { createJointStops } from './joint-stops.js';
import { simulate } from './integrate.js';
import { createServo, createBalanceControl } from './control.js';
import { availableTorque } from './strength.js';
import { cmaes, mulberry32 } from './cma-es.js';

const D2R = Math.PI / 180;

// World y of a leg's toe contact point (body 4 or 6).
function toeY(model, ws, q, body) {
  fk(model, q, null, ws);
  const cpt = model.contacts.find((c) => c.body === body);
  const c = Math.cos(ws.th[body]), s = Math.sin(ws.th[body]);
  return ws.py[body] + s * cpt.x + c * cpt.y;
}

// Bisect one hip angle so that leg's toe lands on the floor. Hip flexion
// rotates the leg toward the belly side and downward from the inverted
// stack, so toe height decreases monotonically with hip flexion here.
function solveHipForToeDown(model, ws, q, side) {
  const hip = side === 'L' ? 5 : 7;
  const body = side === 'L' ? 4 : 6;
  let lo = 0 * D2R, hi = 175 * D2R;
  if (toeY(model, ws, withQ(q, hip, hi), body) > 0) return NaN;
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi);
    if (toeY(model, ws, withQ(q, hip, mid), body) > 0) lo = mid; else hi = mid;
  }
  q[hip] = 0.5 * (lo + hi);
  return q[hip];
}

function withQ(q, i, v) { q[i] = v; return q; }

const zeroQd9 = new Float64Array(16);

export const HANDSTAND_TARGET_FRAC = 0.35;

// The balanced handstand pose every scenario tries to reach.
export function balancedHandstand(model, ws) {
  const q = new Float64Array(model.nq);
  groundHand(model, q);
  q[3] = Math.PI / 2;
  const targetX = model.patch.x0 + HANDSTAND_TARGET_FRAC * (model.patch.x1 - model.patch.x0);
  q[3] = solveWristForCom(model, q, ws, targetX);
  return q;
}

// Solve the wrist angle (the whole-body lean about the planted hand) that
// puts a given leg's toe on the floor. Larger wrist angle rotates the body
// CCW and lowers the folded legs, so toe height decreases monotonically.
function solveWristForToeDown(model, ws, q, body, loDeg = 35, hiDeg = 115) {
  let lo = loDeg * D2R, hi = hiDeg * D2R;
  const at = (w) => { q[3] = w; return toeY(model, ws, q, body); };
  if (at(hi) > 0) return q[3];        // even fully rotated the toe floats
  if (at(lo) < 0) { q[3] = lo; return q[3]; }
  for (let i = 0; i < 50; i++) {
    const mid = 0.5 * (lo + hi);
    if (at(mid) > 0) lo = mid; else hi = mid;
  }
  q[3] = 0.5 * (lo + hi);
  return q[3];
}

// Final safety pass on a start pose: no foot contact point may start below
// the floor (penalty springs would fire a large spurious impulse at t = 0).
// A toe below minY is lifted by reducing that leg's hip flexion.
function clearFeet(model, ws, q, minY = 5e-4) {
  for (const side of ['L', 'R']) {
    const hip = side === 'L' ? 5 : 7;
    const body = side === 'L' ? 4 : 6;
    if (toeY(model, ws, q, body) >= minY) continue;
    let hi = q[hip], lo = q[hip] - 40 * D2R;
    if (toeY(model, ws, withQ(q, hip, lo), body) < minY) { q[hip] = lo; continue; }
    for (let i = 0; i < 40; i++) {
      const mid = 0.5 * (lo + hi);
      if (toeY(model, ws, withQ(q, hip, mid), body) < minY) hi = mid; else lo = mid;
    }
    q[hip] = lo;
  }
  return q;
}

// Scenario starts, constructed from the flexibility model rather than
// contortionist geometry: the fold is capped by the hamstring limit (with
// the knee coupling where knees bend) and the lean is then solved so the
// toes actually reach the floor. A stiffer person therefore starts with
// feet further from the hands and less weight over the palms, which is
// exactly how limited flexibility taxes an entry in reality.
export function scenarioStart(model, ws, name, rom = ROM_DEFAULTS) {
  const q = new Float64Array(model.nq);
  groundHand(model, q);
  switch (name) {
    case 'hold': {
      return { q0: balancedHandstand(model, ws), qd0: null };
    }
    case 'pike': {
      // Press-ready: the deepest fold the hamstrings allow, toes resting on
      // the floor, and the shoulder/wrist lean solved so the CoM already
      // sits over the palm target. This is where a straight-leg press
      // actually begins; getting here is a weight shift, not a press. If
      // the ROM cannot reach the target, the closest achievable lean is
      // used, which is the honest starting handicap of a stiff body.
      q[5] = q[7] = Math.min(hipFlexMaxDeg(rom, 0), 130) * D2R;
      q[6] = q[8] = 0;
      const targetX = model.patch.x0 + HANDSTAND_TARGET_FRAC * (model.patch.x1 - model.patch.x0);
      const comAt = (sh) => {
        q[4] = sh;
        solveWristForToeDown(model, ws, q, 4, 35, Math.min(115, rom.wristDorsiMaxDeg));
        return momenta(model, q, zeroQd9, ws).comX - q[0];
      };
      let lo = 55 * D2R, hi = Math.min(rom.shoulderCloseMaxDeg, 110) * D2R;
      if (comAt(lo) > targetX) comAt(lo);
      else if (comAt(hi) < targetX) comAt(hi);
      else {
        for (let i = 0; i < 40; i++) {
          const mid = 0.5 * (lo + hi);
          if (comAt(mid) < targetX) lo = mid; else hi = mid;
        }
        comAt(0.5 * (lo + hi));
      }
      clampPose(q, rom);
      clearFeet(model, ws, q);
      return { q0: q, qd0: null };
    }
    case 'lunge': {
      // Kick-up lunge: torso hinged down over the hands, stance knee bent
      // (buying hip range through the hamstring coupling), stance toe on the
      // floor, swing leg extended low behind with its toe just off the
      // ground rather than floating above the hands.
      q[3] = Math.min(65, rom.wristDorsiMaxDeg) * D2R;
      q[4] = 90 * D2R;
      q[8] = -50 * D2R;                    // stance knee bent
      solveHipForToeDown(model, ws, q, 'R');
      q[6] = 0;                            // swing leg straight
      q[5] = Math.min(q[7] / D2R - 18, hipFlexMaxDeg(rom, 0)) * D2R;
      clampPose(q, rom);
      // Re-plant the stance toe after any clamping shifted it, capped by the
      // bent-knee hamstring allowance, then guarantee neither toe starts
      // below the floor.
      solveHipForToeDown(model, ws, q, 'R');
      const hipCapBent = hipFlexMaxDeg(rom, 50) * D2R;
      if (q[7] > hipCapBent) q[7] = hipCapBent;
      clearFeet(model, ws, q);
      return { q0: q, qd0: null };
    }
    default: throw new Error(`unknown scenario ${name}`);
  }
}

// Hand-authored naive reference knots (radians), 6 joints x K, interpolating
// from the start pose toward the balanced handstand. Deliberately simple:
// their failures are the motivation for optimizing.
export function naiveReference(model, ws, name, K = 6, rom = ROM_DEFAULTS) {
  const { q0 } = scenarioStart(model, ws, name, rom);
  const target = balancedHandstand(model, ws);
  const knots = [];
  for (let j = 0; j < 6; j++) {
    const row = new Float64Array(K);
    for (let k = 0; k < K; k++) {
      const u = k / (K - 1);
      row[k] = q0[3 + j] + (target[3 + j] - q0[3 + j]) * u;
    }
    knots.push(row);
  }
  return { knots, q0, target };
}

// ---------------------------------------------------------------------------
// Trajectory optimization: decision vector encoding, cost, and driver.
// ---------------------------------------------------------------------------

export const JOINT_KEYS = ['wrist', 'shoulder', 'hipL', 'kneeL', 'hipR', 'kneeR'];

// The controller/plant configuration is part of every result. A trajectory
// is only meaningful together with the servo it was optimized for; replays
// must use the recorded config, never the current defaults.
export const SERVO_DEFAULTS = {
  kp: 800, kd: 60, kCom: 2000, dCom: 1500,
  activationTau: 0.05, mu: 1.0, contactZeta: 1.0, integrator: 'si',
  dampingRatio: 1.0, brakeMargin: 0.8, inertiaHz: 200, dampingSpeed: 0.5,
  romStopDeg: 5, romStopZeta: 0.7,
};

// Plant/controller settings as they were BEFORE a given capability existed.
// An artifact's stored config is the whole truth about the plant it was
// produced under, so a config that predates a key must replay with that
// key's pre-existing behavior, not with today's default. Both of these
// default to "off", which is exactly the old constant-kd, no-braking servo.
export const LEGACY_SERVO_CONFIG = {
  dampingRatio: 0, brakeMargin: 0, dampingSpeed: 0, romStopDeg: 0,
};

// Resolve a stored artifact config into the full argument set for
// runScenario. Anything the artifact recorded wins; anything it could not
// have recorded falls back to the legacy behavior.
export function resolveConfig(config) {
  return { ...LEGACY_SERVO_CONFIG, ...(config || {}) };
}

// x = [6 joints x K knot angles (radians), duration T]. When a rom is
// given, the knot bounds are the anatomy itself, so anatomically impossible
// reference angles are unrepresentable (the earlier soft-penalty-only
// treatment let the optimizer buy 30 degrees of impossible wrist flexion
// for about one cost unit). Hip bounds use the absolute (bent-knee) cap;
// the hamstring coupling with the knee remains a cost-side constraint.
export function decisionBounds(K, { tLo = 0.6, tHi = 3.0, rom = null } = {}) {
  const jointLo = rom
    ? [rom.wristDorsiMinDeg * D2R, -rom.shoulderHyperDeg * D2R,
      -rom.hipExtMaxDeg * D2R, -rom.kneeFlexMaxDeg * D2R,
      -rom.hipExtMaxDeg * D2R, -rom.kneeFlexMaxDeg * D2R]
    : [20 * D2R, -15 * D2R, -40 * D2R, -160 * D2R, -40 * D2R, -160 * D2R];
  const jointHi = rom
    ? [rom.wristDorsiMaxDeg * D2R, rom.shoulderCloseMaxDeg * D2R,
      rom.hipFlexAbsMaxDeg * D2R, rom.kneeHyperextDeg * D2R,
      rom.hipFlexAbsMaxDeg * D2R, rom.kneeHyperextDeg * D2R]
    : [130 * D2R, 120 * D2R, 175 * D2R, 10 * D2R, 175 * D2R, 10 * D2R];
  const n = 6 * K + 1;
  const lo = new Float64Array(n), hi = new Float64Array(n);
  for (let j = 0; j < 6; j++) {
    for (let k = 0; k < K; k++) { lo[j * K + k] = jointLo[j]; hi[j * K + k] = jointHi[j]; }
  }
  lo[n - 1] = tLo; hi[n - 1] = tHi;
  return { lo, hi };
}

export function decodeDecision(x, K) {
  const knots = [];
  for (let j = 0; j < 6; j++) knots.push(x.slice(j * K, (j + 1) * K));
  return { knots, T: x[x.length - 1] };
}

export function encodeDecision(knots, T) {
  const K = knots[0].length;
  const x = new Float64Array(6 * K + 1);
  for (let j = 0; j < 6; j++) x.set(knots[j], j * K);
  x[x.length - 1] = T;
  return x;
}

export const COST_WEIGHTS = {
  pose: 1, poseAngles: 2, velocity: 0.3, fall: 1,
  effort: 0.08, saturation: 2, rom: 4, quasiStatic: 0,
  liftoff: 8, feet: 5, work: 1, smooth: 1,
  settleCalm: 1, driveRate: 0.3,
};

// Normalizations for the arrival-quality terms. settleCalm measures joint
// motion energy in the settle tail (the banana-back-and-forth after
// arrival): joint velocities against SETTLE_QD_SCALE rad/s. driveRate
// measures how fast the normalized muscle drive u = tau/cap slews; the
// activation lag caps it near 1/activationTau = 20/s, so bang-bang commands
// ride DRIVE_RATE_SCALE multiples of the norm and smooth commands sit well
// under it.
export const SETTLE_QD_SCALE = 0.4;
export const DRIVE_RATE_SCALE = 6;
// Settle-phase muscle quietness: drive slew of ~4/s in the parked second is
// the edge of acceptable; buzzing runs an order of magnitude above.
export const SETTLE_DRIVE_RATE_SCALE = 4;

// Normalization for the smoothness term: joint accelerations are measured
// against this scale (rad/s^2). A purposeful kick swing (0 to ~8 rad/s in
// ~0.2 s) sits near 1 on this scale; flailing reversals sit far above it.
export const SMOOTH_ACCEL_SCALE = 60;

// Metabolic accounting for the work term (Margaria): concentric (positive)
// mechanical work costs 1/0.25 of itself metabolically; eccentric
// (absorbed) work is much cheaper, ~1/1.2 per Joule absorbed. The term is
// normalized by m g H, i.e. measured in "body-height lifts" of energy, so a
// minimal press scores a fraction of a unit while gratuitous limb churning
// multiplies it.
export const WORK_EFFICIENCY = { concentric: 0.25, eccentric: 1.2 };

// Cost of one rollout. Coarser dt for search; all terms normalized to O(1)
// scales (lengths by ~0.1 m, torques by their caps). Returns terms for
// inspection so weight tuning is explainable.
// The settle horizon must be long enough that an incipient overshoot
// becomes a realized fall INSIDE the scored window; with a short horizon
// the optimizer parks the fall just past the end of the simulation, where
// a final-instant velocity check sees a momentarily slow body that is
// visibly about to topple.
export function rolloutCost(model, ws, strengthProf, rom, scenario, x, {
  K = 6, dt = 5e-4, settleT = 2.5, weights = COST_WEIGHTS,
  qdJitter = 0, jitterSeed = 1, integrator = 'si',
  pinFinal = true,
} = {}) {
  const { knots, T } = decodeDecision(x, K);
  const balanced = balancedHandstand(model, ws);
  // A technique ends in the handstand by definition: the final knot is the
  // balanced pose, not a free parameter. Otherwise the settle-phase servo
  // holds a slightly-off shape that the wrist balance correction must fight
  // forever, and every "arrival" leaks into a slow drift and overshoot.
  if (pinFinal) {
    for (let j = 0; j < 6; j++) knots[j][knots[j].length - 1] = balanced[3 + j];
  }
  const r = runScenario(model, ws, strengthProf, {
    scenario, knots, T, settleT, dt, integrator, qdJitter, jitterSeed, rom,
    recordEvery: Math.max(1, Math.round(1 / (120 * dt))),
  });
  const rec = r.rec;
  const H = model.heightM;
  fk(model, balanced, null, ws);
  let comYbal = 0, mTot = 0;
  for (let i = 0; i < model.nb; i++) {
    mTot += model.mass[i];
    comYbal += model.mass[i] * (ws.py[i] + ws.rcy[i]);
  }
  comYbal /= mTot;

  // Fall detection: a fall is a collapse FROM height, not being low. A
  // press legitimately spends its first second with the CoM low in the
  // fold, so the trigger is the CoM dropping well below its running peak
  // (and below standing height). An earlier absolute-height version of this
  // check silently punished every press for existing, which drove the
  // optimizer to jump instead.
  let tFall = NaN, peakComY = -Infinity;
  const Tend = rec.t[rec.t.length - 1];
  for (let k = 0; k < rec.t.length; k++) {
    peakComY = Math.max(peakComY, rec.com[k][1]);
    if (rec.com[k][1] < peakComY - 0.3 * H && rec.com[k][1] < 0.75 * comYbal) {
      tFall = rec.t[k];
      break;
    }
  }

  const mo = momenta(model, r.q, r.qd, ws);
  const xTargetEnd = r.q[0] + model.patch.x0 + HANDSTAND_TARGET_FRAC * (model.patch.x1 - model.patch.x0);
  const poseTerm = ((mo.comX - xTargetEnd) / 0.1) ** 2 + ((mo.comY - comYbal) / (0.2 * H)) ** 2;
  // Peak CoM speed over the final 0.4 s, not the final instant: a body
  // drifting into overshoot can be momentarily slow exactly at cutoff.
  let peakEndSpeed = Math.hypot(mo.comVx, mo.comVy);
  for (let k = 1; k < rec.t.length; k++) {
    if (rec.t[k] < Tend - 0.4) continue;
    const dts = rec.t[k] - rec.t[k - 1];
    if (dts <= 0) continue;
    const v = Math.hypot(rec.com[k][0] - rec.com[k - 1][0], rec.com[k][1] - rec.com[k - 1][1]) / dts;
    peakEndSpeed = Math.max(peakEndSpeed, v);
  }
  const velTerm = (peakEndSpeed / 0.25) ** 2;
  const fallTerm = Number.isNaN(tFall) ? 0 : 60 + 240 * (Tend - tFall) / Tend;

  // Joint-space terminal error over the settle tail: "arrived" means the
  // stacked handstand configuration, not merely a CoM in the right place.
  // (A CoM-only criterion let the optimizer prop a toe on the floor in a
  // sprawled pose and call it a handstand.) Feet in the settle tail is
  // penalized directly for the same reason; hand liftoff is penalized over
  // the whole rollout because a handstand's palms do not clap.
  const balancedQ = balanced;
  const settleStart = Tend - Math.min(0.5, 0.5 * settleT);
  const W = mo.mass * model.gravity;
  let angErr = 0, nAng = 0, liftoff = 0, feet = 0;
  for (let k = 0; k < rec.t.length; k++) {
    const f = rec.forces[k];
    if (f) {
      const handF = f.fy[0] + f.fy[1];
      const def = Math.max(0, 0.1 * W - handF) / (0.1 * W);
      liftoff += def * def;
      if (rec.t[k] >= settleStart) {
        const footF = (f.fy[2] || 0) + (f.fy[3] || 0);
        feet += (footF / (0.2 * W)) ** 2;
      }
    }
    if (rec.t[k] >= settleStart) {
      let s = 0;
      for (let j = 0; j < 6; j++) {
        const d = rec.q[k][3 + j] - balancedQ[3 + j];
        s += d * d;
      }
      angErr += s;
      nAng++;
    }
  }
  liftoff /= rec.t.length;
  if (nAng > 0) { angErr /= nAng; feet /= nAng; }

  let effort = 0, sat = 0, romP = 0, peakKE = 0;
  let posWork = 0, negWork = 0;
  let driveRate = 0, nDrive = 0, settleCalmV = 0, nSettleCalm = 0;
  const prevU = new Float64Array(6).fill(NaN);
  const peakUtil = new Float64Array(6);
  for (let k = 0; k < rec.t.length; k++) {
    const dts = k > 0 ? rec.t[k] - rec.t[k - 1] : 0;
    let sumU2 = 0, sumSat = 0, sumDriveRate2 = 0;
    for (let j = 0; j < 6; j++) {
      const tauApplied = rec.tauApplied[k][j];
      const cap = availableTorque(strengthProf[JOINT_KEYS[j]], tauApplied, rec.qd[k][3 + j]);
      const u = Math.abs(tauApplied) / Math.max(cap, 1e-6);
      if (u > peakUtil[j]) peakUtil[j] = u;
      sumU2 += u * u;
      const over = Math.max(0, u - 0.95);
      sumSat += over * over;
      const P = tauApplied * rec.qd[k][3 + j];
      if (P > 0) posWork += P * dts; else negWork -= P * dts;
      // Signed drive for rate measurement (bang-bang shows as fast slew).
      const uSigned = tauApplied / Math.max(cap, 1e-6);
      if (dts > 0 && Number.isFinite(prevU[j])) {
        const rate = (uSigned - prevU[j]) / dts;
        driveRate += (rate / DRIVE_RATE_SCALE) ** 2;
        nDrive++;
        sumDriveRate2 += (rate / SETTLE_DRIVE_RATE_SCALE) ** 2;
      }
      prevU[j] = uSigned;
    }
    // Arrival calm: joint motion energy AND muscle quietness in the FINAL
    // second only. A lively momentum-using catch right after the kick is
    // legitimate; what must die out is sustained oscillation, drift, and
    // small-amplitude drive buzzing (rapid sign-flips of small torques are
    // invisible to the cap-normalized global driveRate term, but a parked
    // handstand's muscles change their drive slowly, and buzzing near
    // equilibrium is what would feel terrible in the shoulders).
    if (rec.t[k] >= Tend - Math.min(1.0, settleT)) {
      let sq = sumDriveRate2;
      for (let j = 3; j < 9; j++) {
        const v = rec.qd[k][j] / SETTLE_QD_SCALE;
        sq += v * v;
      }
      settleCalmV += sq;
      nSettleCalm++;
    }
    effort += sumU2;
    sat += sumSat;
    romP += romPenalty(rec.q[k], rom);
    if (weights.quasiStatic) {
      let ke = 0;
      for (let i = 3; i < 9; i++) ke += rec.qd[k][i] * rec.qd[k][i];
      const vc = k > 0
        ? Math.hypot(rec.com[k][0] - rec.com[k - 1][0], rec.com[k][1] - rec.com[k - 1][1])
          / (rec.t[k] - rec.t[k - 1] || 1)
        : 0;
      peakKE = Math.max(peakKE, vc);
    }
  }
  const N = rec.t.length;
  effort /= N; sat /= N; romP /= N;
  if (nDrive > 0) driveRate /= nDrive;
  if (nSettleCalm > 0) settleCalmV /= nSettleCalm;

  const metabWork = (posWork / WORK_EFFICIENCY.concentric + negWork / WORK_EFFICIENCY.eccentric)
    / (mo.mass * model.gravity * H);

  // Smoothness: mean squared joint acceleration (central differences over
  // the recording), the minimum-jerk-family regularizer that makes human
  // movement look human. Purposeful accelerations cost ~1 per joint on the
  // SMOOTH_ACCEL_SCALE; rapid reversals (flailing) dominate everything.
  let smoothAcc = 0;
  if (rec.t.length > 2) {
    for (let k = 1; k < rec.t.length - 1; k++) {
      const dtc = rec.t[k + 1] - rec.t[k - 1];
      if (dtc <= 0) continue;
      let s = 0;
      for (let j = 3; j < 9; j++) {
        const a = (rec.qd[k + 1][j] - rec.qd[k - 1][j]) / dtc / SMOOTH_ACCEL_SCALE;
        s += a * a;
      }
      smoothAcc += s;
    }
    smoothAcc /= rec.t.length - 2;
  }

  const terms = {
    pose: weights.pose * poseTerm,
    poseAngles: (weights.poseAngles || 0) * angErr,
    work: (weights.work || 0) * metabWork,
    smooth: (weights.smooth || 0) * smoothAcc,
    settleCalm: (weights.settleCalm || 0) * settleCalmV,
    driveRate: (weights.driveRate || 0) * driveRate,
    velocity: weights.velocity * velTerm,
    fall: weights.fall * fallTerm,
    effort: weights.effort * effort,
    saturation: weights.saturation * sat,
    rom: weights.rom * romP,
    quasiStatic: weights.quasiStatic ? weights.quasiStatic * peakKE * peakKE : 0,
    liftoff: (weights.liftoff || 0) * liftoff,
    feet: (weights.feet || 0) * feet,
  };
  let cost = 0;
  for (const v of Object.values(terms)) cost += v;
  return {
    cost, terms, verdict: r.verdict, T, tFall,
    peakUtil: Array.from(peakUtil),
    workJ: { positive: posWork, negative: negWork, metabNormalized: metabWork },
  };
}

// Worst case over evaluation variants: the nominal rollout plus a rollout
// at a different timestep with a small deterministic velocity jitter at the
// start. A trajectory only scores well if it works under all variants,
// which kills the knife-edge optima CMA-ES otherwise discovers: a marginal
// catch tuned to one timestep's contact artifacts falls in the other
// variant and pays full price. (Robustness via worst-case over
// perturbations, in the spirit of robust character-control optimization.)
export const ROBUST_VARIANTS = [
  { dt: 2.5e-4 },
  { dt: 2e-4, qdJitter: 0.05, jitterSeed: 9182 },
];

export function robustRolloutCost(model, ws, strengthProf, rom, scenario, x, opts = {}) {
  const variants = opts.variants || ROBUST_VARIANTS;
  let worst = null;
  for (const v of variants) {
    const c = rolloutCost(model, ws, strengthProf, rom, scenario, x, { ...opts, ...v });
    if (!worst || c.cost > worst.cost) worst = c;
  }
  return worst;
}

// The press initial guess is built from statics, not guessed: a quasi-static
// press is a path through BALANCED poses, so each interior knot fixes a hip
// angle along the way from the fold to vertical, opens the shoulder
// proportionally, and solves the wrist angle that puts the CoM over the
// palm at that shape (the same solve behind the press-corridor figure). The
// optimizer then only has to schedule and refine a path that statics
// already certifies.
export function pressReference(model, ws, K = 6, rom = ROM_DEFAULTS) {
  const { q0 } = scenarioStart(model, ws, 'pike', rom);
  const target = balancedHandstand(model, ws);
  const targetX = model.patch.x0 + HANDSTAND_TARGET_FRAC * (model.patch.x1 - model.patch.x0);
  const rows = Array.from({ length: 6 }, () => new Float64Array(K));
  const scratch = new Float64Array(model.nq);
  let lastWrist = q0[3];
  // Weight shift comes FIRST: hold the fold while the lean deepens and the
  // feet unload, then raise. Opening hips or shoulders from the start
  // pushes the CoM back over the feet and rocks the body off its palms,
  // which is precisely the beginner mistake the simulation reproduces.
  const openFrac = (u) => (u <= 0.28 ? 0 : (u - 0.28) / 0.72);
  for (let k = 0; k < K; k++) {
    const u = k / (K - 1);
    const hip = q0[5] * (1 - openFrac(u));
    const sh = q0[4] * (1 - openFrac(u));
    let wrist;
    if (k === 0) {
      wrist = q0[3];
    } else {
      scratch.fill(0);
      groundHand(model, scratch);
      scratch[4] = sh;
      scratch[5] = scratch[7] = hip;
      const w = solveWristForCom(model, scratch, ws, targetX);
      wrist = Number.isNaN(w) ? lastWrist : w;
    }
    lastWrist = wrist;
    rows[0][k] = wrist;
    rows[1][k] = sh;
    rows[2][k] = hip; rows[4][k] = hip;
    rows[3][k] = 0; rows[5][k] = 0;
  }
  rows[0][K - 1] = target[3];
  return { knots: rows, q0, target };
}

// Kick-up initial guess with the real phase structure: lean onto the hands
// while the swing leg sweeps hard overhead, extend the stance leg to push
// off, join the legs above, and hand the catch to the balance servo. The
// magic numbers are only a starting shape for the optimizer.
export function kickReference(model, ws, K = 7, rom = ROM_DEFAULTS) {
  const { q0 } = scenarioStart(model, ws, 'lunge', rom);
  const target = balancedHandstand(model, ws);
  const wB = target[3];
  const s = Array.from(q0.slice(3));
  // waypoints [wrist, shoulder, hipSwing(L), kneeL, hipStance(R), kneeR]
  const stages = [
    [s[0], s[1], s[2], s[3], s[4], s[5]],
    [s[0] - 8 * D2R, s[1] - 15 * D2R, s[2] - 45 * D2R, s[3], s[4], s[5]],
    [s[0], s[1] - 50 * D2R, -8 * D2R, 0, s[4] - 40 * D2R, -10 * D2R],
    [wB - 4 * D2R, 18 * D2R, 4 * D2R, 0, 30 * D2R, 0],
    [wB, 6 * D2R, target[5] + 4 * D2R, 0, 12 * D2R, 0],
    Array.from(target.slice(3)),
  ];
  const rows = Array.from({ length: 6 }, () => new Float64Array(K));
  for (let j = 0; j < 6; j++) {
    for (let k = 0; k < K; k++) {
      const u = (k / (K - 1)) * (stages.length - 1);
      const i = Math.min(Math.floor(u), stages.length - 2);
      const f = u - i;
      rows[j][k] = stages[i][j] * (1 - f) + stages[i + 1][j] * f;
    }
  }
  return { knots: rows, q0, target };
}

// Optimize a scenario's knots with CMA-ES. Deterministic under seed. With
// robust (the default) each candidate is scored as the worst case over
// ROBUST_VARIANTS; the reported finalCheck is an independent fine-timestep
// nominal evaluation.
export async function optimizeScenario(model, ws, strengthProf, rom, {
  scenario = 'lunge', K = 6, seed = 7, maxGen = 120, sigma0 = 0.25,
  dt = 2.5e-4, weights = COST_WEIGHTS, x0 = null, lambda = null,
  tLo = 0.6, tHi = 3.0, t0 = 1.4, robust = true,
  trustRadius = 0,
  onGeneration = null, objectiveBatch = null,
} = {}) {
  const start = x0 || (() => {
    const ref = scenario === 'pike'
      ? pressReference(model, ws, K, rom)
      : scenario === 'lunge'
        ? kickReference(model, ws, K, rom)
        : naiveReference(model, ws, scenario, K, rom);
    return encodeDecision(ref.knots, Math.min(Math.max(t0, tLo), tHi));
  })();
  const bounds = decisionBounds(K, { tLo, tHi, rom });
  // The start pose may sit exactly on (or, via clamping order, a hair past)
  // a ROM bound; give the start itself room.
  for (let i = 0; i < start.length; i++) {
    start[i] = Math.min(Math.max(start[i], bounds.lo[i]), bounds.hi[i]);
  }
  // Trust region: refine around x0 without wandering into another basin.
  if (trustRadius > 0) {
    for (let i = 0; i < start.length - 1; i++) {
      bounds.lo[i] = Math.max(bounds.lo[i], start[i] - trustRadius);
      bounds.hi[i] = Math.min(bounds.hi[i], start[i] + trustRadius);
    }
    bounds.lo[start.length - 1] = Math.max(bounds.lo[start.length - 1], start[start.length - 1] - 0.25);
    bounds.hi[start.length - 1] = Math.min(bounds.hi[start.length - 1], start[start.length - 1] + 0.25);
  }
  const costFn = robust ? robustRolloutCost : rolloutCost;
  const result = await cmaes({
    x0: start, sigma0, seed, maxGen, lambda, bounds,
    objective: objectiveBatch ? null
      : (x) => costFn(model, ws, strengthProf, rom, scenario, x, { K, dt, weights }).cost,
    objectiveBatch,
    onGeneration,
  });
  // The start is itself a candidate; CMA-ES samples around it but never
  // evaluates it, so on a hard landscape a small budget can end worse than
  // where it began. Never return worse than the start.
  const startCost = costFn(model, ws, strengthProf, rom, scenario, start, { K, dt, weights }).cost;
  if (startCost < result.best) {
    result.best = startCost;
    result.bestX = start;
  }
  const finalCheck = rolloutCost(model, ws, strengthProf, rom, scenario, result.bestX, { K, dt: 2e-4, weights });
  // Return knots with the final knot pinned (as they were scored), so
  // presets and replays inherit the parked ending.
  const decoded = decodeDecision(result.bestX, K);
  const qBal = balancedHandstand(model, ws);
  for (let j = 0; j < 6; j++) decoded.knots[j][decoded.knots[j].length - 1] = qBal[3 + j];
  return { ...result, K, scenario, finalCheck, decoded };
}

// ---------------------------------------------------------------------------
// Catch window: which wrist-angle perturbations (offset, rate) of the
// balanced handstand does the wrist-strategy balance controller recover
// from? The hand stays flat; the whole body above rotates about the wrist.
// ---------------------------------------------------------------------------
export function catchWindow(model, ws, strengthProf, {
  thetaLoDeg = -25, thetaHiDeg = 25, nTheta = 21,
  omegaLo = -2.5, omegaHi = 2.5, nOmega = 21,
  T = 2.5, dt = 5e-4, balanceOpts = {},
  onRow = null,
} = {}) {
  const qBal = balancedHandstand(model, ws);
  const success = new Uint8Array(nTheta * nOmega);
  const thetas = [], omegas = [];
  for (let i = 0; i < nTheta; i++) thetas.push(thetaLoDeg + (thetaHiDeg - thetaLoDeg) * i / (nTheta - 1));
  for (let j = 0; j < nOmega; j++) omegas.push(omegaLo + (omegaHi - omegaLo) * j / (nOmega - 1));
  for (let i = 0; i < nTheta; i++) {
    for (let j = 0; j < nOmega; j++) {
      const q0 = qBal.slice();
      q0[3] += thetas[i] * D2R;
      const qd0 = new Float64Array(model.nq);
      qd0[3] = omegas[j];
      const bal = createBalanceControl(model, ws, strengthProf, qBal, balanceOpts);
      const contacts = createContacts(model);
      const out = simulate(model, ws, {
        q0, qd0, T, dt, contacts,
        jointDamping: bal.damping,
        control: bal.control,
        stopWhen: (t, q, qd) => momenta(model, q, qd, ws).comY < 0.6,
      });
      const mo = momenta(model, out.q, out.qd, ws);
      const heelX = out.q[0] + model.patch.x0, tipX = out.q[0] + model.patch.x1;
      const ok = !out.stopped && !out.diverged && mo.comY > 0.85
        && mo.comX > heelX && mo.comX < tipX
        && Math.hypot(mo.comVx, mo.comVy) < 0.05;
      success[i * nOmega + j] = ok ? 1 : 0;
    }
    onRow?.(i, nTheta);
  }
  return { thetasDeg: thetas, omegas, success, nTheta, nOmega };
}

// Run a scenario under the capped PD servo. Returns the recording plus a
// settle verdict measured over the final settleT seconds.
export function runScenario(model, ws, strengthProf, {
  scenario = 'hold',
  knots = null,
  T = 1.2,
  settleT = 1.0,
  dt = 2e-4,
  // Servo impedance is deliberately LOW by default: gravity feedforward
  // carries the static load, so stiffness is not needed for holding, and a
  // stiff servo reacting to wrist balance corrections through the
  // activation lag rings in a small persistent limit cycle (buzzing
  // shoulders near equilibrium). Every recorded run carries its own config;
  // pass it here on replay.
  integrator = SERVO_DEFAULTS.integrator,
  kp = SERVO_DEFAULTS.kp, kd = SERVO_DEFAULTS.kd,
  mu = SERVO_DEFAULTS.mu,
  contactZeta = SERVO_DEFAULTS.contactZeta,
  activationTau = SERVO_DEFAULTS.activationTau,
  dampingRatio = SERVO_DEFAULTS.dampingRatio,
  brakeMargin = SERVO_DEFAULTS.brakeMargin,
  inertiaHz = SERVO_DEFAULTS.inertiaHz,
  dampingSpeed = SERVO_DEFAULTS.dampingSpeed,
  romStopDeg = SERVO_DEFAULTS.romStopDeg,
  romStopZeta = SERVO_DEFAULTS.romStopZeta,
  recordEvery = null,
  qdJitter = 0,
  jitterSeed = 1,
  balance = true,
  kCom = SERVO_DEFAULTS.kCom, dCom = SERVO_DEFAULTS.dCom,
  rom = ROM_DEFAULTS,
} = {}) {
  const { q0, qd0: qd0Start } = scenarioStart(model, ws, scenario, rom);
  let qd0 = qd0Start;
  if (qdJitter > 0) {
    const rand = mulberry32(jitterSeed);
    qd0 = qd0 ? Float64Array.from(qd0) : new Float64Array(model.nq);
    for (let j = 3; j < model.nq; j++) qd0[j] += (2 * rand() - 1) * qdJitter;
  }
  const ref = knots || naiveReference(model, ws, scenario, 6, rom).knots;
  const servo = createServo(model, strengthProf, {
    kp, kd, ws, activationTau, dampingRatio, brakeMargin, inertiaHz, dampingSpeed,
  });
  const contacts = createContacts(model, { mu, zeta: contactZeta });
  // Anatomical end-stops are part of the body, not the controller: the
  // reference bounds keep the optimizer from ASKING for an impossible angle,
  // and these keep momentum from producing one anyway.
  const stops = createJointStops(model, rom, strengthProf, ws, {
    stopDeg: romStopDeg, zeta: romStopZeta, qNominal: q0,
  });

  // The wrist strategy runs closed-loop during the rollout: a wrist torque
  // correction proportional to horizontal CoM error and velocity, scaled by
  // how much load the palms actually carry (no authority while airborne or
  // standing on the feet). Trajectories choose the SHAPE of the movement;
  // balance is continuous, as it is for a human. Without this, a slow press
  // must thread a moving equilibrium open-loop, which is nearly impossible
  // and produced only failed or knife-edge "solutions".
  const Wbody = model.massKg * model.gravity;
  const xTargetLocal = model.patch.x0 + HANDSTAND_TARGET_FRAC * (model.patch.x1 - model.patch.x0);
  const augment = balance ? (t, q, qd, des) => {
    const handF = contacts.ext.fy[0] + contacts.ext.fy[1];
    const gain = Math.min(1, handF / (0.6 * Wbody));
    if (gain <= 0) return;
    const mo = momenta(model, q, qd, ws);
    des[0] += gain * (kCom * (mo.comX - (q[0] + xTargetLocal)) + dCom * mo.comVx);
  } : null;

  const out = simulate(model, ws, {
    q0, qd0, T: T + settleT, dt, integrator, contacts,
    jointDamping: servo.damping,
    appliedTorque: servo.applied,
    jointStops: stops,
    control: servo.makeControl(ref, T, augment),
    recordEvery,
  });
  const mo = momenta(model, out.q, out.qd, ws);
  const heelX = out.q[0] + model.patch.x0, tipX = out.q[0] + model.patch.x1;
  const upright = mo.comY > 0.85 && !out.diverged;
  const over = mo.comX > heelX && mo.comX < tipX;
  const still = Math.hypot(mo.comVx, mo.comVy) < 0.05;
  // "Arrived" means the handstand configuration: joints near the balanced
  // pose (12 deg rms) and no residual foot contact, not merely CoM position.
  const qBal = balancedHandstand(model, ws);
  let angSum = 0;
  for (let j = 3; j < 9; j++) { const d = out.q[j] - qBal[j]; angSum += d * d; }
  const posed = Math.sqrt(angSum / 6) < 12 * D2R;
  const W = mo.mass * model.gravity;
  const feetFree = (contacts.ext.fy[2] + contacts.ext.fy[3]) < 0.05 * W;
  return {
    ...out, contacts, servo, stops, knots: ref, T, settleT,
    verdict: {
      upright, over, still, posed, feetFree,
      success: upright && over && still && posed && feetFree,
      comX: mo.comX, comY: mo.comY,
    },
  };
}
