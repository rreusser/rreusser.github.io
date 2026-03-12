// Initial conditions figure - shows bodies with position and velocity arrows

export function createArrowhead(opts = {}) {
  const width = opts.width || 8;
  const length = opts.length || 10;
  return function(marker) {
    marker
      .attr('viewBox', `0 -${width/2} ${length} ${width}`)
      .attr('refX', length - 1)
      .attr('refY', 0)
      .attr('markerWidth', length)
      .attr('markerHeight', width)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', `M0,-${width/2}L${length},0L0,${width/2}`)
      .attr('fill', opts.fill || 'currentColor');
  };
}

// Reversed arrowhead for marker-start (points outward from line start)
export function createArrowheadReversed(opts = {}) {
  const width = opts.width || 8;
  const length = opts.length || 10;
  return function(marker) {
    marker
      .attr('viewBox', `0 -${width/2} ${length} ${width}`)
      .attr('refX', 1)
      .attr('refY', 0)
      .attr('markerWidth', length)
      .attr('markerHeight', width)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', `M${length},-${width/2}L0,0L${length},${width/2}`)
      .attr('fill', opts.fill || 'currentColor');
  };
}

export function floatRgbToHex(rgb) {
  const r = Math.round(Math.min(255, Math.max(0, rgb[0] * 255)));
  const g = Math.round(Math.min(255, Math.max(0, rgb[1] * 255)));
  const b = Math.round(Math.min(255, Math.max(0, rgb[2] * 255)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function createInitialConditionsFigure(d3, initialConditions, drawingParams, opts = {}) {
  const w = opts.width || 350;
  const h = opts.height || Math.floor(w * 0.7);

  const svg = d3.create('svg')
    .attr('width', w)
    .attr('height', h)
    .attr('fill', 'currentColor')
    .style('max-width', '100%')
    .style('height', 'auto');

  // Compute bounds from initial conditions
  const y0 = initialConditions.y0;
  const bounds = {
    xmin: Math.min(y0[0], y0[4], y0[8]),
    xmax: Math.max(y0[0], y0[4], y0[8]),
    ymin: Math.min(y0[1], y0[5], y0[9]),
    ymax: Math.max(y0[1], y0[5], y0[9]),
    umin: Math.min(y0[2], y0[6], y0[10]),
    umax: Math.max(y0[2], y0[6], y0[10]),
    vmin: Math.min(y0[3], y0[7], y0[11]),
    vmax: Math.max(y0[3], y0[7], y0[11])
  };

  const xrange = Math.max(bounds.xmax - bounds.xmin, bounds.ymax - bounds.ymin) || 2;
  const vrange = Math.max(
    Math.abs(bounds.umin), Math.abs(bounds.umax),
    Math.abs(bounds.vmin), Math.abs(bounds.vmax)
  );

  function clipV(value) {
    return value / Math.max(xrange * 0.2, vrange * 1.2);
  }

  const x = d3.scaleLinear()
    .domain([-xrange, xrange])
    .range([0, w]);

  const y = d3.scaleLinear()
    .domain([-xrange * h / w, xrange * h / w])
    .range([h, 0]);

  const line = d3.line()
    .x(d => x(d[0]))
    .y(d => y(d[1]));

  // Create arrowhead markers
  const arrowheadId = `arrowhead-${Math.random().toString(36).slice(2)}`;
  const arrowheadStartId = `arrowhead-start-${Math.random().toString(36).slice(2)}`;
  const defs = svg.append('defs');
  defs.append('marker')
    .attr('id', arrowheadId)
    .call(createArrowhead());
  defs.append('marker')
    .attr('id', arrowheadStartId)
    .call(createArrowheadReversed());

  // Draw axes
  const axisExtent = 0.9;
  svg.append('g')
    .attr('class', 'axes')
    .selectAll('path')
    .data([
      [[-xrange * axisExtent, 0], [xrange * axisExtent, 0]],
      [[0, -xrange * axisExtent * h / w], [0, xrange * axisExtent * h / w]]
    ])
    .join('path')
    .attr('d', line)
    .attr('stroke', 'currentColor')
    .attr('fill', 'none')
    .attr('stroke-width', 1)
    .attr('marker-start', `url(#${arrowheadStartId})`)
    .attr('marker-end', `url(#${arrowheadId})`);

  // Body positions
  const positions = [[y0[0], y0[1]], [y0[4], y0[5]], [y0[8], y0[9]]];

  // Velocities (clipped)
  const velocities = [
    [clipV(y0[2]), clipV(y0[3])],
    [clipV(y0[6]), clipV(y0[7])],
    [clipV(y0[10]), clipV(y0[11])]
  ];

  const pointSize = initialConditions.pointSize.map(d => Math.max(2.5, d * 8));
  const colors = drawingParams.color;
  const strokeColor = drawingParams.strokeColor || [[1,1,1], [1,1,1], [1,1,1]];
  const strokeCss = opts.strokeCss || null;

  // Draw velocity arrows
  svg.append('g')
    .attr('class', 'velocities')
    .selectAll('path')
    .data(
      positions
        .map((pos, i) => [
          [pos[0], pos[1]],
          [pos[0] + velocities[i][0], pos[1] + velocities[i][1]]
        ])
        .filter((v, i) => velocities[i][0] * velocities[i][0] + velocities[i][1] * velocities[i][1] > 0.0001)
    )
    .join('path')
    .attr('d', line)
    .attr('stroke', 'currentColor')
    .attr('fill', 'none')
    .attr('stroke-width', 1.5)
    .attr('marker-end', `url(#${arrowheadId})`);

  // Draw bodies
  svg.append('g')
    .attr('class', 'bodies')
    .selectAll('circle')
    .data(positions)
    .join('circle')
    .attr('cx', d => x(d[0]))
    .attr('cy', d => y(d[1]))
    .attr('r', (d, i) => pointSize[i])
    .attr('fill', (d, i) => floatRgbToHex(colors[i]))
    .attr('stroke', (d, i) => strokeCss || floatRgbToHex(strokeColor[i]))
    .attr('stroke-width', 2);

  // Axis labels
  svg.append('g')
    .attr('class', 'labels')
    .selectAll('text')
    .data([
      { xy: [0, xrange * axisExtent * h / w], text: 'y' },
      { xy: [xrange * axisExtent, 0], text: 'x' }
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

  // Body labels (m1, m2, m3)
  const bodyLabels = svg.append('g')
    .attr('class', 'body-labels')
    .selectAll('text')
    .data(positions)
    .join('text')
    .attr('x', d => x(d[0]))
    .attr('y', d => y(d[1]))
    .attr('font-size', '14px')
    .attr('font-family', 'serif')
    .attr('font-style', 'italic')
    .attr('dx', (d, i) => 3 + pointSize[i] * 0.707)
    .attr('dy', (d, i) => 14 - 3 + pointSize[i] * 0.707)
    .attr('text-anchor', 'start');

  bodyLabels.append('tspan').text('m');
  bodyLabels.append('tspan')
    .attr('dy', 5)
    .attr('font-weight', 400)
    .attr('font-size', '0.75em')
    .text((d, i) => i + 1);

  return svg.node();
}
