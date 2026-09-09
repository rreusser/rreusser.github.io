import { straightArrow } from './arrows.js';
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
 * Arrows mean one thing only: the straining flow acting on the vortex. The
 * rotation is shown as moving fluid instead, a swarm of material streaks
 * orbiting the core, because using arrows for both the strain and the swirl
 * makes one symbol stand for two different physical things. The streaks are
 * Lagrangian and carry no travelling highlight; the strain arrows are Eulerian,
 * stay put, and do. An arrow that both moves and pulses claims two velocities.
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

/**
 * A short arc of fluid, tapered at both ends, built at unit radius in the plane
 * y = 0. Instances place it by scaling, so a streak nearer the axis is
 * correspondingly shorter and finer, as a contracted material arc should be.
 */
function streakArc(scalar) {
  const segments = 26;
  const span = 0.85;
  const points = [];
  const speeds = [];
  const times = [];
  for (let i = 0; i < segments; i++) {
    const a = -span / 2 + (span * i) / (segments - 1);
    points.push(Math.cos(a), 0, Math.sin(a));
    speeds.push(scalar);
    times.push(i / (segments - 1));
  }
  return tubeMesh({ points, speeds, times, count: segments }, {
    radius: 0.028,
    sides: 6,
    taper: 0.4,
    scalarRange: [0, 1]
  });
}

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

  // Three bands so a streak's colour can carry its speed, warm nearest the
  // axis where the fluid is quickest.
  const streakFast = streakArc(0.95);
  const streakMid = streakArc(0.55);
  const streakSlow = streakArc(0.16);

  // Unit arrows, tail at the origin and tip one unit away. Instances scale them
  // by the local flow speed and place them by their tail, so an arrow is a
  // velocity vector carried by a parcel of fluid rather than a fixed label.
  const axialUp = straightArrow({
    from: [0, 0, 0],
    to: [0, 1, 0],
    radius: 0.075,
    sides: 12,
    scalar: 0.10
  });

  const axialDown = straightArrow({
    from: [0, 0, 0],
    to: [0, -1, 0],
    radius: 0.075,
    sides: 12,
    scalar: 0.10
  });

  // Inflow across the stagnation plane: tail out at unit radius, tip on the
  // axis, so an instance places it by where its tip should fall.
  const radial = straightArrow({
    from: [1, 0, 0],
    to: [0, 0, 0],
    radius: 0.075,
    sides: 12,
    scalar: 0.55
  });

  return { tube, streakFast, streakMid, streakSlow, axialUp, axialDown, radial };
}

/**
 * The swarm. Each streak is a parcel of fluid orbiting the core, placed at a
 * radius and height at zero stretch; the flow carries it from there, drawing it
 * inward as the core contracts and apart as the core is stretched.
 *
 * Outside the core the vortex is free, so the orbital speed goes like
 * u = Gamma / 2 pi r and the angular rate like 1 / r^2. Streaks near the axis
 * whip round while the outer ones barely drift, which is what shears the swarm
 * into a tornado. Radii, heights and phases are spread by golden-ratio steps so
 * the swarm looks scattered without being random.
 */
export const STREAKS = Array.from({ length: 44 }, (_, i) => {
  const radius = 0.24 * Math.pow(1.55 / 0.24, (i * 0.6180339887) % 1);
  return {
    radius,
    y: -0.72 + 1.44 * ((i * 0.3819660113) % 1),
    twist: i * 2.39996,
    band: radius < 0.46 ? 'streakFast' : radius < 0.88 ? 'streakMid' : 'streakSlow'
  };
});

/**
 * The nominal strain rate the arrows depict, in figure units. The reader
 * controls how far the stretch has progressed; this is the rate at which the
 * straining flow itself is shown running.
 */
export const GAMMA = 0.55;

/** Arrow length per unit speed. Sets how long a velocity vector is drawn. */
export const SPEED_TO_LENGTH = 1.1;

/** Where a parcel of the straining flow is born and where it is retired. */
export const AXIAL_SPAN = [0.26, 2.05];
export const RADIAL_SPAN = [0.42, 1.75];

/**
 * Parcels of fluid carried by the straining flow, seeded so that the ring is
 * evenly spread in phase along its own trajectory rather than all arriving at
 * once. Axial parcels start near the stagnation plane and accelerate outward;
 * radial ones start far out and slow as they close on the axis.
 */
export function seedStrainParcels() {
  const axial = [];
  for (let i = 0; i < 8; i++) {
    const f = i / 8;
    axial.push({
      twist: (i / 4) * Math.PI + 0.5,
      sign: i % 2 ? 1 : -1,
      radius: 0.98,
      z: AXIAL_SPAN[0] * Math.pow(AXIAL_SPAN[1] / AXIAL_SPAN[0], f)
    });
  }
  const radial = [];
  for (let i = 0; i < 5; i++) {
    const f = i / 5;
    radial.push({
      twist: (i / 5) * Math.PI * 2 + 0.9,
      y: (i % 2 ? 0.2 : -0.2),
      radius: RADIAL_SPAN[1] * Math.pow(RADIAL_SPAN[0] / RADIAL_SPAN[1], f)
    });
  }
  return { axial, radial };
}
