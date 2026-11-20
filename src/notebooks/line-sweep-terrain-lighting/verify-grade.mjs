// Gates for the final figure's brightness and saturation grade.
//
// This ports `gradeSrgb` and the Oklab helpers it leans on from the
// composite shader in tile-viewer.js to JS, so the knobs can be swept
// over their whole range without a GPU. What is being locked down is
// not a particular look but four structural properties, each of which
// is the reason the grade is a lightness gamma in Oklab rather than
// one of the obvious alternatives:
//
//   1. black and white are fixed points, at every knob setting;
//   2. the tone curve is strictly increasing, so no two distinct
//      lightnesses can collapse onto one — brightening compresses the
//      highlights, it cannot blow them out;
//   3. output never leaves [0, 1], so there is nothing to clip;
//   4. hue is preserved exactly, chroma included, because both a and b
//      are scaled by the same positive factor and the gamut clipper
//      backs chroma off along a constant-hue line.
//
// The two alternatives this rejects are gated alongside, as a
// demonstration rather than an assertion about taste: `--naive` prints
// what an exposure multiply and a per-channel gamma do to the same
// pixels. The multiply loses the top of the ramp outright (every level
// above the clip point lands on 255), and the per-channel gamma drags
// saturated colours off-hue toward whichever channel saturates first.
//
//   node src/notebooks/line-sweep-terrain-lighting/verify-grade.mjs
//   node .../verify-grade.mjs --naive

const showNaive = process.argv.includes("--naive");

// ---- the shader's colour plumbing, transcribed ----------------------

const clamp01 = (x) => Math.min(1, Math.max(0, x));

function linearToSrgb(x) {
  const c = clamp01(x);
  if (c <= 0.0031308) return 12.92 * c;
  return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function srgbToLinear(x) {
  const c = clamp01(x);
  if (c <= 0.04045) return c / 12.92;
  return Math.pow((c + 0.055) / 1.055, 2.4);
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
  return rgb.map((x) => linearToSrgb(clamp01(x)));
}

// The grade itself. `stops` is the slider's value; the shader is handed
// the exponent, exactly as the uniform write computes it.
function gradeSrgb(srgb, stops, satK) {
  const e = Math.pow(2, -stops);
  if (e === 1 && satK === 1) return srgb.slice();
  const lab = srgbToOklab(srgb);
  const L = clamp01(lab[0]);
  const L2 = Math.pow(L, Math.max(e, 1e-4));
  const cs = L > 0 ? (satK * L2) / Math.max(L, 1e-4) : 0;
  return oklabToSrgbClipped([L2, lab[1] * cs, lab[2] * cs]);
}

// ---- the two alternatives, for contrast ------------------------------

// Exposure: scale linear light, clip what overflows.
function exposure(srgb, stops) {
  const k = Math.pow(2, stops);
  return srgb.map((c) => linearToSrgb(clamp01(srgbToLinear(c) * k)));
}

// Per-channel gamma on the encoded value — the thing the brief rules
// out, and the reason it does.
function perChannelGamma(srgb, stops) {
  const e = Math.pow(2, -stops);
  return srgb.map((c) => Math.pow(clamp01(c), e));
}

// ---- helpers ---------------------------------------------------------

const hueOf = (srgb) => {
  const [, a, b] = srgbToOklab(srgb);
  return Math.atan2(b, a);
};
const chromaOf = (srgb) => {
  const [, a, b] = srgbToOklab(srgb);
  return Math.hypot(a, b);
};
const lightOf = (srgb) => srgbToOklab(srgb)[0];
const q8 = (x) => Math.round(clamp01(x) * 255);
const hex = (srgb) =>
  "#" + srgb.map((c) => q8(c).toString(16).padStart(2, "0")).join("");
const angleDiff = (p, q) => {
  let d = p - q;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d);
};

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures++;
  console.log(
    `${ok ? "  ok  " : "  FAIL"}  ${name}${detail ? "  " + detail : ""}`,
  );
};

// The figure's own default ramp stops, plus a couple of satellite-ish
// colours and the two extremes, so the sweeps run over the colours the
// map actually puts on screen.
const SAMPLES = [
  { name: "black", srgb: [0, 0, 0] },
  { name: "white", srgb: [1, 1, 1] },
  { name: "mid grey", srgb: [0.5, 0.5, 0.5] },
  { name: "ramp #6a7f66", srgb: [0x6a / 255, 0x7f / 255, 0x66 / 255] },
  { name: "ramp #c8aa92", srgb: [0xc8 / 255, 0xaa / 255, 0x92 / 255] },
  { name: "ramp #eab69a", srgb: [0xea / 255, 0xb6 / 255, 0x9a / 255] },
  { name: "ramp #b9826a", srgb: [0xb9 / 255, 0x82 / 255, 0x6a / 255] },
  { name: "ramp #ffd5c7", srgb: [0xff / 255, 0xd5 / 255, 0xc7 / 255] },
  { name: "vegetation", srgb: [0x3a / 255, 0x5f / 255, 0x2a / 255] },
  { name: "deep water", srgb: [0x0d / 255, 0x2b / 255, 0x4f / 255] },
  { name: "saturated red", srgb: [0.9, 0.05, 0.05] },
];

// Both sliders' full declared ranges, stepped fine enough that an edge
// case has nowhere to hide.
const BRIGHT = [];
for (let v = -1; v <= 1.0000001; v += 0.02) BRIGHT.push(Number(v.toFixed(2)));
const SATUR = [];
for (let v = 0; v <= 2.0000001; v += 0.05) SATUR.push(Number(v.toFixed(2)));

// ---- 1. neutral is an exact identity ---------------------------------

console.log("\n1. neutral knobs leave the pixel alone");
{
  let worst = 0;
  for (const { srgb } of SAMPLES) {
    const out = gradeSrgb(srgb, 0, 1);
    for (let i = 0; i < 3; i++) worst = Math.max(worst, Math.abs(out[i] - srgb[i]));
  }
  check("brightness 0, saturation 1 is a bit-exact passthrough", worst === 0,
    `max |delta| = ${worst}`);
}

// ---- 2. endpoints are pinned -----------------------------------------

console.log("\n2. black and white are fixed points at every setting");
{
  let worstBlack = 0;
  let worstWhite = 0;
  for (const b of BRIGHT) {
    for (const s of SATUR) {
      const k = gradeSrgb([0, 0, 0], b, s);
      const w = gradeSrgb([1, 1, 1], b, s);
      worstBlack = Math.max(worstBlack, ...k.map(Math.abs));
      worstWhite = Math.max(worstWhite, ...w.map((c) => Math.abs(c - 1)));
    }
  }
  check("black stays black", worstBlack <= 1e-6, `max |out| = ${worstBlack.toExponential(2)}`);
  check("white stays white", worstWhite <= 1e-6, `max |1 - out| = ${worstWhite.toExponential(2)}`);
}

// ---- 3. nothing can be driven out of range ---------------------------

console.log("\n3. output never leaves [0, 1]");
{
  let lo = Infinity;
  let hi = -Infinity;
  for (const { srgb } of SAMPLES) {
    for (const b of BRIGHT) {
      for (const s of SATUR) {
        for (const c of gradeSrgb(srgb, b, s)) {
          lo = Math.min(lo, c);
          hi = Math.max(hi, c);
        }
      }
    }
  }
  check("every channel of every sample, over both sliders", lo >= 0 && hi <= 1,
    `range [${lo.toFixed(6)}, ${hi.toFixed(6)}]`);
}

// ---- 4. the highlights never flatten --------------------------------

// The blow-out test, and the one the brief actually asks for. A
// 256-step grey ramp is graded and the result is quantised to 8 bits,
// the way the display will. Two things are required of it: the float
// lightnesses stay strictly ordered, and no run of adjacent levels in
// the top half of the ramp collapses onto one 8-bit value. A flat
// patch up there is a highlight that has lost its relief.
//
// The bottom half is reported but not bounded, because squeezing the
// shadows is what darkening *is*: at brightness -1 the curve is L^2,
// whose slope near black is near zero, so a run of near-black levels
// landing on the same 8-bit value is the honest result of asking for a
// darker map, not a defect. The direction the brief cares about,
// brightening, leaves the shadows alone entirely.
console.log("\n4. a 256-step grey ramp keeps its highlights at every brightness");
{
  const ramp = Array.from({ length: 256 }, (_, i) => i / 255);
  // Longest run of adjacent levels sharing an 8-bit value, within one
  // half of the ramp.
  const longestRun = (outs, half) => {
    let run = 1;
    let worst = 1;
    for (let i = 1; i < outs.length; i++) {
      if (half === "hi" ? i < 128 : i >= 128) { run = 1; continue; }
      if (q8(outs[i][0]) === q8(outs[i - 1][0])) worst = Math.max(worst, ++run);
      else run = 1;
    }
    return worst;
  };
  let strictOK = true;
  let hiOK = true;
  let pinnedOK = true;
  for (const b of [-1, -0.5, 0, 0.5, 1]) {
    const outs = ramp.map((v) => gradeSrgb([v, v, v], b, 1));
    const Ls = outs.map(lightOf);
    let strict = true;
    for (let i = 1; i < Ls.length; i++) if (!(Ls[i] > Ls[i - 1])) strict = false;
    const hi = longestRun(outs, "hi");
    const lo = longestRun(outs, "lo");
    // Levels driven all the way to 255. Pure white is one of them and
    // is supposed to be; anything else is a clipped highlight.
    const pinned = outs.filter((o) => q8(o[0]) === 255).length;
    console.log(
      `       brightness ${String(b).padStart(5)}:  ordered ${strict ? "yes" : "NO "}` +
        `   longest flat run  highlights ${String(hi).padStart(2)}  shadows ${String(lo).padStart(2)}` +
        `   levels pinned at 255: ${pinned}`,
    );
    if (!strict) strictOK = false;
    if (hi > 3) hiOK = false;
    if (pinned !== 1) pinnedOK = false;
  }
  check("strictly increasing at every brightness", strictOK);
  check("no flat run past 3 levels anywhere in the highlights", hiOK);
  check("white is the only level that reaches 255", pinnedOK);
}

// ---- 5. hue is preserved ---------------------------------------------

// Both knobs scale a and b by the same positive factor, so the grade
// cannot rotate hue at all, and the measurement below says so: wherever
// the colour it asks for fits the display gamut, hue comes back to
// within 1e-5 of a radian, which is float noise.
//
// Every bit of drift beyond that comes from the gamut clipper the
// result goes out through, and specifically from its last step: it
// accepts a colour whose linear channels sit within 1e-4 of the cube
// and then clamps them in. Near black a channel's own value is of that
// order, so clamping it can rotate hue by a few degrees. The size of
// that effect is bounded by how dark the pixel is, which is why it is
// measured in two bands rather than one -- above Oklab L 0.2 it is
// under a hundredth of a radian, and the only place it reaches a few
// degrees is a pixel the eye reads as black either way. This is the
// existing clipper's behaviour, shared with shadeOklab, not something
// the grade introduces, so it is bounded here rather than tuned out.
console.log("\n5. hue is untouched by either knob");
{
  let exact = 0;
  let exactAt = "";
  let clipVis = 0;
  let clipVisAt = "";
  let clipDark = 0;
  let clipDarkAt = "";
  for (const { name, srgb } of SAMPLES) {
    // Neutral samples have no hue to preserve; chroma 0 is where atan2
    // is meaningless, not where it is wrong.
    if (chromaOf(srgb) < 1e-3) continue;
    const lab0 = srgbToOklab(srgb);
    const h0 = hueOf(srgb);
    for (const b of BRIGHT) {
      for (const s of SATUR) {
        if (s === 0) continue; // saturation 0 is greyscale by design
        // Reproduce the colour the grade asks for, before the clipper
        // has had a say, so the two sources of drift stay separable.
        const e = Math.pow(2, -b);
        const L2 = Math.pow(clamp01(lab0[0]), e);
        const cs = (s * L2) / Math.max(lab0[0], 1e-4);
        const fits = oklabToLinearSrgb([L2, lab0[1] * cs, lab0[2] * cs])
          .every((x) => x >= 0 && x <= 1);
        const out = gradeSrgb(srgb, b, s);
        const d = angleDiff(hueOf(out), h0);
        const at = `${name} @ brightness ${b}, saturation ${s} (L ${lightOf(out).toFixed(3)})`;
        if (fits) {
          if (d > exact) { exact = d; exactAt = at; }
        } else if (lightOf(out) >= 0.2) {
          if (d > clipVis) { clipVis = d; clipVisAt = at; }
        } else if (d > clipDark) { clipDark = d; clipDarkAt = at; }
      }
    }
  }
  check("in gamut: hue is exact to float noise", exact < 5e-5,
    `${exact.toExponential(2)} rad, worst at ${exactAt}`);
  check("gamut-clipped above L 0.2: under 0.01 rad (0.6 degrees)", clipVis < 0.01,
    `${clipVis.toExponential(2)} rad, worst at ${clipVisAt}`);
  check("gamut-clipped below L 0.2: under 0.08 rad (4.6 degrees)", clipDark < 0.08,
    `${clipDark.toExponential(2)} rad, worst at ${clipDarkAt}`);
}

// ---- 6. the knobs do what they say -----------------------------------

console.log("\n6. the knobs move the thing they are named after");
{
  // Tolerances are set by the two bits of slack in the pipeline rather
  // than by taste: lightness survives the sRGB round trip to about
  // 1e-8, and the clipper's 12-step bisection resolves a chroma scale
  // to about one part in 4000, so a capped chroma can jitter by a few
  // times 1e-5 as the requested value grows past the gamut boundary.
  let worstL = 0;
  let worstC = 0;
  for (const { srgb } of SAMPLES) {
    if (lightOf(srgb) <= 0 || lightOf(srgb) >= 1) continue;
    const Ls = BRIGHT.map((b) => lightOf(gradeSrgb(srgb, b, 1)));
    for (let i = 1; i < Ls.length; i++) worstL = Math.max(worstL, Ls[i - 1] - Ls[i]);
    if (chromaOf(srgb) < 1e-3) continue;
    const Cs = SATUR.map((s) => chromaOf(gradeSrgb(srgb, 0, s)));
    for (let i = 1; i < Cs.length; i++) worstC = Math.max(worstC, Cs[i - 1] - Cs[i]);
  }
  check("lightness rises with the brightness slider", worstL < 1e-7,
    `worst backward step ${worstL.toExponential(2)}`);
  check("chroma rises with the saturation slider", worstC < 1e-4,
    `worst backward step ${worstC.toExponential(2)}`);

  // Saturation 0 is a true greyscale: chroma gone, lightness intact.
  let zeroC = 0;
  let zeroL = 0;
  for (const { srgb } of SAMPLES) {
    const out = gradeSrgb(srgb, 0, 0);
    zeroC = Math.max(zeroC, chromaOf(out));
    zeroL = Math.max(zeroL, Math.abs(lightOf(out) - lightOf(srgb)));
  }
  check("saturation 0 is neutral grey", zeroC < 1e-3, `max chroma ${zeroC.toExponential(2)}`);
  check("saturation 0 holds lightness", zeroL < 2e-3, `max |dL| ${zeroL.toExponential(2)}`);

  // Brightness leaves the *look* of saturation alone. C/L is what reads
  // as a colour's saturation, and the grade scales C with L precisely so
  // that ratio holds. Where the request will not fit the display gamut
  // the clipper takes chroma back, so the two cases are separated: where
  // it fits, the ratio is held; where it does not, chroma is only ever
  // reduced, never pushed the other way.
  let ratioDrift = 0;
  let gamutLimited = 0;
  let pushedUp = 0;
  for (const { srgb } of SAMPLES) {
    const L0 = lightOf(srgb);
    const C0 = chromaOf(srgb);
    if (L0 <= 1e-3 || C0 < 1e-3) continue;
    for (const b of BRIGHT) {
      const out = gradeSrgb(srgb, b, 1);
      const L2 = Math.pow(clamp01(L0), Math.pow(2, -b));
      const want = (C0 * L2) / Math.max(L0, 1e-4);
      const got = chromaOf(out);
      const fits = inGamut(oklabToLinearSrgb([L2, (srgbToOklab(srgb)[1] * want) / C0, (srgbToOklab(srgb)[2] * want) / C0]));
      if (fits) ratioDrift = Math.max(ratioDrift, Math.abs(got / want - 1));
      else {
        gamutLimited++;
        if (got > want * 1.001) pushedUp++;
      }
    }
  }
  check("in-gamut: C/L held to within 1%", ratioDrift < 0.01,
    `max relative drift ${(ratioDrift * 100).toFixed(3)}%`);
  check("out of gamut: chroma only ever comes down", pushedUp === 0,
    `${gamutLimited} settings gamut-limited, ${pushedUp} pushed up`);
}

// ---- 7. what the rejected alternatives do ----------------------------

console.log("\n7. the alternatives, for contrast");
{
  const ramp = Array.from({ length: 256 }, (_, i) => i / 255);
  const flatRun = (outs) => {
    let run = 1;
    let worst = 1;
    for (let i = 1; i < outs.length; i++) {
      if (q8(outs[i][0]) === q8(outs[i - 1][0])) worst = Math.max(worst, ++run);
      else run = 1;
    }
    return worst;
  };
  const pinned = (outs) => outs.filter((o) => q8(o[0]) === 255).length;

  // An exposure multiply at the same nominal strength. Note that a
  // count of surviving levels does not tell the two apart — both shed
  // about 67 of 256 to rounding — but *where* they go is the whole
  // point: the grade sheds them evenly across the ramp, while the
  // multiply takes the top off in one contiguous block.
  const ours = ramp.map((v) => gradeSrgb([v, v, v], 1, 1));
  const exp1 = ramp.map((v) => exposure([v, v, v], 1));
  console.log(
    `       +1 stop, 256-step grey ramp` +
      `\n         this grade:        ${new Set(ours.map((o) => q8(o[0]))).size}/256 distinct, ` +
      `longest flat run ${flatRun(ours)}, ${pinned(ours)} level pinned at 255` +
      `\n         exposure multiply: ${new Set(exp1.map((o) => q8(o[0]))).size}/256 distinct, ` +
      `longest flat run ${flatRun(exp1)}, ${pinned(exp1)} levels pinned at 255`,
  );
  check("the grade blows out no highlight the multiply would lose",
    pinned(ours) === 1 && pinned(exp1) > 20,
    `${pinned(ours)} vs ${pinned(exp1)} levels at 255`);
  check("and leaves no plateau where the multiply leaves a long one",
    flatRun(ours) <= 3 && flatRun(exp1) > 20,
    `${flatRun(ours)} vs ${flatRun(exp1)} levels`);

  // A per-channel gamma at the same strength: measure the hue it loses.
  let ourHue = 0;
  let pcHue = 0;
  let pcAt = "";
  for (const { name, srgb } of SAMPLES) {
    if (chromaOf(srgb) < 1e-3) continue;
    const h0 = hueOf(srgb);
    for (const b of [-1, 1]) {
      ourHue = Math.max(ourHue, angleDiff(hueOf(gradeSrgb(srgb, b, 1)), h0));
      const d = angleDiff(hueOf(perChannelGamma(srgb, b)), h0);
      if (d > pcHue) { pcHue = d; pcAt = `${name} @ ${b > 0 ? "+" : ""}${b}`; }
    }
  }
  console.log(
    `       +/-1 stop, worst hue drift` +
      `\n         this grade:        ${ourHue.toFixed(5)} rad (${((ourHue * 180) / Math.PI).toFixed(3)} deg)` +
      `\n         per-channel gamma: ${pcHue.toFixed(5)} rad (${((pcHue * 180) / Math.PI).toFixed(1)} deg), worst at ${pcAt}`,
  );
  check("the grade holds hue an order of magnitude better than per-channel gamma",
    ourHue * 10 < pcHue, `${ourHue.toFixed(5)} vs ${pcHue.toFixed(5)}`);
}

if (showNaive) {
  console.log("\nsample colours at +1 stop");
  console.log("       colour              in        grade     exposure  per-chan");
  for (const { name, srgb } of SAMPLES) {
    console.log(
      `       ${name.padEnd(18)} ${hex(srgb)}   ${hex(gradeSrgb(srgb, 1, 1))}   ` +
        `${hex(exposure(srgb, 1))}   ${hex(perChannelGamma(srgb, 1))}`,
    );
  }
}

console.log(
  failures === 0
    ? "\nall grade gates passed\n"
    : `\n${failures} GATE(S) FAILED\n`,
);
process.exit(failures === 0 ? 0 : 1);
