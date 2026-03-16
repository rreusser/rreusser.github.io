/**
 * Helper for capturing WebGPU canvas snapshots.
 *
 * WebGPU swap-chain textures are only valid until the browser presents the
 * frame. Once the GPU queue has been submitted the canvas reverts to blank, so
 * canvas.toDataURL() MUST be called synchronously in the same microtask as
 * device.queue.submit() — before yielding to the event loop.
 *
 * Awaiting device.queue.onSubmittedWorkDone() before toDataURL() does NOT
 * work: by the time the promise resolves the texture has been presented and
 * the canvas is blank again.
 *
 * The correct order is:
 *   1. render()         — submits GPU commands (calls device.queue.submit())
 *   2. toDataURL()      — read the canvas synchronously, same microtask
 *   3. (optional) await device.queue.onSubmittedWorkDone()
 */

/**
 * Create a capture handler for use with camera.on('capture', handler).
 *
 * The handler calls render() (which must call device.queue.submit() internally),
 * then immediately captures the canvas via toDataURL() — all synchronously,
 * before yielding to the event loop.  It returns the data URL string so that
 * camera.capture() can use it directly instead of calling toDataURL() itself
 * after an async gap.
 *
 * @param {Object} opts
 * @param {HTMLCanvasElement} opts.canvas - The WebGPU canvas to capture
 * @param {Function} opts.render - Renders a frame (must call device.queue.submit())
 * @param {string} [opts.format='image/png'] - Image format
 * @param {number} [opts.quality=0.95] - Image quality (0–1)
 * @returns {Function} Synchronous capture handler that returns a data URL string
 */
export function createWebGPUCaptureHandler({ canvas, render, format = 'image/png', quality = 0.95 }) {
  return () => {
    render();
    // Must be synchronous — toDataURL() reads the swap-chain texture before
    // the browser presents it and resets the canvas to blank.
    return canvas.toDataURL(format, quality);
  };
}

/**
 * One-shot synchronous capture of a WebGPU canvas.
 *
 * @param {HTMLCanvasElement} canvas - Canvas to capture
 * @param {Function} render - Renders a frame (must call device.queue.submit())
 * @param {Object} [opts]
 * @param {string} [opts.format='image/png']
 * @param {number} [opts.quality=0.95]
 * @returns {string} Data URL of the captured frame
 */
export function captureWebGPUCanvas(canvas, render, opts = {}) {
  const { format = 'image/png', quality = 0.95 } = opts;
  render();
  return canvas.toDataURL(format, quality);
}
