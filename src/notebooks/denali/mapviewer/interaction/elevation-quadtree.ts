const LEVELS = 10;
const TOTAL_NODES = 349525;

const levelOffset = new Uint32Array(LEVELS);
{
  let pow4 = 1;
  for (let k = 0; k < LEVELS; k++) {
    levelOffset[k] = (pow4 - 1) / 3;
    pow4 *= 4;
  }
}

export function buildElevationQuadtree(elevations: Float32Array): { minElev: Float32Array; maxElev: Float32Array } {
  const minElev = new Float32Array(TOTAL_NODES);
  const maxElev = new Float32Array(TOTAL_NODES);

  const leafLevel = LEVELS - 1;
  const leafOff = levelOffset[leafLevel];
  const leafSize = 512;
  const stride = 514;

  for (let row = 0; row < leafSize; row++) {
    for (let col = 0; col < leafSize; col++) {
      const r = row + 1;
      const c = col + 1;
      const tl = elevations[r * stride + c];
      const tr = elevations[r * stride + c + 1];
      const bl = elevations[(r + 1) * stride + c];
      const br = elevations[(r + 1) * stride + c + 1];

      const idx = leafOff + row * leafSize + col;
      minElev[idx] = Math.min(tl, tr, bl, br);
      maxElev[idx] = Math.max(tl, tr, bl, br);
    }
  }

  for (let k = leafLevel - 1; k >= 0; k--) {
    const off = levelOffset[k];
    const childOff = levelOffset[k + 1];
    const size = 1 << k;
    const childSize = 1 << (k + 1);

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const idx = off + row * size + col;
        const cr = row * 2;
        const cc = col * 2;
        const c0 = childOff + cr * childSize + cc;
        const c1 = c0 + 1;
        const c2 = childOff + (cr + 1) * childSize + cc;
        const c3 = c2 + 1;

        minElev[idx] = Math.min(minElev[c0], minElev[c1], minElev[c2], minElev[c3]);
        maxElev[idx] = Math.max(maxElev[c0], maxElev[c1], maxElev[c2], maxElev[c3]);
      }
    }
  }

  return { minElev, maxElev };
}

function rayAABB(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  xmin: number, ymin: number, zmin: number,
  xmax: number, ymax: number, zmax: number
): [number, number] | null {
  let tmin: number, tmax: number;

  if (dx !== 0) {
    let t1 = (xmin - ox) / dx;
    let t2 = (xmax - ox) / dx;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = t1;
    tmax = t2;
  } else {
    if (ox < xmin || ox > xmax) return null;
    tmin = -Infinity;
    tmax = Infinity;
  }

  if (dy !== 0) {
    let t1 = (ymin - oy) / dy;
    let t2 = (ymax - oy) / dy;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
  } else {
    if (oy < ymin || oy > ymax) return null;
  }

  if (tmin! > tmax!) return null;

  if (dz !== 0) {
    let t1 = (zmin - oz) / dz;
    let t2 = (zmax - oz) / dz;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    if (t1 > tmin!) tmin = t1;
    if (t2 < tmax!) tmax = t2;
  } else {
    if (oz < zmin || oz > zmax) return null;
  }

  if (tmin! > tmax! || tmax! < 0) return null;
  return [tmin!, tmax!];
}

function rayTriangle(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  v0x: number, v0y: number, v0z: number,
  v1x: number, v1y: number, v1z: number,
  v2x: number, v2y: number, v2z: number
): number {
  const e1x = v1x - v0x, e1y = v1y - v0y, e1z = v1z - v0z;
  const e2x = v2x - v0x, e2y = v2y - v0y, e2z = v2z - v0z;

  const px = dy * e2z - dz * e2y;
  const py = dz * e2x - dx * e2z;
  const pz = dx * e2y - dy * e2x;

  const det = e1x * px + e1y * py + e1z * pz;
  if (det < 1e-10) return -1;

  const invDet = 1 / det;
  const tx = ox - v0x, ty = oy - v0y, tz = oz - v0z;
  const u = (tx * px + ty * py + tz * pz) * invDet;
  if (u < 0 || u > 1) return -1;

  const qx = ty * e1z - tz * e1y;
  const qy = tz * e1x - tx * e1z;
  const qz = tx * e1y - ty * e1x;
  const v = (dx * qx + dy * qy + dz * qz) * invDet;
  if (v < 0 || u + v > 1) return -1;

  const t = (e2x * qx + e2y * qy + e2z * qz) * invDet;
  return t > 0 ? t : -1;
}

export function rayIntersectQuadtree(
  minE: Float32Array, maxE: Float32Array, elevations: Float32Array,
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number
): { t: number; patchRow: number; patchCol: number } | null {
  let bestT = Infinity;
  let bestRow = -1;
  let bestCol = -1;

  const stack = new Int32Array(LEVELS * 4 * 3);
  let sp = 0;

  stack[sp++] = 0;
  stack[sp++] = 0;
  stack[sp++] = 0;

  const stride = 514;

  while (sp > 0) {
    const col = stack[--sp];
    const row = stack[--sp];
    const level = stack[--sp];

    const off = levelOffset[level];
    const size = 1 << level;
    const idx = off + row * size + col;

    const cellsPerNode = 512 >>> level;
    const xmin = col * cellsPerNode;
    const xmax = xmin + cellsPerNode;
    const zmin = row * cellsPerNode;
    const zmax = zmin + cellsPerNode;
    const ymin = minE[idx];
    const ymax = maxE[idx];

    const hit = rayAABB(ox, oy, oz, dx, dy, dz, xmin, ymin, zmin, xmax, ymax, zmax);
    if (!hit) continue;
    if (hit[0] >= bestT) continue;

    if (level === LEVELS - 1) {
      const r = row + 1;
      const c = col + 1;
      const tlElev = elevations[r * stride + c];
      const trElev = elevations[r * stride + c + 1];
      const blElev = elevations[(r + 1) * stride + c];
      const brElev = elevations[(r + 1) * stride + c + 1];

      let t = rayTriangle(
        ox, oy, oz, dx, dy, dz,
        col, tlElev, row,
        col, blElev, row + 1,
        col + 1, trElev, row
      );
      if (t > 0 && t < bestT) {
        bestT = t;
        bestRow = row;
        bestCol = col;
      }

      t = rayTriangle(
        ox, oy, oz, dx, dy, dz,
        col + 1, trElev, row,
        col, blElev, row + 1,
        col + 1, brElev, row + 1
      );
      if (t > 0 && t < bestT) {
        bestT = t;
        bestRow = row;
        bestCol = col;
      }
    } else {
      const childLevel = level + 1;
      const cr = row * 2;
      const cc = col * 2;
      stack[sp++] = childLevel; stack[sp++] = cr;     stack[sp++] = cc;
      stack[sp++] = childLevel; stack[sp++] = cr;     stack[sp++] = cc + 1;
      stack[sp++] = childLevel; stack[sp++] = cr + 1; stack[sp++] = cc;
      stack[sp++] = childLevel; stack[sp++] = cr + 1; stack[sp++] = cc + 1;
    }
  }

  if (bestT === Infinity) return null;
  return { t: bestT, patchRow: bestRow, patchCol: bestCol };
}
