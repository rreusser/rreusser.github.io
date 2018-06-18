const glsl = require('glslify');
const invertMat4 = require('gl-mat4/invert');
const Complex = require('complex.js');
const ResetTimer = require('./reset-timer');
const regl = require('regl')({
  pixelRatio: Math.min(1.5, window.devicePixelRatio),
  extensions: ['oes_standard_derivatives'],
  attributes: {antialias: false, depth: false, alpha: false, stencil: false},
  onDone: require('fail-nicely')(run)
});

function run (regl) {
  const camera = require('./camera-2d')(regl, {xmin: -15, xmax: 15});

  var E = Complex(1, 0);
  var rho = 1.0;
  var nu = 0.33;
  var h = 1.0;
  var w = 20.0;
  var viscoelasticity = 0.12;
  var w2c2 = [];

  require('control-panel')([
    {type: 'range', label: 'ω', min: 0.05, max: 30.0, initial: w, step: 0.01},
    {type: 'range', label: 'ν', min: 0, max: 0.49, initial: nu, step: 0.01},
    {type: 'range', label: 'viscoelasticity', min: 0, max: Math.PI * 2, initial: viscoelasticity},
  ]).on('input', computeConstants);

  var loResFbo = regl.framebuffer({
    color: regl.texture({
      width: Math.round(regl._gl.canvas.width / 4),
      height: Math.round(regl._gl.canvas.height / 4),
      mag: 'linear'
    })
  });

  const transfer = regl({
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
      uniform sampler2D src;
      void main () {
        gl_FragColor = texture2D(src, uv);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {src: regl.prop('src')},
    depth: {enable: false},
    count: 3
  });

  function computeConstants (state) {
    nu = state.ν;
    w = state.ω;
    E = Complex(Math.cos(state.viscoelasticity), Math.sin(state.viscoelasticity));
    var cl = E.sqrt().mul(Math.sqrt((1 - nu) / rho / (1 + nu) / (1 - 2 * nu)));
    var ct = E.sqrt().div(Math.sqrt(2 * rho * (1 + nu)));
    var w2cl2 = cl.pow(-2).mul(w * w);
    var w2ct2 = ct.pow(-2).mul(w * w);
    w2c2[0] = w2cl2.re;
    w2c2[1] = w2cl2.im;
    w2c2[2] = w2ct2.re;
    w2c2[3] = w2ct2.im;
    camera.taint();
  }

  computeConstants({ω: w, viscoelasticity: viscoelasticity, ν: nu});

  const mViewInv = new Float32Array(16);
  const draw = regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      uniform mat4 mViewInv;
      varying vec2 z;
      void main () {
        z = (mViewInv * vec4(xy, 0, 1)).xy;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: glsl`
      #extension GL_OES_standard_derivatives : enable

      #define PI 3.141592653589793238
      #define HALF_PI 1.57079632679
      #define HALF_PI_INV 0.15915494309
      #define LOG_2 0.69314718056
      #define C_ONE (vec2(1.0, 0.0))
      #define C_I (vec2(0.0, 1.0))
      #define TO_RADIANS 0.01745329251

      precision highp float;

      float hypot (vec2 z) {
        float t;
        float x = abs(z.x);
        float y = abs(z.y);
        t = min(x, y);
        x = max(x, y);
        t = t / x;
        return x * sqrt(1.0 + t * t);
      }

      float cosh (float x) {
        return 0.5 * (exp(x) + exp(-x));
      }

      float sinh (float x) {
        return 0.5 * (exp(x) - exp(-x));
      }

      vec2 sinhcosh (float x) {
        vec2 ex = exp(vec2(x, -x));
        return 0.5 * (ex - vec2(ex.y, -ex.x));
      }

      vec2 cmul (vec2 a, vec2 b) {
        return vec2(
          a.x * b.x - a.y * b.y,
          a.y * b.x + a.x * b.y
        );
      }

      vec2 cmul (vec2 a, vec2 b, vec2 c) {
        return cmul(cmul(a, b), c);
      }

      vec2 cdiv (vec2 a, vec2 b) {
        return vec2(
          a.y * b.y + a.x * b.x,
          a.y * b.x - a.x * b.y
        ) / dot(b, b);
      }

      vec2 cinv (vec2 z) {
        return vec2(z.x, -z.y) / dot(z, z);
      }

      vec2 cexp (vec2 z) {
        return vec2(cos(z.y), sin(z.y)) * exp(z.x);
      }

      vec2 clog (vec2 z) {
        return vec2(
          log(hypot(z)),
          atan(z.y, z.x)
        );
      }

      vec2 cpolar (vec2 z) {
        return vec2(
          atan(z.y, z.x),
          hypot(z)
        );
      }

      vec2 cpow (vec2 z, float x) {
        float r = hypot(z);
        float theta = atan(z.y, z.x) * x;
        return vec2(cos(theta), sin(theta)) * pow(r, x);
      }

      vec2 cpow (vec2 a, vec2 b) {
        float aarg = atan(a.y, a.x);
        float amod = hypot(a);
        float theta = log(amod) * b.y + aarg * b.x;
        return vec2(cos(theta), sin(theta)) * pow(amod, b.x) * exp(-aarg * b.y);
      }

      vec2 csqrt (vec2 z) {
        vec2 zpolar = cpolar(z);
        float theta = zpolar.x * 0.5;
        float mod = sqrt(zpolar.y);
        return vec2(cos(theta), sin(theta)) * mod;
      }

      vec2 csqr (vec2 z) {
        return vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
      }

      vec2 ccos (vec2 z) {
        return sinhcosh(z.y) * vec2(cos(z.x), -sin(z.x));
      }

      vec2 csin (vec2 z) {
        return sinhcosh(z.y).yx * vec2(sin(z.x), cos(z.x));
      }

      vec2 ctan (vec2 z) {
        vec2 e2iz = cexp(2.0 * vec2(-z.y, z.x));
        return cdiv(e2iz - vec2(1, 0), cmul(vec2(0, 1), vec2(1, 0) + e2iz));
      }

      vec2 cacos (vec2 z) {
        vec2 t1 = csqrt(vec2(z.y * z.y - z.x * z.x + 1.0, -2.0 * z.x * z.y));
        vec2 t2 = clog(vec2(t1.x - z.y, t1.y + z.x));
        return vec2(HALF_PI - t2.y, t2.x);
      }

      vec2 casin (vec2 z) {
        vec2 t1 = csqrt(vec2(z.y * z.y - z.x * z.x + 1.0, -2.0 * z.x * z.y));
        vec2 t2 = clog(vec2(t1.x - z.y, t1.y + z.x));
        return vec2(t2.y, -t2.x);
      }

      vec2 catan (vec2 z) {
        float d = z.x * z.x + (1.0 - z.y) * (1.0 - z.y);
        vec2 t1 = clog(vec2(1.0 - z.y * z.y - z.x * z.x, -2.0 * z.x) / d);
        return 0.5 * vec2(-t1.y, t1.x);
      }

      vec2 ccosh (vec2 z) {
        return sinhcosh(z.x).yx * vec2(cos(z.y), sin(z.y));
      }

      vec2 csinh (vec2 z) {
        return sinhcosh(z.x) * vec2(cos(z.y), sin(z.y));
      }

      vec2 ctanh (vec2 z) {
        vec2 ez = cexp(z);
        vec2 emz = cexp(-z);
        return cdiv(ez - emz, ez + emz);
      }

      // https://github.com/d3/d3-color
      vec3 cubehelix(vec3 c) {
        float a = c.y * c.z * (1.0 - c.z);
        float cosh = cos(c.x + PI / 2.0);
        float sinh = sin(c.x + PI / 2.0);
        return vec3(
          (c.z + a * (1.78277 * sinh - 0.14861 * cosh)),
          (c.z - a * (0.29227 * cosh + 0.90649 * sinh)),
          (c.z + a * (1.97294 * cosh))
        );
      }

      // https://github.com/d3/d3-scale-chromatic
      vec3 cubehelixRainbow(float t) {
        float ts = 0.25 - 0.25 * cos((t - 0.5) * PI * 2.0);
        return cubehelix(vec3(
          (360.0 * t - 100.0) * TO_RADIANS,
          1.5 - 1.5 * ts,
          (0.8 - 0.9 * ts)
        ));
      }

      // https://github.com/rreusser/glsl-solid-wireframe
      float wireframe (float parameter, float width, float feather) {
        float w1 = width - feather * 0.5;
        float d = fwidth(parameter);
        float looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
        return smoothstep(d * w1, d * (w1 + feather), looped);
      }

      float wireframe (vec2 parameter, float width, float feather) {
        float w1 = width - feather * 0.5;
        vec2 d = fwidth(parameter);
        vec2 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
        vec2 a2 = smoothstep(d * w1, d * (w1 + feather), looped);
        return min(a2.x, a2.y);
      }

      float wireframe (vec3 parameter, float width, float feather) {
        float w1 = width - feather * 0.5;
        vec3 d = fwidth(parameter);
        vec3 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
        vec3 a3 = smoothstep(d * w1, d * (w1 + feather), looped);
        return min(min(a3.x, a3.y), a3.z);
      }

      float wireframe (vec4 parameter, float width, float feather) {
        float w1 = width - feather * 0.5;
        vec4 d = fwidth(parameter);
        vec4 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
        vec4 a4 = smoothstep(d * w1, d * (w1 + feather), looped);
        return min(min(min(a4.x, a4.y), a4.z), a4.w);
      }

      float wireframe (float parameter, float width) {
        float d = fwidth(parameter);
        float looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
        return smoothstep(d * (width - 0.5), d * (width + 0.5), looped);
      }

      float wireframe (vec2 parameter, float width) {
        vec2 d = fwidth(parameter);
        vec2 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
        vec2 a2 = smoothstep(d * (width - 0.5), d * (width + 0.5), looped);
        return min(a2.x, a2.y);
      }

      float wireframe (vec3 parameter, float width) {
        vec3 d = fwidth(parameter);
        vec3 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
        vec3 a3 = smoothstep(d * (width - 0.5), d * (width + 0.5), looped);
        return min(min(a3.x, a3.y), a3.z);
      }

      float wireframe (vec4 parameter, float width) {
        vec4 d = fwidth(parameter);
        vec4 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
        vec4 a4 = smoothstep(d * (width - 0.5), d * (width + 0.5), looped);
        return min(min(min(a4.x, a4.y), a4.z), a4.z);
      }

      #pragma glslify: hsv2rgb = require(glsl-hsv2rgb)

      uniform float w, lineWidth;
      varying vec2 z;
      uniform vec4 w2c2;

      /*vec4 domainColoring (vec2 z, vec2 gridSpacing, float saturation, float gridStrength, float magStrength) {
        float carg = atan(z.y, z.x);
        float cmod = length(z);
        float logmag = log2(cmod) * 0.5;

        gridSpacing /= cmod;

        return vec4(
          hsv2rgb(vec3(
            carg * HALF_PI_INV,
            saturation,
            0.5 + 0.5 * saturation
          )) - gridStrength * (1.0 - wireframe(vec3(logmag, z.xy * gridSpacing), lineWidth, 1.0)
          ), 1.0);
      }*/

      vec4 csincos (vec2 z) {
        float c = cos(z.x);
        float s = sin(z.x);
        return sinhcosh(z.y).yxyx * vec4(s, c, c, -s);
      }

      vec3 domainColoring (
        vec2 z,
        vec2 polarGridSpacing,
        float polarGridStrength,
        vec2 rectGridSpacing,
        float rectGridStrength,
        float poleLightening,
        float poleLighteningSharpness,
        float rootDarkening,
        float rootDarkeningSharpness,
        float lineWidth
      ) {
        vec2 zpolar = cpolar(z);
        float carg = zpolar.x * HALF_PI_INV;
        float logmag = log2(zpolar.y) * 0.5 / LOG_2;
        float rootDarkeningFactor = 1.0 - mod(logmag * rootDarkeningSharpness, 1.0);//pow(2.0, -zpolar.y * rootDarkeningSharpness);
        float rootDarkness = 1.0 - rootDarkening * rootDarkeningFactor;
        float poleLighteningFactor = 1.0 - pow(2.0, -zpolar.y / poleLighteningSharpness);
        float poleLightness = 1.0 - poleLightening * poleLighteningFactor;
        float polarGridFactor = wireframe((carg/ polarGridSpacing.x), lineWidth, 1.0);
        float polarGrid = mix(1.0 - polarGridStrength, 1.0, polarGridFactor);
        return mix(
          vec3(1.0),
          mix(vec3(1.0), cubehelixRainbow(carg + 0.25) * rootDarkness, poleLightness),
          polarGrid
        );
      }


      vec4 computePQ (vec2 k2) {
        vec4 pq2 = w2c2 - k2.xyxy;
        vec2 mag2 = pq2.xz * pq2.xz + pq2.yw * pq2.yw;
        float pmag = sqrt(sqrt(mag2.x));
        float qmag = sqrt(sqrt(mag2.y));
        float parg = 0.5 * atan(pq2.y, pq2.x);
        float qarg = 0.5 * atan(pq2.w, pq2.z);
        return vec4(
          pmag * vec2(cos(parg), sin(parg)),
          qmag * vec2(cos(qarg), sin(qarg))
        );
      }

      void main () {
        vec2 k2 = csqr(z.xy);
        vec4 p2_q2 = w2c2 - k2.xyxy;

        vec4 halfPq = computePQ(k2) * 0.5;

        // (k^2 - q^2)^2:
        vec2 k2q22 = csqr(k2 - p2_q2.zw);

        // 4 * k^2 * q * p:
        vec2 k24pq = 16.0 * cmul(k2, cmul(halfPq.xy, halfPq.zw));

        vec4 scHalfP = csincos(halfPq.xy);
        vec4 scHalfQ = csincos(halfPq.zw);
        vec2 cospsinq = cmul(scHalfP.zw, scHalfQ.xy);
        vec2 cosqsinp = cmul(scHalfQ.zw, scHalfP.xy);

        vec2 fz = cmul(k2q22, cospsinq) + cmul(k24pq, cosqsinp);

        /*vec2 z,
        vec2 polarGridSpacing,
        float polarGridStrength,
        vec2 rectGridSpacing,
        float rectGridStrength,
        float poleLightening,
        float poleLighteningSharpness,
        float rootDarkening,
        float rootDarkeningSharpness,
        float lineWidth*/

        gl_FragColor = vec4(domainColoring(
          fz / (w * w),
          vec2(0.125, 1.0),  // polarGridSpacing
          0.6,               // polarGridStrength
          vec2(1e4),         // rectGridSpacing
          0.0,               // rectGridStrength
          0.0,               // poleLightening
          1e10,              // poleLighteningSharpness
          0.2,               // rootDarkening
          1.0,              // rootDarkeningSharpness
          lineWidth          // lineWidth
        ), 1.0);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      mViewInv: ({view}) => invertMat4(mViewInv, view),
      w2c2: () => w2c2,
      w: () => w,
      lineWidth: (ctx, props) => (props.loRes ? 0.1 : 0.5) * ctx.pixelRatio,
    },
    framebuffer: regl.prop('dst'),
    depth: {enable: false},
    count: 3
  });

  var loRes = false;
  var loResTimer = new ResetTimer(100);
  loResTimer.on('timeout', function () {
    camera.taint();
    loRes = false;
  });

  camera.on('interaction', function () {
    if (loResNeeded) {
      loRes = true;
    }
    loResTimer.reset();
  });

  var loResNeeded = false;
  var prevTime;
  var framerate = 1 / 60;

  regl.frame(({time}) => {
    camera.draw(({dirty}) => {
      if (!dirty) {
        prevTime = undefined;
        return;
      }

      if (loRes) {
        draw({dst: loResFbo, loRes: true});
        transfer({src: loResFbo});
        prevTime = undefined;
      } else {
        if (prevTime !== undefined) {
          framerate = 0.9 * framerate + 0.1 * (time - prevTime);
          if (framerate > (1 / 60) * 2.0) {
            loResNeeded = true;
          } else if (framerate < (1 / 60) * 1.1) {
            loResNeeded = false;
          }
        }
        draw({});
        prevTime = time;
      }
    });
  });

  window.addEventListener('resize', camera.resize);
}
