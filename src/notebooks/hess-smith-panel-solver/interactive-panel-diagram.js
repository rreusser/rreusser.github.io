// Interactive panel diagram showing source/vortex panels with stream function contours
// Supports draggable vertices and adjustable strengths via sliders

// WebGPU shader for stream function contours
const contourShaderSource = `
  struct Uniforms {
    bounds: vec4f,      // xmin, xmax, ymin, ymax
    resolution: vec2f,
    panelCount: f32,
    gamma: f32,
    vInf: f32,
    _pad: vec3f,
  }
  struct Panel {
    p1: vec2f,
    p2: vec2f,
    sigma: f32,
    _pad: f32,
  }
  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var<storage, read> panelData: array<Panel>;

  const pi: f32 = 3.14159265359;

  struct StreamResult {
    psi: f32,
    branchCutMask: f32,
  }

  fn computeStreamFunction(pos: vec2f) -> StreamResult {
    // Freestream contribution: psi = V_inf * y
    var psi: f32 = uniforms.vInf * pos.y;
    var branchCutMask: f32 = 0.0;
    let panelCount = u32(uniforms.panelCount);
    for (var i = 0u; i < panelCount; i++) {
      let p = panelData[i];
      let r1 = pos - p.p1;
      let r2 = pos - p.p2;
      let r1sq = dot(r1, r1);
      let r2sq = dot(r2, r2);
      if (r1sq < 0.0001 || r2sq < 0.0001) { continue; }

      let panelVec = p.p2 - p.p1;
      let panelLen = length(panelVec);
      let t = panelVec / panelLen;
      let n = vec2f(-t.y, t.x);

      let s1 = dot(r1, t);
      let s2 = dot(r2, t);
      let h = dot(r1, n);

      let r1_mag = sqrt(r1sq);
      let r2_mag = sqrt(r2sq);

      let theta1 = atan2(h, s1);
      let theta2 = atan2(h, s2);

      // Source stream function
      psi += (p.sigma / (2.0 * pi)) * (s1 * theta1 - s2 * theta2 + h * log(r1_mag / r2_mag));

      // Vortex stream function
      psi += (uniforms.gamma / (2.0 * pi)) * (h * (theta2 - theta1) + s1 * log(r1_mag) - s2 * log(r2_mag));

      // Branch cut detection
      let cutWidth = 0.01 * panelLen;
      let onCut1 = select(0.0, smoothstep(cutWidth, 0.0, abs(h)), s1 < 0.0);
      let onCut2 = select(0.0, smoothstep(cutWidth, 0.0, abs(h)), s2 < 0.0 && s1 < 0.0);
      branchCutMask = max(branchCutMask, max(onCut1, onCut2));
    }
    return StreamResult(psi, branchCutMask);
  }

  @vertex
  fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
    let pos = array(vec2f(-1,-1), vec2f(3,-1), vec2f(-1,3));
    return vec4f(pos[i], 0, 1);
  }

  @fragment
  fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let uv = fragCoord.xy / uniforms.resolution;
    let x = mix(uniforms.bounds.x, uniforms.bounds.y, uv.x);
    let y = mix(uniforms.bounds.w, uniforms.bounds.z, uv.y);

    let result = computeStreamFunction(vec2f(x, y));

    let spacing = 0.02 * pi;
    let fw = fwidth(result.psi);
    let dist = abs(fract(result.psi / spacing + 0.5) - 0.5) * spacing;
    let distPx = dist / max(fw, 0.0001);
    let lineWidthPx = 1.5;
    let contour = 1.0 - smoothstep(0.0, lineWidthPx, distPx);
    let opacity = contour * 0.7 * (1.0 - result.branchCutMask);

    return vec4f(vec3f(0.4, 0.6, 0.9), opacity);
  }
`;

// Compute velocity from a single panel
function panelVelocity(x, y, p, gamma) {
  const r1x = x - p.x1, r1y = y - p.y1;
  const r2x = x - p.x2, r2y = y - p.y2;
  const r1sq = r1x * r1x + r1y * r1y;
  const r2sq = r2x * r2x + r2y * r2y;
  if (r1sq < 1e-6 || r2sq < 1e-6) return { vx: 0, vy: 0 };

  const dx = p.x2 - p.x1, dy = p.y2 - p.y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const tx = dx / len, ty = dy / len;
  const nx = -ty, ny = tx;

  const lambda = 0.5 * Math.log(r2sq / r1sq);
  const det = r1x * r2y - r2x * r1y;
  const dot = r1x * r2x + r1y * r2y;
  const beta = Math.atan2(det, dot);

  const c = 0.5 / Math.PI;
  return {
    vx: c * (p.sigma * (-lambda * tx + beta * nx) + gamma * (beta * tx + lambda * nx)),
    vy: c * (p.sigma * (-lambda * ty + beta * ny) + gamma * (beta * ty + lambda * ny))
  };
}

export function createInteractivePanelDiagram({ d3, html, Inputs, device, canvasFormat, width, devicePixelRatio }) {
  // Controls
  const controlsDiv = html`<div style="display: flex; flex-wrap: wrap; gap: 0.5em 2em; margin-bottom: 1em; font-family: var(--sans-serif); font-size: 14px;"></div>`;

  const sigma1Input = Inputs.range([-2, 2], { label: "σ₁ (center)", value: 0.7, step: 0.01, width: 180 });
  const sigma2Input = Inputs.range([-2, 2], { label: "σ₂ (left)", value: 0.3, step: 0.01, width: 180 });
  const sigma3Input = Inputs.range([-2, 2], { label: "σ₃ (right)", value: -0.7, step: 0.01, width: 180 });
  const gammaInput = Inputs.range([-2, 2], { label: "γ (vortex)", value: 1.0, step: 0.01, width: 180 });
  const vInfInput = Inputs.range([0, 2], { label: "V∞", value: 0.5, step: 0.01, width: 180 });

  controlsDiv.append(sigma1Input, sigma2Input, sigma3Input, gammaInput, vInfInput);

  // State
  const state = {
    sigma1: sigma1Input.value,
    sigma2: sigma2Input.value,
    sigma3: sigma3Input.value,
    gamma: gammaInput.value,
    vInf: vInfInput.value
  };

  // Panel geometry (mutable for dragging)
  const angle1 = Math.PI + Math.PI / 6;
  const angle2 = -Math.PI / 6;
  const panels = [
    { x1: -0.5, y1: 0, x2: 0.5, y2: 0, sigma: state.sigma1 },
    { x1: -0.5, y1: 0, x2: -0.5 + Math.cos(angle1), y2: Math.sin(angle1), sigma: state.sigma2 },
    { x1: 0.5, y1: 0, x2: 0.5 + Math.cos(angle2), y2: Math.sin(angle2), sigma: state.sigma3 },
  ];

  // WebGPU setup
  const contourCanvas = document.createElement('canvas');
  contourCanvas.id = 'stream-function-canvas';
  const contourContext = contourCanvas.getContext('webgpu');
  contourContext.configure({ device, format: canvasFormat, alphaMode: 'premultiplied' });

  const shaderModule = device.createShaderModule({ code: contourShaderSource });
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: shaderModule, entryPoint: 'vs' },
    fragment: {
      module: shaderModule,
      entryPoint: 'fs',
      targets: [{
        format: canvasFormat,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }
        }
      }]
    },
    primitive: { topology: 'triangle-list' }
  });

  const uniformBuffer = device.createBuffer({
    size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  const panelBuffer = device.createBuffer({
    size: panels.length * 24,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: panelBuffer } }
    ]
  });

  // Layout
  const w = width;
  const h = Math.min(525, width * 0.675);
  const margin = { top: 20, right: 20, bottom: 30, left: 20 };
  const innerW = w - margin.left - margin.right;
  const innerH = h - margin.top - margin.bottom;

  // Compute aspect-ratio-correct bounds
  const desiredBounds = { xmin: -2.0, xmax: 2.0, ymin: -1.2, ymax: 1.2 };
  const canvasAspect = innerW / innerH;
  const dataW = desiredBounds.xmax - desiredBounds.xmin;
  const dataH = desiredBounds.ymax - desiredBounds.ymin;
  const dataAspect = dataW / dataH;
  const centerX = (desiredBounds.xmin + desiredBounds.xmax) / 2;
  const centerY = (desiredBounds.ymin + desiredBounds.ymax) / 2;

  let bounds;
  if (canvasAspect > dataAspect) {
    const newDataW = dataH * canvasAspect;
    bounds = { xmin: centerX - newDataW/2, xmax: centerX + newDataW/2, ymin: desiredBounds.ymin, ymax: desiredBounds.ymax };
  } else {
    const newDataH = dataW / canvasAspect;
    bounds = { xmin: desiredBounds.xmin, xmax: desiredBounds.xmax, ymin: centerY - newDataH/2, ymax: centerY + newDataH/2 };
  }

  const xScale = d3.scaleLinear().domain([bounds.xmin, bounds.xmax]).range([0, innerW]);
  const yScale = d3.scaleLinear().domain([bounds.ymin, bounds.ymax]).range([innerH, 0]);

  // Rendering functions
  function uploadPanelData() {
    const panelArray = new Float32Array(panels.length * 6);
    panels.forEach((p, i) => {
      panelArray[i * 6 + 0] = p.x1;
      panelArray[i * 6 + 1] = p.y1;
      panelArray[i * 6 + 2] = p.x2;
      panelArray[i * 6 + 3] = p.y2;
      panelArray[i * 6 + 4] = p.sigma;
      panelArray[i * 6 + 5] = 0;
    });
    device.queue.writeBuffer(panelBuffer, 0, panelArray);
  }

  function renderContours() {
    contourCanvas.width = w * devicePixelRatio;
    contourCanvas.height = h * devicePixelRatio;
    contourCanvas.style.width = w + 'px';
    contourCanvas.style.height = h + 'px';

    const pxToDataX = (bounds.xmax - bounds.xmin) / innerW;
    const pxToDataY = (bounds.ymax - bounds.ymin) / innerH;
    const gpuBounds = {
      xmin: bounds.xmin - margin.left * pxToDataX,
      xmax: bounds.xmax + margin.right * pxToDataX,
      ymin: bounds.ymin - margin.bottom * pxToDataY,
      ymax: bounds.ymax + margin.top * pxToDataY
    };

    const uniformData = new Float32Array([
      gpuBounds.xmin, gpuBounds.xmax, gpuBounds.ymin, gpuBounds.ymax,
      contourCanvas.width, contourCanvas.height,
      panels.length, state.gamma,
      state.vInf, 0, 0, 0,  // vInf + padding to align vec3f
      0, 0, 0, 0            // _pad vec3f + struct padding
    ]);
    device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: contourContext.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear',
        storeOp: 'store'
      }]
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  function totalVelocity(x, y) {
    let vx = state.vInf, vy = 0;  // Start with freestream
    for (const p of panels) {
      const v = panelVelocity(x, y, p, state.gamma);
      vx += v.vx;
      vy += v.vy;
    }
    return { vx, vy };
  }

  // Create SVG
  const svg = d3.create("svg")
    .attr("width", w)
    .attr("height", h)
    .attr("viewBox", `0 0 ${w} ${h}`)
    .style("max-width", "100%")
    .style("background", "transparent")
    .style("cursor", "crosshair");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Panel lines group
  const panelLinesGroup = g.append("g").attr("class", "panel-lines");

  // Indicators group (source/sink arrows and vortex arcs)
  const indicatorsGroup = g.append("g").attr("class", "indicators");

  // Vertex handles group
  const vertexGroup = g.append("g").attr("class", "vertices");

  // Velocity arrow
  const velocityArrow = g.append("g").attr("visibility", "hidden").style("pointer-events", "none");
  const velLine = velocityArrow.append("line").attr("stroke", "#e74c3c").attr("stroke-width", 4);
  const velHead = velocityArrow.append("path").attr("fill", "#e74c3c");

  // Freestream arrow (on left side)
  const freestreamArrow = g.append("g").attr("class", "freestream-arrow").style("pointer-events", "none");

  function updateFreestreamArrow() {
    freestreamArrow.selectAll("*").remove();
    if (state.vInf < 0.01) return;  // Don't draw if near zero

    const arrowLen = 50 * Math.min(1, state.vInf);
    const arrowY = (h - margin.top - margin.bottom) / 2;
    const startX = 10;  // Inside left edge of plot
    const headLen = 12;
    const opacity = Math.max(0, Math.min(1, (state.vInf - 0.2) / 0.1));

    freestreamArrow.append("line")
      .attr("x1", startX).attr("y1", arrowY)
      .attr("x2", startX + arrowLen - headLen * 0.5).attr("y2", arrowY)
      .attr("stroke", "#27ae60").attr("stroke-width", 4)
      .attr("opacity", opacity);

    const tipX = startX + arrowLen;
    freestreamArrow.append("path")
      .attr("d", `M${tipX},${arrowY} L${tipX - headLen},${arrowY - 6} L${tipX - headLen},${arrowY + 6} Z`)
      .attr("fill", "#27ae60")
      .attr("opacity", opacity);

    // Label
    freestreamArrow.append("text")
      .attr("x", startX + arrowLen / 2)
      .attr("y", arrowY - 12)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-family", "var(--sans-serif)")
      .attr("fill", "#27ae60")
      .attr("opacity", opacity)
      .text("V∞");
  }

  // Draw source/sink indicator for a panel
  function drawSourceSinkIndicator(group, p, index) {
    const mx = (p.x1 + p.x2) / 2, my = (p.y1 + p.y2) / 2;
    const sigma = p.sigma;

    if (Math.abs(sigma) < 0.01) return; // Don't draw if near zero

    const srcGroup = group.append("g")
      .attr("class", `source-indicator-${index}`)
      .attr("transform", `translate(${xScale(mx)},${yScale(my)})`);

    const outerRadius = 28 * Math.min(1, Math.abs(sigma));
    const innerRadius = 3;
    const isSource = sigma > 0;
    const color = isSource ? "#2ecc71" : "#9b59b6";
    const opacity = Math.max(0, Math.min(1, (Math.abs(sigma) - 0.2) / 0.1));

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const outerX = outerRadius * Math.cos(a);
      const outerY = outerRadius * Math.sin(a);
      const innerX = innerRadius * Math.cos(a);
      const innerY = innerRadius * Math.sin(a);

      const tipX = isSource ? outerX : innerX;
      const tipY = isSource ? outerY : innerY;
      const baseX = isSource ? innerX : outerX;
      const baseY = isSource ? innerY : outerY;

      const lineEndX = tipX - (tipX - baseX) * 0.2;
      const lineEndY = tipY - (tipY - baseY) * 0.2;

      srcGroup.append("line")
        .attr("x1", baseX).attr("y1", baseY)
        .attr("x2", lineEndX).attr("y2", lineEndY)
        .attr("stroke", color)
        .attr("stroke-width", 4.5)
        .attr("opacity", opacity);

      const headLen = 14;
      const dir = Math.atan2(tipY - baseY, tipX - baseX);
      const hx1 = tipX - headLen * Math.cos(dir - 0.45);
      const hy1 = tipY - headLen * Math.sin(dir - 0.45);
      const hx2 = tipX - headLen * Math.cos(dir + 0.45);
      const hy2 = tipY - headLen * Math.sin(dir + 0.45);
      srcGroup.append("path")
        .attr("d", `M${tipX},${tipY} L${hx1},${hy1} L${hx2},${hy2} Z`)
        .attr("fill", color)
        .attr("opacity", opacity);
    }
  }

  // Draw vortex indicator for a panel
  function drawVortexIndicator(group, p, index, gamma) {
    if (Math.abs(gamma) < 0.01) return; // Don't draw if near zero

    const mx = (p.x1 + p.x2) / 2, my = (p.y1 + p.y2) / 2;
    const dx = p.x2 - p.x1, dy = p.y2 - p.y1;
    const angle = Math.atan2(dy, dx);

    const arcRadius = 28 * Math.min(1, Math.abs(gamma));
    const arcSpan = Math.PI * 0.8;
    const arcTrim = 0.15;
    const arcDir = gamma > 0 ? 1 : -1;
    const opacity = Math.max(0, Math.min(1, (Math.abs(gamma) - 0.2) / 0.1));

    const arcStart = arcDir > 0 ? -arcSpan : -(arcSpan - arcTrim);
    const arcEnd = arcDir > 0 ? (arcSpan - arcTrim) : arcSpan;
    const arc = d3.arc()
      .innerRadius(arcRadius - 1.5)
      .outerRadius(arcRadius + 1.5)
      .startAngle(arcStart)
      .endAngle(arcEnd);

    const vortexGroup = group.append("g")
      .attr("class", `vortex-indicator-${index}`)
      .attr("transform", `translate(${xScale(mx)},${yScale(my)}) rotate(${-angle * 180 / Math.PI})`);

    vortexGroup.append("path")
      .attr("d", arc())
      .attr("fill", "#3498db")
      .attr("opacity", opacity);

    // Arrowhead
    const endAngle = arcSpan * arcDir;
    const headLen = 12;
    const headWidth = 5;
    const tipX = arcRadius * Math.sin(endAngle);
    const tipY = -arcRadius * Math.cos(endAngle);
    const backAngle = endAngle - (headLen / arcRadius) * arcDir;
    const backX = arcRadius * Math.sin(backAngle);
    const backY = -arcRadius * Math.cos(backAngle);

    const adx = tipX - backX, ady = tipY - backY;
    const alen = Math.sqrt(adx * adx + ady * ady);
    const ux = adx / alen, uy = ady / alen;
    const nx = -uy, ny = ux;
    const baseX = tipX - ux * headLen, baseY = tipY - uy * headLen;
    const ha1x = baseX + nx * headWidth, ha1y = baseY + ny * headWidth;
    const ha2x = baseX - nx * headWidth, ha2y = baseY - ny * headWidth;

    vortexGroup.append("path")
      .attr("d", `M${tipX},${tipY} L${ha1x},${ha1y} L${ha2x},${ha2y} Z`)
      .attr("fill", "#3498db")
      .attr("opacity", opacity);
  }

  // Update all SVG elements
  function updateSVG() {
    // Update panel lines
    panelLinesGroup.selectAll("*").remove();
    panels.forEach((p) => {
      panelLinesGroup.append("line")
        .attr("x1", xScale(p.x1)).attr("y1", yScale(p.y1))
        .attr("x2", xScale(p.x2)).attr("y2", yScale(p.y2))
        .attr("stroke", "#333")
        .attr("stroke-width", 4)
        .attr("stroke-linecap", "round");
    });

    // Update indicators
    indicatorsGroup.selectAll("*").remove();
    panels.forEach((p, i) => {
      drawSourceSinkIndicator(indicatorsGroup, p, i);
      drawVortexIndicator(indicatorsGroup, p, i, state.gamma);
    });

    // Update vertex handles
    vertexGroup.selectAll("*").remove();
    const vertices = [];
    panels.forEach((p, pi) => {
      vertices.push({ x: p.x1, y: p.y1, panel: pi, endpoint: 'p1' });
      vertices.push({ x: p.x2, y: p.y2, panel: pi, endpoint: 'p2' });
    });

    // Deduplicate vertices at same position
    const uniqueVertices = [];
    const seen = new Map();
    vertices.forEach(v => {
      const key = `${v.x.toFixed(6)},${v.y.toFixed(6)}`;
      if (!seen.has(key)) {
        seen.set(key, { ...v, panels: [{ panel: v.panel, endpoint: v.endpoint }] });
        uniqueVertices.push(seen.get(key));
      } else {
        seen.get(key).panels.push({ panel: v.panel, endpoint: v.endpoint });
      }
    });

    uniqueVertices.forEach((v, i) => {
      const handle = vertexGroup.append("g")
        .attr("class", "vertex-handle")
        .attr("transform", `translate(${xScale(v.x)},${yScale(v.y)})`)
        .style("cursor", "move");

      // Larger invisible hit area
      handle.append("circle")
        .attr("r", 15)
        .attr("fill", "transparent");

      // Visible circle
      handle.append("circle")
        .attr("r", 5)
        .attr("fill", "#e74c3c")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

      // Drag behavior
      handle.call(d3.drag()
        .on("start", function() {
          velocityArrow.attr("visibility", "hidden");
        })
        .on("drag", function(event) {
          const newX = xScale.invert(event.x);
          const newY = yScale.invert(event.y);

          // Update all panels that share this vertex
          v.panels.forEach(({ panel, endpoint }) => {
            if (endpoint === 'p1') {
              panels[panel].x1 = newX;
              panels[panel].y1 = newY;
            } else {
              panels[panel].x2 = newX;
              panels[panel].y2 = newY;
            }
          });
          v.x = newX;
          v.y = newY;

          d3.select(this).attr("transform", `translate(${event.x},${event.y})`);

          // Update panel lines only (not full redraw for performance)
          panelLinesGroup.selectAll("line").data(panels)
            .attr("x1", p => xScale(p.x1)).attr("y1", p => yScale(p.y1))
            .attr("x2", p => xScale(p.x2)).attr("y2", p => yScale(p.y2));

          // Update indicator positions
          panels.forEach((p, i) => {
            const mx = (p.x1 + p.x2) / 2, my = (p.y1 + p.y2) / 2;
            const angle = Math.atan2(p.y2 - p.y1, p.x2 - p.x1);
            indicatorsGroup.select(`.source-indicator-${i}`)
              .attr("transform", `translate(${xScale(mx)},${yScale(my)})`);
            indicatorsGroup.select(`.vortex-indicator-${i}`)
              .attr("transform", `translate(${xScale(mx)},${yScale(my)}) rotate(${-angle * 180 / Math.PI})`);
          });

          uploadPanelData();
          renderContours();
        })
        .on("end", function() {
          updateSVG(); // Full redraw to update indicators
        })
      );
    });
  }

  function updateVelocityArrow(screenX, screenY) {
    const dataX = xScale.invert(screenX - margin.left);
    const dataY = yScale.invert(screenY - margin.top);

    const { vx, vy } = totalVelocity(dataX, dataY);
    const vmag = Math.sqrt(vx * vx + vy * vy);

    if (vmag < 0.01) {
      velocityArrow.attr("visibility", "hidden");
      return;
    }

    velocityArrow.attr("visibility", "visible");

    const sx = xScale(dataX), sy = yScale(dataY);
    const scale = 360;
    const displayLen = Math.min(vmag * scale, w / 4);
    const angle = Math.atan2(-vy, vx);

    const headLen = 18;
    const tipX = sx + displayLen * Math.cos(angle);
    const tipY = sy + displayLen * Math.sin(angle);
    const lineEndX = tipX - headLen * 0.7 * Math.cos(angle);
    const lineEndY = tipY - headLen * 0.7 * Math.sin(angle);

    velLine.attr("x1", sx).attr("y1", sy).attr("x2", lineEndX).attr("y2", lineEndY);

    const h1x = tipX - headLen * Math.cos(angle - 0.35);
    const h1y = tipY - headLen * Math.sin(angle - 0.35);
    const h2x = tipX - headLen * Math.cos(angle + 0.35);
    const h2y = tipY - headLen * Math.sin(angle + 0.35);
    velHead.attr("d", `M${tipX},${tipY} L${h1x},${h1y} L${h2x},${h2y} Z`);
  }

  // Event handlers
  svg.on("mousemove", function(event) {
    const [x, y] = d3.pointer(event);
    updateVelocityArrow(x, y);
  });

  svg.on("mouseleave", function() {
    velocityArrow.attr("visibility", "hidden");
  });

  svg.on("touchstart touchmove", function(event) {
    event.preventDefault();
    const touch = event.touches[0];
    const rect = this.getBoundingClientRect();
    updateVelocityArrow(touch.clientX - rect.left, touch.clientY - rect.top);
  });

  svg.on("touchend", function() {
    velocityArrow.attr("visibility", "hidden");
  });

  // Update function for sliders
  function update() {
    panels[0].sigma = state.sigma1;
    panels[1].sigma = state.sigma2;
    panels[2].sigma = state.sigma3;
    uploadPanelData();
    renderContours();
    updateSVG();
    updateFreestreamArrow();
  }

  // Slider listeners
  sigma1Input.addEventListener('input', () => { state.sigma1 = sigma1Input.value; update(); });
  sigma2Input.addEventListener('input', () => { state.sigma2 = sigma2Input.value; update(); });
  sigma3Input.addEventListener('input', () => { state.sigma3 = sigma3Input.value; update(); });
  gammaInput.addEventListener('input', () => { state.gamma = gammaInput.value; update(); });
  vInfInput.addEventListener('input', () => { state.vInf = vInfInput.value; update(); });

  // Initial render
  uploadPanelData();
  renderContours();
  updateSVG();
  updateFreestreamArrow();

  // Position canvas
  Object.assign(contourCanvas.style, {
    position: 'absolute',
    top: '0',
    left: '0'
  });

  const figure = html`<figure style="margin: 1.5em 0;">
    <div style="position: relative; width: ${w}px; height: ${h}px;">
      ${contourCanvas}
      ${Object.assign(svg.node(), { style: 'position: absolute; top: 0; left: 0;' })}
    </div>
    <figcaption style="text-align: center; font-size: 14px; margin-top: 8px;">
      Drag vertices to reshape panels. Adjust sliders to change source/vortex strengths.
      Hover to see induced velocity.
    </figcaption>
  </figure>`;

  return { controls: controlsDiv, figure };
}
