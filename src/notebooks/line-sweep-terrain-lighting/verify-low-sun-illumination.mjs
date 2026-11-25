// Gate: a low sun still lights what it can see.
//
// The bake already knows, pixel by pixel, whether the sun is above that
// pixel's own terrain horizon. With `horizonFloor: false` — which is
// what the map passes — the soft-shadow sweep follows the true
// altitude through the horizon and out the other side, so a summit
// whose local horizon dips below the sun keeps a shadow value of 0
// (lit) while the valley beside it goes to 1 (shadowed). That is last
// light on the summits, and it is computed correctly.
//
// The composite then threw it away. `fixedHS` faded the whole scene to
// "fully shadowed" over the last two degrees above the horizon:
//
//   fixedHS = mix(1.0, shadow, saturate(sunDir.z / 0.035))
//
// At 1 degree a fully lit pixel came out at 0.76 of open ground, at 0.2
// degrees at 0.58, and at the horizon at 0.53 — which is exactly where
// a fully *shadowed* pixel sits. The two become the same colour. Every
// low-sun effect worth having lives in the difference between them, so
// the fade removed the whole phenomenon rather than softening it, and
// it did so entirely above the horizon, where the sun is still up.
//
// The same went for `timeHS` through civil twilight.
//
// What is gated here:
//   1. lit and shadowed stay far apart at every altitude above the
//      horizon, so there is something to see;
//   2. the scene still goes dark once the sun is actually down, and
//      gets there through the bake rather than a blanket fade;
//   3. summits outlast valleys: between them there is a band of
//      altitudes where the valley is shadowed and the summit is not;
//   4. nothing brightens as the sun sets, which is the property
//      verify-night-shading.mjs and verify-overlay-shading.mjs hold
//      for their own models.
//
// Run with --table to print the lit/shadowed sweep as numbers.
//
//   node src/notebooks/line-sweep-terrain-lighting/verify-low-sun-illumination.mjs
//   node .../verify-low-sun-illumination.mjs --table

const showTable = process.argv.includes("--table");
// The behaviour this replaced, for the table and for contrast.
const legacy = process.argv.includes("--legacy");

const S = 0.47;        // shadow strength, the figure's default
const SUN_RADIUS = 0.46; // degrees, half of the default 0.92 diameter

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const rad = (d) => (d * Math.PI) / 180;

// ---- the bake, for one pixel ----------------------------------------

// sweepCore in 'soft' mode with horizonFloor false: the sweep finds the
// steepest slope to anything it can see, `tanHorizon`, and smoothsteps
// the shadow bit across the sun disc's altitude window. 0 = lit.
function bakeShadow(tanHorizon, altDeg, sunRadiusDeg = SUN_RADIUS) {
  const half = 1.5 * sunRadiusDeg;
  const bot = Math.tan(rad(altDeg - half));
  const top = Math.tan(rad(altDeg + half));
  if (tanHorizon <= bot) return 0;
  return smoothstep(bot, top, tanHorizon);
}

// Two pixels in the same scene. The summit sees nothing above it and
// looks down on terrain well below, so its horizon slope is negative.
// The valley floor sits under a rim.
const SUMMIT_TAN = Math.tan(rad(-1.2)); // looks 1.2 degrees downhill
const VALLEY_TAN = Math.tan(rad(8));    // rim 8 degrees up

// ---- the composite's shadow mask ------------------------------------

// Fixed-sun mode. `legacyFixedHS` is what this gated away.
const legacyFixedHS = (shadow, altDeg) =>
  1 + (shadow - 1) * clamp01(Math.sin(rad(altDeg)) / 0.035);
const fixedHS = (shadow) => shadow;

const shadowMask = (shadow, altDeg) =>
  1 - S * (legacy ? legacyFixedHS(shadow, altDeg) : fixedHS(shadow));

// Time mode adds the night floor, which is what takes the scene down
// once the sun is genuinely gone. twilight spans about (-6, +2) degrees.
const twilightAt = (altDeg) => smoothstep(-0.105, 0.035, Math.sin(rad(altDeg)));
const legacyTimeHS = (shadow, altDeg) =>
  1 + (shadow - 1) * twilightAt(altDeg);
const timeHS = (shadow) => shadow;

// The overlay model's night term, which is altitude-dependent where the
// cast shadow no longer is. reliefGain at the default relief strength.
const RELIEF_GAIN = 0.38 / (1 - 0.38);
const SHADE_TO_VALUE = 0.57;
const NIGHT_DEPTH = Math.max(SHADE_TO_VALUE * S, 0.5 * RELIEF_GAIN);

// `value` for a flat-ish pixel carrying a given bake shadow, in time
// mode, with relief and occlusion left out: neither depends on the cast
// shadow, and what is being measured is the shadow path.
function timeValue(shadow, altDeg) {
  const T = twilightAt(altDeg);
  const mask = 1 - S * (legacy ? legacyTimeHS(shadow, altDeg) : timeHS(shadow));
  let value = 0.5;
  value += SHADE_TO_VALUE * (mask - 1);
  value -= NIGHT_DEPTH * (1 - T);
  return 0.5 + 0.5 * Math.tanh(value - 0.5);
}

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures++;
  console.log(`${ok ? "  ok  " : "FAIL  "}${name}${detail ? `  ${detail}` : ""}`);
};

// ---- 1. lit and shadowed stay apart above the horizon ---------------

console.log("\n1. above the horizon, lit and shadowed stay far apart");
{
  let worst = Infinity;
  let worstAt = 0;
  for (let altDeg = 0.05; altDeg <= 20.0001; altDeg += 0.05) {
    const contrast = shadowMask(0, altDeg) - shadowMask(1, altDeg);
    if (contrast < worst) { worst = contrast; worstAt = altDeg; }
  }
  // Full separation is the shadow strength itself. Anything much under
  // it means the slider has quietly stopped applying.
  check("the lit/shadowed gap never falls below the shadow strength",
    worst >= S - 1e-9,
    `min gap ${worst.toFixed(4)} at ${worstAt.toFixed(2)} deg, slider is ${S}`);
}

// ---- 2. the scene still goes dark, via the bake ---------------------

console.log("\n2. flat ground still goes dark as the sun sets");
{
  // Flat ground: horizon slope 0. The disc's window slides down past
  // it, so the bake takes it from lit to shadowed across roughly
  // +/- 1.5 sun radii, with no help from the composite.
  const lit = bakeShadow(0, 2);
  const half = bakeShadow(0, 0);
  const gone = bakeShadow(0, -2);
  check("lit well above the horizon", lit < 0.01, `shadow ${lit.toFixed(4)} at +2 deg`);
  check("half shadowed with the disc on the horizon",
    Math.abs(half - 0.5) < 0.02, `shadow ${half.toFixed(4)} at 0 deg`);
  check("fully shadowed once the disc is down",
    gone > 0.99, `shadow ${gone.toFixed(4)} at -2 deg`);
}

// ---- 3. summits outlast valleys -------------------------------------

console.log("\n3. there is a band where the summit is lit and the valley is not");
{
  let bandLo = null;
  let bandHi = null;
  for (let altDeg = 12; altDeg >= -3.0001; altDeg -= 0.01) {
    const summit = bakeShadow(SUMMIT_TAN, altDeg);
    const valley = bakeShadow(VALLEY_TAN, altDeg);
    if (valley > 0.99 && summit < 0.01) {
      if (bandHi === null) bandHi = altDeg;
      bandLo = altDeg;
    }
  }
  check("the bake opens such a band", bandLo !== null,
    bandLo === null ? "none found" : `from ${bandHi.toFixed(2)} down to ${bandLo.toFixed(2)} deg`);

  // And that band has to survive the composite, which is the whole
  // point: the bake knowing is worth nothing if the mask flattens it.
  let worst = Infinity;
  let worstAt = 0;
  if (bandLo !== null) {
    for (let altDeg = bandLo; altDeg <= bandHi + 1e-9; altDeg += 0.01) {
      const d = shadowMask(bakeShadow(SUMMIT_TAN, altDeg), altDeg)
        - shadowMask(bakeShadow(VALLEY_TAN, altDeg), altDeg);
      if (d < worst) { worst = d; worstAt = altDeg; }
    }
  }
  // The band is defined with a percent of slack at each end, so the
  // widest gap it can show is S * (0.99 - 0.01), not S itself.
  const bandBound = S * 0.98;
  check("and the composite keeps it open all the way down",
    worst >= bandBound - 1e-9,
    `min summit-vs-valley gap ${worst.toFixed(4)} at ${worstAt.toFixed(2)} deg, ` +
    `band allows at most ${bandBound.toFixed(4)}`);
}

// ---- 4. nothing brightens as the sun sets ---------------------------

console.log("\n4. through the set, nothing brightens");
{
  let worstRise = 0;
  let worstAt = 0;
  for (const tanH of [SUMMIT_TAN, 0, VALLEY_TAN]) {
    let prev = Infinity;
    for (let altDeg = 6; altDeg >= -10.0001; altDeg -= 0.01) {
      const v = timeValue(bakeShadow(tanH, altDeg), altDeg);
      if (v - prev > worstRise) { worstRise = v - prev; worstAt = altDeg; }
      prev = v;
    }
  }
  check("value never rises as the altitude falls",
    worstRise < 1e-9,
    `worst rise ${worstRise.toExponential(2)} at ${worstAt.toFixed(2)} deg`);
}

if (showTable) {
  console.log(`\n--table${legacy ? " --legacy" : ""}: shadow mask by sun altitude`);
  console.log("   alt      summit   valley    gap");
  for (const a of [10, 5, 3, 2, 1.5, 1, 0.5, 0.2, 0, -0.5, -1, -2]) {
    const sm = shadowMask(bakeShadow(SUMMIT_TAN, a), a);
    const vm = shadowMask(bakeShadow(VALLEY_TAN, a), a);
    console.log(`  ${a.toFixed(1).padStart(5)}d    ${sm.toFixed(3)}    ${vm.toFixed(3)}   ${(sm - vm).toFixed(3)}`);
  }
}

console.log(
  failures === 0
    ? "\nAll low-sun illumination gates pass.\n"
    : `\n${failures} gate(s) failed.\n`,
);
process.exit(failures === 0 ? 0 : 1);
