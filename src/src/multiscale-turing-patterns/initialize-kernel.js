'use strict';

module.exports = function (regl) {
  return regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      varying vec2 uv;
      void main () {
        uv = xy * 0.5 - 0.5;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: `
      precision highp float;
      varying vec2 uv;
      uniform float uActivatorRadius1, uInhibitorRadius1;
      uniform float uActivatorRadius2, uInhibitorRadius2;
      uniform vec2 uResolution;

      #define PI 3.14159265358979

      void main () {
        vec2 wrappedUv = mod(uv + 0.5 - 0.5 / uResolution, 1.0) - 0.5;
        float r = length(wrappedUv * uResolution);

        float arInner1 = uActivatorRadius1 - 0.5;
        float arOuter1 = uActivatorRadius1 + 0.5;
        float irInner1 = uInhibitorRadius1 - 0.5;
        float irOuter1 = uInhibitorRadius1 + 0.5;

        float arInner2 = uActivatorRadius2 - 0.5;
        float arOuter2 = uActivatorRadius2 + 0.5;
        float irInner2 = uInhibitorRadius2 - 0.5;
        float irOuter2 = uInhibitorRadius2 + 0.5;

        gl_FragColor = vec4(
          (1.0 - min(1.0, max(0.0, (r - arInner1) / (arOuter1 - arInner1)))) / (PI * uActivatorRadius1 * uActivatorRadius1),
          (1.0 - min(1.0, max(0.0, (r - irInner1) / (irOuter1 - irInner1)))) / (PI * uInhibitorRadius1 * uInhibitorRadius1),
          (1.0 - min(1.0, max(0.0, (r - arInner2) / (arOuter2 - arInner2)))) / (PI * uActivatorRadius2 * uActivatorRadius2),
          (1.0 - min(1.0, max(0.0, (r - irInner2) / (irOuter2 - irInner2)))) / (PI * uInhibitorRadius2 * uInhibitorRadius2)
        );
      }
    `,
    attributes: {
      xy: [-4, -4, 0, 4, 4, -4]
    },
    uniforms: {
      uActivatorRadius1: regl.prop('scale1.activatorRadius'),
      uInhibitorRadius1: regl.prop('scale1.inhibitorRadius'),
      uActivatorRadius2: regl.prop('scale2.activatorRadius'),
      uInhibitorRadius2: regl.prop('scale2.inhibitorRadius'),
      uResolution: ctx => [
        ctx.framebufferWidth,
        ctx.framebufferHeight
      ],
    },
    framebuffer: regl.prop('output.fbo'),
    depth: {enable: false},
    count: 3
  });
};
