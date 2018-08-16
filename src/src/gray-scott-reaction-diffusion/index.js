'use strict';

var createControls = require('./controls');
var normalize = require('gl-vec3/normalize');

var glsl = require('glslify');
require('regl')({
  pixelRatio: 0.5,
  extensions: [
    'oes_texture_float',
    'oes_texture_half_float'
  ],
  attributes: {
    antialias: false
  },
  onDone: require('fail-nicely')(run)
});

function run (regl) {
  var w;
  var h;
  var scale = 1.0;

  var textures = []
  var states = []

  var state = {
    relDiffusion: 2.0,
    f: 0.04,
    hue: 0,
    k: 0.06,
  };

  var controlRoot = document.createElement('div');
	document.body.appendChild(createControls(null, controlRoot));

  require('control-panel')([
    {label: 'relDiffusion', type: 'range', min: 1.0, max: 4.0, initial: state.relDiffusion, step: 0.1},
    {label: 'f', type: 'range', min: 0, max: 0.1, initial: state.f, step: 0.001},
    {label: 'k', type: 'range', min: 0, max: 0.1, initial: state.k, step: 0.001},
    {label: 'hue', type: 'range', min: 0, max: 360, initial: state.hue, step: 1},
    {label: 'restart', type: 'button', action: restart},
    {label: 'auto-restart', type: 'checkbox', initial: false},
  ], {
    root: controlRoot,
    width: Math.min(300, window.innerWidth),
  }).on('input', data => {
    var changed = data.k !== state.k || data.f !== state.f || data.relDiffusion !== state.relDiffusion;
    Object.assign(state, data);
    if (changed && data['auto-restart']) restart();
  });


  function restart () {
    w = Math.floor(regl._gl.canvas.width * scale);
    h = Math.floor(regl._gl.canvas.height * scale);
    var n = w * h * 4;
    var initial = new Array(n).fill(0);
    for (var i = 0; i < n; i += 4) {
      initial[i] = 1.0 + 0.1 * (Math.random() - 0.5);
      initial[i + 1] = 0.1 * (Math.random() - 0.5);
    }

    textures = [0, 1].map(i => (textures[i] || regl.texture)({
      data: initial,
      type: regl.hasExtension('oes_texture_half_float') ? 'half float' : 'float',
      min: 'nearest',
      mag: 'nearest',
      width: w,
      height: h,
    }));

    states = [0, 1].map(i => (states[i] || regl.framebuffer)({
      color: textures[i]
    }));

    dropAPoint([
      {point: [0.0, 0.0], dst: states[0], value: 0.5},
    ]);
  }

  require('mouse-change')(regl._gl.canvas, function (buttons, x, y, mods) {
    if (buttons) {
      dropAPoint({
        point: [
          x / regl._gl.canvas.clientWidth * 2.0 - 1.0,
          (1.0 - y / regl._gl.canvas.clientHeight) * 2.0 - 1.0
        ],
        dst: states[0],
        value: 0.5
      });
    }
  });

  var dropAPoint = regl({
    vert: `
      precision mediump float;
      varying vec2 uv;
      uniform vec2 uPoint;
      void main () {
        uv = uPoint * 0.5 + 0.5;
        gl_Position = vec4(uPoint, 0, 1);
        gl_PointSize = 20.1;
      }
    `,
    frag: `
      precision mediump float;
      varying vec2 uv;
      uniform float uValue;
      void main () {
        if (dot(gl_PointCoord.xy - 0.5, gl_PointCoord.xy - 0.5) > 0.25) discard;
        gl_FragColor = vec4(vec3(0.5), 1.0);
      }
    `,
    uniforms: {
      uPoint: regl.prop('point'),
      uValue: regl.prop('value'),
    },
    framebuffer: regl.prop('dst'),
    depth: {enable: false},
    primitive: 'point',
    count: 1
  });

  var drawToScreen = regl({
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
      uniform vec3 color1;
      uniform vec3 color2;
      void main () {
        vec2 value = texture2D(src, uv).xy;
        gl_FragColor = vec4(
          vec3(0.4) +
          ((value.x - 0.2) * color1 +
          value.y * color2) * 0.6,
          //value.x * vec3(0.5, 0.25, -0.25) +
          //value.y * vec3(-0.75, -0.25, 0.25),
          1.0
        );
      }
    `,
    uniforms: {
      color1: () => {
        var h = (state.hue + 45) * Math.PI / 180;
        return normalize([], [
          Math.sin(h + Math.PI * 0.5),
          Math.sin(h + Math.PI * 0.25),
          Math.sin(h + Math.PI * -0.25),
        ]);
      },
      color2: () => {
        var h = (state.hue + 45) * Math.PI / 180;
        return normalize([], [
          Math.sin(h + Math.PI * 1.5),
          Math.sin(h + Math.PI * -0.5),
          Math.sin(h + Math.PI * 0.25),
        ]);
      },
      src: regl.prop('src'),
    },
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    depth: {enable: false},
    count: 3
  });
  
  var compute = regl({
    vert: `
      precision mediump float;
      attribute vec2 xy;
      varying vec2 vUv;
      void main () {
        vUv = xy * 0.5 + 0.5;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: glsl`
      precision mediump float;

      varying vec2 vUv;
      uniform sampler2D uSrc;
      uniform vec2 uResolution;
      uniform vec3 uRule;
      void main () {
        vec2 uv = texture2D(uSrc, vUv).xy;

        vec2 w = texture2D(uSrc, mod(vUv + uResolution * vec2(-1, 0), vec2(1))).xy;
        vec2 e = texture2D(uSrc, mod(vUv + uResolution * vec2(1, 0), vec2(1))).xy;
        vec2 s = texture2D(uSrc, mod(vUv + uResolution * vec2(0, -1), vec2(1))).xy;
        vec2 n = texture2D(uSrc, mod(vUv + uResolution * vec2(0, 1), vec2(1))).xy;
        vec2 ne = texture2D(uSrc, mod(vUv + uResolution * vec2(1, 1), vec2(1))).xy;
        vec2 nw = texture2D(uSrc, mod(vUv + uResolution * vec2(-1, 1), vec2(1))).xy;
        vec2 se = texture2D(uSrc, mod(vUv + uResolution * vec2(1, -1), vec2(1))).xy;
        vec2 sw = texture2D(uSrc, mod(vUv + uResolution * vec2(-1, -1), vec2(1))).xy;

        vec2 laplacian = (0.5 * (n + s + e + w) + 0.25 * (ne + nw + se + sw) - 3.0 * uv) / 0.05;
        //vec2 laplacian = (n + s + e + w) - 4.0 * uv) / 0.05;

        vec2 deriv = 0.005 * vec2(uRule.x, 1.0) * laplacian +
          uv.x * uv.y * uv.y * vec2(-1, 1) +
          vec2(uRule.y * (1.0 - uv.x), -(uRule.y + uRule.z) * uv.y);

        gl_FragColor = vec4(uv + deriv, 0.0, 1.0);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      uRule: () => [
        state.relDiffusion,
        state.f,
        state.k
      ],
      uSrc: regl.prop('src'),
      uResolution: ctx => [1 / ctx.framebufferWidth, 1 / ctx.framebufferHeight],
    },
    framebuffer: regl.prop('dst'),
    depth: {enable: false},
    count: 3
  });

  restart();

  window.addEventListener('resize', restart);

  var itersPerFrame = 10;
  var prevTime = null;
  var slowCount = 0;
  regl.frame(({tick, time}) => {
    if (prevTime) {
      var dt = time - prevTime;
      if (dt > 1.4 / 60) {
        slowCount++;
      } else if (dt < 1.1 / 60) {
        slowCount--;
      }
      if (slowCount > 10) {
        slowCount = 0;
        itersPerFrame = Math.max(1, itersPerFrame - 1);
      }
      if (slowCount < -10) {
        slowCount = 0;
        itersPerFrame = Math.min(10, itersPerFrame + 1);
      }
    }
    prevTime = time;
    
    for (var i = 0; i < itersPerFrame; i++) {
      compute({src: states[0], dst: states[1]});
      compute({src: states[1], dst: states[0]});
    }
    drawToScreen({src: states[0]});
  });
}
