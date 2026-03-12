# Notebook Anatomy

Notebooks are plain HTML files stored in `src/<notebook-name>/index.html`. They use a custom `<notebook>` element (not standard HTML) whose cells are `<script>` elements. The Observable Notebook Kit runtime interprets this format and provides reactive execution, built-in globals, and a set of standard library functions.

## File structure

```html
<!doctype html>
<notebook theme="air">
  <title>Notebook Title</title>

  <script id="intro" type="text/markdown">
    # Introduction
  </script>

  <script id="imports" type="text/x-typescript">
    import { expandable } from './lib/expandable.js'
  </script>

  <script id="figure" type="text/x-typescript">
    display(expandable(canvas, { width: 640, height: 480 }));
  </script>
</notebook>
```

The `theme` attribute on `<notebook>` sets the visual theme. Use `"air"` (light, default) or `"ink"` (dark).

## Cell types

Each `<script>` element is a cell. The `id` attribute becomes the cell's name in the reactive graph. Use descriptive IDs rather than numbers.

| `type` attribute | Purpose |
|---|---|
| `text/markdown` | Prose, headings, equations. Supports `${tex\`...\`}` interpolation. |
| `type="module"` | Plain JavaScript with reactive top-level variables. |
| `text/x-typescript` | TypeScript — identical semantics to `type="module"` but transpiled. Prefer this. |
| `text/html` | Raw HTML/CSS injected into the page. |
| `application/vnd.observable.javascript` | Old Observable-flavored JS. Avoid — it does not support standard ES module syntax. |

The `pinned` attribute on a cell causes its source code to be shown by default in the rendered notebook.

## Reactive model

Top-level variable declarations in `type="module"` or `type="text/x-typescript"` cells become named reactive nodes. When cell A references a variable from cell B, cell A automatically re-runs whenever cell B's value changes. This is the core of Observable's dataflow programming model.

```html
<!-- Cell A defines a variable -->
<script id="count" type="text/x-typescript">
  const count = 42;
</script>

<!-- Cell B depends on A and re-runs when count changes -->
<script id="doubled" type="text/x-typescript">
  const doubled = count * 2;
</script>
```

The last expression in a cell is its "cell value," available to other cells by the cell's `id`. All other `const`/`let` declarations at the top level of the cell are also exported.

Variable names must be unique across the notebook. Two cells that both declare `const x` at top level create an ambiguous dependency; any third cell that references `x` will fail.

## Built-in globals

The runtime provides several globals without any import:

- `html` — tagged template literal that parses HTML into DOM elements
- `width` — reactive current width of the notebook content column (re-runs dependents on resize)
- `display(value)` — renders `value` to the page and returns it
- `view(input)` — renders `input.value` to the page and returns `input.value` (for reactive input binding)
- `invalidation` — a Promise that resolves when the cell is about to re-run or the notebook is closed. Use to cancel animations, timers, and event listeners.
- `Inputs` — Observable Inputs library
- `Plot` — Observable Plot library
- `d3` — D3 library
- `Generators` — Observable standard library generators (e.g. `Generators.input()`)
- `tex` — KaTeX template tag for math rendering inside markdown cells

## display and view

`display(value)` renders a value to the cell's output slot and passes it through:

```javascript
const canvas = display(document.createElement('canvas'));
```

`view(input)` is a shorthand for reactive inputs. It renders the input widget to the page and returns a reactive value that updates as the user interacts with the widget:

```javascript
// The variable 'opacity' is a number that updates when the slider changes
const opacity = view(Inputs.range([0, 1], { label: "Opacity", value: 1 }));
```

This is equivalent to the old `viewof` syntax in Observable JavaScript.

## Invalidation and cleanup

Animations, timers, and event listeners must be cleaned up when a cell re-runs. Use `invalidation.then()`:

```javascript
const loop = createFrameLoop((t) => render(t));
invalidation.then(() => loop.cancel());
```

Without cleanup, every time a dependency changes (e.g. a slider is moved), a new loop starts without the old one stopping, leading to compounding resource leaks.

## Mutable state across cells

Observable's reactive model tracks variable *identity*, not mutations. You cannot reassign a variable defined in another cell:

```javascript
// Cell 1
const count = 0;

// Cell 2 — ERROR: "Assignment to external variable"
count = count + 1;
```

The standard pattern for mutable shared state is to wrap it in an object defined in one cell and mutate its properties from other cells:

```javascript
// Cell 1: define the state container
const state = { dirty: true, opacity: 1.0 };

// Cell 2: mutate properties freely
state.opacity = opacity;  // OK
state.dirty = true;
```

This pattern is required whenever multiple cells need to update the same data, such as render params driven by slider controls.

## Imports

Use standard ES module imports. External packages come from npm via the `npm:` specifier or from Observable's standard library via `observable:`:

```javascript
import * as d3 from 'npm:d3@7'
import createREGL from 'npm:regl@2.1.1'
```

Local shared utilities live in `src/lib/`. Because of Vite's module resolution, do not import using `../lib/`. Instead, symlink `src/lib` into the notebook directory and import from `./lib/`:

```bash
ln -s ../lib src/my-notebook/lib
```

Then import normally:

```javascript
import { expandable } from './lib/expandable.js'
```

Do not use npm imports inside imported `.js` files. External packages should only be imported at the notebook level, then passed as arguments to library functions if needed.
