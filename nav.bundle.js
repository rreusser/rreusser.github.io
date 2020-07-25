(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
var h = require('h');
var css = require('insert-css');

var path = require('path');
var demoList = JSON.parse("[{\"id\":\"calabi-yau\",\"path\":\"../calabi-yau/\",\"title\":\"Calabi-Yau Manifolds\",\"order\":3200,\"description\":\"A simple plot of Calabi-Yau manifolds; nothing more, nothing less\",\"thumbnailPath\":\"static/calabi-yau-thumbnail.jpg\"},{\"id\":\"boys-surface\",\"path\":\"../boys-surface/\",\"title\":\"Boy's Surface\",\"order\":3100,\"description\":\"An immersion of the real projective plane in 3D space\",\"thumbnailPath\":\"static/boys-surface-thumbnail.jpg\"},{\"id\":\"clifford-torus\",\"path\":\"../clifford-torus/\",\"title\":\"Clifford Torus\",\"order\":3000,\"description\":\"3D sterographic projection of a 4D Clifford torus\",\"thumbnailPath\":\"static/clifford-torus-thumbnail.jpg\"},{\"id\":\"webcam-kmeans\",\"path\":\"../webcam-kmeans/\",\"title\":\"K-Means\",\"order\":2900,\"description\":\"Live k-means on a video feed with Lloyd's algorithm\",\"thumbnailPath\":\"static/webcam-kmeans-thumbnail.jpg\"},{\"id\":\"moire\",\"path\":\"../moire/\",\"title\":\"Moiré\",\"order\":2800,\"description\":\"Just moiré\",\"thumbnailPath\":\"static/moire-thumbnail.jpg\"},{\"id\":\"ikeda\",\"path\":\"../ikeda/\",\"title\":\"Ikeda Map\",\"order\":2700,\"description\":\"A discrete chaotic attractor\",\"thumbnailPath\":\"static/ikeda-thumbnail.jpg\"},{\"id\":\"hertzsprung-russell\",\"path\":\"../hertzsprung-russell/\",\"title\":\"Hertzsprung-Russell Diagram\",\"order\":2600,\"description\":\"Star magnitudes and temperatures\",\"thumbnailPath\":\"static/hertzsprung-russell-thumbnail.jpg\"},{\"id\":\"mandelbrot\",\"path\":\"../mandelbrot/\",\"title\":\"Mandelbrot\",\"order\":2500,\"description\":\"Drawing the first iterations of the Mandelbrot set as a complex function\",\"thumbnailPath\":\"static/mandelbrot-thumbnail.jpg\"},{\"id\":\"pulsar\",\"path\":\"../pulsar/\",\"title\":\"Pulsar\",\"order\":2400,\"description\":\"Signals and noise (no physical significance)\",\"thumbnailPath\":\"static/pulsar-thumbnail.png\"},{\"id\":\"multiscale-turing-patterns\",\"path\":\"../multiscale-turing-patterns/\",\"title\":\"Multiscale Turing Patterns\",\"order\":2300,\"description\":\"Multiscale turing patterns, as described by Jonathan McCabe\",\"thumbnailPath\":\"static/multiscale-turing-patterns-thumbnail.jpg\"},{\"id\":\"magnet\",\"path\":\"../magnet/\",\"title\":\"Magnet\",\"order\":2200,\"description\":\"Just a magnetic field\",\"thumbnailPath\":\"static/magnet-thumbnail.jpg\"},{\"id\":\"potential-flow\",\"path\":\"../potential-flow/\",\"title\":\"Potential Flow\",\"order\":2100,\"description\":\"Procedural (almost) potential flow with curl noise\",\"thumbnailPath\":\"static/potential-flow-thumbnail.jpg\"},{\"id\":\"ueda-attractor\",\"path\":\"../ueda-attractor/\",\"title\":\"Ueda Attractor\",\"order\":2000,\"description\":\"Ueda's chaotic nonlinear oscillator\",\"thumbnailPath\":\"static/ueda-attractor-thumbnail.jpg\"},{\"id\":\"path-integral-diffraction\",\"path\":\"../path-integral-diffraction/\",\"title\":\"Single-slit diffraction\",\"order\":1900,\"description\":\"Diffraction of a 1D wavefunction through a slit using Feynman's path integral approach\",\"thumbnailPath\":\"static/path-integral-diffraction-thumbnail.jpg\"},{\"id\":\"fibonacci-sphere\",\"path\":\"../fibonacci-sphere/\",\"title\":\"Fibonacci Sphere\",\"order\":1800,\"description\":\"From Martin Roberts' article about evenly distributed points on a sphere\",\"thumbnailPath\":\"static/fibonacci-sphere-thumbnail.jpg\"},{\"id\":\"gray-scott-reaction-diffusion\",\"path\":\"../gray-scott-reaction-diffusion/\",\"title\":\"Gray Scott Reaction Diffusion\",\"order\":1700,\"description\":\"Reacting species diffusing at different rates\",\"thumbnailPath\":\"static/gray-scott-reaction-diffusion-thumbnail.jpg\"},{\"id\":\"rule-30\",\"path\":\"../rule-30/\",\"title\":\"Rule 30\",\"order\":1600,\"description\":\"Stephen Wolfram's 1D cellular automata\",\"thumbnailPath\":\"static/rule-30-thumbnail.png\"},{\"id\":\"line-integral-convolution\",\"path\":\"../line-integral-convolution/\",\"title\":\"Line Integral Convolution\",\"order\":1500,\"description\":\"Visualizing vector fields with Line Integral Convolution (LIC)\",\"thumbnailPath\":\"static/line-integral-convolution-thumbnail.jpg\"},{\"id\":\"iterative-closest-point\",\"path\":\"../iterative-closest-point/\",\"title\":\"Rigid Point Cloud Alignment\",\"order\":1400,\"description\":\"Aligning point clouds with the Iterative Closest Point method\",\"thumbnailPath\":\"static/iterative-closest-point-thumbnail.png\"},{\"id\":\"spherical-harmonics\",\"path\":\"../spherical-harmonics/\",\"title\":\"Spherical Harmonics\",\"order\":1300,\"description\":\"Just a plot of the first few spherical harmonics\",\"thumbnailPath\":\"static/spherical-harmonics-thumbnail.jpg\"},{\"id\":\"domain-coloring-with-scaling\",\"path\":\"../domain-coloring-with-scaling/\",\"title\":\"Domain Coloring with Contour Scaling\",\"order\":1200,\"description\":\"Using OES_standard_derivatives to scale contours to the local gradient of a function\",\"thumbnailPath\":\"static/domain-coloring-with-scaling-thumbnail.jpg\"},{\"id\":\"flamms-paraboloid\",\"path\":\"../flamms-paraboloid/\",\"title\":\"Flamm's Paraboloid\",\"order\":1100,\"description\":\"Scroll to build Flamm's Paraboloid\",\"thumbnailPath\":\"static/flamms-paraboloid-thumbnail.jpg\"},{\"id\":\"continuum-gravity\",\"path\":\"../continuum-gravity/\",\"title\":\"Continuum Gravity\",\"order\":1000,\"description\":\"One million particles interacting gravitationally via a Poisson equation solved on a 2D grid\",\"thumbnailPath\":\"static/continuum-gravity-thumbnail.jpg\"},{\"id\":\"kuramoto-sivashinsky\",\"path\":\"../kuramoto-sivashinsky/\",\"title\":\"Kuramoto-Sivashinsky\",\"order\":900,\"description\":\"Integrating the 2D Kuramoto-Sivashinsky Equation, ∂u/∂t + ∇⁴u + ∇²u + ½ |∇u|² = 0\",\"thumbnailPath\":\"static/kuramoto-sivashinsky-thumbnail.jpg\"},{\"id\":\"karman-trefftz-airfoil\",\"path\":\"../karman-trefftz-airfoil/\",\"title\":\"Karman-Trefftz Airfoil\",\"order\":700,\"description\":\"Flow over an airfoil, computed with the Karman-Trefftz conformal map and visualized on the GPU\",\"thumbnailPath\":\"static/karman-trefftz-airfoil-thumbnail.jpg\"},{\"id\":\"periodic-three-body-orbits\",\"path\":\"../periodic-three-body-orbits/\",\"title\":\"Periodic Three-Body Orbits\",\"order\":600,\"description\":\"Periodic solutions of three bodies interacting via Newtonian gravity\",\"thumbnailPath\":\"static/periodic-three-body-orbits-thumbnail.jpg\"},{\"id\":\"hydrodynamic-instabilities\",\"path\":\"../hydrodynamic-instabilities/\",\"title\":\"Hydrodynamic Instabilities\",\"order\":500,\"description\":\"The Kelvin-Helmholtz and Rayleigh-Taylor hydrodynamic instabilities\",\"thumbnailPath\":\"static/hydrodynamic-instabilities-thumbnail.jpg\"},{\"id\":\"strange-attractors\",\"path\":\"../strange-attractors/\",\"title\":\"Strange Attractors\",\"order\":450,\"description\":\"Strange attractors on the GPU\",\"thumbnailPath\":\"static/strange-attractors-thumbnail.jpg\"},{\"id\":\"schwarzschild-spacetime\",\"path\":\"../schwarzschild-spacetime/\",\"title\":\"Schwarzschild Trajectories\",\"order\":350,\"description\":\"Integrating particle geodesics in Schwarzschild spacetime (a black hole).\",\"thumbnailPath\":\"static/schwarzschild-spacetime-thumbnail.jpg\"},{\"id\":\"random-polynomial-roots\",\"path\":\"../random-polynomial-roots/\",\"title\":\"Polynomial Roots\",\"order\":300,\"description\":\"Roots of a polynomial with random coefficients, plotted in the complex plane\",\"thumbnailPath\":\"static/random-polynomial-roots-thumbnail.jpg\"},{\"id\":\"umbilic-torus\",\"path\":\"../umbilic-torus/\",\"title\":\"Umbilic Torus\",\"order\":300,\"description\":\"Umbilic Torus\",\"thumbnailPath\":\"static/umbilic-torus-thumbnail.jpg\"},{\"id\":\"lamb-wave-dispersion\",\"path\":\"../lamb-wave-dispersion/\",\"title\":\"Lamb Wave Dispersion Relation\",\"order\":220,\"description\":\"Plotting the the complex dispersion relation for elastodynamic plate waves; zeros represent valid modes\",\"thumbnailPath\":\"static/lamb-wave-dispersion-thumbnail.jpg\"},{\"id\":\"fluid-simulation\",\"path\":\"../fluid-simulation/\",\"title\":\"Fluid Simluation\",\"order\":210,\"description\":\"Classic semi-Lagrangian fluid simulation from Visual Simulation of Smoke\",\"thumbnailPath\":\"static/fluid-simulation-thumbnail.jpg\"},{\"id\":\"erosion\",\"path\":\"../erosion/\",\"title\":\"Erosion\",\"order\":100,\"description\":\"An ad-hoc particle-based terrain erosion algorithm, computed on the GPU\",\"thumbnailPath\":\"static/erosion-thumbnail.jpg\"},{\"id\":\"centripetal-b-splines\",\"path\":\"../centripetal-b-splines/\",\"title\":\"Centripetal B-Splines\",\"order\":80,\"description\":\"Experimenting with centripetal parameterization for B-splines\",\"thumbnailPath\":\"static/centripetal-b-splines-thumbnail.png\"},{\"id\":\"smooth-life\",\"path\":\"../smooth-life/\",\"title\":\"Smooth Life\",\"order\":80,\"description\":\"Conway's Game of Life, generalized to a continuum and solved on the GPU\",\"thumbnailPath\":\"static/smooth-life-thumbnail.jpg\"},{\"id\":\"logistic-map\",\"path\":\"../logistic-map/\",\"title\":\"Logistic Map\",\"order\":20,\"description\":\"The chaotic logistic map, computed and displayed on the GPU\",\"thumbnailPath\":\"static/logistic-map-thumbnail.jpg\"},{\"id\":\"nose-hoover-attractor\",\"path\":\"../nose-hoover-attractor/\",\"title\":\"Nosé-Hoover Attractor\",\"order\":8,\"description\":\"Plotting a strange attractor with 2D rectangles\",\"thumbnailPath\":\"static/nose-hoover-attractor-thumbnail.jpg\"},{\"id\":\"vortex-sdf\",\"path\":\"../vortex-sdf/\",\"title\":\"Vortex\",\"order\":7,\"description\":\"A vortex, rendered as a single signed distance function\",\"thumbnailPath\":\"static/vortex-sdf-thumbnail.jpg\"},{\"id\":\"k-means\",\"path\":\"../k-means/\",\"title\":\"K-means clustering\",\"order\":5,\"description\":\"WIP refactoring of the kmpp npm module\",\"thumbnailPath\":\"static/k-means-thumbnail.jpg\"},{\"id\":\"double-pendulum\",\"path\":\"../double-pendulum/\",\"title\":\"Double Pendulum\",\"order\":3,\"description\":\"Accumulating long-term patterns in a chaotic double-pendulum\",\"thumbnailPath\":\"static/double-pendulum-thumbnail.jpg\"}]");
var demoIndex = {};
demoList.forEach(function (demo) {
  demoIndex[demo.id] = demo;
});

function urlFor (id) {
  return 'https://rreusser.github.io/' + id;
}

var hrefParts = window.location.href.replace(/(\/)?(index.html)?(#.*)?$/i, '').split('/');
var id = hrefParts[hrefParts.length - 1];
var indexUrl = 'https://rreusser.github.io/sketches/';
var sourceUrl = 'https://github.com/rreusser/rreusser.github.io/tree/master/src/src/' + id;
var meta = demoIndex[id];
var curIndex = demoList.indexOf(meta);

var prevUrl = curIndex === 0 ? indexUrl : urlFor(demoList[curIndex - 1].id);
var nextUrl = curIndex === demoList.length - 1 ? indexUrl : urlFor(demoList[curIndex + 1].id);

css(`
.sketch-nav {
  position: fixed;
  top: 0px;
  right: 0px;
  z-index: 10000;
  text-align: right;
  transition: transform 0.2s;
}

.sketch-nav--hidden {
  transform: translate(0, -110%);
}

.sketch-nav a {
  background-color: rgba(0, 0, 0, 0.65);
  color: rgb(220, 220, 220);
  font-family: sans-serif;
  padding: 5px 8px;
  margin: 0;
  text-decoration: none;
  border-radius; 2px;
  display: inline-block;
  font-size: 0.8em;
  font-weight: 200;
}

.sketch-nav a:hover {
  background-color: rgba(255, 255, 255, 0.65);
  color: #333;
}

.sketch-nav h1 {
  font-style: italic;
  margin: 0;
  background-color: rgba(0, 0, 0, 0.65);
  color: white;
  font-family: sans-serif;
  font-weight: 200;
  font-size: 20px;
  padding: 4px 8px;
}
`);

var exitBtn = h('a', {href: 'javascript:void(0);'}, 'x');
exitBtn.innerHTML = '×';
exitBtn.addEventListener('click', function (e) {
  nav.classList.add('sketch-nav--hidden');
});
exitBtn.addEventListener('touchstart', function (e) {
  nav.classList.add('sketch-nav--hidden');
});

var nav = h('nav.sketch-nav', [
  h('h1', meta.title),
  h('div', [
    h('a', {href: indexUrl}, 'all'),
    h('a', {href: prevUrl}, 'prev'),
    h('a', {href: nextUrl}, 'next'),
    h('a', {href: sourceUrl}, 'src'),
    exitBtn
  ]),
]);

nav.addEventListener('click', e => e.stopPropagation());
nav.addEventListener('touchstart', e => e.stopPropagation());
nav.addEventListener('touchmove', e => e.stopPropagation());
nav.addEventListener('touchend', e => e.stopPropagation());
nav.addEventListener('touchcancel', e => e.stopPropagation());

document.body.appendChild(nav);

},{"h":2,"insert-css":3,"path":4}],2:[function(require,module,exports){
;(function () {

function h() {
  var args = [].slice.call(arguments), e = null
  function item (l) {
    
    function parseClass (string) {
      var m = string.split(/([\.#]?[a-zA-Z0-9_-]+)/)
      m.forEach(function (v) {
        var s = v.substring(1,v.length)
        if(!v) return 
        if(!e)
          e = document.createElement(v)
        else if (v[0] === '.')
          e.classList.add(s)
        else if (v[0] === '#')
          e.setAttribute('id', s)
        
      })
    }

    if(l == null)
      ;
    else if('string' === typeof l) {
      if(!e)
        parseClass(l)
      else
        e.appendChild(document.createTextNode(l))
    }
    else if('number' === typeof l 
      || 'boolean' === typeof l
      || l instanceof Date 
      || l instanceof RegExp ) {
        e.appendChild(document.createTextNode(l.toString()))
    }
    else if (Array.isArray(l))
      l.forEach(item)
    else if(l instanceof HTMLElement)
      e.appendChild(l)
    else if ('object' === typeof l) {
      for (var k in l) {
        if('function' === typeof l[k])
          e.addEventListener(k, l[k])
        else if(k === 'style') {
          for (var s in l[k])
            e.style.setProperty(s, l[k][s])
        }
        else
          e.setAttribute(k, l[k])
      }
    }
  }
  while(args.length) {
    item(args.shift())
  }
  return e
}

if(typeof module === 'object')
  module.exports = h
else
  this.h = h
})()

},{}],3:[function(require,module,exports){
var containers = []; // will store container HTMLElement references
var styleElements = []; // will store {prepend: HTMLElement, append: HTMLElement}

var usage = 'insert-css: You need to provide a CSS string. Usage: insertCss(cssString[, options]).';

function insertCss(css, options) {
    options = options || {};

    if (css === undefined) {
        throw new Error(usage);
    }

    var position = options.prepend === true ? 'prepend' : 'append';
    var container = options.container !== undefined ? options.container : document.querySelector('head');
    var containerId = containers.indexOf(container);

    // first time we see this container, create the necessary entries
    if (containerId === -1) {
        containerId = containers.push(container) - 1;
        styleElements[containerId] = {};
    }

    // try to get the correponding container + position styleElement, create it otherwise
    var styleElement;

    if (styleElements[containerId] !== undefined && styleElements[containerId][position] !== undefined) {
        styleElement = styleElements[containerId][position];
    } else {
        styleElement = styleElements[containerId][position] = createStyleElement();

        if (position === 'prepend') {
            container.insertBefore(styleElement, container.childNodes[0]);
        } else {
            container.appendChild(styleElement);
        }
    }

    // strip potential UTF-8 BOM if css was read from a file
    if (css.charCodeAt(0) === 0xFEFF) { css = css.substr(1, css.length); }

    // actually add the stylesheet
    if (styleElement.styleSheet) {
        styleElement.styleSheet.cssText += css
    } else {
        styleElement.textContent += css;
    }

    return styleElement;
};

function createStyleElement() {
    var styleElement = document.createElement('style');
    styleElement.setAttribute('type', 'text/css');
    return styleElement;
}

module.exports = insertCss;
module.exports.insertCss = insertCss;

},{}],4:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":5}],5:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[1]);
