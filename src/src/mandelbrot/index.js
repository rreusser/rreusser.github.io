const invertMat4 = require('gl-mat4/invert');
const ResetTimer = require('./reset-timer');
const createControls = require('./controls');
const ease = require('eases/cubic-in-out');
const createDomainColoring = require('./domain-coloring');
const regl = require('regl')({
  pixelRatio: Math.min(2.0, window.devicePixelRatio),
  extensions: ['oes_standard_derivatives'],
  attributes: {antialias: true, depth: false, alpha: false, stencil: false},
  onDone: require('fail-nicely')(run)
});

function run (regl) {
  const camera = require('./camera-2d')(regl, {
    xmin: -1.25,
    xmax: 0.1,
    ymin: -0.5,
    ymax: 0.5,
  });

  var state = {
    iterations: 20,
    //polar: true
  };

  const domainColoring = createDomainColoring({
    magnitudeOctaves: 4,
    phaseOctaves: 4,
    phaseMultiplier: 1
  });

  var easedIterations = state.iterations;

  var maxIters = 128
  var controlRoot = document.createElement('div');
  controlRoot.addEventListener('touchstart', e => e.stopPropagation());
	document.body.appendChild(createControls(null, controlRoot));
  require('control-panel')([
    {label: 'iterations', type: 'range', min: 1, max: maxIters, step: 1, initial: state.iterations},
    //{label: 'polar', type: 'checkbox', initial: state.polar},
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
    n += 10
    return commands[Math.min(commands.length - 1, Math.floor((n - 1) / 10))];
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

        uniform float pixelRatio;

        vec2 csqr (vec2 z) {
          return vec2(
            z.x * z.x - z.y * z.y,
            2.0 * z.x * z.y
          );
        }

        vec2 cmul (vec2 a, vec2 b) {
          return vec2(
            a.x * b.x - a.y * b.y,
            a.y * b.x + a.x * b.y
          );
        }

        vec2 csqrt (vec2 z) {
          float t = sqrt(2.0 * (length(z) + (z.x >= 0.0 ? z.x : -z.x)));
          vec2 f = vec2(0.5 * t, abs(z.y) / t);

          if (z.x < 0.0) f.xy = f.yx;
          if (z.y < 0.0) f.y = -f.y;

          return f;
        }

        #define PI 3.141592653589793238
        #define HALF_PI 1.57079632679
        #define HALF_PI_INV 0.15915494309
        #define TO_RADIANS 0.01745329251

        float screenDeriv (float f) {
          //return hypot(vec2(dFdx(f), dFdy(f)));
          return fwidth(f);
        }

        ${domainColoring}


        varying vec2 z;
        //uniform vec2 mouse;
        uniform float viewportHeight;
        uniform float iterations;
        uniform bool polar;

        vec2 cpow (vec2 z, float x) {
          float r = hypot(z);
          float theta = atan(z.y, z.x) * x;
          return vec2(cos(theta), sin(theta)) * pow(r, x);
        }

        float easing (float t) {
          float p = 2.0 * t * t;
          return t < 0.5 ? p : -p + (4.0 * t) - 1.0;
          //return 1.0 / (1.0 + exp((x - ref) * 10.0));
        }

        vec3 f(vec2 z) {
          int count = 0;
          int iiter = int(iterations);
          vec2 c = vec2(0);
          for (int i = 0; i < ${n + 1}; i++) {
            float t = easing(clamp(iterations - float(i), 0.0, 1.0));

            c = mix(c, csqr(c) + z, easing(t));

            if (dot(c, c) > 1e10 && count == 0) count = i;
          }
          return vec3(c, count);
        }

        void main () {
          vec3 value = f(z);

          if (value.z != 0.0) {
            float level = (value.z / (value.z + 10.0));
            level *= level;
            gl_FragColor = vec4(vec3(1.0 - level), 1.0);
          } else {
            gl_FragColor = domainColoring(
              vec4(value.xy, fwidth(value.xy) * pixelRatio),
              vec2(6.0, 8.0), // steps
              vec2(0.1), // scale
              vec2(0.2, 0.3), // gridOpac
              vec2(1.0, 0.2), // shadeOpac
              0.25,       // lineWid
              0.4,       // lineFeather
              vec3(0),   // gridCol
              6.0        // contrastPow
            );
          }
        }
      `,
      attributes: {
        xy: [-4, -4, 0, 4, 4, -4]
      },
      uniforms: {
        pixelRatio: regl.context('pixelRatio'),
        viewportWidth: regl.context('viewportWidth'),
        viewportHeight: regl.context('viewportHeight'),
        mViewInv: ({view}) => invertMat4(mViewInv, view),
        lineWidth: (ctx, props) => (props.loRes ? 0.1 : 0.5) * ctx.pixelRatio,
        iterations: regl.prop('iterations'),
        //mouse: () => mouse,
        polar: () => state.polar
      },
      framebuffer: regl.prop('dst'),
      depth: {enable: false},
      count: 3
    });
  }

  /*
  mouse = [0, 0];
  window.addEventListener('mousemove', function (event) {
    mouse[0] = (event.clientX / window.innerWidth - 0.5) * 2.0;
    mouse[1] = (1.0 - event.clientY / window.innerHeight - 0.5) * 2.0;
    camera.taint();
  });
  */

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

  var iterationDecay = 0.12; // seconds
  var previousTime = null;
  var previousEasedIterations = state.iterations;

  function setCameraState (tval) {
    var a = 15;
    var t = 1 - (Math.exp(-a * tval) - Math.exp(-a)) / (1 - Math.exp(-a));
    var xcen0 = -1;
    var ycen0 = 0;
    var dx0 = 2;
    var dy0 = 2;

    var xcen1 = -8507.544798055096 / 11831.90031975708;
    var ycen1 = 2932.8570328085225 / 11831.90031975708;
    var dx1 = 1 / 11831.90031975708 * 0.1;
    var dy1 = 1 / 11831.90031975708 * 0.1;

    function ease(a, b) {
      return t * b + (1 - t) * a;
    }

    var data = {
      xmin: ease(xcen0, xcen1) - ease(dx0, dx1),
      xmax: ease(xcen0, xcen1) + ease(dx0, dx1),
      ymin: ease(ycen0, ycen1) - ease(dy0, dy1),
      ymax: ease(ycen0, ycen1) + ease(dy0, dy1),
    };
    camera.setBounds(data);
  }

  regl.frame(({time, tick}) => {
    /*
    state.iterations = Math.max(1, time * 1.8 + 0.5);
    if (state.iterations < maxIters) {
      setCameraState(state.iterations / (maxIters + 10));
    }
    */
    if (time) {
      var dt = time - previousTime;
      var decay = Math.exp(-dt / iterationDecay);
      easedIterations = decay * easedIterations + (1 - decay) * state.iterations;
    }
    
    if (Math.abs(easedIterations - previousEasedIterations) > 1e-12) {
      camera.taint();
    }

    previousTime = time;
    previousEasedIterations = easedIterations;

    camera.draw(({dirty}) => {
      if (!dirty) {
        prevTime = undefined;
        return;
      }

      //var iterations = Math.min(maxIters, Math.exp(time * 0.2)) - 1;
      var iterations = easedIterations;

      if (loRes) {
        getDraw(Math.ceil(easedIterations))({
          dst: loResFbo,
          loRes: true,
          iterations: iterations
        });
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
        //var iterations = Math.min(maxIters, Math.exp(time * 0.2) - 1);
        getDraw(iterations)({iterations: iterations});

        prevTime = time;
      }
    });
  });

  window.addEventListener('resize', camera.resize);
}
