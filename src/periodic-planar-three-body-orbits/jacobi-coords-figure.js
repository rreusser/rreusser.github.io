// Interactive Jacobi coordinates figure - drag bodies and see shape space update

import { createArrowhead, createArrowheadReversed, floatRgbToHex } from './initial-conditions-figure.js';

// Compute Jacobi coordinates from body positions
export function computeJacobi(positions, masses) {
  const [m1, m2, m3] = masses;
  const [[x1, y1], [x2, y2], [x3, y3]] = positions;

  // r1: from body 2 to body 1
  const r1x = x1 - x2;
  const r1y = y1 - y2;

  // r2: from body 3 to center of mass of bodies 1 and 2
  const com12x = (m1 * x1 + m2 * x2) / (m1 + m2);
  const com12y = (m1 * y1 + m2 * y2) / (m1 + m2);
  const r2x = com12x - x3;
  const r2y = com12y - y3;

  // r3: center of mass of all three bodies
  const totalMass = m1 + m2 + m3;
  const r3x = (m1 * x1 + m2 * x2 + m3 * x3) / totalMass;
  const r3y = (m1 * y1 + m2 * y2 + m3 * y3) / totalMass;

  return [[r1x, r1y], [r2x, r2y], [r3x, r3y]];
}

// Compute shape vector from body positions
export function computeShapeFromPositions(positions, masses) {
  const [m1, m2, m3] = masses;
  const [[x1, y1], [x2, y2], [x3, y3]] = positions;

  // Compute normalized Jacobi coordinates
  const r1x = (x1 - x2) / Math.sqrt(2);
  const r1y = (y1 - y2) / Math.sqrt(2);
  const r2x = ((m1 * x1 + m2 * x2) / (m1 + m2) - x3) * 2 / Math.sqrt(6);
  const r2y = ((m1 * y1 + m2 * y2) / (m1 + m2) - y3) * 2 / Math.sqrt(6);

  const r1sq = r1x * r1x + r1y * r1y;
  const r2sq = r2x * r2x + r2y * r2y;
  const denom = r1sq + r2sq;

  return [
    2 * (r1x * r2x + r1y * r2y) / denom,
    (r2sq - r1sq) / denom,
    2 * (r1x * r2y - r1y * r2x) / denom
  ];
}

// Get arrow endpoints for drawing Jacobi vectors
function getJacobiEndpoints(positions, jacobi) {
  return [
    // r1: from body 2 to body 2 + jacobi[0] (which is body 1)
    [[positions[1][0], positions[1][1]], [positions[1][0] + jacobi[0][0], positions[1][1] + jacobi[0][1]]],
    // r2: from body 3 to body 3 + jacobi[1]
    [[positions[2][0], positions[2][1]], [positions[2][0] + jacobi[1][0], positions[2][1] + jacobi[1][1]]],
    // r3: from origin to center of mass
    [[0, 0], [jacobi[2][0], jacobi[2][1]]]
  ];
}

export function createJacobiCoordsFigure(d3, initialConditions, drawingParams, opts = {}) {
  const w = opts.width || 480;
  const h = opts.height || Math.floor(w * 0.7);
  const masses = initialConditions.m;

  const svg = d3.create('svg')
    .attr('width', w)
    .attr('height', h)
    .attr('fill', 'currentColor')
    .style('max-width', '100%')
    .style('height', 'auto');

  // Initial positions (can be customized or derived from initial conditions)
  const positions = opts.initialPositions || [[4, 1], [3, 2.7], [1, 2.5]];

  // Scales
  const xrange = 5;
  const x = d3.scaleLinear()
    .domain([-xrange * 0.1, xrange * 1.1])
    .range([0, w]);

  const y = d3.scaleLinear()
    .domain([-xrange * 0.1 * h / w, xrange * 1.1 * h / w])
    .range([h, 0]);

  const line = d3.line()
    .x(d => x(d[0]))
    .y(d => y(d[1]));

  // Create arrowhead markers
  const arrowheadId = `arrowhead-jacobi-${Math.random().toString(36).slice(2)}`;
  const arrowheadStartId = `arrowhead-jacobi-start-${Math.random().toString(36).slice(2)}`;
  const defs = svg.append('defs');
  defs.append('marker')
    .attr('id', arrowheadId)
    .call(createArrowhead());
  defs.append('marker')
    .attr('id', arrowheadStartId)
    .call(createArrowheadReversed());

  // Draw axes
  svg.append('g')
    .attr('class', 'axes')
    .selectAll('path')
    .data([
      [[-xrange * 0.05, 0], [xrange, 0]],
      [[0, -xrange * 0.05 * h / w], [0, xrange * h / w]]
    ])
    .join('path')
    .attr('d', line)
    .attr('stroke', 'currentColor')
    .attr('fill', 'none')
    .attr('stroke-width', 1)
    .attr('marker-start', `url(#${arrowheadStartId})`)
    .attr('marker-end', `url(#${arrowheadId})`);

  const colors = drawingParams.color;
  const strokeColor = drawingParams.strokeColor || [[1,1,1], [1,1,1], [1,1,1]];
  const strokeCss = opts.strokeCss || null;
  const pointSize = initialConditions.pointSize.map(d => Math.max(2.5, d * 8));

  // Groups for different elements
  const bodiesGroup = svg.append('g').attr('class', 'bodies');
  const jacobiArrows = svg.append('g').attr('class', 'jacobi');
  const jacobiLabels = svg.append('g').attr('class', 'jacobi-labels');
  const axisLabels = svg.append('g').attr('class', 'labels');
  const bodyLabels = svg.append('g').attr('class', 'body-labels');
  const handles = svg.append('g').attr('class', 'handles');

  // Helper to shorten lines to avoid overlap with circles
  function shorten(line, startAmount, endAmount) {
    const x0 = x(line[0][0]);
    const y0 = y(line[0][1]);
    const x1 = x(line[1][0]);
    const y1 = y(line[1][1]);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const r = Math.hypot(dx, dy);
    if (r < 1) return line;
    const ex = dx / r;
    const ey = dy / r;
    return [
      [x.invert(x0 + ex * startAmount), y.invert(y0 + ey * startAmount)],
      [x.invert(x1 - ex * endAmount), y.invert(y1 - ey * endAmount)]
    ];
  }

  // Helper to get label position along line
  function interpolate(line, t) {
    return [
      t * line[1][0] + (1 - t) * line[0][0],
      t * line[1][1] + (1 - t) * line[0][1]
    ];
  }

  const shortenAmounts = [
    [pointSize[1] + 1, pointSize[0] - 1 + 6],
    [pointSize[2] + 1, 6],
    [0, 6]
  ];

  // Create output object for events
  const output = {
    node: svg.node(),
    positions,
    getShape: () => computeShapeFromPositions(positions, masses),
    listeners: [],
    addEventListener(event, fn) {
      this.listeners.push({ event, fn });
    },
    dispatchEvent(event) {
      this.listeners.filter(l => l.event === event.type).forEach(l => l.fn(event));
    }
  };

  function update() {
    const jacobi = computeJacobi(positions, masses);
    const endpoints = getJacobiEndpoints(positions, jacobi);

    // Update bodies
    bodiesGroup.selectAll('circle')
      .data(positions)
      .join('circle')
      .attr('cx', d => x(d[0]))
      .attr('cy', d => y(d[1]))
      .attr('r', (d, i) => pointSize[i])
      .attr('fill', (d, i) => floatRgbToHex(colors[i]))
      .attr('stroke', (d, i) => strokeCss || floatRgbToHex(strokeColor[i]))
      .attr('stroke-width', 2);

    // Update Jacobi arrows
    jacobiArrows.selectAll('path')
      .data(endpoints.map((l, i) => shorten(l, shortenAmounts[i][0], shortenAmounts[i][1])))
      .join('path')
      .attr('d', d => line(d))
      .attr('stroke', 'currentColor')
      .attr('fill', 'none')
      .attr('stroke-width', 1.5)
      .attr('marker-end', `url(#${arrowheadId})`);

    // Update Jacobi labels
    const labelPositions = endpoints.map(l => interpolate(l, 0.35));
    jacobiLabels.selectAll('g.jacobi-label')
      .data(labelPositions)
      .join('g')
      .attr('class', 'jacobi-label')
      .each(function(d, i) {
        const g = d3.select(this);
        g.selectAll('*').remove();
        g.append('text')
          .attr('x', x(d[0]))
          .attr('y', y(d[1]))
          .attr('font-size', '16px')
          .attr('font-weight', 700)
          .attr('font-family', 'serif')
          .attr('font-style', 'italic')
          .attr('dy', 9)
          .attr('dx', 9)
          .text('r')
          .append('tspan')
          .attr('dy', 5)
          .attr('font-weight', 400)
          .attr('font-size', '0.75em')
          .text(i + 1);
      });

    // Update body labels
    bodyLabels.selectAll('g.body-label')
      .data(positions)
      .join('g')
      .attr('class', 'body-label')
      .each(function(d, i) {
        const g = d3.select(this);
        g.selectAll('*').remove();
        g.append('text')
          .attr('x', x(d[0]))
          .attr('y', y(d[1]))
          .attr('font-size', '14px')
          .attr('font-family', 'serif')
          .attr('font-style', 'italic')
          .attr('dx', 3 + pointSize[i] * 0.707)
          .attr('dy', -14 + 3 + pointSize[i] * 0.707)
          .attr('text-anchor', 'top')
          .text('m')
          .append('tspan')
          .attr('dy', 5)
          .attr('font-weight', 400)
          .attr('font-size', '0.75em')
          .text(i + 1);
      });

    // Update drag handle positions only (don't recreate)
    handles.selectAll('circle')
      .attr('cx', (d, i) => x(positions[i][0]))
      .attr('cy', (d, i) => y(positions[i][1]));

    // Dispatch update event
    output.dispatchEvent(new CustomEvent('input'));
  }

  // Create drag handles once with drag behavior
  handles.selectAll('circle')
    .data(positions)
    .join('circle')
    .attr('class', 'draggable')
    .attr('cx', d => x(d[0]))
    .attr('cy', d => y(d[1]))
    .attr('r', 25)
    .attr('fill', 'transparent')
    .attr('cursor', 'grab')
    .call(d3.drag()
      .on('start', function() {
        d3.select(this).attr('cursor', 'grabbing');
      })
      .on('drag', function(event, d) {
        const i = positions.indexOf(d);
        positions[i][0] = x.invert(event.x);
        positions[i][1] = y.invert(event.y);
        update();
      })
      .on('end', function() {
        d3.select(this).attr('cursor', 'grab');
      })
    );

  // Axis labels
  axisLabels.selectAll('text')
    .data([
      { xy: [0, xrange * h / w], text: 'y' },
      { xy: [xrange, 0], text: 'x' }
    ])
    .join('text')
    .text(d => d.text)
    .attr('x', d => x(d.xy[0]))
    .attr('y', d => y(d.xy[1]))
    .attr('font-size', '14px')
    .attr('font-family', 'serif')
    .attr('font-style', 'italic')
    .attr('dy', -2)
    .attr('dx', 5);

  // Initial render
  update();

  return output;
}
