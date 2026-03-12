// https://observablehq.com/@bumbeishvili/input-groups@315
import define1 from "./e93997d5089d7165@2303.js";

function _1(md){return(
md`# Inputs in grid `
)}

function _2(md){return(
md`Just a quick wrapper around [jashkenas/inputs](https://observablehq.com/@jashkenas/inputs) , so it's possible to position inputs in a grid.

Does not work for all inputs (multi checkboxes and canvas based inputs, like location coordinate picker ) , but it's enough for my needs for now.

We get result as array, which has additional properties attached for naming convenience (if you pass names array as a second parameter)
`
)}

function _3(values){return(
values
)}

function _values(inputsGroup,slider,width,select){return(
inputsGroup(
  [
    [
      slider({ title: 'test1', description: 'description1' }),
      slider({ title: 'test2', description: 'description2' }),
      slider({ title: 'test3', description: 'description3' })
    ],
    [
      slider({ title: 'test4', description: 'description4' }),
      slider({ title: 'test5', description: 'description5' }),
      slider({ title: 'test6', description: 'description6' })
    ],
    [
      `<div style="height:50px;width:${width / 2 - 100}px"></div>`, //  Just a trick, to make select element centered
      select(['test', 'name'])
    ]
  ],

  [
    ['first-input', 'second-input', 'third-slider'],
    ['4-th', '5-th', '6-th'],
    ['', 'select']
  ]
)
)}

function _5(valuesObjOnly){return(
valuesObjOnly
)}

function _valuesObjOnly(inputsGroup,slider,width,select){return(
inputsGroup(
  [
    [
      slider({ title: 'test1', description: 'description1' }),
      slider({ title: 'test2', description: 'description2' }),
      slider({ title: 'test3', description: 'description3' })
    ],
    [
      slider({ title: 'test4', description: 'description4' }),
      slider({ title: 'test5', description: 'description5' }),
      slider({ title: 'test6', description: 'description6' })
    ],
    [
      `<div style="height:50px;width:${width / 2 - 100}px"></div>`, //  Just a trick, to make select element centered
      select(['test', 'name'])
    ]
  ],

  [
    ['first-input', 'second-input', 'third-slider'],
    ['4-th', '5-th', '6-th'],
    ['', 'select']
  ],
  { objOnly: true }
)
)}

function _inputsGroup(html){return(
function inputsGroup(views, names, args) {
  const form = html`<div class="inputs-group">${views.map(
    row =>
      html`<div  class="inputs-group-row">${row.map(
        input =>
          html`<div  class="inputs-group-cell" style="display:inline-block;min-width:300px">${input}</div>`
      )}</div>`
  )}</div>`;

  form.oninput = () => {
    const values = views.map(row => row.map(input => input.value));
    form.value = values;

    if (args && args.objOnly) form.value = {};
    if (names) {
      names.forEach((row, i) =>
        row.forEach(
          (c, j) => values[i][j] != null && (form.value[c] = values[i][j])
        )
      );
    }
  };
  form.oninput();
  return form;
}
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["md"], _2);
  main.variable(observer()).define(["values"], _3);
  main.variable(observer("viewof values")).define("viewof values", ["inputsGroup","slider","width","select"], _values);
  main.variable(observer("values")).define("values", ["Generators", "viewof values"], (G, _) => G.input(_));
  main.variable(observer()).define(["valuesObjOnly"], _5);
  main.variable(observer("viewof valuesObjOnly")).define("viewof valuesObjOnly", ["inputsGroup","slider","width","select"], _valuesObjOnly);
  main.variable(observer("valuesObjOnly")).define("valuesObjOnly", ["Generators", "viewof valuesObjOnly"], (G, _) => G.input(_));
  main.variable(observer("inputsGroup")).define("inputsGroup", ["html"], _inputsGroup);
  const child1 = runtime.module(define1);
  main.import("slider", child1);
  main.import("select", child1);
  return main;
}
