'use strict';

module.exports = function (regl) {
  return regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      varying vec2 uv;
      uniform vec2 textureScale;
      void main () {
        uv = (xy * 0.5 + 0.5) / textureScale;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: `
      precision highp float;
      varying vec2 uv;
      uniform sampler2D uInput;
      void main () {
        gl_FragColor = vec4(vec3(
          (texture2D(uInput, uv).x - 0.5) + 0.5
        ), 1.0);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      uInput: (ctx, props) => props.input.texture,
      textureScale: (ctx, props) => [
        props.input.width / ctx.framebufferWidth,
        props.input.height / ctx.framebufferHeight
      ],
    },
    depth: {enable: false},
    count: 3
  });
};
