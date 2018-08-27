const h = require('h');
const font = 'Open Sans'
const fs = require('fs');
//const katex = require('katex');
//var katexCss = fs.readFileSync(__dirname + '/../../node_modules/katex/dist/katex.min.css', 'utf8');
const css = require('insert-css');
//css(katexCss);
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
    'About',
    //chevron
  ]);

  const content = h('div', {class: 'content'}, [
    children,
    h('p', [
      'This page implements the Fibonacci-distributed sphere from Section 2 "Optimizing the Convex Hull" of Martin Roberts\' awesome article, ',
      h('a', {href: "http://extremelearning.com.au/evenly-distributing-points-on-a-sphere/", target: "_blank"}, 'Evenly Distributing Points on a Sphere.'),
      ' I won\'t elaborate since you should really just read the original article. It\'s a good one.'
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
  title.addEventListener('touchmove', function (e) {
    e.stopPropagation();
  });
  title.addEventListener('touchend', function (e) {
    e.stopPropagation();
  });

  title.addEventListener('click', function (e) {
    e.stopPropagation();

    root.classList.toggle('is-expanded');
  });

  return root;
}

module.exports = render;
