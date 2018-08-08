'use strict';

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

  function resize () {
    w = Math.floor(regl._gl.canvas.width);
    h = Math.floor(regl._gl.canvas.height);

    var initial = new Uint8Array(w * h * 4).fill(Math.floor(0.42 * 255));
    initial[2 * w] = 255;
    initial[2 * w + 1] = 255;
    initial[2 * w + 2] = 255;

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
  resize();

  window.addEventListener('resize', resize);

  var mouseCoord = new Float32Array(2);
  var pointBuf = regl.buffer(mouseCoord);
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
      scanline = Math.floor(y / height * canvas.height) + 1;
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
        gl_PointSize = 2.0;
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
      uDst: states[0],
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
      void main () {
        float left = texture2D(uSrc, mod(vUv + uResolution * vec2(-1.0, 1.0), vec2(1))).x;
        float center = texture2D(uSrc, mod(vUv + uResolution * vec2(0.0, 1.0), vec2(1))).x;
        float right = texture2D(uSrc, mod(vUv + uResolution * vec2(1.0, 1.0), vec2(1))).x;
        
        float value;
        if (left > 0.5) {
          if (center > 0.5) {
            value = right > 0.5 ? 0.0 : 0.14;  // 111 110
          } else {
            value = right > 0.5 ? 0.28 : 0.56; // 101 100
          }
        } else {
          if (center > 0.5) {
            value = right > 0.5 ? 0.71 : 0.86; // 011 010
          } else {
            value = right > 0.5 ? 1.0 : 0.42;  // 001 000
          }
        }

        gl_FragColor = vec4(vec3(value), 1.0);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {
      uSrc: regl.prop('src'),
      uResolution: ctx => [1 / ctx.framebufferWidth, 1 / ctx.framebufferHeight],
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

  var scanline = 1;
  var stride = 2;
  var loop = regl.frame(({tick}) => {
    var target = h;
    if (scanline >= h) {
      shift({
        src: states[0],
        dst: states[1],
        shift: -stride,
      });

      var tmp = states[1];
      states[1] = states[0];
      states[0] = tmp;

      scanline -= stride * 2;
    } else {
      target = scanline + stride;
    }

    while (scanline < target) {
      computeScanline({src: states[0], dst: states[1], scanline: scanline});
      copyScanline({src: states[1], dst: states[0], scanline: scanline});
      scanline++;
    }

    drawToScreen({src: states[0]});
  });
}
