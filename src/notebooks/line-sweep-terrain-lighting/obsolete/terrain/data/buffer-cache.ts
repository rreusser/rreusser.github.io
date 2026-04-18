// LRU cache for WebGPU buffers
import { LRUCache } from 'lru-cache';

/**
 * LRU cache for WebGPU buffers
 *
 * Automatically destroys GPU buffers when they are evicted from the cache.
 * This prevents GPU memory leaks and manages limited GPU memory efficiently.
 */
export class BufferCache {
  private device: GPUDevice;
  private cache: LRUCache<string, GPUBuffer>;

  constructor(device: GPUDevice, options: { maxBuffers?: number } = {}) {
    this.device = device;
    this.cache = new LRUCache<string, GPUBuffer>({
      max: options.maxBuffers || 50,
      dispose: (buffer, key) => {
        // Automatically destroy GPU buffer when evicted
        if (buffer) {
          buffer.destroy();
        }
      }
    });
  }

  /**
   * Get buffer from cache or create if not present
   *
   * @param {string} key - Cache key
   * @param {Function} creator - Function to create buffer if not cached: () => GPUBuffer
   * @returns {GPUBuffer}
   */
  getOrCreate(key: string, creator: () => GPUBuffer): GPUBuffer {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const buffer = creator();
    this.cache.set(key, buffer);
    return buffer;
  }

  /**
   * Check if buffer is in cache
   *
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get buffer from cache
   *
   * @param {string} key - Cache key
   * @returns {GPUBuffer | undefined}
   */
  get(key: string): GPUBuffer | undefined {
    return this.cache.get(key);
  }

  /**
   * Set buffer in cache
   *
   * @param {string} key - Cache key
   * @param {GPUBuffer} buffer - Buffer to cache
   */
  set(key: string, buffer: GPUBuffer) {
    this.cache.set(key, buffer);
  }

  /**
   * Remove buffer from cache and destroy it
   *
   * @param {string} key - Cache key
   */
  delete(key: string): void {
    const buffer = this.cache.get(key);
    if (buffer) {
      buffer.destroy();
    }
    this.cache.delete(key);
  }

  /**
   * Clear all buffers and destroy them
   */
  destroy() {
    // Dispose will be called for each buffer
    this.cache.clear();
  }

  /**
   * Get cache statistics
   *
   * @returns {{size: number}} Cache stats
   */
  getStats(): { size: number; } {
    return {
      size: this.cache.size
    };
  }
}
