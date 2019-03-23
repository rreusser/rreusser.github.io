var ode45 = require('ode45-cash-karp');

module.exports = function restrictedThreeBody (props) {
  var time = 0.0;
  var state = new Float32Array(4);

  var integrator = ode45(state, dfdt, time, 1.0 / 60.0);

  function dfdt (dfdt, f, t) {
    var mu = props.mu;
    var x = f[0];
    var y = f[1];
    var xdot = f[2];
    var ydot = f[3];
    var y2 = y * y;

    var R1 = Math.sqrt(Math.pow(x + mu, 2) + y2);
    var R2 = Math.sqrt(Math.pow(x - 1 + mu, 2) + y2);
    var R3_1 = R1 * R1 * R1;
    var R3_2 = R2 * R2 * R2;

    dfdt[0] = f[2];
    dfdt[1] = f[3];
    dfdt[2] = 2 * ydot + x - (1 - mu) * (x + mu) / R3_1 - mu * (x - 1 + mu) / R3_2;
    dfdt[3] = -2 * xdot + y - (1 - mu) * y / R3_1 - mu * y / R3_2;
  }

  function initialize () {
    time = 0.0;
    integrator.t = 0;
    integrator.dt = 1 / 60 * props.omega;
    if (!props.restrictedThreeBodyInitialConditions) return;
    for (var i = 0; i < 4; i++) {
      state[i] = props.restrictedThreeBodyInitialConditions[i];
    }
  }

  function step (dt) {
    time += dt * props.omega;
    integrator.steps(1000, time);
    return integrator.y;
  }

  initialize();

  return {
    initialize: initialize,
    step: step,
    state: state,
    getTime: () => integrator.t,
  };
};
