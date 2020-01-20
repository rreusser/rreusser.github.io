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
      varying vec2 uv;
      uniform sampler2D uInput, uKernel;
      void main () {
        vec4 src = texture2D(uInput, uv);
        vec4 kernel = texture2D(uKernel, uv);

        // (ar + ai i) * (br + bi i)
        // (ar * br - ai * bi) + (ar * bi + ai * br) i

        gl_FragColor = vec4(
          src.xz * kernel.xz - src.yw * kernel.yw,
          src.xz * kernel.yw + src.yw * kernel.xz
        ).xzyw;
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      uInput: regl.prop('input.texture'),
      uKernel: regl.prop('kernel.texture'),
    },
    framebuffer: regl.prop('output.fbo'),
    depth: {enable: false},
    count: 3
  });
  
};
