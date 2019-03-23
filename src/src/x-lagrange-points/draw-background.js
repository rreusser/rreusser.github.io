'use strict';

var glsl = require('glslify');

module.exports = function (regl) {
  var w = 256;
  var h = 256;

  var backgroundTextureData = new Uint8Array(w * h * 4);
  var n = w * h;
  for (var i = 0, i4 = 0; i < n; i++, i4 += 4) {
    var r =  Math.random();
    r = 1 + (r - 1) * 80;
    var r = Math.max(0, Math.min(255, Math.floor(256 * 0.8 * Math.pow(r, 3))));
    backgroundTextureData[i4] = r;
    backgroundTextureData[i4 + 1] = r;
    backgroundTextureData[i4 + 2] = r;
    backgroundTextureData[i4 + 3] = 255;
  }

  var backgroundTexture = new regl.texture({
    data: backgroundTextureData,
    width: w,
    height: h,
    wrapS: 'repeat',
    wrapT: 'repeat',
    mag: 'linear',
    min: 'linear',
  });


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
      uniform vec2 uResolution;
      uniform float uOpacity;
      uniform sampler2D uBackground;
      uniform vec2 uTextureScale;
      varying vec2 uv;
      void main () {
        gl_FragColor = vec4(texture2D(uBackground, uv * uTextureScale).rgb, uOpacity);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      uBackground: backgroundTexture,
      uTextureScale: ctx => [
        Math.min(ctx.framebufferHeight, ctx.framebufferWidth) / w / 6,
        Math.min(ctx.framebufferHeight, ctx.framebufferWidth) / h / 6,
      ],
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
