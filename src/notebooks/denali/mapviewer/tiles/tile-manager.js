import { buildElevationQuadtree } from '../interaction/elevation-quadtree.ts';

// Async tile loading, LRU cache, GPU texture management

const MAX_CACHE = 150;
const MAX_CONCURRENT = 8;

const decodeCanvas514 = new OffscreenCanvas(514, 514);
const decodeCtx514 = decodeCanvas514.getContext('2d', { willReadFrequently: true });

const decodeCanvas512 = new OffscreenCanvas(512, 512);
const decodeCtx512 = decodeCanvas512.getContext('2d', { willReadFrequently: true });

// Mapbox Terrain-RGB: tiles are 514x514 (512 + 1px border on each side)
function decodeTerrainRGB(bitmap) {
  decodeCtx514.drawImage(bitmap, 0, 0);
  const { data } = decodeCtx514.getImageData(0, 0, 514, 514);
  const elevations = new Float32Array(514 * 514);
  let minElevation = Infinity;
  let maxElevation = -Infinity;
  for (let i = 0; i < 514 * 514; i++) {
    const j = i * 4;
    const elev = -10000 + (data[j] * 65536 + data[j + 1] * 256 + data[j + 2]) * 0.1;
    elevations[i] = elev;
    if (elev < minElevation) minElevation = elev;
    if (elev > maxElevation) maxElevation = elev;
  }
  return { elevations, minElevation, maxElevation };
}

// Terrarium: tiles are 512x512 with no border. Decode and extrapolate to 514x514.
function decodeTerrarium(bitmap) {
  decodeCtx512.drawImage(bitmap, 0, 0);
  const { data } = decodeCtx512.getImageData(0, 0, 512, 512);
  const elevations = new Float32Array(514 * 514);
  let minElevation = Infinity;
  let maxElevation = -Infinity;

  // Fill inner 512x512 (rows 1..512, cols 1..512 in 514x514 space)
  for (let row = 0; row < 512; row++) {
    for (let col = 0; col < 512; col++) {
      const si = (row * 512 + col) * 4;
      const elev = (data[si] * 256 + data[si + 1] + data[si + 2] / 256) - 32768;
      elevations[(row + 1) * 514 + (col + 1)] = elev;
      if (elev < minElevation) minElevation = elev;
      if (elev > maxElevation) maxElevation = elev;
    }
  }

  // Extrapolate left column (col=0, rows 1..512) — must come before top/bottom rows
  for (let row = 1; row <= 512; row++) {
    elevations[row * 514] = 2 * elevations[row * 514 + 1] - elevations[row * 514 + 2];
  }
  // Extrapolate right column (col=513, rows 1..512)
  for (let row = 1; row <= 512; row++) {
    elevations[row * 514 + 513] = 2 * elevations[row * 514 + 512] - elevations[row * 514 + 511];
  }
  // Extrapolate top row (row=0, all cols including corners)
  for (let col = 0; col < 514; col++) {
    elevations[col] = 2 * elevations[514 + col] - elevations[514 * 2 + col];
  }
  // Extrapolate bottom row (row=513, all cols including corners)
  for (let col = 0; col < 514; col++) {
    elevations[513 * 514 + col] = 2 * elevations[512 * 514 + col] - elevations[511 * 514 + col];
  }

  return { elevations, minElevation, maxElevation };
}

export class TileManager {
  constructor(device, { tileUrl, encoding = 'terrain-rgb', workerPool = null } = {}) {
    this.device = device;
    this.tileUrl = tileUrl || ((z, x, y) => `tiles/${z}/${x}/${y}.webp`);
    this._encoding = encoding;
    this._decode = encoding === 'terrarium' ? decodeTerrarium : decodeTerrainRGB;
    this._workerPool = workerPool;
    this.cache = new Map(); // key -> { texture, bindGroup, lastUsed }
    this.pending = new Map(); // key -> AbortController
    this.failed = new Set(); // keys that 404'd (tile doesn't exist)
    this.activeRequests = 0;
    this.requestQueue = [];
    this.bindGroupLayout = null; // set by main.js
    this.onTileResolved = null; // callback when a tile is loaded or 404s
    this.onTileEvicted = null;  // callback when a tile is removed from cache
    this.wantedKeys = new Set();
    this.bounds = null;
    this.aabbCache = new Map(); // key -> { minElevation, maxElevation } — persists across GPU eviction
    // Camera-distance prioritization for the request queue. Set once per
    // coverage pass; null disables sorting (pure FIFO). Coordinates are
    // mercator world (X=east, Y=up, Z=south); tile centers use Y=0.
    this._cameraPos = null;
  }

  // Called by selectImageryTiles each coverage pass so the request queue
  // can prefer tiles whose centers are closest to the camera. Best-effort:
  // if multiple tiles tie or the camera is far above, FIFO ordering wins.
  setCameraPos(eyeX, eyeY, eyeZ) {
    this._cameraPos = [eyeX, eyeY, eyeZ];
  }

  getElevationBounds(z, x, y) {
    // Walk up the ancestor chain. A parent's elevation bounds contain
    // all its children, so inherited bounds are always conservative.
    let tz = z, tx = x, ty = y;
    while (tz >= 0) {
      const bounds = this.aabbCache.get(this._key(tz, tx, ty));
      if (bounds) return bounds;
      tz--;
      tx >>= 1;
      ty >>= 1;
    }
    return null;
  }

  setBounds(bounds) {
    this.bounds = bounds;
  }

  setBindGroupLayout(layout, fallbackShadingTexture, shadingSampler) {
    this.bindGroupLayout = layout;
    this._fallbackShadingView = fallbackShadingTexture.createView();
    this._shadingSampler = shadingSampler;
    this._flatTileTexture = null;
    this._flatTileBindGroup = null;
    this._flatTileElevations = null;
  }

  // Build a per-tile bind group from elevation texture + (optional)
  // baked shading texture. Falls back to the shared fallback shading
  // view if no shading is provided.
  _createTileBindGroup(elevTexture, shadingView) {
    return this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: elevTexture.createView() },
        { binding: 1, resource: shadingView || this._fallbackShadingView },
        { binding: 2, resource: this._shadingSampler },
      ],
    });
  }

  // Called by LightingManager when a tile's shading texture is ready.
  // Recreates the per-tile bind group with the new shading view; the
  // elevation texture stays the same.
  attachShading(z, x, y, shadingView) {
    const entry = this.cache.get(this._key(z, x, y));
    if (!entry || entry.isFlat) return;
    entry.shadingView = shadingView;
    entry.bindGroup = this._createTileBindGroup(entry.texture, shadingView);
  }

  // Shared zero-elevation tile resources, created lazily
  _ensureFlatTile() {
    if (this._flatTileTexture) return;
    this._flatTileElevations = new Float32Array(514 * 514);
    this._flatTileTexture = this.device.createTexture({
      size: [514, 514],
      format: 'r32float',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    const bytesPerRow = 2304;
    this.device.queue.writeTexture(
      { texture: this._flatTileTexture },
      new Uint8Array(bytesPerRow * 514),
      { bytesPerRow },
      [514, 514]
    );
    this._flatTileBindGroup = this._createTileBindGroup(this._flatTileTexture, null);
  }

  _cacheFlatTile(key) {
    this._ensureFlatTile();
    // Don't set aabbCache — unknown bounds should fall back to the
    // conservative maximum so the tile isn't incorrectly frustum-culled
    // (its children may contain real terrain with significant elevation).
    this.cache.set(key, {
      texture: this._flatTileTexture,
      bindGroup: this._flatTileBindGroup,
      elevations: this._flatTileElevations,
      quadtree: null,
      minElevation: 0,
      maxElevation: 0,
      lastUsed: performance.now(),
      isFlat: true,
    });
  }

  _key(z, x, y) {
    return `${z}/${x}/${y}`;
  }

  hasTile(z, x, y) {
    const key = this._key(z, x, y);
    this.wantedKeys.add(key);
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastUsed = performance.now();
      return true;
    }
    return false;
  }

  // Tile is resolved: either loaded or known to not exist (404)
  isResolved(z, x, y) {
    const key = this._key(z, x, y);
    this.wantedKeys.add(key);
    return this.cache.has(key) || this.failed.has(key);
  }

  // Tile 404'd (doesn't exist on the server). The flat cache
  // entry may have been LRU-evicted, but the failed set persists.
  isFailed(z, x, y) {
    return this.failed.has(this._key(z, x, y));
  }

  getTile(z, x, y) {
    const key = this._key(z, x, y);
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastUsed = performance.now();
      return entry;
    }
    return null;
  }

  requestTile(z, x, y) {
    const key = this._key(z, x, y);
    this.wantedKeys.add(key);
    if (this.cache.has(key) || this.pending.has(key) || this.failed.has(key)) return;

    if (this.bounds && this._isOutOfBounds(z, x, y)) {
      this.failed.add(key);
      return;
    }

    this.requestQueue.push({ z, x, y, key });
    this._processQueue();
  }

  _isOutOfBounds(z, x, y) {
    const b = this.bounds;
    if (z < b.minZoom || z > b.maxZoom) return true;
    const s = 1 / (1 << z);
    const tileMinX = x * s;
    const tileMaxX = (x + 1) * s;
    const tileMinY = y * s;
    const tileMaxY = (y + 1) * s;
    if (tileMaxX < b.minX || tileMinX > b.maxX ||
        tileMaxY < b.minY || tileMinY > b.maxY) return true;
    return false;
  }

  _processQueue() {
    while (this.activeRequests < MAX_CONCURRENT && this.requestQueue.length > 0) {
      // Pick the queued tile whose center is closest to the camera. With
      // no camera position set, _pickNextIndex returns 0 (FIFO).
      const idx = this._pickNextIndex();
      const { z, x, y, key } = this.requestQueue.splice(idx, 1)[0];
      if (this.cache.has(key) || this.pending.has(key) || this.failed.has(key)) continue;

      this.activeRequests++;
      const controller = new AbortController();
      this.pending.set(key, controller);
      const promise = this._loadTile(z, x, y, key, controller.signal);
      promise.finally(() => {
        this.pending.delete(key);
        this.activeRequests--;
        this._processQueue();
      });
    }
  }

  _pickNextIndex() {
    const cam = this._cameraPos;
    if (!cam) return 0;
    const cx = cam[0], cy = cam[1], cz = cam[2];
    let bestIdx = 0;
    let bestDist = this._tileDistSq(this.requestQueue[0], cx, cy, cz);
    for (let i = 1; i < this.requestQueue.length; i++) {
      const d = this._tileDistSq(this.requestQueue[i], cx, cy, cz);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    return bestIdx;
  }

  _tileDistSq({ z, x, y }, cx, cy, cz) {
    const s = 1 / (1 << z);
    const tileCx = (x + 0.5) * s;
    const tileCz = (y + 0.5) * s;
    const dx = tileCx - cx;
    const dy = cy; // tile center sits at world Y = 0; cam Y is altitude
    const dz = tileCz - cz;
    return dx * dx + dy * dy + dz * dz;
  }

  async _loadTile(z, x, y, key, signal) {
    try {
      const url = this.tileUrl(z, x, y);
      const response = await fetch(url, { signal });
      if (!response.ok) {
        this.failed.add(key);
        this._cacheFlatTile(key);
        if (this.onTileResolved) this.onTileResolved(z, x, y);
        return;
      }
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none' });

      let elevations, minElevation, maxElevation, paddedData;

      if (this._workerPool) {
        // Extract pixel data on main thread, decode on worker
        const w = bitmap.width;
        const h = bitmap.height;
        const canvas = new OffscreenCanvas(w, h);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0);
        const imageData = ctx.getImageData(0, 0, w, h);
        bitmap.close();

        const result = await this._workerPool.submit(
          'decode-' + this._encoding,
          { pixels: imageData.data, width: w, height: h },
          { priority: z, transfer: [imageData.data.buffer], signal },
        );

        elevations = result.elevations;
        minElevation = result.minElevation;
        maxElevation = result.maxElevation;
        paddedData = result.paddedData;
      } else {
        // Fallback: main-thread decode
        ({ elevations, minElevation, maxElevation } = this._decode(bitmap));
        bitmap.close();

        // Row-pad for GPU upload (256-byte aligned rows)
        const bytesPerRow = 2304;
        paddedData = new Uint8Array(bytesPerRow * 514);
        const srcBytes = new Uint8Array(elevations.buffer);
        for (let row = 0; row < 514; row++) {
          paddedData.set(
            srcBytes.subarray(row * 514 * 4, (row + 1) * 514 * 4),
            row * bytesPerRow,
          );
        }
      }

      // Store AABB before abort check so even aborted tiles contribute bounds
      this.aabbCache.set(key, { minElevation, maxElevation });

      // If aborted while decoding, discard
      if (signal.aborted) return;

      // Create r32float texture and upload
      const bytesPerRow = 2304;
      const texture = this.device.createTexture({
        size: [514, 514],
        format: 'r32float',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
      });
      this.device.queue.writeTexture(
        { texture },
        paddedData,
        { bytesPerRow },
        [514, 514],
      );

      const bindGroup = this._createTileBindGroup(texture, null);

      this.cache.set(key, {
        texture,
        bindGroup,
        shadingView: null,
        elevations,
        quadtree: null,
        minElevation,
        maxElevation,
        lastUsed: performance.now(),
      });

      if (this.onTileResolved) this.onTileResolved(z, x, y);
    } catch (e) {
      if (e.name === 'AbortError') return;
      this.failed.add(key);
      this._cacheFlatTile(key);
      if (this.onTileResolved) this.onTileResolved(z, x, y);
    }
  }

  getFlatTileEntry() {
    this._ensureFlatTile();
    return {
      texture: this._flatTileTexture,
      bindGroup: this._flatTileBindGroup,
      elevations: this._flatTileElevations,
      quadtree: null,
      minElevation: 0,
      maxElevation: 0,
      lastUsed: performance.now(),
      isFlat: true,
    };
  }

  ensureQuadtree(z, x, y) {
    const entry = this.cache.get(this._key(z, x, y));
    if (!entry) return null;
    if (!entry.quadtree) {
      entry.quadtree = buildElevationQuadtree(entry.elevations);
    }
    return entry;
  }

  // Drop the elevation quadtree from tiles not in the render list.
  // Quadtrees (2.7 MB each) are rebuilt cheaply from `entry.elevations`
  // by ensureQuadtree if the tile cycles back into raycast use, so this
  // is purely an upper-bound CPU cost. Elevations are kept — stripping
  // them breaks raycasting on tiles that re-enter the render list, and
  // recovery would require a re-fetch.
  stripChainCpuData(renderedKeys) {
    for (const [key, entry] of this.cache) {
      if (entry.isFlat) continue;
      if (renderedKeys.has(key)) continue;
      if (entry.quadtree) entry.quadtree = null;
    }
  }

  // Abort pending fetches for tiles not requested by the latest selectTiles
  cancelStale() {
    for (const [key, controller] of this.pending) {
      if (!this.wantedKeys.has(key)) {
        controller.abort();
      }
    }
  }

  evict() {
    // Count only non-flat tiles toward the cache limit. Flat tiles share a
    // single GPU texture and are essentially free — evicting them causes
    // tiles at maxTerrainZoom to disappear with no recovery path.
    let realCount = 0;
    for (const entry of this.cache.values()) {
      if (!entry.isFlat) realCount++;
    }
    while (realCount > MAX_CACHE) {
      let oldestKey = null, oldestTime = Infinity;
      for (const [key, entry] of this.cache) {
        if (this.wantedKeys.has(key)) continue;
        if (entry.isFlat) continue;
        if (entry.lastUsed < oldestTime) {
          oldestTime = entry.lastUsed;
          oldestKey = key;
        }
      }
      if (!oldestKey) break; // all remaining tiles are wanted
      const entry = this.cache.get(oldestKey);
      entry.texture.destroy();
      this.cache.delete(oldestKey);
      realCount--;
      if (this.onTileEvicted) {
        const [zStr, xStr, yStr] = oldestKey.split('/');
        this.onTileEvicted(+zStr, +xStr, +yStr);
      }
    }
  }

  // Clear stale requests at the start of a coverage recomputation
  beginFrame() {
    this.requestQueue = [];
    this.wantedKeys = new Set();
  }
}
