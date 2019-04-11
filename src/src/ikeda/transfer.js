module.exports = function (regl) {
  return regl({
    vert: `
      precision highp float;
      attribute vec2 aXy;
      varying vec2 vUv;
      void main () {
        vUv = aXy * 0.5 + 0.5;
        gl_Position = vec4(aXy, 0, 1);
      }
    `,
    frag: `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uSrc;
      uniform float uAlpha;
      void main () {
        vec3 color = texture2D(uSrc, vUv).rgb * uAlpha;
        gl_FragColor = vec4(
          0.12 + vec3(
            color.r,
            color.g,
            color.b
          ),
          1.0
        );
      }
    `,
    attributes: {aXy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      uSrc: regl.prop('src'),
      uAlpha: regl.prop('alpha')
    },
    depth: {enable: false},
    count: 3
  });
}
