// WebGPU pipeline builder for the unified line-sweep kernel.
//
// The CPU reference is `sweepCore` in `sweep-core.js`. This module
// produces specialized WGSL compute shaders for every (mode, prewarm)
// combination it's asked for, caches the resulting `GPUComputePipeline`
// objects, and exposes a small set of helpers for the notebook to wire
// uniforms / bind groups.
//
// Why specialization rather than a single mega-shader? The hull scan
// is the inner loop, and each mode's contribution kernel ('hard',
// 'soft', 'lsao') has a distinct numerical form. Branching mode inside
// the inner loop would waste registers and prevent the compiler from
// hoisting per-mode constants. Building one shader per mode keeps the
// hot path branch-free at the cost of compiling 3–6 small shader
// modules over a session.
//
// The hull-push prune, the canonical→original `toOrig` map, and the
// optional parent-tile prewarm block are emitted once as shared WGSL
// helpers and called from each mode's main loop.

export const FP_SCALE = 1 << 20;

// Shared WGSL fragments emitted into every specialized kernel.
//
// Uniforms are a single superset struct: not every field is read by
// every mode, but the layout is stable across modes so the JS side
// can pack one ArrayBuffer regardless of which pipeline it's about to
// dispatch. 16-byte aligned to satisfy the WGSL uniform layout rules.
// Uniforms carry pxSize-independent primitives and the raw equatorial
// pxSize plus enough tile metadata to derive per-row cos(lat) in the
// shader. dStep / epsH / invTwoEps used to live here but are now
// re-derived per target pixel from that pixel's own row latitude so the
// sweep stays continuous across tile boundaries.
const UNIFORMS_WGSL = /* wgsl */ `
  struct Uniforms {
    W: u32,
    H: u32,
    viewW: u32,
    viewH: u32,

    swap: u32,
    flipX: u32,
    flipY: u32,
    horizonN: u32,

    tileY: u32,
    z: u32,
    useMercator: u32,
    warmupSteps: u32,

    slope: f32,
    tanAlt: f32,
    fpScale: f32,
    weight: f32,

    eqPxSizeM: f32,
    tanAltBot: f32,
    tanAltTop: f32,
    invTanRange: f32,

    bMin: i32,
    bMax: i32,
    invParentScale: f32,
    parentCenterOffset: f32,
  };
`;

// JS-side packer that mirrors the WGSL struct above. Returns a 96-byte
// ArrayBuffer ready for `device.queue.writeBuffer`. Centralized so the
// notebook driver doesn't have to track field offsets.
export const UNIFORM_BYTES = 96;
export function packUniforms(opts) {
  const {
    W, H, viewW, viewH,
    swap, flipX, flipY, horizonN,
    tileY = 0, z = 0, useMercator = 0,
    slope, weight,
    tanAlt,
    eqPxSizeM,
    tanAltBot, tanAltTop,
    bMin, bMax,
    parentScale = 2,
    warmupSteps = null,
  } = opts;
  const buf = new ArrayBuffer(UNIFORM_BYTES);
  const u32 = new Uint32Array(buf);
  const i32 = new Int32Array(buf);
  const f32 = new Float32Array(buf);
  u32[0] = W;
  u32[1] = H;
  u32[2] = viewW;
  u32[3] = viewH;
  u32[4] = swap ? 1 : 0;
  u32[5] = flipX ? 1 : 0;
  u32[6] = flipY ? 1 : 0;
  u32[7] = horizonN >>> 0;
  u32[8] = tileY >>> 0;
  u32[9] = z >>> 0;
  u32[10] = useMercator ? 1 : 0;
  // Full warmup margin, in child pixels, if caller didn't precompute a
  // tighter bound. Matches sweep-core.js's default WARMUP_STEPS.
  const fullWarmup = (W * parentScale) >> 1;
  u32[11] = (warmupSteps !== null ? warmupSteps : fullWarmup) >>> 0;
  f32[12] = slope;
  f32[13] = tanAlt || 0;
  f32[14] = FP_SCALE;
  f32[15] = weight;
  f32[16] = eqPxSizeM || 0;
  f32[17] = tanAltBot || 0;
  f32[18] = tanAltTop || 0;
  const tanRange = (tanAltTop || 0) - (tanAltBot || 0);
  f32[19] = tanRange > 0 ? 1 / tanRange : 0;
  i32[20] = bMin;
  i32[21] = bMax;
  // See sweep-core.js for the derivation. Child pixel `oxf`'s center
  // (child-space position oxf + 0.5) maps to horizon pixel
  //   (oxf + W) * invParentScale - parentCenterOffset,
  // where parentCenterOffset = 0.5 * (1 - invParentScale) encodes the
  // sub-parent-pixel offset introduced by sampling at child pixel
  // centers rather than integer grid lines.
  const invParentScale = 1 / parentScale;
  f32[22] = invParentScale;
  f32[23] = 0.5 * (1 - invParentScale);
  return buf;
}

// Shared WGSL helpers: toOrig, hull-push prune, hull height fetch.
const HELPERS_WGSL = /* wgsl */ `
  // Per-scanline upper convex hull of (cx, h) blocker candidates.
  // Sized for typical terrain; pushes past the end overwrite the top
  // slot so the hull degrades gracefully rather than corrupting memory.
  const HULL_SIZE: u32 = 128u;
  const SWEEP_PI: f32 = 3.14159265358979323846;

  fn toOrig(cx: i32, cy: i32) -> u32 {
    var ox: i32 = cx;
    var oy: i32 = cy;
    if (u.swap != 0u) { ox = cy; oy = cx; }
    if (u.flipX != 0u) { ox = i32(u.W) - 1 - ox; }
    if (u.flipY != 0u) { oy = i32(u.H) - 1 - oy; }
    return u32(oy) * u.W + u32(ox);
  }

  // Target pxSize from canonical (cx, cy): map through the swap/flipY
  // axes to recover the target's original-tile row, then derive cos(lat)
  // from that row's mercator coordinate. In flat mode just returns the
  // stored equatorial pxSize unchanged.
  fn targetPxSize(cx: i32, cy: i32) -> f32 {
    if (u.useMercator == 0u) { return u.eqPxSizeM; }
    var oy: i32 = cy;
    if (u.swap != 0u) { oy = cx; }
    if (u.flipY != 0u) { oy = i32(u.H) - 1 - oy; }
    if (oy < 0) { oy = 0; }
    let Hi: i32 = i32(u.H);
    if (oy >= Hi) { oy = Hi - 1; }
    let worldRow: f32 = f32(u.tileY) * f32(u.H) + f32(oy) + 0.5;
    let nFull: f32 = f32(1u << u.z) * f32(u.H);
    let nMerc: f32 = SWEEP_PI * (1.0 - 2.0 * worldRow / nFull);
    let lat: f32 = atan(sinh(nMerc));
    return u.eqPxSizeM * cos(lat);
  }
`;

// Optional parent-tile warmup, inlined into main(). Mirrors
// sweep-core.js exactly: walk `WARMUP_STEPS = W` integer cx positions
// ending at `cxEntry - 1`, bilinearly sample the half-resolution
// horizon buffer, and push each onto the hull. When the prewarm
// permutation flag is off this helper returns an empty string so the
// compiled shader has zero overhead and the horizon binding can be a
// 16-byte stub.
//
// Inlined rather than a WGSL function so it can read/write the
// caller's local hull arrays without `ptr<function, ...>` plumbing,
// which is awkward for fixed-size array pointers in older WGSL impls.
function warmupBlock(prewarm, mode, lsaoFalloff) {
  if (!prewarm) return "";
  // Inject the same mode kernel the main loop uses. We rebind `hRay`
  // and `cx` as `let` aliases inside the deposit block so the kernel
  // (which reads those identifiers) works verbatim.
  const kernel = modeKernelWGSL(mode, lsaoFalloff);
  return /* wgsl */ `
    {
      // Child-pixel margin the horizon includes on each side of the
      // comp tile: (PN/2) parent pixels = W * parentScale / 2 child
      // pixels. At parentScale=2 that's W (the original behaviour);
      // at parentScale=4 it's 2·W; and so on. The horizon-sample
      // formula must shift by this full amount to land at the correct
      // parent pixel. The loop count, however, is u.warmupSteps —
      // the caller may precompute a tighter upper bound from the
      // comp-tile-min / horizon-max elevation range and the current
      // sun angle, trimming the loop when shadows can't physically
      // reach across the full margin.
      let parentScaleF: f32 = 1.0 / u.invParentScale;
      let Wf = f32(i32(u.W));
      let Hf = f32(i32(u.H));
      let warmupMarginX: f32 = Wf * parentScaleF * 0.5;
      let warmupMarginY: f32 = Hf * parentScaleF * 0.5;
      let WARMUP_STEPS: i32 = i32(u.warmupSteps);
      let warmStart: i32 = cxEntry - WARMUP_STEPS;
      let hN: i32 = i32(u.horizonN);
      if (hN > 0) {
        for (var cxw: i32 = warmStart; cxw < cxEntry; cxw = cxw + 1) {
          let yw = f32(b) + u.slope * f32(cxw);
          var ox_f: f32 = f32(cxw);
          var oy_f: f32 = yw;
          if (u.swap != 0u) { ox_f = yw; oy_f = f32(cxw); }
          if (u.flipX != 0u) { ox_f = (Wf - 1.0) - ox_f; }
          if (u.flipY != 0u) { oy_f = (Hf - 1.0) - oy_f; }
          // Child→horizon bilinear alignment, generalised to
          // parentScale = 2^dz. Elevations live at pixel centres, so
          // sampling at child pixel ox_f's centre maps to horizon
          // pixel (ox_f + warmupMargin)*invParentScale -
          // parentCenterOffset. See sweep-core.js for the full
          // derivation; using Wf instead of warmupMarginX here was
          // the tile-boundary-artifact bug at parentScale > 2.
          let hx_f: f32 = (ox_f + warmupMarginX) * u.invParentScale - u.parentCenterOffset;
          let hy_f: f32 = (oy_f + warmupMarginY) * u.invParentScale - u.parentCenterOffset;
          let hx_i: i32 = i32(floor(hx_f));
          let hy_i: i32 = i32(floor(hy_f));
          if (hx_i < 0 || hx_i + 1 >= hN) { continue; }
          if (hy_i < 0 || hy_i + 1 >= hN) { continue; }
          let fx: f32 = hx_f - f32(hx_i);
          let fy2: f32 = hy_f - f32(hy_i);
          let h00: f32 = horizon[hy_i * hN + hx_i];
          let h10: f32 = horizon[hy_i * hN + hx_i + 1];
          let h01: f32 = horizon[(hy_i + 1) * hN + hx_i];
          let h11: f32 = horizon[(hy_i + 1) * hN + hx_i + 1];
          let hW: f32 =
            (1.0 - fx) * (1.0 - fy2) * h00 +
            fx * (1.0 - fy2) * h10 +
            (1.0 - fx) * fy2 * h01 +
            fx * fy2 * h11;

          // Deposit the edge-straddle contribution for any output row
          // this warmup step lands on. Gated on cxw being in the
          // canonical view range [0, viewW) — under a flipX/flipY
          // sweep, negative canonical cx would pass through toOrig's
          // (W - 1 - cx) and produce a numerically valid (but wrap-
          // around) output index, depositing the ray's shadow into
          // pixels on the wrong side of the tile. The main pass
          // doesn't hit this because its cx iterator is already
          // clamped to [cxEntry, viewW).
          let inViewW: bool = cxw >= 0 && cxw < i32(u.viewW);
          let yiw: i32 = i32(floor(yw));
          let fyw: f32 = yw - f32(yiw);
          let yjw: i32 = yiw + 1;
          let loInW: bool = yiw >= 0 && yiw < i32(u.viewH);
          let hiInW: bool = yjw >= 0 && yjw < i32(u.viewH);
          if (inViewW && (loInW || hiInW)) {
            let hRay: f32 = hW;
            let cx: i32 = cxw;
            let targetRow: i32 = select(yjw, yiw, loInW);
            let pxSize = targetPxSize(cx, targetRow);
            let dStep = pxSize * sqrt(1.0 + u.slope * u.slope);
            let epsH = 0.5 * pxSize * u.tanAlt;
            let invTwoEps = select(0.0, 1.0 / (2.0 * epsH), epsH > 0.0);
            ${kernel}
            let contribW = bit * u.weight;
            let depLoW = u32(round((1.0 - fyw) * contribW * u.fpScale));
            let depHiW = u32(round(fyw * contribW * u.fpScale));
            if (loInW) { atomicAdd(&shadow[toOrig(cxw, yiw)], depLoW); }
            if (hiInW) { atomicAdd(&shadow[toOrig(cxw, yjw)], depHiW); }
          }

          let cxF = f32(cxw);
          loop {
            if (hullPtr < 1) { break; }
            let ax = hullCx[hullPtr - 1];
            let ay = hullH[hullPtr - 1];
            let bx = hullCx[hullPtr];
            let by = hullH[hullPtr];
            let crossP = (bx - ax) * (hW - ay) - (by - ay) * (cxF - ax);
            if (crossP < 0.0) { break; }
            hullPtr = hullPtr - 1;
          }
          hullPtr = min(hullPtr + 1, hullMax);
          hullCx[hullPtr] = cxF;
          hullH[hullPtr] = hW;
        }
      }
    }
  `;
}

// Per-mode contribution kernel emitted into the hot loop. Each variant
// reads `hRay`, `cx`, the hull arrays, and per-mode uniform fields and
// writes a scalar `bit` in [0, 1].
function modeKernelWGSL(mode, lsaoFalloff = "cos2") {
  if (mode === "hard") {
    // Hard threshold via the G-correction trick. Linearstep over ±epsH
    // gives ½-pixel edge AA along the sweep axis. Matches sweep-core.js
    // mode === 'hard' exactly. Reads `dStep`, `epsH`, `invTwoEps` from
    // the surrounding scope — set per-target by the caller.
    return /* wgsl */ `
      let dCxT = dStep * u.tanAlt;
      let gT = hRay + f32(cx) * dCxT;
      var maxDelta: f32 = -1e30;
      for (var i: i32 = 0; i <= hullPtr; i = i + 1) {
        if (f32(cx) <= hullCx[i]) { continue; }
        let d = hullH[i] + hullCx[i] * dCxT - gT;
        if (d > maxDelta) { maxDelta = d; }
      }
      var bit: f32 = 0.0;
      if (maxDelta > -1e29) {
        if (epsH == 0.0) {
          bit = select(0.0, 1.0, maxDelta > 0.0);
        } else {
          bit = clamp(0.5 + maxDelta * invTwoEps, 0.0, 1.0);
        }
      }
    `;
  }
  if (mode === "soft") {
    // Soft penumbra: max slope to the horizon, smoothstep over
    // [tanAltBot, tanAltTop]. The effectiveAltDeg < halfWidthDeg clamp
    // is baked into tanAltBot on the JS side (see packUniforms call
    // site / `softParams`), so the shader only does the smoothstep.
    return /* wgsl */ `
      var bestTan: f32 = -1e30;
      for (var i: i32 = 0; i <= hullPtr; i = i + 1) {
        let dxW = (f32(cx) - hullCx[i]) * dStep;
        if (dxW <= 0.0) { continue; }
        let tanI = (hullH[i] - hRay) / dxW;
        if (tanI > bestTan) { bestTan = tanI; }
      }
      var bit: f32 = 0.0;
      if (bestTan > u.tanAltBot) {
        var tt: f32 = (bestTan - u.tanAltBot) * u.invTanRange;
        if (tt > 1.0) { tt = 1.0; }
        bit = tt * tt * (3.0 - 2.0 * tt);
      }
    `;
  }
  // LSAO: max sin α, deposit either cos²α = 1 − sin²α (Lambertian)
  // or exp(−sin α) (Naaji's original). Early-continue when dz <= 0
  // matches sweep-core.js exactly so a target on a ridge isn't pulled
  // down by lower blockers behind it.
  const finalBit =
    lsaoFalloff === "exp" ? `exp(-bestSin)` : `1.0 - bestSin * bestSin`;
  return /* wgsl */ `
    var bestSin: f32 = 0.0;
    for (var i: i32 = 0; i <= hullPtr; i = i + 1) {
      let cxi = hullCx[i];
      if (cxi >= f32(cx)) { continue; }
      let horiz = (f32(cx) - cxi) * dStep;
      let dz = hullH[i] - hRay;
      if (dz <= 0.0) { continue; }
      let len3 = sqrt(horiz * horiz + dz * dz);
      let s = dz / len3;
      if (s > bestSin) { bestSin = s; }
    }
    let bit: f32 = ${finalBit};
  `;
}

// Build the full WGSL source for one (mode, prewarm, lsaoFalloff) permutation.
function buildComputeWGSL({ mode, prewarm, lsaoFalloff }) {
  // `prewarm` is honoured for every mode, including LSAO. The caller
  // is responsible for deciding whether it's the right trade-off:
  // LSAO with prewarm introduces a within-tile gradient near the
  // sun-facing edge (parent blockers contribute graded cos²α out to
  // ~16 pixels), but it also gives cross-tile continuity. The
  // single-tile notebook figure keeps it off to showcase the clean
  // kernel; the slippy-map tile viewer turns it on so AO doesn't
  // produce visible seams between tiles.
  const hasWarmup = !!prewarm;
  // Even when prewarm is off we still bind an `array<f32>` at slot 3
  // because Vulkan-style backends complain about absent bindings.
  // The allocation can be a 4-byte stub (see `createHorizonStubBuffer`).
  return /* wgsl */ `
    override workgroupSize: u32 = 64u;

    ${UNIFORMS_WGSL}

    @group(0) @binding(0) var<uniform> u: Uniforms;
    @group(0) @binding(1) var<storage, read> elev: array<f32>;
    @group(0) @binding(2) var<storage, read_write> shadow: array<atomic<u32>>;
    @group(0) @binding(3) var<storage, read> horizon: array<f32>;

    ${HELPERS_WGSL}

    @compute @workgroup_size(workgroupSize)
    fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
      let b = u.bMin + i32(gid.x);
      if (b > u.bMax) { return; }

      var hullCx: array<f32, HULL_SIZE>;
      var hullH: array<f32, HULL_SIZE>;
      var hullPtr: i32 = -1;

      let vh = i32(u.viewH);
      let vw = i32(u.viewW);
      let hullMax: i32 = i32(HULL_SIZE) - 1;

      // Where does this ray first enter the comp view [0, viewH)?
      // Mirrors sweep-core.js cxEntry.
      var cxEntry: i32 = 0;
      if (b < 0 && u.slope > 0.0) {
        let raw = i32(ceil(f32(-b) / u.slope));
        cxEntry = min(vw, raw);
      } else if (b < 0) {
        cxEntry = vw;
      }

      ${warmupBlock(hasWarmup, mode, lsaoFalloff)}

      for (var cx: i32 = cxEntry; cx < vw; cx = cx + 1) {
        let y = f32(b) + u.slope * f32(cx);
        let yi = i32(floor(y));
        let fy = y - f32(yi);
        let yj = yi + 1;
        let loIn = yi >= 0 && yi < vh;
        let hiIn = yj >= 0 && yj < vh;
        if (!(loIn || hiIn)) { break; }

        var iLo: u32 = 0u;
        var iHi: u32 = 0u;
        if (loIn) { iLo = toOrig(cx, yi); }
        if (hiIn) { iHi = toOrig(cx, yj); }

        var hLo: f32 = 0.0;
        var hHi: f32 = 0.0;
        if (loIn) { hLo = elev[iLo]; } else { hLo = elev[iHi]; }
        if (hiIn) { hHi = elev[iHi]; } else { hHi = hLo; }
        let hRay = (1.0 - fy) * hLo + fy * hHi;

        // Per-target pxSize and its derived sweep constants, from the
        // target pixel's own original row. Mirrors the CPU
        // updateTargetPx path in sweep-core.js.
        let targetRow: i32 = select(yj, yi, loIn);
        let pxSize = targetPxSize(cx, targetRow);
        let dStep = pxSize * sqrt(1.0 + u.slope * u.slope);
        let epsH = 0.5 * pxSize * u.tanAlt;
        let invTwoEps = select(0.0, 1.0 / (2.0 * epsH), epsH > 0.0);

        // Mode-specific hull scan → \`bit\` in [0, 1].
        ${modeKernelWGSL(mode, lsaoFalloff)}

        // Push-time prune for the current pixel.
        let cxF2 = f32(cx);
        loop {
          if (hullPtr < 1) { break; }
          let ax = hullCx[hullPtr - 1];
          let ay = hullH[hullPtr - 1];
          let bx = hullCx[hullPtr];
          let by = hullH[hullPtr];
          let crossM = (bx - ax) * (hRay - ay) - (by - ay) * (cxF2 - ax);
          if (crossM < 0.0) { break; }
          hullPtr = hullPtr - 1;
        }
        hullPtr = min(hullPtr + 1, hullMax);
        hullCx[hullPtr] = cxF2;
        hullH[hullPtr] = hRay;

        // Atomic deposit. Multiplying \`bit * weight * fpScale\` once
        // before the round keeps cumulative rounding error to one ULP
        // per sample regardless of how many samples are averaged.
        let contrib = bit * u.weight;
        let depLo = u32(round((1.0 - fy) * contrib * u.fpScale));
        let depHi = u32(round(fy * contrib * u.fpScale));
        if (loIn) { atomicAdd(&shadow[iLo], depLo); }
        if (hiIn) { atomicAdd(&shadow[iHi], depHi); }
      }
    }
  `;
}

// Render shader permutations.
//
//   'shaded'     — hypsometric base × (1 − 0.94 · shade). Used for
//                  hard and soft shadows.
//   'lsao'       — uniform gray base, atan-tonemapped contrast knob,
//                  matching the CPU LSAO figure exactly.
const renderUniformsWGSL = /* wgsl */ `
  struct RenderUniforms {
    N: u32,
    hMin: f32,
    hRange: f32,
    fpScale: f32,
    contrast: f32,
    pad0: f32,
    pad1: f32,
    pad2: f32,
  };

  @group(0) @binding(0) var<storage, read> shadow: array<u32>;
  @group(0) @binding(1) var<storage, read> elev: array<f32>;
  @group(0) @binding(2) var<uniform> ru: RenderUniforms;

  @vertex
  fn vs_main(@builtin(vertex_index) idx: u32) -> @builtin(position) vec4<f32> {
    var pos = array<vec2<f32>, 3>(
      vec2<f32>(-1.0, -1.0),
      vec2<f32>( 3.0, -1.0),
      vec2<f32>(-1.0,  3.0),
    );
    return vec4<f32>(pos[idx], 0.0, 1.0);
  }

  fn linearToSrgb(x: f32) -> f32 {
    let c = clamp(x, 0.0, 1.0);
    if (c <= 0.0031308) { return 12.92 * c; }
    return 1.055 * pow(c, 1.0 / 2.4) - 0.055;
  }
`;
export const RENDER_UNIFORM_BYTES = 32;
export function packRenderUniforms({ N, hMin, hRange, contrast = 0 }) {
  const buf = new ArrayBuffer(RENDER_UNIFORM_BYTES);
  const u32 = new Uint32Array(buf);
  const f32 = new Float32Array(buf);
  u32[0] = N;
  f32[1] = hMin;
  f32[2] = hRange || 1;
  f32[3] = FP_SCALE;
  f32[4] = contrast;
  return buf;
}

function buildRenderWGSL(displayMode) {
  const fragBody =
    displayMode === "lsao"
      ? /* wgsl */ `
        // Raw AO ∈ [0, 1] (fp-fixed sum). Apply the same atan tonemap
        // as the CPU LSAO figure: shade = 1 − ao_raw, scale by
        // s = c/(1 − c), squash with (2/π)·atan(...).
        let aoRaw = clamp(f32(shadow[idx]) / ru.fpScale, 0.0, 1.0);
        let cClamp = clamp(ru.contrast, 0.0, 0.999999);
        let s = cClamp / (1.0 - cClamp);
        let shade = 1.0 - aoRaw;
        let squashed = (2.0 / 3.14159265358979) * atan(s * shade);
        let visibility = 1.0 - squashed;
        let v = linearToSrgb(visibility);
        return vec4<f32>(v, v, v, 1.0);
      `
      : /* wgsl */ `
        let sh = clamp(f32(shadow[idx]) / ru.fpScale, 0.0, 1.0);
        let tone = clamp(0.10 + 0.80 * ((elev[idx] - ru.hMin) / ru.hRange), 0.0, 1.0);
        let lit = 1.0 - 0.94 * sh;
        let v = linearToSrgb(tone * lit);
        return vec4<f32>(v, v, v, 1.0);
      `;
  return /* wgsl */ `
    ${renderUniformsWGSL}

    @fragment
    fn fs_main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
      let coord = vec2<u32>(pos.xy);
      let idx = coord.y * ru.N + coord.x;
      ${fragBody}
    }
  `;
}

// Explicit bind group + pipeline layouts. We intentionally avoid
// `layout: "auto"` because WebGPU's auto-layout drops any binding the
// shader doesn't actually read — which was silently corrupting every
// permutation that didn't use the full binding set:
//
//   - compute with `prewarm: false` never touches `horizon` (slot 3),
//     so auto-layout removed slot 3 entirely and the notebook's
//     always-bind-four-slots code produced an invalid bind group;
//   - the LSAO render fragment never reads `elev` (slot 1), same story.
//
// Declaring one explicit layout per pipeline type keeps the external
// interface stable across permutations, so the notebook driver can use
// the same bind group entries regardless of which specialization it
// dispatches.
const computeLayoutCache = new WeakMap(); // device -> { bgl, pipelineLayout }
function getComputeLayouts(device) {
  let entry = computeLayoutCache.get(device);
  if (entry) return entry;
  const bgl = device.createBindGroupLayout({
    label: "sweepCore compute bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
    ],
  });
  const pipelineLayout = device.createPipelineLayout({
    label: "sweepCore compute pipeline layout",
    bindGroupLayouts: [bgl],
  });
  entry = { bgl, pipelineLayout };
  computeLayoutCache.set(device, entry);
  return entry;
}

export function getComputeBindGroupLayout(device) {
  return getComputeLayouts(device).bgl;
}

// Compute pipeline cache, keyed on (mode, prewarm).
const computeCache = new WeakMap(); // device -> Map<key, pipeline>
function getComputeCache(device) {
  let m = computeCache.get(device);
  if (!m) {
    m = new Map();
    computeCache.set(device, m);
  }
  return m;
}

export function getOrBuildComputePipeline({
  device,
  mode,
  prewarm,
  lsaoFalloff = "cos2",
}) {
  const falloffTag = mode === "lsao" ? lsaoFalloff : "n/a";
  const key = `${mode}|${prewarm ? 1 : 0}|${falloffTag}`;
  const cache = getComputeCache(device);
  let pipe = cache.get(key);
  if (pipe) return pipe;
  const code = buildComputeWGSL({ mode, prewarm, lsaoFalloff });
  const module = device.createShaderModule({
    code,
    label: `sweepCore-${key}`,
  });
  const { pipelineLayout } = getComputeLayouts(device);
  pipe = device.createComputePipeline({
    layout: pipelineLayout,
    compute: { module, entryPoint: "main" },
    label: `sweepCore-${key}`,
  });
  cache.set(key, pipe);
  return pipe;
}

// Explicit render layout (same rationale as the compute side — the
// LSAO fragment never reads `elev`, so auto-layout was dropping slot 1
// and producing "binding index 1 not present" validation errors when
// the notebook bind group tried to bind it).
const renderLayoutCache = new WeakMap(); // device -> { bgl, pipelineLayout }
function getRenderLayouts(device) {
  let entry = renderLayoutCache.get(device);
  if (entry) return entry;
  const bgl = device.createBindGroupLayout({
    label: "sweepCore render bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
    ],
  });
  const pipelineLayout = device.createPipelineLayout({
    label: "sweepCore render pipeline layout",
    bindGroupLayouts: [bgl],
  });
  entry = { bgl, pipelineLayout };
  renderLayoutCache.set(device, entry);
  return entry;
}

export function getRenderBindGroupLayout(device) {
  return getRenderLayouts(device).bgl;
}

// Render pipeline cache, keyed on (displayMode, format).
const renderCache = new WeakMap(); // device -> Map<key, pipeline>
function getRenderCache(device) {
  let m = renderCache.get(device);
  if (!m) {
    m = new Map();
    renderCache.set(device, m);
  }
  return m;
}

export function getOrBuildRenderPipeline({ device, format, displayMode }) {
  const key = `${displayMode}|${format}`;
  const cache = getRenderCache(device);
  let pipe = cache.get(key);
  if (pipe) return pipe;
  const code = buildRenderWGSL(displayMode);
  const module = device.createShaderModule({
    code,
    label: `render-${key}`,
  });
  const { pipelineLayout } = getRenderLayouts(device);
  pipe = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: { module, entryPoint: "vs_main" },
    fragment: { module, entryPoint: "fs_main", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
    label: `render-${key}`,
  });
  cache.set(key, pipe);
  return pipe;
}

// Thin helper: a 4-byte storage buffer to bind at slot 3 when prewarm
// is off and there's no real horizon buffer to use. Saves the notebook
// from having to track a separate "no horizon" path.
export function createHorizonStubBuffer(device) {
  return device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.STORAGE,
    label: "horizon-stub",
  });
}

// ========================================================================
// Tile-bake pipelines (normals, pack, shadow-alpha blit).
//
// These drive the GPU slippy-map tile baker in `tile-viewer.js`. They
// operate on shared "working" buffers owned by the viewer instance
// (see `createTileBakeResources` below) plus per-tile elevation +
// horizon buffers owned by each `Tile`.
//
// All three pipelines use explicit bind-group layouts for the same
// reason as the sweep pipelines — `layout: "auto"` drops unused
// bindings and ends up producing validation errors as soon as the
// shader stops reading one of them.
// ========================================================================

// ---- Normals --------------------------------------------------------
//
// Central-difference normal from the elevation grid, writing nx and ny
// to separate f32 storage buffers. Matches the CPU computeNormalsXY
// that previously lived in `tile-viewer.js`.

const normalsLayoutCache = new WeakMap();
function getNormalsLayouts(device) {
  let entry = normalsLayoutCache.get(device);
  if (entry) return entry;
  const bgl = device.createBindGroupLayout({
    label: "tileBake normals bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });
  const pipelineLayout = device.createPipelineLayout({
    label: "tileBake normals pipeline layout",
    bindGroupLayouts: [bgl],
  });
  entry = { bgl, pipelineLayout };
  normalsLayoutCache.set(device, entry);
  return entry;
}

export function getNormalsBindGroupLayout(device) {
  return getNormalsLayouts(device).bgl;
}

const normalsCode = /* wgsl */ `
struct NormalsUniforms {
  N: u32,
  tileY: u32,
  z: u32,
  eqPxSizeM: f32,
};

@group(0) @binding(0) var<uniform> nu: NormalsUniforms;
@group(0) @binding(1) var<storage, read> elev: array<f32>;
@group(0) @binding(2) var<storage, read_write> nxBuf: array<f32>;
@group(0) @binding(3) var<storage, read_write> nyBuf: array<f32>;

// Per-pixel latitude correction for pxSize. At low zoom a tile spans a
// meaningful chunk of latitude, so using a single tile-centroid pxSize
// (what we did originally) produces visible slope discontinuities at
// tile boundaries — the north edge of one tile and the south edge of
// its northern neighbour disagree on cos(lat). Computing pxSize from
// the current row's own latitude makes both sides of the seam agree.
// The seam-free equivalent for LSAO is already handled by binding the
// equatorial pxSize into that path.
const PI_F: f32 = 3.14159265358979323846;

fn pxSizeAtRow(row: u32) -> f32 {
  let worldRow = f32(nu.tileY) * f32(nu.N) + f32(row) + 0.5;
  let nFull = f32(1u << nu.z) * f32(nu.N);
  let nMerc = PI_F * (1.0 - 2.0 * worldRow / nFull);
  let lat = atan(sinh(nMerc));
  return nu.eqPxSizeM * cos(lat);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let col = gid.x;
  let row = gid.y;
  if (col >= nu.N || row >= nu.N) { return; }
  let N = nu.N;
  let Ni = i32(N);
  let cI = i32(col);
  let rI = i32(row);
  let cm = u32(max(cI - 1, 0));
  let cp = u32(min(cI + 1, Ni - 1));
  let rm = u32(max(rI - 1, 0));
  let rp = u32(min(rI + 1, Ni - 1));
  // cos(lat) varies continuously with row, so averaging the two
  // neighbouring rows' pxSize for dRow cancels the leading-order y
  // gradient of the correction. dCol is evaluated purely at this row.
  let pxThis = pxSizeAtRow(row);
  let pxN = pxSizeAtRow(rm);
  let pxS = pxSizeAtRow(rp);
  let dCol = f32(cp - cm) * pxThis;
  let dRow = f32(rp - rm) * 0.5 * (pxN + pxS);
  let eN_ = elev[rm * N + col];
  let eS_ = elev[rp * N + col];
  let eE_ = elev[row * N + cp];
  let eW_ = elev[row * N + cm];
  let mx = (eW_ - eE_) / dCol;
  let my = (eS_ - eN_) / dRow;
  let mag = sqrt(mx * mx + my * my + 1.0);
  let idx = row * N + col;
  nxBuf[idx] = mx / mag;
  nyBuf[idx] = my / mag;
}
`;

const normalsPipelineCache = new WeakMap();
export function getOrBuildNormalsPipeline(device) {
  let pipe = normalsPipelineCache.get(device);
  if (pipe) return pipe;
  const module = device.createShaderModule({
    code: normalsCode,
    label: "tileBake normals",
  });
  const { pipelineLayout } = getNormalsLayouts(device);
  pipe = device.createComputePipeline({
    label: "tileBake normals",
    layout: pipelineLayout,
    compute: { module, entryPoint: "main" },
  });
  normalsPipelineCache.set(device, pipe);
  return pipe;
}

// ---- Pack -----------------------------------------------------------
//
// Combines the per-pixel working buffers (nx, ny, ao-atomic, shadow-
// atomic) into a packed u32 rgba8 buffer that can be copied into a
// `rgba8unorm` texture via `copyBufferToTexture`. Also applies the
// AO_GAMMA (=4) post-process that used to run on CPU in
// `tile-viewer.js`. The atomic sweep output buffers are bound here as
// plain read-only `array<u32>` — same underlying buffer, different
// access qualifier in the bind-group layout.

const packLayoutCache = new WeakMap();
function getPackLayouts(device) {
  let entry = packLayoutCache.get(device);
  if (entry) return entry;
  const bgl = device.createBindGroupLayout({
    label: "tileBake pack bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });
  const pipelineLayout = device.createPipelineLayout({
    label: "tileBake pack pipeline layout",
    bindGroupLayouts: [bgl],
  });
  entry = { bgl, pipelineLayout };
  packLayoutCache.set(device, entry);
  return entry;
}

export function getPackBindGroupLayout(device) {
  return getPackLayouts(device).bgl;
}

const packCode = /* wgsl */ `
struct PackUniforms {
  N: u32,
  fpScale: f32,
  aoGamma: f32,
  pad0: f32,
};

@group(0) @binding(0) var<uniform> pu: PackUniforms;
@group(0) @binding(1) var<storage, read> nxBuf: array<f32>;
@group(0) @binding(2) var<storage, read> nyBuf: array<f32>;
@group(0) @binding(3) var<storage, read> aoBuf: array<u32>;
@group(0) @binding(4) var<storage, read> shadowBuf: array<u32>;
@group(0) @binding(5) var<storage, read_write> packed: array<u32>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let col = gid.x;
  let row = gid.y;
  if (col >= pu.N || row >= pu.N) { return; }
  let idx = row * pu.N + col;
  let nxv = clamp((nxBuf[idx] + 1.0) * 127.5, 0.0, 255.0);
  let nyv = clamp((nyBuf[idx] + 1.0) * 127.5, 0.0, 255.0);
  let aoRaw = clamp(f32(aoBuf[idx]) / pu.fpScale, 0.0, 1.0);
  let aoGamma = pow(aoRaw, pu.aoGamma);
  let shadowRaw = clamp(f32(shadowBuf[idx]) / pu.fpScale, 0.0, 1.0);
  let r = u32(round(nxv));
  let g = u32(round(nyv));
  let b = u32(round(clamp(aoGamma * 255.0, 0.0, 255.0)));
  let a = u32(round(clamp(shadowRaw * 255.0, 0.0, 255.0)));
  packed[idx] = (a << 24u) | (b << 16u) | (g << 8u) | r;
}
`;

const packPipelineCache = new WeakMap();
export function getOrBuildPackPipeline(device) {
  let pipe = packPipelineCache.get(device);
  if (pipe) return pipe;
  const module = device.createShaderModule({
    code: packCode,
    label: "tileBake pack",
  });
  const { pipelineLayout } = getPackLayouts(device);
  pipe = device.createComputePipeline({
    label: "tileBake pack",
    layout: pipelineLayout,
    compute: { module, entryPoint: "main" },
  });
  packPipelineCache.set(device, pipe);
  return pipe;
}

// ---- Alpha blit -----------------------------------------------------
//
// Fullscreen fragment that reads a working u32 shadow buffer and writes
// vec4(0, 0, 0, shadow_raw) into the attached tile texture. The render
// pipeline is created with `writeMask: GPUColorWrite.ALPHA`, so the
// tile texture's RGB channels (holding normals + AO) stay intact. This
// is the sun-change shadow re-bake path — normals and AO are baked once
// per tile lifetime, and only the alpha channel updates as the sun
// moves.

const alphaLayoutCache = new WeakMap();
function getAlphaLayouts(device) {
  let entry = alphaLayoutCache.get(device);
  if (entry) return entry;
  const bgl = device.createBindGroupLayout({
    label: "tileBake alpha bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
    ],
  });
  const pipelineLayout = device.createPipelineLayout({
    label: "tileBake alpha pipeline layout",
    bindGroupLayouts: [bgl],
  });
  entry = { bgl, pipelineLayout };
  alphaLayoutCache.set(device, entry);
  return entry;
}

export function getAlphaBindGroupLayout(device) {
  return getAlphaLayouts(device).bgl;
}

const alphaCode = /* wgsl */ `
struct AlphaUniforms {
  N: u32,
  fpScale: f32,
  pad0: f32,
  pad1: f32,
};

@group(0) @binding(0) var<uniform> au: AlphaUniforms;
@group(0) @binding(1) var<storage, read> shadowBuf: array<u32>;

@vertex
fn vs_main(@builtin(vertex_index) idx: u32) -> @builtin(position) vec4<f32> {
  var pos = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 3.0, -1.0),
    vec2<f32>(-1.0,  3.0),
  );
  return vec4<f32>(pos[idx], 0.0, 1.0);
}

@fragment
fn fs_main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  let coord = vec2<u32>(pos.xy);
  let idx = coord.y * au.N + coord.x;
  let shadowRaw = clamp(f32(shadowBuf[idx]) / au.fpScale, 0.0, 1.0);
  return vec4<f32>(0.0, 0.0, 0.0, shadowRaw);
}
`;

const alphaPipelineCache = new WeakMap();
export function getOrBuildAlphaBlitPipeline(device) {
  let pipe = alphaPipelineCache.get(device);
  if (pipe) return pipe;
  const module = device.createShaderModule({
    code: alphaCode,
    label: "tileBake alpha-blit",
  });
  const { pipelineLayout } = getAlphaLayouts(device);
  pipe = device.createRenderPipeline({
    label: "tileBake alpha-blit",
    layout: pipelineLayout,
    vertex: { module, entryPoint: "vs_main" },
    fragment: {
      module,
      entryPoint: "fs_main",
      targets: [{
        format: "rgba8unorm",
        writeMask: GPUColorWrite.ALPHA,
      }],
    },
    primitive: { topology: "triangle-list" },
  });
  alphaPipelineCache.set(device, pipe);
  return pipe;
}

// ---- Shared tile-bake working resources -----------------------------
//
// One instance per tile viewer, created when the viewer comes up. All
// working buffers are cleared or fully overwritten per tile bake so
// they can be reused across tiles within a single command encoder.
// Inter-tile dependencies flow through the buffers themselves, so the
// WebGPU driver inserts the right barriers automatically.

export const TILE_BAKE_UNIFORM_POOL_SIZE = 32;

export function createTileBakeResources(device, { N = 256 } = {}) {
  const bufferSize = N * N * 4;
  const uniformPool = [];
  for (let i = 0; i < TILE_BAKE_UNIFORM_POOL_SIZE; i++) {
    uniformPool.push(device.createBuffer({
      size: UNIFORM_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: `tileBake.sweepUniform[${i}]`,
    }));
  }
  const small = (label) => device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    label,
  });
  return {
    N,
    uniformPool,
    workingNx: device.createBuffer({
      size: bufferSize, usage: GPUBufferUsage.STORAGE, label: "tileBake.workingNx",
    }),
    workingNy: device.createBuffer({
      size: bufferSize, usage: GPUBufferUsage.STORAGE, label: "tileBake.workingNy",
    }),
    workingAo: device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: "tileBake.workingAo",
    }),
    workingShadow: device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: "tileBake.workingShadow",
    }),
    workingPacked: device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      label: "tileBake.workingPacked",
    }),
    normalsUniform: small("tileBake.normalsUniform"),
    packUniform: small("tileBake.packUniform"),
    alphaUniform: small("tileBake.alphaUniform"),
    horizonStub: createHorizonStubBuffer(device),
  };
}

// Convenience: derive the canonical sweep transform + per-mode constants
// the same way the CPU `sweepCore` does, so the notebook driver can
// hand the result straight into `packUniforms` without duplicating the
// trig / clamp logic across modes.
// Build the sweep params. pxSize is specified one of two ways:
//   * scalar `pxSizeM` — flat mode, used by the single-tile figures
//     where every pixel has the same pxSize. The shader treats the
//     whole tile as if at a single latitude.
//   * `{ eqPxSizeM, tileY, z }` — Mercator mode, used by the tile
//     viewer. The shader derives per-row cos(lat) from (tileY, z) and
//     multiplies the equatorial pxSize for each target's own row, so
//     slopes and horizon angles stay continuous across tile seams.
export function deriveSweepParams({
  W, H, azDeg, pxSizeM, mode,
  eqPxSizeM, tileY, z,
  altDeg = 0, sunRadiusDeg = 0, weight = 1,
  horizonN = 0,
  parentScale = 2,
  compElevMin = null,
  horizonElevMax = null,
}) {
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
  const bMin = -Math.ceil(slope * (viewW - 1));
  const bMax = viewH - 1;

  const tanAlt = Math.tan((altDeg * Math.PI) / 180);

  const halfWidthDeg = 1.5 * sunRadiusDeg;
  const effectiveAltDeg = altDeg < halfWidthDeg ? halfWidthDeg : altDeg;
  const tanAltBot = Math.tan(((effectiveAltDeg - halfWidthDeg) * Math.PI) / 180);
  const tanAltTop = Math.tan(((effectiveAltDeg + halfWidthDeg) * Math.PI) / 180);

  const useMercator = eqPxSizeM !== undefined;
  const outEqPxSizeM = useMercator ? eqPxSizeM : (pxSizeM || 0);

  // Elevation-bound warmup trim. See sweep-core.js for the full
  // derivation; this is the same formula running on the CPU side so
  // the packed uniform `warmupSteps` matches what sweepCore would
  // compute internally. LSAO is a horizon-slope scan with no
  // shallowest-angle cutoff, so the trim doesn't apply and we fall
  // back to the full margin.
  const fullWarmup = (W * parentScale) >> 1;
  let warmupSteps = fullWarmup;
  if (
    horizonN > 0 &&
    mode !== "lsao" &&
    compElevMin !== null && compElevMin !== undefined &&
    horizonElevMax !== null && horizonElevMax !== undefined
  ) {
    const dh = horizonElevMax - compElevMin;
    if (dh <= 0) {
      warmupSteps = 0;
    } else {
      const tanMin = mode === "hard" ? tanAlt : tanAltBot;
      if (tanMin > 0) {
        // Conservative pxMin: we want the walk to cover the full
        // physical shadow distance in every row, so we need the
        // SMALLEST pxSize on the tile (smallest metres-per-pixel ⇒
        // most pixels per metre ⇒ longest walk in pixel units). In
        // Mercator mode that's at the pole-side y-edge; in flat mode
        // pxSize is uniform.
        let pxMin = outEqPxSizeM;
        if (useMercator && z !== undefined) {
          const nFull = (1 << z) * H;
          const latAtRow = (r) => {
            const worldRow = (tileY || 0) * H + r + 0.5;
            const nMerc = Math.PI * (1 - (2 * worldRow) / nFull);
            return Math.atan(Math.sinh(nMerc));
          };
          const lat0 = latAtRow(0);
          const latH = latAtRow(H - 1);
          const maxAbsLat = Math.max(Math.abs(lat0), Math.abs(latH));
          pxMin = outEqPxSizeM * Math.cos(maxAbsLat);
        }
        const maxDistM = dh / tanMin;
        const maxDistPx = Math.ceil(maxDistM / pxMin);
        if (maxDistPx < warmupSteps) warmupSteps = Math.max(0, maxDistPx);
      }
    }
  }

  return {
    W, H, viewW, viewH,
    swap, flipX, flipY,
    slope,
    bMin, bMax,
    tanAlt,
    tanAltBot, tanAltTop,
    weight,
    horizonN,
    tileY: tileY || 0,
    z: z || 0,
    useMercator: useMercator ? 1 : 0,
    eqPxSizeM: outEqPxSizeM,
    parentScale,
    warmupSteps,
  };
}

// Backward-compatible helper kept for any caller that still uses the
// old monolithic API. Builds the hard-shadow + prewarm pipeline plus
// the shaded render pipeline, plus shared uniform buffers.
export function createWebGPUPipelines({ device, format }) {
  const computePipeline = getOrBuildComputePipeline({
    device, mode: "hard", prewarm: true,
  });
  const renderPipeline = getOrBuildRenderPipeline({
    device, format, displayMode: "shaded",
  });
  const uniformBuffer = device.createBuffer({
    size: UNIFORM_BYTES,
    usage:
      GPUBufferUsage.UNIFORM |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC,
    label: "sweepCore compute uniforms",
  });
  const renderUniformBuffer = device.createBuffer({
    size: RENDER_UNIFORM_BYTES,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    label: "sweepCore render uniforms",
  });
  return {
    computePipeline,
    renderPipeline,
    uniformBuffer,
    renderUniformBuffer,
    FP_SCALE,
  };
}
