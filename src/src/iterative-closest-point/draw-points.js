'use strict';

module.exports = function (regl) {
  return regl({
    vert: `
      precision mediump float;
      attribute vec2 position;
      uniform float uPointSize;
      uniform mat4 uProjectionView;
      void main () {
        gl_Position = uProjectionView * vec4(position.xy, 0, 1);
        gl_PointSize = uPointSize;
      }
    `,
    frag: `
      precision mediump float;
      uniform float uPointSize;
      uniform vec4 uPointColor;
      void main () {
        gl_FragColor = vec4(uPointColor.rgb,
          uPointColor.a * smoothstep(1.0, (uPointSize - 2.0) / uPointSize, length(gl_PointCoord - 0.5) / 0.5));
      }
    `,
    blend: {
      enable: true,
      equation: 'add',
      func: {
        srcAlpha: 1,
        dstAlpha: 1,
        srcRGB: 'src alpha',
        dstRGB: 'one minus src alpha',
      },
    },
    uniforms: {
      uPointSize: (ctx, props) => (props.pointSize || 10.0) * ctx.pixelRatio,
      uPointColor: (ctx, props) => props.pointColor || [1, 0, 0, 1],
    },
    attributes: {
      position: (ctx, props) => props.getBuffer(regl),
    },
    depth: {enable: false},
    primitive: 'points',
    count: (ctx, props) => props.vertices.length / 2
  });
};
