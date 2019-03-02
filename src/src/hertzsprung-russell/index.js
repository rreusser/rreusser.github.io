'use strict';

var fs = require('fs');
var path = require('path');
var csvParser = require('csv-parser');
var createCamera = require('./camera-2d');
var Grid = require('./grid');
var starData = fs.readFileSync(path.join(__dirname, 'stars.csv'), 'utf8');

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
    xmin: -0.4,
    xmax: 2.5,
    ymin: -18,
    ymax: 11
  };

  var camera = createCamera(regl, initialAxis);
  var grid = new Grid(regl);

  var padding = 20;
  var scissor = regl({
    scissor: {
      enable: true,
      box: {
        x: ctx => Math.floor(padding * ctx.pixelRatio),
        y: ctx => Math.floor(padding * ctx.pixelRatio),
        width: ctx => ctx.viewportWidth - 2 * Math.floor(padding * ctx.pixelRatio),
        height: ctx => ctx.viewportHeight - 2 * Math.floor(padding * ctx.pixelRatio)
      }
    },
  });

  var drawPoints = regl({
    vert: `
      precision highp float;
      attribute vec2 position;
      attribute float temp;
      varying float vTemp;
      uniform mat4 view;
      uniform float pointSize;
      void main () {
        vTemp = temp;
        gl_Position = view * vec4(position, 0, 1);
        gl_PointSize = pointSize;
      }
    `,
    frag: `
      precision highp float;
      varying float vTemp;
      uniform float opacity;

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
        vec2 xy = gl_PointCoord.xy - 0.5;
        float fac = dot(xy, xy) * 4.0;
        float alpha = max(0.0, 1.0 - fac * fac);
        vec3 rgb = kelvinToRGB(vTemp);
        rgb.x = pow(rgb.x, 2.2);
        rgb.y = pow(rgb.y, 2.2);
        rgb.z = pow(rgb.z, 2.2);
        gl_FragColor = vec4(vec3(rgb), alpha * opacity);
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
        var pointSize = Math.min(30, Math.max(1, Math.pow(m[0] * m[5], 0.25) * 7.0)) * ctx.pixelRatio;
        return pointSize;
      },
      opacity: function (ctx, props) {
        var m = camera.matrix();
        var pointSize = Math.min(30, Math.max(1, Math.pow(m[0] * m[5], 0.25) * 7.0)) * ctx.pixelRatio;

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

  regl.frame(function () {
    camera.draw(state => {
      if (!state.dirty) return;

      regl.clear({color: [0.06, 0.06, 0.06, 1]});

      scissor(() => {
        grid.draw(camera.matrix());
        drawPoints();
      });
    });
  });

  window.addEventListener('resize', camera.resize);

}
