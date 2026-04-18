#!/usr/bin/env node

/**
 * CLI tool to compute terrain lighting for a tile
 *
 * Usage:
 *   node terrain/cli.js --x=795 --y=1594 --z=12 --output=result.png
 *   node terrain/cli.js --x=795 --y=1594 --z=12 --algorithm=lsao --levels=2
 */

import { parseArgs } from 'node:util';
import { getTerrainTile } from './data/fetch-tile-sharp.js';
import { createWebGPUContext } from './data/webgpu-context-node.js';
import { createLightingPipeline } from './compute/pipeline.js';
import { computeTileLighting } from './compute/execute.js';
import { createLSAOPipeline, calculateLevelInfo } from './compute/lsao-pipeline.js';
import { computeLSAO } from './compute/lsao-execute.js';
import { getParentTilesAtLevel, assembleParentTileBufferMultiLevel } from './data/parent-tile-assembly-multi-level.js';
import { saveAsImage, getStats } from './data/save-image-node.js';

/**
 * Calculate pixel size in meters for a given zoom level
 *
 * @param {number} z - Zoom level
 * @returns {number} Pixel size in meters
 */
function calculatePixelSize(z: number): number {
  const EARTH_CIRCUMFERENCE = 40075017; // meters at equator
  const tileSize = 512;
  return EARTH_CIRCUMFERENCE / tileSize / Math.pow(2, z);
}

/**
 * Main function
 */
async function main() {
  // Parse command-line arguments
  const { values } = parseArgs({
    options: {
      x: { type: 'string', short: 'x' },
      y: { type: 'string', short: 'y' },
      z: { type: 'string', short: 'z' },
      output: { type: 'string', short: 'o', default: 'output.png' },
      algorithm: { type: 'string', default: 'lighting' },
      levels: { type: 'string', default: '1' }
    }
  });

  if (!values.x || !values.y || !values.z) {
    console.error('Usage: cli.js --x=<x> --y=<y> --z=<z> [--output=<filename>] [--algorithm=lighting|lsao] [--levels=1-4]');
    process.exit(1);
  }

  const coords = {
    x: parseInt(values.x),
    y: parseInt(values.y),
    z: parseInt(values.z)
  };

  const algorithm = values.algorithm;
  const numLevels = parseInt(values.levels);

  if (algorithm === 'lsao' && (numLevels < 1 || numLevels > 4)) {
    console.error('Error: --levels must be 1-4');
    process.exit(1);
  }

  console.log(`Computing ${algorithm} for tile ${coords.z}/${coords.x}/${coords.y}`);
  if (algorithm === 'lsao') {
    console.log(`Using ${numLevels} parent level(s)`);
  }

  // Fetch target tile
  console.log('Fetching target tile...');
  const tile = await getTerrainTile(coords);
  const tileSize = tile.tileSize;
  const buffer = 1;
  const pixelSize = calculatePixelSize(coords.z);

  console.log(`Tile size: ${tileSize}×${tileSize}, pixel size: ${pixelSize.toFixed(2)}m`);

  // Initialize WebGPU
  console.log('Initializing WebGPU...');
  const { device } = await createWebGPUContext();

  let result;

  if (algorithm === 'lsao' && numLevels > 1) {
    // Multi-level LSAO computation
    console.log('Fetching parent tiles...');

    const parentLevels = [];
    const levelInfo = [];

    for (let level = 0; level < numLevels; level++) {
      const deltaZ = -(level + 1);
      console.log(`  Level ${level + 1}: deltaZ=${deltaZ}`);

      const parentTileCoords = getParentTilesAtLevel(coords, deltaZ);
      const parentTiles = await Promise.all(
        parentTileCoords.map(async pcoords => {
          const ptile = await getTerrainTile(pcoords);
          return {
            data: ptile.data,
            width: ptile.width,
            height: ptile.height,
            tileSize: ptile.tileSize,
            role: pcoords.role
          };
        })
      );

      const assembled = assembleParentTileBufferMultiLevel({
        targetTile: coords,
        parentTiles,
        deltaZ,
        tileSize
      });

      console.log(`    Assembled: ${assembled.size}×${assembled.size}, scale: ${assembled.scale}:1`);

      parentLevels.push(assembled.buffer);
      levelInfo.push(calculateLevelInfo(deltaZ, tileSize, assembled.targetOffset));
    }

    console.log('Creating LSAO pipeline...');
    const { pipeline, bindGroupLayout } = createLSAOPipeline(device, {
      tileSize,
      tileBuffer: buffer,
      numLevels
    });

    console.log('Computing LSAO...');
    result = await computeLSAO({
      device,
      pipeline,
      bindGroupLayout,
      targetData: tile.data,
      parentLevels,
      levelInfo,
      tileSize,
      pixelSize
    });

  } else {
    // Simple lighting computation
    console.log('Preparing buffered data...');
    const bufferedSize = tileSize + 2 * buffer;
    const bufferedData = new Float32Array(bufferedSize * bufferedSize);

    // Copy tile with buffer
    for (let cy = 0; cy < tileSize; cy++) {
      for (let cx = 0; cx < tileSize; cx++) {
        const srcIdx = (cy + buffer) * tile.width + (cx + buffer);
        const dstIdx = (cy + buffer) * bufferedSize + (cx + buffer);
        bufferedData[dstIdx] = tile.data[srcIdx];
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

    console.log('Creating lighting pipeline...');
    const { pipeline, bindGroupLayout } = createLightingPipeline(device, {
      tileSize,
      tileBuffer: buffer
    });

    console.log('Computing lighting...');
    result = await computeTileLighting({
      device,
      pipeline,
      bindGroupLayout,
      terrainData: bufferedData,
      tileSize,
      pixelSize
    });
  }

  // Get stats
  const stats = getStats(result);
  console.log(`Result stats: min=${stats.min.toFixed(3)}, max=${stats.max.toFixed(3)}, mean=${stats.mean.toFixed(3)}`);

  // Save result
  console.log(`Saving to ${values.output}...`);
  await saveAsImage(result, tileSize, values.output);

  console.log('Done!');

  // Force exit to avoid WebGPU cleanup segfault
  // This is a known issue with the webgpu package on Node.js
  process.exit(0);
}

main().catch(error => {
  console.error('Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
