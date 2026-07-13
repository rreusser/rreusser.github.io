// Aggregate self-time by function from a V8 .cpuprofile.
import { readFileSync } from 'node:fs';
const prof = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const { nodes, samples, timeDeltas } = prof;
const byId = new Map(nodes.map((n) => [n.id, n]));
// Self time via samples+timeDeltas (µs per sample interval attributed to the sampled node).
const selfUs = new Map();
for (let i = 0; i < samples.length; i++) {
  const id = samples[i];
  const dt = timeDeltas[i] ?? 0;
  selfUs.set(id, (selfUs.get(id) ?? 0) + dt);
}
const agg = new Map();
for (const [id, us] of selfUs) {
  const node = byId.get(id);
  if (!node) continue;
  const f = node.callFrame;
  const url = (f.url || '').split('/').slice(-1)[0];
  const key = `${f.functionName || '(anonymous)'} [${url}:${f.lineNumber}]`;
  agg.set(key, (agg.get(key) ?? 0) + us);
}
const total = [...agg.values()].reduce((a, b) => a + b, 0);
const rows = [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
console.log(`total sampled: ${(total / 1e6).toFixed(2)} s`);
for (const [k, us] of rows) {
  console.log(`${(us / 1000).toFixed(0).padStart(8)} ms  ${(100 * us / total).toFixed(1).padStart(5)}%  ${k}`);
}
