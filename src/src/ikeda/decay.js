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
      uniform float factor;
      void main () {
        vec3 color = texture2D(uSrc, vUv).rgb;
        gl_FragColor = vec4(color * factor, 1.0);
      }
    `,
    attributes: {aXy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      uSrc: regl.prop('src'),
      factor: regl.prop('factor'),
    },
    depth: {enable: false},
    count: 3
  });
}
