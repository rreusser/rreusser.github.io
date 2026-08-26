import { buildSilhouette } from './silhouette.js';

// Planar (sagittal) anthropometric model of a handstand: twelve rigid bodies
// rooted at the hand, with the two arms merged into one chain and both hands
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
//    0 hand (floating base)     parent -1
//    1 forearm (wrist->elbow)   parent  0   joint q[3]  wrist
//    2 upperArm (elbow->shldr)  parent  1   joint q[4]  elbow
//    3 chest (shoulder->T12)    parent  2   joint q[5]  shoulder
//    4 pelvis (T12->hip)        parent  3   joint q[6]  spine
//    5 thighL (hip->knee)       parent  4   joint q[7]  hipL
//    6 shankL (knee->ankle)     parent  5   joint q[8]  kneeL
//    7 footL (ankle->toe)       parent  6   joint q[9]  ankleL
//    8 thighR                   parent  4   joint q[10] hipR
//    9 shankR                   parent  8   joint q[11] kneeR
//   10 footR                    parent  9   joint q[12] ankleR
//   11 head+neck                parent  3   joint q[13] neck
//
// The arms are TWO segments hinged at the elbow, and the legs carry a foot
// hinged at the ankle. Both were merged away in the first model, and both
// were load-bearing omissions rather than tidy approximations. A locked
// elbow makes every entry a straight-arm entry: it rules out the bent-arm
// press, it rules out lowering under control, and it hands the wrist and
// shoulder the whole job of absorbing a landing. A foot folded into the shank
// cannot push off -- a kick-up leaves the floor from the ball of the foot,
// through an ankle that plantarflexes, and with that joint welded the entry
// has to be bought entirely with the hip.
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
// q = [x, y, 0, pi/2, 0, ...]: hand flat along +x, arm vertical, torso, legs
// and feet collinear with the arm. The head extends along torso -x (toward
// the floor, as it should in a handstand).
//
// Every joint's zero is therefore the stacked handstand, and that is worth
// stating because it is what makes the two new joints cost nothing to adopt:
// a straight elbow is zero, and a foot in line with the shin -- a pointed
// toe -- is zero. A technique recorded before either joint existed replays as
// itself with both channels held at neutral.
//
// Signs: positive is flexion at the hip, the spine, the neck and the ankle,
// which all fold on the body's front. The knee and the ELBOW are negative,
// because neither folds that way -- the calf folds onto the hamstring behind,
// and the arm, pronated in a handstand with its elbow pits toward the
// fingers, folds toward them.

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

  const nb = 12;
  const B = { hand: 0, forearm: 1, upperArm: 2, chest: 3, pelvis: 4,
    thighL: 5, shankL: 6, footL: 7, thighR: 8, shankR: 9, footR: 10, headNeck: 11 };
  const parent = new Int32Array([-1, 0, 1, 2, 3, 4, 5, 6, 4, 8, 9, 3]);
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
    mass[B.hand] = m;
    comX[B.hand] = 0.3 * Lh;
    comY[B.hand] = -0.6 * hw;
    inertia[B.hand] = m * (d.hand.k * Lh) ** 2;
  }

  // --- arm: both forearms, then both upper arms, hinged at the elbow -------
  // Forearm +x runs from the wrist (x=0) to the elbow; upper arm +x from the
  // elbow to the shoulder. Both run DISTAL to PROXIMAL relative to anatomy,
  // because the chain is rooted at the hand -- so both de Leva CoM fractions,
  // which are measured from the anatomically proximal end, are taken from the
  // far end of our segment: 1 - com.
  const Lfa = d.forearm.len * H, Lua = d.upperArm.len * H;
  const Larm = Lfa + Lua;
  {
    const c = rodPiece(2 * d.forearm.m * M, 0, Lfa, 1 - d.forearm.com, d.forearm.k);
    mass[B.forearm] = c.m; comX[B.forearm] = c.cx; comY[B.forearm] = c.cy;
    inertia[B.forearm] = c.I;
    anchorX[B.forearm] = 0; anchorY[B.forearm] = 0;  // wrist, at the hand origin
  }
  {
    const c = rodPiece(2 * d.upperArm.m * M, 0, Lua, 1 - d.upperArm.com, d.upperArm.k);
    mass[B.upperArm] = c.m; comX[B.upperArm] = c.cx; comY[B.upperArm] = c.cy;
    inertia[B.upperArm] = c.I;
    anchorX[B.upperArm] = Lfa; anchorY[B.upperArm] = 0;  // elbow, forearm's far end
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
    mass[B.chest] = c.m; comX[B.chest] = c.cx; comY[B.chest] = c.cy;
    inertia[B.chest] = c.I;
    anchorX[B.chest] = Lua; anchorY[B.chest] = 0;  // shoulder, upper arm's far end
  }
  {
    const c = rodPiece(d.trunk.m * M * (1 - chestMassFrac), 0, Lpv, 0.5, ROD_K);
    mass[B.pelvis] = c.m; comX[B.pelvis] = c.cx; comY[B.pelvis] = c.cy;
    inertia[B.pelvis] = c.I;
    anchorX[B.pelvis] = Lch; anchorY[B.pelvis] = 0;   // the spine hinge, on the chest
  }
  // --- head + neck ---------------------------------------------------------
  // Extends along -x from the shoulder, i.e. below the shoulders in a
  // handstand, and hinges there.
  {
    const c = rodPiece(d.headNeck.m * M, -Lhn, 0, 1 - d.headNeck.com, d.headNeck.k);
    mass[B.headNeck] = c.m; comX[B.headNeck] = c.cx; comY[B.headNeck] = c.cy;
    inertia[B.headNeck] = c.I;
    anchorX[B.headNeck] = 0; anchorY[B.headNeck] = 0;     // the neck, at the shoulder
  }

  // --- thighs --------------------------------------------------------------
  const Lth = d.thigh.len * H * proj;
  for (const b of [B.thighL, B.thighR]) {
    const p = rodPiece(d.thigh.m * M, 0, Lth, d.thigh.com, d.thigh.k);
    mass[b] = p.m; comX[b] = p.cx; comY[b] = p.cy; inertia[b] = p.I;
    anchorX[b] = Lpv; anchorY[b] = 0;  // hip at the PELVIS's distal end
  }

  // --- shanks --------------------------------------------------------------
  const Lsh = d.shank.len * H * proj;
  for (const b of [B.shankL, B.shankR]) {
    const p = rodPiece(d.shank.m * M, 0, Lsh, d.shank.com, d.shank.k);
    mass[b] = p.m; comX[b] = p.cx; comY[b] = p.cy; inertia[b] = p.I;
    anchorX[b] = Lth; anchorY[b] = 0;  // knee at the thigh's distal end
  }

  // --- feet ----------------------------------------------------------------
  // The foot used to be a point mass folded into the shank with a stub of a
  // toe on the end of it. It is a segment now, hinged at the ankle, and its
  // frame is the one thing here that is not simply "along the limb": +x runs
  // from the ankle to the TIP OF THE POINTED TOE, so that a foot in line with
  // the shin -- the handstand's foot, and the old merged geometry's -- is the
  // ankle at zero.
  //
  // Everything below follows from the table plus two ratios: the ankle sits a
  // quarter of the way along the foot from the heel (Winter's malleolus
  // station), and the ball of the foot -- the metatarsal heads a push-off
  // leaves from -- is at 0.72 of it. Standing, with the sole on the floor and
  // the ankle ankleH above it, that fixes the heel, the ball, the toe and de
  // Leva's centre of mass in the ground plane; rotating that picture into the
  // ankle-to-toe frame is what the numbers here are.
  const Lfoot = d.foot.len * H;      // heel to toe tip, along the sole
  const ankleH = 0.039 * H;          // ankle joint height, standing (Winter)
  const heelBack = 0.25 * Lfoot;     // ankle this far forward of the heel
  const ballFrac = 0.72;             // metatarsal heads, along the sole
  const toeFwd = Lfoot - heelBack;
  const Lft = Math.hypot(toeFwd, ankleH);   // ankle to toe tip: the segment
  // Standing ground-plane offsets from the ankle, rotated into the foot frame
  // (+x toward the toe tip, +y anterior, i.e. the top of the foot).
  const ux = toeFwd / Lft, uy = -ankleH / Lft;
  const toFoot = (x, y) => [x * ux + y * uy, -x * uy + y * ux];
  const heelPt = toFoot(-heelBack, -ankleH);
  const ballPt = toFoot(ballFrac * Lfoot - heelBack, -ankleH);
  const footCom = toFoot(d.foot.com * Lfoot - heelBack, -ankleH);
  for (const b of [B.footL, B.footR]) {
    const m = d.foot.m * M;
    mass[b] = m;
    comX[b] = footCom[0]; comY[b] = footCom[1];
    inertia[b] = m * (d.foot.k * Lfoot) ** 2;
    anchorX[b] = Lsh; anchorY[b] = 0;  // ankle at the shank's distal end
  }

  const armPoly = [[0, 0], [Lfa, 0]];
  const foot = [[heelPt[0], heelPt[1]], [0, 0], [ballPt[0], ballPt[1]], [Lft, 0]];

  // Ground contacts, per body. The SUPPORT set -- the palm, the fingers and
  // the three stations along each sole -- carries no radius, because the body
  // balances on those and a radius would lift the whole figure off the floor.
  // Everything after it is the body colliding with the ground, each carrying
  // the radius of the limb around it, so a fallen body comes to rest ON the
  // floor at its own thickness rather than sinking through it. Those only ever
  // engage after a fall, so they change no verdict; they change what a fall
  // looks like.
  //
  // The feet used to be one point each, on the shank, because that is all a
  // welded ankle can be. A foot that hinges is a foot that can be flat, so it
  // gets the three stations a sagittal foot has: the toe it points and pushes
  // off from, the ball it rolls over, and the heel it stands on.
  const contacts = [
    { body: B.hand, x: patchHeelX, y: -hw, name: 'palmHeel' },
    { body: B.hand, x: patchTipX, y: -hw, name: 'fingertips' },
    { body: B.footL, x: Lft, y: 0, name: 'toeL' },
    { body: B.footR, x: Lft, y: 0, name: 'toeR' },
    { body: B.footL, x: ballPt[0], y: ballPt[1], name: 'ballL' },
    { body: B.footR, x: ballPt[0], y: ballPt[1], name: 'ballR' },
    { body: B.footL, x: heelPt[0], y: heelPt[1], name: 'heelL' },
    { body: B.footR, x: heelPt[0], y: heelPt[1], name: 'heelR' },
    { body: B.forearm, x: Lfa, y: 0, r: 0.030 * H, name: 'elbow' },
    { body: B.headNeck, x: -Lhn * 0.72, y: 0, r: 0.055 * H, name: 'head' },
    { body: B.chest, x: 0, y: 0, r: 0.070 * H, name: 'shoulder' },
    { body: B.chest, x: Lch, y: 0, r: 0.050 * H, name: 'midTrunk' },
    { body: B.pelvis, x: Lpv, y: 0, r: 0.060 * H, name: 'hip' },
    { body: B.thighL, x: 0.5 * Lth, y: 0, r: 0.048 * H, name: 'thighL' },
    { body: B.thighR, x: 0.5 * Lth, y: 0, r: 0.048 * H, name: 'thighR' },
    { body: B.thighL, x: Lth, y: 0, r: 0.032 * H, name: 'kneeL' },
    { body: B.thighR, x: Lth, y: 0, r: 0.032 * H, name: 'kneeR' },
    { body: B.shankL, x: 0.45 * Lsh, y: 0, r: 0.032 * H, name: 'shankL' },
    { body: B.shankR, x: 0.45 * Lsh, y: 0, r: 0.032 * H, name: 'shankR' },
  ];
  const named = (n) => contacts.findIndex((c) => c.name === n);

  return {
    heightM, massKg, straddleDeg, sex, gravity: 9.81,
    nb, nj: nb - 1, nq: nb - 1 + 3, fixedBase: false,
    parent, mass, comX, comY, inertia, anchorX, anchorY,
    bodies: B,
    names: ['hand', 'forearm', 'upperArm', 'chest', 'pelvis',
      'thighL', 'shankL', 'footL', 'thighR', 'shankR', 'footR', 'headNeck'],
    qNames: ['x', 'y', 'baseAngle', 'wrist', 'elbow', 'shoulder', 'spine',
      'hipL', 'kneeL', 'ankleL', 'hipR', 'kneeR', 'ankleR', 'neck'],
    // Rendering polylines in each body frame.
    geometry: [
      [[patchHeelX, -hw], [patchTipX, -hw], [0.4 * Lh, -hw], [0, 0]],
      armPoly,
      [[0, 0], [Lua, 0]],
      [[0, 0], [Lch, 0]],
      [[0, 0], [Lpv, 0]],
      [[0, 0], [Lth, 0]],
      [[0, 0], [Lsh, 0]],
      foot,
      [[0, 0], [Lth, 0]],
      [[0, 0], [Lsh, 0]],
      foot,
      [[-Lhn, 0], [0, 0]],
    ],
    contacts,
    // Which contacts belong to what, so nothing downstream has to know that
    // the hands happen to be 0 and 1. They were read by index in the cost, in
    // the balance loop and in the verdict, and the feet grew from one station
    // each to three; an index that has to be right in five files is an index
    // that will be wrong in one.
    handContacts: [named('palmHeel'), named('fingertips')],
    footContacts: [
      [named('toeL'), named('ballL'), named('heelL')],
      [named('toeR'), named('ballR'), named('heelR')],
    ],
    // The station each leg is placed by when a scenario stands it up, and the
    // one a technique's "feet left the floor" is measured at.
    toeContacts: [named('toeL'), named('toeR')],
    // Closed body outlines for rendering only; see silhouette.js.
    outline: buildSilhouette({
      H, sex, Lh, hw, patchHeelX, patchTipX, Lfa, Lua, Larm, Lhn, Ltr, Lch, Lpv,
      Lth, Lsh, Lft, Lfoot, heelPt, ballPt,
    }),
    patch: { x0: patchHeelX, x1: patchTipX },
    wristHeight: hw,
    segLen: [Lh, Lfa, Lua, Lch, Lpv, Lth, Lsh, Lft, Lth, Lsh, Lft, Lhn],
    trunkSplit: { chest: Lch, pelvis: Lpv, headNeck: Lhn },
    footGeom: { Lft, Lfoot, heelPt, ballPt, ankleH },
  };
}

// The stacked-handstand reference configuration for a model.
export function handstandPose(model) {
  const q = new Float64Array(model.nq);
  q[2] = 0;
  q[3] = Math.PI / 2;
  return q;
}
