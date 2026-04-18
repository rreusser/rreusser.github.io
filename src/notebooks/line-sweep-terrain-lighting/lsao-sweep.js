// Line-sweep ambient occlusion, adapted from Karim Naaji's LSAO
// (https://karim.naaji.fr/lsao.html). The per-direction computation
// is `sweepCore` in 'lsao' mode (see sweep-core.js), which maintains
// a push-pruned upper convex hull along each ray and deposits
// cos²α = 1 − sin²α — the Lambertian cosine-weighted visible fraction
// of one azimuthal sky slice — scaled by `weight`. Multiple directions
// are averaged externally (either by `tile-viewer.js` for bake, or by
// the notebook driver for the interactive figure).
//
// Using cos²α instead of an ad-hoc exp(−sin α) also tightens the
// effect's locality — because cos²α ≈ 1 − (Δh / distance)² for small
// angles, the contribution of a distant tall blocker falls off like
// 1 / distance² rather than lingering on a long exponential shoulder.

import { sweepCore, sweepCoreSource } from "./sweep-core.js";

export function sweepLsaoDirection(W, H, elev, azDeg, pxSizeM, weight) {
  return sweepCore({
    W,
    H,
    elev,
    azDeg,
    pxSizeM,
    mode: "lsao",
    weight,
  });
}

const workerCode =
  sweepCoreSource +
  `
self.onmessage = function(e) {
  var d = e.data;
  var r = sweepCore({
    W: d.W, H: d.H, elev: d.elev,
    azDeg: d.azDeg,
    pxSizeM: d.pxSizeM,
    mode: "lsao",
    weight: d.weight,
  });
  self.postMessage({ result: r.buffer }, [r.buffer]);
};`;

export function createLsaoSweepPool({
  poolSize = Math.min(navigator.hardwareConcurrency || 4, 16),
} = {}) {
  const blob = new Blob([workerCode], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);

  const idle = [];
  let currentBatch = null;

  function dispatch(w) {
    const batch = currentBatch;
    if (batch && batch.nextIdx < batch.tasks.length) {
      const idx = batch.nextIdx++;
      w._batch = batch;
      w._idx = idx;
      w.postMessage(batch.tasks[idx]);
    } else {
      w._batch = null;
      idle.push(w);
    }
  }

  function attach(w) {
    w.onmessage = (e) => {
      const batch = w._batch;
      const idx = w._idx;
      if (batch && !batch.cancelled) {
        batch.results[idx] = new Float32Array(e.data.result);
        batch.completed++;
        if (batch.completed === batch.tasks.length) {
          batch.resolve(batch.results);
        }
      }
      dispatch(w);
    };
  }

  for (let i = 0; i < poolSize; i++) {
    const w = new Worker(url);
    attach(w);
    idle.push(w);
  }

  function runLsao(tasks) {
    return new Promise((resolve) => {
      if (currentBatch && currentBatch.completed < currentBatch.tasks.length) {
        currentBatch.cancelled = true;
      }
      currentBatch = {
        tasks,
        results: new Array(tasks.length),
        nextIdx: 0,
        completed: 0,
        cancelled: false,
        resolve,
      };
      while (idle.length > 0 && currentBatch.nextIdx < currentBatch.tasks.length) {
        dispatch(idle.pop());
      }
    });
  }

  return { runLsao };
}
