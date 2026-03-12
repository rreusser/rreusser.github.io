# Phase 3: Extract Layer Management and Camera Module

## Prerequisites

Phases 1 and 2 are complete. The current state:

- `core/event-emitter.ts` -- EventEmitter base class (on/off/once/emit)
- `core/types.ts` -- TypeScript interfaces (TileCoord, MercatorBounds, etc.)
- `rendering/gpu-context.ts` -- GPUContext class (WebGPU init, BGLs, buffers, textures, mesh, depth)
- `rendering/sky-renderer.ts` -- SkyRenderer (pipeline + draw)
- `rendering/terrain-renderer.ts` -- TerrainRenderer (pipeline + paint method)
- `terrain-viewer.js` -- TerrainMap (960 lines), extends EventEmitter, uses GPUContext/TerrainRenderer/SkyRenderer

TerrainMap still owns: layer arrays, layer CRUD, line refinement, collision layer building, GeoJSON source loading, camera setup, hash state, raycast, BVH, frame loop, coverage, destroy.

## Goal

Extract all layer management into `layers/layer-manager.ts` and move camera files into `camera/`.

## Current File Layout

```
mapviewer/
  core/event-emitter.ts, types.ts
  rendering/gpu-context.ts, sky-renderer.ts, terrain-renderer.ts
  camera-controller.js, hash-state.js          <-- move to camera/
  circle-layer.js, text-layer.js, line-layer.js, geojson-source.js  <-- stay, referenced by layer-manager
  bvh.js, collision-manager.js, collision.js, ray-terrain.js, elevation-quadtree.js
  frustum-overlay.js, imagery-compositor.js, imagery-manager.js
  math.js, mesh.js, quadtree.js, settings.js
  tile-manager.js, tile-math.js
  terrain-viewer.js
```

## Step 1: Create `layers/layer-manager.ts`

This class manages the three layer arrays and all layer CRUD operations. It receives dependencies via constructor injection to avoid circular imports.

### What to extract from terrain-viewer.js

| Lines (current) | Method/Code | Notes |
|---|---|---|
| 24-43 | `collectSubdivisions()` | Top-level helper, move as-is |
| 115-157 | `getLayers()`, `getLayer(id)` | Move to LayerManager |
| 303-361 | Layer array init + GeoJSON source loading in `_init()` | Becomes `LayerManager.initLayers()` |
| 384-395 | `_buildCollisionLayers()` | Move to LayerManager |
| 741-752 | `addLineLayer()` | Move to LayerManager |
| 754-777 | `removeLayer()`, `removeLineLayer()`, `setLayerVisibility()` | Move |
| 780-825 | `setLineLayerColor()`, `setLayerPaint()` | Move |
| 827-908 | `_refineLineLayers()` | Move |
| 910-945 | `getLayerElevationProfile()`, `getLayerGeoJSON()` | Move |
| 569-579 | Layer `prepare()` calls in `_frame()` | Stay in TerrainMap (or render loop later) |

### LayerManager interface

```typescript
import { CircleLayer } from '../circle-layer.js';
import { TextLayer } from '../text-layer.js';
import { LineLayer, parseColor } from '../line-layer.js';
import { GeoJSONSource } from '../geojson-source.js';
import { loadFontAtlas } from '../lib/webgpu-text/webgpu-text.ts';

type QueryElevFn = (mx: number, my: number) => number | null;

interface LayerEntry {
  id: string;
  layer: any;
  config: any;
  visible: boolean;
  userCreated: boolean;
  _sourceRef?: GeoJSONSource;
  sourceGeoJSON?: any;
  _segmentMidpoints?: any[];
}

export class LayerManager {
  _lineLayers: LayerEntry[] = [];
  _circleLayers: LayerEntry[] = [];
  _textLayers: LayerEntry[] = [];

  private _queryElevation: QueryElevFn;
  private _device: GPUDevice;
  private _format: GPUTextureFormat;
  private _globalUniformBuffer: GPUBuffer;
  private _globalUniformBGL: GPUBindGroupLayout;
  private _createGPULines: any;
  private _onDirty: () => void;

  constructor(params: {
    device: GPUDevice;
    format: GPUTextureFormat;
    globalUniformBuffer: GPUBuffer;
    globalUniformBGL: GPUBindGroupLayout;
    createGPULines: any;
    queryElevation: QueryElevFn;
    onDirty: () => void;  // callback to mark render dirty
  }) { ... }

  async initLayers(featureLayers, geojsonSources, font?, simplifyFn?) { ... }
  getLayers() { ... }
  getLayer(id: string) { ... }
  async addLineLayer(id, geojson, paint?) { ... }
  removeLayer(id) { ... }
  setLayerVisibility(id, visible) { ... }
  setLayerPaint(id, property, value) { ... }
  buildCollisionLayers() { ... }
  refineLineLayers() { ... }
  getLayerElevationProfile(id) { ... }
  getLayerGeoJSON(id) { ... }
  prepareLayers(projectionView, canvasW, canvasH, pixelRatio, exaggeration, globalElevScale) { ... }
  destroyAll() { ... }
}
```

### Key design decisions

1. `queryElevation` is injected as a function reference (not importing TerrainMap).
2. `onDirty` callback lets LayerManager signal that a re-render is needed (replaces `this._renderDirty = true` / `this._refinementDirty = true`).
3. The `prepareLayers()` method consolidates the three prepare loops from `_frame()` lines 569-579.
4. `collectSubdivisions()` moves into the file as a module-level helper.

## Step 2: Move Camera Files

```
camera-controller.js  ->  camera/camera-controller.js
hash-state.js         ->  camera/hash-state.js
```

Use `git mv` to preserve history. Update all import paths:

- `terrain-viewer.js` line 5: `'./camera-controller.js'` -> `'./camera/camera-controller.js'`
- `terrain-viewer.js` line 20: `'./hash-state.js'` -> `'./camera/hash-state.js'`

No other files import these two modules.

## Step 3: Update terrain-viewer.js

After extraction, TerrainMap should:
- Import `LayerManager` from `'./layers/layer-manager.ts'`
- Create `this._layerManager` in `_init()` with injected dependencies
- Delegate all layer methods to `this._layerManager`
- Keep `_frame()` calling `this._layerManager.prepareLayers(...)` and `this._layerManager.refineLineLayers()`
- Forward `getLayers()`, `getLayer()` etc. as thin wrappers

The public API on TerrainMap stays the same (it just delegates). The `_lineLayers`, `_circleLayers`, `_textLayers` properties become `this._layerManager._lineLayers` etc. (accessed by TerrainRenderer via the params object in paint()).

### TerrainRenderer paint() params update

The `paint()` method in `terrain-renderer.ts` receives `lineLayers`, `circleLayers`, `textLayers` as params. After this phase, TerrainMap passes `this._layerManager._lineLayers` etc. The TerrainRenderer itself doesn't change.

## Step 4: Update destroy()

In `terrain-viewer.js` `destroy()`, replace:
```js
for (const entry of this._lineLayers) entry.layer.destroy();
for (const entry of this._circleLayers) if (entry.layer.destroy) entry.layer.destroy();
for (const entry of this._textLayers) if (entry.layer.destroy) entry.layer.destroy();
```
with:
```js
this._layerManager.destroyAll();
```

## Estimated line count changes

- `terrain-viewer.js`: ~960 -> ~550 lines (remove ~410 lines of layer management)
- `layers/layer-manager.ts`: ~400 lines (extracted + init boilerplate)

## Verification

1. `npx vite dev src/denali` and load in browser
2. Terrain renders, imagery composites, feature layers display
3. Camera controls work (pan, rotate, pivot, zoom, scroll, pinch)
4. Raycasting works (mousemove elevation readout)
5. Layer controls work (visibility toggle, color changes)
6. Line drawing works, elevation profile works
7. `map.repaint()` / `map.once('render')` still works for canvas capture
8. Use Notebook MCP RuntimeEval to sample a pixel: `return document.querySelector('canvas').getContext('2d')` won't work for WebGPU, but you can verify tile count via `return map._cachedRenderList.length` and BVH state via `return !!map._bvh`
