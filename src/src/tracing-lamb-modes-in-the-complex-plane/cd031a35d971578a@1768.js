import define1 from "./7dfec509126263f5@315.js";
import define2 from "./39fe342decb60c30@3641.js";
import define3 from "./e93997d5089d7165@2303.js";
import define4 from "./b2bbebd2f186ed03@1834.js";

function _1(md){return(
md`# Complex function plotter`
)}

function _2(md){return(
md`This notebook implements a basic complex function plotter. It works by compiling parsed expressions to GLSL and rendering them with WebGL. It's by no means perfect or feature-complete, but it is what it is. I have [Jacob Rus](https://observablehq.com/@jrus) to thank for the colorscale in particular, and [Juan Carlos](https://twitter.com/PonceCampuzano) to thank for inspiration toward adding a function parser.`
)}

function _3(md,glslFunctionMapping){return(
md`Enter an equation below as a function of z. You may write complex numbers as, e.g. \`1 + 2i\`. Supported operators and functions are ${[
  '+',
  '-',
  '*',
  '/',
  '^',
  '**'
]
  .concat(Object.keys(glslFunctionMapping))
  .map(x => `\`${x}\``)
  .join(
    ', '
  )}. You can also define variables, use them by name, and plot them by including them below in \`variables\`.`
)}

function _a(ComplexVariable){return(
ComplexVariable({ name: 'a', value: [-1.5, 0.5] }).show()
)}

function _m(ComplexVariable){return(
ComplexVariable({ name: 'm', value: [0, 0] }).show()
)}

function _b(ComplexVariable){return(
ComplexVariable({ name: 'b', value: [1.5, -0.5] }).show()
)}

function _f(){return(
`(z - a) * (b - m) / (z - b) / (a - m)`
)}

function _variables(a,b,m){return(
[a, b, m]
)}

function _plot(PlotContext,width){return(
PlotContext({
  yrange: [-3, 3],
  width: width,
  height: Math.max(400, Math.floor(width * 0.8))
})
)}

function _presetName(select){return(
select({
  title: 'View presets',
  options: [
    { label: 'By sixes', value: 'sixes' },
    { label: 'By twos', value: 'twos' },
    { label: 'Lines', value: 'contours' },
    { label: 'Grayscale shading', value: 'shaded' },
    { label: '@jrus', value: 'jrus' }
  ],
  value: 'twos'
})
)}

function _11(plot,DomainColoringLayer,f,domainColoringConfig,variables){return(
plot([DomainColoringLayer(f, "z", domainColoringConfig), ...variables])
)}

function _phase(inputsGroup,slider,preset){return(
inputsGroup(
  [
    [
      '<h3 style="font-family:sans-serif;margin-bottom:0.5em;">Phase visualization</h3>'
    ],
    [
      slider({
        value: preset.phaseShading,
        min: 0,
        max: 1,
        step: 0.01,
        title: 'Shading opacity'
      }),
      slider({
        value: preset.phaseOctaves,
        min: 1,
        max: 10,
        step: 1,
        title: 'Octaves'
      }),
      slider({
        value: preset.phaseSteps,
        min: 2,
        max: 8,
        step: 1,
        title: 'Steps'
      }),
      slider({
        value: preset.phaseScale,
        min: 0.05,
        max: 0.5,
        step: 0.01,
        title: 'Scale'
      }),
      slider({
        value: preset.phaseGrid,
        min: 0,
        max: 1,
        step: 0.05,
        title: 'Grid opacity'
      }),
      slider({
        value: preset.phaseColoring,
        min: 0,
        max: 1,
        step: 0.01,
        title: 'Coloring'
      }),
      slider({
        value: preset.phaseMultiplier,
        min: 1,
        max: 4,
        step: 1,
        title: 'Multiplier'
      })
    ]
  ],
  [
    [],
    [
      'opacity',
      'octaves',
      'steps',
      'scale',
      'gridOpacity',
      'coloring',
      'multiplier'
    ]
  ]
)
)}

function _magnitude(inputsGroup,slider,preset){return(
inputsGroup(
  [
    [
      '<h3 style="font-family:sans-serif;margin-bottom:0.5em;">Magnitude visualization</h3>'
    ],
    [
      slider({
        value: preset.magnitudeShading,
        min: 0,
        max: 1,
        step: 0.05,
        title: "Shading opacity"
      }),
      slider({
        value: preset.magnitudeOctaves,
        min: 1,
        max: 10,
        step: 1,
        title: "Octaves"
      }),
      slider({
        value: preset.magnitudeSteps,
        min: 2,
        max: 8,
        step: 1,
        title: "Steps"
      }),
      slider({
        value: preset.magnitudeScale,
        min: 0.05,
        max: 0.5,
        step: 0.01,
        title: "Scale"
      }),
      slider({
        value: preset.magnitudeGrid,
        min: 0,
        max: 1,
        step: 0.05,
        title: "Grid opacity"
      }),
    ]
  ],
  [[], ["opacity", "octaves", "steps", "scale", "gridOpacity", "shadeRange"]]
)
)}

function _shadeRange(rangeSlider){return(
rangeSlider({
  min: -10,
  max: 10,
  step: 0.01,
  value: [-3, 3],
  title: "Shading range"
})
)}

function _miscellaneous(inputsGroup,slider,preset){return(
inputsGroup(
  [
    [
      '<h3 style="font-family:sans-serif;margin-bottom:0.5em;">Miscellaneous</h3>'
    ],
    [
      slider({
        value: preset.contrastPower,
        min: 1,
        max: 10,
        step: 0.05,
        title: 'Contrast ramp power'
      }),
      slider({
        value: preset.lineFeather,
        min: 0.0,
        max: 2,
        step: 0.1,
        title: 'Line feather'
      }),
      slider({
        value: preset.lineWidth,
        min: 0.0,
        max: 4,
        step: 0.1,
        title: 'Line width'
      })
    ]
  ],
  [[], ['contrastRampPower', 'lineFeather', 'lineWidth']]
)
)}

function _linearScaleBias(slider,preset){return(
slider({
  value: preset.linearScaleBias,
  min: 0,
  max: 3,
  step: 0.05,
  description:
    'linear scale bias (high numbers bias toward larger contour spacing. This represents the linear term in scaleWeight  = 1 + linearBias * i + quadraticBias * i^2)'
})
)}

function _quadraticScaleBias(slider,preset){return(
slider({
  value: preset.quadraticScaleBias,
  min: 0,
  max: 2,
  step: 0.05,
  description:
    'quadratic scale bias (high numbers bias toward larger contour spacing. This represents the quadratic term in scaleWeight  = 1 + linearBias * i + quadraticBias * i^2)'
})
)}

function _gridColor(color,preset){return(
color({ description: 'grid color', value: preset.gridColor })
)}

function _19(md){return(
md`## Imports and definitions`
)}

function _preset(presetName){return(
{
  twos: {
    phaseColoring: 1,
    phaseMultiplier: 1,
    phaseShading: 0.15,
    phaseOctaves: 8,
    phaseSteps: 2,
    phaseScale: 0.2,
    phaseGrid: 0.2,
    magnitudeShading: 0.55,
    magnitudeOctaves: 8,
    magnitudeSteps: 2,
    magnitudeGrid: 0.25,
    magnitudeScale: 0.2,
    gridColor: "#000000",
    lineFeather: 1,
    lineWidth: 1,
    linearScaleBias: 1,
    quadraticScaleBias: 0,
    contrastPower: 4
  },
  sixes: {
    phaseColoring: 1,
    phaseMultiplier: 4,
    phaseShading: 0.25,
    phaseOctaves: 4,
    phaseSteps: 6,
    phaseScale: 0.1,
    phaseGrid: 0.15,
    magnitudeShading: 0.5,
    magnitudeOctaves: 5,
    magnitudeSteps: 6,
    magnitudeGrid: 0.15,
    magnitudeScale: 0.1,
    gridColor: "#000000",
    lineFeather: 1,
    lineWidth: 1,
    linearScaleBias: 1,
    quadraticScaleBias: 2,
    contrastPower: 3
  },
  contours: {
    phaseColoring: 0,
    phaseMultiplier: 2,
    phaseShading: 0,
    phaseOctaves: 6,
    phaseSteps: 4,
    phaseScale: 0.2,
    phaseGrid: 0.7,
    magnitudeShading: 0,
    magnitudeOctaves: 6,
    magnitudeSteps: 4,
    magnitudeGrid: 0.7,
    magnitudeScale: 0.2,
    gridColor: "#000000",
    lineFeather: 1,
    lineWidth: 1,
    linearScaleBias: 3,
    quadraticScaleBias: 0,
    contrastPower: 10
  },
  shaded: {
    phaseColoring: 0,
    phaseMultiplier: 4,
    phaseShading: 0.05,
    phaseOctaves: 6,
    phaseSteps: 3,
    phaseScale: 0.1,
    phaseGrid: 0.7,
    magnitudeShading: 0.15,
    magnitudeOctaves: 6,
    magnitudeSteps: 3,
    magnitudeGrid: 0.7,
    magnitudeScale: 0.1,
    gridColor: "#8f8f8f",
    lineFeather: 1,
    lineWidth: 1,
    linearScaleBias: 1.55,
    quadraticScaleBias: 0,
    contrastPower: 3.25
  },
  jrus: {
    phaseColoring: 1,
    phaseMultiplier: 2,
    phaseShading: 0.65,
    phaseOctaves: 5,
    phaseSteps: 6,
    phaseScale: 0.06,
    phaseGrid: 0,
    magnitudeShading: 0.65,
    magnitudeOctaves: 5,
    magnitudeSteps: 6,
    magnitudeGrid: 0,
    magnitudeScale: 0.2,
    gridColor: "#000000",
    lineFeather: 1,
    lineWidth: 1,
    linearScaleBias: 2.5,
    quadraticScaleBias: 0.5,
    contrastPower: 3
  }
}[presetName]
)}

function _domainColoringConfig(phase,magnitude,gridColor,miscellaneous,linearScaleBias,quadraticScaleBias,shadeRange){return(
{
  phaseColoring: phase.coloring,
  phaseMultiplier: phase.multiplier,
  phaseShading: phase.opacity,
  phaseOctaves: phase.octaves,
  phaseSteps: phase.steps,
  phaseScale: phase.scale,
  phaseGrid: phase.gridOpacity,
  magnitudeShading: magnitude.opacity,
  magnitudeOctaves: magnitude.octaves,
  magnitudeSteps: magnitude.steps,
  magnitudeGrid: magnitude.gridOpacity,
  magnitudeScale: magnitude.scale,
  gridColor,
  lineFeather: miscellaneous.lineFeather,
  lineWidth: miscellaneous.lineWidth,
  linearScaleBias,
  quadraticScaleBias,
  contrastPower: miscellaneous.contrastRampPower,
  shadeRange
}
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["md"], _2);
  main.variable(observer()).define(["md","glslFunctionMapping"], _3);
  main.variable(observer("viewof a")).define("viewof a", ["ComplexVariable"], _a);
  main.variable(observer("a")).define("a", ["Generators", "viewof a"], (G, _) => G.input(_));
  main.variable(observer("viewof m")).define("viewof m", ["ComplexVariable"], _m);
  main.variable(observer("m")).define("m", ["Generators", "viewof m"], (G, _) => G.input(_));
  main.variable(observer("viewof b")).define("viewof b", ["ComplexVariable"], _b);
  main.variable(observer("b")).define("b", ["Generators", "viewof b"], (G, _) => G.input(_));
  main.variable(observer("f")).define("f", _f);
  main.variable(observer("variables")).define("variables", ["a","b","m"], _variables);
  main.variable(observer("plot")).define("plot", ["PlotContext","width"], _plot);
  main.variable(observer("viewof presetName")).define("viewof presetName", ["select"], _presetName);
  main.variable(observer("presetName")).define("presetName", ["Generators", "viewof presetName"], (G, _) => G.input(_));
  main.variable(observer()).define(["plot","DomainColoringLayer","f","domainColoringConfig","variables"], _11);
  main.variable(observer("viewof phase")).define("viewof phase", ["inputsGroup","slider","preset"], _phase);
  main.variable(observer("phase")).define("phase", ["Generators", "viewof phase"], (G, _) => G.input(_));
  main.variable(observer("viewof magnitude")).define("viewof magnitude", ["inputsGroup","slider","preset"], _magnitude);
  main.variable(observer("magnitude")).define("magnitude", ["Generators", "viewof magnitude"], (G, _) => G.input(_));
  main.variable(observer("viewof shadeRange")).define("viewof shadeRange", ["rangeSlider"], _shadeRange);
  main.variable(observer("shadeRange")).define("shadeRange", ["Generators", "viewof shadeRange"], (G, _) => G.input(_));
  main.variable(observer("viewof miscellaneous")).define("viewof miscellaneous", ["inputsGroup","slider","preset"], _miscellaneous);
  main.variable(observer("miscellaneous")).define("miscellaneous", ["Generators", "viewof miscellaneous"], (G, _) => G.input(_));
  main.variable(observer("viewof linearScaleBias")).define("viewof linearScaleBias", ["slider","preset"], _linearScaleBias);
  main.variable(observer("linearScaleBias")).define("linearScaleBias", ["Generators", "viewof linearScaleBias"], (G, _) => G.input(_));
  main.variable(observer("viewof quadraticScaleBias")).define("viewof quadraticScaleBias", ["slider","preset"], _quadraticScaleBias);
  main.variable(observer("quadraticScaleBias")).define("quadraticScaleBias", ["Generators", "viewof quadraticScaleBias"], (G, _) => G.input(_));
  main.variable(observer("viewof gridColor")).define("viewof gridColor", ["color","preset"], _gridColor);
  main.variable(observer("gridColor")).define("gridColor", ["Generators", "viewof gridColor"], (G, _) => G.input(_));
  main.variable(observer()).define(["md"], _19);
  main.variable(observer("preset")).define("preset", ["presetName"], _preset);
  main.variable(observer("domainColoringConfig")).define("domainColoringConfig", ["phase","magnitude","gridColor","miscellaneous","linearScaleBias","quadraticScaleBias","shadeRange"], _domainColoringConfig);
  const child1 = runtime.module(define1);
  main.import("inputsGroup", child1);
  const child2 = runtime.module(define2);
  main.import("PlotContext", child2);
  main.import("ComplexVariable", child2);
  main.import("DomainColoringLayer", child2);
  main.import("glslFunctionMapping", child2);
  const child3 = runtime.module(define3);
  main.import("slider", child3);
  main.import("color", child3);
  main.import("select", child3);
  const child4 = runtime.module(define4);
  main.import("rangeSlider", child4);
  return main;
}
