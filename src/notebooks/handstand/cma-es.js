// Minimal (mu/mu_w, lambda) CMA-ES after Hansen's tutorial, deterministic
// under a seed (mulberry32 + Box-Muller). The covariance eigendecomposition
// reuses lib/evd-symmetric.js. Box constraints are handled by sample repair
// (clamping into bounds before evaluation).

import { evdSymmetric } from './lib/evd-symmetric.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussianSampler(rand) {
  let spare = null;
  return () => {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u, v, s;
    do {
      u = 2 * rand() - 1;
      v = 2 * rand() - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    const f = Math.sqrt(-2 * Math.log(s) / s);
    spare = v * f;
    return u * f;
  };
}

// objective(x) -> finite number (lower is better). Alternatively
// objectiveBatch(xs) -> Promise<number[]> evaluates a whole generation at
// once (e.g. across a worker pool); the search itself is identical and
// deterministic either way. onGeneration, if given, is called once per
// generation and may return false to stop early.
export async function cmaes({
  x0, sigma0 = 0.3, seed = 1, maxGen = 200,
  lambda = null, bounds = null,
  objective = null, objectiveBatch = null, onGeneration = null, f0 = Infinity,
}) {
  const n = x0.length;
  const lam = lambda || (4 + Math.floor(3 * Math.log(n)));
  const mu = Math.floor(lam / 2);
  const weights = new Float64Array(mu);
  let wSum = 0;
  for (let i = 0; i < mu; i++) { weights[i] = Math.log(mu + 0.5) - Math.log(i + 1); wSum += weights[i]; }
  let mueff = 0;
  for (let i = 0; i < mu; i++) { weights[i] /= wSum; mueff += weights[i] * weights[i]; }
  mueff = 1 / mueff;

  const cc = (4 + mueff / n) / (n + 4 + 2 * mueff / n);
  const cs = (mueff + 2) / (n + mueff + 5);
  const c1 = 2 / ((n + 1.3) ** 2 + mueff);
  const cmu = Math.min(1 - c1, 2 * (mueff - 2 + 1 / mueff) / ((n + 2) ** 2 + mueff));
  const damps = 1 + 2 * Math.max(0, Math.sqrt((mueff - 1) / (n + 1)) - 1) + cs;
  const chiN = Math.sqrt(n) * (1 - 1 / (4 * n) + 1 / (21 * n * n));

  const rand = mulberry32(seed);
  const gauss = gaussianSampler(rand);

  let sigma = sigma0;
  const mean = Float64Array.from(x0);
  const pc = new Float64Array(n), ps = new Float64Array(n);
  let C = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  let B = C.map((row) => row.slice());
  let D = new Float64Array(n).fill(1);
  let eigenAge = 0;
  const eigenInterval = Math.max(1, Math.floor(1 / ((c1 + cmu) * n * 10)));

  const pop = Array.from({ length: lam }, () => ({
    x: new Float64Array(n), z: new Float64Array(n), y: new Float64Array(n), f: Infinity,
  }));
  // The incumbent starts AT the start point, not above it. Given f0, no
  // generation can hand back something worse than what the search began
  // with -- which matters when a search is stopped early and its incumbent
  // is kept, because x0 is never itself sampled and would otherwise be
  // beaten by the first candidate scored, however bad.
  let best = f0;
  let bestX = Float64Array.from(x0);
  let gen = 0;
  let evals = 0;

  for (gen = 0; gen < maxGen; gen++) {
    if (eigenAge <= 0) {
      // enforce symmetry, then refresh B, D
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const v = 0.5 * (C[i][j] + C[j][i]);
          C[i][j] = v; C[j][i] = v;
        }
      }
      const [lr, , V] = evdSymmetric(C);
      for (let i = 0; i < n; i++) D[i] = Math.sqrt(Math.max(lr[i], 1e-20));
      B = V;
      eigenAge = eigenInterval;
    }
    eigenAge--;

    for (const p of pop) {
      for (let i = 0; i < n; i++) p.z[i] = gauss();
      for (let i = 0; i < n; i++) {
        let s = 0;
        for (let j = 0; j < n; j++) s += B[i][j] * D[j] * p.z[j];
        p.y[i] = s;
        p.x[i] = mean[i] + sigma * s;
      }
      if (bounds) {
        for (let i = 0; i < n; i++) {
          p.x[i] = Math.min(Math.max(p.x[i], bounds.lo[i]), bounds.hi[i]);
          p.y[i] = (p.x[i] - mean[i]) / sigma;
        }
      }
    }
    if (objectiveBatch) {
      const fs = await objectiveBatch(pop.map((p) => p.x));
      for (let i = 0; i < lam; i++) pop[i].f = fs[i];
      evals += lam;
    } else {
      for (const p of pop) { p.f = objective(p.x); evals++; }
    }
    for (const p of pop) {
      if (p.f < best) { best = p.f; bestX = p.x.slice(); }
    }
    pop.sort((a, b) => a.f - b.f);

    const oldMean = mean.slice();
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let k = 0; k < mu; k++) s += weights[k] * pop[k].x[i];
      mean[i] = s;
    }

    // ps update uses C^(-1/2) (mean shift in z-space via B D^-1 B^T)
    const dm = new Float64Array(n);
    for (let i = 0; i < n; i++) dm[i] = (mean[i] - oldMean[i]) / sigma;
    const tmp = new Float64Array(n);
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let i = 0; i < n; i++) s += B[i][j] * dm[i];
      tmp[j] = s / D[j];
    }
    const csf = Math.sqrt(cs * (2 - cs) * mueff);
    let psNorm2 = 0;
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < n; j++) s += B[i][j] * tmp[j];
      ps[i] = (1 - cs) * ps[i] + csf * s;
      psNorm2 += ps[i] * ps[i];
    }
    const psNorm = Math.sqrt(psNorm2);
    const hsig = psNorm / Math.sqrt(1 - (1 - cs) ** (2 * (gen + 1))) / chiN < 1.4 + 2 / (n + 1) ? 1 : 0;
    const ccf = Math.sqrt(cc * (2 - cc) * mueff);
    for (let i = 0; i < n; i++) pc[i] = (1 - cc) * pc[i] + hsig * ccf * dm[i];

    const c1a = c1 * (1 - (1 - hsig) * cc * (2 - cc));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let rankMu = 0;
        for (let k = 0; k < mu; k++) rankMu += weights[k] * pop[k].y[i] * pop[k].y[j];
        C[i][j] = (1 - c1a - cmu) * C[i][j] + c1 * pc[i] * pc[j] + cmu * rankMu;
      }
    }
    sigma *= Math.exp((cs / damps) * (psNorm / chiN - 1));
    if (!Number.isFinite(sigma) || sigma > 1e6) sigma = sigma0;

    if (onGeneration) {
      // pop is sorted best-first here, so a caller that wants to draw the
      // whole generation gets it ranked without re-sorting.
      const go = onGeneration({
        gen, best, bestX, sigma, meanF: pop[Math.floor(mu / 2)].f, evals,
        population: pop.map((p) => ({ x: p.x, f: p.f })),
      });
      if (go === false) break;
    }
  }
  return { best, bestX, gen, evals, sigma };
}
