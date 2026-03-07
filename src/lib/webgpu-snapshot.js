/**
 * Helper for capturing WebGPU canvas snapshots
 * 
 * WebGPU rendering is asynchronous - commands submitted to the GPU queue
 * may not complete immediately. To reliably capture canvas content, we need to:
 * 1. Ensure a frame is rendered
 * 2. Wait for GPU work to complete using queue.onSubmittedWorkDone()
 * 3. Then capture the canvas
 */

/**
 * Create a capture handler for WebGPU rendering
 * @param {Object} opts - Configuration
 * @param {GPUDevice} opts.device - WebGPU device
 * @param {Function} opts.render - Function that renders a frame: () => void
 * @returns {Function} Async handler that renders and waits for GPU completion
 */
export function createWebGPUCaptureHandler({ device, render }) {
  return async () => {
    // Render a frame
    if (render) {
      render();
    }
    
    // Wait for all GPU work to complete
    await device.queue.onSubmittedWorkDone();
  };
}

/**
 * Capture a WebGPU canvas after ensuring rendering is complete
 * @param {HTMLCanvasElement} canvas - Canvas to capture
 * @param {GPUDevice} device - WebGPU device
 * @param {Function} render - Function that renders a frame
 * @param {Object} [opts] - Options
 * @param {string} [opts.format='image/png'] - Image format
 * @param {number} [opts.quality=0.95] - Image quality (0-1)
 * @returns {Promise<string>} Data URL of captured image
 */
export async function captureWebGPUCanvas(canvas, device, render, opts = {}) {
  const { format = 'image/png', quality = 0.95 } = opts;
  
  // Render a frame
  if (render) {
    render();
  }
  
  // Wait for GPU work to complete
  await device.queue.onSubmittedWorkDone();
  
  // Now capture the canvas
  return canvas.toDataURL(format, quality);
}
