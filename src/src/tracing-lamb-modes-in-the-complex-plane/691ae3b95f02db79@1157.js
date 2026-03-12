import define1 from "./3d9d1394d858ca97@553.js";

function _1(md,code,PINNED){return(
md`# Toolbox

A growing<sup>*</sup> library of functions for various tasks.
This notebook will change frequently. If you rely on it be sure to pin the version:
${code(`import {/* ... */} from '${PINNED}'`)}

<small><sup>*</sup> <i>A bit of a mess right now as I move things around. Let's not focus on the bad things though, shall we? :D</i></small>

`
)}

function _2(md){return(
md`---
## Reactivity
`
)}

function _linkViews(){return(
function linkViews(target, views, descriptor = {enumerable: true}) {
  Object.entries(views).forEach(([name, view]) => {
    Object.defineProperty(target, name, Object.assign({
      get() { return view.value; }
    }, descriptor));
  });
  return target;
}
)}

function _4(md){return(
md`---
## Images
`
)}

function _5(signature,fitSize){return(
signature(fitSize, {
  description: `Scales dimensions proportionally to fit into the given width and/or height.`,
  example: `
const [width, height, scale] = fitSize(img.naturalWidth, img.naturalHeight, {width: 500, height: 500});
img.width = width;
img.height = height;
`,
  tests: {
    'no target dimensions': assert => {
      const [w, h, s] = fitSize(200, 150);
      assert(w === 200, 'width'); assert(h === 150, 'height'); assert(s === 1, 'scale');
    },
    'target width only': async assert => {
      const [w, h, s] = fitSize(200, 150, {width: 2*200});
      assert(w === 2*200, 'width'); assert(h === 2*150, 'height'); assert(s === 2, 'scale');
    },
    'target height only': assert => {
      const [w, h, s] = fitSize(200, 150, {height: 2*150});
      assert(w === 2*200, 'width'); assert(h === 2*150, 'height'); assert(s === 2, 'scale');
    },
    'same aspect': assert => {
      const [w, h, s] = fitSize(200, 150, {width: 2*200, height: 2*150});
      assert(w === 2*200, 'width'); assert(h === 2*150, 'height'); assert(s === 2, 'scale');
    },
    'smaller aspect ratio': assert => {
      const [w, h, s] = fitSize(200, 150, {width: 3*200, height: 2*150});
      assert(w === 2*200, 'width'); assert(h === 2*150, 'height'); assert(s === 2, 'scale');
    },
    'greater aspect ratio': assert => {
      const [w, h, s] = fitSize(200, 150, {width: 3*200, height: 2*150});
      assert(w === 2*200, 'width'); assert(h === 2*150, 'height'); assert(s === 2, 'scale');
    },
  }
})
)}

function _fitSize(){return(
function fitSize(sourceWidth, sourceHeight, options = {}) {
  const {width: tw, height: th, crop = false} = options;
  if(tw == null && th == null) return [sourceWidth, sourceHeight, 1];
  const ar = sourceWidth / sourceHeight;
  return tw == null || (th != null && ar < tw / th)
    ? [th * ar, th, th / sourceHeight]
    : [tw, tw / ar, tw / sourceWidth];
}
)}

function _7(signature,importAsset){return(
signature(importAsset, {
  description: `Imports a remote asset and returns its local URL and blob.`,
  example: `const {blob, url} = await importAsset('https://example.com/image.png');`,
  tests: {
    'import asset': async assert => {
      const {blob, url} = await importAsset('https://en.wikipedia.org/static/favicon/wikipedia.ico');
      assert(blob instanceof Blob, 'blob');
      assert(typeof url === 'string', 'url');
    }
  }
})
)}

function _importAsset(invalidation){return(
async function importAsset(src) {
  return fetch(src).then(res => res.blob()).then(blob => {
    const url = URL.createObjectURL(blob);
    invalidation.then(() => URL.revokeObjectURL(url));
    return {url, blob};
  });
}
)}

function _9(signature,importImage,DOM){return(
signature(importImage, {
  description: `Returns an Image for a remote src. The image has been created from an object URL and won't taint a canvas.`,
  example: `
const img = await importImage('https://example.com/image.png');
const ctx = DOM.context2d(img.naturalWidth, img.naturalHeight, 1);
ctx.drawImage(img, 0, 0);
  `,
  tests: {
    'tainted canvas': async assert => {
      const img = DOM.element('img', {src: 'https://i.imgur.com/D6H96Hc.png'});
      await img.decode();
      const ctx = DOM.context2d(img.naturalWidth, img.naturalHeight, 1);
      ctx.drawImage(img, 0, 0);
      let err = '';
      try { ctx.getImageData(0, 0, 1, 1) }
      catch(e) { err += e}
      assert(/^SecurityError/.test(err), 'remote URL taints canvas');
    },
    'import image': async assert => {
      const img = await importImage('https://i.imgur.com/D6H96Hc.png');
      const ctx = DOM.context2d(img.naturalWidth, img.naturalHeight, 1);
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      assert(d[0]===255,d[1]===0, 'Image can be imported and applied to canvas without tainting it');
    }
  }
})
)}

function _importImage(DOM){return(
async function importImage(src) {
  const img = DOM.element('img', {crossorigin: 'anonymous', src});
  return img.decode().then(() => img);
}
)}

function _11(md){return(
md`---
## Markup
`
)}

function _querylink(DOM){return(
function querylink(title, attr = {}, options = {}) {
  const {query = s => `https://duckduckgo.com/?q="${decodeURI(s)}"`} = options;
  const a = DOM.element('a', {href: attr.href || query(title), ...attr});
  return a.textContent = title, a;
}
)}

function _13(){return(
""
)}

function _14(signature,scopedStyle){return(
signature(scopedStyle, {
  description: `Creates a scoped \`<style>\` element from CSS.`,
  example: `
const namespace = DOM.uid('scope').id;
const style = scopedStyle('.' + namespace, \`
  :scope { font-family: sans-serif }
  :scope, :scope > * { padding: 0 }
\`);
return html\`<div class="\${namespace}">
  \${style}
  <span> text ...
\`;
`,
})
)}

function _scopedStyle(html){return(
function scopedStyle(scope, css) {
  const style = html`<style>`;
  style.textContent = css.replace(/\:scope\b/g, scope); 
  return style;
}
)}

function _16(signature,getPinnedSlug){return(
signature(getPinnedSlug)
)}

function _getPinnedSlug(html){return(
function getPinnedSlug({name = null, parseVersion = 'v1'} = {}) {
  const getLines = async (route, rtVersion, lines) => {
    return fetch(`https://api.observablehq.com/${route}.js?v=${rtVersion}`)
      .then(response => response.text())
      .catch(e => null)
      .then(t => t == null ? [] : t.split('\n', lines + 1).slice(0, lines));
  }
  const parsers = {
    v1: route => getLines(route, 1, 4).then(ln => {
          const name = ln[0].slice('// URL: https://observablehq.com/'.length).replace(/^d\//, '');
          const version = ln[3].slice('// Version: '.length);
          return `${name}@${version}`;
        }),
    v3: route => getLines(route, 3, 1).then(ln => {
          return ln[0].slice('// https://observablehq.com/'.length).replace(/^d\//, '');
        }),
  };
  
  try {
    const route = name != null
      ? name.replace(/^(?!@)/, 'd/')
      : html`<a href>`.pathname.match(/^\/(d\/[a-f0-9]{16}|@[^\/]+\/[^@].*?)(?:$|\/)/)[1];
    return parsers[parseVersion](route).catch(e => null);
  }
  catch(e) {
    return null;
  }  
}
)}

function _18(signature){return(
signature('PINNED', {
  name: 'PINNED',
  description: 'Notebook slug, automatically pinned to the most recent version of the importing notebook.',
  example: `md\`You can import my notebook this way:
\\\`\\\`\\\`javascript
import {foo} from "\${PINNED}"
\\\`\\\`\\\`\`
`
})
)}

function _PINNED(getPinnedSlug){return(
getPinnedSlug()
)}

function _20(md){return(
md`---
## Internals`
)}

function _readChunks(){return(
async function readChunks(reader, options = {}) {
  const { separator = 0x0A, limit = Infinity} = options;
  const merge = (a, b) => {
    const c = new Uint8Array(a.length + b.length);
    return c.set(a, 0), c.set(b, a.length), c;
  }
  
  const lines = [];
  let tail = new Uint8Array();
  
  const next = () => {
    return reader.read().then(({done, value}) => {
      let i = -1, o = 0;
      if(value) {
        console.log('chunk size', value.length);
        while(++i < value.length) {
          if(value[i] === separator) {
            lines.push(merge(tail, value.slice(o, i)));
            if(lines.length >= limit) {
              reader.cancel();
              return lines;
            }
            o = i + 1;
          }
        }
        tail = value.slice(o);
      }
      
      return !done ? next() : (lines.push(tail), lines);
    });
  };
  return next();
}
)}

function _PINNED_LIB(getPinnedSlug){return(
getPinnedSlug({name: '691ae3b95f02db79'})
)}

function _RUN_TESTS(deprecateImport,$0){return(
deprecateImport($0, 'RUN_TESTS', false)
)}

function _24(md){return(
md`---
## Deprecations
`
)}

function _deprecateImport(PINNED,PINNED_LIB){return(
function deprecateImport(target, name, nulled = true, source = '3d9d1394d858ca97') {
  // This notebook.
  if(PINNED && PINNED === PINNED_LIB) return nulled ? undefined : target;
  
  console.warn(`${name} has been moved. Import it from "${source}".`);
  return target;
}
)}

function _signature(deprecateImport,_dep_signature){return(
deprecateImport(_dep_signature, 'signature', false)
)}

function _code(deprecateImport,_dep_code){return(
deprecateImport(_dep_code, 'code', false)
)}

function _signature_theme(deprecateImport,_dep_signature_theme){return(
deprecateImport(_dep_signature_theme, 'signature_theme')
)}

function _createStepper(deprecateImport,_dep_createStepper){return(
deprecateImport(_dep_createStepper, 'createStepper')
)}

function _defaultTestRunner(deprecateImport,_dep_defaultTestRunner){return(
deprecateImport(_dep_defaultTestRunner, 'defaultTestRunner')
)}

function _defaultSignatureParser(deprecateImport,_dep_defaultSignatureParser){return(
deprecateImport(_dep_defaultSignatureParser, 'defaultSignatureParser')
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md","code","PINNED"], _1);
  main.variable(observer()).define(["md"], _2);
  main.variable(observer("linkViews")).define("linkViews", _linkViews);
  main.variable(observer()).define(["md"], _4);
  main.variable(observer()).define(["signature","fitSize"], _5);
  main.variable(observer("fitSize")).define("fitSize", _fitSize);
  main.variable(observer()).define(["signature","importAsset"], _7);
  main.variable(observer("importAsset")).define("importAsset", ["invalidation"], _importAsset);
  main.variable(observer()).define(["signature","importImage","DOM"], _9);
  main.variable(observer("importImage")).define("importImage", ["DOM"], _importImage);
  main.variable(observer()).define(["md"], _11);
  main.variable(observer("querylink")).define("querylink", ["DOM"], _querylink);
  main.variable(observer()).define(_13);
  main.variable(observer()).define(["signature","scopedStyle"], _14);
  main.variable(observer("scopedStyle")).define("scopedStyle", ["html"], _scopedStyle);
  main.variable(observer()).define(["signature","getPinnedSlug"], _16);
  main.variable(observer("getPinnedSlug")).define("getPinnedSlug", ["html"], _getPinnedSlug);
  main.variable(observer()).define(["signature"], _18);
  main.variable(observer("PINNED")).define("PINNED", ["getPinnedSlug"], _PINNED);
  main.variable(observer()).define(["md"], _20);
  main.variable(observer("readChunks")).define("readChunks", _readChunks);
  main.variable(observer("PINNED_LIB")).define("PINNED_LIB", ["getPinnedSlug"], _PINNED_LIB);
  main.variable(observer("viewof RUN_TESTS")).define("viewof RUN_TESTS", ["deprecateImport","viewof _dep_RUN_TESTS"], _RUN_TESTS);
  main.variable(observer("RUN_TESTS")).define("RUN_TESTS", ["Generators", "viewof RUN_TESTS"], (G, _) => G.input(_));
  main.variable(observer()).define(["md"], _24);
  main.variable(observer("deprecateImport")).define("deprecateImport", ["PINNED","PINNED_LIB"], _deprecateImport);
  const child1 = runtime.module(define1);
  main.import("code", "_dep_code", child1);
  main.import("signature", "_dep_signature", child1);
  main.import("signature_theme", "_dep_signature_theme", child1);
  main.import("viewof RUN_TESTS", "viewof _dep_RUN_TESTS", child1);
  main.import("RUN_TESTS", "_dep_RUN_TESTS", child1);
  main.import("createStepper", "_dep_createStepper", child1);
  main.import("defaultTestRunner", "_dep_defaultTestRunner", child1);
  main.import("defaultSignatureParser", "_dep_defaultSignatureParser", child1);
  main.variable(observer("signature")).define("signature", ["deprecateImport","_dep_signature"], _signature);
  main.variable(observer("code")).define("code", ["deprecateImport","_dep_code"], _code);
  main.variable(observer("signature_theme")).define("signature_theme", ["deprecateImport","_dep_signature_theme"], _signature_theme);
  main.variable(observer("createStepper")).define("createStepper", ["deprecateImport","_dep_createStepper"], _createStepper);
  main.variable(observer("defaultTestRunner")).define("defaultTestRunner", ["deprecateImport","_dep_defaultTestRunner"], _defaultTestRunner);
  main.variable(observer("defaultSignatureParser")).define("defaultSignatureParser", ["deprecateImport","_dep_defaultSignatureParser"], _defaultSignatureParser);
  return main;
}
