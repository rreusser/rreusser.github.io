const reglLines = require('regl-gpu-lines');

module.exports = function (regl, {vertexCount=200, createAirfoilGLSL}={}) {
  const theta = regl.buffer([...Array(vertexCount).keys()].map(t => 2.0 * Math.PI * t / (vertexCount - 3)));

  function createCommand(joukowsky) {
    const drawLines = reglLines(regl, {
      vert: `
        precision highp float;
        uniform float lineWidth;

        #pragma lines: attribute float theta;
        #pragma lines: position = getPosition(theta);
        #pragma lines: width = getWidth();

        ${createAirfoilGLSL(joukowsky)}
        vec4 getPosition(float theta) {
          return view * vec4(airfoil(theta), 0, 1);
        }

        float getWidth () {
          return lineWidth + 0.5;
        }
      `,
      frag: `
        precision lowp float;
        uniform highp float lineWidth;
        uniform vec4 color;
        varying vec3 lineCoord;
        float linearstep(float a, float b, float x) {
          return clamp((x - a) / (b - a), 0.0, 1.0);
        }
        void main () {
          float alpha = linearstep(lineWidth + 0.5, lineWidth - 0.5, abs(lineCoord.y) * lineWidth);
          gl_FragColor = vec4(color.rgb, color.a * alpha);
        }
      `,
      uniforms: {
        lineWidth: ({pixelRatio}, {width}) => width * pixelRatio,
        color: regl.prop('color')
      },
      depth: {enable: false},
      blend: {
        enable: true,
        func: {
          srcRGB: 'src alpha',
          srcAlpha: 1,
          dstRGB: 'one minus src alpha',
          dstAlpha: 1
        },
        equation: {
          rgb: 'add',
          alpha: 'add'
        },
      },
    });

    return function ({
      color=[1, 1, 1, 1],
      width=1,
    }={}) {
      drawLines({
        color,
        width,
        join: 'bevel',
        cap: 'none',
        joinResolution: 1,
        capResolution: 1,
        vertexAttributes: { theta },
        vertexCount
      });
    }
  };

  return {
    joukowsky: createCommand(true),
    cylinder: createCommand(false)
  };
};
