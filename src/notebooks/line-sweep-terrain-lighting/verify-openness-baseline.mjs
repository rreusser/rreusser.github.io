// Gate for the openness tint's baseline.
//
// The tint shifts where the hypsometric ramp is sampled, in proportion
// to how enclosed a pixel is. For that to mean anything, ground with no
// shape to it has to come through untouched: a flat surface must be an
// exact no-op at any strength, so that it is coloured by its elevation
// and nothing else.
//
// The baseline is therefore not something to measure off whatever view
// the map happens to open on. It is a property of the AO function, so
// this feeds constant elevation fields straight into the real sweep and
// reads the output back.
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

// The shift is -enclosure, so the baseline is an exact zero.
console.log("\nThe offset at the baseline:\n");
for (const falloff of ["exp", "cos2"]) {
  const offset = -enclosure(1, falloff);
  check(`${falloff.padEnd(4)} flat offset is exactly 0`, offset === 0, `offset = ${offset}`);
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
