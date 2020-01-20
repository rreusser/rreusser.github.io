const h = require('h');
const font = 'Open Sans'
const fs = require('fs');
const katex = require('katex');
var katexCss = fs.readFileSync(__dirname + '/../../node_modules/katex/dist/katex.min.css', 'utf8');
const css = require('insert-css');
css(katexCss);
css(`

canvas {
  position: fixed !important;
}

input[type="range"] {
  width: 42% !important;
}

input[type="range"] + div {
  width: 15% !important;
}

.github-corner {
  position: fixed !important;
}

#panel {
  font-family: ${font}, 'Helvetica', sans-serif;
  z-index: 20000;
  position: relative;
  background-color: rgba(20, 20, 20, 0.8);
  display: inline-block;
  color: #eee;
  line-height: 1.6;
}

.title {
  transition: background-color 0.1s ease-in-out;
}

#panel .title:hover,
#panel.is-expanded .title  {
  background-color: rgba(0, 0, 0, 0.5);
}

#panel a {
  color: #bef;
  text-decoration: none;
}

.title {
  font-style: italic;
  cursor: pointer;
  padding: 8px 15px;
  user-select: none;
}

ul {
  margin: 0;
  padding: 10px;
  margin-left: -5px;
  display: block;
  overflow: hidden;
}

li {
  list-style: none;
  float: left;
  width: 33%;
}

li a {
  min-width: 75px;
  display: inline-block;
  padding: 5px;
  transition: background-color 0.05s ease-in-out;
}

li a:hover {
  background-color: rgba(0, 0, 0, 0.3);
}

.section {
  padding: 15px;
  margin-bottom: 1em;
}

.content {
  display: none;
}

#panel.is-expanded .content {
  display: block;
}

.title:after {
  content: '\u25BC';
  font-style: normal;
  text-decoration: none;
  color: inherit;
  margin-left: 10px;
  font-size: 0.75em;
}

#panel.is-expanded .title:after {
  content: '\u25B2';
}

.content {
  background-color: rgb(35, 35, 35);
}

.content p {
  font-weight: 200;
  margin: 0;
  max-width: 275px;
  padding: 15px;
}
`);

function render (onChange, children) {
  //const chevron = h('a', {href: '#', class: 'chevron'}, '▼');
  const title = h('div', {class: 'title'}, [
    'Controls',
    //chevron
  ]);

  var eq1 = h('div', {style:{'margin-top': '10px', 'margin-bottom': '10px'}});
  eq1.innerHTML = katex.renderToString(`
    \\begin{array}{c}
      \\displaystyle{\\frac{\\partial u}{\\partial t} = r_u \\nabla^2 u - uv^2 + f(1 - u)} \\\\
      \\displaystyle{\\frac{\\partial v}{\\partial t} = r_v \\nabla^2 v - uv^2 - (f + k)v,}
    \\end{array}
  `);
  var eq2 = h('span');
  eq2.innerHTML = katex.renderToString(`r_u / r_v`);

  const content = h('div', {class: 'content'}, [
    children,
    h('p', [
      'This page models reacting species which diffuse at different rates, modeled by the ',
      h('a', {href: "https://groups.csail.mit.edu/mac/projects/amorphous/GrayScott/"}, 'Gray-Scott Reaction Diffusion equation'),
      '.',
    ]),
    h('p', [
      'The system is modeled by the equations',
      eq1,
      'which lends itself well to iteration on the GPU. To enforce stability, this simulation exposes only a relative diffusion rate, ',
      eq2,
      '. Try changing the parameters of the model to find different behaviors. For some parameter ranges you may need to tap or click to seed the solution.'
    ]),
  ]);
  const root = h('div', {id: 'panel'}, [title, content]);

  content.addEventListener('click', function (ev) {
    var name;
    if ((name = ev.target.getAttribute('data-name'))) {
      onChange(name);
      ev.stopPropagation();
      ev.preventDefault();
    }
  });

  title.addEventListener('touchstart', function (e) {
    e.stopPropagation();
  });

  title.addEventListener('click', function (e) {
    e.stopPropagation();

    root.classList.toggle('is-expanded');
  });

  return root;
}

module.exports = render;
