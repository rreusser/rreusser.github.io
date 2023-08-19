const mat4create = require('gl-mat4/create');

function mod(n, m) {
  return ((n % m) + m) % m;
}

module.exports = function (regl) {
  return regl({
    vert: `
      precision highp float;
      attribute vec3 uv;
      uniform sampler2D colorscale;
      uniform float pixelRatio, pointSize, z, aspect, zblend, zrange, globalScale, scalePoints, fadeOutStart, fadeInEnd;
      uniform vec2 xDomain, yDomain;
      uniform vec4 domain;
      uniform mat4 inverseView, view;
      varying float opacity, vPointSize;
      varying vec4 color;

      float linearstep (float a, float b, float x) {
        return clamp((x - a) / (b - a), 0.0, 1.0);
      }

      void main () {
        float scale = pow(2.0, z + uv.z * zblend);

        vec2 cen = (domain.zw + domain.xy) * 0.5;
        vec2 rng = (domain.zw - domain.xy) * vec2(1, aspect) * (0.5 * scale);

        vec2 base = pow(vec2(2.0), ceil(log2(2.0 * rng)));
        vec2 offset = base * floor(0.5 * domain.xy / base) * 2.0;
        vec2 offset2 = base * floor(domain.xy / base);
        vec2 shift = mod(offset2 / base, 2.0);

        vec2 xy = uv.xy;
        xy += shift * vec2(lessThan(xy, vec2(0.5)));
        xy = xy * (2.0 * base) + offset;
        gl_Position = view * vec4(xy, 0, 1);

        float zfrac = 1.0 - fract(log2(2.0 * rng.x)) + z;
        float sc = zrange / 3.0;
        opacity = smoothstep(0.0, 0.01 + 3.0 * fadeInEnd * sc, zfrac) * smoothstep(3.0 * sc, 2.999 * fadeOutStart * sc, zfrac);

        gl_PointSize = pixelRatio * pointSize * pow(2.0, (zfrac - zrange * 0.5) * scalePoints);
        vPointSize = gl_PointSize;

        color = texture2D(colorscale, vec2(uv.z, 0.5));

        gl_Position.xy *= globalScale;
      }`,
    frag: `
      precision highp float;
      varying float opacity, vPointSize;
      uniform float pixelRatio, pointSize;
      varying vec4 color;
      float linearstep (float a, float b, float x) {
        return clamp((x - a) / (b - a), 0.0, 1.0);
      }
      void main () {
        float r = length(gl_PointCoord.xy - 0.5) * 2.0 * vPointSize;
        float alpha = linearstep(vPointSize, vPointSize - 1.0, r);
        if (alpha == 0.0) discard;
        gl_FragColor = color;
        gl_FragColor.a *= opacity * alpha;
      }`,
    attributes: {
      uv: regl.prop('xy')
    },
    uniforms: {
      pixelRatio: regl.context('pixelRatio'),
      pointSize: regl.prop('pointSize'),
      offset: regl.prop('offset'),
      base: regl.prop('base'),
      shift: regl.prop('shift'),
      aspect: ({viewportWidth, viewportHeight}) => viewportWidth / viewportHeight,
      z: regl.prop('z'),
      xDomain: regl.prop('xDomain'),
      yDomain: regl.prop('yDomain'),
      domain: (_, {xDomain, yDomain}) => [xDomain[0], yDomain[0], xDomain[1], yDomain[1]],
      zrange: regl.prop('zrange'),
      zblend: regl.prop('zblend'),
      colorscale: regl.prop('colorscale'),
      fadeOutStart: regl.prop('fadeOutStart'),
      fadeInEnd: regl.prop('fadeInEnd'),
      scalePoints: (_, {scalePoints}) => scalePoints ? 1 : 0
    },
    blend: {
      enable: true,
      func: {
        srcRGB: 'src alpha',
        srcAlpha: 1,
        dstRGB: 1,
        dstAlpha: 1
      },
      equation: {
        rgb: 'add',
        alpha: 'add'
      },
    },
    depth: {
      enable: false
    },
    primitive: 'points',
    count: regl.prop('count')
  });
};
