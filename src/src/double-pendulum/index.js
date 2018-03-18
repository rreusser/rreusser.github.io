const glsl = require('glslify');
const regl = require('regl')({
  onDone: require('fail-nicely')(run)
});

function run (regl) {

}

function pendulum (dydt, y, t) {
  var l2 = params.length * params.length;
  var k1 = 6 / params.mass / l2;
  var k2 = -0.5 * params.mass * l2;
  var th1 = y[0];
  var th2 = y[1];
  var p1 = y[2];
  var p2 = y[3];
  var c12 = Math.cos(th1 - th2);
  var s12 = Math.sin(th1 - th2);
  var denom = (16 - 9 * c12 * c12) / k1;
  dydt[0] = (2 * p1 - 3 * c12 * p2) / denom;
  dydt[1] = (8 * p2 - 3 * c12 * p1) / denom;
  var term = dydt[0] * dydt[1] * s12;
  dydt[2] = k2 * (term + 3 * params.gravity / params.length * Math.sin(th1));
  dydt[3] = k2 * (-term + params.gravity / params.length * Math.sin(th2));
};
