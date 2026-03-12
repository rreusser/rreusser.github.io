# Phase 6: TypeScript Migration

## Prerequisites

Phases 1-5 complete. All files organized into target subdirectories. TerrainMap is a thin orchestrator. Worker pool operational.

## Goal

Convert all remaining `.js` files to `.ts` with proper type annotations and interfaces. Work leaf-to-core to minimize cascading type errors.

## Approach

Vite already handles `.ts` files transparently (via esbuild). Files that import `.js` can import `.ts` by changing the extension in the import statement. Do one file at a time, verify builds after each conversion.

For each file:
1. Rename `.js` -> `.ts` via `git mv`
2. Add type annotations to function parameters, return types, class properties
3. Replace `@param` JSDoc with TypeScript types
4. Add explicit types for class fields (not just `any`)
5. Import shared types from `core/types.ts`
6. Update all import paths that reference the renamed file

## Migration Order

Work from leaves (no internal dependencies) toward the core (many dependencies).

### Batch 1: Pure math and utilities (no internal imports)

```
math/mat4.js          -> math/mat4.ts
collision.js          -> interaction/collision.ts
mesh.js               -> tiles/mesh.ts
camera/hash-state.js  -> camera/hash-state.ts
settings.js           -> settings.ts (or core/settings.ts)
```

These files have zero or minimal internal imports. Type annotations are straightforward:
- `mat4.ts`: `invertMat4(out: Float64Array, a: Float64Array): Float64Array`
- `collision.ts`: AABB overlap functions with `number[]` or typed arrays
- `mesh.ts`: `createTerrainMesh(device: GPUDevice): { vertexBuffer: GPUBuffer; indexBuffer: GPUBuffer; indexCount: number }`
- `hash-state.ts`: `cameraStateToHash(state: CameraState): string`, `hashToCameraState(hash: string): Partial<CameraState>`
- `settings.ts`: `createSettings(initial?: Partial<Settings>): Settings & { dirty: boolean }`

### Batch 2: Data structures

```
interaction/bvh.js                -> interaction/bvh.ts
interaction/elevation-quadtree.js -> interaction/elevation-quadtree.ts
```

- `BVH`: constructor takes `Float64Array` of AABBs, `{ maxItemsPerNode: number }`
- `ElevationQuadtree`: per-tile min/max hierarchy for occlusion testing

### Batch 3: Data sources and imagery

```
geojson-source.js     -> geojson-source.ts (or layers/geojson-source.ts)
tiles/imagery-manager.js -> tiles/imagery-manager.ts
```

- `GeoJSONSource`: `load(data: string | object, options?)`, exposes `lineFeatures`, `features`
- `ImageryManager`: `{ tileUrl: (z,x,y) => string }`, fetch/cache imagery tiles

### Batch 4: Tile management

```
tiles/tile-manager.js        -> tiles/tile-manager.ts
tiles/imagery-compositor.js  -> tiles/imagery-compositor.ts
tiles/tile-coverage.js       -> tiles/tile-coverage.ts
tiles/tile-math.js           -> tiles/tile-math.ts
```

These have complex types:
- `TileManager`: manages a `Map<string, TileEntry>` cache, GPU texture upload
- `ImageryCompositor`: composites multiple imagery layers per terrain tile
- `tile-coverage.ts` (was quadtree.js): `selectTiles()` returns `TileCoord[]`
- `tile-math.ts`: Mercator projection functions, `computeTileMVP()` etc.

### Batch 5: Feature layers

```
circle-layer.js -> circle-layer.ts (or layers/circle-layer.ts)
text-layer.js   -> text-layer.ts (or layers/text-layer.ts)
line-layer.js   -> line-layer.ts (or layers/line-layer.ts)
layers/layer-manager.ts  (already .ts)
```

Each layer class has:
- `init(device, format, ...)` -- GPU pipeline and buffer creation
- `prepare(projectionView, w, h, pixelRatio, exaggeration, globalElevScale)` -- per-frame CPU update
- `draw(pass, ...)` -- GPU draw calls
- `destroy()` -- cleanup

### Batch 6: Camera

```
camera/camera-controller.js -> camera/camera-controller.ts
```

The camera controller is a factory function `createCameraController(canvas, options)` that returns an object with `update(aspect)`, `state`, `taint()`, `dirty`, `destroy()`, `rotateStartCallback`. Type the state interface and return type.

### Batch 7: Core files

```
terrain-viewer.js -> terrain-viewer.ts (or core/terrain-map.ts)
```

By this point all dependencies are typed. Add types to:
- Constructor options (use `MapOptions` from `core/types.ts`)
- All class properties (replace ad-hoc `this._foo = ...` with declared typed fields)
- Public API methods

## Key Interfaces to Define

Add these to `core/types.ts` as needed:

```typescript
export interface CameraState {
  center: [number, number, number];
  distance: number;
  phi: number;
  theta: number;
  fov: number;
  near: number;
  far: number;
}

export interface CameraController {
  state: CameraState;
  dirty: boolean;
  update(aspect: number): {
    view: Float64Array;
    projection: Float64Array;
    projectionView: Float64Array;
    dirty: boolean;
  };
  taint(): void;
  destroy(): void;
  rotateStartCallback?: (clientX: number, clientY: number) => [number, number, number] | null;
}

export interface TileEntry {
  texture: GPUTexture;
  bindGroup: GPUBindGroup;
  elevations: Float32Array | null;
  isFlat: boolean;
}

export interface Settings {
  verticalExaggeration: number;
  densityThreshold: number;
  freezeCoverage: boolean;
  showTileBorders: boolean;
  showImagery: boolean;
  showWireframe: boolean;
  hillshadeOpacity: number;
  slopeAngleOpacity: number;
  contourOpacity: number;
  slopeAspectOpacity: number;
  slopeAspectMaskAbove: number;
  slopeAspectMaskNear: number;
  slopeAspectMaskBelow: number;
  treelineLower: number;
  treelineUpper: number;
  sunDirection: [number, number, number];
  atmosphereDensity: number;
  enableCollision: boolean;
  showCollisionBoxes: boolean;
  collisionBuffer: number;
  occlusionBias: number;
  dirty: boolean;
}
```

## Vite/Build Considerations

- Vite transforms `.ts` via esbuild with no `tsconfig.json` required for dev mode
- If you want type-checking, add a `tsconfig.json` with `"strict": true` and run `npx tsc --noEmit` as a separate check
- Import paths: when a `.js` file imports a `.ts` file, use the `.ts` extension in the import (Vite resolves it). Some projects use `.js` extensions even for TS files (for Node ESM compat), but since this is Vite-only, `.ts` is fine.
- Observable notebooks import the entry point as `import { TerrainMap } from './mapviewer/terrain-viewer.js'` -- after renaming to `.ts`, update this import in `index.html`

## Verification

After each batch:
1. `npx vite dev src/denali` -- verify no build errors
2. Load in browser, verify full functionality
3. Optionally: `npx tsc --noEmit` to verify type correctness (requires tsconfig.json)

After all batches:
1. Full visual verification (terrain, imagery, features, controls, raycast, layers)
2. Check that no `any` types remain in public API signatures
3. Verify `index.html` import paths are updated
