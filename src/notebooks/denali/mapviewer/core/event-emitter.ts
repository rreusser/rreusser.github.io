export type Listener = (...args: any[]) => void;

export class EventEmitter {
  _listeners: Map<string, Listener[]>;

  constructor() {
    this._listeners = new Map();
  }

  on(event: string, fn: Listener): this {
    let list = this._listeners.get(event);
    if (!list) {
      list = [];
      this._listeners.set(event, list);
    }
    list.push(fn);
    return this;
  }

  off(event: string, fn: Listener): this {
    const list = this._listeners.get(event);
    if (!list) return this;
    const idx = list.indexOf(fn);
    if (idx !== -1) list.splice(idx, 1);
    return this;
  }

  once(event: string, fn?: Listener): any {
    if (fn) {
      const wrapper = (...args: any[]) => {
        this.off(event, wrapper);
        fn(...args);
      };
      return this.on(event, wrapper);
    }
    return new Promise<any>(resolve => {
      const wrapper = (...args: any[]) => {
        this.off(event, wrapper);
        resolve(args[0]);
      };
      this.on(event, wrapper);
    });
  }

  emit(event: string, ...args: any[]): boolean {
    const list = this._listeners.get(event);
    if (!list || list.length === 0) return false;
    for (const fn of [...list]) {
      fn(...args);
    }
    return true;
  }
}
