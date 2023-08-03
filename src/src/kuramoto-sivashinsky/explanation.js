const css = require('insert-css');
const katex = require('katex');
const path = require('path');
const fs = require('fs');

css(fs.readFileSync(path.join(__dirname, '../../node_modules/katex/dist/katex.min.css'), 'utf8'));

module.exports = function (h) {
  return [
    h('p', {}, [
      'This page iterates the ',
      h('a', {href: 'https://en.wikipedia.org/wiki/Kuramoto%E2%80%93Sivashinsky_equation'}, 'Kuramoto-Sivashinsky'),
      ' equation,',
      h('div', {style: 'text-align:center', ref: c => {
        if (!c) return;
        c.innerHTML = katex.renderToString(`u_t + \\nabla^4 u + \\nabla^2 u + \\frac{1}{2}| \\nabla u |^2 = 0,`)
      }}),
      "in two dimensions on a 256 × 256 grid. It's notable as a chaotic partial differential equation of ",
      h('em', {}, 'one variable'),
      '. (Contrast with the ',
      h('a', {href: 'https://en.wikipedia.org/wiki/Lorenz_system'}, 'Lorenz attractor'),
      ' a chaotic ordinary differential equation of three variables.)'
    ]),
    h('p', {}, [
      'Adjust the domain scale L and the aspect ratio L', h('sub', {}, 'x'), '/L', h('sub', {}, 'y'),
      ', observing the various behaviors, particularly as the characteristic scale approaches the size of the domain.'
    ]),
    h('p', {}, [
      'The equation is iterated on the GPU in a combination of the frequency and spatial domains, using the technique of Kalogirou in ',
      h('a', {href: 'https://spiral.imperial.ac.uk/bitstream/10044/1/25067/1/Kalogirou-A-2013-PhD-Thesis.pdf'}, 'Nonlinear dynamics of surfactant-laden multilayer shear flows and related systems'),
      '. For more information on this implementation, see the notebook ',
      h('a', {href: 'https://observablehq.com/@rreusser/kuramoto-sivashinsky-equation-in-2d?collection=@rreusser/writeups'}, 'Kuramoto-Sivashinsky Equation in 2D'), '.'
    ])
  ];
};
