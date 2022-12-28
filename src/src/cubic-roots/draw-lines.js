const hexRgbToFloat = require('./hex-rgb-to-float.js');
const reglLines = require('regl-gpu-lines');

function fourify (color) {
  return color.length === 4 ? color : color.concat(1);
}

module.exports = function (regl) { 
  return reglLines(regl, {
    vert: `
      precision highp float;
      uniform mat4 view, inverseView;
      
      #pragma lines: attribute vec2 xy;
      #pragma lines: position = computePosition(xy);
      vec4 computePosition(vec2 xy) {
        if (xy.x >= 1e9) return vec4(0);
        return view * vec4(xy, 0, 1);
      }

      #pragma lines: width = getWidth();
      uniform float width, pixelRatio;
      float getWidth() {
        return width * pixelRatio;
      }`,
    frag: `
      precision highp float;
      uniform vec4 color;
      void main () {
        gl_FragColor = color;
      }`,
    uniforms: {
      color: (ctx, props) => fourify(props.color ? (typeof props.color === 'string' ? hexRgbToFloat(props.color) : props.color) : [0, 0, 0]),
      width: regl.prop('width')
    },
    blend: {
      enable: true,
      func: {
        srcRGB: 'src alpha',
        srcAlpha: 1,
        dstRGB: 'one minus src alpha',
        dstAlpha: 1
      },
      equation: { rgb: 'add', alpha: 'add' },
    },
    depth: {
      enable: false
    }
  });
}
