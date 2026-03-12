function _1(md){return(
md`# regl-canvas`
)}

function _2(md){return(
md`This notebook implements a helper to create a [\`regl\`](https://github.com/regl-project/regl) canvas. I originally used the technique described in [@rreusser/observable-regl](https://observablehq.com/@rreusser/observablehq-regl) to instantiate a no-frills \`regl\` WebGL context, but dependence on page width causes causes excessive recreation of WebGL contexts as the page resizes. Web pages are limited to about sixteen WebGL contexts before old contexts are simply dropped, causing excessive context recreation and, worse, intermittent broken figures in notebooks with more than one canvas.

This helper exists so that you can easily instantiate a context which is updated and reused as its instantiation properties change. It uses explicit dependence on the existing context to ensure that a new context is created only when the existing context definitely cannot simply be reused.`
)}

function _regl(reglCanvas,width){return(
reglCanvas(this, {
  width: width * 0.7,
  height: width * 0.2,
  attributes: { antialias: true },
  extensions: ["OES_standard_derivatives"],
  style: { backgroundColor: "red" }
})
)}

function _draw(regl)
{
  // Don't forget to poll if outside a `regl.frame` loop!
  regl.poll();
  regl.clear({ color: [0.4, 0.3, 0.8, 1] });
}


function _5(md){return(
md`## Usage`
)}

function _6(md){return(
md`Import using

\`\`\`js
import { reglCanvas } from '@rreusser/regl-canvas'
\`\`\`

and then instantiate a canvas with

\`\`\`js
viewof regl = reglCanvas(this, { ... })
\`\`\``
)}

function _7(md){return(
md`Options mirror the [regl constructor options](https://github.com/regl-project/regl/blob/master/API.md#all-initialization-options), with only a couple omissions and the addition of \`width\` and \`height\`. Options are:

- **\`width\`** (default: \`width\`): canvas width
- **\`height\`** (default: \`width * 0.5\`): canvas height
- **\`createREGL\`**: optional REGL constructor. If not provided, \`regl@latest\` is preferred.
- **\`attributes\`** (default: \`{}\`): The [context creation attributes](https://www.khronos.org/registry/webgl/specs/1.0/#WEBGLCONTEXTATTRIBUTES) passed to the WebGL context constructor.
- **\`pixelRatio\`** (default: \`devicePixelRatio\`): A multiplier which is used to scale the canvas size relative to the container.
- **\`extensions\`** (default: \`[]\`): 	A list of extensions that must be supported by WebGL context.
- **\`optionalExtensions\`** (default: \`[]\`): 	A list of extensions which are loaded opportunistically.
- **\`profile\`** (default \`false\`): If set, turns on profiling for all commands by default.
- **\`style\`** (default \`null\`): Assign CSS styles to the HTML canvas element.`
)}

function _8(md){return(
md`## Implementation`
)}

function _createREGLLatest(require){return(
require("regl")
)}

function _reglCanvas(width,createREGLLatest,HTMLCanvasElement,DOM){return(
function reglCanvas(currentCanvas, opts) {
  opts = opts || {};
  const w = opts.width || width;
  const h = opts.height || Math.floor(w * 0.5);
  const createREGL = opts.createREGL || createREGLLatest;

  function normalizeConfig(opts) {
    const normalized = Object.assign(
      {},
      {
        pixelRatio: devicePixelRatio,
        attributes: {},
        extensions: [],
        optionalExtensions: [],
        profile: false
      },
      opts || {}
    );
    delete normalized.width;
    delete normalized.height;
    return normalized;
  }

  const config = normalizeConfig(opts);

  function preserveExisting(canvas, newConfig) {
    const currentConfig = canvas.config;
    if (JSON.stringify(currentConfig) !== JSON.stringify(newConfig)) {
      return false;
    }
    return canvas;
  }

  function resizeCanvas(canvas, width, height) {
    if (width) {
      canvas.width = Math.floor(width * config.pixelRatio);
      canvas.style.width = `${Math.floor(width)}px`;
    }
    if (height) {
      canvas.height = Math.floor(height * config.pixelRatio);
      canvas.style.height = `${Math.floor(height)}px`;
    }
  }

  if (currentCanvas) {
    if (!(currentCanvas instanceof HTMLCanvasElement)) {
      throw new Error(
        "Unexpected first argument type. Did you forget to pass `this` as the first argument?"
      );
    }
    resizeCanvas(currentCanvas, w, h);
    const existing = preserveExisting(currentCanvas, config);
    if (existing) return existing;
  }

  const canvas = DOM.element("canvas");
  // Clone the options since canvas creation mutates the `attributes` object,
  // causing false positives when we then use it to detect changed config.
  const style = config.style;
  delete config.style;
  const regl = createREGL({ canvas, ...JSON.parse(JSON.stringify(config)) });
  resizeCanvas(canvas, w, h);
  canvas.value = regl;
  canvas.config = config;

  if (style) {
    for (const [prop, value] of Object.entries(style)) {
      if (canvas.style[prop] !== value) canvas.style[prop] = value;
    }
  }

  return canvas;
}
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["md"], _2);
  main.variable(observer("viewof regl")).define("viewof regl", ["reglCanvas","width"], _regl);
  main.variable(observer("regl")).define("regl", ["Generators", "viewof regl"], (G, _) => G.input(_));
  main.variable(observer("draw")).define("draw", ["regl"], _draw);
  main.variable(observer()).define(["md"], _5);
  main.variable(observer()).define(["md"], _6);
  main.variable(observer()).define(["md"], _7);
  main.variable(observer()).define(["md"], _8);
  main.variable(observer("createREGLLatest")).define("createREGLLatest", ["require"], _createREGLLatest);
  main.variable(observer("reglCanvas")).define("reglCanvas", ["width","createREGLLatest","HTMLCanvasElement","DOM"], _reglCanvas);
  return main;
}
