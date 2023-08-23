const fs = require('fs');
const path = require('path');
const createDomainColoringShader = require('./domain-coloring.js');
const complex = fs.readFileSync(path.join(__dirname, 'complex.glsl'), 'utf8');

module.exports = function (regl) {
  const domainColoring = createDomainColoringShader({
    maxMagnitudeOctaves: 10,
    maxPhaseOctaves: 10,
  });

  return regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      uniform mat4 inverseView;
      varying vec2 z;
      void main () {
        z = (inverseView * vec4(xy, 0, 1)).xy;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: `
      #extension GL_OES_standard_derivatives : enable

      #define PHI 2.39996322972865332
      #define PI 3.141592653589793238
      #define HALF_PI 1.57079632679
      #define HALF_PI_INV 0.15915494309
      #define LOG_2 0.69314718056
      #define C_ONE (vec2(1.0, 0.0))
      #define C_I (vec2(0.0, 1.0))
      #define TO_RADIANS 0.01745329251

      precision highp float;

      ${complex}
      ${domainColoring}

      uniform mat4 mViewInv;
      uniform float w, lineWidth;
      varying vec2 z;
      uniform vec4 w2c2;

      uniform float ramp, saturation, bias;
      uniform vec2 divisions, octaves, scale, shading, grid;

      vec4 computePQ (vec2 k2) {
        vec4 pq2 = w2c2 - k2.xyxy;
        vec2 mag2 = pq2.xz * pq2.xz + pq2.yw * pq2.yw;
        float pmag = sqrt(sqrt(mag2.x));
        float qmag = sqrt(sqrt(mag2.y));
        float parg = 0.5 * atan(pq2.y, pq2.x);
        float qarg = 0.5 * atan(pq2.w, pq2.z);
        return vec4(
          pmag * vec2(cos(parg), sin(parg)),
          qmag * vec2(cos(qarg), sin(qarg))
        );
      }

      vec2 f(vec2 z) {
        vec2 k2 = csqr(z.xy);
        vec4 p2_q2 = w2c2 - k2.xyxy;
        vec4 halfPq = computePQ(k2) * 0.5;

        // (k^2 - q^2)^2:
        vec2 k2q22 = csqr(k2 - p2_q2.zw);

        // 4 * k^2 * q * p:
        vec2 k24pq = 16.0 * cmul(k2, cmul(halfPq.xy, halfPq.zw));
        vec4 scHalfP = csincos(halfPq.xy);
        vec4 scHalfQ = csincos(halfPq.zw);
        vec2 cospsinq = cmul(scHalfP.zw, scHalfQ.xy);
        vec2 cosqsinp = cmul(scHalfQ.zw, scHalfP.xy);

        return cmul(k2q22, cospsinq) + cmul(k24pq, cosqsinp);
      }

      float gridFactor (vec2 parameter, float width, float feather) {
        float w1 = width - feather * 0.5;
        vec2 d = fwidth(parameter);
        vec2 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
        vec2 a2 = smoothstep(d * (w1 + feather), d * w1, looped);
        return max(a2.x, a2.y);
      }

      void main () {
        vec2 fz = f(z);

        gl_FragColor = vec4(domainColoring(
          vec4(fz, fwidth(fz) * 0.5),
          octaves,
          divisions,
          scale,
          grid,
          shading,
          lineWidth, // line width
          1.0,       // line feather
          vec3(0),   // line color
          ramp,
          saturation,
          bias
        ));

        float grid = gridFactor(z / 10.0, 1.0, 1.0);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0), grid * 0.2);
      }
    `,
    attributes: {
      xy: [-4, -4, 0, 4, 4, -4]
    },
    uniforms: {
      w2c2: regl.prop('w2c2'),
      w: () => w,
      lineWidth: (ctx, props) => (props.oRes ? 0.1 : 0.5) * ctx.pixelRatio,
      divisions: (ctx, {t: {dc: {magnitude, phase}}}) => [magnitude.divisions, phase.divisions],
      octaves: (ctx, {t: {dc: {magnitude, phase}}}) => [magnitude.octaves, phase.octaves],
      scale: (ctx, {t: {dc: {magnitude, phase}}}) => [magnitude.scale, phase.scale],
      shading: (ctx, {t: {dc: {magnitude, phase}}}) => [magnitude.shading, phase.shading],
      grid: (ctx, {t: {dc: {magnitude, phase}}}) => [magnitude.grid, phase.grid],
      ramp: regl.prop('t.dc.contrastRamp'),
      saturation: regl.prop('t.dc.saturation'),
      bias: regl.prop('t.dc.bias'),
    },
    depth: {enable: false},
    count: 3
  });
};
