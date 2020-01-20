'use strict';
const meshSurface = require('../../lib/mesh-surface');
const angleNormals = require('../../lib/angle-normals-packed');
const createWireframe = require('../../lib/barycentric');
const scrollyteller = require('./scrollyteller');
const sequencer = require('./sequencer');
const perspective = require('gl-mat4/perspective')
const lookAt = require('gl-mat4/lookAt')
const multiplyMat4 = require('gl-mat4/multiply');
const cross = require('gl-vec3/cross');
const normalize = require('gl-vec3/normalize');
const sub = require('gl-vec3/subtract');
const nurbs = require('nurbs');
const h = require('h');

require('regl/dist/regl.min.js')({
  pixelRatio: Math.min(window.devicePixelRatio, 1.25),
  attributes: {alpha: false, antialias: false},
  extensions: ['oes_standard_derivatives'],
  onDone: require('fail-nicely')(run),
});

function run(regl) {
  const r = u => u + 1;

  const fboDownsample = 8;
  const fboFull = regl.framebuffer({
    color: regl.texture({
      width: Math.round(regl._gl.canvas.width),
      height: Math.round(regl._gl.canvas.height),
      mag: 'linear',
      min: 'linear'
    })
  });

  const fbos = new Array(2).fill(0).map(() => regl.framebuffer({
    color: regl.texture({
      width: Math.round(regl._gl.canvas.width / fboDownsample),
      height: Math.round(regl._gl.canvas.height / fboDownsample),
      mag: 'linear',
      min: 'linear'
    })
  }));

  const mesh = meshSurface({},
    function (out, u, theta) {
      out[0] = r(u) * Math.cos(theta);
      out[1] = 2.0 * Math.sqrt(Math.abs(1.0 - r(u))) - 3;
      out[2] = r(u) * Math.sin(theta);
    }, {
      resolution: [32, 64],
      uDomain: [0, 1],
      vDomain: [-Math.PI, Math.PI],
      attributes: {
        cylindricalGridCoord: function (out, u, theta) {
          out[0] = u;
          out[1] = theta;
        },
        rectangularGridCoord: function (out, u, theta) {
          out[0] = r(u) * Math.cos(theta);
          out[1] = r(u) * Math.sin(theta);
        },
      }
    }
  );

  mesh.attributes.normals = angleNormals(mesh.cells, mesh.positions);

  const wireframe = createWireframe(mesh.cells, mesh.positions, {attributes: mesh.attributes});

  const wireframeBuffers = {
    positions: regl.buffer(wireframe.positions),
    rectangularGridCoord: regl.buffer(wireframe.attributes.rectangularGridCoord),
    cylindricalGridCoord: regl.buffer(wireframe.attributes.cylindricalGridCoord),
    barycentric: regl.buffer(wireframe.barycentric),
    normals: regl.buffer(wireframe.attributes.normals),
    cells: regl.elements(wireframe.cells),
    count: wireframe.cells.length,
    rectangularGridScaling: [1, 1],
    cylindricalGridScaling: [1.0015, 1 / Math.PI]
  };

  const drawMesh = require('./draw-mesh')(regl); 
  const drawTex = require('./draw-tex')(regl);
  const drawBlur = require('./draw-blur')(regl);

  const cameraPositionSpline = nurbs({
    points: [
      [0.001, 50, 0],
      [0.001, 50, 0],
      [0.001, 50, 0],
      [22, 12, 0],
      [22, 8, 1],
      [30, 10, 1],
      [60, 15, 1],
      [10, 8, 1],
      [-1, 5, 0],
      [0.05, -12, 0],
    ],
    boundary: 'clamped',
    degree: 4,
    checkBounds: true
  });

  const cameraTargetSpline = nurbs({
    points: [
      [0, -3, 0],
      [0, -1, 0],
      [0, 2, 0],
      [-2, 5, 0],
      [-5, -3, 0],
      [-5, -17, 0],
    ],
    boundary: 'clamped',
    degree: 4,
    checkBounds: true
  });

  var TBUF = -0.3;

  var story = sequencer({
    gridStrength: [
      {t: 1, value: 0},
      {t: 1.5, value: 1},
    ],
    wrapFactor: [
      {t: 1.0, value: 0},
      {t: 3.0 - TBUF, value: 1}
    ],
    gridPow: [
      {t: 2, value: 1},
      {t: 3 - TBUF, value: 2}
    ],
    depthFactor: [
      {t: 3, value: 0},
      {t: 4 - TBUF, value: 1}
    ],
    barycentricGridWeight: [
      {t: 4, value: 1},
      {t: 5 - TBUF, value: 0}
    ],
    bgColor: [
      {t: 5.5, value: [0.3, 0.44, 0.70]},
      {t: 6.5 - TBUF, value: [0.08, 0.08, 0.08, 1]}
    ],
    gridColor: [
      {t: 5.5, value: [0.15, 0.15, 0.15]},
      {t: 6.5 - TBUF, value: [0.8, 0.9, 1.0]},
    ],
    surfaceColor: [
      {t: 5.5, value: [0.48, 0.62, 0.28]},
      {t: 6.5 - TBUF, value: [0.08, 0.08, 0.08]}
    ],
    bloom: [
      {t: 5.5, value: 0},
      {t: 6.5 - TBUF, value: 0.3}
    ],
    randomness: [
      {t: 5.5, value: 0.1},
      {t: 6.5 - TBUF, value: 0.4}
    ],
    cylindricalFactor: [
      {t: 6, value: 1},
      {t: 7 - TBUF, value: 0}
    ],
    depthColorFactor: [
      {t: 6, value: 0},
      {t: 7 - TBUF, value: 1}
    ],
    extent: [
      {t: 7, value: 10},
      {t: 9 - TBUF, value: 50}
    ],
  }, function (state, changed) {
    dirty = true;
  });

  var dirty = true;
  var mView = new Float32Array(16);
  var mProj = new Float32Array(16);
  var mViewProj = new Float32Array(16);
  var vSky = new Float32Array([0, 1, 0]);
  var vEye = new Float32Array(3);
  var pEye = new Float32Array(3);
  var vUp = new Float32Array(3);
  var pTarget = new Float32Array(3);
  var cpt0 = cameraPositionSpline.domain[0][0];
  var cpt1 = cameraPositionSpline.domain[0][1];
  var ctt0 = cameraTargetSpline.domain[0][0];
  var ctt1 = cameraTargetSpline.domain[0][1];
  var tmin = 0;
  var tmax = 12;

  var setCamera = regl({
    uniforms: {
      viewProjection: function (context) {
        var aspectRatio = context.viewportWidth / context.viewportHeight;
        var fov = Math.PI / 4;
        var t = story.getPosition() / (tmax - tmin);
        cameraPositionSpline.evaluate(pEye, cpt0 + (cpt1 - cpt0) * t);
        cameraTargetSpline.evaluate(pTarget, ctt0 + (ctt1 - ctt0) * t);


        sub(vEye, pTarget, pEye);
        normalize(vUp, cross(vUp, cross(vUp, vEye, vSky), vEye));

        lookAt(mView, pEye, pTarget, vUp);
        perspective(mProj, fov, aspectRatio, 1.0, 500);
        multiplyMat4(mViewProj, mProj, mView);
        return mViewProj;
      }
    }
  });

  var scroller = scrollyteller({
    height: 15000,
    tmim: tmin,
    tmax: tmax,
    timeConstant: 0.1
  });

  scroller.onUpdate(function (t) {
    story.setPosition(t);
    dirty = true;
  });

  window.addEventListener('resize', () => dirty = true);

  var t0 = Date.now();
  regl.frame(() => {
    setCamera(() => {

      //story.setPosition((Date.now() - t0) / 1000 * 0.9);
      //dirty = true;

      if (dirty) {
        var state = story.getState();

        fboFull.use(() => {
          regl.clear({color: state.bgColor, depth: 1});
          drawMesh(Object.assign(state, wireframeBuffers));
        });

        if (state.bloom) {
          fbos[0].use(() => {
            regl.clear({color: state.bgColor, depth: 1});
            drawMesh(Object.assign(state, wireframeBuffers));
          });

          drawBlur({src: fbos[0], dst: fbos[1], direction: [1, 0]});
          drawBlur({src: fbos[1], dst: fbos[0], direction: [0, 1]});
        }

        drawTex({src: fboFull, dst: null, randomness: state.randomness});

        if (state.bloom) {
          drawTex({src: fbos[0], dst: null, additive: true, alpha: state.bloom, randomness: state.randomness});
        }

        dirty = false;
      }
    });
  });

  var helper = h('div', '➟', {
    style: {
      transition: 'opacity 0.5s',
      opacity: 0,
      position: 'absolute',
      top: '95vh',
      left: '50%',
      zIndex: 1,
      'font-size': '4em',
      color: '#fff',
      transform: 'translate3d(-50%, -180%, 0) rotate(90deg)',
      'text-shadow': `1px  1px 0 #000, -0px  1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px  0px 0 #000, 1px  0px 0 #000, 0px -1px 0 #000, 0px  1px 0 #000`
    }
  });

  document.body.append(helper);

  function onscroll () {
    if (window.scrollY <= 0) {
      helper.style.opacity = 1;
    } else {
      helper.style.opacity = 0;
    }
  }

  window.addEventListener('scroll', onscroll, false);
  onscroll();
}
