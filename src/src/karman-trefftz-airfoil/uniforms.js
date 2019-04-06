var karmanTrefftz = require('./karman-trefftz');
var rotateZ = require('gl-mat4/rotateZ');

module.exports = function (regl) {
  var modelview = [];

  function r0 (ctx, props) {
    return Math.sqrt(Math.pow(1 - props.geometry.mux, 2) + Math.pow(muy(ctx, props), 2)) * 1;//props.geometry.radius;
  }

  function alpha (ctx, props) {
    return -(props.aerodynamics.alpha) * Math.PI / 180;
  }

  function muy (ctx, props) {
    return props.geometry.muy;
  }

  function n (ctx, props) {
    return props.geometry.n;
  }

  return regl({
    uniforms: {
      mu: (ctx, props) => [props.geometry.mux, muy(ctx, props)],
      theta0: (ctx, props) => Math.atan2(-muy(ctx, props), 1 - props.geometry.mux),
      n: n,
      r0: r0,
      velocity: (ctx, props) => props.velocity,
      rsize: (ctx, props) => {
        return /*props.visualization.size*/ 10 / Math.sqrt(/*props.geometry.radius*/ 1) / r0(ctx, props);
      },
      cpAlpha: (ctx, props) => props.aerodynamics.cpAlpha ? 0.7 : 0,
      streamAlpha: (ctx, props) => props.aerodynamics.streamAlpha ? (props.aerodynamics.cpAlpha ? 0.2 : 0.7) : 0,
      colorScale: 0.42,//(ctx, props) => props.visualization.colorScale,
      gridAlpha: (ctx, props) => (props.aerodynamics.streamAlpha || props.aerodynamics.cpAlpha) ? 0.0 : 1.0,
      gridSize: (ctx, props) => [60, 140],
      scale: (ctx, props) => {
        var theta0 = Math.atan2(-muy(ctx, props), 1 - props.geometry.mux);
        var a = props.geometry.mux - Math.cos(theta0) * r0(ctx, props);
        return n(ctx, props) - karmanTrefftz(n(ctx, props), a, 0)[0];
      },
      alpha: alpha,
      circulation: (ctx, props) => {
        if (props.aerodynamics.kutta) {
          var gamma = -4.0 * Math.PI * Math.sin(alpha(ctx, props) - Math.asin(muy(ctx, props) / r0(ctx, props)));
          props.aerodynamics.circulation = gamma;
          return gamma;
        } else {
          return props.aerodynamics.circulation;
        }
      },
      modelview: (ctx, props) => {
        return rotateZ(modelview, ctx.view, alpha(ctx, props));
      }
    },
    context: {
      time: (ctx, props) => {
        if (props.time !== undefined) {
          return props.time;
        } else {
          return ctx.time;
        }
      }
    }
  });
};
