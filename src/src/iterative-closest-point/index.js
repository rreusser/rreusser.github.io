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
  });
  var interactions = require('./interactions')(camera);
  var drawBackground = require('./draw-background')(regl);
  var drawCorrespondence = require('./draw-correspondence')(regl);
  var drawPoints = require('./draw-points')(regl);

  var state = {
    ransacThreshold: 1,
    autoRestart: true,
  };

  controlPanel([
    {label: 'ransacThreshold', type: 'range', initial: state.ransacThreshold, min: 0.1, max: 10, step: 0.1},
    {label: 'autoRestart', type: 'checkbox', initial: state.autoRestart},
    {label: 'restart', type: 'button', action: restart},
  ]).on('input', data => {
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
    }
    return x;
  }

  var model = new PointCloud([], {pointSize: 6, pointColor: [.2, .8, .4, 1]});
  var source = new PointCloud([], {pointSize: 6, pointColor: [.2, .4, .8, 1]});
  var target = new PointCloud([], {pointSize: 6, pointColor: [0.9, 0.3, 0.2, 1.0]});

  var previousVariance = Infinity;
  var lifetime = 20;
  function restart () {
    lifetime = 20;
    previousVariance = Infinity;
    var thetaOffset = Math.PI * 2 * Math.random();
    var ampl = [1, 1, 0.2, 0.2, 0.125, 0.125, 0.125, 0.125, 0.1, 0.1];
    var phase = new Array(ampl.length).fill(0).map(() => Math.random() * Math.PI * 2);
    var randomness = randn() * 0.03;
    var n = Math.floor(50 + 250 * Math.random());
    phase[0] = phase[1] = 0;
    model.vertices = randomCurve(n, ampl, phase, randomness, thetaOffset);
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
    var correspondence = computeCorrespondence(null, source, model)
    target.vertices = filterPointCloud(model, correspondence.indices);
    weight = correspondence.variance.map(v => v > correspondence.avgVariance * Math.pow(state.ransacThreshold, 2) ? 0 : 1);
    weightBuffer = (weightBuffer || regl.buffer)(weight);
    var transform = icp(source, target, weight);
    transformPointCloud(source, transform);

    var error = Math.abs(correspondence.avgVariance - previousVariance) / correspondence.avgVariance;
    if (error < 1e-3) lifetime--;

    errorSpan.textContent = 'Error: ' + error.toExponential(3);

    if (lifetime < 0 && state.autoRestart) restart();

    previousVariance = correspondence.avgVariance;
    camera.taint();
  }

  restart();

  regl.frame(({tick}) => {
    if (tick % 2 === 0) iterate();

    camera.tick({near: camera.state.eye[2] * 0.1, far: -camera.state.eye[2]});
    if (!camera.state.dirty) return;

    camera.setUniforms(() => {
      drawBackground({lineWidth: 0.5, grid1Density: 1.0, grid1Strength: 1.0});

      drawPoints([source, model]);

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
