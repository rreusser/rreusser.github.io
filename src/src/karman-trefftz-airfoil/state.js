var d3scale = require('d3-scale');
var State = require('controls-state');
var GUI = require('controls-gui');

var css = require('insert-css');
var fs = require('fs');
var katex = require('katex');

var katexCss = fs.readFileSync(__dirname + '/../../node_modules/katex/dist/katex.min.css', 'utf8');

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
module.exports = function () {
  var state = State({
    tabs: State.Tabs({
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
        diagram: State.Raw((h, {state}) => {
          var geometry = state.tabs.geometry;
          var aspectRatio = 1.5;
          var width = 320;
          var height= width / aspectRatio;
          var margin = 1;
          var x = d3scale.scaleLinear().domain([-2 * aspectRatio, 2 * aspectRatio]).range([margin, width - margin]);
          var y = d3scale.scaleLinear().domain([-2, 2]).range([height - margin, margin]);
          var mux = x(geometry.mux);
          var muy = y(geometry.muy);
          var r0 = Math.sqrt(Math.pow(1 - geometry.mux, 2) + Math.pow(geometry.muy, 2)) * 1;//geometry.radius;
          var radius = x(geometry.mux + r0) - mux;
          var theta = Math.atan2(geometry.muy, 1 - geometry.mux);

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
              cx: x(geometry.mux),
              cy: y(geometry.muy),
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
        n: State.Slider(1.94, {min: 1.0, max: 2.0, step: 0.01}),
        //radius: State.Slider(1, {min: 1.0, max: 2.0, step: 0.01}),
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
    }),
  })

  GUI(state, {
    theme: {fontFamily: `'${fontFamily}', 'Helvetica', sans-serif`},
    className: 'control-panel',
    containerCSS: "position:absolute; top:0; right:10px; width:350px",
  });

  return state;
};
