# 2D Plots

The reference implementation for multi-layer 2D plots is `src/plot-with-zoom/index.html`. It layers a regl WebGL canvas, an Observable Plot element, and an SVG overlay into a single interactive zoomable figure.

## Stack architecture

Build 2D figures using three layers in an element stack:

1. **WebGL layer (regl)** — high-performance raster rendering (shaders, domain coloring, image data)
2. **Observable Plot layer** — axes, tick marks, gridlines, data marks
3. **SVG layer** — interactive elements (draggable control points, annotations)

The SVG sits on top and captures mouse events. The Plot layer provides axes and coordinate reference. The WebGL layer provides the mathematical content.

## Setting up the stack

```javascript
import createREGL from 'npm:regl@2.1.1'
import { createElementStack } from './lib/element-stack.js'
import { reglElement, reglAxesViewport } from './lib/regl-canvas.js'
import { createZoomableAxes } from './lib/zoomable-axes.js'
import { expandable } from './lib/expandable.js'

const stack = createElementStack({
  layers: [
    {
      id: 'regl',
      element: reglElement(createREGL, {
        extensions: ['OES_standard_derivatives'],
        attributes: { depthStencil: false, preserveDrawingBuffer: true }
      })
    },
    {
      id: 'plot',
      element: ({ width, height }) => createPlot(width, height)
    },
    {
      id: 'svg',
      element: ({ current, width, height }) =>
        (current ? d3.select(current) : d3.create('svg'))
          .attr('width', width)
          .attr('height', height)
          .node()
    }
  ]
});
```

## Zoomable axes

`createZoomableAxes` wraps `d3.zoom` and provides scales and view matrices for coordinating pan/zoom across layers.

```javascript
const axes = createZoomableAxes({
  d3,
  element: stack.elements.svg,     // zoom is applied to the SVG element
  xScale: stack.elements.plot.scale("x"),
  yScale: stack.elements.plot.scale("y"),
  aspectRatio: 1,                   // enforce square aspect ratio in data space
  onChange: ({ xDomain, yDomain }) => {
    // Recreate the Plot with updated domains
    const newPlot = createPlot(stack.width, stack.height, xDomain, yDomain);
    stack.elements.plot.replaceWith(newPlot);
    stack.elements.plot = newPlot;
    stack.dispatchEvent(new CustomEvent('update'));
    regl.dirty = true;
  }
});
```

`axes` exposes:
- `axes.xScale`, `axes.yScale` — d3 linear scales for converting between data and pixel space
- `axes.xRange`, `axes.yRange` — current pixel extents of the axes viewport
- `axes.view`, `axes.viewInverse` — orthographic matrices for use in shaders
- `axes.updateScales(xScale, yScale)` — call after the Plot is recreated to resync ranges

## Observable Plot configuration

Create Plot using `transparent` background so the WebGL layer shows through:

```javascript
function createPlot(width, height, xDomain = [-2, 2], yDomain = [-2, 2]) {
  return Plot.plot({
    width,
    height,
    marginTop: 10,
    marginRight: 10,
    marginLeft: 40,
    marginBottom: 20,
    style: { backgroundColor: "transparent", maxWidth: "none", position: "absolute" },
    x: { domain: xDomain, tickSpacing: 100 },
    y: { domain: yDomain, tickSpacing: 100 },
    marks: [
      Plot.ruleX([0], { stroke: "#0002" }),
      Plot.ruleY([0], { stroke: "#0002" })
    ]
  });
}
```

## WebGL (regl) layer

Access the regl instance from the stack element's `.value`:

```javascript
const regl = stack.elements.regl.value;
```

Use `reglAxesViewport(axes)` to synchronize the WebGL viewport with the axes coordinate system. This clips rendering to within the axes bounds and handles the Y-axis flip between screen and NDC space:

```javascript
const drawScene = regl({
  vert: `...`,
  frag: `...`,
  uniforms: {
    viewInverse: regl.prop('viewInverse'),
    // ... other uniforms
  },
  scissor: { enable: true, box: reglAxesViewport(axes) },
  viewport: reglAxesViewport(axes),
  // ... rest of descriptor
});
```

Pass the `viewInverse` matrix to the vertex shader to map clip-space coordinates back to data space:

```glsl
attribute vec2 uv;        // covers [-1, 1] × [-1, 1]
varying vec2 z;           // data-space position
uniform mat4 viewInverse;

void main() {
  z = (viewInverse * vec4(uv, 0, 1)).xy;
  gl_Position = vec4(uv, 0, 1);
}
```

## Lazy render loop

Use a `dirty` flag on the regl instance to avoid unnecessary renders:

```javascript
regl.dirty = true;

let loop = regl.frame(() => {
  try {
    if (!regl.dirty) return;
    drawScene({ viewInverse: axes.viewInverse, /* ... */ });
    regl.dirty = false;
  } catch (e) {
    loop?.cancel();
    loop = undefined;
  }
});

invalidation.then(() => loop?.cancel());
```

Set `regl.dirty = true` wherever state changes (control inputs, drag events, window resize).

## SVG overlay

The SVG layer should use D3's join pattern for stability. Always add a `clipPath` referencing the axes viewport so elements don't overflow the plot area:

```javascript
const svg = d3.select(stack.elements.svg);

// ClipPath setup
const defs = svg.selectAll('defs').data([0]).join('defs');
const clipRect = defs.selectAll('clipPath#viewport-clip')
  .data([0]).join('clipPath')
  .attr('id', 'viewport-clip')
  .selectAll('rect').data([0]).join('rect');

const clippedGroup = svg.selectAll('g.clipped').data([0])
  .join('g').attr('class', 'clipped').attr('clip-path', 'url(#viewport-clip)');

function updatePositions() {
  const [x0, x1] = axes.xRange;
  const [y0, y1] = axes.yRange;
  clipRect
    .attr('x', Math.min(x0, x1)).attr('y', Math.min(y0, y1))
    .attr('width', Math.abs(x1 - x0)).attr('height', Math.abs(y1 - y0));

  // update circle/label positions using axes.xScale / axes.yScale ...
}

updatePositions();
stack.addEventListener('update', updatePositions);  // sync on zoom/resize
```

## Connecting everything in expandable

```javascript
const figure = html`<figure>
  ${stack.element}
  <figcaption>...</figcaption>
</figure>`;

display(expandable(figure, {
  width: Math.min(width, 640),
  height: Math.min(480, width),
  controls: '.my-controls',
  onResize(el, w, h) {
    stack.resize(w, h);
    axes.updateScales(
      stack.elements.plot.scale("x"),
      stack.elements.plot.scale("y")
    );
    regl.dirty = true;
  }
}));
```
