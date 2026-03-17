// Costa's minimal surface mesh generator.
//
// Evaluates the Weierstrass-Enneper parametrization on a grid in the
// fundamental domain [0,1]×[0,1] of the square torus, with neighborhoods
// around the three punctures (0, 1/2, i/2) excluded.
//
// References:
//   Costa, "Example of a complete minimal immersion..." (1984)
//   Gray, "Modern Differential Geometry of Curves and Surfaces" (1993)

import { weierstrassPZeta, weierstrassPPrime, E1 } from './lib/weierstrass.js';

// Costa surface coordinate formulas:
//   x = π u / 2 − Re[ ζ(w)/2 − π ℘(w)/℘′(w) ]
//   y = π v / 2 + Im[ ζ(w)/2 + π ℘(w)/℘′(w) ]
//   z = √(2π)/4 · ln| (℘(w) − e₁) / (℘(w) + e₁) |
//
// where w = u + iv is in the fundamental domain (0,1)×(0,1).
function costaPoint(u, v) {
  const { p, zeta } = weierstrassPZeta(u, v);
  const pprime = weierstrassPPrime(u, v);

  // π ℘ / ℘′  (complex division)
  const d = pprime[0] * pprime[0] + pprime[1] * pprime[1];
  const pOverPp_r = Math.PI * (p[0] * pprime[0] + p[1] * pprime[1]) / d;
  const pOverPp_i = Math.PI * (p[1] * pprime[0] - p[0] * pprime[1]) / d;

  // x = πu/2 − Re[ ζ/2 − π℘/℘′ ]
  const x = Math.PI * u / 2 - (zeta[0] / 2 - pOverPp_r);

  // y = πv/2 + Im[ ζ/2 + π℘/℘′ ]
  const y = Math.PI * v / 2 + (zeta[1] / 2 + pOverPp_i);

  // z = √(2π)/4 · ln| (℘ − e₁) / (℘ + e₁) |
  const amr = p[0] - E1, ami = p[1];
  const bpr = p[0] + E1, bpi = p[1];
  const logRatio = 0.5 * Math.log((amr * amr + ami * ami) / (bpr * bpr + bpi * bpi));
  const z = Math.sqrt(2 * Math.PI) / 4 * logRatio;

  return [x, y, z];
}

// Distance from a point (u,v) to the nearest puncture, accounting for
// periodic identification of the unit square.
function punctureDist(u, v) {
  // Punctures: (0,0), (0.5,0), (0,0.5) and their periodic images
  let minD = Infinity;
  for (const pu of [0, 0.5, 1]) {
    for (const pv of [0, 0.5, 1]) {
      // Skip non-puncture interior points
      if (pu === 0.5 && pv === 0.5) continue;
      if (pu === 1 && pv === 0.5) continue;
      if (pu === 0.5 && pv === 1) continue;
      const du = u - pu, dv = v - pv;
      minD = Math.min(minD, du * du + dv * dv);
    }
  }
  return Math.sqrt(minD);
}

export function createCostaMesh(resolution = 200, clipRadius = 6) {
  const n = resolution;
  const eps = 0.005; // exclusion radius around punctures

  // Generate grid points, marking invalid ones
  const positions = [];
  const normals = [];
  const uvs = [];
  const valid = [];

  for (let j = 0; j <= n; j++) {
    const v = j / n;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const idx = j * (n + 1) + i;

      if (punctureDist(u, v) < eps) {
        positions.push([0, 0, 0]);
        normals.push([0, 0, 1]);
        uvs.push([u, v]);
        valid.push(false);
        continue;
      }

      const pos = costaPoint(u, v);

      if (!isFinite(pos[0]) || !isFinite(pos[1]) || !isFinite(pos[2]) ||
          Math.abs(pos[0]) > clipRadius || Math.abs(pos[1]) > clipRadius || Math.abs(pos[2]) > clipRadius) {
        positions.push([0, 0, 0]);
        normals.push([0, 0, 1]);
        uvs.push([u, v]);
        valid.push(false);
        continue;
      }

      positions.push(pos);
      normals.push([0, 0, 0]); // computed below
      uvs.push([u, v]);
      valid.push(true);
    }
  }

  // Compute normals via central differences
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const idx = j * (n + 1) + i;
      if (!valid[idx]) continue;

      const il = Math.max(i - 1, 0), ir = Math.min(i + 1, n);
      const jl = Math.max(j - 1, 0), jr = Math.min(j + 1, n);
      const idxL = j * (n + 1) + il, idxR = j * (n + 1) + ir;
      const idxD = jl * (n + 1) + i, idxU = jr * (n + 1) + i;

      if (!valid[idxL] || !valid[idxR] || !valid[idxD] || !valid[idxU]) {
        normals[idx] = [0, 0, 1]; // fallback
        continue;
      }

      const pL = positions[idxL], pR = positions[idxR];
      const pD = positions[idxD], pU = positions[idxU];

      // dpdu = pR - pL, dpdv = pU - pD
      const dux = pR[0] - pL[0], duy = pR[1] - pL[1], duz = pR[2] - pL[2];
      const dvx = pU[0] - pD[0], dvy = pU[1] - pD[1], dvz = pU[2] - pD[2];

      // cross product
      let nx = duy * dvz - duz * dvy;
      let ny = duz * dvx - dux * dvz;
      let nz = dux * dvy - duy * dvx;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (len > 1e-12) { nx /= len; ny /= len; nz /= len; }
      else { nx = 0; ny = 0; nz = 1; }

      normals[idx] = [nx, ny, nz];
    }
  }

  // Build triangles, skipping any that touch invalid vertices
  const cells = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i;
      const b = a + 1;
      const c = a + (n + 1);
      const d = c + 1;

      if (valid[a] && valid[b] && valid[d]) {
        cells.push([a, b, d]);
      }
      if (valid[a] && valid[d] && valid[c]) {
        cells.push([a, d, c]);
      }
    }
  }

  // Pack into flat typed arrays: position(3) + normal(3) + uv(2) = 8 floats
  const vertexData = new Float32Array((n + 1) * (n + 1) * 8);
  for (let idx = 0; idx < (n + 1) * (n + 1); idx++) {
    const off = idx * 8;
    vertexData[off + 0] = positions[idx][0];
    vertexData[off + 1] = positions[idx][1];
    vertexData[off + 2] = positions[idx][2];
    vertexData[off + 3] = normals[idx][0];
    vertexData[off + 4] = normals[idx][1];
    vertexData[off + 5] = normals[idx][2];
    vertexData[off + 6] = uvs[idx][0];
    vertexData[off + 7] = uvs[idx][1];
  }

  const indexData = new Uint32Array(cells.flat());

  return { vertexData, indexData, vertexCount: (n + 1) * (n + 1), indexCount: indexData.length };
}
