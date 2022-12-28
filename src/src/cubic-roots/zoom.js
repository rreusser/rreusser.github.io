const d3 = require('./d3.min.js');

module.exports = function createZoom (xScale, yScale, onZoom) {
  const xOriginal = xScale.copy();
  const yOriginal = yScale.copy();

  return d3.zoom().on('zoom', function ({transform: t}) {

    let range = xScale.range().map(t.invertX, t);
    xScale.domain(xOriginal.domain())
    xScale.domain(range.map(xScale.invert, xScale));

    range = yScale.range().map(t.invertY, t);
    yScale.domain(yOriginal.domain())
    yScale.domain(range.map(yScale.invert, yScale));

    onZoom && onZoom();
  });
}
