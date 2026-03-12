# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This repository publishes Observable notebooks as a static website using Observable Notebook Kit. Notebooks are written as HTML files with reactive cells and built into static sites using Vite. HTML files in `src/` are Observable notebooks, *not* regular HTML files.

For implementation patterns, see the [implementation guide](docs/implementation-guide/README.md):

- [Notebook anatomy](docs/implementation-guide/01-notebook-anatomy.md) — cell types, reactive model, `display`/`view`, imports, debugging
- [Figures and layout](docs/implementation-guide/02-figures-and-layout.md) — `expandable()`, element stack, controls panel
- [Controls and inputs](docs/implementation-guide/03-controls-and-inputs.md) — `Inputs`, controls container, dirty-flag pattern
- [2D plots](docs/implementation-guide/04-2d-plots.md) — regl + Observable Plot + SVG overlay, zoomable axes
- [3D cameras](docs/implementation-guide/05-3d-cameras.md) — `createUnifiedCamera`, camera buttons, frame loop
- [WebGPU](docs/implementation-guide/06-webgpu.md) — context setup, buffer helpers, shader debugging
- [Utilities](docs/implementation-guide/07-utilities.md) — frame loop, collapsible code, snapshots
- [Writing style](docs/implementation-guide/08-writing-style.md) — prose, equations, cell IDs, TypeScript

## Quick reference

- Dev server: `http://localhost:5173/notebooks/{notebook-name}/` — normally already running
- Import shared code via `./lib/` (symlink `src/lib` into the notebook directory; never use `../lib/`)
- Do not import npm packages inside lib files — import them in the notebook and inject as arguments
- Mutable state shared across cells must be wrapped in an object; properties can be mutated freely but the variable itself cannot be reassigned from another cell
- Always clean up animations, timers, and event listeners in `invalidation.then()`
- Use `src/lib/webgpu-canvas.js` for WebGPU context creation (patches shader error reporting)
- Use `src/lib/frame-loop.js` for render loops
- Reference notebooks: `src/plot-with-zoom/index.html` (2D), `src/boys-surface/index.html` (3D/WebGPU)
