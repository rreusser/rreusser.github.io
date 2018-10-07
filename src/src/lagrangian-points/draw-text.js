'use strict';

var createFontAtlas = require('font-atlas-sdf');

module.exports = function (regl, strings) {

  var size = 64;
  var aspect = 1.5;
  var fontAtlas = createFontAtlas({
    font: '12px serif',
    shape: [size * 5, size],
    step: [size, size],
    chars: ['L1', 'L2', 'L3', 'L4', 'L5'],
  });

  var atlasTexture = regl.texture({
    data: fontAtlas,
    flipY: true,
    mag: 'linear',
    min: 'linear',
  });

  return regl({
    vert: `
      precision highp float;
      attribute vec2 aSpriteVertex;
      uniform vec2 uResolution, uAtlasOffset, uAtlasScale, uPosition, uOffset;
      uniform mat4 uView, uModel;
      varying vec2 vUv;
      uniform float uPixelRatio;
      void main () {
        vUv = uAtlasOffset + uAtlasScale * aSpriteVertex;
        gl_Position = vec4(
          (uView * uModel * vec4(uPosition, 0, 1)).xy + 
          uOffset * uResolution * 2.0 * uPixelRatio +
          (aSpriteVertex - 0.5) * uResolution * 2.0 * 40.0 * uPixelRatio,
          0, 1);
      }
    `,
    frag: `
      precision highp float;
      uniform sampler2D uAtlas;
      uniform float uOpacity;
      varying vec2 vUv;
      void main () {
        float value = texture2D(uAtlas, vUv).r;
        gl_FragColor = vec4(
          vec3(smoothstep(0.76, 0.72, value)),
          smoothstep(0.68, 0.71, value) * uOpacity
        );
      }
    `,
    attributes: {
      aSpriteVertex: new Uint8Array([0, 0, 1, 0, 0, 1, 1, 1])
    },
    blend: {
      enable: true,
      func: {
        srcRGB: 'src alpha',
        srcAlpha: 'src alpha',
        dstRGB: 'one minus src alpha',
        dstAlpha: 'one minus src alpha'
      },
    },
    uniforms: {
      uAtlas: atlasTexture,
      uOffset: regl.prop('offset'),
      uPosition: regl.prop('position'),
      uAtlasOffset: (ctx, props) => {
        return [props.index / strings.length, 0.0];
      },
      uAtlasScale: (ctx, props) => {
        return [1.0 / strings.length, 1.0];
      },
      uOpacity: regl.prop('opacity'),
      uPixelRatio: regl.context('pixelRatio'),
      uResolution: ctx => [1.0 / ctx.framebufferWidth, 1.0 / ctx.framebufferHeight],
    },
    depth: {enable: false},
    primitive: 'triangle strip',
    count: 4
  });
}
