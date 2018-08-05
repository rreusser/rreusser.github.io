'use strict';

var glsl = require('glslify');
var mat4create = require('gl-mat4/create');
var mat4multiply = require('gl-mat4/multiply');
var mat4invert = require('gl-mat4/invert');
var PointCloud = require('./point-cloud');
var randn = require('gauss-random');
var mat3create = require('gl-mat3/create');
var mat3rotate = require('gl-mat3/rotate');
var mat3translate = require('gl-mat3/translate');
var icp = require('./icp');
var computeCorrespondence = require('./compute-correspondence');
var transformPointCloud = require('./transform-point-cloud');
var filterPointCloud = require('./filter-point-cloud');
var controlPanel = require('control-panel');
var createControls = require('./controls');

require('regl')({
  pixelRatio: Math.min(window.devicePixelRatio, 1.5),
  extensions: [
    'oes_standard_derivatives',
    'angle_instanced_arrays',
  ],
  attributes: {
    antialias: true
  },
  onDone: require('fail-nicely')(run)
});

function run (regl) {
  var camera = require('./regl-turntable-camera')(regl, {
    distance: 6,
    center: [0, 0.25, 0],
  });
  var interactions = require('./interactions')(camera);
  var drawBackground = require('./draw-background')(regl);
  var drawCorrespondence = require('./draw-correspondence')(regl);
  var drawPoints = require('./draw-points')(regl);

  var state = {
    ransacThreshold: 1,
    autoRestart: true,
    simulatedAnnealing: 5,
    edgeAvoidance: 3,
    garbage: 0.1
  };

  var controlRoot = document.createElement('div');
	document.body.appendChild(createControls(null, controlRoot));

  controlPanel([
    {label: 'edgeAvoidance', type: 'range', min: 0, max: 10, initial: state.edgeAvoidance, step: 1},
    {label: 'ransacThreshold', type: 'range', initial: state.ransacThreshold, min: 0.1, max: 4, step: 0.1},
    //{label: 'simulatedAnnealing', type: 'range', initial: state.simulatedAnnealing, min: 0, max: 50, step: 1},
    {label: 'garbage', type: 'range', initial: state.garbage, min: 0, max: 1, step: 0.01},
    {label: 'autoRestart', type: 'checkbox', initial: state.autoRestart},
    {label: 'restart', type: 'button', action: restart},
  ], {
    width: 350,
    root: controlRoot,
  }).on('input', data => {
    Object.assign(state, data);
  });

  function randomCurve (n, ampl, phase, randomness, thetaOffset) {
    var x = new Float32Array(n * 2);
    var theta1 = Math.PI * (0.75 * Math.random());
    var theta2 = Math.PI * (1.25 + 0.75 * Math.random());
    for (var i = 0, i2 = 0; i < n; i++, i2 += 2) {
      var theta = theta1 + (theta2 - theta1) * i / n + thetaOffset;
      x[i2] = randomness * randn();
      x[i2 + 1] = randomness * randn();
      for (var j = 0, j2 = 0; j2 < ampl.length; j++, j2 += 2) {
        x[i2] += ampl[j2] * Math.cos(theta * (j + 1) - phase[j2]);
        x[i2 + 1] += ampl[j2 + 1] * Math.sin(theta * (j + 1) - phase[j2 + 1]);
      }

      if (Math.random() < state.garbage * 0.2) {
        x[i2] += randn() * (0.05 + state.garbage);
        x[i2 + 1] += randn() * (0.05 + state.garbage);
      }
    }
    return x;
  }

  var model = new PointCloud([], {pointSize: 6, pointColor: [.2, .8, .6, 0.9]});
  var source = new PointCloud([], {pointSize: 6, pointColor: [.2, .6, .8, 0.9]});
  var target = new PointCloud([], {pointSize: 6, pointColor: [0.9, 0.3, 0.2, 0.9]});

  var previousVariance = Infinity;
  var lifetime = 30;
  var iteration = 0;
  var converged = false;
  function restart () {
    lifetime = 30;
    iteration = 0;
    previousVariance = Infinity;
    converged = false;
    var thetaOffset = Math.PI * 2 * Math.random();
    var ampl = [1, 1, 0.2, 0.2, 0.125, 0.125, 0.125, 0.125, 0.1, 0.1];
    var phase = new Array(ampl.length).fill(0).map(() => Math.random() * Math.PI * 2);
    var randomness = randn() * 0.03;
    var n = Math.floor(50 + 250 * Math.random());
    phase[0] = phase[1] = 0;
    model.vertices = randomCurve(n, ampl, phase, randomness, thetaOffset * 0);
    source.vertices = randomCurve(n, ampl, phase, randomness, thetaOffset);
    target.vertices = [];
    var m = mat3create();
    mat3rotate(m, mat3translate(m, m, [0.2 * randn(), 0.2 * randn()]), Math.PI * 10 * randn() / 180);
    transformPointCloud(source, m);
  }

  var errorSpan = document.createElement('pre');
  document.body.appendChild(errorSpan);
  errorSpan.style.position = 'fixed';
  errorSpan.style.margin = '0';
  errorSpan.style.bottom = '10px';
  errorSpan.style.left = '10px';
  errorSpan.style.zIndex = 50;

  var weight, weightBuffer;
  function iterate () {
    if (!converged) {
      var temperature = state.simulatedAnnealing ? Math.exp(-iteration / state.simulatedAnnealing) : 0;
      var correspondence = computeCorrespondence(null, source, model, state.edgeAvoidance, temperature)
      target.vertices = filterPointCloud(model, correspondence.indices);
      var ransacThreshold = state.ransacThreshold + 10 * temperature;
      weight = correspondence.variance.map(v => v > correspondence.avgVariance * Math.pow(ransacThreshold, 2) ? 0 : 1);
      weightBuffer = (weightBuffer || regl.buffer)(weight);
      var transform = icp(source, target, weight, temperature);
      transformPointCloud(source, transform);

      var error = Math.abs(correspondence.avgVariance - previousVariance) / correspondence.avgVariance;
      errorSpan.textContent = 'Error: ' + error.toExponential(3) + ', Iteration: ' + iteration;
      if (error < 1e-5 || iteration > 150) converged = true;

      previousVariance = correspondence.avgVariance;
      iteration++;
    }

    if (error < 1e-3 || isNaN(error)) lifetime--;
    if (lifetime < 0 && state.autoRestart) restart();

    camera.taint();
  }

  restart();

  regl.frame(({tick}) => {
    if (tick % 2 === 0) iterate();

    camera.tick({near: camera.state.eye[2] * 0.1, far: -camera.state.eye[2]});
    if (!camera.state.dirty) return;

    camera.setUniforms(() => {
      drawBackground({lineWidth: 0.5, grid1Density: 1.0, grid1Strength: 1.0});

      drawPoints([model, source]);

      if (target.vertices.length) {
        drawCorrespondence({
          weight: weightBuffer,
          source: source.getBuffer(regl),
          target: target.getBuffer(regl),
          count: source.count,
          lineWidth: 1
        });
      }
    });
  });
}
