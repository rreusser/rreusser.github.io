const createREGL = require('regl'); const State = require('controls-state');
const GUI = require('controls-gui');
const createCamera = require('./regl-turntable-camera');
const meshSurface = require('./mesh-surface-2d');
const mat4create = require('gl-mat4/create');
const mat4multiply = require('gl-mat4/multiply');
const mat4lookAt = require('gl-mat4/lookAt');
const Preact = require('preact');
const createClass = require('preact-compat').createClass;
const h = Preact.h;

var css = require('insert-css');
var katex = require('katex');
var fs = require('fs');

var katexCss = fs.readFileSync(__dirname + '/../../node_modules/katex/dist/katex.min.css', 'utf8');

var fontFamily = 'Fira Sans Condensed';

css(katexCss);
css(`
@import url('https://fonts.googleapis.com/css?family=${fontFamily.replace(/ /g, '+')}');

html, body {
  margin: 0;
  padding: 0;
  background-color: black;
}

.sketch-nav {
  right: auto !important;
  left: 0 !important;
}

.control-panel {
  margin-bottom: 5em;
}

.rawContent {
  max-width: 100%;
}

.rawContent svg {
  max-width: 100%;
}

canvas {
  margin-left: auto;
  margin-right: auto;
  display: inline-block;
  position: fixed !important;
}

.control-panel {
  pointer-events: none;
  padding-bottom: 500px;
}

.control-panel > .control-panel__section {
  pointer-events: all;
}

`)

function createDrawBoysSurface (regl, res, state) {
  const mesh = meshSurface({}, (out, u, v) => {
    out[0] = u;
    out[1] = v;
  }, {
    resolution: [70, 70],
    uDomain: [0.0, Math.PI / 2],
    vDomain: [-Math.PI / 2, Math.PI / 2],
  });

  return regl({
    vert: `
      precision highp float;
      attribute vec2 uv;
      uniform mat4 uProjection, uView;
      varying vec3 vPosition, vNormal;
      varying vec2 vUV;
      uniform float n, coloring;
      uniform vec2 eik1, eik2;
      uniform vec2 a;
      uniform vec3 color, fixedColor;
      varying vec3 vColor;

      #define PI 3.141592653589793238

      vec2 sinhcosh (float x) {
        vec2 ex = exp(vec2(x, -x));
        return 0.5 * (ex - vec2(ex.y, -ex.x));
      }

      vec2 cmul (vec2 a, vec2 b) {
        return vec2(a.x * b.x - a.y * b.y, a.y * b.x + a.x * b.y);
      }

      vec2 cpow (vec2 z, float x) {
        float r = length(z);
        float theta = atan(z.y, z.x) * x;
        return vec2(cos(theta), sin(theta)) * pow(r, x);
      }

      vec2 ccos (vec2 z) {
        return sinhcosh(z.y).yx * vec2(cos(z.x), -sin(z.x));
      }

      vec2 csin (vec2 z) {
        return sinhcosh(z.y).yx * vec2(sin(z.x), cos(z.x));
      }

      vec3 f(vec2 uv) {
        float n2 = 2.0 / n;
        vec2 z1 = cmul(eik1, cpow(ccos(uv), n2));
        vec2 z2 = cmul(eik2, cpow(csin(uv), n2));
        return vec3(z1.x, z2.x, dot(vec2(z1.y, z2.y), a));
      }

      void main () {
        vUV = uv;
        vPosition = f(vUV);
        vColor = mix(fixedColor, color, coloring);

        // Compute the normal via numerical differentiation
        const float dx = 1e-2;

        // Super wasteful! But it seems we can get away with it.
        vec2 up = vec2(vUV + vec2(dx, 0));
        vec2 um = vec2(vUV - vec2(dx, 0));
        vec2 vp = vec2(vUV + vec2(0, dx));
        vec2 vm = vec2(vUV - vec2(0, dx));
        vNormal = normalize(cross(f(up) - f(um), f(vp) - f(vm)));

        gl_Position = uProjection * uView * vec4(vPosition, 1);
      }`,
    frag: `
    #extension GL_OES_standard_derivatives : enable
    precision highp float;
    varying vec3 vPosition, vNormal;
    uniform vec3 uEye;
    uniform bool solidPass;
    varying vec2 vUV;
    varying vec3 vColor;
    uniform vec3 boundaryColor;
    uniform float pixelRatio, opacity, cartoonEdgeWidth, boundaryWidth, gridOpacity, specular, cartoonEdgeOpacity, gridWidth, normals, boundaryOpacity;

    // This function implements a constant-width grid as a function of
    // a two-dimensional input. This makes it possible to draw a grid
    // which does not line up with the triangle edges.
    // from: https://github.com/rreusser/glsl-solid-wireframe
    float gridFactor (vec2 parameter, float width, float feather) {
      float w1 = width - feather * 0.5;
      vec2 d = fwidth(parameter);
      vec2 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
      vec2 a2 = smoothstep(d * w1, d * (w1 + feather), looped);
      return min(a2.x, a2.y);
    }
    float gridFactor (float parameter, float width, float feather) {
      float w1 = width - feather * 0.5;
      float d = fwidth(parameter);
      return smoothstep(d * w1, d * (w1 + feather), parameter);
    }

    float loopedGridFactor (float parameter, float width, float feather) {
      float w1 = width - feather * 0.5;
      float d = fwidth(parameter);
      float looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
      return smoothstep(d * w1, d * (w1 + feather), looped);
    }

    #define PI 3.14159265358979
    uniform float time;
    uniform vec2 gridlines;
    uniform bool animateStrips;

    void main () {
      vec3 normal = normalize(vNormal);

      // The dot product of the view direction and surface normal.
      float vDotN = abs(dot(normal, normalize(vPosition - uEye)));

      // We divide vDotN by its gradient magnitude in screen space to
      // give a function which goes roughly from 0 to 1 over a single
      // pixel right at glancing angles. i.e. cartoon edges!
      float cartoonEdge = smoothstep(0.75, 1.25, vDotN / fwidth(vDotN) / (cartoonEdgeWidth * pixelRatio));

      float boundaryEdge = loopedGridFactor((vUV.y - (PI * 0.5)) / PI, 0.5 * boundaryWidth * pixelRatio, 1.0);

      // Combine the gridlines and cartoon edges
      float grid = gridFactor(vUV * gridlines, 0.5 * gridWidth * pixelRatio, 1.0);
      float combinedGrid = max(cartoonEdgeOpacity * (1.0 - cartoonEdge), gridOpacity * (1.0 - grid));

      if (solidPass) {
        // If the surface pass, we compute some shading
        float shade = 0.5 + mix(1.2, specular * pow(vDotN, 3.0), 0.5) - 0.4;
        vec3 colorFromNormal = (0.5 + (gl_FrontFacing ? 1.0 : -1.0) * 0.5 * normal);
        vec3 baseColor = vColor;

        vec3 color = shade * mix(baseColor, colorFromNormal, normals);
        // Apply the gridlines
        color = mix(color, vec3(0), opacity * combinedGrid);
        gl_FragColor = vec4(pow(color, vec3(0.454)), 1.0);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, boundaryColor, boundaryOpacity * (1.0 - boundaryEdge));
      } else {
        // If the wireframe pass, we just draw black lines with some alpha
        gl_FragColor = vec4(
          // To get the opacity to mix ~correctly, we use reverse-add blending mode
          // so that white here shows up as black gridlines. This could be simplified
          // by doing a bit more math to get the mixing right with just additive blending.
          vec3(0),
          (1.0 - opacity) * combinedGrid
        );

        gl_FragColor = mix(gl_FragColor, vec4(boundaryColor, boundaryOpacity), (1.0 - boundaryEdge) * (1.0 - opacity));

        if (gl_FragColor.a < 1e-3) discard;
      }
    }
    `,
    uniforms: {
      time: regl.context('time'),
      solidPass: regl.prop('solidPass'),
      pixelRatio: regl.context('pixelRatio'),
      color: regl.prop('baseColor'),
      fixedColor: () => hexRgbToFloat(state.rendering.surface.color),
      boundaryColor: () => hexRgbToFloat(state.rendering.boundary.color),
      boundaryOpacity: () => state.rendering.boundary.opacity,
      boundaryWidth: () => 2.0 * state.rendering.boundary.width,
      coloring: () => state.rendering.surface.coloring,
      normals: () => state.rendering.surface.normals,
      n: () => state.surface.n,
      a: () => [Math.cos(state.surface.a), Math.sin(state.surface.a)],
      eik1: (ctx, props) => [Math.cos(2.0 * Math.PI * props.k1 / state.surface.n), Math.sin(2.0 * Math.PI * props.k1 / state.surface.n)],
      eik2: (ctx, props) => [Math.cos(2.0 * Math.PI * props.k2 / state.surface.n), Math.sin(2.0 * Math.PI * props.k2 / state.surface.n)],
      cartoonEdgeOpacity: () => state.rendering.edges.opacity,
      cartoonEdgeWidth: () => state.rendering.edges.width,
      gridWidth: () => state.rendering.gridlines.width,
      gridlines: () => [state.rendering.gridlines.uCount * 2.0 / Math.PI, state.rendering.gridlines.vCount * 2.0 / Math.PI],
      gridOpacity: () => state.rendering.gridlines.opacity,
      opacity: () => state.rendering.surface.opacity,
      specular: 1.0,
    },
    attributes: {uv: mesh.positions},
    depth: {enable: (ctx, props) => props.solidPass ? true : false},
    blend: {
      enable: (ctx, props) => props.solidPass ? false : true,
      func: {srcRGB: 'src alpha', srcAlpha: 1, dstRGB: 'one minus src alpha', dstAlpha: 1},
      equation: {rgb: 'add', alpha: 'add'}
    },
    elements: mesh.cells
  });
}

const regl = createREGL({extensions: ['OES_standard_derivatives']});

class Explanation extends Preact.Component {
  shouldComponentUpdate () {
    return false;
  }

  render () {
    function eqn (str, opts) {
      return h('span', Object.assign({dangerouslySetInnerHTML: {__html: katex.renderToString(str)}}, opts || {}));
    }
    return h('p', {},
      'A plot of ',
      h('a', {href: 'https://en.wikipedia.org/wiki/Calabi%E2%80%93Yau_manifold'}, 'Calabi-Yau manifolds'),
      ' based on ',
      h('a', {href: 'https://observablehq.com/@sw1227/calabi-yau-manifold-3d'}, 'this notebook of @sw1227'),
      '. We define ',
      h('br'),
      eqn(`
        \\displaystyle {
          \\left\\{
          \\begin{aligned}
           z_1 &= e^{i \\phi_1} \\left[ cos(x+iy) \\right]^{2/n} \\\\
           z_2 &= e^{i \\phi_2} \\left[ sin(x+iy) \\right]^{2/n}
          \\end{aligned}
        \\right.
        }
      `, {style: {display: 'block', margin: '0.5em auto', textAlign: 'center'}}),
      'with ', eqn('x'),' and ',eqn('y'),' in the range ',
      eqn(`0 \\leq  x  \\lt \\pi /2`), ' and ', eqn(`-\\pi/2 \\leq y \\lt \\pi/2`), ', while ',
      eqn('k_1'), ' and ', eqn('k_2'), ' vary over the ranges ',
      eqn(`
      \\left\\{
        \\begin{aligned}
          \\phi_1 &= \\frac{2 \\pi k_1}{n} \\;\\;\\;\\;\\;\\;\\;\\;\\;k_1 = 0, 1, ..., n-1 \\\\
          \\phi_2 &= \\frac{2 \\pi k_2}{n} \\;\\;\\;\\;\\;\\;\\;\\;\\;k_2 = 0, 1, ..., n-1
        \\end{aligned}
      \\right.
      `, {style: {display: 'block', margin: '0.5em auto', textAlign: 'center'}}),
      'Together these satisfy the condition ',
      eqn(`
        z_1^n + z_2^n = 1.
      `, {style: {display: 'block', margin: '0.5em auto', textAlign: 'center'}}),
      'We therefore plot the surface in ', eqn('n^2'), ' patches and project into three dimensional space, with',
      eqn(`
        (\\mathrm{Re}(z_1), \\; \\mathrm{Re}(z_2), \\; \\mathrm{Im}(z_1) \\cos (\\alpha) + \\mathrm{Im}(z_2) \\sin(\\alpha)).
      `, {style: {display: 'block', margin: '0.5em auto', textAlign: 'center'}}),
    )
  }
}

const state = State({
  surface: State.Section({
    raw: State.Raw(h => {
      return h(Explanation);
    }),
    n: State.Slider(3, {min: 2, max: 8, step: 1, label: 'exponent, n'}),
    a: State.Slider(0, {min: 0, max: Math.PI * 2 + 1e-4, step: Math.PI / 100, label: 'projection, α'}),
  }, {expanded: window.innerWidth > 500, label: 'Surface'}),
  rendering: State.Section({
    surface: {
      opacity: State.Slider(0.95, {min: 0, max: 1, step: 1e-3, label: 'opacity'}),
      coloring: State.Slider(1.0, {min: 0, max: 1, step: 1e-3, label: 'coloring'}),
      normals: State.Slider(0.2, {min: 0, max: 1, step: 1e-3, label: 'color by normal'}),
      color: State.Color('#333333'),
    },
    gridlines: {
      width: State.Slider(0.5, {min: 0.5, max: 3, step: 1e-3}),
      opacity: State.Slider(0.4, {min: 0, max: 1, step: 1e-3}),
      uCount: State.Slider(10, {min: 1, max: 100, step: 1, label: 'u count'}),
      vCount: State.Slider(10, {min: 1, max: 100, step: 1, label: 'v count'}),
    },
    boundary: {
      width: State.Slider(1.0, {min: 0.5, max: 3, step: 1e-3}),
      opacity: State.Slider(0.7, {min: 0, max: 1, step: 1e-3}),
      color: State.Color('#883322'),
    },
    edges: {
      opacity: State.Slider(1.0, {min: 0, max: 1, step: 1e-3}),
      width: State.Slider(3.0, {min: 0, max: 5, step: 1e-3}),
    },
  }, {expanded: false, label: 'Rendering'}),
});
GUI(state, {
  className: 'control-panel',
  containerCSS: "position:absolute; top:0; right:10px; width:350px; margin-bottom: 500px; overflow: hidden",
});

function hexRgbToFloat (hex) {
  let match
  if ((match = hex.match(/#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})/))) {
    return [parseInt(match[1], 16) / 255, parseInt(match[2], 16) / 255, parseInt(match[3], 16) / 255]
  } else if ((match = hex.match(/#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])/))) {
    return [parseInt(match[1], 16) / 15, parseInt(match[2], 16) / 15, parseInt(match[3], 16) / 15]
  }
  return [0, 0, 0]
}

const camera = createCamera(regl, {
  distance: 7,
  center: [0, 0, 0],
  theta: 0.9,
  phi: 0.3,
  far: 100,
});

const passes = [];

function updatePasses(event) {
  passes.length = 0;
  const n = event.value;
  function colorscale (i, j) {
    var theta = (i + j / n) / n * Math.PI * 2;
    return [
      0.5 + 0.45 * Math.cos(theta),
      0.5 + 0.45 * Math.cos(theta - 2 * Math.PI / 3),
      0.5 + 0.45 * Math.cos(theta - 4 * Math.PI / 3)
    ];
  }
  for (var i = 0; i < n; i++) {
    for (var j = 0; j < n; j++) {
      passes.push({k1: i, k2: j, solidPass: true, baseColor: colorscale(i, j)});
    }
  }
  for (var i = 0; i < n; i++) {
    for (var j = 0; j < n; j++) {
      passes.push({k1: i, k2: j, solidPass: false, baseColor: colorscale(i, j)});
    }
  }
}

state.$onChange(camera.taint);
state.$path.surface.n.onChange(updatePasses);
updatePasses({value: state.surface.n});

const drawCalabiYau = createDrawBoysSurface(regl, 255, state);

let frame = regl.frame(({tick, time}) => {
  //camera.params.theta = time * 0.125
  camera(({dirty}) => {
    //state.surface.rmin = 0.49 + 0.49 * Math.cos(time * 0.25)
    if (!dirty) return;
    regl.clear({color: [1, 1, 1, 1]});

    // Perform two drawing passes, first for the solid surface, then for the wireframe overlayed on top
    // to give a fake transparency effect
    drawCalabiYau(passes)
  });
});
