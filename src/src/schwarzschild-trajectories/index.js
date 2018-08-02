const wireframe = require('./screen-projected-lines');
const invert = require('gl-mat4/invert');
const copy = require('gl-mat4/copy');
const vec3copy = require('gl-vec3/copy');
const vec2copy = require('gl-vec2/copy');
const vec2dist = require('gl-vec2/dist');
const vec3set = require('gl-vec3/set');
const multiply = require('gl-mat4/multiply');
const transformMat4 = require('gl-vec3/transformMat4');
const makebuffer = require('./makebuffer');
const controlPanel = require('control-panel');
const polyline = require('./polyline');
const color = require('./color');
const regl = require('regl')({
  pixelRatio: Math.min(window.devicePixelRatio, 1.5),
  extensions: [
    'oes_standard_derivatives',
    'angle_instanced_arrays'
  ],
  attributes: {
    depth: false,
    stencil: false,
    alpha: false,
    antialias: true,
  },
  onDone: require('fail-nicely')(run)
});

function run (regl) {

  var state = {
  };


  /*var cp = document.createElement('div');
  controlPanel([
  ], {
    root: cp,
    width: 350,
  }).on('input', function (data) {
    data.points = parseInt(data.points);
    data.degree = parseInt(data.degree);
    var needsNewPoints = data.points !== state.points;
    Object.assign(state, data);
    spline.degree = state.degree;
    if (needsNewPoints) {
      spline.points = recomputePoints(state.points);
    }
    remesh();
    camera.taint();
  });

  document.body.appendChild(cp);
  cp.addEventListener('mousedown', ev => ev.stopPropagation());
  cp.addEventListener('mousemove', ev => ev.stopPropagation());
  cp.addEventListener('mouseup', ev => ev.stopPropagation());
  cp.addEventListener('mousewheel', ev => ev.stopPropagation());
  cp.addEventListener('touchstart', ev => ev.stopPropagation());
  cp.addEventListener('touchmove', ev => ev.stopPropagation());
  cp.addEventListener('touchend', ev => ev.stopPropagation());
  */

  const camera = require('./camera-2d')(regl, {});
  const drawLines = require('./draw-lines')(regl);
  const drawPoints = require('./draw-points')(regl);

  var mouse = {
    screen: new Float32Array([0, 0, 0]),
    clip: new Float32Array([0, 0, 0]),
    position: new Float32Array([0, 0, 0]),
  };

  function computePosition (mouse, ev) {
    vec3set(mouse.screen, ev.x0, ev.y0, 0);
    transformMat4(mouse.clip, mouse.screen, ev.invViewport);
    transformMat4(mouse.position, mouse.clip, ev.invView);
  }
  
  /*
  function getClosestPoint (mouse, ev) {
    var pt = [0, 0, 0];
    var minDist = Infinity;
    var minIndex = -1;
    for (var i = 0; i < spline.points.length; i++) {
      vec3copy(pt, spline.points[i]);
      pt[2] = 0;
      transformMat4(pt, pt, ev.view);
      transformMat4(pt, pt, ev.viewport);
      var dist = vec2dist(pt, mouse.screen);
      if (dist < minDist) {
        minDist = dist;
        minIndex = i;
      }
    }
    return {index: minIndex, distance: minDist};
  }*/


  var dirty = true;
  const taint = () => dirty = true;

  var dragIndex = -1;
  camera.on('interactionstart', ev => {
    computePosition(mouse, ev);
    //var closestPoint = getClosestPoint(mouse, ev);
    //if (closestPoint.distance < 30) {
      //ev.capture();
      //dragIndex = closestPoint.index;
    //}
  }).on('interaction', ev => {
    computePosition(mouse, ev);
    if (ev.captured && dragIndex > -1) {
      remesh();
      camera.taint();
    }
  }).on('interactionend', ev => {
    dragIndex = -1;
  });

  var bg = require('./bg')(regl);

  var raf = regl.frame(() => {
    try {
      camera.draw(({dirty}) => {
        if (!dirty) return;

        var logViewSpan = Math.log(camera.getView()[0]) / Math.log(10);
        var logViewSpanQuant = Math.floor(logViewSpan);
        var grid1Strength = 1 - (logViewSpan - logViewSpanQuant);
        var grid1Density = Math.pow(10, logViewSpanQuant) * 5.0;

        bg({
          viewInv: camera.getInvView(),
          width: 0.5,
          grid1Density: grid1Density,
          grid1Strength: grid1Strength,
        });

        drawLines({
          color: [0.9, 0.2, 0.4, 1],
          lineWidth: 4,
          vertices: new Array(51).fill(0).map((d, i) => [
            Math.cos(i / 50 * Math.PI * 2),
            Math.sin(i / 50 * Math.PI * 2)
          ]),
        });
      });
    } catch (e) {
      console.error(e);
      raf.cancel();
    }
  });

  window.addEventListener('resize', camera.resize, false);
}
