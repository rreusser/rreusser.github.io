// Verification gates for the Yeadon-King-Wilson (2006) torque model.
// Checks the published structural properties of the seven-parameter function:
// hyperbola landmarks (T0 at zero velocity, zero at wmax, 1.5*T0 eccentric
// plateau), the k=4.3 slope ratio at omega=0, the activation sigmoid against
// a bisection inverse of the paper's implicit definition, and the
// concentric/eccentric branch selection used by the servo clamp.
//
// Run: node src/notebooks/handstand/test/strength.mjs
import {
  tetanicTorque, activation, maxVoluntaryTorque, voluntaryToTetanic,
  strengthProfile, availableTorque, clampTorque, STRENGTH_DEFAULTS,
} from '../strength.js';

let failures = 0;
function gate(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const P = { T0: 300, wmax: 20, wc: 8, amin: 0.7, w1: 0.2, m: 0.3 };

// ---------------------------------------------------------------------------
// Gate A: tetanic curve landmarks and continuity at omega = 0.
// ---------------------------------------------------------------------------
{
  const t0c = tetanicTorque(1e-12, P);
  const t0e = tetanicTorque(-1e-12, P);
  const tEnd = tetanicTorque(P.wmax, P);
  const tEcc = tetanicTorque(-1e5, P);
  gate('A: T(0)=T0 from both branches, T(wmax)=0, eccentric plateau 1.5*T0',
    Math.abs(t0c - P.T0) < 1e-6 && Math.abs(t0e - P.T0) < 1e-6 &&
    Math.abs(tEnd) < 1e-9 && Math.abs(tEcc - 1.5 * P.T0) < 0.5,
    `T(0-)=${t0e.toFixed(4)}, T(0+)=${t0c.toFixed(4)}, T(-inf)=${tEcc.toFixed(2)}`);
}

// ---------------------------------------------------------------------------
// Gate B: eccentric/concentric slope ratio at omega = 0 equals Huxley's 4.3.
// ---------------------------------------------------------------------------
{
  const h = 1e-6;
  const slopeCon = (tetanicTorque(h, P) - tetanicTorque(0, P)) / h;
  const slopeEcc = (tetanicTorque(0, P) - tetanicTorque(-h, P)) / h;
  const k = slopeEcc / slopeCon;
  gate('B: slope ratio at omega=0 is k=4.3', Math.abs(k - 4.3) < 1e-3,
    `k=${k.toFixed(4)}`);
}

// ---------------------------------------------------------------------------
// Gate C: closed-form activation matches a bisection inverse of the implicit
// omega(a) relation, and is a monotone sigmoid from amin to 1.
// ---------------------------------------------------------------------------
{
  const omegaOfA = (a) =>
    P.w1 + P.m * (a - 0.5 * (P.amin + 1)) / ((1 - a) * (a - P.amin));
  const bisect = (omega) => {
    let lo = P.amin + 1e-12, hi = 1 - 1e-12;
    for (let i = 0; i < 200; i++) {
      const mid = 0.5 * (lo + hi);
      if (omegaOfA(mid) < omega) lo = mid; else hi = mid;
    }
    return 0.5 * (lo + hi);
  };
  let worst = 0, monotone = true, prev = -Infinity;
  for (let w = -30; w <= 30; w += 0.25) {
    const a = activation(w, P);
    worst = Math.max(worst, Math.abs(a - bisect(w)));
    if (a < prev - 1e-12) monotone = false;
    prev = a;
    if (a < P.amin - 1e-9 || a > 1 + 1e-9) monotone = false;
  }
  const aFar = activation(1e4, P), aFarNeg = activation(-1e4, P);
  gate('C: activation matches bisection inverse, monotone in [amin, 1]',
    worst < 1e-9 && monotone && Math.abs(aFar - 1) < 1e-3 && Math.abs(aFarNeg - P.amin) < 1e-3,
    `max err=${worst.toExponential(2)}, a(+inf)=${aFar.toFixed(4)}, a(-inf)=${aFarNeg.toFixed(4)}`);
}

// ---------------------------------------------------------------------------
// Gate D: voluntary normalization. strengthProfile produces joints whose
// maximum voluntary isometric torque equals the requested t0Vol * mass.
// ---------------------------------------------------------------------------
{
  const massKg = 70;
  const prof = strengthProfile(massKg, { scale: 1.25 });
  let worst = 0;
  for (const [name, jp] of Object.entries(prof)) {
    const kind = name.startsWith('hip') ? 'hip' : name.startsWith('knee') ? 'knee' : name;
    const want = STRENGTH_DEFAULTS[kind].t0Vol * 1.25 * massKg;
    worst = Math.max(worst, Math.abs(maxVoluntaryTorque(0, jp) - want));
  }
  gate('D: voluntary isometric normalization', worst < 1e-9,
    `max err=${worst.toExponential(2)} Nm`);
}

// ---------------------------------------------------------------------------
// Gate E: branch selection and clamping. Eccentric capability exceeds
// isometric, which exceeds fast concentric; the clamp respects direction and
// magnitude; constant mode ignores velocity.
// ---------------------------------------------------------------------------
{
  const prof = strengthProfile(70);
  const jp = prof.shoulder;
  // Joint moving at qd = +5: torque commanded along +qd is concentric,
  // against it is eccentric.
  const capCon = availableTorque(jp, +1, 5);
  const capIso = availableTorque(jp, +1, 0);
  const capEcc = availableTorque(jp, -1, 5);
  const ordered = capEcc > capIso && capIso > capCon && capCon > 0;
  const passThrough = clampTorque(jp, 0.5 * capCon, 5) === 0.5 * capCon;
  const clampedPos = clampTorque(jp, 10 * capCon, 5) === capCon;
  const clampedNeg = clampTorque(jp, -10 * capEcc, 5) === -capEcc;
  const cst = strengthProfile(70, { mode: 'constant' }).shoulder;
  const cstOk = availableTorque(cst, +1, 12) === cst.voluntaryIso &&
    availableTorque(cst, -1, -12) === cst.voluntaryIso;
  gate('E: eccentric > isometric > fast concentric; clamp and constant mode',
    ordered && passThrough && clampedPos && clampedNeg && cstOk,
    `ecc=${capEcc.toFixed(1)}, iso=${capIso.toFixed(1)}, con(5rad/s)=${capCon.toFixed(1)} Nm`);
}

console.log(failures ? `\n${failures} gate(s) FAILED` : '\nAll strength gates passed');
process.exit(failures ? 1 : 0);
