const glsl = require('glslify');
const invertMat4 = require('gl-mat4/invert');
const Complex = require('complex.js');
const ResetTimer = require('./reset-timer');
const createControls = require('./controls');
const regl = require('regl')({
  pixelRatio: Math.min(2.0, window.devicePixelRatio),
  extensions: ['oes_standard_derivatives'],
  attributes: {antialias: true, depth: false, alpha: false, stencil: false},
  onDone: require('fail-nicely')(run)
});

function run (regl) {
  const camera = require('./camera-2d')(regl, {xmin: -12.0, xmax: 12.0});

  var E = Complex(1, 0);
  var rho = 1.0;
  var nu = 0.33;
  var h = 1.0;
  var w = 20.0;
  var viscoelasticity = 0.12;
  var w2c2 = [];
  var magnitudeSteps = 3.0;
  var phaseSteps = 3.0;
  var magnitudeStrength = 0.4;
  var phaseStrength = 0.0;
  var magnitudeScale = -1.0;
  var phaseScale = -1.0;

  var n = 300000;
  var x = new Array(n).fill(0).map((d, i) => i /(n - 1) * 2.0 - 1.0);
  var pow = 5.0;
  var y = x.map(x => Math.exp(pow * x));
  var dy = x.map(x => pow * Math.exp(pow * x));

  var controlRoot = document.createElement('div');
  controlRoot.addEventListener('touchstart', e => e.stopPropagation());
	document.body.appendChild(createControls(null, controlRoot));
  require('control-panel')([
    {type: 'range', label: 'ω', min: 0.05, max: 100.0, initial: w, step: 0.01},
    {type: 'range', label: 'ν', min: 0, max: 0.49, initial: nu, step: 0.01},
    {type: 'range', label: 'viscoelasticity', min: 0, max: Math.PI * 2, initial: viscoelasticity, steps: 400},
    {type: 'range', label: 'magnitudeStrength', min: 0, max: 1, initial: magnitudeStrength, step: 0.01},
    {type: 'range', label: 'magnitudeSteps', min: 1, max: 10, initial: magnitudeSteps, step: 1},
    {type: 'range', label: 'magnitudeScale', min: -5, max: 1, initial: magnitudeScale, step: 0.01},
    {type: 'range', label: 'phaseStrength', min: 0, max: 1, initial: phaseStrength, step: 0.01},
    {type: 'range', label: 'phaseSteps', min: 1, max: 10, initial: phaseSteps, step: 1},
    {type: 'range', label: 'phaseScale', min: -1, max: 1, initial: phaseScale, step: 0.01},
  ], {
		width: 350,
    root: controlRoot,
	}).on('input', computeConstants);

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
    magnitudeStrength = state.magnitudeStrength;
    phaseStrength = state.phaseStrength;
    magnitudeSteps = state.magnitudeSteps;
    phaseSteps = state.phaseSteps;
    magnitudeScale = Math.pow(10, -state.magnitudeScale);
    phaseScale = Math.pow(10, -state.phaseScale);
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

  computeConstants({
    ω: w,
    viscoelasticity: viscoelasticity,
    ν: nu,
    phaseSteps: phaseSteps,
    magnitudeSteps: magnitudeSteps,
    magnitudeStrength: magnitudeStrength,
    phaseStrength: phaseStrength,
    magnitudeScale: magnitudeScale,
    phaseScale: phaseScale
  });

  const mViewInv = new Float32Array(16);

  const drawPoints = regl({
    vert: glsl`
      precision highp float;

      #pragma glslify: ease = require(glsl-easings/cubic-in-out)

      uniform mat4 mViewInv;
      uniform float w, lineWidth, viewportWidth, viewportHeight, steps, strength, scale;
      attribute float x, y, dy;

      #define PHI 2.39996322972865332
      #define PI 3.141592653589793238
      #define HALF_PI 1.57079632679
      #define HALF_PI_INV 0.15915494309
      #define LOG_2 0.69314718056
      #define C_ONE (vec2(1.0, 0.0))
      #define C_I (vec2(0.0, 1.0))
      #define TO_RADIANS 0.01745329251

      float sqr (float x) {
        return x * x;
      }

      float ramp (float x) {
        return ease(x);
      }

      float loop (float x) {
        return fract(x);
        //return sqrt(0.5 + 0.5 * cos(fract(x) * PI * 2.0));
      }

      float lerp (float edge0, float edge1, float x) {
        return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
      }

      float domainColoring (float z, float dz, float base, float scale) {
				float dx = 10.0 / viewportHeight;
				float c = 0.0;
				float invlog2base, logspacing, logtier, n, value;
				invlog2base = 1.0 / log2(base);
				logspacing = (log2(dz) - log2(dx * scale)) * invlog2base;
        logspacing = max(-2e1, min(1e10, logspacing));

				logtier = floor(logspacing);
				n = log2(z) * invlog2base - logtier;
				value = pow(base, n);

        float fadeIn = lerp(logtier, logtier + 1.0, logspacing);
        float fadeOut = lerp(logtier + 1.0, logtier, logspacing);

				c += (
					fadeIn * loop(value / base / base / base / base) +
          loop(value / base / base / base) +
					loop(value / base / base) +
					loop(value / base) +
					loop(value) +
					fadeOut * loop(value * base)
        ) / 5.0;

				return c;
      }


      void main () {
        gl_Position = vec4(x * scale, domainColoring(
          y,
          dy / viewportHeight,
          steps,
          scale
        ), 0.0, 1.0);

        gl_PointSize = 2.0;
      }
    `,
    frag: glsl`
      precision highp float;
      void main () {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      }
    `,
    attributes: {
      x: x,
      y: y,
      dy: dy,
    },
    primitive: 'points',
    uniforms: {
			viewportWidth: regl.context('viewportWidth'),
			viewportHeight: regl.context('viewportHeight'),
      mViewInv: ({view}) => invertMat4(mViewInv, view),
      w2c2: () => w2c2,
      w: () => w,
      lineWidth: (ctx, props) => (props.loRes ? 0.1 : 0.5) * ctx.pixelRatio,
      steps: () => magnitudeSteps,
      strength: () => magnitudeStrength,
      scale: () => magnitudeScale,
    },
    framebuffer: regl.prop('dst'),
    depth: {enable: false},
    count: x.length,
  });
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

      #define PHI 2.39996322972865332
      #define PI 3.141592653589793238
      #define HALF_PI 1.57079632679
      #define HALF_PI_INV 0.15915494309
      #define LOG_2 0.69314718056
      #define C_ONE (vec2(1.0, 0.0))
      #define C_I (vec2(0.0, 1.0))
      #define TO_RADIANS 0.01745329251

      precision highp float;

      uniform mat4 mViewInv;

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

      uniform float w, lineWidth, viewportWidth, viewportHeight, magnitudeSteps, phaseSteps, magnitudeStrength, phaseStrength, magnitudeScale, phaseScale;
      varying vec2 z;
      uniform vec4 w2c2;

      vec4 csincos (vec2 z) {
        float c = cos(z.x);
        float s = sin(z.x);
        return sinhcosh(z.y).yxyx * vec4(s, c, c, -s);
      }

      float sqr (float x) {
        return x * x;
      }

      float loop (float x) {
        return sqr(fract(x));
        //return sqrt(0.5 + 0.5 * cos(fract(x) * PI * 2.0));
      }

      vec3 domainColoring (vec2 z, vec2 base, float magnitudeStrength, float phaseStrength, float magnitudeScale, float phaseScale) {
				float carg = atan(z.y, z.x) * HALF_PI_INV;
        float cmag = hypot(z);
				float dx = 10.0 / viewportHeight;

				float c = 0.0;

				float invlog2base, logspacing, logtier, n, value;

				invlog2base = 1.0 / log2(base.x);

				logspacing = (log2(fwidth(cmag)) - log2(dx * magnitudeScale)) * invlog2base;
        logspacing = max(-2e1, min(1e10, logspacing));

				logtier = floor(logspacing);
				n = log2(cmag) * invlog2base - logtier;
				value = pow(base.x, n);

        float fadeIn = smoothstep(logtier, logtier + 1.0, logspacing);
				c += magnitudeStrength * (
					fadeIn * loop(value / base.x / base.x / base.x / base.x) +
          loop(value / base.x / base.x / base.x) +
					loop(value / base.x / base.x) +
					loop(value / base.x) +
					loop(value) +
					smoothstep(logtier + 1.0, logtier, logspacing) * loop(value * base.x)
        ) / 5.0;

				if (true) {
          invlog2base = 1.0 / log2(base.y);

          logspacing = (log2(fwidth(carg)) - log2(dx * phaseScale)) * invlog2base;
          logspacing = max(-2e1, min(1e10, logspacing));

          logtier = floor(logspacing);
          n = log2(carg + 0.5) * invlog2base - logtier;
          value = pow(base.y, n);

          c += phaseStrength * (
            smoothstep(logtier, logtier + 1.0, logspacing) * loop(value / base.y / base.y) +
            loop(value / base.y) +
            loop(value) +
            smoothstep(logtier + 1.0, logtier, logspacing) * loop(value * base.y)
          ) / 3.0;
        }

				return (0.24 + 0.76 * cubehelixRainbow(carg)) * (0.9 - (magnitudeStrength + phaseStrength) * 0.7 + c);
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

        /*
        vec2 f = C_ONE;
        for (int i = 0; i < 100; i++) {
          float theta = float(i) * 2.0 * PI / PHI / PHI;
          float r = sqrt(float(i));
          if (mod(float(i), 2.0) == 0.0) {
            f = cmul(f, z - vec2(cos(theta), sin(theta)) * r);
          } else {
            f = cdiv(f, z - vec2(cos(theta), sin(theta)) * r);
          }
        }
        */

        gl_FragColor = vec4(domainColoring(
          //clog(f),
					//ctan(cdiv((z + C_ONE), cmul(C_I, csqr(z - C_ONE)))),
          fz,
          //csin(cdiv(cmul(z, z + C_ONE), cmul(csqr(z - C_I), z + C_I))),
          //cdiv(
            //cdiv(z + C_I, z - C_I),
            //cdiv(z + C_ONE, z - C_ONE)
          //),
          vec2(magnitudeSteps, phaseSteps),
          magnitudeStrength,
          phaseStrength,
          magnitudeScale,
          phaseScale
        ), 1.0);
      }
    `,
    attributes: {
      xy: [-4, -4, 0, 4, 4, -4]
    },
    uniforms: {
			viewportWidth: regl.context('viewportWidth'),
			viewportHeight: regl.context('viewportHeight'),
      mViewInv: ({view}) => invertMat4(mViewInv, view),
      w2c2: () => w2c2,
      w: () => w,
      lineWidth: (ctx, props) => (props.loRes ? 0.1 : 0.5) * ctx.pixelRatio,
      magnitudeSteps: () => magnitudeSteps,
      phaseSteps: () => phaseSteps,
      magnitudeStrength: () => magnitudeStrength,
      phaseStrength: () => phaseStrength,
      magnitudeScale: () => magnitudeScale,
      phaseScale: () => phaseScale,
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

        //drawPoints({});

        prevTime = time;
      }
    });
  });

  window.addEventListener('resize', camera.resize);
}
