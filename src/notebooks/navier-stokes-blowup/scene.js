import { straightArrow, arcArrow, revolution } from './arrows.js';

/**
 * A capsule: constant radius through the middle, hemispherical caps. The
 * previous profile collapsed to a point through a fan of near-degenerate
 * triangles, which showed up as banding along the core.
 */
function capsuleRadius(y, H, R) {
  const straight = H - R;
  const d = Math.abs(y);
  if (d <= straight) return R;
  const t = (d - straight) / R;
  return R * Math.sqrt(Math.max(0, 1 - t * t));
}

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
      return [capsuleRadius(y, H, R), y];
    },
    rows: 44,
    sides: 40,
    scalar: 0.06
  });

  // A single arc at y = 0, repeated up the axis by instance offsets. Ending it
  // near the front means the head is never hidden behind the core.
  // A lighter core for the child vortices, so a small copy still reads against
  // the background instead of going to a dark smudge.
  const childTube = revolution({
    profile: (v) => {
      const y = (-1 + 2 * v) * H;
      return [capsuleRadius(y, H, R), y];
    },
    rows: 30,
    sides: 24,
    scalar: 0.33
  });

  const swirl = arcArrow({
    radius: R * 2.0,
    y: 0,
    from: -1.7,
    to: 0.6,
    tube: 0.062,
    headScale: 2.3,
    segments: 40,
    sides: 12,
    scalar: 0.9
  });

  // Set well clear of the core, or the shaft disappears into it and only the
  // head shows, which reads as a cone stuck on the end.
  const axialUp = straightArrow({
    from: [0, H + 0.34, 0],
    to: [0, H + 1.24, 0],
    radius: 0.058,
    sides: 12,
    scalar: 0.10
  });

  const axialDown = straightArrow({
    from: [0, -(H + 0.34), 0],
    to: [0, -(H + 1.24), 0],
    radius: 0.058,
    sides: 12,
    scalar: 0.10
  });

  // One inward arrow along +x, repeated around the axis by instance twist.
  const radial = straightArrow({
    from: [3.4 * R, 0, 0],
    to: [1.9 * R, 0, 0],
    radius: 0.05,
    sides: 12,
    scalar: 0.55
  });

  return { tube, childTube, swirl, axialUp, axialDown, radial, H, R };
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
 *
 * `radius` and `y` are where the child should land in world space. The shader
 * applies the instance offset before the instance scale, so callers divide by
 * the scale; placing them without that puts every child inside its parent.
 */
export const CHILDREN = [
  { scale: 0.46, radius: 1.55, y: 0.85, twist: 0.7 },
  { scale: 0.36, radius: 1.8, y: -1.0, twist: 2.9 },
  { scale: 0.28, radius: 1.35, y: 0.15, twist: 4.7 }
];

/** A child is stretched too, but less, so it still reads as a tube. */
export const CHILD_STRETCH = 1.35;

/** Heights within a child at which its own swirl arcs sit. */
export const CHILD_SWIRL_HEIGHTS = [-0.45, 0.45];
