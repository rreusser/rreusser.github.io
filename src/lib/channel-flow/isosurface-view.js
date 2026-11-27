/**
 * Render the surfaces produced by `createQCriterion`, the Q-criterion
 * isosurface and optionally the low-speed streaks, with the outline of the
 * channel and its lower wall for context.
 *
 * The surface is drawn with an indirect draw call straight from the vertex
 * buffer the compute passes filled. Normals come from the gradient of Q, so
 * shading is smooth however coarse the triangles are. Rendering is 4x
 * multisampled and resolved into the target view.
 */

import { VERTEX_BYTES } from './q-criterion.js';

const SAMPLES = 4;
const DEPTH_FORMAT = 'depth24plus';

const COMMON = /* wgsl */ `
struct Scene {
  projView: mat4x4f,
  eye: vec3f,
  lo: f32,
  light: vec3f,
  hi: f32,
  line: vec4f,
  wall: vec4f,
  // Colour of the streak surface.
  tint: vec4f,
  // (lower wall, upper wall, 1 to colour by wall distance, 0)
  walls: vec4f,
}
@group(0) @binding(0) var<uniform> scene: Scene;
`;

const SURFACE = /* wgsl */ `
${COMMON}
struct VSOut {
  @builtin(position) clip: vec4f,
  @location(0) world: vec3f,
  @location(1) gradient: vec3f,
  @location(2) scalar: f32,
}

@vertex
fn vs(@location(0) position: vec4f, @location(1) gradient: vec4f) -> VSOut {
  return VSOut(scene.projView * vec4f(position.xyz, 1.0), position.xyz, gradient.xyz, position.w);
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

fn shade(in: VSOut, base: vec3f) -> vec4f {
  let toEye = normalize(scene.eye - in.world);
  // The scalar grows towards the inside of the structure, so the outward
  // normal is minus its gradient. Flip it towards the viewer in case the
  // surface is seen from inside.
  var n = -in.gradient;
  let len = length(n);
  n = select(toEye, n / max(len, 1e-20), len > 0.0);
  if (dot(n, toEye) < 0.0) { n = -n; }

  let l = normalize(scene.light);
  let diffuse = max(dot(n, l), 0.0);
  let fill = 0.5 + 0.5 * n.y;
  let spec = pow(max(dot(n, normalize(l + toEye)), 0.0), 40.0);
  let rgb = base * (0.25 + 0.2 * fill + 0.65 * diffuse) + vec3f(0.18 * spec);
  return vec4f(rgb, 1.0);
}

// Vortices: coloured by the scalar carried with the vertices, or by the
// distance to the nearer wall as a fraction of the half-height.
@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  let y = in.world.y;
  let wallDistance = 2.0 * min(y - scene.walls.x, scene.walls.y - y) / (scene.walls.y - scene.walls.x);
  let value = (in.scalar - scene.lo) / (scene.hi - scene.lo);
  let t = clamp(select(value, wallDistance, scene.walls.z > 0.5), 0.0, 1.0);
  return shade(in, clamp(viridis(t), vec3f(0.0), vec3f(1.0)));
}

// Streaks: one colour.
@fragment
fn fsTint(in: VSOut) -> @location(0) vec4f {
  return shade(in, scene.tint.rgb);
}
`;

const FLAT = /* wgsl */ `
${COMMON}
struct VSOut { @builtin(position) clip: vec4f, @location(0) kind: f32 }

// kind is 0 for the outline and 1 for the wall.
@vertex
fn vs(@location(0) position: vec3f, @location(1) kind: f32) -> VSOut {
  return VSOut(scene.projView * vec4f(position, 1.0), kind);
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  return mix(scene.line, scene.wall, in.kind);
}
`;

/**
 * @param {GPUDevice} device
 * @param {Object} flow - result of createChannelFlow
 * @param {Object} surface - result of createQCriterion
 * @param {GPUTextureFormat} format - format of the target
 */
export function createIsosurfaceView(device, flow, surface, format) {
  const scene = device.createBuffer({
    label: 'isosurface scene',
    size: 160,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const depthStencil = { format: DEPTH_FORMAT, depthWriteEnabled: true, depthCompare: 'less' };
  const multisample = { count: SAMPLES };

  const surfaceModule = device.createShaderModule({ label: 'isosurface', code: SURFACE });
  const makeSurfacePipeline = (label, entryPoint) => device.createRenderPipeline({
    label,
    layout: 'auto',
    vertex: {
      module: surfaceModule,
      entryPoint: 'vs',
      buffers: [{
        arrayStride: VERTEX_BYTES,
        attributes: [
          { shaderLocation: 0, offset: 0, format: 'float32x4' },
          { shaderLocation: 1, offset: 16, format: 'float32x4' },
        ],
      }],
    },
    fragment: { module: surfaceModule, entryPoint, targets: [{ format }] },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil,
    multisample,
  });
  const surfacePipeline = makeSurfacePipeline('isosurface', 'fs');
  const streakPipeline = makeSurfacePipeline('streak isosurface', 'fsTint');

  const flatModule = device.createShaderModule({ label: 'channel box', code: FLAT });
  const flatLayout = [{
    arrayStride: 16,
    attributes: [
      { shaderLocation: 0, offset: 0, format: 'float32x3' },
      { shaderLocation: 1, offset: 12, format: 'float32' },
    ],
  }];
  const flatPipeline = (topology) =>
    device.createRenderPipeline({
      label: `channel box ${topology}`,
      layout: 'auto',
      vertex: { module: flatModule, entryPoint: 'vs', buffers: flatLayout },
      fragment: { module: flatModule, entryPoint: 'fs', targets: [{ format }] },
      primitive: { topology, cullMode: 'none' },
      depthStencil,
      multisample,
    });
  const linePipeline = flatPipeline('line-list');
  const wallPipeline = flatPipeline('triangle-list');

  // Channel outline (12 edges) and the lower wall (2 triangles).
  const x1 = flow.Lx, z1 = flow.Lz;
  const y0 = flow.yFaces[0], y1 = flow.yFaces[flow.Ny];
  const corner = (n) => [n & 1 ? x1 : 0, n & 2 ? y1 : y0, n & 4 ? z1 : 0];
  const flat = [];
  for (let a = 0; a < 8; a++)
    for (const bit of [1, 2, 4])
      if (!(a & bit)) flat.push(...corner(a), 0, ...corner(a | bit), 0);
  const lineVertices = flat.length / 4;
  for (const n of [0, 1, 5, 0, 5, 4]) flat.push(...corner(n), 1);
  const boxBuffer = device.createBuffer({
    label: 'channel box',
    size: flat.length * 4,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(boxBuffer, 0, new Float32Array(flat));

  const sceneBind = (pipeline) =>
    device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: scene } }],
    });
  const surfaceBind = sceneBind(surfacePipeline);
  const streakBind = sceneBind(streakPipeline);
  const lineBind = sceneBind(linePipeline);
  const wallBind = sceneBind(wallPipeline);

  let targets = null;
  const ensureTargets = (width, height) => {
    if (targets && targets.width === width && targets.height === height) return targets;
    if (targets) {
      targets.colour.destroy();
      targets.depth.destroy();
    }
    const size = [width, height];
    const usage = GPUTextureUsage.RENDER_ATTACHMENT;
    targets = {
      width,
      height,
      colour: device.createTexture({ size, format, sampleCount: SAMPLES, usage }),
      depth: device.createTexture({ size, format: DEPTH_FORMAT, sampleCount: SAMPLES, usage }),
    };
    return targets;
  };

  return {
    /**
     * @param {GPUCommandEncoder} encoder
     * @param {GPUTextureView} target - single-sampled view to resolve into
     * @param {number} width, height - size of the target in pixels
     * @param {Object} view
     * @param {Float32Array} view.projView - column-major, depth in [0, 1]
     * @param {ArrayLike<number>} view.eye
     * @param {number} view.lo, view.hi - colour scalar mapped to the ends of the scale
     * @param {'velocity' | 'wall'} [view.colourBy] - colour the vortices by
     *   the scalar or by the distance to the nearer wall
     * @param {boolean} [view.vortices], [view.streaks] - which surfaces to draw
     * @param {number[]} [view.streakColour] - RGB in [0, 1]
     * @param {number[]} [view.background], [view.foreground] - RGB in [0, 1]
     *   for the clear colour and the channel outline; the lower wall is
     *   drawn as a tint between the two
     */
    draw(encoder, target, width, height, {
      projView, eye, lo, hi,
      colourBy = 'velocity', vortices = true, streaks = false, streakColour = [0.86, 0.5, 0.3],
      background = [0.07, 0.08, 0.1], foreground = [0.75, 0.78, 0.82],
    }) {
      const data = new Float32Array(40);
      data.set([...streakColour.slice(0, 3), 1], 32);
      data.set([y0, y1, colourBy === 'wall' ? 1 : 0, 0], 36);
      const wall = background.map((b, n) => b + 0.1 * (foreground[n] - b));
      data.set([...foreground.slice(0, 3), 1], 24);
      data.set([...wall, 1], 28);
      data.set(projView, 0);
      data.set([eye[0], eye[1], eye[2], lo], 16);
      // Light from above and behind the viewer's shoulder.
      data.set([eye[0] - 0.5 * flow.Lx, Math.abs(eye[1]) + 2, eye[2] - 0.5 * flow.Lz, hi], 20);
      device.queue.writeBuffer(scene, 0, data);

      const t = ensureTargets(width, height);
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: t.colour.createView(),
          resolveTarget: target,
          loadOp: 'clear',
          storeOp: 'discard',
          clearValue: [background[0], background[1], background[2], 1],
        }],
        depthStencilAttachment: {
          view: t.depth.createView(),
          depthLoadOp: 'clear',
          depthStoreOp: 'discard',
          depthClearValue: 1,
        },
      });
      pass.setVertexBuffer(0, boxBuffer);
      pass.setPipeline(wallPipeline);
      pass.setBindGroup(0, wallBind);
      pass.draw(6, 1, lineVertices);
      pass.setPipeline(linePipeline);
      pass.setBindGroup(0, lineBind);
      pass.draw(lineVertices);
      if (vortices) {
        pass.setPipeline(surfacePipeline);
        pass.setBindGroup(0, surfaceBind);
        pass.setVertexBuffer(0, surface.vertices);
        pass.drawIndirect(surface.indirect, 0);
      }
      if (streaks) {
        pass.setPipeline(streakPipeline);
        pass.setBindGroup(0, streakBind);
        pass.setVertexBuffer(0, surface.streaks.vertices);
        pass.drawIndirect(surface.streaks.indirect, 0);
      }
      pass.end();
    },

    destroy() {
      scene.destroy();
      boxBuffer.destroy();
      if (targets) {
        targets.colour.destroy();
        targets.depth.destroy();
      }
    },
  };
}
