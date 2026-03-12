import define1 from "./481d4902e37d39c8@232.js";
import define2 from "./72fd175c7f693279@299.js";
import define3 from "./24a66d948d8e573c@159.js";
import define4 from "./a82f06f54ea1d92b@1679.js";
import define5 from "./9b324adc60e147f8@231.js";
import define6 from "./e93997d5089d7165@2303.js";

function _1(md){return(
md`# complex function plotter implementation`
)}

function _2(md){return(
md`To use, import with

\`\`\`js
import {PlotContext, ComplexVariable, DomainColoringLayer} from '39fe342decb60c30'
\`\`\`
`
)}

function _plot(PlotContext){return(
PlotContext({ yrange: [-2, 2] })
)}

function _layer(DomainColoringLayer,f,domainColoringConfig){return(
DomainColoringLayer(f, 'z', domainColoringConfig)
)}

function _5(md,glslFunctionMapping){return(
md`You may write complex numbers as, e.g. \`1 + 2i\`. Supported operators and functions are ${[
  '+',
  '-',
  '*',
  '/',
  '^',
  '**'
]
  .concat(Object.keys(glslFunctionMapping))
  .map(x => `\`${x}\``)
  .join(', ')}.`
)}

function _f(){return(
`sin(z)`
)}

function _a(ComplexVariable){return(
ComplexVariable({ name: 'a', value: [-1, 0] }).show()
)}

function _b(ComplexVariable){return(
ComplexVariable({ name: 'b', value: [1, 0], visible: false }).show()
)}

function _m(ComplexVariable){return(
ComplexVariable({ name: 'm', value: [0, 0] }).show()
)}

function _10(md){return(
md`To draw the plot, we pass it as list of layers and variables.`
)}

function _11(plot,layer,b,m){return(
plot([layer, b, m])
)}

function _gridColor(color){return(
color({ description: 'grid color' })
)}

function _phaseColoring(slider){return(
slider({
  value: 1,
  min: 0,
  max: 1,
  step: 0.01,
  description: 'phase coloring'
})
)}

function _phaseMultiplier(slider){return(
slider({
  value: 2,
  min: 1,
  max: 4,
  step: 1,
  description:
    'phase multiplier (for enforcing major grid lines at 90˚ increments)'
})
)}

function _contrastPower(slider){return(
slider({
  value: 3,
  min: 1,
  max: 10,
  step: 0.05,
  description: 'contrast ramp power'
})
)}

function _magnitudeShading(slider){return(
slider({
  value: 0.6,
  min: 0,
  max: 1,
  step: 0.05,
  description: 'magnitude shading opacity'
})
)}

function _phaseShading(slider){return(
slider({
  value: 0.25,
  min: 0,
  max: 1,
  step: 0.05,
  description: 'phase shading opacity'
})
)}

function _phaseOctaves(slider){return(
slider({
  value: 4,
  min: 1,
  max: 8,
  step: 1,
  description: 'phase octaves'
})
)}

function _magnitudeOctaves(slider){return(
slider({
  value: 5,
  min: 1,
  max: 8,
  step: 1,
  description: 'magnitude octaves'
})
)}

function _phaseSteps(slider){return(
slider({
  value: 6,
  min: 2,
  max: 8,
  step: 1,
  description: 'phase steps'
})
)}

function _magnitudeSteps(slider){return(
slider({
  value: 6,
  min: 2,
  max: 8,
  step: 1,
  description: 'magnitude steps'
})
)}

function _magnitudeGrid(slider){return(
slider({
  value: 0.0,
  min: 0,
  max: 1,
  step: 0.05,
  description: 'magnitude grid opacity'
})
)}

function _phaseGrid(slider){return(
slider({
  value: 0,
  min: 0,
  max: 1,
  step: 0.05,
  description: 'phase grid opacity'
})
)}

function _magnitudeScale(slider){return(
slider({
  value: 0.1,
  min: 0.1,
  max: 4,
  step: 0.1,
  description: 'magnitude scale'
})
)}

function _phaseScale(slider){return(
slider({
  value: 0.1,
  min: 0.1,
  max: 4,
  step: 0.1,
  description: 'phase scale'
})
)}

function _lineFeather(slider){return(
slider({
  value: 1.0,
  min: 0.0,
  max: 2,
  step: 0.1,
  description: 'line feather'
})
)}

function _lineWidth(slider){return(
slider({
  value: 1.0,
  min: 0.0,
  max: 4,
  step: 0.1,
  description: 'line width'
})
)}

function _linearScaleBias(slider){return(
slider({
  value: 1,
  min: 0,
  max: 4,
  step: 0.05,
  description:
    'linear scale bias (high numbers bias toward larger contour spacing. This represents the linear term in scaleWeight  = 1 + linearBias * i + quadraticBias * i^2)'
})
)}

function _quadraticScaleBias(slider){return(
slider({
  value: 0,
  min: 0,
  max: 2,
  step: 0.05,
  description:
    'quadratic scale bias (high numbers bias toward larger contour spacing. This represents the quadratic term in scaleWeight  = 1 + linearBias * i + quadraticBias * i^2)'
})
)}

function _domainColoringConfig(phaseColoring,gridColor,magnitudeShading,phaseShading,phaseOctaves,magnitudeOctaves,phaseSteps,magnitudeSteps,magnitudeGrid,phaseGrid,magnitudeScale,phaseScale,lineFeather,lineWidth,phaseMultiplier,linearScaleBias,quadraticScaleBias,contrastPower){return(
{
  phaseColoring,
  gridColor,
  magnitudeShading,
  phaseShading,
  phaseOctaves,
  magnitudeOctaves,
  phaseSteps,
  magnitudeSteps,
  magnitudeGrid,
  phaseGrid,
  magnitudeScale,
  phaseScale,
  lineFeather,
  lineWidth,
  phaseMultiplier,
  linearScaleBias,
  quadraticScaleBias,
  contrastPower
}
)}

function _31(md){return(
md`## Implementation`
)}

function _DomainColoringLayer(parse,compileGLSL,createRainbowTexture,hexRgbToFloat,createDrawCommand)
{
  function createUniforms(regl, variables) {
    var uniforms = {};
    for (var i = 0; i < variables.length; i++) {
      uniforms[variables[i]] = regl.prop(variables[i]);
    }
    return uniforms;
  }

  function DomainColoringLayer(fn, independentVariable, opts) {
    if (!(this instanceof DomainColoringLayer)) {
      return new DomainColoringLayer(fn, independentVariable, opts);
    }
    this.setConfig(
      Object.assign(
        {
          gridColor: "#000000",
          phaseColoring: 1,
          magnitudeShading: 0.35,
          phaseShading: 0.35,
          phaseOctaves: 5,
          magnitudeOctaves: 5,
          phaseSteps: 6,
          magnitudeSteps: 6,
          magnitudeGrid: 0.0,
          phaseGrid: 0.0,
          magnitudeScale: 0.1,
          phaseScale: 0.1,
          lineFeather: 1,
          lineWidth: 1,
          phaseMultiplier: 2,
          linearScaleBiase: 1,
          quadraticScaleBias: 0,
          contrastPower: 3,
          shadeRange: [0, 2]
        },
        opts || {}
      )
    );
    this.setFunction(independentVariable, fn);
  }

  DomainColoringLayer.prototype.setFunction = function (
    independentVariable,
    f
  ) {
    this.parsedFn = parse(f);
    this.glslFn = compileGLSL(this.parsedFn, independentVariable);
    return this;
  };

  DomainColoringLayer.prototype.getDrawCommand = function (regl) {
    if (this._draw) return this._draw;
    const setUniforms = regl({
      uniforms: createUniforms(regl, this.glslFn.variables)
    });
    if (this.colormap) {
      this.colormap.destroy();
    }
    this.colormap = createRainbowTexture(regl);

    var config = Object.assign({
      colormap: this.colormap,
      scale: [this.config.magnitudeScale, this.config.phaseScale],
      steps: [this.config.magnitudeSteps, this.config.phaseSteps],
      gridOpacity: [this.config.magnitudeGrid, this.config.phaseGrid],
      shadingOpacity: [this.config.magnitudeShading, this.config.phaseShading],
      lineWidth: this.config.lineWidth,
      lineFeather: this.config.lineFeather,
      gridColor: hexRgbToFloat(this.config.gridColor),
      phaseColoring: this.config.phaseColoring,
      contrastPower: this.config.contrastPower,
      shadeRange: this.config.shadeRange
    });

    const drawCommand = createDrawCommand(regl, this.glslFn.glsl, this.config);

    this._draw = (constants) => {
      setUniforms(constants, () => {
        drawCommand(config);
      });
    };

    return this._draw;
  };

  DomainColoringLayer.prototype.setConfig = function (config) {
    this.config = Object.assign(this.config || {}, config || {});
    this.flush();
    return this;
  };

  DomainColoringLayer.prototype.draw = function (data, constants) {
    this.getDrawCommand(data.stack.layers.regl)(constants);
    return this;
  };

  DomainColoringLayer.prototype.flush = function () {
    delete this._draw;
    return this;
  };

  return DomainColoringLayer;
}


function _ComplexVariable(tex,sprintf,d3)
{
  var counter = 0;
  function Variable(opts) {
    if (!(this instanceof Variable)) return new Variable(opts);
    opts = opts || {};

    var id = `variable-${counter++}`;
    var value = opts.value;
    var name = opts.name;
    this.visible = opts.visible === undefined ? true : !!opts.visible;
    var label = opts.label === undefined ? opts.name : opts.label;

    var span = document.createElement('span');
    function render() {
      span.innerHTML = '';
      span.appendChild(
        tex`${label} = ${sprintf('%.4g', value[0])} ${sprintf(
          '%+.4g',
          value[1]
        )}i`
      );
      return span;
    }

    this.getName = function() {
      return name;
    };
    this.getValue = function() {
      return value;
    };
    this.setValue = function(v) {
      value[0] = v[0];
      value[1] = v[1];
      render();
      span.dispatchEvent(new CustomEvent('input'));
    };

    this.getId = function() {
      return id;
    };
    const representation = render();
    this.show = () => {
      return representation;
    };
    representation.value = this;

    return this;
  }

  Variable.draw = function(data, vars) {
    vars = vars.filter(v => v.visible);
    var svg = d3.select(data.stack.layers.svg);
    var id = `complexvars-${data.plot.getId()}`;
    var g = data.plotContent
      .selectAll(`g#${id}`)
      .data([null], d => id)
      .join('g')
      .attr('id', id);

    g.selectAll('g.handle')
      .data(vars, d => d.getId())
      .join(
        enter =>
          enter
            .append('g')
            .attr('class', 'handle')
            .call(el => {
              el.append('circle')
                .attr('r', 7)
                .attr('stroke-width', 0)
                .attr('stroke', 'transparent')
                .attr('fill', 'rgba(255, 255, 255, 0.9)');
              el.append('circle')
                .attr('class', 'grabber')
                .attr('cursor', 'move')
                .attr('r', 5)
                .attr('stroke-width', 40)
                .attr('stroke', 'transparent')
                .attr('fill', '#35e');
              el.call(
                d3.drag().on('drag', d => {
                  d.setValue([
                    data.xScale.invert(d3.event.x),
                    data.yScale.invert(d3.event.y)
                  ]);
                })
              );
            }),
        update => update,
        exit => exit.remove()
      )
      .attr(
        'transform',
        d =>
          `translate(${data.xScale(d.getValue()[0])},${data.yScale(
            d.getValue()[1]
          )})`
      );
  };

  return Variable;
}


function _PlotContext(width,DOM,createLayerStack,reglCanvasWithOptions,html,isNarrowScreen,createViewport,d3,constrainLinearScaleAspectRatio,viewportAxes,createReglViewportConfiguration,createReglLinearScaleConfiguration,createReglMap,DomainColoringLayer,ComplexVariable,persistentZoom,invalidation)
{
  var counter = 0;

  return function PlotContext(opts) {
    if (!(this instanceof PlotContext)) return new PlotContext(opts);
    const w = opts.width === undefined ? width : opts.width;
    const h =
      opts.height === undefined
        ? Math.max(400, Math.min(1000, w * 0.9))
        : opts.height;
    var id = `plot-${counter++}`;
    opts = opts || {};
    const clipId = DOM.uid('clip-rect');
    const pixelRatio = opts.pixelRatio || devicePixelRatio;
    var stack = createLayerStack(w, h, pixelRatio, {
      regl: reglCanvasWithOptions(
        Object.assign(
          {
            attributes: { depthStencil: false, antialias: false },
            extensions: ['OES_standard_derivatives'],
            pixelRatio
          },
          opts.reglOptions || {}
        )
      ),
      svg: DOM.svg
    });

    stack.container.appendChild(html`<style>
      #${id} svg.narrow .axis {
        color: black;
      }
      #${id} .handle text {
        display: none;
      }
      #${id} .handle:hover text {
        display: block;
      }
      #${id} svg {
        cursor: grab;
      }
      #${id} svg:active {
        cursor: grabbing;
      }
      </style>
      `);
    stack.container.setAttribute('id', id);

    const margin =
      opts.margin ||
      (isNarrowScreen
        ? { t: 3, r: 0, b: 1, l: 1 }
        : { t: 5, r: 5, b: 20, l: 40 });
    const viewport = createViewport(stack, margin);
    const xrange = opts.xrange === undefined ? [-2, 2] : opts.xrange;
    const yrange = opts.yrange === undefined ? [-2, 2] : opts.yrange;

    const yScale = d3
      .scaleLinear()
      .domain(yrange)
      .range([viewport.height - viewport.margin.b, viewport.margin.t]);

    const xScale = constrainLinearScaleAspectRatio(
      d3
        .scaleLinear()
        .domain(xrange)
        .range([viewport.margin.l, viewport.width - viewport.margin.r]),
      yScale,
      1
    );
    const originalXScale = xScale.copy();
    const originalYScale = yScale.copy();

    const svg = d3.select(stack.layers.svg);
    svg.selectAll('g.axes, g.handles, defs').remove();
    svg.attr('class', isNarrowScreen ? 'narrow' : 'wide');

    var axes = svg.append('g').attr('class', 'axes');

    function updateAxes() {
      axes.call(
        viewportAxes(viewport, xScale, yScale, {
          xAxis: isNarrowScreen ? d3.axisTop : d3.axisBottom,
          yAxis: isNarrowScreen ? d3.axisRight : d3.axisLeft
        })
      );
    }

    svg
      .append('defs')
      .append('clipPath')
      .attr('id', clipId.id)
      .append('rect')
      .attr('x', viewport.margin.l)
      .attr('y', viewport.margin.t)
      .attr('width', viewport.width - viewport.margin.l - viewport.margin.r)
      .attr('height', viewport.height - viewport.margin.t - viewport.margin.b);

    var plotContent = svg
      .append('g')
      .attr('class', 'content')
      .attr('clip-path', `url(${clipId.href})`);

    const handles = svg.selectAll('g.handles');

    let update, grabbers;
    var controlsByKey = {};
    var controls = [];

    const regl = stack.layers.regl;
    const data = (regl.data = regl.data || {});
    /*
    const viewTransform = mat3create();
    const viewportTransform = mat3create();
    const ctxTransform = mat3create();
    */

    const configureRegl = {
      viewport: createReglViewportConfiguration(regl),
      scale: createReglLinearScaleConfiguration(regl),
      map: createReglMap(regl)
    };

    var layers = null;
    var variables = {};
    update = function() {
      var data = { stack, plotContent, xScale, yScale, plot };

      if (layers) {
        // Collect variable values
        var variables = {};
        for (var i = 0; i < layers.length; i++) {
          var layer = layers[i];
          if (layer.getValue && layer.getName) {
            variables[layer.getName()] = layer.getValue();
          }
        }
        var dcLayers = layers.filter(l => l instanceof DomainColoringLayer);
        var complexVars = layers.filter(l => l instanceof ComplexVariable);

        regl.poll();
        regl.clear({ color: [1, 1, 1, 1] });
        configureRegl.viewport(viewport, () => {
          configureRegl.scale(xScale, yScale, () => {
            configureRegl.map(() => {
              dcLayers.forEach(l => l.draw(data, variables));

              ComplexVariable.draw(data, complexVars);

              /*for (var i = 0; i < layers.length; i++) {
                layers[i].draw(data, variables);
              }*/
            });
          });
        });
      }

      // Update the view matrices
      //mat3ViewportFromLinearScales(viewportTransform, xScale, yScale);
      //mat3fromLinearScales(viewTransform, xScale, yScale);
      //mat3multiply(ctxTransform, viewportTransform, viewTransform);
    };

    svg.call(
      persistentZoom(xScale, yScale, originalXScale, originalYScale)
        .on('zoom.axes', updateAxes)
        .on('zoom.plot', update)
    );
    invalidation.then(() => {
      if (layers) layers.forEach(layer => layer.flush && layer.flush());
    });

    update();
    updateAxes();

    function plot(layers_) {
      layers = layers_;
      update();
      return stack.container;
    }
    plot.getId = function() {
      return id;
    };
    return plot;
  };
}


function _derivatives(){return(
'OES_standard_derivatives'
)}

function _createRainbowTexture(rainbow){return(
regl => regl.texture(rainbow)
)}

function _createPolarDomainColoringShader(){return(
function createPolarDomainColoringShader(opts) {
  opts = opts || {};
  const magnitudeOctaves =
    opts.magnitudeOctaves === undefined ? 4 : +opts.magnitudeOctaves;
  const phaseOctaves = opts.phaseOctaves === undefined ? 3 : +opts.phaseOctaves;
  const phaseMultiplier =
    opts.phaseMultiplier === undefined ? 4 : +opts.phaseMultiplier;
  const magnitudeMultiplier =
    opts.magnitudeMultiplier === undefined ? 4 : +opts.magnitudeMultiplier;
  const phaseColoring =
    opts.phaseColoring === undefined ? 0.0 : +opts.phaseColoring;
  const bias1 = opts.bias1 === undefined ? 0.0 : +opts.bias1;
  const bias2 = opts.bias2 === undefined ? 0.0 : +opts.bias2;

  // prettier-ignore
  var shader = `
#ifndef PI
#define PI 3.141592653589793238
#endif

#ifndef HALF_PI_INV
#define HALF_PI_INV 0.15915494309
#endif

#ifndef GLSL_HYPOT
#define GLSL_HYPOT
float hypot (vec2 z) {
  float x = abs(z.x);
  float y = abs(z.y);
  float t = min(x, y);
  x = max(x, y);
  t = t / x;
  return x * sqrt(1.0 + t * t);
}
#endif

float complexContouringGridFunction (float x) {
  return 4.0 * abs(fract(x - 0.5) - 0.5);
}

float domainColoringContrastFunction (float x, float power) {
  x = 2.0 * x - 1.0;
  return 0.5 + 0.5 * pow(abs(x), power) * sign(x);
}

/*float antialias (float value) {
  float threshold = 1.0 / width;
  return value < threshold || value > 1.0 - threshold ? 0.0 : 1.0;
}*/

vec4 domainColoring (vec4 f_df,
                     vec2 steps,
                     vec2 scale,
                     vec2 gridOpacity,
                     vec2 shadingOpacity,
                     float lineWidth,
                     float lineFeather,
                     vec3 gridColor,
                     float phaseColoring,
                     float contrastPower,
                     sampler2D colormap,
                     vec2 magRange
 ) {
  float invlog2base, logspacing, logtier, n, invSteps;

  vec2 res = scale * vec2(1.0, 1.0 / 6.28) * 20.0 * steps;

  // Complex argument, scaled to the range [0, 4]
  float carg = atan(f_df.y, f_df.x) * HALF_PI_INV * ${phaseMultiplier.toFixed(
    1
  )};

  // Reciprocal of the complex magnitude
  float cmagRecip = 1.0 / hypot(f_df.xy);

  // Normalize z before using it to compute the magnitudes. Without this we lose half
  // of the floating point range due to overflow.
  vec2 znorm = f_df.xy * cmagRecip;

  // Computed as d|f| / dz, evaluated in the +real direction (though any direction works)
  float cmagGradientMag = hypot(vec2(dot(znorm, f_df.zw), dot(vec2(znorm.y, -znorm.x), f_df.zw)));

  float cargGradientMag = cmagGradientMag * cmagRecip;
  
  // Shade at logarithmically spaced magnitudes
  float mappedCmag = -log2(cmagRecip);
  float mappedCmagGradientMag = cmagGradientMag * cmagRecip;

  // Magnitude steps
  invlog2base = 1.0 / log2(steps.x);
  logspacing = log2(mappedCmagGradientMag * res.x) * invlog2base;
  logspacing = clamp(logspacing, -50.0, 50.0);
  logtier = floor(logspacing);
  n = log2(abs(mappedCmag)) * invlog2base - logtier;

  invSteps = 1.0 / steps.x;
  float magOctave0 = pow(steps.x, n) * sign(mappedCmag);

  ${[...Array(magnitudeOctaves - 1).keys()]
    .map((i) => `float magOctave${i + 1} = magOctave${i} * invSteps;`)
    .join("\n  ")}

  ${[...Array(magnitudeOctaves + 1).keys()]
    .map(
      (i) =>
        `float magWeight${i} = ${
          i === 0 || i === magnitudeOctaves
            ? "1e-4"
            : (1 + i * bias1 + bias2 * Math.pow(i, 2)).toFixed(2)
        };`
    )
    .join("\n  ")}
  
  float width1 = max(0.0, lineWidth - lineFeather);
  float width2 = lineWidth + lineFeather;

  float w, scaleFactor, value, gridValue;
  float totalWeight = 0.0;
  float magnitudeGrid = 0.0;
  float magnitudeShading = 0.0;
  scaleFactor = pow(steps.x, logtier) / cargGradientMag * 0.25;
  
  ${[...Array(magnitudeOctaves).keys()]
    .map(
      (i) =>
        `w = mix(magWeight${i}, magWeight${i + 1}, 1.0 - logspacing + logtier);
  totalWeight += w;
  gridValue = complexContouringGridFunction(magOctave${i}) * scaleFactor;
  magnitudeGrid += w * smoothstep(width1, width2, gridValue);
  value = fract(-magOctave${i});
  magnitudeShading += w * (0.5 + (domainColoringContrastFunction(value, contrastPower) - 0.5) * min(1.0, gridValue * 1.5));
  scaleFactor *= steps.x;
  `
    )
    .join("\n  ")}
  
  magnitudeGrid /= totalWeight;
  magnitudeShading /= totalWeight;

  // Phase steps
  invlog2base = 1.0 / log2(steps.y);
  logspacing = log2(cargGradientMag * ${phaseMultiplier.toFixed(
    1
  )} * res.y) * invlog2base;
  logspacing = clamp(logspacing, -50.0, 50.0);
  logtier = floor(logspacing);
  n = log2(abs(carg) + 1.0) * invlog2base - logtier;

  invSteps = 1.0 / steps.y;
  float phaseOctave0 = pow(steps.y, n) * sign(carg);

  ${[...Array(phaseOctaves - 1).keys()]
    .map((i) => `float phaseOctave${i + 1} = phaseOctave${i} * invSteps;`)
    .join("\n  ")}

  ${[...Array(phaseOctaves + 1).keys()]
    .map(
      (i) =>
        `const float phaseWeight${i} = ${
          i === 0 || i === phaseOctaves
            ? "1e-4"
            : (1 + i * bias1 + bias2 * Math.pow(i, 2)).toFixed(4)
        };`
    )
    .join("\n  ")}
  
  totalWeight = 0.0;

  float phaseShading = 0.0;
  float phaseGrid = 0.0;
  scaleFactor = pow(steps.y, logtier) / (cargGradientMag * ${phaseMultiplier.toFixed(
    1
  )}) * 2.0;

  ${[...Array(phaseOctaves).keys()]
    .map(
      (i) =>
        `w = mix(phaseWeight${i}, phaseWeight${
          i + 1
        }, 1.0 - logspacing + logtier);
  totalWeight += w;
  gridValue = complexContouringGridFunction(phaseOctave${i}) * scaleFactor;
  phaseGrid += w * smoothstep(width1, width2, gridValue);
  value = fract(phaseOctave${i});
  phaseShading += w * (0.5 + (domainColoringContrastFunction(value, contrastPower) - 0.5) * min(1.0, gridValue * 1.5));
  scaleFactor *= steps.y;
  `
    )
    .join("\n  ")}

  phaseGrid /= totalWeight;
  phaseShading /= totalWeight;

  float grid = 1.0;
  grid = min(grid, 1.0 - (1.0 - magnitudeGrid) * gridOpacity.x);
  grid = min(grid, 1.0 - (1.0 - phaseGrid) * gridOpacity.y);

  float shading = 0.5 + (shadingOpacity.y * (0.5 - phaseShading)) + shadingOpacity.x * (magnitudeShading - 0.5);

  vec3 result = mix(vec3(shading + (1.0 - phaseColoring) * 0.5 * (1.0 - shadingOpacity.x - shadingOpacity.y)), texture2D(colormap, vec2(carg / ${phaseMultiplier.toFixed(
    1
  )} - 0.25, shading)).rgb, phaseColoring);
  
  result = mix(gridColor, result, grid);

  if (magRange.x != magRange.y) {
    float shade = (2.0 / PI) * atan((mappedCmag - magRange.x) / (magRange.y - magRange.x));
    vec3 shadeCol = shade < 0.0 ? vec3(0) : vec3(1);
    result = mix(result, shadeCol, 0.8 * shade * shade);
  }

  return vec4(result, 1.0);
}`;
  return shader;
}
)}

function _createDrawCommand(derivatives,createPolarDomainColoringShader,glslComplexAutoDifferentiation){return(
function createDrawCommand(regl, f, opts) {
  var opts = Object.assign(
    {},
    {
      gridColor: "#000000",
      phaseColoring: 1,
      magnitudeShading: 0.6,
      phaseShading: 0.4,
      phaseOctaves: 5,
      magnitudeOctaves: 5,
      phaseSteps: 6,
      magnitudeSteps: 6,
      magnitudeGrid: 0.0,
      phaseGrid: 0.0,
      magnitudeScale: 0.1,
      phaseScale: 0.1,
      lineFeather: 1,
      lineWidth: 1,
      phaseMultiplier: 2,
      linearScaleBias: 1,
      quadraticScaleBias: 0,
      contrastPower: 3.0,
      shadeRange: [0, 0]
    },
    opts
  );
  opts = opts || {};

  const frag = `
      ${
        derivatives === "OES_standard_derivatives"
          ? "#extension GL_OES_standard_derivatives : enable"
          : ""
      }

    precision highp float;

    varying vec2 xy;
    uniform vec2 inverseViewportResolution, shading, scale, steps, gridOpacity, shadingOpacity, shadeRange;
    uniform float lineWidth, lineFeather, phaseColoring, contrastPower;
    uniform vec3 gridColor;
    uniform sampler2D colormap;
    uniform mat4 inverseView;

    ${createPolarDomainColoringShader({
      magnitudeOctaves: opts.magnitudeOctaves,
      phaseOctaves: opts.phaseOctaves,
      magnitudeSteps: opts.magnitudeSteps,
      phaseSteps: opts.phaseSteps,
      phaseMultiplier: opts.phaseMultiplier,
      phasScale: opts.phaseScale,
      phaseColoring: opts.phaseColoring,
      bias1: opts.linearScaleBias,
      bias2: opts.quadraticScaleBias
    })}

    ${glslComplexAutoDifferentiation}

    ${f}

    void main () {
      ${
        derivatives === "OES_standard_derivatives"
          ? `
      vec2 fz = f(xy);
      vec4 fdf = vec4(fz, fwidth(fz) * 0.5);
      `
          : `
      float unitsPerPixel = inverseView[0][0] * inverseViewportResolution.x * 2.0;
      vec4 fdf = f(vec4(vec2(xy), vec2(unitsPerPixel, 0)));
      `
      }

      gl_FragColor = domainColoring(
        fdf,
        steps,
        scale,
        gridOpacity,
        shadingOpacity,
        lineWidth,
        lineFeather,
        gridColor,
        phaseColoring,
        contrastPower,
        colormap,
        shadeRange
      ) * vec4(vec3(0.97), 1);
    }`;
  return regl({
    frag,
    uniforms: Object.assign({
      colormap: regl.prop("colormap"),
      scale: regl.prop("scale"),
      steps: regl.prop("steps"),
      gridOpacity: regl.prop("gridOpacity"),
      shadingOpacity: regl.prop("shadingOpacity"),
      lineWidth: regl.prop("lineWidth"),
      lineFeather: regl.prop("lineFeather"),
      gridColor: regl.prop("gridColor"),
      phaseColoring: regl.prop("phaseColoring"),
      contrastPower: regl.prop("contrastPower"),
      shadeRange: regl.prop("shadeRange")
    })
  });
}
)}

function _d3(require){return(
require('d3@5')
)}

function _isNarrowScreen(width){return(
width < 640
)}

function _LICENSE(){return(
"mit"
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["md"], _2);
  main.variable(observer("plot")).define("plot", ["PlotContext"], _plot);
  main.variable(observer("layer")).define("layer", ["DomainColoringLayer","f","domainColoringConfig"], _layer);
  main.variable(observer()).define(["md","glslFunctionMapping"], _5);
  main.variable(observer("f")).define("f", _f);
  main.variable(observer("viewof a")).define("viewof a", ["ComplexVariable"], _a);
  main.variable(observer("a")).define("a", ["Generators", "viewof a"], (G, _) => G.input(_));
  main.variable(observer("viewof b")).define("viewof b", ["ComplexVariable"], _b);
  main.variable(observer("b")).define("b", ["Generators", "viewof b"], (G, _) => G.input(_));
  main.variable(observer("viewof m")).define("viewof m", ["ComplexVariable"], _m);
  main.variable(observer("m")).define("m", ["Generators", "viewof m"], (G, _) => G.input(_));
  main.variable(observer()).define(["md"], _10);
  main.variable(observer()).define(["plot","layer","b","m"], _11);
  main.variable(observer("viewof gridColor")).define("viewof gridColor", ["color"], _gridColor);
  main.variable(observer("gridColor")).define("gridColor", ["Generators", "viewof gridColor"], (G, _) => G.input(_));
  main.variable(observer("viewof phaseColoring")).define("viewof phaseColoring", ["slider"], _phaseColoring);
  main.variable(observer("phaseColoring")).define("phaseColoring", ["Generators", "viewof phaseColoring"], (G, _) => G.input(_));
  main.variable(observer("viewof phaseMultiplier")).define("viewof phaseMultiplier", ["slider"], _phaseMultiplier);
  main.variable(observer("phaseMultiplier")).define("phaseMultiplier", ["Generators", "viewof phaseMultiplier"], (G, _) => G.input(_));
  main.variable(observer("viewof contrastPower")).define("viewof contrastPower", ["slider"], _contrastPower);
  main.variable(observer("contrastPower")).define("contrastPower", ["Generators", "viewof contrastPower"], (G, _) => G.input(_));
  main.variable(observer("viewof magnitudeShading")).define("viewof magnitudeShading", ["slider"], _magnitudeShading);
  main.variable(observer("magnitudeShading")).define("magnitudeShading", ["Generators", "viewof magnitudeShading"], (G, _) => G.input(_));
  main.variable(observer("viewof phaseShading")).define("viewof phaseShading", ["slider"], _phaseShading);
  main.variable(observer("phaseShading")).define("phaseShading", ["Generators", "viewof phaseShading"], (G, _) => G.input(_));
  main.variable(observer("viewof phaseOctaves")).define("viewof phaseOctaves", ["slider"], _phaseOctaves);
  main.variable(observer("phaseOctaves")).define("phaseOctaves", ["Generators", "viewof phaseOctaves"], (G, _) => G.input(_));
  main.variable(observer("viewof magnitudeOctaves")).define("viewof magnitudeOctaves", ["slider"], _magnitudeOctaves);
  main.variable(observer("magnitudeOctaves")).define("magnitudeOctaves", ["Generators", "viewof magnitudeOctaves"], (G, _) => G.input(_));
  main.variable(observer("viewof phaseSteps")).define("viewof phaseSteps", ["slider"], _phaseSteps);
  main.variable(observer("phaseSteps")).define("phaseSteps", ["Generators", "viewof phaseSteps"], (G, _) => G.input(_));
  main.variable(observer("viewof magnitudeSteps")).define("viewof magnitudeSteps", ["slider"], _magnitudeSteps);
  main.variable(observer("magnitudeSteps")).define("magnitudeSteps", ["Generators", "viewof magnitudeSteps"], (G, _) => G.input(_));
  main.variable(observer("viewof magnitudeGrid")).define("viewof magnitudeGrid", ["slider"], _magnitudeGrid);
  main.variable(observer("magnitudeGrid")).define("magnitudeGrid", ["Generators", "viewof magnitudeGrid"], (G, _) => G.input(_));
  main.variable(observer("viewof phaseGrid")).define("viewof phaseGrid", ["slider"], _phaseGrid);
  main.variable(observer("phaseGrid")).define("phaseGrid", ["Generators", "viewof phaseGrid"], (G, _) => G.input(_));
  main.variable(observer("viewof magnitudeScale")).define("viewof magnitudeScale", ["slider"], _magnitudeScale);
  main.variable(observer("magnitudeScale")).define("magnitudeScale", ["Generators", "viewof magnitudeScale"], (G, _) => G.input(_));
  main.variable(observer("viewof phaseScale")).define("viewof phaseScale", ["slider"], _phaseScale);
  main.variable(observer("phaseScale")).define("phaseScale", ["Generators", "viewof phaseScale"], (G, _) => G.input(_));
  main.variable(observer("viewof lineFeather")).define("viewof lineFeather", ["slider"], _lineFeather);
  main.variable(observer("lineFeather")).define("lineFeather", ["Generators", "viewof lineFeather"], (G, _) => G.input(_));
  main.variable(observer("viewof lineWidth")).define("viewof lineWidth", ["slider"], _lineWidth);
  main.variable(observer("lineWidth")).define("lineWidth", ["Generators", "viewof lineWidth"], (G, _) => G.input(_));
  main.variable(observer("viewof linearScaleBias")).define("viewof linearScaleBias", ["slider"], _linearScaleBias);
  main.variable(observer("linearScaleBias")).define("linearScaleBias", ["Generators", "viewof linearScaleBias"], (G, _) => G.input(_));
  main.variable(observer("viewof quadraticScaleBias")).define("viewof quadraticScaleBias", ["slider"], _quadraticScaleBias);
  main.variable(observer("quadraticScaleBias")).define("quadraticScaleBias", ["Generators", "viewof quadraticScaleBias"], (G, _) => G.input(_));
  main.variable(observer("domainColoringConfig")).define("domainColoringConfig", ["phaseColoring","gridColor","magnitudeShading","phaseShading","phaseOctaves","magnitudeOctaves","phaseSteps","magnitudeSteps","magnitudeGrid","phaseGrid","magnitudeScale","phaseScale","lineFeather","lineWidth","phaseMultiplier","linearScaleBias","quadraticScaleBias","contrastPower"], _domainColoringConfig);
  main.variable(observer()).define(["md"], _31);
  main.variable(observer("DomainColoringLayer")).define("DomainColoringLayer", ["parse","compileGLSL","createRainbowTexture","hexRgbToFloat","createDrawCommand"], _DomainColoringLayer);
  main.variable(observer("ComplexVariable")).define("ComplexVariable", ["tex","sprintf","d3"], _ComplexVariable);
  main.variable(observer("PlotContext")).define("PlotContext", ["width","DOM","createLayerStack","reglCanvasWithOptions","html","isNarrowScreen","createViewport","d3","constrainLinearScaleAspectRatio","viewportAxes","createReglViewportConfiguration","createReglLinearScaleConfiguration","createReglMap","DomainColoringLayer","ComplexVariable","persistentZoom","invalidation"], _PlotContext);
  main.variable(observer("derivatives")).define("derivatives", _derivatives);
  const child1 = runtime.module(define1);
  main.import("rainbow", child1);
  main.variable(observer("createRainbowTexture")).define("createRainbowTexture", ["rainbow"], _createRainbowTexture);
  main.variable(observer("createPolarDomainColoringShader")).define("createPolarDomainColoringShader", _createPolarDomainColoringShader);
  main.variable(observer("createDrawCommand")).define("createDrawCommand", ["derivatives","createPolarDomainColoringShader","glslComplexAutoDifferentiation"], _createDrawCommand);
  main.variable(observer("d3")).define("d3", ["require"], _d3);
  const child2 = runtime.module(define2);
  main.import("parse", child2);
  main.import("compileGLSL", child2);
  main.import("glslFunctionMapping", child2);
  const child3 = runtime.module(define3);
  main.import("glslComplexAutoDifferentiation", child3);
  const child4 = runtime.module(define4);
  main.import("reglCanvasWithOptions", child4);
  main.import("createLayerStack", child4);
  main.import("createViewport", child4);
  main.import("viewportAxes", child4);
  main.import("constrainLinearScaleAspectRatio", child4);
  main.import("createReglViewportConfiguration", child4);
  main.import("createReglLinearScaleConfiguration", child4);
  main.import("createReglMap", child4);
  main.import("mat3ViewportFromLinearScales", child4);
  main.import("mat3fromLinearScales", child4);
  main.import("persistentZoom", child4);
  const child5 = runtime.module(define5);
  main.import("hexRgbToFloat", child5);
  main.import("sprintf", child5);
  const child6 = runtime.module(define6);
  main.import("slider", child6);
  main.import("color", child6);
  main.variable(observer("isNarrowScreen")).define("isNarrowScreen", ["width"], _isNarrowScreen);
  main.variable(observer("LICENSE")).define("LICENSE", _LICENSE);
  return main;
}
