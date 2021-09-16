const createREGL = require('regl');
const createCamera = require('./regl-turntable-camera');
const meshSurface = require('./mesh-surface-2d');
const mat4create = require('gl-mat4/create');
const mat4multiply = require('gl-mat4/multiply');
const mat4lookAt = require('gl-mat4/lookAt');

const State = require('controls-state');
const GUI = require('controls-gui');

require('insert-css')(`
.sketch-nav {
  left: 0;
  right: auto;
  text-align: left;
}
`);

const state = GUI(State({
  tau: State.Slider(1, {min: 0, max: 2.0, step: 0.01, label: 'τ'}),
  uRange: State.Slider(1, {min: 0, max: 2.0, step: 0.01, label: 'uRange'}),
  vRange: State.Slider(1, {min: 0, max: 2.0, step: 0.01, label: 'vRange'}),
}), {
  containerCSS: "position:absolute; top:0; right:10px; width:350px; z-index: 1",
});

function createDrawThingy (regl, res) {
  const mesh = meshSurface({}, (out, u, v) => {
    out[0] = u * 0.999999;
    out[1] = v * 0.999999;
  }, {
    resolution: [res, res],
    uDomain: [-Math.PI, Math.PI],
    vDomain: [-Math.PI * 0.5, Math.PI * 0.5],
  });

  return regl({
    vert: `
      precision highp float;
      attribute vec2 uv;
      uniform mat4 uProjectionView;
      uniform float uTau;
      uniform vec2 uRange;
      varying vec3 vPosition, vNormal;
      varying float vRadius;
      varying vec2 vUV;

      /*
      vec4 quatMult(vec4 q1, vec4 q2) {
        return vec4(
          (q1.w * q2.x) + (q1.x * q2.w) + (q1.y * q2.z) - (q1.z * q2.y),
          (q1.w * q2.y) - (q1.x * q2.z) + (q1.y * q2.w) + (q1.z * q2.x),
          (q1.w * q2.z) + (q1.x * q2.y) - (q1.y * q2.x) + (q1.z * q2.w),
          (q1.w * q2.w) - (q1.x * q2.x) - (q1.y * q2.y) - (q1.z * q2.z)
        );
      }
      */

      vec3 f(vec2 uv, float tau) {
        float tx = tau * uv.x;
        vec4 p = vec4(
          cos(uv.y) * vec2(cos(uv.x), sin(uv.x)),
          sin(uv.y) * vec2(cos(tx), sin(tx))
        );

        //vec4 q = vec4(-1, -1, 1, -1);
        //q = normalize(q);
        //p = quatMult(p, q / normalize(q));

        // Compute the stereographic projection
        return p.yzx / (1.0 - p.w);
      }

      void main () {
        vUV = uv;
        vec2 uvScaled = uv * uRange;
        vUV *= uRange;
        vPosition = f(uvScaled, uTau);
        vRadius = dot(vPosition, vPosition);

        // Taint bad triangles to prevent them from passing through the origin as they cross from -Ininity to Infinity
        if (vRadius > 400.0) vPosition /= 0.0;

        // Compute the normal via numerical differentiation
        const float dx = 5e-3;
        vNormal = normalize(cross(
          f(uvScaled + vec2(dx / uRange.x, 0), uTau) - vPosition,
          f(uvScaled + vec2(0, dx / uRange.y), uTau) - vPosition
        ));

        gl_Position = uProjectionView * vec4(vPosition, 1);
      }
    `,
    frag: `
      #extension GL_OES_standard_derivatives : enable
      precision highp float;
      varying vec3 vPosition, vNormal;
      uniform vec3 uEye;
      uniform bool uWire;
      varying vec2 vUV;
      varying float vRadius;
      uniform float pixelRatio;

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
        if (dot(vPosition, vPosition) > 100.0) discard;
        // Shading technique adapted/simplified/customized from: https://observablehq.com/@rreusser/faking-transparency-for-3d-surfaces
        vec3 normal = normalize(vNormal);
        float vDotN = abs(dot(normal, normalize(vPosition - uEye)));
        float vDotNGrad = fwidth(vDotN);
        float cartoonEdge = smoothstep(0.75, 1.25, vDotN / (vDotNGrad * 3.0 * pixelRatio));
        float sgn = gl_FrontFacing ? 1.0 : -1.0;
        float grid = gridFactor(vUV * vec2(2.0, 2.0) * 4.0 / PI, 0.25 * pixelRatio, 1.0);
        vec3 baseColor = gl_FrontFacing ? vec3(0.9, 0.2, 0.1) : vec3(0.1, 0.4, 0.8);
        float vDotN4 = vDotN * vDotN;
        vDotN *= vDotN4;
        vDotN *= vDotN4;
        float shade = mix(1.0, vDotN4, 0.6) + 0.2;

        if (uWire) {
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
      uRange: (ctx, props) => [state.uRange, state.vRange],
      uTau: regl.prop('tau'),
      uWire: regl.prop('wire'),
      pixelRatio: regl.context('pixelRatio'),
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

const camera = createCamera(regl, {
  distance: 8,
  theta: Math.PI * 1.1,
  phi: Math.PI * 0.1,
  far: 200,
  rotateAbountCenter: true
});

const drawTorus = createDrawThingy(regl, 200);

state.$onChanges(camera.taint);

let frame = regl.frame(({tick, time}) => {
  camera({
    rotationCenter: camera.params.center
  }, ({dirty}) => {
    if (!dirty) return;
    regl.clear({color: [1, 1, 1, 1]});

    // Perform two drawing passes, first for the solid surface, then for the wireframe overlayed on top
    // to give a fake transparency effect
    drawTorus([
      {wire: false, tau: state.tau},
      {wire: true, tau: state.tau}
    ]);
  });
});
