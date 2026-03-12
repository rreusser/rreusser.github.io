import define1 from "./dc10ee68be5921ee@481.js";

function _1(md){return(
md`# fmt

I like variables with units. Since dimensionally typed computation [isn't really possible in JavaScript](https://github.com/tc39/proposal-operator-overloading), I think it's nice to include units in variable names, e.g. \`delay_seconds\` or \`delay_s\`. That can get a little unwieldy. \`density_kg_per_m3\`? \`G_m3_per_kg_s2\`? Perhaps when presentation is a priority, a more modest goal is to label units where values are defined. When using Observable, I often append units in comments, e.g. \`delay = 10 // seconds\`, but comments get hidden with the cell input:`
)}

function _delay(){return(
10
)}

function _3(md){return(
md`This notebook implements a tiny little formatting helper. It's probably fancier than is advisable for many uses, but maybe it has its place.`
)}

function _4(fmt){return(
fmt`delay = ${10} seconds`
)}

function _5(md){return(
md`## Usage


In its simplest form, it passes a single value through a [tagged template](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates) and styles it like an Observable output.
`
)}

function _6(fmt){return(
fmt`c = ${299792458} m/s`
)}

function _7(md){return(
md`In order to access the value, you'll need to use Observable's \`viewof\` keyword. Since Observable doesn't permit cell introspection, this means we need to duplicate the name.`
)}

function _c(fmt){return(
fmt`c = ${299792458} m/s`
)}

function _9(c){return(
c
)}

function _10(md){return(
md`For brevity, the rest of this notebook omits the \`viewof\` step.`
)}

function _11(md){return(
md`## Trailing content`
)}

function _12(md){return(
md`The value is shown in green and content to the right of it is colored ~~gray~~ also green. (I find green for trailing content less distracting but it seems to imply the returned value is something fancier than a plain \`Number\`. I'm still on the fence. This may change.)`
)}

function _13(fmt){return(
fmt`ρ = ${2700} kg/m³`
)}

function _14(md,tex){return(
md`Or if you're into ${tex`\TeX`},`
)}

function _15(fmt,tex){return(
fmt`ρ = ${2700} ${tex`\mathrm{kg / m^3}`}`
)}

function _16(md){return(
md`## Non-numeric values`
)}

function _17(md){return(
md`A non-numeric value passed through is displayed with the [Observable inspector](https://github.com/observablehq/inspector).`
)}

function _18(fmt){return(
fmt`object = ${{ foo: 'bar' }}`
)}

function _19(md){return(
md`Non-numeric values other than the value being passed through are simply stringified.`
)}

function _20(fmt){return(
fmt`boolean = ${true} ${{ foo: 'bar' }}`
)}

function _21(md){return(
md`## HTML content`
)}

function _22(md,tex){return(
md`It passes-through the first tagged template expression value *which is not an HTML element*, so a bit of ${tex`\TeX`} preceding or following the value is fine. Get creative! But use with care.`
)}

function _23(fmt,tex){return(
fmt`area = ${tex`\displaystyle \int_0^\pi \sin x\,dx`} = ${2}`
)}

function _24(md){return(
md`If all expression values are HTML elements, it forwards events and values from the first one with a \`value\` property, and finally otherwise just the first HTML element. This allows composition with inputs, for example Mike Bostock's [Tangle input](https://observablehq.com/@mbostock/tangle). Too straightforward not to implement, but the resulting UX is be a bit strange. Use with care.`
)}

function _n(fmt,Tangle){return(
fmt`n = ${Tangle({ min: 0, max: 100, value: 48 })} cookies`
)}

function _26(n){return(
n
)}

function _27(md){return(
md`## Formatting`
)}

function _28(md){return(
md`You can pass a function or [d3-format](https://github.com/d3/d3-format) string to specify the formatting of the number.`
)}

function _29(fmt){return(
fmt(x => x.toExponential(2))`E = ${70e9} Pa`
)}

function _30(fmt){return(
fmt('.2e')`E = ${70e9} Pa`
)}

function _31(md){return(
md`This notebook defines a scientific notation helper \`toScientific(format = '~f')\` (aliased as \`sci\` and attached to \`fmt\` as \`fmt.sci\`), which outputs in scientific notation.`
)}

function _32(fmt,sci){return(
fmt(sci())`E = ${70e9} Pa`
)}

function _33(fmt,sci){return(
fmt(sci('.3f'))`E = ${70e9} Pa`
)}

function _34(md){return(
md`Until you actually template a string, calling the \`fmt\` function simply returns a wrapped version of itself with the formatting overridden by the new value. This allows you to construct a formatter with an overridable default.`
)}

function _myFormatter(fmt,sci){return(
fmt(sci('.3f'))
)}

function _36(myFormatter){return(
myFormatter`E = ${70e9} Pa`
)}

function _37(myFormatter){return(
myFormatter('~f')`E = ${70e9} Pa`
)}

function _38(md){return(
md`## Conclusions`
)}

function _39(md){return(
md`That's it! I think I like it. I'm not sure. I'm tempted to unpack multiple numeric values into an array. But perhaps I've already taken this too far. [Here's the example](https://observablehq.com/d/e5b3ff47c93dfd66) which motivated this. 

Ideas and improvements are welcome! Thanks to [Job van der Zwan](https://observablehq.com/@jobleonard) for suggesting scientific notation!`
)}

function _40(md){return(
md`## Implementation`
)}

function _fmt(DOM,Inspector,isElement,html,d3format,sci)
{
  // Create and extract the .observablehq--inspect element of an inspector
  function bareInspector(value) {
    const el = DOM.element("div");
    new Inspector.Inspector(el).fulfilled(value);
    const inspectSpan = el.querySelector(".observablehq--inspect");
    if (inspectSpan) {
      inspectSpan.parentElement.removeChild(inspectSpan);
    }
    return inspectSpan;
  }

  function constructOutput(format, strings) {
    const id = `inspector-${Math.floor(1e9 * Math.random())}`;
    let assignment = "";
    const lhs = [];
    const rhs = [];

    // Locate the first non-HTML element
    let valueIdx = Infinity;
    for (let i = 2; i < arguments.length; i++) {
      if (!isElement(arguments[i])) {
        valueIdx = i;
        break;
      }
    }

    // No non-HTML value was found, at least try the first component with a `value` property
    if (valueIdx === Infinity) {
      for (let i = 2; i < arguments.length; i++) {
        if (arguments[i].value !== undefined) {
          valueIdx = i;
          break;
        }
      }
    }

    // Otherwise just take the first html element
    if (valueIdx === Infinity) {
      valueIdx = 2;
    }

    let dst, klass, color;
    const value = arguments[valueIdx];
    let isNumber = format && typeof value === "number";

    for (var i = 0; i < strings.length; i++) {
      dst = i < valueIdx - 1 ? lhs : rhs;
      klass = i < valueIdx - 1 ? "cellname" : "number";

      // Swap for alternate coloring...
      color = "";
      //color = klass === 'number' ? 'style="color:#767676"' : '';

      // Push the string, wrapped in cellname (lhs) or number (rhs)
      dst.push(
        html`<span class="observablehq--${klass}" ${color}>${strings[i]}</span>`
      );

      // Process expression arguments
      // Is this expression the value?
      if (i === valueIdx - 2 && i < arguments.length - 2) {
        if (isNumber) {
          const str = format
            ? (typeof format === "string" ? d3format(format) : format)(value)
            : value;
          dst.push(html`<span class="observablehq--number">${str}</span>`);
        } else {
          const inspector = bareInspector(value);
          if (inspector) {
            inspector.setAttribute("id", id);
            inspector.style.display = "inline";
            dst.push(inspector);
          } else if (isElement(value)) {
            const wrapper = document.createElement("div");
            wrapper.className = "observablehq--number";
            wrapper.style.display = "inline-block";
            wrapper.appendChild(value);
            dst.push(wrapper);
          } else {
            dst.push(value);
          }
        }
      } else if (i < arguments.length - 2) {
        // If it's not the value, it's just a stray rhs expression
        dst.push(
          html`<span class="observablehq--${klass}" ${color}>${
            arguments[i + 2]
          }</span>`
        );
      }
    }

    // Force this inspector to remain inline ?!?!
    const css = html`<style>#${id} > .observablehq--inspect { display: inline !important }</style>`;

    // Build the final output!
    const el = html`<span class="observablehq--inspect fmt-inspector" id="${id}">${lhs}${rhs}</span>${css}`;

    if (isElement(value)) {
      value.addEventListener("input", (event) => {
        el.value = value.value;
        el.dispatchEvent(new CustomEvent("input"));
      });
      el.value = value.value;
    } else {
      el.value = value;
    }

    return el;
  }

  // Return a function that is either a tagged template *or* receives
  // format and returns a tagged template.
  const returnValue = function fmt(format = null) {
    if (Array.isArray(arguments[0])) {
      // In this case, strings were provided, proceed to templating
      const args = [null];
      for (let i = 0; i < arguments.length; i++) args.push(arguments[i]);
      return constructOutput.apply(null, args);
    } else {
      // In this case, the first argument is a format
      return function () {
        // So that you may back up and override the formatting after the fact.
        // This is useful for creating a helper which provides an overridable
        // default.
        if (!Array.isArray(arguments[0])) return fmt(arguments[0]);

        // Otherwise, use the default and evaluate
        const args = [format];
        for (let i = 0; i < arguments.length; i++) args.push(arguments[i]);
        return constructOutput.apply(null, args);
      };
    }
  };

  returnValue.sci = sci;

  return returnValue;
}


function _42(signature,fmt,md){return(
signature(
  fmt,
  md`
Evaluate a tagged template, displaying the result in the style of an Observable cell output and passing the first non-HTML value through as the \`viewof\` value.

**Options:** 
- \`format\` (optional): Either a [d3-format](https://github.com/d3/d3-format) string or a function which returns a formatted value.

**Returns:** If a template string is provided, returns an HTML element with its \`value\` property (for use with Observable's \`viewof\` keyword) set identically to the first non-HTML expression value. If no non-HTML value is provided, the output is equal to the first expression value.

If no template string is provided, returns the \`fmt\` function itself with format overridden.
`
)
)}

function _toScientific(d3format,html){return(
function toScientific(format = '~f') {
  const fmt = d3format(format);
  return function(x) {
    let el;
    if (isNaN(x) || !isFinite(x)) {
      el = html`<code>${x}</code>`;
    } else {
      const exponent = x === 0 ? 0 : Math.floor(Math.log10(Math.abs(x)));
      const mantissa = x / Math.pow(10, exponent);
      el = html`<code>${fmt(mantissa)} × 10<sup>${exponent}</sup></code>`;
    }
    el.value = x;
    return el;
  };
}
)}

function _sci(toScientific){return(
toScientific
)}

function _45(signature,sci,md,toScientific){return(
signature(
  sci,
  md`
Return a function which constructs an HTML representation of a \`Number\` in scientific notation.

**Options:** 
- \`format\` (optional): [d3-format](https://github.com/d3/d3-format) string for the mantissa.

**Returns:** an HTML element representing the number. The original numerical value is assigned to its \`value\` property.

**Examples:**

\`\`\`js
toScientific('.5f')(Math.PI)
\`\`\`
${toScientific('.5f')(Math.PI)}
`
)
)}

function _signature(md){return(
function signature(func, content) {
  const sig = md`\`\`\`js
${func
  .toString()
  .split('\n')[0]
  .replace(/\s*{$/, '')}
\`\`\` `;
  sig.style.display = 'inline';

  return md`
<details open style="border:1px solid #eee;padding:25px 15px">
<summary style="cursor:pointer">${sig}</summary>
<hr style="margin:0.2em 0">
${content}
</details>`;
}
)}

function _isElement(HTMLElement){return(
function isElement(obj) {
  try {
    return obj instanceof HTMLElement;
  } catch (e) {
    return (
      typeof obj === "object" &&
      obj.nodeType === 1 &&
      typeof obj.style === "object" &&
      typeof obj.ownerDocument === "object"
    );
  }
}
)}

function _Inspector(require){return(
require('@observablehq/inspector')
)}

async function _d3format(require){return(
(await require('d3-format')).format
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], _1);
  main.variable(observer("delay")).define("delay", _delay);
  main.variable(observer()).define(["md"], _3);
  main.variable(observer()).define(["fmt"], _4);
  main.variable(observer()).define(["md"], _5);
  main.variable(observer()).define(["fmt"], _6);
  main.variable(observer()).define(["md"], _7);
  main.variable(observer("viewof c")).define("viewof c", ["fmt"], _c);
  main.variable(observer("c")).define("c", ["Generators", "viewof c"], (G, _) => G.input(_));
  main.variable(observer()).define(["c"], _9);
  main.variable(observer()).define(["md"], _10);
  main.variable(observer()).define(["md"], _11);
  main.variable(observer()).define(["md"], _12);
  main.variable(observer()).define(["fmt"], _13);
  main.variable(observer()).define(["md","tex"], _14);
  main.variable(observer()).define(["fmt","tex"], _15);
  main.variable(observer()).define(["md"], _16);
  main.variable(observer()).define(["md"], _17);
  main.variable(observer()).define(["fmt"], _18);
  main.variable(observer()).define(["md"], _19);
  main.variable(observer()).define(["fmt"], _20);
  main.variable(observer()).define(["md"], _21);
  main.variable(observer()).define(["md","tex"], _22);
  main.variable(observer()).define(["fmt","tex"], _23);
  main.variable(observer()).define(["md"], _24);
  main.variable(observer("viewof n")).define("viewof n", ["fmt","Tangle"], _n);
  main.variable(observer("n")).define("n", ["Generators", "viewof n"], (G, _) => G.input(_));
  main.variable(observer()).define(["n"], _26);
  main.variable(observer()).define(["md"], _27);
  main.variable(observer()).define(["md"], _28);
  main.variable(observer()).define(["fmt"], _29);
  main.variable(observer()).define(["fmt"], _30);
  main.variable(observer()).define(["md"], _31);
  main.variable(observer()).define(["fmt","sci"], _32);
  main.variable(observer()).define(["fmt","sci"], _33);
  main.variable(observer()).define(["md"], _34);
  main.variable(observer("myFormatter")).define("myFormatter", ["fmt","sci"], _myFormatter);
  main.variable(observer()).define(["myFormatter"], _36);
  main.variable(observer()).define(["myFormatter"], _37);
  main.variable(observer()).define(["md"], _38);
  main.variable(observer()).define(["md"], _39);
  main.variable(observer()).define(["md"], _40);
  main.variable(observer("fmt")).define("fmt", ["DOM","Inspector","isElement","html","d3format","sci"], _fmt);
  main.variable(observer()).define(["signature","fmt","md"], _42);
  main.variable(observer("toScientific")).define("toScientific", ["d3format","html"], _toScientific);
  main.variable(observer("sci")).define("sci", ["toScientific"], _sci);
  main.variable(observer()).define(["signature","sci","md","toScientific"], _45);
  main.variable(observer("signature")).define("signature", ["md"], _signature);
  main.variable(observer("isElement")).define("isElement", ["HTMLElement"], _isElement);
  main.variable(observer("Inspector")).define("Inspector", ["require"], _Inspector);
  const child1 = runtime.module(define1);
  main.import("Tangle", child1);
  main.variable(observer("d3format")).define("d3format", ["require"], _d3format);
  return main;
}
