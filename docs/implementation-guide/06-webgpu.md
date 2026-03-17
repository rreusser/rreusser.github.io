# WebGPU

All WebGPU notebooks use `createWebGPUContext` from `./lib/webgpu-canvas.js` for device initialization. This function patches `device.createShaderModule` to surface WGSL compilation errors through the browser console, which is essential for debugging since WebGPU swallows them silently otherwise.

## Initialization

```javascript
import { createWebGPUContext } from './lib/webgpu-canvas.js'

const { device, canvasFormat, adapter, features } = await createWebGPUContext({
  optionalFeatures: ['shader-f16', 'timestamp-query'],
  maxBufferSizes: false,
});
```

`optionalFeatures` are requested only if the adapter supports them. The returned `features` set contains only those that were actually granted. `maxBufferSizes: true` requests the adapter's maximum buffer sizes in the device limits.

Always put this in its own cell so the device is available to subsequent cells. Use `await`:

```javascript
// Cell: gpu-context
const { device, canvasFormat } = await createWebGPUContext();
```

## Canvas setup

For standalone (non-stack) WebGPU canvases, create and configure the canvas manually:

```javascript
const canvas = document.createElement('canvas');
const gpuContext = canvas.getContext('webgpu');
gpuContext.configure({ device, format: canvasFormat, alphaMode: 'premultiplied' });
```

For canvas integrated into an element stack, use `webgpuElement` from `./lib/webgpu-canvas.js`:

```javascript
import { webgpuElement } from './lib/webgpu-canvas.js'

const stack = createElementStack({
  layers: [{
    id: 'webgpu',
    element: webgpuElement(device, canvasFormat, { pixelRatio: devicePixelRatio })
  }]
});

// Access canvas and its GPU context:
const canvas = stack.elements.webgpu;
const { context, format } = canvas.value;
```

The `webgpuElement` factory reuses the existing canvas on resize rather than recreating it, which avoids losing the GPU context.

## Buffer helpers

`./lib/webgpu-canvas.js` exports convenience functions for common buffer types:

```javascript
import {
  createStorageBuffer,
  createUniformBuffer,
  createVertexBuffer,
  createIndexBuffer,
} from './lib/webgpu-canvas.js'

// Storage buffer (STORAGE | COPY_SRC | COPY_DST)
const particleBuffer = createStorageBuffer(device, 'particles', byteSize);
const particleBufferWithVertex = createStorageBuffer(device, 'particles', byteSize, { vertex: true });

// Uniform buffer (UNIFORM | COPY_DST), optionally with initial data
const uniformBuffer = createUniformBuffer(device, 'uniforms', uniformData);

// Vertex buffer (VERTEX | COPY_DST), optionally with initial data
const vertexBuffer = createVertexBuffer(device, 'vertices', vertexData);

// Index buffer (INDEX | COPY_DST)
const indexBuffer = createIndexBuffer(device, 'indices', indexData);
```

All functions accept either a byte size (number) or a TypedArray/ArrayBuffer as the size/data argument.

## Render loop pattern

Use `createFrameLoop` from `./lib/frame-loop.js` together with a dirty flag:

```javascript
import { createFrameLoop } from './lib/frame-loop.js'

const renderState = { dirty: true };

const loop = createFrameLoop(() => {
  if (!renderState.dirty) return;
  renderState.dirty = false;

  const encoder = device.createCommandEncoder();

  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: gpuContext.getCurrentTexture().createView(),
      clearValue: { r: 0, g: 0, b: 0, a: 1 },
      loadOp: 'clear',
      storeOp: 'store',
    }]
  });

  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.draw(vertexCount);
  pass.end();

  device.queue.submit([encoder.finish()]);
});

invalidation.then(() => loop.cancel());
```

`createFrameLoop` invokes the callback immediately, then on each animation frame. It auto-cancels if the callback throws, and multiple `cancel()` calls are safe.

## Shader compilation errors

The patched `device.createShaderModule` automatically calls `getCompilationInfo()` and logs errors, warnings, and info messages to the console with location information:

```
[WebGPU Shader "my-shader" at line 42:8] error: expected ';'
```

Label all shader modules to make errors easier to find:

```javascript
const shaderModule = device.createShaderModule({
  label: 'particle-simulation',
  code: wgslSource,
});
```

## Compute passes

Pattern for GPU compute passes (e.g., particle simulation, FFT):

```javascript
function runComputePass(encoder, params) {
  const pass = encoder.beginComputePass({ label: 'simulate' });
  pass.setPipeline(computePipeline);
  pass.setBindGroup(0, computeBindGroup);
  pass.dispatchWorkgroups(
    Math.ceil(params.particleCount / 64)
  );
  pass.end();
}

// In render loop:
const encoder = device.createCommandEncoder();
runComputePass(encoder, params);
runRenderPass(encoder, gpuContext);
device.queue.submit([encoder.finish()]);
```

## Axes viewport for 2D WebGPU plots

When combining WebGPU with zoomable axes (as in a 2D plot), use `webgpuAxesViewport` instead of `reglAxesViewport`:

```javascript
import { webgpuAxesViewport } from './lib/webgpu-canvas.js'

// In render pass setup:
const vp = webgpuAxesViewport(axes, devicePixelRatio);
pass.setViewport(vp.x, vp.y, vp.width, vp.height, 0, 1);
pass.setScissorRect(vp.x, vp.y, vp.width, vp.height);
```

Note: WebGPU uses top-left origin for viewport and scissor, unlike WebGL which uses bottom-left. `webgpuAxesViewport` handles this difference.

## Snapshots

WebGPU swap-chain textures are only valid until the browser presents the frame. After `device.queue.submit()` the canvas reverts to blank, so `canvas.toDataURL()` **must be called synchronously in the same microtask as `submit()`** — before yielding to the event loop.

> **`await device.queue.onSubmittedWorkDone()` then `canvas.toDataURL()` does NOT work.** By the time the promise resolves the texture has been presented and the canvas is blank.

### With a unified camera (standard pattern)

Register a `'capture'` listener on the camera using `createWebGPUCaptureHandler`. The handler calls `render()` then immediately calls `canvas.toDataURL()` synchronously — all before yielding — and returns the data URL. `camera.capture()` uses that returned URL directly instead of calling `toDataURL()` itself.

```javascript
import { createWebGPUCaptureHandler } from './lib/webgpu-snapshot.js'
import { createCameraSnapshotButton } from './lib/snapshot.js'

// Register once after device, canvas, and camera are set up.
camera.on('capture', createWebGPUCaptureHandler({
  canvas,
  render: renderFrame,   // must call device.queue.submit() internally
}));

// Snapshot button for the expandable container:
buttons: [
  createCameraSnapshotButton(camera, { filename: 'my-notebook.png' })
]
```

> **Do NOT use `cameraButtons` from `./lib/camera-buttons.js` for WebGPU snapshots.** It uses `camera.once('render')` + `canvas.toDataURL()` after a rAF delay — the canvas will be blank by then.

### Without a camera (standalone canvas)

```javascript
import { captureWebGPUCanvas } from './lib/webgpu-snapshot.js'

const dataURL = captureWebGPUCanvas(canvas, renderFrame);
```

### The render function

The render function must be **synchronous** and must call `device.queue.submit()` itself. Do not rely on `requestAnimationFrame` or `createFrameLoop` firing — they are not involved in capture.

If your renderer skips drawing when no dirty flag is set, make sure the render call passed to the capture handler forces a draw. The standard approach is to pass `dirty: true` (or equivalent) when calling from the capture context:

```javascript
function renderFrame() {
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass({ ... });
  // ... draw ...
  pass.end();
  device.queue.submit([encoder.finish()]);
}

// Normal on-demand loop (skips if nothing changed):
camera.on('render', () => {
  renderFrame();  // camera dirty flag handled by camera.update() inside render
});

// Capture — force a draw regardless of dirty state:
camera.on('capture', createWebGPUCaptureHandler({
  canvas,
  render: () => renderer.render(gpuContext, params, camera, w, h, /* dirty */ true),
}));
```
