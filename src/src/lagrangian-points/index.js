'use strict';

var computeLibrationPoints = require('./lagrange-points');
var createScrollyteller = require('./scrollyteller');
var createSequencer = require('./sequencer');
var h = require('h');

function mergeFrameSequences (frames) {
  var sequences = {};
  for (var i = 0; i < frames.length; i++) {
    var frameState = frames[i].state;
    if (!frameState) continue;
    var stateKeys = Object.keys(frameState);
    for (var j = 0; j < stateKeys.length; j++) { var stateKey = stateKeys[j];
      var input = frameState[stateKey].map(set => Object.assign({}, set, {t: i + set.t}));
      var seq = sequences[stateKey];
      sequences[stateKey] = (sequences[stateKey] || []).concat(input);
    }
  }
  return sequences;
}

require('insert-css')(`
body {
  background-color: black;
}

a,
a:visited {
	color: #8bd;
}
a:hover {
	color: #ace;
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
	font-family: 'Open Sans', sans-serif;
  height: 100vh;
  position: relative;
  text-align: center;
}

.frame-content a,
.frame-content a:visited {
	color: #345;
}
.frame-content a:hover {
	color: #456;
}

.frame-title {
  font-weight: 400;

  position: relative;
  top: 15vh;
  z-index: 1000;
  color: white;
  margin-left: auto;
  margin-right: auto;
}

.frame-hero {
	color: white;
  text-align: left;
	max-width: 420px;
	margin-left: auto;
	margin-right: auto;
	position: relative;
	top: 20vh;
}

.frame-content {
  text-align: left;
  font-size: 16px;
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
        frame.raw && frame.raw,
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
    scale: 1.5,
    synodicFrame: 0,
    synodicField: 0,
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
    raw: h('div', [
      h('h1.frame-title', "Lagrangian Points"),
      h('p.frame-hero', [
        'On March 30, 2021, the ',
        h('a', {href: "https://www.jwst.nasa.gov/", target: "_blank"}, "James Webb Space Telescope"),
        ' will be launched into space in order to supersede the Hubble Telescope and observe some of the most distant objects in the universe. To help escape the noisy environment near Earth and achieve extreme sensitivity, it will be placed beyond the moon in a halo orbit around the Earth-Sun L',
        h('sub', 2),
        ' Lagrangian point.'
      ]),
      h('p.frame-hero', [
        "In this walkthrough, I'll describe what Lagrangian points are, why we might want one, and how we can get one!"
      ])
    ]),
    state: {
      scale: [
        {t: -1.0, value: 1.7},
        {t: 1.0, value: 1.3},
      ],
      y0: [
        {t: -2.0, value: -2.2},
        {t: 2.0, value: 0.0},
      ],
      bgOpacity: [
        {t: 0, value: 1}
      ],
    },
  }, {
    content: "Consider the earth as it orbits the sun—though not to scale of course since both would be far too small to see here.",
    state: {
      orbitOpacity: [
        {t: -0.5, value: 0.0},
        {t: 0.5, value: 0.5},
      ],
      bgOpacity: [
        {t: -0.5, value: 1},
        {t: 0.5, value: 0.5}
      ],
    }
  }, {
    content: h('span', [
      "The mass of the earth is only about ",
      h('a', {href: "http://www.wolframalpha.com/input/?i=(mass+of+the+earth)+%2F+(mass+of+the+sun)+as+a+percent", target: "_blank"}, "0.0003%"),
      " the mass of the sun, so to make things interesting and a bit easier to see, we'll imagine an earth with 10% the mass of the sun."
    ]),
    state: {
      mu: [
        {t: -0.5, value: 0.001},
        {t: 0.5, value: 0.1},
      ]
    }
  }, {
    content: h('span', [
      "With this exaggereated mass, you can see that the sun and the earth orbit a common point. This simplified system is called a circular ",
      h('a', {href: "https://en.wikipedia.org/wiki/Two-body_problem", target: "_blank"}, "two-body problem"),
      " and is relatively easy to solve."
    ]),
    state: {
      axisOpacity: [
        {t: -0.5, value: 0.0},
        {t: 0.4, value: 0.5},
      ],
      orbitOpacity: [
        {t: -0.5, value: 0.5},
        {t: 0.5, value: 0.4},
      ],
    }
  }, {
    content: "If we add a third body, it interacts gravitationally with the other two bodies, complicatings things beyond what we can attack with a closed-form solution.",
    state: {
      axisOpacity: [
        {t: -0.4, value: 0.5},
        {t: 0.0, value: 0.0},
      ],
      orbitOpacity: [
        {t: -0.4, value: 0.4},
        {t: 0.0, value: 0.0},
      ]
    }
    
  }, {
    content: h('span', [
      "If, however, the third body is a small satellite that does't affect the orbits of the two larger bodies, we can say quite a bit more about the behavior. This is called the ",
      h('a', {href: "https://ocw.mit.edu/courses/aeronautics-and-astronautics/16-07-dynamics-fall-2009/lecture-notes/MIT16_07F09_Lec18.pdf", target: "_blank"}, "restricted circular three-body problem"),
      "."
    ])
  }, {
    content: "To understand how the third body moves in this system, let's first look at the gravitational field of the sun.",
    state: {
      mu: [
        {t: -0.5, value: 0.1},
        {t: 0.0, value: 0.0},
      ],
      orbitOpacity: [
        {t: -0.5, value: 0.8},
        {t: 0.0, value: 0.0},
      ],
    }
  }, {
    content: "We can represent the gravitational field of the sun as a potential field which pulls objects inward toward lower potential.",
    state: {
      fieldOpacity: [
        {t: -0.5, value: 0.0},
        {t: 0.0, value: 1.0},
      ],
      bgOpacity: [
        {t: 0.0, value: 0.5},
        {t: 0.1, value: 0.0},
      ]
    }
  }, {
    content: "The earth orbits in the gravitational potential well of the sun but also has its own potential well (recall here greatly exaggerated in size relative to the sun's).",
    state: {
      mu: [
        {t: -0.5, value: 0.0},
        {t: 0.0, value: 0.1},
      ],
    }
  }, {
    content: "So far, we've observed everything from a non-rotating fixed position far above the solar system.",
    state: {
      axisOpacity: [
        {t: -0.5, value: 0.0},
        {t: 0.0, value: 0.6},
      ],
      orbitOpacity: [
        {t: -0.5, value: 0.0},
        {t: 0.0, value: 1.0},
      ],
    }
  }, {
    content: "Consider what would happen though if we, the observer, rotate at the same speed as the Earth-sun system.",
    state: {
      synodicFrame: [
        {t: -0.5, value: 0.0},
        {t: 0.5, value: 1.0},
      ],
    }
  }, {
    content: "In our rotating frame of reference, the Earth and Sun stand still and the rest of the universe spins around us.",
  }, {
    content: "Nothing has changed about the physical system, but from our rotating viwepoint, the potential field no longer describes the movement of a third body.",
    state: {
      axisOpacity: [
        {t: -0.5, value: 0.6},
        {t: 0.0, value: 0.2},
      ],
    }
  }, {
    content: "In order to account for our rotation, we add the outward pull of apparent \"centrifugal force\" to our potential, calling the resulting field a \"pseudo-potential\" to clarify that although it now describes the movement of bodies in our rotating frame, it's not the true gravitational potential.",
    state: {
      synodicField: [
        {t: 0.0, value: 0.0},
        {t: 0.7, value: 1.0},
      ],
      scale: [
        {t: -2.0, value: 1.3},
        {t: 1.0, value: 1.7}
      ]
    }
  }, {
    content: h('span', [
      "The pseudo-potential has five flat points where objects experience no net force in the rotating frame. These are called the Lagrangian points or libration points, abbreviated L",
      h('sub', 1),
      ' through L',
      h('sub', 5),
      '.'
    ]),
    state: {
      librationPointOpacity: [
        {t: -0.25, value: 0},
        {t: 0.15, value: 1.0},
      ]
    }
  }, {
    content: h('span', [
      "In the non-rotating frame, objects at the Lagrangian points orbit in a fixed relative position to the earth and sun and experience no net push away from the respective point.",
    ]),
    state: {
      synodicField: [
        {t: -0.5, value: 1.0},
        {t: 0.0, value: 0.0},
      ],
      synodicFrame: [
        {t: -0.5, value: 1.0},
        {t: 0.0, value: 0.0},
      ]
    }
  }, {
    state: {
      synodicField: [
        {t: 0.0, value: 0.0},
        {t: 0.5, value: 1.0},
      ],
      synodicFrame: [
        {t: 0.0, value: 0.0},
        {t: 0.5, value: 1.0},
      ]
    }
  }, {
    content: h('span', [
      "The location of the Lagrangian points depends only upon the relative masses of the two bodies.",
    ]),
    state: {
      mu: [
        {t: -0.2, value: 0.1},
        {t: 0.4, value: 0.5},
      ],
    }
  }, {
    state: {
      mu: [
        {t: 0.8, value: 1e-3},
      ],
    }
  }, {
  }, {
    state: {
      mu: [
        {t: 0.5, value: 0.1},
      ],
    }
  }];

  var sequencer = createSequencer(mergeFrameSequences(frames));

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
      var nSunDash = Math.ceil(10 + sunOrbitCircumference / 0.4);
      var nEarthDash = Math.ceil(10 + earthOrbitCircumference / 0.4);

      var nSunOrbit = Math.max(1, Math.floor(Math.sqrt(sunOrbitCircumference / 0.001)));
      var nEarthOrbit = Math.max(1, Math.floor(Math.sqrt(earthOrbitCircumference / 0.001)));
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
    tmax: frames.length - 1
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
          lineWidth: 1.5,
        }, {
          points: earthOrbitBuffer,
          count: earthOrbit.length / 3,
          color: [1, 1, 1, state.orbitOpacity],
          lineWidth: 1.5,
        }]);
      }

      drawPoints([{
        // Draw the sun:
        color: [1.0, 0.9, 0.4, 1],
        points: {buffer: sunMoonBuffer},
        pointSize: Math.max(8, Math.sqrt(1.0 - state.mu) * 30),
        count: 1
      }, {
        // Draw the earth:
        color: [0.2, 0.4, 1, 1],
        points: {buffer: sunMoonBuffer, offset: 8},
        pointSize: Math.max(8, Math.sqrt(state.mu) * 30) * (state.mu > 1e-4 ? 1.0 : 0.0),
        count: 1
      }]);

      if (state.librationPointOpacity > 1e-2) {
        drawPoints({
          color: [0.8, 0, 0.1, state.librationPointOpacity],
          points: librationPointBuffer,
          count: 5,
        });

        drawText([0, 1, 2, 3, 4].map(i => ({
          opacity: state.librationPointOpacity,
          position: librationPoints.slice(i * 2, (i + 1) * 2),
          offset: [15, -15],
          index: i,
        })));
      }
    });
  });
}
