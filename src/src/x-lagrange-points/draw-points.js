'use strict';

var DEFAULT_POINT_SIZE = 10.0;

module.exports = function (regl) {
  return regl({
    vert: `
      precision highp float;
      uniform mat4 uView, uModel;
      uniform float uPointSize;
      attribute vec2 aPoint;
  
      void main () {
        vec2 xy = (uView * uModel * vec4(aPoint, 0, 1)).xy;
        gl_Position = vec4(xy, 0, 1);
        gl_PointSize = uPointSize * 2.0;
      }
    `,
    frag: `
      precision highp float;
      uniform float uPointSize, uHalo;
      uniform vec4 uColor;
      void main () {
        float r = length(gl_PointCoord.xy - 0.5) * 2.0;
        float alpha = smoothstep(0.5, 0.5 * (uPointSize - 3.0) / uPointSize, r);
        gl_FragColor = vec4(mix(
          mix(vec3(1), uColor.rgb, 0.5),
          uColor.rgb,
          alpha
        ), (1.0 / r - 1.0) * mix(uHalo, 1.0, alpha));
      }
    `,
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
    attributes: {
      aPoint: regl.prop('points'),
    },
    uniforms: {
      uPointSize: (ctx, props) => (props.pointSize === undefined ? DEFAULT_POINT_SIZE : props.pointSize) * ctx.pixelRatio,
      uColor: regl.prop('color'),
      uHalo: regl.prop('halo'),
    },
    primitive: 'points',
    count: regl.prop('count'),
  });
};
