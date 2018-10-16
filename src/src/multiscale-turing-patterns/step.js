'use strict';

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
    frag: `
      precision highp float;
      varying vec2 uv;
      uniform float uDt;
      uniform sampler2D uInput;
      uniform sampler2D uVariation0;
      uniform sampler2D uVariation1;
      uniform sampler2D uVariation2;
      uniform sampler2D uVariation3;
      uniform sampler2D uVariation4;
      uniform float uAmount0;
      uniform float uAmount1;
      uniform float uAmount2;
      uniform float uAmount3;
      uniform float uAmount4;
      void main () {
        vec2 activatorInhibitor0 = texture2D(uVariation0, uv).xz;
        vec2 activatorInhibitor1 = texture2D(uVariation1, uv).xz;
        vec2 activatorInhibitor2 = texture2D(uVariation2, uv).xz;
        vec2 activatorInhibitor3 = texture2D(uVariation3, uv).xz;
        vec2 activatorInhibitor4 = texture2D(uVariation4, uv).xz;

        float var0 = abs(activatorInhibitor0.x - activatorInhibitor0.y);
        float var1 = abs(activatorInhibitor1.x - activatorInhibitor1.y);
        float var2 = abs(activatorInhibitor2.x - activatorInhibitor2.y);
        float var3 = abs(activatorInhibitor3.x - activatorInhibitor3.y);
        float var4 = abs(activatorInhibitor4.x - activatorInhibitor4.y);

        float step0 = activatorInhibitor0.x > activatorInhibitor0.y ? uAmount0 : -uAmount0;
        float step1 = activatorInhibitor1.x > activatorInhibitor1.y ? uAmount1 : -uAmount1;
        float step2 = activatorInhibitor2.x > activatorInhibitor2.y ? uAmount2 : -uAmount2;
        float step3 = activatorInhibitor3.x > activatorInhibitor3.y ? uAmount3 : -uAmount3;
        float step4 = activatorInhibitor4.x > activatorInhibitor4.y ? uAmount4 : -uAmount4;

        float minVariation = var0;
        float step = step0;

        if (var1 < minVariation) { minVariation = var1; step = step1; }
        if (var2 < minVariation) { minVariation = var2; step = step2; }
        if (var3 < minVariation) { minVariation = var3; step = step3; }
        if (var4 < minVariation) { minVariation = var4; step = step4; }

        float y = texture2D(uInput, uv).x;
        gl_FragColor = vec4(y + step * uDt, 0, 0, 0).xyxy;
      }
    `,
    attributes: {
      xy: [-4, -4, 0, 4, 4, -4]
    },
    uniforms: {
      uVariation0: regl.prop('scales[0].variation.texture'),
      uVariation1: regl.prop('scales[1].variation.texture'),
      uVariation2: regl.prop('scales[2].variation.texture'),
      uVariation3: regl.prop('scales[3].variation.texture'),
      uVariation4: regl.prop('scales[4].variation.texture'),
      uAmount0: regl.prop('scales[0].amount'),
      uAmount1: regl.prop('scales[1].amount'),
      uAmount2: regl.prop('scales[2].amount'),
      uAmount3: regl.prop('scales[3].amount'),
      uAmount4: regl.prop('scales[4].amount'),
      uInput: regl.prop('input.texture'),
      uDt: regl.prop('dt'),
    },
    framebuffer: regl.prop('output.fbo'),
    depth: {enable: false},
    count: 3
  });
};
