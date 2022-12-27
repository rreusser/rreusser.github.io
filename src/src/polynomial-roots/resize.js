const createZoom = require('./zoom');
const d3 = require('./d3.min.js');

module.exports = function createResize (el, xScale, yScale, onZoom) {
  return function () {
    const aspect = window.innerWidth / window.innerHeight;

    const xDom = xScale.domain();
    const yDom = yScale.domain();
    const yRng = 0.5 * (yDom[1] - yDom[0]);
    const xCen = 0.5 * (xDom[1] + xDom[0]);
    const xMin = xCen - yRng * aspect;
    const xMax = xCen + yRng * aspect;
    const yMin = yDom[0];
    const yMax = yDom[1];

    xScale.domain([xMin, xMax]).range([0, window.innerWidth]);
    yScale.domain([yMin, yMax]).range([window.innerHeight, 0]);

    el.__zoom = null;
    d3.select(el).call(createZoom(xScale, yScale, onZoom));

    onZoom && onZoom();
  }
}
