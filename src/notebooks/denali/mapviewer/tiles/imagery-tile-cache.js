// Per-imagery-tile GPU texture cache
//
// Manages composited GPU textures keyed by imagery tile coordinates.
// Each imagery tile gets a 512x512 canvas compositing all base layers,
// then uploaded to a GPU texture. For single-layer 1:1 cases, uploads
// the ImageBitmap directly without canvas compositing.

const CANVAS_SIZE = 512;

// Mid-gray placeholder for tiles that have no real bitmap data and no
// composited ancestor to fall back on. After the shader's srgbToLinear
// converts it (~0.21 linear) and lighting/atmosphere are applied, this
// reads as "neutral overcast terrain" — much closer to the eventual
// imagery than the WebGPU zero-init black, which produced the
// "dark with atmosphere only" look reported on mobile.
const PLACEHOLDER_GRAY = 0.5;

export class ImageryTileCache {
  /**
   * @param {GPUDevice} device
   * @param {Array<{imageryManager, blend, opacity, minzoom, maxzoom}>} layers
   * @param {GPUBindGroupLayout} bindGroupLayout
   * @param {GPUSampler} sampler
   */
  constructor(device, layers, bindGroupLayout, sampler) {
    this.device = device;
    this.layers = layers;
    this.bindGroupLayout = bindGroupLayout;
    this.sampler = sampler;
    this.entries = new Map(); // key -> entry
    this.onUpdate = null;

    this._initUpsamplePipeline();

    for (const layer of layers) {
      layer.imageryManager.onTileLoaded = (sz, sx, sy) => this._onSatelliteTileLoaded(layer, sz, sx, sy);
    }
  }

  // Mirrors LightingManager's upsample pipeline: a fullscreen-triangle
  // textured-blit that copies a sub-region of a source texture into a
  // destination texture at a given UV offset and scale. Used to seed new
  // imagery entries from an already-composited ancestor entry so newly
  // created child tiles render parent imagery upsampled in place of black.
  _initUpsamplePipeline() {
    const wgsl = /* wgsl */`
      struct VsOut {
        @builtin(position) pos: vec4<f32>,
        @location(0) uv: vec2<f32>,
      };

      struct Params {
        uv_offset: vec2<f32>,
        uv_scale: vec2<f32>,
      };

      @group(0) @binding(0) var srcTex: texture_2d<f32>;
      @group(0) @binding(1) var srcSampler: sampler;
      @group(0) @binding(2) var<uniform> params: Params;

      @vertex
      fn vs(@builtin(vertex_index) idx: u32) -> VsOut {
        var pos = array<vec2<f32>, 3>(
          vec2<f32>(-1.0, -1.0),
          vec2<f32>( 3.0, -1.0),
          vec2<f32>(-1.0,  3.0),
        );
        var uvs = array<vec2<f32>, 3>(
          vec2<f32>(0.0, 1.0),
          vec2<f32>(2.0, 1.0),
          vec2<f32>(0.0, -1.0),
        );
        var out: VsOut;
        out.pos = vec4<f32>(pos[idx], 0.0, 1.0);
        out.uv = uvs[idx];
        return out;
      }

      @fragment
      fn fs(in: VsOut) -> @location(0) vec4<f32> {
        let src_uv = params.uv_offset + in.uv * params.uv_scale;
        return textureSample(srcTex, srcSampler, src_uv);
      }
    `;
    const module = this.device.createShaderModule({ code: wgsl });
    this._upsamplePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module, entryPoint: 'vs' },
      fragment: { module, entryPoint: 'fs', targets: [{ format: 'rgba8unorm' }] },
      primitive: { topology: 'triangle-list' },
    });
    this._upsampleSampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    });
    this._upsampleUniformBuf = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  _runUpsamplePass(srcTex, dstTex, uvOffsetX, uvOffsetY, uvScale) {
    this.device.queue.writeBuffer(
      this._upsampleUniformBuf, 0,
      new Float32Array([uvOffsetX, uvOffsetY, uvScale, uvScale]),
    );
    const bindGroup = this.device.createBindGroup({
      layout: this._upsamplePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: srcTex.createView() },
        { binding: 1, resource: this._upsampleSampler },
        { binding: 2, resource: { buffer: this._upsampleUniformBuf } },
      ],
    });
    const encoder = this.device.createCommandEncoder({ label: 'imagery.upsample' });
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: dstTex.createView(),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
      }],
    });
    pass.setPipeline(this._upsamplePipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  _clearTextureToGray(texture) {
    const encoder = this.device.createCommandEncoder({ label: 'imagery.clearGray' });
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: texture.createView(),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: PLACEHOLDER_GRAY, g: PLACEHOLDER_GRAY, b: PLACEHOLDER_GRAY, a: 1.0 },
      }],
    });
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  // Walk up the ancestor chain to find the closest entry that already has
  // content, and blit its corresponding quadrant into the new entry's
  // texture. Mirrors LightingManager._tryFillFromAncestor. Returns true
  // if any ancestor was found.
  _blitFromAncestorEntry(entry) {
    const { iz, ix, iy } = entry;
    for (let dz = 1; dz <= iz; dz++) {
      const pz = iz - dz;
      const px = ix >> dz;
      const py = iy >> dz;
      const parent = this.entries.get(this._key(pz, px, py));
      if (parent && parent.hasContent) {
        const scale = 1 << dz;
        const quadX = ix & (scale - 1);
        const quadY = iy & (scale - 1);
        this._runUpsamplePass(parent.texture, entry.texture,
          quadX / scale, quadY / scale, 1 / scale);
        return true;
      }
    }
    return false;
  }

  _key(z, x, y) {
    return `${z}/${x}/${y}`;
  }

  /**
   * Returns true if an imagery tile spatially overlaps any layer's bounds.
   */
  overlapsAnyLayer(z, x, y) {
    const s = 1 / (1 << z);
    const tMinX = x * s, tMaxX = (x + 1) * s;
    const tMinY = y * s, tMaxY = (y + 1) * s;
    for (const layer of this.layers) {
      const b = layer.imageryManager.bounds;
      if (!b) return true;
      if (tMaxX >= b.minX && tMinX <= b.maxX && tMaxY >= b.minY && tMinY <= b.maxY) {
        return true;
      }
    }
    return false;
  }

  /**
   * Ensure a GPU texture exists for this imagery tile. Idempotent.
   * Requests satellite tiles from each layer and composites what's available.
   */
  ensureImageryTile(iz, ix, iy) {
    const key = this._key(iz, ix, iy);
    const existing = this.entries.get(key);
    if (existing) {
      existing.lastUsed = performance.now();
      return;
    }

    const texture = this.device.createTexture({
      size: [CANVAS_SIZE, CANVAS_SIZE],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: texture.createView() },
        { binding: 1, resource: this.sampler },
      ],
    });

    // For each layer, determine which satellite tile covers this imagery tile
    const layerData = this.layers.map((layer) => {
      const layerZoom = Math.min(iz, layer.maxzoom);
      const d = iz - layerZoom;
      const satX = ix >> d;
      const satY = iy >> d;
      return { satZ: layerZoom, satX, satY, d, imageryManager: layer.imageryManager };
    });

    const entry = {
      texture, bindGroup, layerData,
      iz, ix, iy,
      // Canvas created lazily — skipped for single-layer direct upload
      canvas: null, ctx: null,
      hasContent: false,
      lastUsed: performance.now(),
    };
    this.entries.set(key, entry);

    // Seed the texture with the best placeholder available before any
    // network round-trip. Ancestor blit produces a smoothly upsampled view
    // of the parent imagery in the right spatial location; the gray fill
    // is a fallback when the cache has no ancestor (cold start). Either
    // way the tile renders as something visually coherent immediately,
    // instead of falling through the renderer's "no imagery" branch which
    // — combined with hillshade and atmosphere — produced the near-black
    // tiles reported on mobile. Real bitmap data overwrites the placeholder
    // via _recomposite.
    if (!this._blitFromAncestorEntry(entry)) {
      this._clearTextureToGray(texture);
    }
    entry.hasContent = true;

    // Request satellite tiles from each layer
    for (const ld of layerData) {
      ld.imageryManager.requestTile(ld.satZ, ld.satX, ld.satY, key);
    }

    // Composite what's available now (overwrites the placeholder if any
    // bitmap or bitmap-level ancestor has already loaded).
    this._recomposite(entry);
  }

  hasImagery(iz, ix, iy) {
    const entry = this.entries.get(this._key(iz, ix, iy));
    return entry ? entry.hasContent : false;
  }

  getBindGroup(iz, ix, iy) {
    const entry = this.entries.get(this._key(iz, ix, iy));
    return entry ? entry.bindGroup : null;
  }

  /**
   * Called when an imagery manager finishes loading a satellite tile.
   */
  _onSatelliteTileLoaded(layer, sz, sx, sy) {
    const consumers = layer.imageryManager.getConsumers(sz, sx, sy);
    if (!consumers) return;

    for (const imageryKey of consumers) {
      const entry = this.entries.get(imageryKey);
      if (!entry) continue;
      this._recomposite(entry);
    }

    if (this.onUpdate) this.onUpdate();
  }

  /**
   * Composite all layers for an imagery tile entry. Handles three cases:
   * 1. Single layer, 1:1 zoom: direct GPU upload from ImageBitmap
   * 2. Single layer, scaled: canvas sub-region draw + upload
   * 3. Multi-layer: canvas compositing + upload
   */
  _recomposite(entry) {
    const { iz, ix, iy } = entry;
    const singleLayer = this.layers.length === 1;
    const ld0 = entry.layerData[0];

    // Fast path: single layer with 1:1 satellite tile mapping and matching size
    if (singleLayer && ld0.d === 0) {
      const bitmap = ld0.imageryManager.getBitmap(ld0.satZ, ld0.satX, ld0.satY);
      if (bitmap && bitmap.width === CANVAS_SIZE && bitmap.height === CANVAS_SIZE) {
        this.device.queue.copyExternalImageToTexture(
          { source: bitmap },
          { texture: entry.texture },
          [CANVAS_SIZE, CANVAS_SIZE],
        );
        entry.hasContent = true;
        return;
      }
      // Fall through to canvas path for size mismatch or missing bitmap
    }

    // Canvas path: create canvas lazily
    if (!entry.canvas) {
      entry.canvas = new OffscreenCanvas(CANVAS_SIZE, CANVAS_SIZE);
      entry.ctx = entry.canvas.getContext('2d');
    }
    const { ctx } = entry;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    let hasAny = false;

    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      const ld = entry.layerData[i];
      ctx.globalCompositeOperation = layer.blend || 'source-over';
      ctx.globalAlpha = layer.opacity != null ? layer.opacity : 1;

      // Try exact satellite tile first, then walk up ancestors for progressive fill
      if (this._drawBitmapOrAncestor(ctx, ld.imageryManager, ld.satZ, ld.satX, ld.satY, iz, ix, iy)) {
        hasAny = true;
      }
    }

    // Reset composite state
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    if (hasAny) {
      this._upload(entry);
      entry.hasContent = true;
    }
  }

  /**
   * Draw a satellite bitmap (or nearest ancestor) for a layer onto the canvas.
   * The target imagery tile at (iz, ix, iy) might need a sub-region of an
   * ancestor bitmap if the exact tile isn't loaded yet.
   *
   * @returns {boolean} true if something was drawn
   */
  _drawBitmapOrAncestor(ctx, imageryManager, satZ, satX, satY, iz, ix, iy) {
    // Walk from the target satellite zoom up to find a loaded bitmap.
    // At each step, compute the sub-region of the ancestor that covers
    // this imagery tile.
    const minZ = imageryManager.bounds ? imageryManager.bounds.minZoom : 0;
    for (let z = satZ; z >= minZ; z--) {
      const d = satZ - z;
      const bx = satX >> d;
      const by = satY >> d;
      const bitmap = imageryManager.getBitmap(z, bx, by);
      if (!bitmap) continue;

      // How many zoom levels the bitmap is above the imagery tile
      const totalD = iz - z;

      if (totalD === 0) {
        // 1:1 mapping: draw full bitmap
        ctx.drawImage(bitmap, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      } else {
        // Draw sub-region of ancestor bitmap scaled to fill canvas
        const scale = 1 << totalD;
        const px = ix & (scale - 1);
        const py = iy & (scale - 1);
        const sw = bitmap.width / scale;
        const sh = bitmap.height / scale;
        ctx.drawImage(bitmap, px * sw, py * sh, sw, sh, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      }
      return true;
    }
    return false;
  }

  _upload(entry) {
    this.device.queue.copyExternalImageToTexture(
      { source: entry.canvas },
      { texture: entry.texture },
      [CANVAS_SIZE, CANVAS_SIZE],
    );
    // Release the canvas after upload — _recomposite recreates lazily.
    // Saves ~1 MB per imagery tile that took the canvas path.
    entry.canvas = null;
    entry.ctx = null;
  }

  /**
   * Release entries not in the active set.
   * @param {Set<string>} activeKeys - imagery tile keys to keep
   */
  gc(activeKeys) {
    for (const [key, entry] of this.entries) {
      if (activeKeys && activeKeys.has(key)) continue;
      entry.texture.destroy();
      for (const ld of entry.layerData) {
        ld.imageryManager.removeConsumer(key);
      }
      this.entries.delete(key);
    }
  }
}
