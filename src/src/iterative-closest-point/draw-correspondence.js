'use strict';

module.exports = function (regl) {
  return regl({
    vert: `
      precision highp float;
      uniform mat4 uProjectionView;
      uniform float uLineWidth, uAspect;
      attribute vec2 aSource, aTarget;
      attribute vec2 aLine;
      attribute float aWeight;
      varying float vWeight;
  
      void main () {
        vWeight = aWeight;
        vec4 p = uProjectionView * vec4(aSource, 0, 1);
        vec4 n = uProjectionView * vec4(aTarget, 0, 1);
        gl_Position = mix(p, n, aLine.y);
        gl_Position.xy += normalize((p.yx / p.w  - n.yx / n.w) * vec2(1, uAspect)) * vec2(-1.0 / uAspect, 1) * aLine.x * uLineWidth * gl_Position.w;
      }
    `,
    frag: `
      precision mediump float;
      varying float vWeight;
      void main () {
        gl_FragColor = mix(vec4(0.7, 0.0, 0.1, 0.7), vec4(0, 0, 0, 0.75), vWeight);
      }
    `,
    attributes: {
      aSource: {buffer: regl.prop('source'), divisor: 1},
      aTarget: {buffer: regl.prop('target'), divisor: 1},
      aWeight: {buffer: regl.prop('weight'), divisor: 1},
      aLine: new Int8Array([-1, 0, 1, 0, -1, 1, 1, 1]),
    },
    blend: {
      enable: true,
      func: {
        srcRGB: 'src alpha',
        dstRGB: 'one minus src alpha',
        dstAlpha: 'one minus src alpha',
        srcAlpha: 'src alpha',
      },
      equation: 'add'
    },
    depth: {enable: false},
    uniforms: {
      uLineWidth: (ctx, props) => props.lineWidth / ctx.framebufferHeight * ctx.pixelRatio,
      uAspect: ctx => ctx.framebufferWidth / ctx.framebufferHeight,
    },
    primitive: 'triangle strip',
    instances: regl.prop('count'),
    count: 4,
  });
  
};
