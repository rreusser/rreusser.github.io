# Phase 4: Extract Tile Coverage, Interaction, Render Loop; Move Files to Subdirectories

## Prerequisites

Phases 1-3 are complete. Expected state after Phase 3:

- `core/event-emitter.ts`, `core/types.ts`
- `rendering/gpu-context.ts`, `rendering/sky-renderer.ts`, `rendering/terrain-renderer.ts`
- `layers/layer-manager.ts` -- All layer CRUD, refinement, collision building
- `camera/camera-controller.js`, `camera/hash-state.js`
- `terrain-viewer.js` -- ~550 lines, still owns: `_init()`, `_frame()`, `_rebuildBVH()`, `raycast()`, `queryElevation*()`, `debugTileCoverage()`, coverage logic, destroy

## Goal

1. Move files into their target subdirectories (tiles/, interaction/, math/, debug/)
2. Extract the render loop from `_frame()` into `core/render-loop.ts`
3. TerrainMap becomes a thin composition root (~200 lines)

## Part A: File Moves

All moves use `git mv` to preserve history. After each move, update import paths in all importing files.

### Move to `tiles/`

| From | To |
|---|---|
| `tile-manager.js` | `tiles/tile-manager.js` |
| `tile-math.js` | `tiles/tile-math.js` |
| `imagery-manager.js` | `tiles/imagery-manager.js` |
| `imagery-compositor.js` | `tiles/imagery-compositor.js` |
| `mesh.js` | `tiles/mesh.js` |
| `quadtree.js` | `tiles/tile-coverage.js` |

Files that import these (update paths):
- `terrain-viewer.js` imports tile-manager, tile-math, quadtree, imagery-manager, imagery-compositor
- `rendering/gpu-context.ts` imports mesh.js
- `rendering/terrain-renderer.ts` imports tile-math.js (computeTileMVP, computeTileModel, getCellSizeMeters, getImageryZoom)
- `layers/layer-manager.ts` may import tile-math.js for mercator conversions
- `imagery-compositor.js` imports imagery-manager.js (internal, moves together)

### Move to `interaction/`

| From | To |
|---|---|
| `bvh.js` | `interaction/bvh.js` |
| `ray-terrain.js` | `interaction/raycast.js` |
| `elevation-quadtree.js` | `interaction/elevation-quadtree.js` |
| `collision-manager.js` | `interaction/collision-manager.js` |
| `collision.js` | `interaction/collision.js` |

Files that import these:
- `terrain-viewer.js` imports bvh.js, ray-terrain.js
- `collision-manager.js` imports collision.js (internal, moves together)
- `tile-manager.js` imports elevation-quadtree.js
- `layers/layer-manager.ts` may reference collision-manager (via params)

### Move to `math/`

| From | To |
|---|---|
| `math.js` | `math/mat4.js` |

Only `terrain-viewer.js` imports `invertMat4` from math.js. Later (Phase 6) we may also extract pure Mercator functions from tile-math.js into `math/mercator.ts`.

### Move to `debug/`

| From | To |
|---|---|
| `frustum-overlay.js` | `debug/frustum-overlay.js` |

Imported by `terrain-viewer.js` and drawn by `terrain-renderer.ts`.

### Remaining at root level

After moves, these stay at mapviewer root:
- `terrain-viewer.js` (the main entry)
- `settings.js`
- `elevation-profile.js` (utility, not imported by terrain-viewer)
- `geojson-source.js`, `circle-layer.js`, `text-layer.js`, `line-layer.js` (referenced by layers/layer-manager.ts -- could also move to layers/ but keep them at root for now since they're standalone modules)
- `shaders/`, `fonts/`, `lib/`, `core/`, `rendering/`, `layers/`, `camera/`

## Part B: Extract Render Loop

### Current `_frame()` structure (terrain-viewer.js)

The `_frame()` method (~170 lines) does these things in order:

1. **Settings change detection** (lines 424-451): Check exaggeration, density threshold, freeze coverage, settings.dirty
2. **Debounced refinement** (lines 454-463): Refine line layers at most once per second
3. **Early exit** if nothing dirty (line 465)
4. **Canvas resize** (lines 468-477): Apply pending resize from ResizeObserver
5. **Camera update** (lines 479-481): `camera.update(aspect)` -> view, projection, projectionView
6. **Global elevation scale** (lines 488-491): Compute from eye position
7. **Freeze coverage** (lines 493-495): Freeze/thaw frustum overlay
8. **Camera move events** (lines 499-508): Emit move/moveend, update hash
9. **Coverage computation** (lines 510-543): selectTiles, sort, cancel, evict, rebuildBVH
10. **Collision detection** (lines 549-566)
11. **Layer prepare** (lines 569-579): Circle, text, line prepare calls
12. **Emit elevationrefine** (line 581)
13. **Paint** (line 583): `this.paint()`
14. **Emit render** (line 584)

### RenderLoop class design

```typescript
// core/render-loop.ts

export class RenderLoop {
  private _running = false;
  private _boundFrame: () => void;
  private _hooks: {
    onSettingsCheck: () => void;
    onRefinement: () => void;
    onCanvasResize: () => void;
    onCameraUpdate: () => { cameraMoved: boolean };
    onCoverageUpdate: () => void;
    onCollision: () => void;
    onPrepare: () => void;
    onPaint: () => void;
  };

  // Dirty flags
  coverageDirty = true;
  renderDirty = true;
  refinementDirty = false;

  constructor(hooks: typeof RenderLoop.prototype._hooks) { ... }

  start() { this._running = true; requestAnimationFrame(this._boundFrame); }
  stop() { this._running = false; }

  private _frame() {
    if (!this._running) return;
    requestAnimationFrame(this._boundFrame);

    this._hooks.onSettingsCheck();
    this._hooks.onRefinement();
    if (!this.coverageDirty && !this.renderDirty && !cameraDirty) return;
    this._hooks.onCanvasResize();
    const { cameraMoved } = this._hooks.onCameraUpdate();
    if (cameraMoved) { this.coverageDirty = true; this.renderDirty = true; }
    if (this.coverageDirty) { this._hooks.onCoverageUpdate(); this.coverageDirty = false; this.renderDirty = true; }
    if (!this.renderDirty) return;
    this.renderDirty = false;
    this._hooks.onCollision();
    this._hooks.onPrepare();
    this._hooks.onPaint();
  }
}
```

### Alternative: keep _frame() in TerrainMap

A simpler approach is to skip extracting the render loop into its own class and instead keep `_frame()` in TerrainMap as-is (it's already fairly clean). The main benefit of extraction is testability and reuse, but the render loop is tightly coupled to the specific dirty-flag interactions. Consider whether this extraction is worth the indirection. If you skip it, TerrainMap stays at ~350 lines instead of ~200, which is still a large improvement from the original 1,107.

## Part C: Extract Raycast/BVH/Elevation

After file moves, the raycast-related code in terrain-viewer.js can optionally be grouped:

- `_rebuildBVH()` (lines 587-617) -- builds BVH from render list
- `raycast()` (lines 626-644) -- screen-to-terrain raycast
- `_hitTest()` (lines 368-382) -- pivot point for orbit camera
- `queryElevation()` / `queryElevationMercator()` (lines 650-706) -- elevation sampling

These could move to a small helper class or stay as methods on TerrainMap. They're already fairly self-contained; the main dependency is on `_cachedRenderList`, `_bvh`, `_bvhTileList`, `_tileManager`, and `_currentExaggeration`.

## Estimated state after Phase 4

- `terrain-viewer.js`: ~200-350 lines (composition root)
- `core/render-loop.ts`: ~100 lines (if extracted)
- All other files organized into subdirectories

## Verification

Same as Phase 3, plus verify that all import paths resolve correctly after the moves. Use `npx vite dev src/denali` -- Vite will report any broken imports immediately as build errors.

Check that:
1. `index.html` only imports from `./mapviewer/terrain-viewer.js` (no direct imports of moved files)
2. All internal cross-references within mapviewer/ use correct relative paths
3. The Notebook MCP server connects and all runtime values resolve
