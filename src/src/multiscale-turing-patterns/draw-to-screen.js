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

      vec3 yuv2rgb (vec3 yuv) {
        yuv.gb -= 0.5;
        return vec3(
          yuv.x * 1.0 + yuv.z * 1.4,
          yuv.x * 1.0 + yuv.y * -0.343 + yuv.z * -0.711,
          yuv.x * 1.0 + yuv.y * 1.765
        );
      }

      vec3 rgb2yuv (vec3 rgb) {
        return vec3(
        	rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114,
          rgb.r * -0.169 + rgb.g * -0.331 + rgb.b * 0.5 + 0.5,
          rgb.r * 0.5 + rgb.g * -0.419 + rgb.b * -0.081 + 0.5
        );
      }

      void main () {
        float f = max(0.0, min(1.0, texture2D(uInput, uv).x));
        gl_FragColor = vec4(vec3(
          colormap(f).rgb
        ), 1.0);

        //vec3 color = rgb2yuv(texture2D(uColor, uv).rgb);
        //color *= ;
        //color = yuv2rgb(color);
        //gl_FragColor = vec4(color, 1);

        ${regl.hasExtension('webgl_draw_buffers') ? `
          //gl_FragColor.rgb = texture2D(uColor, uv).rgb * f;
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
