import { sweepCore } from "./sweep-core.js";

// Hard-threshold shadow for a point sun. Thin wrapper around `sweepCore`
// in 'hard' mode; see sweep-core.js for the algorithm. `horizon`/`HN`
// are optional: pass a horizon buffer for the parent-tile pre-pass
// figure (sized to PN*(parentScale+1)/parentScale per dim), or
// `null`/`0` for the simple no-prepass figure. `parentScale = 2^dz`
// must match the buffer's resolution; default 2 = original half-res
// behavior. `horizonTouched` is an optional debug buffer the pre-pass
// marks to show which parent pixels the warmup sampled.
export function sweepShadow(
  W,
  H,
  elev,
  azDeg,
  altDeg,
  pxSizeM,
  horizon,
  HN,
  horizonTouched,
  parentScale = 2,
) {
  return sweepCore({
    W,
    H,
    elev,
    azDeg,
    pxSizeM,
    mode: "hard",
    altDeg,
    horizon,
    HN,
    horizonTouched,
    parentScale,
  });
}
