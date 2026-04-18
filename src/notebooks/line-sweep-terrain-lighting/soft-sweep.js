// Soft-shadow worker pool. The sweep itself is `sweepCore` in 'soft'
// mode (see sweep-core.js): an altitude-direction penumbra via
// smoothstep over ±1.5·sunRadius. Azimuth is integrated externally by
// the driver, which averages sweeps at small azimuth offsets across
// the sun disk.

import { sweepCoreSource } from "./sweep-core.js";

const workerCode =
  sweepCoreSource +
  `
self.onmessage = function(e) {
  var d = e.data;
  var shadow = sweepCore({
    W: d.W, H: d.H, elev: d.heights,
    azDeg: d.azDeg,
    pxSizeM: d.pxSizeM,
    mode: "soft",
    altDeg: d.altDeg,
    sunRadiusDeg: d.sunRadiusDeg,
  });
  self.postMessage({ shadow: shadow.buffer }, [shadow.buffer]);
};`;

export function createSoftSweepPool({
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
        batch.results[idx] = new Float32Array(e.data.shadow);
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

  function runSoftSweeps(tasks) {
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

  return { runSoftSweeps };
}
