var h = require('h');

document.body.appendChild(h('div.explanation', [
  h('h2', 'Nosé-Hoover Attractor'),
  h('p', [
    "A simple exercise in plotting an attractor with a plain 2D canvas. Inspired by Gret Tatum's forthcoming project, ",
    h('a', {href: 'https://twitter.com/TatumCreative/status/978278859719274501'}, 'glittr.io'),
    ', which encourages "Creativity Through Constraints." In this case the constraint is the exclusive use of the fillRect method on a 2D canvas.'
  ]),
  h('p', [
    'The system is defined by the ordinary differential equation',
  ]),
  h('img.eqn', {src: 'images/nose-hoover.png'}),
  h('p', [
    "It's one of my favorites since the complex structure isn't apparent from the look of the equations."
  ])
]));
