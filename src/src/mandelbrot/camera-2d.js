'use strict';

var interactionEvents = require('../../lib/interaction-events');
var extend = require('xtend/mutable');
var identity = require('gl-mat4/identity');
var invert = require('gl-mat4/invert');
var multiply = require('gl-mat4/multiply');

function viewport(out, x, y, w, h, n, f) {
  out[0] = w * 0.5;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = h * 0.5;
  out[6] = 0;
  out[7] = 0
  out[8] = 0;
  out[9] = 0;
  out[10] = (f - n) * 0.5;
  out[11] = 0;
  out[12] = x + w * 0.5;
  out[13] = y + h * 0.5;
  out[14] = (f + n) * 0.5;
  out[15] = 1;
  return out;
}

module.exports = function makeCamera2D (regl, opts) {
  opts = opts || {};
  var options = extend({
    element: opts.element || regl._gl.canvas,
  });


  var element = options.element;
  var dirty = true;

  var getWidth = element === window ?
    function () { return element.innerWidth } :
    function () { return element.offsetWidth }

  var getHeight = element === window ?
    function () { return element.innerHeight } :
    function () { return element.offsetHeight }

  var xmin = opts.xmin === undefined ? -1 : opts.xmin;
  var xmax = opts.xmax === undefined ? 1 : opts.xmax;
  var ymin = opts.ymin === undefined ? -1 : opts.ymin;
  var ymax = opts.ymax === undefined ? 1 : opts.ymax;
  var aspectRatio = opts.aspectRatio === undefined ? 1 : opts.aspectRatio;

  var width = getWidth();
  var height = getHeight();

  var mView = identity([]);
  mView[0] = 1 / (xmax - xmin);
  mView[5] = 1 / (xmax - xmin) * aspectRatio * width / height;
  mView[12] = -0.5 * (xmax + xmin);
  mView[13] = -0.5 * (ymax + ymin);

  var mViewport = identity([]);
  var mInvViewport = identity([]);

  function computeViewport () {
    width = getWidth();
    height = getHeight();

    viewport(mViewport, 0, height, width, -height, 0, 1);
    invert(mInvViewport, mViewport);
  }

  computeViewport();

  var dViewport = [];

  var ie = interactionEvents({
    element: element,
  }).on('interactionstart', function (ev) {
    ev.preventDefault();
  }).on('interactionend', function (ev) {
    ev.preventDefault();
  }).on('interaction', function (ev) {
    if (!ev.buttons && ['wheel', 'touch', 'pinch'].indexOf(ev.type) === -1) return;

    ev.preventDefault();

    ev.dtheta = 0;
    var c = Math.cos(ev.dtheta);
    var s = Math.sin(ev.dtheta);

    switch (ev.type) {
      case 'wheel':
        ev.dsx = ev.dsy = Math.exp(-ev.dy / 200);
        ev.dx = ev.dy = 0;
        break;
    }

    dViewport[0] = ev.dsx * c;
    dViewport[1] = ev.dsx * s;
    //dViewport[0] = ev.dsx;
    //dViewport[1] = 0;
    dViewport[2] = 0;
    dViewport[3] = 0;
    dViewport[4] = -ev.dsy * s;
    dViewport[5] = ev.dsy * c;
    //dViewport[4] = 0;
    //dViewport[5] = ev.dsy;
    dViewport[6] = 0;
    dViewport[7] = 0;
    dViewport[8] = 0;
    dViewport[9] = 0;
    dViewport[10] = 1;
    dViewport[11] = 0;
    dViewport[12] = ev.dsx * s * ev.y0 - ev.dsx * c * ev.x0 + ev.x0 + ev.dx;
    dViewport[13] = -ev.dsy * c * ev.y0 - ev.dsy * s * ev.x0 + ev.y0 + ev.dy;
    //dViewport[12] = -ev.dsx * ev.x0 + ev.x0 + ev.dx;
    //dViewport[13] = -ev.dsy * ev.y0 + ev.y0 + ev.dy;
    dViewport[14] = 0;
    dViewport[15] = 1;

    multiply(dViewport, dViewport, mViewport);
    multiply(dViewport, mInvViewport, dViewport);
    multiply(mView, dViewport, mView);
    dirty = true;
  });

  var setProps = regl({
    context: {
      view: regl.prop('view'),
    }
  });

  return {
    on: ie.on.bind(ie),
    off: ie.off.bind(ie),
    once: ie.once.bind(ie),
    draw: function (cb) {
      setProps({
        view: mView,
      }, function () {
        cb({
          dirty: dirty
        });
      });
      dirty = false;
    },
    taint: function () {
      dirty = true;
    },
    matrix: function () {
      return mView;
    },
    setBounds: function (bounds) {
      mView[0] = 1 / (bounds.xmax - bounds.xmin);
      mView[5] = 1 / (bounds.xmax - bounds.xmin) * aspectRatio * width / height;
      mView[12] = -0.5 * (bounds.xmax + bounds.xmin) * mView[0];
      mView[13] = -0.5 * (bounds.ymax + bounds.ymin) * mView[5];
    },
    resize: function () {
      computeViewport();

      // Reapply the aspect ratio:
      mView[5] = mView[0] * aspectRatio * width / height
      dirty = true;
    }
  };
}
