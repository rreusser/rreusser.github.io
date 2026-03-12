interface QueueItem {
  id: number;
  type: string;
  data: any;
  priority: number;
  transfer?: Transferable[];
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  cancelled: boolean;
}

export class WorkerPool {
  private _workers: Worker[];
  private _available: Worker[];
  private _heap: QueueItem[] = [];
  private _pending = new Map<number, QueueItem>();
  private _nextId = 0;

  constructor(createWorker: () => Worker, count?: number) {
    const n = count ?? Math.max(1, (navigator.hardwareConcurrency || 4) - 1);
    this._workers = [];
    this._available = [];
    for (let i = 0; i < n; i++) {
      const w = createWorker();
      w.onmessage = (e: MessageEvent) => this._onMessage(w, e);
      this._workers.push(w);
      this._available.push(w);
    }
  }

  /**
   * Submit work to the pool.
   * @param type - Message type (e.g., 'decode-terrain-rgb')
   * @param data - Payload (structured-cloned unless in transfer list)
   * @param options.priority - Higher number = higher priority (dequeued first)
   * @param options.transfer - Transferable objects (e.g., ArrayBuffers)
   * @param options.signal - AbortSignal to cancel queued or in-flight work
   */
  submit<T>(type: string, data: any, options?: {
    priority?: number;
    transfer?: Transferable[];
    signal?: AbortSignal;
  }): Promise<T> {
    return new Promise((resolve, reject) => {
      const { priority = 0, transfer, signal } = options || {};

      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }

      const id = this._nextId++;
      const item: QueueItem = { id, type, data, priority, transfer, resolve, reject, cancelled: false };

      if (signal) {
        signal.addEventListener('abort', () => {
          if (!item.cancelled) {
            item.cancelled = true;
            item.reject(new DOMException('Aborted', 'AbortError'));
          }
        }, { once: true });
      }

      this._heapPush(item);
      this._dispatch();
    });
  }

  private _dispatch() {
    while (this._available.length > 0 && this._heap.length > 0) {
      const item = this._heapPop()!;
      if (item.cancelled) continue;

      const worker = this._available.pop()!;
      this._pending.set(item.id, item);
      worker.postMessage(
        { type: item.type, id: item.id, ...item.data },
        item.transfer || [],
      );
    }
  }

  private _onMessage(worker: Worker, e: MessageEvent) {
    const { id, ...result } = e.data;
    const item = this._pending.get(id);
    this._pending.delete(id);
    this._available.push(worker);

    if (item && !item.cancelled) {
      item.resolve(result);
    }

    this._dispatch();
  }

  // Max-heap: highest priority dequeued first
  private _heapPush(item: QueueItem) {
    this._heap.push(item);
    this._siftUp(this._heap.length - 1);
  }

  private _heapPop(): QueueItem | undefined {
    if (this._heap.length === 0) return undefined;
    const top = this._heap[0];
    const last = this._heap.pop()!;
    if (this._heap.length > 0) {
      this._heap[0] = last;
      this._siftDown(0);
    }
    return top;
  }

  private _siftUp(i: number) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this._heap[i].priority <= this._heap[parent].priority) break;
      [this._heap[i], this._heap[parent]] = [this._heap[parent], this._heap[i]];
      i = parent;
    }
  }

  private _siftDown(i: number) {
    const n = this._heap.length;
    while (true) {
      let largest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this._heap[left].priority > this._heap[largest].priority) largest = left;
      if (right < n && this._heap[right].priority > this._heap[largest].priority) largest = right;
      if (largest === i) break;
      [this._heap[i], this._heap[largest]] = [this._heap[largest], this._heap[i]];
      i = largest;
    }
  }

  destroy() {
    for (const worker of this._workers) worker.terminate();
    for (const item of this._heap) {
      if (!item.cancelled) {
        item.cancelled = true;
        item.reject(new Error('WorkerPool destroyed'));
      }
    }
    for (const [, item] of this._pending) {
      if (!item.cancelled) {
        item.cancelled = true;
        item.reject(new Error('WorkerPool destroyed'));
      }
    }
    this._heap = [];
    this._pending.clear();
    this._available = [];
    this._workers = [];
  }
}
