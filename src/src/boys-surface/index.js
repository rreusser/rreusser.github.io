const createREGL = require('regl');
const State = require('controls-state');
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
`)

function createDrawBoysSurface (regl, res, state) {
  const mesh = meshSurface({}, (out, u, v) => {
    out[0] = u;
    out[1] = v;
  }, {
    resolution: [70, 400],
    uDomain: [0, 1],
    vDomain: [-Math.PI, Math.PI],
  });

  return regl({
    vert: `
      precision highp float;
      attribute vec2 uv;
      uniform mat4 uProjection, uView;
      uniform float rmax;
      varying vec3 vPosition, vNormal;
      varying vec2 vUV;

      vec2 csub (vec2 a, vec2 b) {
        return a - b;
      }

      vec2 cadd (vec2 a, vec2 b) {
        return a + b;
      }

      vec2 cdiv (vec2 a, vec2 b) {
        float e, f;
        float g = 1.0;
        float h = 1.0;
        if( abs(b.x) >= abs(b.y) ) {
          e = b.y / b.x;
          f = b.x + b.y * e;
          h = e;
        } else {
          e = b.x / b.y;
          f = b.x * e + b.y;
          g = e;
        }
        return (a * g + h * vec2(a.y, -a.x)) / f;
      }

      vec2 csqr (vec2 z) {
        return vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
      }

      vec2 cmul (vec2 a, vec2 b) {
        return vec2(a.x * b.x - a.y * b.y, a.y * b.x + a.x * b.y);
      }

      vec3 f(vec2 uv) {
        vec2 w = vec2(uv.x * vec2(cos(uv.y), sin(uv.y)));

        vec2 w2 = csqr(w);
        vec2 w3 = cmul(w2, w);
        vec2 w4 = csqr(w2);
        vec2 w6 = cmul(w2, w4);

        vec2 denom = csub(w6 + sqrt(5.0) * w3, vec2(1, 0));
        float g1 = -1.5 * cdiv(cmul(w, csub(vec2(1, 0), w4)), denom).y;
        float g2 = -1.5 * cdiv(cmul(w, cadd(vec2(1, 0), w4)), denom).x;
        float g3 = cdiv(cadd(vec2(1, 0), w6), csub(w6 + sqrt(5.0) * w3, vec2(1, 0))).y - 0.5;

        return vec3(g1, g3, g2) / (g1 * g1 + g2 * g2 + g3 * g3);
      }

      void main () {
        vUV = uv * vec2(rmax, 1.0);
        vPosition = f(vUV);

        // Compute the normal via numerical differentiation
        const float dx = 1e-3;
        vNormal = normalize(cross(
          f(vUV + vec2(dx, 0)) - vPosition,
          f(vUV + vec2(0, dx)) - vPosition
        ));

        gl_Position = uProjection * uView * vec4(vPosition, 1);
      }
    `,
    frag: `
      #extension GL_OES_standard_derivatives : enable
      precision highp float;
      varying vec3 vPosition, vNormal;
      uniform vec3 uEye;
      uniform bool wire;
      varying vec2 vUV;
      uniform float pixelRatio, strips, fill;

      #define PI 3.141592653589

      // From https://github.com/rreusser/glsl-solid-wireframe
      float gridFactor (vec2 parameter, float width, float feather) {
        float w1 = width - feather * 0.5;
        vec2 d = fwidth(parameter);
        vec2 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
        vec2 a2 = smoothstep(d * w1, d * (w1 + feather), looped);
        return min(a2.x, a2.y);
      }

      void main () {
        if (fract(vUV.y * strips / (2.0 * PI)) < fill) discard;
        // Shading technique adapted/simplified/customized from: https://observablehq.com/@rreusser/faking-transparency-for-3d-surfaces
        vec3 normal = normalize(vNormal);
        float vDotN = abs(dot(normal, normalize(vPosition - uEye)));
        float vDotNGrad = fwidth(vDotN);
        float cartoonEdge = smoothstep(0.75, 1.25, vDotN / vDotNGrad / 3.0 / pixelRatio);
        float sgn = gl_FrontFacing ? 1.0 : -1.0;
        float grid = gridFactor(vUV * vec2(12.0, 12.0 / PI), 0.45 * pixelRatio, 1.0);
        vec3 baseColor = gl_FrontFacing ? vec3(0.9, 0.2, 0.1) : vec3(0.1, 0.4, 0.8);
        float shade = mix(1.0, pow(vDotN, 3.0), 0.5) + 0.2;

        if (wire) {
          gl_FragColor.rgb = vec3(1);
          gl_FragColor.a = mix(0.15, (1.0 - grid) * 0.055, cartoonEdge);
        } else {
          gl_FragColor = vec4(pow(
            mix(baseColor, (0.5 + sgn * 0.5 * normal), 0.4) * cartoonEdge * mix(1.0, 0.6, 1.0 - grid) * shade,
            vec3(0.454)),
            1.0);
        }
      }
    `,
    uniforms: {
      wire: regl.prop('wire'),
      pixelRatio: regl.context('pixelRatio'),
      rmax: () => state.r,
      strips: () => state.strips,
      fill: () => 1.0 - state.fill,
    },
    attributes: {uv: mesh.positions},
    depth: {enable: (ctx, props) => props.wire ? false : true},
    blend: {
      enable: (ctx, props) => props.wire ? true : false,
      func: {srcRGB: 'src alpha', srcAlpha: 1, dstRGB: 1, dstAlpha: 1},
      equation: {rgb: 'reverse subtract', alpha: 'add'}
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
      h('a', {href: 'https://en.wikipedia.org/wiki/Boy%27s_surface'}, 'Boy\'s Surface'),
      ', a immersion of the non-orientable ',
      h('a', {href: 'https://en.wikipedia.org/wiki/Real_projective_plane'}, 'real projective plane'),
      ' into ',
      eqn(`\\mathbb{R}^3`),
      '. Based on the parameterization',
      h('br'),
      eqn(`
        \\displaystyle{
        \\begin{aligned}
          g_{1}& = -{3 \\over 2} \\operatorname{Im} \\left[ {w\\left(1-w^{4}\\right) \\over w^{6}+{\\sqrt {5}}w^{3}-1} \\right] \\\\
          g_{2}& = -{3 \\over 2} \\operatorname{Re} \\left[ {w\\left(1+w^{4}\\right) \\over w^{6}+{\\sqrt {5}}w^{3}-1} \\right] \\\\
          g_{3}& = \\operatorname {Im} \\left[{1+w^{6} \\over w^{6}+{\\sqrt {5}}w^{3}-1}\\right]-{1 \\over 2}
        \\end{aligned}}
      `, {style: {display: 'block', margin: '0.5em auto', textAlign: 'center'}}),
      'with coordinates',
      h('br'),
      eqn(`
        \\displaystyle {
          \\begin{pmatrix}x\\\\y\\\\z\\end{pmatrix}={
          \\frac{1}{g_{1}^{2}+g_{2}^{2}+g_{3}^{2}}}
          {\\begin{pmatrix}g_{1}\\\\g_{2}\\\\g_{3}\\end{pmatrix}}.
        }
      `, {style: {display: 'block', margin: '0.5em auto', textAlign: 'center'}}),
      'For complex ',eqn(`w`),', we plot a disc in the complex plane for ',eqn(`\\|w\\| \\leq 1`), '.'
    )
  }
}

const state = State({
  Info: State.Section({
    raw: State.Raw(h => {
      return h(Explanation);
    })
  }),
  Rendering: State.Section({
    r: State.Slider(1, {min: 0, max: 1, step: 1e-3}),
    strips: State.Slider(5, {min: 1, max: 24, step: 1, label: 'strip count'}),
    fill: State.Slider(1, {min: 0, max: 1, step: 1e-3, label: 'strip fill'}),
  })
});
GUI(state, {
  containerCSS: "position:absolute; top:0; right:10px; width:350px",
});

const camera = createCamera(regl, {
  distance: 8,
  theta: 0.0,
  phi: 0.0,
  far: 100,
});

state.$onChange(camera.taint);

const drawTorus = createDrawBoysSurface(regl, 255, state.Rendering);

let frame = regl.frame(({tick, time}) => {
  camera(({dirty}) => {
    if (!dirty) return;
    regl.clear({color: [1, 1, 1, 1]});

    // Perform two drawing passes, first for the solid surface, then for the wireframe overlayed on top
    // to give a fake transparency effect
    drawTorus([
      {wire: false},
      {wire: true}
    ]);
  });
});
