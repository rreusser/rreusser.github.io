// Gate: the sun's altitude reaches the lighting unclipped.
//
// The notebook's per-frame lighting tick turned the sun's (az, alt)
// into the light vector the viewer shades and bakes with, and it
// clamped the altitude at the horizon on the way:
//
//   const altRad = (Math.max(0, sd.alt) * Math.PI) / 180;
//
// Every negative altitude became exactly zero, so in fixed mode a sun
// 4 degrees below the horizon rendered pixel-identical to one sitting
// on it (measured in the live notebook: mean absolute difference
// 0.000, against 46 for +4 degrees). The terrain freezes at the
// horizon while the sun keeps going. The justification in the comment,
// that a negative altitude would break the sweep kernel, does not hold:
// the bake derives each tile's altitude itself and handles a low sun
// there, so the light vector has no business clamping it.
//
// Checked here:
//   1. `sunVector` is unit length and its z is sin(alt), negative
//      included, strictly increasing through the horizon. No plateau.
//   2. The lighting tick in index.html builds the light vector with
//      `sunVector(sd.az, sd.alt)`, and nothing in it floors `sd.alt`.
//
//   node src/notebooks/line-sweep-terrain-lighting/verify-sun-unclipped.mjs
//   node .../verify-sun-unclipped.mjs --legacy   (the old clamp: plateau)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const legacy = process.argv.includes("--legacy");
let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
  if (!ok) failures++;
};

let sunVector;
if (legacy) {
  // The light vector exactly as the tick used to build it.
  sunVector = (azDeg, altDeg) => {
    const azRad = (azDeg * Math.PI) / 180;
    const altRad = (Math.max(0, altDeg) * Math.PI) / 180;
    return [
      Math.cos(altRad) * Math.cos(azRad),
      Math.cos(altRad) * Math.sin(azRad),
      Math.sin(altRad),
    ];
  };
} else {
  try {
    ({ sunVector } = await import("./solar-time.js"));
  } catch (_) {}
}

// ---- 1. the function -------------------------------------------------

if (typeof sunVector !== "function") {
  check("solar-time.js exports sunVector", false, "missing");
} else {
  let worstLen = 0;
  let monotone = true;
  let worstStep = Infinity;
  let prevZ = -Infinity;
  for (let alt = -30; alt <= 30 + 1e-9; alt += 0.25) {
    for (const az of [0, 47, 123.5, 288.5]) {
      const [x, y, z] = sunVector(az, alt);
      worstLen = Math.max(worstLen, Math.abs(Math.hypot(x, y, z) - 1));
    }
    const z = sunVector(288.5, alt)[2];
    if (!(z > prevZ)) monotone = false;
    if (Number.isFinite(prevZ)) worstStep = Math.min(worstStep, z - prevZ);
    prevZ = z;
  }
  check("unit length for every (az, alt)", worstLen < 1e-12, `worst |len-1| = ${worstLen.toExponential(1)}`);
  check("z strictly increases with altitude through the horizon", monotone,
    `smallest step over 0.25 deg = ${worstStep.toExponential(2)}`);
  const zm4 = sunVector(300, -4)[2];
  const z0 = sunVector(300, 0)[2];
  check("a sun 4 deg down is not the sun on the horizon", zm4 !== z0,
    `z(-4) = ${zm4.toFixed(5)}, z(0) = ${z0.toFixed(5)}`);
  for (const alt of [-0.5, -6, -18, -60]) {
    const z = sunVector(300, alt)[2];
    const want = Math.sin((alt * Math.PI) / 180);
    check(`z = sin(alt) at ${alt} deg`, Math.abs(z - want) < 1e-12, `z = ${z.toFixed(5)}`);
  }
}

// ---- 2. the tick in the notebook -------------------------------------

if (!legacy) {
  const here = dirname(fileURLToPath(import.meta.url));
  const html = readFileSync(join(here, "index.html"), "utf8");
  const start = html.indexOf("const tickLighting = () => {");
  const end = html.indexOf("requestAnimationFrame(tickLighting);", start);
  const tick = start >= 0 && end > start ? html.slice(start, end) : "";
  check("found the lighting tick in index.html", tick.length > 0);
  check("the tick builds the light vector with sunVector(sd.az, sd.alt)",
    /\[\s*sunX\s*,\s*sunY\s*,\s*sunZ\s*\]\s*=\s*sunVector\(\s*sd\.az\s*,\s*sd\.alt\s*\)/.test(tick));
  const floors = tick.match(/Math\.max\(\s*0\s*,\s*sd\.alt\s*\)|Math\.max\(\s*sd\.alt\s*,\s*0\s*\)|Math\.max\([^)]*\balt\b[^)]*\)/g) || [];
  check("nothing in the tick floors the altitude", floors.length === 0,
    floors.length ? `found ${floors.join(" ; ")}` : "");
}

console.log(failures === 0 ? "\nall sun-unclipped gates passed" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
