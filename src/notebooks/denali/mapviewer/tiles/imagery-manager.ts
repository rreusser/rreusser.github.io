import type { MercatorBounds } from '../core/types.ts';

interface ImageryBounds extends MercatorBounds {
  minZoom: number;
  maxZoom: number;
}

interface QueueEntry {
  z: number;
  x: number;
  y: number;
  key: string;
}

const MAX_CONCURRENT = 8;

export class ImageryManager {
  tileUrl: (z: number, x: number, y: number) => string;
  fetched: Map<string, ImageBitmap>;
  pending: Map<string, Promise<void>>;
  abortControllers: Map<string, AbortController>;
  failed: Set<string>;
  consumers: Map<string, Set<string>>;
  terrainToSat: Map<string, Set<string>>;
  activeRequests: number;
  requestQueue: QueueEntry[];
  onTileLoaded: ((sz: number, sx: number, sy: number) => void) | null;
  bounds: ImageryBounds | null;

  constructor({ tileUrl }: { tileUrl?: (z: number, x: number, y: number) => string } = {}) {
    this.tileUrl = tileUrl || ((z, x, y) => `sentinel_tiles/${z}/${x}/${y}.webp`);
    this.fetched = new Map();
    this.pending = new Map();
    this.abortControllers = new Map();
    this.failed = new Set();
    this.consumers = new Map();
    this.terrainToSat = new Map();
    this.activeRequests = 0;
    this.requestQueue = [];
    this.onTileLoaded = null;
    this.bounds = null;
  }

  setBounds(bounds: ImageryBounds): void {
    this.bounds = bounds;
  }

  _key(z: number, x: number, y: number): string {
    return `${z}/${x}/${y}`;
  }

  getBitmap(z: number, x: number, y: number): ImageBitmap | null {
    return this.fetched.get(this._key(z, x, y)) || null;
  }

  isFailed(z: number, x: number, y: number): boolean {
    return this.failed.has(this._key(z, x, y));
  }

  requestTile(z: number, x: number, y: number, terrainKey: string): void {
    const key = this._key(z, x, y);

    let consumerSet = this.consumers.get(key);
    if (!consumerSet) {
      consumerSet = new Set();
      this.consumers.set(key, consumerSet);
    }
    consumerSet.add(terrainKey);

    let satSet = this.terrainToSat.get(terrainKey);
    if (!satSet) {
      satSet = new Set();
      this.terrainToSat.set(terrainKey, satSet);
    }
    satSet.add(key);

    if (this.fetched.has(key) || this.failed.has(key) || this.pending.has(key)) return;

    if (this.bounds && this._isOutOfBounds(z, x, y)) {
      this.failed.add(key);
      return;
    }

    this.requestQueue.push({ z, x, y, key });
    this._processQueue();
  }

  _isOutOfBounds(z: number, x: number, y: number): boolean {
    const b = this.bounds!;
    if (z < b.minZoom || z > b.maxZoom) return true;
    const s = 1 / (1 << z);
    const tileMinX = x * s;
    const tileMaxX = (x + 1) * s;
    const tileMinY = y * s;
    const tileMaxY = (y + 1) * s;
    if (tileMaxX < b.minX || tileMinX > b.maxX ||
        tileMaxY < b.minY || tileMinY > b.maxY) return true;
    return false;
  }

  getConsumers(z: number, x: number, y: number): Set<string> | null {
    return this.consumers.get(this._key(z, x, y)) || null;
  }

  removeConsumer(terrainKey: string): void {
    const satKeys = this.terrainToSat.get(terrainKey);
    if (!satKeys) return;

    for (const satKey of satKeys) {
      const consumerSet = this.consumers.get(satKey);
      if (!consumerSet) continue;
      consumerSet.delete(terrainKey);

      if (consumerSet.size === 0) {
        this.consumers.delete(satKey);
        const ac = this.abortControllers.get(satKey);
        if (ac) {
          ac.abort();
          this.abortControllers.delete(satKey);
        }
        const bitmap = this.fetched.get(satKey);
        if (bitmap) {
          bitmap.close();
          this.fetched.delete(satKey);
        }
      }
    }

    this.terrainToSat.delete(terrainKey);
  }

  beginFrame(): void {
    this.requestQueue = [];
  }

  _processQueue(): void {
    while (this.activeRequests < MAX_CONCURRENT && this.requestQueue.length > 0) {
      const { z, x, y, key } = this.requestQueue.shift()!;
      if (this.fetched.has(key) || this.pending.has(key) || this.failed.has(key)) continue;

      const consumerSet = this.consumers.get(key);
      if (!consumerSet || consumerSet.size === 0) continue;

      this.activeRequests++;
      const ac = new AbortController();
      this.abortControllers.set(key, ac);
      const promise = this._loadTile(z, x, y, key, ac.signal);
      this.pending.set(key, promise);
      promise.finally(() => {
        this.pending.delete(key);
        this.abortControllers.delete(key);
        this.activeRequests--;
        this._processQueue();
      });
    }
  }

  async _loadTile(z: number, x: number, y: number, key: string, signal: AbortSignal): Promise<void> {
    try {
      const url = this.tileUrl(z, x, y);
      const response = await fetch(url, { signal });
      if (!response.ok) {
        this.failed.add(key);
        return;
      }
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob);
      this.fetched.set(key, bitmap);

      if (this.onTileLoaded) this.onTileLoaded(z, x, y);
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      this.failed.add(key);
    }
  }
}
