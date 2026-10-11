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
//   startHeld    whether the pose the body STARTS in is the search's to move
//   startGrounded  whether that start pose stands on its hands, or is free to
//                be anywhere -- in the air, on its feet, mid-rotation
//   symmetric    whether the two legs do the same thing
//   q0           the start pose, when one was constructed rather than solved
//   target       the ending pose (derived from the last knot, stored to check)
//   rom          the anatomy, fully resolved
//   strength     the strength overrides
//   body         the frame: height, mass, straddle, sex
//   config       the plant, fully resolved
//   numerics     the integration a replay uses
//   weights      the cost terms this technique overrides, if any -- today
//                that means whether its hands may leave the floor
//   search       seed and generation count -- not part of the movement, but
//                part of reproducing how it was found
//
// The shape is deliberately the shape a built-in preset is derived in, so a file
// saved here can be dropped into the registry the regression suite replays.
import {
  resolvePlant, resolveRom, resolveNumerics, resolveBody, balancedHandstand,
  SYMMETRIC_SCENARIOS, widenKnots, encodeDecision, COST_WEIGHTS,
} from './rollout.js';
import { JOINT_ORDER, jointOrderFor, widenQ } from './control.js';

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
    // Held unless it says otherwise: a start the reader never unlocked is a
    // start the search must not touch, and that is what every technique
    // written before this existed meant.
    startHeld: t.startHeld !== false,
    // Grounded unless it says otherwise, which is what every technique written
    // before the hands could leave the floor meant.
    startGrounded: t.startGrounded !== false,
    symmetric: !!t.symmetric,
    q0: arr(t.q0),
    target: arr(t.target),
    rom: { ...resolveRom(t.rom) },
    strength: t.strength ? JSON.parse(JSON.stringify(t.strength)) : null,
    body: { ...resolveBody(t.body) },
    config: { ...resolvePlant(t.config) },
    numerics: { ...resolveNumerics(t.numerics) },
    search: { seed: t.search?.seed ?? 7, maxGen: t.search?.maxGen ?? 120 },
    weights: t.weights && Object.keys(t.weights).length ? { ...t.weights } : null,
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
  // Every width this notebook has ever written is a technique. control.js
  // keeps the joint lists; jointOrderFor says which one a channel count means
  // and throws if it is none of them, and widenKnots then fills the joints
  // that body did not have with neutral -- which is exactly what those files
  // meant, since every one of those joints is at zero in a handstand.
  // Refusing them would make every saved technique unopenable, which is what
  // a written-down channel count did twice.
  if (!Array.isArray(j.knots) || !j.knots.every(Array.isArray)) {
    throw new Error('knots must be an array of arrays, one per joint');
  }
  jointOrderFor(j.knots.length);
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
    // A file saved before the start could be unlocked means "locked", which is
    // what the search did with it then.
    startHeld: j.startHeld !== false,
    // A file saved before the hands could leave the floor means they do not.
    startGrounded: j.startGrounded !== false,
    // A file saved before the legs could be un-mirrored means whatever its
    // scenario meant then.
    symmetric: typeof j.symmetric === 'boolean'
      ? j.symmetric : SYMMETRIC_SCENARIOS.has(j.scenario || 'hold'),
    // Widened the same way the knots are, and it has to be: a start pose and
    // an ending pose are configurations of the same body, so a technique
    // written for a body with fewer joints carries a shorter one. Left
    // unwidened, a six-joint q0 would be read as a fourteen-slot pose with the
    // last five slots missing and the ones it does have in the wrong places.
    q0: widenQ(j.q0),
    target: widenQ(j.target),
    rom: resolveRom(j.rom),
    strength: j.strength || null,
    body: resolveBody(j.body),
    config: resolvePlant(j.config),
    numerics: resolveNumerics(j.numerics),
    search: { seed: j.search?.seed ?? 7, maxGen: j.search?.maxGen ?? 120 },
    // Cost weights the technique overrides. Only the ones it names: the rest
    // come from COST_WEIGHTS, so a technique does not freeze a scoring change
    // it never had an opinion about. Today the only one the editor exposes is
    // liftoff -- whether the hands may leave the floor.
    weights: j.weights && typeof j.weights === 'object'
      ? { ...j.weights } : null,
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
    startGrounded: rec.startGrounded !== false,
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
// Where the poses fall, always as K numbers: the technique's own phrasing, or
// the even spacing that is what "no phrasing" means.
export function techniqueFracs(rec) {
  const K = rec.knots[0].length;
  return rec.knotFracs
    ? Array.from(rec.knotFracs, Number)
    : Array.from({ length: K }, (_, k) => (K === 1 ? 0 : k / (K - 1)));
}

export function techniqueTimeLocks(rec) {
  const K = rec.knots[0].length;
  const timeHeld = rec.timeHeld || [];
  const fracs = techniqueFracs(rec);
  return Array.from({ length: K }, (_, k) => (timeHeld[k] ? fracs[k] : null));
}

export function techniqueFreeTimes(rec) {
  const K = rec.knots[0].length;
  const timeHeld = rec.timeHeld || [];
  for (let k = 1; k < K - 1; k++) if (!timeHeld[k]) return true;
  return false;
}

// The start pose as the decision vector carries it: the joint angles, and the
// three base coordinates after them when the technique's hands are not on the
// floor. Null when the start is locked, which means the search does not carry
// it at all.
//
// This used to slice `3 .. 3 + knots.length`, reading the channel count off
// the knots -- true only while a start pose was exactly its joints and the
// technique was written for today's body. A technique read back from an older
// one is widened before it gets here, so the two counts are the same again;
// the base is what makes them differ now.
function techniqueStartChannels(rec) {
  if (rec.startHeld !== false || !rec.q0) return null;
  const nj = rec.knots.length;
  const out = Array.from(rec.q0).slice(3, 3 + nj);
  if (rec.startGrounded === false) out.push(rec.q0[0], rec.q0[1], rec.q0[2]);
  return out;
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
    // The step, said out loud, because the search is handed these fields one
    // at a time and the one thing it must not be allowed to choose for itself
    // is how this technique is integrated. Scoring over a different step than
    // the page replays over is scoring a different problem, and it shows up as
    // a technique that succeeds in the search and falls in playback.
    dt: resolveNumerics(rec.numerics).dt,
    knotFracs: rec.knotFracs ? Array.from(rec.knotFracs) : null,
    locks: techniqueLocks(rec),
    timeLocks: techniqueTimeLocks(rec),
    freeTimes: techniqueFreeTimes(rec),
    // Whether the pose the body begins in is the search's. Off, the start is
    // whatever the technique says (or whatever its scenario solves); on, the
    // decision vector carries it and the answer comes back with a q0.
    freeStart: rec.startHeld === false,
    // Whether the hands are on the floor at t = 0. Off, the start pose's base
    // is part of the technique and, when the start is also unlocked, part of
    // what the search chooses.
    startGrounded: rec.startGrounded !== false,
    // The cost terms this technique overrides, on top of the notebook's. Only
    // what it names, so a technique keeps its opinion about the hands leaving
    // the floor without freezing every other weight at the value it was
    // recorded under.
    weights: rec.weights ? { ...COST_WEIGHTS, ...rec.weights } : COST_WEIGHTS,
    symmetric: !!rec.symmetric,
    tLo: rec.T, tHi: rec.T,
    seed: rec.search?.seed ?? 7,
    maxGen: rec.search?.maxGen ?? 120,
    // Where the search starts: this technique. Derived here rather than
    // encoded by the caller, because an x0 that does not describe the
    // technique beside it is the exact failure this file exists to prevent.
    // ...in the layout the search is about to use, tails and all. A short x0
    // is refitted at the far end, and a refit is a second opinion about what a
    // technique says: it fills the instants from the phrasing and the start
    // from the scenario's solve, which is only the same answer by agreement.
    // Written out here it is the technique itself, exactly, and the refit is
    // left for the callers that genuinely hand in an older vector.
    x0: encodeDecision(rec.knots, rec.T,
      techniqueFreeTimes(rec) ? techniqueFracs(rec) : null,
      techniqueStartChannels(rec)),
  };
}
