#!/usr/bin/env node

/**
 * CLI tool to compute terrain lighting for a tile
 *
 * Usage:
 *   node compute-tile.mjs --x=795 --y=1594 --z=12 --output=result.png
 */

import { parseArgs } from 'node:util';
import { getTileSet } from '../terrain/tile-hierarchy.js';
import { getTerrainTile, readImageData, decodeTerrainData } from '../terrain/fetch-tile-node.js';
import { TileDataCache } from '../terrain/tile-cache.js';
import { BufferCache } from '../terrain/buffer-cache.js';
import { createWebGPUContext } from '../compute/webgpu-context.js';
import { createLightingPipeline } from '../compute/pipeline.js';
import { computeTileLighting } from '../compute/execute.js';
import { saveAsImage, getStats } from './save-image.js';

/**
 * Calculate pixel size in meters for a given zoom level
 * Based on Web Mercator projection
 *
 * @param {number} z - Zoom level
 * @returns {number} Pixel size in meters
 */
function calculatePixelSize(z) {
  const EARTH_CIRCUMFERENCE = 40075017; // meters at equator
  const tileSize = 512;
  return EARTH_CIRCUMFERENCE / tileSize / Math.pow(2, z);
}

/**
 * Assemble terrain data with parent tile boundaries
 *
 * Takes the target tile and parent tiles, creates a buffered terrain array
 * where the center is the target tile and edges are filled with parent tile data.
 *
 * For now, this is a simplified version that just uses the target tile with
 * edge replication for boundaries. Full hierarchical assembly to be implemented.
 *
 * @param {Array} tiles - Tile set from getTileSet()
 * @param {TileDataCache} cache - Tile data cache
 * @param {number} tileSize - Target tile size (512)
 * @param {number} buffer - Buffer size (1)
 * @returns {Float32Array} Buffered terrain data
 */
function assembleTerrainData(tiles, cache, tileSize, buffer) {
  // Find target tile
  const targetTile = tiles.find(t => t.role === 'target');
  if (!targetTile) {
    throw new Error('No target tile in tile set');
  }

  const targetData = cache.cache.get(cache.getCacheKey(targetTile));
  if (!targetData) {
    throw new Error('Target tile not in cache');
  }

  // For now, create buffered array with edge replication
  // TODO: Use parent tiles for boundary data
  const bufferedSize = tileSize + 2 * buffer;
  const bufferedData = new Float32Array(bufferedSize * bufferedSize);

  // Copy target tile to center
  for (let y = 0; y < tileSize; y++) {
    for (let x = 0; x < tileSize; x++) {
      const srcIdx = (y + targetData.tileSize === tileSize ? 0 : targetData.buffer) * targetData.width +
                      (x + (targetData.tileSize === tileSize ? 0 : targetData.buffer));
      const dstIdx = (y + buffer) * bufferedSize + (x + buffer);
      bufferedData[dstIdx] = targetData.data[srcIdx];
    }
  }

  // Replicate edges for boundaries (simple approach)
  // Top and bottom edges
  for (let x = 0; x < bufferedSize; x++) {
    bufferedData[x] = bufferedData[bufferedSize + x]; // Top
    bufferedData[(bufferedSize - 1) * bufferedSize + x] =
      bufferedData[(bufferedSize - 2) * bufferedSize + x]; // Bottom
  }

  // Left and right edges
  for (let y = 0; y < bufferedSize; y++) {
    bufferedData[y * bufferedSize] = bufferedData[y * bufferedSize + 1]; // Left
    bufferedData[y * bufferedSize + (bufferedSize - 1)] =
      bufferedData[y * bufferedSize + (bufferedSize - 2)]; // Right
  }

  return bufferedData;
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
      output: { type: 'string', short: 'o', default: 'output.png' }
    }
  });

  if (!values.x || !values.y || !values.z) {
    console.error('Usage: compute-tile.mjs --x=<x> --y=<y> --z=<z> [--output=<filename>]');
    process.exit(1);
  }

  const coords = {
    x: parseInt(values.x),
    y: parseInt(values.y),
    z: parseInt(values.z)
  };

  console.log(`Computing lighting for tile ${coords.z}/${coords.x}/${coords.y}`);

  // Initialize tile cache
  const dataCache = new TileDataCache();

  // Get tile hierarchy
  const tiles = getTileSet(coords);
  console.log(`Fetching ${tiles.length} tiles:`);
  tiles.forEach(t => console.log(`  ${t.role}: ${t.z}/${t.x}/${t.y}`));

  // Fetch all tiles
  for (const tile of tiles) {
    console.log(`Fetching ${tile.role}...`);
    await dataCache.get(tile, async () => {
      const { img, tileSize, buffer } = await getTerrainTile(tile);
      const imageData = readImageData(img);
      const data = decodeTerrainData(imageData);
      return { data, width: img.width, height: img.height, tileSize, buffer };
    });
  }

  console.log('All tiles fetched');

  // Note: WebGPU in Node.js requires additional setup
  // For now, this will error - browser implementation works
  console.log('\nNote: WebGPU compute requires browser or @webgpu/dawn bindings');
  console.log('Skipping WebGPU computation in Node.js for now');
  console.log('Use browser notebook for visualization\n');

  // Assemble terrain data (for testing the assembly logic)
  const tileSize = 512;
  const buffer = 1;
  const terrainData = assembleTerrainData(tiles, dataCache, tileSize, buffer);
  console.log(`Assembled terrain data: ${terrainData.length} values`);

  const stats = getStats(terrainData);
  console.log(`Elevation stats: min=${stats.min.toFixed(1)}m, max=${stats.max.toFixed(1)}m, mean=${stats.mean.toFixed(1)}m`);

  // TODO: WebGPU computation when @webgpu/dawn is available
  // For now, create a placeholder result
  const result = new Float32Array(tileSize * tileSize);
  for (let i = 0; i < result.length; i++) {
    result[i] = 0.5; // Placeholder
  }

  await saveAsImage(result, tileSize, values.output);
  console.log(`\nSaved placeholder to ${values.output}`);
  console.log('(Actual lighting computation requires WebGPU in browser)');
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
