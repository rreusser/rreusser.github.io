const glsl = require('glslify');

module.exports = function (regl) {
  return regl({ vert: `
      precision mediump float;
      attribute vec2 xy;
      varying vec2 uv;
      void main () {
        uv = xy * 0.5 + 0.5;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: glsl`
      precision mediump float;
      #pragma glslify: blur = require('glsl-fast-gaussian-blur/9')
      varying vec2 uv;
      uniform vec2 resolution, direction;
      uniform sampler2D src;
      void main () {
        gl_FragColor = blur(src, uv, resolution, direction);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      src: regl.prop('src'),
      resolution: ctx => [ctx.framebufferWidth, ctx.framebufferHeight],
      direction: regl.prop('direction')
    },
    blend: {
      enable: true,
      func: { srcRGB: 1, srcAlpha: 1, dstRGB: 1, dstAlpha: 1 },
      equation: { rgb: 'add', alpha: 'add' },
    },
    depth: {enable: false},
    count: 3
  });
};
