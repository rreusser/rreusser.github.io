'use strict';

module.exports = function (regl) {
  var normalize = regl({
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
      uniform sampler2D uInput;
      uniform vec2 range;
      void main () {
        gl_FragColor = (texture2D(uInput, uv) - range.x) / (range.y - range.x) * 2.0 - 1.0;
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      uInput: regl.prop('input.texture'),
      range: regl.prop('range'),
    },
    framebuffer: regl.prop('output.fbo'),
    depth: {enable: false},
    count: 3
  });

  return function (props) {
    var min = Infinity;
    var max = -Infinity;

    /*
    props.input.fbo.use(() => {
      var data = regl.read();
      for (var i = 0; i < data.length; i+=4) {
        min = Math.min(min, data[i]);
        max = Math.max(max, data[i]);
      }
    });
    */

    min = -1 - props.maxAmount * props.dt;
    max = 1 + props.maxAmount * props.dt;

    normalize({
      input: props.input,
      output: props.output,
      range: [min, max]
    })
  };
};
