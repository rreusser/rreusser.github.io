# Implementation Guide

A reference for building notebooks in this repository. Notebooks are written as HTML files using Observable Notebook Kit, which provides a reactive JavaScript runtime, built-in libraries, and a Vite-based build system.

## Sections

1. [Notebook Anatomy](./01-notebook-anatomy.md) — HTML structure, cell types, reactive model, `display`, `view`, `invalidation`, and imports
2. [Figures and Layout](./02-figures-and-layout.md) — `expandable()`, element stack, controls panel, wide layout
3. [Controls and Inputs](./03-controls-and-inputs.md) — `Inputs`, controls container pattern, dirty-flag pattern, range sliders
4. [2D Plots](./04-2d-plots.md) — regl + Observable Plot + SVG overlay, zoomable axes, lazy render loop
5. [3D Cameras](./05-3d-cameras.md) — `createUnifiedCamera`, orbit/arcball modes, camera buttons, snapshot
6. [WebGPU](./06-webgpu.md) — `createWebGPUContext`, buffer helpers, compute passes, shader debugging
7. [Utilities](./07-utilities.md) — frame loop, collapsible code, snapshots, theme, dependency injection

## Quick orientation

Notebooks live in `src/<notebook-name>/index.html`. Shared code lives in `src/lib/`. Symlink `src/lib` into your notebook directory and import from `./lib/` (not `../lib/`).

The canonical reference for interactive 2D plots is `src/plot-with-zoom/index.html`. The canonical reference for 3D notebooks is `src/boys-surface/index.html`.
