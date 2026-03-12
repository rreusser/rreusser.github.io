function hexToRGB(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

function toCSS(r, g, b) {
  return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
const DEPTHS = [0.05, 0.275, 0.5, 0.725, 0.95];

// Shared viewBox width so peel and dual-peel diagrams render at the same scale
const PEEL_DIAGRAM_W = 219;

export function createOITDiagram(opacity, depthSpread) {
  const alpha = opacity;
  const n = COLORS.length;
  const depths = DEPTHS.map(z => 0.5 + (z - 0.5) * depthSpread);

  const weights = depths.map(z => alpha * Math.max(0.01, 3000 * Math.pow(1 - z, 3)));
  const maxWeight = Math.max(...weights);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const rgbColors = COLORS.map(hexToRGB);

  let accumR = 0, accumG = 0, accumB = 0, accumA = 0;
  for (let i = 0; i < n; i++) {
    const [r, g, b] = rgbColors[i];
    const w = weights[i];
    accumR += r * alpha * w;
    accumG += g * alpha * w;
    accumB += b * alpha * w;
    accumA += alpha * w;
  }

  let revealage = 1;
  for (let i = 0; i < n; i++) revealage *= (1 - alpha);

  const denom = Math.max(accumA, 1e-4);
  const finalR = Math.min(1, (accumR / denom) * (1 - revealage) + revealage);
  const finalG = Math.min(1, (accumG / denom) * (1 - revealage) + revealage);
  const finalB = Math.min(1, (accumB / denom) * (1 - revealage) + revealage);

  const sq = 20;
  const rowH = 34;
  const labelW = 26;
  const headerH = 16;

  const depthCY = Array.from({length: n}, (_, i) => headerH + sq / 2 + i * rowH);

  // Fragment swatch column
  const fragCX = labelW + sq / 2;

  // Weight bars
  const barX = labelW + sq + 6;
  const barMaxW = 68;
  const barH = 8;

  // Blend column (weighted average before revealage)
  const blendCX = barX + barMaxW + 14 + sq / 2;

  // Result column (after revealage)
  const resultCX = blendCX + sq + 8;

  // Final result
  const finalGap = 8;
  const finalCY = depthCY[n - 1] + rowH / 2 + finalGap + sq / 2;

  const svgW = PEEL_DIAGRAM_W;
  const svgH = finalCY + sq / 2 + 8;

  let svg = '';

  // Near/Far labels
  svg += `<text x="${labelW - 4}" y="${depthCY[0] + 4}" font-size="9" fill="#666" text-anchor="end">Near</text>`;
  svg += `<text x="${labelW - 4}" y="${depthCY[n - 1] + 4}" font-size="9" fill="#666" text-anchor="end">Far</text>`;

  // Column headers
  svg += `<text x="${barX + barMaxW / 2}" y="10" font-size="8" fill="#666" text-anchor="middle">w(z)</text>`;
  svg += `<text x="${blendCX}" y="10" font-size="8" fill="#555" text-anchor="middle">Blend</text>`;
  svg += `<text x="${resultCX}" y="10" font-size="8" font-weight="600" fill="#555" text-anchor="middle">Result</text>`;

  // Vertical separator before blend column
  const sep1X = barX + barMaxW + 8;
  svg += `<line x1="${sep1X}" y1="${headerH}" x2="${sep1X}" y2="${depthCY[n - 1] + sq / 2}" stroke="#ddd" stroke-width="0.5"/>`;

  // Fragment rows
  for (let i = 0; i < n; i++) {
    const cy = depthCY[i];
    const rx = fragCX - sq / 2;
    const ry = cy - sq / 2;

    // Fragment swatch
    svg += `<rect x="${rx}" y="${ry}" width="${sq}" height="${sq}" rx="3" fill="${COLORS[i]}" opacity="${Math.max(alpha, 0.08)}" stroke="#ccc" stroke-width="1"/>`;

    // Weight bar
    const barW = maxWeight > 0 ? (weights[i] / maxWeight) * barMaxW : 0;
    svg += `<rect x="${barX}" y="${cy - barH / 2}" width="${barW}" height="${barH}" rx="2" fill="${COLORS[i]}" opacity="0.7"/>`;

    // w(z) = value label below bar
    svg += `<text x="${barX}" y="${cy + barH / 2 + 8}" font-size="6.5" fill="#666">w(${depths[i].toFixed(2)}) = ${weights[i].toFixed(0)}</text>`;

    // Blend column swatch: opacity reflects normalized weight
    const normalizedWeight = totalWeight > 0 ? weights[i] / totalWeight : 1 / n;
    const blendOpacity = Math.max(0.08, Math.min(1, normalizedWeight * n));
    svg += `<rect x="${blendCX - sq / 2}" y="${ry}" width="${sq}" height="${sq}" rx="3" fill="${COLORS[i]}" opacity="${blendOpacity}" stroke="#aaa" stroke-width="0.5"/>`;

    // Result column: blend colors dimmed by (1 - revealage)
    const resultOpacity = Math.max(0.08, Math.min(1, blendOpacity * (1 - revealage)));
    svg += `<rect x="${resultCX - sq / 2}" y="${ry}" width="${sq}" height="${sq}" rx="3" fill="${COLORS[i]}" opacity="${resultOpacity}" stroke="#aaa" stroke-width="0.5"/>`;
  }

  // Sum line below result column
  const sumLineY = depthCY[n - 1] + sq / 2 + finalGap / 2;
  svg += `<line x1="${resultCX - sq / 2 - 2}" y1="${sumLineY}" x2="${resultCX + sq / 2 + 2}" y2="${sumLineY}" stroke="#555" stroke-width="1"/>`;

  // Final result swatch under result column
  svg += `<rect x="${resultCX - sq / 2}" y="${finalCY - sq / 2}" width="${sq}" height="${sq}" rx="3" fill="${toCSS(finalR, finalG, finalB)}" stroke="#333" stroke-width="1.5"/>`;

  const el = document.createElement('div');
  el.id = 'oit-diagram-fig';
  el.style.cssText = 'padding: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;';
  el.innerHTML = `<svg viewBox="0 0 ${svgW} ${svgH}" width="100%" style="display: block; font-family: var(--sans-serif);">${svg}</svg>`;
  return el;
}

export function createPeelDiagram(opacity, peelLayers) {
  const alpha = opacity;
  const n = COLORS.length;
  const numPasses = Math.min(peelLayers, n);

  const sq = 20;
  const colW = 30;
  const rowH = 30;
  const labelW = 28;
  const headerH = 16;

  // Pass column centers (left to right)
  const passCX = Array.from({length: n}, (_, i) => labelW + sq / 2 + i * colW);

  // Depth row centers (top = near, bottom = far)
  const depthCY = Array.from({length: n}, (_, i) => headerH + sq / 2 + i * rowH);

  // Blend column to the right of the grid
  const blendGap = 18;
  const blendCX = passCX[n - 1] + colW / 2 + blendGap + sq / 2;

  // Final result row below blend column
  const finalGap = 8;
  const finalCY = depthCY[n - 1] + rowH / 2 + finalGap + sq / 2;

  const svgW = PEEL_DIAGRAM_W;
  const svgH = finalCY + sq / 2 + 8;

  let svg = '';

  // Near/Far depth labels
  svg += `<text x="${labelW - 4}" y="${depthCY[0] + 4}" font-size="9" fill="#999" text-anchor="end">Near</text>`;
  svg += `<text x="${labelW - 4}" y="${depthCY[n - 1] + 4}" font-size="9" fill="#999" text-anchor="end">Far</text>`;

  // Pass column headers
  for (let p = 0; p < n; p++) {
    const active = p < numPasses;
    svg += `<text x="${passCX[p]}" y="10" font-size="8" fill="${active ? '#666' : '#ccc'}" text-anchor="middle">Pass ${p + 1}</text>`;
  }

  // Blend column header
  svg += `<text x="${blendCX}" y="10" font-size="8" font-weight="600" fill="#555" text-anchor="middle">Blend</text>`;

  // Vertical separator before blend column
  const sepX = (passCX[n - 1] + colW / 2 + blendCX - sq / 2) / 2;
  svg += `<line x1="${sepX}" y1="${headerH}" x2="${sepX}" y2="${depthCY[n - 1] + sq / 2}" stroke="#ddd" stroke-width="0.5"/>`;

  // Grid cells: rows = depth positions, cols = passes
  // Fragment i gets captured in pass i (depth peeling captures nearest first)
  for (let i = 0; i < n; i++) {
    for (let p = 0; p < n; p++) {
      const cx = passCX[p];
      const cy = depthCY[i];
      const rx = cx - sq / 2;
      const ry = cy - sq / 2;

      if (p >= numPasses) {
        // Inactive pass
        svg += `<rect x="${rx}" y="${ry}" width="${sq}" height="${sq}" rx="3" fill="${COLORS[i]}" opacity="0.1" stroke="#eee" stroke-width="0.5"/>`;
      } else if (i < p) {
        // Already peeled in an earlier pass
        svg += `<rect x="${rx}" y="${ry}" width="${sq}" height="${sq}" rx="3" fill="none" stroke="${COLORS[i]}" stroke-width="1" stroke-dasharray="3,2" opacity="0.3"/>`;
      } else if (i === p) {
        // Captured this pass
        svg += `<rect x="${rx}" y="${ry}" width="${sq}" height="${sq}" rx="3" fill="${COLORS[i]}" opacity="${Math.max(alpha, 0.08)}" stroke="#222" stroke-width="2"/>`;
      } else {
        // Remaining (not yet peeled)
        svg += `<rect x="${rx}" y="${ry}" width="${sq}" height="${sq}" rx="3" fill="${COLORS[i]}" opacity="${Math.max(alpha, 0.08)}" stroke="#ccc" stroke-width="1"/>`;
      }
    }
  }

  // Chevrons: colored lines from captured cells to blend column
  for (let i = 0; i < numPasses; i++) {
    const fromX = passCX[i] + sq / 2 + 2;
    const toX = blendCX - sq / 2 - 2;
    const cy = depthCY[i];
    svg += `<line x1="${fromX}" y1="${cy}" x2="${toX - 4}" y2="${cy}" stroke="${COLORS[i]}" stroke-width="1" opacity="0.3"/>`;
    svg += `<path d="M${toX - 5},${cy - 3} L${toX - 1},${cy} L${toX - 5},${cy + 3}" fill="none" stroke="${COLORS[i]}" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>`;
  }

  // Blend column: show each captured fragment with opacity = effective weight
  for (let i = 0; i < n; i++) {
    const rx = blendCX - sq / 2;
    const ry = depthCY[i] - sq / 2;

    if (i < numPasses) {
      const weight = alpha * Math.pow(1 - alpha, i);
      const displayOpacity = Math.max(0.08, weight);
      svg += `<rect x="${rx}" y="${ry}" width="${sq}" height="${sq}" rx="3" fill="${COLORS[i]}" opacity="${displayOpacity}" stroke="#aaa" stroke-width="0.5"/>`;
    } else {
      svg += `<rect x="${rx}" y="${ry}" width="${sq}" height="${sq}" rx="3" fill="none" stroke="#ddd" stroke-width="0.5" stroke-dasharray="2,2"/>`;
    }
  }

  // Horizontal separator below blend column (the "sum line")
  const sumLineY = depthCY[n - 1] + sq / 2 + finalGap / 2;
  svg += `<line x1="${blendCX - sq / 2 - 2}" y1="${sumLineY}" x2="${blendCX + sq / 2 + 2}" y2="${sumLineY}" stroke="#555" stroke-width="1"/>`;

  // Compute final blended color (back-to-front compositing over white)
  let cR = 1, cG = 1, cB = 1;
  for (let i = numPasses - 1; i >= 0; i--) {
    const [r, g, b] = hexToRGB(COLORS[i]);
    cR = r * alpha + cR * (1 - alpha);
    cG = g * alpha + cG * (1 - alpha);
    cB = b * alpha + cB * (1 - alpha);
  }

  // Final result swatch
  svg += `<rect x="${blendCX - sq / 2}" y="${finalCY - sq / 2}" width="${sq}" height="${sq}" rx="3" fill="${toCSS(cR, cG, cB)}" stroke="#333" stroke-width="1.5"/>`;

  const el = document.createElement('div');
  el.id = 'peel-diagram-fig';
  el.style.cssText = 'padding: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;';
  el.innerHTML = `<svg viewBox="0 0 ${svgW} ${svgH}" width="100%" style="display: block; font-family: var(--sans-serif);">${svg}</svg>`;
  return el;
}

export function createDualPeelDiagram(opacity, peelLayers) {
  const alpha = opacity;
  const n = COLORS.length;
  const numPasses = Math.min(peelLayers, n);

  const sq = 20;
  const colW = 30;
  const rowH = 30;
  const labelW = 28;
  const headerH = 16;

  // Always show n pass columns (matching peel diagram)
  const passCX = Array.from({length: n}, (_, i) => labelW + sq / 2 + i * colW);

  // Depth row centers
  const depthCY = Array.from({length: n}, (_, i) => headerH + sq / 2 + i * rowH);

  // Blend column
  const blendGap = 18;
  const blendCX = passCX[n - 1] + colW / 2 + blendGap + sq / 2;

  // Final result row
  const finalGap = 8;
  const finalCY = depthCY[n - 1] + rowH / 2 + finalGap + sq / 2;

  const svgW = PEEL_DIAGRAM_W;
  const svgH = finalCY + sq / 2 + 8;

  // Precompute capture pass for each fragment
  const capturePass = new Array(n).fill(-1);
  const peeled = new Set();
  const capturedFront = [];
  const capturedBack = [];

  for (let pass = 0; pass < numPasses; pass++) {
    const remaining = [];
    for (let i = 0; i < n; i++) if (!peeled.has(i)) remaining.push(i);
    if (remaining.length === 0) break;
    const nearest = remaining[0];
    const farthest = remaining[remaining.length - 1];
    capturePass[nearest] = pass;
    peeled.add(nearest);
    capturedFront.push(nearest);
    if (nearest !== farthest) {
      capturePass[farthest] = pass;
      peeled.add(farthest);
      capturedBack.push(farthest);
    }
  }

  let svg = '';

  // Near/Far labels
  svg += `<text x="${labelW - 4}" y="${depthCY[0] + 4}" font-size="9" fill="#999" text-anchor="end">Near</text>`;
  svg += `<text x="${labelW - 4}" y="${depthCY[n - 1] + 4}" font-size="9" fill="#999" text-anchor="end">Far</text>`;

  // Pass headers
  for (let p = 0; p < n; p++) {
    const active = p < numPasses;
    svg += `<text x="${passCX[p]}" y="10" font-size="8" fill="${active ? '#666' : '#ccc'}" text-anchor="middle">Pass ${p + 1}</text>`;
  }

  // Blend column header
  svg += `<text x="${blendCX}" y="10" font-size="8" font-weight="600" fill="#555" text-anchor="middle">Blend</text>`;

  // Vertical separator
  const sepX = (passCX[n - 1] + colW / 2 + blendCX - sq / 2) / 2;
  svg += `<line x1="${sepX}" y1="${headerH}" x2="${sepX}" y2="${depthCY[n - 1] + sq / 2}" stroke="#ddd" stroke-width="0.5"/>`;

  // Grid cells
  for (let i = 0; i < n; i++) {
    for (let p = 0; p < n; p++) {
      const cx = passCX[p];
      const cy = depthCY[i];
      const rx = cx - sq / 2;
      const ry = cy - sq / 2;

      if (p >= numPasses) {
        svg += `<rect x="${rx}" y="${ry}" width="${sq}" height="${sq}" rx="3" fill="${COLORS[i]}" opacity="0.1" stroke="#eee" stroke-width="0.5"/>`;
      } else if (capturePass[i] >= 0 && capturePass[i] < p) {
        svg += `<rect x="${rx}" y="${ry}" width="${sq}" height="${sq}" rx="3" fill="none" stroke="${COLORS[i]}" stroke-width="1" stroke-dasharray="3,2" opacity="0.3"/>`;
      } else if (capturePass[i] === p) {
        svg += `<rect x="${rx}" y="${ry}" width="${sq}" height="${sq}" rx="3" fill="${COLORS[i]}" opacity="${Math.max(alpha, 0.08)}" stroke="#222" stroke-width="2"/>`;
      } else {
        svg += `<rect x="${rx}" y="${ry}" width="${sq}" height="${sq}" rx="3" fill="${COLORS[i]}" opacity="${Math.max(alpha, 0.08)}" stroke="#ccc" stroke-width="1"/>`;
      }
    }
  }

  // Chevrons from captured cells to blend column
  for (let i = 0; i < n; i++) {
    if (capturePass[i] >= 0) {
      const fromX = passCX[capturePass[i]] + sq / 2 + 2;
      const toX = blendCX - sq / 2 - 2;
      const cy = depthCY[i];
      svg += `<line x1="${fromX}" y1="${cy}" x2="${toX - 4}" y2="${cy}" stroke="${COLORS[i]}" stroke-width="1" opacity="0.3"/>`;
      svg += `<path d="M${toX - 5},${cy - 3} L${toX - 1},${cy} L${toX - 5},${cy + 3}" fill="none" stroke="${COLORS[i]}" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>`;
    }
  }

  // Composite order: back layers first, then front layers (innermost first)
  const compositeOrder = [];
  for (const idx of capturedBack) compositeOrder.push(idx);
  for (let i = capturedFront.length - 1; i >= 0; i--) {
    compositeOrder.push(capturedFront[i]);
  }

  // Effective weight per fragment based on compositing position
  const effectiveWeight = new Array(n).fill(0);
  const total = compositeOrder.length;
  for (let j = 0; j < total; j++) {
    effectiveWeight[compositeOrder[j]] = alpha * Math.pow(1 - alpha, total - 1 - j);
  }

  // Blend column swatches
  for (let i = 0; i < n; i++) {
    const rx = blendCX - sq / 2;
    const ry = depthCY[i] - sq / 2;

    if (capturePass[i] >= 0) {
      const displayOpacity = Math.max(0.08, effectiveWeight[i]);
      svg += `<rect x="${rx}" y="${ry}" width="${sq}" height="${sq}" rx="3" fill="${COLORS[i]}" opacity="${displayOpacity}" stroke="#aaa" stroke-width="0.5"/>`;
    } else {
      svg += `<rect x="${rx}" y="${ry}" width="${sq}" height="${sq}" rx="3" fill="none" stroke="#ddd" stroke-width="0.5" stroke-dasharray="2,2"/>`;
    }
  }

  // Sum line and final result
  const sumLineY = depthCY[n - 1] + sq / 2 + finalGap / 2;
  svg += `<line x1="${blendCX - sq / 2 - 2}" y1="${sumLineY}" x2="${blendCX + sq / 2 + 2}" y2="${sumLineY}" stroke="#555" stroke-width="1"/>`;

  let cR = 1, cG = 1, cB = 1;
  for (const idx of compositeOrder) {
    const [r, g, b] = hexToRGB(COLORS[idx]);
    cR = r * alpha + cR * (1 - alpha);
    cG = g * alpha + cG * (1 - alpha);
    cB = b * alpha + cB * (1 - alpha);
  }

  svg += `<rect x="${blendCX - sq / 2}" y="${finalCY - sq / 2}" width="${sq}" height="${sq}" rx="3" fill="${toCSS(cR, cG, cB)}" stroke="#333" stroke-width="1.5"/>`;

  const el = document.createElement('div');
  el.id = 'dual-peel-diagram-fig';
  el.style.cssText = 'padding: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;';
  el.innerHTML = `<svg viewBox="0 0 ${svgW} ${svgH}" width="100%" style="display: block; font-family: var(--sans-serif);">${svg}</svg>`;
  return el;
}
