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
    this._boundDraw = this._draw.bind(this);
    this._drawScheduled = false;
  }

  createDOM() {
    const panel = document.createElement('div');
    panel.className = 'elevation-profile-panel';

    const header = document.createElement('div');
    header.className = 'elevation-profile-header';

    const title = document.createElement('span');
    title.className = 'elevation-profile-title';
    header.appendChild(title);

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
    this._layerId = layerId;
    this._lineColor = lineColor;
    this._title.textContent = title;
    this._computeDistances(data);
    this._panel.classList.add('visible');
    this._scheduleDraw();
  }

  update(data) {
    if (!this._layerId) return;
    this._computeDistances(data);
    this._scheduleDraw();
  }

  hide() {
    this._panel.classList.remove('visible');
    this._layerId = null;
    this._distances = null;
    this._elevations = null;
    this._hoverIndex = -1;
  }

  get activeLayerId() {
    return this._layerId;
  }

  destroy() {
    if (this._resizeObserver) this._resizeObserver.disconnect();
    if (this._panel && this._panel.parentElement) this._panel.parentElement.removeChild(this._panel);
  }

  _computeDistances(data) {
    if (!data) { this._distances = null; this._elevations = null; return; }
    const allDist = [];
    const allElev = [];
    let cumDist = 0;

    for (const polyline of data) {
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
      }
    }

    this._distances = allDist;
    this._elevations = allElev;
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
    const fillColor = `rgba(${r},${g},${b},0.3)`;

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

    // Draw filled area and stroke, breaking at zero-elevation gaps
    ctx.save();
    ctx.beginPath();
    ctx.rect(marginLeft, marginTop, plotW, plotH);
    ctx.clip();

    let inRun = false;
    // Fill
    ctx.fillStyle = fillColor;
    for (let i = 0; i < distances.length; i++) {
      const e = elevations[i];
      if (e > 0) {
        const px = xScale(distances[i]);
        const py = yScale(e * M_TO_FT);
        if (!inRun) {
          ctx.beginPath();
          ctx.moveTo(px, yScale(yMinFt));
          ctx.lineTo(px, py);
          inRun = true;
        } else {
          ctx.lineTo(px, py);
        }
      } else {
        if (inRun) {
          // Close the fill to the bottom
          const prevPx = xScale(distances[i - 1]);
          ctx.lineTo(prevPx, yScale(yMinFt));
          ctx.closePath();
          ctx.fill();
          inRun = false;
        }
      }
    }
    if (inRun) {
      const lastPx = xScale(distances[distances.length - 1]);
      ctx.lineTo(lastPx, yScale(yMinFt));
      ctx.closePath();
      ctx.fill();
    }

    // Stroke the top edge
    inRun = false;
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
        const text = `${elevFt} ft  /  ${distMi} mi`;
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
    }
  }

  _onMouseLeave() {
    if (this._hoverIndex >= 0) {
      this._hoverIndex = -1;
      this._scheduleDraw();
    }
  }
}
