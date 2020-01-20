'use strict';

var createControls = require('./controls');

var glsl = require('glslify');
require('regl')({
  pixelRatio: 0.75,
  extensions: [],
  attributes: {
    antialias: false
  },
  onDone: require('fail-nicely')(run)
});

function run (regl) {
  var w;
  var h;

  var textures = []
  var states = []

  var state = {
    rule: 30,
    initialization: 'white',
    speed: 3,
    scale: 1,
  };
  var controlRoot = document.createElement('div');
	document.body.appendChild(createControls(null, controlRoot));


  var rulefield = window.innerWidth < 800 ? {
    label: 'rule', type: 'text', initial: state.rule, placeholder: '0-255'
  } : {
    label: 'rule', type: 'range', min: 0, max: 255, step: 1, initial: state.rule,
  }
  require('control-panel')([
    rulefield,
    {label: 'initialization', type: 'select', options: ['white', 'black', 'random'], initial: state.initialization},
    {label: 'speed', type: 'range', min: 1, max:10, initial: state.speed, step: 1},
    {label: 'scale', type: 'range', min: 1, max:4, initial: state.scale, step: 1},
  ], {
    root: controlRoot,
    width: Math.min(400, window.innerWidth),
  }).on('input', data => {
    Object.assign(state, data);
    state.rule = parseInt(data.rule);
    computeRuleData();
    resize();
  });

  var ruleData1 = new Float32Array(4);
  var ruleData2 = new Float32Array(4);

  computeRuleData();

  function computeRuleData () {
    var ruleData = new Float32Array(8).fill(-1);
    var mask = new Array(8).fill(0).map((d, i) => 1 << (7 - i));
    var ptr = ptr;
    var value0 = 4 / 7;
    var value1 = 0;
    var ones = 0;
    var zeros = 0;

    for (var i = 0; i < 8; i++) {
      if (state.rule & mask[i]) {
        ruleData[i] = 1;
        ones++;
      } else {
        ruleData[i] = 0;
        zeros++;
      }
    }
    var zeroNum = 0;
    var oneNum = 1;
    for (var i = 0; i < 8; i++) {
      if (ruleData[i] < 0.5) {
        ruleData[i] = (zeroNum++ / zeros) * 0.5;
      } else {
        ruleData[i] = 0.5 + (oneNum++ / ones) * 0.5;
      }
    }
    ruleData1 = ruleData.subarray(0, 4);
    ruleData2 = ruleData.subarray(4, 8);
  }

  function resize () {
    w = Math.floor(regl._gl.canvas.width / state.scale);
    h = Math.floor(regl._gl.canvas.height / state.scale);

    var initial = new Uint8Array(w * h * 4);
    switch(state.initialization) {
      case 'white':
        initial.fill(Math.floor(0));
        initial[2 * w] = initial[2 * w + 1] = initial[2 * w + 2] = 255;
        break;
      case 'black':
        initial.fill(0);
        initial.subarray(0, w * 4).fill(255);
        initial[2 * w] = initial[2 * w + 1] = initial[2 * w + 2] = 0;
        break;
      case 'random':
        initial = initial.fill(0);
        for (var i = 0; i < w * 4; i++) {
          initial[i] = Math.max(0, Math.min(255, Math.random() * 256));
        }
        break;
    }

    textures = [0, 1].map(i => (textures[i] || regl.texture)({
      data: initial,
      flipY: true,
      min: 'nearest',
      mag: 'nearest',
      width: w,
      height: h,
    }));

    states = [0, 1].map(i => (states[i] || regl.framebuffer)({color: textures[i]}));

    scanline = 1;
  }

  var pbut = 0;
  require('mouse-change')(regl._gl.canvas, function (buttons, x, y, mods) {
    if (buttons && !pbut) {
      var canvas = regl._gl.canvas;
      var width = canvas.clientWidth;
      var height = canvas.clientHeight;
      var xx = x / width * 2.0 - 1.0;
      var yy = (1.0 - y / height) * 2.0 - 1.0;
      var value;
      states[0].use(() => {
        value = regl.read({
          x: Math.max(0, Math.min(w - 1, Math.floor(x / width * w))),
          y: Math.max(0, Math.min(h - 1, Math.floor((1.0 - y / height) * h))),
          width: 1,
          height: 1
        })[0] / 255;
      });
      dropAPoint({point: [xx, yy], dst: states[0], value: 1.0 - value});
      scanline = Math.floor(y / height * canvas.height / state.scale) + 1;
    }
    pbut = buttons;
  });

  var dropAPoint = regl({
    vert: `
      precision mediump float;
      varying vec2 uv;
      uniform vec2 uPoint;
      void main () {
        uv = uPoint * 0.5 + 0.5;
        gl_Position = vec4(uPoint, 0, 1);
        gl_PointSize = 1.0;
      }
    `,
    frag: `
      precision mediump float;
      varying vec2 uv;
      uniform float uValue;
      void main () {
        gl_FragColor = vec4(vec3(uValue), 1.0);
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
    frag: glsl`
      precision mediump float;
      #pragma glslify: colormap = require(glsl-colormap/bathymetry)
      varying vec2 uv;
      uniform sampler2D src;
      void main () {
        float value = texture2D(src, uv).r;
        gl_FragColor = vec4(colormap(value < 0.5 ? value * 0.25 : value).xyz * 1.0, 1.0);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {src: regl.prop('src')},
    depth: {enable: false},
    count: 3
  });

  var copyScanline = regl({
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
      uniform sampler2D uSrc;
      void main () {
        gl_FragColor = texture2D(uSrc, uv);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {uSrc: regl.prop('src')},
    scissor: {
      enable: true,
      box: {x: 0, y: (ctx, props) => h - 1 - props.scanline, width: () => w, height: 1}
    },
    framebuffer: regl.prop('dst'),
    depth: {enable: false},
    count: 3
  });
  
  var computeScanline = regl({
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
      uniform vec4 uRuleData1, uRuleData2;
      void main () {
        float left = texture2D(uSrc, mod(vUv + uResolution * vec2(-1.0, 1.0), vec2(1))).x;
        float center = texture2D(uSrc, mod(vUv + uResolution * vec2(0.0, 1.0), vec2(1))).x;
        float right = texture2D(uSrc, mod(vUv + uResolution * vec2(1.0, 1.0), vec2(1))).x;
        
        float value;
        if (left > 0.5) {
          if (center > 0.5) {
            value = right > 0.5 ? uRuleData1.x : uRuleData1.y;  // 111 110
          } else {
            value = right > 0.5 ? uRuleData1.z : uRuleData1.w; // 101 100
          }
        } else {
          if (center > 0.5) {
            value = right > 0.5 ? uRuleData2.x: uRuleData2.y; // 011 010
          } else {
            value = right > 0.5 ? uRuleData2.z: uRuleData2.w;  // 001 000
          }
        }
        gl_FragColor = vec4(vec3(value), 1.0);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      uSrc: regl.prop('src'),
      uResolution: ctx => [1 / ctx.framebufferWidth, 1 / ctx.framebufferHeight],
      uRuleData1: () => ruleData1,
      uRuleData2: () => ruleData2,
    },
    scissor: {
      enable: true,
      box: {x: 0, y: (ctx, props) => h - 1 - props.scanline, width: () => w, height: 1}
    },
    framebuffer: regl.prop('dst'),
    depth: {enable: false},
    count: 3
  });

  var shift = regl({
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
      uniform sampler2D uSrc;
      uniform vec2 uResolution;
      uniform float uShift;
      void main () {
        gl_FragColor = texture2D(uSrc, uv + vec2(0.0, uResolution.y * uShift));
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      uSrc: regl.prop('src'),
      uShift: regl.prop('shift'),
      uResolution: ctx => [1 / ctx.framebufferWidth, 1 / ctx.framebufferHeight],
    },
    framebuffer: regl.prop('dst'),
    depth: {enable: false},
    count: 3
  });

  resize();

  window.addEventListener('resize', resize);

  regl._gl.canvas.addEventListener('touchmove', function (ev) {
    ev.preventDefault();
  });

  regl._gl.canvas.addEventListener('touchstart', function (ev) {
    ev.preventDefault();
  });

  regl._gl.canvas.addEventListener('mousemove', function (ev) {
    ev.preventDefault();
  });

  var scanline = 1;
  var loop = regl.frame(({tick}) => {
    var target = h;
    if (scanline >= h) {
      shift({
        src: states[0],
        dst: states[1],
        shift: -state.speed,
      });

      var tmp = states[1];
      states[1] = states[0];
      states[0] = tmp;

      scanline -= state.speed * 2;
    } else {
      target = scanline + state.speed;
    }

    while (scanline < target) {
      computeScanline({src: states[0], dst: states[1], scanline: scanline});
      copyScanline({src: states[1], dst: states[0], scanline: scanline});
      scanline++;
    }

    drawToScreen({src: states[0]});
  });
}
