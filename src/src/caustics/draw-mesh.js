const glsl = require('glslify');

module.exports = function (regl, n=100) {
  const positions = [];
  for  (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      positions.push([(i + 0.5) / n, (j + 0.5) / n]);
    }
  }
  const cells = []
  for  (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const i00 = i + n * j;
      const i10 = i00 + 1;
      const i01 = i00 + n;
      const i11 = i00 + n + 1;
      
      cells.push([i00, i10, i01]);
      cells.push([i10, i11, i01]);
    }
  }

  return regl({
    vert: glsl`
      precision highp float;
      attribute vec2 position;
      uniform float time, scale, amplitude;
      uniform vec2 aspect;
      varying vec2 uv;
      varying float div;

      #pragma glslify: noise = require(glsl-noise/simplex/3d)

      float f (vec2 position) {
        float speed = 1.8;
        vec2 scaleFactor = scale * aspect;
        return noise(
          vec3(scaleFactor * position, speed * time)
        ) * (6.0 / scaleFactor.y);
      }

      vec2 offset (vec2 position) {
        float h = 0.005;
        float nxp = f(position + vec2(h, 0) / aspect);
        float nyp = f(position + vec2(0, h) / aspect);
        float nxm = f(position - vec2(h, 0) / aspect);
        float nym = f(position - vec2(0, h) / aspect);

        return position + vec2(nxp - nxm, nyp - nym) / (2.0 * h * aspect) * 0.0013 * amplitude;
      }

      void main () {
        uv = position - 0.5;
        float h = 0.01;
        vec2 o0 = offset(uv);
        vec2 ox = offset(uv + vec2(h, 0));
        vec2 oy = offset(uv + vec2(0, h));
        div = (ox.x - o0.x + oy.y - o0.y) / h;
        gl_Position = vec4(o0 * 2.1, 0, 1);
      }
    `,
    frag: glsl`
      precision highp float;
      uniform float amplitude;
      varying vec2 uv;
      varying float div;
      uniform float alpha;
      void main () {
        float d = min(10.0, 1.0 / (div * div));
        gl_FragColor = vec4(alpha * d * min(1.0, 1.0 / amplitude));
      }
    `,
    elements: regl.elements(cells),
    attributes: {
      position: regl.buffer(positions)
    },
    uniforms: {
      time: regl.context('time'),
      scale: (_, {frequency}) => 2 * Math.PI * frequency,
      amplitude: (_, {amplitude, frequency}) => amplitude / frequency,
      aspect: ({viewportWidth, viewportHeight}) => [viewportWidth / viewportHeight, 1],
      alpha: (_, {alpha}) => alpha === undefined ? 1 : alpha,
    },
    blend: {
      enable: true,
      func: { srcRGB: 1, srcAlpha: 1, dstRGB: 1, dstAlpha: 1 },
      equation: { rgb: 'add', alpha: 'add' },
    },
    depth: {enable: false},
    cull: {enable: false},
  });
};
