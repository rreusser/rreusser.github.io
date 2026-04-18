/**
 * Type definitions for terrain data structures
 */

/** Tile coordinates in slippy map format */
export interface TileCoords {
  x: number;
  y: number;
  z: number;
}

/** Tile coordinates with role information */
export interface TileWithRole extends TileCoords {
  role: string;
}

/** Terrain tile data */
export interface TerrainTile {
  data: Float32Array;
  width: number;
  height: number;
  tileSize: number;
}

/** Terrain tile with image (browser) */
export interface TerrainTileWithImage {
  img: HTMLImageElement;
  width: number;
  height: number;
  tileSize: number;
  buffer: number;
}

/** Parent tile assembly result */
export interface AssembledParentTile {
  buffer: Float32Array;
  size: number;
  targetOffset: [number, number];
  scale: number;
  targetSizeAtParent: number;
}

/** Cache statistics */
export interface CacheStats {
  size: number;
  calculatedSize: number;
}

/** Quadrant type */
export type Quadrant = 'nw' | 'ne' | 'sw' | 'se';
