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
  top: 5vh;
  z-index: 1000;
  color: white;
  margin-left: auto;
  margin-right: auto;
}

.frame-text {
	color: white;
  text-align: left;
	max-width: 420px;
	margin-left: auto;
	margin-right: auto;
	position: relative;
	top: 10vh;
  line-height: 1.4;
  padding: 0 15px;
}

.frame-content {
  text-align: left;
  font-size: 16px;
  line-height: 1.5;

  background-color: rgba(255, 255, 255, 0.8);
  padding: 10px 12px;
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
  var drawArrows = require('./draw-vector-field')(regl);
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
    restrictedThreeBodySynodicWasRunning: false,
    dirty: true
  };

  var librationPoints;
  var librationPointBuffer = regl.buffer(new Float32Array(10));

  function updateLibrationPoints () {
    librationPoints = computeLibrationPoints(state.mu)
    librationPointBuffer.subdata(librationPoints);
  }
  updateLibrationPoints();

  var restrictedThreeBodySynodicIntegrator = require('./restricted-three-body')(state);
  var restrictedThreeBodySynodicBuffer = regl.buffer(restrictedThreeBodySynodicIntegrator.state);

  function integrateRestrictedThreeBodySynodic (dt) {
    restrictedThreeBodySynodicIntegrator.step(dt);
    restrictedThreeBodySynodicBuffer.subdata(restrictedThreeBodySynodicIntegrator.state);
  }

  var sunGravityVectorField = require('./arrow-field')(function (x, y) {
    var r = Math.sqrt(x * x + y * y);
    var r2 = r * r;
    var G = 0.1;
    var mag = Math.min(G / r2, 0.15);
    return [-x * mag / r, -y * mag / r];
  }, -4, 4, -4, 4, 0.2); 
  var sunGravityVectorFieldBuffer = regl.buffer(sunGravityVectorField);

  var centrifugalVectorField = require('./arrow-field')(function (x, y) {
    var r = Math.sqrt(x * x + y * y);
    var r2 = r * r;
    var mag = Math.min(0.2 * r2, 0.4);
    return [x / r * mag, y / r * mag];
  }, -3, 3, -3, 3, 0.4); 
  var centrifugalVectorFieldBuffer = regl.buffer(centrifugalVectorField);

  window.addEventListener('resize', () => state.dirty = true);

  var frames = [{
    raw: h('div', [
      h('h1.frame-title', "Lagrange Points and Halo Orbits"),
      h('p.frame-text', [
        'On March 30, 2021, the ',
        h('a', {href: "https://www.jwst.nasa.gov/", target: "_blank"}, "James Webb Space Telescope"),
        ' will be launched into space to supersede the Hubble Space Telescope and observe some of the most distant objects in the universe. To help escape the noisy near-Earth environment and achieve its extreme sensitivity, it will be placed beyond the moon in a so-called halo orbit around a special point in space called the Earth-Sun L',
        h('sub', 2),
        ' Lagrange point.'
      ]),
      h('p.frame-text', [
        "In this exploration, I'll describe what Lagrange points are, why we might want one, and how we can get our hands on one!"
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
    content: "Consider the earth as it orbits the sun—though any two gravitating bodies would do.",
    state: {
      orbitOpacity: [
        {t: -0.5, value: 0.0},
        {t: 0.5, value: 0.5},
      ],
      bgOpacity: [
        {t: -0.5, value: 1},
        {t: 0.5, value: 0.8}
      ],
    }
  }, {
    content: "Of course this diagram is not to scale since both bodies would be far too small to see here."
  }, {
    content: h('span', [
      "The mass of the earth is only about ",
      h('a', {href: "http://www.wolframalpha.com/input/?i=(mass+of+the+earth)+%2F+(mass+of+the+sun)+as+a+percent", target: "_blank"}, "0.0003%"),
      " the mass of the sun, so to make things interesting and a bit easier to see, we'll imagine an earth with 10% the mass of the sun."
    ]),
    state: {
      mu: [
        {t: -0.5, value: 0.001},
        {t: 0.0, value: 1 / 11},
      ]
    }
  }, {
    content: h('span', [
      "With this exaggerated mass, you can see that the sun and the earth orbit their center of mass, called their ",
      h('em', 'barycenter'), 
      ". This simplified system is called the circular ",
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
    content: "If we add a third body, it interacts gravitationally with the other two bodies, complicating things beyond what we can attack with a closed-form solution. (simulation not yet implemented)",
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
  }, {
    content: h('span', [
      "If, however, the third body is a small satellite that doesn't affect the orbits of the two larger bodies, we can say quite a bit more about the behavior. This is called the ",
      h('a', {href: "https://ocw.mit.edu/courses/aeronautics-and-astronautics/16-07-dynamics-fall-2009/lecture-notes/MIT16_07F09_Lec18.pdf", target: "_blank"}, "restricted circular three-body problem"),
      "."
    ]),
    state: {
      restrictedThreeBodySynodicOpacity: [
        {t: -0.5, value: 0.0},
        {t: 0.0, value: 1.0},
        {t: 1.0, value: 1.0},
        {t: 1.5, value: 0.0},
      ],
    }
  }, {
  }, {
    content: "To understand how the third body moves in this system, let's first look at the gravitational field of the sun.",
    state: {
      mu: [
        {t: -0.5, value: 1 / 11},
        {t: 0.0, value: 0.0},
      ],
      orbitOpacity: [
        {t: -0.5, value: 0.8},
        {t: 0.0, value: 0.0},
      ],
    }
  }, {
    content: "The sun's gravitational field pulls objects inward with strength inversely proportional to the square of distance.",
    state: {
      sunVectorFieldOpacity: [
        {t: -0.5, value: 0.0},
        {t: 0.0, value: 1.0},
      ],
    },
  }, {
    content: "We can represent the sun's gravity as a potential field.",
    state: {
      fieldOpacity: [
        {t: -0.5, value: 0.0},
        {t: 0.0, value: 1.0},
      ],
      bgOpacity: [
        {t: 0.0, value: 0.8},
        {t: 0.1, value: 0.0},
      ]
    }
  }, {
    content: "Objects in this field fall inward toward lower potential.",
    state: {
      sunVectorFieldOpacity: [
        {t: -1.0, value: 1.0},
        {t: -0.5, value: 0.0},
      ],
      fieldContourOpacity: [
        {t: -1.0, value: 0.0},
        {t: -0.5, value: 0.3},
      ],
    }
  }, {
    content: "The earth orbits in the gravitational potential well of the sun but also has its own potential well.",
    state: {
      mu: [
        {t: -0.5, value: 0.0},
        {t: 0.0, value: 1 / 11},
      ],
    }
  }, {
    content: "So far, we've observed everything from a fixed position far above the solar system.",
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
    content: "Imagine now that we, the observer, rotate at the same speed as the earth-sun system.",
    state: {
      synodicFrame: [
        {t: -0.5, value: 0.0},
        {t: 0.5, value: 1.0},
      ],
    }
  }, {
    content: h('span', [
      "In this rotating frame of reference, called the ",
      h('em', 'synodic frame'),
      ", the earth and sun appear to stand still while the rest of the universe spins around us. Of course nothing about the system has changed. The universe does not actually spin.",
    ]),
  }, {
    content: "In addition to the pull of the earth and sun, objects moving in the synodic frame are affected by centrifugal and Coriolis forces.",
    state: {
      axisOpacity: [
        {t: -0.5, value: 0.6},
        {t: 0.0, value: 0.2},
      ],
      scale: [
        {t: -2.0, value: 1.3},
        {t: 1.0, value: 1.7}
      ]
    }
  }, {
    content: "Centrifugal force is an apparent force that pulls objects outward.",
    state: {
      centrifugalVectorFieldOpacity: [
        {t: -0.5, value: 0.0},
        {t: 0.0, value: 1.0},
      ],
    }
  }, {
    content: "People like to argue that centrifugal force is not real. They're not wrong, but in the rotating synodic frame it's a very real acceleration which we must account for.",
    state: {
      centrifugalVectorFieldOpacity: [
        {t: 0.5, value: 1.0},
        {t: 1.0, value: 0.0},
      ],
    }
  }, {
    content: "Coriolis forces are a bit more complicated and depend on the velocity of an object as it moves in the synodic frame. An object stationary in the synodic frame experiences no Coriolis force."
  }, {
    content: "In what follows, we'll neglect Coriolis forces, which means our results will only apply to objects stationary in synodic frame."
  }, {
    content: "We account for apparent centrifugal force by building its outward pull into our potential.",
    state: {
      centrifugalVectorFieldOpacity: [
        {t: -0.5, value: 0.0},
        {t: 0.0, value: 1.0},
        {t: 0.7, value: 0.0},
      ],
      synodicField: [
        {t: 0.0, value: 0.0},
        {t: 0.7, value: 1.0},
      ],
    }
  }, {
    content: "The resulting field is called the \"pseudo-potential\". It's not the real gravitational potential, but it allows us to calculate the force on objects stationary in the synodic frame.",
  }, {
    content: h('span', [
      "The pseudo-potential has five equilibrium points at which stationary objects experience no net force. These are called the Lagrange or libration points, abbreviated L",
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
      "Objects at the Lagrange points orbit in a fixed position relative to the earth and sun and experience no net pull away from the respective Lagrange point.",
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
      "The location of the Lagrange points depends only upon the relative masses of the two bodies.",
    ]),
    state: {
      mu: [
        {t: -0.2, value: 1 / 11},
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
        {t: 0.5, value: 1 / 11},
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

  scrollyteller.onUpdate(sequencer.setPosition);
  sequencer.setPosition(0);

  var prevTime = null;
  var dt;
  regl.frame(ctx => {
    if (prevTime !== null) dt = ctx.time - prevTime;
    prevTime = ctx.time;
    
    //if (ctx.tick % 60 !== 1) return;

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
          opacity: state.fieldOpacity,
          contourOpacity: state.fieldContourOpacity,
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

      if (state.sunVectorFieldOpacity > 1e-4) {
        drawArrows({
          points: sunGravityVectorFieldBuffer,
          count: sunGravityVectorField.length,
          arrowheadWidth: 8,
          arrowheadLenth: 10,
          lineWidth: 2,
          color: [1.0, 0.95, 0.75, state.sunVectorFieldOpacity],
        });
      }

      if (state.centrifugalVectorFieldOpacity > 1e-4) {
        drawArrows({
          points: centrifugalVectorFieldBuffer,
          count: centrifugalVectorField.length,
          arrowheadWidth: 12,
          arrowheadLength: 14,
          lineWidth: 4,
          color: [0.8, 0.95, 1.0, state.centrifugalVectorFieldOpacity],
        });
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

      if (state.restrictedThreeBodySynodicOpacity > 1e-4) {
        if (!state.restrictedThreeBodySynodicWasRunning) {
          restrictedThreeBodySynodicIntegrator.initialize();
          state.restrictedThreeBodySynodicWasRunning = true;
        }

        // Draw the third body
        integrateRestrictedThreeBodySynodic(dt);

        drawPoints({
          color: [0.7, 0.7, 0.7, 1],
          points: {buffer: restrictedThreeBodySynodicBuffer},
          pointSize: 10,
          count: 1
        });
      } else {
          state.restrictedThreeBodySynodicWasRunning = false;
      }

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
