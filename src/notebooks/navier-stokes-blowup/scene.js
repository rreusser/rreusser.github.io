import { straightArrow, arcArrow } from './arrows.js';
import { tubeMesh } from './field.js';

/**
 * Geometry for the vortex-stretching walkthrough.
 *
 * The picture is a Burgers vortex: a vortex line held by an axial strain that
 * draws fluid in across the stagnation plane and pushes it out along the axis.
 * Three rules govern what is drawn, and all three are physics rather than taste.
 *
 * A vortex tube cannot end in the fluid. Helmholtz allows it to close on itself,
 * run to infinity, or end on a boundary, and nothing else. So the core is a tube
 * of constant radius that leaves the frame at both ends, never capped, and
 * stretching it does not lengthen it into view. It thins, which is the whole
 * mechanism.
 *
 * A vortex is a line, not a cylinder. The core follows a gently curved
 * centreline rather than a perfect axis, because that is what vorticity in a
 * real flow looks like, and because stretching a curved tube straightens it: the
 * lateral wander contracts with the radius, so the tube visibly pulls straight
 * as it thins.
 *
 * An arrow either moves with the fluid or annotates it, never both. The swirl
 * arcs are material loops around the core, so the flow carries them and they
 * have no travelling highlight of their own. The straining arrows are Eulerian,
 * so they stay put and a highlight runs along them at the local speed. An arrow
 * that both moves and pulses claims two different velocities at once.
 */

/** Half-length of the core. Long enough to leave the frame at both ends. */
export const TUBE_HALF = 5.0;

/** Radius of the vortex core at zero stretch. A line, not a pipe. */
export const CORE_RADIUS = 0.105;

/**
 * Lateral wander of the centreline. Contracts with the core as it stretches.
 * Kept well inside the material loops, which are centred on the axis rather
 * than on the wandering line, so that the loops always encircle the core.
 */
const WANDER = 0.075;

/** Radius of the material loops. Comfortably clear of the wandering core. */
const LOOP_RADIUS = 0.58;

/** A gently curved centreline, mostly along +y, as an untapered tube. */
function curvedCore(radius) {
  const stations = 96;
  const points = [];
  const speeds = [];
  const times = [];
  for (let i = 0; i < stations; i++) {
    const t = -1 + (2 * i) / (stations - 1);
    const y = t * TUBE_HALF;
    // Two incommensurate turns, so it reads as a wandering line rather than a
    // coil. Amplitude eases off nowhere: the tube is curved all the way out.
    points.push(
      WANDER * Math.sin(1.15 * y + 0.4),
      y,
      WANDER * 0.75 * Math.cos(0.83 * y - 0.7)
    );
    speeds.push(0.06);
    times.push(t);
  }
  return tubeMesh({ points, speeds, times, count: stations }, {
    radius,
    sides: 20,
    taperEnds: false,
    scalarRange: [0, 1]
  });
}

export function buildLessonScene() {
  const tube = curvedCore(CORE_RADIUS);

  // A material loop around the core, repeated up the axis by instance offsets.
  // It ends near the front so its head is never hidden behind the tube.
  const swirl = arcArrow({
    radius: LOOP_RADIUS,
    y: 0,
    from: -2.2,
    to: 0.7,
    tube: 0.05,
    headScale: 2.3,
    segments: 40,
    sides: 12,
    scalar: 0.9
  });

  // The straining flow in the surrounding fluid: outward along the axis, away
  // from the stagnation plane. Built off-axis at one azimuth and repeated
  // around by the instance twist, so it never collides with the core.
  const axialUp = straightArrow({
    from: [0.98, 0.5, 0],
    to: [0.98, 1.5, 0],
    radius: 0.05,
    sides: 12,
    scalar: 0.10
  });

  const axialDown = straightArrow({
    from: [0.98, -0.5, 0],
    to: [0.98, -1.5, 0],
    radius: 0.05,
    sides: 12,
    scalar: 0.10
  });

  // Inflow across the stagnation plane, replacing what the axis carries away.
  const radial = straightArrow({
    from: [1.55, 0, 0],
    to: [0.85, 0, 0],
    radius: 0.045,
    sides: 12,
    scalar: 0.55
  });

  return { tube, swirl, axialUp, axialDown, radial };
}

/**
 * Heights of the material loops, in units of length at zero stretch. The flow
 * carries them, so they drift apart in proportion to the stretch while their
 * radius contracts with the core.
 */
export const SWIRL_HEIGHTS = [-0.62, 0, 0.62];

/** Azimuths for the ring of straining arrows. */
export const STRAIN_AZIMUTHS = [0.5, 2.6, 4.7];

/** Azimuths and heights for the inward arrows across the stagnation plane. */
export const RADIAL_PLACEMENTS = [0, 1, 2, 3].map((i) => ({
  twist: (i / 4) * Math.PI * 2 + 0.9,
  y: (i % 2 ? 0.2 : -0.2)
}));

/** Local speed of the straining flow at each arrow, over the arrow's length. */
export const AXIAL_PULSE_RATE = 1.0 / 1.0;
export const RADIAL_PULSE_RATE = (0.5 * 1.2) / 0.7;
