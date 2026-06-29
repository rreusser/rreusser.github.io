// Rotation-free Kirchhoff-Love thin-shell triangle FEM for a Mobius strip.
//
// The stress-free reference is a flat rectangle (length L in u, width w in v).
// The Mobius topology is imposed purely by gluing the two short ends with a
// flip; every triangle (seam triangles included) keeps the flat-rectangle rest
// geometry, so the non-orientable gluing alone produces the elastic Mobius
// shape on energy minimization.
//
// Energy = membrane (constant-strain triangle, St. Venant-Kirchhoff, plane
// stress) + bending (discrete dihedral hinge, flat rest angle). Position-only
// DOFs, no transverse shear. Orientation-free: dihedral angles are defined
// per-edge from the two incident triangles in their stored connectivity order,
// never from a global normal field (the surface is non-orientable).
//
// Pure module: typed arrays only, no npm imports.

// ---------------------------------------------------------------------------
// Small vec3 helpers operating on flat Float64Array position buffers.
// ---------------------------------------------------------------------------

function sub(out, a, ai, b, bi) {
  out[0] = a[ai] - b[bi];
  out[1] = a[ai + 1] - b[bi + 1];
  out[2] = a[ai + 2] - b[bi + 2];
  return out;
}

function cross(out, a, b) {
  const ax = a[0], ay = a[1], az = a[2];
  const bx = b[0], by = b[1], bz = b[2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function norm(a) {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}

// ---------------------------------------------------------------------------
// Mesh generation with the Mobius flip gluing.
// ---------------------------------------------------------------------------

// Pack the interior edges of an edge map into flat hinge arrays. Returns
// { nHinges, hingeIdx (Int32Array 4*nHinges), hingeLbar, hingeAbar }.
function packHinges(edgeMap, tris, triRestUV, triRestArea) {
  const idx = [];
  const lbarArr = [];
  const abarArr = [];
  for (const rec of edgeMap.values()) {
    if (rec.tris.length !== 2) continue; // boundary edge: no hinge
    const x0 = rec.p, x1 = rec.q;
    const k0 = rec.tris[0].tri;
    const i0 = tris[k0 * 3], i1 = tris[k0 * 3 + 1], i2 = tris[k0 * 3 + 2];
    const l0 = x0 === i0 ? 0 : x0 === i1 ? 1 : 2;
    const l1 = x1 === i0 ? 0 : x1 === i1 ? 1 : 2;
    const o = k0 * 6;
    const ax = triRestUV[o + l0 * 2], ay = triRestUV[o + l0 * 2 + 1];
    const bx = triRestUV[o + l1 * 2], by = triRestUV[o + l1 * 2 + 1];
    idx.push(x0, x1, rec.tris[0].opp, rec.tris[1].opp);
    lbarArr.push(Math.hypot(bx - ax, by - ay));
    abarArr.push(triRestArea[rec.tris[0].tri] + triRestArea[rec.tris[1].tri]);
  }
  return {
    nHinges: lbarArr.length,
    hingeIdx: Int32Array.from(idx),
    hingeLbar: Float64Array.from(lbarArr),
    hingeAbar: Float64Array.from(abarArr),
  };
}

// Build the Mobius strip mesh.
//   length : rest length L around the loop
//   width  : rest width w across the strip
//   nu     : number of segments around the loop (seam glues column nu -> 0)
//   nv     : number of segments across the width
//
// Returns a model object consumed by the energy/gradient routines below.
export function createMobiusMesh({ length = 6, width = 1, nu = 60, nv = 8 } = {}) {
  nv = nv - (nv % 2);          // even nv: keeps the brick offset symmetric across the seam
  if (nv < 2) nv = 2;
  const du = length / nu;
  const dv = width / nv;
  // Brick (staggered) triangular lattice instead of square-cells-split-by-a-
  // diagonal. Odd across-rows are shifted half a cell along the length and the
  // cell diagonal alternates direction by row parity, so every triangle is
  // isosceles (base du, equal sides sqrt(du^2/4 + dv^2)) -- exactly equilateral
  // when dv = du*sqrt(3)/2 -- far less anisotropic than the old right triangles.
  // The offset is BOUNDED and symmetric under j -> nv-j (for nv even), so unlike
  // a cumulative shear it lines up across the Mobius flip and wraps with no seam
  // kink. The seam gluing itself is unchanged (column nu -> column 0, flipped).
  const rowShift = (j) => (j & 1) * 0.5 * du; // 0 on even rows, du/2 on odd rows
  const Nv = nu * (nv + 1); // unique vertices (column nu is identified with 0)

  // Unique vertex id for grid coordinate (i, j). Column nu maps back to column 0
  // with the half-twist flip j -> nv - j.
  function vid(i, j) {
    if (i === nu) {
      i = 0;
      j = nv - j;
    }
    return i * (nv + 1) + j;
  }

  // Triangles (two per quad cell), as a flat Int32Array of vertex ids.
  // Also store, per triangle, the unwrapped rest (u, v) coordinates of its
  // three corners so seam triangles get the flat continuation, not the shared
  // vertex's single rest position.
  const nT = nu * nv * 2;
  const tris = new Int32Array(nT * 3);
  const triRestUV = new Float64Array(nT * 6); // 3 corners x (u, v)
  let t = 0;

  function corner(i, j) {
    // Unwrapped rest coordinate (flat ribbon continues past the seam), with the
    // brick row stagger.
    return [i * du + rowShift(j), -0.5 * width + j * dv];
  }

  // Emit one triangle (3 vertex ids + its 3 rest-uv corners).
  function emit(v0, v1, v2, uv0, uv1, uv2) {
    tris[t * 3] = v0; tris[t * 3 + 1] = v1; tris[t * 3 + 2] = v2;
    triRestUV[t * 6] = uv0[0]; triRestUV[t * 6 + 1] = uv0[1];
    triRestUV[t * 6 + 2] = uv1[0]; triRestUV[t * 6 + 3] = uv1[1];
    triRestUV[t * 6 + 4] = uv2[0]; triRestUV[t * 6 + 5] = uv2[1];
    t++;
  }

  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const a = vid(i, j), b = vid(i + 1, j), c = vid(i + 1, j + 1), d = vid(i, j + 1);
      const uvA = corner(i, j), uvB = corner(i + 1, j);
      const uvC = corner(i + 1, j + 1), uvD = corner(i, j + 1);
      // The diagonal alternates with row parity so the staggered cell splits into
      // two isosceles triangles either way: odd rows lean one way (main diagonal
      // a-c), even rows the other (anti-diagonal b-d).
      if (j & 1) {
        emit(a, b, c, uvA, uvB, uvC);
        emit(a, c, d, uvA, uvC, uvD);
      } else {
        emit(a, b, d, uvA, uvB, uvD);
        emit(b, c, d, uvB, uvC, uvD);
      }
    }
  }

  // Per-triangle rest data: inverse of the 2x2 reference edge matrix Dm and
  // the rest area. Dm = [ r1-r0 | r2-r0 ] (columns), with r the 2D rest coords.
  const triDmInv = new Float64Array(nT * 4); // [a, b, c, d] = inv(Dm) row-major
  const triRestArea = new Float64Array(nT);
  for (let k = 0; k < nT; k++) {
    const o = k * 6;
    const r0x = triRestUV[o],     r0y = triRestUV[o + 1];
    const r1x = triRestUV[o + 2], r1y = triRestUV[o + 3];
    const r2x = triRestUV[o + 4], r2y = triRestUV[o + 5];
    const a = r1x - r0x, b = r2x - r0x;
    const c = r1y - r0y, d = r2y - r0y;
    const det = a * d - b * c;
    triRestArea[k] = 0.5 * Math.abs(det);
    const invDet = 1 / det;
    // inv(Dm) = 1/det [ [ d, -b ], [ -c, a ] ]
    triDmInv[k * 4] = d * invDet;
    triDmInv[k * 4 + 1] = -b * invDet;
    triDmInv[k * 4 + 2] = -c * invDet;
    triDmInv[k * 4 + 3] = a * invDet;
  }

  // Edge -> incident triangles, to build bending hinges. An interior edge has
  // exactly two incident triangles; the two long boundaries are free (skipped).
  const edgeMap = new Map();
  function edgeKey(p, q) {
    return p < q ? p * Nv + q : q * Nv + p;
  }
  for (let k = 0; k < nT; k++) {
    const i0 = tris[k * 3], i1 = tris[k * 3 + 1], i2 = tris[k * 3 + 2];
    const tri = [i0, i1, i2];
    for (let e = 0; e < 3; e++) {
      const p = tri[e];
      const q = tri[(e + 1) % 3];
      const opp = tri[(e + 2) % 3];
      const key = edgeKey(p, q);
      let rec = edgeMap.get(key);
      if (!rec) {
        rec = { p: Math.min(p, q), q: Math.max(p, q), tris: [] };
        edgeMap.set(key, rec);
      }
      rec.tris.push({ tri: k, opp });
    }
  }

  // Hinges, packed into flat typed arrays. The bending energy/gradient
  // iterates these on every one of the ~10^5 objective evaluations per
  // relax, so a packed layout (sequential, no per-object indirection or GC)
  // is materially faster than an array of objects. Construction itself runs
  // once, so the readable push form is fine here.
  //   hingeIdx[4h .. 4h+3] = (x0, x1) shared-edge endpoints, (x2, x3) the
  //   opposite vertices of the two incident triangles.
  //   hingeLbar[h] = rest edge length, hingeAbar[h] = sum of incident rest
  //   triangle areas.
  const hinges = packHinges(edgeMap, tris, triRestUV, triRestArea);

  // Per-unique-vertex parameter coordinates, for orientation-independent
  // coloring of the (non-orientable) surface. su in [0,1) runs once around
  // the loop; sv in [0,1] runs across the width. Following su past 1 lands on
  // the flipped sv, which is exactly the one-sided Mobius identification.
  const vertexUV = new Float64Array(Nv * 2);
  for (let i = 0; i < nu; i++)
    for (let j = 0; j <= nv; j++) {
      const id = (i * (nv + 1) + j) * 2;
      vertexUV[id] = i / nu;
      vertexUV[id + 1] = j / nv;
    }

  // Lumped (diagonal) mass: each vertex gets 1/3 of each incident rest area.
  const vertexArea = new Float64Array(Nv);
  for (let k = 0; k < nT; k++) {
    const a = triRestArea[k] / 3;
    vertexArea[tris[k * 3]] += a;
    vertexArea[tris[k * 3 + 1]] += a;
    vertexArea[tris[k * 3 + 2]] += a;
  }

  return {
    nu, nv, length, width, du, dv, Nv, nT,
    tris, triDmInv, triRestArea, ...hinges, vertexArea, vertexUV, vid,
  };
}

// Smooth analytic Mobius immersion, used only as the optimizer's initial
// guess. Scaled so the centreline length is approximately the rest length L,
// keeping the initial membrane strain small. The around-loop coordinate carries
// the same brick row stagger as the rest grid (u = i*du + (j&1)*du/2), so the
// initial triangles match their staggered rest shape and start ~strain-free.
export function initialEmbedding(model) {
  const { nu, nv, length, width, du, vid } = model;
  const X = new Float64Array(model.Nv * 3);
  const R = length / (2 * Math.PI); // centreline radius so 2*pi*R = L
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j <= nv; j++) {
      const s = ((i * du + (j & 1) * 0.5 * du) / length) * 2 * Math.PI; // brick loop angle
      const vrel = (j / nv - 0.5) * width; // [-w/2, w/2]
      const half = 0.5 * s; // half-twist over one loop
      const r = R + vrel * Math.cos(half);
      const id = vid(i, j) * 3;
      X[id] = r * Math.cos(s);
      X[id + 1] = r * Math.sin(s);
      X[id + 2] = vrel * Math.sin(half);
    }
  }
  return X;
}

// Lame parameters for plane stress from Young's modulus and Poisson ratio.
function lameParams(E, nu) {
  const lambda = (E * nu) / (1 - nu * nu);
  const mu = E / (2 * (1 + nu));
  return { lambda, mu };
}

// Plate flexural rigidity (bending modulus).
function bendingModulus(E, nu, h) {
  return (E * h * h * h) / (12 * (1 - nu * nu));
}

// ---------------------------------------------------------------------------
// Membrane energy and gradient (constant-strain triangle, St. Venant-Kirchhoff,
// plane stress). Standard FEM element: F = Ds * inv(Dm), G = 0.5 (F^T F - I),
// W = mu (G:G) + 0.5 lambda tr(G)^2, P = F S, nodal gradient = h A P Dm^{-T}.
// ---------------------------------------------------------------------------

const _e1 = new Float64Array(3);
const _e2 = new Float64Array(3);

function membrane(model, X, params, grad) {
  const { tris, triDmInv, triRestArea, nT } = model;
  const { lambda, mu } = lameParams(params.E, params.poisson);
  const h = params.thickness;
  let energy = 0;

  for (let k = 0; k < nT; k++) {
    const i0 = tris[k * 3] * 3;
    const i1 = tris[k * 3 + 1] * 3;
    const i2 = tris[k * 3 + 2] * 3;
    sub(_e1, X, i1, X, i0); // deformed edge p1 - p0
    sub(_e2, X, i2, X, i0); // deformed edge p2 - p0

    const m0 = triDmInv[k * 4];     // inv(Dm) row-major [m0 m1; m2 m3]
    const m1 = triDmInv[k * 4 + 1];
    const m2 = triDmInv[k * 4 + 2];
    const m3 = triDmInv[k * 4 + 3];

    // F (3x2) columns: F0 = e1*m0 + e2*m2 ; F1 = e1*m1 + e2*m3
    const F0x = _e1[0] * m0 + _e2[0] * m2;
    const F0y = _e1[1] * m0 + _e2[1] * m2;
    const F0z = _e1[2] * m0 + _e2[2] * m2;
    const F1x = _e1[0] * m1 + _e2[0] * m3;
    const F1y = _e1[1] * m1 + _e2[1] * m3;
    const F1z = _e1[2] * m1 + _e2[2] * m3;

    // F^T F (2x2 symmetric)
    const c00 = F0x * F0x + F0y * F0y + F0z * F0z;
    const c01 = F0x * F1x + F0y * F1y + F0z * F1z;
    const c11 = F1x * F1x + F1y * F1y + F1z * F1z;

    // Green strain G = 0.5 (C - I)
    const G00 = 0.5 * (c00 - 1);
    const G01 = 0.5 * c01;
    const G11 = 0.5 * (c11 - 1);
    const trG = G00 + G11;

    const A = triRestArea[k];
    const W = mu * (G00 * G00 + 2 * G01 * G01 + G11 * G11) + 0.5 * lambda * trG * trG;
    energy += h * A * W;

    if (!grad) continue;

    // Second Piola-Kirchhoff stress S = lambda tr(G) I + 2 mu G
    const S00 = lambda * trG + 2 * mu * G00;
    const S01 = 2 * mu * G01;
    const S11 = lambda * trG + 2 * mu * G11;

    // First Piola-Kirchhoff P (3x2) = F S
    const P0x = F0x * S00 + F1x * S01;
    const P0y = F0y * S00 + F1y * S01;
    const P0z = F0z * S00 + F1z * S01;
    const P1x = F0x * S01 + F1x * S11;
    const P1y = F0y * S01 + F1y * S11;
    const P1z = F0z * S01 + F1z * S11;

    // Gradient wrt Ds columns = h A * P * inv(Dm)^T.
    // inv(Dm)^T = [ m0 m2 ; m1 m3 ]. g0 = P0*m0 + P1*m1 ; g1 = P0*m2 + P1*m3.
    const hA = h * A;
    const g1x = hA * (P0x * m0 + P1x * m1);
    const g1y = hA * (P0y * m0 + P1y * m1);
    const g1z = hA * (P0z * m0 + P1z * m1);
    const g2x = hA * (P0x * m2 + P1x * m3);
    const g2y = hA * (P0y * m2 + P1y * m3);
    const g2z = hA * (P0z * m2 + P1z * m3);

    // dE/dp1 = g1, dE/dp2 = g2, dE/dp0 = -(g1 + g2)
    grad[i1] += g1x; grad[i1 + 1] += g1y; grad[i1 + 2] += g1z;
    grad[i2] += g2x; grad[i2 + 1] += g2y; grad[i2 + 2] += g2z;
    grad[i0] -= g1x + g2x; grad[i0 + 1] -= g1y + g2y; grad[i0 + 2] -= g1z + g2z;
  }
  return energy;
}

// ---------------------------------------------------------------------------
// Bending energy and gradient (discrete dihedral hinge). Per hinge with shared
// edge (x0, x1) and opposite vertices (x2, x3):
//   N1 = (x1 - x0) x (x2 - x0)   (triangle 1 normal, unnormalized)
//   N2 = (x3 - x0) x (x1 - x0)   (triangle 2 normal; flat config -> N1 || N2)
//   theta = atan2( (N1 x N2) . e_hat , N1 . N2 )
//   E_e = D * (3 lbar^2 / Abar) * (theta - thetaBar)^2,  thetaBar = 0 (flat).
// Gradient of theta uses the standard closed forms (Bridson / Tamstorf &
// Grinspun, "Discrete bending forces and their Jacobians").
// ---------------------------------------------------------------------------

const _e = new Float64Array(3);
const _u2 = new Float64Array(3);
const _u3 = new Float64Array(3);
const _N1 = new Float64Array(3);
const _N2 = new Float64Array(3);
const _NxN = new Float64Array(3);

function bending(model, X, params, grad) {
  const { nHinges, hingeIdx, hingeLbar, hingeAbar } = model;
  const D = bendingModulus(params.E, params.poisson, params.thickness);
  let energy = 0;

  for (let hI = 0; hI < nHinges; hI++) {
    const b = hI * 4;
    const i0 = hingeIdx[b] * 3, i1 = hingeIdx[b + 1] * 3;
    const i2 = hingeIdx[b + 2] * 3, i3 = hingeIdx[b + 3] * 3;

    sub(_e, X, i1, X, i0);   // e  = x1 - x0
    sub(_u2, X, i2, X, i0);  // x2 - x0
    sub(_u3, X, i3, X, i0);  // x3 - x0
    cross(_N1, _e, _u2);     // N1 = e x (x2 - x0)
    cross(_N2, _u3, _e);     // N2 = (x3 - x0) x e

    const len_e = norm(_e);
    const N1sq = _N1[0] * _N1[0] + _N1[1] * _N1[1] + _N1[2] * _N1[2];
    const N2sq = _N2[0] * _N2[0] + _N2[1] * _N2[1] + _N2[2] * _N2[2];
    if (N1sq < 1e-300 || N2sq < 1e-300 || len_e < 1e-300) continue;

    const n1n2 = dot(_N1, _N2);
    cross(_NxN, _N1, _N2);
    const sinPart = dot(_NxN, _e) / len_e; // (N1 x N2).e / |e|
    const theta = Math.atan2(sinPart, n1n2);

    // Physical flexural energy (D/2) integral (2H)^2 dA. The hinge weight
    // lbar^2 / Abar is calibrated against an exactly-rolled cylinder so the
    // discrete energy converges to the continuum value (see Phase 1 gate d):
    // D is then the true plate flexural rigidity.
    const lbar = hingeLbar[hI];
    const weight = 0.5 * D * (lbar * lbar) / hingeAbar[hI];
    energy += weight * theta * theta; // thetaBar = 0

    if (!grad) continue;

    const dEdTheta = 2 * weight * theta;

    // grad_x2 theta = -|e| N1 / |N1|^2
    // grad_x3 theta = -|e| N2 / |N2|^2
    const c2 = -len_e / N1sq;
    const c3 = -len_e / N2sq;
    const g2x = c2 * _N1[0], g2y = c2 * _N1[1], g2z = c2 * _N1[2];
    const g3x = c3 * _N2[0], g3y = c3 * _N2[1], g3z = c3 * _N2[2];

    // grad_x0, grad_x1 from the standard barycentric combination:
    //   grad_x0 theta = -(1 - a2) gradX2 - (1 - a3) gradX3
    //   grad_x1 theta = -a2 gradX2 - a3 gradX3
    // with a2 = (x2 - x0).e / |e|^2 , a3 = (x3 - x0).e / |e|^2.
    const inv_e2 = 1 / (len_e * len_e);
    const a2 = dot(_u2, _e) * inv_e2;
    const a3 = dot(_u3, _e) * inv_e2;

    const g0x = -(1 - a2) * g2x - (1 - a3) * g3x;
    const g0y = -(1 - a2) * g2y - (1 - a3) * g3y;
    const g0z = -(1 - a2) * g2z - (1 - a3) * g3z;
    const g1x = -a2 * g2x - a3 * g3x;
    const g1y = -a2 * g2y - a3 * g3y;
    const g1z = -a2 * g2z - a3 * g3z;

    grad[i0] += dEdTheta * g0x; grad[i0 + 1] += dEdTheta * g0y; grad[i0 + 2] += dEdTheta * g0z;
    grad[i1] += dEdTheta * g1x; grad[i1 + 1] += dEdTheta * g1y; grad[i1 + 2] += dEdTheta * g1z;
    grad[i2] += dEdTheta * g2x; grad[i2 + 1] += dEdTheta * g2y; grad[i2 + 2] += dEdTheta * g2z;
    grad[i3] += dEdTheta * g3x; grad[i3 + 1] += dEdTheta * g3y; grad[i3 + 2] += dEdTheta * g3z;
  }
  return energy;
}

// Bending gradient via local finite differences of the exact per-hinge energy.
// Robust fallback / verification oracle for the analytic dihedral gradient.
function bendingFDGrad(model, X, params, grad) {
  const { nHinges, hingeIdx, hingeLbar, hingeAbar } = model;
  const D = bendingModulus(params.E, params.poisson, params.thickness);
  let energy = 0;
  const eps = 1e-6;

  function hingeTheta(v0, v1, v2, v3) {
    const i0 = v0 * 3, i1 = v1 * 3, i2 = v2 * 3, i3 = v3 * 3;
    sub(_e, X, i1, X, i0);
    sub(_u2, X, i2, X, i0);
    sub(_u3, X, i3, X, i0);
    cross(_N1, _e, _u2);
    cross(_N2, _u3, _e);
    const len_e = norm(_e);
    const n1n2 = dot(_N1, _N2);
    cross(_NxN, _N1, _N2);
    const sinPart = dot(_NxN, _e) / len_e;
    return Math.atan2(sinPart, n1n2);
  }

  for (let hI = 0; hI < nHinges; hI++) {
    const b = hI * 4;
    const v0 = hingeIdx[b], v1 = hingeIdx[b + 1];
    const v2 = hingeIdx[b + 2], v3 = hingeIdx[b + 3];
    const lbar = hingeLbar[hI];
    const weight = 0.5 * D * (lbar * lbar) / hingeAbar[hI];
    const th0 = hingeTheta(v0, v1, v2, v3);
    energy += weight * th0 * th0;
    if (!grad) continue;
    for (let vk = 0; vk < 4; vk++) {
      const vrt = vk === 0 ? v0 : vk === 1 ? v1 : vk === 2 ? v2 : v3;
      const base = vrt * 3;
      for (let c = 0; c < 3; c++) {
        const idx = base + c;
        const save = X[idx];
        X[idx] = save + eps;
        const tp = hingeTheta(v0, v1, v2, v3);
        X[idx] = save - eps;
        const tm = hingeTheta(v0, v1, v2, v3);
        X[idx] = save;
        grad[idx] += weight * (tp * tp - tm * tm) / (2 * eps);
      }
    }
  }
  return energy;
}

// ---------------------------------------------------------------------------
// Total energy and gradient.
//   params = { E, poisson, thickness, bendingMode? 'analytic' | 'fd' }
// ---------------------------------------------------------------------------

// Reused result object: this is called ~10^5 times per relax and most
// callers read .energy immediately (or ignore the return entirely, as the
// Newton-CG Hessian-vector products do), so a fresh object per call is pure
// GC churn. Single-threaded sequential use makes a shared scratch safe.
const _eg = { energy: 0, membrane: 0, bending: 0 };

export function energyAndGradient(model, X, params, grad) {
  if (grad) grad.fill(0);
  const em = membrane(model, X, params, grad);
  const eb = (params.bendingMode === 'fd' ? bendingFDGrad : bending)(
    model, X, params, grad,
  );
  _eg.energy = em + eb;
  _eg.membrane = em;
  _eg.bending = eb;
  return _eg;
}

export function energy(model, X, params) {
  return energyAndGradient(model, X, params, null).energy;
}

// Replicate the per-vertex lumped mass (density * thickness * vertex area)
// across the three spatial coordinates: M is diagonal of length 3 Nv.
export function lumpedMassDiagonal(model, params) {
  const { vertexArea, Nv } = model;
  const rho = params.density ?? 1;
  const h = params.thickness;
  const M = new Float64Array(Nv * 3);
  for (let v = 0; v < Nv; v++) {
    const m = rho * h * vertexArea[v];
    M[v * 3] = m;
    M[v * 3 + 1] = m;
    M[v * 3 + 2] = m;
  }
  return M;
}

// ---------------------------------------------------------------------------
// Per-vertex engineering fields, for color-mapped visualization.
// ---------------------------------------------------------------------------

// Membrane von Mises stress (plane stress), area-averaged to vertices. Uses
// the second Piola-Kirchhoff stress S of the constant-strain element, which
// is monotonic in the true stress and the natural invariant of this element.
export function membraneVonMises(model, X, params) {
  const { tris, triDmInv, triRestArea, nT, Nv } = model;
  const { lambda, mu } = lameParams(params.E, params.poisson);
  const acc = new Float64Array(Nv);
  const wsum = new Float64Array(Nv);

  for (let k = 0; k < nT; k++) {
    const i0 = tris[k * 3] * 3, i1 = tris[k * 3 + 1] * 3, i2 = tris[k * 3 + 2] * 3;
    sub(_e1, X, i1, X, i0);
    sub(_e2, X, i2, X, i0);
    const m0 = triDmInv[k * 4], m1 = triDmInv[k * 4 + 1];
    const m2 = triDmInv[k * 4 + 2], m3 = triDmInv[k * 4 + 3];
    const F0x = _e1[0]*m0 + _e2[0]*m2, F0y = _e1[1]*m0 + _e2[1]*m2, F0z = _e1[2]*m0 + _e2[2]*m2;
    const F1x = _e1[0]*m1 + _e2[0]*m3, F1y = _e1[1]*m1 + _e2[1]*m3, F1z = _e1[2]*m1 + _e2[2]*m3;
    const c00 = F0x*F0x + F0y*F0y + F0z*F0z;
    const c01 = F0x*F1x + F0y*F1y + F0z*F1z;
    const c11 = F1x*F1x + F1y*F1y + F1z*F1z;
    const G00 = 0.5 * (c00 - 1), G01 = 0.5 * c01, G11 = 0.5 * (c11 - 1);
    const trG = G00 + G11;
    const S00 = lambda * trG + 2 * mu * G00;
    const S01 = 2 * mu * G01;
    const S11 = lambda * trG + 2 * mu * G11;
    const vm = Math.sqrt(Math.max(0,
      S00 * S00 - S00 * S11 + S11 * S11 + 3 * S01 * S01));
    const A = triRestArea[k];
    for (let c = 0; c < 3; c++) {
      const v = tris[k * 3 + c];
      acc[v] += vm * A;
      wsum[v] += A;
    }
  }
  for (let v = 0; v < Nv; v++) acc[v] /= wsum[v] || 1;
  return acc;
}

// Bending energy density per vertex (hinge energy spread to incident
// vertices, divided by vertex area). Highlights where the shell bends, which
// is exactly where flexural modes localize.
export function bendingDensity(model, X, params) {
  const { nHinges, hingeIdx, hingeLbar, hingeAbar, vertexArea, Nv } = model;
  const D = bendingModulus(params.E, params.poisson, params.thickness);
  const acc = new Float64Array(Nv);
  for (let hI = 0; hI < nHinges; hI++) {
    const b = hI * 4;
    const x0 = hingeIdx[b], x1 = hingeIdx[b + 1];
    const x2 = hingeIdx[b + 2], x3 = hingeIdx[b + 3];
    const i0 = x0 * 3, i1 = x1 * 3, i2 = x2 * 3, i3 = x3 * 3;
    sub(_e, X, i1, X, i0);
    sub(_u2, X, i2, X, i0);
    sub(_u3, X, i3, X, i0);
    cross(_N1, _e, _u2);
    cross(_N2, _u3, _e);
    const len_e = norm(_e);
    if (len_e < 1e-300) continue;
    const n1n2 = dot(_N1, _N2);
    cross(_NxN, _N1, _N2);
    const theta = Math.atan2(dot(_NxN, _e) / len_e, n1n2);
    const lbar = hingeLbar[hI];
    const E_e = 0.5 * D * (lbar * lbar) / hingeAbar[hI] * theta * theta;
    acc[x0] += 0.25 * E_e; acc[x1] += 0.25 * E_e;
    acc[x2] += 0.25 * E_e; acc[x3] += 0.25 * E_e;
  }
  for (let v = 0; v < Nv; v++) acc[v] /= vertexArea[v] || 1;
  return acc;
}

// Peak bending (fiber) stress per vertex. For a Kirchhoff plate in pure
// bending the energy density is e = 1/2 D kappa^2 with flexural rigidity
// D = E h^3 / (12(1-nu^2)), and the maximum surface fiber stress is
// sigma = E h /(2(1-nu^2)) * |kappa|. Since D is calibrated as the true plate
// stiffness (Phase 1 cylinder gate), recovering kappa = sqrt(2 e / D) and
// forming sigma gives a genuine stress, consistent with the model and
// parallel to the membrane von Mises stress.
export function bendingStress(model, X, params) {
  const e = bendingDensity(model, X, params);
  const E = params.E;
  const nu = params.poisson;
  const h = params.thickness;
  const D = bendingModulus(E, nu, h);
  const P = (E * h) / (2 * (1 - nu * nu));
  const out = new Float64Array(e.length);
  for (let v = 0; v < e.length; v++) {
    out[v] = P * Math.sqrt(Math.max(0, (2 * e[v]) / D));
  }
  return out;
}

// Discrete Gaussian curvature per vertex via the angle-deficit (Gauss-Bonnet)
// estimator: K_v = (full - sum of incident triangle corner angles) / A_v, with
// full = 2*pi for interior vertices and pi for the free long-boundary vertices,
// and A_v the barycentric area (1/3 of incident deformed triangle areas).
//
// This is intrinsic, so the non-orientable gluing is irrelevant (angles are
// orientation-free) and the seam vertices get a complete angle fan through the
// glued connectivity. For a developable/ruled surface the strip is isometric to
// the flat rectangle, so every angle sum matches its flat value and K -> 0; any
// nonzero K is the discrete signature of stretching (membrane strain) or genuine
// double curvature.
//
// Boundary handling: u is periodic (column nu glued to 0), so the ONLY boundary
// vertices are the two long free edges at sv = 0 and sv = 1 (the across-width
// parameter). The angle-deficit estimator is a faithful Gaussian-curvature
// estimator only at INTERIOR vertices; at a free boundary the local Gauss-Bonnet
// deficit is dominated by the boundary's geodesic curvature (how the edge turns
// within the surface), not by Gaussian curvature, and the smaller one-sided
// vertex area inflates it further. On a near-developable strip that paints a
// bright, spurious rim. Since Gaussian curvature is continuous up to the
// boundary, its true edge value is the interior limit, so we compute the deficit
// on the interior and copy each boundary vertex from its inward neighbour (one
// row in). This removes the rim while leaving the interior field untouched.
// (Valid for createMobiusMesh, which has no short ends or corners.)
export function gaussianCurvature(model, X) {
  const { tris, nT, Nv, vertexUV, nu, nv, vid } = model;
  const angleSum = new Float64Array(Nv);
  const area = new Float64Array(Nv);

  for (let k = 0; k < nT; k++) {
    const a = tris[k * 3], b = tris[k * 3 + 1], c = tris[k * 3 + 2];
    const ax = X[a*3], ay = X[a*3+1], az = X[a*3+2];
    const bx = X[b*3], by = X[b*3+1], bz = X[b*3+2];
    const cx = X[c*3], cy = X[c*3+1], cz = X[c*3+2];

    // Edge vectors from each corner.
    const abx = bx-ax, aby = by-ay, abz = bz-az;
    const acx = cx-ax, acy = cy-ay, acz = cz-az;
    const bcx = cx-bx, bcy = cy-by, bcz = cz-bz;

    // Corner angles from normalized dot products (clamped for acos safety).
    const angA = corner(abx, aby, abz, acx, acy, acz);
    const angB = corner(-abx, -aby, -abz, bcx, bcy, bcz);
    const angC = corner(-acx, -acy, -acz, -bcx, -bcy, -bcz);
    angleSum[a] += angA; angleSum[b] += angB; angleSum[c] += angC;

    // Barycentric area share: |ab x ac| / 2 is the triangle area; each corner
    // gets a third.
    const nx = aby*acz - abz*acy, ny = abz*acx - abx*acz, nz = abx*acy - aby*acx;
    const third = Math.hypot(nx, ny, nz) / 6; // (area)/3 = (|cross|/2)/3
    area[a] += third; area[b] += third; area[c] += third;
  }

  const out = new Float64Array(Nv);
  const twoPi = 2 * Math.PI;
  for (let v = 0; v < Nv; v++) {
    const sv = vertexUV[v * 2 + 1];
    const onBoundary = sv <= 1e-9 || sv >= 1 - 1e-9;
    // Boundary deficits are unreliable (geodesic curvature, inflated area), so
    // skip them; they are overwritten from the interior below.
    out[v] = onBoundary || area[v] <= 0 ? 0 : (twoPi - angleSum[v]) / area[v];
  }
  // Copy each long-edge boundary vertex's value from its inward neighbour. nv >= 2
  // always (the across-width segment count), so row 1 and row nv-1 are interior.
  for (let i = 0; i < nu; i++) {
    out[vid(i, 0)] = out[vid(i, 1)];
    out[vid(i, nv)] = out[vid(i, nv - 1)];
  }
  return out;
}

// Interior angle at the corner whose two incident edge vectors are u and v.
function corner(ux, uy, uz, vx, vy, vz) {
  const lu = Math.sqrt(ux*ux + uy*uy + uz*uz);
  const lv = Math.sqrt(vx*vx + vy*vy + vz*vz);
  if (lu < 1e-300 || lv < 1e-300) return 0;
  const c = (ux*vx + uy*vy + uz*vz) / (lu * lv);
  return Math.acos(Math.min(1, Math.max(-1, c)));
}

// Build a regular (non-Mobius) flat strip mesh sharing the same code paths.
// Used by the correctness tests (flat un-glued rectangle must have zero
// energy and zero gradient).
export function createFlatStrip({ length = 6, width = 1, nu = 60, nv = 8 } = {}) {
  nv = nv - (nv % 2); if (nv < 2) nv = 2; // even nv, same brick lattice as createMobiusMesh
  const du = length / nu;
  const dv = width / nv;
  const rowShift = (j) => (j & 1) * 0.5 * du;
  const Nv = (nu + 1) * (nv + 1);
  function vid(i, j) { return i * (nv + 1) + j; }

  const nT = nu * nv * 2;
  const tris = new Int32Array(nT * 3);
  const triRestUV = new Float64Array(nT * 6);
  let t = 0;
  const corner = (i, j) => [i * du + rowShift(j), -0.5 * width + j * dv];
  const emit = (v0, v1, v2, uv0, uv1, uv2) => {
    tris[t * 3] = v0; tris[t * 3 + 1] = v1; tris[t * 3 + 2] = v2;
    triRestUV.set([...uv0, ...uv1, ...uv2], t * 6); t++;
  };
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const a = vid(i, j), b = vid(i + 1, j), c = vid(i + 1, j + 1), d = vid(i, j + 1);
      const uvA = corner(i, j), uvB = corner(i + 1, j),
            uvC = corner(i + 1, j + 1), uvD = corner(i, j + 1);
      if (j & 1) { emit(a, b, c, uvA, uvB, uvC); emit(a, c, d, uvA, uvC, uvD); }
      else { emit(a, b, d, uvA, uvB, uvD); emit(b, c, d, uvB, uvC, uvD); }
    }
  }
  const triDmInv = new Float64Array(nT * 4);
  const triRestArea = new Float64Array(nT);
  for (let k = 0; k < nT; k++) {
    const o = k * 6;
    const a = triRestUV[o + 2] - triRestUV[o], b = triRestUV[o + 4] - triRestUV[o];
    const c = triRestUV[o + 3] - triRestUV[o + 1], d = triRestUV[o + 5] - triRestUV[o + 1];
    const det = a * d - b * c;
    triRestArea[k] = 0.5 * Math.abs(det);
    const id = 1 / det;
    triDmInv[k * 4] = d * id; triDmInv[k * 4 + 1] = -b * id;
    triDmInv[k * 4 + 2] = -c * id; triDmInv[k * 4 + 3] = a * id;
  }
  const edgeMap = new Map();
  const ek = (p, q) => (p < q ? p * Nv + q : q * Nv + p);
  for (let k = 0; k < nT; k++) {
    const tri = [tris[k * 3], tris[k * 3 + 1], tris[k * 3 + 2]];
    for (let e = 0; e < 3; e++) {
      const p = tri[e], q = tri[(e + 1) % 3], opp = tri[(e + 2) % 3];
      const key = ek(p, q);
      let rec = edgeMap.get(key);
      if (!rec) { rec = { p: Math.min(p, q), q: Math.max(p, q), tris: [] }; edgeMap.set(key, rec); }
      rec.tris.push({ tri: k, opp });
    }
  }
  const hinges = packHinges(edgeMap, tris, triRestUV, triRestArea);
  const vertexArea = new Float64Array(Nv);
  for (let k = 0; k < nT; k++) {
    const a = triRestArea[k] / 3;
    vertexArea[tris[k * 3]] += a;
    vertexArea[tris[k * 3 + 1]] += a;
    vertexArea[tris[k * 3 + 2]] += a;
  }
  function flatEmbedding() {
    const X = new Float64Array(Nv * 3);
    for (let i = 0; i <= nu; i++)
      for (let j = 0; j <= nv; j++) {
        const id = vid(i, j) * 3;
        X[id] = i * du + rowShift(j); X[id + 1] = -0.5 * width + j * dv; X[id + 2] = 0;
      }
    return X;
  }
  return {
    nu, nv, length, width, du, dv, Nv, nT,
    tris, triDmInv, triRestArea, ...hinges, vertexArea, vid, flatEmbedding,
  };
}
