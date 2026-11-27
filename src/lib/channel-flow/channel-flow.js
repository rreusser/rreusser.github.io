/**
 * Incompressible Navier-Stokes in a plane channel on a staggered grid.
 *
 *   x (streamwise): periodic, uniform
 *   z (spanwise):   periodic, uniform
 *   y (wall-normal): walls at both ends, arbitrary cell heights
 *
 * Space: second-order central differences in divergence form on a staggered
 * (MAC) grid. Advected values are plain averages of the two neighbouring
 * control volumes and advecting fluxes are the volume-consistent ones, which
 * makes the convective operator skew-symmetric: it conserves momentum and,
 * without viscosity, kinetic energy, on stretched grids too. There is no
 * upwinding and no numerical dissipation.
 *
 * Time: three-stage low-storage Runge-Kutta (Wray), everything explicit, with
 * an exact projection after every stage. Because the projection is linear and
 * each stage starts divergence-free, this is the Runge-Kutta scheme applied
 * to the projected equations, so there is no splitting error.
 *
 * Variable placement for cell (i, j, k), stored as vec4f(u, v, w, p) at
 * index i + Nx * (k + Nz * j):
 *
 *   u  on the x face at x = i dx,       cell-centred in y and z
 *   v  on the y face at y = yFaces[j],  cell-centred in x and z (v = 0 at j = 0)
 *   w  on the z face at z = k dz,       cell-centred in x and y
 *   p  at the cell centre
 *
 * Passes per stage: predictor, divergence, five for the Poisson solve, and
 * correction. The state is back in `state` after every stage.
 */

import { createChannelPoisson } from '../webgpu-poisson/channel-poisson.js';

// Wray's low-storage RK3. Stage s advances by (GAMMA[s] + ZETA[s]) dt.
const GAMMA = [8 / 15, 5 / 12, 3 / 4];
const ZETA = [0, -17 / 60, -5 / 12];

/** Stability limits of RK3 on the imaginary and negative real axes. */
export const RK3_IMAGINARY_LIMIT = Math.sqrt(3);
export const RK3_REAL_LIMIT = 2.5127;

const PARAM_FLOATS = 8;
const STAT_FLOATS = 12;
const STAT_BYTES = 4 * STAT_FLOATS;

/** WGSL grid constants and the stage parameter struct, shared by every shader that reads the state. */
export function gridHeaderWGSL({ Nx, Ny, Nz, dx, dz, wallSign }) {
  return /* wgsl */ `
const NX = ${Nx}u;
const NY = ${Ny}u;
const NZ = ${Nz}u;
const IDX = ${(1 / dx).toExponential(9)};
const IDZ = ${(1 / dz).toExponential(9)};
const WALL = ${wallSign.toFixed(1)};

struct Params {
  a: f32,          // dt * gamma
  b: f32,          // dt * zeta
  nu: f32,
  fx: f32,
  invAlphaDt: f32, // 1 / (dt * (gamma + zeta))
  pad0: f32,
  pad1: f32,
  pad2: f32,
}

// Per-row mesh data: (1 / h_j, 1 / (yc_j - yc_{j-1}), 1 / (yc_{j+1} - yc_j),
// h_{j-1} / (h_{j-1} + h_j)). Beyond a wall the centre spacing is that of the
// mirrored cell.
`;
}

/**
 * WGSL accessor for the velocity buffer `name` with periodic wrap in x and z
 * and mirrored ghost cells beyond the walls. The ghost tangential velocity is
 * WALL times the interior one (-1: no slip, +1: free slip), and the ghost
 * wall-normal velocity is zero, which is also the value on the top wall.
 */
export function stateAccessorWGSL(name) {
  return /* wgsl */ `
fn at(i: i32, j: i32, k: i32) -> vec4f {
  let ii = u32(i + i32(NX)) & (NX - 1u);
  let kk = u32(k + i32(NZ)) & (NZ - 1u);
  let jj = u32(clamp(j, 0, i32(NY) - 1));
  var q = ${name}[ii + NX * (kk + NZ * jj)];
  if (j < 0 || j >= i32(NY)) {
    q = vec4f(WALL * q.x, 0.0, WALL * q.z, q.w);
  }
  return q;
}
`;
}

function predictorShader(cfg) {
  return /* wgsl */ `
${gridHeaderWGSL(cfg)}
@group(0) @binding(0) var<storage, read> U: array<vec4f>;
@group(0) @binding(1) var<storage, read_write> Ustar: array<vec4f>;
@group(0) @binding(2) var<storage, read_write> R: array<vec4f>;
@group(0) @binding(3) var<storage, read> ymesh: array<vec4f>;
@group(0) @binding(4) var<uniform> params: Params;
${stateAccessorWGSL('U')}
@compute @workgroup_size(${cfg.wg.join(', ')})
fn main(@builtin(global_invocation_id) gid: vec3u) {
  if (gid.x >= NX || gid.y >= NZ || gid.z >= NY) { return; }
  let i = i32(gid.x);
  let k = i32(gid.y);
  let j = i32(gid.z);
  let idx = gid.x + NX * (gid.y + NZ * gid.z);

  let c = at(i, j, k);
  let xm = at(i - 1, j, k);
  let xp = at(i + 1, j, k);
  let ym = at(i, j - 1, k);
  let yp = at(i, j + 1, k);
  let zm = at(i, j, k - 1);
  let zp = at(i, j, k + 1);
  let xm_yp = at(i - 1, j + 1, k);
  let xp_ym = at(i + 1, j - 1, k);
  let xm_zp = at(i - 1, j, k + 1);
  let xp_zm = at(i + 1, j, k - 1);
  let yp_zm = at(i, j + 1, k - 1);
  let ym_zp = at(i, j - 1, k + 1);

  let m = ymesh[gid.z];
  let ih = m.x;
  let ihm = m.y;
  let ihp = m.z;
  let wm = m.w;
  let wp = 1.0 - wm;
  let IDX2 = IDX * IDX;
  let IDZ2 = IDZ * IDZ;

  // ---- u: control volume around the x face ----
  let uE = 0.5 * (c.x + xp.x);
  let uW = 0.5 * (c.x + xm.x);
  var conv = (uE * uE - uW * uW) * IDX;
  conv += (0.5 * (yp.y + xm_yp.y) * 0.5 * (c.x + yp.x)
         - 0.5 * (c.y + xm.y) * 0.5 * (c.x + ym.x)) * ih;
  conv += (0.5 * (zp.z + xm_zp.z) * 0.5 * (c.x + zp.x)
         - 0.5 * (c.z + xm.z) * 0.5 * (c.x + zm.x)) * IDZ;
  var visc = (xp.x - 2.0 * c.x + xm.x) * IDX2 + (zp.x - 2.0 * c.x + zm.x) * IDZ2
           + ih * ((yp.x - c.x) * ihp - (c.x - ym.x) * ihm);
  let ru = -conv + params.nu * visc + params.fx;

  // ---- w: control volume around the z face ----
  let wN = 0.5 * (c.z + zp.z);
  let wS = 0.5 * (c.z + zm.z);
  conv = (wN * wN - wS * wS) * IDZ;
  conv += (0.5 * (xp.x + xp_zm.x) * 0.5 * (c.z + xp.z)
         - 0.5 * (c.x + zm.x) * 0.5 * (c.z + xm.z)) * IDX;
  conv += (0.5 * (yp.y + yp_zm.y) * 0.5 * (c.z + yp.z)
         - 0.5 * (c.y + zm.y) * 0.5 * (c.z + ym.z)) * ih;
  visc = (xp.z - 2.0 * c.z + xm.z) * IDX2 + (zp.z - 2.0 * c.z + zm.z) * IDZ2
       + ih * ((yp.z - c.z) * ihp - (c.z - ym.z) * ihm);
  let rw = -conv + params.nu * visc;

  // ---- v: control volume around the y face, spanning half of cell j-1 and
  // half of cell j. The advecting u and w are the height-weighted means of
  // the two rows, which is what makes this volume's mass balance the average
  // of the two cells' mass balances.
  var rv = 0.0;
  if (j > 0) {
    conv = ((wm * xp_ym.x + wp * xp.x) * 0.5 * (c.y + xp.y)
          - (wm * ym.x + wp * c.x) * 0.5 * (c.y + xm.y)) * IDX;
    conv += ((wm * ym_zp.z + wp * zp.z) * 0.5 * (c.y + zp.y)
           - (wm * ym.z + wp * c.z) * 0.5 * (c.y + zm.y)) * IDZ;
    let vT = 0.5 * (c.y + yp.y);
    let vB = 0.5 * (c.y + ym.y);
    conv += (vT * vT - vB * vB) * ihm;
    let ihBelow = ymesh[gid.z - 1u].x;
    visc = (xp.y - 2.0 * c.y + xm.y) * IDX2 + (zp.y - 2.0 * c.y + zm.y) * IDZ2
         + ihm * ((yp.y - c.y) * ih - (c.y - ym.y) * ihBelow);
    rv = -conv + params.nu * visc;
  }

  let r = vec4f(ru, rv, rw, 0.0);
  Ustar[idx] = c + params.a * r + params.b * R[idx];
  R[idx] = r;
}
`;
}

function divergenceShader(cfg) {
  return /* wgsl */ `
${gridHeaderWGSL(cfg)}
@group(0) @binding(0) var<storage, read> Ustar: array<vec4f>;
@group(0) @binding(1) var<storage, read_write> phi: array<f32>;
@group(0) @binding(2) var<storage, read> ymesh: array<vec4f>;
${stateAccessorWGSL('Ustar')}
@compute @workgroup_size(${cfg.wg.join(', ')})
fn main(@builtin(global_invocation_id) gid: vec3u) {
  if (gid.x >= NX || gid.y >= NZ || gid.z >= NY) { return; }
  let i = i32(gid.x);
  let k = i32(gid.y);
  let j = i32(gid.z);
  let c = at(i, j, k);
  phi[gid.x + NX * (gid.y + NZ * gid.z)] =
      (at(i + 1, j, k).x - c.x) * IDX
    + (at(i, j, k + 1).z - c.z) * IDZ
    + (at(i, j + 1, k).y - c.y) * ymesh[gid.z].x;
}
`;
}

function correctionShader(cfg) {
  return /* wgsl */ `
${gridHeaderWGSL(cfg)}
@group(0) @binding(0) var<storage, read> Ustar: array<vec4f>;
@group(0) @binding(1) var<storage, read> phi: array<f32>;
@group(0) @binding(2) var<storage, read_write> U: array<vec4f>;
@group(0) @binding(3) var<storage, read> ymesh: array<vec4f>;
@group(0) @binding(4) var<uniform> params: Params;

@compute @workgroup_size(${cfg.wg.join(', ')})
fn main(@builtin(global_invocation_id) gid: vec3u) {
  if (gid.x >= NX || gid.y >= NZ || gid.z >= NY) { return; }
  let idx = gid.x + NX * (gid.y + NZ * gid.z);
  let xm = ((gid.x + NX - 1u) & (NX - 1u)) + NX * (gid.y + NZ * gid.z);
  let zm = gid.x + NX * (((gid.y + NZ - 1u) & (NZ - 1u)) + NZ * gid.z);
  let q = Ustar[idx];
  let f = phi[idx];
  var v = 0.0;
  if (gid.z > 0u) {
    v = q.y - (f - phi[idx - NX * NZ]) * ymesh[gid.z].y;
  }
  U[idx] = vec4f(q.x - (f - phi[xm]) * IDX, v, q.z - (f - phi[zm]) * IDZ, f * params.invAlphaDt);
}
`;
}

/**
 * Plane statistics, reduced in two steps so that neighbouring threads read
 * neighbouring memory: first over z for every (i, j), then over x.
 *
 * Per plane j, twelve floats:
 *   0 sum u      1 sum u^2    2 sum v^2 (on the face below)    3 sum w^2
 *   4 sum u v (both averaged to the cell centre)
 *   5 max (|u|/dx + |v|/h + |w|/dz)     6 max |div u|     7 sum w
 *   8, 9   sums of the squared second and first differences of u in x
 *   10, 11 the same in z
 * The last four measure how close the streamwise velocity is to the grid
 * scale; see `statistics`.
 */
function statsShaders(cfg) {
  const common = /* wgsl */ `
${gridHeaderWGSL(cfg)}
struct Stats { s: vec4f, t: vec4f, r: vec4f }
`;
  const overZ = /* wgsl */ `
${common}
@group(0) @binding(0) var<storage, read> U: array<vec4f>;
@group(0) @binding(1) var<storage, read_write> cols: array<Stats>;
@group(0) @binding(2) var<storage, read> ymesh: array<vec4f>;
${stateAccessorWGSL('U')}
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  if (gid.x >= NX || gid.y >= NY) { return; }
  let i = i32(gid.x);
  let j = i32(gid.y);
  let ih = ymesh[gid.y].x;
  var s = vec4f(0.0);
  var t = vec4f(0.0);
  var r = vec4f(0.0);
  for (var k = 0; k < i32(NZ); k++) {
    let c = at(i, j, k);
    let xp = at(i + 1, j, k);
    let yp = at(i, j + 1, k);
    let zp = at(i, j, k + 1);
    let xm = at(i - 1, j, k);
    let zm = at(i, j, k - 1);
    let d2x = xp.x - 2.0 * c.x + xm.x;
    let d1x = xp.x - xm.x;
    let d2z = zp.x - 2.0 * c.x + zm.x;
    let d1z = zp.x - zm.x;
    r += vec4f(d2x * d2x, d1x * d1x, d2z * d2z, d1z * d1z);
    let uc = 0.5 * (c.x + xp.x);
    let vc = 0.5 * (c.y + yp.y);
    s += vec4f(c.x, c.x * c.x, c.y * c.y, c.z * c.z);
    let div = (xp.x - c.x) * IDX + (zp.z - c.z) * IDZ + (yp.y - c.y) * ih;
    let cfl = abs(c.x) * IDX + abs(c.z) * IDZ + abs(c.y) * ih;
    t = vec4f(t.x + uc * vc, max(t.y, cfl), max(t.z, abs(div)), t.w + c.z);
  }
  cols[gid.x + NX * gid.y] = Stats(s, t, r);
}
`;
  const overX = /* wgsl */ `
${common}
@group(0) @binding(0) var<storage, read> cols: array<Stats>;
@group(0) @binding(1) var<storage, read_write> planes: array<Stats>;
@compute @workgroup_size(16)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  if (gid.x >= NY) { return; }
  var s = vec4f(0.0);
  var t = vec4f(0.0);
  var r = vec4f(0.0);
  for (var i = 0u; i < NX; i++) {
    let q = cols[i + NX * gid.x];
    s += q.s;
    r += q.r;
    t = vec4f(t.x + q.t.x, max(t.y, q.t.y), max(t.z, q.t.z), t.w + q.t.w);
  }
  planes[gid.x] = Stats(s, t, r);
}
`;
  return { overZ, overX };
}

/**
 * @param {GPUDevice} device
 * @param {Object} opts
 * @param {number} opts.Nx, opts.Ny, opts.Nz - cells; Nx and Nz powers of two
 * @param {number} opts.Lx, opts.Lz - periodic lengths
 * @param {ArrayLike<number>} opts.yFaces - Ny + 1 face positions
 * @param {number} opts.nu - kinematic viscosity
 * @param {number} [opts.forcing] - uniform streamwise body force (minus the
 *   mean pressure gradient)
 * @param {'no-slip'|'free-slip'} [opts.wall]
 * @param {[number, number, number]} [opts.workgroup] - stencil workgroup size
 *   in (x, z, y) (tuning)
 */
export function createChannelFlow(device, opts) {
  const { Nx, Ny, Nz, Lx, Lz } = opts;
  const yFaces = Float64Array.from(opts.yFaces);
  const dx = Lx / Nx;
  const dz = Lz / Nz;
  const cells = Nx * Ny * Nz;
  const wg = opts.workgroup ?? [16, 4, 4];
  const cfg = { Nx, Ny, Nz, dx, dz, wg, wallSign: opts.wall === 'free-slip' ? 1 : -1 };

  if (cells * 16 > device.limits.maxStorageBufferBindingSize) {
    throw new Error(
      `State needs a ${cells * 16} byte storage binding; the device allows ` +
        `${device.limits.maxStorageBufferBindingSize}. Request a larger ` +
        `maxStorageBufferBindingSize when creating the device.`
    );
  }

  const h = Float64Array.from({ length: Ny }, (_, j) => yFaces[j + 1] - yFaces[j]);
  const yc = Float64Array.from({ length: Ny }, (_, j) => 0.5 * (yFaces[j] + yFaces[j + 1]));
  // hf[j]: distance between the centres either side of face j, mirrored at walls.
  const hf = Float64Array.from({ length: Ny + 1 }, (_, j) =>
    j === 0 ? h[0] : j === Ny ? h[Ny - 1] : yc[j] - yc[j - 1]
  );
  const ymeshData = new Float32Array(4 * Ny);
  for (let j = 0; j < Ny; j++) {
    ymeshData[4 * j] = 1 / h[j];
    ymeshData[4 * j + 1] = 1 / hf[j];
    ymeshData[4 * j + 2] = 1 / hf[j + 1];
    ymeshData[4 * j + 3] = j === 0 ? 0.5 : h[j - 1] / (h[j - 1] + h[j]);
  }

  const owned = [];
  const makeBuffer = (label, size, usage, data) => {
    const buffer = device.createBuffer({ label, size, usage });
    if (data) device.queue.writeBuffer(buffer, 0, data);
    owned.push(buffer);
    return buffer;
  };
  const FIELD = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
  const state = makeBuffer('flow state', cells * 16, FIELD);
  const star = makeBuffer('flow predictor', cells * 16, FIELD);
  const rhsPrev = makeBuffer('flow previous rhs', cells * 16, FIELD);
  const phi = makeBuffer('flow phi', cells * 4, FIELD);
  const ymesh = makeBuffer('flow y mesh', ymeshData.byteLength, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, ymeshData);
  const params = [0, 1, 2].map((s) =>
    makeBuffer(`flow params ${s}`, PARAM_FLOATS * 4, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
  );
  const cols = makeBuffer('flow column stats', Nx * Ny * STAT_BYTES, GPUBufferUsage.STORAGE);
  const planes = makeBuffer('flow plane stats', Ny * STAT_BYTES, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
  const planesRead = makeBuffer('flow plane stats readback', Ny * STAT_BYTES, GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ);

  // The Poisson solver reads its right-hand side from, and writes its
  // solution to, the same scalar buffer.
  const poisson = createChannelPoisson(device, {
    Nx, Ny, Nz, Lx, Lz, yFaces, rhs: phi, pressure: phi,
    maxInvocations: opts.maxInvocations,
  });

  const pipeline = (label, code) =>
    device.createComputePipeline({
      label,
      layout: 'auto',
      compute: { module: device.createShaderModule({ label, code }), entryPoint: 'main' },
    });
  const bind = (pipe, buffers) =>
    device.createBindGroup({
      layout: pipe.getBindGroupLayout(0),
      entries: buffers.map((buffer, binding) => ({ binding, resource: { buffer } })),
    });

  const predictor = pipeline('flow: predictor', predictorShader(cfg));
  const divergence = pipeline('flow: divergence', divergenceShader(cfg));
  const correction = pipeline('flow: correction', correctionShader(cfg));
  const stats = statsShaders(cfg);
  const statsZ = pipeline('flow: stats over z', stats.overZ);
  const statsX = pipeline('flow: stats over x', stats.overX);

  const predictorBind = params.map((p) => bind(predictor, [state, star, rhsPrev, ymesh, p]));
  const divergenceBind = bind(divergence, [star, phi, ymesh]);
  const correctionBind = params.map((p) => bind(correction, [star, phi, state, ymesh, p]));
  const statsZBind = bind(statsZ, [state, cols, ymesh]);
  const statsXBind = bind(statsX, [cols, planes]);

  const grid = [Math.ceil(Nx / wg[0]), Math.ceil(Nz / wg[1]), Math.ceil(Ny / wg[2])];

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

  const encodeProjection = (pass, s) => {
    pass.setPipeline(divergence);
    pass.setBindGroup(0, divergenceBind);
    pass.dispatchWorkgroups(...grid);
    for (const st of poisson.stages) poisson.runStage(pass, st);
    pass.setPipeline(correction);
    pass.setBindGroup(0, correctionBind[s]);
    pass.dispatchWorkgroups(...grid);
  };

  const encodeStep = (pass) => {
    for (let s = 0; s < 3; s++) {
      pass.setPipeline(predictor);
      pass.setBindGroup(0, predictorBind[s]);
      pass.dispatchWorkgroups(...grid);
      encodeProjection(pass, s);
    }
  };

  let statsBusy = false;
  let destroyed = false;

  return {
    Nx, Ny, Nz, Lx, Lz, dx, dz, cells,
    yFaces, yCenters: yc, heights: h, faceSpacings: hf,
    state,
    config: cfg,
    poisson,
    sim,
    get time() { return sim.time; },
    get steps() { return sim.steps; },
    get bytes() { return owned.reduce((sum, b) => sum + b.size, 0) + poisson.bytes; },

    /**
     * Advance `n` steps of size `dt`. The viscosity and forcing in `sim` are
     * picked up here, so they may be changed between calls.
     */
    advance(dt, n = 1) {
      writeParams(dt);
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass({ label: 'flow step' });
      for (let i = 0; i < n; i++) encodeStep(pass);
      pass.end();
      device.queue.submit([encoder.finish()]);
      sim.dt = dt;
      sim.time += n * dt;
      sim.steps += n;
    },

    /** Upload interleaved (u, v, w, p) for every cell. */
    setState(data) {
      if (data.length !== cells * 4) throw new Error(`state must have ${cells * 4} floats`);
      device.queue.writeBuffer(state, 0, data);
    },

    /**
     * Make the current state divergence-free, and zero the wall-normal
     * velocity on the bottom wall. Use after `setState` with arbitrary data.
     */
    project() {
      writeParams(Number.isFinite(written.dt) ? written.dt : 1);
      // Twice: for a field far from divergence-free, one single-precision
      // solve leaves a residual set by the size of the correction. The
      // second pass removes it.
      const encoder = device.createCommandEncoder();
      for (let pass = 0; pass < 2; pass++) {
        encoder.copyBufferToBuffer(state, 0, star, 0, cells * 16);
        const compute = encoder.beginComputePass({ label: 'flow projection' });
        encodeProjection(compute, 0);
        compute.end();
      }
      device.queue.submit([encoder.finish()]);
    },

    /** Read back the full state as interleaved (u, v, w, p). */
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
     * Plane-averaged statistics and stability numbers, reduced on the GPU so
     * only 12 Ny floats cross back. Returns null if a previous call is still
     * in flight, or if the flow is destroyed before the data arrive.
     *
     * Profiles are over y (length Ny). `uv` is the Reynolds shear stress
     * including the mean-flow contribution, which is zero in a channel since
     * the mean of v vanishes.
     *
     * `gridScale` is a resolution monitor. For each of x and z it gives the
     * typical wavenumber of the streamwise velocity as a fraction of the
     * largest the grid can hold (two points per wave), weighted towards the
     * short waves that carry the gradients. It is computed from the ratio of
     * second to first differences, which for a single wave of wavenumber k
     * is tan^2(k h / 2). `profileX` and `profileZ` hold the value on each
     * plane, and `x` and `z` the value for the whole field, which weights
     * each plane by how much the velocity varies there. Where the variation
     * is too small to tell from rounding error the value is zero. Values near
     * 0.25 mean eight points
     * per wave. Above about 0.5 the field is dominated by waves of fewer
     * than four points and is not resolved.
     */
    async statistics() {
      if (statsBusy || destroyed) return null;
      statsBusy = true;
      try {
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginComputePass({ label: 'flow statistics' });
        pass.setPipeline(statsZ);
        pass.setBindGroup(0, statsZBind);
        pass.dispatchWorkgroups(Math.ceil(Nx / 64), Ny);
        pass.setPipeline(statsX);
        pass.setBindGroup(0, statsXBind);
        pass.dispatchWorkgroups(Math.ceil(Ny / 16));
        pass.end();
        encoder.copyBufferToBuffer(planes, 0, planesRead, 0, Ny * STAT_BYTES);
        device.queue.submit([encoder.finish()]);
        const time = sim.time;
        await planesRead.mapAsync(GPUMapMode.READ);
        const raw = new Float32Array(planesRead.getMappedRange().slice(0));
        planesRead.unmap();

        const n = Nx * Nz;
        const mean = (o) => Float64Array.from({ length: Ny }, (_, j) => raw[STAT_FLOATS * j + o] / n);
        const out = {
          time,
          y: yc,
          u: mean(0), uu: mean(1), vv: mean(2), ww: mean(3), uv: mean(4), w: mean(7),
          maxCfl: 0, maxDivergence: 0, bulkVelocity: 0, kineticEnergy: 0,
        };
        // Differences smaller than this fraction of u^2 are rounding noise.
        const NOISE = 1e-11;
        const fraction = (second, first, square) =>
          first > NOISE * square ? (2 / Math.PI) * Math.atan(Math.sqrt(second / first)) : 0;
        const at = (j, o) => raw[STAT_FLOATS * j + o];
        const total = (o) => { let t = 0; for (let j = 0; j < Ny; j++) t += at(j, o); return t; };
        out.gridScale = {
          x: fraction(total(8), total(9), total(1)),
          z: fraction(total(10), total(11), total(1)),
          profileX: Float64Array.from({ length: Ny }, (_, j) => fraction(at(j, 8), at(j, 9), at(j, 1))),
          profileZ: Float64Array.from({ length: Ny }, (_, j) => fraction(at(j, 10), at(j, 11), at(j, 1))),
        };
        const height = yFaces[Ny] - yFaces[0];
        for (let j = 0; j < Ny; j++) {
          out.maxCfl = Math.max(out.maxCfl, raw[STAT_FLOATS * j + 5]);
          out.maxDivergence = Math.max(out.maxDivergence, raw[STAT_FLOATS * j + 6]);
          out.bulkVelocity += (out.u[j] * h[j]) / height;
          // v^2 belongs to the face below cell j, whose control volume has height hf[j].
          out.kineticEnergy += (0.5 * (out.uu[j] * h[j] + out.ww[j] * h[j] + out.vv[j] * hf[j])) / height;
        }
        // Wall shear stress / density from the one-sided difference the scheme itself uses.
        out.wallShear = [
          (sim.nu * out.u[0]) / (0.5 * h[0]),
          (sim.nu * out.u[Ny - 1]) / (0.5 * h[Ny - 1]),
        ];
        return out;
      } catch (error) {
        // Destroying the buffers rejects a read that is still in flight.
        if (destroyed) return null;
        throw error;
      } finally {
        statsBusy = false;
      }
    },

    /**
     * Largest stable time step for the current flow, times `safety`.
     * `stats` is the result of `statistics()`.
     */
    stableTimeStep(stats, safety = 0.5) {
      let hmin = Infinity;
      for (let j = 0; j < Ny; j++) hmin = Math.min(hmin, h[j]);
      const viscous = 4 * sim.nu * (1 / (dx * dx) + 1 / (dz * dz) + 1 / (hmin * hmin));
      const convective = stats.maxCfl;
      return safety * Math.min(
        convective > 0 ? RK3_IMAGINARY_LIMIT / convective : Infinity,
        viscous > 0 ? RK3_REAL_LIMIT / viscous : Infinity
      );
    },

    destroy() {
      destroyed = true;
      for (const b of owned) b.destroy();
      poisson.destroy();
    },
  };
}
