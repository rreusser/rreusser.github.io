// Terrain lighting: the reference implementation both the WGSL composite
// shader and the gates are checked against.
//
// Two models live here on purpose.
//
//   CURRENT  transcribes the overlay branch of fs_main in
//            tile-viewer.js as it stands, so the gates in
//            verify-lighting-model.mjs can be shown to FAIL on it.
//   PROPOSED implements LIGHTING-DESIGN.md.
//
// Nothing in the shader has been changed yet. When the port happens, the
// WGSL becomes a transliteration of PROPOSED and is verified against it
// the way the bake's GPU path is verified against its CPU path. CURRENT
// is then deleted along with the shader code it mirrors.
//
// No npm imports: lib files take injected dependencies, and this one
// needs none.

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

// ---------------------------------------------------------------------
// Shared: the sun direction in the notebook's frame, 0 = east, +z = up.
// ---------------------------------------------------------------------

export function sunDirOf(altDeg, azDeg = 0) {
  const al = (altDeg * Math.PI) / 180;
  const az = (azDeg * Math.PI) / 180;
  return [Math.cos(al) * Math.cos(az), Math.cos(al) * Math.sin(az), Math.sin(al)];
}

// A unit normal at a given slope, with its downhill azimuth measured
// from the sun's azimuth: 0 points into the sun, 180 away from it.
export function normalOf(slopeDeg, relAzDeg = 0, sunAzDeg = 0) {
  const s = Math.sin((slopeDeg * Math.PI) / 180);
  const a = ((sunAzDeg + relAzDeg) * Math.PI) / 180;
  return [s * Math.cos(a), s * Math.sin(a), Math.cos((slopeDeg * Math.PI) / 180)];
}

// =====================================================================
// PROPOSED  (LIGHTING-DESIGN.md)
// =====================================================================

export const DEFAULTS = {
  // irradiance budget
  skyFrac: 0.22,          // kSky / (kSun + kSky) at a high sun
  beta: 0.45,             // circumsolar share of sky radiance
  leak: 0.25,             // share of the circumsolar glow that survives
                          // an occluder: the knob for shadowed relief
  // geometry. The shading normal is used as measured: an exaggeration
  // control was offered and removed as unnecessary, and leaving it at 1
  // also keeps sun-facing slopes from being driven further above flat
  // ground than the terrain warrants.
  reliefExag: 1,
  sunRadiusDeg: 0.46,     // one radius for the Lambert penumbra AND the
                          // shadow penumbra in the bake
  // visibility strengths
  shadowStrength: 1,
  aoStrength: 1,
  // exposure and tone
  eta: 0.7,               // 1 = flat ground holds constant brightness at
                          // every sun altitude, 0 = absolute
  contrast: 1,            // gain in stops on relative irradiance
  // The soft clip's reach, in stops, now separate above and below.
  // A symmetric 1.6 was wrong at both ends. Below, it floored the
  // composite at 2^-1.6 = 0.330 of flat lit ground, while the physics
  // puts an open shadow at R = 0.036 under a high sun with ambient at
  // its minimum -- the curve was lifting shadows tenfold and no control
  // could get past it. Above, 1.6 stops of headroom was never used:
  // measured on real terrain R tops out at 1.55, so the ceiling of 3.03
  // did nothing while bright ramp albedo multiplied by R > 1 ran into
  // the shoulder instead.
  highlightStops: 0.6,
  shadowStops: 3.5,
  nightFloor: 0.06,
  // output shoulder
  kneeMin: 0.8,
  // Packed-normal bias correction; 0 here, the shader's AO_SLOPE_EPS in
  // the parity harness. See relOpenness.
  slopeEps: 0,
  // grade, applied to the finished lightness and nowhere else
  brightness: 0,
  contrastPost: 1,
  pivot: 0.5,
  saturation: 1,
};

// Compactly supported C1 smooth max, scale s.
//
//   g(u) = 0            u <= -1
//        = (1+u)^2 / 4  -1 < u < 1
//        = u            u >=  1
//
// Value and slope match at both joins. The compactness is the point: a
// softplus is smooth everywhere but has infinite support, so at a wide
// sun it lights a surface whose own horizon the disc is entirely below,
// where the answer must be exactly zero.
export function smax(x, s) {
  if (!(s > 0)) return Math.max(x, 0);
  const u = x / s;
  if (u <= -1) return 0;
  if (u >= 1) return x;
  return (s * (1 + u) * (1 + u)) / 4;
}

// Renormalise the bake's stored AO so both falloffs span [0, 1]. The
// bake stores rawAo^aoGamma with aoGamma = 2; raw runs over
// [floorRaw, 1], and floorRaw differs between the two falloffs, which
// is why switching the radio currently recalibrates the shading.
export function opennessOf(storedAo, falloff = "exp") {
  const floorRaw = falloff === "exp" ? Math.exp(-1) : 0;
  const raw = Math.sqrt(Math.max(storedAo, 0));
  return clamp((raw - floorRaw) / (1 - floorRaw), 0, 1);
}

// Openness of an INFINITE PLANE with this normal, under the same
// 8-azimuth sweep and the same falloff. Transcribed from
// planeEnclosure() in tile-viewer.js, where it already serves the
// openness tint; the polynomial for the exp falloff is the fit that
// lives there.
//
// This is load bearing, and the reason is not obvious. The sweep starts
// level and counts blockers strictly above the ray, so a UNIFORM
// HILLSIDE is not open: its uphill directions block it. Measured
// through the real sweep, a 26.6 degree slope reads openness 0.817
// under the exp falloff and 0.947 under cos squared. The sky term's own
// (1 + nz)/2 already accounts for the tilt, so feeding the raw
// measurement in as well counts the slope twice -- and the two falloffs
// disagree about by how much, which is also what makes switching the
// falloff radio change the shading.
//
// Dividing the measurement by this baseline leaves only the part of the
// occlusion the terrain actually causes: 1 on any uniform plane, below
// 1 where the ground is more enclosed than its own slope predicts.
const AO_PLANE = [0.404038, 0.499984, -1.285729, 0.859];

export function planeOpenness(nz, falloff = "exp") {
  const z = clamp(nz, 0, 1);
  const sinT = Math.sqrt(Math.max(0, 1 - z * z));
  if (falloff !== "exp") return 1 - 0.5 * (1 - z);
  const [a, b, c, d] = AO_PLANE;
  const enc = sinT * (a + sinT * (b + sinT * (c + sinT * d)));
  return 1 - clamp(enc, 0, 1);
}

// Measured openness relative to what this surface's own plane predicts.
//
// Capped just above 1. The sweep starts level and counts only blockers
// strictly above the ray, so nothing can read as more open than level
// and convexity is not recoverable from it -- the headroom above 1 is
// the exp baseline's polynomial drift, which reaches 1.07 on a measured
// 59.5 degree hillside, and not a real signal. 1.1 covers the fit
// without inventing a convexity term the measurement cannot support.
export const REL_OPENNESS_MAX = 1.1;

// No hidden gain. `aoStrength` is the multiplier, and the control
// exposes it directly: 1 applies the occlusion the bake measured, and
// above 1 is deliberate exaggeration, the same idiom terrain
// exaggeration uses. An earlier version hid a 2.22x factor here,
// justified by an analysis that had double-applied the bake's gamma.

// `slopeEps` exists only for parity with the shader. There the normal
// arrives packed into bytes, so flat ground encodes as |nxy| = 0.0055
// rather than 0, and the shader subtracts that bias before reading the
// plane baseline (the same AO_SLOPE_EPS the openness tint uses). This
// reference has no packing, so it defaults to 0; the parity harness
// passes the shader's value so the two are literally the same function.
export function relOpenness(openness, nz, falloff = "exp", slopeEps = 0) {
  const sinT = Math.sqrt(Math.max(0, 1 - clamp(nz, 0, 1) ** 2));
  const s = Math.max(0, sinT - slopeEps);
  const nzEff = Math.sqrt(Math.max(0, 1 - s * s));
  return clamp(openness / Math.max(planeOpenness(nzEff, falloff), 1e-6), 0, REL_OPENNESS_MAX);
}

function exaggerate(N, e) {
  if (e === 1) return N;
  const v = [N[0] * e, N[1] * e, N[2]];
  const L = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / L, v[1] / L, v[2] / L];
}

// Gate on the SUN, not the pixel: below the geometric horizon there is
// no disc anywhere, whatever a steep slope's orientation says.
const horizonGate = (sunZ) => smoothstep(-0.0045, 0.0045, sunZ);

// Absolute irradiance, in units where kSun + kSky = 1.
export function irradiance({ N, sunDir, shadow = 0, openness = 1,
                             falloff = "exp", p = DEFAULTS }) {
  const kSky = p.skyFrac;
  const kSun = 1 - p.skyFrac;
  const Ns = exaggerate(N, p.reliefExag);
  const s = Math.sin((p.sunRadiusDeg * Math.PI) / 180);

  const H = horizonGate(sunDir[2]);
  const V = (1 - p.shadowStrength * shadow) * H;       // sun-disc visibility
  // Relative to the surface's own plane, so the tilt is counted once,
  // by the sky term's geometry, and not again by the measurement.
  //
  // One-sided. Measured over 37k pixels of real baked terrain the ratio
  // runs p01 0.642, p50 0.894, p90 0.974, and 80% of the map is more
  // occluded than its own tangent plane -- so there is real signal here
  // and the term earns its place.
  //
  // Only the darkening side is used. The part above 1 is not signal:
  // the sweep starts level and counts only blockers strictly above the
  // ray, so nothing can read as more open than level and convexity is
  // not recoverable; the headroom is the exp baseline's polynomial
  // drift. Ignoring it also makes a uniform plane of any steepness
  // exactly neutral rather than nearly so.
  //
  // The physical ceiling is what bounds this, not the slider: Om floors
  // at 0 and multiplies only the sky term, so even a strength above 1
  // can never remove more light than the sky supplies. Gate 4.
  const OmRel = relOpenness(openness, N[2], falloff, p.slopeEps ?? 0);
  const occluded = Math.max(0, 1 - OmRel);
  const Om = clamp(1 - p.aoStrength * occluded, 0, 1);   // sky visibility
  const cosS = smax(dot3(Ns, sunDir), s);

  // The occluder that hides the sun hides most of the circumsolar sky
  // with it, less a leak for the glow's angular width. Without this the
  // sky term alone can make a shadowed slope out-read sunlit flats at a
  // grazing sun by a wide margin.
  const csV = p.leak + (1 - p.leak) * V;
  const skyA = (1 - p.beta) * 0.5 * (1 + Ns[2]) + p.beta * csV * cosS;

  return kSun * V * cosS + kSky * skyA * Om;
}

// Irradiance of flat, open, unshadowed ground under the same sun. Every
// term mirrors `irradiance` with N = up, shadow = 0, openness = 1, so
// the ratio of the two is exactly 1 there at every sun altitude.
export function irradianceRef(sunDir, p = DEFAULTS) {
  const kSky = p.skyFrac;
  const kSun = 1 - p.skyFrac;
  const s = Math.sin((p.sunRadiusDeg * Math.PI) / 180);
  const H = horizonGate(sunDir[2]);
  const Lz = smax(sunDir[2], s);
  return kSun * H * Lz + kSky * ((1 - p.beta) + p.beta * (p.leak + (1 - p.leak) * H) * Lz);
}

// Relative irradiance. eta = 1 divides by the reference at the current
// sun, so flat open sunlit ground is exactly 1 whatever the altitude;
// eta = 0 divides by a fixed high-sun reference, so the map darkens as
// the sun sets. See LIGHTING-DESIGN.md section 5.
export function relIrradiance(args) {
  // `falloff` rides along in args and reaches irradiance(); the
  // reference is flat ground, where every falloff's plane openness is 1,
  // so it does not appear in irradianceRef.
  const p = args.p ?? DEFAULTS;
  const here = Math.max(irradianceRef(args.sunDir, p), 1e-6);
  const high = Math.max(irradianceRef([0, 0, 1], p), 1e-6);
  const den = Math.pow(here, p.eta) * Math.pow(high, 1 - p.eta);
  return irradiance(args) / Math.max(den, 1e-9);
}

// Soft clip in stops: odd in log R, so R = 1 maps to exactly 1 and the
// flat-ground identity survives the curve. Strictly increasing, bounded
// on each side by its own stop count, so every term upstream is free
// to overshoot.
export function tone(R, p = DEFAULTS) {
  const x = Math.log(Math.max(R, 1e-12));
  // Separate reach on each side of neutral. Both branches have value 1
  // and slope `contrast` at x = 0, so the curve is still C1 there, and
  // R = 1 still maps to exactly 1.
  const k = (x >= 0 ? p.highlightStops : p.shadowStops) * Math.LN2;
  return Math.exp(k * Math.tanh((p.contrast * x) / k));
}

// The one monotone carrier of day into night.
export function daylight(sunDir, p = DEFAULTS) {
  return p.nightFloor + (1 - p.nightFloor) * smoothstep(-0.105, 0.035, sunDir[2]);
}

// Lighting alone. Takes NO grade parameters, which is the structural
// statement that brightness, contrast and saturation are a post-process:
// see gate 9.
export function shadeLighting(args) {
  const p = args.p ?? DEFAULTS;
  return tone(relIrradiance(args), p) * daylight(args.sunDir, p);
}

// Brightness and contrast on the finished lightness. Monotone and
// unbounded above; the shoulder below is what guarantees no clipping,
// so this does not need to clamp and must not, or it would be the clip.
export function gradeL(L, p = DEFAULTS) {
  const e = Math.pow(2, -p.brightness);
  const b = Math.pow(Math.max(L, 0), e);
  return p.pivot * Math.pow(Math.max(b, 1e-12) / p.pivot, p.contrastPost);
}

// Highlight shoulder. Identity below the knee, slope 1 on both sides of
// it, strictly increasing, asymptotic to 1 and never reaching it. The
// knee rides the albedo so that R' = 1 is the identity for every albedo,
// including one brighter than kneeMin.
//
// The exponential form rather than tanh, and the 0.9 cap on the knee,
// are both forced by floating point. An asymptote of exactly 1 is
// reached in float as soon as the argument saturates, and then the
// shoulder IS a clip: with tanh and a knee of 0.995 every lightness
// above 1.085 returned exactly 1.0, which is the failure the shoulder
// exists to prevent. exp decays instead of saturating, and capping the
// knee at 0.9 keeps the argument under 22 over the whole reachable
// range (albedo 1 times the tone ceiling 2^highlightStops), where exp is
// still comfortably representable.
//
// The cost of the cap is that an albedo above 0.9 is compressed a
// little even on neutral ground: a pure white one renders at 0.963,
// and the brightest entry of a typical hypsometric ramp (L ~ 0.93) at
// 0.926, which is one 8-bit step. Gate 2 measures this.
export const KNEE_MAX = 0.9;

export function shoulder(L, knee) {
  const k = Math.min(Math.max(knee, 0), KNEE_MAX);
  if (L <= k) return L;
  return 1 - (1 - k) * Math.exp(-(L - k) / (1 - k));
}

// The whole pipeline, for an Oklab albedo lightness.
//   lighting -> albedo multiply -> grade -> shoulder
//
// `chroma` is the factor to scale the albedo's a and b by. It is
// L / albedoL, NOT L / lit: what reads as a colour's saturation is the
// ratio C/L, so scaling C by the same factor L moved by is what holds
// saturation fixed through shade. Dividing by the lit value instead
// leaves C/L proportional to 1/lit, which makes a shadow MORE saturated
// than the ground it falls on -- the error this had until the WGSL port
// put the two side by side. Gate 15.
export function composite(args) {
  const p = args.p ?? DEFAULTS;
  const albedoL = args.albedoL ?? 0.5;
  const lit = albedoL * shadeLighting(args);
  const knee = Math.max(p.kneeMin, gradeL(albedoL, p));
  const L = shoulder(gradeL(lit, p), knee);
  const chroma = albedoL > 0 ? p.saturation * (L / albedoL) : 0;
  return { L, chroma, lighting: shadeLighting(args), R: relIrradiance(args) };
}

// =====================================================================
// CURRENT  (transcribed from the overlay branch of fs_main)
// =====================================================================

export const CURRENT_DEFAULTS = {
  reliefStrength: 0.38,
  shadowStrength: 0.47,
  aoContrast: 0.3,
  brightness: 0,
  saturation: 1,
  useTime: 0,
};

const SHADE_TO_VALUE = 0.57;
const DESAT_AT_NEUTRAL = 1.3060193;

function blendOverlay(base, blend) {
  return base < 0.5 ? 2 * base * blend : 1 - 2 * (1 - base) * (1 - blend);
}

export function currentAoFactor(storedAo, aoContrast) {
  const aoC = clamp(aoContrast, 0, 0.999999);
  const aoS = aoC / (1 - aoC);
  return 1 - (2 / Math.PI) * Math.atan(aoS * clamp(1 - storedAo, 0, 1));
}

// The `value` accumulator, including the brightness term that sits
// inside it.
export function currentValue({ N, sunDir, shadow = 0, storedAo = 1, p = CURRENT_DEFAULTS }) {
  const twilight = smoothstep(-0.105, 0.035, sunDir[2]);
  const nightShadow = p.useTime ? 1 - twilight : 0;
  const reliefFade = p.useTime ? twilight : 1;
  const gain = p.reliefStrength / Math.max(1 - p.reliefStrength, 0.01);

  let v = 0.5;
  v += 0.5 * (dot3(N, sunDir) - sunDir[2]) * reliefFade * gain;
  v += SHADE_TO_VALUE * (currentAoFactor(storedAo, p.aoContrast) - 1);
  v += SHADE_TO_VALUE * (1 - p.shadowStrength * shadow - 1);
  v -= Math.max(SHADE_TO_VALUE * p.shadowStrength, 0.5 * gain) * nightShadow;
  v += p.brightness;
  return 0.5 + 0.5 * Math.tanh(v - 0.5);
}

export function currentComposite(args) {
  const p = args.p ?? CURRENT_DEFAULTS;
  const albedoL = args.albedoL ?? 0.5;
  const value = currentValue(args);
  const base = clamp(albedoL + value - 0.5, 0, 1);
  // The hard clip: overlayComposite hands this to oklabToSrgbClipped,
  // which clamps lightness to [0, 1].
  const L = clamp(blendOverlay(base, value), 0, 1);
  const chroma = p.saturation * (0.2 + 0.8 * Math.sqrt(Math.max(value, 0))) * DESAT_AT_NEUTRAL;
  return { L, chroma, lighting: value, R: value };
}
