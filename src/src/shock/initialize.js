'use strict';

var conservedFromState = require('./conserved-from-state');

module.exports = function (regl) {
  return regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      varying vec2 vUv;
      void main () {
        vUv = xy * 0.5 + 0.5;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: `
      precision highp float;

      varying vec2 vUv;
      uniform sampler2D src;
      uniform vec3 uLeftState, uRightState;
      void main () {
        gl_FragColor = vec4(
          vUv.x < 0.5 ? uLeftState : uRightState,
          vUv.x
        );
      }
    `,
    attributes: {
      xy: [-4, -4, 0, 4, 4, -4]
    },
    uniforms: {
      uLeftState: (ctx, props) => conservedFromState(props.leftState, ctx.gamma),
      uRightState: (ctx, props) => conservedFromState(props.rightState, ctx.gamma),
    },
    framebuffer: (ctx, props) => props.destination.fbo,
    depth: {enable: false},
    count: 3
  });
  
};
