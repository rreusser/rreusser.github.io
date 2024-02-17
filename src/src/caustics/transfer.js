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

      void main () {
        vec4 color = texture2D(src, uv);

        gl_FragColor = color;
        gl_FragColor = vec4(gl_FragColor.a);
      }
    `,
    attributes: {
      xy: [-4, -4, 4, -4, 0, 4]
    },
    uniforms: {
      src: regl.prop('src'),
    },
    blend: {
      enable: true,
      func: { srcRGB: 1, srcAlpha: 1, dstRGB: 1, dstAlpha: 1 },
      equation: { rgb: 'add', alpha: 'add' },
    },
    depth: {enable: false},
    count: 3
  });
};
