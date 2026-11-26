// Gates for the lighting and compositing model specified in
// LIGHTING-DESIGN.md.
//
// Each gate is run against BOTH models in src/lib/terrain-lighting.js:
// CURRENT, which transcribes the overlay branch of fs_main in
// tile-viewer.js as it stands, and PROPOSED, which implements the
// design. Every gate therefore carries an expected status for each, and
// the run fails if either model departs from what is expected of it.
//
// That is the point. A gate that merely fails on today's code does not
// show it can tell the two apart, and a gate that only passes on the new
// model does not show there was anything to fix. Five of the sixteen are
// properties the current shader already has and the port must not lose;
// the other eleven are the faults, and they are expected to fail now.
// Gate 16 was added after the port shipped, for a fault the port itself
// introduced, which is why the current model fails it too -- from the
// opposite end.
//
// Gate 13 in the design (GPU equals CPU to 1/255) is not here: it needs
// a device, and it runs against the live figure the way the bake's
// parity check does.
//
//   node src/notebooks/line-sweep-terrain-lighting/verify-lighting-model.mjs
//   node .../verify-lighting-model.mjs --table
//
import {
  DEFAULTS, CURRENT_DEFAULTS, KNEE_MAX, WARM_AB,
  composite, currentComposite,
  relIrradiance, irradianceRef, shadeLighting,
  smax, opennessOf, irradiance, shoulder,
  sunDirOf, normalOf,
} from "./lib/terrain-lighting.js";
import { sweepCore, shadowTanMin } from "./lib/line-sweep-core.js";

const showTable = process.argv.includes("--table");

// ---- harness ---------------------------------------------------------
// Each gate declares what it expects of each model, so a gate that
// starts passing on CURRENT is as much a failure as one that stops
// passing on PROPOSED.

let failures = 0;
const results = [];

function gate(n, name, expect, run) {
  const out = { n, name, expect, got: {}, detail: {} };
  for (const model of ["current", "proposed"]) {
    let ok, detail;
    try {
      ({ ok, detail } = run(model));
    } catch (e) {
      ok = false;
      detail = `threw: ${e.message}`;
    }
    out.got[model] = ok;
    out.detail[model] = detail;
  }
  const agree = out.got.current === expect.current && out.got.proposed === expect.proposed;
  if (!agree) failures++;
  out.agree = agree;
  results.push(out);

  const mark = agree ? "ok  " : "FAIL";
  const say = (m) => `${m} ${out.got[m] ? "holds" : "fails"}${out.got[m] === expect[m] ? "" : " (UNEXPECTED)"}`;
  console.log(`${mark}  ${String(n).padStart(2)}. ${name}`);
  console.log(`         ${say("current")}  |  ${say("proposed")}`);
  for (const m of ["current", "proposed"]) {
    if (out.detail[m]) console.log(`           ${m.padEnd(8)} ${out.detail[m]}`);
  }
}

// ---- model adapters --------------------------------------------------
// One call signature over both models. `relief` and `shadowStrength`
// are the two sliders whose meaning is shared; everything else is each
// model's own.

const P = (over = {}) => ({ ...DEFAULTS, ...over });
const C = (over = {}) => ({ ...CURRENT_DEFAULTS, ...over });

// relief: 0..1 on the slider. CURRENT reads it as r/(1-r) additive gain;
// PROPOSED reads it as normal exaggeration 1..6.
const reliefToExag = (r) => 1 + 5 * r;

function shade(model, { N, sunDir, shadow = 0, openness = 1, falloff = "exp",
                        albedoL = 0.5, relief = 0.38, shadowStrength = 1,
                        aoStrength = 1, over = {} }) {
  if (model === "current") {
    // CURRENT consumes the bake's STORED ao, with no falloff
    // renormalisation -- which is gate 4.
    const storedAo = storedFor(openness, falloff);
    return currentComposite({
      N, sunDir, shadow, storedAo, albedoL,
      p: C({ reliefStrength: relief, shadowStrength,
             aoContrast: aoStrength, ...over }),
    });
  }
  return composite({
    N, sunDir, shadow, openness, falloff, albedoL,
    p: P({ reliefExag: reliefToExag(relief), shadowStrength, aoStrength, ...over }),
  });
}

// Variant taking the bake's STORED ao, for the gates that measure it
// through the real sweep rather than positing a physical openness.
function shadeStored(model, { storedAo, falloff, ...rest }) {
  if (model === "current") {
    return currentComposite({
      ...rest, storedAo,
      p: C({ shadowStrength: rest.shadowStrength ?? 1,
             reliefStrength: rest.relief ?? 0.38,
             aoContrast: rest.aoStrength ?? 1 }),
    });
  }
  return composite({
    ...rest, openness: opennessOf(storedAo, falloff), falloff,
    p: P({ reliefExag: reliefToExag(rest.relief ?? 0.38),
           shadowStrength: rest.shadowStrength ?? 1,
           aoStrength: rest.aoStrength ?? 1 }),
  });
}

// Physical openness -> what the bake stores, per falloff. The inverse of
// opennessOf, so the two models are handed the same physical situation.
function storedFor(openness, falloff) {
  const floorRaw = falloff === "exp" ? Math.exp(-1) : 0;
  const raw = floorRaw + openness * (1 - floorRaw);
  return raw * raw;                                  // aoGamma = 2
}

// Neutral Oklab lightness to an 8-bit sRGB grey. For a grey the Oklab
// matrices collapse to Y = L^3, so this is just the transfer function.
// Gate 16 is about what the eye gets, and 0.016 vs 0.13 in L is the
// difference between nothing and a visible hillside, which reads much
// more plainly in 8-bit.
function srgb8(L) {
  const Y = Math.max(0, L) ** 3;
  const v = Y <= 0.0031308 ? 12.92 * Y : 1.055 * Y ** (1 / 2.4) - 0.055;
  return Math.round(255 * Math.min(1, Math.max(0, v)));
}

// Sun altitudes below the horizon: just inside the twilight band, and
// well past it where the night level is whatever the model's floor is.
const NIGHT_ALTS = [-3, -5, -10, -18];

const ALTS = [0.2, 0.5, 1, 2, 5, 10, 20, 40, 60, 80];
const SLOPES = [0, 10, 20, 30, 40, 50, 60, 70, 80];
const AZS = [0, 45, 90, 135, 180];
const RELIEFS = [0, 0.2, 0.38, 0.6, 0.8, 1.0];

// ---- real sweeps, shared by gates 5 and 6 ----------------------------
// A uniform hillside, swept exactly as the bake sweeps it. This is NOT
// open ground: the sweep starts level and counts blockers strictly above
// the ray, so the uphill azimuths block, and a 26.6 degree slope reads
// openness 0.817 under the exp falloff against 0.947 under cos squared.
// Both gates below need that measured rather than assumed, because the
// assumption that a uniform slope reads as open is what was wrong.

function sweepHillside(gradient, falloff, N = 64, PX = 30, DIRS = 8) {
  const elev = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) elev[j * N + i] = i * PX * gradient;
  const acc = new Float32Array(N * N);
  for (let d = 0; d < DIRS; d++) {
    const r = sweepCore({ W: N, H: N, elev, azDeg: (d * 360) / DIRS, pxSizeM: PX,
                          mode: "lsao", weight: 1 / DIRS, lsaoFalloff: falloff });
    for (let k = 0; k < N * N; k++) acc[k] += r[k];
  }
  let sum = 0, n = 0;
  for (let j = 12; j < N - 12; j++) for (let i = 12; i < N - 12; i++) {
    sum += Math.pow(Math.min(1, Math.max(0, acc[j * N + i])), 2);
    n++;
  }
  return sum / n;                                     // stored AO, aoGamma 2
}

const HILL_GRADS = [0, 0.1, 0.25, 0.5, 1.0];
const HILLS = HILL_GRADS.map((g) => ({
  g,
  slopeDeg: (Math.atan(g) * 180) / Math.PI,
  nz: 1 / Math.hypot(g, 1),
  stored: { exp: sweepHillside(g, "exp"), cos2: sweepHillside(g, "cos2") },
}));

console.log(`\nLighting model gates.\n`);

// =====================================================================
// 1. Shadows have a ceiling
// =====================================================================
// Not an ordering constraint. A shadowed slope is allowed to out-read
// the flats -- that is aesthetic detail, and at a grazing sun it is also
// true, because the flats are dim then. What is forbidden is reaching
// full illumination.
gate(1, "a fully shadowed pixel never approaches full illumination",
  { current: false, proposed: true },
  (model) => {
    let worst = 0, at = "";
    for (const alt of ALTS) for (const slope of SLOPES) for (const az of AZS)
    for (const relief of RELIEFS) for (const leak of [0, 0.25, 0.6, 1.0]) {
      const L = shade(model, {
        N: normalOf(slope, az), sunDir: sunDirOf(alt), shadow: 1,
        openness: 1, albedoL: 1.0, relief, shadowStrength: 1,
        over: model === "proposed" ? { leak } : {},
      }).L;
      if (L > worst) { worst = L; at = `alt ${alt} slope ${slope} az ${az} relief ${relief}${model === "proposed" ? ` leak ${leak}` : ""}`; }
      if (model === "current") break;                // leak is not its parameter
    }
    return { ok: worst <= 0.85, detail: `worst L on a white albedo ${worst.toFixed(4)} (${at})` };
  });

// =====================================================================
// 2a. Flat-ground identity, at eta = 1
// =====================================================================
gate(2, "flat open sunlit ground is exactly the albedo (eta = 1)",
  { current: true, proposed: true },
  (model) => {
    // Exact below the shoulder's knee. Above it the knee is capped at
    // KNEE_MAX so the shoulder cannot saturate in float, and an albedo
    // brighter than that is compressed a little even on neutral ground:
    // the brightest entry of this figure's ramp (L = 0.93) by one 8-bit
    // step, a theoretical pure white by nine. That is the stated price
    // of gate 12, so it is measured here rather than tolerated.
    let worstExact = 0, atE = "", worstBright = 0, atB = "";
    for (const alt of ALTS) for (const albedoL of [0.1, 0.35, 0.5, 0.8, 0.93, 1.0]) {
      const L = shade(model, {
        N: [0, 0, 1], sunDir: sunDirOf(alt), shadow: 0, openness: 1, albedoL,
        over: model === "proposed" ? { eta: 1 } : {},
      }).L;
      const want = albedoL * (model === "proposed"
        ? shadeLighting({ N: [0, 0, 1], sunDir: sunDirOf(alt), p: P({ eta: 1 }) })
        : 1);
      const d = Math.abs(L - want);
      if (albedoL <= DEFAULTS.kneeMin) {
        if (d > worstExact) { worstExact = d; atE = `alt ${alt} albedo ${albedoL}`; }
      } else if (albedoL <= 0.93) {
        if (d > worstBright) { worstBright = d; atB = `alt ${alt} albedo ${albedoL}`; }
      }
    }
    return {
      ok: worstExact < 1e-12 && worstBright <= 1.5 / 255,
      detail: `albedo <= ${DEFAULTS.kneeMin}: ${worstExact.toExponential(2)} (${atE}); ` +
              `up to 0.93: ${worstBright.toExponential(2)} = ${(255 * worstBright).toFixed(1)}/255 (${atB})`,
    };
  });

// 2b. and at any eta it is a pure exposure: one factor for all flat
// open ground, independent of where the pixel is.
gate(3, "at any eta, flat open ground is one exposure factor, not a distortion",
  { current: true, proposed: true },
  (model) => {
    let worst = 0;
    for (const eta of [0, 0.5, 0.7, 1]) for (const alt of ALTS) {
      const vals = [0.1, 0.35, 0.5, 0.8].map((albedoL) => {
        const r = shade(model, {
          N: [0, 0, 1], sunDir: sunDirOf(alt), shadow: 0, openness: 1, albedoL,
          over: model === "proposed" ? { eta, kneeMin: 1 } : {},
        });
        return r.L / albedoL;
      });
      const spread = Math.max(...vals) - Math.min(...vals);
      if (spread > worst) worst = spread;
    }
    return { ok: worst < 1e-12, detail: `worst spread of the flat-ground factor ${worst.toExponential(2)}` };
  });

// =====================================================================
// 4. AO is a sky factor
// =====================================================================
gate(4, "AO cannot darken a sunlit pixel by more than the sky's own share",
  { current: false, proposed: true },
  (model) => {
    // The physical bound: sky light is the only thing sky occlusion can
    // remove. That share is not a constant -- it is 23% of a sunlit flat
    // pixel's irradiance at a 60 degree sun and 51% at 10 degrees -- so
    // the bound is computed per altitude from the irradiance model and
    // both models are judged against it.
    //
    // This is where the current shader's AO is wrong in kind rather than
    // in degree: aoFactor is a plain multiplier on the whole composite
    // with no altitude dependence at all, so it removes the same
    // fraction whatever the sun is doing, and at a high sun that
    // fraction is larger than the entire sky budget.
    let worstExcess = -1, at = "";
    for (const alt of [60, 40, 25, 10]) for (const aoStrength of [0.3, 0.6, 1.0, 1.8, 2.5]) {
      const S = sunDirOf(alt);
      const tot = irradiance({ N: [0, 0, 1], sunDir: S, openness: 1, p: P() });
      const noSky = irradiance({ N: [0, 0, 1], sunDir: S, openness: 0, p: P() });
      const skyShare = (tot - noSky) / tot;

      const dark = shade(model, { N: [0, 0, 1], sunDir: S, shadow: 0, openness: 0, aoStrength, albedoL: 1 }).L;
      const open = shade(model, { N: [0, 0, 1], sunDir: S, shadow: 0, openness: 1, aoStrength, albedoL: 1 }).L;
      const removed = 1 - dark / open;

      const excess = removed - skyShare;
      if (excess > worstExcess) {
        worstExcess = excess;
        at = `alt ${alt} aoStrength ${aoStrength}: removes ${(100 * removed).toFixed(1)}% where the sky is ${(100 * skyShare).toFixed(1)}%`;
      }
    }
    return { ok: worstExcess <= 0.02, detail: at };
  });

// =====================================================================
// 5. Falloff invariance
// =====================================================================
gate(5, "switching the AO falloff does not change the shading (real sweep)",
  { current: false, proposed: true },
  (model) => {
    // Each falloff is handed its OWN measurement of the same geometry,
    // which is the only physical way to ask this: the two store
    // different numbers for identical ground. On a mid-grey albedo, not
    // a white one: at albedo 1 the current composite clips to exactly
    // 1.0 at every slope, and that clip hides the difference this gate
    // is looking for.
    let worst = 0, at = "";
    for (const h of HILLS) for (const aoStrength of [0.3, 1.0]) {
      const L = {};
      for (const falloff of ["exp", "cos2"]) {
        L[falloff] = shadeStored(model, {
          storedAo: h.stored[falloff], falloff,
          N: normalOf(h.slopeDeg, 0), sunDir: sunDirOf(25), aoStrength, albedoL: 0.5,
        }).L;
      }
      const d = Math.abs(L.exp - L.cos2);
      if (d > worst) { worst = d; at = `slope ${h.slopeDeg.toFixed(1)} deg, aoStrength ${aoStrength}`; }
    }
    // The exp baseline is a polynomial fit, so agreement is to its
    // accuracy, not to the bit. 3/255 over the range terrain occupies.
    return { ok: worst <= 3 / 255, detail: `worst difference ${worst.toFixed(4)} = ${(255 * worst).toFixed(1)}/255 (${at})` };
  });

// =====================================================================
// 6. A uniform hillside does not engage the AO term
// =====================================================================
// Measured through the real sweep, not asserted: slope alone is not
// concavity, and the tilt dependence must come from the sky term's own
// geometry so the two never double-count.
gate(6, "a uniform hillside is untouched by AO strength (real sweep)",
  { current: false, proposed: true },
  (model) => {
    // Slope is not concavity. The sky term's own (1 + nz)/2 already
    // carries the tilt, so AO must contribute nothing on a plane of any
    // steepness or the slope is counted twice. This is the gate that
    // found the fault: a uniform hillside is NOT open, so the raw
    // measurement cannot be used and has to be divided by what the
    // surface's own plane predicts.
    let worst = 0, at = "";
    for (const h of HILLS) for (const falloff of ["exp", "cos2"]) {
      const at0 = shadeStored(model, {
        storedAo: h.stored[falloff], falloff,
        N: normalOf(h.slopeDeg, 0), sunDir: sunDirOf(25), aoStrength: 0, albedoL: 0.5,
      }).L;
      const at1 = shadeStored(model, {
        storedAo: h.stored[falloff], falloff,
        N: normalOf(h.slopeDeg, 0), sunDir: sunDirOf(25), aoStrength: 1, albedoL: 0.5,
      }).L;
      const d = Math.abs(at1 - at0);
      if (d > worst) { worst = d; at = `${falloff} slope ${h.slopeDeg.toFixed(1)} deg`; }
    }
    return { ok: worst <= 3 / 255, detail: `shading moves ${worst.toFixed(4)} = ${(255 * worst).toFixed(1)}/255 (${at})` };
  });

// =====================================================================
// 7. Monotone in shadow
// =====================================================================
gate(7, "more shadow is never brighter",
  { current: true, proposed: true },
  (model) => {
    let bad = 0, worst = 0;
    for (const alt of [0.5, 5, 25, 60]) for (const slope of [0, 30, 60, 80])
    for (const az of AZS) for (const openness of [1, 0.5]) for (const relief of [0, 0.38, 1]) {
      let prev = Infinity;
      for (let s = 0; s <= 1.0001; s += 0.02) {
        const L = shade(model, { N: normalOf(slope, az), sunDir: sunDirOf(alt), shadow: s, openness, relief, albedoL: 1 }).L;
        if (L > prev + 1e-9) { bad++; worst = Math.max(worst, L - prev); }
        prev = L;
      }
    }
    return { ok: bad === 0, detail: bad ? `${bad} rises, worst +${worst.toExponential(2)}` : "no rises" };
  });

// =====================================================================
// 8. Monotone through the terminator, below the geometric horizon
// =====================================================================
// Stated below the horizon only, deliberately. Above it a 50-80 degree
// slope passing its own terminator genuinely brightens as the sun sets,
// at every eta, and gating that globally would be wrong.
//
// Two clauses, because the disc takes a moment to set. Once the sun is
// properly down -- past the disc, where both the direct term and its
// smax foot are identically zero -- every pixel falls with T^(1 - eta)
// and nothing rises at all. Across the crossing itself a pixel that
// never had direct light does tick UP, because `eta` divides by the
// reference and the reference is losing its own direct term while the
// pixel has none to lose. That lift is real and is bounded by the size
// of the reference's direct term at the horizon, which is 2% of its
// total, so the second clause measures it rather than assuming it away.
// It used to be hidden rather than absent: the old post-tone day/night
// multiplier fell steeply enough through here to swamp it.
gate(8, "below the geometric horizon, no pixel brightens as the sun sets",
  { current: true, proposed: true },
  (model) => {
    // The sun's disc is fully below the horizon past -0.6 deg: the gate
    // on sunDir.z spans +-0.26 deg and smax's foot another 0.46 deg.
    const SET = -0.6;
    let bad = 0, worst = 0, at = "", lift = 0, liftAt = "";
    for (const slope of SLOPES) for (const az of AZS) for (const openness of [1, 0.5])
    for (const shadow of [0, 0.5, 1]) for (const relief of [0, 0.38, 1]) {
      let prev = Infinity;
      for (let alt = 0.3; alt >= -8; alt -= 0.1) {
        const L = shade(model, {
          N: normalOf(slope, az), sunDir: sunDirOf(alt), shadow, openness, relief, albedoL: 1,
          over: model === "current" ? { useTime: 1 } : {},
        }).L;
        const rise = L - prev;
        if (rise > 1e-7) {
          if (alt <= SET) { bad++; if (rise > worst) { worst = rise; at = `slope ${slope} az ${az} alt ${alt.toFixed(1)}`; } }
          else if (rise > lift) { lift = rise; liftAt = `slope ${slope} az ${az} alt ${alt.toFixed(1)}`; }
        }
        prev = L;
      }
    }
    return {
      ok: bad === 0 && lift <= 1 / 255,
      detail: (bad ? `${bad} rises past ${SET} deg, worst +${worst.toFixed(5)} at ${at}`
                   : `no rises past ${SET} deg, down to -8`) +
              `; across the crossing +${lift.toFixed(5)} = ${(255 * lift).toFixed(2)}/255` +
              (liftAt ? ` (${liftAt})` : ""),
    };
  });

// =====================================================================
// 9. The low-sun phenomenon is preserved
// =====================================================================
// The sweep resolves, per pixel, whether the sun clears that pixel's own
// horizon: last light on the summits while the valley beside them is
// dark. verify-low-sun-illumination.mjs protects this; it must not
// regress.
gate(9, "a lit pixel stays brighter than a shadowed one down to a 0.2 deg sun",
  { current: true, proposed: true },
  (model) => {
    let worst = Infinity, at = "";
    for (const alt of [5, 2, 1, 0.5, 0.2]) {
      const lit = shade(model, { N: [0, 0, 1], sunDir: sunDirOf(alt), shadow: 0, albedoL: 1 }).L;
      const sh = shade(model, { N: [0, 0, 1], sunDir: sunDirOf(alt), shadow: 1, albedoL: 1 }).L;
      if (lit / sh < worst) { worst = lit / sh; at = `alt ${alt}`; }
    }
    return { ok: worst > 1.01, detail: `worst lit/shadowed ratio ${worst.toFixed(4)} (${at})` };
  });

// =====================================================================
// 10. The grade is a post-process
// =====================================================================
// The structural statement, not a tolerance: the lighting must be
// computable without reference to brightness, contrast or saturation.
// PROPOSED has shadeLighting(), which takes no grade parameters at all.
// CURRENT puts brightness inside the value accumulator, so no such
// function exists and the lighting ratio between two pixels moves when
// the knob does.
gate(10, "the lighting is independent of brightness, contrast and saturation",
  { current: false, proposed: true },
  (model) => {
    const A = { N: normalOf(40, 0), sunDir: sunDirOf(25) };
    const B = { N: normalOf(40, 180), sunDir: sunDirOf(25) };
    const ratioAt = (over) => {
      const a = shade(model, { ...A, albedoL: 1, over }).lighting;
      const b = shade(model, { ...B, albedoL: 1, over }).lighting;
      return a / b;
    };
    const base = ratioAt({});
    let worst = 0, at = "";
    const knobs = model === "current"
      ? [{ brightness: 0.27 }, { brightness: 0.5 }, { brightness: -0.5 }, { saturation: 1.6 }]
      : [{ brightness: 0.27 }, { brightness: 0.5 }, { brightness: -0.5 },
         { contrastPost: 1.4 }, { saturation: 1.6 }];
    for (const k of knobs) {
      const d = Math.abs(ratioAt(k) / base - 1);
      if (d > worst) { worst = d; at = JSON.stringify(k); }
    }
    return { ok: worst < 1e-12, detail: `lighting ratio moves by ${(100 * worst).toFixed(2)}% worst (${at})` };
  });

// and the quantitative consequence: brightness must not spend relief
gate(11, "brightness does not spend relief contrast",
  { current: false, proposed: true },
  (model) => {
    const spreadAt = (over) => {
      const a = shade(model, { N: normalOf(40, 0), sunDir: sunDirOf(25), albedoL: 0.5, over }).L;
      const b = shade(model, { N: normalOf(40, 180), sunDir: sunDirOf(25), albedoL: 0.5, over }).L;
      return a - b;
    };
    const base = spreadAt({});
    let worst = 1, at = "";
    for (const brightness of [0.1, 0.27, 0.5, 0.8, 1.0]) {
      const k = spreadAt({ brightness }) / base;
      if (k < worst) { worst = k; at = `brightness +${brightness}`; }
    }
    // Any monotone remap of lightness moves a spread a little; a gamma
    // on L costs under a third of it at the far end of the slider. What
    // is not allowed is spending it, which is what a term inside the
    // accumulator does: the current shader is down to 13%.
    return { ok: worst > 0.7, detail: `relief spread falls to ${(100 * worst).toFixed(1)}% of neutral (${at})` };
  });

// =====================================================================
// 12. Nothing clips
// =====================================================================
gate(12, "nothing clips: the finished lightness never reaches 0 or 1",
  { current: false, proposed: true },
  (model) => {
    let hitOne = 0, hitZero = 0, firstAt = "";
    for (const albedoL of [0.5, 0.8, 1.0]) for (const alt of [1, 25, 60])
    for (const relief of [0.38, 0.8, 1.0]) for (const brightness of [0, 0.5, 1.0])
    for (const shadow of [0, 1]) {
      for (let slope = 0; slope <= 80; slope += 1) {
        const L = shade(model, {
          N: normalOf(slope, 0), sunDir: sunDirOf(alt), albedoL, relief, shadow,
          over: { brightness },
        }).L;
        if (L >= 1) {
          hitOne++;
          if (!firstAt) firstAt = `albedo ${albedoL} alt ${alt} relief ${relief} bright ${brightness} slope ${slope}`;
        }
        if (L <= 0) hitZero++;
      }
    }
    // Separately: the shoulder itself must be strictly increasing over
    // the whole reachable range, which is albedo 1 times the tone
    // ceiling. A shoulder whose asymptote is reached in float IS a clip,
    // and that is what the tanh form did at a knee near 1.
    let shoulderMono = true;
    const reach = Math.pow(2, DEFAULTS.highlightStops);
    for (const knee of [0.5, 0.8, KNEE_MAX]) {
      let prev = -Infinity;
      for (let L = 0; L <= reach; L += reach / 20000) {
        const v = shoulder(L, knee);
        if (v <= prev || v >= 1) { shoulderMono = false; break; }
        prev = v;
      }
    }
    // The current model has no shoulder; its clip is the thing measured
    // above, so this half is vacuous for it.
    const ok = hitOne === 0 && hitZero === 0 && (model === "current" || shoulderMono);
    return {
      ok,
      detail: hitOne
        ? `${hitOne} samples reach L = 1 (first at ${firstAt})`
        : `no sample reaches 0 or 1 over ${3 * 3 * 3 * 3 * 2 * 81} configurations` +
          (model === "proposed" ? `; shoulder strictly increasing and below 1 up to L = ${reach.toFixed(2)}: ${shoulderMono}` : ""),
    };
  });

// =====================================================================
// 13. The Lambert terminator is smooth, and compactly so
// =====================================================================
gate(13, "the direct term is C1 at the terminator and exactly zero past it",
  { current: false, proposed: true },
  (model) => {
    if (model === "current") {
      // CURRENT has no sun-radius softening in the composite at all:
      // the relief term is linear in dot(N,L) with no terminator, and
      // the Lambertian branch uses a hard max. Measure the hard max.
      const d = (x, h = 1e-7) => (Math.max(x + h, 0) - Math.max(x - h, 0)) / (2 * h);
      const jump = Math.abs(d(1e-5) - d(-1e-5));
      return { ok: jump < 1e-3, detail: `slope jump at the terminator ${jump.toFixed(3)}` };
    }
    const s = Math.sin((DEFAULTS.sunRadiusDeg * Math.PI) / 180);
    const f = (x) => smax(x, s);
    const d = (x, h = 1e-9) => (f(x + h) - f(x - h)) / (2 * h);
    let worstJump = 0;
    for (const x of [-s, 0, s]) worstJump = Math.max(worstJump, Math.abs(d(x + 1e-7) - d(x - 1e-7)));
    // compact support
    let leaked = 0;
    for (let x = -1; x < -s; x += 0.001) if (f(x) !== 0) leaked++;
    // and indistinguishable from the hard max at the default radius
    let dev = 0;
    for (let x = -1; x <= 1; x += 0.0005) dev = Math.max(dev, Math.abs(f(x) - Math.max(x, 0)));
    const ok = worstJump < 1e-3 && leaked === 0 && dev < 3e-3;
    return { ok, detail: `slope jump ${worstJump.toExponential(2)}, support leak ${leaked}, max dev from hard max ${dev.toExponential(2)}` };
  });

// =====================================================================
// 14. One radius drives both penumbras
// =====================================================================
gate(14, "widening the sun widens the Lambert penumbra and the shadow penumbra together",
  { current: false, proposed: true },
  (model) => {
    const widths = [];
    for (const r of [0.46, 2, 5, 15]) {
      if (model === "current") {
        widths.push(0);                       // no radius in the composite
      } else {
        const s = Math.sin((r * Math.PI) / 180);
        // half-width of the band where the direct term differs from the
        // hard max, measured rather than assumed
        let lo = 0;
        for (let x = -1; x <= 1; x += 0.0002) {
          if (Math.abs(smax(x, s) - Math.max(x, 0)) > 1e-9) { lo = Math.abs(x); break; }
        }
        widths.push(lo);
      }
    }
    // the bake's own penumbra, for the same radii
    const bakeTans = [0.46, 2, 5, 15].map((r) => shadowTanMin(20, r));
    const bakeVaries = new Set(bakeTans.map((t) => t.toFixed(9))).size === 4;
    const lambertVaries = new Set(widths.map((w) => w.toFixed(6))).size === 4;
    return {
      ok: lambertVaries && bakeVaries,
      detail: `Lambert penumbra half-widths ${widths.map((w) => w.toFixed(4)).join(", ")}; ` +
              `bake tanAltMin ${bakeTans.map((t) => t.toFixed(4)).join(", ")}`,
    };
  });

// =====================================================================
// 15. Shading holds saturation; only the grade changes it
// =====================================================================
gate(15, "shading does not change saturation, and the grade knob scales it",
  { current: false, proposed: true },
  (model) => {
    // What reads as saturation is C/L. Shading moves L, so C has to move
    // with it or a shadow comes out a more lurid version of the ground
    // it falls on. The current model instead desaturates by a fitted
    // 0.2 + 0.8*sqrt(value) factor, which is a look rather than a
    // property, and it is not normalised to 1 away from neutral.
    const satOf = (over, shadow, slope) => {
      const r = shade(model, {
        N: normalOf(slope, 0), sunDir: sunDirOf(25), shadow, albedoL: 0.5, over,
      });
      // chroma is the factor on the albedo's a/b, so C/L for a unit-chroma
      // albedo is chroma / L.
      return r.chroma / r.L;
    };
    const base = satOf({}, 0, 0);
    let worst = 0, at = "";
    for (const shadow of [0, 0.5, 1]) for (const slope of [0, 30, 60]) {
      const d = Math.abs(satOf({}, shadow, slope) / base - 1);
      if (d > worst) { worst = d; at = `shadow ${shadow} slope ${slope}`; }
    }
    // and the knob is a pure multiplier on top of that
    let knobOk = true;
    for (const saturation of [0, 0.5, 1.6, 2]) {
      const k = satOf({ saturation }, 0.5, 30) / satOf({}, 0.5, 30);
      if (Math.abs(k - saturation) > 1e-9) knobOk = false;
    }
    return {
      ok: worst < 1e-9 && knobOk,
      detail: `saturation drifts ${(100 * worst).toFixed(1)}% under shading (${at}); ` +
              `knob is a pure multiplier: ${knobOk}`,
    };
  });

// =====================================================================
// 16. Night is dim, not black
// =====================================================================
// Below the horizon there is no sun disc, so there is no direct term and
// a cast shadow makes no difference. That part is right. Reaching for
// black is not: the sky is still there, the ground still has an albedo,
// and the terrain still occludes its own view of the sky, so a night
// frame should read as dim ambient-lit relief rather than as nothing.
//
// Both models failed this when it was written, from opposite ends. The
// legacy branch has no night at all -- it goes on drawing noon cast
// shadows at midnight, which is what the nightMask stack outside
// currentValue is there to paper over. The irradiance port had the
// horizon gate and so had no shadows, but carried all of day-into-night
// in one multiplier applied AFTER the tone curve, where nothing
// compresses it: a floor of 0.06 there is a flat four-stop cut, and it
// took albedo, occlusion and relief to 0/255 together.
gate(16, "a night frame is dim rather than black, and keeps albedo and occlusion",
  { current: false, proposed: true },
  (model) => {
    const at = (alt, over) => srgb8(shade(model, {
      N: [0, 0, 1], sunDir: sunDirOf(alt), ...over,
    }).L);

    let dimmest = 255, dimAt = "", worstAlbedo = 255, worstOcc = 255;
    for (const alt of NIGHT_ALTS) {
      const open = at(alt, { albedoL: 0.5 });
      if (open < dimmest) { dimmest = open; dimAt = `alt ${alt}`; }
      worstAlbedo = Math.min(worstAlbedo, at(alt, { albedoL: 0.8 }) - at(alt, { albedoL: 0.35 }));
      worstOcc = Math.min(worstOcc, open - at(alt, { albedoL: 0.5, openness: 0.45 }));
    }

    // The sun is gone, so a shadow flag must not matter. Both models
    // hold this one for the same reason: V carries the horizon gate.
    let shadowMoves = 0;
    for (const alt of NIGHT_ALTS) {
      shadowMoves = Math.max(shadowMoves, Math.abs(
        shade(model, { N: [0, 0, 1], sunDir: sunDirOf(alt), albedoL: 0.5, shadow: 1 }).L -
        shade(model, { N: [0, 0, 1], sunDir: sunDirOf(alt), albedoL: 0.5, shadow: 0 }).L));
    }

    // Reported, not asserted: the circumsolar sky survives the sun
    // setting, so the night side stays gently biased toward where the
    // sun went down. That bias is wanted -- it is the indirect light
    // this model was built to carry -- and is not a direct term.
    const toward = at(-10, { albedoL: 0.5, N: normalOf(40, 0, 0) });
    const away = at(-10, { albedoL: 0.5, N: normalOf(40, 180, 0) });

    return {
      ok: dimmest >= 8 && worstAlbedo >= 6 && worstOcc >= 3 && shadowMoves < 1e-9,
      detail: `flat mid-grey night floor ${dimmest}/255 (${dimAt}); albedo spread ` +
              `${worstAlbedo}/255, occlusion spread ${worstOcc}/255; shadow moves ` +
              `${shadowMoves.toExponential(1)}; glow bias ${toward} vs ${away}/255`,
    };
  });

// =====================================================================
// 17. Temperature is colour and nothing but colour
// =====================================================================
// Two knobs, and the gate is as much about what they must NOT do.
// Neither may move the lightness by a single bit: the whole structure
// of this model is that lighting decides L and the grade decides how it
// is presented, and a temperature that dragged L around would be a
// contrast control wearing a colour name.
//
// `sunWarmth` is signed by the disc's share of each pixel's own light,
// so it is the one that makes shadows blue. `temperature` is the same
// shift everywhere, scaled by L to hold a chromaticity rather than a
// chroma, and deliberately NOT scaled by saturation.
gate(17, "temperature moves colour, never lightness, and the two knobs differ",
  { current: false, proposed: true },
  (model) => {
    const at = (over, args) => {
      const r = shade(model, { albedoL: 0.5, N: [0, 0, 1], sunDir: sunDirOf(45), ...args, over });
      const t = r.tint ?? [0, 0];
      // Signed projection onto the warm axis, per unit lightness.
      return { L: r.L, warm: (t[0] * WARM_AB[0] + t[1] * WARM_AB[1]) / r.L };
    };

    // (a) neither knob touches L, at all, anywhere
    let dL = 0;
    for (const over of [{ sunWarmth: 1 }, { sunWarmth: 0 }, { temperature: 1 }, { temperature: -1 }])
    for (const args of [{}, { shadow: 1 }, { sunDir: sunDirOf(-8) }, { N: normalOf(50, 180) }, { openness: 0.4 }]) {
      dL = Math.max(dL, Math.abs(at(over, args).L - at({ sunWarmth: 0, temperature: 0 }, args).L));
    }

    // (b) warm sun, cool shadow, cool night
    const W = { sunWarmth: 1, temperature: 0 };
    const lit = at(W, {}).warm;
    const shadowed = at(W, { shadow: 1 }).warm;
    const night = at(W, { sunDir: sunDirOf(-8) }).warm;

    // (c) off is exactly off
    let offTint = 0;
    for (const args of [{}, { shadow: 1 }, { sunDir: sunDirOf(-8) }])
      offTint = Math.max(offTint, Math.abs(at({ sunWarmth: 0, temperature: 0 }, args).warm));

    // (d) the white balance is the SAME shift for every pixel
    let wbSpread = 0;
    const wb = { sunWarmth: 0, temperature: 1 };
    const wbRef = at(wb, {}).warm;
    for (const args of [{ shadow: 1 }, { sunDir: sunDirOf(-8) }, { N: normalOf(60, 180) }, { openness: 0.3 }])
      wbSpread = Math.max(wbSpread, Math.abs(at(wb, args).warm - wbRef));

    // (e) saturation scales the scene's tint and not the camera's
    const satScalesSun = Math.abs(at({ ...W, saturation: 0.5 }, {}).warm / lit - 0.5);
    const satLeavesWb = Math.abs(at({ ...wb, saturation: 0.5 }, {}).warm / wbRef - 1);

    return {
      ok: dL < 1e-12 && lit > 0.02 && shadowed < -0.02 && night < -0.02 &&
          offTint < 1e-12 && wbSpread < 1e-12 && satScalesSun < 1e-12 && satLeavesWb < 1e-12,
      detail: `dL ${dL.toExponential(1)}; warm axis C/L lit ${lit.toFixed(4)}, ` +
              `shadow ${shadowed.toFixed(4)}, night ${night.toFixed(4)}; off ` +
              `${offTint.toExponential(1)}; white balance spread ${wbSpread.toExponential(1)}; ` +
              `saturation scales sun ${satScalesSun < 1e-12}, leaves balance ${satLeavesWb < 1e-12}`,
    };
  });

// ---- tables ----------------------------------------------------------
if (showTable) {
  console.log("\n\nFully shadowed pixel on a white albedo, shadow strength 1:\n");
  console.log("  alt  slope | current | proposed");
  for (const alt of [60, 25, 5, 1, 0.4]) for (const slope of [0, 40, 70]) {
    const c = shade("current", { N: normalOf(slope, 0), sunDir: sunDirOf(alt), shadow: 1, albedoL: 1, relief: 1 }).L;
    const p = shade("proposed", { N: normalOf(slope, 0), sunDir: sunDirOf(alt), shadow: 1, albedoL: 1, relief: 1 }).L;
    console.log(`  ${String(alt).padStart(4)}  ${String(slope).padStart(4)} |  ${c.toFixed(4)} |  ${p.toFixed(4)}`);
  }
  console.log("\nSunlit flat pixel as openness falls, AO strength 1:\n");
  console.log("  openness | current | proposed");
  for (const openness of [1, 0.8, 0.5, 0.2, 0]) {
    const c = shade("current", { N: [0, 0, 1], sunDir: sunDirOf(25), openness, aoStrength: 1, albedoL: 1 }).L;
    const p = shade("proposed", { N: [0, 0, 1], sunDir: sunDirOf(25), openness, aoStrength: 1, albedoL: 1 }).L;
    console.log(`  ${openness.toFixed(2).padStart(8)} |  ${c.toFixed(4)} |  ${p.toFixed(4)}`);
  }
}

// ---- summary ---------------------------------------------------------
const nFaults = results.filter((r) => !r.expect.current).length;
console.log(`\n${results.length} gates: ${nFaults} faults expected to fail on the current ` +
            `shader, ${results.length - nFaults} properties expected to hold on both.`);
console.log(failures === 0
  ? "All gates behave as specified.\n"
  : `${failures} gate(s) did not behave as specified.\n`);
process.exit(failures === 0 ? 0 : 1);
