const d3 = require('d3');

function createZoom(scales, onZoom) {
  const xOriginal = scales.x.copy();
  const yOriginal = scales.y.copy();

  return d3.zoom()
    .scaleExtent([1e-5, 1e5])
    .on("zoom", function () {
    const t = d3.event.transform;
    let range = scales.x.range().map(t.invertX, t);
    scales.x.domain(xOriginal.domain());
    scales.x.domain(range.map(scales.x.invert, scales.x));

    range = scales.y.range().map(t.invertY, t);
    scales.y.domain(yOriginal.domain());
    scales.y.domain(range.map(scales.y.invert, scales.y));
    scales.dirty = true;

    onZoom && onZoom();
  });
}

module.exports = function attachPanZoom(el, scales, onZoom) {
  const xRange = scales.x.range();
  const yRange = scales.y.range();
  const aspect = (xRange[1] - xRange[0]) / (yRange[0] - yRange[1]);

  const xDom = scales.x.domain();
  const yDom = scales.y.domain();
  const yRng = 0.5 * (yDom[1] - yDom[0]);
  const xCen = 0.5 * (xDom[1] + xDom[0]);
  const xMin = xCen - yRng * aspect;
  const xMax = xCen + yRng * aspect;
  const yMin = yDom[0];
  const yMax = yDom[1];

  scales.x.domain([xMin, xMax]).range(xRange);
  scales.y.domain([yMin, yMax]).range(yRange);

  el.__zoom = null;
  d3.select(el).call(createZoom(scales, onZoom));

  onZoom && onZoom();
}
