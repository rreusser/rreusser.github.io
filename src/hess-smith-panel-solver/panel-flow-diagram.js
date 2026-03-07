// Diagrams illustrating source and vortex panel flow fields.

// Velocity induced at (x, y) by a single panel from (x1,y1) to (x2,y2)
// with source strength sigma and vortex strength gamma (per unit length).
function panelVelocity(x, y, x1, y1, x2, y2, sigma, gamma) {
  const r1x = x - x1, r1y = y - y1;
  const r2x = x - x2, r2y = y - y2;

  const r1sq = r1x * r1x + r1y * r1y;
  const r2sq = r2x * r2x + r2y * r2y;

  if (r1sq < 1e-10 || r2sq < 1e-10) return { vx: 0, vy: 0 };

  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const tx = dx / len, ty = dy / len;
  const nx = -ty, ny = tx;

  const lambda = 0.5 * Math.log(r2sq / r1sq);
  const det = r1x * r2y - r2x * r1y;
  const dot = r1x * r2x + r1y * r2y;
  const beta = Math.atan2(det, dot);

  const c = 0.5 / Math.PI;
  const vx = c * (sigma * (-lambda * tx + beta * nx) + gamma * (beta * tx + lambda * nx));
  const vy = c * (sigma * (-lambda * ty + beta * ny) + gamma * (beta * ty + lambda * ny));

  return { vx, vy };
}

// Trace a streamline from (x0, y0) using RK4 integration.
function traceStreamline(x0, y0, x1, y1, x2, y2, sigma, gamma, dt, steps, bounds) {
  const points = [];
  let x = x0, y = y0;

  function velocityDir(px, py) {
    const { vx, vy } = panelVelocity(px, py, x1, y1, x2, y2, sigma, gamma);
    const vmag = Math.sqrt(vx * vx + vy * vy);
    if (vmag < 1e-10) return { dx: 0, dy: 0, valid: false };
    return { dx: vx / vmag, dy: vy / vmag, valid: true };
  }

  for (let i = 0; i < steps; i++) {
    if (x < bounds.xmin || x > bounds.xmax || y < bounds.ymin || y > bounds.ymax) break;
    points.push([x, y]);

    const k1 = velocityDir(x, y);
    if (!k1.valid) break;
    const k2 = velocityDir(x + 0.5 * dt * k1.dx, y + 0.5 * dt * k1.dy);
    if (!k2.valid) break;
    const k3 = velocityDir(x + 0.5 * dt * k2.dx, y + 0.5 * dt * k2.dy);
    if (!k3.valid) break;
    const k4 = velocityDir(x + dt * k3.dx, y + dt * k3.dy);
    if (!k4.valid) break;

    x += (dt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx);
    y += (dt / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy);
  }

  return points;
}

// Create an SVG diagram showing streamlines around a single panel.
export function createPanelDiagram(d3, title, sigma, gamma, isVortex = false) {
  const w = 380, h = 300;
  const margin = { top: 35, right: 25, bottom: 25, left: 25 };
  const innerW = w - margin.left - margin.right;
  const innerH = h - margin.top - margin.bottom;

  const panelX1 = -0.5, panelY1 = 0;
  const panelX2 = 0.5, panelY2 = 0;

  const bounds = { xmin: -1.5, xmax: 1.5, ymin: -1.2, ymax: 1.2 };

  const xScale = d3.scaleLinear().domain([bounds.xmin, bounds.xmax]).range([0, innerW]);
  const yScale = d3.scaleLinear().domain([bounds.ymin, bounds.ymax]).range([innerH, 0]);

  const svg = d3.create("svg")
    .attr("width", w)
    .attr("height", h)
    .attr("viewBox", `0 0 ${w} ${h}`)
    .style("max-width", "100%")
    .style("background", "transparent")
    .style("border-radius", "4px");

  svg.append("text")
    .attr("x", w / 2)
    .attr("y", 22)
    .attr("text-anchor", "middle")
    .attr("font-family", "var(--sans-serif)")
    .attr("font-size", "15px")
    .attr("font-weight", "600")
    .attr("fill", "currentColor")
    .text(title);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const streamlineSeeds = [];
  if (isVortex) {
    for (let r = 0.15; r <= 1.1; r += 0.18) streamlineSeeds.push([0, r]);
  } else {
    for (let i = -6; i <= 6; i += 2) {
      if (Math.abs(i) >= 1) {
        streamlineSeeds.push([-1.4, i * 0.15]);
        streamlineSeeds.push([1.4, i * 0.15]);
      }
    }
    for (let i = -4; i <= 4; i += 2) {
      streamlineSeeds.push([i * 0.25, 1.1]);
      streamlineSeeds.push([i * 0.25, -1.1]);
    }
  }

  const line = d3.line()
    .x(d => xScale(d[0]))
    .y(d => yScale(d[1]));

  const allStreamlines = [];
  for (const [sx, sy] of streamlineSeeds) {
    const fwd = traceStreamline(sx, sy, panelX1, panelY1, panelX2, panelY2, sigma, gamma, 0.03, 200, bounds);
    const bwd = traceStreamline(sx, sy, panelX1, panelY1, panelX2, panelY2, sigma, gamma, -0.03, 200, bounds);
    const combined = [...bwd.reverse(), ...fwd.slice(1)];
    if (combined.length > 3) allStreamlines.push(combined);
  }

  for (const streamline of allStreamlines) {
    g.append("path")
      .attr("d", line(streamline))
      .attr("fill", "none")
      .attr("stroke", "#4a90d9")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.75);
  }

  // Place arrowheads with minimum spacing
  const arrowheads = [];
  const minDist = 0.28;
  const arrowSize = 7;

  function canPlaceArrow(x, y) {
    for (const [ax, ay] of arrowheads) {
      if (Math.sqrt((x - ax) ** 2 + (y - ay) ** 2) < minDist) return false;
    }
    return true;
  }

  for (const streamline of allStreamlines) {
    for (let i = 2; i < streamline.length - 2; i += 3) {
      const [x, y] = streamline[i];
      if (canPlaceArrow(x, y)) {
        arrowheads.push([x, y]);
        const [x0, y0] = streamline[i - 1];
        const [x1, y1] = streamline[i + 1];
        const angle = Math.atan2(y1 - y0, x1 - x0);
        const sx = xScale(x), sy = yScale(y);
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const sinY = -sin;
        const tipX = sx + arrowSize * cos, tipY = sy + arrowSize * sinY;
        const backL_X = sx - arrowSize * 0.5 * cos - arrowSize * 0.5 * (-sinY);
        const backL_Y = sy - arrowSize * 0.5 * sinY - arrowSize * 0.5 * cos;
        const backR_X = sx - arrowSize * 0.5 * cos + arrowSize * 0.5 * (-sinY);
        const backR_Y = sy - arrowSize * 0.5 * sinY + arrowSize * 0.5 * cos;
        g.append("path")
          .attr("d", `M${tipX},${tipY} L${backL_X},${backL_Y} L${backR_X},${backR_Y} Z`)
          .attr("fill", "#4a90d9")
          .attr("stroke", "none");
      }
    }
  }

  g.append("line")
    .attr("x1", xScale(panelX1)).attr("y1", yScale(panelY1))
    .attr("x2", xScale(panelX2)).attr("y2", yScale(panelY2))
    .attr("stroke", "currentColor").attr("stroke-width", 4).attr("stroke-linecap", "round");

  g.append("circle").attr("cx", xScale(panelX1)).attr("cy", yScale(panelY1)).attr("r", 4).attr("fill", "#e74c3c");
  g.append("circle").attr("cx", xScale(panelX2)).attr("cy", yScale(panelY2)).attr("r", 4).attr("fill", "#e74c3c");

  function addLabelWithShadow(x, y, anchor, text) {
    // Background halo uses the page background color so it works on both light and dark themes
    g.append("text")
      .attr("x", x).attr("y", y)
      .attr("text-anchor", anchor)
      .attr("font-family", "var(--serif)")
      .attr("font-size", "14px")
      .attr("font-style", "italic")
      .attr("fill", "none")
      .attr("stroke", "var(--theme-background)")
      .attr("stroke-width", 4)
      .attr("stroke-linejoin", "round")
      .text(text);
    g.append("text")
      .attr("x", x).attr("y", y)
      .attr("text-anchor", anchor)
      .attr("font-family", "var(--serif)")
      .attr("font-size", "14px")
      .attr("font-style", "italic")
      .attr("fill", "currentColor")
      .text(text);
  }

  addLabelWithShadow(xScale(panelX1) - 10, yScale(panelY1) + 5, "end", "(xⱼ, yⱼ)");
  addLabelWithShadow(xScale(panelX2) + 10, yScale(panelY2) + 5, "start", "(xⱼ₊₁, yⱼ₊₁)");

  return svg.node();
}
