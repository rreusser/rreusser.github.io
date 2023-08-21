const mat4create = require('gl-mat4/create');

function mod(n, m) {
  return ((n % m) + m) % m;
}

module.exports = function (regl, field, fieldColor) {
  const n = 20;

  function createCommand(joukowsky) {
    return regl({
      vert: `
        precision highp float;
        attribute vec4 uv;
        attribute vec2 i;
        uniform float pixelRatio, pointSize, z, aspect, zblend, zrange, globalScale, scalePoints, fadeOutStart, fadeInEnd, countFactor, steps, licLength, lineWidth;
        uniform vec2 xDomain, yDomain;
        uniform vec4 domain;
        uniform mat4 inverseView, view;
        uniform vec2 viewportResolution;
        varying float opacity, localSpeed, param, rand, y;

        varying float t, stripePosition;

        float linearstep (float a, float b, float x) {
          return clamp((x - a) / (b - a), 0.0, 1.0);
        }

        ${field(joukowsky)}

        void main () {
          rand = uv.w;
          param = 1.0 - uv.z * countFactor;
          float zp = z + param * zblend;
          float scale = pow(2.0, zp);

          vec2 cen = (domain.zw + domain.xy) * 0.5;
          vec2 rng = (domain.zw - domain.xy) * vec2(1, aspect) * (0.5 * scale);

          vec2 base = pow(vec2(2.0), ceil(log2(2.0 * rng)));
          vec2 offset = base * floor(0.5 * domain.xy / base) * 2.0;
          vec2 offset2 = base * floor(domain.xy / base);
          vec2 shift = mod(offset2 / base, 2.0);

          vec2 xy = uv.xy;
          xy += shift * vec2(lessThan(xy, vec2(0.5)));
          xy = xy * (2.0 * base) + offset;

          float zfrac = 1.0 - fract(log2(rng.x)) + z;
          float sc = zrange / 3.0;
          opacity = smoothstep(0.0, 0.01 + 3.0 * fadeInEnd * sc, zfrac) * smoothstep(3.0 * sc, 2.999 * fadeOutStart * sc, zfrac);

          vec2 deriv;
          vec3 state = vec3(xy, 0);
          t = (2.0 * i.x) / (steps - 1.0) - 1.0;
          float dt = 0.002 * licLength * t * base.x;
          float t0 = 0.0;
          float v0 = length(derivative(state.xy, t0));
          for (int i = 0; i < ${n}; i++) {
            deriv = derivative(state.xy, t0);
            vec3 xyHalf = state + (dt * 0.5) * vec3(normalize(deriv), 1.0 / length(deriv));
            deriv = derivative(xyHalf.xy, t0 + dt * 0.5);
            state += dt * vec3(normalize(deriv), 1.0 / length(deriv));
          }

          localSpeed = length(deriv);
          if (localSpeed == 0.0) {
            gl_Position = vec4(0);
            return;
          }

          xy = state.xy;
          gl_Position = view * vec4(xy, 0, 1);

          stripePosition = state.z * 40.0 * scale / rng.x;

          y = i.y * (lineWidth + 0.5);
          gl_Position.xy *= globalScale;
          gl_Position.xy += i.y * normalize((view * vec4(normalize(vec2(-deriv.y, deriv.x)), 0, 0)).xy) * (lineWidth + 0.5) / viewportResolution;
        }`,
      frag: `
        precision highp float;
        varying float opacity, t, y;
        uniform float blending;
        uniform float pixelRatio, pointSize, striping, time, texture, frequency, speed, lineWidth;
        varying float stripePosition, localSpeed, param, rand;

        float linearstep (float a, float b, float x) {
          return clamp((x - a) / (b - a), 0.0, 1.0);
        }

        ${fieldColor}

        void main () {
          float window = (1.0 - blending * t * t) * linearstep(abs(y), lineWidth + 0.5, lineWidth - 0.5);
          float stripe = sin((stripePosition - 20.0 * time * speed) * frequency - (rand * ${2.0 * Math.PI}));

          float colorParam = localSpeed + 2.0 * (rand - 0.5) * texture + stripe * striping;
          vec4 color = fieldColor(colorParam);

          gl_FragColor = color;
          gl_FragColor.a *= opacity * window;
        }`,
      attributes: {
        uv: {
          buffer: regl.prop('xy'),
          divisor: 1
        },
        i: {
          buffer: regl.buffer(new Int8Array([...Array(50).keys()].map(i => [i, -1, i, 1]).flat())),
          divisor: 0
        }
      },
      uniforms: {
        time: ({time}, {lic: {animation: {animate}}}) => animate ? time : 0,
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
        zrange: regl.prop('lic.appearance.zrange'),
        zblend: 1,//regl.prop('lic.appearance.zblend'),
        blending: regl.prop('lic.appearance.blending'),
        texture: regl.prop('lic.appearance.texture'),
        licLength: regl.prop('lic.integration.length'),
        fadeOutStart: 0.75,//regl.prop('lic.appearance.fadeOutStart'),
        fadeInEnd: 0.25,//regl.prop('lic.appearance.fadeInEnd'),
        countFactor: (_, {lic: {integration: {count}}}) => 1 / count,
        steps: regl.prop('lic.integration.steps'),
        frequency: regl.prop('lic.animation.frequency'),
        speed: regl.prop('lic.animation.speed'),
        striping: regl.prop('lic.appearance.striping'),
        lineWidth: ({pixelRatio}, {lic: {appearance: {lineWidth}}}) => lineWidth * pixelRatio,
      },
      blend: {
        enable: true,
        func: {
          srcRGB: 'src alpha',
          srcAlpha: 1,
          dstRGB: 'one minus src alpha',
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
      primitive: 'triangle strip',
      count: (_, {lic: {integration: {steps}}}) => steps * 2,
      instances: regl.prop('lic.integration.count'),
    });
  }

  return {
    joukowsky: createCommand(true),
    cylinder: createCommand(false)
  };
};
