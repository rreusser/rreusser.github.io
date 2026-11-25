// Gates for the final figure's overlay shading model.
//
// This ports the `g.grade.z > 0.5` branch of the composite shader in
// tile-viewer.js to JS, together with the slope/aspect branch it sits
// beside, so the two can be swept against each other without a GPU.
// What is being locked down is a handful of structural properties, each
// of which is a reason the imagery path is built this way:
//
//   1. the relief term is signed — a slope tilted toward the sun
//      brightens — where the slope/aspect model can only ever darken,
//      so under it a sun-facing slope of any steepness renders exactly
//      as flat ground does and half the terrain is simply not drawn;
//   2. the relief term is zero on flat ground at every sun altitude,
//      including below the horizon, because what is accumulated is
//      dot(N, L) − L.z and not dot(N, L);
//   3. neutral shading is an exact identity on the albedo, so a
//      satellite pixel on open, lit flats comes out of the shader as
//      the pixel that went in;
//   4. relief, occlusion and shadow add rather than multiply, so a
//      slope that is both shadowed and occluded keeps measurable
//      relief instead of being multiplied toward a flat black;
//   5. output lightness is strictly increasing in the shading value and
//      never leaves [0, 1], the same two guarantees gradeSrgb carries;
//   6. hue is preserved exactly, since a and b are scaled by one
//      positive factor and the gamut clipper works at constant hue;
//   7. through the time-mode terminator the composite only ever gets
//      darker, the property verify-night-shading.mjs gates for the
//      slope/aspect model.
//
// Run with --compare to print the two models side by side over a slope
// sweep, which is where properties 1 and 4 are visible as numbers.
//
//   node src/notebooks/line-sweep-terrain-lighting/verify-overlay-shading.mjs
//   node .../verify-overlay-shading.mjs --compare

const showCompare = process.argv.includes("--compare");

// ---- figure defaults -------------------------------------------------

const RELIEF_STR = 0.38;
const AO_STR = 0.3;
const SHADOW_STR = 0.47;

// ---- the shader's colour plumbing, transcribed -----------------------

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

function linearToSrgb(x) {
  const c = clamp01(x);
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function srgbToLinear(x) {
  const c = clamp01(x);
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function oklabToLinearSrgb([L, a, b]) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

function srgbToOklab([r, g, b]) {
  const c = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
  const l = 0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2];
  const m = 0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2];
  const s = 0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2];
  const l_ = Math.cbrt(Math.max(l, 0));
  const m_ = Math.cbrt(Math.max(m, 0));
  const s_ = Math.cbrt(Math.max(s, 0));
  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ];
}

const inGamut = (c) => c.every((x) => x >= -1e-4 && x <= 1.0001);

function oklabToSrgbClipped([Lin, a, b]) {
  const L = clamp01(Lin);
  let rgb = oklabToLinearSrgb([L, a, b]);
  if (!inGamut(rgb)) {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 12; i++) {
      const mid = 0.5 * (lo + hi);
      if (inGamut(oklabToLinearSrgb([L, a * mid, b * mid]))) lo = mid;
      else hi = mid;
    }
    rgb = oklabToLinearSrgb([L, a * lo, b * lo]);
  }
  return rgb.map(linearToSrgb);
}

// ---- the overlay model, transcribed ----------------------------------

const DESAT_AT_NEUTRAL = 1.3060193;
const SHADE_TO_VALUE = 0.57;

function blendOverlay(base, blend) {
  return base < 0.5
    ? 2 * base * blend
    : 1 - 2 * (1 - base) * (1 - blend);
}

function overlayComposite(albedo, value, satK) {
  const base = clamp01(albedo[0] + value - 0.5);
  const L = blendOverlay(base, value);
  const c = satK * (0.2 + 0.8 * Math.sqrt(Math.max(value, 0))) * DESAT_AT_NEUTRAL;
  return oklabToSrgbClipped([L, albedo[1] * c, albedo[2] * c]);
}

// The AO tonemap, shared by both models.
function aoFactorOf(ao, contrast) {
  const c = Math.min(contrast, 0.999999);
  const s = c / (1 - c);
  return 1 - (2 / Math.PI) * Math.atan(s * clamp01(1 - ao));
}

// A scene: surface normal, sun direction, bake channels, knobs. The two
// model functions below take exactly this and nothing else.
function scene({
  slopeDeg = 0,
  aspectDeg = 0, // 0 faces the sun, 180 faces away
  sunAltDeg = 30,
  ao = 1,
  shadow = 0, // 1 = fully shadowed, matching the bake's alpha channel
  reliefStr = RELIEF_STR,
  aoStr = AO_STR,
  shadowStr = SHADOW_STR,
  brightness = 0,
  useTime = 0,
} = {}) {
  const sl = (slopeDeg * Math.PI) / 180;
  const as = (aspectDeg * Math.PI) / 180;
  const alt = (sunAltDeg * Math.PI) / 180;
  // Sun in the +x azimuth; the normal tilts by `aspectDeg` away from it.
  const sunDir = [Math.cos(alt), 0, Math.sin(alt)];
  const N = [
    Math.sin(sl) * Math.cos(as),
    Math.sin(sl) * Math.sin(as),
    Math.cos(sl),
  ];
  return { N, sunDir, ao, shadow, reliefStr, aoStr, shadowStr, brightness, useTime };
}

// The masks, lifted from the shader. `shadowMask` carries the altitude
// fade and belongs to the slope/aspect model; `directMask` is the
// bake's own answer, which is what the overlay model uses. See
// verify-low-sun-illumination.mjs for why they differ.
function masks(s) {
  const twilight = smoothstep(-0.105, 0.035, s.sunDir[2]);
  const nightShadow = s.useTime ? 1 - twilight : 0;
  const nightMask = 1 - s.shadowStr * nightShadow;

  const fixedHS = 1 + (s.shadow - 1) * clamp01(s.sunDir[2] / 0.035);
  const timeHS = 1 + (s.shadow - 1) * twilight;
  const horizonShadow = s.useTime ? timeHS : fixedHS;
  const shadowMask = 1 - s.shadowStr * horizonShadow;
  const reliefFade = s.useTime ? twilight : 1;
  const directMask = 1 - s.shadowStr * s.shadow;
  return { twilight, nightShadow, nightMask, shadowMask, directMask, reliefFade };
}

// The overlay model's shading accumulator.
function overlayValue(s) {
  const { nightShadow, directMask, reliefFade } = masks(s);
  const dotNL = s.N[0] * s.sunDir[0] + s.N[1] * s.sunDir[1] + s.N[2] * s.sunDir[2];
  const lambRel = (dotNL - s.sunDir[2]) * reliefFade;
  const gain = s.reliefStr / Math.max(1 - s.reliefStr, 0.01);
  let value = 0.5;
  value += 0.5 * lambRel * gain;
  value += SHADE_TO_VALUE * (aoFactorOf(s.ao, s.aoStr) - 1);
  value += SHADE_TO_VALUE * (directMask - 1);
  const nightDepth = Math.max(SHADE_TO_VALUE * s.shadowStr, 0.5 * gain);
  value -= nightDepth * nightShadow;
  value += s.brightness;
  return 0.5 + 0.5 * Math.tanh(value - 0.5);
}

const overlayRgb = (s, albedo, satK = 1) =>
  overlayComposite(albedo, overlayValue(s), satK);

// The lightness the shader computes, before the gamut clipper and the
// sRGB round trip. Monotonicity is a property of the model, so it is
// gated here rather than on a measured L, which an out-of-gamut chroma
// perturbs by a fraction of a quantisation step.
function overlayL(s, albedo) {
  const value = overlayValue(s);
  return blendOverlay(clamp01(albedo[0] + value - 0.5), value);
}

// ---- the slope/aspect model, transcribed, for contrast ---------------

// `v`, the grey composite, in relief mode with kAmbient = kDirect = 0,
// which is what the figure runs.
function multiplyV(s) {
  const { nightMask, shadowMask, reliefFade } = masks(s);
  const nxy = [s.N[0], s.N[1]];
  const nz = s.N[2];
  const slopeMag = Math.hypot(nxy[0], nxy[1]);
  const sunHL = Math.hypot(s.sunDir[0], s.sunDir[1]);
  const zFactor = 0.625 * Math.sqrt(sunHL);
  const slopeAngle = Math.atan((zFactor * slopeMag) / Math.max(nz, 0.001));
  const scaledSlope = Math.min(slopeAngle * s.reliefStr * 2, 1.5);
  const aspectAlign =
    slopeMag > 0.001 && sunHL > 0.001
      ? (nxy[0] * s.sunDir[0] + nxy[1] * s.sunDir[1]) / (slopeMag * sunHL)
      : 0;
  const shadeDir = 0.5 + 0.5 * aspectAlign;
  const reliefDark = Math.sin(scaledSlope) * (1 - shadeDir) * reliefFade;
  const reliefSrgb = Math.pow(1 - reliefDark * 0.85, 2.5) * shadowMask;
  return clamp01(reliefSrgb * aoFactorOf(s.ao, s.aoStr) * nightMask);
}

// The albedo path: shadeOklab(albedo, k) with k = v / v0, relief mode.
function multiplyRgb(s, albedo) {
  const v = multiplyV(s);
  const k = Math.min(Math.max(v / Math.max(1, 0.35), 0), 2);
  const L2 = clamp01(albedo[0] * k);
  const cs = albedo[0] > 0 ? L2 / Math.max(albedo[0], 1e-4) : 0;
  return oklabToSrgbClipped([L2, albedo[1] * cs, albedo[2] * cs]);
}

// ---- helpers ---------------------------------------------------------

const lightOf = (srgb) => srgbToOklab(srgb)[0];
const hueOf = (srgb) => {
  const [, a, b] = srgbToOklab(srgb);
  return Math.atan2(b, a);
};
const chromaOf = (srgb) => {
  const [, a, b] = srgbToOklab(srgb);
  return Math.hypot(a, b);
};
const q8 = (x) => Math.round(clamp01(x) * 255);
const hex = (srgb) =>
  "#" + srgb.map((x) => q8(x).toString(16).padStart(2, "0")).join("");
const angleDiff = (p, q) => {
  let d = Math.abs(p - q) % (2 * Math.PI);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return d;
};

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures++;
  console.log(`${ok ? "  ok  " : "FAIL  "}${name}${detail ? `  ${detail}` : ""}`);
};

// Satellite-ish and ramp colours, so the sweeps run over what the map
// actually puts on screen.
const SAMPLES = [
  ["ramp low", [0x6a / 255, 0x7f / 255, 0x66 / 255]],
  ["ramp mid", [0xea / 255, 0xb6 / 255, 0x9a / 255]],
  ["ramp high", [0xff / 255, 0xd5 / 255, 0xc7 / 255]],
  ["canyon rock", [0x8b / 255, 0x5a / 255, 0x3c / 255]],
  ["juniper", [0x3a / 255, 0x4a / 255, 0x2e / 255]],
  ["snow", [0xf2 / 255, 0xf4 / 255, 0xf8 / 255]],
  ["deep shade", [0x14 / 255, 0x16 / 255, 0x1a / 255]],
  ["black", [0, 0, 0]],
  ["white", [1, 1, 1]],
];

const SUN_ALTS = [];
for (let a = -10; a <= 85; a += 1) SUN_ALTS.push(a);

// ---- 1. the relief term is signed ------------------------------------

console.log("\n1. relief is signed: tilting toward the sun brightens");
{
  // A slope tilted toward the sun receives more light than flat ground
  // right up to the point where its normal passes the sun, at
  // slope = 90 - altitude. Over that range the Lambertian term is
  // strictly increasing in slope; the slope/aspect model is flat
  // across the whole of it, because reliefDark is sin(slope) times
  // (1 - shadeDir) and shadeDir is pinned at 1 for a sun-facing
  // slope. So that model has shade but no highlight: every slope not
  // turned away from the sun renders exactly as flat ground does.
  let overlayWorstStep = Infinity;
  let overlayWorstAt = "";
  let multiplySpread = 0;
  for (const alt of [5, 15, 25, 40, 55, 70]) {
    let prevO = -Infinity;
    const grazing = 90 - alt;
    const flatM = multiplyV(scene({ slopeDeg: 0, sunAltDeg: alt }));
    for (let slope = 0; slope <= grazing - 0.5; slope += 0.5) {
      const s = scene({ slopeDeg: slope, aspectDeg: 0, sunAltDeg: alt });
      const o = overlayValue(s);
      if (o - prevO < overlayWorstStep) {
        overlayWorstStep = o - prevO;
        overlayWorstAt = `alt ${alt}\u00b0 slope ${slope}\u00b0`;
      }
      prevO = o;
      multiplySpread = Math.max(multiplySpread, Math.abs(multiplyV(s) - flatM));
    }
  }
  check(
    "overlay: strictly brighter with every degree of tilt toward the sun",
    overlayWorstStep > 0,
    `min step ${overlayWorstStep.toExponential(2)} (worst at ${overlayWorstAt})`,
  );
  check(
    "slope/aspect: every sun-facing slope renders as flat ground",
    multiplySpread < 1e-12,
    `max |difference| ${multiplySpread.toExponential(2)} \u2014 no highlight at all`,
  );
}

// ---- 2. flat ground is neutral at every sun altitude -----------------

console.log("\n2. flat ground is exactly neutral, however low the sun");
{
  let worst = 0;
  for (const alt of SUN_ALTS) {
    const v = overlayValue(scene({ slopeDeg: 0, sunAltDeg: alt, shadowStr: 0 }));
    worst = Math.max(worst, Math.abs(v - 0.5));
  }
  check(
    "overlay: flat, open, unshadowed ground holds value = 0.5 over −10°..85°",
    worst < 1e-12,
    `max |value − 0.5| ${worst.toExponential(2)}`,
  );
}

// ---- 3. neutral shading is an identity on the albedo -----------------

console.log("\n3. neutral shading leaves the albedo alone");
{
  let worst = 0;
  let worstName = "";
  for (const [name, rgb] of SAMPLES) {
    const albedo = srgbToOklab(rgb);
    for (const alt of [2, 10, 30, 60, 85]) {
      const s = scene({ slopeDeg: 0, sunAltDeg: alt, shadowStr: 0 });
      const out = overlayRgb(s, albedo, 1);
      const d = Math.max(...out.map((x, i) => Math.abs(q8(x) - q8(rgb[i]))));
      if (d > worst) { worst = d; worstName = `${name} @ ${alt}°`; }
    }
  }
  check(
    "a satellite pixel on open, lit flats survives the round trip",
    worst <= 1,
    `max channel drift ${worst}/255 (${worstName})`,
  );
}

// ---- 4. the albedo is a midpoint, not a ceiling ----------------------

console.log("\n4. the imagery is a midpoint, not a ceiling");
{
  // The consequence of 1 for a satellite composite. Under the
  // slope/aspect model k = v / v0 never exceeds 1 on open ground, so
  // the albedo's own lightness is an upper bound: the map can only ever
  // be darker than the photograph it is made from, and relief has to be
  // read out of the shadows alone. Under overlay the albedo sits in the
  // middle of the range, with sunlit slopes above it.
  const albedos = SAMPLES.filter(([n]) => n !== "white" && n !== "black");
  let worstHeadroom = Infinity;
  let worstName = "";
  let multiplyCeiling = -Infinity;
  for (const [name, rgb] of albedos) {
    const albedo = srgbToOklab(rgb);
    const L0 = albedo[0];
    const toward = scene({ slopeDeg: 30, aspectDeg: 0, sunAltDeg: 25 });
    const away = scene({ slopeDeg: 30, aspectDeg: 180, sunAltDeg: 25 });
    const headroom = overlayL(toward, albedo) - L0;
    if (headroom < worstHeadroom) { worstHeadroom = headroom; worstName = name; }
    for (const aspect of [0, 45, 90, 135, 180]) {
      const s = scene({ slopeDeg: 30, aspectDeg: aspect, sunAltDeg: 25 });
      multiplyCeiling = Math.max(
        multiplyCeiling, lightOf(multiplyRgb(s, albedo)) - L0,
      );
    }
    // Not gated, but worth seeing: because the slope/aspect model
    // scales the albedo's lightness, a bright albedo takes a far
    // bigger absolute hit than a dark one from the same slope, which
    // is what turns snow into rock on a shaded face. Overlay's offset
    // is absolute, so the swing is the same wherever the albedo sits.
    if (showCompare) {
      const spreadO = overlayL(toward, albedo) - overlayL(away, albedo);
      const spreadM =
        lightOf(multiplyRgb(toward, albedo)) - lightOf(multiplyRgb(away, albedo));
      console.log(
        `      ${name.padEnd(12)} L0=${L0.toFixed(3)}  ` +
        `spread overlay ${spreadO.toFixed(4)}  slope/aspect ${spreadM.toFixed(4)}`,
      );
    }
  }
  check(
    "overlay: a sunlit slope comes out brighter than the imagery",
    worstHeadroom > 0.01,
    `min headroom ${worstHeadroom.toFixed(4)} L (${worstName})`,
  );
  check(
    "slope/aspect: no slope ever exceeds the imagery's own lightness",
    multiplyCeiling <= 1e-9,
    `max headroom ${multiplyCeiling.toExponential(2)}`,
  );
}

// ---- 4b. the inherited knobs keep their meaning -----------------------

console.log("\n4b. shadow and occlusion darken by what the slider says");
{
  // SHADE_TO_VALUE is claimed to be within a few percent of the exact
  // translation atanh(sqrt(f) - 1) over the sliders' useful range.
  // Checked here against the closed form, and then end to end: a
  // mid-grey albedo under full shadow must land near shadowMask times
  // itself, which is where the other model puts it.
  // Absolute error, since the term is added rather than multiplied.
  let worst = 0;
  let worstF = 0;
  for (let f = 0.5; f <= 1.0001; f += 0.002) {
    const exact = Math.atanh(Math.sqrt(f) - 1);
    const approx = SHADE_TO_VALUE * (f - 1);
    const d = Math.abs(approx - exact);
    if (d > worst) { worst = d; worstF = f; }
  }
  check("the constant tracks the closed form over f in [0.5, 1]",
    worst < 0.02,
    `max error ${worst.toFixed(4)} in value at f = ${worstF.toFixed(3)}`);

  // The derivation is written for an albedo at Oklab L = 0.5, so the
  // probe is that, not mid-grey sRGB, whose L is nearer 0.6.
  const mid = [0.5, 0, 0];
  const s = scene({ slopeDeg: 0, sunAltDeg: 30, shadow: 1 });
  const want = 1 - SHADOW_STR; // shadowMask at full shadow
  const got = overlayL(s, mid) / mid[0];
  check("a flat pixel in full shadow lands where the slider says",
    Math.abs(got - want) < 0.03,
    `renders at ${got.toFixed(3)} of itself, slider says ${want.toFixed(3)}`);
}

// ---- 5. monotone in the shading value, and in range ------------------

console.log("\n5. output lightness is strictly increasing in the shading, and in range");
{
  let worstDrop = Infinity;
  let outOfRange = 0;
  for (const [, rgb] of SAMPLES) {
    const albedo = srgbToOklab(rgb);
    let prev = -Infinity;
    for (let i = 0; i <= 2000; i++) {
      const value = i / 2000;
      const base = clamp01(albedo[0] + value - 0.5);
      const L = blendOverlay(base, value);
      if (L < -1e-12 || L > 1 + 1e-12) outOfRange++;
      // Strictly increasing except where the base offset has clamped,
      // which is a plateau, not a reversal.
      worstDrop = Math.min(worstDrop, L - prev);
      prev = L;
    }
  }
  check("never decreasing in the shading value", worstDrop >= -1e-12,
    `worst step ${worstDrop.toExponential(2)}`);
  check("output lightness never leaves [0, 1]", outOfRange === 0,
    `${outOfRange} excursions`);
}
{
  // End to end, including the brightness knob: more brightness is never
  // less light, at any slope, aspect or albedo.
  let worst = Infinity;
  let worstName = "";
  for (const [name, rgb] of SAMPLES) {
    const albedo = srgbToOklab(rgb);
    for (const slope of [0, 20, 45]) {
      for (const aspect of [0, 90, 180]) {
        let prev = -Infinity;
        for (let b = -1; b <= 1.0001; b += 0.005) {
          const L = overlayL(
            scene({ slopeDeg: slope, aspectDeg: aspect, brightness: b }), albedo,
          );
          if (L - prev < worst) { worst = L - prev; worstName = `${name} slope ${slope} aspect ${aspect}`; }
          prev = L;
        }
      }
    }
  }
  check("the brightness knob is monotone end to end", worst >= -1e-12,
    `worst step ${worst.toExponential(2)} (${worstName})`);
}

// ---- 6. hue is preserved ---------------------------------------------

console.log("\n6. hue is preserved through shading and saturation");
{
  let worst = 0;
  let worstName = "";
  for (const [name, rgb] of SAMPLES) {
    const albedo = srgbToOklab(rgb);
    if (chromaOf(rgb) < 1e-3) continue; // no hue to preserve
    const h0 = hueOf(rgb);
    for (const slope of [0, 25, 50]) {
      for (const aspect of [0, 180]) {
        for (const satK of [0, 0.5, 1, 1.5, 2]) {
          const out = overlayRgb(
            scene({ slopeDeg: slope, aspectDeg: aspect }), albedo, satK,
          );
          if (chromaOf(out) < 1e-3) continue; // driven to grey, no hue left
          const d = angleDiff(h0, hueOf(out));
          if (d > worst) { worst = d; worstName = `${name} slope ${slope} sat ${satK}`; }
        }
      }
    }
  }
  check("hue drifts by under 0.5° at every setting", worst < 0.5 * Math.PI / 180,
    `max ${((worst * 180) / Math.PI).toFixed(4)}° (${worstName})`);
}

// ---- 7. the terminator is a one-way ramp into the dark ---------------

console.log("\n7. through the terminator, nothing brightens");
{
  // The property verify-night-shading.mjs gates for the slope/aspect
  // model, re-run against this one. It is narrower here, and on purpose.
  //
  // Away from the terminator the Lambertian term is *not* monotone in
  // altitude, and must not be: a steep slope facing the sun is most lit
  // when the sun is square to it, so a 60 degree slope keeps getting
  // brighter as the sun falls from 60 degrees to 30. That is the
  // physics the model is here to capture, and it is exactly what the
  // slope/aspect model throws away.
  //
  // What must not happen is the terminator itself running backwards.
  // Inside the twilight band the relief term fades out with T =
  // twilight while the cast-shadow and night floors fade in, and on a
  // slope turned away from the sun the relief term is negative, so
  // fading it to zero is itself a brightening. Collecting the terms in
  // T, the T-dependent part of value is
  //
  //   T * [ 0.5 * lambRel * reliefGain + nightDepth ]
  //
  // — the cast shadow drops out, because the overlay model takes it
  // straight from the bake and the bake does not fade with twilight.
  //
  // so the composite darkens as T falls exactly while that bracket is
  // positive. lambRel is bounded below by -1 near the horizon, which
  // is why the shader floors nightDepth at 0.5 * reliefGain: the
  // bracket is then non-negative whatever the two sliders are set to,
  // rather than only at the defaults. Both are swept here.
  // The band's upper edge, where `twilight` saturates at 1. Above it
  // nothing is fading and the altitude sweep is pure Lambertian.
  const BAND_TOP = (Math.asin(0.035) * 180) / Math.PI - 1e-6;
  // Measured in output lightness, on a mid albedo, so the bound is in
  // units the eye and the 8-bit framebuffer share.
  const probe = srgbToOklab([0x8b / 255, 0x5a / 255, 0x3c / 255]);
  let worstRise = 0;
  let worstName = "";
  let netWorst = Infinity;
  let netName = "";
  for (const slope of [0, 15, 30, 45, 60, 75]) {
    for (const aspect of [0, 45, 90, 135, 180]) {
      for (const shadow of [0, 0.5, 1]) {
        let prev = Infinity;
        let first = null;
        let last = null;
        for (let altDeg = BAND_TOP; altDeg >= -10.0001; altDeg -= 0.02) {
          const L = overlayL(
            scene({ slopeDeg: slope, aspectDeg: aspect, sunAltDeg: altDeg, shadow, useTime: 1 }),
            probe,
          );
          if (first === null) first = L;
          last = L;
          const rise = L - prev; // must stay non-positive: darker as it sets
          if (rise > worstRise) {
            worstRise = rise;
            worstName = `slope ${slope} aspect ${aspect} shadow ${shadow} @ ${altDeg.toFixed(2)}\u00b0`;
          }
          prev = L;
        }
        if (first - last < netWorst) {
          netWorst = first - last;
          netName = `slope ${slope} aspect ${aspect} shadow ${shadow}`;
        }
      }
    }
  }
  // Pointwise the statement is not exactly true, and the reason is
  // worth writing down: smoothstep has zero slope at both endpoints,
  // so in a thin boundary layer at the top of the band nothing is yet
  // fading while the Lambertian term is still moving with altitude. A
  // steep slope facing the sun therefore picks up a last sliver of
  // light on the way in. It is bounded by well under a hundredth of a
  // quantisation step, which is to say it does not exist on screen,
  // and the net traverse of the band is a darkening everywhere.
  check("no brightening worth a quantisation step through the terminator",
    worstRise * 255 < 0.05,
    `worst rise ${(worstRise * 255).toFixed(4)}/255 (${worstName})`);
  check("and the band as a whole is a darkening, at every slope and aspect",
    netWorst > 0,
    `smallest net drop ${netWorst.toFixed(4)} L (${netName})`);

  // The bound, and the relief strength at which it is reached.
  // And the same sweep over the whole of both sliders, which is what
  // the nightDepth floor is there to make safe.
  let knobWorst = 0;
  let knobName = "";
  for (const reliefStr of [0, 0.2, 0.38, 0.6, 0.8, 0.95, 1]) {
    for (const shadowStr of [0, 0.1, 0.47, 0.8, 1]) {
      for (const slope of [30, 60, 80]) {
        for (const aspect of [0, 180]) {
          let prev = Infinity;
          for (let altDeg = BAND_TOP; altDeg >= -10.0001; altDeg -= 0.05) {
            const L = overlayL(scene({
              slopeDeg: slope, aspectDeg: aspect, sunAltDeg: altDeg,
              shadow: 1, useTime: 1, reliefStr, shadowStr,
            }), probe);
            if (L - prev > knobWorst) {
              knobWorst = L - prev;
              knobName = `relief ${reliefStr} shadow ${shadowStr} slope ${slope} aspect ${aspect}`;
            }
            prev = L;
          }
        }
      }
    }
  }
  check("and over the whole of both sliders, not just the defaults",
    knobWorst * 255 < 0.2,
    `worst rise ${(knobWorst * 255).toFixed(4)}/255 (${knobName})`);
}

// ---- optional: the two models side by side ---------------------------

if (showCompare) {
  console.log("\n--compare: canyon rock albedo, 25\u00b0 sun");
  const albedo = srgbToOklab([0x8b / 255, 0x5a / 255, 0x3c / 255]);
  const L0 = srgbToOklab([0x8b / 255, 0x5a / 255, 0x3c / 255])[0];
  console.log(`  the albedo itself is ${hex([0x8b / 255, 0x5a / 255, 0x3c / 255])}, L=${L0.toFixed(3)}`);

  console.log("\n  slope sweep, tilted toward the sun:");
  console.log("  slope    overlay            slope/aspect");
  for (const slope of [0, 10, 20, 30, 40, 50, 60]) {
    const s = scene({ slopeDeg: slope, aspectDeg: 0, sunAltDeg: 25 });
    const o = overlayRgb(s, albedo);
    const m = multiplyRgb(s, albedo);
    console.log(
      `  ${String(slope).padStart(4)}\u00b0   ${hex(o)}  L=${lightOf(o).toFixed(3)}` +
      `    ${hex(m)}  L=${lightOf(m).toFixed(3)}`,
    );
  }
  console.log("\n  the slope/aspect column does not move: the model has shade");
  console.log("  but no highlight, so a slope tilted toward the sun renders");
  console.log("  exactly as flat ground does, however steep it gets.");

  console.log("\n  aspect sweep at 30\u00b0 slope:");
  console.log("  aspect   overlay            slope/aspect");
  for (const aspect of [0, 30, 60, 90, 120, 150, 180]) {
    const s = scene({ slopeDeg: 30, aspectDeg: aspect, sunAltDeg: 25 });
    const o = overlayRgb(s, albedo);
    const m = multiplyRgb(s, albedo);
    console.log(
      `  ${String(aspect).padStart(4)}\u00b0   ${hex(o)}  L=${lightOf(o).toFixed(3)}` +
      `    ${hex(m)}  L=${lightOf(m).toFixed(3)}`,
    );
  }
  console.log("\n  here both models move, and the difference is where the");
  console.log(`  albedo sits in the range: overlay straddles L=${L0.toFixed(3)},`);
  console.log("  slope/aspect hangs below it.");
}

console.log(
  failures === 0
    ? "\nAll overlay-shading gates pass.\n"
    : `\n${failures} gate(s) failed.\n`,
);
process.exit(failures === 0 ? 0 : 1);
