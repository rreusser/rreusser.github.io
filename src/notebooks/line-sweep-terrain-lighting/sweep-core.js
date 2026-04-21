// Unified CPU line-sweep core for heightfield shading.
//
// All four notebook figures (hard-threshold shadow, parent-tile pre-pass,
// soft shadow, LSAO ambient occlusion) are instances of the same
// traversal. A single canonical reparameterization walks arbitrary-azimuth
// rays as axis-aligned sweeps with slope in [0, 1]; each scanline
// maintains a push-pruned upper convex hull of prior (cx, hRay) samples;
// at every pixel, a mode-specific hull scan produces a scalar `bit` in
// [0, 1], which is deposited into the two bracketing integer rows with
// (1 − f, f) weights. The figures differ only in which `bit` they
// compute and whether they run a parent-horizon warmup pre-pass before
// the main sweep.
//
// Modes:
//
//   'hard'  — Hard-threshold shadow for a point sun. Uses the
//             "G-correction" trick (G(p) = h_p + cx_p·dCxT) so the
//             per-target overshoot reduces to differences of per-hull
//             constants, then linearsteps the bit over ±½ screen pixel
//             along the sweep direction for edge anti-aliasing.
//
//   'soft'  — Altitude-direction penumbra. Scans for the maximum slope
//             (tan α) to the horizon and smoothsteps the bit over
//             [altDeg − 1.5·sunRadius, altDeg + 1.5·sunRadius]. The
//             azimuth dimension of the penumbra is integrated
//             externally by averaging multiple sweeps at small azimuth
//             offsets.
//
//   'lsao'  — Line-sweep ambient occlusion. Scans for the maximum
//             sin α and deposits cos²α = 1 − sin²α, the Lambertian
//             cosine-weighted visible fraction of one azimuthal sky
//             slice. Multiple directions are averaged externally.
//
// A non-null `horizon` buffer (half-resolution parent-tile data) warms
// up each ray for W canonical steps before it enters the comp tile, so
// blockers outside the tile propagate correctly across the boundary.
// Currently only the hard-shadow parent-tile figure supplies one, but
// the same hook is available to soft and LSAO if wanted.

export function sweepCore(opts) {
  const {
    W,
    H,
    elev,
    azDeg,
    pxSizeM,
    pxSizeByRow = null,
    mode,
    altDeg = 0,
    sunRadiusDeg = 0,
    weight = 1,
    horizon = null,
    HN = 0,
    horizonTouched = null,
    lsaoFalloff = "cos2",
  } = opts;

  // Shadow-casting modes traverse *away* from the sun; LSAO is a
  // symmetric horizon scan so we walk the supplied azimuth directly.
  const theta =
    mode === "lsao"
      ? (azDeg * Math.PI) / 180
      : ((azDeg + 180) * Math.PI) / 180;
  const dx = Math.cos(theta);
  const dy = -Math.sin(theta);
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);

  const swap = ady > adx;
  const flipX = dx < 0;
  const flipY = dy < 0;
  const viewW = swap ? H : W;
  const viewH = swap ? W : H;
  const ndx = swap ? ady : adx;
  const ndy = swap ? adx : ady;
  let slope = ndx === 0 ? 0 : ndy / ndx;
  const SLOPE_EPS = 1e-12;
  if (slope < SLOPE_EPS) slope = 0;
  else if (slope > 1 - SLOPE_EPS) slope = 1;

  const toOrig = (cx, cy) => {
    let ox = swap ? cy : cx;
    let oy = swap ? cx : cy;
    if (flipX) ox = W - 1 - ox;
    if (flipY) oy = H - 1 - oy;
    return oy * W + ox;
  };

  const out = new Float32Array(W * H);
  const slopeFac = Math.sqrt(1 + slope * slope);

  // pxSize resolution: either a scalar (same value everywhere, preserves
  // the original behavior for the single-tile figures) or a per-row
  // Float32Array indexed by the target pixel's original row. The latter
  // keeps pxSize continuous across tile boundaries in low-zoom tiles
  // where cos(lat) varies noticeably across one tile's span. Look up
  // by *original* row (post-toOrig remap), not canonical: for a swap
  // sweep the canonical x is the original y, so the same canonical
  // column samples a single original row and pxSize stays constant
  // within one hull scan. For a no-swap sweep pxSize varies with
  // canonical y, so it's re-derived per target.
  const origRowFromCanonical = (cx, cy) => {
    const oy = swap ? cx : cy;
    return flipY ? H - 1 - oy : oy;
  };
  const pxSizeAt = pxSizeByRow
    ? (cx, cy) => {
        let r = origRowFromCanonical(cx, cy);
        if (r < 0) r = 0;
        else if (r >= H) r = H - 1;
        return pxSizeByRow[r];
      }
    : () => pxSizeM;

  // 'hard' mode constants. G(p) = h_p + cx_p·dCxT gives Δ(t, p) = G(p) − G(t)
  // for the overshoot of a blocker p above the sun ray from target t.
  // epsH is half the ±½-pixel edge-smoothing window along the sweep axis.
  // With per-row pxSize these vary per target: updated just before
  // each computeBit call through `setTargetPxSize`.
  const tanAlt = Math.tan((altDeg * Math.PI) / 180);
  const pxSeed = pxSizeByRow ? pxSizeByRow[0] : pxSizeM;
  let dStep = slopeFac * pxSeed;
  let dCxT = dStep * tanAlt;
  let epsH = 0.5 * pxSeed * tanAlt;
  let invTwoEps = epsH > 0 ? 1 / (2 * epsH) : 0;
  const setTargetPxSize = (px) => {
    dStep = slopeFac * px;
    dCxT = dStep * tanAlt;
    epsH = 0.5 * px * tanAlt;
    invTwoEps = epsH > 0 ? 1 / (2 * epsH) : 0;
  };

  // 'soft' mode constants. Clamp effective alt to ≥ halfWidthDeg so
  // tanAltBot never goes negative; otherwise flat ground would land
  // in the middle of the smoothstep range whenever the sun sits
  // within a half-width of the horizon and the whole scene would
  // darken to ~50%.
  const halfWidthDeg = 1.5 * sunRadiusDeg;
  const effectiveAltDeg = altDeg < halfWidthDeg ? halfWidthDeg : altDeg;
  const tanAltBot = Math.tan(
    ((effectiveAltDeg - halfWidthDeg) * Math.PI) / 180,
  );
  const tanAltTop = Math.tan(
    ((effectiveAltDeg + halfWidthDeg) * Math.PI) / 180,
  );
  const tanRange = tanAltTop - tanAltBot;
  const invTanRange = tanRange > 0 ? 1 / tanRange : 0;

  // Per-scanline upper convex hull of (cx, hRay) candidates.
  // Maintained by push-time pruning: when pushing C we pop any
  // top-of-stack B that lies on or below the line from the
  // next-deeper entry A through C. Hulls are then static w.r.t.
  // query order, so per-pixel queries are a plain linear scan.
  const stackCap = viewW + W + 2;
  const stackCx = new Float32Array(stackCap);
  const stackH = new Float32Array(stackCap);
  let ptr = -1;

  const pushHull = (cxNew, hNew) => {
    while (ptr >= 1) {
      const ax = stackCx[ptr - 1];
      const ay = stackH[ptr - 1];
      const bx = stackCx[ptr];
      const by = stackH[ptr];
      // 2D cross of (B − A) × (C − A). cross < 0 ⇒ right turn ⇒ B stays
      // on the upper hull; otherwise B is dominated and must be popped.
      const cross = (bx - ax) * (hNew - ay) - (by - ay) * (cxNew - ax);
      if (cross < 0) break;
      ptr--;
    }
    ptr++;
    stackCx[ptr] = cxNew;
    stackH[ptr] = hNew;
  };

  const bMin = -Math.ceil(slope * (viewW - 1));
  const bMax = viewH - 1;

  const WARMUP_STEPS = W;
  const hasHorizon = horizon && HN > 0;

  // Mode-specific shadow bit at (cx, hRay) against the current hull.
  // Called from both the warmup's tile-edge deposit and the main pass
  // so they share one kernel per mode. Closes over the per-scanline
  // hull state (`stackCx`, `stackH`, `ptr`) and the mode constants.
  const computeBit = (cx, hRay) => {
    if (mode === "hard") {
      // max over hull of (h_i + cx_i·dCxT) − (hRay + cx·dCxT).
      const gT = hRay + cx * dCxT;
      let maxDelta = -Infinity;
      for (let i = 0; i <= ptr; i++) {
        if (cx <= stackCx[i]) continue;
        const d = stackH[i] + stackCx[i] * dCxT - gT;
        if (d > maxDelta) maxDelta = d;
      }
      if (maxDelta === -Infinity) return 0;
      if (epsH === 0) return maxDelta > 0 ? 1 : 0;
      let bit = 0.5 + maxDelta * invTwoEps;
      if (bit < 0) bit = 0;
      else if (bit > 1) bit = 1;
      return bit;
    }
    if (mode === "soft") {
      // max over hull of the horizon slope tan α.
      let bestTan = -Infinity;
      for (let i = 0; i <= ptr; i++) {
        const dxW = (cx - stackCx[i]) * dStep;
        if (dxW <= 0) continue;
        const tanI = (stackH[i] - hRay) / dxW;
        if (tanI > bestTan) bestTan = tanI;
      }
      if (bestTan <= tanAltBot) return 0;
      let tt = (bestTan - tanAltBot) * invTanRange;
      if (tt > 1) tt = 1;
      return tt * tt * (3 - 2 * tt);
    }
    // LSAO: max over hull of sin α. `lsaoFalloff` chooses between the
    // Lambertian cos²α visibility and Naaji's exp(−sin α). Both map a
    // horizon of 0 to visibility 1.
    let bestSin = 0;
    for (let i = 0; i <= ptr; i++) {
      const cxi = stackCx[i];
      if (cxi >= cx) continue;
      const horiz = (cx - cxi) * dStep;
      const dz = stackH[i] - hRay;
      if (dz <= 0) continue;
      const len3 = Math.sqrt(horiz * horiz + dz * dz);
      const s = dz / len3;
      if (s > bestSin) bestSin = s;
    }
    if (lsaoFalloff === "exp") return Math.exp(-bestSin);
    return 1 - bestSin * bestSin;
  };

  for (let b = bMin; b <= bMax; b++) {
    ptr = -1;

    // Where does this ray first enter the comp view [0, viewH)?
    let cxEntry = 0;
    if (b < 0 && slope > 0) {
      cxEntry = Math.min(viewW, Math.ceil(-b / slope));
    } else if (b < 0) {
      cxEntry = viewW;
    }

    // Optional warmup: bilinearly sample the half-resolution parent
    // horizon buffer at exactly WARMUP_STEPS positions ending at
    // (cxEntry − 1), pushing each onto the hull so that the ray
    // enters the comp tile already carrying the horizon contributed
    // by surrounding terrain.
    //
    // In addition to populating the hull, the warmup *also deposits*
    // the computed bit into any output row it straddles at the current
    // cx. Without this, the row closest to the tile edge where the
    // partner ray's yi would be −1 receives only the (1−f)·bit from
    // the yi = 0 ray; the partner ray is still in the warmup and
    // never deposits, so the total weight at that row falls below 1
    // and the shadow reads as a visible seam. Using `hW` (the parent
    // horizon sample) as the ray height for the bit query keeps the
    // hull free of clamped tile-edge values and uses the best
    // approximation we have for the physical terrain at that
    // below-tile position.
    if (hasHorizon) {
      const warmStart = cxEntry - WARMUP_STEPS;
      for (let cx = warmStart; cx < cxEntry; cx++) {
        const y = b + slope * cx;
        let oxf = swap ? y : cx;
        let oyf = swap ? cx : y;
        if (flipX) oxf = W - 1 - oxf;
        if (flipY) oyf = H - 1 - oyf;
        // Elevations are defined at pixel centers. Parent pixels are
        // 2× child pixels, so a child pixel at oxf sits 0.5 child-pixels
        // (= 0.25 parent-pixels) inside the parent cell it occupies.
        // Without this −0.25 offset, the hull entry pushed from the last
        // warmup step at canonical cx = −1 would carry a height sampled
        // from the physical position cx = −0.5, producing a slope that's
        // half the true value at the very first comp pixel — which shows
        // up as a faint shadow band along tile edges in LSAO.
        const hxf = (oxf + W) * 0.5 - 0.25;
        const hyf = (oyf + H) * 0.5 - 0.25;
        const hxi = Math.floor(hxf);
        const hyi = Math.floor(hyf);
        if (hxi < 0 || hxi + 1 >= HN) continue;
        if (hyi < 0 || hyi + 1 >= HN) continue;
        const fx = hxf - hxi;
        const fy2 = hyf - hyi;
        const h00 = horizon[hyi * HN + hxi];
        const h10 = horizon[hyi * HN + hxi + 1];
        const h01 = horizon[(hyi + 1) * HN + hxi];
        const h11 = horizon[(hyi + 1) * HN + hxi + 1];
        const hW =
          (1 - fx) * (1 - fy2) * h00 +
          fx * (1 - fy2) * h10 +
          (1 - fx) * fy2 * h01 +
          fx * fy2 * h11;
        if (horizonTouched) {
          const tBit = b >= 0 ? 1 : 2;
          horizonTouched[hyi * HN + hxi] |= tBit;
          horizonTouched[hyi * HN + hxi + 1] |= tBit;
          horizonTouched[(hyi + 1) * HN + hxi] |= tBit;
          horizonTouched[(hyi + 1) * HN + hxi + 1] |= tBit;
        }

        // Deposit the edge-straddle contribution. This fires only at
        // the few cx positions near the tile boundary where the ray's
        // yj (or yi) is back in [0, viewH) AND cx is itself in the
        // canonical view range [0, viewW). The cx guard matters
        // because `toOrig` doesn't bounds-check its inputs — under
        // a flipX/flipY sweep, a negative canonical cx maps through
        // `W - 1 - cx` into an `ox > W − 1` that still produces a
        // numerically valid (but physically meaningless) output index
        // once the `oy*W + ox` is computed, which would deposit the
        // ray's shadow into a wrap-around pixel on the opposite side
        // of the tile. The main pass doesn't hit this because its
        // cx iterator is already clamped to [cxEntry, viewW).
        //
        // `computeBit` must be called before the hull push, so it
        // scans the hull *without* the current sample — matching
        // the main pass's ordering.
        const inView = cx >= 0 && cx < viewW;
        const yi = Math.floor(y);
        const fy = y - yi;
        const yj = yi + 1;
        const loIn = yi >= 0 && yi < viewH;
        const hiIn = yj >= 0 && yj < viewH;
        if (inView && (loIn || hiIn)) {
          // Use the target's own-row pxSize — see `pxSizeAt` comment.
          setTargetPxSize(pxSizeAt(cx, loIn ? yi : yj));
          const bit = computeBit(cx, hW);
          const contrib = bit * weight;
          if (loIn) out[toOrig(cx, yi)] += (1 - fy) * contrib;
          if (hiIn) out[toOrig(cx, yj)] += fy * contrib;
        }

        pushHull(cx, hW);
      }
    }

    // Main pass: comp-tile pixels only.
    for (let cx = cxEntry; cx < viewW; cx++) {
      const y = b + slope * cx;
      const yi = Math.floor(y);
      const f = y - yi;
      const yj = yi + 1;
      const loIn = yi >= 0 && yi < viewH;
      const hiIn = yj >= 0 && yj < viewH;
      if (!loIn && !hiIn) break;

      const iLo = loIn ? toOrig(cx, yi) : -1;
      const iHi = hiIn ? toOrig(cx, yj) : -1;

      const hLo = loIn ? elev[iLo] : elev[iHi];
      const hHi = hiIn ? elev[iHi] : hLo;
      const hRay = (1 - f) * hLo + f * hHi;

      setTargetPxSize(pxSizeAt(cx, loIn ? yi : yj));
      const bit = computeBit(cx, hRay);

      pushHull(cx, hRay);

      const contrib = bit * weight;
      if (loIn) out[iLo] += (1 - f) * contrib;
      if (hiIn) out[iHi] += f * contrib;
    }
  }

  return out;
}

// Source string for use inside Web Worker blobs. `sweepCore` is written
// as a self-contained function with no outer-scope references, so its
// `.toString()` output is valid as a top-level function declaration
// inside a worker.
export const sweepCoreSource = sweepCore.toString();
