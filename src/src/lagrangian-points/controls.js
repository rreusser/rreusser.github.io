const h = require('h');
const font = 'Open Sans'
const css = require('insert-css')(`

canvas {
  position: fixed !important;
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
  /*max-width: 450px;*/
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
`);

function render (onChange, children) {
  //const chevron = h('a', {href: '#', class: 'chevron'}, '▼');
  const title = h('div', {class: 'title'}, [
    'Controls',
    //chevron
  ]);

  const content = h('div', {class: 'content'}, [
    children,
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
    root.classList.toggle('is-expanded');

  return root;
}

module.exports = render;
