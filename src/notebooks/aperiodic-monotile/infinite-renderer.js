// Minimal WebGPU renderer for the infinite-zoom Spectre notebook. Owns the
// canvas, one fill pipeline, the view uniform, and the pan/zoom event
// handlers. The notebook calls state.setInstances(...) followed by
// state.requestFrame() to put a fresh batch of tiles on screen.

import { createVertexBuffer, createIndexBuffer, createUniformBuffer } from './lib/webgpu-canvas.js';

const SAMPLE_COUNT = 4;
export const INSTANCE_STRIDE = 16;

const fillShaderCode = /* wgsl */`
struct View { scale: vec2f, offset: vec2f };
@group(0) @binding(0) var<uniform> view: View;

struct VsIn {
  @location(0) pos: vec2f,
  @location(1) iWorld: vec2f,
  @location(2) iCosSin: vec2f,
  @location(3) iColMir: vec4f,
};
struct VsOut {
  @builtin(position) pos: vec4f,
  @location(0) color: vec3f,
  @location(1) alpha: f32,
};

// The fourth instance byte packs (mirror_bit << 7) | alpha7. Decode:
// byte values 0..127 are non-mirrored (mirror = +1), 128..255 are
// mirrored (mirror = -1); the low 7 bits are alpha in [0, 127].
@vertex fn vs(in: VsIn) -> VsOut {
  let v255 = in.iColMir.w * 255.0;
  let isMirror = v255 >= 128.0;
  let mirror = select(1.0, -1.0, isMirror);
  let alpha7 = v255 - select(0.0, 128.0, isMirror);
  let alpha = alpha7 / 127.0;
  let m = vec2f(in.pos.x, in.pos.y * mirror);
  let cs = in.iCosSin;
  let r = vec2f(cs.x * m.x - cs.y * m.y, cs.y * m.x + cs.x * m.y);
  let world = r + in.iWorld;
  var out: VsOut;
  out.pos = vec4f(world * view.scale + view.offset, 0.0, 1.0);
  out.color = in.iColMir.rgb;
  out.alpha = alpha;
  return out;
}
@fragment fn fs(in: VsOut) -> @location(0) vec4f {
  // Premultiplied alpha — the canvas is in 'premultiplied' alphaMode and
  // the pipeline blend is set up to do "src + (1 - src.a) * dst" so that
  // a fading-in level draws on top of the level it's replacing.
  return vec4f(in.color * in.alpha, in.alpha);
}
`;

export function createInfiniteRenderer({
  device, canvasFormat, invalidation,
  meshVertexData, meshFillIndices,
  onViewChange,
}) {
  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'grab';

  const context = canvas.getContext('webgpu');
  context.configure({ device, format: canvasFormat, alphaMode: 'premultiplied' });

  const meshVertexBuffer = createVertexBuffer(device, 'spectre-verts', meshVertexData);
  const meshIndexBuffer  = createIndexBuffer(device, 'spectre-fill-indices', meshFillIndices);
  const indexCount = meshFillIndices.length;
  // Spectre tile mesh, exposed so callers can construct a draw group
  // for the per-leaf instances using the same renderer-owned buffers.
  const defaultMesh = {
    vertexBuffer: meshVertexBuffer,
    indexBuffer: meshIndexBuffer,
    indexCount,
    indexFormat: 'uint16',
  };
  const viewUniformBuffer = createUniformBuffer(device, 'view-uniforms', 16);

  const vertexLayouts = [
    {
      arrayStride: 8,
      stepMode: 'vertex',
      attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }],
    },
    {
      arrayStride: INSTANCE_STRIDE,
      stepMode: 'instance',
      attributes: [
        { shaderLocation: 1, offset: 0,  format: 'float32x2' },
        { shaderLocation: 2, offset: 8,  format: 'snorm16x2' },
        { shaderLocation: 3, offset: 12, format: 'unorm8x4'  },
      ],
    },
  ];

  const fillShader = device.createShaderModule({ label: 'spectre-fill', code: fillShaderCode });
  const fillPipeline = device.createRenderPipeline({
    label: 'spectre-fill-pipeline',
    layout: 'auto',
    vertex:   { module: fillShader, entryPoint: 'vs', buffers: vertexLayouts },
    fragment: {
      module: fillShader, entryPoint: 'fs',
      targets: [{
        format: canvasFormat,
        blend: {
          // Premultiplied "src over dst": src is already (rgb*a, a) from
          // the fragment shader, so we add it directly and attenuate dst
          // by (1 - src.a).
          color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        },
      }],
    },
    primitive: { topology: 'triangle-list' },
    multisample: { count: SAMPLE_COUNT },
  });
  const fillBindGroup = device.createBindGroup({
    layout: fillPipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: viewUniformBuffer } }],
  });

  const state = {
    canvas,
    defaultMesh,
    instanceBuffer: null,
    instanceCapacity: 0,
    // List of { mesh, instanceOffset, instanceCount } describing how the
    // shared instance buffer is partitioned across draws. Populated by
    // setDrawList (or the legacy setInstances → leaves-only path).
    drawGroups: [],
    msTexture: null,
    pixelWidth: 0,
    pixelHeight: 0,
    centerX: 0,
    centerY: 0,
    // physical pixels per world unit. 60 ≈ a unit-edge spectre ~60 px tall.
    pixelScale: 60,
    // Premultiplied (rgb*a, a). Callers can mutate this so any uncovered
    // pixels (sub-pixel gaps between cells, viewport regions outside the
    // root cluster) blend with a colour close to the average tile colour
    // instead of a jarring opaque black/dark grey.
    clearValue: { r: 0, g: 0, b: 0, a: 0 },
    _frameRequested: false,
    onViewChange,

    resize(w, h) {
      const px = Math.max(1, Math.floor(w * devicePixelRatio));
      const py = Math.max(1, Math.floor(h * devicePixelRatio));
      if (px === this.pixelWidth && py === this.pixelHeight) return;
      this.pixelWidth = px;
      this.pixelHeight = py;
      canvas.width = px;
      canvas.height = py;
      context.configure({ device, format: canvasFormat, alphaMode: 'premultiplied' });
      this.msTexture?.destroy();
      this.msTexture = device.createTexture({
        label: 'spectre-msaa',
        size: [px, py],
        sampleCount: SAMPLE_COUNT,
        format: canvasFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
      this.onViewChange?.(this);
      this.requestFrame();
    },

    ensureInstanceBuffer(count) {
      if (count <= this.instanceCapacity) return;
      this.instanceBuffer?.destroy();
      this.instanceCapacity = Math.max(count, Math.max(64, this.instanceCapacity * 2));
      this.instanceBuffer = device.createBuffer({
        label: 'spectre-instances',
        size: this.instanceCapacity * INSTANCE_STRIDE,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
    },

    // Upload `count` instances from the start of `data`, draw them as
    // leaves with the default spectre mesh.
    setInstances(data, count) {
      this.setDrawList({
        data,
        totalCount: count,
        groups: count > 0
          ? [{ mesh: defaultMesh, instanceOffset: 0, instanceCount: count }]
          : [],
      });
    },

    // Upload `totalCount` instances from `data` and draw them as the
    // listed groups. Each group has { mesh, instanceOffset, instanceCount }
    // with instance offsets indexing into the shared instance buffer.
    setDrawList({ data, totalCount, groups }) {
      this.ensureInstanceBuffer(totalCount);
      if (totalCount > 0) {
        const bytes = totalCount * INSTANCE_STRIDE;
        const view = ArrayBuffer.isView(data)
          ? new Uint8Array(data.buffer, data.byteOffset, bytes)
          : new Uint8Array(data, 0, bytes);
        device.queue.writeBuffer(this.instanceBuffer, 0, view);
      }
      this.drawGroups = groups;
    },

    requestFrame() {
      if (this._frameRequested) return;
      this._frameRequested = true;
      requestAnimationFrame(() => {
        this._frameRequested = false;
        this.draw();
      });
    },

    draw() {
      if (!this.instanceBuffer || !this.pixelWidth || !this.msTexture) return;
      const sx = 2 * this.pixelScale / this.pixelWidth;
      const sy = 2 * this.pixelScale / this.pixelHeight;
      // Instance positions are already view-relative (the walker subtracts
      // centerX/Y in Float64 before truncating to Float32), so the shader
      // just needs the scale — no large `-center * scale` term that would
      // cancel large numbers and chew through Float32 precision.
      device.queue.writeBuffer(viewUniformBuffer, 0, new Float32Array([
        sx, sy, 0, 0,
      ]));
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: this.msTexture.createView(),
          resolveTarget: context.getCurrentTexture().createView(),
          clearValue: this.clearValue,
          loadOp: 'clear',
          storeOp: 'discard',
        }],
      });
      if (this.drawGroups.length > 0) {
        pass.setPipeline(fillPipeline);
        pass.setBindGroup(0, fillBindGroup);
        pass.setVertexBuffer(1, this.instanceBuffer);
        for (const g of this.drawGroups) {
          if (g.instanceCount === 0) continue;
          pass.setVertexBuffer(0, g.mesh.vertexBuffer);
          pass.setIndexBuffer(g.mesh.indexBuffer, g.mesh.indexFormat);
          pass.drawIndexed(g.mesh.indexCount, g.instanceCount, 0, 0, g.instanceOffset);
        }
      }
      pass.end();
      device.queue.submit([encoder.finish()]);
    },

    // Snapshot/restore the view state. Useful for reproducing a specific
    // zoom + pan from the runtime — call getView() to capture, then
    // setView({centerX, centerY, pixelScale}) later to restore.
    getView() {
      return {
        centerX: this.centerX,
        centerY: this.centerY,
        pixelScale: this.pixelScale,
      };
    },
    setView(state) {
      if (state.centerX != null) this.centerX = state.centerX;
      if (state.centerY != null) this.centerY = state.centerY;
      if (state.pixelScale != null) this.pixelScale = state.pixelScale;
      this.onViewChange?.(this);
      this.requestFrame();
    },

    panBy(dxCss, dyCss) {
      const rect = canvas.getBoundingClientRect();
      const dpr = this.pixelWidth / Math.max(1, rect.width);
      this.centerX -= dxCss * dpr / this.pixelScale;
      this.centerY += dyCss * dpr / this.pixelScale;
      this.onViewChange?.(this);
      this.requestFrame();
    },

    zoomAround(cssX, cssY, k) {
      const rect = canvas.getBoundingClientRect();
      const cx = (cssX / rect.width) * 2 - 1;
      const cy = -((cssY / rect.height) * 2 - 1);
      const sx = 2 * this.pixelScale / this.pixelWidth;
      const sy = 2 * this.pixelScale / this.pixelHeight;
      const wx = this.centerX + cx / sx;
      const wy = this.centerY + cy / sy;
      this.pixelScale *= k;
      const sxN = 2 * this.pixelScale / this.pixelWidth;
      const syN = 2 * this.pixelScale / this.pixelHeight;
      this.centerX = wx - cx / sxN;
      this.centerY = wy - cy / syN;
      this.onViewChange?.(this);
      this.requestFrame();
    },
  };

  // Pan: 1-pointer drag. Pinch-zoom + 2-finger pan: 2-pointer gesture.
  const pointers = new Map();
  let panLastX = 0, panLastY = 0;
  let pinchDist = 0, pinchMx = 0, pinchMy = 0;
  const canvasXY = (e) => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const recomputePinch = () => {
    const pts = [...pointers.values()];
    const dx = pts[0].x - pts[1].x, dy = pts[0].y - pts[1].y;
    pinchDist = Math.hypot(dx, dy);
    pinchMx = (pts[0].x + pts[1].x) * 0.5;
    pinchMy = (pts[0].y + pts[1].y) * 0.5;
  };
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, canvasXY(e));
    if (pointers.size === 1) {
      panLastX = e.clientX; panLastY = e.clientY;
      canvas.style.cursor = 'grabbing';
    } else if (pointers.size === 2) {
      recomputePinch();
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, canvasXY(e));
    if (pointers.size === 1) {
      const dx = e.clientX - panLastX, dy = e.clientY - panLastY;
      panLastX = e.clientX; panLastY = e.clientY;
      state.panBy(dx, dy);
    } else if (pointers.size === 2) {
      const prevDist = pinchDist, prevMx = pinchMx, prevMy = pinchMy;
      recomputePinch();
      if (prevDist > 0) {
        state.zoomAround(pinchMx, pinchMy, pinchDist / prevDist);
        state.panBy(pinchMx - prevMx, pinchMy - prevMy);
      }
    }
  });
  const endPointer = (e) => {
    if (!pointers.delete(e.pointerId)) return;
    if (pointers.size === 1) {
      const rect = canvas.getBoundingClientRect();
      const r = [...pointers.values()][0];
      panLastX = r.x + rect.left;
      panLastY = r.y + rect.top;
    } else if (pointers.size === 0) {
      canvas.style.cursor = 'grab';
    }
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    state.zoomAround(
      e.clientX - rect.left,
      e.clientY - rect.top,
      Math.exp(-e.deltaY * 0.0015),
    );
  }, { passive: false });

  invalidation.then(() => {
    state.msTexture?.destroy();
    state.instanceBuffer?.destroy();
  });

  return { canvas, state };
}
