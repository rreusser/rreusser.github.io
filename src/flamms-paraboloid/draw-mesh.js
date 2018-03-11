const glsl = require('glslify');

module.exports = function (regl) {
  return regl({
    vert: `
      precision mediump float;
      uniform mat4 viewProjection;
      uniform mat4 projection, view;
      uniform vec2 cylindricalGridScaling, rectangularGridScaling;
      uniform float depthFactor, extent, gridPow, depthColorFactor, wrapFactor;
      attribute vec3 position, normal;
      attribute vec2 rectangularGridCoord, barycentric, cylindricalGridCoord;
      varying vec3 n;
      varying float py;
      varying vec2 uv, b, rt;

      void main () {
        n = normal;
        float u = pow(cylindricalGridCoord.x, gridPow) * extent;
        float r = 1.0 + u;
        float theta = cylindricalGridCoord.y;

        vec3 p = vec3(
          r * cos(theta * wrapFactor) - (1.0 - wrapFactor) * 6.0,
          2.0 * sqrt(abs(u)) - 3.0,
          r * sin(theta * wrapFactor) + (1.0 - wrapFactor) * theta
        ) * mix(
          vec3(2.0, 1.0, 3.0),
          vec3(1.0),
          wrapFactor
        );

        py = smoothstep(-3.0 + 7.0 * depthColorFactor, -3.0, p.y);
        uv = p.xz;
        rt = cylindricalGridCoord * cylindricalGridScaling * extent;
        b = barycentric;
        gl_Position = viewProjection * vec4(p.x, p.y * depthFactor, p.z, 1);
      }
    `,
    frag: `
      #extension GL_OES_standard_derivatives : enable
      precision mediump float;

      float barycentricGrid (vec2 vBC, float width, float feather) {
        float w1 = width - feather * 0.5;
        vec3 bary = vec3(vBC.x, vBC.y, 1.0 - vBC.x - vBC.y);
        vec3 d = fwidth(bary);
        vec3 a3 = smoothstep(d * w1, d * (w1 + feather), bary);
        return min(min(a3.x, a3.y), a3.z);
      }

      float cartesianGrid (vec2 parameter, float width, float feather) {
        float w1 = width - feather * 0.5;
        vec2 d = fwidth(parameter);
        vec2 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
        vec2 a2 = smoothstep(d * w1, d * (w1 + feather), looped);
        return min(a2.x, a2.y);
      }

      varying float py;
      varying vec3 n;
      varying vec2 uv, b, rt;

      uniform float barycentricGridWeight, gridStrength;
      uniform float depthColorFactor, cylindricalFactor;
      uniform vec3 gridColor, surfaceColor;

      void main () {
        float gridFactor = (1.0 - mix(
          cartesianGrid(mix(uv, rt, cylindricalFactor), 0.75, 2.0),
          barycentricGrid(b, 0.75, 2.0),
          barycentricGridWeight
        )) * gridStrength;

        gl_FragColor = vec4(
          mix(
            mix(
              surfaceColor,
              gridColor,
              gridFactor * smoothstep(50.0, 20.0, rt.x)
            ),
            surfaceColor,
            py * depthColorFactor
          ),
          1.0
        );
      }
    `,
    uniforms: {
      rectangularGridScaling: regl.prop('rectangularGridScaling'),
      cylindricalGridScaling: regl.prop('cylindricalGridScaling'),
      depthFactor: regl.prop('depthFactor'),
      surfaceColor: regl.prop('surfaceColor'),
      depthColorFactor: regl.prop('depthColorFactor'),
      barycentricGridWeight: regl.prop('barycentricGridWeight'),
      gridStrength: regl.prop('gridStrength'),
      gridColor: regl.prop('gridColor'),
      cylindricalFactor: regl.prop('cylindricalFactor'),
      extent: regl.prop('extent'),
      gridPow: regl.prop('gridPow'),
      wrapFactor: regl.prop('wrapFactor'),
    },
    attributes: {
      position: regl.prop('positions'),
      normal: regl.prop('normals'),
      rectangularGridCoord: regl.prop('rectangularGridCoord'),
      cylindricalGridCoord: regl.prop('cylindricalGridCoord'),
      barycentric: regl.prop('barycentric')
    },
    elements: regl.prop('cells'),
    count: regl.prop('count')
  });
};
