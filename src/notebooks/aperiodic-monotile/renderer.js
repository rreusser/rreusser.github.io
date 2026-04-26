// WebGPU renderer for the aperiodic-monotile notebook. Owns the canvas,
// pipelines, mesh buffers, instance buffer, outline storage buffer, and
// pan/zoom interaction. The notebook cell that calls createGpuRenderer
// is left to wire the returned canvas into an `expandable()` and bridge
// gpuState to the substitution/morph cells.
//
// npm-imported things are injected as args (matching the project's
// "no npm imports inside lib files" convention); local ./lib/ helpers
// are imported directly here.

import { createVertexBuffer, createIndexBuffer, createUniformBuffer } from './lib/webgpu-canvas.js';

const SAMPLE_COUNT = 4;
// Compact per-instance layout (16 B). Halving the stride from a naive
// 8 floats brings depth-8 (~17 M tiles) under typical maxBufferSize.
//   offset  0 (8 B): float32x2  (tx, ty)         — sub-pixel accurate
//   offset  8 (4 B): snorm16x2  (cos θ, sin θ)   — 1 / 32 768 precision
//   offset 12 (4 B): unorm8x4   (r, g, b, mirror) — mirror byte is 0
//                                 for no flip, 255 for flip; the shader
//                                 maps that back to ±1.
// Exported so the cell that packs RawPlacements into the instance
// buffer (gpu-render) and the renderer agree on the layout.
export const INSTANCE_STRIDE = 16;

export function createGpuRenderer({
  device,
  canvasFormat,
  invalidation,
  meshVertexData,
  meshFillIndices,
  meshOutlineIndices,
  // Upper bounds for the resizable mesh / index buffers — sized once at
  // construction so the curved-edge editor can swap in a denser polygon
  // without re-creating GPU buffers each morph tick. The default 14-vertex
  // spectre uses ~14 verts / 36 fill indices / 28 outline indices; curved
  // edges with adaptive refinement push these higher.
  maxBoundaryVerts = 256,
  maxFillIndices   = 768,
  maxOutlineIndices = 512,
  shaders,
  createGPULines,
}) {
  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'grab';

  const context = canvas.getContext('webgpu');
  context.configure({ device, format: canvasFormat, alphaMode: 'premultiplied' });

  // Two meshes: even-parity tiles (rot ≡ 0 mod 2) render as Tile(a, b);
  // odd-parity tiles render as Tile(b, a). At a = b they're identical, but
  // for hat/turtle morph one is the hat shape and the other the turtle shape.
  // Buffers are pre-sized at the upper bound so the curved-edge editor can
  // grow the boundary polygon without re-allocating; we just track the live
  // counts and pass them to drawIndexed each frame.
  const evenMeshVertexBuffer = createVertexBuffer(device, 'spectre-verts-even', maxBoundaryVerts * 8);
  const oddMeshVertexBuffer  = createVertexBuffer(device, 'spectre-verts-odd',  maxBoundaryVerts * 8);
  device.queue.writeBuffer(evenMeshVertexBuffer, 0, meshVertexData);
  device.queue.writeBuffer(oddMeshVertexBuffer,  0, meshVertexData);
  // Separate fill index buffers per parity — at the morph's degenerate
  // endpoints (b → 0 or a → 0) the even and odd polygons have *different*
  // topologies (one is a 7-gon-with-spike, the other a hexagon), so a
  // single shared triangulation can't cover both.
  const fillIndexBufferEven = createIndexBuffer(device, 'spectre-fill-indices-even', maxFillIndices * 2);
  const fillIndexBufferOdd  = createIndexBuffer(device, 'spectre-fill-indices-odd',  maxFillIndices * 2);
  const outlineIndexBuffer  = createIndexBuffer(device, 'spectre-outline-indices',   maxOutlineIndices * 2);
  device.queue.writeBuffer(fillIndexBufferEven, 0, meshFillIndices);
  device.queue.writeBuffer(fillIndexBufferOdd,  0, meshFillIndices);
  device.queue.writeBuffer(outlineIndexBuffer,  0, meshOutlineIndices);
  // 32 bytes: scale.xy, offset.xy, outlineStrength, _pad x3
  const viewUniformBuffer = createUniformBuffer(device, 'view-uniforms', 32);

  // Per instance: float32x2 (tx, ty) + snorm16x2 (cos, sin) + unorm8x4 (r, g, b, mirror).
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

  // Shader inputs match the compact 16-byte instance layout:
  //   iWorld   (location 1, float32x2)  — tile translation in world units
  //   iCosSin  (location 2, vec2f)      — snorm16x2 decoded to [-1, 1]
  //   iColMir  (location 3, vec4f)      — unorm8x4 decoded to [0, 1];
  //                                        .rgb is the fill color, .w
  //                                        encodes mirror as 0 or 1, which
  //                                        the shader maps to ±1.
  const fillShader = device.createShaderModule({
    label: 'spectre-fill',
    code: shaders.fillShaderCode,
  });

  const outlineShader = device.createShaderModule({
    label: 'spectre-outline',
    code: shaders.outlineShaderCode,
  });

  const fillPipeline = device.createRenderPipeline({
    label: 'spectre-fill-pipeline',
    layout: 'auto',
    vertex:   { module: fillShader,    entryPoint: 'vs', buffers: vertexLayouts },
    fragment: { module: fillShader,    entryPoint: 'fs', targets: [{ format: canvasFormat }] },
    primitive: { topology: 'triangle-list' },
    multisample: { count: SAMPLE_COUNT },
  });

  const outlinePipeline = device.createRenderPipeline({
    label: 'spectre-outline-pipeline',
    layout: 'auto',
    vertex:   { module: outlineShader, entryPoint: 'vs', buffers: vertexLayouts },
    fragment: { module: outlineShader, entryPoint: 'fs', targets: [{ format: canvasFormat }] },
    primitive: { topology: 'line-list' },
    multisample: { count: SAMPLE_COUNT },
  });

  const fillBindGroup = device.createBindGroup({
    layout: fillPipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: viewUniformBuffer } }],
  });
  const outlineBindGroup = device.createBindGroup({
    layout: outlinePipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: viewUniformBuffer } }],
  });

  // ─── Metatile-outline line renderer ─────────────────────────────────
  // Closed-loop modular-index quad outlines via webgpu-instanced-lines.
  // Storage layout, index scheme, and palette are documented in
  // ./shaders.js along with the WGSL bodies themselves.
  const gpuLines = createGPULines(device, {
    colorTargets: [{
      format: canvasFormat,
      blend: {
        color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        alpha: { srcFactor: 'one',       dstFactor: 'one-minus-src-alpha', operation: 'add' },
      },
    }],
    multisample: { count: SAMPLE_COUNT },
    join: 'bevel',
    // Each quad is a closed loop drawn via the modular-index technique
    // (see lineVertexShaderBody): butt caps so the inevitable end-cap at
    // the seam between adjacent loops doesn't poke out, and
    // clampIndices: false so getVertex receives raw indices and handles
    // its own bounds (returning a break vertex for out-of-range).
    cap: 'butt',
    clampIndices: false,
    vertexShaderBody: shaders.lineVertexShaderBody,
    fragmentShaderBody: shaders.lineFragmentShaderBody,
  });

  // 32 B uniform: viewScale.xy, viewOffset.xy, dpr, pad x3.
  const lineUniformBuffer = createUniformBuffer(device, 'line-uniforms', 32);

  const state = {
    canvas,
    instanceBuffer: null,
    instanceCapacity: 0,
    msTexture: null,
    lastBounds: null,
    lastCount: 0,
    lastEvenCount: 0,
    pixelWidth: 0,
    pixelHeight: 0,
    // Outline state: storage buffer holding (x, y, levelNorm, widthPx)
    // per vertex, plus its bind group and the count of vertices to draw.
    // The bind group is rebuilt whenever the buffer is reallocated.
    outlineBuffer: null,
    outlineCapacity: 0,
    outlineVertexCount: 0,
    outlineMaxWidth: 0,
    outlineBindGroup: null,
    outlineEnabled: true,
    // View state: world point at clip-space origin and pixels-per-world-unit
    // (in physical pixels). scale.x = 2*pixelScale/pixelWidth, etc.
    centerX: 0, centerY: 0, pixelScale: 0,
    // Live mesh counts. Default = the original 14-vertex / 36-index / 28-
    // outline-index spectre; the curved-edge editor cell rewrites these
    // when the user pulls a handle off-center.
    fillIndexCount: meshFillIndices.length,
    outlineIndexCount: meshOutlineIndices.length,
    // Per parity, re-upload the spectre vertices for the current morph and
    // redraw. `evenData` is Tile(a, b); `oddData` is Tile(b, a). Draw calls
    // pick the right buffer based on each instance's rotation parity.
    uploadMeshes(evenData, oddData) {
      device.queue.writeBuffer(evenMeshVertexBuffer, 0, evenData);
      device.queue.writeBuffer(oddMeshVertexBuffer,  0, oddData);
      if (this.lastCount) this.redraw();
    },
    uploadFillIndices(evenIndices, oddIndices, indexCount) {
      // Earcut on the morphed polygon may rearrange triangles (or produce
      // zero-area ones at degenerate endpoints). Per parity because the
      // polygons have different topologies at the degenerate endpoints.
      // indexCount is the live count to draw — buffers are sized at the
      // upper bound and may have stale tail data.
      device.queue.writeBuffer(fillIndexBufferEven, 0, evenIndices);
      device.queue.writeBuffer(fillIndexBufferOdd,  0, oddIndices);
      this.fillIndexCount = indexCount ?? evenIndices.length;
      if (this.lastCount) this.redraw();
    },
    uploadOutlineIndices(indices, indexCount) {
      // Outline is the closed boundary loop; topology-wise it's the same
      // for both parities (just N → 2N edge-pairs), so a single shared
      // index buffer is fine. Updated when the curved-edge editor changes
      // the number of boundary vertices.
      device.queue.writeBuffer(outlineIndexBuffer, 0, indices);
      this.outlineIndexCount = indexCount ?? indices.length;
      if (this.lastCount) this.redraw();
    },
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
      // First valid pixel size: derive the initial fit from the bounds we
      // already received from gpu-render. Subsequent resizes preserve the
      // user's pan/zoom (pixelScale stays in physical pixels per world unit).
      if (this.lastBounds && this.pixelScale === 0) this.fitBounds(this.lastBounds);
      if (this.lastBounds) this.redraw();
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
    setOutlines(positions, vertexCount, maxWidth) {
      const requiredBytes = positions.byteLength;
      if (requiredBytes > this.outlineCapacity) {
        this.outlineBuffer?.destroy();
        this.outlineCapacity = Math.max(requiredBytes, Math.max(4096, this.outlineCapacity * 2));
        this.outlineBuffer = device.createBuffer({
          label: 'metatile-outline-points',
          size: this.outlineCapacity,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this.outlineBindGroup = device.createBindGroup({
          layout: gpuLines.getBindGroupLayout(1),
          entries: [
            { binding: 0, resource: { buffer: this.outlineBuffer } },
            { binding: 1, resource: { buffer: lineUniformBuffer } },
          ],
        });
      }
      if (this.outlineBuffer) {
        device.queue.writeBuffer(this.outlineBuffer, 0, positions);
      }
      this.outlineVertexCount = vertexCount;
      this.outlineMaxWidth = maxWidth;
      if (this.lastBounds) this.redraw();
    },
    setOutlinesEnabled(enabled) {
      this.outlineEnabled = enabled;
      if (this.lastBounds) this.redraw();
    },
    fitBounds(b) {
      if (!this.pixelWidth) return;
      const w = b.maxX - b.minX;
      const h = b.maxY - b.minY;
      this.centerX = (b.minX + b.maxX) / 2;
      this.centerY = (b.minY + b.maxY) / 2;
      // Bounds is a circumscribing square around the cluster's bounding
      // circle (rotation-invariant), so the tile cluster naturally fills
      // far less than the full square. Over-scale a bit so the visible
      // cluster fills more of the canvas on initial fit; users can still
      // zoom out via wheel/pinch if they want to see the bound's slack.
      this.pixelScale = 1.25 * Math.min(this.pixelWidth / w, this.pixelHeight / h);
    },
    draw(instanceData, bounds, evenCount) {
      const count = instanceData.byteLength / INSTANCE_STRIDE;
      this.ensureInstanceBuffer(count);
      device.queue.writeBuffer(this.instanceBuffer, 0, instanceData);
      this.lastCount = count;
      this.lastEvenCount = evenCount;
      // Refit only when the data's natural bounds actually change. Color-only
      // updates re-call draw with the same bounds and preserve the user's view.
      const prev = this.lastBounds;
      const boundsChanged = !prev
        || prev.minX !== bounds.minX || prev.maxX !== bounds.maxX
        || prev.minY !== bounds.minY || prev.maxY !== bounds.maxY;
      this.lastBounds = bounds;
      if (boundsChanged) this.fitBounds(bounds);
      this.redraw();
    },
    redraw() {
      if (!this.instanceBuffer || !this.pixelWidth || !this.msTexture) return;
      const sx = 2 * this.pixelScale / this.pixelWidth;
      const sy = 2 * this.pixelScale / this.pixelHeight;
      // Each spectre edge is one world unit, so its on-screen length in
      // physical pixels is just pixelScale. Fade the outline out as edges
      // shrink to fewer than a few pixels.
      const edgePx = this.pixelScale;
      const outlineStrength = Math.max(0, Math.min(1, (edgePx + 0) / 12));
      device.queue.writeBuffer(viewUniformBuffer, 0, new Float32Array([
        sx, sy, -this.centerX * sx, -this.centerY * sy,
        outlineStrength, 0, 0, 0,
      ]));

      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: this.msTexture.createView(),
          resolveTarget: context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'discard',
        }],
      });
      pass.setVertexBuffer(1, this.instanceBuffer);

      const nEven = this.lastEvenCount;
      const nOdd  = this.lastCount - nEven;

      const fillN    = this.fillIndexCount;
      const outlineN = this.outlineIndexCount;

      pass.setPipeline(fillPipeline);
      pass.setBindGroup(0, fillBindGroup);
      if (nEven > 0) {
        pass.setIndexBuffer(fillIndexBufferEven, 'uint16');
        pass.setVertexBuffer(0, evenMeshVertexBuffer);
        pass.drawIndexed(fillN, nEven, 0, 0, 0);
      }
      if (nOdd > 0) {
        pass.setIndexBuffer(fillIndexBufferOdd, 'uint16');
        pass.setVertexBuffer(0, oddMeshVertexBuffer);
        pass.drawIndexed(fillN, nOdd, 0, 0, nEven);
      }

      if (outlineStrength > 0) {
        pass.setPipeline(outlinePipeline);
        pass.setBindGroup(0, outlineBindGroup);
        pass.setIndexBuffer(outlineIndexBuffer, 'uint16');
        if (nEven > 0) {
          pass.setVertexBuffer(0, evenMeshVertexBuffer);
          pass.drawIndexed(outlineN, nEven, 0, 0, 0);
        }
        if (nOdd > 0) {
          pass.setVertexBuffer(0, oddMeshVertexBuffer);
          pass.drawIndexed(outlineN, nOdd, 0, 0, nEven);
        }
      }

      if (this.outlineEnabled && this.outlineVertexCount > 0 && this.outlineBindGroup) {
        // Line uniform mirrors the spectre view transform so outlines pan/
        // zoom with the figure; per-vertex widths in the storage buffer are
        // in logical pixels and the shader multiplies by DPR.
        const dpr = devicePixelRatio || 1;
        device.queue.writeBuffer(lineUniformBuffer, 0, new Float32Array([
          sx, sy, -this.centerX * sx, -this.centerY * sy,
          dpr, 0, 0, 0,
        ]));
        gpuLines.draw(pass, {
          vertexCount: this.outlineVertexCount,
          width: this.outlineMaxWidth * dpr,
          resolution: [this.pixelWidth, this.pixelHeight],
        }, [this.outlineBindGroup]);
      }

      pass.end();
      device.queue.submit([encoder.finish()]);
    },
    panBy(dxCss, dyCss) {
      const rect = canvas.getBoundingClientRect();
      const dpr = this.pixelWidth / Math.max(1, rect.width);
      this.centerX -= dxCss * dpr / this.pixelScale;
      this.centerY += dyCss * dpr / this.pixelScale;
      this.redraw();
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
      this.redraw();
    },
  };

  // Pan: 1-pointer drag. Pinch-zoom + 2-finger pan: 2-pointer gesture.
  // Track all active pointers in canvas-local coords; the gesture mode is
  // determined by pointers.size each move.
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
      // Resume single-finger pan from the remaining pointer.
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

  // Zoom: wheel around the cursor position.
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
