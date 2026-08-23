// Reading and writing a technique as JSON.
//
// "Everything required to reproduce the case" is not a judgement call here:
// it is the list test/plumbing.mjs and test/agreement.mjs enumerate, which is
// every input that changes what runScenario integrates. Anything on that list
// missing from the file is a case that loads back as a different movement,
// which is the failure this notebook has spent its whole history chasing.
//
//   scenario     which skill, which start the solver builds when none is given
//   knots, T     the technique itself
//   knotFracs    where the poses fall inside T, when it was phrased by hand
//   held         which poses the search may not move
//   timeHeld     which poses the search may not move in time
//   symmetric    whether the two legs do the same thing
//   q0           the start pose, when one was constructed rather than solved
//   target       the ending pose (derived from the last knot, stored to check)
//   rom          the anatomy, fully resolved
//   strength     the strength overrides
//   body         the frame: height, mass, straddle, sex
//   config       the plant, fully resolved
//   numerics     the integration a replay uses
//   search       seed and generation count -- not part of the movement, but
//                part of reproducing how it was found
//
// The shape is deliberately the shape a built-in preset is derived in, so a file
// saved here can be dropped into the registry the regression suite replays.
import {
  resolvePlant, resolveRom, resolveNumerics, resolveBody, balancedHandstand,
  SYMMETRIC_SCENARIOS, widenKnots, encodeDecision,
} from './rollout.js';
import { JOINT_ORDER, LEGACY_JOINT_ORDER } from './control.js';

export const TECHNIQUE_FORMAT = 'handstand-technique';
// 2, because everything written as 1 is suspect. Until this version the
// editor had two readers for one format: loading a FILE restored the whole
// technique, while picking the same technique out of the list beside it
// restored the knots and the tempo, re-derived the holds, the pins, the start
// pose and the mirror, and -- worst -- took the POSE COUNT from whatever was
// already on screen, resampling the knots onto it. So a technique kept after
// opening another one was written down with a shape its author never chose,
// and the file is a faithful record of the wrong thing.
//
// There is no migration, because there is nothing to migrate to: the
// information about what was intended was destroyed before the file was
// written. A version 1 file is refused, by name, rather than opened into
// something that looks right.
export const TECHNIQUE_VERSION = 2;
export const TECHNIQUE_MIN_VERSION = 2;

const arr = (a) => (a == null ? null : Array.from(a, (v) => +v));
const mat = (m) => (m == null ? null : m.map((row) => Array.from(row, (v) => +v)));

// A technique, as the object that goes in the file. Everything is resolved on
// the way out rather than on the way in: a file that says what it ran under
// cannot be re-read differently later when a default moves.
export function techniqueToJSON(t) {
  return {
    format: TECHNIQUE_FORMAT,
    version: TECHNIQUE_VERSION,
    label: t.label || '',
    saved: t.saved || null,
    scenario: t.scenario,
    knots: mat(t.knots),
    T: +t.T,
    knotFracs: arr(t.knotFracs),
    held: t.held ? Array.from(t.held, (v) => !!v) : null,
    timeHeld: t.timeHeld ? Array.from(t.timeHeld, (v) => !!v) : null,
    symmetric: !!t.symmetric,
    q0: arr(t.q0),
    target: arr(t.target),
    rom: { ...resolveRom(t.rom) },
    strength: t.strength ? JSON.parse(JSON.stringify(t.strength)) : null,
    body: { ...resolveBody(t.body) },
    config: { ...resolvePlant(t.config) },
    numerics: { ...resolveNumerics(t.numerics) },
    search: { seed: t.search?.seed ?? 7, maxGen: t.search?.maxGen ?? 120 },
    // Informational: what it did when it was saved. Never read back as input --
    // a replay recomputes it, and the two disagreeing is the point of saving it.
    verdict: t.verdict || null,
    cost: t.cost == null ? null : +t.cost,
  };
}

// The other direction, with the checks a file read off disk deserves.
export function techniqueFromJSON(json) {
  const j = typeof json === 'string' ? JSON.parse(json) : json;
  if (!j || typeof j !== 'object') throw new Error('not a technique file');
  if (j.format !== TECHNIQUE_FORMAT) {
    throw new Error(`not a technique file (format "${j.format ?? 'missing'}")`);
  }
  if (!(j.version <= TECHNIQUE_VERSION)) {
    throw new Error(`saved by a newer version of this notebook (version ${j.version})`);
  }
  if (!(j.version >= TECHNIQUE_MIN_VERSION)) {
    throw new Error(`saved by a version of this notebook whose editor could change a `
      + `technique's pose count while opening it, so what is in this file is not `
      + `necessarily what was authored (version ${j.version}). Rebuild it and keep it again.`);
  }
  // Both widths are a technique: LEGACY_JOINT_ORDER is what every file
  // written before the trunk gained a hinge says, and widenKnots turns it
  // into today's body with a straight spine and a level head -- which is
  // exactly what those files meant. Refusing them would have made every
  // saved technique unopenable, which is what a written-down six did.
  const NJ = JOINT_ORDER.length, NJ0 = LEGACY_JOINT_ORDER.length;
  if (!Array.isArray(j.knots) || !j.knots.every(Array.isArray)
    || (j.knots.length !== NJ && j.knots.length !== NJ0)) {
    throw new Error(`knots must be ${NJ0} or ${NJ} arrays, one per joint`);
  }
  const K = j.knots[0].length;
  if (K < 1 || !j.knots.every((r) => r.length === K)) {
    throw new Error('every joint must have the same number of knots');
  }
  if (!(j.T > 0)) throw new Error('T must be positive');
  const fracs = j.knotFracs?.length === K ? Float64Array.from(j.knotFracs) : null;
  if (fracs && !fracs.every((v, i) => i === 0 || v > fracs[i - 1])) {
    throw new Error('the poses must fall in order');
  }
  return {
    label: j.label || '',
    saved: j.saved || null,
    scenario: j.scenario || 'hold',
    knots: widenKnots(j.knots.map((r) => Float64Array.from(r))),
    T: +j.T,
    knotFracs: fracs,
    // A technique saved before holds existed holds only its ending, which is
    // what every technique did then.
    held: Array.isArray(j.held) && j.held.length === K
      ? j.held.map(Boolean) : Array.from({ length: K }, (_, k) => k === K - 1),
    // A file saved before the search could phrase pinned every instant, which
    // is what "the phrasing is authored" meant then. Reading it as all-free
    // would hand a stored technique's rhythm to the search the moment it was
    // opened.
    timeHeld: Array.isArray(j.timeHeld) && j.timeHeld.length === K
      ? j.timeHeld.map(Boolean) : Array.from({ length: K }, () => true),
    // A file saved before the legs could be un-mirrored means whatever its
    // scenario meant then.
    symmetric: typeof j.symmetric === 'boolean'
      ? j.symmetric : SYMMETRIC_SCENARIOS.has(j.scenario || 'hold'),
    q0: j.q0 ? Float64Array.from(j.q0) : null,
    target: j.target ? Float64Array.from(j.target) : null,
    rom: resolveRom(j.rom),
    strength: j.strength || null,
    body: resolveBody(j.body),
    config: resolvePlant(j.config),
    numerics: resolveNumerics(j.numerics),
    search: { seed: j.search?.seed ?? 7, maxGen: j.search?.maxGen ?? 120 },
    verdict: j.verdict || null,
    cost: j.cost == null ? null : +j.cost,
  };
}

// ---------------------------------------------------------------------------
// One description of the problem, and everything that runs it derived from
// there.
//
// Playing a technique back and searching for a better one are the same
// problem posed twice, and until now each side assembled its own argument
// list by hand -- the page had one for replay, another written into a
// postMessage, and the worker unpacked that into a third. Three hand-kept
// lists of the same fields can only agree by coincidence, and they did not:
// the drift was patched a field at a time (a start the search solved for
// itself, an ending it pinned, a plant it substituted, a phrasing it ignored)
// and a console warning was added to catch the next one. That warning is an
// admission that the shapes can disagree. They should not be able to.
//
// So: a technique is the input, these derive everything, and there is no
// second list to keep in step. If playback is right and the search is wrong,
// it can no longer be because they were handed different problems.
// ---------------------------------------------------------------------------

// The body a technique is performed by.
export function techniqueModelParams(rec) {
  const b = resolveBody(rec.body);
  return { heightM: b.heightM, massKg: b.massKg, straddleDeg: b.straddleDeg, sex: b.sex };
}

// The strength profile options for that body.
export function techniqueStrengthOpts(rec) {
  return { overrides: rec.strength || {} };
}

// The exact option object runScenario needs to reproduce the technique. Every
// field is resolved here rather than assumed resolved, so this is safe on a
// technique straight off disk and on one the page has just edited.
export function techniqueRunArgs(rec, model, ws) {
  return {
    scenario: rec.scenario,
    knots: rec.knots.map((k) => Float64Array.from(k)),
    T: rec.T,
    knotFracs: rec.knotFracs || null,
    q0: rec.q0 || null,
    target: rec.target || (model && ws ? balancedHandstand(model, ws) : null),
    rom: resolveRom(rec.rom),
    ...resolvePlant(rec.config),
    ...resolveNumerics(rec.numerics),
  };
}

// Which poses are pinned, and to what. Derived from the technique's own held
// flags and its own knots, so a lock can never name an angle the technique
// does not have.
export function techniqueLocks(rec) {
  const K = rec.knots[0].length;
  const held = rec.held || [];
  return Array.from({ length: K }, (_, k) => (held[k]
    ? rec.knots.map((row) => row[k]) : null));
}

// Which instants are pinned, and whether anything is left for the search to
// phrase. An interior pose whose instant is free is the only thing that
// lengthens the decision vector, so these two must be read off the same flags.
export function techniqueTimeLocks(rec) {
  const K = rec.knots[0].length;
  const timeHeld = rec.timeHeld || [];
  const fracs = rec.knotFracs
    || Array.from({ length: K }, (_, k) => (K === 1 ? 0 : k / (K - 1)));
  return Array.from({ length: K }, (_, k) => (timeHeld[k] ? fracs[k] : null));
}

export function techniqueFreeTimes(rec) {
  const K = rec.knots[0].length;
  const timeHeld = rec.timeHeld || [];
  for (let k = 1; k < K - 1; k++) if (!timeHeld[k]) return true;
  return false;
}

// The exact option object optimizeScenario needs to search THIS technique.
// The same fields runArgs supplies, said the way the search takes them, plus
// the pins -- and nothing invented: the tempo is the technique's own at both
// ends, so the search cannot buy a cheaper score by slowing down.
export function techniqueSearchArgs(rec) {
  return {
    scenario: rec.scenario,
    K: rec.knots[0].length,
    q0: rec.q0 || null,
    target: rec.target || null,
    rom: resolveRom(rec.rom),
    plant: resolvePlant(rec.config),
    numerics: resolveNumerics(rec.numerics),
    knotFracs: rec.knotFracs ? Array.from(rec.knotFracs) : null,
    locks: techniqueLocks(rec),
    timeLocks: techniqueTimeLocks(rec),
    freeTimes: techniqueFreeTimes(rec),
    symmetric: !!rec.symmetric,
    tLo: rec.T, tHi: rec.T,
    seed: rec.search?.seed ?? 7,
    maxGen: rec.search?.maxGen ?? 120,
    // Where the search starts: this technique. Derived here rather than
    // encoded by the caller, because an x0 that does not describe the
    // technique beside it is the exact failure this file exists to prevent.
    x0: encodeDecision(rec.knots, rec.T),
  };
}
