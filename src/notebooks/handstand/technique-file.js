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
// The shape is deliberately the shape of a stored artifact in runs/, so a file
// saved here can be dropped into the registry the regression suite replays.
import {
  resolvePlant, resolveRom, resolveNumerics, resolveBody, balancedHandstand,
  SYMMETRIC_SCENARIOS,
} from './rollout.js';

export const TECHNIQUE_FORMAT = 'handstand-technique';
export const TECHNIQUE_VERSION = 1;

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
  if (!Array.isArray(j.knots) || j.knots.length !== 6 || !j.knots.every(Array.isArray)) {
    throw new Error('knots must be six arrays, one per joint');
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
    knots: j.knots.map((r) => Float64Array.from(r)),
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

// The exact option object runScenario needs to reproduce the file. One place,
// so the page and the tests cannot drift about what "reproduce" means.
export function techniqueRunArgs(rec, model, ws) {
  return {
    scenario: rec.scenario,
    knots: rec.knots.map((k) => Float64Array.from(k)),
    T: rec.T,
    knotFracs: rec.knotFracs,
    q0: rec.q0,
    target: rec.target || (model && ws ? balancedHandstand(model, ws) : null),
    rom: rec.rom,
    ...rec.config,
    ...rec.numerics,
  };
}
