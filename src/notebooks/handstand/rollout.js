// Scenario construction and rollout for the dynamic phases. A scenario is an
// initial state (hands always planted; feet placed by solving toe-ground
// contact) plus a reference trajectory as spline knots for the six actuated
// joints. M2 uses hand-authored references for demonstration; the trajectory
// optimizer replaces the knots in M3.

import { fk, momenta } from './dynamics.js';
import {
  groundHand, solveWristForCom, romPenalty, clampPose, hipFlexMaxDeg, ROM_DEFAULTS,
  wristQ3LimitsDeg, jointLimits,
} from './statics.js';
import { createContacts } from './contact.js';
import { createJointStops } from './joint-stops.js';
import { simulate, DEFAULT_DT } from './integrate.js';
import { createServo, createBalanceControl, knotTimes, evenlySpaced, JOINT_ORDER, LEGACY_JOINT_ORDER, jointOrderFor, widenKnots, widenQ } from './control.js';
import { availableTorque } from './strength.js';
import { cmaes, mulberry32 } from './cma-es.js';

const D2R = Math.PI / 180;

// The toe contact of a foot. By NAME through the model's own index, not "the
// first contact that happens to sit on this body": a foot has three stations
// -- toe, ball, heel -- across two bodies, and picking the first would have
// every scenario stand the body up on whichever one the contact list happened
// to list first.
function toeContact(model, side) {
  const i = model.toeContacts[side];
  if (i == null) throw new Error(`foot ${side} carries no toe contact`);
  return model.contacts[i];
}

// World y of the LOWEST ground station on a foot. This was the toe, because a
// foot welded to a shank has only a toe; a foot that hinges is placed by
// whichever part of it reaches the floor first, which is the heel in a squat
// and the ball on the way out of one. `side` is 0 or 1, and it scans BOTH
// bodies that foot is made of -- the foot proper and the toe hinged off it.
function toeY(model, ws, q, side) {
  fk(model, q, null, ws);
  let y = Infinity;
  for (const b of model.footBodies[side]) {
    const c = Math.cos(ws.th[b]), s = Math.sin(ws.th[b]);
    for (const cpt of model.contacts) {
      if (cpt.body !== b) continue;
      y = Math.min(y, ws.py[b] + s * cpt.x + c * cpt.y);
    }
  }
  return y;
}

// The ankle angle that lays a foot's sole flat on the floor.
//
// The sole is the heel-to-toe line, which is a fixed direction in the foot's
// own frame; laying it flat means cancelling the shank's world angle with the
// ankle, and there are always two ways to do that a half turn apart -- sole
// down and sole up. Only one of them is an ankle, so the one inside the range
// of motion wins, and if neither is, the nearer is clamped.
//
// This is what a start pose standing on its feet is. Solved for the toe alone,
// as the welded-ankle model necessarily was, a pike stand balances on the tip
// of a pointed foot: a releve nobody holds a press from.
export function flatFootAnkle(model, ws, q, side, rom) {
  const body = side === 'L' ? BODY.footL : BODY.footR;
  const leg = side === 'L' ? 0 : 1;
  const ankle = side === 'L' ? QI.ankleL : QI.ankleR;
  const { heelPt, Lft } = model.footGeom;
  // The sole's direction in the foot frame, heel toward toe.
  const sole = Math.atan2(-heelPt[1], Lft - heelPt[0]);
  fk(model, q, null, ws);
  // The shank's world angle is this foot's parent's, which is what the ankle
  // is measured against.
  const parentTh = ws.th[body] - q[ankle];
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const { lo, hi } = jointLimits(rom, q, ankle);
  const cands = [wrap(-sole - parentTh), wrap(Math.PI - sole - parentTh)];
  const inside = cands.filter((a) => a >= lo && a <= hi);
  const pick = inside.length
    ? inside[0]
    : cands.reduce((best, a) => {
      const d = Math.max(lo - a, a - hi, 0);
      return d < best.d ? { a, d } : best;
    }, { a: cands[0], d: Infinity }).a;
  q[ankle] = Math.min(Math.max(pick, lo), hi);
  return q[ankle];
}

// Toe position along the floor, measured from the hand the way comX is.
function toeXLocal(model, ws, q, side) {
  fk(model, q, null, ws);
  const cpt = toeContact(model, side);
  const b = cpt.body;
  const c = Math.cos(ws.th[b]), s = Math.sin(ws.th[b]);
  return ws.px[b] + c * cpt.x - s * cpt.y - q[0];
}

// Bisect one hip angle so that leg's toe lands on the floor. Hip flexion
// rotates the leg toward the belly side and downward from the inverted
// stack, so toe height decreases monotonically with hip flexion here.
function solveHipForToeDown(model, ws, q, side) {
  // By name, like clearFeet beside it. Written as raw indices these were the
  // SIX-joint body's numbering, so once the trunk gained a hinge the 'R'
  // solve wrote the stance hip angle into the left KNEE (old 7 = hipR, new
  // 7 = kneeL) and left the stance hip at zero. The lunge start then began
  // with a knee folded 175 degrees the wrong way, and the servo unwinding it
  // launched the body off the floor.
  const hip = side === 'L' ? QI.hipL : QI.hipR;
  const leg = side === 'L' ? 0 : 1;
  let lo = 0 * D2R, hi = 175 * D2R;
  if (toeY(model, ws, withQ(q, hip, hi), leg) > 0) return NaN;
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi);
    if (toeY(model, ws, withQ(q, hip, mid), leg) > 0) lo = mid; else hi = mid;
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
function solveWristForToeDown(model, ws, q, side, loDeg = 35, hiDeg = 115) {
  const lo0 = loDeg * D2R, hi0 = hiDeg * D2R;
  const at = (w) => { q[3] = w; return toeY(model, ws, q, side); };
  if (at(lo0) < 0) { q[3] = lo0; return q[3]; }
  // Toe height is NOT monotone in the wrist angle. Leaning back rotates the
  // whole body about the palm, which swings the toe down and then, past the
  // turning point, back up again -- so a bracket wide enough to reach the
  // far side reads as "even fully rotated the toe floats" at its top end and
  // the solve returns the fully-rotated pose. Scan for the FIRST crossing
  // rather than trusting the endpoints. Widening the wrist's lower extension
  // bound from 92 to 70 degrees moved hi from 88 to 110, far enough past the
  // turning point that the pike start with flexible hamstrings stopped being
  // a deep fold and became a seated collapse, with the centre of mass a third
  // of a metre behind the palm.
  const N = 64;
  let lo = lo0, hi = NaN;
  for (let i = 1; i <= N; i++) {
    const w = lo0 + (hi0 - lo0) * (i / N);
    if (at(w) <= 0) { hi = w; break; }
    lo = w;
  }
  if (Number.isNaN(hi)) { q[3] = hi0; return q[3]; }   // the toe never comes down
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
function clampToRom(q, rom) { clampPose(q, rom); return q; }

// The same guarantee for a start that is NOT standing on its hands: nothing
// may begin below the floor. A grounded start is repaired by unfolding the
// hip, because where the body stands is not up for discussion -- the palm is
// on the floor at the origin. A free one has somewhere else to go, so it goes
// there: the whole body rises until its lowest point is on the floor, which
// changes the pose not at all. Only ever upward, so a technique that means to
// begin in the air keeps its height.
function liftClear(model, ws, q, minY = 5e-4) {
  fk(model, q, null, ws);
  let low = Infinity;
  for (const cpt of model.contacts) {
    const b = cpt.body, c = Math.cos(ws.th[b]), sn = Math.sin(ws.th[b]);
    low = Math.min(low, ws.py[b] + sn * cpt.x + c * cpt.y - (cpt.r || 0));
  }
  if (Number.isFinite(low) && low < minY) q[1] += minY - low;
  return q;
}

// Lift a foot out of the floor -- with the ANKLE first, and the hip only when
// the ankle cannot reach.
//
// A start pose that begins with a foot through the floor is a contact
// explosion, and not a small one: measured on the press, three centimetres of
// penetration puts 34 times body weight through the contact in the first
// fiftieth of a second and the technique that arrived without it falls. So
// something has to give.
//
// What used to give was the HIP, and that is the wrong joint. A hip unfolds
// the whole leg, so the repair was enormous -- dragging the SHOULDER ten
// degrees rotates the body over the palm, dips a foot, and unfolded a hip
// nobody had touched by up to twenty-eight degrees. From the editor that is
// a pose snapping to somewhere you did not put it, in a joint you were not
// holding, every time you let go.
//
// The ankle is the joint that actually decides where a sole sits, it is a
// fifth of a metre long so it has plenty of authority, and it is the one
// nobody has an opinion about in a start pose. It is also what a person uses:
// you do not unfold your hip to get your foot flat. Chosen as the angle
// NEAREST the one already there that clears the floor, so the repair is the
// smallest one that works rather than the first one found.
function clearFeet(model, ws, q, minY = 5e-4, rom = ROM_DEFAULTS) {
  for (const side of ['L', 'R']) {
    const hip = side === 'L' ? QI.hipL : QI.hipR;
    const ankle = side === 'L' ? QI.ankleL : QI.ankleR;
    const leg = side === 'L' ? 0 : 1;
    // Genuine penetration, not merely "not clear enough". minY is the
    // clearance this aims FOR, and triggering on it meant a foot the scenario
    // had just solved to rest exactly on the floor read as a foot through it --
    // so the repair fired on a correct pose and rolled a deliberately flat foot
    // onto its toe tip. A contact at zero carries zero force; there is nothing
    // to repair.
    if (toeY(model, ws, q, leg) >= 0) continue;

    // The ankle, if it can. Scanned rather than solved: the lowest station on
    // a foot changes identity as it rotates -- heel, then ball, then toe --
    // and the height of a minimum over three points is not smooth where they
    // swap, so a bisection would happily converge on the wrong branch.
    const a0 = q[ankle];
    const { lo: aLo, hi: aHi } = jointLimits(rom, q, ankle);
    const N = 360;
    let best = null;
    for (let i = 0; i <= N; i++) {
      const a = aLo + (aHi - aLo) * (i / N);
      const y = toeY(model, ws, withQ(q, ankle, a), leg);
      if (y < minY) continue;
      const d = Math.abs(a - a0);
      if (!best || d < best.d) best = { a, d };
    }
    if (best) { q[ankle] = best.a; continue; }
    q[ankle] = a0;

    // The ankle ran out of range, so the leg itself has to move. Rare now, and
    // it means the pose really does put that foot under the floor.
    let hi = q[hip], lo = q[hip] - 40 * D2R;
    if (toeY(model, ws, withQ(q, hip, lo), leg) < minY) { q[hip] = lo; continue; }
    for (let i = 0; i < 40; i++) {
      const mid = 0.5 * (lo + hi);
      if (toeY(model, ws, withQ(q, hip, mid), leg) < minY) hi = mid; else lo = mid;
    }
    q[hip] = lo;
  }
  return q;
}

// Seating a hand-authored start pose: what the body actually begins in, given
// what it was ASKED to begin in.
//
// A start pose is not free. It has to be a pose this body can hold -- so it is
// clamped into the range of motion -- and it must not begin inside the floor,
// because a contact point below the ground is a penalty spring firing an
// enormous impulse at t = 0. Measured on the press, three centimetres of
// penetration puts 34 times body weight through the contact in the first
// fiftieth of a second, and a technique that arrived without it falls. So the
// seating is not a courtesy; it is what makes a start pose runnable.
//
// It lives here, exported, because the EDITOR has to draw the same pose the
// rollout will run. It used to draw the authored pose while a handle was held
// and the seated one the rest of the time, on the theory that the hand should
// not be fought mid-gesture -- but those two poses differ by however much the
// seating had to do, and with a start sitting six centimetres under the floor
// that is a hip unfolded by twenty degrees. Every press and release of every
// handle, the neck's included, snapped the legs to somewhere nobody had put
// them and back again. One pose, drawn always.
// Lay the toes along the floor.
//
// The ball of the foot is PASSIVE -- it has a stiffness and it does whatever
// the ground tells it -- so during a rollout it finds its own angle and nothing
// here needs to help. A start pose is the exception: the body has to BEGIN at
// rest, and a rigid straight toe on a foot whose ball is already down means
// starting with the toe either through the floor or propping the whole body up
// on its tip. Either one is a spring compressed at t = 0.
//
// So the toe is rolled onto the floor the way the ground would roll it: for a
// foot that is on the ground, the angle nearest straight that puts its tip on
// the floor; for a foot in the air, straight. Within the range of motion, so a
// foot planted somewhere a toe cannot reach simply keeps the toe it has.
function layToes(model, ws, q, rom, onFloor = 0.02) {
  for (let side = 0; side < 2; side++) {
    const jq = 3 + JOINT_KEYS.length + side;
    q[jq] = 0;
    const ball = model.contacts[model.footContacts[side][1]];
    fk(model, q, null, ws);
    const b = ball.body, cb = Math.cos(ws.th[b]), sb = Math.sin(ws.th[b]);
    if (ws.py[b] + sb * ball.x + cb * ball.y > onFloor) continue;
    const tip = model.contacts[model.toeContacts[side]];
    const { lo, hi } = jointLimits(rom, q, jq);
    let best = null;
    for (let i = 0; i <= 360; i++) {
      const a = lo + (hi - lo) * (i / 360);
      q[jq] = a;
      fk(model, q, null, ws);
      const t = tip.body, ct = Math.cos(ws.th[t]), st = Math.sin(ws.th[t]);
      const y = ws.py[t] + st * tip.x + ct * tip.y;
      if (y < 0) continue;
      const d = Math.abs(a);
      if (!best || y < best.y - 1e-6 || (y < best.y + 1e-6 && d < best.d)) best = { a, y, d };
    }
    q[jq] = best ? best.a : 0;
  }
  return q;
}

export function seatStart(model, ws, q0, rom = ROM_DEFAULTS, grounded = true) {
  // Widened here, at the boundary, for the same reason the KNOTS are widened
  // in runScenario: a start pose arrives from presets, recorded artifacts,
  // saved files and gates, and one written for a body with fewer joints is a
  // pose of this body with those joints at neutral. Taken at its own length it
  // leaves the tail of q undefined, and undefined is NaN one multiply later.
  const q = clampToRom(widenQ(q0, model.nq), rom);
  // Free: the base IS the pose. Nothing is grounded and no joint is bent to
  // clear the floor; the body is simply raised if it began inside it.
  if (!grounded) return layToes(model, ws, liftClear(model, ws, q), rom);
  groundHand(model, q);
  if (lowestOffHand(model, ws, q) >= 5e-4) return layToes(model, ws, q, rom);

  // Something is through the floor, and on a grounded start something has to
  // give: the palm is pinned at the origin and the feet may not be underground,
  // which is two constraints on one pose. The question is only WHICH joint pays.
  //
  // It used to be the hip, and the hip is the worst answer available. A hip
  // unfolds the whole leg, so rotating the body ten degrees over the palm --
  // which is what dragging the wrist, the elbow or the shoulder does -- dipped
  // a foot and unfolded a hip nobody had touched by up to thirty degrees. From
  // the editor that is the shape of the movement changing in a joint you were
  // not holding.
  //
  // The LEAN pays instead: the wrist is the whole-body rotation about the
  // planted palm, so moving it changes no relative angle anywhere in the body.
  // The shape you authored is preserved exactly and the only thing that
  // changes is how far over your hands it stands -- which is the thing the
  // floor is actually objecting to. It is also what every scenario solver
  // already does when it builds a start from nothing.
  //
  // Scanned for the lean NEAREST the one asked for, so the correction is the
  // smallest that works. When no lean clears it -- the body is simply too long
  // for the room at that shape -- the whole body rises instead, which
  // preserves every joint including the lean and lifts the palm off the floor.
  // That last case is worth seeing rather than hiding: it says this pose
  // cannot be held with the hands down.
  const jq = QI.wrist;
  const w0 = q[jq];
  const { lo, hi } = jointLimits(rom, q, jq);
  let best = null;
  for (let i = 0; i <= 360; i++) {
    q[jq] = lo + (hi - lo) * (i / 360);
    if (lowestOffHand(model, ws, q) < 5e-4) continue;
    const d = Math.abs(q[jq] - w0);
    if (!best || d < best.d) best = { w: q[jq], d };
  }
  q[jq] = best ? best.w : w0;
  return layToes(model, ws, best ? q : liftClear(model, ws, q), rom);
}

// The lowest ground station on the body, EXCLUDING the hand's own. groundHand
// puts the palm exactly on the floor by construction, so it reads as zero --
// or a rounding error's worth below it -- for every pose, and a clearance test
// that counts it concludes that nothing ever clears anything.
function lowestOffHand(model, ws, q) {
  fk(model, q, null, ws);
  let y = Infinity;
  for (const c of model.contacts) {
    if (c.body === model.bodies.hand) continue;
    const b = c.body, cs = Math.cos(ws.th[b]), sn = Math.sin(ws.th[b]);
    y = Math.min(y, ws.py[b] + sn * c.x + cs * c.y - (c.r || 0));
  }
  return y;
}

// Scenario starts, constructed from the flexibility model rather than
// contortionist geometry: the fold is capped by the hamstring limit (with
// the knee coupling where knees bend) and the lean is then solved so the
// toes actually reach the floor. A stiffer person therefore starts with
// feet further from the hands and less weight over the palms, which is
// exactly how limited flexibility taxes an entry in reality.
// Knee bend the bent-leg press starts from. Deep, because the start has to be
// COMPACT: the hop has to carry the centre of mass forward onto the hands and
// up into the inverted tuck, and how far it has to travel is set by where the
// feet are. At 40 degrees of knee the legs are long and the feet stand 0.75 m
// behind the hands with the centre of mass 0.24 m behind them; at 90 the same
// body is folded into a squat with the feet 0.46 m back and the centre of
// mass 0.13 m back. The first is a downward dog and the hop cannot reach the
// stack from it -- every search from that start leaned out over the
// fingertips into a tucked planche instead, which is the expensive shape.
export const TUCK_KNEE_DEG = 90;

// Where the centre of mass sits at the start, as a fraction of the way from
// the palm to the toes -- which is the same thing as the share of body weight
// standing on the legs. A bent-leg press is entered by hopping off both feet,
// so the feet have to be carrying something to push with.
export const TUCK_LOAD_FRAC = 0.35;

export function scenarioStart(model, ws, name, rom = ROM_DEFAULTS, opts = {}) {
  // Where the bent-leg press stands, as recorded plant rather than as a
  // constant: the shape of a start pose decides what technique is reachable
  // from it, so an artifact has to replay against the start it was made on.
  const tuckLoadFrac = opts.tuckLoadFrac ?? PLANT_DEFAULTS.tuckLoadFrac;
  const tuckKneeDeg = opts.tuckKneeDeg ?? PLANT_DEFAULTS.tuckKneeDeg;
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
      q[QI.hipL] = q[QI.hipR] = Math.min(hipFlexMaxDeg(rom, 0), 130) * D2R;
      q[QI.kneeL] = q[QI.kneeR] = 0;
      const targetX = model.patch.x0 + HANDSTAND_TARGET_FRAC * (model.patch.x1 - model.patch.x0);
      // The feet are FLAT: a pike stand is a fold over two feet on the floor,
      // not a releve. Solved inside the lean loop rather than once at the end,
      // because the ankle that lays a sole flat depends on where the shank
      // ends up and the shank is what the loop is moving.
      const comAt = (sh) => {
        q[QI.shoulder] = sh;
        for (let i = 0; i < 2; i++) {
          solveWristForToeDown(model, ws, q, 0, 35, Math.min(115, wristQ3LimitsDeg(rom).hi));
          flatFootAnkle(model, ws, q, 'L', rom);
          flatFootAnkle(model, ws, q, 'R', rom);
        }
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
      clearFeet(model, ws, q, 5e-4, rom);
      return { q0: q, qd0: null };
    }
    case 'tuck': {
      // Bent-leg press start: a deep squat-fold, hands flat on the floor,
      // knees slightly bent, and the WEIGHT STILL ON THE FEET.
      //
      // That last part is the whole difference from the pike start, and it is
      // what makes this a different skill rather than the same one with bent
      // knees. A press starts balanced over the palms, so the legs have
      // nothing to push against and the shoulders lift the whole body from a
      // dead stop. A bent-leg press is entered by hopping off both slightly
      // bent legs into the inverted shape and then extending the legs
      // overhead together -- which requires load under the feet at t = 0.
      // Started over the palms instead, the search has no legs to use and
      // finds the only other way to get some: fold, settle back down onto the
      // floor, and jump off it.
      //
      // So the shoulder lean is solved to put the centre of mass
      // TUCK_LOAD_FRAC of the way from the palm to the toes, with the wrist
      // following to keep the toes down: about half the body weight standing
      // on the legs, which is what a person in this position feels.
      q[QI.kneeL] = q[QI.kneeR] = -tuckKneeDeg * D2R;
      q[QI.hipL] = q[QI.hipR] = Math.min(hipFlexMaxDeg(rom, tuckKneeDeg), 140) * D2R;
      // Measured from the palm target, the point the balanced handstand puts
      // its centre of mass over, so a load fraction of zero is exactly the
      // old start: balanced over the palm with nothing on the legs.
      const palmT = model.patch.x0 + HANDSTAND_TARGET_FRAC * (model.patch.x1 - model.patch.x0);
      const errAt = (sh) => {
        q[QI.shoulder] = sh;
        for (let i = 0; i < 2; i++) {
          solveWristForToeDown(model, ws, q, 0, 35, Math.min(115, wristQ3LimitsDeg(rom).hi));
          flatFootAnkle(model, ws, q, 'L', rom);
          flatFootAnkle(model, ws, q, 'R', rom);
        }
        const toe = toeXLocal(model, ws, q, 0);
        const com = momenta(model, q, zeroQd9, ws).comX - q[0];
        return com - (palmT + tuckLoadFrac * (toe - palmT));
      };
      // Scan for the first sign change rather than trusting the endpoints:
      // both the centre of mass AND the target move with the lean, so the
      // error is not monotone across the whole shoulder range.
      const shLo = 55 * D2R, shHi = Math.min(rom.shoulderCloseMaxDeg, 110) * D2R;
      const N = 48;
      let best = shLo, bestAbs = Infinity, prev = null, bracket = null;
      for (let i = 0; i <= N; i++) {
        const sh = shLo + (shHi - shLo) * (i / N);
        const e = errAt(sh);
        if (Math.abs(e) < bestAbs) { bestAbs = Math.abs(e); best = sh; }
        if (prev && prev.e * e <= 0) { bracket = [prev.sh, sh]; break; }
        prev = { sh, e };
      }
      if (bracket) {
        let [a, b] = bracket;
        const ea = errAt(a);
        for (let i = 0; i < 40; i++) {
          const mid = 0.5 * (a + b);
          if (errAt(mid) * ea > 0) a = mid; else b = mid;
        }
        errAt(0.5 * (a + b));
      } else {
        errAt(best);
      }
      clampPose(q, rom);
      clearFeet(model, ws, q, 5e-4, rom);
      return { q0: q, qd0: null };
    }
    case 'lunge': {
      // Kick-up lunge: torso hinged down over the hands, stance knee bent
      // (buying hip range through the hamstring coupling), stance toe on the
      // floor, swing leg extended low behind with its toe just off the
      // ground rather than floating above the hands.
      q[3] = Math.min(65, wristQ3LimitsDeg(rom).hi) * D2R;
      q[QI.shoulder] = 90 * D2R;
      q[QI.kneeR] = -50 * D2R;             // stance knee bent
      // Stance foot flat and hip re-solved against it; the swing foot stays
      // pointed, which is what a leg trailing in the air does and what its
      // zero already says.
      for (let i = 0; i < 2; i++) {
        solveHipForToeDown(model, ws, q, 'R');
        flatFootAnkle(model, ws, q, 'R', rom);
      }
      q[QI.kneeL] = 0;                     // swing leg straight
      q[QI.hipL] = Math.min(q[QI.hipR] / D2R - 18, hipFlexMaxDeg(rom, 0)) * D2R;
      clampPose(q, rom);
      // Re-plant the stance toe after any clamping shifted it, capped by the
      // bent-knee hamstring allowance, then guarantee neither toe starts
      // below the floor.
      for (let i = 0; i < 2; i++) {
        solveHipForToeDown(model, ws, q, 'R');
        flatFootAnkle(model, ws, q, 'R', rom);
      }
      const hipCapBent = hipFlexMaxDeg(rom, 50) * D2R;
      if (q[QI.hipR] > hipCapBent) q[QI.hipR] = hipCapBent;
      clearFeet(model, ws, q, 5e-4, rom);
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
  for (let j = 0; j < NJ; j++) {
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

// One list, shared with the controller, so the two can never disagree about
// which channel is which joint.
export const JOINT_KEYS = JOINT_ORDER;
// How many joints a technique drives. It was the literal 6 in about thirty
// places; the trunk and the head made it 8, and a literal that has to change
// in thirty places is a literal that will one day change in twenty-nine.
export const NJ = JOINT_KEYS.length;

// Where each joint sits in q. Written out by name because the numbers moved
// when the trunk gained a hinge -- hipL went from q[5] to q[6] -- and a file
// full of bare indices is a file that renumbers wrongly exactly once.
export const QI = Object.fromEntries(JOINT_KEYS.map((n, j) => [n, 3 + j]));

// And the BODY indices, for the same reason: shankL has been body 4, then 5
// when the trunk became two segments and the head its own, and 6 now that the
// arm has an elbow in it. Read off the model rather than written down, so the
// next segment to appear cannot renumber this behind its back.
export const BODY = Object.fromEntries(
  ['hand', 'forearm', 'upperArm', 'chest', 'pelvis',
    'thighL', 'shankL', 'footL', 'thighR', 'shankR', 'footR', 'headNeck']
    .map((n, i) => [n, i]));

// A waypoint written in the old six-channel order, widened. The reference
// shapes below are hand-authored poses for the optimizer to start from, and
// they were written when a technique had six channels; the spine, the neck,
// the elbow and the ankles stay neutral in them, which is the straight-armed,
// rigid-trunked, flat-footed body they were drawn on.
function fromLegacy(v) {
  const out = new Float64Array(NJ);
  LEGACY_JOINT_ORDER.forEach((name, j) => { out[JOINT_KEYS.indexOf(name)] = v[j]; });
  return out;
}

// widenKnots lives in control.js, beside the joint lists it maps between.
export { widenKnots } from './control.js';


// Everything about the machine a trajectory was produced on: the servo, the
// contact model, and the geometry of the pose each scenario starts from. A
// trajectory is only meaningful together with its plant, so every producer
// records the plant its run actually used and every replay uses the recorded
// one, never the current defaults.
//
// There is one definition, here. runScenario reports back the plant it ran
// with rather than leaving each producer to assemble a snapshot of these
// defaults by hand -- which is exactly how the in-page optimizer came to send
// results to playback with no plant recorded at all, and playback duly
// replayed them on the legacy machine.
export const PLANT_DEFAULTS = {
  kp: 800, kd: 60, kCom: 2000, dCom: 1500,
  activationTau: 0.05, mu: 1.0, contactZeta: 1.0, integrator: 'si',
  tuckLoadFrac: TUCK_LOAD_FRAC, tuckKneeDeg: TUCK_KNEE_DEG,
  // Overdamped, deliberately. A servo commanding torque through a 50 ms
  // activation lag is not the second-order system its damping ratio is
  // computed for: the lag adds phase the ratio does not know about, so
  // "critically damped" on paper rings in practice. It showed as a head that
  // bobbled and knees that sprang -- a 20 degree neck step overshot 2.8
  // degrees and a 40 degree knee step rang once, at a nominal zeta of 1.
  //
  // This and loopOmegaTau are two halves of one fix and neither is
  // sufficient. Capping bandwidth alone leaves the neck overshooting 2.8
  // degrees; damping alone, uncapped, leaves it overshooting 3.5 with three
  // crossings. Together every joint is at zero overshoot and zero crossings
  // -- and the pair tracks a fast kick-up BETTER than the ringing tuning did
  // (1.39 deg rms against 2.41), because damping the resonance costs nothing
  // on the command path while slowing the loop costs everything.
  dampingRatio: 2.0, brakeMargin: 0.8, inertiaHz: 200, dampingSpeed: 0.5,
  romStopDeg: 5, romStopZeta: 0.7, loopOmegaTau: 2.0,
};

// Plant/controller settings as they were BEFORE a given capability existed.
// An artifact's stored config is the whole truth about the plant it was
// produced under, so a config that predates a key must replay with that
// key's pre-existing behavior, not with today's default. Both of these
// default to "off", which is exactly the old constant-kd, no-braking servo.
export const LEGACY_PLANT = {
  dampingRatio: 0, brakeMargin: 0, dampingSpeed: 0, romStopDeg: 0,
  // Inert under the three zeros above, and recorded so the accounting is
  // complete rather than merely harmless: inertia-scaled damping is off when
  // dampingRatio is 0, so its refresh rate does not matter, and end-stops are
  // off entirely when romStopDeg is 0, so their damping ratio does not either.
  inertiaHz: 200, romStopZeta: 0.7,
  // Uncapped: every joint ran at sqrt(kp / I), which is what let the neck
  // buzz. Zero rather than Infinity, matching the three zeros above -- this
  // file is JSON, and JSON has no Infinity: it serializes as null, which
  // resolves straight back to today's default, so a legacy technique would
  // have round-tripped onto the capped servo it was not produced on.
  loopOmegaTau: 0,
  // The bent-leg press used to start balanced over the palm with 90 degrees
  // of knee bend and nothing on the legs, which is why the only momentum the
  // search could find was to settle back down onto the floor and jump.
  tuckLoadFrac: 0, tuckKneeDeg: 90,
};

// Resolve a stored artifact's plant into the argument set for runScenario.
// Anything the artifact recorded wins; anything it could not have recorded
// falls back to the behavior in force before that knob existed. Adding a knob
// to PLANT_DEFAULTS therefore means deciding what runs made before it did,
// which the artifact suite checks rather than trusts.
export function resolvePlant(config) {
  return { ...LEGACY_PLANT, ...(config || {}) };
}

// Kept as the old name so recorded artifacts and their readers keep working.
export const resolveConfig = resolvePlant;

// The rest of the machine: the integration a replay uses, and the body it is
// run on. Neither is a plant setting, which is exactly why recording the
// plant did not make a run reproducible -- a technique could succeed in the
// search, appear to fall as a saved starting point, and succeed again in
// playback, because two replay paths had chosen different timesteps.
//
// dt and settleT are the REPLAY numerics, not the search's: a search
// deliberately integrates coarsely and a replay does not.
// dt was 2e-4, and it was 2e-4 because the contact damper was integrated
// explicitly: it is sized against a quarter of the body and acts on a hand
// weighing under a kilogram, which explicitly is stable only below about half
// a millisecond. That term is folded into the mass matrix now (contact.js,
// contactDamping), so the step is no longer chosen by a stability limit.
//
// 5e-4 is chosen for ACCURACY instead, with margin. Measured against a 5e-5
// reference across four techniques and two bodies, everything that arrives
// agrees to 0.29 mm here -- and stays under a millimetre out to 3e-3, which is
// six times coarser again. A search runs 2.3x faster. Going further is
// available and was measured (2e-3 is 7.3x and still sub-millimetre); this is
// the conservative end of a range that no longer has a cliff in it, which is
// the same reason KICK_T is the middle of its band rather than its optimum.
export const NUMERICS_DEFAULTS = { dt: DEFAULT_DT, settleT: 2.5 };

export function resolveNumerics(numerics) {
  return { ...NUMERICS_DEFAULTS, ...(numerics || {}) };
}

// The body a run was produced on, read off the model rather than assembled,
// and resolved on replay the way the plant is. Artifacts predating this field
// were all made on the default body, which is what buildModel({}) gives.
export function resolveBody(body) {
  return { ...(body || {}) };
}

// The plant a rollout will run on given these options, without running one.
// The single place PLANT_DEFAULTS is merged with overrides: runScenario uses
// it to build the plant it reports, and anything that has to name a plant
// before a rollout exists (a search reporting progress, say) asks here rather
// than assembling its own copy of the defaults.
export function plantFor(opts = {}) {
  const plant = {};
  for (const k of Object.keys(PLANT_DEFAULTS)) plant[k] = opts[k] ?? PLANT_DEFAULTS[k];
  return plant;
}

// Range of motion as it was BEFORE a given limit was corrected, in the same
// spirit as LEGACY_PLANT. Anatomy is part of the plant: the pike and
// tuck starts solve the wrist inside its range, so widening a limit moves
// the pose a recorded trajectory begins from, and the trajectory no longer
// fits. The wrist's lower extension bound was 92 degrees -- two degrees past
// vertical, a wall rather than an anatomical limit -- until it was widened.
export const LEGACY_ROM = { wristExtMinDeg: 92 };

// Resolve a stored artifact's rom the way resolveConfig resolves its
// controller: what the artifact recorded wins, what it could not have
// recorded falls back to the anatomy in force when it was made. Runs
// recorded from now on store the whole resolved range, so this fallback only
// ever reaches the ones that predate a field.
export function resolveRom(rom) {
  return { ...ROM_DEFAULTS, ...LEGACY_ROM, ...(rom || {}) };
}

// x = [NJ joints x K knot angles (radians), duration T, ...]. The knot bounds
// are the anatomy itself, so an anatomically impossible reference angle is
// unrepresentable rather than merely expensive -- the earlier
// soft-penalty-only treatment let the optimizer buy 30 degrees of impossible
// wrist flexion for about one cost unit.
// The per-joint bounds on a reference angle, which are the anatomy itself.
// Split out of decisionBounds because they are not only the search's business:
// anything that GENERATES knots rather than receiving them from a hand has to
// stay inside the same box, or it hands the search a technique the search will
// quietly straighten before scoring.
// The box a knot with no anatomy behind it gets. It is the anatomy anyway --
// a deliberately permissive one -- so that the derivation below is the only
// place a per-joint limit is ever written, at either width. Written out as a
// pair of literal arrays instead, this was a list of eight in the OLD joint
// order: adding the elbow and the ankles left the last three joints on the
// body with bounds of `undefined`, and a bound of undefined is a bound of NaN,
// which is a search that returns NaN and reports nothing at all.
const LOOSE_ROM = {
  wristExtMaxDeg: 160, wristExtMinDeg: 50,
  elbowHyperDeg: 15, elbowFlexMaxDeg: 160,
  shoulderFlexMaxDeg: 195, shoulderHyperDeg: 15, shoulderCloseMaxDeg: 120,
  spineExtMaxDeg: 20, spineFlexMaxDeg: 45,
  hipExtMaxDeg: 40, hipFlexAbsMaxDeg: 175,
  kneeFlexMaxDeg: 160, kneeHyperextDeg: 10,
  anklePointMaxDeg: 15, ankleDorsiMaxDeg: 125,
  neckExtMaxDeg: 45, neckFlexMaxDeg: 30,
};

export function knotBounds(rom = null) {
  const r = { ...ROM_DEFAULTS, ...(rom || LOOSE_ROM) };
  // Read off jointLimits, one joint at a time, which is where every other
  // consumer of the anatomy reads it -- the passive end-stops, the pose clamp,
  // the range penalty. Two lists of the same limits can only agree by hand.
  //
  // jointLimits takes a POSE because one of them depends on one: the hamstring
  // coupling reads the same leg's knee. The pose here is the handstand, all
  // zeros, and then the hips are overwritten with the ABSOLUTE cap -- a knot
  // may ask for a fold deeper than a straight knee allows, and whether the
  // knee has bought it is a question about the pose, which is why the coupling
  // stays a cost-side constraint rather than a bound.
  const q = new Float64Array(3 + NJ);
  const lo = new Float64Array(NJ), hi = new Float64Array(NJ);
  for (let j = 0; j < NJ; j++) {
    const l = jointLimits(r, q, 3 + j);
    lo[j] = l.lo; hi[j] = l.hi;
  }
  hi[QI.hipL - 3] = hi[QI.hipR - 3] = r.hipFlexAbsMaxDeg * D2R;
  return { lo, hi };
}

// Hold a knot matrix inside the anatomy. For knots a machine produced -- a
// refit at a new pose count, say. A knot a HAND placed is deliberately not
// clamped: a handle that stops for a reason the figure has not drawn is a
// handle that lies, and the timeline already paints the excursion orange.
export function clampKnotsToRom(knots, rom) {
  const { lo, hi } = knotBounds(rom);
  for (let j = 0; j < NJ; j++) {
    for (let k = 0; k < knots[j].length; k++) {
      knots[j][k] = Math.min(Math.max(knots[j][k], lo[j]), hi[j]);
    }
  }
  return knots;
}

// How close two poses may sit, as a fraction of the duration. The drag on the
// timeline and the search's own decode enforce the same one: two knots at the
// same instant are a spline segment of zero width, and the Hermite tangent
// across it divides by that width.
export const MIN_KNOT_GAP = 0.02;

// One step of the search along a knot's instant, relative to one step along a
// joint angle. A quarter of a radian is an ordinary change of pose; a quarter
// of the whole movement is not a change of phrasing, it is a different
// movement. Measured against a technique that already works, a generation
// made entirely of those produces no winner at all -- and because a CMA-ES
// candidate is kept or discarded whole, that stalls the ANGLES too.
//
// The kick-up, 30 generations, one pose pinned, everything else identical:
// at 1.0 the search moved the poses 0 ms and the angles 0.00 deg and never
// beat its own starting cost; at 0.15, 24 ms and 5.87 deg. Not a swept
// optimum -- a value small enough that the first generations phrase the
// movement instead of replacing it, after which covariance adaptation has
// its own opinion.
export const TIME_STEP_SCALE = 0.15;

export function decisionBounds(K, {
  tLo = 0.6, tHi = 3.0, rom = null, locks = null,
  // Whether the interior poses' instants are the search's to choose, and
  // which of them the reader has pinned. Phrasing is most of what makes a
  // movement -- two poses a tenth of a second apart is a snap, the same two a
  // second apart is a stretch -- so with the duration held fixed this is the
  // only way the search can find a rhythm rather than just a shape.
  freeTimes = false, timeLocks = null,
  // Whether the pose the body STARTS in is the search's to choose. Its joints
  // live inside the same anatomy as a knot, so they get the same box.
  freeStart = false,
  // And whether WHERE THE BODY STANDS is the search's too. Off -- which is
  // every technique that begins on its hands -- the base is not a decision at
  // all, because the hand is flat on the floor at the origin and that is the
  // whole answer. On, three more channels ride on the end of the start pose:
  // the two coordinates of the wrist and the lean of the hand. They get a box
  // around whatever the technique already says rather than the run of the
  // room, because a search free to put the body anywhere spends its budget
  // discovering that most of anywhere is the floor.
  freeBase = false, startBase = null,
} = {}) {
  // The same table knotBounds builds, which is where it now comes from.
  const { lo: jointLo, hi: jointHi } = knotBounds(rom);
  const nTimes = freeTimes ? Math.max(0, K - 2) : 0;
  const nStart = freeStart ? startChannels(freeBase) : 0;
  const n = NJ * K + 1 + nTimes + nStart;
  const lo = new Float64Array(n), hi = new Float64Array(n);
  for (let j = 0; j < NJ; j++) {
    for (let k = 0; k < K; k++) { lo[j * K + k] = jointLo[j]; hi[j * K + k] = jointHi[j]; }
  }
  lo[NJ * K] = tLo; hi[NJ * K] = tHi;
  // Pose k needs k gaps behind it and K-1-k ahead, so its box is what is left
  // over once its neighbours have room. Held to a point when it is pinned, for
  // the same reason a held pose is.
  for (let k = 1; k <= nTimes; k++) {
    const i = NJ * K + k;
    lo[i] = k * MIN_KNOT_GAP;
    hi[i] = 1 - (K - 1 - k) * MIN_KNOT_GAP;
    if (timeLocks?.[k] != null) {
      const v = Math.min(Math.max(timeLocks[k], lo[i]), hi[i]);
      lo[i] = v; hi[i] = v;
    }
  }
  for (let j = 0; j < Math.min(nStart, NJ); j++) {
    const i = NJ * K + 1 + nTimes + j;
    lo[i] = jointLo[j]; hi[i] = jointHi[j];
  }
  if (nStart > NJ) {
    const b = startBase || [0, 0, 0];
    const box = [[b[0] - 0.4, b[0] + 0.4],
      [Math.max(0, b[1] - 0.4), b[1] + 0.4],
      [b[2] - 60 * D2R, b[2] + 60 * D2R]];
    for (let j = 0; j < 3; j++) {
      const i = NJ * K + 1 + nTimes + NJ + j;
      lo[i] = box[j][0]; hi[i] = box[j][1];
    }
  }
  // A locked pose is not a decision. Collapsing its bounds onto the value it
  // is held at is not the thing that KEEPS it there -- rolloutCost writes it
  // back after decoding, the way it already does for the ending pose -- but
  // it stops the search spending step-size adaptation on dimensions that
  // cannot change the cost.
  if (locks) {
    for (let k = 0; k < K; k++) {
      if (!locks[k]) continue;
      for (let j = 0; j < NJ; j++) {
        const v = Math.min(Math.max(locks[k][j], lo[j * K + k]), hi[j * K + k]);
        lo[j * K + k] = v; hi[j * K + k] = v;
      }
    }
  }
  return { lo, hi };
}


// Where the poses fall, made into a movement: increasing, with room between,
// and pinned where the reader pinned it.
//
// CMA-ES samples a box, and "increasing" is not a box, so the decode projects
// onto it -- push right, then push left -- the same way decisionBounds
// projects a knot onto the anatomy. Both passes step over a pinned pose, so a
// pin survives its neighbours being pushed off it.
//
// A pin can still be impossible to honour: two of them a hair apart with a
// free pose between leaves nowhere to put it. The last pass then keeps the
// times non-decreasing at the cost of the pin, because a pose that happens
// before the one before it is not a movement at all, while a pin missed by a
// hundredth of a duration is a pin missed by a hundredth.
export function applyTimeLocks(fracs, timeLocks = null) {
  if (!fracs) return fracs;
  const K = fracs.length;
  const g = MIN_KNOT_GAP;
  const held = (k) => timeLocks?.[k] != null;
  // The ends are not decisions: the first pose is what t = 0 means and the
  // last is what T means.
  fracs[0] = 0;
  fracs[K - 1] = 1;
  for (let k = 1; k < K - 1; k++) if (held(k)) fracs[k] = timeLocks[k];
  for (let k = 1; k < K - 1; k++) if (!held(k)) fracs[k] = Math.max(fracs[k], fracs[k - 1] + g);
  for (let k = K - 2; k >= 1; k--) if (!held(k)) fracs[k] = Math.min(fracs[k], fracs[k + 1] - g);
  for (let k = 1; k < K - 1; k++) fracs[k] = Math.min(Math.max(fracs[k], fracs[k - 1]), 1);
  return fracs;
}

// Hold every locked pose at the angles it is locked to. Applied after the
// symmetry mirror, so a lock means the pose you can see rather than the pose
// it would have been straightened into.
export function applyLocks(knots, locks) {
  if (!locks) return knots;
  for (let k = 0; k < knots[0].length; k++) {
    if (!locks[k]) continue;
    for (let j = 0; j < NJ; j++) knots[j][k] = locks[k][j];
  }
  return knots;
}

// Skills whose two legs do the same thing. The decision vector carries a hip
// and a knee per leg because the kick-up genuinely needs them -- it swings one
// leg and pushes with the other -- but a press and a bent-leg press are
// symmetric movements, and nothing in the score says so. Left the search free
// to spend those parameters, the bent-leg press arrived with one leg straight
// and the other folded ninety degrees through the whole rise: cheap, stable,
// and nothing like the skill. Mirroring after decoding takes the option away.
export const SYMMETRIC_SCENARIOS = new Set(['pike', 'tuck']);

export function symmetrizeKnots(knots) {
  // Works on either width: a six-channel technique is still in the old order,
  // where the legs sit two rows earlier. Mirroring MUTATES in place, so this
  // cannot just widen and hand back a copy.
  const names = jointOrderFor(knots.length);
  const hipL = names.indexOf('hipL'), kneeL = names.indexOf('kneeL');
  const hipR = names.indexOf('hipR'), kneeR = names.indexOf('kneeR');
  const ankleL = names.indexOf('ankleL'), ankleR = names.indexOf('ankleR');
  for (let k = 0; k < knots[hipL].length; k++) {
    knots[hipR][k] = knots[hipL][k];
    knots[kneeR][k] = knots[kneeL][k];
    // A body written before the ankles existed has neither row, and -1 would
    // mirror the wrist onto the elbow.
    if (ankleL >= 0 && ankleR >= 0) knots[ankleR][k] = knots[ankleL][k];
  }
  return knots;
}

// The duration sits at a fixed index rather than at the end of the vector,
// because the K-2 interior knot times may follow it. A vector without them --
// every one written before phrasing was searchable, including the stored
// artifacts -- decodes exactly as it did, with fracs null.
// nStart says whether the vector carries a START POSE on the end -- the NJ
// joint angles the body begins in, and the three base coordinates after them
// when the technique's hands are not on the floor -- which it does when the
// reader has unlocked it. It has to be told rather than inferred: the interior
// instants are also an optional tail, and a vector carrying one is exactly as
// long as a vector carrying some of the other.
export function decodeDecision(x, K, nStart = 0) {
  const knots = [];
  for (let j = 0; j < NJ; j++) knots.push(x.slice(j * K, (j + 1) * K));
  const nTimes = Math.max(0, K - 2);
  let fracs = null;
  if (nTimes > 0 && x.length - nStart >= NJ * K + 1 + nTimes) {
    fracs = new Float64Array(K);
    fracs[K - 1] = 1;
    for (let k = 1; k < K - 1; k++) fracs[k] = x[NJ * K + k];
  }
  const start = nStart > 0 && x.length >= NJ * K + 1 + nStart
    ? x.slice(x.length - nStart) : null;
  return { knots, T: x[NJ * K], fracs, start };
}

export function encodeDecision(knots0, T, fracs = null, start = null) {
  // Widen here, at the boundary, so every caller that still speaks in six
  // joints -- the stored presets, the recorded artifacts, a saved file, the
  // gates -- keeps working and gets a neutral spine and neck.
  const knots = widenKnots(knots0);
  const K = knots[0].length;
  const nTimes = fracs ? Math.max(0, K - 2) : 0;
  const nStart = start ? start.length : 0;
  const x = new Float64Array(NJ * K + 1 + nTimes + nStart);
  for (let j = 0; j < NJ; j++) x.set(knots[j], j * K);
  x[NJ * K] = T;
  for (let k = 1; k <= nTimes; k++) x[NJ * K + k] = fracs[k];
  for (let j = 0; j < nStart; j++) x[NJ * K + 1 + nTimes + j] = start[j];
  return x;
}

// How many numbers a searchable start pose is: the joints, and the three base
// coordinates as well once the technique has let go of the floor.
export function startChannels(freeBase = false) { return NJ + (freeBase ? 3 : 0); }

// The pose the body begins in, as a full configuration, from whatever the
// search has to say about it.
//
// The joints are always searched. WHERE THE BODY STANDS is searched only when
// the technique's start is not grounded: a technique that begins on its hands
// has its base solved for it -- the hand flat on the floor at the origin --
// and there is nothing there for a search to choose. One that has let go of
// the floor has three real degrees of freedom, and they ride along on the end.
export function startPoseJoints(model, ws, scenario, rom, q0Given, freeBase = false) {
  const base = q0Given ? Float64Array.from(q0Given) : scenarioStart(model, ws, scenario, rom).q0;
  const out = new Float64Array(startChannels(freeBase));
  for (let j = 0; j < NJ; j++) out[j] = base[3 + j];
  if (freeBase) { out[NJ] = base[0]; out[NJ + 1] = base[1]; out[NJ + 2] = base[2]; }
  return out;
}

export function startPoseFrom(model, ws, scenario, rom, q0Given, angles, symmetric = false) {
  const q = Float64Array.from(q0Given || scenarioStart(model, ws, scenario, rom).q0);
  if (!angles) return q;
  for (let j = 0; j < NJ; j++) q[3 + j] = angles[j];
  if (angles.length >= NJ + 3) { q[0] = angles[NJ]; q[1] = angles[NJ + 1]; q[2] = angles[NJ + 2]; }
  // The mirror applies to the start for the same reason it applies to a knot:
  // a symmetric skill whose two legs begin differently is not the skill.
  if (symmetric) {
    q[QI.hipR] = q[QI.hipL]; q[QI.kneeR] = q[QI.kneeL]; q[QI.ankleR] = q[QI.ankleL];
  }
  return q;
}

export const COST_WEIGHTS = {
  pose: 1, poseAngles: 2, velocity: 0.3, fall: 1,
  effort: 0.08, saturation: 2, rom: 4, romPeak: 0.5, quasiStatic: 0,
  liftoff: 8, feet: 5, replant: 25, tuckPhase: 6, arrival: 8, work: 1, smooth: 1,
  // Reaching handstand height at all. Zero for anything that gets there, so it
  // changes no technique that already works -- it only gives the ones that do
  // not a direction to move in.
  reach: 30,
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

// What a bent-leg press has to pass through to be one: airborne, stacked over
// the palm, with the knees still bent. Hips over the hands and knees at the
// chest is a shape the shoulder holds at 23 Nm, limited by the WRIST at the
// same utilization as a straight handstand; let the hips sit behind the hands
// instead and the identical tuck is a planche at 132 Nm. Both are ways to be
// upside down with bent legs and only one of them is the skill.
//
// Nothing in a generic score distinguishes them, and the search prefers the
// planche, because drifting up through it is smooth and cheap in work while a
// hop is neither. So the shape is scored directly: how close the trajectory
// ever came, at any instant with its feet off the floor, to being stacked
// with its knees bent. This is a definition, in the same sense that arriving
// "posed" in the balanced configuration is a definition of having got there.
export const TUCK_PHASE = {
  shoulderOpenDeg: 20,   // trunk within this of the arm line
  kneeFlexDeg: 60,       // and the knees at least this bent
  overHandM: 0.05,       // and the centre of mass this near the palm target
  cap: 25,               // a hopeless run is not worth more than this
};

// A handstand is arrived at, not thrown into. Peak foot speed over the last
// quarter of an entry, hinged at a speed both the kick-up and the press come
// in under (1.78 and 1.74 m/s), so this charges nothing until a technique
// slings its legs up harder than either of them does.
//
// It has to be charged explicitly because the slingshot is CHEAP: throwing
// the legs at the vertical carries the body there on their angular momentum
// and spares the shoulder, and given a free choice of duration the search
// kept an entry at 1.68 s and brought the feet in at 3.3 m/s even when
// allowed 3.2 s to spread it over.
export const ARRIVAL_FOOT_SPEED = 2.0;
export const ARRIVAL_WINDOW_FRAC = 0.25;

// How far a toe has to rise before it counts as having left the floor. A
// foot that has left may not come back.
//
// Height, not force, and not a time window. The bent-leg press start rests
// its toes on the floor with a share of body weight on them, so a
// force-based test reads "already gone" in the first millisecond, and a time
// debounce to paper over that is just a window to hide a replant in: the
// search lifted both feet 180 mm, dropped them back at five times body
// weight, and pushed off that, all inside a quarter of a second.
export const TOE_CLEAR_M = 0.05;

// Where "working hard" becomes "living at the cap", and how much that costs.
// The saturation term used to hinge at 0.95 on the raw utilization, so a
// joint pinned at its limit for an ENTIRE rollout scored (1 - 0.95)^2 =
// 0.0025 against about 2.0 for the work term: maximal effort was, for
// practical purposes, free. That is what let the optimizer hold a planche and
// press out of it rather than kick up, since the planche costs nothing but
// effort and effort was not being charged. Normalizing the hinge so that a
// joint at its cap scores 1 per sample puts sustained maximal effort on the
// same footing as the work it is doing, which is roughly how it feels.
export const SATURATION_KNEE = 0.8;

// Scale for the range-of-motion term, and the same lesson a third time.
// romPenalty returns squared RADIANS, so a joint held twelve degrees outside
// its anatomy scored 0.044 before weighting: for the whole rollout that is
// 0.18 against about 1.4 for the work term, which is to say the optimizer was
// being fined pocket change for a hamstring stretched past its limit and duly
// paid it. Measuring the violation against the end-stop's own design
// penetration instead makes one stop-depth of violation cost 1 per joint per
// sample, so the anatomy is worth about as much as the effort of reaching it.
export const ROM_VIOLATION_SCALE = PLANT_DEFAULTS.romStopDeg * D2R;

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
  // The machine to score on. A search that scores on today's defaults while
  // the page replays on the plant its artifact recorded is the same failure as
  // scoring from a different start: two problems wearing one set of knots. The
  // page owns the plant, so it hands it in; leaving this null keeps the old
  // behaviour of scoring on the defaults.
  plant = null,
  // The integration a replay of this technique uses -- and therefore the one
  // scoring it uses, both fields of it. There is no such thing as the search's
  // own dt: a candidate scored over a different integration than the page
  // replays is a candidate scored on a different problem, and "it succeeds in
  // the search and falls in playback" is what that looks like from outside.
  //
  // settleT already followed the technique here and dt did not, which is a
  // difference with no reason behind it: the settle horizon is how long the
  // page watches after the movement ends, and the step is how the page
  // integrates it. Both are the technique's.
  numerics = null,
  K = 6, dt = numerics?.dt ?? NUMERICS_DEFAULTS.dt,
  settleT = numerics?.settleT ?? 2.5, weights = COST_WEIGHTS,
  qdJitter = 0, jitterSeed = 1, integrator = plant?.integrator ?? 'si',
  // Plant knobs a robustness variant may perturb. They default to the plant
  // being scored on, so a variant that names one still wins and one that does
  // not leaves it alone.
  contactZeta = plant?.contactZeta ?? PLANT_DEFAULTS.contactZeta,
  mu = plant?.mu ?? PLANT_DEFAULTS.mu,
  pinFinal = true,
  // Where the poses fall in time, as fractions of the duration. The search
  // does not move them -- they are phrasing, and phrasing is authored -- but
  // it has to SCORE the phrasing the page is showing, or a technique whose
  // two key poses sit a tenth of a second apart is scored as one that spaces
  // them evenly. Null is the even spacing.
  knotFracs = null,
  // Poses held by hand: locks[k] is the NJ angles pose k is pinned to, or a
  // falsy entry for one the search may move. This is the same mechanism as
  // pinFinal, which is simply the ending pose being permanently locked.
  locks = null,
  // Which poses are pinned to the instant they sit at. Same shape as locks:
  // an entry is the fraction of the duration it is held at, or null for a
  // pose whose instant the search may choose.
  timeLocks = null,
  // Whether the two legs do the same thing. It defaults to the scenario's own
  // answer, which is what it was before it could be asked -- but it was only
  // ever readable HERE, inside the scorer, so a page that wanted to say
  // otherwise had no way to and a page that did not know had no way to tell.
  symmetric = null,
  // The pose the body starts in, when it is being constructed rather than
  // solved. It has to reach the SCORING rollout, not only a replay: a search
  // that scores from one start while the page replays from another is two
  // different problems wearing the same knots, and its answer nose-dives the
  // moment it is played back.
  q0 = null,
  // Whether the technique's start has its hands on the floor. The default is
  // the only thing every technique here has ever done; false says the pose is
  // wherever it stands, which is what lets a technique begin in the air, on
  // its feet, or halfway through a rotation.
  startGrounded = true,
  // Whether the start pose is the search's to choose. Off, q0 above is where
  // the body begins and nothing moves it. On, the decision vector carries the
  // start's joint angles on its end and they win -- which is the only way the
  // search can answer "you are starting in the wrong place", the one thing a
  // technique's author most often has wrong and the one thing the search
  // could not previously say.
  freeStart = false,
  // The pose it is trying to end in. The last knot IS this pose -- which is
  // why the search does not move it -- so handing in a target is how you ask
  // for a different ending, and the pin below then keeps the search off it
  // exactly as it keeps the search off a handstand.
  target = null,
} = {}) {
  const sym = symmetric ?? SYMMETRIC_SCENARIOS.has(scenario);
  const { knots, T, fracs, start } = decodeDecision(x, K,
    freeStart ? startChannels(!startGrounded) : 0);
  const q0Used = start ? startPoseFrom(model, ws, scenario, rom, q0, start, sym) : q0;
  if (sym) symmetrizeKnots(knots);
  applyLocks(knots, locks);
  // Where the poses fall. When the search is phrasing as well as posing the
  // decision vector carries the interior instants and they win; otherwise the
  // phrasing is whatever was authored, and knotFracs is it.
  const fracsUsed = fracs ? applyTimeLocks(fracs, timeLocks) : knotFracs;
  const balanced = target ? Float64Array.from(target) : balancedHandstand(model, ws);
  // A technique ends in the pose it is aimed at, by definition: the final knot
  // is that pose, not a free parameter. Otherwise the settle-phase servo holds
  // a slightly-off shape that the wrist balance correction must fight forever,
  // and every "arrival" leaks into a slow drift and overshoot.
  if (pinFinal) {
    for (let j = 0; j < NJ; j++) knots[j][knots[j].length - 1] = balanced[3 + j];
  }
  const r = runScenario(model, ws, strengthProf, {
    // Plant first: everything named after it is either a knob a variant may
    // perturb (and those already default to the plant's own value) or a
    // property of this rollout rather than of the machine.
    ...(plant || {}),
    scenario, knots, T, settleT, dt, integrator, qdJitter, jitterSeed, rom,
    contactZeta, mu, q0: q0Used, target: balanced, knotFracs: fracsUsed,
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
  // Anything but the hands and the feet touching the ground has ended the
  // attempt, and this test has to come first. The centre-of-mass test alone
  // asks the body to have sunk 0.3 H below its own peak: true when a toppled
  // body fell through the floor, false once the body has contacts to land
  // on, because resting on your head holds the centre of mass around 0.55 m
  // and never trips it. The optimizer found that immediately -- a whole
  // generation face-planting onto the head and scoring as though it had not
  // fallen at all.
  const bodyContact0 = model.contacts.findIndex((c) => c.r > 0);
  for (let k = 0; k < rec.t.length; k++) {
    peakComY = Math.max(peakComY, rec.com[k][1]);
    const f = rec.forces[k];
    if (bodyContact0 >= 0 && f) {
      let down = false;
      for (let i = bodyContact0; i < f.fy.length; i++) {
        if (f.fy[i] > 20) { down = true; break; }
      }
      if (down) { tFall = rec.t[k]; break; }
    }
    if (rec.com[k][1] < peakComY - 0.3 * H && rec.com[k][1] < 0.75 * comYbal) {
      tFall = rec.t[k];
      break;
    }
  }

  // A fall ends the attempt, so the score stops there. Everything after it is
  // the aftermath of a crash -- the feet coming back down, the flail, the heap
  // the body finishes in -- and scoring that measures HOW IT FELL rather than
  // how close it came. It was not a small effect: sweeping a kick-up from too
  // weak a throw to too hard a one, the replant term (feet touching down after
  // liftoff, which after a fall is not a replant but a landing) ran 663, 0,
  // 275, 0, 151, 64 across the sweep and set the ranking outright, so a
  // technique 6% short of arriving scored twice as badly as one 20% short. The
  // search was being told, precisely, nothing.
  const kEnd = (() => {
    if (Number.isNaN(tFall)) return rec.t.length;
    let k = 0;
    while (k < rec.t.length && rec.t[k] < tFall) k++;
    return Math.max(2, Math.min(rec.t.length, k + 1));
  })();
  const scoredEnd = rec.t[kEnd - 1];

  // Where the body finished THE ATTEMPT, not where the crash left it.
  //
  // This used to read the final integrator state -- the end of the whole
  // rollout, settle tail and all -- while every other term had already been
  // cut off at kEnd, the instant of the fall. So a technique that got further
  // was charged for the heap it eventually came to rest in, and the charge was
  // enormous: swept from too weak a throw to the answer, `fall` fell
  // correctly (226 -> 117 -> 103) and `reach` fell correctly (23.6 -> 8.2 ->
  // 1.6) while `pose` jumped from 6.9 to 105.8 and reversed the ranking. The
  // search read that as "getting closer is worse". It is the same bug the
  // replant term had, in the same place, and it is the reason a face plant
  // could score better than a near miss: the score was measuring HOW IT FELL.
  //
  // And for an attempt that FELL, even the end of the scored window is the
  // wrong instant. A slow topple is detected late, by which time the body has
  // had a second to drift; a fast one is caught early, near where it started.
  // So the same reversal survived cutting the window: at alpha 0.88 the body
  // reached 0.78 m and toppled at t = 3.03 with pose 81, while at 0.78 it
  // reached only 0.65 and fell at t = 1.22 with pose 6. Getting further still
  // read as worse.
  //
  // What a failed attempt is worth is how close it ever CAME, so that is what
  // is measured: the instant inside the scored window at which the body was
  // nearest the handstand. For a technique that arrives nothing changes -- the
  // window ends parked in the handstand and the nearest instant is the end of
  // it -- and whether it is parked WELL is what poseAngles, velocity, feet and
  // settleCalm are for, over the settle tail, unchanged.
  const kScored = (() => {
    const last = Math.max(0, Math.min(rec.q.length - 1, kEnd - 1));
    if (Number.isNaN(tFall)) return last;
    let best = last, bestD = Infinity;
    for (let k = 0; k <= last; k++) {
      const xT = rec.q[k][0] + model.patch.x0
        + HANDSTAND_TARGET_FRAC * (model.patch.x1 - model.patch.x0);
      const dx = (rec.com[k][0] - xT) / 0.1;
      const dy = (rec.com[k][1] - comYbal) / (0.2 * H);
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = k; }
    }
    return best;
  })();
  const mo = momenta(model, rec.q[kScored], rec.qd[kScored], ws);
  const xTargetEnd = rec.q[kScored][0] + model.patch.x0
    + HANDSTAND_TARGET_FRAC * (model.patch.x1 - model.patch.x0);
  const poseTerm = ((mo.comX - xTargetEnd) / 0.1) ** 2 + ((mo.comY - comYbal) / (0.2 * H)) ** 2;
  // Peak CoM speed over the final 0.4 s, not the final instant: a body
  // drifting into overshoot can be momentarily slow exactly at cutoff.
  let peakEndSpeed = Math.hypot(mo.comVx, mo.comVy);
  for (let k = 1; k < kEnd; k++) {
    if (rec.t[k] < scoredEnd - 0.4) continue;
    const dts = rec.t[k] - rec.t[k - 1];
    if (dts <= 0) continue;
    const v = Math.hypot(rec.com[k][0] - rec.com[k - 1][0], rec.com[k][1] - rec.com[k - 1][1]) / dts;
    peakEndSpeed = Math.max(peakEndSpeed, v);
  }
  const velTerm = (peakEndSpeed / 0.25) ** 2;
  const fallTerm = Number.isNaN(tFall) ? 0 : 60 + 240 * (Tend - tFall) / Tend;

  // How close the body ever came to standing on its hands, whatever happened
  // afterwards. Falling is one number, so the whole family of techniques that
  // never get up scores the same and the search has no way to learn that it
  // should throw harder -- which is the failure this term exists to fix.
  // Across a kick-up swept from too weak to too hard it reads 0.271, 0.270,
  // 0.234, 0.166, 0.000: a gradient where the total cost had none.
  //
  // Clamped at zero rather than rewarding height, so there is nothing to buy
  // by jumping: getting the centre of mass to where a handstand puts it is
  // worth everything, and getting it higher is worth nothing at all.
  let peakReach = -Infinity;
  for (let k = 0; k < kEnd; k++) peakReach = Math.max(peakReach, rec.com[k][1]);
  const shortTerm = (Math.max(0, comYbal - peakReach) / (0.2 * H)) ** 2;

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
  // Foot contact is a prefix of an entry, never something to come back to.
  // A press unweights its feet and leaves them; a kick-up pushes off once and
  // leaves them; a bent-leg press hops off both and leaves them. Each foot is
  // tracked on its own, because a kick-up's swing leg is already in the air
  // while its stance leg is still pushing.
  //
  // Without this the bent-leg press had a cheaper option than pressing: hold
  // a tucked fold, settle the feet back down onto the floor, and jump.
  // Nothing else in the score noticed, because the feet term only ever looked
  // at the settle tail.
  let replant = 0;
  const footGone = [false, false];
  // Which contact is which comes from the MODEL. It used to be written here
  // as 0 and 1 for the hands and 2 and 3 for the feet, which was true while
  // each foot was a single point on the end of a welded shank; a foot that
  // hinges has three stations, and a foot's load is all of them.
  const handC = model.handContacts;
  const footC = model.footContacts;
  const sumF = (f, list) => { let t = 0; for (const i of list) t += f.fy[i] || 0; return t; };
  // How far the whole foot is off the floor is its LOWEST station, not its
  // toe: a foot rolled up onto the ball has its toe down and its heel a hand's
  // width up, and it has not left.
  const minY = (f, list) => {
    let y = Infinity;
    for (const i of list) if (f.py[i] !== undefined) y = Math.min(y, f.py[i]);
    return y;
  };
  for (let k = 0; k < kEnd; k++) {
    const f = rec.forces[k];
    if (f) {
      const handF = sumF(f, handC);
      const def = Math.max(0, 0.1 * W - handF) / (0.1 * W);
      liftoff += def * def;
      for (let s = 0; s < 2; s++) {
        const lowest = minY(f, footC[s]);
        if (!Number.isFinite(lowest)) continue;
        if (!footGone[s] && lowest > TOE_CLEAR_M) footGone[s] = true;
        // Capped: a foot is either back on the floor or it is not, and how
        // HARD it lands is not the question. Uncapped, this squared force
        // ratio ran to ten times every other term put together on a kick-up
        // that toppled over the front, and it ran the wrong way -- the harder
        // the technique overthrew, the softer the landing and the cheaper the
        // score, so the search read "throw harder" all the way out.
        if (footGone[s]) replant += Math.min(1, (sumF(f, footC[s]) / (0.1 * W)) ** 2);
      }
      const footF = sumF(f, footC[0]) + sumF(f, footC[1]);
      if (rec.t[k] >= settleStart) feet += (footF / (0.2 * W)) ** 2;
    }
    if (rec.t[k] >= settleStart) {
      let s = 0;
      for (let j = 0; j < NJ; j++) {
        const d = rec.q[k][3 + j] - balancedQ[3 + j];
        s += d * d;
      }
      angErr += s;
      nAng++;
    }
  }
  liftoff /= kEnd;
  replant /= kEnd;

  // Peak foot speed over the closing quarter of the entry, computed from the
  // state rather than by differencing recorded positions. Differencing reads
  // whatever the recording stride smoothed it down to -- it saw 3.1 m/s where
  // the body was doing 3.9 -- and the answer would then depend on the
  // timestep, which is not something a cost term is allowed to do.
  let arrival = 0;
  {
    const from = T * (1 - ARRIVAL_WINDOW_FRAC);
    let peak = 0;
    // To kEnd, like everything else. This asks how fast the feet are flying as
    // the movement closes -- a soft arrival plants them, a wild one whips them
    // in -- and run past the fall it asks instead how fast they were flying
    // during the CRASH, which is the fourth thing in this file to have made
    // that mistake. It read 108 on a throw that toppled at t = 1.09 of a
    // 1.47 s movement, purely because the window it averages over lay entirely
    // in the wreckage, and that one number put a violent overshoot above a
    // worse one in the ranking.
    for (let k = 0; k < kEnd; k++) {
      if (rec.t[k] < from || rec.t[k] > T) continue;
      fk(model, rec.q[k], rec.qd[k], ws);
      for (const c of [2, 3]) {
        const cpt = model.contacts[c];
        if (!cpt) continue;
        const b = cpt.body;
        const cth = Math.cos(ws.th[b]), sth = Math.sin(ws.th[b]);
        const rx = cth * cpt.x - sth * cpt.y, ry = sth * cpt.x + cth * cpt.y;
        const v = Math.hypot(ws.vx[b] - ws.om[b] * ry, ws.vy[b] + ws.om[b] * rx);
        if (v > peak) peak = v;
      }
    }
    const over = Math.max(0, peak - ARRIVAL_FOOT_SPEED) / ARRIVAL_FOOT_SPEED;
    arrival = over * over;
  }

  // The closest this trajectory ever came to a fully inverted tuck, over the
  // frames where it was actually off its feet.
  let tuckMiss = 0;
  if ((weights.tuckPhase || 0) > 0 && scenario === 'tuck') {
    const patchTarget = model.patch.x0 + HANDSTAND_TARGET_FRAC * (model.patch.x1 - model.patch.x0);
    const openScale = TUCK_PHASE.shoulderOpenDeg * D2R;
    const bentScale = TUCK_PHASE.kneeFlexDeg * D2R;
    let closest = Infinity;
    for (let k = 0; k < rec.t.length; k++) {
      const f = rec.forces[k];
      if (f && sumF(f, footC[0]) + sumF(f, footC[1]) > 0.05 * W) continue;
      const q = rec.q[k];
      const open = Math.max(0, Math.abs(q[QI.shoulder]) - openScale) / openScale;
      const kneeFlex = 0.5 * (-q[QI.kneeL] + -q[QI.kneeR]);
      const bent = Math.max(0, bentScale - kneeFlex) / bentScale;
      const over = (rec.com[k][0] - (q[0] + patchTarget)) / TUCK_PHASE.overHandM;
      const miss = open * open + bent * bent + over * over;
      if (miss < closest) closest = miss;
    }
    tuckMiss = Math.min(Number.isFinite(closest) ? closest : TUCK_PHASE.cap, TUCK_PHASE.cap);
  }
  if (nAng > 0) { angErr /= nAng; feet /= nAng; }

  let effort = 0, sat = 0, romP = 0, romPk = 0, peakKE = 0;
  let posWork = 0, negWork = 0;
  let driveRate = 0, nDrive = 0, settleCalmV = 0, nSettleCalm = 0;
  const prevU = new Float64Array(NJ).fill(NaN);
  const peakUtil = new Float64Array(NJ);
  // The ATTEMPT, not the aftermath. This loop used to run to the end of the
  // recording while everything it feeds was divided by kEnd, and that made it
  // the third place in this file to score the crash instead of the try -- the
  // other two were the replant term and the terminal pose.
  //
  // settleCalm was the expensive one. It measures joint motion in the final
  // second, which for a technique that arrives is the handstand holding still
  // and for one that topples on the way is the body hitting the floor. Priced
  // against a kick-up that reaches 0.88 m and falls at t = 3.26, it read 136
  // -- while DOING NOTHING AT ALL, standing in the lunge and never leaving it,
  // read 0.1, because a body that does not move has nothing to be uncalm
  // about. Everything else in the score preferred the attempt (fall by 46,
  // reach by 47, velocity by 11) and this one term overturned all of it: not
  // trying cost 242 and nearly succeeding cost 275. The search was being paid
  // to give up, which is exactly what it did.
  //
  // effort, saturation and rom had a quieter version of the same bug: summed
  // over the whole recording and divided by kEnd, so an attempt that failed
  // early was charged the settle tail's effort at up to twice its true rate.
  for (let k = 0; k < kEnd; k++) {
    const dts = k > 0 ? rec.t[k] - rec.t[k - 1] : 0;
    let sumU2 = 0, sumSat = 0, sumDriveRate2 = 0;
    for (let j = 0; j < NJ; j++) {
      const tauApplied = rec.tauApplied[k][j];
      const cap = availableTorque(strengthProf[JOINT_KEYS[j]], tauApplied, rec.qd[k][3 + j]);
      const u = Math.abs(tauApplied) / Math.max(cap, 1e-6);
      if (u > peakUtil[j]) peakUtil[j] = u;
      sumU2 += u * u;
      const over = Math.max(0, (u - SATURATION_KNEE) / (1 - SATURATION_KNEE));
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
    // ...and only for an attempt that GOT there. This is an arrival-quality
    // term -- how still the handstand is once it is reached -- and a technique
    // that fell has no settle to be calm in. Bounding the loop at the fall is
    // not enough on its own: a late topple leaves a handful of the window's
    // most violent samples with a much smaller denominator to divide by, so
    // the mean goes UP the closer the attempt came to working. The failure is
    // already priced, twice, by fall and by reach.
    if (Number.isNaN(tFall) && rec.t[k] >= Tend - Math.min(1.0, settleT)) {
      let sq = sumDriveRate2;
      for (let j = 3; j < 3 + NJ; j++) {
        const v = rec.qd[k][j] / SETTLE_QD_SCALE;
        sq += v * v;
      }
      settleCalmV += sq;
      nSettleCalm++;
    }
    effort += sumU2;
    sat += sumSat;
    const romNow = romPenalty(rec.q[k], rom) / (ROM_VIOLATION_SCALE * ROM_VIOLATION_SCALE);
    romP += romNow;
    // Peak as well as mean: the mean dilutes a brief excursion across the
    // whole rollout, but a hamstring is not injured by the average of a
    // movement, it is injured by the worst instant of it. A fast leg swing
    // that spikes into end range for a tenth of a second is exactly the
    // event, and averaging is what made it look cheap.
    if (romNow > romPk) romPk = romNow;
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
  const N = kEnd;
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
  if (kEnd > 2) {
    for (let k = 1; k < kEnd - 1; k++) {
      const dtc = rec.t[k + 1] - rec.t[k - 1];
      if (dtc <= 0) continue;
      let s = 0;
      for (let j = 3; j < 3 + NJ; j++) {
        const a = (rec.qd[k + 1][j] - rec.qd[k - 1][j]) / dtc / SMOOTH_ACCEL_SCALE;
        s += a * a;
      }
      smoothAcc += s;
    }
    smoothAcc /= kEnd - 2;
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
    reach: (weights.reach || 0) * shortTerm,
    effort: weights.effort * effort,
    saturation: weights.saturation * sat,
    rom: weights.rom * romP,
    romPeak: (weights.romPeak || 0) * romPk,
    quasiStatic: weights.quasiStatic ? weights.quasiStatic * peakKE * peakKE : 0,
    liftoff: (weights.liftoff || 0) * liftoff,
    feet: (weights.feet || 0) * feet,
    replant: (weights.replant || 0) * replant,
    tuckPhase: (weights.tuckPhase || 0) * tuckMiss,
    arrival: (weights.arrival || 0) * arrival,
  };
  let cost = 0;
  for (const v of Object.values(terms)) cost += v;
  return {
    cost, terms, verdict: r.verdict, T, tFall, plant: r.plant,
    numerics: r.numerics, body: r.body,
    peakUtil: Array.from(peakUtil),
    workJ: { positive: posWork, negative: negWork, metabNormalized: metabWork },
    // The recording this scoring pass already made. Kept on the result so a
    // live view can draw the candidate that was actually evaluated rather
    // than re-simulating it; scoring never reads it back.
    rec,
  };
}

// Worst case over evaluation variants: the nominal rollout plus a rollout
// at a different timestep with a small deterministic velocity jitter at the
// start. A trajectory only scores well if it works under all variants,
// which kills the knife-edge optima CMA-ES otherwise discovers: a marginal
// catch tuned to one timestep's contact artifacts falls in the other
// variant and pays full price. (Robustness via worst-case over
// perturbations, in the spirit of robust character-control optimization.)
// The FIRST variant is the nominal one, and its timestep is the replay's --
// NUMERICS_DEFAULTS.dt, the step the page integrates at when it plays an
// answer back. It used to be 2.5e-4 against a replay at 2e-4, for no reason
// anyone wrote down beyond the coarser step being quicker, and that made the
// search and the figure two different problems: the number the search
// converged to was not a number you could reproduce by pressing play, and the
// final check existed to paper over the gap by re-scoring the winner somewhere
// else. One problem statement, one timestep.
//
// The SECOND variant differs on purpose, and this is the one place in the
// notebook where two timesteps are correct: a candidate has to survive being
// integrated differently, or it is a knife-edge tuned to one step's contact
// artifacts rather than a technique. It is deliberately NOT the replay's step,
// because a variant that agreed with the nominal one would test nothing.
// Relative to the technique's own step, not to the notebook's default. Written
// as two absolute numbers, the nominal variant OVERRODE whatever it was handed
// -- so a technique carrying its own integration (which every preset kept
// before the default last moved does) was scored at the default and replayed
// at its own. Two integrations, one cost, and the search and the figure
// disagreeing about whether the same technique arrives.
export const ROBUST_DT_RATIO = 1.6;
export const ROBUST_JITTER = { qdJitter: 0.05, jitterSeed: 9182 };

export function robustVariants(dt) {
  return [
    // No override at all: the nominal case is scored exactly as handed, which
    // is exactly as the page replays it.
    {},
    // Coarser than the nominal, not finer. The point of the second variant is
    // that a technique which only works at one step is a knife edge rather
    // than a technique, and the cheap direction to ask that in is the coarse
    // one.
    { dt: dt * ROBUST_DT_RATIO, ...ROBUST_JITTER },
  ];
}

export function robustRolloutCost(model, ws, strengthProf, rom, scenario, x, opts = {}) {
  const variants = opts.variants
    || robustVariants(opts.dt ?? opts.numerics?.dt ?? NUMERICS_DEFAULTS.dt);
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
  const rows = Array.from({ length: NJ }, () => new Float64Array(K));
  const scratch = new Float64Array(model.nq);
  let lastWrist = q0[3];
  // Weight shift comes FIRST: hold the fold while the lean deepens and the
  // feet unload, then raise. Opening hips or shoulders from the start
  // pushes the CoM back over the feet and rocks the body off its palms,
  // which is precisely the beginner mistake the simulation reproduces.
  const openFrac = (u) => (u <= 0.28 ? 0 : (u - 0.28) / 0.72);
  for (let k = 0; k < K; k++) {
    const u = k / (K - 1);
    const hip = q0[QI.hipL] * (1 - openFrac(u));
    const sh = q0[QI.shoulder] * (1 - openFrac(u));
    let wrist;
    if (k === 0) {
      wrist = q0[3];
    } else {
      scratch.fill(0);
      groundHand(model, scratch);
      scratch[QI.shoulder] = sh;
      scratch[QI.hipL] = scratch[QI.hipR] = hip;
      const w = solveWristForCom(model, scratch, ws, targetX);
      wrist = Number.isNaN(w) ? lastWrist : w;
    }
    lastWrist = wrist;
    // By name. Rows 0..5 were the six-joint body's channels, so on the
    // articulated one this wrote the hip angle into the SPINE and the left
    // KNEE and left both hips at zero -- a press that folded at the waist and
    // one knee instead of at the hips.
    rows[QI.wrist - 3][k] = wrist;
    rows[QI.shoulder - 3][k] = sh;
    rows[QI.hipL - 3][k] = hip; rows[QI.hipR - 3][k] = hip;
    rows[QI.kneeL - 3][k] = 0; rows[QI.kneeR - 3][k] = 0;
  }
  rows[QI.wrist - 3][K - 1] = target[QI.wrist];
  return { knots: rows, q0, target };
}

// Bent-leg press initial guess: the press reference with the knees carried
// bent and straightened over the second half, so the legs arrive extended.
export function tuckPressReference(model, ws, K = 6, rom = ROM_DEFAULTS) {
  const { q0 } = scenarioStart(model, ws, 'tuck', rom);
  const target = balancedHandstand(model, ws);
  const targetX = model.patch.x0 + HANDSTAND_TARGET_FRAC * (model.patch.x1 - model.patch.x0);
  const rows = Array.from({ length: NJ }, () => new Float64Array(K));
  const scratch = new Float64Array(model.nq);
  // The phases of a bent-leg press, in absolute joint angles: sink onto the
  // legs, extend them to hop, arrive in a FULLY INVERTED TUCK, then extend
  // the legs overhead together.
  //
  // The middle phase is the whole skill and it is the one a search does not
  // find on its own. Statics says why. With the hips stacked over the hands
  // and the knees at the chest, the shoulder holds 23 Nm and the binding
  // joint is the WRIST, at exactly the utilization of a straight handstand:
  // an inverted tuck is free at any shoulder worth modelling. Let the hips
  // sit behind the hands instead and the same tuck becomes a tucked planche
  // at 132 Nm, which saturates a 1.8 Nm/kg shoulder. Drifting up through the
  // intermediate shapes -- which is what a long, monotone unfold does -- is
  // therefore an expensive way to do a cheap movement, and the search will
  // happily spend a whole ladder discovering that it cannot afford it.
  const SHOULDER_TUCK = 12 * D2R;
  const hipTuck = Math.min(hipFlexMaxDeg(rom, 125), 140) * D2R;
  const PHASES = [
    // u,   shoulder,          hip,          knee (rad; negative is flexed)
    [0.00, q0[QI.shoulder], q0[QI.hipL], q0[QI.kneeL]],
    [0.16, q0[QI.shoulder], q0[QI.hipL], -70 * D2R],
    [0.32, q0[QI.shoulder] * 0.72, q0[QI.hipL] * 1.05, -12 * D2R],
    [0.52, SHOULDER_TUCK, hipTuck, -125 * D2R],
    [0.78, SHOULDER_TUCK * 0.5, hipTuck * 0.55, -70 * D2R],
    [1.00, target[QI.shoulder], target[QI.hipL], target[QI.kneeL]],
  ];
  const lerp = (a, b, t) => a + (b - a) * t;
  const sample = (u) => {
    let i = 0;
    while (i < PHASES.length - 2 && u > PHASES[i + 1][0]) i++;
    const [ua, sa, ha, ka] = PHASES[i];
    const [ub, sb, hb, kb] = PHASES[i + 1];
    const t = ub > ua ? (u - ua) / (ub - ua) : 0;
    return { sh: lerp(sa, sb, t), hip: lerp(ha, hb, t), knee: lerp(ka, kb, t) };
  };
  let lastWrist = q0[3];
  for (let k = 0; k < K; k++) {
    const u = k / (K - 1);
    const { hip, sh, knee } = sample(u);
    let wrist;
    if (u < 0.35) {
      // Through the hop the body is still standing on its feet, so the wrist
      // holds its start lean rather than the lean that would balance the
      // shape over the palm: there is nothing to balance yet.
      wrist = q0[3];
    } else {
      scratch.fill(0);
      groundHand(model, scratch);
      scratch[QI.shoulder] = sh;
      scratch[QI.hipL] = scratch[QI.hipR] = hip;
      scratch[QI.kneeL] = scratch[QI.kneeR] = knee;
      const w = solveWristForCom(model, scratch, ws, targetX);
      wrist = Number.isNaN(w) ? lastWrist : w;
    }
    lastWrist = wrist;
    rows[JOINT_KEYS.indexOf('wrist')][k] = wrist;
    rows[JOINT_KEYS.indexOf('shoulder')][k] = sh;
    rows[JOINT_KEYS.indexOf('hipL')][k] = hip; rows[JOINT_KEYS.indexOf('hipR')][k] = hip;
    rows[JOINT_KEYS.indexOf('kneeL')][k] = knee; rows[JOINT_KEYS.indexOf('kneeR')][k] = knee;
  }
  rows[JOINT_KEYS.indexOf('wrist')][K - 1] = target[QI.wrist];
  return { knots: rows, q0, target };
}

// Kick-up initial guess with the real phase structure: lean onto the hands
// while the swing leg sweeps hard overhead, extend the stance leg to push
// off, join the legs above, and hand the catch to the balance servo. The
// magic numbers are only a starting shape for the optimizer.
// The kick-up reference.
//
// Unlike the press, this one cannot be derived from statics: a kick-up is a
// THROW, and there is no path of balanced poses through it -- the body is
// airborne over its hands with its centre of mass outside the palm for most of
// the movement, and whether it arrives depends on how much angular momentum
// the swing leg carries and when the shoulder brakes it. The old waypoints
// here were hand-authored on the six-joint body, and on the articulated one
// they threw the body clean past its fingers at t = 1.0 every time: measured
// over some two dozen variations of the wind-up, the tempo and the stance
// drive, not one arrived and none lifted the centre of mass above 0.73 m
// against a handstand's 1.02.
//
// So the SHAPE of the throw is taken from a search -- CMA-ES on this same
// scorer, on the default body, at the default strength -- and written down
// here as what it is: a measurement. What is NOT written down is the pose it
// starts in or the pose it ends at. Each stage is
//
//     start * (1 - a) + target * a + delta
//
// where the start is solved per body by scenarioStart and the target is the
// balanced handstand for that body, so a taller or weaker frame moves both
// ends and the throw's shape travels between them. `a` is how far along that
// straight line the stage sits (negative at the wind-up, which is the body
// moving AWAY from the handstand to load the swing); `delta` is everything the
// straight line cannot say, and it is where the movement actually lives: the
// trunk rounding 31 and 39 degrees through the middle, the swing knee folding
// to 82, the stance leg driving late. A reference with the spine and the knees
// pinned at zero -- which is what a six-joint author had no choice but to
// write -- cannot express any of that.
//
// This is a starting point, not a result. It is re-scored on today's plant
// every time the editor opens it, and if a controller fix makes it better or
// worse the figure says so.
const KICK_STAGE_A = [-0.143, 0.226, 0.530, 0.648, 0.816, 1.000];
const KICK_STAGE_DELTA_DEG = {
  wrist: [8.4, 11.4, 19.7, 21.2, -31.2, 0],
  shoulder: [-5.1, 31.5, 4.0, -8.8, 12.2, 0],
  spine: [-1.2, 31.0, 38.7, -7.0, 9.4, 0],
  hipL: [0.1, -52.6, -57.9, -12.8, -21.5, 0],
  kneeL: [-41.3, -0.6, -69.7, -81.6, -30.7, 0],
  hipR: [-5.5, 26.8, 45.3, 13.7, -20.9, 0],
  kneeR: [-25.3, 25.6, 6.1, -15.1, -47.9, 0],
  // Zero, deliberately. The search that produced these stages was paid
  // nothing to keep the head still and left a 60-degree back-and-forth in
  // it; replayed flat the throw reaches 1.014 m either way, holds its whole
  // tempo band, and costs 9.22 against 9.46. See ROM_DEFAULTS.neckFlexMaxDeg.
  neck: [0, 0, 0, 0, 0, 0],
};
// The tempo, and it is not simply the one the search settled on. Swept in
// hundredths, this throw arrives over a clean band from 1.38 to 1.56 s and
// then goes ragged -- 1.58 lands seven centimetres short, 1.60 reaches the
// height but will not settle, and past 1.66 it topples in the tail. The search
// stopped at 1.5813, which is a hole in that band: right on the answer and
// wrong the moment anything else moves. A starting point wants MARGIN rather
// than optimality, so this is the middle of the band.
export const KICK_T = 1.47;

export function kickReference(model, ws, K = 7, rom = ROM_DEFAULTS) {
  const { q0 } = scenarioStart(model, ws, 'lunge', rom);
  const target = balancedHandstand(model, ws);
  const nStage = KICK_STAGE_A.length;
  // Every stage, said in full channels: the straight line from this body's
  // start to this body's handstand, plus the measured deviation from it.
  const stages = Array.from({ length: nStage }, (_, i) => {
    const a = KICK_STAGE_A[i];
    const out = new Float64Array(NJ);
    for (let j = 0; j < NJ; j++) {
      const name = JOINT_KEYS[j];
      const s = q0[3 + j], t = target[3 + j];
      const d = (KICK_STAGE_DELTA_DEG[name]?.[i] ?? 0) * D2R;
      out[j] = s * (1 - a) + t * a + d;
    }
    return out;
  });
  // The last stage IS the handstand: the search pins it there and so does the
  // editor, so it is written exactly rather than reconstructed from a delta of
  // zero on a rounded `a`.
  stages[nStage - 1] = Float64Array.from(target.slice(3));
  const rows = Array.from({ length: NJ }, () => new Float64Array(K));
  for (let j = 0; j < NJ; j++) {
    for (let k = 0; k < K; k++) {
      const u = (k / (K - 1)) * (nStage - 1);
      const i = Math.min(Math.floor(u), nStage - 2);
      const f = u - i;
      rows[j][k] = stages[i][j] * (1 - f) + stages[i + 1][j] * f;
    }
  }
  return { knots: rows, q0, target };
}

// Optimize a scenario's knots with CMA-ES. Deterministic under seed. With
// robust (the default) each candidate is scored as the worst case over
// robustVariants(dt), or over an explicit variants list; the reported
// finalCheck is an independent fine-timestep nominal evaluation.
export async function optimizeScenario(model, ws, strengthProf, rom, {
  scenario = 'lunge', K = 6, seed = 7, maxGen = 120, sigma0 = 0.25,
  weights = COST_WEIGHTS, x0 = null, lambda = null, plant = null,
  knotFracs = null, locks = null, numerics = null, symmetric = null,
  // Same rule as rolloutCost: the technique's integration, or the notebook's
  // default when a caller hands in no technique at all.
  dt = numerics?.dt ?? NUMERICS_DEFAULTS.dt,
  freeTimes = false, timeLocks = null, timeStepScale = TIME_STEP_SCALE,
  tLo = 0.6, tHi = 3.0, t0 = 1.4, robust = true, variants = null,
  trustRadius = 0, q0 = null, freeStart = false, startGrounded = true, target = null,
  onGeneration = null, onCandidate = null, objectiveBatch = null,
} = {}) {
  let start = x0 || (() => {
    const ref = scenario === 'pike'
      ? pressReference(model, ws, K, rom)
      : scenario === 'tuck'
        ? tuckPressReference(model, ws, K, rom)
        : scenario === 'lunge'
          ? kickReference(model, ws, K, rom)
          : naiveReference(model, ws, scenario, K, rom);
    return encodeDecision(ref.knots, Math.min(Math.max(t0, tLo), tHi));
  })();
  const nTimes = freeTimes ? Math.max(0, K - 2) : 0;
  const freeBase = !startGrounded;
  const nStart = freeStart ? startChannels(freeBase) : 0;
  const startBase = freeBase
    ? (q0 || scenarioStart(model, ws, scenario, rom).q0).slice(0, 3) : null;
  const bounds = decisionBounds(K, { tLo, tHi, rom, locks, freeTimes, timeLocks,
    freeStart, freeBase, startBase });
  // Where the start pose begins the search: the one the technique carries, or
  // the one its scenario solves when it carries none. Same rule as x0 itself
  // -- turning something loose starts it where it already was.
  const start0 = freeStart ? startPoseJoints(model, ws, scenario, rom, q0, freeBase) : null;
  // A vector handed in from before phrasing was searchable -- a stored
  // technique, a warm start from an earlier run -- is short by the interior
  // instants. It gets them from the phrasing it was going to be scored under,
  // so turning the times loose starts the search exactly where it would have
  // started without them rather than jumping to even spacing first.
  const n = NJ * K + 1 + nTimes + nStart;
  // What the incoming vector actually carries.
  //
  // A decision vector has two optional tails -- the interior instants, then
  // the start pose -- and until the start pose existed, "short" could only
  // mean "no instants", so the refit below asked whether entry NJ*K+k was
  // PRESENT. With a start tail it always is, and what it held was the start
  // pose's joint angles. Turning the instants loose on a technique whose start
  // was ALSO loose therefore phrased the movement in radians: every pose
  // landed near the end of the duration and the technique died on the first
  // generation. Asking a per-entry question about a vector that can be short
  // in the MIDDLE is the mistake; the tail is identified as a whole.
  //
  // One ambiguity: at K - 2 === NJ (ten poses on this body) a vector carrying
  // only instants is exactly as long as one carrying only a start. There the
  // layout being ASKED for decides, which is right for the case that matters
  // -- a warm start from the same problem -- and is the only case in which
  // either reading is defensible.
  const nTail = Math.max(0, start.length - (NJ * K + 1));
  const nT = Math.max(0, K - 2);
  // How long a start tail is on THIS run: the joints, plus the base when the
  // technique's hands are not on the floor. Written as NJ throughout, this
  // read a free-base vector's last NJ entries -- which are the last eight
  // joints and the three base coordinates -- as if they were the start pose.
  const nS = nStart || startChannels(freeBase);
  const hadTimes = nT > 0 && (nTail === nT + nS || (nTail === nT && (nT !== nS || freeTimes)));
  const hadStart = nTail === nT + nS ? nT > 0
    : nTail === nS && (nT !== nS || !freeTimes);
  if (start.length !== n) {
    const fitted = new Float64Array(n);
    for (let i = 0; i < NJ * K + 1; i++) fitted[i] = start[i];
    for (let k = 1; k <= nTimes; k++) {
      // From the phrasing this would have been scored under if it were not
      // being searched, so turning the instants loose starts where the search
      // would have started rather than jumping to even spacing first. A vector
      // that already carries them keeps its own.
      fitted[NJ * K + k] = hadTimes ? start[NJ * K + k]
        : (knotFracs ? knotFracs[k] : k / (K - 1));
    }
    // The start pose, when it is being searched: from the vector if it already
    // carried one -- from the END of it, which is where a start tail lives --
    // otherwise from the technique's own start.
    for (let j = 0; j < nStart; j++) {
      fitted[NJ * K + 1 + nTimes + j] = hadStart ? start[start.length - nS + j] : start0[j];
    }
    // Longer than the bounds is the dangerous direction: cmaes sizes itself
    // from x0 and would read past bounds.lo/hi into undefined, which clamps
    // to NaN and poisons the run without ever throwing.
    start = fitted;
  }
  // The start pose may sit exactly on (or, via clamping order, a hair past)
  // a ROM bound; give the start itself room.
  for (let i = 0; i < start.length; i++) {
    start[i] = Math.min(Math.max(start[i], bounds.lo[i]), bounds.hi[i]);
  }
  // Trust region: refine around x0 without wandering into another basin.
  if (trustRadius > 0) {
    // Every entry but the duration, which is a time in seconds rather than an
    // angle in radians and gets its own radius. It is at 6K now, not at the
    // end -- the interior instants are the entries past it, and those are
    // fractions, so the angle radius is the right size for them.
    for (let i = 0; i < start.length; i++) {
      if (i === NJ * K) continue;
      bounds.lo[i] = Math.max(bounds.lo[i], start[i] - trustRadius);
      bounds.hi[i] = Math.min(bounds.hi[i], start[i] + trustRadius);
    }
    bounds.lo[NJ * K] = Math.max(bounds.lo[NJ * K], start[NJ * K] - 0.25);
    bounds.hi[NJ * K] = Math.min(bounds.hi[NJ * K], start[NJ * K] + 0.25);
  }
  const costFn = robust ? robustRolloutCost : rolloutCost;
  // Every candidate is simulated to be scored, and rolloutCost already
  // records the trajectory. onCandidate hands that recording to the caller
  // instead of dropping it, which is what lets a live view draw a whole
  // generation without simulating anything twice.
  const costOpts = { K, dt, weights, q0, freeStart, startGrounded, target, plant, knotFracs, locks, timeLocks,
    numerics, symmetric, ...(variants ? { variants } : {}) };
  const scored = onCandidate
    ? (x) => {
      const c = costFn(model, ws, strengthProf, rom, scenario, x, costOpts);
      onCandidate(x, c);
      return c;
    }
    : (x) => costFn(model, ws, strengthProf, rom, scenario, x, costOpts);
  // Scored before the search rather than after it, so the incumbent is never
  // worse than the technique the search was handed -- including when the
  // search is stopped part way and its incumbent is what gets kept.
  const startCost = costFn(model, ws, strengthProf, rom, scenario, start, costOpts).cost;
  // Angles in radians take the sigma they always did; the instants take a
  // fraction of it, being fractions of a duration. The duration itself is
  // deliberately left at 1: it is pinned at both ends by every caller that
  // matters, and rescaling it would move every stored artifact's search.
  const scales = new Float64Array(start.length).fill(1);
  for (let k = 1; k <= nTimes; k++) scales[NJ * K + k] = timeStepScale;
  const result = await cmaes({
    x0: start, sigma0, seed, maxGen, lambda, bounds, f0: startCost, scales,
    objective: objectiveBatch ? null : (x) => scored(x).cost,
    objectiveBatch,
    onGeneration,
  });
  // At the timestep a replay uses, not a hardcoded one: the whole point of the
  // final check is that the number reported at the end is the number the page
  // reproduces when it plays the answer back.
  const finalCheck = rolloutCost(model, ws, strengthProf, rom, scenario, result.bestX,
    // The same dt the generations ran at, which is the technique's. This said
    // 2e-4 outright -- a number left behind when the default moved, and a
    // third opinion about the one thing search and playback have to share.
    { K, dt, weights, q0, freeStart, startGrounded, target, plant, knotFracs, locks,
      timeLocks, numerics, symmetric });
  // Return knots with the final knot pinned (as they were scored), so
  // presets and replays inherit the parked ending.
  const decoded = decodeDecision(result.bestX, K, nStart);
  if (symmetric ?? SYMMETRIC_SCENARIOS.has(scenario)) symmetrizeKnots(decoded.knots);
  applyLocks(decoded.knots, locks);
  // Finished the same way the scorer finished it, or the phrasing handed back
  // is the raw box sample rather than the movement that was actually scored.
  if (decoded.fracs) applyTimeLocks(decoded.fracs, timeLocks);
  const qBal = target ? Float64Array.from(target) : balancedHandstand(model, ws);
  for (let j = 0; j < NJ; j++) decoded.knots[j][decoded.knots[j].length - 1] = qBal[3 + j];
  // The start pose the search settled on, as a full configuration -- the same
  // one the scorer ran, so adopting it replays what was scored. Null when the
  // start was locked, which is what "the page keeps its own" means.
  decoded.q0 = decoded.start
    ? startPoseFrom(model, ws, scenario, rom, q0, decoded.start,
      symmetric ?? SYMMETRIC_SCENARIOS.has(scenario))
    : null;
  return {
    ...result, K, scenario, finalCheck, decoded,
    // From the finalCheck, which is the fine-timestep nominal evaluation --
    // the same rollout a replay performs, so recording these makes a replay
    // reproduce it exactly.
    plant: finalCheck.plant, numerics: finalCheck.numerics, body: finalCheck.body,
  };
}

// ---------------------------------------------------------------------------
// Catch window: which wrist-angle perturbations (offset, rate) of the
// balanced handstand does the wrist-strategy balance controller recover
// from? The hand stays flat; the whole body above rotates about the wrist.
// ---------------------------------------------------------------------------
export function catchWindow(model, ws, strengthProf, {
  thetaLoDeg = -25, thetaHiDeg = 25, nTheta = 21,
  omegaLo = -2.5, omegaHi = 2.5, nOmega = 21,
  T = 2.5, dt = NUMERICS_DEFAULTS.dt, balanceOpts = {},
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
export function runScenario(model, ws, strengthProf, opts = {}) {
  // The plant this rollout runs on, merged once and handed back with the
  // result. Producers record THIS, never a copy of the defaults, so a run
  // cannot be written down with a plant it was not produced under.
  //
  // Servo impedance is deliberately LOW by default: gravity feedforward
  // carries the static load, so stiffness is not needed for holding, and a
  // stiff servo reacting to wrist balance corrections through the activation
  // lag rings in a small persistent limit cycle (buzzing shoulders near
  // equilibrium). Every recorded run carries its own plant; pass it here on
  // replay.
  const plant = plantFor(opts);
  const {
    integrator, kp, kd, mu, contactZeta, activationTau, dampingRatio, brakeMargin,
    inertiaHz, dampingSpeed, romStopDeg, romStopZeta, kCom, dCom, loopOmegaTau,
    tuckLoadFrac, tuckKneeDeg,
  } = plant;
  const {
    scenario = 'hold',
    knots = null,
    // The pose the technique is trying to end in. Defaults to the balanced
    // handstand -- which is what every stored technique aims at -- but there
    // is no reason the model should only be able to answer the question for
    // one ending. A press to a pike, or a rise to a planche, is the same
    // question asked of a different final shape.
    target = null,
    // A start pose handed in overrides the one the scenario solves for. The
    // shape of a start decides what technique is reachable from it -- a
    // bent-leg press is a different skill from a press because it begins with
    // weight on the feet -- so it is a thing to be able to CONSTRUCT, not an
    // internal detail of a switch statement.
    q0: q0Given = null,
    T = 1.2,
    // Where the poses fall inside [0, T], as fractions. Even spacing when
    // absent, which is every technique recorded before phrasing could be
    // authored -- so a stored artifact replays as the thing it was.
    knotFracs = null,
    settleT = 1.0,
    dt = NUMERICS_DEFAULTS.dt,
    recordEvery = null,
    qdJitter = 0,
    jitterSeed = 1,
    balance = true,
    rom = ROM_DEFAULTS,
    // Whether the start pose stands on its hands. True for every technique
    // this notebook has held until now, and the reason `groundHand` reads as
    // an unconditional fact of the model rather than a choice a technique
    // makes.
    startGrounded = true,
  } = opts;
  const solvedStart = scenarioStart(model, ws, scenario, rom, { tuckLoadFrac, tuckKneeDeg });
  // A body that begins with a toe through the floor is a contact explosion, so
  // a handed-in start is still lifted clear of the ground. That is the one
  // thing done to it, and it is why a start pose can be dragged anywhere
  // without the integrator paying for it.
  // A handed-in start is repaired the same way it is lifted clear of the
  // floor, and for the same reason: it has to be a pose this body can
  // actually hold. Clamping it to the range of motion is not a courtesy --
  // techniques recorded before the trunk gained a hinge carry a start solved
  // by a routine that wrote the stance hip into the left knee, so their q0
  // names a knee folded most of a turn the wrong way. Replayed literally,
  // the servo unwinds it and throws the body off the floor; clamped, the
  // pose is the one that was meant.
  const q0 = q0Given ? seatStart(model, ws, q0Given, rom, startGrounded) : solvedStart.q0;
  let qd0 = q0Given ? null : solvedStart.qd0;
  if (qdJitter > 0) {
    const rand = mulberry32(jitterSeed);
    qd0 = qd0 ? Float64Array.from(qd0) : new Float64Array(model.nq);
    for (let j = 3; j < model.nq; j++) qd0[j] += (2 * rand() - 1) * qdJitter;
  }
  // Widened here for the same reason encodeDecision widens: a replay is handed
  // knots by presets, artifacts, saved files and the page, and the ones
  // written before the trunk could bend describe a body whose spine and neck
  // are straight, which is exactly what a neutral channel says.
  const ref = widenKnots(knots || naiveReference(model, ws, scenario, 6, rom).knots);
  // Ignored rather than trusted if it does not describe THESE knots: a stale
  // set of fractions is a silently different technique, and the fallback --
  // even spacing -- is the only other thing it could honestly mean. Phrasing
  // that IS even is dropped here rather than carried, so a caller that always
  // passes fractions and one that passes none run the same arithmetic.
  const fracs = knotFracs && knotFracs.length === ref[0].length && !evenlySpaced(knotFracs)
    ? Float64Array.from(knotFracs) : null;
  const times = fracs ? knotTimes(T, ref[0].length, fracs) : null;
  const servo = createServo(model, strengthProf, {
    kp, kd, ws, activationTau, dampingRatio, brakeMargin, inertiaHz, dampingSpeed,
    loopOmegaTau,
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
    const handF = model.handContacts.reduce((t, i) => t + contacts.ext.fy[i], 0);
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
    control: servo.makeControl(ref, T, augment, times),
    recordEvery,
  });
  const mo = momenta(model, out.q, out.qd, ws);
  const qBal = target ? Float64Array.from(target) : balancedHandstand(model, ws);
  const heelX = out.q[0] + model.patch.x0, tipX = out.q[0] + model.patch.x1;
  // "Not collapsed" has to be measured against the pose being aimed at. The
  // threshold is the same 0.85 m for a handstand and scales with how low the
  // target's own centre of mass sits, so a press to a pike or a rise to a
  // planche is not reported as a fall for the crime of ending lower down.
  let comYtarget = 0, mTarget = 0;
  fk(model, qBal, null, ws);
  for (let i = 0; i < model.nb; i++) {
    mTarget += model.mass[i];
    comYtarget += model.mass[i] * (ws.py[i] + ws.rcy[i]);
  }
  comYtarget /= mTarget;
  let comYhand = comYtarget;
  if (target) {
    const qh = balancedHandstand(model, ws);
    fk(model, qh, null, ws);
    let c = 0;
    for (let i = 0; i < model.nb; i++) c += model.mass[i] * (ws.py[i] + ws.rcy[i]);
    comYhand = c / mTarget;
  }
  const upright = mo.comY > 0.85 * (comYtarget / (comYhand || 1)) && !out.diverged;
  const over = mo.comX > heelX && mo.comX < tipX;
  const still = Math.hypot(mo.comVx, mo.comVy) < 0.05;
  // "Arrived" means the handstand configuration: joints near the balanced
  // pose (12 deg rms) and no residual foot contact, not merely CoM position.
  let angSum = 0;
  for (let j = 3; j < 3 + NJ; j++) { const d = out.q[j] - qBal[j]; angSum += d * d; }
  const posed = Math.sqrt(angSum / NJ) < 12 * D2R;
  const W = mo.mass * model.gravity;
  const feetFree = model.footContacts
    .reduce((t, list) => t + list.reduce((u, i) => u + contacts.ext.fy[i], 0), 0) < 0.05 * W;
  return {
    ...out, contacts, servo, stops, knots: ref, T, settleT, plant,
    // Reported like the plant and the body: what this rollout actually
    // phrased, so a replay of it reproduces the phrasing too.
    knotFracs: fracs,
    // Reported, not assembled: the integration this rollout used and the body
    // it ran on, so a producer records what actually happened.
    numerics: { dt, settleT },
    body: {
      heightM: model.heightM, massKg: model.massKg,
      straddleDeg: model.straddleDeg, sex: model.sex,
    },
    verdict: {
      upright, over, still, posed, feetFree,
      success: upright && over && still && posed && feetFree,
      comX: mo.comX, comY: mo.comY,
    },
  };
}
