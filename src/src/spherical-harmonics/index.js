const flatten = require('lodash/flatten');
const attachInteractions = require('./interactions');
const glsl = require('glslify');
const createCamera = require('inertial-turntable-camera');
const icosphere = require('icosphere')(5);
const vec3scale = require('gl-vec3/scale');
const pack = require('array-pack-2d');
const normals = require('angle-normals');

require('resl')({
  manifest: {matcap: {type: 'image', src: 'images/matcap-grey-skin.jpg'}},
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
  var N = Math.sqrt((2.0 * l + 1.0) * 0.25 / Math.PI * factorial(l - m) / factorial(l + m));
  return N * P(l, m, Math.cos(theta)) * Math.cos(m * phi);
}

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
    distance: 5,
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

  attachInteractions(regl, camera);
  window.camera = camera;

  const drawHarmonic = regl({
    vert: `
      precision mediump float;
      attribute vec3 position, normal;
      uniform mat4 projection, view, viewinv;
      attribute float Y;
      uniform vec3 eye;
      uniform float m, l, scale, xfov;
      varying float vY;
      varying vec3 vN, vEyeDirection;
      void main () {
        vY = Y;
        vec4 p = vec4(position * scale, 1.0) + viewinv * vec4(m * xfov, -l, 0.0, 0.0);
        vEyeDirection = normalize(p.xyz - eye);
        vN = mat3(view) * normal;
        vEyeDirection = mat3(view) * vEyeDirection;
        gl_Position = projection * view * p;
      }
    `,
    frag: glsl`
      precision mediump float;
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
      m: (ctx, props) => props.m / 5,
      l: (ctx, props) => (props.l - 2.5) / 2.5 * 1.65,
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

      regl.clear({color: [0.12, 0.12, 0.12, 1], depth: 1});
      drawBg();
      drawHarmonic(harmonics);
    });
	});
  
}

