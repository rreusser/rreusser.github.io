// Write a technique. Read it back. Is it the same technique?
//
// Not "does it parse", not "are the knots close" -- is EVERY field the writer
// wrote the field the reader returns. A technique is one object: the knots,
// the tempo, the phrasing, which poses are held, which instants are pinned,
// the start pose, the ending it aims at, the mirror, the anatomy, the
// strength, the body, the plant, the integration and the search settings. A
// save/load that keeps some of those and re-derives the rest is not a
// save/load, and that is exactly what the editor had: loading a FILE restored
// all of it while picking the same technique out of the list beside it kept
// the knots and the tempo and threw the rest away -- including the pose count,
// so a six-pose technique opened into a seven-pose editor came back resampled
// to seven.
//
// This file gates the format. It cannot reach into the editor's own reader,
// but it can make the contract the editor reads against explicit: whatever
// techniqueToJSON writes, techniqueFromJSON gives back, field for field, with
// nothing dropped and nothing invented.
//
// Run: node src/notebooks/handstand/test/round-trip.mjs
import { buildModel } from '../anthropometry.js';
import { createWorkspace } from '../dynamics.js';
import { ROM_DEFAULTS } from '../statics.js';
import { builtinPresets } from '../presets.js';
import { techniqueToJSON, techniqueFromJSON } from '../technique-file.js';
import { JOINT_ORDER } from '../control.js';

let failures = 0;
function gate(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const model = buildModel({});
const ws = createWorkspace(model);
const NJ = JOINT_ORDER.length;

// A technique with every field set to something DISTINCTIVE, so a field that
// is silently re-derived instead of restored comes back wrong rather than
// coming back right by luck. A preset whose holds are all false and whose
// instants are all pinned cannot tell "restored" from "defaulted".
const base = builtinPresets(model, ws, ROM_DEFAULTS).lunge;
const K = 5;
const knots = Array.from({ length: NJ }, (_, j) =>
  Array.from({ length: K }, (_, k) => 0.11 * (j + 1) - 0.037 * k));
const original = {
  label: 'a distinctive name',
  saved: '2026-08-23T12:00:00.000Z',
  scenario: 'lunge',
  knots,
  T: 1.234,
  // Deliberately uneven: even spacing is what a dropped field falls back to.
  knotFracs: [0, 0.17, 0.41, 0.79, 1],
  // Deliberately not "only the last": that is the fallback too.
  held: [true, false, true, false, true],
  // Deliberately not all-pinned, for the same reason.
  timeHeld: [true, false, false, true, true],
  // The kick-up is asymmetric by default, so true is a real choice here.
  symmetric: true,
  q0: Array.from({ length: model.nq }, (_, i) => 0.05 * i),
  target: Array.from({ length: model.nq }, (_, i) => 0.02 * i),
  rom: { ...ROM_DEFAULTS, hipFlexStraightKneeMaxDeg: 97, shoulderFlexMaxDeg: 171,
    wristExtMaxDeg: 128, spineFlexMaxDeg: 39 },
  strength: { shoulder: { t0Vol: 2.35, wmax: 18, wc: 7, amin: 0.7, w1: 0, m: 0.3 } },
  body: { heightM: 1.83, massKg: 77, straddleDeg: 15, sex: 'female' },
  config: { ...base.config, kp: 1350, dampingRatio: 1.85, loopOmegaTau: 2.4, activationTau: 0.065 },
  numerics: { ...base.numerics, dt: 1.5e-4, settleT: 3.1 },
  search: { seed: 42, maxGen: 260 },
  verdict: null,
  cost: null,
};

const written = techniqueToJSON(original);
const read = techniqueFromJSON(JSON.parse(JSON.stringify(written)));

const num = (v) => (v == null ? v : +v);
const list = (v) => (v == null ? null : Array.from(v, num));
const bools = (v) => (v == null ? null : Array.from(v, Boolean));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

gate('the pose count survives', read.knots[0].length === K,
  `wrote ${K}, read ${read.knots[0].length}`);
gate('every joint channel survives', read.knots.length === NJ,
  `wrote ${NJ}, read ${read.knots.length}`);
gate('the knots survive, to the bit',
  same(original.knots.map(list), read.knots.map(list)));
gate('the tempo survives', read.T === original.T, `${original.T} -> ${read.T}`);
gate('the phrasing survives', same(original.knotFracs, list(read.knotFracs)),
  `${JSON.stringify(original.knotFracs)} -> ${JSON.stringify(list(read.knotFracs))}`);
gate('which poses are held survives', same(original.held, bools(read.held)),
  `${JSON.stringify(original.held)} -> ${JSON.stringify(bools(read.held))}`);
gate('which instants are pinned survives', same(original.timeHeld, bools(read.timeHeld)),
  `${JSON.stringify(original.timeHeld)} -> ${JSON.stringify(bools(read.timeHeld))}`);
gate('the mirror survives', read.symmetric === original.symmetric,
  `${original.symmetric} -> ${read.symmetric}`);
gate('the start pose survives', same(original.q0, list(read.q0)));
gate('the ending it aims at survives', same(original.target, list(read.target)));
gate('the anatomy survives',
  read.rom.hipFlexStraightKneeMaxDeg === 97 && read.rom.shoulderFlexMaxDeg === 171
  && read.rom.wristExtMaxDeg === 128 && read.rom.spineFlexMaxDeg === 39);
gate('the strength survives', read.strength?.shoulder?.t0Vol === 2.35,
  `${read.strength?.shoulder?.t0Vol}`);
gate('the body survives',
  read.body.heightM === 1.83 && read.body.massKg === 77
  && read.body.straddleDeg === 15 && read.body.sex === 'female');
gate('the plant survives',
  read.config.kp === 1350 && read.config.dampingRatio === 1.85
  && read.config.loopOmegaTau === 2.4 && read.config.activationTau === 0.065);
gate('the integration survives',
  read.numerics.dt === 1.5e-4 && read.numerics.settleT === 3.1);
gate('the search settings survive',
  read.search.seed === 42 && read.search.maxGen === 260,
  `seed ${read.search.seed}, maxGen ${read.search.maxGen}`);

// And the writer is total: a second trip must be a fixed point, or some field
// is being normalised on the way out and re-normalised differently next time.
const again = techniqueToJSON(read);
gate('writing what was read gives the same file back', same(written, again),
  Object.keys(written).filter((k) => !same(written[k], again[k])).join(', ') || 'identical');

// Nothing the writer emits may be missing from what the reader returns. This
// is the gate that would have caught the editor's picker path: it dropped five
// fields, and every one of them was a field the writer had written.
const CARRIED = ['label', 'saved', 'scenario', 'knots', 'T', 'knotFracs', 'held', 'timeHeld',
  'symmetric', 'q0', 'target', 'rom', 'strength', 'body', 'config', 'numerics', 'search'];
const missing = CARRIED.filter((k) => read[k] === undefined);
gate('the reader returns every field the writer wrote', missing.length === 0,
  missing.length ? `dropped: ${missing.join(', ')}` : `${CARRIED.length} fields`);

console.log(failures ? `\n${failures} GATE(S) FAILED` : '\nALL GATES PASS');
process.exit(failures ? 1 : 0);
