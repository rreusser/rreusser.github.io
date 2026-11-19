// Drive a parameter, capture frames, encode an mp4.
//
// A thin harness over the h264-mp4-encoder wasm bundle (loaded by
// ./h264-mp4-encoder.js) for notebooks that want to export an
// animation of something they already render interactively. The caller
// supplies two callbacks: `prepareFrame(i, total)` moves whatever the
// animation varies and waits for the scene to settle, and
// `captureFrame()` returns one frame's RGBA bytes. Everything else
// here is bookkeeping — encoder setup from the first frame's size,
// progress reporting, cancellation.
//
// Encoding is synchronous wasm on the main thread, so it interleaves
// with the awaits inside prepareFrame rather than running alongside
// them. A few hundred frames of a megapixel canvas takes tens of
// seconds on top of whatever the scene costs to re-render, which is
// why onProgress exists.

import { loadH264Encoder } from './h264-mp4-encoder.js';

/**
 * @param {Object} opts
 * @param {number} opts.frameCount - Frames to encode (≥ 1)
 * @param {number} [opts.fps=30]
 * @param {number} [opts.quantizationParameter=22] - x264 qp; lower is better quality
 * @param {string} [opts.filename='recording.mp4'] - Name inside the wasm FS
 * @param {Function} opts.prepareFrame - async (i, frameCount) => void
 * @param {Function} opts.captureFrame - async () => { data: Uint8Array, width, height }
 * @param {Function} [opts.onProgress] - ({ frame, frameCount, elapsedMs, width, height }) => void
 * @param {Function} [opts.shouldCancel] - () => boolean, polled around every frame
 * @returns {Promise<null|{bytes: Uint8Array, width, height, frameCount, fps}>}
 *   null when cancelled.
 */
export async function recordMp4({
  frameCount,
  fps = 30,
  quantizationParameter = 22,
  filename = 'recording.mp4',
  prepareFrame,
  captureFrame,
  onProgress,
  shouldCancel,
}) {
  if (!(frameCount >= 1)) {
    throw new Error('recordMp4: frameCount must be at least 1');
  }
  const HME = await loadH264Encoder();
  const enc = await HME.createH264MP4Encoder();
  const t0 = performance.now();
  let initialized = false;
  let width = 0;
  let height = 0;

  try {
    for (let i = 0; i < frameCount; i++) {
      if (shouldCancel?.()) return null;
      await prepareFrame(i, frameCount);
      if (shouldCancel?.()) return null;
      const frame = await captureFrame();

      if (!initialized) {
        width = frame.width;
        height = frame.height;
        // h264 macroblocks come in pairs. The capture side is
        // responsible for cropping; catch it here rather than letting
        // the encoder produce a skewed file.
        if (width % 2 !== 0 || height % 2 !== 0) {
          throw new Error(
            `recordMp4: frame size ${width}×${height} must be even in both axes`,
          );
        }
        enc.outputFilename = filename;
        enc.width = width;
        enc.height = height;
        enc.frameRate = fps;
        enc.quantizationParameter = quantizationParameter;
        enc.initialize();
        initialized = true;
      } else if (frame.width !== width || frame.height !== height) {
        // A mid-recording resize would do this. The stream geometry is
        // fixed at initialize(), so there is nothing to do but stop.
        throw new Error(
          `recordMp4: frame ${i} is ${frame.width}×${frame.height}, ` +
            `expected ${width}×${height} — don't resize while recording`,
        );
      }

      enc.addFrameRgba(frame.data);
      onProgress?.({
        frame: i + 1,
        frameCount,
        elapsedMs: performance.now() - t0,
        width,
        height,
      });
    }

    enc.finalize();
    // readFile hands back a view into the wasm heap; copy before
    // delete() frees it underneath us.
    const bytes = new Uint8Array(enc.FS.readFile(filename));
    return { bytes, width, height, frameCount, fps };
  } finally {
    try {
      enc.delete();
    } catch (_) {}
  }
}

/** Save encoded bytes to disk as an mp4. */
export function downloadMp4(bytes, filename = 'recording.mp4') {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'video/mp4' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoking immediately can race the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** m:ss, for progress readouts. */
export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '--:--';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
