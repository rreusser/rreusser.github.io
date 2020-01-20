'use strict';

var DEFAULT_COLOR = [0, 0, 0, 1];
var DEFAULT_ARROWHEAD_WIDTH = 4;
var DEFAULT_ARROWHEAD_LENGTH = 8;
var DEFAULT_LINE_WIDTH = 1;

module.exports = function (regl, opts) {
  return regl({
    vert: `
      precision highp float;
      uniform mat4 uWorld, uView;
      uniform float uLineWidth, uAspect;
      uniform vec2 uArrowheadShape;
      attribute vec2 aVertex, aNextVertex;
      attribute vec4 aLine;
      uniform float uLengthMultiplier;

      void main () {
        vec4 p = uView * vec4(aVertex, 0, 1);
        vec4 n = uView * vec4(aVertex + aNextVertex * uLengthMultiplier, 0, 1);
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
        buffer: regl.prop('points'),
        divisor: 2,
        stride: 16,
      },
      aNextVertex: {
        buffer: regl.prop('points'),
        divisor: 2,
        offset: 8,
        stride: 16,
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
      enable: false
    },
    cull: {
      enable: true,
      face: 'back',
    },
    uniforms: {
      uLengthMultiplier: (ctx, props) => props.lengthMultiplier == undefined ? 1 : props.lengthMultiplier,
      uLineWidth: function (ctx, props) {
        var lineWidth = props.lineWidth === undefined ? DEFAULT_LINE_WIDTH : props.lineWidth;
        return lineWidth / ctx.framebufferHeight * ctx.pixelRatio;
      },
      uArrowheadShape: function (ctx, props) {
        var arrowheadLength = props.arrowheadLength === undefined ? DEFAULT_ARROWHEAD_LENGTH : props.arrowheadLength;
        var arrowheadWidth = props.arrowheadWidth === undefined ? DEFAULT_ARROWHEAD_WIDTH : props.arrowheadWidth;
        return [
          arrowheadLength / ctx.framebufferHeight * ctx.pixelRatio * 2.0,
          arrowheadWidth / ctx.framebufferHeight * ctx.pixelRatio
        ];
      },
      uColor: regl.prop('color'),
      uAspect: ctx => ctx.framebufferWidth / ctx.framebufferHeight,
    },
    blend: {
      enable: true,
      func: {
        srcRGB: 'src alpha',
        srcAlpha: 'src alpha',
        dstRGB: 'one minus src alpha',
        dstAlpha: 'one minus src alpha'
      },
    },
    primitive: 'triangles',
    instances: (ctx, props) => Math.floor(props.count / 2) * 2,
    count: 9,
  });
};
