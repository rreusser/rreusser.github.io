import { straightArrow, arcArrow, revolution } from './arrows.js';

/**
 * Geometry for the vortex-stretching walkthrough.
 *
 * Each piece is built once, in a neutral position, and then placed by instance
 * data at draw time. The swirl arc and the radial arrow are each built a single
 * time and repeated around the axis by the instance twist, so adding a ring of
 * arrows costs nothing but instances.
 *
 * The straight arrows deliberately do not stretch with the core. They stand for
 * the straining flow that is doing the pulling, not for fluid being pulled, so
 * they keep their proportions and are simply moved out of the way as the core
 * lengthens.
 */
export function buildLessonScene({ H = 0.85, R = 0.40 } = {}) {
  // A rounded cylinder: nearly constant radius with softened ends.
  const tube = revolution({
    profile: (v) => {
      const y = (-1 + 2 * v) * H;
      const r = R * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(y) / H, 8)), 0.25);
      return [r, y];
    },
    rows: 46,
    sides: 36,
    scalar: 0.06
  });

  // A single arc at y = 0, repeated up the axis by instance offsets. Ending it
  // near the front means the head is never hidden behind the core.
  const swirl = arcArrow({
    radius: R * 1.55,
    y: 0,
    from: -1.7,
    to: 0.6,
    tube: 0.055,
    headScale: 2.3,
    segments: 40,
    sides: 12,
    scalar: 0.9
  });

  const axialUp = straightArrow({
    from: [0, H + 0.08, 0],
    to: [0, H + 0.95, 0],
    radius: 0.058,
    sides: 12,
    scalar: 0.10
  });

  const axialDown = straightArrow({
    from: [0, -(H + 0.08), 0],
    to: [0, -(H + 0.95), 0],
    radius: 0.058,
    sides: 12,
    scalar: 0.10
  });

  // One inward arrow along +x, repeated around the axis by instance twist.
  const radial = straightArrow({
    from: [3.0 * R, 0, 0],
    to: [1.5 * R, 0, 0],
    radius: 0.05,
    sides: 12,
    scalar: 0.55
  });

  return { tube, swirl, axialUp, axialDown, radial, H, R };
}

/** Heights, as a fraction of H, at which swirl arcs wrap the core. */
export const SWIRL_HEIGHTS = [-0.55, 0, 0.55];

/** Azimuths and heights for the ring of inward-pointing arrows. */
export const RADIAL_PLACEMENTS = [0, 1, 2, 3, 4].map((i) => ({
  twist: (i / 5) * Math.PI * 2 + 0.35,
  y: (i % 2 ? 0.3 : -0.3)
}));

/**
 * Smaller vortices spun off the parent, for the beat about the turbulent
 * cascade. Each is a scaled copy placed off-axis, so it costs only instances.
 */
export const CHILDREN = [
  { scale: 0.34, radius: 1.9, y: 0.75, twist: 0.7 },
  { scale: 0.26, radius: 2.1, y: -0.85, twist: 2.9 },
  { scale: 0.19, radius: 1.5, y: 0.15, twist: 4.7 }
];
