/**
 * Incompressible Navier-Stokes in a plane channel: Fourier in the two
 * periodic directions, staggered finite differences across the channel.
 *
 * Derivatives in x and z are exact for every wave the grid holds, so the
 * streamwise and spanwise truncation error of a finite-difference scheme is
 * gone. The wall-normal direction keeps the second-order staggered
 * arrangement of `createChannelFlow`: v on cell faces, u, w and p at cell
 * centres, arbitrary cell heights.
 *
 * The unknowns are the Fourier coefficients of the velocity in x and z, one
 * set per row. Products are formed in physical space on the grid and
 * transformed (the pseudo-spectral method). A product of two fields holds
 * wavenumbers up to twice those of its factors, and on a grid the excess
 * folds back onto resolved waves. To keep that aliasing out, only the lowest
 * two thirds of the wavenumbers in each direction are kept, which leaves the
 * retained part of every quadratic product exact.
 *
 * The convective term is in divergence form with the same face averages
 * across the channel as the finite-difference solver. With the exact
 * products this conserves kinetic energy in the absence of viscosity.
 *
 * Time stepping and projection are as in `createChannelFlow`: Wray's
 * three-stage Runge-Kutta with everything explicit and an exact projection
 * after each stage. In Fourier space the projection is one tridiagonal
 * solve in y per wavenumber pair, with the exact k^2 in place of the
 * modified eigenvalues of a difference scheme.
 *
 * One stage:
 *
 *   8 forward transforms   products, formed from the physical velocity as
 *                          they are loaded
 *   1 pass                 right-hand side and provisional velocity, per
 *                          wavenumber and row
 *   1 pass                 projection, one thread per wavenumber pair
 *   3 inverse transforms   velocity back to physical space
 *
 * The physical velocity is therefore always current, and is what `state`
 * exposes: vec4f(u, v, w, p) per grid point at index i + Nx * (k + Nz * j),
 * with u, w and p at the cell centre in y and v on the face below. Unlike
 * the finite-difference solver, all components share the same x and z.
 */

import {
  generateR2C,
  generateC2R,
  generateC2C,
  makeTwiddles,
  workgroupStorageBytes,
} from '../webgpu-poisson/line-fft.js';
import { buildPivots, wallNormalCoefficients } from '../webgpu-poisson/channel-poisson.js';
import { gridHeaderWGSL } from './wgsl-common.js';
import { createFlowStatistics } from './flow-statistics.js';
import { RK3_IMAGINARY_LIMIT, RK3_REAL_LIMIT } from './channel-flow.js';
import { fourthOrderWallNormal } from './wall-normal-fourth.js';

const GAMMA = [8 / 15, 5 / 12, 3 / 4];
const ZETA = [0, -17 / 60, -5 / 12];
const PARAM_FLOATS = 8;

// Fields per site in the interleaved spectral buffers.
const STATE_FIELDS = 4; // u, v, w, p

/**
 * The eight products the convective term needs, as functions of the
 * physical velocity P(i, k, j) = (u, v, w, p). Centre products live on row
 * j; face products on the face below row j, where v lives.
 *
 *   0 u u      1 u w      2 w w      3 v v, with v averaged to the centre
 *   4 v ubar   5 v wbar   with u, w the plain mean of the rows either side
 *   6 v utilde 7 v wtilde with u, w the height-weighted mean
 *
 * The two kinds of mean are what make the scheme conserve energy on a
 * stretched grid: the plain mean is the value carried through a face of a
 * u or w control volume, and the weighted mean is the flux that carries v.
 * On a uniform grid they coincide.
 */
const PRODUCTS = [
  { value: 'let j = row; let q = P(i, k, j); return q.x * q.x;' },
  { value: 'let j = row; let q = P(i, k, j); return q.x * q.z;' },
  { value: 'let j = row; let q = P(i, k, j); return q.z * q.z;' },
  {
    value: `let j = row;
  var above = 0.0;
  if (j + 1u < NY) { above = P(i, k, j + 1u).y; }
  let vc = 0.5 * (P(i, k, j).y + above);
  return vc * vc;`,
  },
  { value: 'let j = row; if (j == 0u) { return 0.0; } let q = P(i, k, j); return q.y * 0.5 * (P(i, k, j - 1u).x + q.x);' },
  { value: 'let j = row; if (j == 0u) { return 0.0; } let q = P(i, k, j); return q.y * 0.5 * (P(i, k, j - 1u).z + q.z);' },
  {
    mesh: true,
    value: 'let j = row; if (j == 0u) { return 0.0; } let q = P(i, k, j); let m = ymesh[j].w; return q.y * (m * P(i, k, j - 1u).x + (1.0 - m) * q.x);',
  },
  {
    mesh: true,
    value: 'let j = row; if (j == 0u) { return 0.0; } let q = P(i, k, j); let m = ymesh[j].w; return q.y * (m * P(i, k, j - 1u).z + (1.0 - m) * q.z);',
  },
];

/**
 * Input of a forward transform: an expression of the physical velocity,
 * evaluated at point i of line (k, row). `preamble(binding)` declares the
 * mesh data, on the given binding, and any helpers the expression uses.
 */
function physicalSource(cfg, body, preamble = () => '') {
  return {
    declarations: /* wgsl */ `
const NX = ${cfg.Nx}u;
const NY = ${cfg.Ny}u;
const NZ = ${cfg.Nz}u;
@group(0) @binding(0) var<storage, read> phys: array<vec4f>;
fn P(i: u32, k: u32, j: u32) -> vec4f { return phys[i + NX * (k + NZ * j)]; }
${preamble(3)}
fn physicalValue(i: u32, k: u32, row: u32) -> f32 {
  ${body}
}`,
    value: 'physicalValue(i, a, b)',
  };
}

function spectralHeader(cfg) {
  return /* wgsl */ `
${gridHeaderWGSL(cfg)}
const MX = ${cfg.Mx}u;
const PLANE = ${cfg.Mx * cfg.Nz}u;
const KXN = ${cfg.keptX}u;   // kx indices 0 .. KXN - 1 are kept
const KZN = ${cfg.keptZ}u;   // kz indices with |n| <= KZN are kept
const KX0 = ${((2 * Math.PI) / cfg.Lx).toExponential(9)};
const KZ0 = ${((2 * Math.PI) / cfg.Lz).toExponential(9)};

fn mulI(k: f32, q: vec2f) -> vec2f { return vec2f(-k * q.y, k * q.x); }
fn keptZ(n: u32) -> bool { return n <= KZN || n >= NZ - KZN; }
fn waveZ(n: u32) -> f32 { return KZ0 * select(f32(n) - f32(NZ), f32(n), n <= NZ / 2u); }
`;
}

function predictorShader(cfg, header) {
  return /* wgsl */ `
${header}
@group(0) @binding(0) var<storage, read> spec: array<vec2f>;        // 4 fields: u, v, w, p
@group(0) @binding(1) var<storage, read_write> rprev: array<vec2f>; // 4 fields
@group(0) @binding(2) var<storage, read> prod: array<vec2f>;        // 8 fields
@group(0) @binding(3) var<storage, read_write> star: array<vec2f>;  // 4 fields
@group(0) @binding(4) var<storage, read> ymesh: array<vec4f>;
@group(0) @binding(5) var<uniform> params: Params;

@compute @workgroup_size(${cfg.wg.join(', ')})
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let m = gid.x;
  let n = gid.y;
  let j = gid.z;
  if (m >= KXN || n >= NZ || j >= NY) { return; }
  let s = m + MX * (n + NZ * j);
  if (!keptZ(n)) {
    for (var c = 0u; c < 3u; c++) {
      star[4u * s + c] = vec2f(0.0);
      rprev[4u * s + c] = vec2f(0.0);
    }
    return;
  }
  let kx = KX0 * f32(m);
  let kz = waveZ(n);
  let k2 = kx * kx + kz * kz;
  let up = j + 1u < NY;
  let dn = j > 0u;
  let sp = s + PLANE;
  let sm = s - PLANE;
  let mesh = ymesh[j];
  let ih = mesh.x;
  let ihm = mesh.y;
  let ihp = mesh.z;

  // Tangential components at cell centres. Beyond a wall the ghost value is
  // WALL times the interior one.
  let u = spec[4u * s];
  let w = spec[4u * s + 2u];
  var uP = WALL * u; var uM = WALL * u;
  var wP = WALL * w; var wM = WALL * w;
  var fluxUP = vec2f(0.0); var fluxWP = vec2f(0.0);
  if (up) {
    uP = spec[4u * sp]; wP = spec[4u * sp + 2u];
    fluxUP = prod[8u * sp + 4u]; fluxWP = prod[8u * sp + 5u];
  }
  if (dn) { uM = spec[4u * sm]; wM = spec[4u * sm + 2u]; }

  let uu = prod[8u * s];
  let uw = prod[8u * s + 1u];
  let ww = prod[8u * s + 2u];
  let vv = prod[8u * s + 3u];

  var ru = -(mulI(kx, uu) + mulI(kz, uw) + (fluxUP - prod[8u * s + 4u]) * ih)
         + params.nu * (-k2 * u + ih * ((uP - u) * ihp - (u - uM) * ihm));
  let rw = -(mulI(kx, uw) + mulI(kz, ww) + (fluxWP - prod[8u * s + 5u]) * ih)
         + params.nu * (-k2 * w + ih * ((wP - w) * ihp - (w - wM) * ihm));
  // The uniform body force acts on the mean mode, whose coefficient is the
  // sum over the plane.
  if (m == 0u && n == 0u) { ru.x += params.fx * ${(cfg.Nx * cfg.Nz).toFixed(1)}; }

  // Wall-normal component on the face below row j; zero on the wall itself.
  var rv = vec2f(0.0);
  let v = spec[4u * s + 1u];
  if (dn) {
    var vP = vec2f(0.0);
    if (up) { vP = spec[4u * sp + 1u]; }
    let vM = spec[4u * sm + 1u];
    rv = -(mulI(kx, prod[8u * s + 6u]) + mulI(kz, prod[8u * s + 7u]) + (vv - prod[8u * sm + 3u]) * ihm)
       + params.nu * (-k2 * v + ihm * ((vP - v) * ih - (v - vM) * ymesh[j - 1u].x));
  }

  star[4u * s] = u + params.a * ru + params.b * rprev[4u * s];
  star[4u * s + 1u] = v + params.a * rv + params.b * rprev[4u * s + 1u];
  star[4u * s + 2u] = w + params.a * rw + params.b * rprev[4u * s + 2u];
  rprev[4u * s] = ru;
  rprev[4u * s + 1u] = rv;
  rprev[4u * s + 2u] = rw;
}
`;
}

/**
 * One thread per wavenumber pair: form the divergence of the provisional
 * velocity and eliminate down the column, then substitute back up it,
 * subtracting the pressure gradient on the way. Wavenumbers outside the
 * retained set are zeroed.
 */
function projectionShader(cfg, header) {
  return /* wgsl */ `
${header}
@group(0) @binding(0) var<storage, read> star: array<vec2f>;
@group(0) @binding(1) var<storage, read_write> spec: array<vec2f>;
@group(0) @binding(2) var<storage, read_write> phi: array<vec2f>;
@group(0) @binding(3) var<storage, read> piv: array<f32>;
@group(0) @binding(4) var<storage, read> coef: array<vec2f>;   // (lower_j, upper_j)
@group(0) @binding(5) var<storage, read> ymesh: array<vec4f>;
@group(0) @binding(6) var<uniform> params: Params;

@compute @workgroup_size(${cfg.columnWorkgroup})
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let m = gid.x;
  let n = gid.y;
  if (m >= KXN || n >= NZ) { return; }
  let col = m + MX * n;
  if (!keptZ(n)) {
    for (var j = 0u; j < NY; j++) {
      let s = col + PLANE * j;
      for (var c = 0u; c < 4u; c++) { spec[4u * s + c] = vec2f(0.0); }
    }
    return;
  }
  let kx = KX0 * f32(m);
  let kz = waveZ(n);

  var g = vec2f(0.0);
  for (var j = 0u; j < NY; j++) {
    let s = col + PLANE * j;
    var vAbove = vec2f(0.0);
    if (j + 1u < NY) { vAbove = star[4u * (s + PLANE) + 1u]; }
    var vHere = vec2f(0.0);
    if (j > 0u) { vHere = star[4u * s + 1u]; }
    let d = mulI(kx, star[4u * s]) + mulI(kz, star[4u * s + 2u]) + (vAbove - vHere) * ymesh[j].x;
    g = (d - coef[j].x * g) * piv[s];
    phi[s] = g;
  }

  var f = g;        // phi on row j
  var fAbove = g;   // phi on row j + 1
  for (var j = NY; j > 0u; ) {
    j--;
    let s = col + PLANE * j;
    if (j + 1u < NY) {
      f = phi[s] - coef[j].y * piv[s] * fAbove;
      // The face between rows j and j + 1.
      spec[4u * (s + PLANE) + 1u] = star[4u * (s + PLANE) + 1u] - (fAbove - f) * ymesh[j + 1u].y;
    }
    spec[4u * s] = star[4u * s] - mulI(kx, f);
    spec[4u * s + 2u] = star[4u * s + 2u] - mulI(kz, f);
    spec[4u * s + 3u] = f * params.invAlphaDt;
    fAbove = f;
  }
  spec[4u * col + 1u] = vec2f(0.0);
}
`;
}

/** Root-mean-square divergence on each plane, by Parseval's theorem. */
function divergenceShader(cfg, header) {
  return /* wgsl */ `
${header}
@group(0) @binding(0) var<storage, read> spec: array<vec2f>;
@group(0) @binding(1) var<storage, read> ymesh: array<vec4f>;
@group(0) @binding(2) var<storage, read_write> result: array<f32>;

@compute @workgroup_size(1)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let j = gid.x;
  if (j >= NY) { return; }
  var total = 0.0;
  for (var n = 0u; n < NZ; n++) {
    if (!keptZ(n)) { continue; }
    let kz = waveZ(n);
    for (var m = 0u; m < KXN; m++) {
      let s = m + MX * (n + NZ * j);
      var vAbove = vec2f(0.0);
      if (j + 1u < NY) { vAbove = spec[4u * (s + PLANE) + 1u]; }
      let d = mulI(KX0 * f32(m), spec[4u * s]) + mulI(kz, spec[4u * s + 2u])
            + (vAbove - spec[4u * s + 1u]) * ymesh[j].x;
      // Only kx >= 0 is stored; the other half is its mirror image.
      total += select(2.0, 1.0, m == 0u) * dot(d, d);
    }
  }
  result[j] = sqrt(total) / ${(cfg.Nx * cfg.Nz).toFixed(1)};
}
`;
}

/** The second-order staggered differences across the channel. */
function secondOrderWallNormal(cfg, yFacesIn, waveX, waveZ) {
  const { Nx, Ny, Nz, Mx } = cfg;
  const yFaces = Float64Array.from(yFacesIn);
  const h = Float64Array.from({ length: Ny }, (_, j) => yFaces[j + 1] - yFaces[j]);
  const yc = Float64Array.from({ length: Ny }, (_, j) => 0.5 * (yFaces[j] + yFaces[j + 1]));
  const hf = Float64Array.from({ length: Ny + 1 }, (_, j) =>
    j === 0 ? h[0] : j === Ny ? h[Ny - 1] : yc[j] - yc[j - 1]
  );
  const mesh = new Float32Array(4 * Ny);
  for (let j = 0; j < Ny; j++) {
    mesh[4 * j] = 1 / h[j];
    mesh[4 * j + 1] = 1 / hf[j];
    mesh[4 * j + 2] = 1 / hf[j + 1];
    mesh[4 * j + 3] = j === 0 ? 0.5 : h[j - 1] / (h[j - 1] + h[j]);
  }
  const { lower, upper } = wallNormalCoefficients(yFaces);
  const coef = new Float32Array(2 * Ny);
  for (let j = 0; j < Ny; j++) {
    coef[2 * j] = lower[j];
    coef[2 * j + 1] = upper[j];
  }
  const piv = buildPivots({
    Nx, Ny, Nz, lower, upper,
    lamX: Float64Array.from({ length: Mx }, (_, m) => waveX(m) ** 2),
    lamZ: Float64Array.from({ length: Nz }, (_, n) => waveZ(n) ** 2),
  });
  return {
    order: 2,
    rows: Ny,
    productFields: 8,
    productPreamble: (binding) => `@group(0) @binding(${binding}) var<storage, read> ymesh: array<vec4f>;`,
    products: PRODUCTS,
    predictorShader,
    projectionShader,
    divergenceShader,
    yFaces, yCenters: yc, heights: h, faceSpacings: hf,
    tables: { mesh, piv, coef, statsMesh: mesh },
    wallSlopes: null,
    cflY: 1,
    viscousY: 4,
  };
}

/**
 * @param {GPUDevice} device
 * @param {Object} opts - as for `createChannelFlow`: Nx, Ny, Nz, Lx, Lz,
 *   yFaces, nu, forcing, wall, workgroup, maxInvocations, and
 * @param {2|4} [opts.wallNormalOrder] - order of the differences across the
 *   channel. Fourth order (the default when a mapping is given) needs
 * @param {{ y, dy }} [opts.mapping] - the wall-normal coordinate as a
 *   function of xi in [0, 1], and its derivative. With fourth order the
 *   rows are placed by the mapping and `yFaces` is ignored.
 */
export function createSpectralChannelFlow(device, opts) {
  const { Nx, Ny, Nz, Lx, Lz } = opts;
  const dx = Lx / Nx;
  const dz = Lz / Nz;
  const cells = Nx * Ny * Nz;
  const Mx = Nx / 2 + 1;
  const plane = Mx * Nz;
  const sites = plane * Ny;
  // Two-thirds rule: keep wavenumber indices strictly below N / 3.
  const keptX = Math.floor((Nx - 1) / 3) + 1;
  const keptZ = Math.floor((Nz - 1) / 3);
  const limits = device.limits;
  const maxInvocations = Math.min(
    opts.maxInvocations ?? 256,
    limits.maxComputeInvocationsPerWorkgroup,
    limits.maxComputeWorkgroupSizeX
  );
  if (workgroupStorageBytes(Math.max(Nx / 2, Nz)) > limits.maxComputeWorkgroupStorageSize) {
    throw new Error(`Nx = ${Nx}, Nz = ${Nz} exceeds the device's workgroup storage`);
  }
  const largest = Math.max(cells * 16, plane * (Ny + 4) * 8 * 11);
  if (largest > limits.maxStorageBufferBindingSize) {
    throw new Error(
      `Grid needs a ${largest} byte storage binding; the device allows ` +
        `${limits.maxStorageBufferBindingSize}. Request a larger ` +
        `maxStorageBufferBindingSize when creating the device.`
    );
  }

  // The largest wavenumber kept, relative to 1 / h, sets the convective and
  // viscous limits in the periodic directions.
  const kxMax = ((2 * Math.PI) / Lx) * (keptX - 1);
  const kzMax = ((2 * Math.PI) / Lz) * keptZ;
  const cfg = {
    Nx, Ny, Nz, Lx, Lz, dx, dz, Mx, keptX, keptZ,
    wg: opts.workgroup ?? [16, 4, 4],
    columnWorkgroup: Math.min(64, maxInvocations),
    wallSign: opts.wall === 'free-slip' ? 1 : -1,
    collocated: true,
    cflX: kxMax * dx,
    cflZ: kzMax * dz,
  };

  const waveX = (m) => ((2 * Math.PI) / Lx) * m;
  const waveZ = (n) => ((2 * Math.PI) / Lz) * (n <= Nz / 2 ? n : n - Nz);
  const order = opts.wallNormalOrder ?? (opts.mapping ? 4 : 2);
  if (order === 4 && !opts.mapping) throw new Error('Fourth-order wall-normal differences need opts.mapping');
  const scheme = order === 4
    ? fourthOrderWallNormal(cfg, opts.mapping, waveX, waveZ)
    : secondOrderWallNormal(cfg, opts.yFaces, waveX, waveZ);
  const { yFaces, yCenters: yc, heights: h, faceSpacings: hf } = scheme;
  cfg.cflY = scheme.cflY;
  const productRows = scheme.rows;
  const PRODUCT_FIELDS = scheme.productFields;
  const header = spectralHeader(cfg);

  const owned = [];
  const makeBuffer = (label, size, usage, data) => {
    const buffer = device.createBuffer({ label, size, usage });
    if (data) device.queue.writeBuffer(buffer, 0, data);
    owned.push(buffer);
    return buffer;
  };
  const S = GPUBufferUsage.STORAGE;
  const TABLE = S | GPUBufferUsage.COPY_DST;
  const state = makeBuffer('flow physical state', cells * 16, S | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST);
  const spec = makeBuffer('flow spectral state', sites * 8 * STATE_FIELDS, S);
  const star = makeBuffer('flow spectral predictor', sites * 8 * STATE_FIELDS, S);
  const rprev = makeBuffer('flow previous rhs', sites * 8 * STATE_FIELDS, S);
  const prod = makeBuffer('flow products', plane * productRows * 8 * PRODUCT_FIELDS, S);
  const work = makeBuffer('flow transform scratch', sites * 8, S);
  const phi = makeBuffer('flow phi', sites * 8, S);
  const table = (label, data) => makeBuffer(label, data.byteLength, TABLE, data);
  // Mesh data in the layout the scheme's own shaders read, and in the one
  // the statistics shader reads; for second order they are the same.
  const mesh = table('flow y mesh', order === 4 ? scheme.tables.metric : scheme.tables.mesh);
  const statsMesh = order === 4 ? table('flow y mesh for statistics', scheme.tables.statsMesh) : mesh;
  const solveTables = order === 4
    ? [[3, table('flow pressure factors', scheme.tables.lu)]]
    : [[3, table('flow pivots', scheme.tables.piv)], [4, table('flow y coefficients', scheme.tables.coef)]];
  const twX = makeBuffer('flow twiddles x', (Nx / 2 + 1) * 8, TABLE, makeTwiddles(Nx, Nx / 2 + 1));
  const twZ = makeBuffer('flow twiddles z', Math.max(Nz / 2, 1) * 8, TABLE, makeTwiddles(Nz, Math.max(Nz / 2, 1)));
  const divergence = makeBuffer('flow divergence', Ny * 4, S | GPUBufferUsage.COPY_SRC);
  const params = [0, 1, 2].map((s) =>
    makeBuffer(`flow params ${s}`, PARAM_FLOATS * 4, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
  );

  const step = (label, code, buffers, dispatch) => {
    const pipeline = device.createComputePipeline({
      label,
      layout: 'auto',
      compute: { module: device.createShaderModule({ label, code }), entryPoint: 'main' },
    });
    const bindGroup = device.createBindGroup({
      label,
      layout: pipeline.getBindGroupLayout(0),
      entries: buffers.map(([binding, buffer]) => ({ binding, resource: { buffer } })),
    });
    return { pipeline, bindGroup, dispatch };
  };
  const run = (pass, s) => {
    pass.setPipeline(s.pipeline);
    pass.setBindGroup(0, s.bindGroup);
    pass.dispatchWorkgroups(...s.dispatch);
  };

  const zLines = { N: Nz, stride: Mx, lineStrideY: plane, maxInvocations };
  const xLines = { N: Nx, linesX: Nz, maxInvocations };

  // Forward transform of a real field defined by `body`, into field `field`
  // of an interleaved spectral buffer: real-to-complex along x for every
  // line, then along z for the retained kx only.
  const forward = (label, body, usesMesh, target, field, rows) => {
    const src = physicalSource(cfg, body, usesMesh === null ? undefined : scheme.productPreamble);
    const bindings = [[0, state], [1, target], [2, twX]];
    if (usesMesh) bindings.push([3, mesh]);
    return [
      step(`${label}: r2c x`, generateR2C({ ...xLines, source: src, dst: field }).code, bindings, [Nz, rows]),
      step(`${label}: c2c z`, generateC2C({ ...zLines, inverse: false, src: field }).code,
        [[0, target], [1, twZ]], [keptX, rows]),
    ];
  };
  const productSteps = scheme.products.flatMap((p, f) =>
    forward(`flow: product ${f}`, p.value, !!p.mesh, prod, { stride: PRODUCT_FIELDS, offset: f }, productRows)
  );
  // For setState: the velocity components themselves, into the predictor
  // buffer, from which the projection produces a valid state.
  const loadSteps = ['x', 'y', 'z'].flatMap((component, c) =>
    forward(`flow: load ${component}`, `return P(i, k, row).${component};`, null, star, { stride: STATE_FIELDS, offset: c }, Ny)
  );

  // The unscaled round trip gains Nx / 2 from the half-length x transform
  // and Nz from the z transform.
  const scale = 1 / ((Nx / 2) * Nz);
  const inverse = [0, 1, 2, 3].map((c) => [
    step(`flow: inverse z ${c}`,
      generateC2C({ ...zLines, inverse: true, src: { stride: STATE_FIELDS, offset: c }, dst: { stride: 1, offset: 0 } }).code,
      [[0, spec], [1, twZ], [2, work]], [keptX, Ny]),
    step(`flow: inverse x ${c}`,
      generateC2R({ ...xLines, scale, dst: { stride: 4, offset: c }, keptModes: keptX }).code,
      [[0, work], [1, state], [2, twX]], [Nz, Ny]),
  ]);

  const grid = [Math.ceil(keptX / cfg.wg[0]), Math.ceil(Nz / cfg.wg[1]), Math.ceil(Ny / cfg.wg[2])];
  const predictor = params.map((p) =>
    step('flow: spectral predictor', scheme.predictorShader(cfg, header),
      [[0, spec], [1, rprev], [2, prod], [3, star], [4, mesh], [5, p]], grid)
  );
  const projection = params.map((p) =>
    step('flow: spectral projection', scheme.projectionShader(cfg, header),
      [[0, star], [1, spec], [2, phi], ...solveTables, [5, mesh], [6, p]],
      [Math.ceil(keptX / cfg.columnWorkgroup), Nz])
  );
  const divergenceStep = step('flow: spectral divergence', scheme.divergenceShader(cfg, header),
    [[0, spec], [1, mesh], [2, divergence]], [Ny]);

  const sim = { nu: opts.nu, forcing: opts.forcing ?? 0, dt: NaN, time: 0, steps: 0 };
  let written = {};
  const writeParams = (dt) => {
    if (written.dt === dt && written.nu === sim.nu && written.fx === sim.forcing) return;
    for (let s = 0; s < 3; s++) {
      const data = new Float32Array(PARAM_FLOATS);
      data[0] = dt * GAMMA[s];
      data[1] = dt * ZETA[s];
      data[2] = sim.nu;
      data[3] = sim.forcing;
      data[4] = 1 / (dt * (GAMMA[s] + ZETA[s]));
      device.queue.writeBuffer(params[s], 0, data);
    }
    written = { dt, nu: sim.nu, fx: sim.forcing };
  };

  const toPhysical = (pass, components) => {
    for (const c of components) for (const s of inverse[c]) run(pass, s);
  };

  const statistics = createFlowStatistics(device, {
    cfg, state, ymesh: statsMesh, sim,
    grid: { Nx, Ny, Nz, yFaces, yCenters: yc, heights: h, faceSpacings: hf },
    divergence: { encode: (pass) => run(pass, divergenceStep), buffer: divergence },
    wallSlopes: scheme.wallSlopes,
  });

  return {
    Nx, Ny, Nz, Lx, Lz, dx, dz, cells,
    yFaces, yCenters: yc, heights: h, faceSpacings: hf,
    /** Physical-space (u, v, w, p), always current. */
    state,
    config: cfg,
    sim,
    method: 'fourier',
    wallNormalOrder: order,
    /** Where u sits within a cell in x, and w in z: the centre. */
    xOffsetU: 0.5,
    zOffsetW: 0.5,
    retained: { kx: keptX, kz: 2 * keptZ + 1 },
    get time() { return sim.time; },
    get steps() { return sim.steps; },
    get bytes() { return owned.reduce((sum, b) => sum + b.size, 0) + statistics.bytes; },

    advance(dt, n = 1) {
      writeParams(dt);
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass({ label: 'flow step' });
      for (let i = 0; i < n; i++) {
        for (let s = 0; s < 3; s++) {
          for (const p of productSteps) run(pass, p);
          run(pass, predictor[s]);
          run(pass, projection[s]);
          toPhysical(pass, [0, 1, 2]);
        }
      }
      // Pressure is only looked at, never fed back, so once per call is enough.
      toPhysical(pass, [3]);
      pass.end();
      device.queue.submit([encoder.finish()]);
      sim.dt = dt;
      sim.time += n * dt;
      sim.steps += n;
    },

    /**
     * Upload interleaved physical (u, v, w, p). The field is truncated to the
     * retained wavenumbers and projected, so the state that results is
     * free of divergence whatever was uploaded.
     */
    setState(data) {
      if (data.length !== cells * 4) throw new Error(`state must have ${cells * 4} floats`);
      device.queue.writeBuffer(state, 0, data);
      writeParams(Number.isFinite(written.dt) ? written.dt : 1);
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass({ label: 'flow load' });
      for (const s of loadSteps) run(pass, s);
      run(pass, projection[0]);
      toPhysical(pass, [0, 1, 2, 3]);
      pass.end();
      device.queue.submit([encoder.finish()]);
    },

    /** Present for compatibility: `setState` already projects. */
    project() {},

    async readState() {
      const staging = device.createBuffer({
        size: cells * 16,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });
      const encoder = device.createCommandEncoder();
      encoder.copyBufferToBuffer(state, 0, staging, 0, cells * 16);
      device.queue.submit([encoder.finish()]);
      await staging.mapAsync(GPUMapMode.READ);
      const out = new Float32Array(staging.getMappedRange().slice(0));
      staging.unmap();
      staging.destroy();
      return out;
    },

    /**
     * As for `createChannelFlow`, except that `maxDivergence` is the largest
     * root-mean-square divergence over the planes, computed from the
     * Fourier coefficients.
     */
    statistics: () => statistics.read(),

    stableTimeStep(stats, safety = 0.5) {
      let hmin = Infinity;
      for (let j = 0; j < Ny; j++) hmin = Math.min(hmin, h[j]);
      const viscous = sim.nu * (kxMax * kxMax + kzMax * kzMax + scheme.viscousY / (hmin * hmin));
      const convective = stats.maxCfl;
      return safety * Math.min(
        convective > 0 ? RK3_IMAGINARY_LIMIT / convective : Infinity,
        viscous > 0 ? RK3_REAL_LIMIT / viscous : Infinity
      );
    },

    destroy() {
      statistics.destroy();
      for (const b of owned) b.destroy();
    },
  };
}
