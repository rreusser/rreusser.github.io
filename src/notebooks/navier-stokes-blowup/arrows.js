/**
 * Chunky arrow geometry for the walkthrough.
 *
 * Arrows are built directly in render coordinates, where +y is the axis of
 * symmetry, and share the vertex format used by the streamline tubes so the
 * same pipeline draws both: position, normal, a scalar that indexes the
 * colormap, and a phase used to run a highlight along the arrow.
 *
 * The phase attribute runs from 0 at the tail to 1 at the tip, so a pulse
 * travelling in phase reads as motion in the direction the arrow points.
 */

const TAU = Math.PI * 2;

function emptyMesh(vertexCount, indexCount) {
  return {
    positions: new Float32Array(vertexCount * 3),
    normals: new Float32Array(vertexCount * 3),
    scalars: new Float32Array(vertexCount),
    phases: new Float32Array(vertexCount),
    indices: new Uint32Array(indexCount),
    vertexCount,
    indexCount
  };
}

/** An orthonormal pair spanning the plane perpendicular to `t`. */
function frame(t) {
  const ref = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let u = [
    ref[1] * t[2] - ref[2] * t[1],
    ref[2] * t[0] - ref[0] * t[2],
    ref[0] * t[1] - ref[1] * t[0]
  ];
  const m = Math.hypot(u[0], u[1], u[2]) || 1;
  u = [u[0] / m, u[1] / m, u[2] / m];
  const v = [
    t[1] * u[2] - t[2] * u[1],
    t[2] * u[0] - t[0] * u[2],
    t[0] * u[1] - t[1] * u[0]
  ];
  return [u, v];
}

/**
 * Sweep a ring of `sides` vertices along a centreline, with a per-station
 * radius, and stitch consecutive rings. This builds both the shaft and the
 * head; a head is just a station whose radius collapses to zero.
 *
 * @param {Array<{p:number[], t:number[], r:number, phase:number}>} stations
 */
function sweep(stations, sides, scalar) {
  const n = stations.length;
  const mesh = emptyMesh(n * sides, (n - 1) * sides * 6);

  for (let i = 0; i < n; i++) {
    const { p, t, r, phase } = stations[i];
    const [u, v] = frame(t);
    for (let j = 0; j < sides; j++) {
      const a = (TAU * j) / sides;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const nx = u[0] * c + v[0] * s;
      const ny = u[1] * c + v[1] * s;
      const nz = u[2] * c + v[2] * s;
      const k = (i * sides + j) * 3;
      mesh.positions[k] = p[0] + r * nx;
      mesh.positions[k + 1] = p[1] + r * ny;
      mesh.positions[k + 2] = p[2] + r * nz;
      mesh.normals[k] = nx;
      mesh.normals[k + 1] = ny;
      mesh.normals[k + 2] = nz;
      mesh.scalars[i * sides + j] = scalar;
      mesh.phases[i * sides + j] = phase;
    }
  }

  let m = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < sides; j++) {
      const j1 = (j + 1) % sides;
      const a = i * sides + j;
      const b = i * sides + j1;
      const c = (i + 1) * sides + j;
      const d = (i + 1) * sides + j1;
      mesh.indices[m++] = a; mesh.indices[m++] = c; mesh.indices[m++] = b;
      mesh.indices[m++] = b; mesh.indices[m++] = c; mesh.indices[m++] = d;
    }
  }
  return mesh;
}

/**
 * A straight arrow from `from` to `to`: a cylindrical shaft, a shoulder where
 * the head flares out, and a point.
 */
export function straightArrow({
  from, to, radius = 0.05, headScale = 2.6, headFraction = 0.3, sides = 10, scalar = 0.5
}) {
  const d = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  if (len < 1e-6) return null;
  const t = [d[0] / len, d[1] / len, d[2] / len];

  // Keep the head a fixed fraction of the arrow, but never longer than it.
  const headLen = Math.min(len * headFraction, radius * headScale * 2.2);
  const shaftEnd = len - headLen;
  const at = (s) => [from[0] + t[0] * s, from[1] + t[1] * s, from[2] + t[2] * s];

  const stations = [
    { p: at(0), t, r: 0, phase: 0 },
    { p: at(0), t, r: radius, phase: 0 },
    { p: at(shaftEnd), t, r: radius, phase: shaftEnd / len },
    { p: at(shaftEnd), t, r: radius * headScale, phase: shaftEnd / len },
    { p: at(len), t, r: 0.0001, phase: 1 }
  ];
  return sweep(stations, sides, scalar);
}

/**
 * A curved arrow following a circular arc about the +y axis, used for swirl.
 * The arc sits at height `y` and radius `radius` from the axis.
 */
export function arcArrow({
  radius = 1, y = 0, from = 0, to = Math.PI / 2, tube = 0.05,
  headScale = 2.6, headFraction = 0.22, segments = 28, sides = 10, scalar = 0.85
}) {
  const span = to - from;
  if (Math.abs(span) < 1e-6) return null;
  const dir = Math.sign(span);
  // Cap the head by arc length rather than by angle. Without this a long sweep
  // at a large radius grows a head several times the length of the shaft.
  const maxHeadSpan = (tube * headScale * 2.2) / Math.max(radius, 1e-6);
  const headSpan = dir * Math.min(Math.abs(span) * headFraction, maxHeadSpan);
  const shaftSpan = span - headSpan;

  const point = (a) => [radius * Math.cos(a), y, radius * Math.sin(a)];
  const tangent = (a) => {
    const t = [-Math.sin(a) * dir, 0, Math.cos(a) * dir];
    return t;
  };

  const stations = [];
  stations.push({ p: point(from), t: tangent(from), r: 0, phase: 0 });
  for (let i = 0; i <= segments; i++) {
    const f = i / segments;
    const a = from + shaftSpan * f;
    stations.push({ p: point(a), t: tangent(a), r: tube, phase: f * (1 - headFraction) });
  }
  const aShoulder = from + shaftSpan;
  stations.push({ p: point(aShoulder), t: tangent(aShoulder), r: tube * headScale, phase: 1 - headFraction });
  stations.push({ p: point(to), t: tangent(to), r: 0.0001, phase: 1 });

  return sweep(stations, sides, scalar);
}

/**
 * A closed tube of revolution about the +y axis, standing in for the vortex
 * core. `profile(v)` returns [radius, y] for v in [0, 1].
 */
export function revolution({ profile, rows = 40, sides = 36, scalar = 0.45 }) {
  const mesh = emptyMesh(rows * sides, (rows - 1) * sides * 6);
  for (let i = 0; i < rows; i++) {
    const v = i / (rows - 1);
    const [r, y] = profile(v);
    // Finite difference along the profile gives the surface normal.
    const e = 1e-4;
    const [r0, y0] = profile(Math.max(0, v - e));
    const [r1, y1] = profile(Math.min(1, v + e));
    const dr = r1 - r0;
    const dy = y1 - y0;
    const m = Math.hypot(dr, dy) || 1;
    const nr = dy / m;
    const ny = -dr / m;
    for (let j = 0; j < sides; j++) {
      const a = (TAU * j) / sides;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const k = (i * sides + j) * 3;
      mesh.positions[k] = r * c;
      mesh.positions[k + 1] = y;
      mesh.positions[k + 2] = r * s;
      mesh.normals[k] = nr * c;
      mesh.normals[k + 1] = ny;
      mesh.normals[k + 2] = nr * s;
      mesh.scalars[i * sides + j] = scalar;
      mesh.phases[i * sides + j] = v;
    }
  }
  let m = 0;
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < sides; j++) {
      const j1 = (j + 1) % sides;
      const a = i * sides + j;
      const b = i * sides + j1;
      const c = (i + 1) * sides + j;
      const d = (i + 1) * sides + j1;
      mesh.indices[m++] = a; mesh.indices[m++] = c; mesh.indices[m++] = b;
      mesh.indices[m++] = b; mesh.indices[m++] = c; mesh.indices[m++] = d;
    }
  }
  return mesh;
}

/** Rewrite a mesh built with z as the symmetry axis into y-up render space. */
export function toYUp(mesh) {
  if (!mesh) return mesh;
  const { positions, normals, vertexCount } = mesh;
  for (let i = 0; i < vertexCount; i++) {
    const k = i * 3;
    const py = positions[k + 1];
    positions[k + 1] = positions[k + 2];
    positions[k + 2] = -py;
    const ny = normals[k + 1];
    normals[k + 1] = normals[k + 2];
    normals[k + 2] = -ny;
  }
  return mesh;
}
