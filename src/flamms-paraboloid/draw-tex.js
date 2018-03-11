const glsl = require('glslify');

module.exports = function (regl) {
  return regl({
    vert: `
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

      #pragma glslify: random = require(glsl-random)

      varying vec2 uv;
      uniform sampler2D src;
      uniform vec2 resolution;
      uniform float alpha, offset, randomness;
      void main () {
        vec3 color = texture2D(src, uv).rgb * alpha;
        float noise = (random(offset + gl_FragCoord.xy / resolution) - 0.5) * randomness + 1.0;
        gl_FragColor = vec4(color * noise, 1);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      src: regl.prop('src'),
      alpha: (ctx, props) => props.alpha === undefined ? 1.0 : props.alpha,
      resolution: ctx => [ctx.framebufferWidth, ctx.framebufferHeight],
      offset: () => Math.random(),
      randomness: regl.prop('randomness'),
    },
    blend: {
      enable: (ctx, props) => props.additive ? true : false,
      func: {
        srcRGB: 1,
        srcAlpha: 1,
        dstRGB: 1,
        dstAlpha: 1
      },
      equation: {
        rgb: 'add',
        alpha: 'add'
      },
    },
    framebuffer: regl.prop('dst'),
    depth: {enable: false},
    count: 3
  });
};
