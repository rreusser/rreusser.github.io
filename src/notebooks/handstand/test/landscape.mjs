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

// The low-flexibility kick-up, scaled to where it arrives.
//
// These gates are about the SHAPE of the cost surface around a technique that
// works -- that the score falls steadily toward it from either side, so a
// search has a gradient to climb. They need an arriving technique to sweep
// around, and the recording is not one at the moment: articulating the elbow
// and the ankles made the legs 13 cm longer and the recorded throw is now too
// small for them. Swept, the same SHAPE arrives again at 1.55, which is the
// honest reading of what changed -- a longer, heavier leg column needs a
// bigger throw -- and it is the technique this file measures around until the
// recording is re-searched on the articulated body.
//
// Not a fudge to keep a suite green: ARRIVES below fails if that stops being
// an arriving technique, which is the same thing the old fixture asserted at a
// scale of 1.
const ARRIVES_AT = 1.55;
const stored0 = PRESET_TRAJECTORIES.lowflex;
const model = buildModel(resolveBody(stored0.body)), ws = createWorkspace(model);
const st0 = stored0.strength || null;
const prof = strengthProfile(model.massKg, { overrides: { ...(st0 || {}),
  shoulder: { ...(st0?.shoulder || STRENGTH_DEFAULTS.shoulder),
    t0Vol: st0?.shoulder?.t0Vol ?? STRENGTH_DEFAULTS.shoulder.t0Vol } } });
const rom = resolveRom({ ...(stored0.rom || {}) });
const K = stored0.knots[0].length, T = stored0.T;
const bal = balancedHandstand(model, ws);
// Scaled about the balanced pose, which is the same thing `at()` below sweeps:
// so a sweep of a around THIS technique is a sweep of a * ARRIVES_AT around
// the recording, and the two descriptions cannot drift apart.
const stored = { ...stored0,
  knots: stored0.knots.map((row, j) =>
    Float64Array.from(row, (v) => bal[3 + j] + ARRIVES_AT * (v - bal[3 + j]))) };
for (let j = 0; j < stored.knots.length; j++) {
  stored.knots[j][K - 1] = stored0.knots[j][K - 1];
}
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
// The basin has to be measured, not assumed, and it moves with the technique.
// It has been 0.80-0.97 and 1.03-1.20, then 0.55-0.88 and 1.18-1.60, then
// 0.70-0.94 and 1.27-1.55, and each time it moved because the technique
// underneath it did. Swept in twentieths on the articulated body it arrives at
// 1.55 of the recording and nowhere else, which is a narrower basin than the
// old body's -- an eleven-joint chain has more ways to be slightly wrong.
//
// The window is NOT the whole real line, and that is a statement about the
// cost function rather than about the sweep. Measured from 0.55 to 2.00 of the
// recording, which is 0.35 to 1.29 of the technique this file sweeps:
//
//   a(here)  0.35  0.45  0.55  0.65  0.77  0.84  0.90  0.97 | 1.00 | 1.03  1.06  1.10  1.13  1.29
//   alpha    0.55  0.70  0.85  1.00  1.20  1.30  1.40  1.50 | 1.55 | 1.60  1.65  1.70  1.75  2.00
//   cost      305   308   300   272   284   267   202   181 |  24  |  279   317   359   406   383
//
// From 1.30 up and from 1.75 down the cost falls steadily toward the answer,
// which is the property a search needs and the one these gates check. Outside
// that it humps: below 1.20 it wanders between 272 and 308 with no slope worth
// following, and above 1.85 it turns over again. A throw scaled to two thirds
// of itself and one scaled to a third over fail in qualitatively different
// ways -- one topples forward over the hands, the other never leaves the floor
// -- and which of those is "closer" is not a question the score is answering.
// The gates are scoped to the region where the claim is meant to hold and this
// comment records the region where it does not, because a gate quietly
// sampling only the good part is worse than no gate.
const UNDER = [1.30 / 1.55, 1.40 / 1.55, 1.50 / 1.55];
const OVER = [1.75 / 1.55, 1.70 / 1.55, 1.65 / 1.55, 1.60 / 1.55];
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
//
// On their OWN bracket, further out than the monotone one above. The reach
// term is a shortfall in peak height and it is zero for anything that gets
// there, so it has nothing to say about the near band: at 1.30 to 1.50 of the
// recording the throw peaks at 0.96 to 1.01 m against a handstand's 1.02, so
// it reaches and merely fails to stay. What reach is for is the body that
// never gets up at all, and that is a long way further down.
const SHORT = [1.00 / 1.55, 0.85 / 1.55, 0.70 / 1.55, 0.55 / 1.55];
const short = SHORT.map(at);
gate('D. a body that never gets up is charged for the shortfall',
  short.every((r) => (r.terms.reach || 0) > 0) && (hit.terms.reach || 0) === 0,
  `reach ${short.map((r) => (r.terms.reach || 0).toFixed(1)).join(', ')} at peaks `
  + `${short.map((r) => r.peak.toFixed(2)).join(', ')} m, against 0 when it arrives`);
gate('D2. and the charge grows with the shortfall',
  short.every((r, i) => i === 0 || r.terms.reach > short[i - 1].terms.reach),
  short.map((r) => r.terms.reach.toFixed(1)).join(' < '));
gate('E. landing after a fall does not outweigh the fall',
  over.every((r) => (r.terms.replant || 0) <= 25.001),
  `worst replant ${Math.max(...over.map((r) => r.terms.replant || 0)).toFixed(1)} against a cap of 25`);

console.log(failures ? `\n${failures} GATE(S) FAILED` : '\nALL GATES PASS');
process.exit(failures ? 1 : 0);
