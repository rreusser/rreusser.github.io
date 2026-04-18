# LSAO Compute Pipeline (TypeScript)

Multi-level Line-Sweep Ambient Occlusion computation using WebGPU.

## Building

```bash
npm install
npm run build
```

This will:
1. Compile TypeScript to generate `.d.ts` type declarations in `dist/compute/`
2. Bundle the JavaScript modules to `dist/*.js`

## Using the Built Modules

### JavaScript/Node.js

```javascript
import { createLSAOPipeline, computeLSAO, calculateLevelInfo } from './dist/lsao-execute.js';

// Create pipeline
const { pipeline, bindGroupLayout } = createLSAOPipeline(device, {
  tileSize: 512,
  tileBuffer: 1,
  numLevels: 2,
  workgroupSize: 128
});

// Calculate level info
const levelInfo = [
  calculateLevelInfo(-1, 512, [256, 256]),  // deltaZ=-1, targetOffset=[256,256]
  calculateLevelInfo(-2, 512, [256, 256])   // deltaZ=-2, targetOffset=[256,256]
];

// Compute LSAO
const aoData = await computeLSAO({
  device,
  pipeline,
  bindGroupLayout,
  targetData,      // Float32Array (514×514)
  parentLevels,    // [Float32Array (768×768), Float32Array (640×640)]
  levelInfo,
  tileSize: 512,
  pixelSize: 19.1
});
```

### TypeScript

The build generates full type declarations. Import with types:

```typescript
import {
  createLSAOPipeline,
  computeLSAO,
  calculateLevelInfo,
  type LevelInfo,
  type LSAOComputeParams
} from './dist/lsao-execute.js';

const levelInfo: LevelInfo[] = [
  calculateLevelInfo(-1, 512, [256, 256])
];

const params: LSAOComputeParams = {
  device,
  pipeline,
  bindGroupLayout,
  targetData,
  parentLevels,
  levelInfo,
  tileSize: 512,
  pixelSize: 19.1
};

const result = await computeLSAO(params);
```

## API

### `createLSAOPipeline(device, options)`

Creates a WebGPU compute pipeline for LSAO.

**Parameters:**
- `device: GPUDevice` - WebGPU device
- `options: LSAOPipelineOptions` (optional)
  - `tileSize?: number` - Target tile size (default: 512)
  - `tileBuffer?: number` - Buffer pixels on each edge (default: 1)
  - `numLevels?: number` - Number of parent levels 1-4 (default: 1)
  - `workgroupSize?: number` - Workgroup size (default: 128)

**Returns:** `LSAOPipeline`
- `pipeline: GPUComputePipeline`
- `bindGroupLayout: GPUBindGroupLayout`

### `calculateLevelInfo(deltaZ, tileSize, targetOffset)`

Calculates metadata for a parent level.

**Parameters:**
- `deltaZ: number` - Zoom level offset (e.g., -1, -2, -3, -4)
- `tileSize: number` - Target tile size (default: 512)
- `targetOffset: [number, number] | null` - Target position in buffer (optional, defaults to centered)

**Returns:** `LevelInfo`
- `bufferSize: number` - Buffer size in pixels
- `scale: number` - Scale factor (2^stepsUp)
- `coverageMin: [number, number]` - Coverage minimum in normalized coords
- `coverageMax: [number, number]` - Coverage maximum in normalized coords (exclusive)
- `targetOffset: [number, number]` - Target position in buffer pixels

### `computeLSAO(params)`

Computes multi-level LSAO for a tile.

**Parameters:** `LSAOComputeParams`
- `device: GPUDevice`
- `pipeline: GPUComputePipeline`
- `bindGroupLayout: GPUBindGroupLayout`
- `targetData: Float32Array` - Target tile data (buffered, e.g., 514×514)
- `parentLevels: Float32Array[]` - Parent buffer data (one per level)
- `levelInfo: LevelInfo[]` - Metadata for each level
- `tileSize: number` - Target tile size (512)
- `pixelSize: number` - Target pixel size in meters
- `workgroupSize?: number` - Workgroup size (default: 128)
- `directions?: [number, number][]` - Sweep directions (default: 4 cardinal directions)

**Returns:** `Promise<Float32Array>` - AO values [0,1] for each pixel (512×512)

## Type Definitions

All types are exported from the built modules:

```typescript
export interface LevelInfo {
  bufferSize: number;
  scale: number;
  coverageMin: [number, number];
  coverageMax: [number, number];
  targetOffset: [number, number];
}

export interface LSAOPipelineOptions {
  tileSize?: number;
  tileBuffer?: number;
  numLevels?: number;
  workgroupSize?: number;
}

export interface LSAOPipeline {
  pipeline: GPUComputePipeline;
  bindGroupLayout: GPUBindGroupLayout;
}

export interface LSAOComputeParams {
  device: GPUDevice;
  pipeline: GPUComputePipeline;
  bindGroupLayout: GPUBindGroupLayout;
  targetData: Float32Array;
  parentLevels: Float32Array[];
  levelInfo: LevelInfo[];
  tileSize: number;
  pixelSize: number;
  workgroupSize?: number;
  directions?: [number, number][];
}
```

## Development

- Source: `compute/*.ts`
- Built output: `dist/*.js` + `dist/compute/*.d.ts`
- Build: `npm run build`
- Clean: `npm run clean`
