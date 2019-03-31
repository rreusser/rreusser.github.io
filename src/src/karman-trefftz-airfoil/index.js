var State = require('controls-state');
var GUI = require('/Users/rreusser/node/rreusser/controls-gui/index');
var css = require('insert-css');
var fs = require('fs');
var katex = require('katex');

var katexCss = fs.readFileSync(__dirname + '/../../node_modules/katex/dist/katex.min.css', 'utf8');

var d3scale = require('d3-scale');

var qs = require('query-string');
var q = qs.parse(window.location.search);

function downloadURI(uri, name) {
  var link = document.createElement("a");
  link.download = name;
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

var fontFamily = 'Fira Sans Condensed';

css(katexCss);
css(`
@import url('https://fonts.googleapis.com/css?family=${fontFamily.replace(/ /g, '+')}');

html, body {
  margin: 0;
  padding: 0;
  background-color: black;
}

.sketch-nav {
  right: auto !important;
  left: 0 !important;
}

.control-panel {
  margin-bottom: 5em;
}

.rawContent {
  max-width: 100%;
}

.rawContent svg {
  max-width: 100%;
}

canvas {
  margin-left: auto;
  margin-right: auto;
  display: inline-block;
  position: fixed !important;
}
`)

var canvas = null;
if (q.w && q.h) {
  var dpr = q.dpr ? parseFloat(q.dpr) : 1;
  canvas = document.createElement('canvas');
  canvas.width = q.w * dpr;
  canvas.height = q.h * dpr;
  canvas.style.width = parseInt(q.w) + 'px'
  canvas.style.height = parseInt(q.h) + 'px'
  document.body.append(canvas);
}

var regl = require('regl')({
  extensions: ['oes_standard_derivatives'],
  pixelRatio: Math.min(1.5, window.devicePixelRatio),
  canvas: canvas,
  attributes: {
    antialias: false,
    stencil: false,
    depth: false,
    alpha: false,
    preserveDrawingBuffer: true
  },
  onDone: (err, regl) => {
    if (err) return require('fail-nicely')(err);
    document.querySelector('canvas').addEventListener('mousewheel', e => e.preventDefault());
    run(regl);
  }
});

function run (regl) {
  var size = [61, 141];

  var camera = require('./camera-2d')(regl, {xmin: -1.7, xmax: 2.3});
  window.addEventListener('resize', camera.resize);

  var mesh = require('./mesh')(
    (r, th) => [Math.pow(r, 1.5), th],
    size[0], size[1], [0, 1], [0, Math.PI * 2]
  );


  var state = State({
    Introduction: State.Section({
      intro: State.Raw(h => h('div', {className: 'rawContent'}, 
        h('p', null, `
          This demo displays inviscid, irrotational `,h('a', {href: "https://en.wikipedia.org/wiki/Potential_flow"}, 'potential flow'), ` over an airfoil section using the `,
          h('a', {href: 'https://en.wikipedia.org/wiki/Joukowsky_transform#K%C3%A1rm%C3%A1n%E2%80%93Trefftz_transform', title: 'Kármán-Trefftz Transform'}, 'Kármán-Trefftz'),
          ` conformal map. `, h('a', {href: 'https://en.wikipedia.org/wiki/Conformal_map'}, 'Conformal maps'), ` are transformations that preserve
          right angles—with the remarkable property that they also therefore preserve
          fluid flows.`
        ),
        h('p', null, `We'll look at the geometry of a cylindrical cross section under the transform, then at the aerodynamics that result.
      `)),
      )
    }),
    geometry: State.Section({
      //Explanation: State.Section({
        intro: State.Raw(h => {
          function eqn (str, opts) {
            return h('span', Object.assign({
              dangerouslySetInnerHTML: {__html: katex.renderToString(str)}
            }, opts || {}));
          }

          return h('div', {className: 'rawContent'}, 
            h('p', {}, `
              The Kármán-Trefftz transform is a conformal map given by the complex function`,
              eqn(
                `\\displaystyle z=n {\\frac {(\\zeta+1)^{n}+(\\zeta-1)^{n}}{(\\zeta+1)^{n}-(\\zeta-1)^{n}}},`,
                {style: {display: 'block', margin: '0.5em auto', textAlign: 'center'}},
              ),
              `where `,eqn('\\zeta'), ` is the preimage and `,eqn('z'),` is the image. `,

              `The diagram below shows the cylinder preimage in the `, eqn(`\\zeta`), `-plane. `,
            ),

            h('p', {}, 
              `The Kármán-Trefftz transform has singularities at points `, eqn(`-1 + 0i`), ` and `,eqn(`1 + 0i`),`. `,

              `We constrain the cylinder to pass through `, eqn(`1 + 0i`), `, and it's this singularity that maps to the trailing edge
              of the airfoil. Move the center of the cylinder `,eqn('\\mu'),` and observe the effect it has on
              the shape of the airfoil.`,
            ),

            h('p', {}, 
              `When `, eqn('n = 1'),` it reduces to `, eqn('z = \\zeta'), ` and leaves the cylinder unchanged. `,

              `When `, eqn('n = 2'),` it reduces to the `,
                h('a', {href: 'https://en.wikipedia.org/wiki/Joukowsky_transform', title: 'Joukowsky Transform'}, 'Joukowsky Transform'),
              ` and produces an airfoil with an infinitely sharp and thin trailing edge. `,
            ),

          )
        }),
      //}, {
        //expanded: false
      //}),
      diagram: State.Raw((h, props) => {
        var aspectRatio = 1.5;
        var width = 320;
        var height= width / aspectRatio;
        var margin = 1;
        var x = d3scale.scaleLinear().domain([-2 * aspectRatio, 2 * aspectRatio]).range([margin, width - margin]);
        var y = d3scale.scaleLinear().domain([-2, 2]).range([height - margin, margin]);
        var mux = x(props.parentState.mux);
        var muy = y(props.parentState.muy);
        var r0 = Math.sqrt(Math.pow(1 - props.parentState.mux, 2) + Math.pow(props.parentState.muy, 2)) * 1;//props.parentState.radius;
        var radius = x(props.parentState.mux + r0) - mux;
        var theta = Math.atan2(props.parentState.muy, 1 - props.parentState.mux);

        return h('div', {className: 'rawContent'}, h('svg', {
          style: {display: 'block', margin: '5px auto'},
          width: width,
          height: height
        },

          // horizontal gridlines
          [-3, -2, -1, 0, 1, 2, 3].map(i => h('line', {
            x1: x(i),
            x2: x(i),
            y1: y(-10),
            y2: y(10),
            stroke: 'rgba(255,255,255,'+(i === 0 ? 0.8 : 0.3)+')',
            'stroke-dasharray': i === 0 ? 2 : 2,
            'stroke-width': 1,
          })),

          // vertical gridlines
          [-2, -1, 0, 1, 2].map(i => h('line', {
            x1: x(-10),
            x2: x(10),
            y1: y(i),
            y2: y(i),
            stroke: 'rgba(255,255,255,'+(i === 0 ? 0.8 : 0.3)+')',
            'stroke-dasharray': i === 0 ? 2 : 2,
            'stroke-width': 1,
          })),

          // (1, 0) reticle
          h('line', {
            x1: x(1) - 4,
            x2: x(1) + 4,
            y1: y(0) - 4,
            y2: y(0) + 4,
            stroke: 'rgba(255,80,50,1)',
            'stroke-width': 2
          }),
          h('line', {
            x1: x(1) - 4,
            x2: x(1) + 4,
            y1: y(0) + 4,
            y2: y(0) - 4,
            stroke: 'rgba(255,80,50,1)',
            'stroke-width': 2
          }),

          // (-1, 0) reticle
          h('line', {
            x1: x(-1) - 4,
            x2: x(-1) + 4,
            y1: y(0) - 4,
            y2: y(0) + 4,
            stroke: 'rgba(255,80,50,1)',
            'stroke-width': 2
          }),
          h('line', {
            x1: x(-1) - 4,
            x2: x(-1) + 4,
            y1: y(0) + 4,
            y2: y(0) - 4,
            stroke: 'rgba(255,80,50,1)',
            'stroke-width': 2
          }),
          h('circle', {
            cx: x(props.parentState.mux),
            cy: y(props.parentState.muy),
            r: radius,
            stroke: 'white',
            fill: 'rgba(255, 255, 255, 0.05)',
            'stroke-width': 1
          }),

          // mu center reticle
          h('line', {
            x1: mux - 6,
            x2: mux + 6,
            y1: muy,
            y2: muy,
            stroke: 'rgba(255,255,255,1)',
            'stroke-width': 2
          }),
          h('line', {
            x1: mux,
            x2: mux,
            y1: muy - 6,
            y2: muy + 6,
            stroke: 'rgba(255,255,255,1)',
            'stroke-width': 2
          }),

          // (1, 0) label
          h('text', {
            x: x(1) + 3,
            y: y(0) + 13,
            fill: 'white',
            style: {'text-shadow': '0 0 2px black', 'font-style': 'italic', 'font-family': 'serif'}},
            '1 + 0i'
          ),

          // (-1, 0) label
          h('text', {
            x: x(-1) + 3,
            y: y(0) + 13,
            fill: 'white',
            'text-anchor': 'start',
            style: {'text-shadow': '0 0 2px black', 'font-style': 'italic', 'font-family': 'serif'}},
            '-1 + 0i'
          ),

          // mu label
          h('text', {
            x: mux - 3,
            y: muy - 3,
            fill: 'white',
            'text-anchor': 'end',
            style: {'text-shadow': '0 0 2px black', 'font-style': 'italic', 'font-family': 'serif'}},
            'µ'
          ),

          // radius line
          h('line', {
            x1: mux,
            y1: muy,
            x2: mux + radius * Math.cos(theta),
            y2: muy + radius * Math.sin(theta),
            stroke: 'rgba(255,255,255,1)',
            'stroke-width': 1,
          }),

        ));
      }),
      mux: State.Slider(-0.08, {min: -1, max: 0.0, step: 0.01, label: 'µx'}),
      muy: State.Slider(0.08, {min: -1, max: 1, step: 0.01, label: 'µy'}),
      //radius: State.Slider(1, {min: 1.0, max: 2.0, step: 0.01}),
      n: State.Slider(1.94, {min: 1.0, max: 2.0, step: 0.01}),
      //grid: State.Checkbox(false, {label: '𝜻 grid'}),
    }, {
      label: 'Geometry',
      expanded: true
    }),
    aerodynamics: State.Section({
      intro: State.Raw(h => {
        function eqn (str, opts) {
          return h('span', Object.assign({
            dangerouslySetInnerHTML: {__html: katex.renderToString(str)}
          }, opts || {}));
        }

        return h('div', {className: 'rawContent'}, 
          h('p', null, `
            An interesting result of fluid dynamics called `,
            h('a', {href: 'https://en.wikipedia.org/wiki/D%27Alembert%27s_paradox', title: "D'Alambert's Paradox"}, `D'Alambert's paradox`),
            ` is that even though inviscid, irrotational potential flow closely models what we observe in many real flows, objects in such a flow generate neither lift nor drag. We know however that airfoils generate both lift and drag.

          `),
          h('p', null, `
            Change the angle of attack and observe flow which passes all the way back and around the sharp trailing edge. In the real world, viscosity prevents this from happening. In fact, the only physically valid flow is the one with just the right amount of overall circulation such that the flow leaves the trailing edge smoothly. This constraint is called the `, h('a', {href: "https://en.wikipedia.org/wiki/Kutta_condition", title: "Kutta condition"}, "Kutta condition"), ` and resolves D'Alambert's paradox by enforcing just the right amount of circulation—which in turn creates a pressure distribution that generates both lift and drag.
          `)
        );
      }),
      streamAlpha: State.Checkbox(false, {label: 'streamlines'}),
      alpha: State.Slider(0.0, {min: -45, max: 45, step: 0.1, label: 'angle of attack'}),
      circulation: State.Slider(0.0, {min: -10, max: 10, step: 0.01}),
      kutta: State.Checkbox(0.0, {label: 'Kutta condition'}),
      cpAlpha: State.Checkbox(false, {label: 'pressure coeff.'}),
    }, {
      label: 'Aerodynamics',
      expanded: true
    }),
    /*
    Summary: State.Section({
      intro: State.Raw(h => {
        return h('div', {className: 'rawContent'}, 
          h('p', null, `
            This is, in short, how people used to analyze fluid flows, and results like this account for some of the early
            and important results in the theory of lift.
          `),
          h('p', null, `
            There are many important extensions like like viscous boundary layers, flow separation, and turbulence, but 
          `)
        );
      })
    })
    */
    /*
    visualization: State.Section({
      //colorScale: State.Slider(0.42, {min: 0, max: 1, step: 0.01, label: 'pressure scale'}),
      //size: State.Slider(10, {min: 0.1, max: 20, step: 0.1, label: 'domain size'}),
    }, {
      label: 'Visualization',
      expanded: false
    })
    */
  })

  GUI(state, {
    theme: {fontFamily: `'${fontFamily}', 'Helvetica', sans-serif`},
    className: 'control-panel',
    containerCSS: "position:absolute; top:0; right:10px; width:350px",
  }).$onChanges(camera.taint);

  window.addEventListener('resize', camera.taint);
  var draw = require('./draw-mesh')(regl, mesh);
  var setUniforms = require('./uniforms')(regl);

  var frame = 0;
  var newframe = false;
  var t = 0;

  // Secret hidden settings for downloading animations with a fixed time step
  var params = {
    frames: q.frames ? parseFloat(q.frames) : 1,
    rotation: q.rotation ? parseFloat(q.rotation) : 0,
    time: 0,
  };

  regl.frame(({tick}) => {

    camera.draw(({dirty}) => {
      if (!dirty && !q.rotation) return;

      setUniforms(Object.assign(params, state), () => {
        regl.clear({color: [1, 1, 1, 1], depth: 1});
        draw();
      });

      newframe = true;
    });

    if (q.frames && newframe && frame < params.frames) {
      downloadURI(regl._gl.canvas.toDataURL(), 'frame-' + (1000 + frame) + '.png');
      frame++;
      params.time = frame / params.frames;
      camera.taint();
      newframe = false;
    }
  });
}
