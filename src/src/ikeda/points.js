const glsl = require('glslify');

module.exports = function (regl) {
  return regl({
    vert: glsl`
      precision highp float;

      #pragma glslify: ikeda = require(./ikeda)

      attribute vec2 aUv;
      uniform vec2 uInverseAspect;
      uniform sampler2D uPosition;
      uniform bool uFirstPair;
      uniform float uU;
      uniform mat4 view;
      varying vec3 vColor;

      void main () {
        vec4 state = texture2D(uPosition, aUv);
        vec2 xy = uFirstPair ? state.xy : state.zw;

        vec2 dx, prev;
        prev = xy;
        vec2 next = ikeda(xy, uU);
        dx = next - prev;
        float r1 = dot(dx, dx);
        prev = next;
        next = ikeda(next, uU);
        dx = next - prev;
        float r2 = dot(dx, dx);
        prev = next;
        next = ikeda(next, uU);
        dx = next - prev;
        float r3 = dot(dx, dx);
        prev = next;
        next = ikeda(next, uU);
        dx = next - prev;
        float r4 = dot(dx, dx);

        vColor = vec3(0.5);

        vColor += r1 * vec3(1, 0, 0);
        vColor += r2 * vec3(0.5, 0.5, 0);
        vColor += r3 * vec3(0.0, 0.5, 0.5);
        vColor += r4 * vec3(0.0, 0.0, 1.0);

        vColor = normalize(vColor);
        
        gl_Position = view * vec4(xy, 0, 1);
        gl_PointSize = 2.0;
      }
    `,
    frag: `
      precision highp float;
      uniform float uAlpha;
      varying vec3 vColor;
      void main () {
        gl_FragColor = vec4(vColor, 1.0);
      }
    `,
    attributes: {
      aUv: regl.prop('lookup')
    },
    uniforms: {
      uFirstPair: regl.prop('firstPair'),
      uPosition: regl.prop('src'),
      uAlpha: regl.prop('alpha'),
      uInverseAspect: ctx => [ctx.framebufferHeight / ctx.framebufferWidth, 1],
      uU: regl.prop('u'),
    },
    depth: {enable: false},
    blend: {
      enable: true,
      func: {srcRGB: 'src alpha', srcAlpha: 1, dstRGB: 1, dstAlpha: 1},
      equation: {rgb: 'add', alpha: 'add'}
    },
    primitive: 'points',
    count: (ctx, props) => props.radius * props.radius
  });
};
