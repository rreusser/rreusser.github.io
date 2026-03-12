// Per-imagery-tile GPU texture cache
//
// Manages composited GPU textures keyed by imagery tile coordinates.
// Each imagery tile gets a 512x512 canvas compositing all base layers,
// then uploaded to a GPU texture. For single-layer 1:1 cases, uploads
// the ImageBitmap directly without canvas compositing.

const CANVAS_SIZE = 512;

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

    for (const layer of layers) {
      layer.imageryManager.onTileLoaded = (sz, sx, sy) => this._onSatelliteTileLoaded(layer, sz, sx, sy);
    }
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

    // Request satellite tiles from each layer
    for (const ld of layerData) {
      ld.imageryManager.requestTile(ld.satZ, ld.satX, ld.satY, key);
    }

    // Composite what's available now
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
