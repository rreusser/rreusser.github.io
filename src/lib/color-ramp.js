// Colour-ramp utilities for elevation tinting.
//
// Two pieces:
//
//   1. sRGB <-> Oklab conversion. Oklab is Björn Ottosson's perceptual
//      colour space (https://bottosson.github.io/posts/oklab/). The
//      matrices below are transcribed from the reference implementation
//      in that post. Interpolating a hypsometric ramp in Oklab keeps the
//      midpoints of a transition looking like a blend of its endpoints,
//      which linear sRGB and HSL both fail at in different ways: linear
//      sRGB pulls blends toward whichever endpoint is brighter, and HSL
//      swings hue through colours that were never in the ramp.
//
//   2. Monotone cubic (PCHIP) interpolation, after Fritsch & Carlson,
//      "Monotone piecewise cubic interpolation", SIAM J. Numer. Anal. 17
//      (1980), 238-246. Run independently on L, a and b. A plain cubic
//      spline through a ramp's control points overshoots, which in a
//      colour ramp shows up as a band of colour that is not in the ramp
//      sitting just outside a sharp transition. Monotone cubic cannot
//      overshoot: each channel stays inside the interval spanned by its
//      neighbouring stops, and the result is still C1.
//
// The LUT this module builds is consumed by a WGSL shader, so it is
// emitted in Oklab rather than sRGB. The shader only ever needs to go
// Oklab -> sRGB, and linear interpolation between adjacent LUT entries
// happens in the same space the ramp was authored in.

// ---------------------------------------------------------------------
// sRGB transfer function
// ---------------------------------------------------------------------

export function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function linearToSrgb(c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

// ---------------------------------------------------------------------
// Oklab
// ---------------------------------------------------------------------

/** Linear sRGB (0..1 each) to Oklab. Returns [L, a, b]. */
export function linearSrgbToOklab(r, g, b) {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

/** Oklab to linear sRGB (0..1 each, unclamped). Returns [r, g, b]. */
export function oklabToLinearSrgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

// ---------------------------------------------------------------------
// Hex <-> Oklab
// ---------------------------------------------------------------------

/** "#rrggbb" (or "#rgb") to Oklab [L, a, b]. */
export function hexToOklab(hex) {
  const [r, g, b] = hexToSrgb(hex);
  return linearSrgbToOklab(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b));
}

/** "#rrggbb" (or "#rgb") to gamma-encoded sRGB components in 0..1. */
export function hexToSrgb(hex) {
  let h = String(hex).trim().replace(/^#/, "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  if (!Number.isFinite(n) || h.length !== 6) return [0, 0, 0];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * Oklab to "#rrggbb". Colours outside the sRGB gamut are brought back in
 * by the same chroma reduction the shader uses, so the swatch in the
 * editor agrees with what the map draws.
 */
export function oklabToHex(L, a, b) {
  const [r, g, bb] = oklabToSrgbClipped(L, a, b);
  const q = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0");
  return `#${q(r)}${q(g)}${q(bb)}`;
}

const inGamut = ([r, g, b]) =>
  r >= -1e-4 && r <= 1 + 1e-4 && g >= -1e-4 && g <= 1 + 1e-4 && b >= -1e-4 && b <= 1 + 1e-4;

/**
 * Oklab to gamma-encoded sRGB, holding lightness and hue fixed and
 * backing off chroma until the colour fits in the gamut. Bisection on
 * the chroma scale: a scale of 0 is a neutral grey, which is always in
 * gamut, so the search always has a feasible lower bound.
 */
export function oklabToSrgbClipped(L, a, b) {
  const Lc = Math.max(0, Math.min(1, L));
  let rgb = oklabToLinearSrgb(Lc, a, b);
  if (!inGamut(rgb)) {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 20; i++) {
      const m = 0.5 * (lo + hi);
      if (inGamut(oklabToLinearSrgb(Lc, a * m, b * m))) lo = m;
      else hi = m;
    }
    rgb = oklabToLinearSrgb(Lc, a * lo, b * lo);
  }
  return rgb.map((v) => Math.max(0, Math.min(1, linearToSrgb(Math.max(0, Math.min(1, v))))));
}

// ---------------------------------------------------------------------
// Monotone cubic interpolation (Fritsch-Carlson)
// ---------------------------------------------------------------------

/**
 * Slopes for a monotone cubic Hermite interpolant through (x, y).
 * `x` must be strictly increasing. Interior slopes use the weighted
 * harmonic mean of the neighbouring secants, zeroed at local extrema;
 * endpoints take the adjacent secant.
 */
export function pchipSlopes(x, y) {
  const n = x.length;
  const m = new Float64Array(n);
  if (n < 2) return m;
  const h = new Float64Array(n - 1);
  const d = new Float64Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    h[i] = x[i + 1] - x[i];
    d[i] = (y[i + 1] - y[i]) / h[i];
  }
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) {
      m[i] = 0;
    } else {
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }
  return m;
}

/** Evaluate the cubic Hermite interpolant defined by (x, y, m) at `t`. */
export function pchipEval(x, y, m, t) {
  const n = x.length;
  if (n === 0) return 0;
  if (n === 1 || t <= x[0]) return y[0];
  if (t >= x[n - 1]) return y[n - 1];
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (x[mid] <= t) lo = mid;
    else hi = mid;
  }
  const h = x[hi] - x[lo];
  const s = (t - x[lo]) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1;
  const h10 = s3 - 2 * s2 + s;
  const h01 = -2 * s3 + 3 * s2;
  const h11 = s3 - s2;
  return h00 * y[lo] + h10 * h * m[lo] + h01 * y[hi] + h11 * h * m[hi];
}

// ---------------------------------------------------------------------
// LUT construction
// ---------------------------------------------------------------------

/**
 * Sort stops by value and drop duplicates, so the interpolator always
 * sees a strictly increasing abscissa. Later stops win on a tie.
 */
export function normalizeStops(stops) {
  const sorted = [...stops].sort((p, q) => p.value - q.value);
  const out = [];
  for (const s of sorted) {
    if (out.length > 0 && Math.abs(out[out.length - 1].value - s.value) < 1e-9) out.pop();
    out.push(s);
  }
  return out;
}

/**
 * Build a lookup table of Oklab colours sampled uniformly across
 * `domain`, ready to upload as an array<vec4<f32>> storage buffer.
 *
 * Returns a Float32Array of `size * 4` laid out as (L, a, b, 1) per
 * entry. Entry i corresponds to domain[0] + i/(size-1) * span, so the
 * shader maps an elevation with t = (h - domain[0]) / span and reads
 * with a linear blend between neighbouring entries. Values outside the
 * domain clamp to the end entries.
 *
 * `stops` is [{ value, color }] where `color` is a hex string.
 */
export function buildOklabLUT(stops, { size = 512, domain } = {}) {
  const out = new Float32Array(size * 4);
  const pts = normalizeStops(stops);
  if (pts.length === 0) {
    for (let i = 0; i < size; i++) out[i * 4 + 3] = 1;
    return out;
  }

  const labs = pts.map((s) => hexToOklab(s.color));
  const xs = pts.map((s) => s.value);
  const [d0, d1] = domain ?? [xs[0], xs[xs.length - 1]];
  const span = d1 - d0 || 1;

  if (pts.length === 1) {
    for (let i = 0; i < size; i++) {
      out[i * 4] = labs[0][0];
      out[i * 4 + 1] = labs[0][1];
      out[i * 4 + 2] = labs[0][2];
      out[i * 4 + 3] = 1;
    }
    return out;
  }

  const channels = [0, 1, 2].map((c) => {
    const y = labs.map((lab) => lab[c]);
    return { y, m: pchipSlopes(xs, y) };
  });

  for (let i = 0; i < size; i++) {
    const v = d0 + (i / (size - 1)) * span;
    for (let c = 0; c < 3; c++) {
      out[i * 4 + c] = pchipEval(xs, channels[c].y, channels[c].m, v);
    }
    out[i * 4 + 3] = 1;
  }
  return out;
}

/**
 * Render a LUT built by `buildOklabLUT` into RGBA8 pixels for a canvas
 * preview. `vertical` draws entry 0 at the bottom, which is how an
 * elevation ramp reads.
 */
export function lutToImageData(lut, width, height, { vertical = true } = {}) {
  const size = lut.length / 4;
  const data = new Uint8ClampedArray(width * height * 4);
  const cache = new Array(size);
  const colorAt = (i) => {
    let c = cache[i];
    if (c === undefined) {
      const [r, g, b] = oklabToSrgbClipped(lut[i * 4], lut[i * 4 + 1], lut[i * 4 + 2]);
      c = [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
      cache[i] = c;
    }
    return c;
  };
  for (let y = 0; y < height; y++) {
    const t = vertical ? 1 - (y + 0.5) / height : 0;
    for (let x = 0; x < width; x++) {
      const u = vertical ? t : (x + 0.5) / width;
      const [r, g, b] = colorAt(Math.max(0, Math.min(size - 1, Math.round(u * (size - 1)))));
      const o = (y * width + x) * 4;
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
      data[o + 3] = 255;
    }
  }
  return new ImageData(data, width, height);
}

/** Sample a LUT at an arbitrary domain value, returning Oklab [L, a, b]. */
export function sampleLUT(lut, domain, value) {
  const size = lut.length / 4;
  const [d0, d1] = domain;
  const span = d1 - d0 || 1;
  const t = Math.max(0, Math.min(1, (value - d0) / span)) * (size - 1);
  const i0 = Math.floor(t);
  const i1 = Math.min(size - 1, i0 + 1);
  const f = t - i0;
  return [0, 1, 2].map((c) => lut[i0 * 4 + c] * (1 - f) + lut[i1 * 4 + c] * f);
}
