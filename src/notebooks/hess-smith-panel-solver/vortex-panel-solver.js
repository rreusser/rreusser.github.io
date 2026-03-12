import computeWinding from './compute-winding.js';

// Simple LUP factorization and solve for dense matrices
// A is modified in-place to contain L and U factors
function lupFactorize(A, P, n) {
  for (let i = 0; i < n; i++) P[i] = i;

  for (let k = 0; k < n; k++) {
    // Find pivot
    let maxVal = 0;
    let maxIdx = k;
    for (let i = k; i < n; i++) {
      const absVal = Math.abs(A[i * n + k]);
      if (absVal > maxVal) {
        maxVal = absVal;
        maxIdx = i;
      }
    }

    // Swap rows
    if (maxIdx !== k) {
      const tmp = P[k]; P[k] = P[maxIdx]; P[maxIdx] = tmp;
      for (let j = 0; j < n; j++) {
        const t = A[k * n + j];
        A[k * n + j] = A[maxIdx * n + j];
        A[maxIdx * n + j] = t;
      }
    }

    // Compute L and U
    for (let i = k + 1; i < n; i++) {
      A[i * n + k] /= A[k * n + k];
      for (let j = k + 1; j < n; j++) {
        A[i * n + j] -= A[i * n + k] * A[k * n + j];
      }
    }
  }
}

function lupSolve(A, P, b, x, n) {
  // Forward substitution: solve Ly = Pb
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    y[i] = b[P[i]];
    for (let j = 0; j < i; j++) {
      y[i] -= A[i * n + j] * y[j];
    }
  }

  // Backward substitution: solve Ux = y
  for (let i = n - 1; i >= 0; i--) {
    x[i] = y[i];
    for (let j = i + 1; j < n; j++) {
      x[i] -= A[i * n + j] * x[j];
    }
    x[i] /= A[i * n + i];
  }
}

export default function solveVortexPanel({ geometry, kuttaCondition = true, vInf, alpha } = {}) {
  const { x, y } = geometry;
  const theta = [];
  const xi = [];
  const yi = [];

  const n = x.length - 1;

  // Precompute geometry data: panel midpoints and angles
  for (let i = 0; i < n; i++) {
    xi[i] = 0.5 * (x[i] + x[i + 1]);
    yi[i] = 0.5 * (y[i] + y[i + 1]);
    const ty = y[i + 1] - y[i];
    const tx = x[i + 1] - x[i];
    theta[i] = Math.atan2(ty, tx);
  }

  const dim = kuttaCondition ? n + 1 : n;
  const A = new Float64Array(dim * dim);
  const b = new Float64Array(dim);
  const al = alpha * Math.PI / 180;

  const winding = computeWinding(x, y);

  for (let i = 0; i < n; i++) {
    const thi = theta[i];
    for (let j = 0; j < n; j++) {
      const rij = Math.sqrt((xi[i] - x[j]) ** 2 + (yi[i] - y[j]) ** 2);
      const rij1 = Math.sqrt((xi[i] - x[j + 1]) ** 2 + (yi[i] - y[j + 1]) ** 2);
      const thj = theta[j];

      let bij = Math.PI * winding;
      if (i !== j) {
        const dx1 = xi[i] - x[j];
        const dx2 = xi[i] - x[j + 1];
        const dy1 = yi[i] - y[j];
        const dy2 = yi[i] - y[j + 1];
        const det = dx1 * dy2 - dx2 * dy1;
        const dot = dx2 * dx1 + dy2 * dy1;
        bij = Math.atan2(det, dot);
      }

      const sij = Math.sin(thi - thj);
      const cij = Math.cos(thi - thj);
      const lij = Math.log(rij1 / rij);
      const c = 0.5 / Math.PI;

      A[i * dim + j] = c * (sij * lij + cij * bij);

      if (kuttaCondition) {
        A[i * dim + n] += c * (cij * lij - sij * bij);
        if (i === 0 || i === n - 1) {
          A[n * dim + j] += c * (sij * bij - cij * lij);
          A[n * dim + n] += c * (sij * lij + cij * bij);
        }
      }
    }
    b[i] = vInf * Math.sin(thi - al);
  }

  if (kuttaCondition) {
    b[n] = -vInf * (Math.cos(theta[0] - al) + Math.cos(theta[n - 1] - al));
  }

  const P = new Int32Array(dim);
  lupFactorize(A, P, dim);

  const solution = new Float64Array(dim);
  lupSolve(A, P, b, solution, dim);

  return {
    data: solution,
    shape: [dim],
    get(i) { return solution[i]; }
  };
}
