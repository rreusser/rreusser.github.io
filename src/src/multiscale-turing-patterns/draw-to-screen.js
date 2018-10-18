'use strict';

var glsl = require('glslify');

module.exports = function (regl) {
  var uniforms = {
    uInput: (ctx, props) => props.input.texture,
    textureScale: (ctx, props) => [
      props.input.width / ctx.framebufferWidth,
      props.input.height / ctx.framebufferHeight
    ],
  };

  if (regl.hasExtension('webgl_draw_buffers')) {
    uniforms.uColor = (ctx, props) => props.input.color;
  }

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
    frag: glsl`
      precision highp float;
      #pragma glslify: colormap = require(glsl-colormap/bone)
      varying vec2 uv;
      uniform sampler2D uInput;
      ${regl.hasExtension('webgl_draw_buffers') ? `uniform sampler2D uColor;` : ''}

      void main () {
        float f = texture2D(uInput, uv).x;
        gl_FragColor = vec4(vec3(
          colormap(f).rgb
        ), 1.0);

        ${regl.hasExtension('webgl_draw_buffers') ? `
          gl_FragColor.rgb = mix(f * texture2D(uColor, uv).rgb, gl_FragColor.rgb, (f - 0.5) * (f - 0.5) * 4.0);
        ` : ''}
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: uniforms,
    depth: {enable: false},
    count: 3
  });
};
