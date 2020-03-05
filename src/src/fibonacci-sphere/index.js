'use strict';
var createCamera = require('./regl-turntable-camera');
var createInteractions = require('./interactions');
var PHI = 0.5 * (1 + Math.sqrt(5));
var qhull = require('quickhull3d');
var unindex = require('unindex-mesh');
var createWireframe = require('glsl-solid-wireframe');
var createREGL = require('regl');
var createRESL = require('resl');


createREGL({
  pixelRatio: Math.min(window.devicePixelRatio, 1.5),
  optionalExtensions: ['oes_standard_derivatives'],
  attributes: {antialias: false},
  onDone: require('fail-nicely')(function (regl) {
    createRESL({
      manifest: {
        matcap: {src: 'static/crane-glossy.jpg', type: 'image'}
      },
      onDone: assets => run(regl, assets),
      onError: require('fail-nicely')()
    });
  })
});

var A = [1, 4];
for (var i = 0; i < 40; i++) {
  A[i + 2] = A[i] + A[i + 1];
}

function createSphere (n) {
  var gN = 3 - PHI;
  var k = Math.floor(Math.log(n / 1.5) / Math.log(PHI));
  if (k % 2 === 1) {
    var j = Math.round((k + 7) * 0.5);
    gN = A[j] / A[j - 1];
  }
  return new Array(n).fill(0).map((d, i) => {
    var tu = (i + 0.5) / n;
    var tv = i / gN;
    var theta = Math.acos(2 * tu - 1.0) - Math.PI * 0.5;
    var phi = 2.0 * Math.PI * tv;
    return [
      Math.cos(theta) * Math.cos(phi),
      Math.sin(theta),
      Math.cos(theta) * Math.sin(phi),
    ];
  });
}

function run (regl, assets) {
  var camera = createCamera(regl, {
    distance: 4,
    phi: 0.3
  });

  createInteractions(camera);

  var matcap = regl.texture({
    data: assets.matcap,
    mag: 'linear',
    min: 'linear',
    flipY: true
  });
  //var state = {n: 100};

  var controlRoot = document.createElement('div');
  document.body.appendChild(require('./controls')(null, controlRoot));

  /*
  require('control-panel')([
    {label: 'n', type: 'range', min: 10, max: 1000, initial: state.n, step: 1},
  ], {root: controlRoot}).on('input', data => {
    Object.assign(state, data);
    remesh(state.n);
  });
  */

  var verticesBuffer, barycentricBuffer, wireframe;
  var barycentricBuffer;

  function remesh (n) {
    var vertices = createSphere(n);
    wireframe = createWireframe({
      positions: vertices,
      cells: qhull(vertices),
    });
    verticesBuffer = (verticesBuffer || regl.buffer)(wireframe.positions);
    barycentricBuffer = (barycentricBuffer || regl.buffer)(wireframe.barycentric);
    camera.taint();
  }

  var drawMesh = regl({
    vert: `
      precision highp float;
      attribute vec3 aVertex;
      attribute vec2 aBarycentric;
      uniform vec3 uEye;
      uniform mat4 uView;
      uniform mat4 uProjectionView;
      varying vec3 vVertex, vEyeDir, vNormal;
      varying vec2 vBarycentric;
      void main () {
        vVertex = aVertex;
        vNormal = aVertex;
        vEyeDir = mat3(uView) * (aVertex - uEye);
        vBarycentric = aBarycentric;
        gl_Position = uProjectionView * vec4(aVertex, 1);
      }
    `,
    frag: `
      #extension GL_OES_standard_derivatives : enable

      precision highp float;
      uniform mat4 uView;
      varying vec3 vVertex, vEyeDir, vNormal;
      varying vec2 vBarycentric;
      uniform float uLineWidth;
      uniform sampler2D uMatcap;

      vec2 matcap(vec3 eye, vec3 normal) {
        vec3 reflected = reflect(eye, normal);
        float m = 2.8284271247461903 * sqrt( reflected.z+1.0 );
        return reflected.xy / m + 0.5;
      }

      float gridFactor (vec2 vBC, float width, float feather) {
        float w1 = width - feather * 0.5;
        vec3 bary = vec3(vBC.x, vBC.y, 1.0 - vBC.x - vBC.y);
        vec3 d = fwidth(bary);
        vec3 a3 = smoothstep(d * w1, d * (w1 + feather), bary);
        return min(min(a3.x, a3.y), a3.z);
      }

      vec3 getNormal() {
        #ifndef GL_OES_standard_derivatives
          return normalize(vNormal);
        #else
          return normalize(cross(dFdx(vVertex), dFdy(vVertex)));
        #endif
      }

      void main () {
        float wire = gridFactor(vBarycentric, uLineWidth, 1.0);
        vec3 viewNormal = normalize(mat3(uView) * getNormal());
        vec2 uv = matcap(normalize(vEyeDir), viewNormal);
        vec3 color = (1.0 + 0.2 * normalize(vNormal)) * (texture2D(uMatcap, uv).rgb);
        //vec3 color = 0.5 + 1.3 * (texture2D(uMatcap, uv).rgb - 0.5);
        gl_FragColor = vec4(mix(vec3(0), color, 0.5 + 0.5 * wire), 1.0);
      }
    `,
    attributes: {
      aVertex: regl.prop('vertices'),
      aBarycentric: regl.prop('barycentric'),
    },
    uniforms: {
      uLineWidth: (ctx, props) => ctx.pixelRatio * props.lineWidth,
      uMatcap: matcap,
    },
    count: (ctx, props) => props.count
  });

  var drawBg = regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      varying vec2 uv;
      void main () {
        uv = xy * 0.5;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: `
      precision highp float;

      float random(vec2 co) {
        float a = 12.9898;
        float b = 78.233;
        float c = 43758.5453;
        float dt = dot(co.xy, vec2(a, b));
        float sn = mod(dt, 3.14);
        return fract(sin(sn) * c);
      }

      varying vec2 uv;
      void main () {
        vec2 uvrel = uv + vec2(0.0, 0.15);
        vec3 color = mix(
          vec3(150.0, 189.0, 206.0) / 255.0,
          vec3(89.0, 122.0, 141.0) / 255.0,
          3.0 * dot(uvrel, uvrel) + random(gl_FragCoord.xy) * 0.2
        );
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    depth: {enable: false},
    count: 3
  });
  
  regl.frame(({time}) => {
    remesh(4 + Math.floor((0.5 - 0.5 * Math.cos(time * 0.1)) * 10000));

    camera.tick({
      dTheta: -0.001
    });
    camera.setUniforms(() => {
      if (!camera.state.dirty) return;
      drawBg();
      drawMesh({
        vertices: verticesBuffer,
        barycentric: barycentricBuffer,
        count: wireframe.positions.length,
        lineWidth: 0.4,
      });
      
    });
  });
}
