// Verification gates for splines, the rollout cost, CMA-ES, and the catch
// window. The optimization gates are budgeted small; the full runs used by
// the notebook presets happen offline via scripts/optimize.mjs.
//
// Run: node src/notebooks/handstand/test/rollout.mjs   (~30 s)
import { buildModel } from '../anthropometry.js';
import { createWorkspace } from '../dynamics.js';
import { strengthProfile } from '../strength.js';
import { ROM_DEFAULTS } from '../statics.js';
import { splineEval } from '../control.js';
import { cmaes } from '../cma-es.js';
import {
  naiveReference, kickReference, encodeDecision, decodeDecision, decisionBounds,
  rolloutCost, optimizeScenario, catchWindow, balancedHandstand, COST_WEIGHTS,
  scenarioStart, HANDSTAND_TARGET_FRAC, TUCK_LOAD_FRAC, SYMMETRIC_SCENARIOS,
  tuckPressReference,
} from '../rollout.js';
import { momenta, fk } from '../dynamics.js';

let failures = 0;
function gate(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const model = buildModel({ heightM: 1.75, massKg: 70 });
const ws = createWorkspace(model);
const prof = strengthProfile(model.massKg);
const rom = { ...ROM_DEFAULTS };

// ---------------------------------------------------------------------------
// Gate A: spline interpolation. Endpoints hit the first/last knots, the
// curve passes through interior knots, and the analytic rate matches finite
// differences.
// ---------------------------------------------------------------------------
{
  const knots = Float64Array.of(0.2, -0.5, 1.1, 0.7, 0.3);
  const T = 1.7;
  let worstKnot = 0;
  for (let k = 0; k < knots.length; k++) {
    const t = (k / (knots.length - 1)) * T;
    worstKnot = Math.max(worstKnot, Math.abs(splineEval(knots, T, t).value - knots[k]));
  }
  let worstRate = 0;
  for (let t = 0.05; t < T; t += 0.09) {
    const h = 1e-6;
    const fd = (splineEval(knots, T, t + h).value - splineEval(knots, T, t - h).value) / (2 * h);
    worstRate = Math.max(worstRate, Math.abs(fd - splineEval(knots, T, t).rate));
  }
  const clamped = splineEval(knots, T, -1).value === knots[0] && splineEval(knots, T, 9).value === knots[4];
  gate('A: spline hits knots, analytic rate matches FD, clamps outside [0,T]',
    worstKnot < 1e-12 && worstRate < 1e-6 && clamped,
    `knot err=${worstKnot.toExponential(1)}, rate err=${worstRate.toExponential(1)}`);
}

// ---------------------------------------------------------------------------
// Gate B: decision vector round trip and bounds shape.
// ---------------------------------------------------------------------------
{
  const naive = naiveReference(model, ws, 'lunge', 6);
  const x = encodeDecision(naive.knots, 1.4);
  const dec = decodeDecision(x, 6);
  let worst = 0;
  for (let j = 0; j < 6; j++) {
    for (let k = 0; k < 6; k++) worst = Math.max(worst, Math.abs(dec.knots[j][k] - naive.knots[j][k]));
  }
  const b = decisionBounds(6);
  gate('B: encode/decode round trip, bounds sized 6K+1',
    worst === 0 && dec.T === 1.4 && b.lo.length === 37 && b.hi.length === 37,
    `n=${b.lo.length}`);
}

// ---------------------------------------------------------------------------
// Gate C: rollout cost is deterministic and its terms are finite.
// ---------------------------------------------------------------------------
{
  const x = encodeDecision(naiveReference(model, ws, 'lunge', 6).knots, 1.4);
  const c1 = rolloutCost(model, ws, prof, rom, 'lunge', x, {});
  const c2 = rolloutCost(model, ws, prof, rom, 'lunge', x, {});
  const finite = Object.values(c1.terms).every(Number.isFinite);
  gate('C: rollout cost deterministic and finite', c1.cost === c2.cost && finite,
    `cost=${c1.cost.toFixed(2)}`);
}

// ---------------------------------------------------------------------------
// Gate D: CMA-ES solves the 43-d sphere to high precision and cuts 43-d
// Rosenbrock by >99.5% within budget; identical seeds give identical runs.
// ---------------------------------------------------------------------------
{
  const n = 43;
  const sphere = (x) => x.reduce((s, v) => s + v * v, 0);
  const s1 = await cmaes({ x0: new Float64Array(n).fill(2), sigma0: 0.5, seed: 5, maxGen: 800, objective: sphere });
  const s2 = await cmaes({ x0: new Float64Array(n).fill(2), sigma0: 0.5, seed: 5, maxGen: 800, objective: sphere });
  const rosen = (x) => {
    let s = 0;
    for (let i = 0; i < n - 1; i++) s += 100 * (x[i + 1] - x[i] * x[i]) ** 2 + (1 - x[i]) ** 2;
    return s;
  };
  const r0 = rosen(new Float64Array(n).fill(-1));
  const r = await cmaes({ x0: new Float64Array(n).fill(-1), sigma0: 0.3, seed: 3, maxGen: 1500, objective: rosen });
  gate('D: CMA-ES sphere to 1e-12, Rosenbrock cut >99.5%, seed-deterministic',
    s1.best < 1e-12 && s1.best === s2.best && r.best < 0.005 * r0,
    `sphere=${s1.best.toExponential(1)}, rosen ${r0.toFixed(0)} -> ${r.best.toFixed(1)}`);
}

// ---------------------------------------------------------------------------
// Gate E: a hand-crafted hold trajectory (constant knots at the balanced
// pose) scores as success with near-zero pose cost.
// ---------------------------------------------------------------------------
{
  const qBal = balancedHandstand(model, ws);
  const knots = [];
  for (let j = 0; j < 6; j++) knots.push(new Float64Array(6).fill(qBal[3 + j]));
  const c = rolloutCost(model, ws, prof, rom, 'hold', encodeDecision(knots, 1.0), {});
  gate('E: constant balanced-pose trajectory scores success',
    c.verdict.success && c.terms.pose < 0.5 && c.terms.fall === 0,
    `cost=${c.cost.toFixed(3)}, pose=${c.terms.pose.toFixed(3)}`);
}

// ---------------------------------------------------------------------------
// Gate F: a small-budget kick-up optimization never regresses below its own
// start (the start is a candidate), makes at least some progress, and is
// bitwise-deterministic under the same seed.
// ---------------------------------------------------------------------------
{
  const startX = encodeDecision(kickReference(model, ws, 6, rom).knots, 1.4);
  const startCost = rolloutCost(model, ws, prof, rom, 'lunge', startX, { dt: 2.5e-4 }).cost;
  const o1 = await optimizeScenario(model, ws, prof, rom, { scenario: 'lunge', maxGen: 15, seed: 11, robust: false });
  const o2 = await optimizeScenario(model, ws, prof, rom, { scenario: 'lunge', maxGen: 15, seed: 11, robust: false });
  gate('F: small-budget optimization never regresses, improves, deterministic',
    o1.best <= startCost && o1.best < startCost * 0.99 && o1.best === o2.best,
    `start=${startCost.toFixed(1)}, optimized=${o1.best.toFixed(1)}`);
}

// ---------------------------------------------------------------------------
// Gate G: catch window sanity. The unperturbed balanced pose is caught; a
// huge wrist-rate perturbation is not; the window is monotone enough that
// the success count is strictly between 0 and the full grid.
// ---------------------------------------------------------------------------
{
  const grid = catchWindow(model, ws, prof, {
    thetaLoDeg: -20, thetaHiDeg: 20, nTheta: 5,
    omegaLo: -2.4, omegaHi: 2.4, nOmega: 5,
    T: 2.0,
  });
  const mid = grid.success[2 * 5 + 2];
  const extreme = grid.success[4 * 5 + 4];
  let count = 0;
  for (const s of grid.success) count += s;
  gate('G: catch window catches the center, drops the extreme corner',
    mid === 1 && extreme === 0 && count > 0 && count < 25,
    `caught ${count}/25 cells`);
}

// ---------------------------------------------------------------------------
// Gate H: the metabolic work term charges for churning. Starting from the
// same balanced pose, a reference that pumps the hips back and forth must
// score far more work than the constant hold, even though both end balanced.
// This is the term that makes leg-flailing trajectories read as expensive.
// ---------------------------------------------------------------------------
{
  const qBal = balancedHandstand(model, ws);
  const constKnots = [], pumpKnots = [];
  for (let j = 0; j < 6; j++) {
    constKnots.push(new Float64Array(6).fill(qBal[3 + j]));
    const row = new Float64Array(6).fill(qBal[3 + j]);
    if (j === 2 || j === 4) {
      for (let k = 1; k < 5; k++) row[k] += (k % 2 ? 0.5 : -0.5);
    }
    pumpKnots.push(row);
  }
  const cHold = rolloutCost(model, ws, prof, rom, 'hold', encodeDecision(constKnots, 1.2), {});
  const cPump = rolloutCost(model, ws, prof, rom, 'hold', encodeDecision(pumpKnots, 1.2), {});
  gate('H: pumping the legs multiplies the metabolic work term',
    cPump.terms.work > 5 * Math.max(cHold.terms.work, 0.02),
    `hold work=${cHold.terms.work.toFixed(3)}, pump work=${cPump.terms.work.toFixed(3)} (mgH-normalized, weighted)`);
  gate('H2: pumping the legs multiplies the smoothness (acceleration) term',
    cPump.terms.smooth > 10 * Math.max(cHold.terms.smooth, 0.01),
    `hold smooth=${cHold.terms.smooth.toFixed(3)}, pump smooth=${cPump.terms.smooth.toFixed(3)}`);
}

// ---------------------------------------------------------------------------
// Gate I: the range-of-motion term is normalized, not nominal.
//
// romPenalty returns squared RADIANS, and for a long time the cost used it
// raw. Twelve degrees outside your anatomy is 0.044 rad^2, so holding it for
// an entire rollout scored 0.18 against about 1.4 for the work term, and the
// optimizer cheerfully paid that to hyperextend a knee. The term is now
// measured against the end-stop's own design penetration, so parking a joint
// one stop-depth outside its range costs about the rom weight itself. This
// gate fails if the normalization is ever dropped: the same violation would
// come back a few hundred times cheaper.
// ---------------------------------------------------------------------------
{
  const qBal = balancedHandstand(model, ws);
  const knots = [];
  for (let j = 0; j < 6; j++) knots.push(new Float64Array(6).fill(qBal[3 + j]));
  // Command the left knee far into hyperextension; the end-stops hold it about
  // one design penetration (5 deg) outside its 3 deg limit for the rollout.
  knots[3] = new Float64Array(6).fill(40 * Math.PI / 180);
  const c = rolloutCost(model, ws, prof, rom, 'hold', encodeDecision(knots, 1.0),
    { settleT: 1.0, pinFinal: false });
  gate('I: a joint parked one stop-depth outside its range costs ~the rom weight',
    c.terms.rom > 0.3 * COST_WEIGHTS.rom && c.terms.rom < 3 * COST_WEIGHTS.rom,
    `rom term=${c.terms.rom.toFixed(3)} against weight ${COST_WEIGHTS.rom}`);
}

// ---------------------------------------------------------------------------
// Gate J: the press starts are the poses the skills actually start from, over
// the whole range of bodies. Both solve the wrist that puts a toe on the
// floor and then the shoulder lean that places the centre of mass, and the
// toe solve is a root find on a quantity that is NOT monotone: leaning back
// swings the toe down and then up again. Widening the wrist's range once
// moved the bracket past that turning point, and the flexible pike start
// silently became a seated collapse with the centre of mass a third of a
// metre behind the hand -- which every press optimized from it then failed to
// be. Nothing caught it, so this does.
//
// The two starts want different things, and the difference is the skill. A
// press starts BALANCED OVER THE PALMS, with the legs carrying nothing. A
// bent-leg press starts standing in a fold with real load still on the feet,
// because it is entered by hopping off them; the share of body weight on the
// legs is just how far the centre of mass sits from the hand toward the toes.
{
  const zero = new Float64Array(model.nq);
  const targetX = model.patch.x0 + HANDSTAND_TARGET_FRAC * (model.patch.x1 - model.patch.x0);
  const measure = (scenario, ham) => {
    const { q0 } = scenarioStart(model, ws, scenario, { ...rom, hipFlexStraightKneeMaxDeg: ham });
    const mo = momenta(model, q0, zero, ws);
    fk(model, q0, null, ws);
    const cpt = model.contacts.find((c) => c.body === 4);
    const th = ws.th[4];
    const toe = ws.px[4] + Math.cos(th) * cpt.x - Math.sin(th) * cpt.y - q0[0];
    const palmC = 0.5 * (model.patch.x0 + model.patch.x1);
    const com = mo.comX - q0[0];
    return { com, comY: mo.comY, onFeet: (com - palmC) / (toe - palmC) };
  };
  const HAMS = [70, 85, 100, 125, 140];
  let worstBehind = -Infinity, lowest = Infinity, worstCase = '';
  for (const ham of HAMS) {
    const m = measure('pike', ham);
    const behind = model.patch.x0 - m.com;
    if (behind > worstBehind) { worstBehind = behind; worstCase = `ham ${ham}`; }
    if (m.comY < lowest) lowest = m.comY;
  }
  gate('J: the press start stands balanced over the palm at every hamstring length',
    worstBehind < 0.05 && lowest > 0.45,
    `furthest behind the heel ${(worstBehind * 1000).toFixed(0)} mm (${worstCase}),`
    + ` lowest CoM ${lowest.toFixed(2)} m, target ${(targetX * 1000).toFixed(0)} mm ahead of the heel`);

  let loOnFeet = Infinity, hiOnFeet = -Infinity, lowT = Infinity;
  for (const ham of HAMS) {
    const m = measure('tuck', ham);
    loOnFeet = Math.min(loOnFeet, m.onFeet);
    hiOnFeet = Math.max(hiOnFeet, m.onFeet);
    lowT = Math.min(lowT, m.comY);
  }
  gate('K: the bent-leg press start stands on its feet with its hands down',
    loOnFeet > 0.15 && hiOnFeet < 0.6 && lowT > 0.45,
    `weight on the legs ${(loOnFeet * 100).toFixed(0)}-${(hiOnFeet * 100).toFixed(0)}%`
    + ` (asked for ${(TUCK_LOAD_FRAC * 100).toFixed(0)}%), lowest CoM ${lowT.toFixed(2)} m`);
}

// ---------------------------------------------------------------------------
// Gate L: the symmetric skills are scored symmetrically. The decision vector
// carries a hip and a knee per leg for the kick-up's sake, so nothing stops a
// press from scissoring its legs -- and the bent-leg press duly arrived with
// one leg straight and the other folded ninety degrees. Mirroring makes an
// asymmetric vector score exactly as its left leg alone would.
{
  const ref = tuckPressReference(model, ws, 6, rom);
  const asym = encodeDecision(ref.knots.map((r) => Float64Array.from(r)), 1.8);
  const mirrored = encodeDecision(ref.knots.map((r) => Float64Array.from(r)), 1.8);
  // Bend the right leg away from the left in the raw vector; rows are
  // [wrist, shoulder, hipL, kneeL, hipR, kneeR], K knots each.
  for (let k = 0; k < 6; k++) { asym[4 * 6 + k] += 0.4; asym[5 * 6 + k] -= 0.5; }
  const a = rolloutCost(model, ws, prof, rom, 'tuck', asym, { K: 6, dt: 5e-4 });
  const b = rolloutCost(model, ws, prof, rom, 'tuck', mirrored, { K: 6, dt: 5e-4 });
  gate('L: a symmetric scenario ignores the right leg\'s own parameters',
    SYMMETRIC_SCENARIOS.has('tuck') && SYMMETRIC_SCENARIOS.has('pike')
      && Math.abs(a.cost - b.cost) < 1e-9,
    `scissored ${a.cost.toFixed(4)} vs mirrored ${b.cost.toFixed(4)}`);
}

console.log(failures ? `\n${failures} gate(s) FAILED` : '\nAll rollout gates passed');
process.exit(failures ? 1 : 0);
