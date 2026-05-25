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
    parentScale = 2,
    // Optional elevation bounds used to trim the warmup march. A
    // parent-ring blocker of height `horizonElevMax` can only cast a
    // hard-shadow ray reaching a comp target at height `compElevMin`
    // out to distance `(horizonElevMax − compElevMin) / tan(altMin)`
    // metres, where `altMin` is the shallowest shadow-contributing
    // sun angle (= altDeg for hard, = altDeg − 1.5·sunRadiusDeg for
    // soft, ∞ for LSAO). The warmup therefore only needs to walk the
    // child-pixel equivalent of that distance, capped at the full
    // margin. Leave either opt null/undefined and we walk the whole
    // margin, same as before.
    compElevMin = null,
    horizonElevMax = null,
    // Horizon's parent-pixel resolution (e.g. 256). Used to size the
    // warmup margin: the horizon ring extends `horizonPN/2` parent pixels
    // beyond the comp tile, regardless of the bake grid `W`. Defaults to
    // `W` to preserve the original behavior when bake grid == horizon
    // grid (i.e. compN == PN). When the bake grid is larger (compN > PN),
    // the warmup must NOT scale with `W` or it walks past available
    // horizon data and parent blockers fail to contribute.
    horizonPN = null,
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

  // 'hard' mode constants. G(p) = h_p + cx_p·dCxT gives Δ(t, p) = G(p) − G(t)
  // for the overshoot of a blocker p above the sun ray from target t.
  // epsH is half the ±½-pixel edge-smoothing window along the sweep axis.
  //
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
  //
  // With per-row pxSize, dStep / dCxT / epsH / invTwoEps vary per
  // target — `updateTargetPx` re-derives them from the target's own
  // row just before each computeBit call. With scalar pxSize they're
  // constant for the whole sweep and initialised once below, so
  // `updateTargetPx` is left null and the inner loop skips it.
  const tanAlt = Math.tan((altDeg * Math.PI) / 180);
  const pxSeed = pxSizeByRow ? pxSizeByRow[0] : pxSizeM;
  let dStep = slopeFac * pxSeed;
  let dCxT = dStep * tanAlt;
  let epsH = 0.5 * pxSeed * tanAlt;
  let invTwoEps = epsH > 0 ? 1 / (2 * epsH) : 0;
  const updateTargetPx = pxSizeByRow
    ? (cx, cy) => {
        let r = swap ? cx : cy;
        if (flipY) r = H - 1 - r;
        if (r < 0) r = 0;
        else if (r >= H) r = H - 1;
        const px = pxSizeByRow[r];
        dStep = slopeFac * px;
        dCxT = dStep * tanAlt;
        epsH = 0.5 * px * tanAlt;
        invTwoEps = epsH > 0 ? 1 / (2 * epsH) : 0;
      }
    : null;

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

  const hasHorizon = horizon && HN > 0;

  // Horizon-sample bilinear alignment for arbitrary `parentScale = 2^dz`.
  //
  // The worker assembles the horizon with (PN/2) parent pixels of
  // margin on each side of the comp tile, which is `warmupMargin`
  // child pixels = `W * parentScale / 2`. At parentScale=2 this is
  // exactly W (one target tile) and the formula collapses to the
  // original hand-derived form; at parentScale=4 it's 2·W (two target
  // tiles), and so on.
  //
  // Horizon pixel `h` (integer) has its centre at tile-local child
  // position
  //   `h * parentScale + parentScale/2 - warmupMargin`.
  // Sampling at child pixel `oxf`'s centre (child-space position
  // `oxf + 0.5`) therefore lands at horizon position
  //   `(oxf + 0.5 + warmupMargin)/parentScale - 0.5`,
  // which we rearrange to
  //   `(oxf + warmupMargin) * invParentScale - parentCenterOffset`
  // with `parentCenterOffset = 0.5 * (1 - invParentScale)` to absorb
  // the sub-parent-pixel offset introduced by pixel-centre sampling.
  //
  // `WARMUP_STEPS` must equal `warmupMarginX` so the ray walks the
  // full available margin along the sweep-canonical axis — walking
  // only `W` child pixels at parentScale>2 would leave the outer
  // parent-pixel tiles unsampled and blockers past one child tile
  // from the comp edge would be invisible, producing visible tile-
  // boundary artefacts.
  const invParentScale = 1 / parentScale;
  const parentCenterOffset = 0.5 * (1 - invParentScale);
  // Margin = (horizonPN/2) parent pixels × parentScale child-pixels-per-
  // parent-pixel. When the bake grid equals the horizon grid (compN==PN)
  // this collapses to the original (W*parentScale)/2; when the bake grid
  // is finer, the margin still spans only the available horizon ring.
  const _horizonPN_X = horizonPN != null ? horizonPN : W;
  const _horizonPN_Y = horizonPN != null ? horizonPN : H;
  const warmupMarginX = (_horizonPN_X * parentScale) >> 1;
  const warmupMarginY = (_horizonPN_Y * parentScale) >> 1;

  // Elevation-bound warmup reduction. At sun altitude `altMin` (the
  // shallowest angle that still contributes shadow for the current
  // mode) a blocker of height H_b can only cast a shadow that reaches
  // distance (H_b − H_t) / tan(altMin) metres from a target of height
  // H_t. Using the worst-case pair (H_b = horizonElevMax,
  // H_t = compElevMin) gives a tight upper bound on how far back the
  // warmup needs to march; anything past that contributes no shadow
  // and can be skipped. `warmupMarginX` is the geometric maximum so
  // we cap there.
  //
  //   mode=hard   altMin = altDeg
  //   mode=soft   altMin = max(0, effectiveAltDeg − halfWidthDeg)
  //               (equivalently: atan(tanAltBot); already accounts
  //               for the penumbra extent so the warmup won't clip
  //               the low-altitude side).
  //   mode=lsao   horizon-slope scan, no "too shallow" cutoff
  //               so the optimisation doesn't apply and we march
  //               the full margin.
  //
  // Leave either elevation bound null and we fall back to the full
  // margin (backward-compatible for callers that don't track ranges).
  let WARMUP_STEPS = warmupMarginX;
  if (
    horizon && HN > 0 &&
    mode !== "lsao" &&
    compElevMin !== null && compElevMin !== undefined &&
    horizonElevMax !== null && horizonElevMax !== undefined
  ) {
    const dh = horizonElevMax - compElevMin;
    if (dh <= 0) {
      // Parent ring is at or below the comp tile's lowest point —
      // it cannot cast shadow into the comp tile. Skip the warmup.
      WARMUP_STEPS = 0;
    } else {
      const tanMin = mode === "hard" ? tanAlt : tanAltBot;
      if (tanMin > 0) {
        // Smallest pxSize → more pixels per metre → longer walk, so
        // use it as the conservative bound over pxSizeByRow. (Scalar
        // pxSize is just itself.)
        let pxMin = pxSizeM;
        if (pxSizeByRow) {
          pxMin = Infinity;
          for (let i = 0; i < pxSizeByRow.length; i++) {
            const p = pxSizeByRow[i];
            if (p < pxMin) pxMin = p;
          }
        }
        const maxDistM = dh / tanMin;
        const maxDistPx = Math.ceil(maxDistM / pxMin);
        if (maxDistPx < WARMUP_STEPS) {
          WARMUP_STEPS = maxDistPx > 0 ? maxDistPx : 0;
        }
      }
      // tanMin ≤ 0: sun at/below horizon ⇒ effectively infinite
      // shadow length ⇒ keep the full-margin walk.
    }
  }

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

    // Optional warmup: sample the parent horizon buffer along the ray
    // and push each sample onto the hull so that the ray enters the
    // comp tile already carrying the horizon contributed by surrounding
    // terrain.
    //
    // LSAO walks parent pixel centres along the ray direction: every
    // sample is at an integer parent index in the along-ray axis, so
    // only the cross-ray axis needs interpolation (single linear lerp
    // between two adjacent parent rows). This avoids the "fictitious
    // bilinear energy" of sub-parent-pixel oversampling, where bilinear
    // samples in concave-up cells lift the hull above the chord through
    // real parent samples and introduce zoom-dependent perturbations
    // that don't correspond to actual terrain features. Hard/soft modes
    // continue to oversample at comp rate because their fractional sun
    // azimuths rely on the warmup's `(1−fy, fy)` row split AND on the
    // warmup deposit to fill in partner-ray coverage at tile edges; for
    // LSAO at 8 azimuths of 45° the canonical slope is exactly 0 or 1,
    // `fy = 0`, the row split degenerates to `(1, 0)`, and the warmup
    // deposit's "in-view" branch contributes literally zero — the main
    // pass alone supplies exactly one unit per comp pixel per direction
    // — so we skip the deposit entirely.
    //
    // Using `hW` (the parent horizon sample) as the ray height for the
    // bit query in the comp/soft warmup keeps the hull free of clamped
    // tile-edge values and uses the best approximation we have for the
    // physical terrain at that below-tile position.
    if (hasHorizon && mode === "lsao") {
      // Parent-aligned canonical cx values:
      //   cx_k = parentScale * (k + parentCenterOffset) - warmupMarginX
      // where k is the along-ray parent pixel index. The set is symmetric
      // around (W-1)/2 so it's invariant under flipX/flipY and works for
      // swap too (under swap the along-ray axis is canonical-x which maps
      // to original-y, and the parent index that ends up integer is hyf
      // instead of hxf; cross-axis interp uses the other one).
      const warmStart = cxEntry - WARMUP_STEPS;
      const firstK = Math.max(
        0,
        Math.ceil(
          (warmStart + warmupMarginX) / parentScale - parentCenterOffset,
        ),
      );
      const lastK =
        Math.ceil(
          (cxEntry + warmupMarginX) / parentScale - parentCenterOffset,
        ) - 1;
      for (let k = firstK; k <= lastK; k++) {
        const cx = parentScale * (k + parentCenterOffset) - warmupMarginX;
        const y = b + slope * cx;
        let oxf = swap ? y : cx;
        let oyf = swap ? cx : y;
        if (flipX) oxf = W - 1 - oxf;
        if (flipY) oyf = H - 1 - oyf;
        const hxf = (oxf + warmupMarginX) * invParentScale - parentCenterOffset;
        const hyf = (oyf + warmupMarginY) * invParentScale - parentCenterOffset;
        // Along-ray axis is integer by construction (hxf for non-swap,
        // hyf for swap). The other is float; lerp two adjacent parent
        // samples in that axis only.
        if (swap) {
          const alongI = Math.round(hyf);
          const crossF = hxf;
          const crossI = Math.floor(crossF);
          if (alongI < 0 || alongI >= HN) continue;
          if (crossI < 0 || crossI + 1 >= HN) continue;
          const idxLo = alongI * HN + crossI;
          const idxHi = alongI * HN + crossI + 1;
          const fc = crossF - crossI;
          const hW = (1 - fc) * horizon[idxLo] + fc * horizon[idxHi];
          if (horizonTouched) {
            const tBit = b >= 0 ? 1 : 2;
            horizonTouched[idxLo] |= tBit;
            horizonTouched[idxHi] |= tBit;
          }
          pushHull(cx, hW);
        } else {
          const alongI = Math.round(hxf);
          const crossF = hyf;
          const crossI = Math.floor(crossF);
          if (alongI < 0 || alongI >= HN) continue;
          if (crossI < 0 || crossI + 1 >= HN) continue;
          const idxLo = crossI * HN + alongI;
          const idxHi = (crossI + 1) * HN + alongI;
          const fc = crossF - crossI;
          const hW = (1 - fc) * horizon[idxLo] + fc * horizon[idxHi];
          if (horizonTouched) {
            const tBit = b >= 0 ? 1 : 2;
            horizonTouched[idxLo] |= tBit;
            horizonTouched[idxHi] |= tBit;
          }
          pushHull(cx, hW);
        }
      }
    } else if (hasHorizon) {
      const warmStart = cxEntry - WARMUP_STEPS;

      // Parent-rate hull pushes: place hull entries at parent pixel centres
      // (cxP = parentScale*(k+parentCenterOffset) − warmupMarginX) so that
      // the bilinear formula gives hxf = k exactly (or hyf = k for swap).
      // An exact integer index means fx = 0 (or fy = 0), collapsing the
      // bilinear to a 1-D linear interp in the cross-ray axis at fixed
      // along-ray column k — no pixel k+1 is touched. Without this, a
      // comp-rate integer step at cx = −1 gives hxf = 127.25 for
      // parentScale = 2, which blends in 25 % of parent pixel 128 (centred
      // 1 child pixel inside the comp tile). If the comp tile has high
      // terrain near its left edge that 25 % contribution inflates the hull
      // entry and casts a false shadow on the first comp rows even when the
      // sun is clearly above the outside terrain.
      const firstK = Math.max(
        0,
        Math.ceil(
          (warmStart + warmupMarginX) / parentScale - parentCenterOffset,
        ),
      );
      const lastK =
        Math.ceil(
          (cxEntry + warmupMarginX) / parentScale - parentCenterOffset,
        ) - 1;
      for (let k = firstK; k <= lastK; k++) {
        const cxP = parentScale * (k + parentCenterOffset) - warmupMarginX;
        const yP = b + slope * cxP;
        let oxfP = swap ? yP : cxP;
        let oyfP = swap ? cxP : yP;
        if (flipX) oxfP = W - 1 - oxfP;
        if (flipY) oyfP = H - 1 - oyfP;
        const hxfP = (oxfP + warmupMarginX) * invParentScale - parentCenterOffset;
        const hyfP = (oyfP + warmupMarginY) * invParentScale - parentCenterOffset;
        const hxiP = Math.floor(hxfP);
        const hyiP = Math.floor(hyfP);
        if (hxiP < 0 || hxiP + 1 >= HN) continue;
        if (hyiP < 0 || hyiP + 1 >= HN) continue;
        const fxP = hxfP - hxiP;
        const fyP = hyfP - hyiP;
        const h00P = horizon[hyiP * HN + hxiP];
        const h10P = horizon[hyiP * HN + hxiP + 1];
        const h01P = horizon[(hyiP + 1) * HN + hxiP];
        const h11P = horizon[(hyiP + 1) * HN + hxiP + 1];
        const hWP =
          (1 - fxP) * (1 - fyP) * h00P +
          fxP * (1 - fyP) * h10P +
          (1 - fxP) * fyP * h01P +
          fxP * fyP * h11P;
        if (horizonTouched) {
          const tBit = b >= 0 ? 1 : 2;
          horizonTouched[hyiP * HN + hxiP] |= tBit;
          horizonTouched[hyiP * HN + hxiP + 1] |= tBit;
          horizonTouched[(hyiP + 1) * HN + hxiP] |= tBit;
          horizonTouched[(hyiP + 1) * HN + hxiP + 1] |= tBit;
        }
        pushHull(cxP, hWP);
      }

      // Comp-rate edge-straddle deposits: for rays entering the canonical
      // view from the top (b < 0, cxEntry > 0), pixels at cx ∈ [0, cxEntry)
      // are only visited here — the main pass starts at cxEntry and never
      // revisits them. Deposit their shadow contribution using the hull
      // already populated by the parent-rate loop. No hull push here.
      for (let cx = Math.max(warmStart, 0); cx < cxEntry; cx++) {
        const y = b + slope * cx;
        const yi = Math.floor(y);
        const fy = y - yi;
        const yj = yi + 1;
        const loIn = yi >= 0 && yi < viewH;
        const hiIn = yj >= 0 && yj < viewH;
        if (!loIn && !hiIn) continue;
        let oxf = swap ? y : cx;
        let oyf = swap ? cx : y;
        if (flipX) oxf = W - 1 - oxf;
        if (flipY) oyf = H - 1 - oyf;
        const hxf = (oxf + warmupMarginX) * invParentScale - parentCenterOffset;
        const hyf = (oyf + warmupMarginY) * invParentScale - parentCenterOffset;
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
        if (updateTargetPx) updateTargetPx(cx, loIn ? yi : yj);
        const bit = computeBit(cx, hW);
        const contrib = bit * weight;
        if (loIn) out[toOrig(cx, yi)] += (1 - fy) * contrib;
        if (hiIn) out[toOrig(cx, yj)] += fy * contrib;
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

      if (updateTargetPx) updateTargetPx(cx, loIn ? yi : yj);
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
