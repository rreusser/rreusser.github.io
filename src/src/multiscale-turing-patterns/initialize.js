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

      #pragma glslify: random = require(glsl-random)

      uniform float uSeed;
      varying vec2 uv;
      void main () {
        gl_FragColor = vec4(random(gl_FragCoord.xy + uSeed) * 2.0 - 1.0);
      }
    `,
    attributes: {
      xy: [-4, -4, 0, 4, 4, -4]
    },
    uniforms: {
      uSeed: regl.prop('seed'),
    },
    framebuffer: regl.prop('output.fbo'),
    depth: {enable: false},
    count: 3
  });
  
};
