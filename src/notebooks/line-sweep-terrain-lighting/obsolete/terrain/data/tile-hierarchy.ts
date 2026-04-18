/**
 * Tile hierarchy utilities for quadtree navigation
 *
 * In the tile quadtree:
 * - Each parent tile at zoom z contains 4 children at zoom z+1
 * - Parent (px, py, z) contains children:
 *   - (2*px, 2*py, z+1) - NW
 *   - (2*px+1, 2*py, z+1) - NE
 *   - (2*px, 2*py+1, z+1) - SW
 *   - (2*px+1, 2*py+1, z+1) - SE
 */

import type { TileCoords, TileWithRole, Quadrant } from './types.js';

/**
 * Get the parent tile coordinates at zoom level z-1
 */
export function getParentTile(x: number, y: number, z: number): TileCoords {
  if (z === 0) {
    throw new Error("Cannot get parent of root tile");
  }
  return {
    x: Math.floor(x / 2),
    y: Math.floor(y / 2),
    z: z - 1
  };
}

/**
 * Get which quadrant (NW/NE/SW/SE) a child tile occupies in its parent
 */
export function getQuadrant(x: number, y: number): Quadrant {
  const xEven = x % 2 === 0;
  const yEven = y % 2 === 0;

  if (xEven && yEven) return 'nw';
  if (!xEven && yEven) return 'ne';
  if (xEven && !yEven) return 'sw';
  return 'se';
}

/**
 * Get all tiles needed for hierarchical computation
 *
 * For a target tile at z/x/y, returns the target tile plus parent tiles
 * at z-1 that contain boundary data needed for edge handling.
 *
 * The target tile needs data from adjacent tiles for proper lighting
 * computation at boundaries. Rather than fetching all 8 adjacent tiles
 * at the same zoom level, we fetch parent tiles at z-1 which provide
 * lower-resolution boundary context.
 *
 */
export function getTileSet(target: TileCoords): TileWithRole[] {
  const { x, y, z } = target;

  if (z === 0) {
    // Root tile has no parents
    return [{ ...target, role: 'target' }];
  }

  const tiles = [{ x, y, z, role: 'target' }];

  // Get the immediate parent
  const parent = getParentTile(x, y, z);
  const quadrant = getQuadrant(x, y);

  // Determine which neighboring parents we need based on quadrant
  // We need parents that contain the tiles adjacent to our target

  const xEven = x % 2 === 0;
  const yEven = y % 2 === 0;

  // Add parent that contains the target
  tiles.push({ ...parent, role: 'parent-base' });

  // If target is in western half (x even), we need parent to the west
  // If target is in eastern half (x odd), we need parent to the east
  if (xEven && parent.x > 0) {
    tiles.push({ x: parent.x - 1, y: parent.y, z: parent.z, role: 'parent-west' });
  } else if (!xEven && parent.x < Math.pow(2, parent.z) - 1) {
    tiles.push({ x: parent.x + 1, y: parent.y, z: parent.z, role: 'parent-east' });
  }

  // If target is in northern half (y even), we need parent to the north
  // If target is in southern half (y odd), we need parent to the south
  if (yEven && parent.y > 0) {
    tiles.push({ x: parent.x, y: parent.y - 1, z: parent.z, role: 'parent-north' });
  } else if (!yEven && parent.y < Math.pow(2, parent.z) - 1) {
    tiles.push({ x: parent.x, y: parent.y + 1, z: parent.z, role: 'parent-south' });
  }

  // Add corner parent if needed (NW, NE, SW, or SE depending on quadrant)
  if (xEven && yEven && parent.x > 0 && parent.y > 0) {
    tiles.push({ x: parent.x - 1, y: parent.y - 1, z: parent.z, role: 'parent-nw' });
  } else if (!xEven && yEven && parent.x < Math.pow(2, parent.z) - 1 && parent.y > 0) {
    tiles.push({ x: parent.x + 1, y: parent.y - 1, z: parent.z, role: 'parent-ne' });
  } else if (xEven && !yEven && parent.x > 0 && parent.y < Math.pow(2, parent.z) - 1) {
    tiles.push({ x: parent.x - 1, y: parent.y + 1, z: parent.z, role: 'parent-sw' });
  } else if (!xEven && !yEven && parent.x < Math.pow(2, parent.z) - 1 && parent.y < Math.pow(2, parent.z) - 1) {
    tiles.push({ x: parent.x + 1, y: parent.y + 1, z: parent.z, role: 'parent-se' });
  }

  return tiles;
}
