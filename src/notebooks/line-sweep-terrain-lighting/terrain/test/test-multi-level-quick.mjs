/**
 * Quick test for multi-level parent assembly
 */

import { assembleParentTileBufferMultiLevel, getParentTilesAtLevel } from '../data/parent-tile-assembly-multi-level.js';

console.log('Testing multi-level parent assembly...\n');

// Test with synthetic data
const targetTile = { x: 1000, y: 2000, z: 12 };

for (const deltaZ of [-1, -2, -3]) {
  console.log(`\n=== Testing deltaZ = ${deltaZ} ===`);

  const parentTileCoords = getParentTilesAtLevel(targetTile, deltaZ);
  console.log(`Parent tiles needed: ${parentTileCoords.length}`);

  // Create synthetic parent tiles
  const parentTiles = parentTileCoords.map(coords => ({
    data: new Float32Array(514 * 514).fill(100),
    width: 514,
    height: 514,
    tileSize: 512,
    role: coords.role
  }));

  try {
    const result = assembleParentTileBufferMultiLevel({
      targetTile,
      parentTiles,
      deltaZ,
      tileSize: 512
    });

    console.log(`✓ Success!`);
    console.log(`  Output size: ${result.size}×${result.size}`);
    console.log(`  Target offset: [${result.targetOffset[0]}, ${result.targetOffset[1]}]`);
    console.log(`  Target size at parent: ${result.targetSizeAtParent}`);
    console.log(`  Scale: ${result.scale}`);
  } catch (err) {
    console.error(`✗ Failed:`, err.message);
    throw err;
  }
}

console.log('\n✓ All tests passed!');
