// CPU-side decomposition of suncalc's sun-position computation.
//
// Everything in here depends only on time (not location), so we can do
// it once per frame in JS doubles and hand the shader three small
// scalars. The GPU then computes the location-dependent tail — hour
// angle → altitude/azimuth — per pixel. That keeps double-precision
// work (in particular the 360.9856235·d accumulation of sidereal time)
// on the CPU where we have 53-bit mantissas instead of 23.
//
// Formulas track the public-domain suncalc source. Per-pixel the
// shader should compute (with phi = latitude, lam = longitude, both in
// radians):
//
//   H        = gmstMinusRA + lam
//   sinAlt   = sin(phi)*sinDec + cos(phi)*cosDec*cos(H)
//   azSunc   = atan2(sin(H), cos(H)*sin(phi) - (sinDec/cosDec)*cos(phi))
//
// where azSunc follows suncalc's convention (0 = south, clockwise).
// Convert to the notebook's convention (0 = east, counter-clockwise)
// via `azNotebook = 3π/2 − azSunc`.

const RAD = Math.PI / 180;
const J1970 = 2440588;
const J2000 = 2451545;
const OBLIQUITY = 23.4397 * RAD;
const SIN_OBLIQUITY = Math.sin(OBLIQUITY);
const COS_OBLIQUITY = Math.cos(OBLIQUITY);
const PERIHELION = 102.9372 * RAD;
const TWO_PI = 2 * Math.PI;

function toDays(utcMs) {
  return utcMs / 86400000 - 0.5 + J1970 - J2000;
}

// Reduce x to [-π, π). Done in doubles so that the large
// 360.9856235·d sidereal accumulation loses no meaningful precision
// before we cast to f32.
function wrapPi(x) {
  return x - Math.floor((x + Math.PI) / TWO_PI) * TWO_PI;
}

// Finish the per-location tail of the sun-position calc on the CPU,
// given the time-only quantities from solarTimeQuantities. Used by
// the tile-viewer to pick a stable sun direction per tile (tile
// center lat/lng) for shadow baking, so shadows don't drift as the
// user pans the map. Returns notebook-convention angles in degrees:
// azDeg measured from east, counter-clockwise; altDeg positive up.
export function sunAnglesAt(solar, latRad, lngRad) {
  const { sinDec, cosDec, gmstMinusRA } = solar;
  const sinPhi = Math.sin(latRad);
  const cosPhi = Math.cos(latRad);
  const H = gmstMinusRA + lngRad;
  const sinH = Math.sin(H);
  const cosH = Math.cos(H);
  const sinAlt = Math.max(-1, Math.min(1,
    sinPhi * sinDec + cosPhi * cosDec * cosH));
  const altDeg = (Math.asin(sinAlt) * 180) / Math.PI;
  const azS = Math.atan2(
    sinH,
    cosH * sinPhi - (sinDec / (cosDec || 1e-6)) * cosPhi,
  );
  const scAzDeg = (azS * 180) / Math.PI;
  const azDeg = (((270 - scAzDeg) % 360) + 360) % 360;
  return { azDeg, altDeg };
}

export function solarTimeQuantities(utcMs) {
  const d = toDays(utcMs);
  const M = (357.5291 + 0.98560028 * d) * RAD;
  const C =
    (1.9148 * Math.sin(M) +
      0.02 * Math.sin(2 * M) +
      0.0003 * Math.sin(3 * M)) *
    RAD;
  const L = M + C + PERIHELION + Math.PI;
  const sinL = Math.sin(L);
  const cosL = Math.cos(L);
  const sinDec = SIN_OBLIQUITY * sinL;
  const cosDec = Math.sqrt(Math.max(0, 1 - sinDec * sinDec));
  const RA = Math.atan2(sinL * COS_OBLIQUITY, cosL);
  const GMST = (280.16 + 360.9856235 * d) * RAD;
  const gmstMinusRA = wrapPi(GMST - RA);
  return { sinDec, cosDec, gmstMinusRA };
}
