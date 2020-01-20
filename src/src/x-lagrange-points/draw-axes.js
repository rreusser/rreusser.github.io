'use strict';

module.exports = function (regl) {
  var pointData = [];
  for (var i = 0; i <= 0; i++) {
    pointData.push([-200, i, 200, i]);
    pointData.push([i, -200, i, 200]);
  }
  var points = regl.buffer(pointData);

  return regl({
    vert: `
      precision highp float;
      uniform mat4 uView, uWorld;
      attribute vec2 aPoint;
  
      void main () {
        vec2 xy = (uView * uWorld * vec4(aPoint, 0, 1)).xy;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: `
      precision highp float;
      uniform float uOpacity;
      void main () {
        gl_FragColor = vec4(vec3(1), uOpacity);
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
      aPoint: points,
    },
    uniforms: {
      uOpacity: regl.prop('opacity'),
    },
    primitive: 'lines',
    count: pointData.length * 2,
  });
  
};
