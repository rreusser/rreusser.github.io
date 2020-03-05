const katex = require('katex');
const flatten = require('lodash/flatten');
const attachInteractions = require('./interactions');
const glsl = require('glslify');
const createCamera = require('inertial-turntable-camera');
const icosphere = require('icosphere')(5);
const vec3scale = require('gl-vec3/scale');
const vec3transformMat4 = require('gl-vec3/transformMat4');
const vec4transformMat4 = require('gl-vec4/transformMat4');
const pack = require('array-pack-2d');
const normals = require('angle-normals');
const fs = require('fs');

var css = fs.readFileSync(__dirname + '/../../node_modules/katex/dist/katex.min.css', 'utf8');

require('insert-css')(css);

require('resl')({
  manifest: {matcap: {type: 'image', src: 'static/matcap-grey-skin.jpg'}},
  onError: console.error,
  onDone: function (assets) {
    require('regl')({
      pixelRatio: Math.min(1.5, window.devicePixelRatio),
      attributes: {antialias: true},
      onDone: require('fail-nicely')(regl => run(regl, assets))
    });
  },
});

function factorial(num) {
  var rval=1;
  for (var i = 2; i <= num; i++) rval *= i;
  return rval;
}

function Y (l, m, theta, phi) {
  if (m < 0) phi += Math.PI * 0.5 / m;
  var N = Math.sqrt((2.0 * l + 1.0) * 0.25 / Math.PI * factorial(l - m) / factorial(l + m));
  return N * P(l, m, Math.cos(theta)) * Math.cos(m * phi);
}

var attr = document.createElement('a');
attr.textContent = 'Recreated from Inigo Quizles\' figure on Wikipedia. See README in source directory for more details.';
attr.href = 'https://en.wikipedia.org/wiki/Spherical_harmonics#/media/File:Spherical_Harmonics.png';
attr.style.position = 'fixed';
attr.style.bottom = '5px';
attr.style.left = '5px';
attr.style.zIndex = 10;
attr.style.fontSize = '12px';
attr.style.color = '#fff';
attr.style.textShadow = '0px 0px 2px rgba(0, 0, 0,1.0)';
document.body.appendChild(attr);

if (window.innerWidth > 640) {
  var eqnDiv = document.createElement('a');
  eqnDiv.href = "https://en.wikipedia.org/wiki/Spherical_harmonics";
  eqnDiv.style.position = 'fixed';
  eqnDiv.style.top = '10px';
  eqnDiv.style.left = '10px';
  eqnDiv.style.zIndex = 10;
  eqnDiv.style.fontSize = '16px';
  eqnDiv.style.color = '#fff';
  eqnDiv.style.textShadow = '0px 0px 2px rgba(0, 0, 0,1.0)';
  document.body.appendChild(eqnDiv);

  eqnDiv.innerHTML = katex.renderToString('Y_{\\ell }^{m}(\\theta ,\\varphi )={\\sqrt {{(2\\ell +1) \\over 4\\pi }{(\\ell -m)! \\over (\\ell +m)!}}}\\,P_{\\ell }^{m}(\\cos {\\theta })\\,e^{im\\varphi }');
}

var textDiv = document.createElement('div');
textDiv.style.position = 'fixed';
textDiv.style.top = '0';
textDiv.style.left = '0';
textDiv.style.width = '100%';
textDiv.style.height = '100%';
textDiv.style.zIndex = 10;
textDiv.style.pointerEvents = 'none';
textDiv.style.userSelect = 'none';
document.body.appendChild(textDiv);

function P (l, m, x) {
  var x2 = x * x;
  switch (l) {
  case 0:
    return 1;
  case 1:
    switch (m) {
      case -1: return -0.5 * P(1, 1, x);
      case 0: return x;
      case 1: return Math.sqrt(1 - x2);
    }
  case 2:
    switch (m) {
      case -2: return 1.0 / 24.0 * P(2, 2, x);
      case -1: return -1.0 / 6.0 * P(2, 1, x);
      case 0: return 0.5 * (3.0 * x2 - 1.0);
      case 1: return -3.0 * x * Math.sqrt(1 - x2);
      case 2: return 3.0 * (1.0 - x2);
    }
  case 3:
    switch (m) {
      case -3: return -1.0 / 720.0 * P(3, 3, x);
      case -2: return 1.0 / 120.0 * P(3, 2, x);
      case -1: return -1.0 / 12.0 * P(3, 1, x);
      case 0: return 0.5 * (5.0 * x2 - 3.0) * x;
      case 1: return -1.5 * (5.0 * x2 - 1.0) * Math.sqrt(1.0 - x2);
      case 2: return 15.0 * x * (1.0 - x2);
      case 3: return -15.0 * Math.pow(1.0 - x2, 1.5);
    }
  case 4:
    switch (m) {
      case -4: return 1.0 / 40320.0 * P(4, 4, x);
      case -3: return -1.0 / 5040.0 * P(4, 3, x);
      case -2: return 1.0 / 360.0 * P(4, 2, x);
      case -1: return -1.0 / 20.0 * P(4, 1, x);
      case 0: return 1.0 / 8.0 * ((35.0 * x2 - 30.0) * x2 + 3.0);
      case 1: return -2.5 * (7.0 * x2 - 3.0) * x * Math.sqrt(1.0 - x2);
      case 2: return 7.5 * (7.0 * x2 - 1.0) * (1.0 - x2);
      case 3: return -105.0 * x * Math.pow(1.0 - x2, 1.5);
      case 4: return 105.0 * (1.0 - x2) * (1.0 - x2);
    }
  case 5:
    switch (m) {
      case -5: return P(5, 5, x) * Math.pow(-1, 5) * factorial(l + m) / factorial(l - m);
      case -4: return P(5, 4, x) * Math.pow(-1, 4) * factorial(l + m) / factorial(l - m);
      case -3: return P(5, 3, x) * Math.pow(-1, 3) * factorial(l + m) / factorial(l - m);
      case -2: return P(5, 2, x) * Math.pow(-1, 2) * factorial(l + m) / factorial(l - m);
      case -1: return P(5, 1, x) * Math.pow(-1, 1) * factorial(l + m) / factorial(l - m);
      case 0: return 1.0 / 8.0 * x * ((63.0 * x2 - 70.0) * x2 + 15.0);
      case 1: return -15.0 / 8.0 * ((21.0 * x2 - 14.0) * x2 + 1.0) * Math.sqrt(1.0 - x2);
      case 2: return -105.0 * 0.5 * x * (x - 1.0) * (x + 1.0) * (3.0 * x2 - 1.0);
      case 3: return 105.0 * 0.5 * (x - 1.0) * (x + 1.0) * (3.0 * x - 1.0) * (3.0 * x + 1.0) * Math.sqrt(1 - x2);
      case 4: return 945.0 * (x - 1.0) * (x - 1.0) * x * (x + 1.0) * (x + 1.0);
      case 5: return -945.0 * Math.pow(x - 1.0, 2) * Math.pow(x + 1.0, 2.0) * Math.sqrt(1 - x2);
    }
  default:
    throw new Error('Associated Legendre polynomial P(m, l, x) not implemented for m > 5');
  }
}

function run (regl, assets) {
  const camera = createCamera({
    aspectRatio: window.innerWidth / window.innerHeight,
    distance: 6,
    center: [0, 0, 0],
  });

  const setCameraUniforms = regl({
    uniforms: {
      projection: (ctx, camera) => camera.state.projection,
      view: (ctx, camera) => camera.state.view,
      viewinv: (ctx, camera) => camera.state.viewInv,
      eye: (ctx, camera) => camera.state.eye,
    }
  });

  function createText (l, m, str, styles) {
    var span = document.createElement('span');
    textDiv.appendChild(span);
    span.innerHTML = str;
    span.style.position = 'absolute';
    span.style.transform = 'translate(50%, 50%)';
    span.style.fontSize = window.innerWidth > 640 ? '14px' : '11px';
    span.style.color = '#fff';
    span.style.textShadow = '0px 0px 2px rgba(0, 0, 0,1.0)';
    Object.assign(span.style, styles || {});
    return span;
  }

  function createLabels () {
    var labels = [];
    for (var m = -5; m <= 5; m++) {
      labels.push({
        el: createText(5, m, katex.renderToString('m = ' + m)),
        l: 5.85,
        m: m,
        justify: 'translate3d(-20%, -50%, 0) rotate(30deg)',
      });
    }
    for (var l = 0; l <= 5; l++) {
      labels.push({
        el: createText(l, m, katex.renderToString('l = ' + l)),
        l: l,
        m: l + 1,
        justify: 'translate3d(0, -50%, 0)',
      });
    }
    return labels;
  }

  function transformM (m) {
    return m / 5.0 * 2.0;
  }

  function transformL (l) {
    return (l - 2.5) / 2.5 * 1.65;
  }

  function toScreen (xy, l, m) {
    xy[0] = transformM(m);
    xy[1] = transformL(5 - l);
    xy[2] = 0;
    xy[3] = 0;
    vec4transformMat4(xy, xy, camera.state.viewInv);
    xy[3] = 1;
    vec4transformMat4(xy, xy, camera.state.view);
    vec3transformMat4(xy, xy, camera.state.projection);
  }

  function placeLabels (labels) {
    var xy = [0, 0, 0];
    for (var i = 0; i < labels.length; i++) {
      toScreen(xy, labels[i].l, labels[i].m);
      labels[i].el.style.transform = 'translate3d('+(
          (0.5 + 0.5 * xy[0]) * window.innerWidth
        )+'px,'+(
          (0.5 - 0.5 * xy[1]) * window.innerHeight
        )+'px, 0) ' + labels[i].justify;
    }
  }

  var labels = createLabels();
  placeLabels(labels);


  attachInteractions(regl, camera);
  window.camera = camera;

  const drawHarmonic = regl({
    vert: `
      precision highp float;
      attribute vec3 position, normal;
      uniform mat4 projection, view, viewinv;
      attribute float Y;
      uniform vec3 eye;
      uniform float m, l, scale, xfov;
      varying float vY;
      varying vec3 vN, vEyeDirection;
      void main () {
        vY = Y;
        vec4 p = vec4(position * scale, 1.0) + viewinv * vec4(m, -l, 0.0, 0.0);
        vEyeDirection = normalize(p.xyz - eye);
        vN = mat3(view) * normal;
        vEyeDirection = mat3(view) * vEyeDirection;
        gl_Position = projection * view * p;
      }
    `,
    frag: glsl`
      precision highp float;
      #pragma glslify: matcap = require(matcap)
      uniform sampler2D image;
      varying float vY;
      varying vec3 vN, vEyeDirection;
      void main () {
        vec3 tint = vY < 0.0 ? vec3(0.8, 0.7, 0.2) : vec3(0.4, 0.55, 0.7);
        tint *= 0.2 + 0.8 * smoothstep(0.0, 1.0, abs(0.2 + 1.75 * vY * sign(vY)));
        float glow = 1.0 - dot(-vEyeDirection, vN) * 0.5;
        vec3 light = texture2D(image, matcap(vEyeDirection, vN)).rgb;
        vec3 color = (light * 0.7 + 0.3) * glow * tint * 2.3;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    attributes: {
      position: regl.prop('positions'),
      normal: regl.prop('normals'),
      Y: regl.prop('Y'),
    },
    uniforms: {
      m: (ctx, props) => transformM(props.m),
      l: (ctx, props) => transformL(props.l),
      scale: 0.38,
      xfov: (ctx, props) => Math.atan(camera.params.fovY * 0.5) * 2.0 * 2.3 * ctx.viewportWidth / ctx.viewportHeight,
      image: regl.texture({data: assets.matcap, flipY: true}),
    },
    elements: icosphere.cells,
    count: icosphere.cells.length * 3
  });

  const drawBg = regl({
    vert: `
      precision mediump float;
      attribute vec2 xy;
      varying vec2 uv;
      void main () {
        uv = xy;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: `
      precision mediump float;
      varying vec2 uv;
      void main () {
        gl_FragColor = vec4(0.4 + 0.2 * vec3(1.0 - dot(uv, uv)), 1);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    depth: {enable: false},
    count: 3
  });

  window.addEventListener('resize', function () {
    width = window.innerWidth;
    height = window.innerHeight;
    camera.resize(width / height);
  }, false);

  const harmonics = flatten(Array(6).fill(0).map((x, l) => Array(2 * l + 1).fill(0).map((x, i) => i - l).map(m => {
    var Yvalues = icosphere.positions.map(x => Y(l, m, Math.acos(x[1]), Math.atan2(x[2], x[0])));
    var p = Yvalues.map((y, i) => vec3scale([], icosphere.positions[i], Math.abs(y)));
    var n = normals(icosphere.cells, p);
    return {
      m: m,
      l: l,
      Y: Yvalues,
      normals: regl.buffer(n),
      positions: regl.buffer(p)
    };
  })));

  regl.frame(() => {
    camera.tick({
      near: camera.params.distance * 0.01,
      far: camera.params.distance * 2 + 200,
    })

    setCameraUniforms(camera, () => {
      if (!camera.state.dirty) return;

      placeLabels(labels);
      regl.clear({color: [0.12, 0.12, 0.12, 1], depth: 1});
      drawBg();
      drawHarmonic(harmonics);
    });
  });
  
}

