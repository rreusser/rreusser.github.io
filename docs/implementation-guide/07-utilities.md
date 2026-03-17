# Utilities

## Frame loop

`createFrameLoop` from `./lib/frame-loop.js` provides a managed `requestAnimationFrame` loop with automatic error handling:

```javascript
import { createFrameLoop } from './lib/frame-loop.js'

const loop = createFrameLoop((timestamp) => {
  // Called immediately, then each animation frame
  render(timestamp);
});

invalidation.then(() => loop.cancel());
```

Features:
- Calls the callback immediately with `performance.now()`, then continues via RAF
- Auto-cancels and logs if the callback throws
- Multiple `cancel()` calls are safe no-ops

For on-demand rendering (when nothing moves), check a dirty flag inside the callback and return early if clean.

## Collapsible code blocks

Long code cells clutter the reading experience. `collapseCodeBlocks` from `./lib/collapsible-code.js` truncates tall code blocks and adds an expand button:

```javascript
import { collapseCodeBlocks } from './lib/collapsible-code.js'

collapseCodeBlocks({
  maxHeight: 600,           // collapse blocks taller than this (px)
  skip: ['cell-imports'],   // never collapse these cell IDs
  include: ['cell-long'],   // always collapse these, even if short
  overrides: {
    'cell-shader': 400      // per-cell maxHeight override
  }
});
```

Place this call in a cell near the end of the notebook. Add `// @expanded` as the first comment line of a code block to prevent it from being collapsed.

## Snapshots

Two snapshot patterns are available depending on whether you're using the unified camera or a plain canvas.

**Plain canvas snapshot button** (for use in `expandable`'s `buttons` array):

```javascript
import { createSnapshotButton } from './lib/snapshot.js'

buttons: [
  createSnapshotButton(canvas, {
    filename: 'my-figure.png',
    onSnapshot: () => { renderState.dirty = true; }  // trigger a fresh render before capture
  })
]
```

**Camera snapshot** (preferred for all 3D notebooks using unified-camera, and **required** for WebGPU):

```javascript
import { createCameraSnapshotButton } from './lib/snapshot.js'

buttons: [
  createCameraSnapshotButton(camera, { filename: 'my-figure.png' })
]
```

`createCameraSnapshotButton` calls `await camera.capture()`. `camera.capture()` fires the `'capture'` event, awaits all registered handlers, then calls `canvas.toDataURL()`.

**For WebGPU notebooks**, you must register a `'capture'` handler that renders a frame and immediately captures the canvas — all synchronously before yielding to the event loop. Use `createWebGPUCaptureHandler` from `./lib/webgpu-snapshot.js`:

```javascript
import { createWebGPUCaptureHandler } from './lib/webgpu-snapshot.js'

// Register once, after canvas + camera are ready:
camera.on('capture', createWebGPUCaptureHandler({ canvas, render: renderFrame }));
```

The handler calls `render()` then `canvas.toDataURL()` synchronously and returns the data URL. `camera.capture()` uses that URL directly. Without this handler, `camera.capture()` falls back to calling `toDataURL()` after an async gap — by which point the WebGPU swap-chain texture has been presented and the canvas is blank.

> **Do not use `cameraButtons` from `./lib/camera-buttons.js` for WebGPU snapshots.** It bypasses `camera.capture()` and uses `camera.once('render')` + `canvas.toDataURL()` directly, which does not wait for GPU completion. See the [WebGPU guide](./06-webgpu.md#snapshots) for the full correct pattern.

For the `cameraButtons` helper (which bundles the mode-toggle and snapshot buttons together for WebGL/regl notebooks), see the [3D Cameras guide](./05-3d-cameras.md).

## theme.js

`./lib/theme.js` provides utilities for adapting to the notebook's current color theme (air/ink):

```javascript
import { getTheme, onThemeChange } from './lib/theme.js'

const theme = getTheme();  // 'air' or 'ink'
const isDark = theme === 'ink';

// React to theme changes
onThemeChange((newTheme) => {
  params.backgroundColor = newTheme === 'ink' ? [0, 0, 0] : [1, 1, 1];
  renderState.dirty = true;
});
```

## twttr.js

`./lib/twttr.js` is a legacy utility for embedding Twitter/X widgets. Not relevant to most notebooks.

## Importing d3 in library files

Library files cannot import external packages directly. If a library function needs d3 (or any other external library), pass it as a parameter using dependency injection:

```javascript
// Bad — will fail at build time
import * as d3 from 'npm:d3'
export function createZoomableAxes(...) { ... }

// Good — caller passes d3 in
export function createZoomableAxes({ d3, element, ... }) { ... }
```

At the notebook level:

```javascript
import * as d3 from 'npm:d3@7'
import { createZoomableAxes } from './lib/zoomable-axes.js'

const axes = createZoomableAxes({ d3, element: svgEl, ... });
```

## Element IDs for debugging

Assign meaningful `id` attributes to DOM elements and notebook cells. The Observable Notebook MCP server can then locate and inspect elements by selector. Prefer IDs that describe content over generic names:

```javascript
const canvas = document.createElement('canvas');
canvas.id = 'webgpu-surface';

const controlsContainer = html`<div id="surface-controls"></div>`;
```

This makes it straightforward to query element state with `GetElementContent` or `GetValue` during debugging sessions.
