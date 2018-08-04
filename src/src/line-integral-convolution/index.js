'use strict';

var createTextureLUT = require('./texture-lut');
var glsl = require('glslify');

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
    alpha: 0.5,
    steps: 6,
    width: 2.0,
  };

  var screenWidth = regl._gl.canvas.width;
  var screenHeight = regl._gl.canvas.height;
  var h = 192;
  var w = Math.floor(h * screenWidth / screenHeight);;
  var licRadius = 0.35;
  var dt = licRadius / state.steps * 0.2;
  var alpha = 0.25 / w / state.steps / licRadius / state.width * screenWidth;

  var textureLUT = createTextureLUT(w, h, 3);
  for (var i3 = 0; i3 < textureLUT.length; i3 += 3) textureLUT[i3 + 2] = Math.pow(Math.random(), 2);
  var textureLUTBuffer = regl.buffer(textureLUT);
  var states = new Array(2).fill(0).map(() => regl.texture({type: regl.hasExtension('oes_texture_half_float') ? 'half float' : 'float', width: w, height: h}));
  var accumulator = regl.texture({width: screenWidth, height: screenHeight});
  var stateFbos = states.map(s => regl.framebuffer({color: s}));

  var licAccumulatorFbo = regl.framebuffer({color: accumulator});

  require('control-panel')([
    {label: 'alpha', type: 'range', min: 0, max: 1, initial: state.alpha, step: 0.01},
    {label: 'steps', type: 'range', min: 2, max: 20, initial: state.steps, step: 1},
    //{label: 'width', type: 'range', min: 0.5, max: 4, initial: state.width, step: 0.1},
  ]).on('input', data => {
    Object.assign(state, data)
    dt = licRadius / state.steps * 0.2;
    alpha = 0.25 / w / state.steps / licRadius / state.width * screenWidth;
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
      precision mediump float;

      #pragma glslify: snoise = require(glsl-noise/simplex/3d)

      varying vec2 uv;
      uniform sampler2D src;
      uniform float uZ, uDt;
      uniform float uAspect;

      vec2 dfdt (vec2 f) {
        vec2 v = vec2(snoise(vec3(f * 1.5, uZ)), snoise(vec3(f * 1.5 + 0.8, uZ)));
        //v += vec2(f.y - 0.5, -(f.x - 0.5 * uAspect)) * 1.5;
        v.x += 0.5;
        v.y += 0.1;
        float mag = smoothstep(0.0, 0.0005, dot(v, v));
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
      uAspect: screenWidth / screenHeight,
      src: regl.prop('src'),
      uResolution: ctx => [1 / ctx.framebufferWidth, 1 / ctx.framebufferHeight],
      uZ: ctx => ctx.time * 0.4,
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
      precision mediump float;
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
      uniform float uLineWidth, uAspect, uDir;
      uniform sampler2D uState1, uState2;
      uniform vec2 uIntensity;
      attribute vec2 aLine;
      attribute vec3 aLUT;
      varying float vAlpha;
  
      void main () {
        vAlpha = aLUT.z * mix(uIntensity.x, uIntensity.y, aLine.y);
        vec4 pdirs = texture2D(uState1, aLUT.xy);
        vec4 ndirs = texture2D(uState2, aLUT.xy);
        vec2 p = mix(pdirs.xy, pdirs.zw, uDir);
        vec2 n = mix(ndirs.xy, ndirs.zw, uDir);
        gl_Position = vec4(mix(p, n, aLine.y) * 2.0 - 1.0, 0, 1);
        gl_Position.xy += normalize((p.yx - n.yx) * vec2(1, uAspect)) * vec2(-1.0 / uAspect, 1) * aLine.x * uLineWidth * (0.5 + 1.0 * vAlpha);
      }
    `,
    frag: `
      precision mediump float;
      varying float vAlpha;
      uniform float uAlpha;
      void main () {
        gl_FragColor = vec4(vec3(1), uAlpha * vAlpha);
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
      uAlpha: () => state.alpha * alpha,
      uDir: regl.prop('dir'),
      uIntensity: regl.prop('intensity'),
      uState1: states[0],
      uState2: states[1],
      uLineWidth: (ctx, props) => props.lineWidth / ctx.framebufferHeight * ctx.pixelRatio,
      uAspect: ctx => ctx.framebufferWidth / ctx.framebufferHeight,
    },
    primitive: 'triangle strip',
    instances: w * h,
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
    //if (tick % 10 !== 1) return;

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
          lineWidth: state.width,
          intensity: [i + even, i + odd].map(i => kernel(i / (state.steps - 1)))
        }, {
          dir: 1,
          lineWidth: state.width,
          intensity: [i + even, i + odd].map(i => kernel(i / (state.steps - 1)))
        }]);
      }
    });
  
    regl.clear({color: [0, 0, 0, 1]});
    copy({src: licAccumulatorFbo});
  });
}
