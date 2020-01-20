module.exports = function (regl) {
  return regl({
    vert: `
      precision highp float;
      attribute vec3 vert1, vert2, offset;
      uniform vec3 scale;
      uniform mat4 uProjectionView;
      void main () {
        gl_Position = uProjectionView * vec4(scale * (vert1 + (vert2 - vert1) * offset - vec3(0, 0.5, 0.5)) + vec3(0, 0.5, 0.5), 1);
      }`,
    frag: `
      precision highp float;
      uniform vec4 color;
      void main () {
        gl_FragColor = color;
      }`,
    blend: {
      enable: true,
      func: {
        srcRGB: 'src alpha',
        srcAlpha: 1,
        dstRGB: 'one minus src alpha',
        dstAlpha: 1
      }
    },
    depth: {
      enable: true,
      mask: false,
    },
    attributes: {
      offset: {
        buffer: regl.buffer(new Uint8Array([
          0, 0, 0, 1, 0, 0,
          0, 0, 1, 1, 0, 1,
          0, 1, 0, 1, 1, 0,
          0, 1, 1, 1, 1, 1,
          0, 0, 0, 0, 1, 0,
          1, 0, 0, 1, 1, 0,
          0, 0, 1, 0, 1, 1,
          1, 0, 1, 1, 1, 1,
          0, 0, 0, 0, 0, 1,
          1, 0, 0, 1, 0, 1,
          0, 1, 0, 0, 1, 1,
          1, 1, 0, 1, 1, 1
        ])),
        divisor: 0
      },
      vert1: {
        buffer: regl.prop('aabbs'),
        offset: 0,
        stride: 24,
        divisor: 1
      },
      vert2: {
        buffer: regl.prop('aabbs'),
        offset: 12,
        stride: 24,
        divisor: 1
      }
    },
    uniforms: {
      color: (ctx, props) => props.color || [1, 0.2, 0.3, 1],
      scale: regl.prop('scale'),
    },
    primitive: 'lines',
    instances: regl.prop('count'),
    count: 24,
  });
};
