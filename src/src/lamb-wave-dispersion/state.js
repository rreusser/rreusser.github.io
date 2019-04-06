const State = require('controls-state');
const GUI = require('controls-gui');
const Eqn = require('./equation')(GUI.preact);
const fontFamily = 'Fira Sans Condensed';

module.exports = function (opts) {
  return GUI(State({
    tabs: State.Tabs({
      Introduction: State.Section({
        text: State.Raw(h => h('div', {style: "max-width:275px"},
          h('p', null,
            `This page plots the dispersion relation for `,
            h('a', {href: "https://en.wikipedia.org/wiki/Lamb_waves"}, 'Lamb waves'),
            ` (waves in an elastic plate). Every zero in the complex
            plane corresponds to a valid Lamb wave mode.`
          ),
          h('p', null, 
            `The dispersion relations are given by `,
            h(Eqn, {style: "text-align:center;display:block;margin:0.5em;", latex: `\\displaystyle \\frac{\\tan(\\beta d / 2)} {\\tan(\\alpha d / 2)} = - \\left[ \\frac{4 \\alpha \\beta k^2}{(k^2 - \\beta^2)^2}\\right]^{\\pm 1}`}),
            `where `, h(Eqn, {latex: '+1'}), ` corresponds to antisymmetric modes and `, h(Eqn, {latex: '-1'}), ` to symmetric. `, h(Eqn, {latex: '\\alpha'}), ` and `,
            h(Eqn, {latex: '\\beta'}), ` are functions of the longitudinal and tangential wave speeds `, h(Eqn, {latex: 'c_l'}), ` and `, h(Eqn, {latex: 'c_t'}), `, 
            frequency `, h(Eqn, {latex: '\\omega'}), `, and wavenumber `, h(Eqn, {latex: 'k'}), ` with `,
            h(Eqn, {latex: `\\alpha^2 = \\frac{\\omega^2}{c_l^2} - k^2`}), ` and `,
            h(Eqn, {latex: `\\beta^2 = \\frac{\\omega^2}{c_t^2} - k^2.`})
          )
        ))
      }),
      material: State.Section({
        text: State.Raw(h => h('p', {style: "max-width:275px"}, `
          Adjust the physical parameters of the system below, including temporal 
          frequency ω and Poisson's ratio ν. Viscoelasticity represents the angle of the
          elastic modulus in the complex plane. Nonzero viscoelasticity results in
          roots that are neither pure real or pure imaginary—in other words, 
          viscoelastic waves decay spatially.
        `)),
        nu: State.Slider(0.33, {min: 0.0, max: 0.49, step: 0.01, label: 'ν'}),
        viscoelasticity: State.Slider(0.12, {min: 0, max: Math.PI * 2, step: 0.01}),
        modes: State.Select('antisymmetric', {options: ['antisymmetric', 'symmetric']}),
        omega: State.Slider(20.0, {min: 0.05, max: 30.0, step: 0.01, label: 'ω'}),
      }, {label: 'Material'}),
      visualization: State.Section({
        text: State.Raw(h => h('p', {style: "max-width:275px"}, 
          `The complex analytic function is colored using my own variant of the `, h('a', {href:
          'https://en.wikipedia.org/wiki/Domain_coloring'}, 'domain coloring'), ` technique. It
          makes heavy use of `, h('a', {href: "https://developer.mozilla.org/en-US/docs/Web/API/OES_standard_derivatives"},
          'OES_standard_derivatives'), ` to scale contours nicely in screen space.`
        )),
        magnitude: State.Section({
          steps: State.Slider(4, {min: 2, max: 8, step: 1}),
          strength: State.Slider(0.3, {min: 0, max: 1, step: 0.01}),
          scale: State.Slider(8.0, {min: 0.1, max: 8, step: 0.01}),
          grid: State.Slider(0.0, {min: 0, max: 1, step: 0.01}),
        }, {label: 'Magnitude'}),
        phase: State.Section({
          steps: State.Slider(4, {min: 2, max: 8, step: 1}),
          strength: State.Slider(0.0, {min: 0, max: 1, step: 0.01}),
          scale: State.Slider(0.75, {min: 0.1, max: 8, step: 0.01}),
          grid: State.Slider(0.4, {min: 0, max: 1, step: 0.01}),
        }, {label: 'Phase'}),
      }, {label: 'Visualization'})
    })
  }), {
    containerCSS: "position:fixed; top:0; right:8px; min-width:275px; max-width:100%; min-width:300px",
    theme: {
      fontFamily: `'Fira Sans Condensed', sans-serif`,
    }
  }).tabs;
};
