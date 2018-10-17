'use strict';

module.exports = function (regl, numScales) {
  var n = new Array(numScales).fill(0).map((d, i) => i);

  var uniforms = {
    uInput: regl.prop('input.texture'),
    uDt: regl.prop('dt'),
    uRange: (ctx, props) => [
      -(1.0 + props.maxAmount * props.dt * 2.0),
      1.0 + props.maxAmount * props.dt
    ]
  };

  for (var i = 0; i < n.length; i++) {
    uniforms[`uVariation${i}`] = regl.prop(`scales[${i}].variation.texture`);
    uniforms[`uAmount${i}`] = regl.prop(`scales[${i}].amount`);
  }

  return regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      varying vec2 uv;
      void main () {
        uv = xy * 0.5 + 0.5;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: `
      precision highp float;
      varying vec2 uv;
      uniform float uDt;
      uniform vec2 uRange;
      uniform sampler2D uInput;
      ${n.map(i => `
        uniform sampler2D uVariation${i};
        uniform float uAmount${i};
      `).join('\n')}

      void main () {
        ${n.map(i => `
          vec2 activatorInhibitor${i} = texture2D(uVariation${i}, uv).xz;
          float var${i} = abs(activatorInhibitor${i}.x - activatorInhibitor${i}.y);
          float step${i} = activatorInhibitor${i}.x > activatorInhibitor${i}.y ? uAmount${i} : -uAmount${i};
        `).join('\n')}

        float minVariation = var0;
        float step = step0;

        ${n.slice(1).map(i => `
          if (var${i} < minVariation) { minVariation = var${i}; step = step${i}; }
        `).join('\n')}

        float y = texture2D(uInput, uv).x;
        gl_FragColor = vec4((y + step * uDt - uRange.x) / (uRange.y - uRange.x) * 2.0 - 1.0, 0, 0, 0).xyxy;
      }
    `,
    attributes: {
      xy: [-4, -4, 0, 4, 4, -4]
    },
    uniforms: uniforms,
    framebuffer: regl.prop('output.fbo'),
    depth: {enable: false},
    count: 3
  });
};
