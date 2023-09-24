'use strict';

var glsl = require('glslify');
var createControls = require('./controls');
const css = require('insert-css');

css(`
.charge {
  position: fixed;
  z-index: 1;
  width: 20px;
  height: 20px;
  border-radius: 20px;
  transform: translate(-50%, -50%);
  text-align: center;
  line-height: 17px;
  vertical-align: middle;
  color: white;
  cursor: move;
  font-size: 25px;
  user-select: none;
  box-shadow: 0 0 5px rgb(255 255 255/100%);
}
.charge.positive:before {
  content: '+';
}
.charge.positive {
  background-color: #35f;
}
.charge.negative:before {
  content: '-';
}
.charge.negative {
  background-color: #f35;
}
`);

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
    dirty: true,
    alpha: 1.0,
    steps: 4,
    width: 3.5,
    resolution: 128 
  };

  var screenWidth, screenHeight, h, w, licRadius, dt, alpha;
  var textureLUTBuffer, licAccumulator, licAccumulatorFbo;

  function computeConstants () {
    screenWidth = regl._gl.canvas.width;
    screenHeight = regl._gl.canvas.height;
    h = state.resolution;
    w = Math.floor(h * screenWidth / screenHeight);;
    licRadius = 0.35;
    dt = licRadius / state.steps * 0.13;
    alpha = 0.6 / w / state.steps / licRadius / state.width * screenWidth;
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
    state.dirty = true;
    computeConstants();
    resize();
  });

  var controlRoot = document.createElement('div');
  document.body.appendChild(createControls(null, controlRoot));

  require('control-panel')([
    {label: 'alpha', type: 'range', min: 0, max: 2, initial: state.alpha, step: 0.01},
    {label: 'steps', type: 'range', min: 2, max: 20, initial: state.steps, step: 1},
    {label: 'resolution', type: 'range', min: 8, max: 512, initial: state.resolution, step: 1},
    {label: 'width', type: 'range', min: 1.0, max: 4, initial: state.width, step: 0.1},
  ], {
    root: controlRoot
  }).on('input', data => {
    state.dirty = true;
    var needsResize = data.resolution !== state.resolution;
    Object.assign(state, data)
    computeConstants();
    if (needsResize) resize();
  });

  function onMouseMove (ev) {
    state.center = [
      ((ev.clientX / window.innerWidth) * 2.0 - 1.0) * window.innerWidth / window.innerHeight,
      (1.0 - ev.clientY / window.innerHeight) * 2.0 - 1.0
    ];
    state.dirty = true;
  }

  onMouseMove({
    clientX: window.innerWidth * 0.25,
    clientY: window.innerHeight * 0.5,
  });

  regl._gl.canvas.addEventListener('touchmove', function (ev) {
    if (ev.touches.length !== 1) return;
    ev.preventDefault();
    onMouseMove(ev.touches[0]);
  });

  regl._gl.canvas.addEventListener('touchstart', function (ev) {
    if (ev.touches.length !== 1) return;
    ev.preventDefault();
    onMouseMove(ev.touches[0]);
  });

  regl._gl.canvas.addEventListener('mousemove', onMouseMove);

  const charges = [];
  const chargeUniforms = [];
  const NUM_CHARGES = 16;
  const chargeDivs = [];
  for (let i = 0; i < NUM_CHARGES; i++) {
    const position = [
      (Math.floor(i / 2) / (0.5 * NUM_CHARGES - 1) - 0.5) * 0.7,
      (i % 2 ? -0.15 : 0.15),
    ];

    const charge = i % 2 ? 1 : -1;
    charges.push([...position, charge]);
    chargeUniforms[`charges[${i}]`] = regl.prop(`charges[${i}]`);

    const aspect = window.innerWidth / window.innerHeight;
    const div = document.createElement('div');
    div.classList.add('charge');
    div.classList.add(charge > 0 ? 'positive' : 'negative');
    div.style.left = `${(0.5 + 0.5 * position[0] / aspect) * window.innerWidth}px`;
    div.style.top = `${(0.5 - 0.5 * position[1]) * window.innerHeight}px`;
    div.setAttribute('data-charge-index', i);
    document.body.appendChild(div);
    chargeDivs.push(div);
  }

  let curIndex = -1;
  function onDragStart (event) {
    if (!event.target.classList.contains('charge')) return;
    curIndex = event.target.getAttribute('data-charge-index');
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
  }

  window.addEventListener('resize', function () {
    for (let i = 0; i < NUM_CHARGES; i++) {
      positionCharge(i);
    }
  });

  function positionCharge(index) {
    const div = chargeDivs[index];
    const aspect = window.innerWidth / window.innerHeight;
    div.style.left = `${(0.5 + 0.5 * charges[index][0] / aspect) * window.innerWidth}px`;
    div.style.top = `${(0.5 - 0.5 * charges[index][1]) * window.innerHeight}px`;
  }

  function onDragMove (event) {
    console.log(event);
    const aspect = window.innerWidth / window.innerHeight;
    charges[curIndex][0] = (event.clientX / window.innerWidth * 2 - 1) * aspect;
    charges[curIndex][1] = 1 - 2 * event.clientY / window.innerHeight;
    positionCharge(curIndex);
    state.dirty = true;
  }

  function onDragEnd (event) {
    curIndex = -1;

    window.removeEventListener('mouseup', onDragEnd);
    window.removeEventListener('mousemove', onDragMove);
  }

  window.addEventListener('mousedown', onDragStart);

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
    frag: `
      precision highp float;

      varying vec2 uv;
      uniform sampler2D src;
      uniform float uDt;
      uniform float uAspect, uNoiseScale, uNoiseSpeed, uTime, uCylinderRadius;
      uniform vec2 uCenter;
      uniform vec3 charges[${NUM_CHARGES}];

      vec2 dfdt (vec2 f) {
        vec2 force = vec2(0);
        for (int i = 0; i < ${NUM_CHARGES}; i++) {
          vec2 dx = f - charges[i].xy;
          float r2 = dot(dx, dx);
          force += charges[i].z * vec2(dx.y, -dx.x) / r2;
        }
        float l = dot(force, force);
        return force / pow(l, 0.4) * 0.7;
      }

      vec4 deriv4 (vec4 f) {
        return vec4(dfdt(f.xy), -dfdt(f.zw));
      }

      void main () {
        // Sample the velocity
        vec4 f = texture2D(src, uv);

        // Convert from texture coords to view coords
        f = f * 2.0 - 1.0;
        f.xz *= uAspect;

        vec4 fh = f + uDt * 0.5 * deriv4(f);
        gl_FragColor = f + uDt * deriv4(fh);

        // Convert back to texture coords
        gl_FragColor.xz /= uAspect;
        gl_FragColor = 0.5 * gl_FragColor + 0.5;
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: Object.assign({
      uTime: ctx => ctx.time,
      uAspect: () => screenWidth / screenHeight,
      src: regl.prop('src'),
      uResolution: ctx => [1 / ctx.framebufferWidth, 1 / ctx.framebufferHeight],
      uDt: dt,
      uCenter: () => state.center,
    }, chargeUniforms),
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
        gl_FragColor = (uv + uResolution * vec2(
          random(gl_FragCoord.xy),
          random(gl_FragCoord.xy + 0.5)
        )).xyxy;
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
        vX = mix(uX.x, uX.y, mix(1.0 - aLine.y, aLine.y, uDir)) * (uDir * 2.0 - 1.0) + aLUT.w;
      }
    `,
    frag: `
      precision highp float;
      varying float vAlpha, vLineX, vX;
      uniform float uAlpha, uFeather;
      #define PI 3.14159265

      highp float random(vec2 co) {
        highp float a = 12.9898;
        highp float b = 78.233;
        highp float c = 43758.5453;
        highp float dt= dot(co.xy ,vec2(a,b));
        highp float sn= mod(dt,3.14);
        return fract(sin(sn) * c);
      }

      void main () {
        float r = random(gl_FragCoord.xy);

        gl_FragColor = vec4(vec3(1), uAlpha * vAlpha * (
          smoothstep(1.0, 1.0 - uFeather, vLineX) *
          smoothstep(-1.0, -1.0 + uFeather, vLineX)
        ) * r);
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
      #pragma glslify: colormap = require(glsl-colormap/bone)
      varying vec2 uv;
      uniform sampler2D src;
      void main () {
        gl_FragColor = colormap(pow(1.0 - texture2D(src, uv).x, 2.0));
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    uniforms: {src: regl.prop('src')},
    depth: {enable: false},
    count: 3
  });

  function kernel (x) {
    return Math.exp(-Math.pow(x / 0.5, 2.0) * 0.5);
  }
  
  let loop = regl.frame(({tick}) => {
    try {
      if (!state.dirty) return;
      //if (tick % 3 !== 1) return;
      //if (!state.dirty) return;
      licAccumulatorFbo.use(() => regl.clear({color: [0, 0, 0, 1]}));
      initialize({dst: stateFbos[0]});

      licAccumulatorFbo.use(() => {
        for (var i = 0; i < state.steps; i++) {
          var even = i % 2;
          var odd = (i + 1) % 2;

          integrate({
            src: states[even],
            dst: stateFbos[odd],
            charges
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

      state.dirty = false;
    } catch (e) {
      loop.cancel();
      console.error(e);
    }
  });
}
