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

const DEFAULT_MAX_CONCURRENT = 8;

export class ImageryManager {
  tileUrl: (z: number, x: number, y: number) => string;
  fetched: Map<string, ImageBitmap>;
  pending: Map<string, Promise<void>>;
  abortControllers: Map<string, AbortController>;
  failed: Set<string>;
  // Keys whose last fetch failed transiently (5xx, network error); holds
  // the setTimeout id until the backoff expires and the request is re-pushed.
  _retryTimers: Map<string, ReturnType<typeof setTimeout>>;
  consumers: Map<string, Set<string>>;
  terrainToSat: Map<string, Set<string>>;
  activeRequests: number;
  requestQueue: QueueEntry[];
  onTileLoaded: ((sz: number, sx: number, sy: number) => void) | null;
  bounds: ImageryBounds | null;
  private _settings: any;
  private _onOnline: (() => void) | null = null;

  constructor({ tileUrl, settings = null }: {
    tileUrl?: (z: number, x: number, y: number) => string;
    settings?: any;
  } = {}) {
    this.tileUrl = tileUrl || ((z, x, y) => `sentinel_tiles/${z}/${x}/${y}.webp`);
    this.fetched = new Map();
    this.pending = new Map();
    this.abortControllers = new Map();
    this.failed = new Set();
    this._retryTimers = new Map();
    this.consumers = new Map();
    this.terrainToSat = new Map();
    this.activeRequests = 0;
    this.requestQueue = [];
    this.onTileLoaded = null;
    this.bounds = null;
    this._settings = settings;
    if (typeof window !== 'undefined' && window.addEventListener) {
      this._onOnline = () => this._wakeAllRetries();
      window.addEventListener('online', this._onOnline);
    }
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
    // A transient failure is waiting out its backoff; the retry timer will
    // re-push when it expires.
    if (this._retryTimers.has(key)) return;

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
    const maxConcurrent = (this._settings && this._settings.maxConcurrentFetches) || DEFAULT_MAX_CONCURRENT;
    while (this.activeRequests < maxConcurrent && this.requestQueue.length > 0) {
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

  // Schedule a retry for a transient failure. Mobile networks routinely
  // produce 5xx / TypeError on fetch; the old behavior of marking the key
  // permanently failed left imagery tiles blank with no recovery path since
  // _onSatelliteTileLoaded only fires on success.
  _scheduleRetry(z: number, x: number, y: number, key: string): void {
    if (this._retryTimers.has(key)) return;
    const timer = setTimeout(() => {
      this._retryTimers.delete(key);
      if (this.fetched.has(key) || this.failed.has(key) || this.pending.has(key)) return;
      // If every consumer was released during the backoff, drop the retry —
      // we'd waste a fetch on a tile no one wants.
      const consumers = this.consumers.get(key);
      if (!consumers || consumers.size === 0) return;
      this.requestQueue.push({ z, x, y, key });
      this._processQueue();
    }, 3000);
    this._retryTimers.set(key, timer);
  }

  _wakeAllRetries(): void {
    for (const [key, timer] of this._retryTimers) {
      clearTimeout(timer);
      if (this.fetched.has(key) || this.failed.has(key) || this.pending.has(key)) continue;
      const consumers = this.consumers.get(key);
      if (!consumers || consumers.size === 0) continue;
      const [zStr, xStr, yStr] = key.split('/');
      this.requestQueue.push({ z: +zStr, x: +xStr, y: +yStr, key });
    }
    this._retryTimers.clear();
    this._processQueue();
  }

  async _loadTile(z: number, x: number, y: number, key: string, signal: AbortSignal): Promise<void> {
    let response: Response;
    try {
      const url = this.tileUrl(z, x, y);
      response = await fetch(url, { signal });
    } catch (e: any) {
      if (e && e.name === 'AbortError') return;
      // Network-layer error (offline, DNS, reset). Transient.
      this._scheduleRetry(z, x, y, key);
      return;
    }
    if (!response.ok) {
      if (response.status >= 500) {
        // Server failure — usually transient.
        this._scheduleRetry(z, x, y, key);
        return;
      }
      // 4xx: tile is authoritatively missing or forbidden. Permanent.
      this.failed.add(key);
      return;
    }
    try {
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob);
      this.fetched.set(key, bitmap);

      if (this.onTileLoaded) this.onTileLoaded(z, x, y);
    } catch (e: any) {
      if (e && e.name === 'AbortError') return;
      // Body stream / decode failure — treat as transient. The OS or radio
      // can interrupt downloads mid-stream and the next attempt usually
      // succeeds.
      this._scheduleRetry(z, x, y, key);
    }
  }

  destroy(): void {
    for (const timer of this._retryTimers.values()) clearTimeout(timer);
    this._retryTimers.clear();
    if (this._onOnline && typeof window !== 'undefined' && window.removeEventListener) {
      window.removeEventListener('online', this._onOnline);
      this._onOnline = null;
    }
  }
}
