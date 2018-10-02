'use strict';

module.exports = function (regl) {
  return regl({
    vert: `
      precision highp float;
      uniform float uLineWidth, uAspect;
      uniform sampler2D uState;
      attribute float aPosition, aNextPosition;
      attribute vec2 aLine;

      float getVelocity (vec3 state) {
        return state.y / state.x;
      }
  
      void main () {
        vec4 p = vec4(aPosition * 2.0 - 1.0, getVelocity(texture2D(uState, vec2(aPosition, 0.5)).xyz), 0, 1);
        vec4 n = vec4(aNextPosition * 2.0 - 1.0, getVelocity(texture2D(uState, vec2(aNextPosition, 0.5)).xyz), 0, 1);
        gl_Position = mix(p, n, aLine.y);
        gl_Position.xy += normalize((p.yx / p.w  - n.yx / n.w) * vec2(1, uAspect)) * vec2(-1.0 / uAspect, 1) * aLine.x * uLineWidth * gl_Position.w;
      }
    `,
    frag: `
      precision highp float;
      void main () {
        gl_FragColor = vec4(0.2, 0.1, 0.7, 1);
      }
    `,
    attributes: {
      aPosition: {buffer: regl.prop('position'), divisor: 1},
      aNextPosition: {buffer: regl.prop('position'), divisor: 1, offset: 4},
      aLine: new Int8Array([-1, 0, 1, 0, -1, 1, 1, 1]),
    },
    uniforms: {
      uState: (ctx, props) => props.state.texture,
      uLineWidth: (ctx, props) => props.lineWidth / ctx.framebufferHeight * ctx.pixelRatio,
      uAspect: ctx => ctx.framebufferWidth / ctx.framebufferHeight,
    },
    primitive: 'triangle strip',
    instances: (ctx, props) => props.n - 1,
    count: 4,
  });
};
