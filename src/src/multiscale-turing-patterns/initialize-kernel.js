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
      uniform float uActivatorRadius, uInhibitorRadius;
      uniform vec2 uResolution;

      #define PI 3.14159265358979

      void main () {
        vec2 wrappedUv = mod(uv + 0.5 - 0.5 / uResolution, 1.0) - 0.5;
        float r = length(wrappedUv * uResolution);

        float ar1 = uActivatorRadius - 0.5;
        float ar2 = uActivatorRadius + 0.5;

        float ir1 = uInhibitorRadius - 0.5;
        float ir2 = uInhibitorRadius + 0.5;

        gl_FragColor = vec4(
          (1.0 - min(1.0, max(0.0, (r - ar1) / (ar2 - ar1)))) / (PI * uActivatorRadius * uActivatorRadius),
          0.0,
          (1.0 - min(1.0, max(0.0, (r - ir1) / (ir2 - ir1)))) / (PI * uInhibitorRadius * uInhibitorRadius),
          0.0
        );
      }
    `,
    attributes: {
      xy: [-4, -4, 0, 4, 4, -4]
    },
    uniforms: {
      uActivatorRadius: regl.prop('activatorRadius'),
      uInhibitorRadius: regl.prop('inhibitorRadius'),
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
