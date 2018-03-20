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
  const camera = require('./camera-2d')(regl, {xmin: -20, xmax: 20});

  var E = Complex(1, 0);
  var rho = 1.0;
  var nu = 0.33;
  var h = 1.0;
  var w = 20.0;
  var viscoelasticity = 0.0;
  var w2c2 = [];

  require('control-panel')([
    {type: 'range', label: 'ω', min: 0.05, max: 30.0, initial: w, step: 0.01},
    {type: 'range', label: 'ν', min: 0, max: 0.49, initial: nu, step: 0.01},
    {type: 'range', label: 'viscoelasticity', min: 0, max: Math.PI * 2, initial: viscoelasticity},
  ]).on('input', computeConstants);

  var loResFbo = regl.framebuffer({
    color: regl.texture({
      width: Math.round(regl._gl.canvas.width / 8),
      height: Math.round(regl._gl.canvas.height / 8),
      mag: 'linear'
    })
  });

  const transfer = regl({
    vert: `
      precision mediump float;
      attribute vec2 xy;
      varying vec2 uv;
      void main () {
        uv = xy * 0.5 + 0.5;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: `
      precision mediump float;
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
      precision mediump float;
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

      precision mediump float;

      #pragma glslify: hsv2rgb = require(glsl-hsv2rgb)
      #pragma glslify: gridFn = require(glsl-solid-wireframe/cartesian/scaled)

      #define M_PI 3.141592653

      uniform float w, lineWidth;
      varying vec2 z;
      uniform vec4 w2c2;

      vec4 domainColoring (vec2 z, vec2 gridSpacing, float saturation, float gridStrength, float magStrength) {
        float carg = atan(z.y, z.x);
        float cmod = length(z);
        float logmag = log2(cmod) * 0.5;

        gridSpacing /= cmod;

        return vec4(
          hsv2rgb(vec3(
            carg * 0.5 / M_PI,
            saturation,
            0.5 + 0.5 * saturation
          )) - gridStrength * (1.0 - gridFn(vec3(logmag, z.xy * gridSpacing), lineWidth, 1.0)
          ), 1.0);
      }

      vec2 sinhcosh (float x) {
        vec2 ex = exp(vec2(x, -x));
        return 0.5 * (ex - vec2(ex.y, -ex.x));
      }

      vec2 cmul (vec2 a, vec2 b) {
        return vec2(a.x * b.x - a.y * b.y, a.y * b.x + a.x * b.y);
      }

      vec2 csqr (vec2 a) {
        return vec2(a.x * a.x - a.y * a.y, 2.0 * a.x * a.y);
      }

      vec4 csincos (vec2 z) {
        float c = cos(z.x);
        float s = sin(z.x);
        return sinhcosh(z.y).yxyx * vec4(s, c, c, -s);
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

        gl_FragColor = domainColoring(fz / w / w, vec2(1e-1), 0.7, 0.2, 0.2);
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
