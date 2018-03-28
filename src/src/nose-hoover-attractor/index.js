var width = 540;
var height = 540;
var canvas = document.createElement('canvas');
canvas.width = width;
canvas.height = height;
document.body.appendChild(canvas);
var ctx = canvas.getContext('2d');
require('./explain');

var style = null;
function rect (color, x0, y0, width, height) {
  if (color !== style) {
    ctx.fillStyle = color;
    style = color;
  }
  ctx.fillRect(x0, y0, width, height);
}

var multiply = require('gl-mat4/multiply');
var lookAt = require('gl-mat4/lookAt');
var perspective = require('gl-mat4/perspective');
var transformMat4 = require('gl-vec3/transformMat4');

var n = 300;
var dxdt = [0, 0, 0];
var xhalf = [0, 0, 0];
var y = new Array(n).fill(0).map(() => []);
var colors = new Array(n).fill(0).map(randomColor);
var x = new Array(n).fill(0).map(() => [
  1 + (Math.random() - 0.5) * 1,
  (Math.random() - 0.5) * 1,
  (Math.random() - 0.5) * 1
]);
var dxdt = [0, 0, 0];
var xhalf = [0, 0, 0];

function derivative (out, x) {
  out[0] = x[1];
  out[1] = -x[0] + x[1] * x[2];
  out[2] = 1.5 - x[1] * x[1];
}

function integrate (x, dt) {
  derivative(dxdt, x);
  xhalf[0] = x[0] + dxdt[0] * dt * 0.5;
  xhalf[1] = x[1] + dxdt[1] * dt * 0.5;
  xhalf[2] = x[2] + dxdt[2] * dt * 0.5;
  derivative(dxdt, xhalf);
  x[0] += dxdt[0] * dt;
  x[1] += dxdt[1] * dt;
  x[2] += dxdt[2] * dt;
}

var gridRes = 201;
var gridScale = 8;
var gridPoints = [];
for (var i = 0; i < gridRes; i++) {
  for (var j = 0; j < gridRes; j++) {
    if (i % 20 === 0 || j % 20 === 0) {
      gridPoints.push([(i / gridRes - 0.5) * gridScale, (j / gridRes - 0.5) * gridScale, -2.5]);
    }
  }
}

function randomColor () {
  return '#' + [
    0.6 + 0.3 * Math.random(),
    0.25 + 0.3 * Math.random(),
    0.25 + 0.3 * Math.random()
  ].map(c => Math.floor(c * 16).toString(16)).join('');
}

var mView = [];
var mProj = [];
var mViewProj = [];

perspective(mProj, Math.PI / 4, 1, 0.1, 10);

var frame = (time) => {
  var i, j;
  rect('#20181020', 0, 0, width, height);
  var theta = 0.3 * time / 1000;
  var r = 20;
  lookAt(mView, [r * Math.cos(theta), r * Math.sin(theta), 5], [0, 0, 0], [0, 0, -1]);
  multiply(mViewProj, mProj, mView);
  
  for (i = 0; i < gridPoints.length; i++) {
    var pt = transformMat4([], gridPoints[i], mViewProj);
    rect('#fff1', width * (0.5 + pt[0]), height  * (0.5 +  pt[1]), 3, 3);
  }
  
  for (j = 0; j < 3; j++) {
    for (i = 0; i < n; i++) {
      integrate(x[i], 0.015);
      transformMat4(y[i], x[i], mViewProj);
      rect(colors[i], width * (0.5 + y[i][0]), height  * (0.5 +  y[i][1]), 3, 3);
    }
  }

  requestAnimationFrame(frame);
};

requestAnimationFrame(frame);
