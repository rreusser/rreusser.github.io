/**
 * Draw a planar slice of the channel flow state straight from the GPU state
 * buffer: a full-screen triangle whose fragment shader looks up the cell
 * under each pixel. Nothing is read back to the CPU.
 */

export const SLICE_PLANES = { xy: 0, xz: 1, zy: 2 };
export const SLICE_COMPONENTS = { u: 0, v: 1, w: 2, p: 3 };

function shader({ Nx, Ny, Nz }) {
  return /* wgsl */ `
const NX = ${Nx}u;
const NY = ${Ny}u;
const NZ = ${Nz}u;

struct View {
  plane: u32,      // 0: x-y at fixed k, 1: x-z at fixed j, 2: z-y at fixed i
  index: u32,
  component: u32,
  diverging: u32,
  lo: f32,
  hi: f32,
}

@group(0) @binding(0) var<storage, read> state: array<vec4f>;
@group(0) @binding(1) var<storage, read> yFaces: array<f32>;
@group(0) @binding(2) var<uniform> view: View;

struct VSOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f }

@vertex
fn vs(@builtin(vertex_index) i: u32) -> VSOut {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  return VSOut(vec4f(p * 2.0 - 1.0, 0.0, 1.0), p);
}

// Row whose cell contains the height fraction t (0 at the bottom wall).
fn row(t: f32) -> u32 {
  let y = mix(yFaces[0], yFaces[NY], clamp(t, 0.0, 1.0));
  var lo = 0u;
  var hi = NY;
  for (var s = 0u; s < 12u; s++) {
    if (hi - lo <= 1u) { break; }
    let mid = (lo + hi) / 2u;
    if (yFaces[mid] <= y) { lo = mid; } else { hi = mid; }
  }
  return lo;
}

fn viridis(t: f32) -> vec3f {
  let c0 = vec3f(0.2777273272234177, 0.005407344544966578, 0.3340998053353061);
  let c1 = vec3f(0.1050930431085774, 1.404613529898575, 1.384590162594685);
  let c2 = vec3f(-0.3308618287255563, 0.214847559468213, 0.09509516302823659);
  let c3 = vec3f(-4.634230498983486, -5.799100973351585, -19.33244095627987);
  let c4 = vec3f(6.228269936347081, 14.17993336680509, 56.69055260068105);
  let c5 = vec3f(4.776384997670288, -13.74514537774601, -65.35303263337234);
  let c6 = vec3f(-5.435455855934631, 4.645852612178535, 26.3124352495832);
  return c0 + t * (c1 + t * (c2 + t * (c3 + t * (c4 + t * (c5 + t * c6)))));
}

fn coolwarm(t: f32) -> vec3f {
  let cold = vec3f(0.230, 0.299, 0.754);
  let mid = vec3f(0.92, 0.92, 0.92);
  let warm = vec3f(0.706, 0.016, 0.150);
  return select(mix(mid, warm, t * 2.0 - 1.0), mix(cold, mid, t * 2.0), t < 0.5);
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  var i = 0u;
  var j = 0u;
  var k = 0u;
  let a = min(u32(in.uv.x * f32(NX)), NX - 1u);
  if (view.plane == 0u) {
    i = a; j = row(in.uv.y); k = min(view.index, NZ - 1u);
  } else if (view.plane == 1u) {
    i = a; j = min(view.index, NY - 1u); k = min(u32(in.uv.y * f32(NZ)), NZ - 1u);
  } else {
    i = min(view.index, NX - 1u); j = row(in.uv.y); k = min(u32(in.uv.x * f32(NZ)), NZ - 1u);
  }
  let value = state[i + NX * (k + NZ * j)][view.component];
  if (value != value) { return vec4f(1.0, 0.0, 1.0, 1.0); }
  let t = clamp((value - view.lo) / (view.hi - view.lo), 0.0, 1.0);
  let rgb = select(viridis(t), coolwarm(t), view.diverging != 0u);
  return vec4f(clamp(rgb, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;
}

/**
 * @param {GPUDevice} device
 * @param {Object} flow - result of createChannelFlow
 * @param {GPUTextureFormat} format - format of the canvas to draw to
 * @returns {{ draw(encoder, textureView, opts), destroy() }}
 */
export function createSliceView(device, flow, format) {
  const module = device.createShaderModule({ label: 'slice view', code: shader(flow) });
  const pipeline = device.createRenderPipeline({
    label: 'slice view',
    layout: 'auto',
    vertex: { module, entryPoint: 'vs' },
    fragment: { module, entryPoint: 'fs', targets: [{ format }] },
    primitive: { topology: 'triangle-list' },
  });
  const yFaces = device.createBuffer({
    size: (flow.Ny + 1) * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(yFaces, 0, Float32Array.from(flow.yFaces));

  // One uniform buffer and bind group per target, so several slices can be
  // drawn in one submission with different settings.
  const slots = new Map();
  const slot = (key) => {
    if (!slots.has(key)) {
      const uniform = device.createBuffer({
        size: 24,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: flow.state } },
          { binding: 1, resource: { buffer: yFaces } },
          { binding: 2, resource: { buffer: uniform } },
        ],
      });
      slots.set(key, { uniform, bindGroup });
    }
    return slots.get(key);
  };

  return {
    /**
     * @param {GPUCommandEncoder} encoder
     * @param {GPUTextureView} target
     * @param {Object} opts
     * @param {'xy'|'xz'|'zy'} opts.plane
     * @param {number} opts.index - cell index along the direction normal to the plane
     * @param {'u'|'v'|'w'|'p'} opts.component
     * @param {number} opts.lo, opts.hi - values mapped to the ends of the colour scale
     * @param {boolean} [opts.diverging]
     * @param {string} [opts.key] - identifies the target; defaults to the plane
     */
    draw(encoder, target, { plane, index, component, lo, hi, diverging = false, key = plane }) {
      const { uniform, bindGroup } = slot(key);
      const data = new ArrayBuffer(24);
      new Uint32Array(data, 0, 4).set([
        SLICE_PLANES[plane], index, SLICE_COMPONENTS[component], diverging ? 1 : 0,
      ]);
      new Float32Array(data, 16, 2).set([lo, hi]);
      device.queue.writeBuffer(uniform, 0, data);
      const pass = encoder.beginRenderPass({
        colorAttachments: [{ view: target, loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] }],
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);
      pass.end();
    },
    destroy() {
      yFaces.destroy();
      for (const s of slots.values()) s.uniform.destroy();
    },
  };
}
