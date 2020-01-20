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
      uniform bool uCircular1, uCircular2;
      uniform vec2 uResolution;

      #define PI 3.14159265358979

      void main () {
        vec2 wrappedUv = mod(uv + 0.5 - 0.5 / uResolution, 1.0) - 0.5;
        float r = length(wrappedUv * uResolution);

        float gaussianScale = 0.5;

        float arInner1 = uActivatorRadius1 - 0.5;
        float arOuter1 = uActivatorRadius1 + 0.5;
        float irInner1 = uInhibitorRadius1 - 0.5;
        float irOuter1 = uInhibitorRadius1 + 0.5;

        float arInner2 = uActivatorRadius2 - 0.5;
        float arOuter2 = uActivatorRadius2 + 0.5;
        float irInner2 = uInhibitorRadius2 - 0.5;
        float irOuter2 = uInhibitorRadius2 + 0.5;
        
        if (uCircular1) {
          gl_FragColor.x = (1.0 - min(1.0, max(0.0, (r - arInner1) / (arOuter1 - arInner1)))) / (PI * uActivatorRadius1 * uActivatorRadius1);
          gl_FragColor.y = (1.0 - min(1.0, max(0.0, (r - irInner1) / (irOuter1 - irInner1)))) / (PI * uInhibitorRadius1 * uInhibitorRadius1);
        } else {
          gl_FragColor.x = exp(-0.5 * pow(r / (uActivatorRadius1 * gaussianScale), 2.0)) * 0.5 / 3.1415926 / pow(uActivatorRadius1 * gaussianScale, 2.0);
          gl_FragColor.y = exp(-0.5 * pow(r / (uInhibitorRadius1 * gaussianScale), 2.0)) * 0.5 / 3.1415926 / pow(uInhibitorRadius1 * gaussianScale, 2.0);
        }

        if (uCircular2) {
          gl_FragColor.z = (1.0 - min(1.0, max(0.0, (r - arInner2) / (arOuter2 - arInner2)))) / (PI * uActivatorRadius2 * uActivatorRadius2);
          gl_FragColor.w = (1.0 - min(1.0, max(0.0, (r - irInner2) / (irOuter2 - irInner2)))) / (PI * uInhibitorRadius2 * uInhibitorRadius2);
        } else {
          gl_FragColor.z = exp(-0.5 * pow(r / (uActivatorRadius2 * gaussianScale), 2.0)) * 0.5 / 3.1415926 / pow(uActivatorRadius2 * gaussianScale, 2.0);
          gl_FragColor.w = exp(-0.5 * pow(r / (uInhibitorRadius2 * gaussianScale), 2.0)) * 0.5 / 3.1415926 / pow(uInhibitorRadius2 * gaussianScale, 2.0);
        }
      }
    `,
    attributes: {
      xy: [-4, -4, 0, 4, 4, -4]
    },
    uniforms: {
      uActivatorRadius1: (ctx, props) => props.scale1.activatorRadius * props.scaleFactor,
      uInhibitorRadius1: (ctx, props) => props.scale1.inhibitorRadius * props.scaleFactor,
      uActivatorRadius2: (ctx, props) => props.scale2.activatorRadius * props.scaleFactor,
      uInhibitorRadius2: (ctx, props) => props.scale2.inhibitorRadius * props.scaleFactor,
      uCircular1: (ctx, props) => props.scale1.kernel === 'circular',
      uCircular2: (ctx, props) => props.scale2.kernel === 'circular',
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
