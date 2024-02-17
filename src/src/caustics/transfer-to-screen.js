module.exports = function (regl) {
  return regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      varying vec2 uv;
      void main () {
        uv = 0.5 + 0.5 * xy;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: `
      precision highp float;
      varying vec2 uv;
      uniform sampler2D src;
      uniform float tonemap;

      vec3 smin( vec3 a, vec3 b, float k ) {
          vec3 res = exp2( -a/k ) + exp2( -b/k );
          return -k*log2( res );
      }

      vec3 applyTonemap(vec3 value, float k) {
        //return value;
        return -smin(vec3(0), -smin(vec3(1), value, k), k);
      }

      void main () {
        vec3 color = texture2D(src, uv).rgb;
        if (tonemap > 0.01) color = applyTonemap(color, tonemap);
        gl_FragColor = vec4(color, 1);
      }
    `,
    attributes: {
      xy: [-4, -4, 4, -4, 0, 4]
    },
    uniforms: {
      src: regl.prop('src'),
      tonemap: (_, {tonemap}) => tonemap || 0
    },
    blend: {
      enable: false,
      func: { srcRGB: 1, srcAlpha: 1, dstRGB: 1, dstAlpha: 1 },
      equation: { rgb: 'add', alpha: 'add' },
    },
    depth: {enable: false},
    count: 3
  });
};
