// https://observablehq.com/@mbostock/tangle@481
function _1(md){return(
md`# Tangle

This notebook implements an [Observable view](/@observablehq/introduction-to-views) inspired by [Bret Victor’s Tangle](http://worrydream.com/Tangle/). Using [input synchronization](/@observablehq/synchronized-inputs), these views can be inlined into Markdown. Try dragging the underlined numbers below.`
)}

function _2(md){return(
md`To use in your notebook:

~~~js
import {Tangle} from "@mbostock/tangle"
~~~
`
)}

function _3(md,Inputs,Tangle,$0,$1,totalCalories){return(
md`I ate ${Inputs.bind(Tangle({min: 0, minWidth: "2em"}), $0)} cookies and ${Inputs.bind(Tangle({min: 0, minWidth: "2em"}), $1)} cakes. That’s ${totalCalories.toLocaleString("en")} calories!`
)}

function _4(md,Inputs,Tangle,$0,cookieCalories,$1,cakeCalories,totalQuantity,totalCalories){return(
md`Here’s a table.

| Food    | Quantity | Calories |
|---------|----------|----------|
| Cookies | ${Inputs.bind(Tangle({min: 0}), $0)} | ${cookieCalories.toLocaleString("en")} |
| Cakes | ${Inputs.bind(Tangle({min: 0}), $1)} | ${cakeCalories.toLocaleString("en")} |
| Total | ${totalQuantity.toLocaleString("en")} | ${totalCalories.toLocaleString("en")} |`
)}

function _5(md){return(
md`The two cells below define [synchronized views](/@mbostock/synchronized-views) representing the interactive values. Each view’s value can be assigned by any input in the notebook, triggering an *input* event that allows other cells to react.`
)}

function _cookies(Inputs){return(
Inputs.input(50)
)}

function _cakes(Inputs){return(
Inputs.input(4)
)}

function _8(md){return(
md`With the views so defined, we can define derived values reactively. Cells referencing these derived values will react automatically.`
)}

function _cookieCalories(cookies,caloriesPerCookie){return(
cookies * caloriesPerCookie
)}

function _cakeCalories(cakes,caloriesPerCake){return(
cakes * caloriesPerCake
)}

function _totalCalories(cookieCalories,cakeCalories){return(
cookieCalories + cakeCalories
)}

function _totalQuantity(cookies,cakes){return(
cookies + cakes
)}

function _13(md){return(
md`You can use a Tangle as a top-level cell value, too.`
)}

function _caloriesPerCookie(Tangle){return(
Tangle({value: 50})
)}

function _caloriesPerCake(Tangle){return(
Tangle({value: 1000})
)}

function _16(md){return(
md`---

## Appendix

See also work by [Ali Jaya Meilio](/@alijaya/tangle), [@sirbiscuit](/@sirbiscuit/observable-tangle), and [Amit Patel](/@redblobgames/scrubbable-numbers).`
)}

function _Tangle(delta,Event,onpointercancel){return(
function Tangle({
  min = -Infinity,
  max = Infinity,
  minWidth = undefined,
  step = 1,
  power = 1.2,
  value = 50,
  format = x => x.toLocaleString("en")
} = {}) {
  const target = document.createElement("span");
  Object.defineProperties(target, {
    value: {
      set(v) {
        value = Math.max(min, Math.min(max, Math.floor(v / step) * step));
        target.textContent = format(value);
      },
      get() {
        return value;
      }
    }
  });
  if (value !== undefined) {
    target.value = value;
  }
  if (minWidth !== undefined) {
    target.style.minWidth = minWidth;
    target.style.textAlign = "right";
    target.style.display = "inline-block";
  }
  target.style.borderBottom = "dotted 1px currentColor";
  target.style.cursor = "ew-resize";
  target.style.touchAction = "none";
  target.onselectstart = event => event.preventDefault();
  target.ontouchstart = event => event.preventDefault();
  target.onpointerdown = event => {
    const startValue = value;
    const {clientX: startX, clientY: startY, pointerId} = event;
    const container = target.closest(".observablehq");
    const onpointermove = (event) => {
      const {clientX, clientY} = event;
      const v0 = target.value;
      const distance = clientX - startX + startY - clientY;
      target.value = startValue + Math.abs(distance) ** power * Math.sign(distance) * step / delta;
      const v1 = target.value;
      if (v0 !== v1) target.dispatchEvent(new Event("input", {bubbles: true}));
    };
    const onpointerup = (event) => {
      container.releasePointerCapture(pointerId);
      container.removeEventListener("pointermove", onpointermove);
      container.removeEventListener("pointercancel", onpointercancel);
      container.removeEventListener("pointerup", onpointerup);
    };
    container.addEventListener("pointermove", onpointermove);
    container.addEventListener("pointercancel", onpointerup);
    container.addEventListener("pointerup", onpointerup);
    container.setPointerCapture(pointerId);
  };
  return target;
}
)}

function _delta(){return(
6
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["md"], _2);
  main.variable(observer()).define(["md","Inputs","Tangle","viewof cookies","viewof cakes","totalCalories"], _3);
  main.variable(observer()).define(["md","Inputs","Tangle","viewof cookies","cookieCalories","viewof cakes","cakeCalories","totalQuantity","totalCalories"], _4);
  main.variable(observer()).define(["md"], _5);
  main.variable(observer("viewof cookies")).define("viewof cookies", ["Inputs"], _cookies);
  main.variable(observer("cookies")).define("cookies", ["Generators", "viewof cookies"], (G, _) => G.input(_));
  main.variable(observer("viewof cakes")).define("viewof cakes", ["Inputs"], _cakes);
  main.variable(observer("cakes")).define("cakes", ["Generators", "viewof cakes"], (G, _) => G.input(_));
  main.variable(observer()).define(["md"], _8);
  main.variable(observer("cookieCalories")).define("cookieCalories", ["cookies","caloriesPerCookie"], _cookieCalories);
  main.variable(observer("cakeCalories")).define("cakeCalories", ["cakes","caloriesPerCake"], _cakeCalories);
  main.variable(observer("totalCalories")).define("totalCalories", ["cookieCalories","cakeCalories"], _totalCalories);
  main.variable(observer("totalQuantity")).define("totalQuantity", ["cookies","cakes"], _totalQuantity);
  main.variable(observer()).define(["md"], _13);
  main.variable(observer("viewof caloriesPerCookie")).define("viewof caloriesPerCookie", ["Tangle"], _caloriesPerCookie);
  main.variable(observer("caloriesPerCookie")).define("caloriesPerCookie", ["Generators", "viewof caloriesPerCookie"], (G, _) => G.input(_));
  main.variable(observer("viewof caloriesPerCake")).define("viewof caloriesPerCake", ["Tangle"], _caloriesPerCake);
  main.variable(observer("caloriesPerCake")).define("caloriesPerCake", ["Generators", "viewof caloriesPerCake"], (G, _) => G.input(_));
  main.variable(observer()).define(["md"], _16);
  main.variable(observer("Tangle")).define("Tangle", ["delta","Event","onpointercancel"], _Tangle);
  main.variable(observer("delta")).define("delta", _delta);
  return main;
}
