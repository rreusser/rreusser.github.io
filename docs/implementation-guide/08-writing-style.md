# Writing Style

## Prose

Be concise and direct. Avoid filler phrases like "key insight," "it's worth noting," or "importantly." Avoid em-dashes and colons as dramatic separators. When in doubt, use a shorter sentence.

Prefer narrative paragraphs over bullet lists. Use lists only where the content is genuinely enumerable — steps of an algorithm, a list of options, a comparison table.

Break long markdown sections into multiple cells rather than one large block. Each `text/markdown` cell should cover a single idea.

## Equations

Always use `${tex`...`}` for inline math and `${tex.block`...`}` for display math. Never use `$...$` or `$$...$$` — these are not supported.

Integrate equations into sentences naturally rather than introducing them with a colon. For example:

```markdown
The surface is parameterized by ${tex`(u, v) \in [0,1]^2`}, where ${tex`u`} controls the radial extent.
```

Block equations work the same way — end the preceding sentence, then let the equation follow as part of the flow:

```markdown
The pendulum evolves according to

${tex.block`\ddot{x} + b\dot{x} + x = \sum_n \frac{X_n - x}{|X_n - x|^3}`}

where ${tex`b`} is the friction coefficient.
```

## Cell IDs

Use descriptive string IDs for cells rather than numbers. The ID appears in error messages and is used by the MCP debugger to locate cells, so names like `"imports"`, `"camera"`, `"render-loop"` are far more useful than `"3"` or `"42"`.

## Code visibility

By default, code cells are hidden in the rendered notebook and only their output is shown. Add the `pinned` attribute to a cell to show its source:

```html
<script id="imports" type="text/x-typescript" pinned="">
  import { expandable } from './lib/expandable.js'
</script>
```

Use `collapseCodeBlocks` from `./lib/collapsible-code.js` (see [Utilities](./07-utilities.md)) to truncate long pinned cells behind an expand button rather than showing them in full.

## TypeScript

Prefer `type="text/x-typescript"` over `type="module"` for code cells. The semantics are identical but TypeScript gives better editor feedback. Keep type annotations light — the goal is readable notebook code, not production-grade typing.
