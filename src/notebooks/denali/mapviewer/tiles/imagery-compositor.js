// Per-terrain-tile imagery texture compositing
//
// For each terrain tile, maintains an OffscreenCanvas where satellite tile
// bitmaps are drawn at the correct position/scale, then uploaded to a GPU texture.
// Supports multiple base layers with configurable blend modes.

import { computeImageryMapping, getRequiredImageryTiles, getImageryZoom } from './tile-math.js';

const CANVAS_SIZE = 512;
const MIN_TERRAIN_ZOOM = 4;

export class ImageryCompositor {
  /**
   * @param {GPUDevice} device
   * @param {Array<{imageryManager, blend, opacity, maxzoom}>} layers - base layer descriptors
   * @param {GPUBindGroupLayout} bindGroupLayout - layout for imagery texture + sampler
   * @param {GPUSampler} sampler - linear filtering sampler for imagery
   */
  constructor(device, layers, bindGroupLayout, sampler) {
    this.device = device;
    this.layers = layers;
    this.bindGroupLayout = bindGroupLayout;
    this.sampler = sampler;
    this.entries = new Map(); // terrainKey -> entry
    this.onUpdate = null;     // callback() when any imagery texture is updated

    for (const layer of layers) {
      layer.imageryManager.onTileLoaded = (sz, sx, sy) => this._onSatelliteTileLoaded(layer, sz, sx, sy);
    }
  }

  _terrainKey(z, x, y) {
    return `${z}/${x}/${y}`;
  }

  /**
   * Ensure imagery is set up for a terrain tile. Idempotent — safe to call every frame.
   * Requests required satellite tiles and composites any that are already fetched.
   */
  ensureImagery(tz, tx, ty, imageryZoom) {
    const key = this._terrainKey(tz, tx, ty);

    const existing = this.entries.get(key);
    if (existing) {
      existing.lastUsed = performance.now();
      return;
    }

    const canvas = new OffscreenCanvas(CANVAS_SIZE, CANVAS_SIZE);
    const ctx = canvas.getContext('2d');

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

    // Per-layer satellite tile tracking
    const layerData = this.layers.map((layer) => {
      const iz = Math.min(imageryZoom, layer.maxzoom);
      const satTiles = getRequiredImageryTiles(tz, tx, ty, iz);
      return { satTiles, imageryManager: layer.imageryManager };
    });

    const entry = {
      canvas, ctx, texture, bindGroup,
      layerData,
      tz, tx, ty,
      needsUpload: false,
      hasContent: false,
      lastUsed: performance.now(),
    };
    this.entries.set(key, entry);

    // Request all required satellite tiles for each layer
    for (const ld of layerData) {
      for (const sat of ld.satTiles) {
        ld.imageryManager.requestTile(sat.z, sat.x, sat.y, key);
      }
    }

    // Composite: draws ancestor as base, then any already-loaded tiles on top
    this._recomposite(entry);

    if (entry.needsUpload) {
      this._upload(entry);
    }
  }

  /**
   * Get the imagery bind group for a terrain tile, or null if not yet set up.
   */
  getBindGroup(tz, tx, ty) {
    const entry = this.entries.get(this._terrainKey(tz, tx, ty));
    return entry ? entry.bindGroup : null;
  }

  /**
   * Returns true if any satellite imagery has been composited for this terrain tile.
   */
  hasImagery(tz, tx, ty) {
    const entry = this.entries.get(this._terrainKey(tz, tx, ty));
    return entry ? entry.hasContent : false;
  }

  /**
   * Returns true if a terrain tile spatially overlaps any imagery layer's bounds.
   * Tiles outside all imagery coverage should not block terrain subdivision.
   */
  overlapsAnyLayer(tz, tx, ty) {
    const s = 1 / (1 << tz);
    const tMinX = tx * s, tMaxX = (tx + 1) * s;
    const tMinY = ty * s, tMaxY = (ty + 1) * s;
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
   * Release entries for terrain tiles not in the active set.
   * @param {Set<string>} activeKeys - tile keys to keep (e.g. tileManager.wantedKeys)
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

  /**
   * Release imagery resources for a terrain tile.
   */
  release(tz, tx, ty) {
    const key = this._terrainKey(tz, tx, ty);
    const entry = this.entries.get(key);
    if (!entry) return;

    entry.texture.destroy();
    for (const ld of entry.layerData) {
      ld.imageryManager.removeConsumer(key);
    }
    this.entries.delete(key);
  }

  /**
   * Called when an imagery manager finishes loading a satellite tile.
   * Recomposites all affected terrain tile canvases and uploads.
   */
  _onSatelliteTileLoaded(layer, sz, sx, sy) {
    const consumers = layer.imageryManager.getConsumers(sz, sx, sy);
    if (!consumers) return;

    for (const terrainKey of consumers) {
      const entry = this.entries.get(terrainKey);
      if (!entry) continue;

      this._recomposite(entry);
      this._upload(entry);
    }

    if (this.onUpdate) this.onUpdate();
  }

  /**
   * Clear and redraw all layers in order for a terrain tile entry.
   * Draws ancestor imagery first as a base so tiles don't flash blank while loading.
   */
  _recomposite(entry) {
    const { ctx } = entry;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw ancestor imagery as base — will be progressively covered by actual tiles
    this._fillFromAncestor(entry);
    let hasAny = entry.hasContent;

    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      const ld = entry.layerData[i];
      ctx.globalCompositeOperation = layer.blend || 'source-over';
      ctx.globalAlpha = layer.opacity != null ? layer.opacity : 1;

      for (const sat of ld.satTiles) {
        const bitmap = ld.imageryManager.getBitmap(sat.z, sat.x, sat.y);
        if (!bitmap) continue;
        hasAny = true;
        const mapping = computeImageryMapping(entry.tz, entry.tx, entry.ty, sat.z, sat.x, sat.y);
        ctx.drawImage(
          bitmap,
          mapping.offsetU * CANVAS_SIZE,
          mapping.offsetV * CANVAS_SIZE,
          mapping.scaleU * CANVAS_SIZE,
          mapping.scaleV * CANVAS_SIZE,
        );
      }
    }

    // Reset composite state
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    if (hasAny) {
      entry.needsUpload = true;
      entry.hasContent = true;
    }
  }

  /**
   * Fill a new terrain tile's canvas with imagery from the nearest ancestor that has content.
   */
  _fillFromAncestor(entry) {
    const { tz, tx, ty, ctx } = entry;
    for (let dz = 1; dz <= tz - MIN_TERRAIN_ZOOM; dz++) {
      const pz = tz - dz;
      const px = tx >> dz;
      const py = ty >> dz;
      const parentEntry = this.entries.get(this._terrainKey(pz, px, py));
      if (parentEntry && parentEntry.hasContent) {
        const mapping = computeImageryMapping(tz, tx, ty, pz, px, py);
        ctx.drawImage(
          parentEntry.canvas,
          mapping.offsetU * CANVAS_SIZE,
          mapping.offsetV * CANVAS_SIZE,
          mapping.scaleU * CANVAS_SIZE,
          mapping.scaleV * CANVAS_SIZE,
        );
        entry.needsUpload = true;
        entry.hasContent = true;
        return;
      }
    }
  }

  /**
   * Upload the compositing canvas to the GPU texture.
   */
  _upload(entry) {
    this.device.queue.copyExternalImageToTexture(
      { source: entry.canvas },
      { texture: entry.texture },
      [CANVAS_SIZE, CANVAS_SIZE],
    );
    entry.needsUpload = false;
  }
}
