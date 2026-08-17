// Planar (sagittal) anthropometric model of a handstand: seven rigid bodies
// rooted at the hand, with both arms merged into one segment and both hands
// merged into one, by left-right symmetry. Legs remain independent so the
// kick-up lunge can be asymmetric.
//
// Segment inertial parameters follow de Leva (1996), "Adjustments to
// Zatsiorsky-Seluyanov's segment inertia parameters", J. Biomech 29(9),
// male values: mass fraction of body mass, longitudinal CoM position as a
// fraction of segment length from the proximal end, and sagittal radius of
// gyration as a fraction of segment length. Segment lengths as fractions of
// stature follow Winter's standard proportions. The hand patch geometry and
// the folding of the feet into the shanks are documented approximations.
//
// Body indices and tree (parent[i] < i):
//   0 hand (floating base)   parent -1
//   1 arm (wrist->shoulder)  parent  0   joint q[3] wrist
//   2 torso+head (shoulder->hip) p 1  joint q[4] shoulder
//   3 thighL (hip->knee)     parent  2   joint q[5] hipL
//   4 shankL+foot (knee->)   parent  3   joint q[6] kneeL
//   5 thighR                 parent  2   joint q[7] hipR
//   6 shankR+foot            parent  5   joint q[8] kneeR
//
// Frame conventions: each body's +x axis runs from its proximal joint toward
// its distal end. World +x points toward the fingertips (the overbalance
// direction), +y up, angles CCW. A perfectly stacked handstand is
// q = [x, y, 0, pi/2, 0, 0, 0, 0, 0]: hand flat along +x, arm vertical,
// torso/legs collinear with the arm. The head extends along torso -x
// (toward the floor, as it should in a handstand).

// de Leva (1996) male table, per single limb where applicable.
// len: fraction of stature; m: fraction of body mass;
// com: fraction of segment length from proximal end; k: sagittal radius of
// gyration as fraction of segment length.
export const DE_LEVA = {
  headNeck: { len: 0.182, m: 0.0694, com: 0.5002, k: 0.303 },
  trunk:    { len: 0.288, m: 0.4346, com: 0.4486, k: 0.372 },
  upperArm: { len: 0.186, m: 0.0271, com: 0.5772, k: 0.285 },
  forearm:  { len: 0.146, m: 0.0162, com: 0.4574, k: 0.276 },
  hand:     { len: 0.108, m: 0.0061, com: 0.79,   k: 0.30  },
  thigh:    { len: 0.245, m: 0.1416, com: 0.4095, k: 0.329 },
  shank:    { len: 0.246, m: 0.0433, com: 0.4459, k: 0.251 },
  foot:     { len: 0.152, m: 0.0137, com: 0.4415, k: 0.257 },
};

// Combine sub-segments given in a common frame into one rigid body.
// pieces: { m, cx, cy, I } with I about the piece's own CoM.
function compose(pieces) {
  let m = 0, cx = 0, cy = 0;
  for (const p of pieces) { m += p.m; cx += p.m * p.cx; cy += p.m * p.cy; }
  cx /= m; cy /= m;
  let I = 0;
  for (const p of pieces) {
    const dx = p.cx - cx, dy = p.cy - cy;
    I += p.I + p.m * (dx * dx + dy * dy);
  }
  return { m, cx, cy, I };
}

function rodPiece(m, x0, x1, comFrac, kFrac) {
  const L = x1 - x0;
  return { m, cx: x0 + comFrac * L, cy: 0, I: m * (kFrac * L) ** 2 };
}

export function buildModel({ heightM = 1.75, massKg = 70, straddleDeg = 0 } = {}) {
  const H = heightM, M = massKg;
  const d = DE_LEVA;
  // Sagittal projection of a straddle: legs abducted by straddleDeg/2 each
  // shorten in side view. Mass is unchanged; gyration radius scales with the
  // projected length (a documented approximation).
  const proj = Math.cos((straddleDeg / 2) * Math.PI / 180);

  const nb = 7;
  const parent = new Int32Array([-1, 0, 1, 2, 3, 2, 5]);
  const mass = new Float64Array(nb);
  const comX = new Float64Array(nb);
  const comY = new Float64Array(nb);
  const inertia = new Float64Array(nb);
  const anchorX = new Float64Array(nb);
  const anchorY = new Float64Array(nb);

  // --- hand (both hands merged), floating base -----------------------------
  // Origin at the wrist joint center, which sits hw above the floor when the
  // hand lies flat. +x from the heel of the palm toward the fingertips.
  // The usable center-of-pressure patch runs from the heel of the palm
  // (just behind the wrist) to the finger pads.
  const Lh = d.hand.len * H;
  const hw = 0.03 * H;               // wrist center height when palm is flat
  const patchHeelX = -0.01 * H;      // heel of palm, slightly behind wrist
  const patchTipX = 0.85 * Lh;       // finger pads
  {
    const m = 2 * d.hand.m * M;
    mass[0] = m;
    comX[0] = 0.3 * Lh;
    comY[0] = -0.6 * hw;
    inertia[0] = m * (d.hand.k * Lh) ** 2;
  }

  // --- arm: both forearms + both upper arms, elbow locked straight ---------
  // +x from wrist (x=0) to shoulder. Forearm's proximal end is the elbow,
  // upper arm's proximal end is the shoulder, so both CoM fractions are
  // measured from the +x side of their sub-segment.
  const Lfa = d.forearm.len * H, Lua = d.upperArm.len * H;
  const Larm = Lfa + Lua;
  {
    const fore = rodPiece(2 * d.forearm.m * M, 0, Lfa, 1 - d.forearm.com, d.forearm.k);
    const upper = rodPiece(2 * d.upperArm.m * M, Lfa, Larm, 1 - d.upperArm.com, d.upperArm.k);
    const c = compose([fore, upper]);
    mass[1] = c.m; comX[1] = c.cx; comY[1] = c.cy; inertia[1] = c.I;
    anchorX[1] = 0; anchorY[1] = 0;  // wrist joint at hand-frame origin
  }

  // --- torso + head+neck ---------------------------------------------------
  // Origin at the shoulder joint; +x toward the hip. The head+neck extends
  // along -x, i.e. below the shoulders in a handstand.
  const Ltr = d.trunk.len * H, Lhn = d.headNeck.len * H;
  {
    const trunk = rodPiece(d.trunk.m * M, 0, Ltr, d.trunk.com, d.trunk.k);
    const head = rodPiece(d.headNeck.m * M, -Lhn, 0, 1 - d.headNeck.com, d.headNeck.k);
    const c = compose([trunk, head]);
    mass[2] = c.m; comX[2] = c.cx; comY[2] = c.cy; inertia[2] = c.I;
    anchorX[2] = Larm; anchorY[2] = 0;  // shoulder at the arm's distal end
  }

  // --- thighs --------------------------------------------------------------
  const Lth = d.thigh.len * H * proj;
  for (const b of [3, 5]) {
    const p = rodPiece(d.thigh.m * M, 0, Lth, d.thigh.com, d.thigh.k);
    mass[b] = p.m; comX[b] = p.cx; comY[b] = p.cy; inertia[b] = p.I;
    anchorX[b] = Ltr; anchorY[b] = 0;  // hip at the torso's distal end
  }

  // --- shanks with feet folded in ------------------------------------------
  // The foot is lumped as a point mass slightly past the ankle along the
  // shank axis; the push-off contact (ball of foot) sits a little further
  // out. This loses ankle articulation, an accepted v1 simplification.
  const Lsh = d.shank.len * H * proj;
  const footOffset = 0.04 * H;
  const toeX = Lsh + footOffset;
  for (const b of [4, 6]) {
    const shank = rodPiece(d.shank.m * M, 0, Lsh, d.shank.com, d.shank.k);
    const foot = { m: d.foot.m * M, cx: Lsh + 0.5 * footOffset, cy: 0, I: 0 };
    const c = compose([shank, foot]);
    mass[b] = c.m; comX[b] = c.cx; comY[b] = c.cy; inertia[b] = c.I;
    anchorX[b] = Lth; anchorY[b] = 0;  // knee at the thigh's distal end
  }

  return {
    heightM, massKg, straddleDeg, gravity: 9.81,
    nb, nj: nb - 1, nq: nb - 1 + 3, fixedBase: false,
    parent, mass, comX, comY, inertia, anchorX, anchorY,
    names: ['hand', 'arm', 'torso', 'thighL', 'shankL', 'thighR', 'shankR'],
    qNames: ['x', 'y', 'baseAngle', 'wrist', 'shoulder', 'hipL', 'kneeL', 'hipR', 'kneeR'],
    // Rendering polylines in each body frame.
    geometry: [
      [[patchHeelX, -hw], [patchTipX, -hw], [0.4 * Lh, -hw], [0, 0]],
      [[0, 0], [Larm, 0]],
      [[-Lhn, 0], [Ltr, 0]],
      [[0, 0], [Lth, 0]],
      [[0, 0], [toeX, 0]],
      [[0, 0], [Lth, 0]],
      [[0, 0], [toeX, 0]],
    ],
    // Unilateral ground-contact points in body frames.
    contacts: [
      { body: 0, x: patchHeelX, y: -hw, name: 'palmHeel' },
      { body: 0, x: patchTipX, y: -hw, name: 'fingertips' },
      { body: 4, x: toeX, y: 0, name: 'toeL' },
      { body: 6, x: toeX, y: 0, name: 'toeR' },
    ],
    patch: { x0: patchHeelX, x1: patchTipX },
    wristHeight: hw,
    segLen: [Lh, Larm, Ltr + Lhn, Lth, toeX, Lth, toeX],
  };
}

// The stacked-handstand reference configuration for a model.
export function handstandPose(model) {
  const q = new Float64Array(model.nq);
  q[2] = 0;
  q[3] = Math.PI / 2;
  return q;
}
