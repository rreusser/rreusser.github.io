'use strict';

var glsl = require('glslify');

module.exports = function (regl) {
  return regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      varying vec2 uv;
      void main () {
        uv = xy * 0.5 + 0.5;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: glsl`
      precision highp float;

      #pragma glslify: flux = require(./flux)

      varying vec2 uv;
      uniform sampler2D uU;
      uniform float uGamma;
      uniform float uRes, uDx;

      const float dt = 0.000001;

      void main () {
        vec4 U = texture2D(uU, uv);

        vec3 UL = texture2D(uU, uv + vec2(-uRes, 0)).xyz;
        vec3 UR = texture2D(uU, uv + vec2(uRes, 0)).xyz;

        vec3 FL = flux(UL, uGamma);
        vec3 FR = flux(UR, uGamma);
        
        vec3 dFdx = (FR - FL) / (2.0 * uDx);

        gl_FragColor = vec4(U.xyz - dt * dFdx, U.w);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      uU: (ctx, props) => props.input.texture,
      uRes: ctx => 1.0 / ctx.framebufferWidth,
      uDx: (ctx, props) => (ctx.xmax - ctx.xmin) / ctx.framebufferWidth,
      uGamma: (ctx, props) => ctx.gamma,
    },
    framebuffer: (ctx, props) => props.output.fbo,
    depth: {enable: false},
    count: 3
  });
  
};
