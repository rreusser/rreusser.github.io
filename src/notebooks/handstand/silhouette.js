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

// A rounded end for a tube, as a half-ellipse from the anterior corner round
// to the posterior one.
//
// Two segments that meet at a joint are two separate closed outlines, and a
// flat end on each is only continuous while the joint is straight. Bend it and
// the two flat ends scissor apart: a wedge of background opens on the OUTSIDE
// of the bend and a hard corner juts on the inside. That is the notch at the
// waist and the crease at the hips. Round both ends and the pair overlaps into
// one continuous shape at any angle, the way two capsules do -- the joint
// stops being a seam and becomes what it is, a place where the body is round.
//
// bulge is how far the cap reaches past the joint, as a fraction of the end's
// own half-height. A full hemisphere (1) lengthens the segment visibly; these
// are all well under that, because the cap only has to cover the wedge.
function capArc(x, a, p, dir, bulge, n = 8) {
  const yc = 0.5 * (a - p), rc = 0.5 * (a + p);
  const out = [];
  for (let i = 1; i < n; i++) {
    const th = (i / n) * Math.PI;
    out.push([x + dir * bulge * rc * Math.sin(th), yc + rc * Math.cos(th)]);
  }
  return out;
}

// stations: [x, anteriorHalfDepth, posteriorHalfDepth]. Walks the anterior
// edge distally, then the posterior edge back, so the result closes.
// capProx/capDist round the proximal and distal ends; 0 leaves them flat,
// which is right for an end that is not a joint (the fingertips, a toe).
function tube(stations, capProx = 0, capDist = 0) {
  const first = stations[0], last = stations[stations.length - 1];
  const pts = [];
  for (const st of stations) pts.push([st[0], st[1]]);
  if (capDist > 0) pts.push(...capArc(last[0], last[1], last[2], 1, capDist));
  for (let i = stations.length - 1; i >= 0; i--) pts.push([stations[i][0], -stations[i][2]]);
  if (capProx > 0) {
    const arc = capArc(first[0], first[1], first[2], -1, capProx);
    for (let i = arc.length - 1; i >= 0; i--) pts.push(arc[i]);
  }
  return pts;
}

export function buildSilhouette({
  Lch, Lpv, H, sex = 'male', Lh, hw, patchHeelX, patchTipX, Lfa, Lua, Larm, Lhn,
  Ltr, Lth, Lsh, Lft, Lfoot, heelPt, ballPt, ankleH, heelBack, footFwd, ballFwd,
  ballOnAxis, Ltoe }) {
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

  // Arm: both arms merged, in two tubes cut at the elbow. Same stations the
  // single wrist-to-shoulder tube had; both ends at the cut are rounded, which
  // is what lets the pair stay one continuous shape through a bent elbow
  // instead of scissoring open on the outside of the bend.
  const forearm = [smoothClosed(tube([
    [0, f(s.wrist), f(s.wrist)],
    [0.32 * Lfa, f(s.elbow) * 0.98, f(s.elbow) * 0.92],
    [Lfa, f(s.elbow) * 0.92, f(s.elbow) * 0.92],
  ], 0, 0.75))];
  const upperArm = [smoothClosed(tube([
    [0, f(s.elbow) * 0.92, f(s.elbow) * 0.92],
    [0.42 * Lua, f(s.bicep), f(s.bicep) * 0.92],
    [Lua, f(s.shoulder), f(s.shoulder)],
  ], 0.75, 0.55))];

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
  ], 0.30, 0.42));
  // In the pelvis's own frame, which starts at the hinge.
  const pelvis = smoothClosed(tube([
    [0, cutA, cutP],
    [0.80 * Ltr - Lch, f(s.hipA), f(s.hipP)],
    [Lpv, f(s.hipA) * 0.80, f(s.hipP) * 0.70],
  ], 0.42, 0.50));

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
  ], 0, 0.30), 4);

  const thigh = [smoothClosed(tube([
    [0, f(s.thighA), f(s.thighP)],
    [0.40 * Lth, f(s.thighA) * 0.80, f(s.thighP) * 0.74],
    [Lth, f(s.knee), f(s.knee) * 0.94],
  ], 0.55, 0.60))];

  // Shank: calf on the posterior side, ending at the ankle. The foot used to
  // be drawn on the end of this as a taper, because the model welded it here.
  const shank = [smoothClosed(tube([
    [0, f(s.knee), f(s.knee) * 0.94],
    [0.28 * Lsh, f(s.calfA), f(s.calfP)],
    [0.72 * Lsh, f(s.ankle) * 1.35, f(s.calfP) * 0.52],
    [Lsh, f(s.ankle), f(s.ankle) * 1.25],
  ], 0.60, 0.70))];

  // Foot.
  //
  // Drawn in the profile a foot actually has, which means drawing it STANDING
  // -- sole on the floor, ankle above it -- and rotating that into the body
  // frame, rather than trying to describe it in a frame whose +x runs from the
  // ankle to the tip of a pointed toe. Described directly in that frame it came
  // out a flipper: the widest part is at the heel and everything after it
  // tapers monotonically to a point, which is exactly what a blade is.
  //
  // A foot in profile is not a taper. It has a heel that juts back and down as
  // a rounded lobe, an arch that lifts the middle of the sole clear of the
  // floor, a ball it rolls over, and toes that are shorter and blunter than the
  // instep is tall. Those are the four things below, and they are what make it
  // read as a foot at any ankle angle.
  //
  // x runs forward from the ANKLE, y up from the floor; the same rotation
  // anthropometry.js uses to place the contacts brings them into the frame.
  const ux = footFwd / Lft, uy = -ankleH / Lft;
  const toFoot = (x, y) => [x * ux + (y - ankleH) * uy, -x * uy + (y - ankleH) * ux];
  const P = (x, y) => toFoot(x * H, y * H);
  const hb = -heelBack / H;            // the heel contact, behind the ankle
  const tf = footFwd / H;              // the toe tip, ahead of it
  const bl = ballFwd / H;              // the ball, between them
  const foot = [smoothClosed([
    // The sole, heel to toe. Two stations close together at the back give the
    // heel a bottom rather than a curve, the arch lifts clear of the floor in
    // the middle, and the ball and the toes come back down to it.
    P(hb + 0.006, 0.000),
    P(hb + 0.017, 0.000),
    P(hb + 0.032, 0.004),
    P(hb + 0.052, 0.008),              // the arch, at its highest
    P(bl - 0.018, 0.004),
    P(bl, 0.000),                      // the ball
    P(bl + 0.030, 0.000),
    P(tf - 0.003, 0.001),
    // The toes. Blunt: the tip is a third the height of the instep, not a point.
    P(tf, 0.006),
    P(tf - 0.008, 0.011),
    // Back along the top, rising over the knuckles and the instep to the notch
    // at the front of the ankle. This edge is what stops it reading as a
    // flipper -- it climbs steadily instead of tapering away.
    P(bl + 0.028, 0.017),
    P(bl, 0.026),
    P(bl - 0.029, 0.035),
    P(0.003, 0.043),
    P(-0.009, 0.047),                  // the ankle, a little above the joint
    // And round the heel: back, down, and under. The two stations at the
    // bottom corner are close together on purpose, so the heel keeps a corner.
    P(-0.023, 0.042),
    P(hb + 0.001, 0.030),
    P(hb - 0.005, 0.017),
    P(hb - 0.003, 0.006),
  ], 3)];

  // Split at the ball. The foot outline is drawn as one profile above, because
  // that is how a foot is shaped; it becomes two bodies here by cutting the
  // polygon at the joint. Everything behind the cut belongs to the foot,
  // everything ahead to the toe -- re-expressed in the toe's own frame, whose
  // origin is the ball and whose +x continues the foot's.
  // The two halves OVERLAP across the cut rather than meeting at it. Meeting
  // exactly is only continuous while the joint is straight; bend it and the two
  // flat ends scissor apart, opening a wedge of background on the outside of
  // the bend -- the same thing rounded caps fix at every other joint on the
  // body. An overlap of a centimetre keeps the foot one shape at any toe angle.
  const over = 0.010 * H;
  const cut = (poly, keepAhead) => {
    const edge = ballOnAxis + (keepAhead ? -over : over);
    const pts = [];
    const inSide = (p) => (keepAhead ? p[0] >= edge : p[0] <= edge);
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      if (inSide(a)) pts.push(a);
      // Where an edge crosses the cut, put a point exactly on it, so the two
      // halves share an edge and no seam opens when the joint bends.
      if (inSide(a) !== inSide(b)) {
        const t = (edge - a[0]) / (b[0] - a[0]);
        pts.push([edge, a[1] + (b[1] - a[1]) * t]);
      }
    }
    return keepAhead ? pts.map(([x, y]) => [x - ballOnAxis, y]) : pts;
  };
  const footBack = [cut(foot[0], false)];
  const footToe = [cut(foot[0], true)];

  // Body order, which is the model's: hand, forearm, upper arm, chest, pelvis,
  // both legs down to their feet, then the head hanging off the chest. The
  // neck and skull are already written relative to the shoulder, which is
  // exactly the head body's own origin, so they move across unchanged.
  return [
    hand,
    forearm,
    upperArm,
    [chest],
    [pelvis],
    thigh,
    shank,
    footBack,
    thigh,
    shank,
    footBack,
    [neck, skull],
    footToe,
    footToe,
  ];
}

export const SILHOUETTE_SEXES = Object.keys(SHAPE);
