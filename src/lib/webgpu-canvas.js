/**
 * WebGPU canvas helpers for Observable Notebook Kit
 *
 * Provides utilities for creating WebGPU-enabled canvases that integrate
 * with the element-stack pattern used in these notebooks.
 */

/**
 * Create WebGPU context with adapter and device.
 * Patches device.createShaderModule to log compilation errors via
 * getCompilationInfo(), making them visible to debugging tools.
 *
 * @param {Object} [options]
 * @param {string[]} [options.optionalFeatures] - Features to request if available (e.g., 'shader-f16', 'timestamp-query')
 * @param {boolean} [options.maxBufferSizes] - Request maximum buffer sizes from adapter
 * @returns {Promise<{adapter: GPUAdapter, device: GPUDevice, canvasFormat: GPUTextureFormat, features: Set<string>}>}
 */
export async function createWebGPUContext({
  optionalFeatures = [],
  maxBufferSizes = false,
} = {}) {
  if (!navigator.gpu) {
    throw new Error('WebGPU is not supported in this browser');
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error('Failed to get WebGPU adapter');
  }

  // Request optional features that are available
  const requiredFeatures = optionalFeatures.filter(f => adapter.features.has(f));

  // Build device descriptor
  const deviceDescriptor = {};
  if (requiredFeatures.length > 0) {
    deviceDescriptor.requiredFeatures = requiredFeatures;
  }
  if (maxBufferSizes) {
    deviceDescriptor.requiredLimits = {
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
      maxBufferSize: adapter.limits.maxBufferSize,
    };
  }

  const device = await adapter.requestDevice(deviceDescriptor);

  // Set up error handling
  device.lost.then((info) => {
    console.error('[WebGPU] Device lost:', info.message, info.reason);
  });

  device.addEventListener?.('uncapturederror', (event) => {
    console.error('[WebGPU] Uncaptured error:', event.error.message);
  });

  // Monkey-patch createShaderModule to log compilation errors
  const originalCreateShaderModule = device.createShaderModule.bind(device);
  device.createShaderModule = function(descriptor) {
    const shaderModule = originalCreateShaderModule(descriptor);
    const label = descriptor.label || 'unnamed shader';

    shaderModule.getCompilationInfo().then(info => {
      for (const message of info.messages) {
        const location = message.lineNum ? ` at line ${message.lineNum}:${message.linePos}` : '';
        const fullMessage = `[WebGPU Shader "${label}"${location}] ${message.type}: ${message.message}`;

        if (message.type === 'error') console.error(fullMessage);
        else if (message.type === 'warning') console.warn(fullMessage);
        else console.info(fullMessage);
      }
    });

    return shaderModule;
  };

  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

  return { adapter, device, canvasFormat, features: new Set(requiredFeatures) };
}

/**
 * Check if WebGPU is available in current browser
 * @returns {boolean} True if WebGPU is available
 */
export function isWebGPUAvailable() {
  return typeof navigator !== 'undefined' && navigator.gpu !== undefined;
}

/**
 * Create a WebGPU canvas element factory for use with element-stack
 *
 * @param {GPUDevice} device - The WebGPU device
 * @param {GPUTextureFormat} canvasFormat - The preferred canvas format
 * @param {Object} options
 * @param {number} [options.pixelRatio=devicePixelRatio] - Pixel ratio for high-DPI displays
 * @param {string} [options.alphaMode='opaque'] - Alpha mode for the canvas context
 * @returns {Function} Element factory function for createElementStack
 */
export function webgpuElement(device, canvasFormat, {
  pixelRatio = devicePixelRatio,
  alphaMode = 'opaque',
} = {}) {
  return function({ current, width, height }) {
    let canvas, gpuContext;

    if (current) {
      canvas = current;
      gpuContext = canvas._gpuContext;
    } else {
      canvas = document.createElement('canvas');
      gpuContext = canvas.getContext('webgpu');
      canvas._gpuContext = gpuContext;

      gpuContext.configure({
        device,
        format: canvasFormat,
        alphaMode,
      });

      // Expose device, context, and format on canvas.value for access
      canvas.value = {
        device,
        context: gpuContext,
        format: canvasFormat,
      };
    }

    // Update canvas size
    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';

    // Reconfigure on resize to handle new texture size
    gpuContext.configure({
      device,
      format: canvasFormat,
      alphaMode,
    });

    return canvas;
  };
}

/**
 * Compute viewport parameters for WebGPU render pass from zoomable axes
 * Similar to reglAxesViewport but for WebGPU
 *
 * @param {Object} axes - Zoomable axes object with xRange, yRange
 * @param {number} pixelRatio - Device pixel ratio
 * @param {number} canvasHeight - Canvas height in physical pixels (unused, kept for API compatibility)
 * @returns {Object} Object with x, y, width, height for setViewport/setScissorRect
 */
export function webgpuAxesViewport(axes, pixelRatio, canvasHeight) {
  // WebGPU uses top-left origin for both viewport and scissor
  const x = Math.min(axes.xRange[0], axes.xRange[1]) * pixelRatio;
  const y = Math.min(axes.yRange[0], axes.yRange[1]) * pixelRatio;
  const width = Math.abs(axes.xRange[1] - axes.xRange[0]) * pixelRatio;
  const height = Math.abs(axes.yRange[0] - axes.yRange[1]) * pixelRatio;

  return { x, y, width, height };
}

/**
 * Create a storage buffer with common usage flags.
 * By default includes STORAGE, COPY_SRC, and COPY_DST flags.
 *
 * @param {GPUDevice} device - The WebGPU device
 * @param {string} label - Debug label for the buffer
 * @param {number} size - Size in bytes
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.vertex=false] - Add VERTEX usage flag
 * @param {boolean} [options.index=false] - Add INDEX usage flag
 * @param {boolean} [options.uniform=false] - Add UNIFORM usage flag
 * @param {boolean} [options.indirect=false] - Add INDIRECT usage flag
 * @param {GPUBufferUsageFlags} [options.usage] - Additional usage flags to OR in
 * @returns {GPUBuffer}
 */
export function createStorageBuffer(device, label, size, options = {}) {
  let usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
  
  if (options.vertex) usage |= GPUBufferUsage.VERTEX;
  if (options.index) usage |= GPUBufferUsage.INDEX;
  if (options.uniform) usage |= GPUBufferUsage.UNIFORM;
  if (options.indirect) usage |= GPUBufferUsage.INDIRECT;
  if (options.usage) usage |= options.usage;

  return device.createBuffer({
    label,
    size,
    usage,
  });
}

/**
 * Create a uniform buffer and optionally write initial data.
 *
 * @param {GPUDevice} device - The WebGPU device
 * @param {string} label - Debug label for the buffer
 * @param {number|TypedArray|ArrayBuffer} sizeOrData - Size in bytes, or data to write
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.vertex=false] - Add VERTEX usage flag
 * @param {GPUBufferUsageFlags} [options.usage] - Additional usage flags to OR in
 * @returns {GPUBuffer}
 */
export function createUniformBuffer(device, label, sizeOrData, options = {}) {
  let usage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
  
  if (options.vertex) usage |= GPUBufferUsage.VERTEX;
  if (options.usage) usage |= options.usage;

  const size = typeof sizeOrData === 'number' ? sizeOrData : sizeOrData.byteLength;
  
  const buffer = device.createBuffer({
    label,
    size,
    usage,
  });

  // Write initial data if provided
  if (typeof sizeOrData !== 'number') {
    device.queue.writeBuffer(buffer, 0, sizeOrData);
  }

  return buffer;
}

/**
 * Create a vertex buffer and optionally write initial data.
 *
 * @param {GPUDevice} device - The WebGPU device
 * @param {string} label - Debug label for the buffer
 * @param {number|TypedArray|ArrayBuffer} sizeOrData - Size in bytes, or data to write
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.storage=false] - Add STORAGE usage flag
 * @param {GPUBufferUsageFlags} [options.usage] - Additional usage flags to OR in
 * @returns {GPUBuffer}
 */
export function createVertexBuffer(device, label, sizeOrData, options = {}) {
  let usage = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
  
  if (options.storage) usage |= GPUBufferUsage.STORAGE;
  if (options.usage) usage |= options.usage;

  const size = typeof sizeOrData === 'number' ? sizeOrData : sizeOrData.byteLength;
  
  const buffer = device.createBuffer({
    label,
    size,
    usage,
  });

  // Write initial data if provided
  if (typeof sizeOrData !== 'number') {
    device.queue.writeBuffer(buffer, 0, sizeOrData);
  }

  return buffer;
}

/**
 * Create an index buffer and optionally write initial data.
 *
 * @param {GPUDevice} device - The WebGPU device
 * @param {string} label - Debug label for the buffer
 * @param {number|TypedArray|ArrayBuffer} sizeOrData - Size in bytes, or data to write
 * @param {Object} [options] - Additional options
 * @param {GPUBufferUsageFlags} [options.usage] - Additional usage flags to OR in
 * @returns {GPUBuffer}
 */
export function createIndexBuffer(device, label, sizeOrData, options = {}) {
  let usage = GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST;
  
  if (options.usage) usage |= options.usage;

  const size = typeof sizeOrData === 'number' ? sizeOrData : sizeOrData.byteLength;
  
  const buffer = device.createBuffer({
    label,
    size,
    usage,
  });

  // Write initial data if provided
  if (typeof sizeOrData !== 'number') {
    device.queue.writeBuffer(buffer, 0, sizeOrData);
  }

  return buffer;
}
