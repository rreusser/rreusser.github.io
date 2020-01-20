'use strict';

var fs = require('fs');
var path = require('path');
var csvParser = require('csv-parser');
var createCamera = require('./camera-2d');
var Grid = require('./grid');
var starData = fs.readFileSync(path.join(__dirname, 'shortstars.csv'), 'utf8');

require('insert-css')(`
html, body {
  background-color: black;
}
`);

require('regl')({
  extensions: [],
  pixelRatio: Math.min(2, window.devicePixelRatio),
  attributes: {
    antialias: true,
    depthStencil: false,
  },
  onDone: require('fail-nicely')(parseStars)
});

function parseStars (regl) {
  var stars = [];
  var parser = csvParser()
    .on('data', stars.push.bind(stars))
    .on('end', function () {
      start(regl, stars);
    });
  parser.write(starData);
  parser.end();
}

function basePointSize (ctx) {
  return Math.sqrt(ctx.viewportWidth * ctx.viewportHeight) / 200;
}



function bvToKelvin (bv) {
   var C0 = 3.979145;
   var C1 = -0.654499;
   var C2 = 1.74069;
   var C3 = -4.608815;
   var C4 = 6.7926;
   var C5 = -5.39691;
   var C6 = 2.19297;
   var C7 = -0.359496;
   return C0 + bv * (C1 + bv * (C2 + bv * (C3 + bv * (C4 + bv * (C5 + bv * (C6 + bv * C7))))));
}

function start (regl, stars) {
  var n = stars.length;
  var points = new Float32Array(n * 2);
  var temp = new Float32Array(n);
  for (var i = 0; i < n; i++) {
    var x = parseFloat(stars[i]['ColorIndex B-V']);
    var y = -parseFloat(stars[i]['Abs Mag']);
    points[2 * i] = x;
    points[2 * i + 1] = y;
    temp[i] = Math.pow(10, bvToKelvin(x));
  }

  var initialAxis = {
    xmin: -0.8,
    xmax: 2.5,
    ymin: -20,
    ymax: 11,
    aspectRatio: 0.14,
  };

  var camera = createCamera(regl, initialAxis);
  var grid = new Grid(regl);

  var padding = {
    left: 50,
    right: 20,
    top: 30,
    bottom: 55,
  };
  var scissor = regl({
    scissor: {
      enable: true,
      box: {
        x: ctx => Math.floor(padding.left * ctx.pixelRatio),
        y: ctx => Math.floor(padding.bottom * ctx.pixelRatio),
        width: ctx => ctx.viewportWidth - Math.floor((padding.left + padding.right) * ctx.pixelRatio),
        height: ctx => ctx.viewportHeight - Math.floor((padding.top + padding.bottom) * ctx.pixelRatio)
      }
    },
  });

  var drawPoints = regl({
    vert: `
      precision highp float;
      attribute vec2 position;
      attribute float temp;
      varying vec3  vColor;
      uniform mat4 view;
      uniform float pointSize;

      // Code adapted somewhat naively from: http://www.tannerhelland.com/4435/convert-temperature-rgb-algorithm-code/
      vec3 kelvinToRGB(float temperatureInKelvins) {
        vec3 retColor;

        temperatureInKelvins = clamp(temperatureInKelvins, 1000.0, 40000.0) / 100.0;

        if (temperatureInKelvins <= 66.0) {
          retColor.r = 1.0;
          retColor.g = 0.39008157876901960784 * log(temperatureInKelvins) - 0.63184144378862745098;
        } else {
          float t = temperatureInKelvins - 60.0;
          retColor.r = 1.29293618606274509804 * pow(t, -0.1332047592);
          retColor.g = 1.12989086089529411765 * pow(t, -0.0755148492);
        }

        if (temperatureInKelvins >= 66.0) {
          retColor.b = 1.0;
        } else if (temperatureInKelvins <= 19.0) {
          retColor.b = 0.0;
        } else {
          retColor.b = 0.54320678911019607843 * log(temperatureInKelvins - 10.0) - 1.19625408914;
        }

        return clamp(retColor,0.0,1.0);
      }

      void main () {
        vColor = kelvinToRGB(temp);
        vColor.x = pow(vColor.x, 2.2);
        vColor.y = pow(vColor.y, 2.2);
        vColor.z = pow(vColor.z, 2.2);
        gl_Position = view * vec4(position, 0, 1);
        gl_PointSize = pointSize;
      }
    `,
    frag: `
      precision highp float;
      varying vec3 vColor;
      uniform float opacity;

      void main () {
        vec2 xy = gl_PointCoord.xy - 0.5;
        float fac = dot(xy, xy) * 4.0;
        float alpha = max(0.0, 1.0 - fac * fac);
        gl_FragColor = vec4(vColor, alpha * opacity);
      }
    `,
    blend: {
      enable: true,
      equation: {
        rgb: 'add',
        alpha: 'add',
      },
      func: {
        srcRGB: 'src alpha',
        dstRGB: 1,
        srcAlpha: 'src alpha',
        dstAlpha: 1,
      }
    },
    depth: {enable: false},
    primitive: 'points',
    uniforms: {
      pointSize: ctx => {
        var m = camera.matrix();
        var pointSize = Math.min(30, Math.max(1, Math.pow(m[0] * m[5], 0.25) * basePointSize(ctx))) * ctx.pixelRatio;
        return pointSize;
      },
      opacity: function (ctx, props) {
        var m = camera.matrix();
        var pointSize = Math.min(30, Math.max(1, Math.pow(m[0] * m[5], 0.25) * basePointSize(ctx))) * ctx.pixelRatio;

        return Math.min(1, Math.max(3/255, 
          0.5 *
            (ctx.viewportWidth / 1024) *
            (ctx.viewportHeight / 1024) * 
            m[0] * (initialAxis.xmax - initialAxis.xmin) *
            m[5] * (initialAxis.ymax - initialAxis.ymin) /
            Math.pow(pointSize, 2) /
            Math.pow(ctx.pixelRatio, 0.25)
          ));
      }
    },
    attributes: {
      temp: temp,
      position: points
    },
    count: points.length / 2,
  });

  var xlabel = document.createElement('span');
  document.body.appendChild(xlabel);
  xlabel.textContent = 'B-V Color Index';
  xlabel.style.zIndex = 1;
  xlabel.style.position = 'fixed';
  xlabel.style.top = 0;
  xlabel.style.left = 0;
  xlabel.style.color = 'white';
  xlabel.style.fontFamily = '"Helvetica", sans-serif';
  xlabel.style.fontWeight = 200;
  xlabel.style.fontSize = '0.95em';

  var attrib = document.createElement('span');
  document.body.appendChild(attrib);
  var text = document.createElement('span');
  text.textContent = 'Data from ';
  var link = document.createElement('a');
  link.textContent = 'http://astrosci.scimuze.com/stellar_data.htm';
  link.href = 'http://astrosci.scimuze.com/stellar_data.htm';
  link.style.color = 'white';
  link.target = '_blank';
  link.addEventListener('click', event => event.stopPropagation());
  link.addEventListener('touchstart', event => event.stopPropagation());
  link.addEventListener('touchmove', event => event.stopPropagation());
  link.addEventListener('touchend', event => event.stopPropagation());
  attrib.appendChild(text);
  attrib.appendChild(link);
  attrib.style.zIndex = 1;
  attrib.style.position = 'fixed';
  attrib.style.left = '2px';
  attrib.style.bottom = '2px';
  attrib.style.color = 'white';
  attrib.style.fontFamily = '"Helvetica", sans-serif';
  attrib.style.fontWeight = 200;
  attrib.style.fontSize = '0.65em';
  attrib.style.opacity = 0.7;

  var ylabel = document.createElement('span');
  document.body.appendChild(ylabel);
  ylabel.textContent = 'Absolute Magnitude';
  ylabel.style.zIndex = 1;
  ylabel.style.position = 'fixed';
  ylabel.style.top = 0;
  ylabel.style.left = 0;
  ylabel.style.color = 'white';
  ylabel.style.fontFamily = '"Helvetica", sans-serif';
  ylabel.style.fontWeight = 200;
  ylabel.style.fontSize = '0.95em';

  function positionLabels () {
    var w = window.innerWidth;
    var h = window.innerHeight;
    xlabel.style.transform = 'translate3d(-50%,0,0) translate3d('+(w * 0.5)+'px,'+(h - padding.bottom + 23)+'px,0)';
    ylabel.style.transform = 'translate3d('+(17)+'px,'+(h * 0.5)+'px,0) translate(-50%, -50%) rotate(-90deg)';
  }

  positionLabels();
  window.addEventListener('resize', positionLabels);

  var frame = regl.frame(function () {
    try {
      camera.draw(state => {
        if (!state.dirty) return;

        regl.clear({color: [0.06, 0.06, 0.06, 1]});

        scissor(() => {
          grid.draw(camera.matrix(), padding);
          drawPoints();
        });
      });
    } catch (e) {
      frame.cancel();
      throw e;
    }
  });

  window.addEventListener('resize', camera.resize);

}
