'use strict';

var glsl = require('glslify');

var maxPixelRatio = 1.0;
if (window.innerWidth * window.innerHeight < 1024 * 768) {
  maxPixelRatio = 2;
}

require('regl')({
  pixelRatio: Math.min(window.devicePixelRatio, maxPixelRatio),
  extensions: ['oes_standard_derivatives', 'oes_texture_float', 'oes_texture_float_linear'],
  optionalExtensions: ['oes_texture_half_float', 'oes_texture_half_float_linear'],
  attributes: {
    depthStencil: false,
    alpha: false,
    antialias: false
  },
  onDone: require('fail-nicely')(run)
});

function run (regl) {
  // number of points in a signal
  var n = 128;

  // number of signals
  var numSignals = 64;

  // construct data with which to mesh this. each line is acutally a fully filled set of triangles
  // down below its axis. The line is simply a shader which draws the top part white and the rest
  // black so that we get the necessary occlusion
  var band = []; 
  for (var j = 0; j < numSignals; j++) {
    var y = (j + 0.5) / numSignals;
    for (var i = 0; i < n - 1; i++) {
      var x0 = (i + 0.5) / n;
      var x1 = (i + 1.5) / n;
      band.push([x0, y, 0]);
      band.push([x1, y, 0]);
      band.push([x1, y, 1]);
      band.push([x0, y, 0]);
      band.push([x1, y, 1]);
      band.push([x0, y, 1]);
    }
  }

  var dataType = regl.hasExtension('oes_texture_half_float') ? 'half float' : 'float';

  // Framebuffers to hold the signal and noise
  var signalTmp = regl.framebuffer({width: n, height: n, colorType: dataType});
  var signalFbo = regl.framebuffer({width: n, height: n, colorType: dataType});
  var noiseFbo = regl.framebuffer({colorType: dataType, width: n, height: numSignals});

  var pingPongFbos = new Array(2).fill(0).map(() => regl.framebuffer({
    colorType: dataType,
    width: n,
    height: numSignals
  }));

  // Create an FFT function which transforms each row independently and skips the columns
  var fft = require('./regl-fft')(regl, {width: n, height: 1, ping: pingPongFbos[0], pong: pingPongFbos[1]});

  // Initialize a bump in the center of each signal
  var initializeSignal = regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      varying vec2 uv;
      void main () {
        uv = xy;
        gl_Position = vec4(xy, 0, 1);
      }`,
    frag: `
      precision highp float;
      varying vec2 uv;
      void main () {
        float x = uv.x;
        float y = exp(-pow(abs(uv.x) / 0.38, 4.0));
        gl_FragColor = vec4(y, 0, 0, 0);
      }`,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    framebuffer: regl.prop('output'),
    depth: {enable: false},
    count: 3
  });
  

  // A blur kernel with which to diffuse the signal
  var blurKernel = regl({
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
      uniform sampler2D uInput;
      uniform vec2 resolution;
      void main () {
        float fn = texture2D(uInput, uv + vec2(0, resolution.y)).x;
        float fs = texture2D(uInput, uv + vec2(0, -resolution.y)).x;
        float fe = texture2D(uInput, uv + vec2(resolution.x, 0)).x;
        float fw = texture2D(uInput, uv + vec2(-resolution.x, 0)).x;
        gl_FragColor = vec4(0.25 * (fn + fs + fe + fw) * 0.997, 0, 0, 0);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      uInput: regl.prop('input'),
      resolution: ctx => [1.0 / ctx.framebufferWidth, 1.0 / ctx.framebufferHeight],
    },
    framebuffer: regl.prop('output'),
    depth: {enable: false},
    count: 3
  });

  // Accumulate points to draw on each pass
  var brushBuffer = regl.buffer();
  var brushPoints = [];

  var brush = regl({
    vert: `
      precision highp float;
      attribute vec2 aPoint;
      void main () {
        gl_Position = vec4(aPoint, 0, 1);
        gl_PointSize = 30.0;
      }`,
    frag: `
      precision highp float;
      void main () {
        gl_FragColor = vec4(1, 1, 1, max(0.0, 1.0 - dot(gl_PointCoord.xy - 0.5, gl_PointCoord.xy - 0.5) * 4.0) * 0.15);
      }`,
    blend: {
      enable: true,
      func: {srcRGB: 'src alpha', dstRGB: 1, srcAlpha: 1, dstAlpha: 1},
      equation: {alpha: 'add', rgb: 'add'}
    },
    attributes: {aPoint: regl.prop('points')},
    framebuffer: regl.prop('output'),
    depth: {enable: false},
    primitive: 'points',
    count: regl.prop('count')
  });
  
  // We compute a unique set of wavenumbers for each signal on each pass, then peform the inverse fft
  // and draw. We apply a frequency-dependent phase shift for each wavenumber.
  var computeWavenumber = regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      void main () {
        gl_Position = vec4(xy, 0, 1);
      }`,
    frag: glsl`
      precision highp float;
      #pragma glslify: wavenumber = require(glsl-fft/wavenumber)
      #pragma glslify: random = require(glsl-random)
      uniform vec2 resolution;
      uniform float time;
      void main () {
        float phase = random(gl_FragCoord.xy / resolution) * (3.1415926 * 2.0);
        float kx = wavenumber(resolution).x;
        float kmag = exp(-abs(kx) * 1.8);
        phase += kx * abs(kx) * time * 45.0;
        vec2 kxy = kmag * vec2(cos(phase), sin(phase));
        gl_FragColor = vec4(kxy, 0, 0);
      }`,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      time: regl.context('time'),
      resolution: ctx => [1 / ctx.framebufferWidth, 1 / ctx.framebufferHeight]
    },
    framebuffer: regl.prop('output'),
    depth: {enable: false},
    count: 3
  });

  var drawSignal = regl({
    vert: `
      precision highp float;
      attribute vec3 aVertex;
      uniform sampler2D uInput, uSignal;
      varying float v;
      uniform vec4 windowScale;
      void main () {
        float noise = texture2D(uInput, aVertex.xy).x;
        float signal = min(texture2D(uSignal, aVertex.xy).x, 1.2);
        v = aVertex.z;
        float y = noise + 1.7 * signal;
        gl_Position = vec4(
          mix(windowScale.x, windowScale.z, aVertex.x),
          (0.04 * y * y) * v + (v - 1.0) * 0.02 - mix(windowScale.y, windowScale.w, aVertex.y),
          0, 1);
      }
    `,
    frag: glsl`
      #extension GL_OES_standard_derivatives : enable
      precision highp float;
      uniform float uLineWidth;
      varying float v;
      float grid (float parameter, float width, float feather) {
        float d = length(vec2(dFdx(parameter), dFdy(parameter)));
        return smoothstep(d * (width - feather * 0.5), d * (width + feather * 0.5), abs(parameter));
      }
      void main () {
        float gridFactor = 1.0 - grid(v - 1.0, uLineWidth, 2.0);
        gl_FragColor = vec4(mix(vec3(0.09), vec3(1), gridFactor), 1);
      }
    `,
    attributes: {aVertex: band},
    uniforms: {
      uLineWidth: (ctx, props) => 2.0 * ctx.pixelRatio,
      uInput: noiseFbo,
      uSignal: signalFbo,
    },
    depth: {enable: false},
    count: band.length,
  });

  var windowScale = [-0.8, -0.8, 0.8, 0.8];

  function computeWindowScale () {
    var maxWidth = window.innerWidth * 1.6 / 2.0;
    var maxHeight = window.innerHeight * 1.6 / 2.0;

    var targetAspect = 1.3;

    if (maxWidth * targetAspect > maxHeight) {
      maxWidth = maxHeight / targetAspect;
    } else {
      maxHeight = maxWidth * targetAspect;
    }

    var w = maxWidth / window.innerWidth;
    var h = maxHeight / window.innerHeight;
    windowScale[0] = -w;
    windowScale[1] = -h;
    windowScale[2] = w;
    windowScale[3] = h;
  }

  computeWindowScale();
  window.addEventListener('resize', computeWindowScale);
  
  var setUniforms = regl({
    uniforms: {
      windowScale: () => windowScale
    }
  });

  function brushPoint (ev) {
    var i = ev.clientX;
    var j = ev.clientY;
    var x = i / window.innerWidth * 2.0 - 1.0;
    var y = j / window.innerHeight * 2.0 - 1.0;
    brushPoints.push([
      (x - windowScale[0]) / (windowScale[2] - windowScale[0]) * 2.0 - 1.0,
      (y - windowScale[1]) / (windowScale[3] - windowScale[1]) * 2.0 - 1.0
    ]);
  }
  window.addEventListener('mousemove', brushPoint);
  window.addEventListener('mousedown', brushPoint);
  window.addEventListener('touchstart', function (ev) {
    for (var i = 0; i < ev.touches.length; i++) brushPoint(ev.touches[i]);
    ev.stopPropagation();
    ev.preventDefault();
  }, {passive: false});
  window.addEventListener('touchmove', function (ev) {
    for (var i = 0; i < ev.touches.length; i++) brushPoint(ev.touches[i]);
    ev.preventDefault();
    ev.stopPropagation();
  }, {passive: false});

  function flushBrushPoints () {
    brushBuffer = brushBuffer(brushPoints);
    if (!brushPoints.length) return;
    brush({points: brushBuffer, count: brushPoints.length, output: signalFbo})
    brushPoints.length = 0;
  }

  initializeSignal({output: signalFbo});

  regl.frame(({tick}) => {
    setUniforms(() => {
      regl.clear({color: [0.09, 0.09, 0.09, 1]});

      // Blur the signal
      blurKernel([
        {input: signalFbo, output: signalTmp},
        {input: signalTmp, output: signalFbo},
      ]);
      
      // Apply any brushing which has occured
      flushBrushPoints();
      
      // Compute a new set of wavenumbesr
      computeWavenumber({output: noiseFbo});

      // Convert wavenumbers into a signal
      fft(-1, noiseFbo, noiseFbo);

      // Draw it!
      drawSignal();
    });
  });
}
