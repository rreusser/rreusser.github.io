/**
 * Plane-averaged statistics of a channel flow, reduced on the GPU from the
 * physical-space state so that only a few numbers per plane cross back to
 * the CPU. Shared by the finite-difference and the Fourier solvers.
 *
 * The reduction runs in two steps so that neighbouring threads read
 * neighbouring memory: first over z for every (i, j), then over x.
 *
 * Per plane j, twelve floats:
 *   0 sum u      1 sum u^2    2 sum v^2 (on the face below)    3 sum w^2
 *   4 sum u v (both at the cell centre)
 *   5 max of the convective rate that limits the time step
 *   6 max |div u| (finite-difference solver only)     7 sum w
 *   8, 9   sums of the squared second and first differences of u in x
 *   10, 11 the same in z
 */

import { gridHeaderWGSL, stateAccessorWGSL } from './wgsl-common.js';

const STAT_FLOATS = 12;
const STAT_BYTES = 4 * STAT_FLOATS;

/**
 * `cfg.collocated` says that u and w sit at the same x and z as the cell
 * centre instead of on staggered faces. `cfg.cflX` and `cfg.cflZ` scale the
 * streamwise and spanwise terms of the convective rate: 1 for second-order
 * differences, whose largest effective wavenumber is 1 / h, and larger for a
 * spectral derivative. `cfg.cflY` does the same for the wall-normal term.
 */
function shaders(cfg) {
  const collocated = !!cfg.collocated;
  const cflX = (cfg.cflX ?? 1).toExponential(9);
  const cflZ = (cfg.cflZ ?? 1).toExponential(9);
  const cflY = (cfg.cflY ?? 1).toExponential(9);
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
    let uc = ${collocated ? 'c.x' : '0.5 * (c.x + xp.x)'};
    let vc = 0.5 * (c.y + yp.y);
    s += vec4f(c.x, c.x * c.x, c.y * c.y, c.z * c.z);
    let div = ${collocated ? '0.0' : '(xp.x - c.x) * IDX + (zp.z - c.z) * IDZ + (yp.y - c.y) * ih'};
    let cfl = ${cflX} * abs(c.x) * IDX + ${cflZ} * abs(c.z) * IDZ + ${cflY} * abs(c.y) * ih;
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
 * @param {Object} opts.cfg - grid constants for the shaders
 * @param {GPUBuffer} opts.state - vec4f (u, v, w, p) per cell
 * @param {GPUBuffer} opts.ymesh - per-row mesh data
 * @param {Object} opts.sim - live { nu, time }
 * @param {Object} opts.grid - { Nx, Ny, Nz, yFaces, yCenters, heights, faceSpacings }
 * @param {Object} [opts.divergence] - for solvers that measure divergence
 *   elsewhere: { encode(pass), buffer }, where `buffer` receives one f32 per
 *   plane, the largest divergence found there
 * @param {(u: Float64Array) => [number, number]} [opts.wallSlopes] - du/dy on
 *   the lower and upper walls from the mean profile, both taken positive
 *   into the flow; by default the second-order one-sided difference
 */
export function createFlowStatistics(device, { cfg, state, ymesh, sim, grid, divergence = null, wallSlopes = null }) {
  const { Nx, Ny, Nz, yFaces, yCenters: yc, heights: h, faceSpacings: hf } = grid;
  const code = shaders(cfg);
  const pipeline = (label, wgsl) =>
    device.createComputePipeline({
      label,
      layout: 'auto',
      compute: { module: device.createShaderModule({ label, code: wgsl }), entryPoint: 'main' },
    });
  const bind = (pipe, buffers) =>
    device.createBindGroup({
      layout: pipe.getBindGroupLayout(0),
      entries: buffers.map((buffer, binding) => ({ binding, resource: { buffer } })),
    });

  const readBytes = Ny * STAT_BYTES + (divergence ? Ny * 4 : 0);
  const cols = device.createBuffer({ label: 'flow column stats', size: Nx * Ny * STAT_BYTES, usage: GPUBufferUsage.STORAGE });
  const planes = device.createBuffer({ label: 'flow plane stats', size: Ny * STAT_BYTES, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
  const planesRead = device.createBuffer({ label: 'flow plane stats readback', size: readBytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  const statsZ = pipeline('flow: stats over z', code.overZ);
  const statsX = pipeline('flow: stats over x', code.overX);
  const statsZBind = bind(statsZ, [state, cols, ymesh]);
  const statsXBind = bind(statsX, [cols, planes]);

  let busy = false;
  let destroyed = false;

  return {
    bytes: cols.size + planes.size + planesRead.size,

    /**
     * Returns null if a previous read is still in flight, or if the buffers
     * are destroyed before the data arrive. See the solvers' `statistics`
     * for the meaning of the result.
     */
    async read() {
      if (busy || destroyed) return null;
      busy = true;
      try {
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginComputePass({ label: 'flow statistics' });
        pass.setPipeline(statsZ);
        pass.setBindGroup(0, statsZBind);
        pass.dispatchWorkgroups(Math.ceil(Nx / 64), Ny);
        pass.setPipeline(statsX);
        pass.setBindGroup(0, statsXBind);
        pass.dispatchWorkgroups(Math.ceil(Ny / 16));
        if (divergence) divergence.encode(pass);
        pass.end();
        encoder.copyBufferToBuffer(planes, 0, planesRead, 0, Ny * STAT_BYTES);
        if (divergence) encoder.copyBufferToBuffer(divergence.buffer, 0, planesRead, Ny * STAT_BYTES, Ny * 4);
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
          out.maxCfl = Math.max(out.maxCfl, at(j, 5));
          out.maxDivergence = Math.max(
            out.maxDivergence,
            divergence ? raw[STAT_FLOATS * Ny + j] : at(j, 6)
          );
          out.bulkVelocity += (out.u[j] * h[j]) / height;
          // v^2 belongs to the face below cell j, whose control volume has height hf[j].
          out.kineticEnergy += (0.5 * (out.uu[j] * h[j] + out.ww[j] * h[j] + out.vv[j] * hf[j])) / height;
        }
        // Wall shear stress / density from the one-sided difference the scheme itself uses.
        out.wallShear = wallSlopes
          ? wallSlopes(out.u).map((slope) => sim.nu * slope)
          : [(sim.nu * out.u[0]) / (0.5 * h[0]), (sim.nu * out.u[Ny - 1]) / (0.5 * h[Ny - 1])];
        return out;
      } catch (error) {
        // Destroying the buffers rejects a read that is still in flight.
        if (destroyed) return null;
        throw error;
      } finally {
        busy = false;
      }
    },

    destroy() {
      destroyed = true;
      cols.destroy();
      planes.destroy();
      planesRead.destroy();
    },
  };
}
