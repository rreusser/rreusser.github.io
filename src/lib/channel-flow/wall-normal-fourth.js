/**
 * Fourth-order staggered differences across the channel, for the Fourier
 * solver in `spectral-channel-flow.js`.
 *
 * The wall-normal coordinate is mapped from a uniform computational
 * coordinate xi in [0, 1], y = y(xi), with Jacobian J = dy/dxi. Row j has
 * its centre at xi = (j + 1/2) / Ny and its lower face at xi = j / Ny. On
 * the uniform xi grid the staggered difference and interpolation are
 *
 *   (D f)_j = [9/8 (f_{j+1/2} - f_{j-1/2}) - 1/24 (f_{j+3/2} - f_{j-3/2})] / dxi
 *   (I f)_j = 9/16 (f_{j+1/2} + f_{j-1/2}) - 1/16 (f_{j+3/2} + f_{j-3/2})
 *
 * and d/dy is D divided by J.
 *
 * The convective term is the fourth-order energy-conserving form of
 * Morinishi et al. (1998), carried to a mapped grid as in Vasilyev (2000):
 * a combination, with weights 9/8 and -1/8, of two second-order divergence
 * forms whose fluxes span one and three cells, with the advecting flux
 * interpolated at fourth order. In the interior it conserves kinetic energy
 * as the second-order scheme does.
 *
 * Stencils near a wall reach beyond it. The mapping is smooth, so its
 * Jacobian is simply evaluated there. In the viscous term, the divergence
 * and the pressure gradient, the values of the flow beyond the wall are
 * extrapolated with the cubic that passes through the three nearest interior
 * values and through zero on the wall, which is where the no-slip condition
 * enters. A plain reflection of the interior values would be simpler but
 * limits the scheme to second order.
 *
 * The convective fluxes are the exception. There the reflection is kept,
 * because the sums that express conservation of energy only close at the
 * wall if the values beyond it are mirror images. With extrapolated values
 * in the fluxes the scheme is unstable without viscosity. The fluxes are
 * small next to a no-slip wall, so the reflection costs little accuracy
 * there.
 *
 * The pressure equation, the divergence of the gradient, couples each row
 * to four on either side, so the tridiagonal solve of the second-order
 * scheme becomes a banded one. Its LU factors are computed in double
 * precision for every retained wavenumber pair and stored.
 */

const BAND = 4;
export const LU_FLOATS = 2 * BAND + 1;
export const FOURTH_ORDER_PRODUCTS = 11;
const GHOST_ROWS = 2;
// Rows beyond each wall for which the metric is tabulated.
const METRIC_GHOSTS = 3;

/**
 * Weights that extrapolate to position `target` from values at positions
 * `nodes`, with the polynomial that also vanishes at 0.
 */
function ghostWeights(nodes, target) {
  return nodes.map((xn, n) => {
    let w = target / xn;
    nodes.forEach((xm, m) => {
      if (m !== n) w *= (target - xm) / (xn - xm);
    });
    return w;
  });
}

/**
 * Ghost rules for a wall. Centre values (u, w) sit at 1/2, 3/2, 5/2 cells
 * from it and face values (v) at 1, 2, 3.
 *
 * No slip: every component vanishes on the wall, and is extrapolated with
 * the cubic through that zero. Free slip: the tangential components have
 * zero gradient there, so they are mirrored, and v, which still vanishes,
 * is mirrored with a change of sign. For a field that really has those
 * symmetries, as between two free-slip walls, the mirror image is exact.
 */
function ghostRules(freeSlip) {
  if (freeSlip) {
    return {
      centre: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      face: [[-1, 0, 0], [0, -1, 0]],
    };
  }
  return {
    centre: [-0.5, -1.5, -2.5].map((t) => ghostWeights([0.5, 1.5, 2.5], t)),
    face: [-1, -2].map((t) => ghostWeights([1, 2, 3], t)),
  };
}

/**
 * Ghost rules for the convective fluxes alone: every component mirrored
 * with a change of sign (or, between free-slip walls, as above). With these
 * the sums that express conservation of energy still telescope at a wall,
 * which the cubic extrapolation does not allow. Used everywhere, they would
 * reduce the scheme to second order; confined to the convective fluxes,
 * which are small next to a no-slip wall, they cost little accuracy.
 */
function convectiveGhostRules(freeSlip) {
  if (freeSlip) return ghostRules(true);
  return {
    centre: [[-1, 0, 0], [0, -1, 0], [0, 0, -1]],
    face: [[-1, 0, 0], [0, -1, 0]],
  };
}

const vec3 = (w) => `vec3f(${w.map((x) => x.toExponential(9)).join(', ')})`;

/** WGSL for the mirrored metric lookups and the ghost weights. */
function metricWGSL(binding, ghosts) {
  return /* wgsl */ `
// Entry j + ${METRIC_GHOSTS}, for j from -${METRIC_GHOSTS} to NY + ${METRIC_GHOSTS}: (1 / (J dxi) at centre j,
// 1 / (J dxi) at face j, J at centre j, J at face j). Beyond the walls the
// metric is that of the mapping continued smoothly, not a mirror image.
@group(0) @binding(${binding}) var<storage, read> metric: array<vec4f>;
const WC = array<vec3f, 3>(${ghosts.centre.map(vec3).join(', ')});
const WF = array<vec3f, 2>(${ghosts.face.map(vec3).join(', ')});
fn rc(j: i32) -> u32 {
  if (j < 0) { return u32(-1 - j); }
  if (j >= i32(NY)) { return u32(2 * i32(NY) - 1 - j); }
  return u32(j);
}
fn iJc(j: i32) -> f32 { return metric[u32(j + ${METRIC_GHOSTS})].x; }
fn iJf(j: i32) -> f32 { return metric[u32(j + ${METRIC_GHOSTS})].y; }
fn Jc(j: i32) -> f32 { return metric[u32(j + ${METRIC_GHOSTS})].z; }
fn Jf(j: i32) -> f32 { return metric[u32(j + ${METRIC_GHOSTS})].w; }
`;
}

/**
 * WGSL function `name(args, j: i32) -> type` giving a centre value on any
 * row, extrapolated beyond the walls. `at(row)` is the expression for the
 * stored value on interior row `row` (a u32 expression).
 */
function centreAccessor(name, args, type, at) {
  return /* wgsl */ `
fn ${name}(${args}j: i32) -> ${type} {
  if (j >= 0 && j < i32(NY)) { return ${at('u32(j)')}; }
  if (j < 0) {
    let w = WC[u32(-1 - j)];
    return w.x * ${at('0u')} + w.y * ${at('1u')} + w.z * ${at('2u')};
  }
  let w = WC[u32(j - i32(NY))];
  return w.x * ${at('NY - 1u')} + w.y * ${at('NY - 2u')} + w.z * ${at('NY - 3u')};
}
`;
}

/** The same for a face value, which is zero on both walls. */
function faceAccessor(name, args, type, zero, at) {
  return /* wgsl */ `
fn ${name}(${args}j: i32) -> ${type} {
  if (j == 0 || j == i32(NY)) { return ${zero}; }
  if (j > 0 && j < i32(NY)) { return ${at('u32(j)')}; }
  if (j < 0) {
    let w = WF[u32(-1 - j)];
    return w.x * ${at('1u')} + w.y * ${at('2u')} + w.z * ${at('3u')};
  }
  let w = WF[u32(j - i32(NY) - 1)];
  return w.x * ${at('NY - 1u')} + w.y * ${at('NY - 2u')} + w.z * ${at('NY - 3u')};
}
`;
}

const D = (hi, lo, far, near) => `(1.125 * (${hi} - ${lo}) - (1.0 / 24.0) * (${far} - ${near}))`;

/**
 * The eleven products. Row r of the product buffer is wall-normal index
 * j = r - 2, so that the rows the wide stencils need beyond the walls exist.
 *
 *   0 u u    1 u w    2 w w                                 at centres
 *   3 vhat vbar1    4 vhat vbar3                            at centres
 *   5 v ubar1  6 v ubar3  7 v wbar1  8 v wbar3              at faces
 *   9 v utilde  10 v wtilde                                 at faces
 *
 * bar1 and bar3 are plain means of the two values one and three half-cells
 * either side, vhat is v interpolated to the centre at fourth order, and
 * utilde is the fourth-order interpolation of J u divided by J, the flux
 * that carries v.
 */
function products() {
  const pre = /* wgsl */ `
${centreAccessor('uw', 'i: u32, k: u32, ', 'vec2f', (r) => `P(i, k, ${r}).xz`)}
${faceAccessor('vf', 'i: u32, k: u32, ', 'f32', '0.0', (r) => `P(i, k, ${r}).y`)}
fn vhat(i: u32, k: u32, c: i32) -> f32 {
  return 0.5625 * (vf(i, k, c) + vf(i, k, c + 1)) - 0.0625 * (vf(i, k, c - 1) + vf(i, k, c + 2));
}
fn carried(i: u32, k: u32, f: i32) -> vec2f {
  return (0.5625 * (Jc(f - 1) * uw(i, k, f - 1) + Jc(f) * uw(i, k, f))
        - 0.0625 * (Jc(f - 2) * uw(i, k, f - 2) + Jc(f + 1) * uw(i, k, f + 1))) / Jf(f);
}
`;
  // Each product is only formed on the rows where something reads it; the
  // bounds are relative to NY.
  const body = (lo, hi, expr) =>
    `let j = i32(row) - ${GHOST_ROWS}; if (j < ${lo} || j > i32(NY) + (${hi})) { return 0.0; } ${expr}`;
  return {
    preamble: pre,
    list: [
      { value: body(0, -1, 'let q = uw(i, k, j); return q.x * q.x;') },
      { value: body(0, -1, 'let q = uw(i, k, j); return q.x * q.y;') },
      { value: body(0, -1, 'let q = uw(i, k, j); return q.y * q.y;') },
      { value: body(0, -1, 'return vhat(i, k, j) * 0.5 * (vf(i, k, j) + vf(i, k, j + 1));') },
      { value: body(-1, 0, 'return vhat(i, k, j) * 0.5 * (vf(i, k, j - 1) + vf(i, k, j + 2));') },
      { value: body(0, 0, 'return vf(i, k, j) * 0.5 * (uw(i, k, j - 1).x + uw(i, k, j).x);') },
      { value: body(-1, 1, 'return vf(i, k, j) * 0.5 * (uw(i, k, j - 2).x + uw(i, k, j + 1).x);') },
      { value: body(0, 0, 'return vf(i, k, j) * 0.5 * (uw(i, k, j - 1).y + uw(i, k, j).y);') },
      { value: body(-1, 1, 'return vf(i, k, j) * 0.5 * (uw(i, k, j - 2).y + uw(i, k, j + 1).y);') },
      { value: body(1, -1, 'return vf(i, k, j) * carried(i, k, j).x;'), mesh: true },
      { value: body(1, -1, 'return vf(i, k, j) * carried(i, k, j).y;'), mesh: true },
    ],
  };
}

function predictorShader(cfg, header) {
  const F = FOURTH_ORDER_PRODUCTS;
  const ghosts = ghostRules(cfg.wallSign === 1);
  return /* wgsl */ `
${header}
@group(0) @binding(0) var<storage, read> spec: array<vec2f>;
@group(0) @binding(1) var<storage, read_write> rprev: array<vec2f>;
@group(0) @binding(2) var<storage, read> prod: array<vec2f>;
@group(0) @binding(3) var<storage, read_write> star: array<vec2f>;
${metricWGSL(4, ghosts)}
@group(0) @binding(5) var<uniform> params: Params;

${centreAccessor('sc', 'c: u32, col: u32, ', 'vec2f', (r) => `spec[4u * (col + PLANE * (${r})) + c]`)}
${faceAccessor('sv', 'col: u32, ', 'vec2f', 'vec2f(0.0)', (r) => `spec[4u * (col + PLANE * (${r})) + 1u]`)}
fn pr(f: u32, col: u32, j: i32) -> vec2f {
  return prod[${F}u * (col + PLANE * u32(j + ${GHOST_ROWS})) + f];
}
// d/dy of a centre field at face f, and of the face field v at centre c.
fn slope(c: u32, col: u32, f: i32) -> vec2f {
  return iJf(f) * ${D('sc(c, col, f)', 'sc(c, col, f - 1)', 'sc(c, col, f + 1)', 'sc(c, col, f - 2)')};
}
fn slopeV(col: u32, c: i32) -> vec2f {
  return iJc(c) * ${D('sv(col, c + 1)', 'sv(col, c)', 'sv(col, c + 2)', 'sv(col, c - 1)')};
}
// Right-hand side of a tangential component: c is its field, a and b the
// products it is carried by in x and z, g1 and g3 its wall-normal fluxes.
fn tangential(c: u32, a: u32, b: u32, g1: u32, g3: u32, col: u32, j: i32, kx: f32, kz: f32) -> vec2f {
  let conv = mulI(kx, pr(a, col, j)) + mulI(kz, pr(b, col, j))
    + iJc(j) * ${D('pr(g1, col, j + 1)', 'pr(g1, col, j)', 'pr(g3, col, j + 2)', 'pr(g3, col, j - 1)')};
  let visc = -(kx * kx + kz * kz) * sc(c, col, j)
    + iJc(j) * ${D('slope(c, col, j + 1)', 'slope(c, col, j)', 'slope(c, col, j + 2)', 'slope(c, col, j - 1)')};
  return -conv + params.nu * visc;
}

@compute @workgroup_size(${cfg.wg.join(', ')})
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let m = gid.x;
  let n = gid.y;
  if (m >= KXN || n >= NZ || gid.z >= NY) { return; }
  let col = m + MX * n;
  let s = col + PLANE * gid.z;
  let j = i32(gid.z);
  if (!keptZ(n)) {
    for (var c = 0u; c < 3u; c++) {
      star[4u * s + c] = vec2f(0.0);
      rprev[4u * s + c] = vec2f(0.0);
    }
    return;
  }
  let kx = KX0 * f32(m);
  let kz = waveZ(n);

  var ru = tangential(0u, 0u, 1u, 5u, 6u, col, j, kx, kz);
  let rw = tangential(2u, 1u, 2u, 7u, 8u, col, j, kx, kz);
  if (m == 0u && n == 0u) { ru.x += params.fx * ${(cfg.Nx * cfg.Nz).toFixed(1)}; }

  var rv = vec2f(0.0);
  if (j > 0) {
    let conv = mulI(kx, pr(9u, col, j)) + mulI(kz, pr(10u, col, j))
      + iJf(j) * ${D('pr(3u, col, j)', 'pr(3u, col, j - 1)', 'pr(4u, col, j + 1)', 'pr(4u, col, j - 2)')};
    let visc = -(kx * kx + kz * kz) * sv(col, j)
      + iJf(j) * ${D('slopeV(col, j)', 'slopeV(col, j - 1)', 'slopeV(col, j + 1)', 'slopeV(col, j - 2)')};
    rv = -conv + params.nu * visc;
  }

  star[4u * s] = spec[4u * s] + params.a * ru + params.b * rprev[4u * s];
  star[4u * s + 1u] = spec[4u * s + 1u] + params.a * rv + params.b * rprev[4u * s + 1u];
  star[4u * s + 2u] = spec[4u * s + 2u] + params.a * rw + params.b * rprev[4u * s + 2u];
  rprev[4u * s] = ru;
  rprev[4u * s + 1u] = rv;
  rprev[4u * s + 2u] = rw;
}
`;
}

const divergenceOf = (field) =>
  `mulI(kx, ${field}[4u * s]) + mulI(kz, ${field}[4u * s + 2u])
     + iJc(j) * ${D('vface(col, j + 1)', 'vface(col, j)', 'vface(col, j + 2)', 'vface(col, j - 1)')}`;

function projectionShader(cfg, header) {
  const L = LU_FLOATS;
  const ghosts = ghostRules(cfg.wallSign === 1);
  return /* wgsl */ `
${header}
@group(0) @binding(0) var<storage, read> star: array<vec2f>;
@group(0) @binding(1) var<storage, read_write> spec: array<vec2f>;
@group(0) @binding(2) var<storage, read_write> phi: array<vec2f>;
// Per site: multipliers for the four rows below, the reciprocal pivot, and
// the four upper entries.
@group(0) @binding(3) var<storage, read> lu: array<f32>;
${metricWGSL(5, ghosts)}
@group(0) @binding(6) var<uniform> params: Params;

${faceAccessor('vface', 'col: u32, ', 'vec2f', 'vec2f(0.0)', (r) => `star[4u * (col + PLANE * (${r})) + 1u]`)}
// phi on any row, mirrored through the walls: its gradient vanishes there.
fn ph(col: u32, j: i32) -> vec2f { return phi[col + PLANE * rc(j)]; }

@compute @workgroup_size(${cfg.columnWorkgroup})
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let m = gid.x;
  let n = gid.y;
  if (m >= KXN || n >= NZ) { return; }
  let col = m + MX * n;
  if (!keptZ(n)) {
    for (var r = 0u; r < NY; r++) {
      let s = col + PLANE * r;
      for (var c = 0u; c < 4u; c++) { spec[4u * s + c] = vec2f(0.0); }
    }
    return;
  }
  let kx = KX0 * f32(m);
  let kz = waveZ(n);

  // Forward substitution, keeping the last four results at hand.
  var g = array<vec2f, ${BAND}>();
  for (var r = 0u; r < NY; r++) {
    let s = col + PLANE * r;
    let j = i32(r);
    var d = ${divergenceOf('star')};
    // The mean mode's first equation is replaced by phi = 0 on the first row.
    if (m == 0u && n == 0u && r == 0u) { d = vec2f(0.0); }
    for (var b = 0u; b < ${BAND}u; b++) { d -= lu[${L}u * s + b] * g[b]; }
    for (var b = ${BAND - 1}u; b > 0u; b--) { g[b] = g[b - 1u]; }
    g[0] = d;
    phi[s] = d;
  }
  // Back substitution.
  var f = array<vec2f, ${BAND}>();
  for (var r = NY; r > 0u; ) {
    r--;
    let s = col + PLANE * r;
    var x = phi[s];
    for (var b = 0u; b < ${BAND}u; b++) { x -= lu[${L}u * s + ${BAND + 1}u + b] * f[b]; }
    x *= lu[${L}u * s + ${BAND}u];
    for (var b = ${BAND - 1}u; b > 0u; b--) { f[b] = f[b - 1u]; }
    f[0] = x;
    phi[s] = x;
  }
  // Subtract the gradient.
  for (var r = 0u; r < NY; r++) {
    let s = col + PLANE * r;
    let j = i32(r);
    let p = phi[s];
    spec[4u * s] = star[4u * s] - mulI(kx, p);
    spec[4u * s + 2u] = star[4u * s + 2u] - mulI(kz, p);
    spec[4u * s + 3u] = p * params.invAlphaDt;
    var v = vec2f(0.0);
    if (r > 0u) {
      v = star[4u * s + 1u]
        - iJf(j) * ${D('ph(col, j)', 'ph(col, j - 1)', 'ph(col, j + 1)', 'ph(col, j - 2)')};
    }
    spec[4u * s + 1u] = v;
  }
}
`;
}

function divergenceShader(cfg, header) {
  const ghosts = ghostRules(cfg.wallSign === 1);
  return /* wgsl */ `
${header}
@group(0) @binding(0) var<storage, read> spec: array<vec2f>;
${metricWGSL(1, ghosts)}
@group(0) @binding(2) var<storage, read_write> result: array<f32>;
${faceAccessor('vface', 'col: u32, ', 'vec2f', 'vec2f(0.0)', (r) => `spec[4u * (col + PLANE * (${r})) + 1u]`)}

@compute @workgroup_size(1)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  if (gid.x >= NY) { return; }
  let j = i32(gid.x);
  var total = 0.0;
  for (var n = 0u; n < NZ; n++) {
    if (!keptZ(n)) { continue; }
    let kz = waveZ(n);
    for (var m = 0u; m < KXN; m++) {
      let col = m + MX * n;
      let s = col + PLANE * gid.x;
      let kx = KX0 * f32(m);
      let d = ${divergenceOf('spec')};
      total += select(2.0, 1.0, m == 0u) * dot(d, d);
    }
  }
  result[gid.x] = sqrt(total) / ${(cfg.Nx * cfg.Nz).toFixed(1)};
}
`;
}

/**
 * Everything the Fourier solver needs to use fourth-order differences
 * across the channel.
 *
 * @param {Object} cfg - the solver's grid configuration
 * @param {{ y: (xi: number) => number, dy: (xi: number) => number }} mapping
 * @param {(m: number) => number} waveX, @param {(n: number) => number} waveZ
 */
export function fourthOrderWallNormal(cfg, mapping, waveX, waveZ) {
  const { Ny, Nz, Mx, keptX, keptZ } = cfg;
  const ghosts = ghostRules(cfg.wallSign === 1);
  const CENTRE_GHOSTS = ghosts.centre;
  const FACE_GHOSTS = ghosts.face;
  if (Ny < 8) throw new Error('Fourth-order wall-normal differences need at least 8 rows');
  const dxi = 1 / Ny;
  const yFaces = Float64Array.from({ length: Ny + 1 }, (_, j) => mapping.y(j * dxi));
  const yCenters = Float64Array.from({ length: Ny }, (_, j) => mapping.y((j + 0.5) * dxi));
  // The Jacobian at the centre and at the lower face of any row, including
  // rows beyond the walls, where the mapping is continued smoothly.
  const jacC = (j) => mapping.dy((j + 0.5) * dxi);
  const jacF = (j) => mapping.dy(j * dxi);
  const Jf = Float64Array.from({ length: Ny + 1 }, (_, j) => jacF(j));
  // The lengths that weight each row in sums over the channel.
  const heights = Float64Array.from({ length: Ny }, (_, j) => jacC(j) * dxi);
  const faceSpacings = Jf.map((J) => J * dxi);

  const metric = new Float32Array(4 * (Ny + 2 * METRIC_GHOSTS + 1));
  for (let j = -METRIC_GHOSTS; j <= Ny + METRIC_GHOSTS; j++) {
    const o = 4 * (j + METRIC_GHOSTS);
    metric[o] = 1 / (jacC(j) * dxi);
    metric[o + 1] = 1 / (jacF(j) * dxi);
    metric[o + 2] = jacC(j);
    metric[o + 3] = jacF(j);
  }

  // The ghost rules, as in the shaders.
  const rc = (j) => (j < 0 ? -1 - j : j >= Ny ? 2 * Ny - 1 - j : j);
  const iJc = (j) => 1 / (jacC(j) * dxi);
  const iJf = (j) => 1 / (jacF(j) * dxi);
  const faceGhost = (get) => (j) => {
    if (j === 0 || j === Ny) return 0;
    if (j > 0 && j < Ny) return get(j);
    if (j < 0) return FACE_GHOSTS[-1 - j].reduce((s, w, k) => s + w * get(k + 1), 0);
    return FACE_GHOSTS[j - Ny - 1].reduce((s, w, k) => s + w * get(Ny - 1 - k), 0);
  };
  const d4 = (hi, lo, far, near) => 1.125 * (hi - lo) - (far - near) / 24;

  // The wall-normal part of the pressure operator, row by row, found by
  // applying divergence-of-gradient to unit vectors.
  const width = 2 * BAND + 1;
  const base = new Float64Array(Ny * width);
  for (let k = 0; k < Ny; k++) {
    const e = (j) => (rc(j) === k ? 1 : 0); // mirrored through the walls
    const grad = faceGhost((f) => iJf(f) * d4(e(f), e(f - 1), e(f + 1), e(f - 2)));
    for (let c = Math.max(0, k - BAND - 2); c <= Math.min(Ny - 1, k + BAND + 2); c++) {
      const value = iJc(c) * d4(grad(c + 1), grad(c), grad(c + 2), grad(c - 1));
      if (value === 0) continue;
      if (Math.abs(k - c) > BAND) throw new Error('Pressure operator is wider than its band');
      base[c * width + (k - c + BAND)] = value;
    }
  }

  // Banded LU without pivoting for every retained wavenumber pair.
  const plane = Mx * Nz;
  const lu = new Float32Array(plane * Ny * LU_FLOATS);
  const a = new Float64Array(Ny * width);
  let worstPivot = Infinity;
  for (let n = 0; n < Nz; n++) {
    if (!(n <= keptZ || n >= Nz - keptZ)) continue;
    for (let m = 0; m < keptX; m++) {
      const k2 = waveX(m) ** 2 + waveZ(n) ** 2;
      a.set(base);
      for (let c = 0; c < Ny; c++) a[c * width + BAND] -= k2;
      if (m === 0 && n === 0) {
        // Pressure is defined up to a constant; fix it on the first row.
        for (let b = 0; b < width; b++) a[b] = b === BAND ? 1 : 0;
      }
      let scale = 0;
      for (let c = 0; c < Ny; c++) scale = Math.max(scale, Math.abs(a[c * width + BAND]));
      for (let c = 0; c < Ny; c++) {
        const pivot = a[c * width + BAND];
        worstPivot = Math.min(worstPivot, Math.abs(pivot) / scale);
        for (let r = c + 1; r <= Math.min(Ny - 1, c + BAND); r++) {
          const f = a[r * width + (c - r + BAND)] / pivot;
          if (f === 0) continue;
          a[r * width + (c - r + BAND)] = f;
          for (let q = c + 1; q <= Math.min(Ny - 1, c + BAND); q++) {
            a[r * width + (q - r + BAND)] -= f * a[c * width + (q - c + BAND)];
          }
        }
      }
      const col = m + Mx * n;
      for (let c = 0; c < Ny; c++) {
        const o = LU_FLOATS * (col + plane * c);
        // Multipliers for rows c-1 .. c-4, reciprocal pivot, entries c+1 .. c+4.
        for (let b = 0; b < BAND; b++) lu[o + b] = c - 1 - b >= 0 ? a[c * width + (BAND - 1 - b)] : 0;
        lu[o + BAND] = 1 / a[c * width + BAND];
        for (let b = 0; b < BAND; b++) lu[o + BAND + 1 + b] = c + 1 + b < Ny ? a[c * width + (BAND + 1 + b)] : 0;
      }
    }
  }
  if (!(worstPivot > 1e-10)) throw new Error('Pressure factorisation met a vanishing pivot');

  // Row data in the layout the statistics and Q-criterion shaders expect.
  const statsMesh = new Float32Array(4 * Ny);
  for (let j = 0; j < Ny; j++) {
    statsMesh[4 * j] = 1 / heights[j];
    statsMesh[4 * j + 1] = 1 / faceSpacings[j];
    statsMesh[4 * j + 2] = 1 / faceSpacings[j + 1];
    statsMesh[4 * j + 3] = 0.5;
  }

  // du/dy on each wall from a mean profile, with the scheme's own stencil.
  const wallSlopes = (u) => {
    const lower = (get) => {
      const g1 = CENTRE_GHOSTS[0].reduce((s, w, k) => s + w * get(k), 0);
      const g2 = CENTRE_GHOSTS[1].reduce((s, w, k) => s + w * get(k), 0);
      return d4(get(0), g1, get(1), g2) / (Jf[0] * dxi);
    };
    return [lower((k) => u[k]), lower((k) => u[Ny - 1 - k]) * (Jf[0] / Jf[Ny])];
  };

  const preamble = products();
  return {
    order: 4,
    rows: Ny + 2 * GHOST_ROWS,
    productFields: FOURTH_ORDER_PRODUCTS,
    productPreamble: (binding) => metricWGSL(binding, convectiveGhostRules(cfg.wallSign === 1)) + preamble.preamble,
    products: preamble.list,
    predictorShader,
    projectionShader,
    divergenceShader,
    yFaces, yCenters, heights, faceSpacings,
    tables: { metric, lu, statsMesh },
    wallSlopes,
    // The widest effective wavenumbers of the differences, relative to the
    // second-order ones, for the time-step limits.
    cflY: 1.25,
    viscousY: 5.5,
  };
}
