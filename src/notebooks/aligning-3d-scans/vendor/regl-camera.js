function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var mouse$1 = {};

function mouseButtons(ev) {
  if(typeof ev === 'object') {
    if('buttons' in ev) {
      return ev.buttons
    } else if('which' in ev) {
      var b = ev.which;
      if(b === 2) {
        return 4
      } else if(b === 3) {
        return 2
      } else if(b > 0) {
        return 1<<(b-1)
      }
    } else if('button' in ev) {
      var b = ev.button;
      if(b === 1) {
        return 4
      } else if(b === 2) {
        return 2
      } else if(b >= 0) {
        return 1<<b
      }
    }
  }
  return 0
}
mouse$1.buttons = mouseButtons;

function mouseElement(ev) {
  return ev.target || ev.srcElement || window
}
mouse$1.element = mouseElement;

function mouseRelativeX(ev) {
  if(typeof ev === 'object') {
    if('offsetX' in ev) {
      return ev.offsetX
    }
    var target = mouseElement(ev);
    var bounds = target.getBoundingClientRect();
    return ev.clientX - bounds.left
  }
  return 0
}
mouse$1.x = mouseRelativeX;

function mouseRelativeY(ev) {
  if(typeof ev === 'object') {
    if('offsetY' in ev) {
      return ev.offsetY
    }
    var target = mouseElement(ev);
    var bounds = target.getBoundingClientRect();
    return ev.clientY - bounds.top
  }
  return 0
}
mouse$1.y = mouseRelativeY;

var mouseListen_1 = mouseListen;

var mouse = mouse$1;

function mouseListen (element, callback) {
  if (!callback) {
    callback = element;
    element = window;
  }

  var buttonState = 0;
  var x = 0;
  var y = 0;
  var mods = {
    shift: false,
    alt: false,
    control: false,
    meta: false
  };
  var attached = false;

  function updateMods (ev) {
    var changed = false;
    if ('altKey' in ev) {
      changed = changed || ev.altKey !== mods.alt;
      mods.alt = !!ev.altKey;
    }
    if ('shiftKey' in ev) {
      changed = changed || ev.shiftKey !== mods.shift;
      mods.shift = !!ev.shiftKey;
    }
    if ('ctrlKey' in ev) {
      changed = changed || ev.ctrlKey !== mods.control;
      mods.control = !!ev.ctrlKey;
    }
    if ('metaKey' in ev) {
      changed = changed || ev.metaKey !== mods.meta;
      mods.meta = !!ev.metaKey;
    }
    return changed
  }

  function handleEvent (nextButtons, ev) {
    var nextX = mouse.x(ev);
    var nextY = mouse.y(ev);
    if ('buttons' in ev) {
      nextButtons = ev.buttons | 0;
    }
    if (nextButtons !== buttonState ||
      nextX !== x ||
      nextY !== y ||
      updateMods(ev)) {
      buttonState = nextButtons | 0;
      x = nextX || 0;
      y = nextY || 0;
      callback && callback(buttonState, x, y, mods);
    }
  }

  function clearState (ev) {
    handleEvent(0, ev);
  }

  function handleBlur () {
    if (buttonState ||
      x ||
      y ||
      mods.shift ||
      mods.alt ||
      mods.meta ||
      mods.control) {
      x = y = 0;
      buttonState = 0;
      mods.shift = mods.alt = mods.control = mods.meta = false;
      callback && callback(0, 0, 0, mods);
    }
  }

  function handleMods (ev) {
    if (updateMods(ev)) {
      callback && callback(buttonState, x, y, mods);
    }
  }

  function handleMouseMove (ev) {
    if (mouse.buttons(ev) === 0) {
      handleEvent(0, ev);
    } else {
      handleEvent(buttonState, ev);
    }
  }

  function handleMouseDown (ev) {
    handleEvent(buttonState | mouse.buttons(ev), ev);
  }

  function handleMouseUp (ev) {
    handleEvent(buttonState & ~mouse.buttons(ev), ev);
  }

  function attachListeners () {
    if (attached) {
      return
    }
    attached = true;

    element.addEventListener('mousemove', handleMouseMove);

    element.addEventListener('mousedown', handleMouseDown);

    element.addEventListener('mouseup', handleMouseUp);

    element.addEventListener('mouseleave', clearState);
    element.addEventListener('mouseenter', clearState);
    element.addEventListener('mouseout', clearState);
    element.addEventListener('mouseover', clearState);

    element.addEventListener('blur', handleBlur);

    element.addEventListener('keyup', handleMods);
    element.addEventListener('keydown', handleMods);
    element.addEventListener('keypress', handleMods);

    if (element !== window) {
      window.addEventListener('blur', handleBlur);

      window.addEventListener('keyup', handleMods);
      window.addEventListener('keydown', handleMods);
      window.addEventListener('keypress', handleMods);
    }
  }

  function detachListeners () {
    if (!attached) {
      return
    }
    attached = false;

    element.removeEventListener('mousemove', handleMouseMove);

    element.removeEventListener('mousedown', handleMouseDown);

    element.removeEventListener('mouseup', handleMouseUp);

    element.removeEventListener('mouseleave', clearState);
    element.removeEventListener('mouseenter', clearState);
    element.removeEventListener('mouseout', clearState);
    element.removeEventListener('mouseover', clearState);

    element.removeEventListener('blur', handleBlur);

    element.removeEventListener('keyup', handleMods);
    element.removeEventListener('keydown', handleMods);
    element.removeEventListener('keypress', handleMods);

    if (element !== window) {
      window.removeEventListener('blur', handleBlur);

      window.removeEventListener('keyup', handleMods);
      window.removeEventListener('keydown', handleMods);
      window.removeEventListener('keypress', handleMods);
    }
  }

  // Attach listeners
  attachListeners();

  var result = {
    element: element
  };

  Object.defineProperties(result, {
    enabled: {
      get: function () { return attached },
      set: function (f) {
        if (f) {
          attachListeners();
        } else {
          detachListeners();
        }
      },
      enumerable: true
    },
    buttons: {
      get: function () { return buttonState },
      enumerable: true
    },
    x: {
      get: function () { return x },
      enumerable: true
    },
    y: {
      get: function () { return y },
      enumerable: true
    },
    mods: {
      get: function () { return mods },
      enumerable: true
    }
  });

  return result
}

var parseUnit$1 = function parseUnit(str, out) {
    if (!out)
        out = [ 0, '' ];

    str = String(str);
    var num = parseFloat(str, 10);
    out[0] = num;
    out[1] = str.match(/[\d.\-\+]*\s*(.*)/)[1] || '';
    return out
};

var parseUnit = parseUnit$1;

var toPx = toPX$1;

var PIXELS_PER_INCH = 96;

var defaults = {
  'ch': 8,
  'ex': 7.15625,
  'em': 16,
  'rem': 16,
  'in': PIXELS_PER_INCH,
  'cm': PIXELS_PER_INCH / 2.54,
  'mm': PIXELS_PER_INCH / 25.4,
  'pt': PIXELS_PER_INCH / 72,
  'pc': PIXELS_PER_INCH / 6,
  'px': 1
};

function toPX$1(str) {
  if (!str) return null

  if (defaults[str]) return defaults[str]

  // detect number of units
  var parts = parseUnit(str);
  if (!isNaN(parts[0]) && parts[1]) {
    var px = toPX$1(parts[1]);
    return typeof px === 'number' ? parts[0] * px : null
  }

  return null
}

var toPX = toPx;

var wheel = mouseWheelListen;

function mouseWheelListen(element, callback, noScroll) {
  if(typeof element === 'function') {
    noScroll = !!callback;
    callback = element;
    element = window;
  }
  var lineHeight = toPX('ex');
  var listener = function(ev) {
    if(noScroll) {
      ev.preventDefault();
    }
    var dx = ev.deltaX || 0;
    var dy = ev.deltaY || 0;
    var dz = ev.deltaZ || 0;
    var mode = ev.deltaMode;
    var scale = 1;
    switch(mode) {
      case 1:
        scale = lineHeight;
      break
      case 2:
        scale = window.innerHeight;
      break
    }
    dx *= scale;
    dy *= scale;
    dz *= scale;
    if(dx || dy || dz) {
      return callback(dx, dy, dz, ev)
    }
  };
  element.addEventListener('wheel', listener);
  return listener
}

var identity_1 = identity$2;

/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */
function identity$2(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
}

var perspective_1 = perspective$1;

/**
 * Generates a perspective projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
function perspective$1(out, fovy, aspect, near, far) {
    var f = 1.0 / Math.tan(fovy / 2),
        nf = 1 / (near - far);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (2 * far * near) * nf;
    out[15] = 0;
    return out;
}

var identity$1 = identity_1;

var lookAt_1 = lookAt$1;

/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {vec3} eye Position of the viewer
 * @param {vec3} center Point the viewer is looking at
 * @param {vec3} up vec3 pointing up
 * @returns {mat4} out
 */
function lookAt$1(out, eye, center, up) {
    var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
        eyex = eye[0],
        eyey = eye[1],
        eyez = eye[2],
        upx = up[0],
        upy = up[1],
        upz = up[2],
        centerx = center[0],
        centery = center[1],
        centerz = center[2];

    if (Math.abs(eyex - centerx) < 0.000001 &&
        Math.abs(eyey - centery) < 0.000001 &&
        Math.abs(eyez - centerz) < 0.000001) {
        return identity$1(out);
    }

    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;

    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;

    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
        x0 = 0;
        x1 = 0;
        x2 = 0;
    } else {
        len = 1 / len;
        x0 *= len;
        x1 *= len;
        x2 *= len;
    }

    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;

    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
        y0 = 0;
        y1 = 0;
        y2 = 0;
    } else {
        len = 1 / len;
        y0 *= len;
        y1 *= len;
        y2 *= len;
    }

    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;

    return out;
}

var mouseChange = mouseListen_1;
var mouseWheel = wheel;
var identity = identity_1;
var perspective = perspective_1;
var lookAt = lookAt_1;

var reglCamera = createCamera;

var isBrowser = typeof window !== 'undefined';

function createCamera (regl, props_) {
  var props = props_ || {};

  // Preserve backward-compatibilty while renaming preventDefault -> noScroll
  if (typeof props.noScroll === 'undefined') {
    props.noScroll = props.preventDefault;
  }

  var cameraState = {
    view: identity(new Float32Array(16)),
    projection: identity(new Float32Array(16)),
    center: new Float32Array(props.center || 3),
    theta: props.theta || 0,
    phi: props.phi || 0,
    distance: Math.log(props.distance || 10.0),
    eye: new Float32Array(3),
    up: new Float32Array(props.up || [0, 1, 0]),
    fovy: props.fovy || Math.PI / 4.0,
    near: typeof props.near !== 'undefined' ? props.near : 0.01,
    far: typeof props.far !== 'undefined' ? props.far : 1000.0,
    noScroll: typeof props.noScroll !== 'undefined' ? props.noScroll : false,
    noZoom: typeof props.noZoom !== 'undefined' ? props.noZoom : false,
    flipY: !!props.flipY,
    dtheta: 0,
    dphi: 0,
    rotationSpeed: typeof props.rotationSpeed !== 'undefined' ? props.rotationSpeed : 1,
    zoomSpeed: typeof props.zoomSpeed !== 'undefined' ? props.zoomSpeed : 1,
    renderOnDirty: typeof props.renderOnDirty !== undefined ? !!props.renderOnDirty : false
  };

  var element = props.element;
  var damping = typeof props.damping !== 'undefined' ? props.damping : 0.9;

  var right = new Float32Array([1, 0, 0]);
  var front = new Float32Array([0, 0, 1]);

  var minDistance = Math.log('minDistance' in props ? props.minDistance : 0.1);
  var maxDistance = Math.log('maxDistance' in props ? props.maxDistance : 1000);

  var ddistance = 0;

  var prevX = 0;
  var prevY = 0;

  if (isBrowser && props.mouse !== false) {
    var source = element || regl._gl.canvas;
    var dragging = false;

    function getWidth () {
      return element ? element.offsetWidth : window.innerWidth
    }

    function getHeight () {
      return element ? element.offsetHeight : window.innerHeight
    }

    // Start drag on mousedown inside canvas
    source.addEventListener('mousedown', function (ev) {
      if (ev.button === 0) {
        dragging = true;
        prevX = ev.clientX;
        prevY = ev.clientY;
      }
    });

    // Track globally while dragging
    window.addEventListener('mousemove', function (ev) {
      if (dragging) {
        var dx = (ev.clientX - prevX) / getWidth();
        var dy = (ev.clientY - prevY) / getHeight();

        cameraState.dtheta += cameraState.rotationSpeed * 4.0 * dx;
        cameraState.dphi += cameraState.rotationSpeed * 4.0 * dy;
        cameraState.dirty = true;

        prevX = ev.clientX;
        prevY = ev.clientY;
      }
    });

    // End drag on mouseup anywhere
    window.addEventListener('mouseup', function (ev) {
      if (ev.button === 0) {
        dragging = false;
      }
    });

    // Touch support for mobile
    var touchId = null;
    var touchStartDistance = null;
    var initialDistance = null;

    source.addEventListener('touchstart', function (ev) {
      if (ev.touches.length === 1) {
        // Single touch - rotation
        touchId = ev.touches[0].identifier;
        prevX = ev.touches[0].clientX;
        prevY = ev.touches[0].clientY;
        ev.preventDefault();
      } else if (ev.touches.length === 2 && !cameraState.noZoom) {
        // Two finger pinch - zoom
        touchId = null;
        var dx = ev.touches[0].clientX - ev.touches[1].clientX;
        var dy = ev.touches[0].clientY - ev.touches[1].clientY;
        touchStartDistance = Math.sqrt(dx * dx + dy * dy);
        initialDistance = cameraState.distance;
        ev.preventDefault();
      }
    }, { passive: false });

    source.addEventListener('touchmove', function (ev) {
      if (ev.touches.length === 1 && touchId !== null) {
        // Single touch - rotation
        var touch = null;
        for (var i = 0; i < ev.touches.length; i++) {
          if (ev.touches[i].identifier === touchId) {
            touch = ev.touches[i];
            break;
          }
        }
        if (touch) {
          var dx = (touch.clientX - prevX) / getWidth();
          var dy = (touch.clientY - prevY) / getHeight();

          cameraState.dtheta += cameraState.rotationSpeed * 4.0 * dx;
          cameraState.dphi += cameraState.rotationSpeed * 4.0 * dy;
          cameraState.dirty = true;

          prevX = touch.clientX;
          prevY = touch.clientY;
        }
        ev.preventDefault();
      } else if (ev.touches.length === 2 && touchStartDistance !== null && !cameraState.noZoom) {
        // Two finger pinch - zoom
        var dx = ev.touches[0].clientX - ev.touches[1].clientX;
        var dy = ev.touches[0].clientY - ev.touches[1].clientY;
        var currentDistance = Math.sqrt(dx * dx + dy * dy);
        var scale = touchStartDistance / currentDistance;
        cameraState.distance = initialDistance + Math.log(scale) * cameraState.zoomSpeed;
        cameraState.dirty = true;
        ev.preventDefault();
      }
    }, { passive: false });

    source.addEventListener('touchend', function (ev) {
      if (ev.touches.length === 0) {
        touchId = null;
        touchStartDistance = null;
        initialDistance = null;
      } else if (ev.touches.length === 1) {
        // Went from 2 fingers to 1 - reset to rotation mode
        touchStartDistance = null;
        initialDistance = null;
        touchId = ev.touches[0].identifier;
        prevX = ev.touches[0].clientX;
        prevY = ev.touches[0].clientY;
      }
    });

    source.addEventListener('touchcancel', function (ev) {
      touchId = null;
      touchStartDistance = null;
      initialDistance = null;
    });

    // Keep wheel on source element to avoid hijacking page scroll
    // Only attach if zoom is enabled
    if (!cameraState.noZoom) {
      mouseWheel(source, function (dx, dy) {
        ddistance += dy / getHeight() * cameraState.zoomSpeed;
        cameraState.dirty = true;
      }, props.noScroll);
    }
  }

  function damp (x) {
    var xd = x * damping;
    if (Math.abs(xd) < 0.1) {
      return 0
    }
    cameraState.dirty = true;
    return xd
  }

  function clamp (x, lo, hi) {
    return Math.min(Math.max(x, lo), hi)
  }

  function updateCamera (props) {
    Object.keys(props).forEach(function (prop) {
      cameraState[prop] = props[prop];
    });

    var center = cameraState.center;
    var eye = cameraState.eye;
    var up = cameraState.up;
    var dtheta = cameraState.dtheta;
    var dphi = cameraState.dphi;

    cameraState.theta += dtheta;
    cameraState.phi = clamp(
      cameraState.phi + dphi,
      -Math.PI / 2.0,
      Math.PI / 2.0);
    cameraState.distance = clamp(
      cameraState.distance + ddistance,
      minDistance,
      maxDistance);

    cameraState.dtheta = damp(dtheta);
    cameraState.dphi = damp(dphi);
    ddistance = damp(ddistance);

    var theta = cameraState.theta;
    var phi = cameraState.phi;
    var r = Math.exp(cameraState.distance);

    var vf = r * Math.sin(theta) * Math.cos(phi);
    var vr = r * Math.cos(theta) * Math.cos(phi);
    var vu = r * Math.sin(phi);

    for (var i = 0; i < 3; ++i) {
      eye[i] = center[i] + vf * front[i] + vr * right[i] + vu * up[i];
    }

    lookAt(cameraState.view, eye, center, up);
  }

  cameraState.dirty = true;

  var injectContext = regl({
    context: Object.assign({}, cameraState, {
      dirty: function () {
        return cameraState.dirty;
      },
      projection: function (context) {
        perspective(cameraState.projection,
          cameraState.fovy,
          context.viewportWidth / context.viewportHeight,
          cameraState.near,
          cameraState.far);
        if (cameraState.flipY) { cameraState.projection[5] *= -1; }
        return cameraState.projection
      }
    }),
    uniforms: Object.keys(cameraState).reduce(function (uniforms, name) {
      uniforms[name] = regl.context(name);
      return uniforms
    }, {})
  });

  function setupCamera (props, block) {
    if (typeof setupCamera.dirty !== 'undefined') {
      cameraState.dirty = setupCamera.dirty || cameraState.dirty;
      setupCamera.dirty = undefined;
    }

    if (props && block) {
      cameraState.dirty = true;
    }

    if (cameraState.renderOnDirty && !cameraState.dirty) return;

    if (!block) {
      block = props;
      props = {};
    }

    updateCamera(props);
    injectContext(block);
    cameraState.dirty = false;
  }

  Object.keys(cameraState).forEach(function (name) {
    setupCamera[name] = cameraState[name];
  });

  // Expose element for visibility checking
  setupCamera.element = element || (isBrowser ? regl._gl.canvas : null);

  // Method to mark camera as dirty (for external updates like scroll)
  setupCamera.taint = function () {
    cameraState.dirty = true;
  };

  // Expose state for external modification
  setupCamera.state = cameraState;

  return setupCamera
}

var createCamera$1 = /*@__PURE__*/getDefaultExportFromCjs(reglCamera);

export { createCamera$1 as default };
