import { terrainVertexShader, terrainFragmentShader } from '../shaders/terrain.js';
import { computeTileMVP, computeTileModel, getCellSizeMeters } from '../tiles/tile-math.js';
import type { GPUContext } from './gpu-context.ts';
import type { SkyRenderer } from './sky-renderer.ts';
import type { TerrainMesh } from '../tiles/mesh.ts';

export class TerrainRenderer {
  _gpu: GPUContext;
  _sky: SkyRenderer;
  _pipeline: GPURenderPipeline;
  _mvpFloat32: Float32Array;
  _modelFloat32: Float32Array;
  _uniformData: Float32Array;
  _globalUniformData: Float32Array;

  constructor(gpu: GPUContext, sky: SkyRenderer) {
    this._gpu = gpu;
    this._sky = sky;

    const { device, format, uniformBGL, textureBGL, globalUniformBGL, imageryBGL } = gpu;

    this._pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [uniformBGL, textureBGL, globalUniformBGL, imageryBGL] }),
      vertex: {
        module: device.createShaderModule({ code: terrainVertexShader }), entryPoint: 'vs_main',
        buffers: [{ arrayStride: 4, attributes: [{ format: 'uint16x2', offset: 0, shaderLocation: 0 }] }],
      },
      fragment: {
        module: device.createShaderModule({ code: terrainFragmentShader }), entryPoint: 'fs_main',
        targets: [{ format }],
      },
      primitive: { topology: 'triangle-list', cullMode: 'back', frontFace: 'ccw' },
      depthStencil: { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'greater' },
    });

    this._mvpFloat32 = new Float32Array(16);
    this._modelFloat32 = new Float32Array(16);
    this._uniformData = new Float32Array(56);
    this._globalUniformData = new Float32Array(24);
  }

  paint(params: {
    canvas: HTMLCanvasElement;
    camera: any;
    settings: any;
    renderList: any[];
    tileManager: any;
    imageryTileCache: any;
    exaggeration: number;
    globalElevScale: number;
    lineLayers: any[];
    circleLayers: any[];
    textLayers: any[];
    frustumOverlay: any;
    collisionManager: any;
    pixelRatio: number;
  }) {
    const {
      canvas, camera, settings, renderList, tileManager, imageryTileCache,
      exaggeration, globalElevScale,
      lineLayers, circleLayers, textLayers,
      frustumOverlay, collisionManager, pixelRatio,
    } = params;

    const gpu = this._gpu;
    const { device } = gpu;

    const aspect = canvas.width / canvas.height;
    if (aspect === 0 || !isFinite(aspect)) return;
    const { view, projection, projectionView } = camera.update(aspect);

    let tileIndex = 0;
    const draws: { offset: number; bindGroup: GPUBindGroup; imageryBindGroup: GPUBindGroup; mesh: TerrainMesh }[] = [];

    for (const tile of renderList) {
      if (tileIndex >= gpu.MAX_TILES_PER_FRAME) break;

      // Elevation bind group from the terrain tile
      const terrainEntry = tileManager.getTile(tile.terrainZ, tile.terrainX, tile.terrainY) ?? tileManager.getFlatTileEntry();

      const D = tile.meshDataResolution;

      // Cell size of the terrain tile (physical distance between terrain texels)
      const terrainCellSize = getCellSizeMeters(tile.terrainZ, tile.terrainY);

      // Cell size of the imagery tile (for the mesh vertex spacing in model space)
      const cellSize = getCellSizeMeters(tile.z, tile.y);

      // Imagery bind group
      const hasImagery = imageryTileCache && imageryTileCache.hasImagery(tile.z, tile.x, tile.y);

      // Model matrix uses imagery tile coords + mesh data resolution
      computeTileMVP(this._mvpFloat32, view, projection, tile.z, tile.x, tile.y, globalElevScale, exaggeration, D);
      computeTileModel(this._modelFloat32, tile.z, tile.x, tile.y, globalElevScale, exaggeration, D);

      const ud = this._uniformData;
      ud.set(this._mvpFloat32, 0);
      ud.set(this._modelFloat32, 16);
      ud[32] = globalElevScale;
      ud[33] = cellSize;
      ud[34] = exaggeration;
      ud[35] = 1 / (D + 2);
      ud[36] = settings.showTileBorders ? 1.0 : 0.0;
      ud[37] = settings.showImagery ? (hasImagery ? 1.0 : 0.0) : 1.0;
      ud[38] = settings.hillshadeOpacity;
      ud[39] = settings.slopeAngleOpacity;
      ud[40] = settings.contourOpacity;
      ud[41] = canvas.height;
      ud[42] = settings.showWireframe ? 1.0 : 0.0;
      ud[43] = settings.slopeAspectMaskAbove;
      ud[44] = settings.slopeAspectMaskNear;
      ud[45] = settings.slopeAspectMaskBelow;
      ud[46] = settings.slopeAspectOpacity;
      ud[47] = settings.treelineLower * 0.3048;
      ud[48] = settings.treelineUpper * 0.3048;
      ud[49] = D;                          // grid_data_size
      ud[50] = tile.terrainUvOffsetU;      // terrain_uv_offset.x
      ud[51] = tile.terrainUvOffsetV;      // terrain_uv_offset.y
      ud[52] = tile.terrainUvScaleU;       // terrain_uv_scale.x
      ud[53] = tile.terrainUvScaleV;       // terrain_uv_scale.y
      ud[54] = terrainCellSize;            // terrain_cell_size

      let imageryBindGroup;
      if (!settings.showImagery) {
        imageryBindGroup = gpu.whiteImageryBindGroup;
      } else if (hasImagery) {
        imageryBindGroup = imageryTileCache.getBindGroup(tile.z, tile.x, tile.y);
      } else {
        imageryBindGroup = gpu.fallbackImageryBindGroup;
      }

      const mesh = gpu.meshPool.getMesh(D);

      device.queue.writeBuffer(gpu.uniformBuffer, tileIndex * gpu.UNIFORM_STRIDE, ud.buffer, ud.byteOffset, 224);
      draws.push({
        offset: tileIndex * gpu.UNIFORM_STRIDE,
        bindGroup: terrainEntry.bindGroup,
        imageryBindGroup,
        mesh,
      });
      tileIndex++;
    }

    // Camera world position
    const { phi, theta, distance, center } = camera.state;
    const camX = center[0] + distance * Math.cos(theta) * Math.cos(phi);
    const camY = center[1] + distance * Math.sin(theta);
    const camZ = center[2] + distance * Math.cos(theta) * Math.sin(phi);

    const metersPerUnit = 1.0 / globalElevScale;
    const camHeightMeters = camY / globalElevScale;

    // Sun direction (computed externally via settings.sunDirection)
    const sd = settings.sunDirection;
    const sunDirX = sd[0];
    const sunDirY = sd[1];
    const sunDirZ = sd[2];

    const atmDensity = settings.atmosphereDensity;
    const gu = this._globalUniformData;
    gu[0] = camX; gu[1] = camY; gu[2] = camZ; gu[3] = camHeightMeters;
    gu[4] = sunDirX; gu[5] = sunDirY; gu[6] = sunDirZ; gu[7] = metersPerUnit;
    gu[8]  = 5.2e-6 * atmDensity;  gu[9]  = 12.1e-6 * atmDensity; gu[10] = 29.6e-6 * atmDensity; gu[11] = 8000.0;
    gu[12] = 2.0e-5 * atmDensity;  gu[13] = 3000.0; gu[14] = 0.76; gu[15] = 20.0;

    const fov = camera.state.fov;
    const rightX = Math.sin(phi);
    const rightZ = -Math.cos(phi);
    const upX = -Math.sin(theta) * Math.cos(phi);
    const upY = Math.cos(theta);
    const upZ = -Math.sin(theta) * Math.sin(phi);
    gu[16] = rightX; gu[17] = 0; gu[18] = rightZ; gu[19] = aspect;
    gu[20] = upX; gu[21] = upY; gu[22] = upZ; gu[23] = Math.tan(fov / 2);

    device.queue.writeBuffer(gpu.globalUniformBuffer, 0, gu.buffer, gu.byteOffset, 96);

    gpu.ensureDepthTexture(canvas.width, canvas.height);

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: gpu.gpuCtx.getCurrentTexture().createView(),
        clearValue: { r: 0.53, g: 0.66, b: 0.82, a: 1.0 },
        loadOp: 'clear', storeOp: 'store',
      }],
      depthStencilAttachment: {
        view: gpu.depthTexture.createView(),
        depthClearValue: 0.0, depthLoadOp: 'clear', depthStoreOp: 'store',
      },
    });

    // Sky
    this._sky.draw(pass, gpu.globalUniformBindGroup);

    // Terrain
    pass.setPipeline(this._pipeline);
    pass.setBindGroup(2, gpu.globalUniformBindGroup);
    let currentMesh: TerrainMesh | null = null;
    for (const draw of draws) {
      if (draw.mesh !== currentMesh) {
        currentMesh = draw.mesh;
        pass.setVertexBuffer(0, currentMesh.vertexBuffer);
        pass.setIndexBuffer(currentMesh.indexBuffer, 'uint32');
      }
      pass.setBindGroup(0, gpu.uniformBindGroup, [draw.offset]);
      pass.setBindGroup(1, draw.bindGroup);
      pass.setBindGroup(3, draw.imageryBindGroup);
      pass.drawIndexed(currentMesh.indexCount);
    }

    // Frozen coverage frustum lines
    frustumOverlay.draw(pass, projectionView, canvas.width, canvas.height);

    // Line feature layers (drawn after terrain, before circles/text)
    for (const entry of lineLayers) {
      if (entry.visible) entry.layer.draw(pass);
    }

    // Circle feature layers
    for (const entry of circleLayers) {
      if (entry.visible) entry.layer.draw(pass, gpu.globalUniformBindGroup, false);
    }

    // Text feature layers (drawn after circles)
    for (const entry of textLayers) {
      if (entry.visible) entry.layer.draw(pass);
    }

    // Collision debug bounding boxes
    if (settings.showCollisionBoxes) {
      collisionManager.drawDebug(pass, canvas.width, canvas.height, pixelRatio, settings.collisionBuffer);
    }

    pass.end();
    device.queue.submit([encoder.finish()]);
  }
}
