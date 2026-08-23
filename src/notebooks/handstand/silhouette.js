// Closed body outlines for rendering, so the figure reads as a person rather
// than as a stick diagram. These are drawing proportions, not measurements:
// the inertial parameters in anthropometry.js come from de Leva (1996) and
// nothing in this file feeds the dynamics.
//
// Frame conventions are inherited from anthropometry.js: each body's +x runs
// proximal to distal, and +y is ANTERIOR. That second one is not a choice --
// hip flexion rotates the thigh so the knee travels toward body-frame +y, so
// the front of the body is the side the legs fold toward. In world terms the
// figure faces away from the fingertips, which is what a press looks like:
// bent over, hands on the floor, feet behind the hands.
//
// Each body's outline is a LIST of closed subpaths, because the torso body
// carries the head as well and a skull smoothed into a ribcage is a peanut.

// Sagittal half-depths as fractions of stature, anterior and posterior given
// separately wherever the body is not symmetric about its own long axis.
// Sanity check for the numbers below: chest depth front-to-back is about
// 0.24 m on a 1.75 m body, which is 0.137 of stature, so the two halves of
// the chest should sum to about that. Ribcage, buttocks and calf are the
// places where one side is clearly fuller than the other.
const SHAPE = {
  male: {
    skull: 0.056, jaw: 0.048, neck: 0.030,
    chestA: 0.075, chestP: 0.062, waistA: 0.047, waistP: 0.051,
    hipA: 0.056, hipP: 0.068,
    shoulder: 0.032, bicep: 0.033, elbow: 0.023, wrist: 0.016,
    thighA: 0.045, thighP: 0.048, knee: 0.031, calfA: 0.022, calfP: 0.034,
    ankle: 0.019, footTop: 0.026, footSole: 0.018,
  },
  // Same stature, so the differences here are shape only: narrower shoulders
  // and ribcage, a shorter and more marked waist, wider hips and slightly
  // fuller thighs. The mass that goes with those hips and thighs is not
  // drawn in, it comes from the female de Leva table in anthropometry.js.
  female: {
    skull: 0.053, jaw: 0.045, neck: 0.026,
    chestA: 0.069, chestP: 0.053, waistA: 0.037, waistP: 0.042,
    hipA: 0.060, hipP: 0.082,
    shoulder: 0.026, bicep: 0.028, elbow: 0.019, wrist: 0.013,
    thighA: 0.048, thighP: 0.052, knee: 0.030, calfA: 0.021, calfP: 0.033,
    ankle: 0.017, footTop: 0.024, footSole: 0.016,
  },
};

// Catmull-Rom through the given points, closed, sampled `per` times per
// span. The outlines below are a dozen stations each; this is what turns
// them from a polygon into a body.
function smoothClosed(pts, per = 6) {
  const n = pts.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let s = 0; s < per; s++) {
      const t = s / per, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  return out;
}

// stations: [x, anteriorHalfDepth, posteriorHalfDepth]. Walks the anterior
// edge distally, then the posterior edge back, so the result closes.
function tube(stations) {
  const pts = [];
  for (const st of stations) pts.push([st[0], st[1]]);
  for (let i = stations.length - 1; i >= 0; i--) pts.push([stations[i][0], -stations[i][2]]);
  return pts;
}

export function buildSilhouette({
  Lch, Lpv, H, sex = 'male', Lh, hw, patchHeelX, patchTipX, Lfa, Larm, Lhn, Ltr, Lth, Lsh, toeX }) {
  const s = SHAPE[sex] || SHAPE.male;
  const f = (v) => v * H;

  // Hand, seen from the side with the palm flat: heel of the palm on the
  // floor, wrist above it, knuckles the high point, fingers tapering to the
  // pads at the far end of the contact patch.
  const hand = [[
    [patchHeelX, -hw], [patchHeelX - f(0.007), -hw + f(0.016)],
    [-f(0.008), f(0.004)], [f(0.014), f(0.008)],
    [0.34 * Lh, -hw + f(0.030)], [0.52 * Lh, -hw + f(0.031)],
    [0.66 * Lh, -hw + f(0.019)], [0.84 * Lh, -hw + f(0.011)],
    [patchTipX, -hw + f(0.005)], [patchTipX, -hw],
  ]];

  // Arm: both arms merged, wrist to shoulder, with the forearm swell just
  // past the wrist and the bicep short of the shoulder.
  const arm = [smoothClosed(tube([
    [0, f(s.wrist), f(s.wrist)],
    [0.32 * Lfa, f(s.elbow) * 0.98, f(s.elbow) * 0.92],
    [Lfa, f(s.elbow) * 0.92, f(s.elbow) * 0.92],
    [Lfa + 0.42 * (Larm - Lfa), f(s.bicep), f(s.bicep) * 0.92],
    [Larm, f(s.shoulder), f(s.shoulder)],
  ]))];

  // The torso is TWO bodies now, hinged at the spine, so it is drawn as two
  // tubes cut at that hinge. The stations are the same ones the single tube
  // had; the cut station's radii are interpolated between the waist and the
  // hip so the two halves meet at the same width and the seam does not show
  // when the spine is straight.
  const lerp = (a, b, t) => a + (b - a) * t;
  const tCut = (Lch / Ltr - 0.45) / (0.80 - 0.45);
  const cutA = lerp(f(s.waistA), f(s.hipA), tCut);
  const cutP = lerp(f(s.waistP), f(s.hipP), tCut);
  const chest = smoothClosed(tube([
    [-f(0.010), f(s.chestA) * 0.80, f(s.chestP) * 0.82],
    [0.10 * Ltr, f(s.chestA), f(s.chestP)],
    [0.45 * Ltr, f(s.waistA), f(s.waistP)],
    [Lch, cutA, cutP],
  ]));
  // In the pelvis's own frame, which starts at the hinge.
  const pelvis = smoothClosed(tube([
    [0, cutA, cutP],
    [0.80 * Ltr - Lch, f(s.hipA), f(s.hipP)],
    [Lpv, f(s.hipA) * 0.80, f(s.hipP) * 0.70],
  ]));

  // Head. Drawn as a profile rather than a ball, because a ball next to an
  // arm reads as a joint. t runs 0 at the crown to 1 at the base of the
  // skull, r is the half-depth, and the anterior side carries brow, nose,
  // lips and chin. In a handstand this hangs between the upper arms, which
  // is where a head actually is.
  const skullLen = 0.70 * Lhn;
  const hx = (t) => -Lhn + t * skullLen;
  const r = f(s.skull);
  const skull = smoothClosed([
    [hx(0.00), 0.05 * r],
    [hx(0.07), 0.48 * r], [hx(0.22), 0.84 * r], [hx(0.36), 0.90 * r],
    [hx(0.45), 0.82 * r], [hx(0.52), 1.02 * r], [hx(0.60), 0.80 * r],
    [hx(0.68), 0.80 * r], [hx(0.78), 0.58 * r], [hx(0.89), 0.42 * r],
    [hx(1.00), 0.34 * r],
    [hx(1.00), -0.44 * r], [hx(0.86), -0.88 * r], [hx(0.58), -1.00 * r],
    [hx(0.30), -0.92 * r], [hx(0.11), -0.58 * r],
  ], 5);
  // Neck: from the base of the skull into the top of the chest.
  const neck = smoothClosed(tube([
    [hx(0.94), f(s.neck) * 0.85, f(s.neck) * 1.05],
    [-f(0.035), f(s.neck) * 0.95, f(s.neck) * 1.25],
    [f(0.005), f(s.chestA) * 0.72, f(s.chestP) * 0.72],
  ]), 4);

  const thigh = [smoothClosed(tube([
    [0, f(s.thighA), f(s.thighP)],
    [0.40 * Lth, f(s.thighA) * 0.80, f(s.thighP) * 0.74],
    [Lth, f(s.knee), f(s.knee) * 0.94],
  ]))];

  // Shank with the foot folded in, matching the way the model itself lumps
  // them: calf on the posterior side, then a pointed foot along +x.
  const shank = [smoothClosed(tube([
    [0, f(s.knee), f(s.knee) * 0.94],
    [0.28 * Lsh, f(s.calfA), f(s.calfP)],
    [0.72 * Lsh, f(s.ankle) * 1.35, f(s.calfP) * 0.52],
    [Lsh, f(s.ankle), f(s.ankle) * 1.25],
    [Lsh + 0.45 * (toeX - Lsh), f(s.footTop) * 0.75, f(s.footSole) * 0.85],
    [toeX, f(0.009), f(0.009)],
  ]))];

  // Body order, which is the model's: hand, arm, chest, pelvis, both legs,
  // then the head hanging off the chest. The neck and skull are already
  // written relative to the shoulder, which is exactly the head body's own
  // origin, so they move across unchanged.
  return [
    hand,
    arm,
    [chest],
    [pelvis],
    thigh,
    shank,
    thigh,
    shank,
    [neck, skull],
  ];
}

export const SILHOUETTE_SEXES = Object.keys(SHAPE);
