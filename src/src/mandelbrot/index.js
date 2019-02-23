const glsl = require('glslify');
const invertMat4 = require('gl-mat4/invert');
const ResetTimer = require('./reset-timer');
const createControls = require('./controls');
const regl = require('regl')({
  pixelRatio: Math.min(2.0, window.devicePixelRatio),
  extensions: ['oes_standard_derivatives'],
  attributes: {antialias: true, depth: false, alpha: false, stencil: false},
  onDone: require('fail-nicely')(run)
});

function run (regl) {
  const camera = require('./camera-2d')(regl, {
    xmin: -1.0,
    xmax: 1.0,
    ymin: -1,
    ymax: 1,
  });

  var state = {
    iterations: 20,
    polar: true
  };

  var controlRoot = document.createElement('div');
  controlRoot.addEventListener('touchstart', e => e.stopPropagation());
	document.body.appendChild(createControls(null, controlRoot));
  var maxIters = 200;
  require('control-panel')([
    {label: 'iterations', type: 'range', min: 1, max: maxIters, step: 1, initial: state.iterations},
    {label: 'polar', type: 'checkbox', initial: state.polar},
  ], {
		width: 350,
    root: controlRoot,
	}).on('input', function (data) {
    loResNeeded = false;
    Object.assign(state, data);
    camera.taint();
  });

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
      }`,
    frag: `
      precision highp float;
      varying vec2 uv;
      uniform sampler2D src;
      void main () {
        gl_FragColor = texture2D(src, uv);
      }`,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {src: regl.prop('src')},
    depth: {enable: false},
    count: 3
  });

  const mViewInv = new Float32Array(16);

  var commands = new Array(Math.floor(maxIters / 10) + 1).fill(0).map(function (d, i) {
    return (i + 1) * 10;
  }).map(makeCommand);

  function getDraw (n) {
    return commands[Math.floor((n - 1) / 10)];
  }

  function makeCommand (n) {
    return regl({
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
      frag: `
        #extension GL_OES_standard_derivatives : enable
        precision highp float;

        vec2 csqr (vec2 z) {
          return vec2(
            z.x * z.x - z.y * z.y,
            2.0 * z.x * z.y
          );
        }

        #define PI 3.141592653589793238
        #define HALF_PI 1.57079632679
        #define HALF_PI_INV 0.15915494309
        #define TO_RADIANS 0.01745329251

        float hypot (vec2 z) {
          float x = abs(z.x);
          float y = abs(z.y);
          float t = min(x, y);
          x = max(x, y);
          t = t / x;
          return x * sqrt(1.0 + t * t);
        }

        // https://github.com/d3/d3-color
        vec3 cubehelix (vec3 c) {
          float a = c.y * c.z * (1.0 - c.z);
          float h = c.x + HALF_PI;
          float ch = cos(h);
          float sh = sin(h);
          return c.z + a * (
            sh * vec3(1.78277, -0.90649, 0.0) + 
            ch * vec3(-0.14861, -0.29227, 1.97294)
          );
        }

        // https://github.com/d3/d3-scale-chromatic
        vec3 cubehelixRainbow(float t) {
          t = mod(t + 0.25, 1.0);
          float ts = 0.25 - 0.25 * cos((t - 0.5) * PI * 2.0);
          return cubehelix(vec3(
            (360.0 * TO_RADIANS) * t - (100.0 * TO_RADIANS),
            1.5 - 1.5 * ts,
            0.8 - 0.9 * ts
          ));
        }

        float gridFactor (float parameter) {
          const float width = 1.0;
          const float feather = 1.0;
          float w1 = width - feather * 0.5;
          float d = fwidth(parameter);
          float looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
          return 1.0 - smoothstep(d * w1, d * (w1 + feather), looped);
        }

        float loop (float x) {
          float y = fract(x);
          y *= y;
          return 1.0 - y * y;
        }

        float screenDeriv (float f) {
          //return hypot(vec2(dFdx(f), dFdy(f)));
          return fwidth(f);
        }

        vec3 domainColoring (vec2 f,
                             bool polar,
                             vec2 steps,
                             vec2 scale,
                             vec2 fieldStrength,
                             vec2 gridStrength,
                             float viewportHeight
         ) {
          float carg = atan(f.y, f.x) * HALF_PI_INV;
          float cmag = hypot(f);
          float dx = 10.0 / viewportHeight;

          vec2 inputValue = polar ? vec2(cmag, carg) : f;
          float phaseOffset = polar ? 0.5 : 0.0;

          float c = 0.0;

          float invlog2base, logspacing, logtier, n;

          // Magnitude steps
          invlog2base = 1.0 / log2(steps.x);
          logspacing = (log2(screenDeriv(inputValue.x)) - log2(dx / scale.x)) * invlog2base;
          logspacing = clamp(logspacing, -2e1, 1e10);
          logtier = floor(logspacing);
          n = log2(abs(inputValue.x)) * invlog2base - logtier;

          float magFadeIn = smoothstep(logtier, logtier + 1.0, logspacing);
          float magFadeOut = smoothstep(logtier + 1.0, logtier, logspacing);

          float magOctave0 = pow(steps.x, n);
          float magOctave1 = magOctave0 * steps.x;
          float magOctave2 = magOctave1 * steps.x;
          float magOctave3 = magOctave2 * steps.x;
          float magOctave4 = magOctave3 * steps.x;

          c += fieldStrength.x * (
            magFadeIn * loop(magOctave0) +
            loop(magOctave1) +
            loop(magOctave2) +
            loop(magOctave3) +
            magFadeOut * loop(magOctave4)
          ) / 5.0;

          // Phase steps
          invlog2base = 1.0 / log2(steps.y);
          logspacing = (log2(screenDeriv(inputValue.y)) - log2(dx / scale.y)) * invlog2base;
          logspacing = clamp(logspacing, -2e1, 1e10);
          logtier = floor(logspacing);
          n = log2(abs(inputValue.y + phaseOffset)) * invlog2base - logtier;

          float phaseFadeIn = smoothstep(logtier, logtier + 1.0, logspacing);
          float phaseFadeOut = smoothstep(logtier + 1.0, logtier, logspacing);

          float phaseOctave0 = pow(steps.y, n);
          float phaseOctave1 = phaseOctave0 * steps.y;
          float phaseOctave2 = phaseOctave1 * steps.y;
          //float phaseOctave3 = phaseOctave2 * steps.y;

          c += fieldStrength.y * (
            phaseFadeIn * loop(phaseOctave0) +
            loop(phaseOctave1) +
            phaseFadeOut * loop(phaseOctave2)
          ) / 3.0;


          vec3 color = (0.24 + 0.74 * cubehelixRainbow(carg)) * (0.9 - (fieldStrength.x + fieldStrength.y) * 0.7 + c);

          float magGrid = 1.0 - gridStrength.x * (
            mix(0.0, gridFactor(magOctave0), magFadeIn) +
            gridFactor(magOctave1) +
            gridFactor(magOctave2) +
            gridFactor(magOctave3) +
            mix(0.0, gridFactor(magOctave4), magFadeOut)
          ) / 5.0;

          float phaseGrid = 1.0 - gridStrength.y * (
            mix(1.0, gridFactor(phaseOctave0), phaseFadeIn) *
            gridFactor(phaseOctave1) *
            mix(1.0, gridFactor(phaseOctave2), phaseFadeOut)
          ) / 3.0;

          return color * min(magGrid, phaseGrid);
        }

        varying vec2 z;
        uniform float viewportHeight;
        uniform float iterations;
        uniform bool polar;

        vec2 cpow (vec2 z, float x) {
          float r = hypot(z);
          float theta = atan(z.y, z.x) * x;
          return vec2(cos(theta), sin(theta)) * pow(r, x);
        }

        vec3 f(vec2 z) {
          int count = 0;
          int iiter = int(iterations);
          vec2 c = vec2(0);
          for (int i = 0; i < ${n + 1}; i++) {
            if (i >= iiter) continue;
            c = csqr(c) + z;
            if (dot(c, c) > 64.0 && count == 0) count = i;
          }
          //float frac = iterations - float(iiter);
          //c = cpow(c, 1.0 + frac) + frac * z;
          return vec3(c, count);
        }

        void main () {
          vec3 value = f(z);

          if (value.z != 0.0) {
            float level = (value.z / (value.z + 10.0));
            level *= level;
            gl_FragColor = vec4(vec3(1.0 - level), 1.0);
          } else {
            gl_FragColor = vec4(domainColoring(
              value.xy,
              polar,           // polar
              vec2(4, 4),      // steps
              vec2(16.0, 1.0), // scale
              vec2(polar ? 0.5 : 0.3, polar ? 0.0 : 0.3),  // field strength
              vec2(0.0, polar ? 0.3 : 0.0),  // grid strength
              viewportHeight
            ), 1.0);
          }
        }
      `,
      attributes: {
        xy: [-4, -4, 0, 4, 4, -4]
      },
      uniforms: {
        viewportWidth: regl.context('viewportWidth'),
        viewportHeight: regl.context('viewportHeight'),
        mViewInv: ({view}) => invertMat4(mViewInv, view),
        lineWidth: (ctx, props) => (props.loRes ? 0.1 : 0.5) * ctx.pixelRatio,
        iterations: () => state.iterations,
        polar: () => state.polar
      },
      framebuffer: regl.prop('dst'),
      depth: {enable: false},
      count: 3
    });
  }

  var loResNeeded = false;
  var prevTime;
  var framerate = 1 / 60;
  var loRes = false;
  var loResTimer = new ResetTimer(100);
  loResTimer.on('timeout', function () {
    camera.taint();
    loRes = false;
  });
  camera.on('interaction', function () {
    if (loResNeeded) loRes = true;
    loResTimer.reset();
  });

  regl.frame(({time}) => {
    camera.draw(({dirty}) => {
      if (!dirty) {
        prevTime = undefined;
        return;
      }

      if (loRes) {
        getDraw(state.iterations)({dst: loResFbo, loRes: true});
        transfer({src: loResFbo});
        prevTime = undefined;
      } else {
        if (prevTime !== undefined) {
          framerate = 0.9 * framerate + 0.1 * (time - prevTime);
          if (framerate > (1 / 60) * 3.0) {
            loResNeeded = true;
          } else if (framerate < (1 / 60) * 2.0) {
            loResNeeded = false;
          }
        }
        getDraw(state.iterations)({});

        prevTime = time;
      }
    });
  });

  window.addEventListener('resize', camera.resize);
}
