'use strict';

var computeLibrationPoints = require('./lagrange-points');
var h = require('h');
var createScrollyteller = require('./scrollyteller');
var createSequencer = require('./sequencer');

require('insert-css')(`
body {
  background-color: black;
}

canvas {
  position: fixed !important;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
}

.frame-container {
  width: 100%;
  position: relative;
  z-index: 1000;
}

.frame {
  height: 100vh;
  position: relative;
  text-align: center;
}

.frame-title {
  font-weight: 400;
  font-family: 'Open Sans', sans-serif;

  position: relative;
  top: 20vh;
  z-index: 1000;
  color: white;
  margin-left: auto;
  margin-right: auto;
}

.frame-content {
  text-align: left;
  font-family: 'Open Sans', sans-serif;
  font-size: 18px;
  line-height: 1.5;

  background-color: rgba(255, 255, 255, 0.7);
  padding: 15px;
  display: inline-block;
  max-width: 350px;
  position: absolute;
  bottom: 10%;
  left: 10%;
}
`);

require('regl')({ pixelRatio: Math.min(window.devicePixelRatio, 1.5),
  extensions: [
    'oes_standard_derivatives',
    'angle_instanced_arrays',
  ],
  attributes: {
    antialias: true
  },
  onDone: require('fail-nicely')(run)
});

function createContentElement (frames) {
  return h('div.frame-container',
    frames.map(function (frame) {
      return h('div.frame', 
        frame.title && [h('h1.frame-title', frame.title)],
        frame.content && [h('div.frame-content', frame.content)]
      )
    })
  );
}

function run (regl) {
  var drawBackground = require('./draw-background')(regl);
  var drawField = require('./draw-field')(regl);
  var drawAxes = require('./draw-axes')(regl);
  var drawLines = require('./draw-lines')(regl);
  var drawText = require('./draw-text')(regl, [
    'L1', 'L2', 'L3', 'L4', 'L5'
  ]);
  var drawPoints = require('./draw-points')(regl);
  var uniforms = require('./uniforms')(regl);

  var state = {
    mu: 0.1,
    synodicFrame: 0,
    dirty: true
  };

  var librationPoints;
  var librationPointBuffer = regl.buffer(new Float32Array(10));

  function updateLibrationPoints () {
    librationPoints = computeLibrationPoints(state.mu)
    librationPointBuffer.subdata(librationPoints);
  }
  updateLibrationPoints();

  window.addEventListener('resize', () => state.dirty = true);

  var frames = [{
    title: "Lagrange Points"
  }, {
    content: "Consider the earth as it orbits the sun—but not to scale since they'd be much too small to see here."
  }, {
    content: "The mass of the earth is only about 0.0003% the mass of the sun, so to make things easier to see and a bit more interesting, we'll imagine the earth is 20% the mass of the sun."
  }, {
    content: h('span', [
      "With this exaggereated mass, you can see that the sun and the earth orbit a common point. For circular orbits, this is called the circular ",
      h('a', {href: "https://en.wikipedia.org/wiki/Two-body_problem"}, "two-body problem"),
      " and is relatively easy to solve."
    ]),
  }, {
    content: "If we add a third body, it interacts gravitationally with the other two bodies complicates things beyond what we can attack with a closed-form solution."
  }, {
    content: h('span', [
      "If, however, the third body is a small satellite that does't affect the orbits of the other two bodies, we can say quite a bit more about the behavior. This is called the ",
      h('a', {href: "https://en.wikipedia.org/wiki/Two-body_problem"}, "restricted circular three-body problem"),
      "."
    ])
  }, {
    content: "Gravity obeys an inverse square law. We can imagine stars and planets like a depression into which things are pulled."
  }, {
    content: "Gravity obeys an inverse square law. We can imagine stars and planets like a depression into which things are pulled."
  }, {
  }, {
  }, {
  }];

  var sequencer = createSequencer({
    bgOpacity: [
      {t: 4.8, value: 1.0},
      {t: 5.3, value: 0.0},
      {t: 9.0, value: 0},
      {t: 10.0, value: 1},
    ],
    mu: [
      {t: 1.8, value: 0.001},
      {t: 3.0, value: 0.2},
    ],
    fieldOpacity: [
      {t: 5.3, value: 0.0},
      {t: 6.0, value: 1},
      {t: 8.0, value: 1},
      {t: 9.0, value: 0},
    ],
    orbitOpacity: [
      {t: 0.5, value: 0.0},
      {t: 1.5, value: 0.4},
      {t: 5.3, value: 0.4},
      {t: 6.0, value: 1.0},
      {t: 8, value: 1.0},
      {t: 9, value: 0.0},
    ],
    axisOpacity: [
      {t: 2.8, value: 0.0},
      {t: 3.8, value: 0.4},
      {t: 8, value: 0.4},
      {t: 9, value: 0.0},
    ],
    synodicFrame: [
      {t: 6.0, value: 0.0},
      {t: 7.5, value: 1.0},
      {t: 8, value: 1.0},
      {t: 9, value: 0.0},
    ],
    y0: [
      {t: -2.0, value: -2.2},
      {t: 2.0, value: 0.0},
      {t: 9.0, value: 0.0},
      {t: 11.0, value: 2.2},
    ],
    librationPointOpacity: [
      {t: 6.0, value: 0.0},
      {t: 7.0, value: 1.0},
    ]
  }, function (data) {
    state.dirty = true;
  });

  var prevMu = null;
  var sunMoon = new Float32Array(4);
  var sunMoonBuffer = regl.buffer(sunMoon);
  var sunOrbit = new Float32Array(0);
  var earthOrbit = new Float32Array(0);
  var sunOrbitBuffer = regl.buffer(sunOrbit);
  var earthOrbitBuffer = regl.buffer(earthOrbit);

  function updateSunMoon (mu) {
    if (prevMu !== mu) {
      updateLibrationPoints();

      sunMoon[0] = -mu;
      sunMoon[2] = 1 - mu;
      sunMoonBuffer.subdata(sunMoon);

      var sunOrbitRadius = mu;
      var earthOrbitRadius = 1.0 - mu;
      var sunOrbitCircumference = Math.PI * 2 * sunOrbitRadius;
      var earthOrbitCircumference = Math.PI * 2 * earthOrbitRadius;
      var nSunDash = Math.ceil(sunOrbitCircumference / 0.05);
      var nEarthDash = Math.ceil(earthOrbitCircumference / 0.05);

      var nSunOrbit = Math.max(1, Math.floor(Math.sqrt(sunOrbitCircumference / 0.002)));
      var nEarthOrbit = Math.max(1, Math.floor(Math.sqrt(earthOrbitCircumference / 0.002)));
      sunOrbit = new Float32Array(nSunOrbit * 3);
      earthOrbit = new Float32Array(nEarthOrbit * 3);

      for (var i = 0, i3 = 0; i < nSunOrbit; i++, i3 += 3) {
        var theta = i / (nSunOrbit - 1) * Math.PI * 2
        sunOrbit[i3] = Math.cos(theta) * sunOrbitRadius;
        sunOrbit[i3 + 1] = Math.sin(theta) * sunOrbitRadius;
        sunOrbit[i3 + 2] = i / (nSunOrbit - 1) * nSunDash;
      }

      for (var i = 0, i3 = 0; i < nEarthOrbit; i++, i3 += 3) {
        var theta = i / (nEarthOrbit - 1) * Math.PI * 2
        earthOrbit[i3] = Math.cos(theta) * earthOrbitRadius;
        earthOrbit[i3 + 1] = Math.sin(theta) * earthOrbitRadius;
        earthOrbit[i3 + 2] = i / (nEarthOrbit - 1) * nEarthDash;
      }

      sunOrbitBuffer = sunOrbitBuffer(sunOrbit);
      earthOrbitBuffer = earthOrbitBuffer(earthOrbit);
    }
    prevMu = mu;
  }

  var contentElement = createContentElement(frames);
  var scrollyteller = createScrollyteller(contentElement, {
    tmin: 0,
    tmax: frames.length
  });
  document.body.appendChild(contentElement);

  scrollyteller.onUpdate(position => {
    sequencer.setPosition(position);
    //console.log('position:', position);
  });
  sequencer.setPosition(0);

  regl.frame(ctx => {
    Object.assign(state, sequencer.getState());

    state.dirty = false;

    updateSunMoon(state.mu);

    uniforms(Object.assign(state, ctx), () => {
      if (state.bgOpacity > 1e-4) {
        drawBackground({
          opacity: state.bgOpacity
        });
      }

      if (state.fieldOpacity > 1e-4) {
        drawField({
          opacity: state.fieldOpacity
        });
      }

      if (state.axisOpacity > 1e-4) {
        drawAxes({
          opacity: state.axisOpacity
        });
      }

      if (state.orbitOpacity > 1e-4) {
        drawLines([{
          points: sunOrbitBuffer,
          count: sunOrbit.length / 3,
          color: [1, 1, 1, state.orbitOpacity],
          lineWidth: 1,
        }, {
          points: earthOrbitBuffer,
          count: earthOrbit.length / 3,
          color: [1, 1, 1, state.orbitOpacity],
          lineWidth: 1,
        }]);
      }


      drawPoints([{
        // Draw the sun:
        color: [1.0, 0.9, 0.2],
        points: {buffer: sunMoonBuffer},
        pointSize: Math.max(5, Math.sqrt(1.0 - state.mu) * 20),
        count: 1
      }, {
        // Draw the earth:
        color: [0.2, 0.4, 1],
        points: {buffer: sunMoonBuffer, offset: 8},
        pointSize: Math.max(5, Math.sqrt(state.mu) * 20),
        count: 1
      }]);

      if (state.librationPointOpacity > 1e-2) {
        drawPoints({
          color: [0.8, 0, 0.1],
          points: librationPointBuffer,
          count: 5,
        });

        drawText([0, 1, 2, 3, 4].map(i => ({
          position: librationPoints.slice(i * 2, (i + 1) * 2),
          offset: [15, -15],
          index: i,
        })));
      }
    });
  });
}
