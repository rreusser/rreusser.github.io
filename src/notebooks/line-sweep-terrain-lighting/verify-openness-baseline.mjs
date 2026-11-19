// Gate for the openness tint.
//
// The tint shifts where the hypsometric ramp is sampled according to
// how enclosed a pixel is. Two things have to hold for that to mean
// anything:
//
//   1. Ground with no shape to it comes through untouched, at any
//      strength, so it is coloured by elevation and nothing else.
//   2. A uniform hillside is also untouched. Slope on its own is not
//      concavity, and a constant baseline would drag every hillside
//      down the ramp for having no shape at all.
//
// Neither baseline is something to measure off a view. Both come out of
// the AO function itself, so this feeds constant and constant-gradient
// fields through the real sweep and reads the output back.
//
// It also records the limit of the signal: the sweep carries an
// infinite horizon, starting level and counting only blockers strictly
// above the ray, so nothing reads as more open than level and convexity
// is not recoverable. The tint is concavity-only by consequence.
//
//   node src/notebooks/line-sweep-terrain-lighting/verify-openness-baseline.mjs

import { sweepCore } from "../../lib/line-sweep-core.js";

const DIRS = 8;          // AO_DIRECTIONS in tile-viewer.js
const AO_GAMMA = 2;      // packF32[1] in tile-viewer.js

// The shader's normalisation, transcribed from opennessOffset().
const floorRawFor = (falloff) => (falloff === "exp" ? Math.exp(-1) : 0);
const enclosure = (storedAo, falloff) => {
  const raw = Math.sqrt(Math.max(storedAo, 0));
  return Math.min(1, Math.max(0, (1 - raw) / (1 - floorRawFor(falloff))));
};

function bakeOpenness(elev, N, pxSizeM, falloff) {
  const acc = new Float32Array(N * N);
  for (let d = 0; d < DIRS; d++) {
    const r = sweepCore({
      W: N, H: N, elev, azDeg: (d * 360) / DIRS, pxSizeM,
      mode: "lsao", weight: 1 / DIRS, lsaoFalloff: falloff,
    });
    for (let i = 0; i < N * N; i++) acc[i] += r[i];
  }
  // Matches the pack pass: clamp, then raise to aoGamma.
  for (let i = 0; i < N * N; i++) {
    acc[i] = Math.pow(Math.min(1, Math.max(0, acc[i])), AO_GAMMA);
  }
  return acc;
}

let failures = 0;
const check = (name, cond, detail = "") => {
  if (!cond) failures++;
  console.log(`${cond ? "ok  " : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
};

console.log("Flat-surface baseline, straight out of the AO function:\n");

// A constant field has no blocker above any ray in any direction, so
// every falloff evaluates at a horizon of zero. Both are defined to
// return 1 there, and aoGamma leaves 1 alone.
for (const falloff of ["exp", "cos2"]) {
  for (const N of [48, 96]) {
    for (const pxSizeM of [5, 30, 120]) {
      for (const height of [-430, 0, 1500, 8800]) {
        const elev = new Float32Array(N * N).fill(height);
        const ao = bakeOpenness(elev, N, pxSizeM, falloff);
        let lo = Infinity, hi = -Infinity;
        for (const v of ao) { if (v < lo) lo = v; if (v > hi) hi = v; }
        check(
          `${falloff.padEnd(4)} N=${String(N).padEnd(3)} px=${String(pxSizeM).padEnd(4)} h=${String(height).padEnd(5)} -> openness 1`,
          lo === 1 && hi === 1,
          `min=${lo} max=${hi}`,
        );
      }
    }
  }
}

console.log("\nThe normalisation the shader applies to that baseline:\n");
for (const falloff of ["exp", "cos2"]) {
  check(`${falloff.padEnd(4)} flat openness 1 -> enclosure 0`, enclosure(1, falloff) === 0,
        `enc=${enclosure(1, falloff)}`);
  const sealed = Math.pow(floorRawFor(falloff), AO_GAMMA);
  check(`${falloff.padEnd(4)} sealed openness ${sealed.toFixed(4)} -> enclosure 1`,
        Math.abs(enclosure(sealed, falloff) - 1) < 1e-12, `enc=${enclosure(sealed, falloff)}`);
}

// The plane baseline: enclosure of an infinite plane of a given slope,
// which is what a pixel with no curvature should be compared against.
const A = 0.404038, B = 0.499984, C = -1.285729, D = 0.859000;
const planeEnc = (sinTheta, falloff) => {
  const s = Math.min(1, Math.max(0, sinTheta));
  if (falloff === "cos2") return 0.5 * (1 - Math.sqrt(Math.max(0, 1 - s * s)));
  return Math.min(1, Math.max(0, s * (A + s * (B + s * (C + s * D)))));
};
const SCALE = 0.45;
// Packed normals cannot encode exactly zero slope, so the shader
// subtracts the resulting bias before using it.
const SLOPE_EPS = 0.008;
// The contrast exponent is odd in t, so it fixes zero and cannot move
// either guarantee; the gates below run across its whole range.
const offsetOf = (storedAo, sinTheta, falloff, contrast = 1) => {
  const s = Math.max(0, sinTheta - SLOPE_EPS);
  const t = Math.max(-1, Math.min(1, (planeEnc(s, falloff) - enclosure(storedAo, falloff)) / SCALE));
  return Math.sign(t) * Math.pow(Math.abs(t), Math.max(contrast, 0.05));
};

console.log("\nThe offset at the flat baseline, across the contrast control:\n");
for (const falloff of ["exp", "cos2"]) {
  let worst = 0;
  for (let c = 0; c <= 1.0001; c += 0.1) {
    worst = Math.max(worst, Math.abs(offsetOf(1, 0, falloff, Math.pow(2, -c))));
  }
  check(`${falloff.padEnd(4)} flat ground gives exactly 0 at every contrast`, worst === 0,
        `max |offset| = ${worst}`);
}

// A uniform hillside has no curvature, so it should barely move. The
// sweep's 8 directions and the fit both introduce a little error; bound
// it so a regression would show.
console.log("\nUniform hillsides, which have no curvature to show:\n");
for (const falloff of ["exp", "cos2"]) {
  for (const slope of [0.1, 0.3, 0.6, 1.0]) {
    const N = 128, px = 30;
    const elev = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) elev[y * N + x] = slope * px * x;
    const ao = bakeOpenness(elev, N, px, falloff);
    const sinTheta = slope / Math.sqrt(1 + slope * slope);
    let worst = 0;
    for (let y = 24; y < N - 24; y++) for (let x = 24; x < N - 24; x++) {
      for (const c of [0, 0.5, 1]) {
        worst = Math.max(worst, Math.abs(offsetOf(ao[y * N + x], sinTheta, falloff, Math.pow(2, -c))));
      }
    }
    check(`${falloff.padEnd(4)} slope ${slope.toFixed(1)} stays near neutral`, worst < 0.35,
          `max |offset| = ${worst.toFixed(4)}`);
  }
}

// Convexity is invisible: a hill crest and a ridge saturate at the same
// value as flat ground. Recorded here so the one-directional behaviour
// of the tint is not mistaken for a bug later.
console.log("\nWhat the signal can and cannot see:\n");
{
  const N = 96, px = 30, c = N >> 1;
  const field = (f) => { const e = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) e[y * N + x] = f(x - c, y - c);
    return e; };
  const gauss = (r2, s, amp) => amp * Math.exp(-r2 / (2 * s * s));
  const centre = (a) => a[c * N + c];
  const hill = centre(bakeOpenness(field((x, y) => gauss(x*x + y*y, 14, 400)), N, px, "exp"));
  const ridge = centre(bakeOpenness(field((x) => gauss(x*x, 10, 400)), N, px, "exp"));
  const pit = centre(bakeOpenness(field((x, y) => -gauss(x*x + y*y, 14, 400)), N, px, "exp"));
  const slot = centre(bakeOpenness(field((x) => (Math.abs(x) < 2 ? -600 : 0)), N, px, "exp"));
  check("a convex hill crest reads the same as flat", hill === 1, `hill=${hill}`);
  check("a convex ridge crest reads the same as flat", ridge === 1, `ridge=${ridge}`);
  check("a pit is strictly more enclosed than flat", pit < 1, `pit=${pit.toFixed(4)}`);
  check("a slot canyon is more enclosed still", slot < pit, `slot=${slot.toFixed(4)}`);
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
