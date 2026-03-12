// https://observablehq.com/@tmcw/test@203
function _1(md){return(
md`# Test

<img src='https://farm4.staticflickr.com/3576/13085734134_eb0398038a_b.jpg' style='max-width:100%;' />

Some folks have been interested in _testing_ their notebooks: here’s an example of using [tape](https://github.com/substack/tape), the little browser-friendly test module to do just that. It requires a little bit of magic to print the test output into a cell as it executes and to color the cell based on test success or failure, but I’ve wrapped that up into a cell that you can import and use pretty easily, or you can just copy-and-paste the relevant code and do your own thing.

You can import this notebook to use it in your own like:

\`\`\`js
import {test} from "@tmcw/test"
\`\`\`

- Here’s a tiny example of a [notebook that imports and uses test](https://beta.observablehq.com/@tmcw/tests-with-test).
- Check out [plenty of good API documentation for the methods under test](https://github.com/substack/tape#methods): you can check equality, state that things are ok, add messages, and so on.

Here’s an example of a failing test:`
)}

function _2(test,Promises){return(
test("something is wrong", async t => {
  t.plan(4);
  t.equal(1, 1);
  for (let i = 0; i < 2; i++) {
    t.ok(1, `just making sure everything's okay, part ${i}`);
    await Promises.delay(100);
  }
  t.ok(false, `but this is not ok`);
})
)}

function _3(md){return(
md`And here’s an example of a test that passes:`
)}

function _4(test,Promises){return(
test('making sure that everything is okay', async t => {
  t.plan(4);
  t.equal(1, 1);
  t.inDelta([0.000000000000001, -0.00000000001], [0,0]);
  for (let i = 0; i < 3; i++) {
    t.ok(1, `just making sure everything's okay, part ${i}`);
    await Promises.delay(100);
  }
})
)}

function _5(md){return(
md`The code that makes it work: require tape, and then define a test function that:

- Wraps around tape’s default test function, but tweaks it to:
- Print the test output into an element, using tape’s createHarness and createStream methods to redirect the stream of output, which usually gets sent to console.log
- Return a generator that updates every time that there’s test output
- Makes that output (relatively) pretty
`
)}

async function _test(require,FileAttachment,inDelta,html,Generators)
{
  const tape = await require(await FileAttachment("tape-4.12.js").url());
  tape.Test.prototype.inDelta = inDelta;

  return (name, fn, options) => {
    let test = tape.createHarness();
    let stream = test.createStream();
    const output = html`<pre style='padding:2rem;overflow-x:auto;margin:0;' />`
    const display = html`<div style='padding-bottom:1rem'><div style='position:relative;background:#F4F4F4;'>
      <div style='text-align:center;font-weight:bold;text-transform:uppercase;padding:1rem 0;'>${name}</div>
      ${output}
    </div></div>`
    test(name, fn, options);
    return Generators.observe(change => {
      let results = '';
      let failed = false;
      stream.on('data', d => {
        output.appendChild(document.createTextNode(d));
        if (d.startsWith('not ok')) {
          display.firstChild.style.background = '#FFDFDF';
          failed = true;
        }
        change(display);
      });
    });
  }
}


function _inDelta()
{
  function inDelta(actual, expected, delta) {
    return (Array.isArray(expected) ? inDeltaArray : inDeltaNumber)(
      actual,
      expected,
      delta
    );
  }
  function inDeltaArray(actual, expected, delta) {
    var n = expected.length,
      i = -1;
    if (actual.length !== n) return false;
    while (++i < n) if (!inDelta(actual[i], expected[i], delta)) return false;
    return true;
  }
  function inDeltaNumber(actual, expected, delta) {
    return actual >= expected - delta && actual <= expected + delta;
  }
  return function(actual, expected, delta) {
    delta = delta || 1e-6;
    this._assert(inDelta(actual, expected, delta), {
      message: "should be in delta " + delta,
      operator: "inDelta",
      actual: actual,
      expected: expected
    });
  };
}


export default function define(runtime, observer) {
  const main = runtime.module();
  function toString() { return this.url; }
  const fileAttachments = new Map([
    ["tape-4.12.js", {url: new URL("./files/dddeba887f05ee3f4eb3106a38bca9630242b8d984fe4bb27a374c61c12dfcedffea5d40c236735445a6cbf80571ec0daaf05e9b46e2b5a3b2b6be54b851acae.js", import.meta.url), mimeType: "application/javascript", toString}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["test","Promises"], _2);
  main.variable(observer()).define(["md"], _3);
  main.variable(observer()).define(["test","Promises"], _4);
  main.variable(observer()).define(["md"], _5);
  main.variable(observer("test")).define("test", ["require","FileAttachment","inDelta","html","Generators"], _test);
  main.variable(observer("inDelta")).define("inDelta", _inDelta);
  return main;
}
