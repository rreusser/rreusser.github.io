// Minimal WebGPU renderer for the infinite-zoom Spectre notebook. Owns the
// canvas, one fill pipeline, the view uniform, and the pan/zoom event
// handlers. The notebook calls state.setInstances(...) followed by
// state.requestFrame() to put a fresh batch of tiles on screen.

import { createVertexBuffer, createIndexBuffer, createUniformBuffer } from './lib/webgpu-canvas.js';

const SAMPLE_COUNT = 4;
// Wide-gamut intermediate so a contrast/saturation curve can stretch the
// muted, multi-level-blended output without 8-bit banding. The actual
// shader inputs and outputs stay inside [0, 1]; the float16 buffer is
// purely about precision while the post pass remaps values.
const HDR_FORMAT = 'rgba16float';
export const INSTANCE_STRIDE = 16;

const outlineShaderCode = /* wgsl */`
struct View { scale: vec2f, offset: vec2f };
struct OutlineU { alpha: f32, _pad0: f32, _pad1: f32, _pad2: f32 };
@group(0) @binding(0) var<uniform> view: View;
@group(0) @binding(1) var<uniform> ou: OutlineU;

struct VsIn {
  @location(0) pos: vec2f,
  @location(1) iWorld: vec2f,
  @location(2) iCosSin: vec2f,
  @location(3) iColMir: vec4f,
};
struct VsOut {
  @builtin(position) pos: vec4f,
  @location(0) alpha: f32,
};

@vertex fn vs(in: VsIn) -> VsOut {
  // Decode mirror flag (high bit of byte 15) and the 7-bit per-leaf
  // alpha (low 7 bits). Multiply the uniform outline alpha by the
  // leaf's own alpha so an outline fades together with its leaf
  // during the parent's fade-in: in the substitution chain, Γ
  // (mystic tile) aggregates earliest because its bounding ball is
  // smallest, so its leaves' alpha drops while other leaves are
  // still at 1. Tying outline alpha to leaf alpha keeps the
  // outline's fade in lockstep with the fill — no flash-off, and
  // no "aggregate visible through outline" at mid fade.
  let v255 = in.iColMir.w * 255.0;
  let isMirror = v255 >= 128.0;
  let mirror = select(1.0, -1.0, isMirror);
  let alpha7 = v255 - select(0.0, 128.0, isMirror);
  let leafAlpha = alpha7 / 127.0;
  let m = vec2f(in.pos.x, in.pos.y * mirror);
  let cs = in.iCosSin;
  let r = vec2f(cs.x * m.x - cs.y * m.y, cs.y * m.x + cs.x * m.y);
  let world = r + in.iWorld;
  var out: VsOut;
  out.pos = vec4f(world * view.scale + view.offset, 0.0, 1.0);
  out.alpha = ou.alpha * leafAlpha;
  return out;
}
@fragment fn fs(in: VsOut) -> @location(0) vec4f {
  // Black outline. Premultiplied — rgb is (0,0,0) and a = ou.alpha,
  // so the fill colour is multiplied by (1 - alpha) and we add 0,
  // giving a darkened cell outline that respects the existing
  // tonemap pipeline.
  return vec4f(0.0, 0.0, 0.0, in.alpha);
}
`;

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
  // Premultiplied alpha — the HDR intermediate uses the same blend as
  // the canvas did before ("src + (1 - src.a) * dst") so a fading-in
  // level draws on top of the level it's replacing.
  return vec4f(in.color * in.alpha, in.alpha);
}
`;

// Fullscreen-triangle post pass: samples the HDR intermediate, applies
// saturation and contrast around `midpoint`, clamps to [0, 1], and writes
// premultiplied output to the canvas (or a capture target). With both
// knobs at 1 this is a near-identity pass aside from the float16 → 8-bit
// requantization, so the default look matches the pre-HDR pipeline.
const tonemapShaderCode = /* wgsl */`
struct TM {
  contrast: f32,
  saturation: f32,
  midpoint: f32,
  brightness: f32,
  // Per-channel additive bias on top of the scalar brightness. The
  // video exporter uses this for loop-seamless rendering: it
  // measures the per-channel average colour of the first and last
  // frames and ramps biasRgb across the trajectory so both endpoints
  // converge to the same average colour (not just the same luma).
  // Default is vec3(0); the live UI ignores it.
  biasRgb: vec3f,
  _pad: f32,
};
@group(0) @binding(0) var srcTex: texture_2d<f32>;
@group(0) @binding(1) var<uniform> tm: TM;

@vertex fn vs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(p[vi], 0.0, 1.0);
}

@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let s = textureLoad(srcTex, vec2i(pos.xy), 0);
  // Unpremultiply so the curve operates on the actual scene colour
  // rather than a coverage-attenuated value. Tiny epsilon avoids /0.
  let a = max(s.a, 1e-4);
  let rgb = s.rgb / a;
  // Rec. 709 luma — close enough for a perceptual saturation pull.
  let luma = dot(rgb, vec3f(0.2126, 0.7152, 0.0722));
  let satted = mix(vec3f(luma), rgb, tm.saturation);
  let contrasted = (satted - vec3f(tm.midpoint)) * tm.contrast + vec3f(tm.midpoint);
  let brightened = contrasted + vec3f(tm.brightness) + tm.biasRgb;
  let finalRgb = clamp(brightened, vec3f(0.0), vec3f(1.0));
  return vec4f(finalRgb * s.a, s.a);
}
`;

// Additive-blend accumulator pass: samples the HDR resolve target,
// multiplies by `weight`, and adds into a separate HDR accumulator
// (target blend = "src + dst"). Used for video-export temporal
// supersampling so that sub-frames are averaged in linear HDR space
// *before* the tonemap curve runs once on the final mean — preserving
// pleasant highlight streaks that the per-sub-frame tonemap path
// would otherwise clip and then dilute via post-tonemap averaging.
const accumulateShaderCode = /* wgsl */`
struct W { weight: f32, _pad0: f32, _pad1: f32, _pad2: f32 };
@group(0) @binding(0) var srcTex: texture_2d<f32>;
@group(0) @binding(1) var<uniform> u: W;

@vertex fn vs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(p[vi], 0.0, 1.0);
}

@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let s = textureLoad(srcTex, vec2i(pos.xy), 0);
  return s * u.weight;
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
  context.configure({
    device, format: canvasFormat, alphaMode: 'premultiplied',
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
  });

  const meshVertexBuffer = createVertexBuffer(device, 'spectre-verts', meshVertexData);
  const meshIndexBuffer  = createIndexBuffer(device, 'spectre-fill-indices', meshFillIndices);
  const indexCount = meshFillIndices.length;
  // Leaf bound radius (max distance from local origin to any spectre
  // vertex). Used to convert the live pixelScale into a per-leaf
  // on-screen size so outline alpha can fade as leaves shrink.
  let leafBoundRadius = 0;
  for (let i = 0; i < meshVertexData.length; i += 2) {
    const r = Math.hypot(meshVertexData[i], meshVertexData[i + 1]);
    if (r > leafBoundRadius) leafBoundRadius = r;
  }
  // Spectre tile mesh, exposed so callers can construct a draw group
  // for the per-leaf instances using the same renderer-owned buffers.
  const defaultMesh = {
    vertexBuffer: meshVertexBuffer,
    indexBuffer: meshIndexBuffer,
    indexCount,
    indexFormat: 'uint16',
  };

  // Spectre outline indices: 14-vertex closed line strip (0..13, 0).
  // Reuses meshVertexBuffer; runs after the fill pass with line-strip
  // topology to draw a 1-px boundary around every leaf instance.
  // Buffer is padded to 16 entries so total byte length (32) is a
  // multiple of 4 — required by WebGPU's writeBuffer. drawIndexed
  // only consumes the first 15 entries, so the trailing pad value
  // never reaches the rasteriser.
  const _outlineIndexData = new Uint16Array(16);
  for (let i = 0; i < 14; i++) _outlineIndexData[i] = i;
  _outlineIndexData[14] = 0;
  _outlineIndexData[15] = 0;
  const outlineIndexBuffer = createIndexBuffer(device, 'spectre-outline-indices', _outlineIndexData);
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
        format: HDR_FORMAT,
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

  // Outline pipeline: same vertex layout as fill, line-strip topology,
  // its own fragment shader that ignores the per-instance colour and
  // emits a uniform-alpha black premultiplied output. Drawn after the
  // fill pass so it sits ON TOP of cell colour but UNDER the tonemap.
  const outlineShader = device.createShaderModule({ label: 'spectre-outline', code: outlineShaderCode });
  const outlineUniformBuffer = createUniformBuffer(device, 'outline-uniforms', 16);
  const outlinePipeline = device.createRenderPipeline({
    label: 'spectre-outline-pipeline',
    layout: 'auto',
    vertex:   { module: outlineShader, entryPoint: 'vs', buffers: vertexLayouts },
    fragment: {
      module: outlineShader, entryPoint: 'fs',
      targets: [{
        format: HDR_FORMAT,
        blend: {
          color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        },
      }],
    },
    primitive: { topology: 'line-strip', stripIndexFormat: 'uint16' },
    multisample: { count: SAMPLE_COUNT },
  });
  const outlineBindGroup = device.createBindGroup({
    layout: outlinePipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: viewUniformBuffer } },
      { binding: 1, resource: { buffer: outlineUniformBuffer } },
    ],
  });

  const tonemapShader = device.createShaderModule({ label: 'spectre-tonemap', code: tonemapShaderCode });
  const tonemapPipeline = device.createRenderPipeline({
    label: 'spectre-tonemap-pipeline',
    layout: 'auto',
    vertex:   { module: tonemapShader, entryPoint: 'vs' },
    fragment: { module: tonemapShader, entryPoint: 'fs', targets: [{ format: canvasFormat }] },
    primitive: { topology: 'triangle-list' },
  });
  // 32 bytes: contrast/saturation/midpoint/brightness (4 × f32 = 16),
  // then biasRgb at offset 16 (vec3 has 16-byte alignment in std140;
  // vec3 + 1 pad f32 = 16 bytes). Total 32.
  const tonemapUniformBuffer = createUniformBuffer(device, 'tonemap-uniforms', 32);
  function makePostBindGroup(hdrTexture) {
    return device.createBindGroup({
      label: 'spectre-tonemap-bg',
      layout: tonemapPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: hdrTexture.createView() },
        { binding: 1, resource: { buffer: tonemapUniformBuffer } },
      ],
    });
  }

  const accumulateShader = device.createShaderModule({
    label: 'spectre-accumulate', code: accumulateShaderCode,
  });
  const accumulatePipeline = device.createRenderPipeline({
    label: 'spectre-accumulate-pipeline',
    layout: 'auto',
    vertex:   { module: accumulateShader, entryPoint: 'vs' },
    fragment: {
      module: accumulateShader, entryPoint: 'fs',
      targets: [{
        format: HDR_FORMAT,
        // Additive: weight*src + dst. The accumulator must be cleared
        // to zero before each output frame's sub-frame loop.
        blend: {
          color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
        },
      }],
    },
    primitive: { topology: 'triangle-list' },
  });
  const accumulateUniformBuffer = createUniformBuffer(device, 'accumulate-uniforms', 16);
  function makeAccumulateBindGroup(srcTex) {
    return device.createBindGroup({
      label: 'spectre-accumulate-bg',
      layout: accumulatePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: srcTex.createView() },
        { binding: 1, resource: { buffer: accumulateUniformBuffer } },
      ],
    });
  }

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
    hdrTexture: null,
    _postBindGroup: null,
    pixelWidth: 0,
    pixelHeight: 0,
    centerX: 0,
    centerY: 0,
    // physical pixels per world unit. 60 ≈ a unit-edge spectre ~60 px tall.
    pixelScale: 60,
    // World coords baked into the instance buffer are stored as
    // (world − instanceCenterX/Y). Normally instanceCenterX/Y track
    // centerX/Y so the offset uniform is zero; the freeze toggle
    // pins them to the freeze-time view center, then pan/zoom shifts
    // the offset uniform instead of re-walking the tree.
    instanceCenterX: 0,
    instanceCenterY: 0,
    // Premultiplied (rgb*a, a). Callers can mutate this so any uncovered
    // pixels (sub-pixel gaps between cells, viewport regions outside the
    // root cluster) blend with a colour close to the average tile colour
    // instead of a jarring opaque black/dark grey.
    clearValue: { r: 0, g: 0, b: 0, a: 0 },
    // Tonemap stretches the post-blend colours through a saturation +
    // contrast curve, with the result clamped to [0, 1]. Defaults are
    // identity (no visible change vs. the pre-HDR pipeline aside from
    // float16 → 8-bit requantization at the canvas write).
    tonemap: { contrast: 1.3, saturation: 1.05, midpoint: 0.5, brightness: 0.01,
               biasR: 0.0, biasG: 0.0, biasB: 0.0 },
    // Per-leaf outline. Drawn after the fill pass with line-strip
    // topology, fading linearly from `fadeOutPx` to `fadeInPx` so
    // outlines disappear when leaves are smaller than ~`fadeOutPx`
    // pixels across (no visible noise) and reach full strength at
    // ~`fadeInPx`. `enabled = false` (or opacity = 0) skips the
    // draw entirely. Defaults skew toward EARLY disable: line-strip
    // line-list draw is per-leaf, so culling the outline below
    // `fadeOutPx` saves real time at low zooms.
    outline: { enabled: true, opacity: 0.5, fadeOutPx: 16, fadeInPx: 120 },
    _frameRequested: false,
    _rafId: null,
    _capture: null,
    onViewChange,

    resize(w, h) {
      const px = Math.max(1, Math.floor(w * devicePixelRatio));
      const py = Math.max(1, Math.floor(h * devicePixelRatio));
      if (px === this.pixelWidth && py === this.pixelHeight) return;
      this.pixelWidth = px;
      this.pixelHeight = py;
      canvas.width = px;
      canvas.height = py;
      context.configure({
        device, format: canvasFormat, alphaMode: 'premultiplied',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
      });
      this.msTexture?.destroy();
      this.hdrTexture?.destroy();
      this.msTexture = device.createTexture({
        label: 'spectre-hdr-msaa',
        size: [px, py],
        sampleCount: SAMPLE_COUNT,
        format: HDR_FORMAT,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
      this.hdrTexture = device.createTexture({
        label: 'spectre-hdr-resolve',
        size: [px, py],
        format: HDR_FORMAT,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      });
      this._postBindGroup = makePostBindGroup(this.hdrTexture);
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
      this._rafId = requestAnimationFrame(() => {
        this._frameRequested = false;
        this._rafId = null;
        this.draw();
      });
    },

    draw() {
      if (!this.instanceBuffer || !this.pixelWidth || !this.msTexture || !this.hdrTexture) return;
      this._renderTo(
        context.getCurrentTexture(),
        this.msTexture, this.hdrTexture, this._postBindGroup,
      );
    },

    _renderTo(target, msHdr, hdrResolve, postBindGroup, extraEncode) {
      const sx = 2 * this.pixelScale / this.pixelWidth;
      const sy = 2 * this.pixelScale / this.pixelHeight;
      // Instance positions are stored as (world − instanceCenter); the
      // shader projects them as (iWorld + (instanceCenter − center)) *
      // scale = (world − center) * scale. Normally instanceCenter ==
      // center and the offset is zero (no large-number cancellation);
      // when the structure is frozen the offset diverges from zero
      // and absorbs all subsequent pan/zoom without a re-walk.
      const ox = (this.instanceCenterX - this.centerX) * sx;
      const oy = (this.instanceCenterY - this.centerY) * sy;
      device.queue.writeBuffer(viewUniformBuffer, 0, new Float32Array([
        sx, sy, ox, oy,
      ]));
      const tm = this.tonemap;
      device.queue.writeBuffer(tonemapUniformBuffer, 0, new Float32Array([
        tm.contrast, tm.saturation, tm.midpoint, tm.brightness,
        tm.biasR ?? 0, tm.biasG ?? 0, tm.biasB ?? 0, 0,
      ]));
      const encoder = device.createCommandEncoder();
      // Pass 1: scene → HDR MSAA, resolved to single-sample HDR.
      const fillPass = encoder.beginRenderPass({
        colorAttachments: [{
          view: msHdr.createView(),
          resolveTarget: hdrResolve.createView(),
          clearValue: this.clearValue,
          loadOp: 'clear',
          storeOp: 'discard',
        }],
      });
      if (this.drawGroups.length > 0) {
        fillPass.setPipeline(fillPipeline);
        fillPass.setBindGroup(0, fillBindGroup);
        fillPass.setVertexBuffer(1, this.instanceBuffer);
        for (const g of this.drawGroups) {
          if (g.instanceCount === 0) continue;
          fillPass.setVertexBuffer(0, g.mesh.vertexBuffer);
          fillPass.setIndexBuffer(g.mesh.indexBuffer, g.mesh.indexFormat);
          fillPass.drawIndexed(g.mesh.indexCount, g.instanceCount, 0, 0, g.instanceOffset);
        }
        // Pass 1b: outline strokes around each leaf instance. Same
        // pass (writes into the HDR resolve target so the tonemap
        // applies) but a different pipeline (line-strip + outline
        // shader) and only the leaf groups (those whose mesh is the
        // default spectre fill mesh).
        const o = this.outline;
        if (o && o.enabled) {
          const leafSizePx = leafBoundRadius * 2 * this.pixelScale;
          const t = (leafSizePx - o.fadeOutPx) / Math.max(1e-6, o.fadeInPx - o.fadeOutPx);
          const fade = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
          const alpha = fade * o.opacity;
          if (alpha > 0) {
            device.queue.writeBuffer(outlineUniformBuffer, 0, new Float32Array([alpha, 0, 0, 0]));
            fillPass.setPipeline(outlinePipeline);
            fillPass.setBindGroup(0, outlineBindGroup);
            fillPass.setVertexBuffer(0, meshVertexBuffer);
            fillPass.setIndexBuffer(outlineIndexBuffer, 'uint16');
            for (const g of this.drawGroups) {
              if (g.instanceCount === 0 || g.mesh !== defaultMesh) continue;
              fillPass.drawIndexed(15, g.instanceCount, 0, 0, g.instanceOffset);
            }
          }
        }
      }
      fillPass.end();
      // Pass 2: tonemap HDR → canvas (or capture target).
      const postPass = encoder.beginRenderPass({
        colorAttachments: [{
          view: target.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        }],
      });
      postPass.setPipeline(tonemapPipeline);
      postPass.setBindGroup(0, postBindGroup);
      postPass.draw(3, 1, 0, 0);
      postPass.end();
      if (extraEncode) extraEncode(encoder);
      device.queue.submit([encoder.finish()]);
    },

    // Offline-capture API. Use to render at a fixed pixel size (e.g.,
    // 1280×720 for video export) without disturbing the live canvas.
    //
    //   beginCapture(w, h, opts?) — override the renderer's pixel dims
    //     and allocate dedicated MSAA + tonemap targets at (w, h). The
    //     walker (invoked via setView → onViewChange) sees the new dims
    //     because it reads pixelWidth/pixelHeight off the renderer state.
    //     opts.accumulator: when true, also allocate an HDR accumulator
    //     for temporal supersampling (see clearAccumulator /
    //     accumulateSubFrame / captureAccumulated below).
    //   captureFrame()    — render the current draw list, tonemap to the
    //     capture target, copy pixels back as RGBA Uint8Array. Single
    //     sub-frame; the tonemap runs on the raw scene HDR.
    //   clearAccumulator()       — zero the HDR accumulator. Call once
    //     per output frame.
    //   accumulateSubFrame(w)    — render the current draw list into the
    //     HDR resolve target, then additively blend (weight × resolve)
    //     into the accumulator. No tonemap, no readback.
    //   captureAccumulated()     — tonemap the accumulator to the
    //     capture target and read pixels back as RGBA Uint8Array.
    //   endCapture()      — destroy the temp targets, restore live dims,
    //     redraw the live canvas.
    //
    // While a capture session is active, requestFrame is a no-op and any
    // already-pending rAF is cancelled, so a stray draw doesn't try to
    // render at mismatched dims onto the live canvas.
    beginCapture(w, h, opts) {
      if (this._capture) throw new Error('capture already in progress');
      if (this._rafId != null) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      const savedFrameRequested = this._frameRequested;
      this._frameRequested = true;
      const savedPxW = this.pixelWidth, savedPxH = this.pixelHeight;
      this.pixelWidth = w;
      this.pixelHeight = h;
      const msHdr = device.createTexture({
        label: 'spectre-capture-hdr-ms',
        size: [w, h], sampleCount: SAMPLE_COUNT, format: HDR_FORMAT,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
      const hdrResolve = device.createTexture({
        label: 'spectre-capture-hdr-resolve',
        size: [w, h], format: HDR_FORMAT,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      });
      const target = device.createTexture({
        label: 'spectre-capture-target',
        size: [w, h], format: canvasFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
      });
      const bytesPerRow = Math.ceil(w * 4 / 256) * 256;
      const readback = device.createBuffer({
        label: 'spectre-capture-readback',
        size: bytesPerRow * h,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      });
      const postBindGroup = makePostBindGroup(hdrResolve);
      let accumulator = null;
      let accumulateBindGroup = null;
      let postBindGroupAcc = null;
      if (opts && opts.accumulator) {
        accumulator = device.createTexture({
          label: 'spectre-capture-accumulator',
          size: [w, h], format: HDR_FORMAT,
          usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        });
        accumulateBindGroup = makeAccumulateBindGroup(hdrResolve);
        postBindGroupAcc = makePostBindGroup(accumulator);
      }
      this._capture = {
        w, h, msHdr, hdrResolve, target, readback, bytesPerRow, postBindGroup,
        accumulator, accumulateBindGroup, postBindGroupAcc,
        savedPxW, savedPxH, savedFrameRequested,
      };
    },

    // Zero the HDR accumulator. Call once per output frame, before the
    // sub-frame loop.
    clearAccumulator() {
      if (!this._capture || !this._capture.accumulator) {
        throw new Error('accumulator not enabled — pass { accumulator: true } to beginCapture');
      }
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: this._capture.accumulator.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        }],
      });
      pass.end();
      device.queue.submit([encoder.finish()]);
    },

    // Render one sub-frame of the current draw list into the HDR resolve
    // target, then additively blend (weight × resolve) into the
    // accumulator. The fill pass uses clearValue so a single sub-frame
    // contribution accounts for the renderer's clear colour as well.
    accumulateSubFrame(weight) {
      if (!this._capture || !this._capture.accumulator) {
        throw new Error('accumulator not enabled — pass { accumulator: true } to beginCapture');
      }
      if (!this.instanceBuffer) return;
      const c = this._capture;
      const sx = 2 * this.pixelScale / this.pixelWidth;
      const sy = 2 * this.pixelScale / this.pixelHeight;
      const ox = (this.instanceCenterX - this.centerX) * sx;
      const oy = (this.instanceCenterY - this.centerY) * sy;
      device.queue.writeBuffer(viewUniformBuffer, 0, new Float32Array([sx, sy, ox, oy]));
      device.queue.writeBuffer(accumulateUniformBuffer, 0, new Float32Array([weight, 0, 0, 0]));
      const encoder = device.createCommandEncoder();
      // Pass 1: scene → HDR ms → HDR resolve.
      const fillPass = encoder.beginRenderPass({
        colorAttachments: [{
          view: c.msHdr.createView(),
          resolveTarget: c.hdrResolve.createView(),
          clearValue: this.clearValue,
          loadOp: 'clear',
          storeOp: 'discard',
        }],
      });
      if (this.drawGroups.length > 0) {
        fillPass.setPipeline(fillPipeline);
        fillPass.setBindGroup(0, fillBindGroup);
        fillPass.setVertexBuffer(1, this.instanceBuffer);
        for (const g of this.drawGroups) {
          if (g.instanceCount === 0) continue;
          fillPass.setVertexBuffer(0, g.mesh.vertexBuffer);
          fillPass.setIndexBuffer(g.mesh.indexBuffer, g.mesh.indexFormat);
          fillPass.drawIndexed(g.mesh.indexCount, g.instanceCount, 0, 0, g.instanceOffset);
        }
        // Outline pass for video-export sub-frames (mirrors the live
        // _renderTo path; same fade math so the live preview and the
        // exported frames look the same).
        const o = this.outline;
        if (o && o.enabled) {
          const leafSizePx = leafBoundRadius * 2 * this.pixelScale;
          const t = (leafSizePx - o.fadeOutPx) / Math.max(1e-6, o.fadeInPx - o.fadeOutPx);
          const fade = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
          const alpha = fade * o.opacity;
          if (alpha > 0) {
            device.queue.writeBuffer(outlineUniformBuffer, 0, new Float32Array([alpha, 0, 0, 0]));
            fillPass.setPipeline(outlinePipeline);
            fillPass.setBindGroup(0, outlineBindGroup);
            fillPass.setVertexBuffer(0, meshVertexBuffer);
            fillPass.setIndexBuffer(outlineIndexBuffer, 'uint16');
            for (const g of this.drawGroups) {
              if (g.instanceCount === 0 || g.mesh !== defaultMesh) continue;
              fillPass.drawIndexed(15, g.instanceCount, 0, 0, g.instanceOffset);
            }
          }
        }
      }
      fillPass.end();
      // Pass 2: weight × hdrResolve → accumulator (additive blend).
      const accPass = encoder.beginRenderPass({
        colorAttachments: [{
          view: c.accumulator.createView(),
          loadOp: 'load',
          storeOp: 'store',
        }],
      });
      accPass.setPipeline(accumulatePipeline);
      accPass.setBindGroup(0, c.accumulateBindGroup);
      accPass.draw(3, 1, 0, 0);
      accPass.end();
      device.queue.submit([encoder.finish()]);
    },

    // Tonemap the accumulator to the canvas-format capture target and
    // read pixels back as RGBA. Mirrors captureFrame() except it sources
    // the accumulator instead of running the fill pass first.
    async captureAccumulated() {
      if (!this._capture || !this._capture.accumulator) {
        throw new Error('accumulator not enabled — pass { accumulator: true } to beginCapture');
      }
      const c = this._capture;
      const tm = this.tonemap;
      device.queue.writeBuffer(tonemapUniformBuffer, 0, new Float32Array([
        tm.contrast, tm.saturation, tm.midpoint, tm.brightness,
        tm.biasR ?? 0, tm.biasG ?? 0, tm.biasB ?? 0, 0,
      ]));
      const encoder = device.createCommandEncoder();
      const postPass = encoder.beginRenderPass({
        colorAttachments: [{
          view: c.target.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        }],
      });
      postPass.setPipeline(tonemapPipeline);
      postPass.setBindGroup(0, c.postBindGroupAcc);
      postPass.draw(3, 1, 0, 0);
      postPass.end();
      encoder.copyTextureToBuffer(
        { texture: c.target },
        { buffer: c.readback, bytesPerRow: c.bytesPerRow, rowsPerImage: c.h },
        [c.w, c.h, 1],
      );
      device.queue.submit([encoder.finish()]);
      await c.readback.mapAsync(GPUMapMode.READ);
      const padded = new Uint8Array(c.readback.getMappedRange());
      const out = new Uint8Array(c.w * c.h * 4);
      const isBgra = canvasFormat === 'bgra8unorm';
      for (let y = 0; y < c.h; y++) {
        const srcRow = y * c.bytesPerRow;
        const dstRow = y * c.w * 4;
        for (let x = 0; x < c.w; x++) {
          const s = srcRow + x * 4;
          const d = dstRow + x * 4;
          if (isBgra) {
            out[d + 0] = padded[s + 2];
            out[d + 1] = padded[s + 1];
            out[d + 2] = padded[s + 0];
            out[d + 3] = padded[s + 3];
          } else {
            out[d + 0] = padded[s + 0];
            out[d + 1] = padded[s + 1];
            out[d + 2] = padded[s + 2];
            out[d + 3] = padded[s + 3];
          }
        }
      }
      c.readback.unmap();
      return out;
    },

    async captureFrame() {
      if (!this._capture) throw new Error('beginCapture not called');
      if (!this.instanceBuffer) return new Uint8Array(0);
      const { w, h, msHdr, hdrResolve, target, readback, bytesPerRow, postBindGroup } = this._capture;
      this._renderTo(target, msHdr, hdrResolve, postBindGroup, (encoder) => {
        encoder.copyTextureToBuffer(
          { texture: target },
          { buffer: readback, bytesPerRow, rowsPerImage: h },
          [w, h, 1],
        );
      });
      await readback.mapAsync(GPUMapMode.READ);
      const padded = new Uint8Array(readback.getMappedRange());
      const out = new Uint8Array(w * h * 4);
      const isBgra = canvasFormat === 'bgra8unorm';
      for (let y = 0; y < h; y++) {
        const srcRow = y * bytesPerRow;
        const dstRow = y * w * 4;
        for (let x = 0; x < w; x++) {
          const s = srcRow + x * 4;
          const d = dstRow + x * 4;
          if (isBgra) {
            out[d + 0] = padded[s + 2];
            out[d + 1] = padded[s + 1];
            out[d + 2] = padded[s + 0];
            out[d + 3] = padded[s + 3];
          } else {
            out[d + 0] = padded[s + 0];
            out[d + 1] = padded[s + 1];
            out[d + 2] = padded[s + 2];
            out[d + 3] = padded[s + 3];
          }
        }
      }
      readback.unmap();
      return out;
    },

    endCapture() {
      if (!this._capture) return;
      const c = this._capture;
      c.target.destroy();
      c.readback.destroy();
      c.msHdr.destroy();
      c.hdrResolve.destroy();
      c.accumulator?.destroy();
      this.pixelWidth = c.savedPxW;
      this.pixelHeight = c.savedPxH;
      this._frameRequested = c.savedFrameRequested;
      this._capture = null;
      // Walker output reflects the capture dims; trigger a fresh
      // repack at live dims and redraw the live canvas.
      this.onViewChange?.(this);
      this._frameRequested = false;
      this.requestFrame();
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
    state.hdrTexture?.destroy();
    state.instanceBuffer?.destroy();
  });

  return { canvas, state };
}
