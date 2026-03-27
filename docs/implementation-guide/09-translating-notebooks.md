# Translating Observable Notebooks

Many notebooks in this repository are translations of notebooks originally published on [observablehq.com](https://observablehq.com). The original notebook is typically saved alongside the translated version as `original.html`. This document describes the process and priorities for translating them.

## Order of operations

Translation is a multi-phase process. Each phase should be substantially complete before moving to the next.

### 1. Copy computation exactly

The first and most important step is to reproduce the original's computation with **identical numerical results**. This means:

- **Copy all functions verbatim.** Adapt only the syntax required by the new environment (e.g. TypeScript annotations, `Float64Array` instead of `[]`). Do not simplify, refactor, optimize, or rewrite algorithms.
- **Preserve all constants and parameters.** Step sizes, tolerances, iteration counts, search depths, subdivision geometries — these are tuned. Do not change them.
- **Use the same dependencies.** If the original imports a function from a library (e.g. `durand-kerner`, `@rreusser/integration`), import that same library rather than reimplementing the algorithm. Use `import ... from 'npm:package-name'` for npm packages and `import ... from 'observable:@user/notebook'` for Observable notebooks.
- **Do not infer the contents of functions.** Numerical code often uses non-obvious algorithms chosen for stability (e.g. robust complex division, branch-cut–aware square roots, specific contour integration geometries). A "standard" implementation of the same mathematical operation may be subtly wrong. If you cannot see a function's source, download it (see below) rather than guessing.
- **Verify values at every intermediate step.** Run both the original and the translation side by side. Compare intermediate values (e.g. wave speeds, root seeds, traced paths) at each stage of the computation pipeline. Do not wait until the final visualization to discover mismatches.

### 2. Inspect and download dependencies

Use the `notebooks` CLI to download Observable notebook dependencies for inspection:

```sh
./node_modules/.bin/notebooks download <observable-url>
```

This outputs the notebook as an HTML file you can read to understand its exports, function signatures, and implementation details. This is essential when the original imports computation code from other notebooks.

### 3. Translate the visualization

Only after the computation is verified should you translate the rendering:

- Replace regl with WebGPU (using `createWebGPUContext`, `webgpuElement`, etc.)
- Replace `regl-gpu-lines` with `webgpu-instanced-lines`
- Translate GLSL shaders to WGSL
- Wire up controls, camera, expandable figures

When translating shaders and data pipelines, carefully trace coordinate conventions end-to-end. A common source of bugs is axis swaps: the original may store data as `[a, b, c]`, apply a model matrix, and swizzle components in the shader (e.g. `.xzy`). The combined effect determines which value maps to which screen axis. Trace through the full pipeline — data packing, model transform, shader swizzle — and verify the result matches.

### 4. Optimize (only if needed)

Performance improvements, code cleanup, or architectural changes come last and only when justified. The working, verified translation is the baseline.

## Running the original for comparison

The original notebook (`original.html`) can often be loaded directly at `http://localhost:5173/notebooks/{name}/original.html`. Some cells may fail (e.g. those depending on regl or on interactive widgets not available locally), but computation cells typically work and their values can be inspected via the runtime eval tools.

If a dependency fails to resolve, you can stub it (e.g. add a cell that defines `const sprintf = (fmt, ...args) => args.join(', ')`) or download the dependency notebook. Focus on getting computation cells to evaluate — rendering cells are not needed for validation.
