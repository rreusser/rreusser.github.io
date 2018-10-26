'use strict';

module.exports = function (regl, numScales) {
  var n = new Array(numScales).fill(0).map((d, i) => i);

  var uniforms = {
    uInput: regl.prop('input.texture'),
    uDt: regl.prop('dt'),
    uRange: (ctx, props) => [
      -(1.0 + props.maxAmount * props.dt * 2.2),
      1.0 + props.maxAmount * props.dt * 1.1
    ]
  };

  if (regl.hasExtension('webgl_draw_buffers')) {
    uniforms.uColorInput = regl.prop('input.color');
  }

  var multiplexedScalesCount = Math.ceil(numScales / 2);
  var nMultiplexed = new Array(multiplexedScalesCount).fill(0).map((d, i) => i);

  for (var i = 0; i < multiplexedScalesCount; i++) {
    uniforms[`uVariation${i}`] = regl.prop(`variations[${i}].texture`);
  }

  for (var i = 0; i < n.length; i++) {
    uniforms[`uAmount${i}`] = regl.prop(`scales[${i}].amount`);
    uniforms[`uActivatorRadius${i}`] = regl.prop(`scales[${i}].activatorRadius`);
    if (regl.hasExtension('webgl_draw_buffers')) {
      uniforms[`uColor${i}`] = regl.prop(`scales[${i}].color`);
    }
  }

  var frag = `
    ${regl.hasExtension('webgl_draw_buffers') ? `
      #extension GL_EXT_draw_buffers : enable
    ` : ''}

    precision highp float;
    varying vec2 uv;
    uniform float uDt;
    uniform vec2 uRange;
    uniform sampler2D uInput;

    ${regl.hasExtension('webgl_draw_buffers') ? `uniform sampler2D uColorInput;` : ''}

    ${nMultiplexed.map(i => `uniform sampler2D uVariation${i};`).join('\n    ')}
    ${n.map(i => `uniform float uAmount${i};`).join('\n    ')}
    ${n.map(i => `uniform float uActivatorRadius${i};`).join('\n    ')}
    ${n.map(i => regl.hasExtension('webgl_draw_buffers') ? `uniform vec3 uColor${i};` : '').join('\n    ')}

    void main () {
      ${nMultiplexed.map(i => `
        vec4 activatorInhibitor${i} = texture2D(uVariation${i}, uv);
        float var${2 * i} = abs(activatorInhibitor${i}.x - activatorInhibitor${i}.y);
        float step${2 * i} = activatorInhibitor${i}.x > activatorInhibitor${i}.y ? uAmount${2 * i} : -uAmount${2 * i};
        float var${2 * i + 1} = abs(activatorInhibitor${i}.z - activatorInhibitor${i}.w);
        float step${2 * i + 1} = activatorInhibitor${i}.z > activatorInhibitor${i}.w ? uAmount${2 * i + 1} : -uAmount${2 * i + 1};
      `).join('')}

        float minVariation = var0;
        float step = step0;
      
      ${regl.hasExtension('webgl_draw_buffers') ? `
      vec3 color = texture2D(uColorInput, uv).rgb;
      vec3 outputColor = mix(color, uColor0, uAmount0);` : ''}

      ${n.slice(1).map(i => `
        if (uActivatorRadius${i} > 0.0 && var${i} < minVariation) {
          minVariation = var${i};
          step = step${i};
          ${regl.hasExtension('webgl_draw_buffers') ? `outputColor = mix(color, uColor${i}, uAmount${i});` : ''}
        }
      `).join('')}

      float y = texture2D(uInput, uv).x;
      gl_FragData[0] = vec4(
        (y + step * uDt - uRange.x) / (uRange.y - uRange.x) * 2.0 - 1.0,
      0, 0, 0).xyxy;

      ${regl.hasExtension('webgl_draw_buffers') ? `
        gl_FragData[1] = vec4(max(vec3(-2), min(vec3(3), outputColor)), 1);
      ` : ''}
    }
  `;

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
    frag: frag,
    attributes: {
      xy: [-4, -4, 0, 4, 4, -4]
    },
    uniforms: uniforms,
    framebuffer: regl.prop('output.fbo'),
    depth: {enable: false},
    count: 3
  });
};
