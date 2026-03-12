import { createTerrainMeshPool } from '../tiles/mesh.ts';
import type { TerrainMeshPool } from '../tiles/mesh.ts';

export class GPUContext {
  device!: GPUDevice;
  format!: GPUTextureFormat;
  gpuCtx!: GPUCanvasContext;

  // Bind group layouts
  uniformBGL!: GPUBindGroupLayout;
  textureBGL!: GPUBindGroupLayout;
  globalUniformBGL!: GPUBindGroupLayout;
  imageryBGL!: GPUBindGroupLayout;

  // Global resources
  globalUniformBuffer!: GPUBuffer;
  globalUniformBindGroup!: GPUBindGroup;
  imagerySampler!: GPUSampler;

  // Fallback imagery
  fallbackImageryTexture!: GPUTexture;
  fallbackImageryBindGroup!: GPUBindGroup;
  whiteImageryTexture!: GPUTexture;
  whiteImageryBindGroup!: GPUBindGroup;

  // Per-tile uniform resources
  UNIFORM_STRIDE = 256;
  MAX_TILES_PER_FRAME = 256;
  uniformBuffer!: GPUBuffer;
  uniformBindGroup!: GPUBindGroup;

  // Terrain mesh pool
  meshPool!: TerrainMeshPool;

  // Depth texture
  _depthTexture: GPUTexture | null = null;

  async init(canvas: HTMLCanvasElement) {
    const adapter = await navigator.gpu.requestAdapter();
    this.device = await adapter!.requestDevice();
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.gpuCtx = canvas.getContext('webgpu') as GPUCanvasContext;
    this.gpuCtx.configure({ device: this.device, format: this.format, alphaMode: 'opaque' });

    const device = this.device;

    this.meshPool = createTerrainMeshPool(device);

    this.imagerySampler = device.createSampler({
      magFilter: 'linear', minFilter: 'linear', mipmapFilter: 'nearest',
      addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge',
    });

    this.uniformBGL = device.createBindGroupLayout({
      entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform', hasDynamicOffset: true } }],
    });

    this.textureBGL = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float' } },
      ],
    });

    this.globalUniformBGL = device.createBindGroupLayout({
      entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }],
    });

    this.imageryBGL = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      ],
    });

    this.globalUniformBuffer = device.createBuffer({ size: 96, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.globalUniformBindGroup = device.createBindGroup({
      layout: this.globalUniformBGL,
      entries: [{ binding: 0, resource: { buffer: this.globalUniformBuffer } }],
    });

    // Fallback 1x1 imagery texture (black)
    this.fallbackImageryTexture = device.createTexture({
      size: [1, 1], format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    device.queue.writeTexture({ texture: this.fallbackImageryTexture }, new Uint8Array([0, 0, 0, 255]), { bytesPerRow: 4 }, [1, 1]);
    this.fallbackImageryBindGroup = device.createBindGroup({
      layout: this.imageryBGL,
      entries: [
        { binding: 0, resource: this.fallbackImageryTexture.createView() },
        { binding: 1, resource: this.imagerySampler },
      ],
    });

    // White 1x1 fallback for when imagery is toggled off
    this.whiteImageryTexture = device.createTexture({
      size: [1, 1], format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    device.queue.writeTexture({ texture: this.whiteImageryTexture }, new Uint8Array([255, 255, 255, 255]), { bytesPerRow: 4 }, [1, 1]);
    this.whiteImageryBindGroup = device.createBindGroup({
      layout: this.imageryBGL,
      entries: [
        { binding: 0, resource: this.whiteImageryTexture.createView() },
        { binding: 1, resource: this.imagerySampler },
      ],
    });

    // Per-tile uniform buffer
    this.uniformBuffer = device.createBuffer({
      size: this.UNIFORM_STRIDE * this.MAX_TILES_PER_FRAME,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.uniformBindGroup = device.createBindGroup({
      layout: this.uniformBGL,
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer, size: 224 } }],
    });
  }

  get mesh() {
    return this.meshPool.getMesh(512);
  }

  ensureDepthTexture(w: number, h: number) {
    if (this._depthTexture && this._depthTexture.width === w && this._depthTexture.height === h) return;
    if (this._depthTexture) this._depthTexture.destroy();
    this._depthTexture = this.device.createTexture({
      size: [w, h], format: 'depth32float', usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  get depthTexture(): GPUTexture {
    return this._depthTexture!;
  }

  destroy() {
    if (this._depthTexture) this._depthTexture.destroy();
    this.meshPool.destroy();
    this.uniformBuffer.destroy();
    this.globalUniformBuffer.destroy();
    this.fallbackImageryTexture.destroy();
    this.whiteImageryTexture.destroy();
    this.device.destroy();
  }
}
