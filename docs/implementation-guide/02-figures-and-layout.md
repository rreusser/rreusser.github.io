# Figures and Layout

The standard way to present an interactive visualization is to wrap it in an `expandable()` container, then wrap that in a `<figure>` with a `<figcaption>`. The `expandable()` component adds a toggle button that lets the reader pop the figure out to fill most of the viewport.

## Basic expandable figure

```javascript
import { expandable } from './lib/expandable.js'

const figure = html`<figure>
  ${canvas}
  <figcaption>Drag to rotate. Scroll to zoom.</figcaption>
</figure>`;

display(expandable(figure, {
  width: Math.min(width, 640),
  height: Math.min(480, width),
  onResize(el, w, h) {
    // Called on initial display and whenever the container resizes
    canvas.width = w * devicePixelRatio;
    canvas.height = h * devicePixelRatio;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }
}));
```

The `width` and `height` options set the collapsed (inline) size. `onResize` is called immediately with those dimensions and again whenever the expanded container is resized (e.g., on window resize). Use it to update your canvas, WebGL viewport, or camera aspect ratio.

## expandable() options

| Option | Type | Description |
|---|---|---|
| `width` | number | Default collapsed width |
| `height` | number | Default collapsed height |
| `onResize` | `(el, w, h, expanded) => void` | Called on init and on resize |
| `controls` | string \| HTMLElement \| Array | CSS selector or element(s) to float in a draggable panel when expanded |
| `buttons` | Array | Custom icon buttons to show next to the expand toggle |
| `state` | Object | External object with an `expanded` boolean, to persist expanded state across reactive re-renders |
| `toggleOffset` | `[right, top]` | Pixel offset for the toggle button from the top-right corner |
| `margin` | number \| `[h, v]` | Viewport margin when expanded |
| `padding` | number \| `[h, v]` | Padding inside the expanded container |
| `wide` | boolean | Break out of the article column when collapsed (for wider figures) |
| `maxWidth` | number | Maximum width for wide layout (default 1200) |
| `aspectRatio` | number | Aspect ratio to maintain in wide layout |

## Controls panel

When expanded, controls can be moved into a floating, draggable panel. Pass a CSS selector or element reference:

```javascript
const controlsContainer = html`<div id="my-controls"></div>`;
// ... add inputs to controlsContainer ...
display(controlsContainer);

display(expandable(figure, {
  width: 640,
  height: 480,
  controls: '#my-controls',   // CSS selector
  onResize(el, w, h) { ... }
}));
```

When the figure is expanded, the controls container is physically moved into the floating panel and returned to its original position when collapsed. Observable's reactivity can recreate elements; `expandable()` uses a `MutationObserver` to detect this and swap in updated elements automatically.

## Persisting expanded state across re-renders

When a cell dependency changes (e.g. a control), Observable re-runs the cell, which would normally collapse the figure. To persist the expanded state, pass an external `state` object:

```javascript
// Define this once in a stable cell
const uiState = { expanded: false };

// Pass it to expandable so it reads and writes uiState.expanded
display(expandable(figure, {
  width: 640,
  height: 480,
  state: uiState,
  onResize(el, w, h) { ... }
}));
```

## Element stack

When a visualization combines multiple rendering technologies (WebGL canvas, Observable Plot, SVG overlay), use `createElementStack` to manage them as absolutely-positioned layers in a shared container.

```javascript
import { createElementStack } from './lib/element-stack.js'

const stack = createElementStack({
  layers: [
    {
      id: 'regl',
      element: reglElement(createREGL, { extensions: ['OES_standard_derivatives'] })
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

// stack.element — the container div
// stack.elements.regl — the regl canvas element
// stack.elements.plot — the Plot element
// stack.elements.svg — the SVG element
// stack.resize(w, h) — resize all layers together
```

The stack is persistent: when a layer factory receives `current`, it means an element already exists. Always reuse `current` for WebGL contexts to avoid context loss. For SVG layers, select-or-create with `current ? d3.select(current) : d3.create('svg')`.

Use `stack.element` as the content passed to `expandable()`, and call `stack.resize(w, h)` from `onResize`.

## Wide layout

For figures that benefit from being wider than the article column but don't need full-page expand:

```javascript
display(expandable(figure, {
  wide: true,
  maxWidth: 1000,
  aspectRatio: 16 / 9,
  onResize(el, w, h) { ... }
}));
```

The figure will break out of the article's text column using negative margins, expand to `maxWidth`, and maintain the given `aspectRatio`. It will still support the expand-to-fullscreen toggle.
