# 3D Cameras

All 3D notebooks use `createUnifiedCamera` from `./lib/unified-camera.js`. It provides two camera modes with seamless switching: orbit (spherical coordinates, always upright) and arcball (quaternion trackball, free rotation). Both modes support drag to rotate, shift+drag or right-drag to pan, cmd/ctrl+drag to pivot, and scroll to zoom.

## Basic setup

```javascript
import { createUnifiedCamera } from './lib/unified-camera.js'
import { createFrameLoop } from './lib/frame-loop.js'

const canvas = document.createElement('canvas');

const camera = createUnifiedCamera(canvas, {
  mode: 'orbit',        // or 'arcball'
  distance: 5,
  phi: 0.5,             // azimuthal angle (orbit mode)
  theta: 0.3,           // polar angle (orbit mode)
  center: [0, 0, 0],    // focal point
  fov: Math.PI / 4,
  near: 0.1,
  far: 1000,
});

invalidation.then(() => camera.destroy());
```

For arcball mode, use `orientation` instead of `phi`/`theta`:

```javascript
const camera = createUnifiedCamera(canvas, {
  mode: 'arcball',
  distance: 5,
  orientation: [0, 0, 0, 1],   // identity quaternion
  center: [0, 0, 0],
});
```

## Getting matrices

Call `camera.update(aspectRatio)` inside your render loop to get the current matrices. It returns an object with pre-allocated `Float32Array` views that are updated in place:

```javascript
const { view, projection, projView, eye, dirty } = camera.update(canvas.width / canvas.height);
```

The `dirty` flag is true if the camera changed since the last call to `update()`.

## Render loop integration

The standard pattern uses `camera.on('render', ...)` to trigger repaints only when the camera changes, combined with `createFrameLoop` for WebGPU or regl's frame loop:

```javascript
// On-demand render: only draw when camera is dirty
camera.on('render', () => {
  renderState.dirty = true;
});

camera.triggerRepaint();  // draw the initial frame

const loop = createFrameLoop(() => {
  if (!renderState.dirty) return;
  renderState.dirty = false;

  const { view, projection, eye } = camera.update(canvas.width / canvas.height);
  // ... draw scene using matrices ...
});

invalidation.then(() => loop.cancel());
```

For continuous rendering (animation), set `renderContinuously: true` in the camera options. The `camera.on('render')` event will not fire in this mode; just render every frame.

## Camera buttons

For notebooks with expandable 3D figures, use `cameraButtons` from `./lib/camera-buttons.js` to add mode-toggle and snapshot buttons to the expandable container:

```javascript
import { cameraButtons } from './lib/camera-buttons.js'
import { expandable } from './lib/expandable.js'

let expandableContainer;
expandableContainer = expandable(container, {
  width: 640,
  height: 480,
  controls: '#my-controls',
  state: uiState,
  buttons: cameraButtons({
    camera,
    canvas,
    filename: 'my-notebook.png',
    getContainer: () => expandableContainer,
  }),
  onResize(el, w, h) {
    canvas.width = Math.floor(w * devicePixelRatio);
    canvas.height = Math.floor(h * devicePixelRatio);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    renderState.dirty = true;
  }
});

display(expandableContainer);
```

`cameraButtons` returns two buttons: one that toggles between orbit and arcball mode (updating its icon to match), and one that captures the canvas to a PNG and downloads it.

## Camera API

| Method | Description |
|---|---|
| `camera.update(aspectRatio)` | Recompute and return `{ view, projection, projView, eye, dirty }` |
| `camera.taint()` | Mark camera dirty and emit render event |
| `camera.triggerRepaint()` | Same as `taint()` |
| `camera.setMode('orbit' \| 'arcball')` | Switch mode, preserving eye position |
| `camera.getMode()` | Returns current mode string |
| `camera.getState()` | Returns copy of internal state |
| `camera.setState(partial)` | Merge partial state and mark dirty |
| `camera.on('render', cb)` | Subscribe to render events |
| `camera.once('render')` | Returns a Promise that resolves after the next render |
| `camera.off('render', cb)` | Unsubscribe |
| `camera.pan(dx, dy, element)` | Programmatic pan |
| `camera.zoom(delta)` | Programmatic zoom |
| `camera.attachEvents()` | Attach mouse/touch/wheel listeners (called automatically unless `deferEvents: true`) |
| `camera.destroy()` | Remove all event listeners and observers |

## State management across re-renders

Like the expanded state, mutable camera state (position, mode) must survive Observable re-runs. Use a stable `state` object in a pinned cell:

```javascript
// Cell 1: define persistent state container
const state = {
  canvas: null,
  camera: null,
  frame: null,
  dirty: true,
  expandedState: { expanded: false },
};
```

In the camera cell, check whether the camera already exists before creating a new one:

```javascript
if (!state.camera) {
  state.camera = createUnifiedCamera(canvas, { ... });
}
const camera = state.camera;
```

This avoids recreating the camera (and losing the user's view position) when unrelated cells re-run.

## Projection conventions

The camera computes projection matrices for WebGPU NDC convention: x,y ∈ [-1,1], z ∈ [0,1]. This matches WGSL's default coordinate system. WebGL uses z ∈ [-1,1], so if using the camera matrices with WebGL/regl, be aware of this difference and adjust accordingly.
