'use strict';

module.exports = function (regl) {
  return regl({
    vert: `
      precision highp float;
      uniform mat4 uView;
      uniform float uLineWidth, uAspect;
      uniform mat4 uWorld;
      attribute vec3 aPoint, aNextPoint;
      attribute vec2 aLine;
      varying float vDash;
  
      void main () {
        vDash = mix(aPoint.z, aNextPoint.z, aLine.y);
        vec4 p = uView * uWorld * vec4(aPoint.xy, 0, 1);
        vec4 n = uView * uWorld * vec4(aNextPoint.xy, 0, 1);
        gl_Position = mix(p, n, aLine.y);
        gl_Position.xy += normalize((p.yx / p.w  - n.yx / n.w) * vec2(1, uAspect)) * vec2(-1.0 / uAspect, 1) * aLine.x * uLineWidth * gl_Position.w;
      }
    `,
    frag: `
      precision highp float;
      uniform vec4 uColor;
      varying float vDash;
      void main () {
        gl_FragColor = uColor * (mod(vDash, 1.0) > 0.5 ? 1.0 : 0.0);
      }
    `,
    attributes: {
      aPoint: {buffer: regl.prop('points'), divisor: 1},
      aNextPoint: {buffer: regl.prop('points'), divisor: 1, offset: 12},
      aLine: new Int8Array([-1, 0, 1, 0, -1, 1, 1, 1]),
    },
    depth: {enable: false},
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
      uLineWidth: (ctx, props) => props.lineWidth / ctx.framebufferHeight * ctx.pixelRatio,
      uColor: regl.prop('color'),
      uAspect: ctx => ctx.framebufferWidth / ctx.framebufferHeight,
    },
    primitive: 'triangle strip',
    instances: (ctx, props) => props.count - 1,
    count: 4,
  });
};
