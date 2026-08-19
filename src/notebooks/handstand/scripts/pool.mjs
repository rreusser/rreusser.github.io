// A worker_threads pool that evaluates CMA-ES generations in parallel: the
// population is split into chunks, one per worker, and results reassemble in
// candidate order, so the search is bitwise-identical to serial evaluation.
import { Worker } from 'node:worker_threads';
import { cpus } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Default pool size. The useful ceiling is the CMA-ES population, not the
// core count: with lambda evaluations per generation and round-robin
// chunking, 7 workers and 12 workers finish a 14-candidate generation in
// exactly the same two rounds. Leave one core for the main thread.
export function createEvalPool(cfg, size = Math.max(1, Math.min(16, cpus().length - 1))) {
  const script = join(dirname(fileURLToPath(import.meta.url)), 'eval-worker.mjs');
  const workers = Array.from({ length: size }, () => new Worker(script, { workerData: cfg }));
  let nextId = 0;

  const evalChunk = (worker, xs) => new Promise((resolve, reject) => {
    const id = nextId++;
    const onMsg = (m) => {
      if (m.id !== id) return;
      worker.off('message', onMsg);
      resolve(m.costs);
    };
    worker.on('message', onMsg);
    worker.once('error', reject);
    worker.postMessage({ id, xs: xs.map((x) => Array.from(x)) });
  });

  return {
    size,
    async objectiveBatch(xs) {
      const chunks = Array.from({ length: size }, () => []);
      const owners = xs.map((x, i) => {
        const w = i % size;
        chunks[w].push(x);
        return w;
      });
      const results = await Promise.all(chunks.map((c, w) => (c.length ? evalChunk(workers[w], c) : [])));
      const cursors = new Array(size).fill(0);
      return owners.map((w) => results[w][cursors[w]++]);
    },
    destroy() {
      for (const w of workers) w.terminate();
    },
  };
}
