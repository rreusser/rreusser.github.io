/**
 * The scale ledger of the OpenAI finite-time blowup construction.
 *
 * Every constant and formula here is transcribed from the Lean 4 formalization
 * published alongside the manuscript (github.com/openai/NavierStokesAndEuler),
 * specifically `NavierStokes/ChartScales.lean`, `NavierStokes/SlotColoring.lean`
 * and `NavierStokes/Scaling.lean`. Nothing in this file is fitted or invented.
 */

/** `SlotColoring.coverGrowth` — the time zoom factor between native charts. */
export const COVER_GROWTH = 4 + Math.SQRT2;

/** `ChartScales.Lambda` — the spatial zoom factor between native charts. */
export const LAMBDA = 4 - Math.SQRT2;

/** `ChartScales.rho` — the self-similar exponent, r ~ t^rho. */
export const RHO = Math.log(LAMBDA) / Math.log(COVER_GROWTH);

/** `ChartScales.kappa` — the small detuning that keeps the cascade off-critical. */
export const KAPPA = 1 / 100000;

/** `SlotColoring.dyadicQ` — the dyadic parameter of generation n. */
export const dyadicQ = (n) => Math.pow(2, -n);

/** `ChartScales.S` — the polynomial slot weight S_n = n^2. */
export const slotWeight = (n) => n * n;

/** `ChartScales.radialExponent` — 2((1+h)rho - h kappa). */
export const radialExponent = (h) => 2 * ((1 + h) * RHO - h * KAPPA);

/** `SlotColoring.nativeArgument` — log_Tg(Q_n^(-1-h) / n^2). */
export function nativeArgument(h, n) {
  return (n * (1 + h) * Math.LN2 - 2 * Math.log(n)) / Math.log(COVER_GROWTH);
}

/** `SlotColoring.nativeIndex` — the natural-number floor of the above. */
export function nativeIndex(h, n) {
  return Math.max(0, Math.floor(nativeArgument(h, n)));
}

// Both chart coefficients are ratios of enormous quantities: at n = 100 the
// factor Tg^nu is around 10^38 and Q_n^(1+h) around 10^-38. Evaluating them
// separately overflows, so everything below is computed as a logarithm and
// exponentiated once, at the end.

/** log of `ChartScales.timeCoefficient` — nu log Tg + (1+h) log Q_n. */
export function logTimeCoefficient(h, n) {
  return nativeIndex(h, n) * Math.log(COVER_GROWTH) - n * (1 + h) * Math.LN2;
}

/** log of `ChartScales.radialCoefficient` — nu log Lambda + (radialExponent/2) log Q_n. */
export function logRadialCoefficient(h, n) {
  return nativeIndex(h, n) * Math.log(LAMBDA) - n * (radialExponent(h) / 2) * Math.LN2;
}

/** `ChartScales.timeCoefficient` — Tg^nu(n) * Q_n^(1+h). Asymptotically 1/n^2. */
export function timeCoefficient(h, n) {
  return Math.exp(logTimeCoefficient(h, n));
}

/** `ChartScales.radialCoefficient` — Lambda^nu(n) * Q_n^(radialExponent/2). */
export function radialCoefficient(h, n) {
  return Math.exp(logRadialCoefficient(h, n));
}

/** `Scaling.coreVelocity` — q^(-(1/2 + h)), the native core velocity scale. */
export const coreVelocity = (q, h) => Math.pow(q, -(0.5 + h));

/** `Scaling.radialLength` — q^(1/2), the native radial length scale. */
export const radialLength = (q) => Math.sqrt(q);

/** `Scaling.axialLength` — q^(1/2 - h), the native axial length scale. */
export const axialLength = (q, h) => Math.pow(q, 0.5 - h);

/** `SlotColoring.spacing` — the physical mesh 2^(-na)/n^6 at exponent a. */
export const spacing = (a, n) => Math.pow(2, -n * a) / Math.pow(n, 6);

/**
 * The physical bookkeeping of generation n, obtained by pushing the native
 * scales through the chart coefficients.
 *
 * @param {number} h  the manuscript's parameter, 0 < h < 1/2
 * @param {number} n  the generation index, n >= 1
 */
export function generation(h, n) {
  const logTau = logTimeCoefficient(h, n);
  const logR = logRadialCoefficient(h, n);
  const logQ = -n * Math.LN2;
  return {
    n,
    nu: nativeIndex(h, n),
    /** duration of the generation's time slot; sums to the blowup time */
    duration: Math.exp(logTau),
    /** physical radial core width, R_n * Q_n^(1/2) */
    radial: Math.exp(logR + 0.5 * logQ),
    /** physical axial core length, R_n * Q_n^(1/2 - h) */
    axial: Math.exp(logR + (0.5 - h) * logQ),
    /** physical core velocity, (R_n / tau_n) * Q_n^(-(1/2 + h)) */
    velocity: Math.exp(logR - logTau - (0.5 + h) * logQ),
    /** Reynolds number on the radial scale, q^(-h) */
    reynolds: Math.exp(-h * logQ),
    /** viscosity normalized by the inertial scale, q^h */
    normalizedViscosity: Math.exp(h * logQ),
    logRadial: logR + 0.5 * logQ,
    logVelocity: logR - logTau - (0.5 + h) * logQ
  };
}

/**
 * The ledger for generations 1..count, with the cumulative activation times.
 * `start` is the time the generation switches on, `end` the time it hands off.
 */
export function ledger(h, count) {
  const rows = [];
  let t = 0;
  for (let n = 1; n <= count; n++) {
    const g = generation(h, n);
    g.start = t;
    t += g.duration;
    g.end = t;
    rows.push(g);
  }
  return rows;
}

/**
 * The blowup time, the sum of every slot length. Since tau_n is asymptotically
 * 1/n^2 the series converges, and truncating at `count` leaves a tail of order
 * 1/count. The default runs far enough that the tail is below 1e-4.
 */
export function blowupTime(h, count = 20000) {
  let t = 0;
  for (let n = count; n >= 1; n--) t += timeCoefficient(h, n);
  return t;
}

/**
 * Time remaining before blowup at the start of generation n, i.e. the tail
 * sum_{m >= n} tau_m. This is the quantity that behaves like 1/n, so the
 * generation you are watching is roughly the reciprocal of the time left.
 */
export function timeRemaining(h, n, count = 20000) {
  let t = 0;
  for (let m = count; m >= n; m--) t += timeCoefficient(h, m);
  return t;
}

/**
 * Locate a time within the ledger. Returns the active generation index and the
 * fractional progress through its slot. Times past the last row clamp to the end.
 */
export function locate(rows, t) {
  for (let i = 0; i < rows.length; i++) {
    if (t < rows[i].end) {
      return { index: i, row: rows[i], frac: (t - rows[i].start) / rows[i].duration };
    }
  }
  return { index: rows.length - 1, row: rows[rows.length - 1], frac: 1 };
}
