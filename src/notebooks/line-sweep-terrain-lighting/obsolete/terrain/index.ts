/**
 * Terrain Lighting - Unified API
 *
 * This module provides a high-level API for terrain tile fetching and
 * WebGPU-accelerated lighting computation.
 *
 * Usage (Browser):
 *   import { computeLighting } from './terrain/index.js';
 *   const result = await computeLighting({
 *     device,
 *     x: 795,
 *     y: 1594,
 *     z: 12
 *   });
 *
 * Usage (Node.js):
 *   See cli.js for command-line usage
 */

// Re-export data APIs
export {
  getTerrainTile,
  getSatelliteTile,
  readImageData,
  decodeTerrainData
} from './data/main.js';

export {
  getTileSet,
  getParentTile,
  getQuadrant
} from './data/tile-hierarchy.js';

export {
  TileDataCache
} from './data/tile-cache.js';

export {
  BufferCache
} from './data/buffer-cache.js';

export {
  getParentTilesAtLevel,
  assembleParentTileBufferMultiLevel
} from './data/parent-tile-assembly-multi-level.js';

// Re-export compute APIs
export {
  createWebGPUContext,
  isWebGPUAvailable
} from './compute/webgpu-context.js';

export {
  createLightingPipeline
} from './compute/pipeline.js';

export {
  computeTileLighting
} from './compute/execute.js';

export {
  createLSAOPipeline,
  calculateLevelInfo
} from './compute/lsao-pipeline.js';

export {
  computeLSAO
} from './compute/lsao-execute.js';

export {
  createSimpleLSAOPipeline
} from './compute/lsao-simple-pipeline.js';

export {
  computeSimpleLSAO
} from './compute/lsao-simple-execute.js';

// Re-export CPU implementations
export {
  computeSimpleLSAOCPU
} from './compute/lsao-simple-cpu.js';

export {
  computeLSAOCPU
} from './compute/lsao-cpu.js';

/**
 * High-level function to compute terrain lighting for a tile
 *
 * @param {Object} options
 * @param {GPUDevice} options.device - WebGPU device
 * @param {number} options.x - Tile X coordinate
 * @param {number} options.y - Tile Y coordinate
 * @param {number} options.z - Tile zoom level
 * @param {string} [options.algorithm='lighting'] - 'lighting' or 'lsao'
 * @param {number} [options.numLevels=1] - Number of parent levels for LSAO (1-4)
 * @returns {Promise<{data: Float32Array, width: number, height: number}>}
 */
export async function computeLighting({
  device,
  x,
  y,
  z,
  algorithm = 'lighting',
  numLevels = 1
}: {
  device: GPUDevice;
  x: number;
  y: number;
  z: number;
  algorithm?: string;
  numLevels?: number;
}): Promise<{ data: Float32Array; width: number; height: number }> {
  const { getTerrainTile, readImageData, decodeTerrainData } = await import('./data/main.js');

  // Fetch target tile
  const tile = await getTerrainTile({ x, y, z }) as any;
  const imageData = readImageData(tile.img);
  const elevations = decodeTerrainData(imageData);

  const tileSize = tile.tileSize as number;
  const buffer = tile.buffer as number;

  // Calculate pixel size
  const EARTH_CIRCUMFERENCE = 40075017; // meters at equator
  const pixelSize = EARTH_CIRCUMFERENCE / tileSize / Math.pow(2, z);

  if (algorithm === 'lsao' && numLevels > 1) {
    // Multi-level LSAO computation
    const { getParentTilesAtLevel, assembleParentTileBufferMultiLevel } =
      await import('./data/parent-tile-assembly-multi-level.js');
    const { createLSAOPipeline, calculateLevelInfo } = await import('./compute/lsao-pipeline.js');
    const { computeLSAO } = await import('./compute/lsao-execute.js');

    const targetTile = { x, y, z };

    // Prepare target data (no buffering needed, use tile as-is)
    const bufferedSize = tileSize + 2 * buffer;
    const targetData = elevations;

    // Fetch and assemble parent levels
    const parentLevels = [];
    const levelInfo = [];

    for (let level = 0; level < numLevels; level++) {
      const deltaZ = -(level + 1);

      // Get parent tile coordinates
      const parentTileCoords = getParentTilesAtLevel(targetTile, deltaZ);

      // Fetch parent tiles
      const parentTiles = await Promise.all(
        parentTileCoords.map(async coords => {
          const ptile = await getTerrainTile(coords) as any;
          const pImageData = readImageData(ptile.img);
          const pElevations = decodeTerrainData(pImageData);
          return {
            data: pElevations,
            width: ptile.width as number,
            height: ptile.height as number,
            tileSize: ptile.tileSize as number,
            role: coords.role
          };
        })
      );

      // Assemble parent buffer
      const assembled = assembleParentTileBufferMultiLevel({
        targetTile,
        parentTiles,
        deltaZ,
        tileSize
      });

      parentLevels.push(assembled.buffer);
      levelInfo.push(calculateLevelInfo(deltaZ, tileSize, assembled.targetOffset));
    }

    // Create LSAO pipeline
    const { pipeline, bindGroupLayout } = createLSAOPipeline(device, {
      tileSize,
      tileBuffer: buffer,
      numLevels
    });

    // Compute LSAO
    const result = await computeLSAO({
      device,
      pipeline,
      bindGroupLayout,
      targetData,
      parentLevels,
      levelInfo,
      tileSize,
      pixelSize
    });

    return {
      data: result,
      width: tileSize,
      height: tileSize
    };

  } else {
    // Simple lighting computation
    const { createLightingPipeline } = await import('./compute/pipeline.js');
    const { computeTileLighting } = await import('./compute/execute.js');

    // Prepare buffered data (simple edge replication)
    const bufferedSize = tileSize + 2 * buffer;
    const bufferedData = new Float32Array(bufferedSize * bufferedSize);

    // Copy tile with buffer
    for (let cy = 0; cy < tileSize; cy++) {
      for (let cx = 0; cx < tileSize; cx++) {
        const srcIdx = (cy + buffer) * tile.width + (cx + buffer);
        const dstIdx = (cy + buffer) * bufferedSize + (cx + buffer);
        bufferedData[dstIdx] = elevations[srcIdx];
      }
    }

    // Replicate edges
    for (let cx = 0; cx < bufferedSize; cx++) {
      bufferedData[cx] = bufferedData[bufferedSize + cx];
      bufferedData[(bufferedSize - 1) * bufferedSize + cx] =
        bufferedData[(bufferedSize - 2) * bufferedSize + cx];
    }
    for (let cy = 0; cy < bufferedSize; cy++) {
      bufferedData[cy * bufferedSize] = bufferedData[cy * bufferedSize + 1];
      bufferedData[cy * bufferedSize + (bufferedSize - 1)] =
        bufferedData[cy * bufferedSize + (bufferedSize - 2)];
    }

    // Create pipeline
    const { pipeline, bindGroupLayout } = createLightingPipeline(device, {
      tileSize,
      tileBuffer: buffer
    });

    // Compute lighting
    const result = await computeTileLighting({
      device,
      pipeline,
      bindGroupLayout,
      terrainData: bufferedData,
      tileSize,
      pixelSize
    });

    return {
      data: result,
      width: tileSize,
      height: tileSize
    };
  }
}
