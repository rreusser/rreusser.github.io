# Controls and Inputs

## Basic inputs with view()

For simple inputs that feed directly into reactive cells, use the `view()` helper:

```javascript
const opacity = view(Inputs.range([0, 1], { label: "Opacity", value: 1, step: 0.01 }));
const showGrid = view(Inputs.toggle({ label: "Show grid", value: true }));
const colormap = view(Inputs.select(["viridis", "plasma", "inferno"], { label: "Colormap" }));
```

Each cell re-runs whenever the input changes, since other cells that reference `opacity` are reactive on it.

## Controls container pattern

When multiple inputs should appear together (and optionally float in a panel when the figure is expanded), group them into a shared container element. This avoids creating many separate top-level reactive variables and gives you precise control over rendering order.

```javascript
const controlsContainer = html`<div id="my-controls"></div>`;

function ctrl(input) {
  controlsContainer.appendChild(input);
  return Generators.input(input);  // returns an async generator that yields input values
}

const opacity = ctrl(Inputs.range([0, 1], { label: "Opacity", value: 1, step: 0.01 }));
const showGrid = ctrl(Inputs.toggle({ label: "Show grid", value: true }));

display(controlsContainer);
```

`Generators.input(input)` wraps an input element in an async generator that yields its current value immediately and again on each `input` event. When used at cell top level, Observable's reactive runtime subscribes to this generator and re-runs dependent cells on each new value.

Reference the controls container's CSS selector string or element reference in `expandable()`:

```javascript
display(expandable(figure, {
  width: 640, height: 480,
  controls: '#my-controls',
  onResize(el, w, h) { ... }
}));
```

## Dirty-flag pattern for render params

A naive approach to connecting controls to rendering re-runs the render on every input event. If multiple controls exist, each triggers its own re-run even if only one value changed. A better approach is to accumulate all control values into a shared mutable `params` object and mark the renderer dirty:

```javascript
// Cell 1: stable params object (never re-created)
const params = { opacity: 1.0, showGrid: true, resolution: 256 };

// Cell 2: update params when any control changes
params.opacity = opacity;
params.showGrid = showGrid;
params.resolution = resolution;
renderState.dirty = true;   // tell the render loop to redraw
```

Because `params` is defined in its own cell and only its properties are mutated, the render loop cell never re-runs on control changes. Only the "sync params" cell re-runs, which is cheap.

The render loop checks `dirty` each frame and exits early if nothing changed:

```javascript
const renderState = { dirty: true };

const loop = createFrameLoop(() => {
  if (!renderState.dirty) return;
  renderState.dirty = false;
  render(params);
});
invalidation.then(() => loop.cancel());
```

## Generators.input vs. view()

`view(input)` is best for a single input whose value is used reactively across cells. `Generators.input(input)` is best when grouping multiple inputs into a container, since you can render them manually without the auto-display behavior of `view()`.

## Range slider with interval selection

For parameters that need a range (min/max) selection, use the `interval` component from `./lib/range-slider.js`:

```javascript
import { interval } from './lib/range-slider.js'

const rRange = ctrl(interval([0, 1], {
  label: "r range",
  value: [0, 1],
  step: 0.001,
  invertible: true   // adds an invert checkbox
}));

// rRange.value is { range: [min, max], invert: boolean }
```

## Fine-grained range slider

For sliders that need sub-step precision (useful when exploring a value at different levels of precision), use `FineRange` from `./lib/fine-range.js`. The user can drag vertically to reduce the step size by powers of two:

```javascript
import FineRange from './lib/fine-range.js'

const fineInput = FineRange(Inputs.range, [0, 1], {
  label: "Fine value",
  value: 0.5
});
const fineValue = ctrl(fineInput);
```

## Checkbox and event-listener approach

For non-reactive controls (when you do not want a control change to re-run downstream cells), attach an event listener directly to the container instead of using `Generators.input`:

```javascript
controlsContainer.addEventListener('input', () => {
  params.opacity = opacityInput.value;
  params.showGrid = showGridInput.checked;
  renderState.dirty = true;
});
```

This is particularly useful for controls that update a `params` object used by a render loop, since no reactive re-running is needed.
