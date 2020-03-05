// https://observablehq.com/@rreusser/instanced-webgl-circles@213
export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], function(md){return(
md`# Instanced WebGL Circles

A question came up of how to draw lots of circles efficiently. The most efficient method I know of uses WebGL with the [\`ANGLE_instanced_arrays\`](https://developer.mozilla.org/en-US/docs/Web/API/ANGLE_instanced_arrays) extension to place and scale many identical circle instances.

It seemed like a fun exercise and a good way to incrementally iterate on my Observable skills, so here we are. I'm going to use the [regl](https://github.com/regl-project/regl) WebGL wrapper because it adds tons of convenience with very few of its own abstractions. Still, this method should generalize to WebGL and most other WebGL libraries without too much translation.

We start by importing a simple context creation helper from [@rreusser/regl-tools](https://observablehq.com/@rreusser/regl-tools). Among other things, it exposes \`createReglCanvas\` with an API equivalent to that of [@observable/stdlib's \`DOM.context2d\` method](https://github.com/observablehq/stdlib/tree/6ef1ed21955cd3c849a40b10140ad120a3b9820f#DOM_context2d).`
)});
  main.variable(observer()).define(["md"], function(md){return(
md`Next, we create and view a regl context. We configure a couple options while setting it up:

- Disable antialiasing. Very expensive; not that helpful here.
- Limit the pixel ratio to 1.5. More pixels make for a lot more fragments but doesn't actually look that much better.
- Use the [\`ANGLE_instanced_arrays\`](https://developer.mozilla.org/en-US/docs/Web/API/ANGLE_instanced_arrays) extension to draw lots of circles with a single WebGL draw call.`
)});
  main.variable(observer("viewof regl")).define("viewof regl", ["reglCanvas","width"], function(reglCanvas,width){return(
reglCanvas(
  width,
  Math.max(400, width * 0.6), // height
  Math.min(devicePixelRatio, 1.5), // pixel ratio
  {
    extensions: ['ANGLE_instanced_arrays'],
    attributes: { antialias: false, depth: false}
  }
)
)});
  main.variable(observer("regl")).define("regl", ["Generators", "viewof regl"], (G, _) => G.input(_));
  main.variable(observer("viewof numCircleInstances")).define("viewof numCircleInstances", ["html"], function(html)
{
  const form = html`<form>
    <input name=i type=range min=20 max=4000 step=1 value=2000 style="width:180px;min-width:30%;">
    <output style="font-size:smaller;font-style:oblique;" name=o></output>
  </form>`;
  form.i.oninput = () => form.o.value = `circle instance count = ${(form.value = form.i.valueAsNumber).toFixed(0)}`;
  form.i.oninput();
  return form;
}
);
  main.variable(observer("numCircleInstances")).define("numCircleInstances", ["Generators", "viewof numCircleInstances"], (G, _) => G.input(_));
  main.variable(observer("viewof numCircleDivisions")).define("viewof numCircleDivisions", ["html"], function(html)
{
  const form = html`<form>
    <input name=i type=range min=3 max=200 step=1 value=160 style="width:180px;min-width:30%;">
    <output style="font-size:smaller;font-style:oblique;" name=o></output>
  </form>`;
  form.i.oninput = () => form.o.value = `circle divisions = ${(form.value = form.i.valueAsNumber).toFixed(0)}`;
  form.i.oninput();
  return form;
}
);
  main.variable(observer("numCircleDivisions")).define("numCircleDivisions", ["Generators", "viewof numCircleDivisions"], (G, _) => G.input(_));
  main.variable(observer()).define(["md","numCircleInstances","numCircleDivisions"], function(md,numCircleInstances,numCircleDivisions){return(
md`Below is our main iteration loop. We simply clear the screen and execute a single draw command to draw ${numCircleInstances} circles each with ${numCircleDivisions} divisions, totaling ${numCircleInstances * (numCircleDivisions + 1)} vertices.`
)});
  main.variable(observer("loop")).define("loop", ["regl","draw"], function*(regl,draw)
{
  while (true) {
    regl.poll();
    regl.clear({ color: [0.05, 0.05, 0.05, 1] });
    draw();
    yield;
  }
}
);
  main.variable(observer()).define(["md","tex"], function(md,tex){return(
md`We now define what a single circle looks like. We can get away with a regular JavaScript \`Array\` of ${tex`(x, y)`} pairs. [\`regl\` is smart enough](https://github.com/regl-project/regl/blob/master/API.md#buffers) to do some basic flattening into a typed array so that we don't have to.`
)});
  main.variable(observer("circleInstanceGeometry")).define("circleInstanceGeometry", ["numCircleDivisions"], function(numCircleDivisions){return(
Array.from(Array(numCircleDivisions + 1).keys()).map(i => {
  var theta = Math.PI * 2 * i / numCircleDivisions;
  return [Math.cos(theta), Math.sin(theta)];
})
)});
  main.variable(observer()).define(["md","tex"], function(md,tex){return(
md`Next, we define a list of ${tex`\theta`} values we'll use in the vertex shader to place each instance.`
)});
  main.variable(observer("instanceTheta")).define("instanceTheta", ["numCircleInstances"], function(numCircleInstances){return(
Array.from(Array(numCircleInstances).keys()).map(i => 
  i / numCircleInstances * 2 * Math.PI
)
)});
  main.variable(observer()).define(["md"], function(md){return(
md`Finally we define the actual draw command. One subtle thing to note here is that due to Observable data flow, this command is recreated each time the parameters above are changed. The proper way to avoid this would be to create buffers (\`circleInstanceGeometryBuffer = regl.buffer(circleInstanceGeometry)\` and the same for \`instanceTheta\`), then pass the buffers as a regl property to the draw command *when the command is invoked*.

This small change would decouple the command definition from the variables above so that Observable would not recreate the command. That said, I've not done this here for two reasons. The addition adds some complexity to the code, and recreating commands many times doesn't seem to cause problems—though I suspect there probably is an upper limit to how many commands you can allocate before things just stop working.`
)});
  main.variable(observer("draw")).define("draw", ["regl","circleInstanceGeometry","instanceTheta","numCircleInstances","numCircleDivisions"], function(regl,circleInstanceGeometry,instanceTheta,numCircleInstances,numCircleDivisions){return(
regl({
  vert: `
    precision highp float;
    attribute float theta;
    attribute vec2 circlePoint;
    varying vec3 vColor;
    uniform vec2 aspectRatio;
    uniform float time;
    const float PI = 3.1415926535;
    void main () {
      // Use lots of sines and cosines to place the circles
      vec2 circleCenter = vec2(cos(theta), sin(theta))
        * (0.6 + 0.2 * cos(theta * 6.0 + cos(theta * 8.0 + time)));

      // Modulate the circle sizes around the circle and in time
      float circleSize = 0.2 + 0.12 * cos(theta * 9.0 - time * 2.0);

      vec2 xy = circleCenter + circlePoint * circleSize;

      // Define some pretty colors
      float th = 8.0 * theta + time * 2.0;
      vColor = 0.6 + 0.4 * vec3(
        cos(th),
        cos(th - PI / 3.0),
        cos(th - PI * 2.0 / 3.0)
      );

      gl_Position = vec4(xy / aspectRatio, 0, 1);
    }`,
  frag: `
    precision highp float;
    varying vec3 vColor;
    uniform float alpha;
    void main () {
      gl_FragColor = vec4(vColor, alpha);
    }`,
  attributes: {
    // This attribute defines what we draw; we fundamentally draw circle vertices
    circlePoint: circleInstanceGeometry,
    
    // This attribute allows us to compute where we draw each circle. the divisor
    // means we step through one value *per circle*.
    theta: {buffer: instanceTheta, divisor: 1},
  },
  uniforms: {
    // Scale so that it fits in the view whether it's portrait or landscape:
    aspectRatio: ctx => ctx.framebufferWidth > ctx.framebufferHeight ?
      [ctx.framebufferWidth / ctx.framebufferHeight, 1] :
      [1, ctx.framebufferHeight / ctx.framebufferWidth],
    
    time: regl.context('time'),
    
    // Decrease opacity when there are more circles
    alpha: Math.max(0, Math.min(1, 0.15 * 2000 / numCircleInstances)),
  },
  blend: {
    // Additive blending
    enable: true,
    func: {srcRGB: 'src alpha', srcAlpha: 1, dstRGB: 1, dstAlpha: 1},  
    equation: {rgb: 'add', alpha: 'add'}
  },
  // GL_LINES are in general *pretty bad*, but they're good for some things
  primitive: 'line strip',
  depth: {enable: false},
  count: numCircleDivisions + 1,
  instances: numCircleInstances,
})
)});
  main.variable(observer("createREGL")).define("createREGL", ["require"], function(require){return(
require('regl')
)});
  main.variable(observer("reglCanvas")).define("reglCanvas", ["createREGL"], function(createREGL){return(
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
)});
  return main;
}
