'use strict';

var glsl = require('glslify');

module.exports = function (regl) {
  return regl({
    vert: `
      precision highp float;
      uniform mat4 uWorldInverse, uViewInverse;
      attribute vec2 xy;
      varying vec2 uv;
      void main () {
        uv = (uWorldInverse * uViewInverse * vec4(2.0 * xy, 0, 1)).xy / 2.0;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: glsl`
      precision highp float;
      #pragma glslify: random = require(glsl-noise/simplex/2d)
      uniform vec2 uResolution;
      uniform float uOpacity;
      varying vec2 uv;
      void main () {
        float r = random(uv / uResolution / 35.0);
        gl_FragColor = vec4(vec3(smoothstep(0.85, 1.0, r)) * uOpacity, 1);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      uOpacity: regl.prop('opacity')
    },
    blend: {
      enable: true,
      func: {
        srcRGB: 'src alpha',
        srcAlpha: 'zero',
        dstRGB: 'one',
        dstAlpha: 'one'
      },
    },
    depth: {enable: false},
    count: 3
  });
};
