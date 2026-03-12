import define1 from "./d0ffd921b8188ba9@44.js";
import define2 from "./b1c1bcfaa4edd969@153.js";
import define3 from "./2ef1e084af5636f7@102.js";
import define4 from "./2f20d5b55f4d0b31@205.js";
import define5 from "./691ae3b95f02db79@1157.js";

function _1(md){return(
md`# regl-tools

This notebook implements a number of helper methods for simple regl, canvas and SVG plots in Observable. The goal is simple: to the extent reasonably possible, creating plots should contain information about the particular plot, not about setup and rendering.

To this end, it uses \`d3\` scales and makes some opinionated choices about how to represent things, though the result is hopefully general enough that it's more useful than constraining.`
)}

function _2(html,md,PINNED){return(
html`<div style="border:1px solid black; border-radius: 3px; padding: 10px; max-width:640px;">👉<em style="color:#c22">NOTE:</em> I'm learning Observable! You should <a href="https://observablehq.com/@bryangingechen/version-pinning-for-notebooks">pin the version</a> if you use any functions herein:

${md`~~~javascript
import { reglCanvas } from '${PINNED}'
~~~`}

This notebook is highly subject to changes and regrets. My biggest current regrets are:
${md`
- It should use x0, y0, x1, y1 for the viewport. Not margins. Much more portable, except for the fact that you have to carry around the DPI along with it.
- ~~It should add a WebGL context to an SVG as a foreign object, if possible. The reason I focused on stacking them is that WebGL contexts are limited and sooner or later you make subplots or layers and regret needing many WebGL contexts in a single plot. I was trying to make heavy use of viewports and scissoring for the sake of efficiency and minimizing contexts, but I could still do that and play the SVG game a bit better.~~
- Update: WebGL *does not* play well with SVG as a foreign object. There are some really obscure rendering bugs that prevent WebGL contexts from obeying last-on-top SVG-style ordering. My conclusion is that it is *not*, in fact, wise to go overboard with fanciness and instead to just layer the elements.
`}</span>`
)}

function _4(md){return(
md`## reglCanvas

Create a [regl](https:/github.com/regl-project/regl) canvas using syntax which roughly mirrors that of [@observablehq/stdlib's DOM.context2d method](https://github.com/observablehq/stdlib).`
)}

function _reglCanvas(createREGL){return(
function reglCanvas (width, height, dpi, reglOptions) {
  dpi = dpi === undefined ? devicePixelRatio : dpi;
  reglOptions = reglOptions || {}
  var canvas = document.createElement("canvas");
  canvas.width = dpi * width;
  canvas.height = dpi * height;
  canvas.style.width = width + "px";
  const regl = createREGL(Object.assign({}, reglOptions, {pixelRatio: dpi, canvas}));
  canvas.value = regl;
  canvas.__reglConfig = {dpi, reglOptions}
  return canvas;
}
)}

function _6(md){return(
md`## reusableReglCanvas`
)}

function _reusableReglCanvas(width,reglCanvas){return(
function reusableReglCanvas (existingCanvas, config) {
  var dpi = config.dpi === undefined ? devicePixelRatio : config.dpi
  var reglOptions = config.reglOptions || {}
  var newConfig = {dpi, reglOptions}
  var needsNewContext = !existingCanvas || 
      JSON.stringify(newConfig) !== JSON.stringify(existingCanvas.__reglConfig)
  
  if (!needsNewContext) {
    existingCanvas.width = Math.floor(config.width * dpi)
    existingCanvas.height = Math.floor(config.height * dpi)
    existingCanvas.style.width = `${width}px`
    return existingCanvas
  }
  
  if (existingCanvas && existingCanvas.value && existingCanvas.value.destroy) {
    existingCanvas.value.destroy()
    delete existingCanvas.value
  }
  
  return reglCanvas(config.width, config.height, dpi, reglOptions)
}
)}

function _8(md){return(
md`## reglCanvasWithOptions

A convenience function to reduce boilerplate by currying arguments. To create a function which strictly accepts \`width\`, \`height\`, and \`dpi\`, e.g.

\`\`\`js
fn = (width, height, dpi) => reglCanvas(width, height, dpi, { ...reglOptions })
\`\`\`

you may instead write

\`\`\`js
fn = reglCanvasWithOptions({ ...reglOptions })
\`\`\`
`
)}

function _reglCanvasWithOptions(reglCanvas){return(
function reglCanvasWithOptions (reglOptions) {
  return function (width, height, dpi) {
    return reglCanvas(width, height, dpi, reglOptions);
  }
}
)}

function _getOrAttachReglFO(createREGL){return(
function getOrAttachReglFO (svg, width, height, dpi, reglOptions) {
  let fo = svg.selectAll('.regl-canvas')
  .data([null]).join(enter => enter.append('foreignObject'))
    .attr('class', 'regl-canvas')
    .attr('width', width)
    .attr('height', height)
    //.style('position', 'relative')
    //.style('z-index', -1)

  fo.selectAll('canvas')
    .data([null]).join(enter => enter.append('xhtml:canvas'))
    .attr('width', width * dpi)
    .attr('height', height * dpi)
    .style('width', width + 'px')
    .style('height', height + 'px')

  const reglCanvas = fo.select('canvas').node()
  const regl = reglCanvas.value = reglCanvas.value || createREGL(Object.assign(reglOptions || {}, {
    canvas: reglCanvas,
    pixelRatio: dpi,
  }))
  regl.data = regl.data || {}
  return reglCanvas;
}
)}

function _11(md){return(
md`## createLayerStack

Create a stack of layers (first on bottom). Each item receives width, height, and dpi. \`layerConstructors\` is either an array or an object of constructors for each layer. If an array, the returned layers are referenced by index. If an object, stable ordering of keys is assumed and layers may be referenced by name.`
)}

function _createLayerStack(Element){return(
function createLayerStack (w, h, dpi, layerConstructors) {
  w = Math.floor(w);
  h = Math.floor(h);
  dpi = dpi === undefined ? devicePixelRatio : dpi;
  const dpiWidth = Math.floor(w * dpi);
  const dpiHeight = Math.floor(h * dpi);
  const container = document.createElement('div');
  container.style.position = "relative";
  container.style.width = w + 'px';
  container.style.height = h + 'px';
  
  function createLayer(ctor, i) {
    let element;
    let value = ctor(w, h, dpi);
    if (value instanceof Element) {
      element = value;
      value = element.value || element;
    } else {
      element = value.canvas || value;
    }
    element.style.position = "absolute";
    element.style.top = 0
    element.style.left = 0;
    element.style.width = '100%';
    element.style.height = '100%';
    element.style.zIndex = i;
    container.appendChild(element);
    return value;
  }
  
  let layers;
  if (Array.isArray(layerConstructors)) {
    layers = layerConstructors.map(createLayer);
  } else {
    let layerNames = Object.keys(layerConstructors);
    layers = {};
    layerNames.forEach((name, i) => {
      layers[name] = createLayer(layerConstructors[name], i);
    })
  }
  
  return {
    layers,
    container,
    dpiWidth,
    dpiHeight,
    dpi,
    width: w,
    height: h
  };
}
)}

function _13(md){return(
md`## createReglViewportConfiguration

Configure a regl viewport independent of pixel ratio given a layer stack. Returns a \`regl\` command which may be invoked with a \`viewport\` and a \`callback\`.`
)}

function _createReglViewportConfiguration(mat3create){return(
function createReglViewportConfiguration (regl) {
  const viewport3 = mat3create();
  
  let command = regl({
    scissor: {
      enable: true,
      box: { 
        x: (ctx, props) => ctx.pixelRatio * props.margin.l,
        y: (ctx, props) => ctx.pixelRatio * props.margin.b,
        width: (ctx, props) => ctx.framebufferWidth - ctx.pixelRatio * (props.margin.r + props.margin.l),
        height: (ctx, props) => ctx.framebufferHeight - ctx.pixelRatio * (props.margin.t + props.margin.b)
      }
    },
    viewport: {
      x: (ctx, props) => ctx.pixelRatio * props.margin.l,
      y: (ctx, props) => ctx.pixelRatio * props.margin.b,
      width: (ctx, props) => ctx.framebufferWidth - ctx.pixelRatio * (props.margin.r + props.margin.l),
      height: (ctx, props) => ctx.framebufferHeight - ctx.pixelRatio * (props.margin.t + props.margin.b)
    },
    uniforms: {
      viewportResolution: (ctx, props) => [ctx.viewportWidth, ctx.viewportHeight],
      framebufferResolution: ctx => [ctx.framebufferWidth, ctx.framebufferHeight],
      inverseViewportResolution: (ctx, props) => [1 / ctx.viewportWidth, 1 / ctx.viewportHeight],
      inverseFramebufferResolution: ctx => [1 / ctx.framebufferWidth, 1 / ctx.framebufferHeight],
    }
  });
  return function (viewport, callback) {
    command(viewport, callback);
  }
}
)}

function _15(md,tex){return(
md`## createReglLinearScaleConfiguration

Create a regl command which adds 2d (${tex`3 \times 3`}) and and 3d (${tex`4 \times 4`}) homogeneous transformation matrices to \`regl\` context and uniforms. Must be invoked with two \`d3\` \`linearScales\` and a \`callback\`.`
)}

function _createReglLinearScaleConfiguration(mat3create,mat4create,mat3fromLinearScales,mat3invert,mat4fromMat3){return(
function createReglLinearScaleConfiguration(regl) {
  const matrices = {
    view3: mat3create(),
    inverseView3: mat3create(),
    view: mat4create(),
    inverseView: mat4create()
  };
  const command = regl({
    context: {
      view3: regl.prop('view3'),
      inverseView3: regl.prop('inverseView3'),
      view: regl.prop('view'),
      inverseView: regl.prop('inverseView')
    },
    uniforms: {
      view3: regl.prop('view3'),
      inverseView3: regl.prop('inverseView3'),
      view: regl.prop('view'),
      inverseView: regl.prop('inverseView')
    }
  });

  return function(xScale, yScale, clbk) {
    mat3fromLinearScales(matrices.view3, xScale, yScale);
    mat3invert(matrices.inverseView3, matrices.view3);
    mat4fromMat3(matrices.view, matrices.view3);
    mat4fromMat3(matrices.inverseView, matrices.inverseView3);
    command(matrices, clbk);
  };
}
)}

function _17(md,tex){return(
md`## createReglMap

Create a \`regl\` command to configure a single triangle covering the whole viewport. Accepts options with an optional \`transform\` parameter defining the name of a uniform to use as a 3d homogeneous (${tex`4 \times 4`}) matrix uniform to be applied in the vertex shader.`
)}

function _createReglMap(){return(
function (regl, opts) {
  opts = opts || {};
  let transform = opts.transform === undefined ? 'inverseView' : opts.transform;
  return regl({
    vert: `
      precision highp float;
      ${transform ? `uniform mat4 ${transform};` : ''}
      attribute vec2 aUV;
      varying vec2 xy;
      void main () {
        xy = ${transform ? `(${transform} * vec4(aUV, 0, 1)).xy` : 'aUV'};
        gl_Position = vec4(aUV, 0, 1);
      }`,
    attributes: {aUV: [-4, -4, 4, -4, 0, 4]},
    depth: {enable: false},
    primitive: 'triangles',
    count: 3,
  })
}
)}

function _mat3ViewportFromLinearScales(){return(
function mat3ViewportFromLinearScales (out, xScale, yScale) {
  let xRange = xScale.range();
  let yRange = yScale.range();
  
  let w = xRange[1] - xRange[0];
  let h = yRange[0] - yRange[1];
  out[0] = 0.5 * w;
  out[1] = 0;
  out[2] = 0;

  out[3] = 0;
  out[4] = -0.5 * h;
  out[5] = 0;

  out[6] = 0.5 * w + xRange[0];
  out[7] = 0.5 * h + yRange[1];
  out[8] = 1;
  
  return out;
}
)}

function _mat3fromLinearScales(){return(
function mat3fromLinearScales (out, xScale, yScale) {
  let xDomain = xScale.domain()
  let yDomain = yScale.domain()
  
  let xs = 2 / (xDomain[1] - xDomain[0])
  let ys = 2 / (yDomain[1] - yDomain[0])
  
  out[0] = xs
  out[1] = 0
  out[2] = 0
  
  out[3] = 0
  out[4] = ys
  out[5] = 0
  
  out[6] = -1 - xs * xDomain[0]
  out[7] = -1 - ys * yDomain[0]
  out[8] = 1
  
  return out;
}
)}

function _21(md){return(
md`## createViewport

Create a simple representation of a viewport`
)}

function _createViewport(){return(
function createViewport (opts, margin) {
  return {
    width: opts.width,
    height: opts.height,
    dpi: opts.dpi,
    margin: Object.assign({t: 0, r: 0, b: 0, l: 0}, margin || {}),
  };
}
)}

function _23(md){return(
md`## viewportAxes

Render basic SVG axes given a viewport and two \`d3\` scales.`
)}

function _viewportAxes(d3){return(
function viewportAxes (viewport, xScale, yScale, opts) {
  opts = opts || {};
  viewport.margin = viewport.margin === undefined ? {t: 0, r: 0, b: 0, l: 0} : viewport.margin;
  opts.xLabelSpacing = opts.xLabelSpacing === undefined ? 80 : opts.xLabelSpacing
  opts.yLabelSpacing = opts.yLabelSpacing === undefined ? 80 : opts.yLabelSpacing
  let xAxis = opts.xAxis === undefined ? d3.axisBottom : opts.xAxis
  let yAxis = opts.yAxis === undefined ? d3.axisLeft : opts.yAxis
  let xRange = xScale.range();
  let yRange = xScale.range();
  viewport.width = viewport.width === undefined ? (xRange[1] - xRange[0]) : viewport.width;
  viewport.height = viewport.height === undefined ? (yRange[1] - yRange[0]) : viewport.height;
  return function (selection) {
    let xa = selection.select('g.x.axis');
    if (xa.empty()) {
      xa = selection.append("g").attr("class", "x axis")
    }
    xa.attr("transform", "translate(0," + (viewport.height - viewport.margin.b) + ")")
      .call(xAxis(xScale)
        .ticks(Math.floor((viewport.width - viewport.margin.l - viewport.margin.r) / opts.xLabelSpacing)))

    
    let ya = selection.select('g.y.axis');
    if (ya.empty()) {
      ya = selection.append("g").attr("class", "y axis")
    }
    ya.attr('transform', 'translate(' + viewport.margin.l + ', 0)')
      .call(yAxis(yScale)
        .ticks(Math.floor((viewport.height - viewport.margin.t - viewport.margin.b) / opts.yLabelSpacing)))
    
    return selection;
  };
}
)}

function _constrainLinearScaleAspectRatio(){return(
function constrainLinearScaleAspectRatio (newScale, refScale, aspectRatio) {
  let newDomain = newScale.domain();
  let refDomain = refScale.domain();
  let newRange = newScale.range();
  let refRange = refScale.range();
  let newDomainLength = newDomain[1] - newDomain[0];
  let newRangeLength = newRange[1] - newRange[0];
  let refDomainLength = refDomain[1] - refDomain[0];
  let refRangeLength = refRange[1] - refRange[0];
  let refRes = refRangeLength / refDomainLength;
  let newRes = newRangeLength / newDomainLength;
  let currentAspect = Math.abs(newRes / refRes);
  let newDomainCenter = 0.5 * (newDomain[0] + newDomain[1]);
  newScale.domain([
    newDomainCenter - newDomainLength * 0.5 * currentAspect / aspectRatio,
    newDomainCenter + newDomainLength * 0.5 * currentAspect / aspectRatio
  ]);
  return newScale;
}
)}

function _persistentZoom(d3){return(
function persistentZoom (xScale, yScale, originalXScale, originalYScale, callback) {
  return d3.zoom().on('zoom', function () {
    let range
    let t = d3.event.transform;

    range = xScale.range().map(t.invertX, t);
    xScale.domain(originalXScale.domain())
    xScale.domain(range.map(xScale.invert, xScale));

    range = yScale.range().map(t.invertY, t);
    yScale.domain(originalYScale.domain())
    yScale.domain(range.map(yScale.invert, yScale));
  });
}
)}

function _createTextureLookupTable(){return(
function createTextureLookupTable(w, h, stride) {
  stride = stride || 2;
  var n = w * h * stride;

  var out = new Float32Array(n);

  for (var i = 0, iStride = 0; iStride < n; i++, iStride += stride) {
    out[iStride] = ((i % w) + 0.5) / w;
    out[iStride + 1] = (((i / w) | 0) + 0.5) / h;
  }

  return out;
}
)}

function _28(md){return(
md`The following function shouldn't exist. Instead, use [EXT_color_buffer_float/half-float](https://developer.mozilla.org/en-US/docs/Web/API/EXT_color_buffer_float).`
)}

function _canWriteToFBOOfType(){return(
function canWriteToFBOOfType(regl, type) {
  type = type || "float";
  if (!regl.hasExtension(`oes_texture_${type.replace(" ", "_")}`)) return false;
  let floatFBO, uintFBO, draw, transfer;
  try {
    floatFBO = regl.framebuffer({
      colorType: type,
      colorFormat: "rgba",
      radius: 1
    });

    uintFBO = regl.framebuffer({
      colorType: "uint8",
      colorFormat: "rgba",
      radius: 1
    });

    draw = regl({
      vert: `
      precision highp float;
      attribute vec2 aXY;
      void main () {
        gl_Position = vec4(aXY, 0, 1);
        gl_PointSize = 1.0;
      }`,
      frag: `
      precision highp float;
      void main () {
        gl_FragColor = vec4(1, 0, 0, 1);
      }`,
      primitive: "points",
      count: 1,
      attributes: {
        aXY: [0, 0]
      },
      depth: { enable: false }
    });

    transfer = regl({
      vert: `
      precision highp float;
      attribute vec2 aXY;
      void main () {
        gl_Position = vec4(aXY, 0, 1);
      }`,
      frag: `
      precision highp float;
      void main () {
        gl_FragColor = vec4(1, 0, 0, 1);
      }`,
      attributes: {
        aXY: [-4, -4, 4, -4, 0, 4]
      },
      count: 3,
      primitive: "triangles",
      depth: { enable: false }
    });

    draw();
    var data;
    uintFBO.use(() => {
      transfer();
      data = regl.read();
    });

    return data[0] !== 0 && data[1] === 0 && data[2] === 0 && data[3] !== 0;
  } catch (e) {
    console.error(e);
    return false;
  } finally {
    if (floatFBO) floatFBO.destroy();
    if (uintFBO) uintFBO.destroy();
    if (draw) draw.destroy();
    if (transfer) transfer.destroy();
  }
}
)}

function _30(md){return(
md`## Sample Usage`
)}

function _stack(createLayerStack,width,height,reglCanvas,DOM){return(
createLayerStack(width, height, devicePixelRatio, {
  regl: (w, h, dpi) => reglCanvas(w, h, dpi),
  canvas: DOM.context2d,
  svg: DOM.svg
})
)}

function _viewport(createViewport,stack){return(
createViewport(stack, {t: 10, r: 15, b: 22, l: 37})
)}

function _33(md,html){return(
md`The view below shows a ${html`<span style="color:red"><code>regl</code> WebGL context</span>`}, a ${html`<span style="color:green">HTML canvas</span>`}, and a ${html`<span style="color:blue">SVG element</span>`} stacked upon each other and living together in harmony.`
)}

function* _34(stack,d3,viewport,constrainLinearScaleAspectRatio,viewportAxes,configureViewport,configureLinearScales,drawStrip,mat3multiply,mat3create,mat3ViewportFromLinearScales,mat3fromLinearScales,vec2transformMat3)
{
  let regl = stack.layers.regl;
  let ctx = stack.layers.canvas;
  let svg = d3.select(stack.layers.svg);
  
  let xScale = d3.scaleLinear()
    .domain([-3, 3])
    .range([viewport.margin.l, viewport.width - viewport.margin.r])
    .clamp(true);
  
  let yScale = constrainLinearScaleAspectRatio(
    d3.scaleLinear()
      .domain([-1.5, 1.5])
      .range([viewport.height - viewport.margin.b, viewport.margin.t])
      .clamp(true),
    xScale, 1);
  
  let update;
  
  let points = [[1, -1], [1, 1], [-1, -1], [-1, 1]];
  let pointsBuffer = regl.buffer(points);
  
  svg.selectAll('g.axes').remove();
  let axes = svg.append('g')
    .attr('class', 'axes')
    .call(viewportAxes(viewport, xScale, yScale))
  
  let g = svg.selectAll('g.handles').remove();
  g = svg.selectAll('g.handles')
    .data([points])
    .enter().append('g')
      .attr('class', 'handles');
 
  let handles = g.selectAll('circle')
    .data(d => d).enter().append('circle')
      .attr('cursor', 'move')
      .attr('r', 5)
      .attr('stroke-width', 30)
      .attr('stroke', 'transparent')
      .attr('fill', 'blue')
      .call(d3.drag()
        .on("drag", (d) => {
          d[0] = xScale.invert(d3.event.x);
          d[1] = yScale.invert(d3.event.y);
          update();
        }));
  
  update = function update () {
    handles
      .attr('cx', data => xScale(data[0]))
      .attr('cy', data => yScale(data[1]));
    
    pointsBuffer.subdata(points)
    regl.poll();
    regl.clear({color: [1, 1, 1, 1]})
    configureViewport(viewport, ({viewport3}) => {
      configureLinearScales(xScale, yScale, ({view3}) => {
        drawStrip({points: pointsBuffer, count: points.length});
      })
    })
    
    let ctxTransform = mat3multiply(mat3create(), 
      mat3ViewportFromLinearScales(mat3create(), xScale, yScale),
      mat3fromLinearScales(mat3create(), xScale, yScale));

    ctx.clearRect(0, 0, stack.width, stack.height);
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#3a3';
    ctx.moveTo.apply(ctx, vec2transformMat3([], points[1], ctxTransform));
    ctx.lineTo.apply(ctx, vec2transformMat3([], points[2], ctxTransform));
    ctx.moveTo.apply(ctx, vec2transformMat3([], points[3], ctxTransform));
    ctx.lineTo.apply(ctx, vec2transformMat3([], points[0], ctxTransform));
    ctx.stroke();
  }
  
  update();
    
  yield stack.container
}


function _configureLinearScales(createReglLinearScaleConfiguration,regl){return(
createReglLinearScaleConfiguration(regl)
)}

function _regl(stack){return(
stack.layers.regl
)}

function _height(width){return(
width * 0.5
)}

function _configureViewport(createReglViewportConfiguration,regl){return(
createReglViewportConfiguration(regl)
)}

function _drawStrip(regl){return(
regl({
  vert: `
    precision highp float;
    uniform mat4 view;
    attribute vec2 xy;
    void main () {
      gl_Position = view * vec4(xy, 0, 1);
    }`,
  frag: `
    precision highp float;
    void main () {
      gl_FragColor = vec4(1.0, 0.8, 0.8, 1);
    }`,
  attributes: {
    xy: regl.prop('points')
  },
  primitive: 'triangle strip',
  depth: {enable: false},
  count: regl.prop('count')
})
)}

function _d3(require){return(
require("d3@5")
)}

function _createREGL(require){return(
require("regl")
)}

function _47(md){return(
md`## License

The code in this notebook is MIT Licensed.`
)}

function _LICENSE(){return(
"mit"
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["html","md","PINNED"], _2);
  const child1 = runtime.module(define1);
  main.import("createReglCamera", child1);
  main.import("createInteractions", child1);
  main.variable(observer()).define(["md"], _4);
  main.variable(observer("reglCanvas")).define("reglCanvas", ["createREGL"], _reglCanvas);
  main.variable(observer()).define(["md"], _6);
  main.variable(observer("reusableReglCanvas")).define("reusableReglCanvas", ["width","reglCanvas"], _reusableReglCanvas);
  main.variable(observer()).define(["md"], _8);
  main.variable(observer("reglCanvasWithOptions")).define("reglCanvasWithOptions", ["reglCanvas"], _reglCanvasWithOptions);
  main.variable(observer("getOrAttachReglFO")).define("getOrAttachReglFO", ["createREGL"], _getOrAttachReglFO);
  main.variable(observer()).define(["md"], _11);
  main.variable(observer("createLayerStack")).define("createLayerStack", ["Element"], _createLayerStack);
  main.variable(observer()).define(["md"], _13);
  main.variable(observer("createReglViewportConfiguration")).define("createReglViewportConfiguration", ["mat3create"], _createReglViewportConfiguration);
  main.variable(observer()).define(["md","tex"], _15);
  main.variable(observer("createReglLinearScaleConfiguration")).define("createReglLinearScaleConfiguration", ["mat3create","mat4create","mat3fromLinearScales","mat3invert","mat4fromMat3"], _createReglLinearScaleConfiguration);
  main.variable(observer()).define(["md","tex"], _17);
  main.variable(observer("createReglMap")).define("createReglMap", _createReglMap);
  main.variable(observer("mat3ViewportFromLinearScales")).define("mat3ViewportFromLinearScales", _mat3ViewportFromLinearScales);
  main.variable(observer("mat3fromLinearScales")).define("mat3fromLinearScales", _mat3fromLinearScales);
  main.variable(observer()).define(["md"], _21);
  main.variable(observer("createViewport")).define("createViewport", _createViewport);
  main.variable(observer()).define(["md"], _23);
  main.variable(observer("viewportAxes")).define("viewportAxes", ["d3"], _viewportAxes);
  main.variable(observer("constrainLinearScaleAspectRatio")).define("constrainLinearScaleAspectRatio", _constrainLinearScaleAspectRatio);
  main.variable(observer("persistentZoom")).define("persistentZoom", ["d3"], _persistentZoom);
  main.variable(observer("createTextureLookupTable")).define("createTextureLookupTable", _createTextureLookupTable);
  main.variable(observer()).define(["md"], _28);
  main.variable(observer("canWriteToFBOOfType")).define("canWriteToFBOOfType", _canWriteToFBOOfType);
  main.variable(observer()).define(["md"], _30);
  main.variable(observer("stack")).define("stack", ["createLayerStack","width","height","reglCanvas","DOM"], _stack);
  main.variable(observer("viewport")).define("viewport", ["createViewport","stack"], _viewport);
  main.variable(observer()).define(["md","html"], _33);
  main.variable(observer()).define(["stack","d3","viewport","constrainLinearScaleAspectRatio","viewportAxes","configureViewport","configureLinearScales","drawStrip","mat3multiply","mat3create","mat3ViewportFromLinearScales","mat3fromLinearScales","vec2transformMat3"], _34);
  main.variable(observer("configureLinearScales")).define("configureLinearScales", ["createReglLinearScaleConfiguration","regl"], _configureLinearScales);
  main.variable(observer("regl")).define("regl", ["stack"], _regl);
  main.variable(observer("height")).define("height", ["width"], _height);
  main.variable(observer("configureViewport")).define("configureViewport", ["createReglViewportConfiguration","regl"], _configureViewport);
  main.variable(observer("drawStrip")).define("drawStrip", ["regl"], _drawStrip);
  main.variable(observer("d3")).define("d3", ["require"], _d3);
  main.variable(observer("createREGL")).define("createREGL", ["require"], _createREGL);
  const child2 = runtime.module(define2);
  main.import("mat4create", child2);
  main.import("mat4fromMat3", child2);
  const child3 = runtime.module(define3);
  main.import("mat3create", child3);
  main.import("mat3invert", child3);
  main.import("mat3multiply", child3);
  const child4 = runtime.module(define4);
  main.import("vec2transformMat3", child4);
  const child5 = runtime.module(define5);
  main.import("PINNED", child5);
  main.variable(observer()).define(["md"], _47);
  main.variable(observer("LICENSE")).define("LICENSE", _LICENSE);
  return main;
}
