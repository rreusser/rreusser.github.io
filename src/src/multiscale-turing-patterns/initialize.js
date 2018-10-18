'use strict';

var glsl = require('glslify');

module.exports = function (regl) {
  return regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      void main () {
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: glsl`
      ${regl.hasExtension('webgl_draw_buffers') ? `
        #extension GL_EXT_draw_buffers : enable
      ` : ''}

      precision highp float;
      #pragma glslify: random = require(glsl-random)
      uniform float uSeed;
      void main () {
        gl_FragData[0] = vec4(random(gl_FragCoord.xy + uSeed) * 2.0 - 1.0);
        ${regl.hasExtension('webgl_draw_buffers') ? `
          gl_FragData[1] = vec4(1);
        ` : ''}
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
