module.exports = function (state, gamma) {
  return [
    state.rho,
    state.rho * state.u,
    state.p / (gamma - 1) + 0.5 * state.rho * state.u * state.u
  ];
};
