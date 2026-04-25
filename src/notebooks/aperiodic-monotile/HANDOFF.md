# Continuing the aperiodic-monotile notebook

This is a handoff for the next agent picking up `src/notebooks/aperiodic-monotile/`. Read this together with `CLAUDE.md` and `docs/implementation-guide/` at the repo root.

## Goal

Build a notebook that renders the **spectre** (chiral aperiodic monotile of Smith, Myers, Kaplan, Goodman-Strauss — [arXiv:2305.17743](https://arxiv.org/abs/2305.17743)) via the substitution system Kaplan describes at https://cs.uwaterloo.ca/~csk/spectre/. The end-state target is:

1. Exact integer-lattice arithmetic over **ℤ[ω]** (ω = e^(iπ/6)) for the substitution.
2. **Instanced WebGPU rendering** of potentially thousands–millions of tiles, each instance described by a small integer pose.
3. Eventually, a slider that **interpolates** between the hat (a, b) = (1, √3), the spectre (1, 1), and the turtle (√3, 1) by giving the polygon's edges parametric lengths.

## Working branch & process conventions

- Branch: `claude/aperiodic-monotile-notebook-jwfeR` (push here only).
- The owner (rreusser) has been clear on two things:
  1. **Build the notebook incrementally.** Don't try to write thousands of lines at once — the request will time out and the work has to be redone. One or two small slices per turn, push, let them verify, continue.
  2. **Variable-name policy in Observable Notebook Kit:** the runtime *does not* require unique top-level variable names per cell. Names only conflict when a cell *references* a name without declaring it locally. So duplicate `const pad = ...` in two cells is fine as long as no third cell uses an undeclared `pad`. Don't reach for block scopes to "fix" name-collision bugs — that diagnosis was already wrong once.
- Commit messages: descriptive, follow the existing repo style (look at `git log`).
- Dev server: do not start it. `npm run start` may already be running locally; the user controls it.

## What's implemented and verified

The notebook (`src/notebooks/aperiodic-monotile/index.html`) currently contains, in order:

1. Intro markdown.
2. **Spectre vertices in cartesian** (`spectreVertices`) — 14 points.
3. **Single-tile SVG render** (`spectre-svg`) — works. Use this cell as the canonical example of how to construct inline SVG via the `html` template.
4. **ℤ[ω] lattice math** (`lattice-math`) — `LP = [a, b, c, d]` representing `a + b·ω + c·ω² + d·ω³`. Helpers: `lpAdd`, `lpSub`, `lpNeg`, `lpMulOmega`, `lpRotate`, `lpConj`, `lpToXY`. `lpMulOmega` uses the relation `ω⁴ = ω² - 1` so it's a pure integer permutation.
5. **Spectre vertices in lattice form** (`spectreLatticeVertices`) — same 14 points, exact.
6. **Sanity-check cell** verifying lattice ↔ cartesian and unit edge lengths. Passes (errors at the level of `1e-15`).
7. **Transform algebra** (`transform-math`) — `Transform = {rot: 0..11, mirror: 0|1, t: LP}`. `txApply`, `txApplyLinear`, `txCompose`. Composition handles the `F·R = R⁻¹·F` mirror/rotation interaction.
8. **Substitution data** (`substitution-data`) — `TILE_NAMES` (the 9 metatile types), `transformationRules` (in 30° units, ported from Kaplan's reference), `superRules`, `baseQuad` (the 4 spectre indices `[3, 5, 7, 11]` that act as a metatile's "quad" handles).
9. **Substitution algorithm** (`metatile-build`) — `buildSpectreBase` returns the nine starting metatiles (eight bare spectres and the mystic Γ pair); `buildSupertiles` inflates one level. Direct port of the Python at https://github.com/shrx/spectre/blob/master/spectre.py with the only changes being lattice arithmetic instead of float matrices.
10. **`flattenMetaTile` + `tileColors`** (`flatten`).
11. **First tiling SVG render** (`render-svg`) — **CURRENTLY THE BUG.**

A diagnostic cell (commit `b673a15`) confirmed end-to-end that the substitution math runs fine: 9 leaves come out of a depth-1 Δ inflation; first leaf has transform `{rot: 6, mirror: 1, t: [0,0,0,0]}` and projects to (0, 0). So the data going into the renderer is correct.

## The current bug

The `render-svg` cell renders blank. The diagnostic version at commit `b673a15` proves all upstream computation succeeds. The current cell (commit `fbe4083`) is effectively the original render, just with prefixed local variable names instead of the discredited block-scope hack.

Suspected causes (none verified — the previous agent could not connect a browser):

1. **`html` template + nested SVG with array `.map()` of inner `html` templates.** The single-tile cell does work with nested `html` and a `map`, so this *probably* isn't it — but the failing cell has *only* a mapped array as the SVG's content (no static seed element first), which is one structural difference worth checking.
2. **A silent TypeScript transpile error** somewhere in the cell. esbuild typically just strips types, but worth looking at the browser console.
3. Something to do with `width` resolving to NaN/undefined at first paint, producing an SVG with NaN dimensions.

## Continuing locally — debug path

The repo is set up with `@rreusser/mcp-observable-notebook-kit-debug` (see `vite.config.js` and `node_modules/@rreusser/mcp-observable-notebook-kit-debug/`). With a browser pointed at the dev server, you have these MCP tools:

- `mcp__mcp-notebook-kit-debug__GetErrors` — surfaces both Vite build errors and Observable runtime rejections. **Run this first.**
- `mcp__mcp-notebook-kit-debug__GetConsoleMessages` (channel: `error`) — browser console errors.
- `mcp__mcp-notebook-kit-debug__RuntimeEval` — evaluate arbitrary expressions in the runtime; you have access to all reactive variables. Great for poking at `renderPolygons`, `renderVbW`, etc. inline.
- `mcp__mcp-notebook-kit-debug__GetValue` / `ListValues` — inspect specific variables.

Recommended sequence:

1. Open `http://localhost:5173/notebooks/aperiodic-monotile/` in a browser so the runtime is alive.
2. `GetErrors` and `GetConsoleMessages` to see what's actually thrown.
3. If nothing thrown, `RuntimeEval { body: "return renderPolygons.length" }` and similar to confirm the data is reaching the cell.
4. If the data is fine but the SVG is empty, the bug is in the html-template SVG output. Switch to a d3-based render: `d3.create("svg")` + `selectAll(...).data(...).join(...)`. d3 uses `createElementNS` so the SVG namespace is always correct.

## After the bug is fixed: next slices

In rough order. Do them as small slices per the user's preference.

1. **Depth slider** — `Inputs.range([0, 5], { value: 1, step: 1, label: "Substitution depth" })`. Tile counts grow ~9×/level; depth 5 ≈ 60k tiles, fine for SVG. Show a starting-tile selector too (default Δ).
2. **Move the rendering to WebGPU.** This is the real goal. Architecture:
   - One vertex buffer with the 14-vertex spectre triangulated (12 triangles, fan from vertex 0 works).
   - Per-instance buffer: `(tx, ty, cosθ, sinθ, mirrorSign, labelId)` ⇒ 24 bytes per instance.
   - Conversion from `(rot, mirror, t)` to per-instance floats happens *once* per tiling, in JS, after the recursion.
   - Use `src/lib/webgpu-canvas.js` for the context (it patches shader error reporting).
   - Color via a label palette buffer (uniform or storage).
   - See `src/notebooks/boys-surface/index.html` for the canonical 3D WebGPU notebook.
3. **Pan/zoom** — standard 2D view matrix uniform; pan via drag, zoom via wheel. See `src/notebooks/plot-with-zoom/` for the 2D zoom pattern.
4. **(a, b) interpolation** — the trickier one. See section below.
5. **Performance** — at 1M instances, the bottleneck is JS-side recursion and instance-buffer upload, not GPU. If we want >1M tiles, eventually do GPU-side substitution in a compute shader (ping-pong instance buffers per level). Out of scope for v1.

## (a, b) interpolation — design notes

The user wants a slider that morphs between hat ↔ spectre ↔ turtle. The combinatorial polygon is always 14 vertices and 14 edges; only the lengths assigned to each edge change. Two of the 14 edges are always collinear (the "spike" — vertices 9, 10, 11), which is what lets the hat and turtle look like 13-gons even though the algebra carries 14 vertices.

To support arbitrary `(a, b)`, every position in the tiling needs to be expressed as `a · v_a + b · v_b`, where `v_a` and `v_b` are *separate* lattice points. The substitution then carries a pair of lattice points instead of one. Concretely:

- Replace `LP` with `LP2 = { a: LP, b: LP }` representing `a · LP_a + b · LP_b`.
- Replace `Transform.t: LP` with `Transform.t: LP2`.
- Project to cartesian as `lpToXY(p.a) * a + lpToXY(p.b) * b`.

The catch: figuring out which edges of the spectre are "type a" (length a) vs "type b" (length b). That edge-type pattern is a fixed function of the spectre's geometry — work it out from the directions: edges 9 and 10 (both pointing in the 180° direction) are the two collinear ones, and they're one of each type so they merge into a single `a + b` edge in the hat. The full pattern around the polygon should be derivable from the requirement that hat = (1, √3) gives a closed 13-gon.

Once that's done, the substitution rules (`super_rules`, `transformation_rules`) don't change; only the geometry constants do. The integer lattice is preserved as long as `a` and `b` are tracked separately.

## Useful references

- Reference Python: https://github.com/shrx/spectre/blob/master/spectre.py — note this repo has *no LICENSE file*. It's a port of Kaplan's JavaScript and shouldn't be copied verbatim. Use it as reference only and re-implement.
- Tatham's combinatorial-coordinates writeup: https://www.chiark.greenend.org.uk/~sgtatham/quasiblog/aperiodic-spectre/
- Christian Lawson-Perfect's aperiodic-monotile repo (CC0 licensed, safe to copy from): https://github.com/christianp/aperiodic-monotile
- Kaplan's interactive app: https://cs.uwaterloo.ca/~csk/spectre/app.html — license unverified.
- `docs/implementation-guide/01-notebook-anatomy.md` — cells, reactive model, name rules.
- `docs/implementation-guide/06-webgpu.md` — WebGPU setup pattern.

## Files in this notebook directory

- `index.html` — the notebook itself.
- `metadata.yml` — title/tags.
- `lib` — symlink to `../../lib`. Import as `./lib/foo.js`, never `../lib/foo.js`.
- `HANDOFF.md` — this file. Delete or update when the bug is fixed.

## TL;DR for the next agent

1. Reload the notebook in a browser, run `GetErrors` to see what `render-svg` actually throws.
2. Most likely: the html template is mishandling SVG namespace for a mapped array of inner templates. Switch to d3-created SVG.
3. Once it renders, add the depth slider, then port to WebGPU instancing, then (a, b) interpolation.
4. Keep slices small. The user prefers many small commits over one big rewrite.
