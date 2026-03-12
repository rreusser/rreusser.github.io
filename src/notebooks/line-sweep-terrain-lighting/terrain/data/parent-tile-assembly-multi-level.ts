/**
 * Multi-level parent tile assembly for hierarchical terrain algorithms
 *
 * Supports arbitrary zoom level differences (delta_z) from the target tile.
 * Assembles parent tiles to cover maximum area guaranteed by 2×2 parent tiles.
 */

import { getQuadrant } from './tile-hierarchy.js';
import type { TileCoords, TileWithRole, AssembledParentTile, TerrainTile, Quadrant } from './types.js';

/**
 * Get parent tiles needed at a specific zoom level
 */
export function getParentTilesAtLevel(targetTile: TileCoords, deltaZ: number): TileWithRole[] {
  const { x, y, z } = targetTile;

  if (deltaZ >= 0) {
    throw new Error("deltaZ must be negative (parent zoom levels)");
  }

  const parentZ = z + deltaZ; // e.g., z=12, deltaZ=-2 → parentZ=10

  if (parentZ < 0) {
    throw new Error(`Parent zoom level ${parentZ} is invalid (must be >= 0)`);
  }

  // Calculate which parent tile contains the target
  // Each level up, coordinates are divided by 2
  const stepsUp = Math.abs(deltaZ);
  const divisor = Math.pow(2, stepsUp);

  const parentX = Math.floor(x / divisor);
  const parentY = Math.floor(y / divisor);

  // Determine which quadrant the target is in at this parent level
  // This tells us which of the 2×2 parent tiles the target falls into
  const quadrantX = Math.floor((x / divisor - parentX) * 2); // 0 or 1
  const quadrantY = Math.floor((y / divisor - parentY) * 2); // 0 or 1

  const tiles = [];

  // Base parent (contains target)
  tiles.push({
    x: parentX,
    y: parentY,
    z: parentZ,
    role: 'parent-base'
  });

  // Adjacent parents based on quadrant
  const maxCoord = Math.pow(2, parentZ) - 1;

  // Horizontal neighbor
  if (quadrantX === 0 && parentX > 0) {
    tiles.push({ x: parentX - 1, y: parentY, z: parentZ, role: 'parent-west' });
  } else if (quadrantX === 1 && parentX < maxCoord) {
    tiles.push({ x: parentX + 1, y: parentY, z: parentZ, role: 'parent-east' });
  }

  // Vertical neighbor
  if (quadrantY === 0 && parentY > 0) {
    tiles.push({ x: parentX, y: parentY - 1, z: parentZ, role: 'parent-north' });
  } else if (quadrantY === 1 && parentY < maxCoord) {
    tiles.push({ x: parentX, y: parentY + 1, z: parentZ, role: 'parent-south' });
  }

  // Diagonal neighbor
  if (quadrantX === 0 && quadrantY === 0 && parentX > 0 && parentY > 0) {
    tiles.push({ x: parentX - 1, y: parentY - 1, z: parentZ, role: 'parent-nw' });
  } else if (quadrantX === 1 && quadrantY === 0 && parentX < maxCoord && parentY > 0) {
    tiles.push({ x: parentX + 1, y: parentY - 1, z: parentZ, role: 'parent-ne' });
  } else if (quadrantX === 0 && quadrantY === 1 && parentX > 0 && parentY < maxCoord) {
    tiles.push({ x: parentX - 1, y: parentY + 1, z: parentZ, role: 'parent-sw' });
  } else if (quadrantX === 1 && quadrantY === 1 && parentX < maxCoord && parentY < maxCoord) {
    tiles.push({ x: parentX + 1, y: parentY + 1, z: parentZ, role: 'parent-se' });
  }

  return tiles;
}

interface ParentTileWithRole extends TerrainTile {
  role: string;
}

interface AssembleParams {
  targetTile: TileCoords;
  parentTiles: ParentTileWithRole[];
  deltaZ: number;
  tileSize?: number;
}

/**
 * Assemble parent tiles at any zoom level into optimal coverage buffer
 */
export function assembleParentTileBufferMultiLevel({
  targetTile,
  parentTiles,
  deltaZ,
  tileSize = 512
}: AssembleParams): AssembledParentTile {
  if (deltaZ >= 0) {
    throw new Error("deltaZ must be negative");
  }

  const stepsUp = Math.abs(deltaZ);
  const scale = Math.pow(2, stepsUp); // How many target pixels per parent pixel

  // Assembly size: always 2×2 parent tiles = 1024×1024 at parent resolution
  const assemblySize = 1024;
  const assembly = new Float32Array(assemblySize * assemblySize);

  // Output buffer size: tileSize * (1 + 2^delta_z)
  const outputSize = Math.floor(tileSize * (1 + Math.pow(2, deltaZ)));

  // Map parent tiles by role
  const roleMap = new Map(parentTiles.map(t => [t.role, t]));

  // Calculate target's position at parent level
  const { x, y, z } = targetTile;
  const parentZ = z + deltaZ;
  const parentX = Math.floor(x / scale);
  const parentY = Math.floor(y / scale);

  // Determine quadrant at parent level
  const quadrantX = Math.floor((x / scale - parentX) * 2);
  const quadrantY = Math.floor((y / scale - parentY) * 2);

  const quadrantNames: Quadrant[][] = [
    ['nw', 'ne'],
    ['sw', 'se']
  ];
  const quadrant = quadrantNames[quadrantY][quadrantX];

  // Get grid layout for this quadrant
  const gridLayout = getGridLayoutMultiLevel(quadrant);

  // Copy each parent tile into assembly
  console.log(`\n[DEBUG] Copying tiles to assembly:`);
  for (const [role, position] of Object.entries(gridLayout)) {
    const tile = roleMap.get(role);
    if (!tile) {
      console.log(`  ${role}: MISSING (position would be (${position.x}, ${position.y}))`);
      continue;
    }

    console.log(`  ${role}: copying to position (${position.x}, ${position.y})`);
    copyTileToAssembly(tile, assembly, position, assemblySize);
  }

  // Calculate target size at parent resolution (needed for extraction)
  const targetSizeAtParent = tileSize / scale;

  // Calculate where target actually is in the assembly
  const gridPos = gridLayout['parent-base'];
  const targetPosInParentBase = getTargetPositionInParentTile(targetTile, deltaZ, tileSize);
  const targetPosInAssembly = {
    x: gridPos.x + targetPosInParentBase.x,
    y: gridPos.y + targetPosInParentBase.y
  };

  console.log(`[DEBUG] Assembly details:`);
  console.log(`  Quadrant: ${quadrant}`);
  console.log(`  parent-base position in assembly: (${gridPos.x}, ${gridPos.y})`);
  console.log(`  Target position in parent-base: (${targetPosInParentBase.x}, ${targetPosInParentBase.y})`);
  console.log(`  Target position in assembly: (${targetPosInAssembly.x}, ${targetPosInAssembly.y})`);
  console.log(`  Target size at parent: ${targetSizeAtParent}`);

  // Extract centered region
  const extractionOffset = getExtractionOffsetMultiLevel(targetPosInAssembly, targetSizeAtParent, outputSize);
  console.log(`  Extraction offset: (${extractionOffset.x}, ${extractionOffset.y})`);
  console.log(`  Target position in output: (${targetPosInAssembly.x - extractionOffset.x}, ${targetPosInAssembly.y - extractionOffset.y})`);

  const output = new Float32Array(outputSize * outputSize);

  for (let y = 0; y < outputSize; y++) {
    for (let x = 0; x < outputSize; x++) {
      const srcX = x + extractionOffset.x;
      const srcY = y + extractionOffset.y;
      const srcIdx = srcY * assemblySize + srcX;
      const dstIdx = y * outputSize + x;
      output[dstIdx] = assembly[srcIdx];
    }
  }

  // Calculate target tile offset in output buffer
  // This is where the target actually ends up after extraction
  const targetOffsetInOutput: [number, number] = [
    targetPosInAssembly.x - extractionOffset.x,
    targetPosInAssembly.y - extractionOffset.y
  ];

  console.log(`  Returning targetOffset: [${targetOffsetInOutput[0]}, ${targetOffsetInOutput[1]}]`);

  return {
    buffer: output,
    size: outputSize,
    targetOffset: targetOffsetInOutput,
    scale: scale,
    targetSizeAtParent: targetSizeAtParent
  };
}

interface GridPosition {
  x: number;
  y: number;
}

/**
 * Get grid layout for parent tiles (same as single-level)
 */
function getGridLayoutMultiLevel(quadrant: Quadrant): Record<string, GridPosition> {
  switch (quadrant) {
    case 'nw':
      return {
        'parent-nw': { x: 0, y: 0 },
        'parent-north': { x: 512, y: 0 },
        'parent-west': { x: 0, y: 512 },
        'parent-base': { x: 512, y: 512 }
      };
    case 'ne':
      return {
        'parent-north': { x: 0, y: 0 },
        'parent-ne': { x: 512, y: 0 },
        'parent-base': { x: 0, y: 512 },
        'parent-east': { x: 512, y: 512 }
      };
    case 'sw':
      return {
        'parent-west': { x: 0, y: 0 },
        'parent-base': { x: 512, y: 0 },
        'parent-sw': { x: 0, y: 512 },
        'parent-south': { x: 512, y: 512 }
      };
    case 'se':
      return {
        'parent-base': { x: 0, y: 0 },
        'parent-east': { x: 512, y: 0 },
        'parent-south': { x: 0, y: 512 },
        'parent-se': { x: 512, y: 512 }
      };
    default:
      throw new Error(`Unknown quadrant: ${quadrant}`);
  }
}

/**
 * Copy tile interior to assembly
 */
function copyTileToAssembly(
  tile: ParentTileWithRole,
  assembly: Float32Array,
  position: GridPosition,
  assemblySize: number
): void {
  const tileSize = tile.tileSize;
  const buffer = 1;

  for (let y = 0; y < tileSize; y++) {
    for (let x = 0; x < tileSize; x++) {
      const srcX = x + buffer;
      const srcY = y + buffer;
      const srcIdx = srcY * tile.width + srcX;

      const dstX = position.x + x;
      const dstY = position.y + y;
      const dstIdx = dstY * assemblySize + dstX;

      assembly[dstIdx] = tile.data[srcIdx];
    }
  }
}

/**
 * Get target position within parent-base tile
 *
 * Calculates the exact position based on the target's fractional coordinates
 * within the parent tile, not just the quadrant.
 */
function getTargetPositionInParentTile(
  targetTile: TileCoords,
  deltaZ: number,
  tileSize: number
): GridPosition {
  const { x, y } = targetTile;
  const scale = Math.pow(2, Math.abs(deltaZ));

  // Calculate which parent tile contains the target
  const parentX = Math.floor(x / scale);
  const parentY = Math.floor(y / scale);

  // Calculate fractional position within parent tile
  const fracX = (x / scale) - parentX;
  const fracY = (y / scale) - parentY;

  // Convert to pixel position (parent tile is 512×512)
  const posX = fracX * tileSize;
  const posY = fracY * tileSize;

  return { x: posX, y: posY };
}

/**
 * Get extraction offset to center target in output buffer
 *
 * Calculates the extraction offset to ensure the target is always centered
 * in the output buffer at position (outputSize/2 - targetSize/2, outputSize/2 - targetSize/2).
 */
function getExtractionOffsetMultiLevel(
  targetPosInAssembly: GridPosition,
  targetSizeAtParent: number,
  outputSize: number
): GridPosition {
  // We want the target to be centered in the output buffer
  // Center position in output: (outputSize/2 - targetSize/2, outputSize/2 - targetSize/2)
  const targetCenterInOutput = {
    x: outputSize / 2 - targetSizeAtParent / 2,
    y: outputSize / 2 - targetSizeAtParent / 2
  };

  // Extraction offset = target position in assembly - desired position in output
  return {
    x: targetPosInAssembly.x - targetCenterInOutput.x,
    y: targetPosInAssembly.y - targetCenterInOutput.y
  };
}
