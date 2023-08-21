module.exports = function (regl, field, fieldColor) {
  function createCommand(joukowsky) {
    return regl({
      vert: `
        precision highp float;
        attribute vec2 uv;
        varying vec2 xy;
        uniform float globalScale;
        uniform mat4 viewInverse;
        void main () {
          xy = (viewInverse * vec4(uv, 0, 1)).xy;
          gl_Position = vec4(uv * globalScale, 0, 1);
        }`,
      frag: `
        #extension GL_OES_standard_derivatives : enable
        precision highp float;

        float gridFactor (vec2 parameter, float width, float feather) {
          float w1 = width - feather * 0.5;
          vec2 d = fwidth(parameter);
          vec2 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
          vec2 a2 = smoothstep(d * (w1 + feather), d * w1, looped);
          return max(a2.x, a2.y);
        }

        uniform float gridOpacity;
        varying vec2 xy;
        ${field(joukowsky)}
        ${fieldColor}
        void main () {
          float speed = length(derivative(xy, 0.0));

          if (speed == 0.0) {
            gl_FragColor = vec4(vec3(0.3), 1);
          } else {
            gl_FragColor = fieldColor(speed);
          }

          float grid = gridFactor(xy, 1.0, 1.0);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1), grid * gridOpacity);
        }`,
      attributes: {
        uv: [-4, -4, 4, -4, 0, 4]
      },
      uniforms: {
        viewInverse: regl.context("inverseView"),
        gridOpacity: regl.prop('plot.grid'),
      },
      count: 3,
      depth: { enable: false }
    });
  }

  return {
    joukowsky: createCommand(true),
    cylinder: createCommand(false)
  };
};
