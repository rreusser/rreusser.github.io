/**
 * Platform-agnostic WebGPU context creation
 *
 * Handles WebGPU adapter and device initialization for both browser and Node.js environments.
 */

/**
 * Get WebGPU adapter based on runtime environment
 *
 * @returns {Promise<GPUAdapter>} WebGPU adapter
 */
async function getAdapter() {
  // Browser environment
  if (typeof navigator !== 'undefined' && navigator.gpu) {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error('WebGPU is not supported in this browser');
    }
    return adapter;
  }

  // Node.js environment
  // Note: @webgpu/types provides TypeScript types only, not runtime
  // For actual Node.js WebGPU, need @webgpu/dawn or similar native bindings
  throw new Error(
    'Node.js WebGPU support requires @webgpu/dawn or similar bindings. ' +
    'Consider using a headless browser for Node.js execution.'
  );
}

/**
 * Create WebGPU context with adapter and device
 *
 * @param {Object} options - Configuration options
 * @param {Array<string>} options.features - Required WebGPU features (e.g., ['timestamp-query'])
 * @param {Object} options.limits - Device limits to request
 * @returns {Promise<{adapter: GPUAdapter, device: GPUDevice}>}
 */
export async function createWebGPUContext(options: { features?: GPUFeatureName[]; limits?: Record<string, number> } = {}) {
  const adapter = await getAdapter();

  // Log adapter info in browser
  if (typeof navigator !== 'undefined' && navigator.gpu) {
    const info = await (adapter as any).requestAdapterInfo?.();
    if (info) {
      console.log('WebGPU Adapter:', info.vendor, info.architecture);
    }
  }

  const device = await adapter.requestDevice({
    requiredFeatures: options.features || [],
    requiredLimits: options.limits || {}
  });

  // Set up error handling
  device.lost.then((info) => {
    console.error('WebGPU device lost:', info.message, info.reason);
  });

  device.addEventListener?.('uncapturederror', (event) => {
    console.error('WebGPU uncaptured error:', event.error.message);
  });

  return { adapter, device };
}

/**
 * Check if WebGPU is available in current environment
 *
 * @returns {boolean} True if WebGPU is available
 */
export function isWebGPUAvailable() {
  return typeof navigator !== 'undefined' && navigator.gpu !== undefined;
}
