/**
 * Test Multi-Level LSAO Implementation
 *
 * Tests the new multi-level LSAO system with 1, 2, and 3 parent levels.
 * Validates:
 * 1. Single-level (regression test against old implementation)
 * 2. Two-level (deltaZ=-1, -2)
 * 3. Three-level (deltaZ=-1, -2, -3)
 */

import { getTerrainTile } from '../data/fetch-tile-sharp.js';
import { getParentTilesAtLevel, assembleParentTileBufferMultiLevel } from '../data/parent-tile-assembly-multi-level.js';
import { createWebGPUContext } from '../data/webgpu-context-node.js';
import { createLSAOPipeline, calculateLevelInfo } from '../compute/lsao-pipeline.js';
import { computeLSAO } from '../compute/lsao-execute.js';
import { saveAsImage, getStats } from '../data/save-image-node.js';

async function testMultiLevelLSAO() {
  console.log('=== Multi-Level LSAO Test ===\n');

  // Test tile (Mount Shasta area)
  const targetTile = { x: 795, y: 1594, z: 12 };
  console.log(`Target tile: z=${targetTile.z}, x=${targetTile.x}, y=${targetTile.y}\n`);

  // Fetch target tile
  console.log('Fetching target tile...');
  const targetTileData = await getTerrainTile(targetTile);
  console.log(`✓ Fetched target tile (${targetTileData.width}×${targetTileData.height})\n`);

  // Initialize WebGPU
  console.log('Initializing WebGPU...');
  const { device } = await createWebGPUContext();
  console.log('✓ WebGPU context created\n');

  const EARTH_CIRCUMFERENCE = 40075017;
  const pixelSize = EARTH_CIRCUMFERENCE / 512 / Math.pow(2, targetTile.z);

  // Test configurations
  const tests = [
    { name: 'Single-level', deltaZLevels: [-1] },
    { name: 'Two-level', deltaZLevels: [-1, -2] },
    { name: 'Three-level', deltaZLevels: [-1, -2, -3] }
  ];

  for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TEST: ${test.name} (${test.deltaZLevels.join(', ')})`);
    console.log('='.repeat(60));

    // Fetch and assemble parent tiles for each level
    console.log('\nFetching parent tiles...');
    const parentLevels = [];
    const levelInfo = [];

    for (const deltaZ of test.deltaZLevels) {
      const parentTileCoords = getParentTilesAtLevel(targetTile, deltaZ);
      console.log(`  Level ${deltaZ}: fetching ${parentTileCoords.length} tiles at z=${targetTile.z + deltaZ}`);

      const parentTiles = await Promise.all(
        parentTileCoords.map(async (coords) => {
          const tile = await getTerrainTile(coords);
          return {
            data: tile.data,
            width: tile.width,
            height: tile.height,
            tileSize: tile.tileSize,
            role: coords.role
          };
        })
      );

      const assembled = assembleParentTileBufferMultiLevel({
        targetTile,
        parentTiles,
        deltaZ,
        tileSize: 512
      });

      parentLevels.push(assembled.buffer);

      // CRITICAL: Pass targetOffset from assembly to level info
      const info = calculateLevelInfo(deltaZ, 512, assembled.targetOffset);
      levelInfo.push(info);

      console.log(`  ✓ Assembled ${assembled.size}×${assembled.size} buffer`);
      console.log(`    Target offset: [${assembled.targetOffset[0]}, ${assembled.targetOffset[1]}]`);
      console.log(`    Coverage: [${info.coverageMin[0].toFixed(2)}, ${info.coverageMin[1].toFixed(2)}] to [${info.coverageMax[0].toFixed(2)}, ${info.coverageMax[1].toFixed(2)}]`);
    }

    // Create pipeline with correct number of levels
    console.log('\nCreating pipeline...');
    const { pipeline, bindGroupLayout } = createLSAOPipeline(device, {
      tileSize: 512,
      tileBuffer: 1,
      numLevels: parentLevels.length,
      workgroupSize: 128
    });
    console.log(`✓ Pipeline created with ${parentLevels.length} level(s)`);

    // Compute LSAO
    console.log('\nComputing LSAO...');
    const startTime = performance.now();

    const aoData = await computeLSAO({
      device,
      pipeline,
      bindGroupLayout,
      targetData: targetTileData.data,
      parentLevels,
      levelInfo,
      tileSize: 512,
      pixelSize,
      workgroupSize: 128,
      directions: [[1, 0], [-1, 0], [0, 1], [0, -1]]
    });

    const elapsedTime = performance.now() - startTime;
    console.log(`✓ Computed in ${elapsedTime.toFixed(2)}ms`);

    // Statistics
    const stats = getStats(aoData);
    console.log(`\nResults:`);
    console.log(`  Range: [${stats.min.toFixed(4)}, ${stats.max.toFixed(4)}]`);
    console.log(`  Mean: ${stats.mean.toFixed(4)}`);

    // Save output
    const outputPath = `test/lsao-${test.name.toLowerCase().replace(' ', '-')}.png`;
    await saveAsImage(aoData, 512, outputPath);
    console.log(`✓ Saved to ${outputPath}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('All tests completed successfully!');
  console.log('='.repeat(60));
}

// Run tests
testMultiLevelLSAO().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
