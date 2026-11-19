// Gate for the time-mode terminator: brightness must never climb back
// up as the sun goes down.
//
// This ports the time-dependent part of the composite shader in
// tile-viewer.js (relief mode, kAmbient = kDirect = 0, which is what
// the figure runs) to JS so the terminator can be swept without a GPU.
// aoFactor and the hypso ramp are left out: both are time-independent
// multipliers on v, so neither can change the sign of dv/dt.
//
// The bug this locks down: `timeHS` used to fade the cast shadow
// *away* through the terminator, so past sunset a shadowed pixel lost
// its shadow while the aspect relief faded out from under it as well.
// Terrain that had been darkening all afternoon turned round and got
// lighter once the sun was down. Run with --legacy to see it: a 45
// degree slope facing away from the sun, in shadow, climbs from 0.181
// to 0.530.
//
//   node src/notebooks/line-sweep-terrain-lighting/verify-night-shading.mjs
//   node .../verify-night-shading.mjs --legacy

const showLegacy = process.argv.includes("--legacy");

const S = 0.47; // shadow strength, the figure's default
const RELIEF_STR = 0.38; // relief strength, the figure's default

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

// Brightness of one pixel at a given sun altitude.
//
//   shadow     1 = in cast shadow, 0 = lit
//   slopeDeg   surface slope
//   aspect     +1 faces the sun, -1 faces away
function brightness(sinAlt, { shadow, slopeDeg, aspect }, legacy) {
  const twilight = smoothstep(-0.105, 0.035, sinAlt);

  // Night darkening: past civil twilight there is no direct sun, and
  // no skylight either, which is why this stacks on top of the cast
  // shadow rather than replacing it.
  const nightMask = 1 - S * (1 - twilight);

  // The cast-shadow term through the terminator.
  const timeHS = legacy
    ? shadow * twilight // mix(0, shadow, twilight) — the bug
    : 1 + (shadow - 1) * twilight; // mix(1, shadow, twilight)
  const shadowMask = 1 - S * timeHS;

  // Aspect relief, faded out through the terminator because an absent
  // sun has no aspect to shade.
  const sunHL = Math.sqrt(Math.max(0, 1 - sinAlt * sinAlt));
  const slopeMag = Math.tan((slopeDeg * Math.PI) / 180);
  const nz = 1;
  const zFactor = 0.625 * Math.sqrt(sunHL);
  const slopeAngle = Math.atan((zFactor * slopeMag) / Math.max(nz, 0.001));
  const scaledSlope = Math.min(slopeAngle * RELIEF_STR * 2, 1.5);
  const shadeDir = 0.5 + 0.5 * aspect;
  const reliefDark = Math.sin(scaledSlope) * (1 - shadeDir) * twilight;
  const reliefSrgb = Math.pow(1 - reliefDark * 0.85, 2.5) * shadowMask;

  return Math.min(1, Math.max(0, reliefSrgb * nightMask));
}

// Per-pixel tolerances rather than one loose bound, so the gate stays
// a regression lock. Everything is held flat to half a percent except
// the away-facing slopes in shadow, and those have a reason: during
// the day the aspect term darkens them *below* the night floor, and
// removing aspect shading at night necessarily lets them back up to
// it. That residual is inherent to having no sun to shade against, not
// to how the shadow term is faded, so it is bounded here rather than
// driven to zero. Pushing it to zero would mean either keeping
// directional relief alive at night, which draws ridges lit from below
// the horizon, or dropping the night floor below the darkest daytime
// value, which decouples it from the shadow-strength slider.
const pixels = [
  { name: "flat, lit", shadow: 0, slopeDeg: 0, aspect: 0, tol: 0.005 },
  { name: "flat, shadowed", shadow: 1, slopeDeg: 0, aspect: 0, tol: 0.005 },
  { name: "30° toward sun, lit", shadow: 0, slopeDeg: 30, aspect: 1, tol: 0.005 },
  { name: "30° away, lit", shadow: 0, slopeDeg: 30, aspect: -1, tol: 0.005 },
  { name: "30° away, shadowed", shadow: 1, slopeDeg: 30, aspect: -1, tol: 0.025 },
  { name: "45° away, shadowed", shadow: 1, slopeDeg: 45, aspect: -1, tol: 0.11 },
];

// Sweep altitude downward, the way the recording will. Built by index
// so the lookups below land exactly rather than drifting on repeated
// subtraction.
const STEP = 0.1;
const ALT_HI = 25;
const ALT_LO = -25;
const NSTEPS = Math.round((ALT_HI - ALT_LO) / STEP) + 1;
const alts = Array.from({ length: NSTEPS }, (_, i) => ALT_HI - i * STEP);
const indexOfAlt = (a) => Math.round((ALT_HI - a) / STEP);

// Largest climb back up from a trough along the descent. Measured
// against the running minimum, not the running maximum: the failure we
// care about is terrain that darkens toward sunset and then recovers,
// however gradually it does it.
function maxRise(px, legacy) {
  const vs = alts.map((a) => brightness(Math.sin((a * Math.PI) / 180), px, legacy));
  let rise = 0;
  let at = null;
  let trough = vs[0];
  for (let i = 1; i < vs.length; i++) {
    if (vs[i] - trough > rise) {
      rise = vs[i] - trough;
      at = alts[i];
    }
    trough = Math.min(trough, vs[i]);
  }
  return { vs, rise, at };
}

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures++;
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${name}${detail ? "  " + detail : ""}`);
};

const legacy = showLegacy;
console.log(
  `\nformula: ${legacy ? "LEGACY (shadow fades away at night)" : "current (shadow fades to full at night)"}`,
);
console.log(
  "\n     pixel                    +25°    +5°     0°     -3°     -6°    -25°   max rise",
);

for (const px of pixels) {
  const { vs, rise, at } = maxRise(px, legacy);
  const read = (a) => vs[indexOfAlt(a)].toFixed(3).padStart(6);
  const ok = rise <= px.tol;
  if (!ok) failures++;
  console.log(
    `${ok ? "ok  " : "FAIL"} ${px.name.padEnd(20)} ` +
      [25, 5, 0, -3, -6, -25].map(read).join("  ") +
      `  +${rise.toFixed(3)}` +
      (at !== null && rise > 1e-6 ? ` @ ${at.toFixed(1)}°` : "") +
      ` (tol ${px.tol})`,
  );
}

console.log("\nnight floor");
const nightFloor = brightness(Math.sin((ALT_LO * Math.PI) / 180), pixels[1], legacy);
const dayShadowFlat = brightness(Math.sin((ALT_HI * Math.PI) / 180), pixels[1], legacy);
check(
  "night is darker than a daytime cast shadow",
  nightFloor < dayShadowFlat - 1e-9,
  `${nightFloor.toFixed(3)} vs ${dayShadowFlat.toFixed(3)}`,
);

// Hold the improvement itself, so a future edit cannot quietly walk
// back toward the legacy behaviour while still passing the per-pixel
// bounds above.
if (!legacy) {
  console.log("\nimprovement over the legacy formula");
  const worst = pixels[pixels.length - 1];
  const now = maxRise(worst, false).rise;
  const before = maxRise(worst, true).rise;
  check(
    "worst-case rise at most a third of legacy",
    now <= before / 3,
    `${now.toFixed(3)} vs ${before.toFixed(3)} (${(now / before).toFixed(2)}×)`,
  );
}

console.log(
  failures === 0
    ? "\nall night-shading gates passed\n"
    : `\n${failures} GATE(S) FAILED\n`,
);
process.exit(failures === 0 ? 0 : 1);
