'use strict';

var mat4identity = require('gl-mat4/identity');
var mat4invert = require('gl-mat4/invert');
var mat4create = require('gl-mat4/create');

function computeAspectRatio (w, h) {
  return w > h ? [w / h, 1] : [1, h / w];
}

module.exports = function (regl) {
  var mView = mat4create();
  var mViewInverse = mat4create();
  var mModel = mat4create();
  var mModelInverse = mat4create();
  var mWorld = mat4create();
  var mWorldInverse = mat4create();

  var worldTheta = 0;

  var tPrev = null;
  var modelTheta = 0;
  var setUniforms = regl({
    uniforms: {
      uResolution: ctx => [1.0 / ctx.framebufferWidth, 1.0 / ctx.framebufferHeight],
      uWorld: () => mWorld,
      uWorldInverse: () => mWorldInverse,
      uModel: () => mModel,
      uModelInverse: () => mModelInverse,
      uViewInverse: () => mViewInverse,
      uView: () => mView,
      uRotation: regl.prop('rotationSpeed'),
      uSynodicField: regl.prop('synodicField'),
      uColormap: regl.texture([require('./viridis')]),
      uMu: regl.prop('mu'),
      uM1: (ctx, props) => props.mu,
      uM2: (ctx, props) => 1.0 - props.mu,
      uR1: (ctx, props) => 1.0 - props.mu,
      uR2: (ctx, props) => props.mu,
      uOmega: Math.PI * 2,
    }
  });

  return function (props, callback) {

    // Increment the rotation
    var t = props.time;

    if (tPrev !== null) {
      var dt = t - tPrev;
      props.rotationSpeed = (1.0 - props.synodicFrame) * props.omega;
      modelTheta += (props.rotationSpeed * dt);
      worldTheta -= (props.omega - props.rotationSpeed) * dt;
    }

    tPrev = t;

    // Compute the rotating model matrix
    var c = Math.cos(modelTheta);
    var s = Math.sin(modelTheta);

    mat4identity(mModel);
    mModel[0] = c;
    mModel[1] = s;
    mModel[4] = -s;
    mModel[5] = c;
    mModel[13] = props.y0;
    mat4invert(mModelInverse, mModel);

    // Compute the world matrix
    c = Math.cos(worldTheta);
    s = Math.sin(worldTheta);
    mat4identity(mWorld);
    mWorld[0] = c;
    mWorld[1] = s;
    mWorld[4] = -s;
    mWorld[5] = c;
    mWorld[13] = props.y0;
    mat4invert(mWorldInverse, mWorld);

    // Compute the view matrix
    var aspect = computeAspectRatio(props.framebufferWidth, props.framebufferHeight);
    mat4identity(mViewInverse);
    mViewInverse[0] = aspect[0] * props.scale;
    mViewInverse[5] = aspect[1] * props.scale;

    mat4invert(mView, mViewInverse);

    setUniforms(props, callback);
  };
};
