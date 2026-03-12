# Line Sweep Terrain Lighting - Project Documentation

This project implements hierarchical terrain lighting using WebGPU compute shaders. It provides infrastructure for fetching Mapbox terrain tiles, managing LRU caches, and computing lighting with boundary data from parent tiles.

## Architecture

The project is organized into a unified terrain module:

```
terrain/
├── index.js           # Unified API (browser)
├── cli.js             # Command-line tool (Node.js)
├── data/              # Tile fetching and caching
│   ├── main.js
│   ├── tile-hierarchy.js
│   ├── tile-cache.js
│   └── ...
├── compute/           # WebGPU pipelines and shaders
│   ├── pipeline.js
│   ├── execute.js
│   ├── lsao-pipeline.js
│   └── ...
└── dist/              # Built bundles
    └── terrain.js     # Standalone ESM bundle
```

## Quick Start

### High-Level API (Recommended)

**Browser:**
```js
import { computeLighting } from './terrain/index.js';

const result = await computeLighting({
  device,               // WebGPU device
  x: 795,               // Tile X coordinate
  y: 1594,              // Tile Y coordinate
  z: 12,                // Zoom level
  algorithm: 'lsao',    // 'lighting' or 'lsao'
  numLevels: 2          // Number of parent levels (1-4)
});
// => {data: Float32Array, width: 512, height: 512}
```

### Using the Bundle

Build and use the standalone bundle:
```bash
cd terrain
npm install
npm run build
```

In your notebook:
```js
import * as Terrain from './terrain/dist/terrain.js';

const result = await Terrain.computeLighting({device, x: 795, y: 1594, z: 12});
```

## Module APIs

### Terrain Tile Fetching

**Browser (terrain/main.js):**
```js
import { getTerrainTile, readImageData, decodeTerrainData } from './terrain/main.js';

const tile = await getTerrainTile({x: 795, y: 1594, z: 12});
// => { img: HTMLImageElement, width: 514, height: 514, tileSize: 512, buffer: 1 }

const imageData = readImageData(tile.img);
// => Uint8ClampedArray (RGBA pixels)

const elevations = decodeTerrainData(imageData);
// => Float32Array (elevation in meters)
```

**Node.js (terrain/fetch-tile-sharp.js):**
```js
import { getTerrainTile } from './terrain/fetch-tile-sharp.js';
// Returns tile with data already decoded to Float32Array
```

### Tile Hierarchy

**terrain/tile-hierarchy.js:**
```js
import { getTileSet, getParentTile, getQuadrant } from './terrain/tile-hierarchy.js';

// Get parent tile coordinates
const parent = getParentTile(795, 1594, 12);
// => {x: 397, y: 797, z: 11}

// Get quadrant within parent
const quad = getQuadrant(795, 1594);
// => 'ne' (northeast)

// Get all tiles needed for hierarchical computation
const tiles = getTileSet({x: 795, y: 1594, z: 12});
// => [
//   {x: 795, y: 1594, z: 12, role: 'target'},
//   {x: 397, y: 797, z: 11, role: 'parent-base'},
//   {x: 398, y: 797, z: 11, role: 'parent-east'},
//   {x: 397, y: 796, z: 11, role: 'parent-north'},
//   {x: 398, y: 796, z: 11, role: 'parent-ne'}
// ]
```

### Tile Caching

**terrain/tile-cache.js:**
```js
import { TileDataCache } from './terrain/tile-cache.js';

const cache = new TileDataCache({
  maxTiles: 100,
  maxBytes: 100 * 1024 * 1024 // 100MB
});

// Get or fetch tile
const data = await cache.get({x: 795, y: 1594, z: 12}, async () => {
  const tile = await getTerrainTile({x: 795, y: 1594, z: 12});
  const imageData = readImageData(tile.img);
  const elevations = decodeTerrainData(imageData);
  return { data: elevations, width: tile.width, height: tile.height, tileSize: tile.tileSize };
});

cache.getStats(); // => {size: 1, calculatedSize: 1056784}
```

**terrain/buffer-cache.js:**
```js
import { BufferCache } from './terrain/buffer-cache.js';

const bufferCache = new BufferCache(device, {maxBuffers: 50});

const buffer = bufferCache.getOrCreate('tile-key', () => {
  return device.createBuffer({...});
});

bufferCache.destroy(); // Clean up all buffers
```

### WebGPU Pipeline

**terrain/compute/webgpu-context.js:**
```js
import { createWebGPUContext, isWebGPUAvailable } from './terrain/compute/webgpu-context.js';

if (isWebGPUAvailable()) {
  const { adapter, device } = await createWebGPUContext();
  // Use device...
  invalidation.then(() => device.destroy());
}
```

**terrain/compute/pipeline.js:**
```js
import { createLightingPipeline } from './terrain/compute/pipeline.js';

const { pipeline, bindGroupLayout } = createLightingPipeline(device, {
  tileSize: 512,
  tileBuffer: 1
});
```

**terrain/compute/execute.js:**
```js
import { computeTileLighting } from './terrain/compute/execute.js';

const result = await computeTileLighting({
  device,
  pipeline,
  bindGroupLayout,
  terrainData: bufferedData, // Float32Array of size (tileSize+2*buffer)²
  tileSize: 512,
  pixelSize: 19.109 // meters per pixel at this zoom
});
// => Float32Array of lighting values [0,1]
```

**Or use the unified API:**
```js
import { computeLighting } from './terrain/index.js';

const result = await computeLighting({device, x: 795, y: 1594, z: 12});
// Handles fetching, buffering, pipeline creation, and computation
```

## CLI Usage

Compute terrain lighting from command line:

```bash
# Simple lighting
cd terrain
node cli.js --x=795 --y=1594 --z=12 --output=result.png

# LSAO with multiple levels
node cli.js --x=795 --y=1594 --z=12 --algorithm=lsao --levels=2 --output=lsao.png
```

**Options:**
- `--x`, `--y`, `--z` - Tile coordinates (required)
- `--output` - Output filename (default: output.png)
- `--algorithm` - Algorithm: 'lighting' or 'lsao' (default: lighting)
- `--levels` - Number of parent levels for LSAO: 1-4 (default: 1)

**Requirements:** WebGPU in Node.js (uses `webgpu` package with native bindings)

## Testing

### CLI Testing

```bash
cd terrain

# Run tests
node test/compute-simple.mjs         # Full pipeline test
node test/fetch-and-visualize.mjs   # Elevation visualization
node test/test-lsao.mjs             # LSAO computation

# Run CLI
node cli.js --x=795 --y=1594 --z=12
```

### Browser Testing

```bash
# From repository root
npm start
```

Open the notebook in browser to see WebGPU computation and visualization.

### Building the Bundle

```bash
cd terrain
npm install  # Install dependencies including esbuild
npm run build  # Creates dist/terrain.js
```

## Data Structures

**Tile Coordinates:**
```typescript
{x: number, y: number, z: number}
```

**Tile Data:**
```typescript
{
  data: Float32Array,    // Decoded elevations in meters
  width: number,         // Image width including buffer
  height: number,        // Image height including buffer
  tileSize: number       // Core tile size (e.g., 512)
}
```

**Tile Set Item:**
```typescript
{
  x: number,
  y: number,
  z: number,
  role: 'target' | 'parent-base' | 'parent-north' | 'parent-south' |
        'parent-east' | 'parent-west' | 'parent-nw' | 'parent-ne' |
        'parent-sw' | 'parent-se'
}
```

## Shader Details

The lighting shader (terrain/compute/shaders.js) computes surface normals using central differences and applies directional lighting:

- Input: Buffered terrain data `(tileSize + 2*buffer)²`
- Output: Lighting values `[0,1]` for each pixel
- Workgroup size: 16×16
- Light direction: Northwest at 45° elevation
- Includes ambient term (0.2) to prevent pure black

The LSAO shader (terrain/compute/lsao-shaders.js) implements line-sweep ambient occlusion with multi-level parent tile support.

## Building and Bundling

The terrain module can be built into a standalone ESM bundle for use in notebooks:

```bash
cd terrain
npm install
npm run build
```

This creates `dist/terrain.js` which includes all dependencies except Node.js-only packages (sharp, webgpu). The bundle exports:

- `computeLighting()` - High-level API
- All data APIs (getTerrainTile, getTileSet, etc.)
- All compute APIs (createLightingPipeline, computeLSAO, etc.)
- Cache classes (TileDataCache, BufferCache)

## Future Work

1. **GPU buffer caching integration**: Use BufferCache in execute.js for better performance
2. **Multi-tile computation**: Batch process multiple tiles efficiently
3. **Adaptive quality**: Adjust LSAO levels based on zoom/performance
4. **Tile preloading**: Predictive cache warming for smooth panning
