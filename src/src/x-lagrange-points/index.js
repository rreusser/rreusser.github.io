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
  height: 110vh;
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
  padding: 0 15px;
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

var preferredPixelRatio = 1.5;
if (window.innerWidth > 640) {
  preferredPixelRatio = 1.25;
} else if (window.innerWidth > 800) {
  preferredPixelRatio = 1.125;
} else if (window.innerWidth > 1024) {
  preferredPixelRatio = 1;
}

require('regl')({
  pixelRatio: Math.min(window.devicePixelRatio, preferredPixelRatio),
  extensions: [
    'oes_standard_derivatives',
    'angle_instanced_arrays',
  ],
  attributes: {
    antialias: true,
    alpha: false,
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
    var mag = Math.min(G / r2, 0.2);
    return [-x * mag / r, -y * mag / r];
  }, -4, 4, -4, 4, 0.25); 
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
      h('h1.frame-title', "The Three-Body Problem"),
      h('p.frame-text', [
        "Just as the earth resists our best attempts at jumping or the sun pulls the earth around in its orbit, we all have some sense of what it means for objects to pull on each other gravitationally. Still, even though everything pulls on everything simultaneously, we don't typically consider more than two objects at a time.",
      ]),
      h('p.frame-text', [
        "In this exploration, we'll go a step further and consider what it means for two bodies to pull on a third."
      ]),
        /*'On March 30, 2021, the ',
        h('a', {href: "https://www.jwst.nasa.gov/", target: "_blank"}, "James Webb Space Telescope"),
        ' will be launched into space to supersede the Hubble Space Telescope and observe some of the most distant objects in the universe. To help escape the noisy near-Earth environment and achieve its extreme sensitivity, it will be placed beyond the moon in a so-called halo orbit around a special point in space called the Earth-Sun L',
        h('sub', 2),
        ' Lagrange point.'
      ]),
      h('p.frame-text', [
        "This exploration will walk through what Lagrange points are, how they relate to halo orbits, and how we can get our hands on one! (copy needs work)"
      ])*/
    ]),
    state: {
      omega: [
        {t: -1, value: 0.8},
      ],
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
    content: h('span', [
      "Consider the earth as it orbits the sun (not to scale), though any two gravitating bodies would do.",
      ], h('br'), h('br'),
      "The orbit isn't perfectly circular, but at ",
      //h('a', {href: "https://www.wolframalpha.com/input/?i=earth+orbit", target: "_blank"}, "147,100,000 km from the sun at it closest approach to 152,100,000 km at its furthest"),
      "147,100,000 km from the sun at Earth's closest approach (",
      h('em', h('a', {href: "https://en.wikipedia.org/wiki/Apsis", target: "_blank"}, "perihelion")),
      ") to 152,100,000 km at its farthest (",
      h('em', h('a', {href: "https://en.wikipedia.org/wiki/Apsis", target: "_blank"}, "aphelion")),
      "), it's close enough we'll treat it as circular.",
    ),
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
    content: h('span', [
      "The mass of the earth is only about ",
      h('a', {href: "http://www.wolframalpha.com/input/?i=(mass+of+the+earth)+%2F+(mass+of+the+sun)+as+a+percent", target: "_blank"}, "0.0003%"),
      " the mass of the sun. To make things interesting and easier to see, we'll imagine an Earth with 10% the mass of the sun."
    ]),
    state: {
      mu: [
        {t: -0.5, value: 0.001},
        {t: 0.5, value: 1 / 11},
      ]
    }
  }, {
    content: h('span', [
      "With this exaggerated mass, we see that the sun and the earth orbit their collective center of mass. This system is called the ",
      h('em', [
        h('a', {href: "https://en.wikipedia.org/wiki/Two-body_problem", target: "_blank"}, "two-body problem"),
      ]),
      " and is very straightforward to solve."
    ]),
    state: {
      axisOpacity: [
        {t: -0.5, value: 0.0},
        {t: 0.5, value: 0.5},
      ],
      orbitOpacity: [
        {t: -0.5, value: 0.5},
        {t: 0.5, value: 0.4},
      ],
    }
  }, {
    content: h('span', [
      "A third body interacts gravitationally with the other two. This system is called the ",
      h('em', h('a', {href: "https://en.wikipedia.org/wiki/Three-body_problem", target: "_blank"}, "three-body problem")),
      " and immediately complicates things beyond our ability to solve directly. (simulation not yet implemented)",
    ]),
    state: {
      axisOpacity: [
        {t: -0.25, value: 0.5},
        {t: 0.0, value: 0.0},
      ],
      orbitOpacity: [
        {t: -0.25, value: 0.4},
        {t: 0.0, value: 0.0},
      ],
      synodicPointsOpacity: [
        {t: -0.25, value: 1.0},
        {t: -0.0, value: 0.0},
      ],
      generalThreeBodyOpacity: [
        {t: -0.25, value: 0.0},
        {t: 0.0, value: 1.0},
        {t: 1.0, value: 1.0},
        {t: 1.5, value: 0.0},
      ],
    }
  }, {
    state: {
      orbitOpacity: [
        {t: 0.5, value: 0.0},
        {t: 0.75, value: 0.4},
      ],
      synodicPointsOpacity: [
        {t: 0.5, value: 0.0},
        {t: 0.75, value: 1.0},
      ],
    },
  }, {
    content: h('span', [
      "If, however, we add the restriction that the the mass of the third body is insignificant relative to the two larger bodies, we can say quite a bit about the behavior. This is called the ",
      h('em', h('a', {href: "https://ocw.mit.edu/courses/aeronautics-and-astronautics/16-07-dynamics-fall-2009/lecture-notes/MIT16_07F09_Lec18.pdf", target: "_blank"}, "restricted circular three-body problem")),
      "."
    ]),
    state: {
      thirdBodyColor: [
        {t: -0.5, value: [0.7, 0.7, 0.7, 0]},
        {t: -0.25, value: [0.7, 0.7, 0.7, 1]},
      ],
      restrictedThreeBodyInitialConditions: [
        {t: -1.0, value: [1.13, 0, 0, -0.935]},
        {t: 2.0, value: [1.13, 0, 0, -0.935]},
      ],
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
        {t: 0.0, value: 0.5},
      ],
      sunVectorFieldLength: [
        {t: -0.5, value: 0.0},
        {t: 0.0, value: 1.0},
      ],
    },
  }, {
    content: "We can represent the sun's gravity as a potential field. Objects in this field fall inward toward lower potential.",
    state: {
      omega: [
        {t: -1, value: 0.8},
        {t: 0, value: 0.3},
      ],
      fieldOpacity: [
        {t: 0.0, value: 0.0},
        {t: 0.5, value: 1.0},
      ],
      sunVectorFieldOpacity: [
        {t: 0.0, value: 0.5},
        {t: 1.0, value: 0.0},
      ],
      fieldContourOpacity: [
        {t: 0.0, value: 0.0},
        {t: 0.5, value: 0.3},
      ],
      bgOpacity: [
        {t: 0.0, value: 0.8},
        {t: 0.1, value: 0.7},
      ]
    }
  }, {
    content: "In the circular two-body problem, the earth and sun fall into each other's gravitational fields and sit in circular orbits.",
    state: {
      mu: [
        {t: -0.5, value: 0.0},
        {t: 0.25, value: 1 / 11},
      ],
      orbitOpacity: [
        {t: -0.5, value: 0.0},
        {t: 0.25, value: 1.0},
      ],
    }
  }, {
    content: "We now want to consider a small third body moving in this potential. Unfortunately, it's a bit too difficult for us to analyze moving objects in moving gravitational fields.",
    state: {
      restrictedThreeBodyInitialConditions: [
        {t: -1.0, value: [1.00, 0, 0, -1.0]},
        {t: 4.0, value: [1.00, 0, 0, -1.0]},
      ],
      thirdBodyColor: [
        {t: -1, value: [0.7, 0.7, 0.7, 1]},
        {t: 4, value: [0.7, 0.7, 0.7, 1]},
      ],
      restrictedThreeBodySynodicOpacity: [
        {t: 0.0, value: 0.0},
        {t: 0.5, value: 1.0},
      ],
    }
  }, {
    content: h('span', [
      "To simplify things, imagine that we, the observer, rotate at the same speed as the earth-sun system.",
      h('br'), h('br'),
      h('span', [
        "In this rotating frame of reference, called the ",
        h('em', 'synodic frame'),
        ", the earth and sun appear",
        //h('em', 'appear'),
        " to stand still while the rest of the universe spins around us.",
      ]),
    ]),
    state: {
      synodicFrame: [
        {t: -0.5, value: 0.0},
        {t: 0.5, value: 1.0},
      ],
    }
  }, {
    content: h('span', [
      "We can still use our potential field to compute the force of gravity, but to correctly describe the motion from our rotating frame, we must also add the apparent ",
      h('em', h('a', {href: "https://en.wikipedia.org/wiki/Centrifugal_force", target: "_blank"}, "centrifugal")),
      " and ",
      h('em', h('a', {href: "https://en.wikipedia.org/wiki/Coriolis_force", target: "_blank"}, "Coriolis")),
      " forces.",
    ]),
    state: {
      /*axisOpacity: [
        {t: -0.5, value: 0.6},
        {t: 0.0, value: 0.0},
      ],*/
      scale: [
        {t: -2.0, value: 1.3},
      ],
    }
  //}, {
    //content: "People like to argue that these forces aren't real. They're not wrong, but we must include them to accurately describe motion from our rotating frame of reference.",
  }, {
    content: h('span', [
      "Objects moving in a straight line appear to get deflected when seen from a rotating frame. This is called the Coriolis effect.",
      h('br'), h('br'),
      "It's nothing more than a fictitious force to help account for our rotation, but since it depends on the velocity of the object, it's a bit inconvenient. We'll neglect the Coriolis force with the caveat that we'll only be able to talk about objects stationary in the synodic frame."
    ]),
  }, {
    content: "Centrifugal force is simpler. It's an apparent outward pull seen in rotating frames.",
    state: {
      scale: [
        {t: 1.5, value: 1.7}
      ],
      centrifugalVectorFieldOpacity: [
        {t: -0.25, value: 0.0},
        {t: 0.25, value: 1.0},
      ],
      centrifugalVectorFieldLength: [
        {t: -0.25, value: 0.0},
        {t: 0.25, value: 1.0},
      ],
    }
  }, {
    content: "We can easily build centrifugal force into our potential as an outward pull that counteracts gravity's inward pull.",
    state: {
      centrifugalVectorFieldOpacity: [
        {t: -0.25, value: 1.0},
        {t: 0.5, value: 0.0},
      ],
      synodicField: [
        {t: -0.25, value: 0.0},
        {t: 0.5, value: 1.0},
      ],
    }
  }, {
    content: h('span', [
      "Since we neglected the Coriolis force, the resulting field is called the ",
      h("em", 'pseudo-potential'),
      ".",
      h('br'), h('br'),
      "It's not a full gravitational potential for our rotating frame, but it does work for objects stationary in the synodic frame.",
    ]),
    state: {
      restrictedThreeBodySynodicOpacity: [
        {t: 0.0, value: 1.0},
        {t: 0.5, value: 0.0},
      ],
    },
  }, {
    content: "For a single gravitating body and a given rotational speed, there's a radius at which the pseudo-potential is simply flat.",
    state: {
      mu: [
        {t: -0.5, value: 1 / 11},
        {t: 0.0, value: 0},
      ]
    }
  }, {
    content: "Satellites with negligible mass can sit in a circular orbit anywhere in this ring.",
    state: {
      mu: [
        {t: -0.25, value: 0},
        {t: 0.25, value: 1e-7},
      ]
    }
  }, {
    content: "If both bodies are massive, however, the pseudo-potential is more complicated.",
    state: {
      mu: [
        {t: -0.25, value: 1e-7},
        {t: 0.25, value: 1/11},
      ]
    }
  }, {
    content: h('span', [
      "In fact the pseudo-potential for two bodies has five separate equilibrium points at which stationary objects remain stationary. These are called the ",
      h('em', 'Lagrange'),
      ' or ',
      h('em', 'libration points'),
      ", abbreviated L",
      h('sub', 1),
      ' through L',
      h('sub', 5),
      '.'
    ]),
    state: {
      librationPointOpacity: [
        {t: -0.25, value: 0},
        {t: 0.05, value: 1.0},
      ]
    }
  }, {
    content: h('span', [
      "Objects at the Lagrange points orbit together with the earth and sun and experience no net pull away from the respective Lagrange point.",
    ]),
    state: {
      fieldOpacity: [
        {t: -0.25, value: 1.0},
        {t: 0.1, value: 0.35},
        {t: 0.8, value: 0.35},
        {t: 1.0, value: 1.0},
      ],
      synodicFrame: [
        {t: -0.3, value: 1.0},
        {t: 0.0, value: 0.0},
      ],
    }
  }, {
    content: h('span', [
      "The location of the Lagrange points depends only on the relative masses of the two bodies.",
    ]),
    state: {
      synodicFrame: [
        {t: -0.25, value: 0.0},
        {t: -0.05, value: 1.0},
      ],
      mu: [
        {t: 0.5, value: 1 / 11},
      ],
    }
  }, {
    content: "For two equally massive bodies, the Lagrange points are symmetric.",
    state: {
      mu: [
        {t: 0.2, value: 0.5},
        {t: 1.0, value: 0.5},
      ],
    }
  }, {
  }, {
    content: "For the earth and sun, the Lagrange points look more like this.",
    state: {
      mu: [
        {t: 0.0, value: 1e-3},
        {t: 1.0, value: 1e-3},
      ]
    }
  }, {
    state: {
      mu: [
        {t: 0.5, value: 1 / 11},
      ],
    }
  }, {
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
      if (state.fieldOpacity > 1e-4) {
        drawField({
          opacity: state.fieldOpacity,
          contourOpacity: state.fieldContourOpacity,
        });
      }

      if (state.bgOpacity > 1e-4) {
        drawBackground({
          opacity: state.bgOpacity
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
          lengthMultiplier: state.sunVectorFieldLength,
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
          lengthMultiplier: state.centrifugalVectorFieldLength,
          color: [0.8, 0.95, 1.0, state.centrifugalVectorFieldOpacity],
        });
      }


      drawPoints([{
        // Draw the sun:
        color: [1.0, 0.9, 0.4, 1 * state.synodicPointsOpacity],
        points: {buffer: sunMoonBuffer},
        pointSize: Math.max(8, Math.sqrt(1.0 - state.mu) * 30),
        halo: 0.3,
        count: 1
      }, {
        // Draw the earth:
        color: [0.2, 0.4, 1, 1 * state.synodicPointsOpacity],
        points: {buffer: sunMoonBuffer, offset: 8},
        pointSize: Math.max(10, Math.sqrt(state.mu) * 30) * (state.mu > 1e-8 ? 1.0 : 0.0),
        halo: 0.1,
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
          color: state.thirdBodyColor,
          points: {buffer: restrictedThreeBodySynodicBuffer},
          pointSize: 10,
          halo: 0.2,
          count: 1
        });
      } else {
          state.restrictedThreeBodySynodicWasRunning = false;
      }

      if (state.librationPointOpacity > 1e-2) {
        drawPoints({
          color: [1.0, 0, 0.1, state.librationPointOpacity],
          points: librationPointBuffer,
          halo: 0.2,
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
