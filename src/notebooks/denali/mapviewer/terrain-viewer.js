import { EventEmitter } from './core/event-emitter.ts';
import { GPUContext } from './rendering/gpu-context.ts';
import { SkyRenderer } from './rendering/sky-renderer.ts';
import { TerrainRenderer } from './rendering/terrain-renderer.ts';
import { LayerManager } from './layers/layer-manager.ts';
import { createCameraController } from './camera/camera-controller.js';
import { tilesetToMercatorBounds, tileUrlFromTemplate, lonToMercatorX, latToMercatorY } from './tiles/tile-math.js';
import { invertMat4 } from './math/mat4.ts';
import { selectTiles, selectImageryTiles, screenDensity, terrainScreenDensity, extractEyePosition, debugTile, debugSelectTiles } from './tiles/tile-coverage.js';
import { TileManager } from './tiles/tile-manager.js';
import { ImageryManager } from './tiles/imagery-manager.ts';
import { ImageryTileCache } from './tiles/imagery-tile-cache.js';
import BVH from './interaction/bvh.ts';
import { screenToRay, raycastTerrain } from './interaction/raycast.js';
import { createSettings, createAttribution, estimateTreeline } from './settings.ts';
import { cameraStateToHash, hashToCameraState } from './camera/hash-state.ts';
import { FrustumOverlay } from './debug/frustum-overlay.js';
import { CollisionManager } from './interaction/collision-manager.js';
import { WorkerPool } from './workers/worker-pool.ts';

export class TerrainMap extends EventEmitter {
  /**
   * Create a TerrainMap instance. Use the async factory `TerrainMap.create()`.
   *
   * @param {HTMLCanvasElement} canvas
   * @param {Object} options
   * @param {Object} options.sources - Named source definitions
   * @param {Array}  [options.base] - Base layer configs (raster composited onto terrain)
   * @param {Array}  [options.features] - Feature layer configs (drawn after terrain)
   * @param {Object} [options.camera] - Camera controller options
   * @param {Object} [options.location] - { lat, lon } for sun position (defaults to terrain bounds center)
   * @param {Object} [options.settings] - Initial settings values
   * @param {number} [options.pixelRatio] - Device pixel ratio override
   */
  static async create(canvas, options = {}) {
    const map = new TerrainMap();
    await map._init(canvas, options);
    return map;
  }

  // --- Public getters ---

  /** Geographic location used for sun position calculations. */
  get location() {
    return this._location;
  }

  /** Camera bearing in degrees (0 = north, 90 = east). */
  get bearing() {
    return 90 - this.camera.state.phi * 180 / Math.PI;
  }

  set bearing(deg) {
    this.camera.state.phi = (90 - deg) * Math.PI / 180;
    this.triggerRedraw();
  }

  /** Camera pitch (tilt) in degrees. */
  get pitch() {
    return this.camera.state.theta * 180 / Math.PI;
  }

  /** Camera field of view in degrees. */
  get fov() {
    return this.camera.state.fov * 180 / Math.PI;
  }

  set fov(deg) {
    this.camera.state.fov = deg * Math.PI / 180;
    this.triggerRedraw();
  }

  /** Mark the view as needing a redraw on the next frame. */
  triggerRedraw() {
    this.camera.taint();
  }

  /**
   * Force an immediate paint and emit 'render' when complete.
   */
  repaint() {
    this.paint();
    this.emit('render');
  }

  /**
   * Capture the current frame as a data URL. Forces an immediate repaint
   * and captures synchronously before the browser composites.
   */
  captureFrame(mimeType = 'image/png') {
    return new Promise(resolve => {
      this.once('render', () => {
        resolve(this.canvas.toDataURL(mimeType));
      });
      this.repaint();
    });
  }

  // --- Layer API (delegates to LayerManager) ---

  getLayers() {
    return this._layerManager.getLayers();
  }

  getLayer(id) {
    return this._layerManager.getLayer(id);
  }

  async addLineLayer(id, geojson, paint = {}) {
    const entry = await this._layerManager.addLineLayer(id, geojson, paint);
    this._refinementDirty = true;
    return entry;
  }

  removeLayer(id) {
    this._layerManager.removeLayer(id);
  }

  removeLineLayer(id) {
    this._layerManager.removeLineLayer(id);
  }

  setLayerVisibility(id, visible) {
    this._layerManager.setLayerVisibility(id, visible);
  }

  setLineLayerColor(id, hex) {
    this._layerManager.setLineLayerColor(id, hex);
  }

  setLayerPaint(id, property, value) {
    this._layerManager.setLayerPaint(id, property, value);
  }

  getLayerElevationProfile(id) {
    return this._layerManager.getLayerElevationProfile(id);
  }

  getLayerGeoJSON(id) {
    return this._layerManager.getLayerGeoJSON(id);
  }

  async _init(canvas, options) {
    const { sources = {}, base: baseLayers = [], features: featureLayers = [], camera: cameraOptions = {}, settings: initialSettings, createGPULines } = options;

    // Find the terrain source (exactly one required)
    let terrain = null;
    const rasterSources = {};
    const geojsonSources = {};
    const allSources = [];
    for (const [id, src] of Object.entries(sources)) {
      allSources.push(src);
      if (src.type === 'terrain') {
        if (terrain) throw new Error('Only one terrain source is allowed');
        terrain = src;
      } else if (src.type === 'raster') {
        rasterSources[id] = src;
      } else if (src.type === 'geojson') {
        geojsonSources[id] = src;
      }
    }
    if (!terrain) throw new Error('A terrain source is required');

    this._pixelRatio = options.pixelRatio || (typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1);
    this._baseLayerConfigs = baseLayers;
    this._featureLayerConfigs = featureLayers;
    this._geojsonSources = geojsonSources;
    this._rasterSources = rasterSources;

    this.canvas = canvas;
    this._terrainBounds = tilesetToMercatorBounds(terrain);
    this._maxTerrainZoom = terrain.maxzoom || 14;

    const [minLon, minLat, maxLon, maxLat] = terrain.bounds;
    this._location = options.location || {
      lat: (minLat + maxLat) / 2,
      lon: (minLon + maxLon) / 2,
    };

    this.attribution = createAttribution(allSources.filter(s => s.attribution));

    const treelineFt = Math.round(estimateTreeline(this._location.lat) * 3.28084);
    this.settings = createSettings({
      treelineLower: Math.max(0, treelineFt - 500),
      treelineUpper: treelineFt + 500,
      ...initialSettings,
    });

    // WebGPU initialization
    this._gpu = new GPUContext();
    await this._gpu.init(canvas);
    this._device = this._gpu.device;
    this._format = this._gpu.format;
    this._createGPULines = createGPULines;

    // Renderers
    this._sky = new SkyRenderer(this._gpu);
    this._renderer = new TerrainRenderer(this._gpu, this._sky);

    const hashCamera = hashToCameraState(window.location.hash);
    this.camera = createCameraController(canvas, {
      center: [0.0804792012701582, 0.0002040588543435183, 0.27264551318459634],
      distance: 0.0008177139017526437,
      phi: 2.1624270549994598,
      theta: 0.16047571910010502,
      fov: Math.PI / 4,
      rotateSpeed: 0.005,
      zoomSpeed: 0.0008,
      panSpeed: 1,
      ...cameraOptions,
      ...hashCamera,
    });
    this._hashUpdateTimer = null;

    const device = this._device;
    const format = this._format;
    const gpu = this._gpu;

    this._frustumOverlay = new FrustumOverlay(device, format, this._pixelRatio, createGPULines);
    this._collisionManager = new CollisionManager(device, format);
    this._collisionManager.onWake = () => { this._renderDirty = true; };

    this._workerPool = new WorkerPool(
      () => new Worker(new URL('./workers/tile-decode.worker.ts', import.meta.url), { type: 'module' }),
    );
    this._tileManager = new TileManager(device, { tileUrl: tileUrlFromTemplate(terrain.tiles), encoding: terrain.encoding || 'terrain-rgb', workerPool: this._workerPool });
    this._tileManager.setBindGroupLayout(gpu.textureBGL);
    this._tileManager.setBounds(this._terrainBounds);

    // Build base layers: each references a raster source
    const layerDescriptors = [];
    for (const layer of baseLayers) {
      const src = rasterSources[layer.source];
      if (!src) throw new Error(`Base layer "${layer.id}" references unknown source "${layer.source}"`);
      const bounds = tilesetToMercatorBounds(src);
      const mgr = new ImageryManager({ tileUrl: tileUrlFromTemplate(src.tiles) });
      mgr.setBounds(bounds);
      layerDescriptors.push({
        imageryManager: mgr,
        blend: layer.blend || 'source-over',
        opacity: layer.opacity != null ? layer.opacity : 1,
        minzoom: src.minzoom,
        maxzoom: src.maxzoom,
      });
    }
    this._minImageryZoom = layerDescriptors.length > 0 ? Math.min(...layerDescriptors.map(l => l.minzoom)) : Infinity;
    this._maxImageryZoom = layerDescriptors.length > 0 ? Math.max(...layerDescriptors.map(l => l.maxzoom)) : 0;
    this._imageryTileCache = new ImageryTileCache(device, layerDescriptors, gpu.imageryBGL, gpu.imagerySampler);

    this._coverageDirty = true;
    this._renderDirty = true;
    this._cachedRenderList = [];

    this._MAX_ELEV_Y = 0.001;

    this._currentExaggeration = this.settings.verticalExaggeration;
    this._currentDensityThreshold = this.settings.densityThreshold;
    this._currentImageryDensityThreshold = this.settings.imageryDensityThreshold;
    this._currentFreezeCoverage = false;
    this._refinementDirty = false;
    this._lastRefinementTime = 0;

    // Raycast infrastructure
    this._bvh = null;
    this._bvhTileList = [];
    this._lastProjView = new Float64Array(16);
    this._invProjView = new Float64Array(16);

    this.camera.rotateStartCallback = (clientX, clientY) => this._hitTest(clientX, clientY);

    // Watch for container resizes so the canvas always tracks its layout size
    this._needsCanvasResize = true;
    this._resizeObserver = new ResizeObserver(() => {
      this._needsCanvasResize = true;
      this._renderDirty = true;
      this._coverageDirty = true;
      this.camera.taint();
    });
    this._resizeObserver.observe(canvas);

    // Layer management
    this._layerManager = new LayerManager({
      device,
      format,
      globalUniformBuffer: gpu.globalUniformBuffer,
      globalUniformBGL: gpu.globalUniformBGL,
      createGPULines,
      queryElevation: (mx, my) => this.queryElevationMercator(mx, my),
      onDirty: () => { this._renderDirty = true; },
    });
    await this._layerManager.initLayers(featureLayers, geojsonSources, options.font, options.simplifyFn);

    this._tileManager.onTileResolved = () => {
      this._coverageDirty = true;
      this._renderDirty = true;
      this._refinementDirty = true;
      this._collisionManager.markStale();
      this._layerManager.invalidateLineElevations();
    };
    this._imageryTileCache.onUpdate = () => { this._coverageDirty = true; this._renderDirty = true; };

    this._running = true;
    this._boundFrame = this._frame.bind(this);
    requestAnimationFrame(this._boundFrame);
  }

  _hitTest(clientX, clientY) {
    const hit = this.raycast(clientX, clientY);
    if (hit) return hit.worldPos;

    const rect = this.canvas.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = 1 - ((clientY - rect.top) / rect.height) * 2;
    invertMat4(this._invProjView, this._lastProjView);
    const { origin, direction } = screenToRay(ndcX, ndcY, this._invProjView);
    if (Math.abs(direction[1]) > 1e-10) {
      const t = -origin[1] / direction[1];
      if (t > 0) return [origin[0] + t * direction[0], 0, origin[2] + t * direction[2]];
    }
    return null;
  }

  paint() {
    this._renderer.paint({
      canvas: this.canvas,
      camera: this.camera,
      settings: this.settings,
      renderList: this._cachedRenderList,
      tileManager: this._tileManager,
      imageryTileCache: this._imageryTileCache,
      exaggeration: this._currentExaggeration,
      globalElevScale: this._globalElevScale,
      lineLayers: this._layerManager._lineLayers,
      circleLayers: this._layerManager._circleLayers,
      textLayers: this._layerManager._textLayers,
      frustumOverlay: this._frustumOverlay,
      collisionManager: this._collisionManager,
      pixelRatio: this._pixelRatio,
    });
  }

  _frame() {
    if (!this._running) return;
    requestAnimationFrame(this._boundFrame);

    const { canvas, camera, settings } = this;

    if (this._currentExaggeration !== settings.verticalExaggeration) {
      this._currentExaggeration = settings.verticalExaggeration;
      camera.taint();
    }

    if (this._currentDensityThreshold !== settings.densityThreshold) {
      this._currentDensityThreshold = settings.densityThreshold;
      this._coverageDirty = true;
    }

    if (this._currentImageryDensityThreshold !== settings.imageryDensityThreshold) {
      this._currentImageryDensityThreshold = settings.imageryDensityThreshold;
      this._coverageDirty = true;
    }

    if (settings.freezeCoverage !== this._currentFreezeCoverage) {
      this._currentFreezeCoverage = settings.freezeCoverage;
      if (!this._currentFreezeCoverage) {
        this._frustumOverlay.unfreeze();
        this._coverageDirty = true;
      }
      camera.taint();
      this._renderDirty = true;
    }

    if (settings.dirty) {
      this._renderDirty = true;
      settings.dirty = false;
    }

    // Debounced path refinement (at most once per second)
    if (this._refinementDirty) {
      const now = performance.now();
      if (now - this._lastRefinementTime > 1000) {
        this._layerManager.refineLineLayers();
        this._lastRefinementTime = now;
        this._refinementDirty = false;
        this._renderDirty = true;
        this.emit('elevationrefine');
      }
    }

    if (!this._coverageDirty && !this._renderDirty && !camera.dirty) return;

    // Apply pending canvas resize (detected by ResizeObserver, no per-frame reflow)
    if (this._needsCanvasResize) {
      const dpr = this._pixelRatio;
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      this._needsCanvasResize = false;
    }

    const aspect = canvas.width / canvas.height;

    const { view, projection, projectionView, dirty: cameraMoved } = camera.update(aspect);
    this._lastProjView.set(projectionView);

    // Use a single global elevation scale for all tiles and feature layers so
    // that everything scales consistently. Derived from the camera *eye*
    // position rather than the orbit center because zoom-about-cursor can jump
    // the orbit center far away while the eye stays nearly fixed, giving much
    // more stable LOD and elevation scaling.
    const { center, distance, theta, phi } = camera.state;
    const eyeMercatorZ = center[2] + distance * Math.cos(theta) * Math.sin(phi);
    const eyeLat = 2 * Math.atan(Math.exp(Math.PI * (1 - 2 * eyeMercatorZ))) - Math.PI / 2;
    this._globalElevScale = 1 / (40_075_016.686 * Math.cos(eyeLat));

    if (this._currentFreezeCoverage && !this._frustumOverlay.isFrozen) {
      this._frustumOverlay.freeze(projectionView);
    }

    const tileProjView = this._frustumOverlay.coverageProjView || projectionView;

    if (cameraMoved) {
      this._coverageDirty = true;
      this._renderDirty = true;
      this.emit('move');
      clearTimeout(this._hashUpdateTimer);
      this._hashUpdateTimer = setTimeout(() => {
        history.replaceState(null, '', cameraStateToHash(camera.state));
        this.emit('moveend');
      }, 300);
    }

    if (this._coverageDirty) {
      const maxElevY = this._MAX_ELEV_Y * this._currentExaggeration;
      this._tileManager.beginFrame();
      const hasImageryLayers = this._imageryTileCache.layers.length > 0;
      const minImageryZoom = this._minImageryZoom;
      const cache = this._imageryTileCache;
      // Track all imagery tiles touched during coverage (including pending ones
      // that block subdivision) so the GC doesn't destroy them before they load.
      const touchedImageryKeys = new Set();
      this._cachedRenderList = selectImageryTiles(
        tileProjView, canvas.width, canvas.height, maxElevY,
        this._currentExaggeration, settings.densityThreshold,
        this._terrainBounds, this._tileManager,
        this._maxTerrainZoom, this._maxImageryZoom,
        hasImageryLayers ? (z, x, y) => {
          if (z < minImageryZoom) return true;
          if (!cache.overlapsAnyLayer(z, x, y)) return true;
          const key = `${z}/${x}/${y}`;
          touchedImageryKeys.add(key);
          cache.ensureImageryTile(z, x, y);
          return cache.hasImagery(z, x, y);
        } : null,
        this._globalElevScale,
        settings.imageryDensityThreshold,
      );

      // Add terrain tile keys from render list to wantedKeys (for GC)
      for (const tile of this._cachedRenderList) {
        this._tileManager.wantedKeys.add(`${tile.terrainZ}/${tile.terrainX}/${tile.terrainY}`);
      }

      // Sort front-to-back for early-z rejection of occluded terrain fragments
      const pv = tileProjView;
      this._cachedRenderList.sort((a, b) => {
        const aw = pv[3] * ((a.x + 0.5) / (1 << a.z)) + pv[11] * ((a.y + 0.5) / (1 << a.z)) + pv[15];
        const bw = pv[3] * ((b.x + 0.5) / (1 << b.z)) + pv[11] * ((b.y + 0.5) / (1 << b.z)) + pv[15];
        return aw - bw;
      });

      this._tileManager.cancelStale();
      this._tileManager.evict();
      this._tileManager.stripQuadtrees();

      // GC imagery tile cache: keep tiles in the render list + pending tiles
      // that were touched during subdivision checks (so they survive until loaded)
      const wantedImageryKeys = new Set(touchedImageryKeys);
      for (const tile of this._cachedRenderList) {
        wantedImageryKeys.add(`${tile.z}/${tile.x}/${tile.y}`);
      }
      this._imageryTileCache.gc(wantedImageryKeys);

      this._rebuildBVH();
      this._coverageDirty = false;
      this._renderDirty = true;
    }

    if (!this._renderDirty) return;
    this._renderDirty = false;

    // Collision detection (leading+trailing throttle, before prepare so hidden features are skipped)
    const collisionLayers = this._layerManager.buildCollisionLayers();
    if (this._collisionManager.update({
      enabled: settings.enableCollision,
      layers: collisionLayers,
      projectionView,
      canvasW: canvas.width,
      canvasH: canvas.height,
      pixelRatio: this._pixelRatio,
      exaggeration: this._currentExaggeration,
      collisionBuffer: settings.collisionBuffer,
      occlusionBias: settings.occlusionBias,
      bvh: this._bvh,
      tileManager: this._tileManager,
      bvhTileList: this._bvhTileList,
      globalElevScale: this._globalElevScale,
    })) {
      this._renderDirty = true;
    }

    this._layerManager.prepareLayers(projectionView, canvas.width, canvas.height, this._pixelRatio, this._currentExaggeration, this._globalElevScale);

    this.emit('elevationrefine');

    this.paint();
    this.emit('render');
  }

  _rebuildBVH() {
    const renderTiles = this._cachedRenderList;
    if (renderTiles.length === 0) {
      this._bvh = null;
      this._bvhTileList = [];
      return;
    }

    // Extract unique terrain tiles for the BVH (raycasting is a terrain operation).
    // Multiple imagery tiles can share the same terrain tile. Skip flat tiles —
    // they have no real elevation data and produce spurious hits at y=0.
    const terrainTileMap = new Map();
    for (const tile of renderTiles) {
      const key = `${tile.terrainZ}/${tile.terrainX}/${tile.terrainY}`;
      if (!terrainTileMap.has(key)) {
        const entry = this._tileManager.getTile(tile.terrainZ, tile.terrainX, tile.terrainY);
        if (entry && entry.isFlat) continue;
        terrainTileMap.set(key, { z: tile.terrainZ, x: tile.terrainX, y: tile.terrainY });
      }
    }

    const tiles = Array.from(terrainTileMap.values());

    const aabbs = new Float64Array(tiles.length * 6);
    const tileList = new Array(tiles.length);

    for (let i = 0; i < tiles.length; i++) {
      const { z, x, y } = tiles[i];
      tileList[i] = tiles[i];

      const s = 1 / (1 << z);
      const bounds = this._tileManager.getElevationBounds(z, x, y);

      const base = i * 6;
      aabbs[base]     = x * s;
      aabbs[base + 1] = bounds ? bounds.minElevation * this._globalElevScale * this._currentExaggeration : 0;
      aabbs[base + 2] = y * s;
      aabbs[base + 3] = (x + 1) * s;
      aabbs[base + 4] = bounds ? bounds.maxElevation * this._globalElevScale * this._currentExaggeration : this._MAX_ELEV_Y * this._currentExaggeration;
      aabbs[base + 5] = (y + 1) * s;
    }

    this._bvh = new BVH(aabbs, { maxItemsPerNode: 4 });
    this._bvhTileList = tileList;
  }

  /**
   * Raycast from screen coordinates to terrain.
   *
   * @param {number} clientX - mouse/touch clientX
   * @param {number} clientY - mouse/touch clientY
   * @returns {{ worldPos: [number, number, number], t: number, tile: { z, x, y } } | null}
   */
  raycast(clientX, clientY) {
    if (!this._bvh) return null;

    const rect = this.canvas.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = 1 - ((clientY - rect.top) / rect.height) * 2;

    invertMat4(this._invProjView, this._lastProjView);
    const { origin, direction } = screenToRay(ndcX, ndcY, this._invProjView);

    return raycastTerrain({
      origin,
      direction,
      bvh: this._bvh,
      tileCache: this._tileManager,
      tileList: this._bvhTileList,
      verticalExaggeration: this._currentExaggeration,
    });
  }

  /**
   * Query terrain elevation at a lon/lat coordinate.
   * @returns {number|null} elevation in meters, or null if no tile covers the point
   */
  queryElevation(lon, lat) {
    const mx = lonToMercatorX(lon);
    const my = latToMercatorY(lat);
    return this.queryElevationMercator(mx, my);
  }

  /**
   * Query terrain elevation at a Mercator coordinate.
   * Searches the current render list for the highest-zoom terrain tile covering (mx, my).
   * With imagery-driven rendering, each render tile carries a terrain tile reference;
   * we find the best terrain tile across all render tiles covering the point.
   * @returns {number|null} elevation in meters, or null if no tile covers the point
   */
  queryElevationMercator(mx, my) {
    let bestTerrainZ = -1;
    let bestTerrainX = -1;
    let bestTerrainY = -1;

    for (const tile of this._cachedRenderList) {
      // Check if this imagery tile covers the point
      const s = 1 / (1 << tile.z);
      if (mx >= tile.x * s && mx < (tile.x + 1) * s &&
          my >= tile.y * s && my < (tile.y + 1) * s &&
          tile.terrainZ > bestTerrainZ) {
        bestTerrainZ = tile.terrainZ;
        bestTerrainX = tile.terrainX;
        bestTerrainY = tile.terrainY;
      }
    }

    if (bestTerrainZ < 0) return null;

    const entry = this._tileManager.getTile(bestTerrainZ, bestTerrainX, bestTerrainY);
    if (!entry || !entry.elevations) return null;

    const s = 1 / (1 << bestTerrainZ);
    const u = (mx - bestTerrainX * s) / s; // 0..1 within terrain tile
    const v = (my - bestTerrainY * s) / s;

    // Map to 514-texel coordinates (skip 1px border)
    const tx = u * 512 + 1;
    const ty = v * 512 + 1;

    const ix = Math.floor(tx);
    const iy = Math.floor(ty);
    const fx = tx - ix;
    const fy = ty - iy;

    const w = 514;
    const ix0 = Math.min(ix, 513);
    const ix1 = Math.min(ix + 1, 513);
    const iy0 = Math.min(iy, 513);
    const iy1 = Math.min(iy + 1, 513);

    const e00 = entry.elevations[iy0 * w + ix0];
    const e10 = entry.elevations[iy0 * w + ix1];
    const e01 = entry.elevations[iy1 * w + ix0];
    const e11 = entry.elevations[iy1 * w + ix1];

    return e00 * (1 - fx) * (1 - fy) + e10 * fx * (1 - fy) +
           e01 * (1 - fx) * fy + e11 * fx * fy;
  }

  _debugParams() {
    const { canvas, camera, settings } = this;
    const aspect = canvas.width / canvas.height;
    const { projectionView } = camera.update(aspect);
    const maxElevY = this._MAX_ELEV_Y * this._currentExaggeration;
    return { projectionView, canvasW: canvas.width, canvasH: canvas.height, maxElevY, vertExag: this._currentExaggeration, densityThreshold: settings.densityThreshold, sourceBounds: this._terrainBounds, tileManager: this._tileManager, globalElevScale: this._globalElevScale };
  }

  debugTile(z, x, y) {
    const p = this._debugParams();
    return debugTile(z, x, y, p.projectionView, p.canvasH, p.maxElevY, p.vertExag, p.densityThreshold, p.tileManager, p.globalElevScale);
  }

  debugSelectTiles() {
    const p = this._debugParams();
    return debugSelectTiles(p.projectionView, p.canvasW, p.canvasH, p.maxElevY, p.vertExag, p.densityThreshold, p.sourceBounds, p.tileManager, p.globalElevScale);
  }

  debugTileCoverage() {
    const p = this._debugParams();
    const state = this.camera.state;
    const freshTiles = selectTiles(
      p.projectionView, p.canvasW, p.canvasH, p.maxElevY,
      p.vertExag, p.densityThreshold, p.sourceBounds, p.tileManager, null,
      p.globalElevScale,
    );
    const [ex, ey, ez] = extractEyePosition(p.projectionView);
    return {
      camera: { center: [...state.center], distance: state.distance, phi: state.phi, theta: state.theta, thetaDeg: state.theta * 180 / Math.PI, fov: state.fov },
      canvas: { width: p.canvasW, height: p.canvasH },
      densityThreshold: p.densityThreshold,
      tiles: freshTiles.map(t => ({
        z: t.z, x: t.x, y: t.y,
        density: screenDensity(p.projectionView, t.z, t.x, t.y, p.canvasH, ex, ey, ez),
        terrainDensity: terrainScreenDensity(p.projectionView, t.z, t.x, t.y, p.canvasH, ex, ey, ez),
      })),
      projectionView: Array.from(p.projectionView),
    };
  }

  destroy() {
    this._running = false;
    clearTimeout(this._hashUpdateTimer);
    this._collisionManager.destroy();
    this._frustumOverlay.destroy();
    this._resizeObserver.disconnect();
    this.camera.destroy();
    this._layerManager.destroyAll();
    this._workerPool.destroy();
    this._gpu.destroy();
  }
}
