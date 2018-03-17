(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
var h = require('h');
var css = require('insert-css');
var demoList = require('../src/sketches/index.json');
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
  top: 1px;
  right: 2px;
  z-index: 10000;
  text-align: right;
  transition: transform 0.2s;
}

.sketch-nav--hidden {
  transform: translate(0, -110%);
}

.sketch-nav a {
  background-color: rgba(0, 0, 0, 0.5);
  color: rgb(220, 220, 220);
  font-family: sans-serif;
  padding: 3px 5px;
  margin: 2px 2px;
  text-decoration: none;
  border-radius; 2px;
  display: inline-block;
  border-radius: 2px;
  font-size: 0.8em;
  font-weight: 200;
}

.sketch-nav h1 {
  font-style: italic;
  margin: 2px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  font-family: sans-serif;
  font-weight: 200;
  font-size: 20px;
  padding: 2px 5px;
  border-radius: 2px;
}
`);

var exitBtn = h('a', {href: 'javascript:void(0);'}, 'x');
exitBtn.innerHTML = '×';
exitBtn.addEventListener('click', function (e) {
  e.preventDefault();
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

document.body.appendChild(nav);

},{"../src/sketches/index.json":4,"h":2,"insert-css":3}],2:[function(require,module,exports){
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
module.exports=[{"id":"flamms-paraboloid","path":"../flamms-paraboloid/","title":"Flamm's Paraboloid","order":1100,"description":"Scroll to build Flamm's Paraboloid","thumbnailPath":"images/flamms-paraboloid-thumbnail.jpg"},{"id":"continuum-gravity","path":"../continuum-gravity/","title":"Continuum Gravity","order":1000,"description":"One million particles interacting gravitationally via a Poisson equation solved on a 2D grid","thumbnailPath":"images/continuum-gravity-thumbnail.jpg"},{"id":"kuramoto-sivashinsky","path":"../kuramoto-sivashinsky/","title":"Kuramoto-Sivashinsky","order":900,"description":"Integrating the 2D Kuramoto-Sivashinsky Equation, ∂u/∂t + ∇⁴u + ∇²u + ½ |∇u|² = 0","thumbnailPath":"images/kuramoto-sivashinsky-thumbnail.jpg"},{"id":"karman-trefftz-airfoil","path":"../karman-trefftz-airfoil/","title":"Karman-Trefftz Airfoil","order":700,"description":"Flow over an airfoil, computed with the Karman-Trefftz conformal map and visualized on the GPU","thumbnailPath":"images/karman-trefftz-airfoil-thumbnail.jpg"},{"id":"periodic-three-body-orbits","path":"../periodic-three-body-orbits/","title":"Periodic Three-Body Orbits","order":600,"description":"Periodic solutions of three bodies interacting via Newtonian gravity","thumbnailPath":"images/periodic-three-body-orbits-thumbnail.jpg"},{"id":"hydrodynamic-instabilities","path":"../hydrodynamic-instabilities/","title":"Hydrodynamic Instabilities","order":500,"description":"The Kelvin-Helmholtz and Rayleigh-Taylor hydrodynamic instabilities","thumbnailPath":"images/hydrodynamic-instabilities-thumbnail.jpg"},{"id":"strange-attractors","path":"../strange-attractors/","title":"Strange Attractors","order":450,"description":"Strange attractors on the GPU","thumbnailPath":"images/strange-attractors-thumbnail.jpg"},{"id":"umbilic-torus","path":"../umbilic-torus/","title":"Umbilic Torus","order":300,"description":"Umbilic Torus","thumbnailPath":"images/umbilic-torus-thumbnail.jpg"},{"id":"random-polynomial-roots","path":"../random-polynomial-roots/","title":"Polynomial Roots","order":300,"description":"Roots of a polynomial with random coefficients, plotted in the complex plane","thumbnailPath":"images/random-polynomial-roots-thumbnail.jpg"},{"id":"schwarzschild-spacetime","path":"../schwarzschild-spacetime/","title":"Schwarzschild Trajectories","order":150,"description":"Integrating particle geodesics in Schwarzschild spacetime (a black hole).","thumbnailPath":"images/schwarzschild-spacetime-thumbnail.jpg"},{"id":"erosion","path":"../erosion/","title":"Erosion","order":100,"description":"An ad-hoc particle-based terrain erosion algorithm, computed on the GPU","thumbnailPath":"images/erosion-thumbnail.jpg"},{"id":"smooth-life","path":"../smooth-life/","title":"Smooth Life","order":80,"description":"Conway's Game of Life, generalized to a continuum and solved on the GPU","thumbnailPath":"images/smooth-life-thumbnail.jpg"},{"id":"logistic-map","path":"../logistic-map/","title":"Logistic Map","order":20,"description":"The chaotic logistic map, computed and displayed on the GPU","thumbnailPath":"images/logistic-map-thumbnail.jpg"}]
},{}]},{},[1]);
