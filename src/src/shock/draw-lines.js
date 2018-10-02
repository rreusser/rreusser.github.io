'use strict';

module.exports = function (regl) {
  return regl({
    vert: `
      precision highp float;
      uniform mat4 uProjectionView;
      uniform float uLineWidth, uAspect;
      attribute vec3 aPoint, aNextPoint;
      attribute vec2 aLine;
  
      void main () {
        vec4 p = uProjectionView * vec4(aPoint, 1);
        vec4 n = uProjectionView * vec4(aNextPoint, 1);
        gl_Position = mix(p, n, aLine.y);
        gl_Position.xy += normalize((p.yx / p.w  - n.yx / n.w) * vec2(1, uAspect)) * vec2(-1.0 / uAspect, 1) * aLine.x * uLineWidth * gl_Position.w;
      }
    `,
    frag: `
      precision highp float;
      void main () {
        gl_FragColor = vec4(1, 1, 1, 1);
      }
    `,
    attributes: {
      aPoint: {buffer: regl.prop('points'), divisor: 1},
      aNextPoint: {buffer: regl.prop('points'), divisor: 1, offset: 12},
      aLine: new Int8Array([-1, 0, 1, 0, -1, 1, 1, 1]),
    },
    uniforms: {
      uLineWidth: (ctx, props) => props.lineWidth / ctx.framebufferHeight * ctx.pixelRatio,
      uAspect: ctx => ctx.framebufferWidth / ctx.framebufferHeight,
    },
    primitive: 'triangle strip',
    instances: (ctx, props) => props.count - 1,
    count: 4,
  });
};
