function mercatorXToLon(mx) { return mx * 360 - 180; }
function mercatorYToLat(my) { return Math.atan(Math.sinh(Math.PI * (1 - 2 * my))) * 180 / Math.PI; }

const EARTH_RADIUS_M = 6371000;
const M_TO_FT = 3.28084;
const M_TO_MI = 0.000621371;

function haversineDistance(lon1, lat1, lon2, lat2) {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

function niceInterval(range, targetTicks) {
  const rough = range / targetTicks;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const frac = rough / pow;
  let nice;
  if (frac <= 1.5) nice = 1;
  else if (frac <= 3) nice = 2;
  else if (frac <= 7) nice = 5;
  else nice = 10;
  return nice * pow;
}

// Slope magnitude (in percent) -> CSS color string. Green for gentle, through
// yellow/orange/red for steep, clamped at SLOPE_MAX for the legend ramp.
const SLOPE_MAX = 35;
function slopeColor(slopePct) {
  const t = Math.min(1, Math.abs(slopePct) / SLOPE_MAX);
  // Hue 120 (green) -> 0 (red); darken slightly at the top end so very-steep
  // sections read distinctly from merely-steep.
  const hue = 120 * (1 - t);
  const lightness = 50 - 12 * t;
  return `hsl(${hue.toFixed(1)}, 78%, ${lightness.toFixed(1)}%)`;
}

export class ElevationProfile {
  constructor() {
    this._panel = null;
    this._canvas = null;
    this._ctx = null;
    this._title = null;
    this._resizeObserver = null;
    this._layerId = null;
    this._lineColor = null;
    this._distances = null;
    this._elevations = null;
    this._coords = null;             // per-vertex { mercatorX, mercatorY }
    this._segmentBreaks = null;      // distances (m) at which polylines join
    this._onHover = null;            // (point|null) callback
    this._boundDraw = this._draw.bind(this);
    this._drawScheduled = false;
  }

  /** Callback invoked with the hovered point ({mercatorX, mercatorY, elevation, distanceM}) or null. */
  set onHover(fn) { this._onHover = fn; }

  /** Callback invoked with the active layer id (or null) whenever it changes. */
  set onActiveChange(fn) { this._onActiveChange = fn; }

  createDOM() {
    const panel = document.createElement('div');
    panel.className = 'elevation-profile-panel';

    const header = document.createElement('div');
    header.className = 'elevation-profile-header';

    const title = document.createElement('span');
    title.className = 'elevation-profile-title';
    header.appendChild(title);

    // Compact slope-color legend. The gradient is generated from slopeColor()
    // sampled at fixed stops so the chart and legend stay in sync.
    const legend = document.createElement('div');
    legend.className = 'elevation-profile-legend';
    const stops = [0, 5, 10, 15, 20, 25, 30, 35];
    const css = stops.map((s, i) => `${slopeColor(s)} ${(i / (stops.length - 1) * 100).toFixed(1)}%`).join(', ');
    legend.innerHTML = `
      <span class="elevation-profile-legend-label">0%</span>
      <span class="elevation-profile-legend-bar" style="background:linear-gradient(to right, ${css})"></span>
      <span class="elevation-profile-legend-label">${SLOPE_MAX}%+</span>
    `;
    header.appendChild(legend);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'elevation-profile-close';
    closeBtn.title = 'Close';
    closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>`;
    closeBtn.addEventListener('click', () => this.hide());
    header.appendChild(closeBtn);

    panel.appendChild(header);

    const canvas = document.createElement('canvas');
    canvas.className = 'elevation-profile-canvas';
    panel.appendChild(canvas);

    this._panel = panel;
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._title = title;

    this._resizeObserver = new ResizeObserver(() => this._scheduleDraw());
    this._resizeObserver.observe(panel);

    canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    canvas.addEventListener('mouseleave', () => this._onMouseLeave());
    this._hoverIndex = -1;

    return panel;
  }

  show(layerId, title, data, lineColor) {
    const prev = this._layerId;
    this._layerId = layerId;
    this._lineColor = lineColor;
    this._title.textContent = title;
    this._computeDistances(data);
    this._panel.classList.add('visible');
    this._scheduleDraw();
    if (prev !== layerId) this._onActiveChange?.(layerId);
  }

  update(data) {
    if (!this._layerId) return;
    this._computeDistances(data);
    this._scheduleDraw();
  }

  hide() {
    const prev = this._layerId;
    this._panel.classList.remove('visible');
    this._layerId = null;
    this._distances = null;
    this._elevations = null;
    this._coords = null;
    this._segmentBreaks = null;
    this._segmentSlopes = null;
    this._vertexSlopes = null;
    this._hoverIndex = -1;
    this._onHover?.(null);
    if (prev !== null) this._onActiveChange?.(null);
  }

  get activeLayerId() {
    return this._layerId;
  }

  destroy() {
    if (this._resizeObserver) this._resizeObserver.disconnect();
    if (this._panel && this._panel.parentElement) this._panel.parentElement.removeChild(this._panel);
  }

  _computeDistances(data) {
    if (!data) {
      this._distances = null;
      this._elevations = null;
      this._coords = null;
      this._segmentBreaks = null;
      this._segmentSlopes = null;
      this._vertexSlopes = null;
      return;
    }
    const allDist = [];
    const allElev = [];
    const allCoords = [];
    const breaks = [];
    let cumDist = 0;

    for (let pi = 0; pi < data.length; pi++) {
      const polyline = data[pi];
      if (pi > 0) breaks.push(cumDist);
      for (let i = 0; i < polyline.coords.length; i++) {
        if (i > 0) {
          const prev = polyline.coords[i - 1];
          const cur = polyline.coords[i];
          const lon1 = mercatorXToLon(prev.mercatorX);
          const lat1 = mercatorYToLat(prev.mercatorY);
          const lon2 = mercatorXToLon(cur.mercatorX);
          const lat2 = mercatorYToLat(cur.mercatorY);
          cumDist += haversineDistance(lon1, lat1, lon2, lat2);
        }
        allDist.push(cumDist);
        allElev.push(polyline.elevations[i]);
        allCoords.push(polyline.coords[i]);
      }
    }

    this._distances = allDist;
    this._elevations = allElev;
    this._coords = allCoords;
    this._segmentBreaks = breaks;
    this._computeSlopes();
  }

  // Compute per-segment slope (dElev/dDist as a fraction) smoothed over a
  // small distance window so per-vertex noise doesn't dominate the coloring.
  // Segments with non-positive or unloaded elevations get NaN so the renderer
  // can skip them (matching the existing zero-elevation gap handling).
  _computeSlopes() {
    const dist = this._distances;
    const elev = this._elevations;
    if (!dist || dist.length < 2) {
      this._segmentSlopes = null;
      this._vertexSlopes = null;
      return;
    }
    const n = dist.length;
    const rawSlopes = new Float64Array(n - 1);
    const midDist = new Float64Array(n - 1);
    for (let i = 0; i < n - 1; i++) {
      const e1 = elev[i];
      const e2 = elev[i + 1];
      const dd = dist[i + 1] - dist[i];
      midDist[i] = (dist[i] + dist[i + 1]) * 0.5;
      if (dd <= 0 || !(e1 > 0) || !(e2 > 0)) {
        rawSlopes[i] = NaN;
      } else {
        rawSlopes[i] = (e2 - e1) / dd;
      }
    }

    // Centered moving-average smoothing with a ~80m window. Walking outward
    // until the window is exceeded keeps the cost linear amortized.
    const HALF_WINDOW = 40;
    const smoothed = new Float64Array(n - 1);
    for (let i = 0; i < n - 1; i++) {
      if (isNaN(rawSlopes[i])) { smoothed[i] = NaN; continue; }
      let sum = rawSlopes[i], cnt = 1;
      for (let j = i + 1; j < n - 1; j++) {
        if (midDist[j] - midDist[i] > HALF_WINDOW) break;
        if (!isNaN(rawSlopes[j])) { sum += rawSlopes[j]; cnt++; }
      }
      for (let j = i - 1; j >= 0; j--) {
        if (midDist[i] - midDist[j] > HALF_WINDOW) break;
        if (!isNaN(rawSlopes[j])) { sum += rawSlopes[j]; cnt++; }
      }
      smoothed[i] = sum / cnt;
    }
    this._segmentSlopes = smoothed;

    // Per-vertex slope = average of adjacent segment slopes (one-sided at ends).
    const vSlopes = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const a = i > 0 ? smoothed[i - 1] : NaN;
      const b = i < n - 1 ? smoothed[i] : NaN;
      const va = isNaN(a) ? null : a;
      const vb = isNaN(b) ? null : b;
      if (va == null && vb == null) vSlopes[i] = NaN;
      else if (va == null) vSlopes[i] = vb;
      else if (vb == null) vSlopes[i] = va;
      else vSlopes[i] = (va + vb) * 0.5;
    }
    this._vertexSlopes = vSlopes;
  }

  _scheduleDraw() {
    if (this._drawScheduled) return;
    this._drawScheduled = true;
    requestAnimationFrame(this._boundDraw);
  }

  _draw() {
    this._drawScheduled = false;
    if (!this._panel.classList.contains('visible') || !this._distances) return;

    const canvas = this._canvas;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(rect.width * dpr);
    const h = Math.floor(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const ctx = this._ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const distances = this._distances;
    const elevations = this._elevations;
    if (distances.length < 2) return;

    const marginLeft = 56;
    const marginRight = 16;
    const marginTop = 10;
    const marginBottom = 24;

    const plotW = rect.width - marginLeft - marginRight;
    const plotH = rect.height - marginTop - marginBottom;
    if (plotW <= 0 || plotH <= 0) return;

    // Compute elevation range, excluding zero-elevation (unloaded) vertices
    let minElev = Infinity, maxElev = -Infinity;
    for (const e of elevations) {
      if (e > 0) {
        if (e < minElev) minElev = e;
        if (e > maxElev) maxElev = e;
      }
    }
    if (!isFinite(minElev)) return; // no valid elevations

    // Convert to feet
    const minFt = minElev * M_TO_FT;
    const maxFt = maxElev * M_TO_FT;
    const rangeFt = maxFt - minFt || 100;
    const padFt = rangeFt * 0.05;
    const yMinFt = minFt - padFt;
    const yMaxFt = maxFt + padFt;

    const totalDist = distances[distances.length - 1];
    if (totalDist <= 0) return;
    const totalMi = totalDist * M_TO_MI;

    function xScale(d) { return marginLeft + (d * M_TO_MI / totalMi) * plotW; }
    function yScale(ft) { return marginTop + plotH - ((ft - yMinFt) / (yMaxFt - yMinFt)) * plotH; }

    // Line color
    const lc = this._lineColor || [1, 0.53, 0, 1];
    const r = Math.round(lc[0] * 255);
    const g = Math.round(lc[1] * 255);
    const b = Math.round(lc[2] * 255);
    const strokeColor = `rgb(${r},${g},${b})`;

    // Gridlines
    ctx.font = '10px system-ui, sans-serif';
    ctx.textBaseline = 'middle';

    // Y gridlines (elevation in ft)
    const yInterval = niceInterval(yMaxFt - yMinFt, 4);
    const yStart = Math.ceil(yMinFt / yInterval) * yInterval;
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#666';
    ctx.textAlign = 'right';
    for (let v = yStart; v <= yMaxFt; v += yInterval) {
      const py = yScale(v);
      ctx.beginPath();
      ctx.moveTo(marginLeft, py);
      ctx.lineTo(marginLeft + plotW, py);
      ctx.stroke();
      const label = v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString();
      ctx.fillText(label + ' ft', marginLeft - 4, py);
    }

    // X gridlines (distance in mi)
    const xInterval = niceInterval(totalMi, 5);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xStart = Math.ceil(0 / xInterval) * xInterval || xInterval;
    for (let v = xStart; v <= totalMi; v += xInterval) {
      const px = marginLeft + (v / totalMi) * plotW;
      ctx.beginPath();
      ctx.moveTo(px, marginTop);
      ctx.lineTo(px, marginTop + plotH);
      ctx.stroke();
      ctx.fillStyle = '#666';
      ctx.fillText(v.toFixed(1) + ' mi', px, marginTop + plotH + 4);
    }

    // Segment-break vertical lines (where polylines join). Theme-neutral
    // mid-gray so they read on both light and dark backgrounds, with
    // longer dashes than the x-axis gridlines so they're distinguishable.
    if (this._segmentBreaks && this._segmentBreaks.length > 0) {
      ctx.strokeStyle = 'rgba(120,120,120,0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 4]);
      for (const d of this._segmentBreaks) {
        const px = xScale(d);
        ctx.beginPath();
        ctx.moveTo(px, marginTop);
        ctx.lineTo(px, marginTop + plotH);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Draw filled area and stroke, breaking at zero-elevation gaps
    ctx.save();
    ctx.beginPath();
    ctx.rect(marginLeft, marginTop, plotW, plotH);
    ctx.clip();

    // Per-segment fill colored by slope. Each segment renders as a quad
    // (baseline-left, top-left, top-right, baseline-right) with a horizontal
    // gradient interpolating between the two vertex-slope colors so the
    // coloring reads continuously across the chart.
    const segSlopes = this._segmentSlopes;
    const vSlopes = this._vertexSlopes;
    const yBaseline = yScale(yMinFt);
    if (segSlopes) {
      for (let i = 0; i < distances.length - 1; i++) {
        const e1 = elevations[i];
        const e2 = elevations[i + 1];
        const dd = distances[i + 1] - distances[i];
        if (!(e1 > 0) || !(e2 > 0) || dd <= 0) continue;
        if (isNaN(segSlopes[i])) continue;

        const x1 = xScale(distances[i]);
        const x2 = xScale(distances[i + 1]);
        const y1 = yScale(e1 * M_TO_FT);
        const y2 = yScale(e2 * M_TO_FT);

        const s1 = isNaN(vSlopes[i]) ? segSlopes[i] : vSlopes[i];
        const s2 = isNaN(vSlopes[i + 1]) ? segSlopes[i] : vSlopes[i + 1];
        const c1 = slopeColor(s1 * 100);
        const c2 = slopeColor(s2 * 100);
        const grad = ctx.createLinearGradient(x1, 0, x2, 0);
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x1, yBaseline);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2, yBaseline);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Stroke the top edge
    let inRun = false;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < distances.length; i++) {
      const e = elevations[i];
      if (e > 0) {
        const px = xScale(distances[i]);
        const py = yScale(e * M_TO_FT);
        if (!inRun) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          inRun = true;
        } else {
          ctx.lineTo(px, py);
        }
      } else {
        if (inRun) {
          ctx.stroke();
          inRun = false;
        }
      }
    }
    if (inRun) ctx.stroke();

    // Hover crosshair
    if (this._hoverIndex >= 0 && this._hoverIndex < distances.length) {
      const hi = this._hoverIndex;
      const e = elevations[hi];
      if (e > 0) {
        const px = xScale(distances[hi]);
        const py = yScale(e * M_TO_FT);

        // Vertical line
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(px, marginTop);
        ctx.lineTo(px, marginTop + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        // Dot
        ctx.fillStyle = strokeColor;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Tooltip
        const elevFt = Math.round(e * M_TO_FT).toLocaleString();
        const distMi = (distances[hi] * M_TO_MI).toFixed(2);
        const slope = this._vertexSlopes ? this._vertexSlopes[hi] : NaN;
        const slopeStr = isNaN(slope) ? '' : `  /  ${(slope * 100 >= 0 ? '+' : '')}${(slope * 100).toFixed(1)}%`;
        const text = `${elevFt} ft  /  ${distMi} mi${slopeStr}`;
        ctx.font = '11px system-ui, sans-serif';
        const tm = ctx.measureText(text);
        const tw = tm.width + 10;
        const th = 20;
        let tx = px + 8;
        if (tx + tw > marginLeft + plotW) tx = px - tw - 8;
        let ty = py - 24;
        if (ty < marginTop) ty = py + 8;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.beginPath();
        ctx.roundRect(tx, ty, tw, th, 3);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, tx + 5, ty + th / 2);
      }
    }

    ctx.restore();
  }

  _onMouseMove(e) {
    if (!this._distances || this._distances.length < 2) return;
    const rect = this._canvas.getBoundingClientRect();
    const marginLeft = 56;
    const marginRight = 16;
    const plotW = rect.width - marginLeft - marginRight;
    if (plotW <= 0) return;

    const x = e.clientX - rect.left;
    const frac = (x - marginLeft) / plotW;
    if (frac < 0 || frac > 1) { this._hoverIndex = -1; this._scheduleDraw(); return; }

    const targetDist = frac * this._distances[this._distances.length - 1];
    // Binary search for nearest
    let lo = 0, hi = this._distances.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this._distances[mid] < targetDist) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0 && Math.abs(this._distances[lo - 1] - targetDist) < Math.abs(this._distances[lo] - targetDist)) {
      lo--;
    }

    if (this._hoverIndex !== lo) {
      this._hoverIndex = lo;
      this._scheduleDraw();
      this._emitHover();
    }
  }

  _onMouseLeave() {
    if (this._hoverIndex >= 0) {
      this._hoverIndex = -1;
      this._scheduleDraw();
      this._onHover?.(null);
    }
  }

  _emitHover() {
    if (!this._onHover) return;
    const i = this._hoverIndex;
    if (i < 0 || !this._coords || !this._elevations) { this._onHover(null); return; }
    const e = this._elevations[i];
    if (!(e > 0)) { this._onHover(null); return; }
    const c = this._coords[i];
    this._onHover({
      mercatorX: c.mercatorX,
      mercatorY: c.mercatorY,
      elevation: e,
      distanceM: this._distances[i],
    });
  }
}
