import { buildSilhouette } from './silhouette.js';

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
//   1 arm (wrist->shoulder)  parent  0   joint q[3]  wrist
//   2 chest (shoulder->T12)  parent  1   joint q[4]  shoulder
//   3 pelvis (T12->hip)      parent  2   joint q[5]  spine
//   4 thighL (hip->knee)     parent  3   joint q[6]  hipL
//   5 shankL+foot (knee->)   parent  4   joint q[7]  kneeL
//   6 thighR                 parent  3   joint q[8]  hipR
//   7 shankR+foot            parent  6   joint q[9]  kneeR
//   8 head+neck              parent  2   joint q[10] neck
//
// The trunk is TWO segments hinged at roughly the thoracolumbar junction,
// because the hollow body is the shape a handstand is made of and a rigid
// spine cannot make it. One hinge low in the trunk is the right single-joint
// approximation: hollowing is dominated by lumbar flexion and posterior
// pelvic tilt, so a hinge there lets the pelvis tuck under while the ribcage
// stays stacked over the shoulders. A hinge higher up would model thoracic
// kyphosis, which is a different shape and not the one being asked for.
//
// The head is its own segment off the chest for the same kind of reason: in a
// handstand the head is a real control -- looking toward the hands or tucking
// the chin moves eight per cent of body mass on a long lever -- and lumping
// it into the trunk made that unavailable. Body order puts it last because
// the dynamics requires parent[i] < i and the legs have to follow the pelvis.
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

// de Leva (1996) female table. Mass fractions, CoM positions and radii of
// gyration are the published female values; the LENGTH fractions are
// deliberately left at the male/Winter numbers so that switching sex changes
// how the mass is distributed rather than how tall the segments are. Two
// bodies of the same stature are then directly comparable, which is the
// comparison worth making here: relative to men, women carry more of their
// mass in the thighs and shanks (14.78 + 4.81 percent versus 14.16 + 4.33)
// and less in the trunk, and in a handstand the legs are the far end of the
// lever.
export const DE_LEVA_FEMALE = {
  headNeck: { len: DE_LEVA.headNeck.len, m: 0.0668, com: 0.4841, k: 0.271 },
  trunk:    { len: DE_LEVA.trunk.len,    m: 0.4257, com: 0.4151, k: 0.357 },
  upperArm: { len: DE_LEVA.upperArm.len, m: 0.0255, com: 0.5754, k: 0.278 },
  forearm:  { len: DE_LEVA.forearm.len,  m: 0.0138, com: 0.4559, k: 0.261 },
  hand:     { len: DE_LEVA.hand.len,     m: 0.0056, com: 0.7474, k: 0.30  },
  thigh:    { len: DE_LEVA.thigh.len,    m: 0.1478, com: 0.3612, k: 0.369 },
  shank:    { len: DE_LEVA.shank.len,    m: 0.0481, com: 0.4416, k: 0.271 },
  foot:     { len: DE_LEVA.foot.len,     m: 0.0129, com: 0.4014, k: 0.299 },
};

export const SEGMENT_TABLES = { male: DE_LEVA, female: DE_LEVA_FEMALE };

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

export function buildModel({ heightM = 1.75, massKg = 70, straddleDeg = 0, sex = 'male' } = {}) {
  const H = heightM, M = massKg;
  const d = SEGMENT_TABLES[sex] || DE_LEVA;
  // Sagittal projection of a straddle: legs abducted by straddleDeg/2 each
  // shorten in side view. Mass is unchanged; gyration radius scales with the
  // projected length (a documented approximation).
  const proj = Math.cos((straddleDeg / 2) * Math.PI / 180);

  const nb = 9;
  const parent = new Int32Array([-1, 0, 1, 2, 3, 4, 3, 6, 2]);
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

  // --- trunk, in two pieces, hinged at the thoracolumbar junction ----------
  // CHEST_FRAC of the shoulder-to-hip distance is chest; the rest is the
  // lumbar segment and pelvis. 0.55 puts the hinge at roughly T12/L1.
  //
  // The mass split is DERIVED, not chosen: each piece is a uniform rod, so
  // the split that reproduces de Leva's whole-trunk centre of mass when the
  // spine is straight is
  //
  //     com = a*(c/2) + (1-a)*((1+c)/2)   =>   a = (1 + c) - 2*com
  //
  // for chest length fraction c and chest mass fraction a. It comes out
  // chest-heavy, which is the right sign -- the thorax is denser than the
  // abdomen -- but the number is the table's, not mine, so it follows the
  // male and female tables apart on its own. Guessing 0.58 instead dropped
  // the stacked handstand's centre of mass by 4.5 cm, which is a different
  // body, not a jointed one.
  //
  // Each piece then carries a uniform rod's radius of gyration about its own
  // centre, 1/sqrt(12). The composed inertia does not match the original's
  // single number for the whole column, and cannot: a trunk that bends is
  // not the rigid one, which is the entire point of the change.
  const Ltr = d.trunk.len * H, Lhn = d.headNeck.len * H;
  const CHEST_FRAC = 0.55;
  const chestMassFrac = (1 + CHEST_FRAC) - 2 * d.trunk.com;
  const ROD_K = 1 / Math.sqrt(12);
  const Lch = CHEST_FRAC * Ltr, Lpv = Ltr - Lch;
  {
    const c = rodPiece(d.trunk.m * M * chestMassFrac, 0, Lch, 0.5, ROD_K);
    mass[2] = c.m; comX[2] = c.cx; comY[2] = c.cy; inertia[2] = c.I;
    anchorX[2] = Larm; anchorY[2] = 0;  // shoulder at the arm's distal end
  }
  {
    const c = rodPiece(d.trunk.m * M * (1 - chestMassFrac), 0, Lpv, 0.5, ROD_K);
    mass[3] = c.m; comX[3] = c.cx; comY[3] = c.cy; inertia[3] = c.I;
    anchorX[3] = Lch; anchorY[3] = 0;   // the spine hinge, on the chest
  }
  // --- head + neck ---------------------------------------------------------
  // Extends along -x from the shoulder, i.e. below the shoulders in a
  // handstand, and hinges there.
  {
    const c = rodPiece(d.headNeck.m * M, -Lhn, 0, 1 - d.headNeck.com, d.headNeck.k);
    mass[8] = c.m; comX[8] = c.cx; comY[8] = c.cy; inertia[8] = c.I;
    anchorX[8] = 0; anchorY[8] = 0;     // the neck, at the shoulder
  }

  // --- thighs --------------------------------------------------------------
  const Lth = d.thigh.len * H * proj;
  for (const b of [4, 6]) {
    const p = rodPiece(d.thigh.m * M, 0, Lth, d.thigh.com, d.thigh.k);
    mass[b] = p.m; comX[b] = p.cx; comY[b] = p.cy; inertia[b] = p.I;
    anchorX[b] = Lpv; anchorY[b] = 0;  // hip at the PELVIS's distal end
  }

  // --- shanks with feet folded in ------------------------------------------
  // The foot is lumped as a point mass slightly past the ankle along the
  // shank axis; the push-off contact (ball of foot) sits a little further
  // out. This loses ankle articulation, an accepted v1 simplification.
  const Lsh = d.shank.len * H * proj;
  const footOffset = 0.04 * H;
  const toeX = Lsh + footOffset;
  for (const b of [5, 7]) {
    const shank = rodPiece(d.shank.m * M, 0, Lsh, d.shank.com, d.shank.k);
    const foot = { m: d.foot.m * M, cx: Lsh + 0.5 * footOffset, cy: 0, I: 0 };
    const c = compose([shank, foot]);
    mass[b] = c.m; comX[b] = c.cx; comY[b] = c.cy; inertia[b] = c.I;
    anchorX[b] = Lth; anchorY[b] = 0;  // knee at the thigh's distal end
  }

  return {
    heightM, massKg, straddleDeg, sex, gravity: 9.81,
    nb, nj: nb - 1, nq: nb - 1 + 3, fixedBase: false,
    parent, mass, comX, comY, inertia, anchorX, anchorY,
    names: ['hand', 'arm', 'chest', 'pelvis', 'thighL', 'shankL', 'thighR', 'shankR', 'headNeck'],
    qNames: ['x', 'y', 'baseAngle', 'wrist', 'shoulder', 'spine',
      'hipL', 'kneeL', 'hipR', 'kneeR', 'neck'],
    // Rendering polylines in each body frame.
    geometry: [
      [[patchHeelX, -hw], [patchTipX, -hw], [0.4 * Lh, -hw], [0, 0]],
      [[0, 0], [Larm, 0]],
      [[0, 0], [Lch, 0]],
      [[0, 0], [Lpv, 0]],
      [[0, 0], [Lth, 0]],
      [[0, 0], [toeX, 0]],
      [[0, 0], [Lth, 0]],
      [[0, 0], [toeX, 0]],
      [[-Lhn, 0], [0, 0]],
    ],
    // Unilateral ground-contact points in body frames. The first four are
    // the support -- palm heel, finger pads, both toes -- and carry no
    // radius, because the model balances on them and a radius would lift the
    // whole body off the floor.
    //
    // The rest are the body colliding with the ground. Without them a
    // toppled figure has nothing to land on and sinks straight through the
    // floor, which reads as a rendering fault rather than a fall. Each
    // carries the radius of the limb around it, so a fallen body comes to
    // rest ON the floor at its own thickness. They only ever engage after a
    // fall, so they change no verdict; they change what a fall looks like.
    contacts: [
      { body: 0, x: patchHeelX, y: -hw, name: 'palmHeel' },
      { body: 0, x: patchTipX, y: -hw, name: 'fingertips' },
      { body: 5, x: toeX, y: 0, name: 'toeL' },
      { body: 7, x: toeX, y: 0, name: 'toeR' },
      { body: 1, x: Lfa, y: 0, r: 0.030 * H, name: 'elbow' },
      { body: 8, x: -Lhn * 0.72, y: 0, r: 0.055 * H, name: 'head' },
      { body: 2, x: 0, y: 0, r: 0.070 * H, name: 'shoulder' },
      { body: 2, x: Lch, y: 0, r: 0.050 * H, name: 'midTrunk' },
      { body: 3, x: Lpv, y: 0, r: 0.060 * H, name: 'hip' },
      { body: 4, x: 0.5 * Lth, y: 0, r: 0.048 * H, name: 'thighL' },
      { body: 6, x: 0.5 * Lth, y: 0, r: 0.048 * H, name: 'thighR' },
      { body: 4, x: Lth, y: 0, r: 0.032 * H, name: 'kneeL' },
      { body: 6, x: Lth, y: 0, r: 0.032 * H, name: 'kneeR' },
      { body: 5, x: 0.45 * Lsh, y: 0, r: 0.032 * H, name: 'shankL' },
      { body: 7, x: 0.45 * Lsh, y: 0, r: 0.032 * H, name: 'shankR' },
    ],
    // Closed body outlines for rendering only; see silhouette.js.
    outline: buildSilhouette({
      H, sex, Lh, hw, patchHeelX, patchTipX, Lfa, Larm, Lhn, Ltr, Lch, Lpv, Lth, Lsh, toeX,
    }),
    patch: { x0: patchHeelX, x1: patchTipX },
    wristHeight: hw,
    segLen: [Lh, Larm, Lch, Lpv, Lth, toeX, Lth, toeX, Lhn],
    trunkSplit: { chest: Lch, pelvis: Lpv, headNeck: Lhn },
  };
}

// The stacked-handstand reference configuration for a model.
export function handstandPose(model) {
  const q = new Float64Array(model.nq);
  q[2] = 0;
  q[3] = Math.PI / 2;
  return q;
}
