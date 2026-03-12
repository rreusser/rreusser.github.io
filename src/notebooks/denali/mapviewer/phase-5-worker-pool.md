# Phase 5: Worker Pool for Tile Decoding

## Prerequisites

Phases 1-4 complete. Files organized into subdirectories. TerrainMap is a thin orchestrator.

## Goal

Move tile decoding and GeoJSON coordinate projection off the main thread using a shared worker pool. This improves frame rate during tile loading since decode is CPU-intensive (terrain-RGB/Terrarium decoding + 514x514 texel padding).

## Current Tile Decode Path

In `tiles/tile-manager.js` (originally `tile-manager.js`), the `_loadTile()` method:

1. Fetches the tile image via `fetch()` + `createImageBitmap()`
2. Draws the ImageBitmap to a temporary OffscreenCanvas
3. Reads back pixel data via `getImageData()`
4. Calls `decodeTerrainRGB()` or `decodeTerrarium()` to convert RGB pixels to elevation float values
5. Pads 512x512 data to 514x514 (1px border for seamless normals)
6. Computes min/max elevation bounds
7. Uploads to GPU via `device.queue.writeTexture()`

Steps 2-6 are CPU-intensive and block the main thread for 5-20ms per tile.

## New Files

### `workers/worker-pool.ts` (~200 lines)

Generic pool of N identical workers (default: `navigator.hardwareConcurrency - 1` or 3).

```typescript
export class WorkerPool {
  private _workers: Worker[];
  private _queue: PriorityQueue<QueueItem>;
  private _available: Worker[];
  private _pending: Map<number, { resolve, reject, signal? }>;
  private _nextId = 0;

  constructor(workerUrl: URL | string, count?: number);

  /**
   * Submit work to the pool.
   * @param type - Message type (e.g., 'decode-terrain-rgb', 'decode-terrarium')
   * @param data - Payload (will be structured-cloned unless in transfer list)
   * @param options.priority - Lower number = higher priority (use zoom level)
   * @param options.transfer - Transferable objects (e.g., ImageBitmap)
   * @param options.signal - AbortSignal to cancel queued or in-flight work
   */
  submit<T>(type: string, data: any, options?: {
    priority?: number;
    transfer?: Transferable[];
    signal?: AbortSignal;
  }): Promise<T>;

  destroy(): void;
}
```

Priority queue: use a simple binary min-heap keyed on priority. Items with lower priority number are dequeued first. For tiles, use zoom level as priority (higher zoom = closer to camera = process first = lower priority number... or invert: use `maxZoom - zoom` so closer tiles have lower numbers).

AbortSignal: when the signal fires, queued items are rejected with `AbortError`. In-flight items: the worker continues but the result is discarded (no way to interrupt worker execution).

### `workers/tile-decode.worker.ts` (~100 lines)

Single worker script that handles multiple message types:

```typescript
// Message types:
// { type: 'decode-terrain-rgb', id, imageData, width, height }
// { type: 'decode-terrarium', id, imageData, width, height }
//
// Response:
// { id, elevations: Float32Array, paddedRGBA: Uint8Array, minElev, maxElev }
// Transfer: [elevations.buffer, paddedRGBA.buffer]

self.onmessage = (e) => {
  const { type, id, imageData, width, height } = e.data;

  // Decode pixel data -> Float32Array elevations (512x512)
  const elevations = type === 'decode-terrain-rgb'
    ? decodeTerrainRGB(imageData, width, height)
    : decodeTerrarium(imageData, width, height);

  // Pad to 514x514 with 1px border (duplicate edge pixels)
  const padded = padElevations(elevations, width, height);

  // Convert padded elevations to RGBA texture data for GPU upload
  // (encode as R32Float or pack into RGBA8 depending on format)
  const paddedRGBA = encodePaddedForGPU(padded, width + 2, height + 2);

  // Compute elevation bounds
  let minElev = Infinity, maxElev = -Infinity;
  for (let i = 0; i < elevations.length; i++) {
    if (elevations[i] < minElev) minElev = elevations[i];
    if (elevations[i] > maxElev) maxElev = elevations[i];
  }

  self.postMessage({ id, elevations, paddedRGBA, minElev, maxElev },
    [elevations.buffer, paddedRGBA.buffer]);  // zero-copy transfer
};
```

Note: the exact decode functions (`decodeTerrainRGB`, `decodeTerrarium`) and the padding logic already exist in `tiles/tile-manager.js`. Copy them into the worker, keeping the originals as fallback for when workers are unavailable.

### `workers/geojson-process.worker.ts` (~80 lines)

Optional. Handles coordinate projection (lon/lat -> Mercator) for large GeoJSON datasets. Lower priority than tile decoding.

```typescript
// Message: { type: 'project-geojson', id, geojson, options }
// Response: { id, features: ProjectedFeature[] }
```

## Modifications to `tiles/tile-manager.js`

### Current decode path in `_loadTile()`

```javascript
// Pseudocode of current flow:
const response = await fetch(url);
const blob = await response.blob();
const bitmap = await createImageBitmap(blob);
const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
const ctx = canvas.getContext('2d');
ctx.drawImage(bitmap, 0, 0);
const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
bitmap.close();

// CPU-intensive decode (this is what moves to worker)
const { elevations, paddedData, minElev, maxElev } = decode(imageData, this._encoding);

// GPU upload (stays on main thread)
device.queue.writeTexture(..., paddedData, ...);
```

### New flow with worker pool

```javascript
// In TileManager constructor or init:
this._workerPool = workerPool;  // injected, may be null

// In _loadTile():
const response = await fetch(url);
const blob = await response.blob();
const bitmap = await createImageBitmap(blob);

let result;
if (this._workerPool) {
  // Draw to canvas to get imageData (must happen on main thread due to canvas API)
  // OR: transfer the ImageBitmap to the worker and let it use OffscreenCanvas
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  bitmap.close();

  result = await this._workerPool.submit('decode-' + this._encoding, {
    imageData: imageData.data,
    width: imageData.width,
    height: imageData.height,
  }, {
    priority: z,  // zoom level as priority (higher zoom = higher priority)
    transfer: [imageData.data.buffer],
    signal: this._abortController?.signal,
  });
} else {
  // Fallback: main-thread decode (existing code)
  result = decodeOnMainThread(bitmap, this._encoding);
}

// GPU upload (always main thread)
device.queue.writeTexture(..., result.paddedRGBA, ...);
this._elevationBounds.set(key, { min: result.minElev, max: result.maxElev });
```

### Worker creation

The worker pool is created by TerrainMap and injected into TileManager:

```javascript
// In terrain-viewer.js _init():
const workerUrl = new URL('./workers/tile-decode.worker.ts', import.meta.url);
this._workerPool = new WorkerPool(workerUrl);

this._tileManager = new TileManager(device, {
  tileUrl: ...,
  encoding: ...,
  workerPool: this._workerPool,  // optional injection
});
```

Vite handles the `new URL(..., import.meta.url)` pattern for workers, bundling them correctly.

## Cancellation Integration

When `TileManager.cancelStale()` is called (from coverage update), tiles that are no longer needed should have their AbortSignal fired. This means each in-flight tile decode should have its own AbortController:

```javascript
// Per-tile abort in TileManager:
const controller = new AbortController();
this._pendingAborts.set(key, controller);

const result = await this._workerPool.submit('decode-terrain-rgb', data, {
  priority: z,
  signal: controller.signal,
});

this._pendingAborts.delete(key);
```

When `cancelStale()` runs, it aborts controllers for tiles no longer in the wanted set.

## Verification

1. Tiles still load and decode correctly (compare visual output)
2. Performance: check that frame rate doesn't drop during heavy tile loading (use browser DevTools Performance panel)
3. Cancellation: navigate quickly and verify that stale tiles don't waste CPU
4. Fallback: temporarily disable workers (`workerPool: null`) and verify everything still works
5. Memory: verify that transferred buffers don't cause double-allocation
