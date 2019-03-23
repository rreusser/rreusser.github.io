'use strict';

module.exports = function createArrowField (field, xmin, xmax, ymin, ymax, res) {
  var ixmin = Math.floor(xmin / res);
  var ixmax = Math.floor(xmax / res);
  var jymin = Math.floor(ymin / res);
  var jymax = Math.floor(ymax / res);

  var arrowData = [];

  for (var j = jymin; j < jymax; j++) {
    var y = j * res;
    for (var i = ixmin; i <= ixmax; i++) {
      var x = i * res;
      var dir = field(x, y);
      if (isFinite(dir[0]) && !isNaN(dir[0]) && isFinite(dir[1]) && !isNaN(dir[1])) {
        arrowData.push([x, y]);
        arrowData.push([dir[0], dir[1]]);
      }
    }
  }

  return arrowData;
};
