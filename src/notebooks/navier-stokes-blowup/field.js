/**
 * The axisymmetric velocity ansatz, its streamlines, and tube geometry.
 *
 * The ansatz is transcribed from `NavierStokes/AxisymmetricFields.lean`. Profiles
 * are functions of (s, z) with s = (x^2 + y^2)/2, the vector potential is
 *
 *   A = -(1/2) y H e_0 + (1/2) x H e_1 + K e_2,
 *
 * and the velocity is its Euclidean curl. Writing the curl out gives
 *
 *   u_x = y K_s - (x/2) H_z,   u_y = -(y/2) H_z - x K_s,   u_z = H + s H_s,
 *
 * which in cylindrical components is u_r = -(r/2) H_z, u_theta = -r K_s,
 * u_z = d/ds (s H). No division by r appears, so the field is smooth on the axis.
 */

/**
 * Build a velocity field from a strain profile H and a swirl profile K.
 *
 * H = gamma * z * exp(-s/sigma) * exp(-z^2 / (2 zH^2)) generates the axial strain:
 * near the axis it reduces to u_r = -gamma r / 2, u_z = gamma z.
 *
 * K = -omega * sigma * (1 - exp(-s/sigma)) * exp(-z^2 / (2 zK^2)) generates the
 * swirl u_theta = omega r exp(-s/sigma) exp(-z^2/(2 zK^2)), solid-body near the
 * axis and decaying outside the core.
 */
export function createField({ gamma = 1, omega = 12, sigma = 0.5, zH = 1.1, zK = 0.9 } = {}) {
  const field = (x, y, z, out) => {
    const s = (x * x + y * y) / 2;
    const es = Math.exp(-s / sigma);
    const gH = Math.exp((-z * z) / (2 * zH * zH));
    const gK = Math.exp((-z * z) / (2 * zK * zK));

    const H = gamma * z * es * gH;
    const Hs = -H / sigma;
    const Hz = gamma * es * gH * (1 - (z * z) / (zH * zH));
    const Ks = -omega * es * gK;

    out[0] = y * Ks - (x / 2) * Hz;
    out[1] = -(y / 2) * Hz - x * Ks;
    out[2] = H + s * Hs;
    return out;
  };
  field.params = { gamma, omega, sigma, zH, zK };
  return field;
}

/**
 * Integrate one streamline by arc length, so samples are evenly spaced along the
 * curve regardless of how fast the fluid is moving there. The elapsed advection
 * time is accumulated separately, which is what animates motion along the tube.
 */
export function streamline(field, seed, { step = 0.01, maxSteps = 4000, bound = 6, minSpeed = 1e-4 } = {}) {
  const points = [];
  const speeds = [];
  const times = [];

  const k1 = [0, 0, 0], k2 = [0, 0, 0], k3 = [0, 0, 0], k4 = [0, 0, 0];
  const p = [seed[0], seed[1], seed[2]];
  const tmp = [0, 0, 0];
  let elapsed = 0;

  const unit = (v, out) => {
    const m = Math.hypot(v[0], v[1], v[2]);
    if (m < minSpeed) return 0;
    out[0] = v[0] / m; out[1] = v[1] / m; out[2] = v[2] / m;
    return m;
  };

  for (let i = 0; i < maxSteps; i++) {
    field(p[0], p[1], p[2], k1);
    const speed = unit(k1, k1);
    if (!speed) break;

    for (let j = 0; j < 3; j++) tmp[j] = p[j] + (step / 2) * k1[j];
    field(tmp[0], tmp[1], tmp[2], k2);
    if (!unit(k2, k2)) break;

    for (let j = 0; j < 3; j++) tmp[j] = p[j] + (step / 2) * k2[j];
    field(tmp[0], tmp[1], tmp[2], k3);
    if (!unit(k3, k3)) break;

    for (let j = 0; j < 3; j++) tmp[j] = p[j] + step * k3[j];
    field(tmp[0], tmp[1], tmp[2], k4);
    if (!unit(k4, k4)) break;

    points.push(p[0], p[1], p[2]);
    speeds.push(speed);
    times.push(elapsed);
    elapsed += step / speed;

    for (let j = 0; j < 3; j++) {
      p[j] += (step / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]);
    }
    if (Math.abs(p[0]) > bound || Math.abs(p[1]) > bound || Math.abs(p[2]) > bound) break;
  }

  return { points, speeds, times, count: speeds.length };
}

/**
 * Seed streamlines on a set of rings. Seeds sit off the stagnation plane z = 0,
 * where u_z vanishes identically and a particle would spiral in the plane forever.
 */
export function seedRings(field, { rings = 8, perRing = 11, rMin = 0.3, rMax = 2.9, zSeed = 0.9, ...opts } = {}) {
  const lines = [];
  for (let i = 0; i < rings; i++) {
    const f = rings === 1 ? 0 : i / (rings - 1);
    const r = rMin * Math.pow(rMax / rMin, f);
    for (let j = 0; j < perRing; j++) {
      const theta = (2 * Math.PI * j) / perRing + i * 0.61;
      // Alternate sides of the stagnation plane and stagger the offset, so the
      // seeds do not land in visible bands.
      const sign = (i + j) % 2 ? 1 : -1;
      const z = sign * zSeed * (0.25 + 0.75 * ((j * 0.37 + i * 0.19) % 1));
      const line = streamline(field, [r * Math.cos(theta), r * Math.sin(theta), z], opts);
      if (line.count > 10) lines.push(line);
    }
  }
  return lines;
}

/**
 * Keep every `stride`-th sample of a streamline, always retaining the final
 * point so the tube still tapers at its true end. Halving the sample count
 * halves the vertex count, which matters on phones.
 */
export function decimate(line, stride) {
  if (stride <= 1) return line;
  const points = [], speeds = [], times = [];
  for (let i = 0; i < line.count; i += stride) {
    points.push(line.points[i * 3], line.points[i * 3 + 1], line.points[i * 3 + 2]);
    speeds.push(line.speeds[i]);
    times.push(line.times[i]);
  }
  const last = line.count - 1;
  if ((line.count - 1) % stride !== 0) {
    points.push(line.points[last * 3], line.points[last * 3 + 1], line.points[last * 3 + 2]);
    speeds.push(line.speeds[last]);
    times.push(line.times[last]);
  }
  return { points, speeds, times, count: speeds.length };
}

/**
 * Build a tube mesh around a polyline using parallel transport, which avoids the
 * twist artifacts a naive Frenet frame produces where the curve is nearly straight.
 * Tubes taper to a point at both ends.
 */
export function tubeMesh(line, { radius = 0.02, sides = 8, taper = 0.16, scalarRange = [0, 1] } = {}) {
  const { points, speeds, times, count } = line;
  if (count < 2) return null;

  const positions = new Float32Array(count * sides * 3);
  const normals = new Float32Array(count * sides * 3);
  const scalars = new Float32Array(count * sides);
  const phases = new Float32Array(count * sides);
  const indices = new Uint32Array((count - 1) * sides * 6);

  const tangent = [0, 0, 0];
  let normal = [0, 0, 0];
  const binormal = [0, 0, 0];

  const [lo, hi] = scalarRange;
  const span = hi - lo || 1;

  for (let i = 0; i < count; i++) {
    const a = Math.max(0, i - 1) * 3;
    const b = Math.min(count - 1, i + 1) * 3;
    tangent[0] = points[b] - points[a];
    tangent[1] = points[b + 1] - points[a + 1];
    tangent[2] = points[b + 2] - points[a + 2];
    const tm = Math.hypot(tangent[0], tangent[1], tangent[2]) || 1;
    tangent[0] /= tm; tangent[1] /= tm; tangent[2] /= tm;

    if (i === 0) {
      // Seed the frame with any vector not parallel to the tangent.
      const ref = Math.abs(tangent[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
      normal = [
        ref[1] * tangent[2] - ref[2] * tangent[1],
        ref[2] * tangent[0] - ref[0] * tangent[2],
        ref[0] * tangent[1] - ref[1] * tangent[0]
      ];
    } else {
      // Parallel transport: remove the component along the new tangent.
      const dot = normal[0] * tangent[0] + normal[1] * tangent[1] + normal[2] * tangent[2];
      normal = [
        normal[0] - dot * tangent[0],
        normal[1] - dot * tangent[1],
        normal[2] - dot * tangent[2]
      ];
    }
    const nm = Math.hypot(normal[0], normal[1], normal[2]) || 1;
    normal[0] /= nm; normal[1] /= nm; normal[2] /= nm;

    binormal[0] = tangent[1] * normal[2] - tangent[2] * normal[1];
    binormal[1] = tangent[2] * normal[0] - tangent[0] * normal[2];
    binormal[2] = tangent[0] * normal[1] - tangent[1] * normal[0];

    // Taper both ends to a point.
    const u = i / (count - 1);
    const edge = Math.min(u, 1 - u) / taper;
    const r = radius * Math.pow(Math.min(1, Math.max(0, edge)), 0.55);

    const scalar = Math.min(1, Math.max(0, (speeds[i] - lo) / span));

    for (let j = 0; j < sides; j++) {
      const ang = (2 * Math.PI * j) / sides;
      const c = Math.cos(ang), s = Math.sin(ang);
      const nx = normal[0] * c + binormal[0] * s;
      const ny = normal[1] * c + binormal[1] * s;
      const nz = normal[2] * c + binormal[2] * s;
      const k = (i * sides + j) * 3;
      positions[k] = points[i * 3] + r * nx;
      positions[k + 1] = points[i * 3 + 1] + r * ny;
      positions[k + 2] = points[i * 3 + 2] + r * nz;
      normals[k] = nx; normals[k + 1] = ny; normals[k + 2] = nz;
      scalars[i * sides + j] = scalar;
      phases[i * sides + j] = times[i];
    }
  }

  let m = 0;
  for (let i = 0; i < count - 1; i++) {
    for (let j = 0; j < sides; j++) {
      const j1 = (j + 1) % sides;
      const a = i * sides + j, b = i * sides + j1;
      const c = (i + 1) * sides + j, d = (i + 1) * sides + j1;
      // Outward face front-facing, matching arrows.js.
      indices[m++] = a; indices[m++] = b; indices[m++] = c;
      indices[m++] = b; indices[m++] = d; indices[m++] = c;
    }
  }

  return { positions, normals, scalars, phases, indices, vertexCount: count * sides };
}

/** Concatenate per-line tube meshes into one buffer set. */
export function mergeMeshes(meshes) {
  const parts = meshes.filter(Boolean);
  if (!parts.length) return null;
  let nv = 0, ni = 0;
  for (const p of parts) { nv += p.vertexCount; ni += p.indices.length; }

  const positions = new Float32Array(nv * 3);
  const normals = new Float32Array(nv * 3);
  const scalars = new Float32Array(nv);
  const phases = new Float32Array(nv);
  const indices = new Uint32Array(ni);

  let vo = 0, io = 0;
  for (const p of parts) {
    positions.set(p.positions, vo * 3);
    normals.set(p.normals, vo * 3);
    scalars.set(p.scalars, vo);
    phases.set(p.phases, vo);
    for (let i = 0; i < p.indices.length; i++) indices[io + i] = p.indices[i] + vo;
    vo += p.vertexCount;
    io += p.indices.length;
  }
  return { positions, normals, scalars, phases, indices, vertexCount: nv, indexCount: ni };
}

/** The 5th and 95th percentile of streamline speed, used to normalize color. */
export function speedRange(lines) {
  const all = [];
  for (const l of lines) for (const s of l.speeds) all.push(s);
  if (!all.length) return [0, 1];
  all.sort((a, b) => a - b);
  return [all[Math.floor(all.length * 0.05)], all[Math.floor(all.length * 0.95)]];
}
