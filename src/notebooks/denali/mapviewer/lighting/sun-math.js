// Sun direction conversions.
//
// World-coord convention used by the denali viewer:
//   x: east  (so -x is west)
//   y: up
//   z: south (so -z is north)
//
// settings.sunDirection is a unit vec3 in this frame, pointing toward
// the sun. The lighting bake takes (azDeg, altDeg) where azDeg follows
// the line-sweep-terrain-lighting convention: 0 = east, counter-
// clockwise (so 90 = north, 180 = west, 270 = south). This is the
// math-angle convention, NOT compass bearing — see solar-time.js in
// the source notebook.

const RAD2DEG = 180 / Math.PI;

export function sunDirectionToAzAlt(sun) {
  const sx = sun[0], sy = sun[1], sz = sun[2];
  const altDeg = Math.asin(Math.max(-1, Math.min(1, sy))) * RAD2DEG;
  // Math angle of the sun's horizontal projection: atan2(north, east).
  // North component = -sz; east component = sx.
  let azDeg = Math.atan2(-sz, sx) * RAD2DEG;
  if (azDeg < 0) azDeg += 360;
  return { azDeg, altDeg };
}
