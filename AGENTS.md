# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This repository publishes Observable notebooks as a static website using Observable Notebook Kit. Notebooks are written as HTML files with reactive cells and built into static sites using Vite. HTML files in src/ are Observable notebooks, *not* regular HTML files. Use the editing-notebooks skill to understand their composition.

## Style guide

- DO NOT use phrases like "key insight" or excessive punctuation like colons and em-dashes.

- Use bulleted or numbered lists only where it is a good fit, as in steps of an algorithm. Prefer narrative paragraphs in general.

- DO use ${tex`...`} and ${tex.block`...`} for typesetting TeX equations.

- Use the techniques in src/plot-with-zoom/index.html as a good reference for making plots.

## Debugging techniques

- The base URL for notebooks is http://localhost:5173/notebooks/{notebook-name}/. In general, a server will already be running so you do not need to start it.

- Assign unique and useful IDs to HTML elements and plot elements to make them easier to find and query.

- Use the Notebook MCP server to aid debugging. If it reports that the notebook disconnects while working, the most likely reason is a recent syntax error which prevents vite from building. Stop immediately and locate the syntax error, then refresh.

- DO NOT import from `../lib`. Instead, symlink src/lib into src/notebook-name/lib and import from `./lib`.

- DO NOT import external modules in imported javascript files. Import external modules like npm: or observable: imports from the notebook, then inject them if necessary into library functions.

- **Mutable state across cells**: Observable notebooks don't allow reassigning variables defined in other cells. If you need mutable state that multiple cells can modify, wrap it in an object:
  ```javascript
  // Cell 1: Define state object
  const renderState = { dirty: true };

  // Cell 2: Can modify properties (NOT reassign the variable)
  renderState.dirty = true;  // OK
  // dirty = true;           // ERROR: "Assignment to external variable"
  ```
  This pattern is required for render loops, dirty flags, animation state, etc.

## WebGPU techniques

- Use src/lib/webgpu-canvas.js for WebGPU context creation. This ensures we automatically correctly capture shader compilation errors.
- Use src/lib/frame-loop.js
