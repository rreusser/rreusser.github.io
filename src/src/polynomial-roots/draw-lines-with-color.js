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

      #pragma lines: attribute vec3 color;
      #pragma lines: varying vec3 color = getColor(color);
      vec3 getColor (vec3 color) { return color; }

      #pragma lines: width = getWidth();
      uniform float width, pixelRatio;
      float getWidth() {
        return width * pixelRatio;
      }`,
    frag: `
      precision highp float;
      varying vec3 color;
      void main () {
        gl_FragColor = vec4(color, 1);
      }`,
    uniforms: {
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
