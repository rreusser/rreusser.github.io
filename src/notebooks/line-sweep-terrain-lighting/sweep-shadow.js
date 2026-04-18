import { sweepCore } from "./sweep-core.js";

// Hard-threshold shadow for a point sun. Thin wrapper around `sweepCore`
// in 'hard' mode; see sweep-core.js for the algorithm. `horizon`/`HN`
// are optional: pass a half-resolution parent-tile buffer for the
// parent-tile pre-pass figure, or `null`/`0` for the simple no-prepass
// figure. `horizonTouched` is an optional debug buffer the pre-pass
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
  });
}
