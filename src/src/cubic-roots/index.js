const hexRgbToFloat = require('./hex-rgb-to-float.js');
const createResize = require('./resize');
const color = require('./color');
const d3 = require('./d3.min.js');
const css = require('insert-css');

const container = document.createElement('div');
document.body.appendChild(container);
container.style.cssText = `
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
`;

const regl = require('regl')({
  container,
  extensions: ['oes_standard_derivatives', 'ANGLE_instanced_arrays'],
  attributes: { stencil: false, alpha: false, antialias: true },
  onDone: require('fail-nicely')(run)
});

const exp = document.createElement('div');
exp.innerHTML = `
A reproduction of a <a href="https://mathstodon.xyz/@acegikmo@mastodon.social/109404591773876307">diagram by Freya Holmér</a> showing the relation between cubic polynomials and an equilateral triangle.
`;
document.body.appendChild(exp);
exp.classList.add('explanation');

css(`
.explanation {
  position: absolute;
  z-index: 100;
  bottom: 0;
  left: 0;
  padding: 5px 10px;
  background-color: rgb(237 247 255/50%);
  width: 350px;
  max-width: 100%;
  font-family: sans-serif;
  line-height: 1.2;
  font-size: 0.7em;
  color: #555;
}
.explanation a {
  color: #96c;
}
@media (min-width: 800px) {
  .explanation {
    font-size: 1.0em;
    width: 450px;
  }
}
`);

function run (regl) {
  let dirty = true;
  const repaint = () => dirty = true;

  const aspect = window.innerWidth / window.innerHeight;
  const xScale = d3.scaleLinear().domain([-3 * aspect, 3 * aspect]).range([0, window.innerWidth]);
  const yScale = d3.scaleLinear().domain([-2, 4]).range([window.innerHeight, 0]);

  const bgColor = '#edf7ff';
  const mainColor = '#555';
  const rootColor = '#39c';
  const extremaColor = '#9c3';
  const inflectionColor = '#c39';

  const state = {
    alpha: Math.PI / 12,
    center: 0,
    radius: 1,
    scale: 1,
    yOffset: window.innerHeight / 4
  };
  
  function circleVertices ({center, radius, alpha, yOffset}, count) {
    return [...Array(count).keys()].map(i => 
      (i- 1) / (count - 3) * Math.PI * 2
    ).map(beta => [
      center + radius * Math.cos(alpha + beta),
      radius * Math.sin(alpha + beta) + yScale.invert(yOffset)
    ]);
  }

  function computeRoots({center, radius, alpha}) {
    return [
      center + radius * Math.cos(alpha),
      center + radius * Math.cos(alpha + 2 * Math.PI / 3),
      center + radius * Math.cos(alpha + 4 * Math.PI / 3)
    ];
  }

  function makeLine(count) {
    return {
      vertexCount: count,
      vertexAttributes: { xy: regl.buffer(new Float32Array(count * 2)) }
    };
  }

  const drawPoints = require('./draw-points')(regl);
  const configureViewport = require('./configure-viewport')(regl);
  const configureLinearScales = require('./configure-linear-scale')(regl);
  const drawBackground = require('./draw-background')(regl);
  const drawLines = require('./draw-lines')(regl);
  const drawLinesWithColor = require('./draw-lines-with-color')(regl);


  const svg = d3.select(container)
    .append('svg')
    .style('z-index', 1)
    .style('position', 'fixed')
    .style('top', 0)
    .style('left', 0);

  const pointGrp = svg.append('g');

  const triangle = makeLine(6);
  const poly = makeLine(200);
  const innerCircle = makeLine(100);
  const outerCircle = makeLine(100);
  const axis = makeLine(4);

  function makeColorList (list) {
    const NULL = [0, 0, 0];
    const out = [NULL];
    for (const col of list) {
      const c = hexRgbToFloat(col);
      out.push(c, c, NULL);
    }
    return out;
  }

  const NULL = [0, 0, 0];
  const dropLines = makeLine(19);
  dropLines.vertexAttributes.color = regl.buffer(makeColorList([
    rootColor,
    rootColor,
    rootColor,
    extremaColor,
    inflectionColor,
    extremaColor,
  ]));

  function f(x) {
    const [x0, x1, x2] = computeRoots(state);
    return state.scale * (x - x0) * (x - x1) * (x - x2);
  }

  function updatePoints (newEvents=true) {
    const yInflec = f(state.center);
    const [x0, x1, x2] = computeRoots(state);
    const { center, scale } = state;

    poly.vertexAttributes.xy.subdata([...Array(poly.vertexCount).keys()].map(i => {
      const x = xScale.invert((i - 1) / (poly.vertexCount - 3) * window.innerWidth);
      return [x, f(x)];
    }).flat())

    const triVerts = circleVertices(state, triangle.vertexCount).flat()
    triangle.vertexAttributes.xy.subdata(triVerts);
    innerCircle.vertexAttributes.xy.subdata(circleVertices({...state, radius: state.radius / 2}, innerCircle.vertexCount).flat());
    outerCircle.vertexAttributes.xy.subdata(circleVertices(state, outerCircle.vertexCount).flat());

    const [xmin, xmax] = xScale.domain();
    axis.vertexAttributes.xy.subdata([
      xmin - 1, 0,
      xmin, 0,
      xmax, 0,
      xmax + 1, 0
    ]);

    const BREAK = [1e10, 1e10];
    dropLines.vertexAttributes.xy.subdata([
      ...BREAK,
      triVerts[0], 0,
      triVerts[0], triVerts[1],
      ...BREAK,
      triVerts[2], 0,
      triVerts[2], triVerts[3],
      ...BREAK,
      triVerts[4], 0,
      triVerts[4], triVerts[5],
      ...BREAK,
      ...[-0.5, 0, 0.5].map(scale => [
        state.center + scale * state.radius, yScale.invert(state.yOffset),
        state.center + scale * state.radius, f(state.center + scale * state.radius),
        ...BREAK,
      ]).flat()
    ]);

    const centerHandle = {x: state.center, y: yScale.invert(state.yOffset), color: inflectionColor, type: 'center' };
    const rootHandles = computeRoots(state).map(x => ({x, y: 0, type: 'root', color: rootColor}));
    const extremaHandles = [
      {x: state.center - state.radius / 2, y: f(state.center - state.radius / 2), color: extremaColor, type: 'extremum' },
      {x: state.center + state.radius / 2, y: f(state.center + state.radius / 2), color: extremaColor, type: 'extremum' }
    ];
    const inflectionHandle = {x: center, y: f(center), color: inflectionColor, type: 'inflection' };
    const triHandles = [
      { x: triVerts[0], y: triVerts[1], color: mainColor, type: 'tri' },
      { x: triVerts[2], y: triVerts[3], color: mainColor, type: 'tri' },
      { x: triVerts[4], y: triVerts[5], color: mainColor, type: 'tri' }
    ];
    const handles = [
      ...rootHandles,
      centerHandle,
      ...triHandles,
      ...extremaHandles,
      inflectionHandle
    ];

    const join = pointGrp
      .selectAll('circle')
      .data(handles)
      .join(  
        enter => enter
          .append('circle')
          .attr('cx', ({x}) => xScale(x))
          .attr('cy', ({y}) => yScale(y))
          .attr('cursor', 'move')
          .attr('stroke-width', 3)
          .attr('stroke', ({color}) => color)
          .attr('fill', bgColor)
          .attr('r', 6),
        update => update
          .attr('cx', ({x}) => xScale(x))
          .attr('cy', ({y}) => yScale(y)),
        exit => exit.remove()
      );

    if (newEvents) {
      join.call(
        d3.drag()
          .on('start', function (event) {
            event.sourceEvent.stopPropagation();
          })
          .on('drag', function (event, d) {
            event.sourceEvent.stopPropagation();
            event.sourceEvent.preventDefault();
            const src = event.sourceEvent.touches ? event.sourceEvent.touches[0] : event.sourceEvent;
            const x = xScale.invert(src.clientX);
            const y = yScale.invert(src.clientY);
            switch(d.type) {
              case 'root': {
                d.x = x;
                Object.assign(state, positionCircle(rootHandles.map(({x}) => x)));
                break;
              }
              case 'extremum': {
                const e1 = d;
                const e2 = extremaHandles[0] === d ? extremaHandles[1] : extremaHandles[0];

                e1.x = x;
                e1.y = y;

                const r = 0.5 * (e1.y - e2.y);
                const p = 0.5 * (e1.x - e2.x);
                const x0 = 0.5 * (e1.x + e2.x);
                const y0 = 0.5 * (e1.y + e2.y);

                const a = -r / (2 * p ** 3);
                const b = 0;
                const c = 1.5 * r / p;
                const dd = y0;

                const A = b / a;
                const B = c / a;
                const C = dd / a;

                const Q = Math.min(0, (3 * B - A ** 2) / 9);
                const R = (9 * A * B - 27 * C - 2 * A ** 3) / 54;
                const D = Math.min(0, Q ** 3 + R ** 2);

                const theta = Math.acos(Math.max(-0.99999, Math.min(0.99999, R / (-Q) ** 1.5)));

                state.center = x0;
                state.radius = 2 * Math.sqrt(-Q);
                state.alpha = theta / 3;
                state.scale = a;

                break;
              }
              case 'inflection': {
                const dx = x - center;
                const dy = (y - yInflec) / scale;

                const a = 1;
                const b = -(x0 + x1 + x2);
                const c = x1 * x2 + x0 * x2 + x0 * x1;
                const d = -x0 * x1 * x2 + dy;

                const A = b / a;
                const B = c / a;
                const C = d / a;

                const Q = Math.min(0, (3 * B - A ** 2) / 9);
                const R = (9 * A * B - 27 * C - 2 * A ** 3) / 54;
                const D = Math.min(0, Q ** 3 + R ** 2);

                const theta = Math.acos(Math.max(-0.99999, Math.min(0.99999, R / (-Q) ** 1.5)));

                state.center = x;
                state.radius = 2 * Math.sqrt(-Q);
                state.alpha = theta / 3;

                break;
              }
            case 'tri':
              const dy = y - yScale.invert(state.yOffset);
              const dx = x - state.center;
              const rad = Math.hypot(dx, dy);
              state.radius = rad;
              state.alpha = Math.atan2(dy, dx);
              break;
            case 'center':
              state.center = x;
              state.yOffset = yScale(y);
              break;
          }
          updatePoints(false);
          repaint();
        })
        .on('end', function () {
          updatePoints();
          repaint();
        })
      )
    }
  }
  updatePoints();

  function positionCircle (roots) {
    const [x0, x1, x2] = roots;

    const a = 1;
    const b = -(x0 + x1 + x2);
    const c = x1 * x2 + x0 * x2 + x0 * x1;
    const d = -x0 * x1 * x2;

    const A = b / a;
    const B = c / a;
    const C = d / a;

    const Q = Math.min(0, (3 * B - A ** 2) / 9);
    const R = (9 * A * B - 27 * C - 2 * A ** 3) / 54;
    const D = Math.min(0, Q ** 3 + R ** 2);

    const theta = Math.acos(Math.max(-0.99999, Math.min(0.99999, R / (-Q) ** 1.5)));

    return {
      center: -A / 3,
      radius: 2 * Math.sqrt(-Q),
      alpha: theta / 3
    };
  }

  function onZoom () {
    updatePoints();
    repaint();
  }

  function onResize () {
    svg.attr('width', window.innerWidth).attr('height', window.innerHeight);
    updatePoints();
    repaint();
  }
  
  const resize = createResize(container, xScale, yScale, onResize);
  resize();
  window.addEventListener('resize', resize);

  let frame = regl.frame(() => {
    try {
      if (!dirty) return;
      dirty = false;

      const width = window.innerWidth > 640 ? 3 : 2;

      configureViewport({}, () => {
        configureLinearScales(xScale, yScale, ({view3}) => {
          drawBackground({view3, width: 1});

          drawLines([
            {...axis, width: width * 0.5, color: mainColor },
            {...poly, width, color: mainColor },
            {...innerCircle, width, color: extremaColor },
            {...outerCircle, width: width * 0.5, color: mainColor },
          ]);
          drawLinesWithColor([
            {...dropLines, width},
          ]);
          drawLines([
            {...triangle, width, color: mainColor },
          ]);
        });
      });

    } catch (e) {
      console.error(e);
      frame.cancel();
      frame = null;
    }
  });
}
