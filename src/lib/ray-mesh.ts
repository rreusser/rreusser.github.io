// Ray-mesh intersection utilities.
//
// buildMeshBVH: builds a BVH over the triangles of an indexed triangle mesh.
// raycastMesh:  casts a ray against the BVH, returning the nearest hit with
//               barycentric coordinates and interpolated UV.
//
// Vertex buffer layout: position(vec3f) + normal(vec3f) + uv(vec2f) = 8 floats per vertex.
// Index buffer: flat Uint32Array of triangle indices (3 per triangle).

import BVH from './bvh.js';

const VERTEX_STRIDE = 8; // floats per vertex

export interface MeshHit {
  t: number;          // ray parameter at intersection
  u: number;          // barycentric u (weight of v1)
  v: number;          // barycentric v (weight of v2)
  uv: [number, number]; // interpolated UV coordinates
  pos: [number, number, number]; // world-space hit position
  triIndex: number;   // index of the hit triangle (in units of 3 indices)
}

export function buildMeshBVH(
  vertexData: Float32Array,
  indexData: Uint32Array
): BVH {
  const triCount = indexData.length / 3;
  const aabbs = new Float64Array(triCount * 6);

  for (let t = 0; t < triCount; t++) {
    const i0 = indexData[t * 3 + 0] * VERTEX_STRIDE;
    const i1 = indexData[t * 3 + 1] * VERTEX_STRIDE;
    const i2 = indexData[t * 3 + 2] * VERTEX_STRIDE;

    const x0 = vertexData[i0], y0 = vertexData[i0 + 1], z0 = vertexData[i0 + 2];
    const x1 = vertexData[i1], y1 = vertexData[i1 + 1], z1 = vertexData[i1 + 2];
    const x2 = vertexData[i2], y2 = vertexData[i2 + 1], z2 = vertexData[i2 + 2];

    const base = t * 6;
    aabbs[base + 0] = Math.min(x0, x1, x2);
    aabbs[base + 1] = Math.min(y0, y1, y2);
    aabbs[base + 2] = Math.min(z0, z1, z2);
    aabbs[base + 3] = Math.max(x0, x1, x2);
    aabbs[base + 4] = Math.max(y0, y1, y2);
    aabbs[base + 5] = Math.max(z0, z1, z2);
  }

  return new BVH(aabbs, { maxItemsPerNode: 8 });
}

// Möller–Trumbore ray-triangle intersection.
// Returns t > 0 on hit, or -1 on miss.
// doubleSided: if false, back-face culled (det < eps → miss).
function rayTriangle(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
  doubleSided: boolean
): { t: number; u: number; v: number } | null {
  const eps = 1e-8;
  // Edge vectors
  const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
  const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
  // h = d × e2
  const hx = dy * e2z - dz * e2y;
  const hy = dz * e2x - dx * e2z;
  const hz = dx * e2y - dy * e2x;
  const det = e1x * hx + e1y * hy + e1z * hz;

  if (!doubleSided && det < eps) return null;
  if (doubleSided && Math.abs(det) < eps) return null;

  const invDet = 1 / det;
  const sx = ox - ax, sy = oy - ay, sz = oz - az;
  const u = (sx * hx + sy * hy + sz * hz) * invDet;
  if (u < 0 || u > 1) return null;

  const qx = sy * e1z - sz * e1y;
  const qy = sz * e1x - sx * e1z;
  const qz = sx * e1y - sy * e1x;
  const v = (dx * qx + dy * qy + dz * qz) * invDet;
  if (v < 0 || u + v > 1) return null;

  const t = (e2x * qx + e2y * qy + e2z * qz) * invDet;
  if (t < eps) return null;

  return { t, u, v };
}

export function raycastMesh(
  bvh: BVH,
  vertexData: Float32Array,
  indexData: Uint32Array,
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  { doubleSided = true, filter }: { doubleSided?: boolean, filter?: (hit: MeshHit) => boolean } = {}
): MeshHit | null {
  const candidates = bvh.rayIntersect(ox, oy, oz, dx, dy, dz);

  // Collect all triangle hits, then sort and filter
  const hits: MeshHit[] = [];

  for (const { index: triIndex } of candidates) {
    const i0 = indexData[triIndex * 3 + 0] * VERTEX_STRIDE;
    const i1 = indexData[triIndex * 3 + 1] * VERTEX_STRIDE;
    const i2 = indexData[triIndex * 3 + 2] * VERTEX_STRIDE;

    const hit = rayTriangle(
      ox, oy, oz, dx, dy, dz,
      vertexData[i0], vertexData[i0 + 1], vertexData[i0 + 2],
      vertexData[i1], vertexData[i1 + 1], vertexData[i1 + 2],
      vertexData[i2], vertexData[i2 + 1], vertexData[i2 + 2],
      doubleSided
    );

    if (hit) {
      const w = 1 - hit.u - hit.v;
      const uv0u = vertexData[i0 + 6], uv0v = vertexData[i0 + 7];
      const uv1u = vertexData[i1 + 6], uv1v = vertexData[i1 + 7];
      const uv2u = vertexData[i2 + 6], uv2v = vertexData[i2 + 7];
      hits.push({
        t: hit.t,
        u: hit.u,
        v: hit.v,
        uv: [w * uv0u + hit.u * uv1u + hit.v * uv2u, w * uv0v + hit.u * uv1v + hit.v * uv2v],
        pos: [ox + dx * hit.t, oy + dy * hit.t, oz + dz * hit.t],
        triIndex,
      });
    }
  }

  hits.sort((a, b) => a.t - b.t);

  if (!filter) return hits[0] ?? null;
  return hits.find(filter) ?? null;
}

// Unproject a canvas mouse position to a world-space ray.
// Uses WebGPU NDC convention: z in [0, 1] (near=0, far=1).
// projMatrix should be the same matrix uploaded to the GPU (with near/far patched in).
export function screenToRay(
  clientX: number, clientY: number,
  canvas: HTMLCanvasElement,
  viewMatrix: Float32Array,
  projMatrix: Float32Array
): { origin: [number,number,number], direction: [number,number,number] } {
  const rect = canvas.getBoundingClientRect();
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = 1 - ((clientY - rect.top) / rect.height) * 2;

  const pv = mat4Mul(projMatrix, viewMatrix);
  const invPV = mat4Inv(pv);

  // WebGPU NDC z: 0 = near plane, 1 = far plane
  const nearW = mat4MulVec4(invPV, [ndcX, ndcY, 0, 1]);
  const farW  = mat4MulVec4(invPV, [ndcX, ndcY, 1, 1]);

  const nx = nearW[0] / nearW[3];
  const ny = nearW[1] / nearW[3];
  const nz = nearW[2] / nearW[3];
  const fx = farW[0]  / farW[3];
  const fy = farW[1]  / farW[3];
  const fz = farW[2]  / farW[3];

  const ddx = fx - nx, ddy = fy - ny, ddz = fz - nz;
  const len = Math.sqrt(ddx*ddx + ddy*ddy + ddz*ddz);

  return {
    origin:    [nx, ny, nz],
    direction: [ddx/len, ddy/len, ddz/len],
  };
}

// Column-major mat4 multiply: A * B
function mat4Mul(A: Float32Array, B: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += A[k*4 + row] * B[col*4 + k];
      out[col*4 + row] = s;
    }
  }
  return out;
}

function mat4MulVec4(M: Float32Array, v: [number,number,number,number]): [number,number,number,number] {
  return [
    M[0]*v[0] + M[4]*v[1] + M[8]*v[2]  + M[12]*v[3],
    M[1]*v[0] + M[5]*v[1] + M[9]*v[2]  + M[13]*v[3],
    M[2]*v[0] + M[6]*v[1] + M[10]*v[2] + M[14]*v[3],
    M[3]*v[0] + M[7]*v[1] + M[11]*v[2] + M[15]*v[3],
  ];
}

// Invert a 4×4 matrix (column-major). Returns null if singular.
function mat4Inv(m: Float32Array): Float32Array {
  const out = new Float32Array(16);
  const
    m00=m[0],  m10=m[1],  m20=m[2],  m30=m[3],
    m01=m[4],  m11=m[5],  m21=m[6],  m31=m[7],
    m02=m[8],  m12=m[9],  m22=m[10], m32=m[11],
    m03=m[12], m13=m[13], m23=m[14], m33=m[15];

  const b00 = m00*m11 - m10*m01, b01 = m00*m21 - m20*m01;
  const b02 = m00*m31 - m30*m01, b03 = m10*m21 - m20*m11;
  const b04 = m10*m31 - m30*m11, b05 = m20*m31 - m30*m21;
  const b06 = m02*m13 - m12*m03, b07 = m02*m23 - m22*m03;
  const b08 = m02*m33 - m32*m03, b09 = m12*m23 - m22*m13;
  const b10 = m12*m33 - m32*m13, b11 = m22*m33 - m32*m23;

  const det = b00*b11 - b01*b10 + b02*b09 + b03*b08 - b04*b07 + b05*b06;
  if (Math.abs(det) < 1e-14) throw new Error('mat4Inv: singular matrix');
  const inv = 1 / det;

  out[0]  = ( m11*b11 - m21*b10 + m31*b09) * inv;
  out[1]  = (-m10*b11 + m20*b10 - m30*b09) * inv;
  out[2]  = ( m13*b05 - m23*b04 + m33*b03) * inv;
  out[3]  = (-m12*b05 + m22*b04 - m32*b03) * inv;
  out[4]  = (-m01*b11 + m21*b08 - m31*b07) * inv;
  out[5]  = ( m00*b11 - m20*b08 + m30*b07) * inv;
  out[6]  = (-m03*b05 + m23*b02 - m33*b01) * inv;
  out[7]  = ( m02*b05 - m22*b02 + m32*b01) * inv;
  out[8]  = ( m01*b10 - m11*b08 + m31*b06) * inv;
  out[9]  = (-m00*b10 + m10*b08 - m30*b06) * inv;
  out[10] = ( m03*b04 - m13*b02 + m33*b00) * inv;
  out[11] = (-m02*b04 + m12*b02 - m32*b00) * inv;
  out[12] = (-m01*b09 + m11*b07 - m21*b06) * inv;
  out[13] = ( m00*b09 - m10*b07 + m20*b06) * inv;
  out[14] = (-m03*b03 + m13*b01 - m23*b00) * inv;
  out[15] = ( m02*b03 - m12*b01 + m22*b00) * inv;

  return out;
}
