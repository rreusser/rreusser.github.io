/**
 * Node.js-specific WebGPU context using the webgpu package
 * This module should only be imported in Node.js test environments
 */

import { create, globals } from 'webgpu';

// Set up global WebGPU types
Object.assign(globalThis, globals);

/**
 * Create WebGPU context for Node.js using the webgpu package
 *
 * @param {Object} options - Configuration options
 * @param {Array<string>} options.features - Required WebGPU features
 * @param {Object} options.limits - Device limits to request
 * @returns {Promise<{adapter: GPUAdapter, device: GPUDevice, navigator: Object}>}
 */
export async function createWebGPUContext(options: { features?: GPUFeatureName[]; limits?: Record<string, number> } = {}) {
  // Create navigator with GPU
  const navigator = { gpu: create([]) };

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error('Failed to get WebGPU adapter in Node.js');
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

  return { adapter, device, navigator };
}

/**
 * Check if WebGPU is available in Node.js
 *
 * @returns {boolean} True if webgpu package is available
 */
export function isWebGPUAvailable() {
  try {
    create([]);
    return true;
  } catch (e) {
    return false;
  }
}
