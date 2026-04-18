// Shared HSL→RGB helper (in [0,1] channel range) so both sweep and
// render can convert a ray hue to a colour.
export function hsl2rgb01(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, bb = 0;
  if (hp < 1) { r = c; g = x; }
  else if (hp < 2) { r = x; g = c; }
  else if (hp < 3) { g = c; bb = x; }
  else if (hp < 4) { g = x; bb = c; }
  else if (hp < 5) { r = x; bb = c; }
  else { r = c; bb = x; }
  const mm = l - c / 2;
  return [r + mm, g + mm, bb + mm];
}

// Canonical sweep in octant 0: direction (+1, +m), m ∈ [0, 1].
// For an arbitrary angle we build a view transform (swap + flips) that
// reduces the direction to octant 0, then run the canonical loop and map
// each deposit back to the original buffer.
export function sweep(W, H, thetaDeg, weighted = true) {
  const theta = (thetaDeg * Math.PI) / 180;
  const dx = Math.cos(theta);
  const dy = -Math.sin(theta); // screen-space y is down
  const adx = Math.abs(dx),
    ady = Math.abs(dy);

  const swap = ady > adx; // canonicalise: |x-comp| >= |y-comp|
  const flipX = dx < 0;
  const flipY = dy < 0;
  const viewW = swap ? H : W;
  const viewH = swap ? W : H;
  const ndx = swap ? ady : adx;
  const ndy = swap ? adx : ady;
  let m = ndx === 0 ? 0 : ndy / ndx; // slope ∈ [0, 1]
  // Snap to exact 0 / 1 at cardinal / diagonal angles — cos/sin only
  // give us those values to within a few ULPs, and the residue otherwise
  // shows up as visible drift in the ray-index colouring.
  const SLOPE_EPS = 1e-12;
  if (m < SLOPE_EPS) m = 0;
  else if (m > 1 - SLOPE_EPS) m = 1;

  const accum = new Float32Array(W * H);
  const rayMap = new Int32Array(W * H).fill(-1);
  // `start[i] = 1` if pixel `i` is the first in-bounds cell any ray's
  // line passed through. Purely a function of the ray's geometry —
  // the deposition scheme has no influence on this mask.
  const start = new Uint8Array(W * H);
  // Per-pixel colour accumulators. The weighted scheme blends hues
  // between adjacent rays via the same (1−f, f) weights used for
  // accum, so the final colour at each pixel is a smooth mix of
  // the rays that touch it.
  const rAcc = new Float32Array(W * H);
  const gAcc = new Float32Array(W * H);
  const bAcc = new Float32Array(W * H);

  const toOriginal = (cx, cy) => {
    let ox = swap ? cy : cx;
    let oy = swap ? cx : cy;
    if (flipX) ox = W - 1 - ox;
    if (flipY) oy = H - 1 - oy;
    return oy * W + ox;
  };

  const bMin = -Math.ceil(m * (viewW - 1));
  const bMax = viewH - 1;

  // Identify the ray that passes through the image centre so we can
  // colour it solid red. Invert toOriginal for (W/2, H/2).
  const oxC = Math.floor(W / 2);
  const oyC = Math.floor(H / 2);
  const oxP = flipX ? W - 1 - oxC : oxC;
  const oyP = flipY ? H - 1 - oyC : oyC;
  const cxC = swap ? oyP : oxP;
  const cyC = swap ? oxP : oyP;
  const bCenter = Math.round(cyC - m * cxC);

  let rayIdx = 0;
  for (let b = bMin; b <= bMax; b++) {
    const isCenterRay = b === bCenter;
    const hue = (rayIdx * 47) % 360;
    const [rr, gg, bb] = isCenterRay
      ? [1, 0, 0]
      : hsl2rgb01(hue, 0.25, 0.82);
    let started = false;
    for (let cx = 0; cx < viewW; cx++) {
      const y = b + m * cx;
      const yi = Math.floor(y);
      const f = y - yi;
      const yj = yi + 1;
      const loIn = yi >= 0 && yi < viewH;
      const hiIn = yj >= 0 && yj < viewH;
      if (!loIn && !hiIn) continue;
      const iLo = loIn ? toOriginal(cx, yi) : -1;
      const iHi = hiIn ? toOriginal(cx, yj) : -1;

      // Geometry-based start marking: the first cx with any cell
      // in bounds latches both (lo, hi) pixels (whichever are in
      // range) as the ray's start. Independent of deposition.
      if (!started) {
        if (iLo >= 0) start[iLo] = 1;
        if (iHi >= 0) start[iHi] = 1;
        started = true;
      }

      if (weighted) {
        // (1−f, f) split between the two bracketing rows. Accum and
        // colour both use the same weights, so pixel colours smoothly
        // blend between adjacent rays.
        if (loIn) {
          accum[iLo] += 1 - f;
          rAcc[iLo] += (1 - f) * rr;
          gAcc[iLo] += (1 - f) * gg;
          bAcc[iLo] += (1 - f) * bb;
          rayMap[iLo] = rayIdx;
        }
        if (hiIn) {
          accum[iHi] += f;
          rAcc[iHi] += f * rr;
          gAcc[iHi] += f * gg;
          bAcc[iHi] += f * bb;
          rayMap[iHi] = rayIdx;
        }
      } else {
        // Unweighted: deposit the full ray contribution into the
        // floor row only. This tiles the grid exactly once per
        // pixel for any slope m ∈ [0, 1] because adjacent rays
        // with b+1 pick up the rows this one skips, so accum
        // still sums to 1 everywhere — but there's no blending
        // between adjacent ray hues, so colour transitions are
        // step-function sharp.
        if (loIn) {
          accum[iLo] += 1;
          rAcc[iLo] += rr;
          gAcc[iLo] += gg;
          bAcc[iLo] += bb;
          rayMap[iLo] = rayIdx;
        }
      }
    }
    rayIdx++;
  }

  return { accum, rayMap, start, rAcc, gAcc, bAcc, numRays: rayIdx };
}
