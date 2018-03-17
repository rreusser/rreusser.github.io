var h = require('h');
var css = require('insert-css');
var demoList = require('../src/sketches/index.json');
var demoIndex = {};
demoList.forEach(function (demo) {
  demoIndex[demo.id] = demo;
});

function urlFor (id) {
  return 'https://rreusser.github.io/' + id;
}

var hrefParts = window.location.href.replace(/\/index\.html.*$/, '').replace(/\/$/,'').split('/');
var id = hrefParts[hrefParts.length - 1];
var indexUrl = 'https://rreusser.github.io/sketches/';
var sourceUrl = 'https://github.com/rreusser/rreusser.github.io/tree/master/src/src/' + id;
var meta = demoIndex[id];
var curIndex = demoList.indexOf(meta);

var prevUrl = curIndex === 0 ? indexUrl : urlFor(demoList[curIndex - 1].id);
var nextUrl = curIndex === demoList.length - 1 ? indexUrl : urlFor(demoList[curIndex + 1].id);

css(`
.sketch-nav {
  position: fixed;
  top: 1px;
  right: 2px;
  z-index: 10000;
  text-align: right;
  transition: transform 0.2s;
}

.sketch-nav--hidden {
  transform: translate(0, -110%);
}

.sketch-nav a {
  background-color: rgba(0, 0, 0, 0.5);
  color: rgb(220, 220, 220);
  font-family: sans-serif;
  padding: 3px 5px;
  margin: 2px 2px;
  text-decoration: none;
  border-radius; 2px;
  display: inline-block;
  border-radius: 2px;
  font-size: 0.8em;
  font-weight: 200;
}

.sketch-nav h1 {
  font-style: italic;
  margin: 2px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  font-family: sans-serif;
  font-weight: 200;
  font-size: 20px;
  padding: 2px 5px;
  border-radius: 2px;
}
`);

var exitBtn = h('a', {href: 'javascript:void(0);'}, 'x');
exitBtn.innerHTML = '×';
exitBtn.addEventListener('click', function (e) {
  e.preventDefault();
  nav.classList.add('sketch-nav--hidden');
});

var nav = h('nav.sketch-nav', [
  h('h1', meta.title),
  h('div', [
    h('a', {href: indexUrl}, 'all'),
    h('a', {href: prevUrl}, 'prev'),
    h('a', {href: nextUrl}, 'next'),
    h('a', {href: sourceUrl}, 'src'),
    exitBtn
  ]),
]);

document.body.appendChild(nav);
