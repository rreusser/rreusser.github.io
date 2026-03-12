// Instanced circle rendering for GeoJSON point features on terrain

import { circleVertexShader, circleFragmentShader } from '../shaders/circle.js';

const MAX_INSTANCES = 10000;

// Per-instance: worldPos(3f) + radius(1f) + fillColor(4f) + strokeColor(4f) + strokeWidth(1f) + opacity(1f) = 14 floats = 56 bytes
const INSTANCE_FLOATS = 14;
const INSTANCE_BYTES = INSTANCE_FLOATS * 4;

function parseColor(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return [1, 0, 0, 1];
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255, 1];
}

export class CircleLayer {
  constructor(config, geojsonSource, queryElevationMercator) {
    this._source = geojsonSource;
    this._queryElevation = queryElevationMercator;

    const paint = config.paint || {};
    this._radius = paint['circle-radius'] || 4;
    this._fillColor = parseColor(paint['circle-color'] || '#ff3333');
    this._strokeColor = parseColor(paint['circle-stroke-color'] || '#ffffff');
    this._strokeWidth = paint['circle-stroke-width'] || 0;
    this._opacity = paint['circle-opacity'] != null ? paint['circle-opacity'] : 1.0;
    this._atmosphereOpacity = paint['atmosphere-opacity'] != null ? paint['atmosphere-opacity'] : 1.0;

    this._pipelineDepthTest = null;
    this._pipelineNoDepthTest = null;
    this._instanceBuffer = null;
    this._instanceData = null;
    this._uniformBuffer = null;
    this._uniformBindGroup = null;
    this._visibleCount = 0;
    this._visibleFeatures = null;
  }

  init(device, globalUniformBGL, format) {
    this._device = device;

    const circleUniformBGL = device.createBindGroupLayout({
      entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }],
    });

    // Uniform: mat4(64) + vec2(8) + f32(4) + f32(4) + f32(4) + pad(12) = 96 bytes
    this._uniformBuffer = device.createBuffer({
      size: 96,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this._uniformBindGroup = device.createBindGroup({
      layout: circleUniformBGL,
      entries: [{ binding: 0, resource: { buffer: this._uniformBuffer } }],
    });

    this._instanceData = new Float32Array(MAX_INSTANCES * INSTANCE_FLOATS);
    this._instanceBuffer = device.createBuffer({
      size: MAX_INSTANCES * INSTANCE_BYTES,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const vertexModule = device.createShaderModule({ code: circleVertexShader });
    const fragmentModule = device.createShaderModule({ code: circleFragmentShader });

    const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [globalUniformBGL, circleUniformBGL] });
    const vertexState = {
      module: vertexModule,
      entryPoint: 'vs_circle',
      buffers: [{
        arrayStride: INSTANCE_BYTES,
        stepMode: 'instance',
        attributes: [
          { format: 'float32x3', offset: 0, shaderLocation: 0 },    // world_pos
          { format: 'float32', offset: 12, shaderLocation: 1 },     // radius
          { format: 'float32x4', offset: 16, shaderLocation: 2 },   // fill_color
          { format: 'float32x4', offset: 32, shaderLocation: 3 },   // stroke_color
          { format: 'float32', offset: 48, shaderLocation: 4 },     // stroke_width
          { format: 'float32', offset: 52, shaderLocation: 5 },     // opacity
        ],
      }],
    };
    const fragmentState = {
      module: fragmentModule,
      entryPoint: 'fs_circle',
      targets: [{
        format,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        },
      }],
    };

    this._pipelineDepthTest = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: vertexState,
      fragment: fragmentState,
      primitive: { topology: 'triangle-list' },
      depthStencil: { format: 'depth32float', depthWriteEnabled: false, depthCompare: 'greater' },
    });

    this._pipelineNoDepthTest = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: vertexState,
      fragment: fragmentState,
      primitive: { topology: 'triangle-list' },
      depthStencil: { format: 'depth32float', depthWriteEnabled: false, depthCompare: 'always' },
    });
  }

  prepare(projectionView, canvasW, canvasH, pixelRatio, exaggeration, globalElevScale) {
    const features = this._source.features;
    const data = this._instanceData;
    let count = 0;

    for (let i = 0; i < features.length && count < MAX_INSTANCES; i++) {
      const f = features[i];
      const elev = this._queryElevation(f.mercatorX, f.mercatorY);
      if (elev == null || elev <= 0) continue;
      if (this._visibleFeatures && !this._visibleFeatures.has(i)) continue;

      const wx = f.mercatorX;
      const wy = elev * globalElevScale * exaggeration;
      const wz = f.mercatorY;

      // Frustum cull: project to clip space and check
      const cx = projectionView[0] * wx + projectionView[4] * wy + projectionView[8] * wz + projectionView[12];
      const cy = projectionView[1] * wx + projectionView[5] * wy + projectionView[9] * wz + projectionView[13];
      const cw = projectionView[3] * wx + projectionView[7] * wy + projectionView[11] * wz + projectionView[15];

      // Skip if behind camera or outside clip volume (with margin for circle size)
      if (cw <= 0) continue;
      const ndcX = cx / cw;
      const ndcY = cy / cw;
      const margin = 0.2;
      if (ndcX < -1 - margin || ndcX > 1 + margin || ndcY < -1 - margin || ndcY > 1 + margin) continue;

      const off = count * INSTANCE_FLOATS;
      data[off] = wx;
      data[off + 1] = wy;
      data[off + 2] = wz;
      data[off + 3] = this._radius;
      data[off + 4] = this._fillColor[0];
      data[off + 5] = this._fillColor[1];
      data[off + 6] = this._fillColor[2];
      data[off + 7] = this._fillColor[3];
      data[off + 8] = this._strokeColor[0];
      data[off + 9] = this._strokeColor[1];
      data[off + 10] = this._strokeColor[2];
      data[off + 11] = this._strokeColor[3];
      data[off + 12] = this._strokeWidth;
      data[off + 13] = this._opacity;
      count++;
    }

    this._visibleCount = count;

    if (count > 0) {
      this._device.queue.writeBuffer(this._instanceBuffer, 0, data.buffer, 0, count * INSTANCE_BYTES);
    }

    // Update circle uniforms: projectionView (mat4) + viewport (vec2) + pixelRatio (f32) + exaggeration (f32) + atmosphereOpacity (f32)
    const uniforms = new Float32Array(24);
    uniforms.set(projectionView, 0);
    uniforms[16] = canvasW;
    uniforms[17] = canvasH;
    uniforms[18] = pixelRatio;
    uniforms[19] = exaggeration;
    uniforms[20] = this._atmosphereOpacity;
    this._device.queue.writeBuffer(this._uniformBuffer, 0, uniforms);
  }

  draw(pass, globalUniformBindGroup, depthTest = true) {
    if (this._visibleCount === 0) return;
    pass.setPipeline(depthTest ? this._pipelineDepthTest : this._pipelineNoDepthTest);
    pass.setBindGroup(0, globalUniformBindGroup);
    pass.setBindGroup(1, this._uniformBindGroup);
    pass.setVertexBuffer(0, this._instanceBuffer);
    pass.draw(6, this._visibleCount);
  }

  getCollisionItems(projectionView, canvasW, canvasH, pixelRatio, exaggeration, globalElevScale) {
    const features = this._source.features;
    const cssW = canvasW / pixelRatio;
    const cssH = canvasH / pixelRatio;
    const halfExtent = this._radius + this._strokeWidth;
    const items = [];

    for (let i = 0; i < features.length; i++) {
      const f = features[i];
      const elev = this._queryElevation(f.mercatorX, f.mercatorY);
      if (elev == null || elev <= 0) continue;

      const wx = f.mercatorX;
      const wy = elev * globalElevScale * exaggeration;
      const wz = f.mercatorY;

      const cx = projectionView[0] * wx + projectionView[4] * wy + projectionView[8] * wz + projectionView[12];
      const cy = projectionView[1] * wx + projectionView[5] * wy + projectionView[9] * wz + projectionView[13];
      const cz = projectionView[2] * wx + projectionView[6] * wy + projectionView[10] * wz + projectionView[14];
      const cw = projectionView[3] * wx + projectionView[7] * wy + projectionView[11] * wz + projectionView[15];

      if (cw <= 0) continue;
      const ndcX = cx / cw;
      const ndcY = cy / cw;
      if (ndcX < -1.2 || ndcX > 1.2 || ndcY < -1.2 || ndcY > 1.2) continue;

      items.push({
        layerIndex: -1, // set by caller
        featureIndex: i,
        sourceFeatureIndex: i,
        screenX: (ndcX * 0.5 + 0.5) * cssW,
        screenY: (0.5 - ndcY * 0.5) * cssH,
        halfW: halfExtent,
        halfH: halfExtent,
        depth: cz / cw,
        clipW: cw,
      });
    }
    return items;
  }

  setVisibleFeatures(visibleSet) {
    this._visibleFeatures = visibleSet;
  }

}
