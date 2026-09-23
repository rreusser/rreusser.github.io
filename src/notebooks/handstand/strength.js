// Maximum voluntary joint torque as a function of joint angular velocity,
// after Yeadon, King & Wilson (2006), J. Biomech 39:476-482: the product of a
// four-parameter tetanic torque/velocity function (two rectangular hyperbolas,
// Hill in the concentric phase) and a three-parameter differential activation
// function (voluntary activation is depressed for eccentric velocities).
//
// Velocity sign convention here: omega > 0 means the joint moves in the same
// direction as the produced torque (concentric/shortening); omega < 0 is
// eccentric. Callers map signed joint velocity to this convention with the
// sign of the commanded torque.
//
// The T0 parameter is the TETANIC isometric torque; maximum voluntary
// isometric torque is a(0) * T0 (about 0.8-0.9 of tetanic in their fits).
// User-facing strength values are specified as voluntary isometric torque
// per unit body mass and converted with voluntaryToTetanic().

const HUXLEY_K = 4.3;          // eccentric/concentric slope ratio at omega=0
const ECC_PLATEAU = 1.5;       // Tmax / T0

export function tetanicTorque(omega, { T0, wmax, wc }) {
  const Tmax = ECC_PLATEAU * T0;
  if (omega >= 0) {
    if (omega >= wmax) return 0;
    const Tc = T0 * wc / wmax;
    const C = Tc * (wmax + wc);
    return C / (wc + omega) - Tc;
  }
  const we = ((Tmax - T0) / (HUXLEY_K * T0)) * (wmax * wc / (wmax + wc));
  const E = -(Tmax - T0) * we;
  return E / (we - omega) + Tmax;
}

// Differential activation a(omega), rising from amin (fast eccentric) to 1
// (fast concentric) with inflection at w1. Yeadon-King-Wilson eq. (4) defines
// omega as a function of a; inverting it is a quadratic in a.
export function activation(omega, { amin, w1, m }) {
  const amax = 1.0;
  const abar = 0.5 * (amin + amax);
  const u = omega - w1;
  if (Math.abs(u) < 1e-12) return abar;
  // u * (amax - a)(a - amin) = m (a - abar)  =>  quadratic in a:
  // u a^2 - [u(amax+amin) - m] a + [u amax amin - m abar] = 0
  const S = amax + amin, P = amax * amin;
  const b = u * S - m, c = u * P - m * abar;
  const disc = Math.sqrt(Math.max(0, b * b - 4 * u * c));
  const r1 = (b + disc) / (2 * u);
  const r2 = (b - disc) / (2 * u);
  // Exactly one root lies inside (amin, amax); the sigmoid picks it.
  if (r1 > amin && r1 < amax) return r1;
  if (r2 > amin && r2 < amax) return r2;
  return u > 0 ? amax : amin;
}

export function maxVoluntaryTorque(omega, params) {
  return tetanicTorque(omega, params) * activation(omega, params);
}

// Convert a desired maximum voluntary isometric torque into the tetanic T0
// parameter for the given activation parameters.
export function voluntaryToTetanic(voluntaryIso, params) {
  return voluntaryIso / activation(0, params);
}

// Per-joint defaults. t0Vol is voluntary isometric torque in Nm per kg of
// body mass, for the MERGED joint (both wrists / both shoulders together;
// hips and knees are single-leg). Values are rough literature-informed
// defaults meant to be scaled by user strength sliders: wrist from the
// Kerwin & Trewartha (2001) balance-moment range with headroom, shoulder and
// lower-limb values from typical adult dynamometry, velocity and activation
// parameters from the Yeadon-King-Wilson knee-extensor fits (wmax 13.4-26.8
// rad/s, wc ~0.3-4x wmax, amin 0.66-0.72, w1 ~ 0, m ~ 0.3).
//
// The upper-body numbers describe someone who can hold a handstand, not a
// gymnast, and this matters more than it sounds. Holding a straight body out
// at a lean off the handstand line costs roughly 1.2 Nm/kg at the shoulder by
// 20 degrees and 1.9 by 30, so a shoulder rated 2.0 can support itself a long
// way toward horizontal, and the optimizer duly stopped kicking up and began
// pressing out of a planche instead: a far harder skill than the one being
// studied. 1.6 Nm/kg merged (about 56 Nm per arm) is a recreational shoulder
// that can still enter a handstand but cannot hang around out there.
//
// Strength alone does not settle it, and it is worth being clear about why.
// Cutting the shoulder far enough to make a planche outright impossible (1.3
// was tried) also makes every handstand entry impossible, because a kick-up
// passes through those same leaned positions on its way up; the difference
// between the two skills is duration, not geometry. What separates them is
// the saturation term in the cost, which used to charge almost nothing for
// living at the cap (see rollout.js). The balanced handstand itself needs
// only 0.19 Nm/kg at the shoulder, so holding one is never at risk here.
export const STRENGTH_DEFAULTS = {
  wrist:    { t0Vol: 0.85, wmax: 15, wc: 6, amin: 0.7, w1: 0, m: 0.3 },
  shoulder: { t0Vol: 1.6, wmax: 18, wc: 7, amin: 0.7, w1: 0, m: 0.3 },
  hip:      { t0Vol: 2.2, wmax: 18, wc: 7, amin: 0.7, w1: 0, m: 0.3 },
  knee:     { t0Vol: 2.6, wmax: 20, wc: 8, amin: 0.7, w1: 0, m: 0.3 },
  // The trunk. Erector spinae and the abdominal wall are strong -- this sits
  // just below the hip, which is the right neighbourhood for a single hinge
  // standing in for the whole lumbar column -- and slow, because a spine does
  // not snap: wmax below the hip's is what stops the search using the trunk
  // as a whip.
  spine:    { t0Vol: 2.0, wmax: 12, wc: 5, amin: 0.7, w1: 0, m: 0.3 },
  // The elbow, merged over both arms like the wrist and the shoulder above
  // it. Elbow extension peaks near 55 Nm per arm in an untrained man, so 110
  // merged is about 1.6 Nm/kg; this sits a little under the shoulder because
  // that is the joint a bent-arm press actually runs out of, and because the
  // single symmetric cap here has to stand for a flexion side that is the
  // weaker of the two. Fast, like the shoulder: the elbow is the joint a
  // bent-arm entry snaps.
  elbow:    { t0Vol: 1.2, wmax: 18, wc: 7, amin: 0.7, w1: 0, m: 0.3 },
  // The ankle, per leg. Plantarflexion is the strongest single-joint action
  // on the body against its own lever -- 130 Nm is an ordinary man's -- and
  // it is what a kick-up leaves the floor with. The cap is symmetric, as
  // every joint's here is, which overstates dorsiflexion by a factor of four;
  // nothing in a handstand asks the shin muscles for anything, so the
  // overstatement is unspent rather than exploited. Slow, because a calf
  // shortening against a short lever is: wmax below the hip's.
  ankle:    { t0Vol: 1.9, wmax: 14, wc: 6, amin: 0.7, w1: 0, m: 0.3 },
  // And the neck, which is the weakest joint on the body by a wide margin.
  // This number is doing real work: the head is eight per cent of body mass
  // on a long lever and almost no rotational inertia, so without a small cap
  // here the search would discover it can steer a handstand by flinging its
  // head, which is both wrong and what a beginner does.
  neck:     { t0Vol: 0.35, wmax: 10, wc: 4, amin: 0.7, w1: 0, m: 0.3 },
};

// Which strength group each driven joint draws on. Exported because it is the
// answer to "what kind of joint is this", and a caller that re-derives it from
// the name -- as the gate here did, with startsWith -- gets it right until a
// joint arrives whose name does not fit the pattern.
export const JOINT_KIND = {
  wrist: 'wrist', elbow: 'elbow', shoulder: 'shoulder', spine: 'spine', neck: 'neck',
  hipL: 'hip', hipR: 'hip', kneeL: 'knee', kneeR: 'knee',
  ankleL: 'ankle', ankleR: 'ankle',
};

// Build resolved per-joint parameter objects for a model.
// overrides: { [kind]: { t0Vol?, wmax?, ... } }, scale: global strength
// multiplier, mode: 'yeadon-king' (default) or 'constant'.
export function strengthProfile(massKg, { overrides = {}, scale = 1, mode = 'yeadon-king' } = {}) {
  const joints = {};
  for (const [name, kind] of Object.entries(JOINT_KIND)) {
    const p = { ...STRENGTH_DEFAULTS[kind], ...(overrides[kind] || {}) };
    const voluntaryIso = p.t0Vol * scale * massKg;
    joints[name] = {
      ...p, mode, voluntaryIso,
      T0: voluntaryToTetanic(voluntaryIso, p),
    };
  }
  return joints;
}

// Available torque magnitude for a joint producing torque in direction
// sign(tauDir) at signed joint velocity qd.
export function availableTorque(jp, tauDir, qd) {
  if (jp.mode === 'constant') return jp.voluntaryIso;
  const s = tauDir >= 0 ? 1 : -1;
  return maxVoluntaryTorque(s * qd, jp);
}

// Clamp a commanded torque to the voluntary capability envelope.
export function clampTorque(jp, tauCmd, qd) {
  if (tauCmd === 0) return 0;
  const cap = availableTorque(jp, tauCmd, qd);
  return Math.sign(tauCmd) * Math.min(Math.abs(tauCmd), cap);
}
