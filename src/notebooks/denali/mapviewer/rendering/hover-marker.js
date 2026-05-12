// Single-instance circle drawn at an arbitrary mercator + elevation point.
// Used as the on-map marker for elevation-profile hover. Rendering through
// WebGPU (rather than an HTML overlay) means the marker is intrinsically
// clipped to the map canvas, lives in the same render pass as the rest of
// the map, and travels with the camera without any reprojection plumbing.
//
// Reuses the existing circle shaders + vertex attribute layout from
// CircleLayer; the only differences are: a single mutable instance, no
// terrain elevation query (the caller supplies the elevation so the dot
// sits exactly on the line being hovered), and always-on-top depth.

import { circleVertexShader, circleFragmentShader } from '../shaders/circle.js';

// Per-instance: worldPos(3f) + radius(1f) + fillColor(4f) + strokeColor(4f) + strokeWidth(1f) + opacity(1f)
const INSTANCE_FLOATS = 14;
const INSTANCE_BYTES = INSTANCE_FLOATS * 4;
// Uniform: mat4(64) + vec2(8) + f32(4) + f32(4) + f32(4) + pad(12) = 96 bytes
const UNIFORM_BYTES = 96;

export class HoverMarker {
  constructor() {
    this._device = null;
    this._pipeline = null;
    this._uniformBuffer = null;
    this._uniformBindGroup = null;
    this._instanceBuffer = null;
    this._instanceData = new Float32Array(INSTANCE_FLOATS);
    this._uniformData = new Float32Array(UNIFORM_BYTES / 4);
    this._point = null;       // { mercatorX, mercatorY, elevation, color: [r,g,b,a?] }
    this._radius = 6;
    this._strokeWidth = 2;
    this._strokeColor = [1, 1, 1, 1];
  }

  init(device, globalUniformBGL, format) {
    this._device = device;

    const circleUniformBGL = device.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      }],
    });

    this._uniformBuffer = device.createBuffer({
      size: UNIFORM_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this._uniformBindGroup = device.createBindGroup({
      layout: circleUniformBGL,
      entries: [{ binding: 0, resource: { buffer: this._uniformBuffer } }],
    });

    this._instanceBuffer = device.createBuffer({
      size: INSTANCE_BYTES,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const vertexModule = device.createShaderModule({ code: circleVertexShader });
    const fragmentModule = device.createShaderModule({ code: circleFragmentShader });
    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [globalUniformBGL, circleUniformBGL],
    });

    this._pipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: vertexModule,
        entryPoint: 'vs_circle',
        buffers: [{
          arrayStride: INSTANCE_BYTES,
          stepMode: 'instance',
          attributes: [
            { format: 'float32x3', offset: 0,  shaderLocation: 0 },
            { format: 'float32',   offset: 12, shaderLocation: 1 },
            { format: 'float32x4', offset: 16, shaderLocation: 2 },
            { format: 'float32x4', offset: 32, shaderLocation: 3 },
            { format: 'float32',   offset: 48, shaderLocation: 4 },
            { format: 'float32',   offset: 52, shaderLocation: 5 },
          ],
        }],
      },
      fragment: {
        module: fragmentModule,
        entryPoint: 'fs_circle',
        targets: [{
          format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one',       dstFactor: 'one-minus-src-alpha', operation: 'add' },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
      // Always-on-top: the marker matches the existing HTML overlay's
      // behavior (visible even when the underlying route is occluded by
      // intervening terrain). The render pass still clips to the canvas
      // bounds, which is the whole point of moving off the DOM.
      depthStencil: { format: 'depth32float', depthWriteEnabled: false, depthCompare: 'always' },
    });
  }

  setPoint(point) {
    this._point = point;
  }

  isActive() {
    return this._point != null;
  }

  prepare(projectionView, canvasW, canvasH, pixelRatio, exaggeration, globalElevScale) {
    if (!this._point) return;
    const { mercatorX, mercatorY, elevation, color } = this._point;
    const wx = mercatorX;
    const wy = (elevation || 0) * globalElevScale * exaggeration;
    const wz = mercatorY;

    const d = this._instanceData;
    d[0] = wx; d[1] = wy; d[2] = wz;
    d[3] = this._radius;
    d[4] = color[0]; d[5] = color[1]; d[6] = color[2]; d[7] = color[3] != null ? color[3] : 1;
    d[8] = this._strokeColor[0]; d[9] = this._strokeColor[1]; d[10] = this._strokeColor[2]; d[11] = this._strokeColor[3];
    d[12] = this._strokeWidth;
    d[13] = 1.0;
    this._device.queue.writeBuffer(this._instanceBuffer, 0, d);

    const u = this._uniformData;
    u.set(projectionView, 0);
    u[16] = canvasW;
    u[17] = canvasH;
    u[18] = pixelRatio;
    u[19] = exaggeration;
    u[20] = 1.0; // atmosphere opacity — same scattering treatment as regular circles
    this._device.queue.writeBuffer(this._uniformBuffer, 0, u);
  }

  draw(pass, globalUniformBindGroup) {
    if (!this._point) return;
    pass.setPipeline(this._pipeline);
    pass.setBindGroup(0, globalUniformBindGroup);
    pass.setBindGroup(1, this._uniformBindGroup);
    pass.setVertexBuffer(0, this._instanceBuffer);
    pass.draw(6, 1);
  }

  destroy() {
    if (this._uniformBuffer) this._uniformBuffer.destroy();
    if (this._instanceBuffer) this._instanceBuffer.destroy();
  }
}
