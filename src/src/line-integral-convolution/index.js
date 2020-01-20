'use strict';

var glsl = require('glslify');
var createControls = require('./controls');

function createTextureLUT (w, h, stride) {
  stride = stride || 2;
  var n = w * h * stride;

  var out = new Float32Array(n);

  for (var i = 0, iStride = 0; iStride < n; i++, iStride += stride) {
    out[iStride] = ((i % w) + 0.5) / w;
    out[iStride + 1] = (((i / w) | 0) + 0.5) / h;
  }

  return out;
};

require('regl')({
  pixelRatio: Math.min(window.devicePixelRatio, 1.5),
  extensions: [
    'oes_texture_float',
    'angle_instanced_arrays'
  ],
  optionalExtensions: [
    'oes_texture_half_float',
  ],
  attributes: {antialias: false},
  onDone: require('fail-nicely')(run)
});

function run (regl) {
  var state = {
    alpha: 0.4,
    steps: 5,
    width: 3.0,
    noiseScale: 1.5,
    noiseSpeed: 0.8,
    resolution: 128,
    modulation: 0.75,
    modulationFrequency: 0.8,
    modulationSpeed: 1.3,
  };

  var screenWidth, screenHeight, h, w, licRadius, dt, alpha;
  var textureLUTBuffer, licAccumulator, licAccumulatorFbo;

  function computeConstants () {
    screenWidth = regl._gl.canvas.width;
    screenHeight = regl._gl.canvas.height;
    h = state.resolution;
    w = Math.floor(h * screenWidth / screenHeight);;
    licRadius = 0.35;
    dt = licRadius / state.steps * 0.2;
    alpha = 0.5 / w / state.steps / licRadius / state.width * screenWidth;
  }

  var states = [];
  var stateFbos = [];

  function resize () {
    var textureLUT = createTextureLUT(w, h, 4);
    for (var i4 = 0; i4 < textureLUT.length; i4 += 4) {
      textureLUT[i4 + 2] = Math.pow(Math.random(), 2);
      textureLUT[i4 + 3] = Math.random() * 8.0 * Math.PI;
    }
    textureLUTBuffer = (textureLUTBuffer || regl.buffer)(textureLUT);
    for (var i = 0; i < 2; i++) {
      states[i] = (states[i] || regl.texture)({
        type: regl.hasExtension('oes_texture_half_float') ? 'half float' : 'float',
        width: w,
        height: h
      });
      stateFbos[i] = (stateFbos[i] || regl.framebuffer)({color: states[i]});
    }
    licAccumulator = (licAccumulator || regl.texture)({width: screenWidth, height: screenHeight});
    licAccumulatorFbo = (licAccumulatorFbo || regl.framebuffer)({color: licAccumulator});
  }
  
  computeConstants();
  resize();
  window.addEventListener('resize', function () {
    computeConstants();
    resize();
  });

  var controlRoot = document.createElement('div');
	document.body.appendChild(createControls(null, controlRoot));

  require('control-panel')([
    {label: 'alpha', type: 'range', min: 0, max: 1, initial: state.alpha, step: 0.01},
    {label: 'steps', type: 'range', min: 2, max: 20, initial: state.steps, step: 1},
    {label: 'noiseScale', type: 'range', min: 0.1, max: 4, initial: state.noiseScale, step: 0.1},
    {label: 'noiseSpeed', type: 'range', min: 0.1, max: 4, initial: state.noiseSpeed, step: 0.1},
    {label: 'resolution', type: 'range', min: 8, max: 512, initial: state.resolution, step: 1},
    {label: 'width', type: 'range', min: 0.5, max: 4, initial: state.width, step: 0.1},
    {label: 'modulation', type: 'range', min: 0.0, max: 1, initial: state.modulation, step: 0.01},
    {label: 'modulationFrequency', type: 'range', min: 0.1, max: 4, initial: state.modulationFrequency, step: 0.1},
    {label: 'modulationSpeed', type: 'range', min: 0.1, max: 4, initial: state.modulationSpeed, step: 0.1},
  ], {
    root: controlRoot
  }).on('input', data => {
    var needsResize = data.resolution !== state.resolution;
    Object.assign(state, data)
    computeConstants();
    if (needsResize) resize();
  });

  var integrate = regl({
    vert: `
      precision mediump float;
      attribute vec2 xy;
      varying vec2 uv;
      void main () {
        uv = xy * 0.5 + 0.5;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: glsl`
      precision highp float;

      #pragma glslify: snoise = require(glsl-noise/simplex/3d)

      varying vec2 uv;
      uniform sampler2D src;
      uniform float uZ, uDt;
      uniform float uAspect, uNoiseScale;

      vec2 dfdt (vec2 f) {
        vec2 v = vec2(snoise(vec3(f * 2.5 * uNoiseScale, uZ)), snoise(vec3(f * 2.5 * uNoiseScale + 0.8, uZ)));
        v.x += 0.5;
        v.y += 0.1;
        float mag = smoothstep(0.0, 0.0003, dot(v, v));
        return mag * normalize(v);
      }

      void main () {
        vec4 f = texture2D(src, uv);
        f.xz *= uAspect;
        vec4 fh = f + uDt * 0.5 * vec4(dfdt(f.xy), -dfdt(f.zw));
        gl_FragColor = f + uDt * vec4(dfdt(fh.xy), -dfdt(fh.zw));
        gl_FragColor.xz /= uAspect;
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      uNoiseScale: () => 1.0 / state.noiseScale,
      uAspect: () => screenWidth / screenHeight,
      src: regl.prop('src'),
      uResolution: ctx => [1 / ctx.framebufferWidth, 1 / ctx.framebufferHeight],
      uZ: ctx => ctx.time * 0.2 * state.noiseSpeed,
      uDt: dt,
    },
    framebuffer: regl.prop('dst'),
    depth: {enable: false},
    count: 3
  });

  var initialize = regl({
    vert: `
      precision mediump float;
      attribute vec2 xy;
      varying vec2 uv;
      void main () {
        uv = xy * 0.5 + 0.5;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: glsl`
      precision highp float;
      #pragma glslify: random = require(glsl-random)
      uniform float uAspect;
      uniform vec2 uResolution;
      uniform sampler2D src;
      varying vec2 uv;
      void main () {
        gl_FragColor = (uv + uResolution * vec2(random(gl_FragCoord.xy), random(gl_FragCoord.xy + 0.5))).xyxy;
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      uResolution: ctx => [1 / w, 1 / h],
      src: regl.prop('src')
    },
    framebuffer: regl.prop('dst'),
    depth: {enable: false},
    count: 3
  });
  

  var drawLines = regl({
    vert: `
      precision highp float;
      uniform mat4 uProjectionView;
      uniform float uLineWidth, uAspect, uDir, uPhase;
      uniform sampler2D uState1, uState2;
      uniform vec2 uIntensity, uX;
      attribute vec2 aLine;
      attribute vec4 aLUT;
      varying float vAlpha, vLineX, vX;
  
      void main () {
        vAlpha = aLUT.z * mix(uIntensity.x, uIntensity.y, aLine.y);
        vec4 pdirs = texture2D(uState1, aLUT.xy);
        vec4 ndirs = texture2D(uState2, aLUT.xy);
        vec2 p = mix(pdirs.xy, pdirs.zw, uDir);
        vec2 n = mix(ndirs.xy, ndirs.zw, uDir);
        gl_Position = vec4(mix(p, n, aLine.y) * 2.0 - 1.0, 0, 1);
        gl_Position.xy += normalize((p.yx - n.yx) * vec2(1, uAspect)) * vec2(-1.0 / uAspect, 1) * aLine.x * uLineWidth * (0.5 + 1.0 * vAlpha);
        vLineX = aLine.x;
        vX = mix(uX.x, uX.y, mix(1.0 - aLine.y, aLine.y, uDir)) * (uDir * 2.0 - 1.0) - uPhase + aLUT.w;
      }
    `,
    frag: `
      precision highp float;
      varying float vAlpha, vLineX, vX;
      uniform float uAlpha, uFeather, uModulationFreq, uModulation;
      #define PI 3.14159265
      void main () {
        float modulation = 2.0 * mod(vX * uModulationFreq, PI) / PI - 1.0;
        modulation *= modulation;
        modulation = 1.0 - modulation;
        modulation *= modulation;
        modulation = mix(1.0, modulation, uModulation);

        gl_FragColor = vec4(vec3(1), uAlpha * vAlpha * modulation * (
          smoothstep(1.0, 1.0 - uFeather, vLineX) *
          smoothstep(-1.0, -1.0 + uFeather, vLineX)
        ));
      }
    `,
    attributes: {
      aLUT: {buffer: textureLUTBuffer, divisor: 1},
      aLine: new Int8Array([-1, 0, 1, 0, -1, 1, 1, 1]),
    },
    blend: {
      enable: true,
      func: {
        srcRGB: 'src alpha',
        dstRGB: 1,
        srcAlpha: 1,
        dstAlpha: 1,
      },
      equation: 'add'
    },
    depth: {enable: false},
    uniforms: {
      uModulation: () => state.modulation,
      uModulationFreq: () => state.modulationFrequency,
      uPhase: ctx => (-ctx.time * state.modulationSpeed * Math.PI * 2) % (Math.PI * 2.0 / state.modulationFrequency),
      uX: regl.prop('x'),
      uAlpha: () => state.alpha * alpha,
      uDir: regl.prop('dir'),
      uIntensity: regl.prop('intensity'),
      uState1: states[0],
      uState2: states[1],
      uLineWidth: (ctx, props) => props.lineWidth / ctx.framebufferHeight * ctx.pixelRatio,
      uFeather: (ctx, props) => 1.0 / Math.max(props.lineWidth, 1.0) * 2.0,
      uAspect: ctx => ctx.framebufferWidth / ctx.framebufferHeight,
    },
    primitive: 'triangle strip',
    instances: () => w * h,
    count: 4,
  });
  
  var copy = regl({
    vert: `
      precision mediump float;
      attribute vec2 xy;
      varying vec2 uv;
      void main () {
        uv = xy * 0.5 + 0.5;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: glsl`
      precision mediump float;
      #pragma glslify: colormap = require(glsl-colormap/velocity-blue)
      varying vec2 uv;
      uniform sampler2D src;
      void main () {
        gl_FragColor = colormap((texture2D(src, uv).x));
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {src: regl.prop('src')},
    depth: {enable: false},
    count: 3
  });

  function kernel (x) {
    return Math.exp(-Math.pow(x / 0.4, 2.0) * 0.5);
  }
  
  regl.frame(({tick}) => {
    licAccumulatorFbo.use(() => regl.clear({color: [0, 0, 0, 1]}));
    initialize({dst: stateFbos[0]});

    licAccumulatorFbo.use(() => {
      for (var i = 0; i < state.steps; i++) {
        var even = i % 2;
        var odd = (i + 1) % 2;

        integrate({
          src: states[even],
          dst: stateFbos[odd]
        });

        drawLines([{
          dir: 0,
          x: [i + odd, i + even],
          lineWidth: state.width,
          intensity: [i + even, i + odd].map(i => kernel(i / (state.steps - 1)))
        }, {
          dir: 1,
          x: [i + even, i + odd],
          lineWidth: state.width,
          intensity: [i + even, i + odd].map(i => kernel(i / (state.steps - 1)))
        }]);
      }
    });
  
    regl.clear({color: [0, 0, 0, 1]});
    copy({src: licAccumulatorFbo});
  });

}
