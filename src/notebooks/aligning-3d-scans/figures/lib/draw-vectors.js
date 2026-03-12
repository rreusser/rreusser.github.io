'use strict';

var DEFAULT_COLOR = [0, 0, 0, 1];

module.exports = function (regl, opts) {
  opts = opts || {};
  var arrowheadWidth = opts.arrowheadWidth || 8;
  var arrowheadLength = opts.arrowheadLength || 14;

  return regl({
    vert: `
      precision highp float;
      uniform mat4 uProjectionView;
      uniform float uLineWidth, uAspect;
      uniform vec2 uArrowheadShape;
      attribute vec3 aVertex, aNextVertex;
      attribute vec4 aLine;
  
      void main () {
        vec4 p = uProjectionView * vec4(aVertex, 1);
        vec4 n = uProjectionView * vec4(aNextVertex, 1);
        gl_Position = mix(p, n, aLine.y);

        vec2 unitVector = normalize((p.xy / p.w  - n.xy / n.w) * vec2(uAspect, 1));

        gl_Position.xy += (
            vec2(-unitVector.y, unitVector.x) * (aLine.x * uLineWidth + aLine.w * uArrowheadShape.y) +
            -unitVector * aLine.z * uArrowheadShape.x
          ) *
          vec2(1.0 / uAspect, 1) * gl_Position.w;

      }
    `,
    frag: `
      precision highp float;
      uniform vec4 uColor;
      void main () {
        gl_FragColor = uColor;
      }
    `,
    attributes: {
      aVertex: {
        buffer: regl.prop('vertices'),
        divisor: 2,
        stride: 24,
      },
      aNextVertex: {
        buffer: regl.prop('vertices'),
        divisor: 2,
        offset: 12,
        stride: 24,
      },
      aLine: new Float32Array([
        -1, 0, 0, 0,
        1, 0, 0, 0,
        1, 1, -1, 0,

        -1, 0, 0, 0,
        1, 1, -1, 0,
        -1, 1, -1, 0,

        0, 1, -1, -1,
        0, 1, -1, 1,
        0, 1, 0, 0,
      ]),
    },
    depth: {
      enable: (ctx, props) => props.depth !== false
    },
    uniforms: {
      uLineWidth: (ctx, props) => (props.lineWidth || 1.0) / ctx.framebufferHeight * ctx.pixelRatio,
      uArrowheadShape: (ctx, props) => [
        (props.arrowheadLength || arrowheadLength) / ctx.framebufferHeight * ctx.pixelRatio * 2.0,
        (props.arrowheadWidth || arrowheadWidth) / ctx.framebufferHeight * ctx.pixelRatio
      ],
      uAspect: ctx => ctx.framebufferWidth / ctx.framebufferHeight,
      uColor: (ctx, props) => props.lineColor || DEFAULT_COLOR,
    },
    primitive: 'triangles',
    instances: (ctx, props) => props.count,
    count: 9,
  });
};
