// LRU cache for terrain tile data
import { LRUCache } from 'lru-cache';
import type { TileCoords, TerrainTile } from './types.js';

/**
 * LRU cache for decoded terrain tile data
 *
 * Caches Float32Array elevation data to avoid re-fetching and re-decoding tiles.
 * Automatically evicts least recently used tiles when cache is full.
 */
export class TileDataCache {
  private cache: LRUCache<string, TerrainTile>;

  /**
   * @param {Object} options - Cache configuration
   * @param {number} options.maxTiles - Maximum number of tiles to cache (default: 100)
   * @param {number} options.maxBytes - Maximum cache size in bytes (default: 100MB)
   */
  constructor(options: { maxTiles?: number; maxBytes?: number } = {}) {
    this.cache = new LRUCache<string, TerrainTile>({
      max: options.maxTiles || 100,
      maxSize: options.maxBytes || 100 * 1024 * 1024, // 100MB default
      sizeCalculation: (value) => value.data.byteLength,
      dispose: (value, key) => {
        // Cleanup callback when tile is evicted
        // Currently no cleanup needed for Float32Array
      }
    });
  }

  /**
   * Get cache key for tile coordinates
   *
   * @param {{x: number, y: number, z: number}} coords - Tile coordinates
   * @returns {string} Cache key in format "z-x-y"
   */
  getCacheKey(coords: TileCoords): string {
    return `${coords.z}-${coords.x}-${coords.y}`;
  }

  /**
   * Check if tile is in cache
   *
   * @param {{x: number, y: number, z: number}} coords - Tile coordinates
   * @returns {boolean} True if tile is cached
   */
  has(coords: TileCoords): boolean {
    return this.cache.has(this.getCacheKey(coords));
  }

  /**
   * Get cached tile data or fetch if not present
   *
   * @param {{x: number, y: number, z: number}} coords - Tile coordinates
   * @param {Function} fetcher - Async function to fetch tile if not cached
   * @returns {Promise<{data: Float32Array, width: number, height: number, tileSize: number}>}
   */
  async get(coords: TileCoords, fetcher: () => Promise<TerrainTile>): Promise<TerrainTile> {
    const key = this.getCacheKey(coords);

    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Fetch and cache
    const tileData = await fetcher();
    this.cache.set(key, tileData);
    return tileData;
  }

  /**
   * Set tile data in cache
   *
   * @param {{x: number, y: number, z: number}} coords - Tile coordinates
   * @param {Object} data - Tile data to cache
   */
  set(coords: TileCoords, data: TerrainTile): void {
    const key = this.getCacheKey(coords);
    this.cache.set(key, data);
  }

  /**
   * Clear all cached tiles
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   *
   * @returns {{size: number, calculatedSize: number}} Cache stats
   */
  getStats(): { size: number; calculatedSize: number } {
    return {
      size: this.cache.size,
      calculatedSize: this.cache.calculatedSize || 0
    };
  }
}
