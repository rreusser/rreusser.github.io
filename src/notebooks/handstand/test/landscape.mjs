// Does a failing technique get told WHICH WAY it is wrong?
//
// The search is a local one. It can only follow a slope, so a family of
// techniques that all fail has to be ranked by how close each came, or there
// is nothing to follow and the answer has to be found by luck. The kick-up is
// where this bites: throw too weak and the body never gets up, throw too hard
// and it goes over the front, and both are simply "it fell".
//
// This file sweeps one knob -- how far every knot reaches away from the
// finished handstand -- from plainly too weak, through the technique that
// works, to plainly too hard, and insists the score descends into the answer
// from both sides.
//
// Measured before the terms these gates protect existed, the same sweep read
// 954, 278, 248, 503, [4.4], 349, 322, 286, 415: a needle in a field of noise,
// where a technique 6% short scored twice as badly as one 20% short.
//
// Run: node src/notebooks/handstand/test/landscape.mjs
import { buildModel } from '../anthropometry.js';
import { createWorkspace } from '../dynamics.js';
import { strengthProfile, STRENGTH_DEFAULTS } from '../strength.js';
import {
  rolloutCost, encodeDecision, resolvePlant, resolveRom, resolveBody, resolveNumerics,
  balancedHandstand,
} from '../rollout.js';
import { PRESET_TRAJECTORIES } from '../presets.js';

let failures = 0;
function gate(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const stored = PRESET_TRAJECTORIES.lowflex;
const model = buildModel(resolveBody(stored.body)), ws = createWorkspace(model);
const st0 = stored.strength || null;
const prof = strengthProfile(model.massKg, { overrides: { ...(st0 || {}),
  shoulder: { ...(st0?.shoulder || STRENGTH_DEFAULTS.shoulder),
    t0Vol: st0?.shoulder?.t0Vol ?? STRENGTH_DEFAULTS.shoulder.t0Vol } } });
const rom = resolveRom({ ...(stored.rom || {}) });
const K = stored.knots[0].length, T = stored.T;
const bal = balancedHandstand(model, ws);
const target = new Float64Array(model.nq);
for (let j = 0; j < stored.knots.length; j++) target[3 + j] = stored.knots[j][K - 1];
// The technique's own start, phrasing and integration. A recorded built-in
// carries all three, and a sweep that supplies its own instead is not a sweep
// AROUND this technique -- it is a sweep around a different movement that
// happens to share its knots, and the first thing it reports is that the
// technique does not arrive.
const base = {
  K, target, plant: resolvePlant(stored.config),
  dt: resolveNumerics(stored.numerics).dt,
  q0: stored.q0 ? Float64Array.from(stored.q0) : null,
  knotFracs: stored.knotFracs ? Float64Array.from(stored.knotFracs) : null,
  numerics: resolveNumerics(stored.numerics),
};

const at = (a) => {
  const kn = stored.knots.map((row, j) =>
    Float64Array.from(row, (v) => bal[3 + j] + a * (v - bal[3 + j])));
  const c = rolloutCost(model, ws, prof, rom, stored.scenario, encodeDecision(kn, T), base);
  let peak = -Infinity;
  for (let k = 0; k < c.rec.t.length; k++) peak = Math.max(peak, c.rec.com[k][1]);
  return { cost: c.cost, ok: !!c.verdict?.success, peak, terms: c.terms };
};

// Where the slope is claimed, and where it is not.
//
// The basin has to be measured, not assumed, and it moves with the technique:
// swept in twentieths this one arrives from 1.00 to 1.20 and nowhere else, so
// the bracket has to sit outside that. It used to be 0.80-0.97 and 1.03-1.20,
// then 0.55-0.88 and 1.18-1.60, and each time it was widened because the
// technique underneath it had a bigger basin than the sweep did.
//
// The window is also NOT the whole real line, and that is a statement about
// the cost function rather than about the sweep. Measured from 0.40 to 2.00:
//
//   alpha   0.40  0.55  0.65  0.70  0.80  0.90  0.95 | 1.00-1.20 | 1.25  1.35  1.55  1.60  2.00
//   cost     370   398   458   437   331   266   201 |  arrives   |  221   370   394   338   367
//
// From 0.70 up and from 1.55 down the cost falls steadily toward the answer,
// which is the property a search needs and the one these gates check. Outside
// that it humps: a throw scaled to two thirds of itself and one scaled to a
// third fail in qualitatively different ways -- one topples forward over the
// hands, the other never leaves the floor -- and which of those is "closer" is
// not a question the score is answering. The gates are scoped to the region
// where the claim is meant to hold and this comment records the region where
// it does not, because a gate quietly sampling only the good part is worse
// than no gate.
const UNDER = [0.70, 0.78, 0.86, 0.94];
const OVER = [1.55, 1.45, 1.35, 1.27];
const hit = at(1.00);
const under = UNDER.map(at);
const over = OVER.map(at);

console.log('  alpha  cost      peak   arrives');
for (const [a, r] of [...UNDER.map((a, i) => [a, under[i]]), [1.00, hit],
  ...OVER.slice().reverse().map((a, i) => [a, over.slice().reverse()[i]])]) {
  console.log(`  ${a.toFixed(2)}  ${r.cost.toFixed(1).padStart(7)}   ${r.peak.toFixed(3)}   ${r.ok}`);
}
console.log('');

// A basin rather than a needle. What matters is that the technique arrives and
// that the bracket around it does not: "exactly one alpha works" was a
// description of a knot set balanced on a knife edge, and it stopped being
// true the moment the reference got a margin worth having.
gate('A. the technique arrives, and the sweep around it does not',
  hit.ok && !under.some((r) => r.ok) && !over.some((r) => r.ok),
  `arrives at 1.00 (cost ${hit.cost.toFixed(2)}); bracket ` +
  `${[...under, ...over].filter((r) => r.ok).length} arrivals`);

// Monotone toward the answer, from below.
let bad = [];
for (let i = 1; i < under.length; i++) {
  if (!(under[i].cost < under[i - 1].cost)) bad.push(`${UNDER[i - 1]}->${UNDER[i]}`);
}
gate('B. too weak a throw gets cheaper as it gets closer', bad.length === 0,
  bad.length ? `not monotone at ${bad.join(', ')}`
    : under.map((r) => r.cost.toFixed(0)).join(' > ') + ` > ${hit.cost.toFixed(1)}`);
gate('B2. and the last of them still costs far more than arriving',
  under[under.length - 1].cost > 5 * hit.cost,
  `${under[under.length - 1].cost.toFixed(0)} against ${hit.cost.toFixed(1)}`);

// And from above.
bad = [];
for (let i = 1; i < over.length; i++) {
  if (!(over[i].cost < over[i - 1].cost)) bad.push(`${OVER[i - 1]}->${OVER[i]}`);
}
gate('C. and so does too hard a one', bad.length === 0,
  bad.length ? `not monotone at ${bad.join(', ')}`
    : over.map((r) => r.cost.toFixed(0)).join(' > ') + ` > ${hit.cost.toFixed(1)}`);

// The two mechanisms, named, so a regression says which one broke.
gate('D. a body that never gets up is charged for the shortfall',
  under.every((r) => (r.terms.reach || 0) > 0) && (hit.terms.reach || 0) === 0,
  `reach ${under.map((r) => (r.terms.reach || 0).toFixed(1)).join(', ')} against 0 when it arrives`);
gate('D2. and the charge grows with the shortfall',
  under.every((r, i) => i === 0 || r.terms.reach < under[i - 1].terms.reach),
  under.map((r) => r.terms.reach.toFixed(1)).join(' > '));
gate('E. landing after a fall does not outweigh the fall',
  over.every((r) => (r.terms.replant || 0) <= 25.001),
  `worst replant ${Math.max(...over.map((r) => r.terms.replant || 0)).toFixed(1)} against a cap of 25`);

console.log(failures ? `\n${failures} GATE(S) FAILED` : '\nALL GATES PASS');
process.exit(failures ? 1 : 0);
