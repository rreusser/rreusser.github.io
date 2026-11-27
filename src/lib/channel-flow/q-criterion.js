/**
 * Isosurfaces of the Q-criterion, extracted on the GPU with marching cubes.
 *
 * Q = (|Omega|^2 - |S|^2) / 2 = -(du_i/dx_j)(du_j/dx_i) / 2 is positive where
 * rotation dominates strain, which picks out vortex cores.
 *
 * Two compute passes per extraction:
 *
 *  1. Q at every cell centre from the staggered velocities, stored together
 *     with the cell-centred streamwise velocity (used to colour the surface).
 *  2. Marching cubes on the grid whose corners are the cell centres. Each
 *     thread handles one cube; if the surface crosses it, the thread reserves
 *     room for its triangles with an atomic counter and writes them. The
 *     triangle order is therefore arbitrary, which does not matter for an
 *     opaque surface drawn with a depth buffer.
 *
 * A third, single-thread pass copies the vertex count into an indirect draw
 * buffer, so the count never has to be read back to the CPU.
 *
 * Vertices are two vec4f: (position, colour scalar) and (grad Q, 0). The
 * gradient points into the vortex core, so the outward normal is its negative.
 */

import { gridHeaderWGSL, stateAccessorWGSL } from './channel-flow.js';
import { TRIANGLE_TABLE, EDGE_CORNERS, CORNER_OFFSETS } from './marching-cubes-table.js';

export const VERTEX_BYTES = 32;

const EDGE_BASE = 4096;
const CORNER_BASE = EDGE_BASE + 24;

function qShader(cfg) {
  return /* wgsl */ `
${gridHeaderWGSL(cfg)}
@group(0) @binding(0) var<storage, read> U: array<vec4f>;
@group(0) @binding(1) var<storage, read_write> q: array<vec2f>;
// Per row: (centre height, 1 / h_j, 1 / (yc_{j+1} - yc_{j-1}), 0)
@group(0) @binding(2) var<storage, read> rows: array<vec4f>;
${stateAccessorWGSL('U')}
@compute @workgroup_size(${cfg.wg.join(', ')})
fn main(@builtin(global_invocation_id) gid: vec3u) {
  if (gid.x >= NX || gid.y >= NZ || gid.z >= NY) { return; }
  let i = i32(gid.x);
  let k = i32(gid.y);
  let j = i32(gid.z);
  let c = at(i, j, k);
  let xm = at(i - 1, j, k);
  let xp = at(i + 1, j, k);
  let ym = at(i, j - 1, k);
  let yp = at(i, j + 1, k);
  let zm = at(i, j, k - 1);
  let zp = at(i, j, k + 1);
  let xp_yp = at(i + 1, j + 1, k);
  let xp_ym = at(i + 1, j - 1, k);
  let xm_yp = at(i - 1, j + 1, k);
  let xp_zp = at(i + 1, j, k + 1);
  let xp_zm = at(i + 1, j, k - 1);
  let xm_zp = at(i - 1, j, k + 1);
  let yp_zp = at(i, j + 1, k + 1);
  let yp_zm = at(i, j + 1, k - 1);
  let ym_zp = at(i, j - 1, k + 1);

  let row = rows[gid.z];
  let hx = 0.5 * IDX;
  let hz = 0.5 * IDZ;

  // Diagonal terms are exact differences across the cell. Off-diagonal terms
  // average the staggered component to cell centres, then difference centrally.
  let ux = (xp.x - c.x) * IDX;
  let vy = (yp.y - c.y) * row.y;
  let wz = (zp.z - c.z) * IDZ;
  let uy = 0.5 * (yp.x + xp_yp.x - ym.x - xp_ym.x) * row.z;
  let uz = 0.5 * (zp.x + xp_zp.x - zm.x - xp_zm.x) * hz;
  let vx = 0.5 * (xp.y + xp_yp.y - xm.y - xm_yp.y) * hx;
  let vz = 0.5 * (zp.y + yp_zp.y - zm.y - yp_zm.y) * hz;
  let wx = 0.5 * (xp.z + xp_zp.z - xm.z - xm_zp.z) * hx;
  let wy = 0.5 * (yp.z + yp_zp.z - ym.z - ym_zp.z) * row.z;

  let Q = -0.5 * (ux * ux + vy * vy + wz * wz) - (uy * vx + uz * wx + vz * wy);
  q[gid.x + NX * (gid.y + NZ * gid.z)] = vec2f(Q, 0.5 * (c.x + xp.x));
}
`;
}

function marchShader(cfg, capacity) {
  return /* wgsl */ `
${gridHeaderWGSL(cfg)}
const CAPACITY = ${capacity}u;

struct Vertex { position: vec4f, gradient: vec4f }
struct Counter { count: atomic<u32> }
struct Iso { level: f32 }

@group(0) @binding(0) var<storage, read> q: array<vec2f>;
@group(0) @binding(1) var<storage, read> rows: array<vec4f>;
// [0, 4096): triangle table. Then 12 edges x 2 corners, then 8 corners x 3 offsets.
@group(0) @binding(2) var<storage, read> tables: array<i32>;
@group(0) @binding(3) var<storage, read_write> vertices: array<Vertex>;
@group(0) @binding(4) var<storage, read_write> counter: Counter;
@group(0) @binding(5) var<uniform> iso: Iso;

fn sample(i: i32, j: i32, k: i32) -> vec2f {
  let ii = u32(i + i32(NX)) & (NX - 1u);
  let kk = u32(k + i32(NZ)) & (NZ - 1u);
  let jj = u32(clamp(j, 0, i32(NY) - 1));
  return q[ii + NX * (kk + NZ * jj)];
}

fn gradient(i: i32, j: i32, k: i32) -> vec3f {
  return vec3f(
    (sample(i + 1, j, k).x - sample(i - 1, j, k).x) * 0.5 * IDX,
    (sample(i, j + 1, k).x - sample(i, j - 1, k).x) * rows[u32(j)].z,
    (sample(i, j, k + 1).x - sample(i, j, k - 1).x) * 0.5 * IDZ
  );
}

@compute @workgroup_size(${cfg.wg.join(', ')})
fn main(@builtin(global_invocation_id) gid: vec3u) {
  // Cubes span rows j and j + 1, and wrap around in x and z.
  if (gid.x >= NX || gid.y >= NZ || gid.z >= NY - 1u) { return; }
  let origin = vec3i(i32(gid.x), i32(gid.z), i32(gid.y)); // (i, j, k)

  var value: array<f32, 8>;
  var scalar: array<f32, 8>;
  var cube = 0u;
  for (var n = 0u; n < 8u; n++) {
    let o = ${CORNER_BASE}u + 3u * n;
    let s = sample(origin.x + tables[o], origin.y + tables[o + 1u], origin.z + tables[o + 2u]);
    value[n] = s.x - iso.level;
    scalar[n] = s.y;
    if (value[n] > 0.0) { cube |= 1u << n; }
  }
  if (cube == 0u || cube == 255u) { return; }

  var count = 0u;
  while (count < 15u && tables[16u * cube + count] >= 0) { count += 3u; }
  let base = atomicAdd(&counter.count, count);
  if (base + count > CAPACITY) { return; }

  var position: array<vec3f, 8>;
  var grad: array<vec3f, 8>;
  for (var n = 0u; n < 8u; n++) {
    let o = ${CORNER_BASE}u + 3u * n;
    let p = origin + vec3i(tables[o], tables[o + 1u], tables[o + 2u]);
    position[n] = vec3f((f32(p.x) + 0.5) / IDX, rows[u32(p.y)].x, (f32(p.z) + 0.5) / IDZ);
    grad[n] = gradient(p.x, p.y, p.z);
  }

  for (var v = 0u; v < count; v++) {
    let edge = u32(tables[16u * cube + v]);
    let a = u32(tables[${EDGE_BASE}u + 2u * edge]);
    let b = u32(tables[${EDGE_BASE}u + 2u * edge + 1u]);
    let t = clamp(value[a] / (value[a] - value[b]), 0.0, 1.0);
    vertices[base + v] = Vertex(
      vec4f(mix(position[a], position[b], t), mix(scalar[a], scalar[b], t)),
      vec4f(mix(grad[a], grad[b], t), 0.0)
    );
  }
}
`;
}

// Every reservation that starts below CAPACITY - 15 succeeds, so vertices
// below that mark are all valid; anything above may be a hole left by a
// reservation that did not fit.
function finalizeShader(capacity) {
  const drawable = Math.floor((capacity - 15) / 3) * 3;
  return /* wgsl */ `
@group(0) @binding(0) var<storage, read> counter: array<u32>;
@group(0) @binding(1) var<storage, read_write> indirect: array<u32>;
@compute @workgroup_size(1)
fn main() {
  indirect[0] = min(counter[0], ${drawable}u);
}
`;
}

/**
 * @param {GPUDevice} device
 * @param {Object} flow - result of createChannelFlow
 * @param {Object} [opts]
 * @param {number} [opts.maxVertices] - capacity of the vertex buffer. The
 *   default allows one triangle for every two cells, capped by the device's
 *   storage binding limit and at 192 MB.
 */
export function createQCriterion(device, flow, opts = {}) {
  const { Nx, Ny, Nz, cells, yCenters, heights } = flow;
  const cfg = flow.config;
  const byteCap = Math.min(device.limits.maxStorageBufferBindingSize, 192 * 2 ** 20);
  const capacity = Math.max(
    48,
    3 * Math.floor(Math.min(opts.maxVertices ?? 1.5 * cells, byteCap / VERTEX_BYTES) / 3)
  );

  // Row data, with centres mirrored through the walls for the wall rows.
  const rowData = new Float32Array(4 * Ny);
  for (let j = 0; j < Ny; j++) {
    const below = j > 0 ? yCenters[j - 1] : 2 * flow.yFaces[0] - yCenters[0];
    const above = j < Ny - 1 ? yCenters[j + 1] : 2 * flow.yFaces[Ny] - yCenters[Ny - 1];
    rowData[4 * j] = yCenters[j];
    rowData[4 * j + 1] = 1 / heights[j];
    rowData[4 * j + 2] = 1 / (above - below);
  }
  const tableData = new Int32Array(CORNER_BASE + 24);
  tableData.set(TRIANGLE_TABLE, 0);
  tableData.set(EDGE_CORNERS.flat(), EDGE_BASE);
  tableData.set(CORNER_OFFSETS.flat(), CORNER_BASE);

  const owned = [];
  const makeBuffer = (label, size, usage, data) => {
    const buffer = device.createBuffer({ label, size, usage });
    if (data) device.queue.writeBuffer(buffer, 0, data);
    owned.push(buffer);
    return buffer;
  };
  const S = GPUBufferUsage.STORAGE;
  const q = makeBuffer('q criterion', cells * 8, S | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST);
  const rows = makeBuffer('q rows', rowData.byteLength, S | GPUBufferUsage.COPY_DST, rowData);
  const tables = makeBuffer('marching cubes tables', tableData.byteLength, S | GPUBufferUsage.COPY_DST, tableData);
  const vertices = makeBuffer('isosurface vertices', capacity * VERTEX_BYTES, S | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_SRC);
  const counter = makeBuffer('isosurface counter', 4, S | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST);
  const indirect = makeBuffer(
    'isosurface indirect',
    16,
    S | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST,
    new Uint32Array([0, 1, 0, 0])
  );
  const level = makeBuffer('isosurface level', 16, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
  const countRead = makeBuffer('isosurface count readback', 4, GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ);

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

  const qPipe = pipeline('q criterion', qShader(cfg));
  const marchPipe = pipeline('marching cubes', marchShader(cfg, capacity));
  const finalizePipe = pipeline('isosurface finalize', finalizeShader(capacity));
  const qBind = bind(qPipe, [flow.state, q, rows]);
  const marchBind = bind(marchPipe, [q, rows, tables, vertices, counter, level]);
  const finalizeBind = bind(finalizePipe, [counter, indirect]);

  const wg = cfg.wg;
  const grid = [Math.ceil(Nx / wg[0]), Math.ceil(Nz / wg[1]), Math.ceil(Ny / wg[2])];
  let countBusy = false;

  return {
    vertices,
    indirect,
    q,
    capacity,
    get bytes() { return owned.reduce((sum, b) => sum + b.size, 0); },

    /**
     * Encode an extraction of the surface Q = `isoLevel` from the current
     * state. With `computeQ: false` the contents of the `q` buffer are used
     * as they are, which lets the marching cubes pass be tested on its own.
     */
    extract(encoder, isoLevel, { computeQ = true } = {}) {
      device.queue.writeBuffer(level, 0, new Float32Array([isoLevel, 0, 0, 0]));
      encoder.clearBuffer(counter);
      const pass = encoder.beginComputePass({ label: 'q isosurface' });
      if (computeQ) {
        pass.setPipeline(qPipe);
        pass.setBindGroup(0, qBind);
        pass.dispatchWorkgroups(...grid);
      }
      pass.setPipeline(marchPipe);
      pass.setBindGroup(0, marchBind);
      pass.dispatchWorkgroups(...grid);
      pass.setPipeline(finalizePipe);
      pass.setBindGroup(0, finalizeBind);
      pass.dispatchWorkgroups(1);
      pass.end();
    },

    /**
     * Number of vertices the last extraction wanted. More than `capacity`
     * means the surface was truncated. Returns null if a read is in flight.
     */
    async vertexCount() {
      if (countBusy) return null;
      countBusy = true;
      try {
        const encoder = device.createCommandEncoder();
        encoder.copyBufferToBuffer(counter, 0, countRead, 0, 4);
        device.queue.submit([encoder.finish()]);
        await countRead.mapAsync(GPUMapMode.READ);
        const n = new Uint32Array(countRead.getMappedRange())[0];
        countRead.unmap();
        return n;
      } finally {
        countBusy = false;
      }
    },

    destroy() {
      for (const b of owned) b.destroy();
    },
  };
}
