// Per-tile shading bake (normals + AO + cast shadow) using the
// CPU line-sweep implementation from line-sweep-terrain-lighting,
// running in a worker pool. The bake produces an RGBA8 buffer
// (R=nx, G=ny, B=ao, A=shadow) that's uploaded to a per-tile texture
// and consumed by the terrain fragment shader.
//
// With meshTerrainOffset > 0, the mesh tile is rendered at a coarser
// zoom than imagery. To keep the lighting at imagery scale, the bake
// reads composited child tiles at `meshTerrainOffset` levels finer and
// produces a (256 << offset)² shading texture per mesh tile. Missing
// child tiles are zero-filled and tracked so the bake re-fires when
// they arrive (mirrors the parent-arrival re-bake for horizon prewarm).
//
// Lifecycle:
//   ensureMeshTile(z, x, y, delta)   → register/re-register; try bake
//   onTileLoaded(z, x, y, entry)     → retry bake for matching state;
//                                      notify parent/child mesh tiles
//   onSunChanged()                   → mark all baked tiles for shadow rebake
//   tick()                           → drain shadow rebakes (max 4/frame)
//   onTileEvicted(z, x, y)           → evict shading texture + state
//
// We cache nx/ny/ao Float32Arrays per tile so shadow rebakes don't
// repeat the LSAO sweeps. The horizon Float32Array is also cached
// per tile so sun changes don't reassemble parent samples.

import { WorkerPool } from '../workers/worker-pool.ts';
import { assembleHorizon, PN as HORIZON_PN, HN, PARENT_SCALE } from './horizon-assembly.js';
import { downsampleInner } from './downsample.js';
import { sunDirectionToAzAlt } from './sun-math.js';

const EARTH_CIRCUMFERENCE_M = 40075016.686;
const PADDED_TILE_SIZE = 514;
const BASE_COMP_N = 256;
// Zoom-pyramid attenuation correction (line-sweep-terrain-lighting's
// `zoomCompensation`). Gradients ∇h shrink under tile-pyramid
// downsampling, so hillshade/LSAO weaken as zoom drops; pxCorr applies
// a horizontal contraction (= gradient inflation) to compensate. The
// 0.3 exponent matches the empirical mean-gradient asymptote tuned in
// the original notebook. zRef is the source's deepest data zoom; mesh
// tiles at z < zRef get a < 1 multiplier on pxSize.
const ZOOM_COMPENSATION = 0.3;

function compNFor(delta) {
  return BASE_COMP_N << delta;
}

function eqPxSizeAtZoom(z, compN) {
  return EARTH_CIRCUMFERENCE_M / ((1 << z) * compN);
}

function pxSizeCorrection(z, zRef) {
  if (!ZOOM_COMPENSATION || zRef == null) return 1;
  return Math.pow(2, (z - zRef) * ZOOM_COMPENSATION);
}

export class LightingManager {
  constructor({ device, gpu, tileManager, settings }) {
    this.device = device;
    this.gpu = gpu;
    this.tileManager = tileManager;
    this.settings = settings;

    this._workerPool = new WorkerPool(
      () => new Worker(new URL('./bake.worker.js', import.meta.url), { type: 'module' }),
      settings.maxWorkers,
    );

    this._initUpsamplePipeline();

    // key -> per-tile state
    //   { z, x, y, key, lightingDelta, compN, texture, view,
    //     horizonHeights, compHMin, compHMax, horizonHMax,
    //     missingParents, missingChildren,
    //     cachedNx, cachedNy, cachedAo,
    //     staticInflight, shadowInflight, shadowDirty,
    //     abortController }
    this.tiles = new Map();

    this._shadowDirtyKeys = new Set();
    this.onShadingReady = null;
  }

  // Called by the terrain viewer for each terrain tile present in the
  // current render list. Idempotent. Allocates state if needed; if the
  // delta differs from a previously-allocated state, evicts and re-allocates
  // (the shading texture size depends on delta).
  ensureMeshTile(z, x, y, lightingDelta) {
    if (!this.settings.lightingEnabled) return;
    const key = `${z}/${x}/${y}`;
    const existing = this.tiles.get(key);
    if (existing) {
      if (existing.lightingDelta !== lightingDelta) {
        this._evictState(key);
        this._allocateState(z, x, y, key, lightingDelta);
      }
    } else {
      this._allocateState(z, x, y, key, lightingDelta);
    }
    this._tryBake(this.tiles.get(key));
  }

  // Called by tile manager whenever any terrain tile resolves. Three roles:
  //   (1) If this tile is itself a registered mesh tile whose bake was
  //       previously deferred (e.g. mesh-elevation entry not loaded yet),
  //       try the bake now.
  //   (2) If this tile is a child needed for some registered mesh tile's
  //       bake input, re-fire that bake.
  //   (3) If this tile is a horizon parent of some registered mesh tile,
  //       re-fire that bake (existing behavior).
  onTileLoaded(z, x, y, entry) {
    if (!this.settings.lightingEnabled) return;
    if (entry.isFlat || !entry.elevations) {
      // Flat / failed tiles can still satisfy a missing-child slot, since
      // we treat them as zero terrain. Notify but don't try to bake them.
      this._notifyChildResolved(z, x, y);
      return;
    }
    const key = `${z}/${x}/${y}`;
    const own = this.tiles.get(key);
    if (own) this._tryBake(own);
    this._notifyChildResolved(z, x, y);
    this._notifyParentLoaded(z, x, y);
  }

  onTileEvicted(z, x, y) {
    this._evictState(`${z}/${x}/${y}`);
  }

  onSunChanged() {
    if (!this.settings.lightingEnabled) return;
    for (const [key, state] of this.tiles) {
      if (state.cachedNx) {
        // Fast path: cached LSAO lets us re-run only the shadow pass.
        state.shadowDirty = true;
        this._shadowDirtyKeys.add(key);
      } else if (state.baked) {
        // No cached normals: full re-bake. Drop the baked flag so
        // _tryBake re-fires next time ensureMeshTile is called for
        // this tile. Currently-rendered tiles refresh on the next
        // frame; off-screen tiles refresh when they re-enter the
        // render set. Without this, mobile (cacheShadingNormals=false)
        // shows stale shading on tiles baked under the previous sun.
        state.baked = false;
      }
    }
  }

  tick() {
    if (!this.settings.lightingEnabled) return;
    if (this._shadowDirtyKeys.size === 0) return;

    const MAX_PER_TICK = 4;
    let submitted = 0;
    for (const key of this._shadowDirtyKeys) {
      if (submitted >= MAX_PER_TICK) break;
      const state = this.tiles.get(key);
      if (!state) {
        this._shadowDirtyKeys.delete(key);
        continue;
      }
      if (state.shadowInflight) continue;
      if (!state.cachedNx) {
        this._shadowDirtyKeys.delete(key);
        state.shadowDirty = false;
        continue;
      }
      this._shadowDirtyKeys.delete(key);
      state.shadowDirty = false;
      this._submitShadowBake(key);
      submitted++;
    }
  }

  _allocateState(z, x, y, key, lightingDelta) {
    const compN = compNFor(lightingDelta);
    const texture = this.device.createTexture({
      size: [compN, compN, 1],
      format: 'rgba8unorm',
      // RENDER_ATTACHMENT lets us draw into it via the upsample pass to
      // bootstrap a placeholder shading from a baked ancestor.
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
      label: `lighting.shadingTex ${key}`,
    });
    const view = texture.createView();
    const state = {
      z, x, y, key,
      lightingDelta, compN,
      texture, view,
      horizonHeights: null,
      compHMin: 0, compHMax: 0, horizonHMax: 0,
      missingParents: null,
      missingChildren: null,
      // cachedNx/Ny/Ao let onSunChanged-driven shadow rebakes skip the
      // LSAO sweeps and re-run only the shadow pass. Each is a Float32
      // array sized compN²; ~3 MB total per lit mesh tile when compN=512.
      // settings.cacheShadingNormals can disable the cache to reclaim
      // that memory; sun changes then don't update existing tiles'
      // shadows (re-render of stale baked tiles only) — acceptable when
      // the sun is static or near-static at the time.
      cachedNx: null, cachedNy: null, cachedAo: null,
      baked: false,
      staticInflight: false,
      shadowInflight: false,
      shadowDirty: false,
      abortController: null,
    };
    this.tiles.set(key, state);
    this._tryFillFromAncestor(state);
  }

  // Walk up to the deepest baked ancestor and stamp its quadrant covering
  // this tile into the new shading texture. Cheap GPU bilinear upsample;
  // gets overwritten by writeTexture once the real bake completes. Without
  // this, new tiles render with the 1×1 fully-lit fallback shading (= no
  // shading) until their bake lands, which causes shadow flicker on pan.
  _tryFillFromAncestor(state) {
    let pz = state.z - 1;
    let px = state.x >> 1;
    let py = state.y >> 1;
    while (pz >= 0) {
      const parent = this.tiles.get(`${pz}/${px}/${py}`);
      if (parent && parent.baked && parent.texture) {
        const dz = state.z - pz;
        const scale = 1 << dz;
        const quadX = state.x & (scale - 1);
        const quadY = state.y & (scale - 1);
        this._runUpsamplePass(parent.texture, state.texture, state.compN,
          quadX / scale, quadY / scale, 1 / scale);
        this.tileManager.attachShading(state.z, state.x, state.y, state.view);
        return true;
      }
      pz--;
      px >>= 1;
      py >>= 1;
    }
    return false;
  }

  // After a bake (static or shadow) writes to `source.texture`, any unbaked
  // descendant whose own bake hasn't landed yet should re-pull from the
  // ancestor chain — `source` may now be the closest baked tile available
  // and the descendant's shading texture was either empty (cold start, no
  // ancestor at allocate time) or stamped from a further-back ancestor.
  // `_tryFillFromAncestor` re-walks the chain and is a no-op when a closer
  // baked ancestor already provided data; for the cases we care about
  // (cold-start cascade after the first bake completes, zoom-in where the
  // freshly arrived parent is now closer than any earlier blit source)
  // it picks `source` and re-blits, then re-attaches the shading view.
  _cascadeToDescendants(source) {
    for (const state of this.tiles.values()) {
      if (state === source) continue;
      if (state.baked) continue;       // own bake authoritative
      if (state.staticInflight) continue; // about to overwrite anyway
      const dz = state.z - source.z;
      if (dz <= 0) continue;
      if ((state.x >> dz) !== source.x) continue;
      if ((state.y >> dz) !== source.y) continue;
      this._tryFillFromAncestor(state);
    }
  }

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
        // Fullscreen triangle.
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
      size: 16, // vec2 + vec2
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  _runUpsamplePass(srcTex, dstTex, dstSize, uvOffsetX, uvOffsetY, uvScale) {
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
    const encoder = this.device.createCommandEncoder({ label: 'lighting.upsample' });
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: dstTex.createView(),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
      }],
    });
    pass.setPipeline(this._upsamplePipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  _evictState(key) {
    const state = this.tiles.get(key);
    if (!state) return;
    if (state.abortController) state.abortController.abort();
    if (state.shadowAbortController) state.shadowAbortController.abort();
    // Rebuild the elevation tile's bind group without our shading view so
    // future frames don't reference it. Then defer the actual texture
    // destroy until in-flight GPU work that may still hold the OLD bind
    // group has completed — destroying it earlier produces "destroyed
    // texture used in a submit" validation errors.
    this.tileManager.attachShading(state.z, state.x, state.y, null);
    this.tiles.delete(key);
    if (state.texture) {
      const tex = state.texture;
      this.device.queue.onSubmittedWorkDone().then(() => tex.destroy());
    }
  }

  _tryBake(state) {
    if (!state) return;
    if (state.staticInflight) return;
    if (state.baked) return; // already baked; re-bakes go through _notifyChildResolved / _notifyParentLoaded
    const meshEntry = this.tileManager.getTile(state.z, state.x, state.y);
    if (!meshEntry || meshEntry.isFlat || !meshEntry.elevations) return;
    this._submitStaticBake(state.key, meshEntry);
  }

  // Build the elevation grid the bake operates on. For delta=0 this is
  // just the mesh tile's inner 512×512 downsampled to compN=256 (current
  // behavior). For delta>0 the grid is composited from (1<<delta)² child
  // tiles at the mesh zoom + delta. Missing/flat children fall back to
  // the corresponding quadrant of the mesh tile's own elevation — without
  // this, 404 children produced zero-filled quadrants and the bake then
  // computed shadows against a flat plane while the mesh itself rendered
  // real parent elevation, producing visible low-detail shading patches
  // (most noticeable with imagery off).
  _composeBakeInput(state, meshEntry) {
    const { compN, lightingDelta: delta, z, x, y } = state;
    if (delta === 0) {
      const elev = downsampleInner(meshEntry.elevations, PADDED_TILE_SIZE, compN);
      return { elev, missingChildren: null };
    }

    const stride = 1 << delta;
    const childN = compN / stride; // pixels per child quadrant in composite
    const elev = new Float32Array(compN * compN);
    const missingChildren = new Set();
    const cz = z + delta;

    for (let dy = 0; dy < stride; dy++) {
      for (let dx = 0; dx < stride; dx++) {
        const cx = (x << delta) + dx;
        const cy = (y << delta) + dy;
        const childEntry = this.tileManager.getTile(cz, cx, cy);
        if (childEntry && !childEntry.isFlat && childEntry.elevations) {
          const childGrid = downsampleInner(childEntry.elevations, PADDED_TILE_SIZE, childN);
          this._copyQuadrant(elev, compN, dx * childN, dy * childN, childGrid, childN);
        } else {
          // Missing / flat / failed → use the mesh tile's elevation for this
          // quadrant. Sampled directly from the padded elevation array, with
          // bilinear upsampling for delta≥2 where parentQuadSize < childN.
          this._fillQuadrantFromParent(elev, compN, dx, dy, stride, meshEntry.elevations);
          if (!childEntry) missingChildren.add(`${cz}/${cx}/${cy}`);
        }
      }
    }
    return { elev, missingChildren: missingChildren.size > 0 ? missingChildren : null };
  }

  _copyQuadrant(out, outN, offsetX, offsetY, src, srcN) {
    for (let row = 0; row < srcN; row++) {
      out.set(
        src.subarray(row * srcN, (row + 1) * srcN),
        (offsetY + row) * outN + offsetX,
      );
    }
  }

  // Fill the (dx, dy) quadrant of the composite from the corresponding
  // region of the parent's inner 512×512 elevation. parentQuadSize and
  // childN may differ when delta≥2; we bilinear-sample to cover that.
  _fillQuadrantFromParent(out, compN, dx, dy, stride, parentElevPadded) {
    const childN = compN / stride;
    const innerSize = PADDED_TILE_SIZE - 2; // 512
    const parentQuadSize = innerSize / stride;
    const padded = PADDED_TILE_SIZE;
    if (parentQuadSize === childN) {
      // 1:1 copy from parent's inner (skipping the 1-pixel padding skirt)
      const srcOffsetX = dx * parentQuadSize + 1;
      const srcOffsetY = dy * parentQuadSize + 1;
      for (let row = 0; row < childN; row++) {
        const srcRowStart = (srcOffsetY + row) * padded + srcOffsetX;
        const dstRowStart = (dy * childN + row) * compN + dx * childN;
        for (let i = 0; i < childN; i++) {
          out[dstRowStart + i] = parentElevPadded[srcRowStart + i];
        }
      }
      return;
    }
    // Bilinear upsample (parentQuadSize < childN, e.g. delta=2).
    const scale = parentQuadSize / childN;
    const baseSx = dx * parentQuadSize;
    const baseSy = dy * parentQuadSize;
    for (let row = 0; row < childN; row++) {
      const sy = baseSy + (row + 0.5) * scale - 0.5;
      const sy0 = Math.max(0, Math.floor(sy));
      const sy1 = Math.min(innerSize - 1, sy0 + 1);
      const ty = sy - sy0;
      const dstRow = (dy * childN + row) * compN + dx * childN;
      for (let col = 0; col < childN; col++) {
        const sx = baseSx + (col + 0.5) * scale - 0.5;
        const sx0 = Math.max(0, Math.floor(sx));
        const sx1 = Math.min(innerSize - 1, sx0 + 1);
        const tx = sx - sx0;
        // +1 to skip the 1-pixel padding skirt on each side.
        const v00 = parentElevPadded[(sy0 + 1) * padded + (sx0 + 1)];
        const v10 = parentElevPadded[(sy0 + 1) * padded + (sx1 + 1)];
        const v01 = parentElevPadded[(sy1 + 1) * padded + (sx0 + 1)];
        const v11 = parentElevPadded[(sy1 + 1) * padded + (sx1 + 1)];
        const a = v00 * (1 - tx) + v10 * tx;
        const b = v01 * (1 - tx) + v11 * tx;
        out[dstRow + col] = a * (1 - ty) + b * ty;
      }
    }
  }

  _submitStaticBake(key, meshEntry) {
    const state = this.tiles.get(key);
    if (!state) return;
    // Abort any in-flight bake for this tile before starting a new one.
    // _notifyParentLoaded / _notifyChildResolved can fire mid-bake when
    // a horizon parent or child elevation arrives — without this, both
    // jobs run concurrently and the older (stale-input) one can land
    // after the newer one, overwriting the correct shading and leaving
    // the tile permanently in the "no parent / no child" state.
    if (state.abortController) state.abortController.abort();
    state.staticInflight = true;
    state.abortController = new AbortController();
    const thisController = state.abortController;

    const { elev: compElev, missingChildren } = this._composeBakeInput(state, meshEntry);
    state.missingChildren = missingChildren;

    const compN = state.compN;
    let compHMin = Infinity, compHMax = -Infinity;
    for (let i = 0; i < compElev.length; i++) {
      const v = compElev[i];
      if (v < compHMin) compHMin = v;
      if (v > compHMax) compHMax = v;
    }
    state.compHMin = compHMin;
    state.compHMax = compHMax;

    const horizon = assembleHorizon(state.z, state.x, state.y, this.tileManager);
    if (horizon) {
      state.horizonHeights = horizon.heights;
      state.missingParents = horizon.missingParents;
      state.horizonHMax = horizon.hMax;
    } else {
      state.horizonHeights = null;
      state.missingParents = null;
      state.horizonHMax = 0;
    }

    const eqPxSizeM = eqPxSizeAtZoom(state.z, compN);
    const zRef = this.tileManager.bounds ? this.tileManager.bounds.maxZoom : null;
    const pxCorr = pxSizeCorrection(state.z, zRef);
    const { azDeg, altDeg } = sunDirectionToAzAlt(this.settings.sunDirection);
    const sunRadiusDeg = Math.max(0, this.settings.sunRadiusDeg ?? 2.5);
    const shadowSamples = Math.max(1, Math.round(this.settings.shadowSamples ?? 6));

    // parentScale = "child (bake) pixels per horizon (parent) pixel".
    // = (compN / PN) × PARENT_SCALE_spatial. Horizon stays at PN
    // resolution regardless of compN, so this scales with compN.
    const parentScalePixel = (compN * PARENT_SCALE) / HORIZON_PN;
    this._workerPool.submit(
      'lighting-bake-static',
      {
        z: state.z, x: state.x, y: state.y,
        heights: compElev, N: compN, eqPxSizeM, pxCorr,
        horizon: state.horizonHeights || new Float32Array(0),
        HN: state.horizonHeights ? HN : 0,
        parentScale: parentScalePixel,
        horizonPN: HORIZON_PN,
        azDeg, altDeg, sunRadiusDeg, shadowSamples,
        lsaoFalloff: 'cos2',
        compHMin, horizonHMax: state.horizonHMax,
      },
      {
        priority: -state.z,
        transfer: [compElev.buffer],
        signal: state.abortController.signal,
      },
    ).then((result) => {
      if (!this.tiles.has(key)) return; // evicted
      const s = this.tiles.get(key);
      // A newer bake superseded ours — drop stale result.
      if (s.abortController !== thisController) return;
      s.staticInflight = false;
      this.device.queue.writeTexture(
        { texture: s.texture },
        result.packed,
        { bytesPerRow: compN * 4, rowsPerImage: compN },
        { width: compN, height: compN, depthOrArrayLayers: 1 },
      );
      if (this.settings.cacheShadingNormals) {
        s.cachedNx = result.nx;
        s.cachedNy = result.ny;
        s.cachedAo = result.ao;
      }
      s.baked = true;
      this.tileManager.attachShading(s.z, s.x, s.y, s.view);
      if (this.onShadingReady) this.onShadingReady(s.z, s.x, s.y);
      this._cascadeToDescendants(s);
    }).catch((err) => {
      const s = this.tiles.get(key);
      // Only clear inflight if this is still the current bake; otherwise
      // a newer bake is running and we'd leave it dangling.
      if (s && s.abortController === thisController) s.staticInflight = false;
      if (err && err.name === 'AbortError') return;
      console.error('lighting bake failed', key, err);
    });
  }

  _submitShadowBake(key) {
    const state = this.tiles.get(key);
    if (!state || !state.cachedNx) return;
    const meshEntry = this.tileManager.getTile(state.z, state.x, state.y);
    if (!meshEntry || meshEntry.isFlat || !meshEntry.elevations) return;
    if (state.shadowInflight) return;

    state.shadowInflight = true;

    const compN = state.compN;
    const { elev: compElev } = this._composeBakeInput(state, meshEntry);

    const eqPxSizeM = eqPxSizeAtZoom(state.z, compN);
    const { azDeg, altDeg } = sunDirectionToAzAlt(this.settings.sunDirection);
    const sunRadiusDeg = Math.max(0, this.settings.sunRadiusDeg ?? 2.5);
    const shadowSamples = Math.max(1, Math.round(this.settings.shadowSamples ?? 6));
    const horizonBuf = state.horizonHeights;

    const parentScalePixel = (compN * PARENT_SCALE) / HORIZON_PN;
    this._workerPool.submit(
      'lighting-bake-shadow',
      {
        z: state.z, x: state.x, y: state.y,
        heights: compElev, N: compN, eqPxSizeM,
        horizon: horizonBuf || new Float32Array(0),
        HN: horizonBuf ? HN : 0,
        parentScale: parentScalePixel,
        horizonPN: HORIZON_PN,
        azDeg, altDeg, sunRadiusDeg, shadowSamples,
        cachedNx: state.cachedNx,
        cachedNy: state.cachedNy,
        cachedAo: state.cachedAo,
        compHMin: state.compHMin, horizonHMax: state.horizonHMax,
      },
      {
        priority: -state.z,
        transfer: [compElev.buffer],
      },
    ).then((result) => {
      const s = this.tiles.get(key);
      if (!s) return;
      s.shadowInflight = false;
      this.device.queue.writeTexture(
        { texture: s.texture },
        result.packed,
        { bytesPerRow: compN * 4, rowsPerImage: compN },
        { width: compN, height: compN, depthOrArrayLayers: 1 },
      );
      if (this.onShadingReady) this.onShadingReady(s.z, s.x, s.y);
      // The shadow rebake replaced the shadow channel with new sun-relative
      // data; descendant tiles still showing this tile's pre-rebake shadows
      // (via _tryFillFromAncestor) need a fresh blit to pick the new ones up.
      this._cascadeToDescendants(s);
    }).catch((err) => {
      const s = this.tiles.get(key);
      if (s) s.shadowInflight = false;
      console.error('shadow rebake failed', key, err);
    });
  }

  _notifyParentLoaded(pz, px, py) {
    const parentKey = `${pz}/${px}/${py}`;
    for (const [key, state] of this.tiles) {
      if (state.missingParents && state.missingParents.has(parentKey)) {
        state.missingParents.delete(parentKey);
        const entry = this.tileManager.getTile(state.z, state.x, state.y);
        if (entry && !entry.isFlat && entry.elevations) {
          this._submitStaticBake(key, entry);
        }
      }
    }
  }

  _notifyChildResolved(cz, cx, cy) {
    const childKey = `${cz}/${cx}/${cy}`;
    for (const [key, state] of this.tiles) {
      if (state.missingChildren && state.missingChildren.has(childKey)) {
        state.missingChildren.delete(childKey);
        const entry = this.tileManager.getTile(state.z, state.x, state.y);
        if (entry && !entry.isFlat && entry.elevations) {
          this._submitStaticBake(key, entry);
        }
      }
    }
  }

  snapshot() {
    let textureBytes = 0;
    let horizonBytes = 0;
    let cachedBytes = 0;
    let baked = 0;
    let pending = 0;
    for (const state of this.tiles.values()) {
      if (state.texture) textureBytes += state.compN * state.compN * 4;
      if (state.horizonHeights) horizonBytes += state.horizonHeights.byteLength;
      if (state.cachedNx) cachedBytes += state.cachedNx.byteLength;
      if (state.cachedNy) cachedBytes += state.cachedNy.byteLength;
      if (state.cachedAo) cachedBytes += state.cachedAo.byteLength;
      if (state.baked) baked++;
      else pending++;
    }
    return {
      gpu: {
        'Shading textures': textureBytes,
      },
      cpu: {
        'Lighting horizons': horizonBytes,
        'Lighting nx/ny/ao': cachedBytes,
      },
      counts: {
        shadingTiles: this.tiles.size,
        shadingBaked: baked,
        shadingPending: pending,
      },
    };
  }

  destroy() {
    for (const state of this.tiles.values()) {
      if (state.abortController) state.abortController.abort();
      if (state.shadowAbortController) state.shadowAbortController.abort();
      if (state.texture) state.texture.destroy();
    }
    this.tiles.clear();
    this._workerPool.destroy();
  }
}
