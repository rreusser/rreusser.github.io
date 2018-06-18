var h = require('h');
var css = require('insert-css');
var fs = require('fs');
var path = require('path');
var demoList = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/sketches/index.json'), 'utf8'));
var demoIndex = {};
demoList.forEach(function (demo) {
  demoIndex[demo.id] = demo;
});

function urlFor (id) {
  return 'https://rreusser.github.io/' + id;
}

var hrefParts = window.location.href.replace(/(\/)?(index.html)?(#.*)?$/i, '').split('/');
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
  top: 0px;
  right: 0px;
  z-index: 10000;
  text-align: right;
  transition: transform 0.2s;
}

.sketch-nav--hidden {
  transform: translate(0, -110%);
}

.sketch-nav a {
  background-color: rgba(0, 0, 0, 0.65);
  color: rgb(220, 220, 220);
  font-family: sans-serif;
  padding: 5px 8px;
  margin: 0;
  text-decoration: none;
  border-radius; 2px;
  display: inline-block;
  font-size: 0.8em;
  font-weight: 200;
}

.sketch-nav a:hover {
  background-color: rgba(255, 255, 255, 0.65);
  color: #333;
}

.sketch-nav h1 {
  font-style: italic;
  margin: 0;
  background-color: rgba(0, 0, 0, 0.65);
  color: white;
  font-family: sans-serif;
  font-weight: 200;
  font-size: 20px;
  padding: 4px 8px;
}
`);

var exitBtn = h('a', {href: 'javascript:void(0);'}, 'x');
exitBtn.innerHTML = '×';
exitBtn.addEventListener('click', function (e) {
  nav.classList.add('sketch-nav--hidden');
});
exitBtn.addEventListener('touchstart', function (e) {
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

nav.addEventListener('click', e => e.stopPropagation());
nav.addEventListener('touchstart', e => e.stopPropagation());
nav.addEventListener('touchmove', e => e.stopPropagation());
nav.addEventListener('touchend', e => e.stopPropagation());
nav.addEventListener('touchcancel', e => e.stopPropagation());

document.body.appendChild(nav);
