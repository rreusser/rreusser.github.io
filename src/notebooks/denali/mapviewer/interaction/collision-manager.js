import { runCollision } from './collision.ts';
import { coloredLineShader } from '../shaders/lines.js';
import { invertMat4 } from '../math/mat4.ts';
import { screenToRay, raycastTerrain } from './raycast.js';

const MAX_DEBUG_BBOXES = 10000;
const VERTS_PER_BBOX = 8;
const FLOATS_PER_VERT = 6;
const COLLISION_RATE = 1000;

export class CollisionManager {
  constructor(device, format) {
    this._device = device;

    // Throttle state
    this._lastCollisionTime = 0;
    this._collisionStale = false;
    this._collisionScheduled = false;
    this._collisionTimer = null;
    this._debugItems = null;

    // Debug visualization pipeline and buffers
    const coloredLineModule = device.createShaderModule({ code: coloredLineShader });
    const collisionUniformBGL = device.createBindGroupLayout({
      entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } }],
    });
    this._uniformBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this._uniformBindGroup = device.createBindGroup({
      layout: collisionUniformBGL,
      entries: [{ binding: 0, resource: { buffer: this._uniformBuffer } }],
    });
    this._vertexBuffer = device.createBuffer({
      size: MAX_DEBUG_BBOXES * VERTS_PER_BBOX * FLOATS_PER_VERT * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this._linePipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [collisionUniformBGL] }),
      vertex: {
        module: coloredLineModule,
        entryPoint: 'vs_colored_line',
        buffers: [{
          arrayStride: FLOATS_PER_VERT * 4,
          attributes: [
            { format: 'float32x2', offset: 0, shaderLocation: 0 },
            { format: 'float32x4', offset: 8, shaderLocation: 1 },
          ],
        }],
      },
      fragment: {
        module: coloredLineModule,
        entryPoint: 'fs_colored_line',
        targets: [{
          format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          },
        }],
      },
      primitive: { topology: 'line-list' },
      depthStencil: { format: 'depth32float', depthWriteEnabled: false, depthCompare: 'always' },
    });

    this._invProjView = new Float32Array(16);
  }

  markStale() {
    if (!this._debugItems) this._collisionStale = true;
  }

  /**
   * Called each frame. Handles throttling internally.
   * Returns true if collision ran and render needs update.
   */
  update({ enabled, layers, projectionView, canvasW, canvasH, pixelRatio,
           exaggeration, collisionBuffer, occlusionBias, bvh, tileManager, bvhTileList, globalElevScale }) {
    const now = performance.now();

    if (!enabled) {
      if (this._debugItems) {
        this._debugItems = null;
        if (this._collisionScheduled) {
          clearTimeout(this._collisionTimer);
          this._collisionScheduled = false;
          this._collisionTimer = null;
        }
        for (const { layer } of layers) layer.setVisibleFeatures(null);
      }
      return false;
    }

    const elapsed = now - this._lastCollisionTime;
    if (elapsed >= COLLISION_RATE || this._collisionStale) {
      this._doCollision(layers, projectionView, canvasW, canvasH, pixelRatio,
                        exaggeration, collisionBuffer, occlusionBias, bvh, tileManager, bvhTileList, globalElevScale);
      this._lastCollisionTime = now;
      this._collisionStale = false;
      if (this._collisionScheduled) {
        clearTimeout(this._collisionTimer);
        this._collisionScheduled = false;
        this._collisionTimer = null;
      }
      return true;
    }

    if (!this._collisionScheduled) {
      this._collisionScheduled = true;
      this._collisionTimer = setTimeout(() => {
        this._collisionScheduled = false;
        this._collisionTimer = null;
        this._wakeCallback?.();
      }, COLLISION_RATE - elapsed);
    }

    return false;
  }

  /** Register a callback to wake the render loop when the trailing timer fires. */
  set onWake(fn) { this._wakeCallback = fn; }

  _doCollision(layers, projectionView, canvasW, canvasH, pixelRatio,
               exaggeration, collisionBuffer, occlusionBias, bvh, tileManager, bvhTileList, globalElevScale) {
    const allItems = [];
    let layerIdx = 0;
    for (const { layer, collision, sourceId } of layers) {
      if (collision) {
        const items = layer.getCollisionItems(projectionView, canvasW, canvasH, pixelRatio, exaggeration, globalElevScale);
        for (const item of items) { item.layerIndex = layerIdx; item.sourceId = sourceId; }
        allItems.push(...items);
      }
      layerIdx++;
    }

    // Terrain occlusion
    const cssW = canvasW / pixelRatio;
    const cssH = canvasH / pixelRatio;
    if (bvh && allItems.length > 0) {
      invertMat4(this._invProjView, projectionView);
      const pv = projectionView;
      for (const item of allItems) {
        const ndcX = item.screenX / cssW * 2 - 1;
        const ndcY = 1 - item.screenY / cssH * 2;
        const ray = screenToRay(ndcX, ndcY, this._invProjView);
        const hit = raycastTerrain({
          origin: ray.origin,
          direction: ray.direction,
          bvh,
          tileCache: tileManager,
          tileList: bvhTileList,
          verticalExaggeration: exaggeration,
        });
        if (hit) {
          const [wx, wy, wz] = hit.worldPos;
          const terrainClipW = pv[3]*wx + pv[7]*wy + pv[11]*wz + pv[15];
          if (terrainClipW < item.clipW * (1 - occlusionBias)) {
            item.occluded = true;
          }
        }
      }
    }

    // Filter out occluded items before collision
    const visibleItems = [];
    for (const item of allItems) {
      if (!item.occluded) visibleItems.push(item);
    }

    runCollision(visibleItems, collisionBuffer, cssW, cssH);

    // Propagate: if any layer-feature for a source feature is hidden, hide all
    const hiddenSources = new Map();
    for (const item of allItems) {
      if (item.occluded || !item.visible) {
        let set = hiddenSources.get(item.sourceId);
        if (!set) { set = new Set(); hiddenSources.set(item.sourceId, set); }
        set.add(item.sourceFeatureIndex);
      }
    }

    // Build visible sets per layer
    const visibleByLayer = new Map();
    for (const item of allItems) {
      const srcSet = hiddenSources.get(item.sourceId);
      if (srcSet && srcSet.has(item.sourceFeatureIndex)) {
        if (!item.occluded) item.visible = false;
      } else {
        let set = visibleByLayer.get(item.layerIndex);
        if (!set) { set = new Set(); visibleByLayer.set(item.layerIndex, set); }
        set.add(item.featureIndex);
      }
    }

    this._debugItems = allItems;

    // Distribute visible sets back to layers
    layerIdx = 0;
    for (const { layer, collision } of layers) {
      layer.setVisibleFeatures(collision ? (visibleByLayer.get(layerIdx) || new Set()) : null);
      layerIdx++;
    }
  }

  drawDebug(pass, canvasW, canvasH, pixelRatio, collisionBuffer) {
    if (!this._debugItems || this._debugItems.length === 0) return;

    const items = this._debugItems;
    const count = Math.min(items.length, MAX_DEBUG_BBOXES);
    const vertData = new Float32Array(count * 8 * 6);
    const buf = collisionBuffer;
    for (let i = 0; i < count; i++) {
      const it = items[i];
      const x0 = it.screenX - it.halfW - buf;
      const x1 = it.screenX + it.halfW + buf;
      const y0 = it.screenY - it.halfH - buf;
      const y1 = it.screenY + it.halfH + buf;
      const r = it.occluded ? 0.2 : it.visible ? 0 : 1;
      const g = it.occluded ? 0.4 : it.visible ? 1 : 0;
      const b = it.occluded ? 1.0 : 0;
      const a = 0.8;
      const off = i * 8 * 6;
      vertData[off]      = x0; vertData[off + 1]  = y0; vertData[off + 2]  = r; vertData[off + 3]  = g; vertData[off + 4]  = b; vertData[off + 5]  = a;
      vertData[off + 6]  = x1; vertData[off + 7]  = y0; vertData[off + 8]  = r; vertData[off + 9]  = g; vertData[off + 10] = b; vertData[off + 11] = a;
      vertData[off + 12] = x1; vertData[off + 13] = y0; vertData[off + 14] = r; vertData[off + 15] = g; vertData[off + 16] = b; vertData[off + 17] = a;
      vertData[off + 18] = x1; vertData[off + 19] = y1; vertData[off + 20] = r; vertData[off + 21] = g; vertData[off + 22] = b; vertData[off + 23] = a;
      vertData[off + 24] = x1; vertData[off + 25] = y1; vertData[off + 26] = r; vertData[off + 27] = g; vertData[off + 28] = b; vertData[off + 29] = a;
      vertData[off + 30] = x0; vertData[off + 31] = y1; vertData[off + 32] = r; vertData[off + 33] = g; vertData[off + 34] = b; vertData[off + 35] = a;
      vertData[off + 36] = x0; vertData[off + 37] = y1; vertData[off + 38] = r; vertData[off + 39] = g; vertData[off + 40] = b; vertData[off + 41] = a;
      vertData[off + 42] = x0; vertData[off + 43] = y0; vertData[off + 44] = r; vertData[off + 45] = g; vertData[off + 46] = b; vertData[off + 47] = a;
    }
    const cssW = canvasW / pixelRatio;
    const cssH = canvasH / pixelRatio;
    const resUniform = new Float32Array([cssW, cssH, 0, 0]);
    this._device.queue.writeBuffer(this._uniformBuffer, 0, resUniform);
    this._device.queue.writeBuffer(this._vertexBuffer, 0, vertData.buffer, 0, count * 8 * 6 * 4);
    pass.setPipeline(this._linePipeline);
    pass.setBindGroup(0, this._uniformBindGroup);
    pass.setVertexBuffer(0, this._vertexBuffer);
    pass.draw(count * 8);
  }

  clear(layers) {
    this._debugItems = null;
    if (this._collisionScheduled) {
      clearTimeout(this._collisionTimer);
      this._collisionScheduled = false;
      this._collisionTimer = null;
    }
    for (const { layer } of layers) layer.setVisibleFeatures(null);
  }

  destroy() {
    if (this._collisionTimer) clearTimeout(this._collisionTimer);
    this._uniformBuffer.destroy();
    this._vertexBuffer.destroy();
  }
}
