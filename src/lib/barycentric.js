module.exports = function (cells, positions, opts) {
  if (!opts) opts = {};
  var vars = opts.attributes ? {} : null;
  var vkeys = vars && Object.keys(opts.attributes)
  if (vars) {
    var vptrs = [];
    var vsize = [];
    for (var k = 0; k < vkeys.length; k++) {
      vptrs[k] = 0;
      vars[vkeys[k]] = []
      vsize[k] = Math.round(opts.attributes[vkeys[k]].length * 3 / positions.length);
    }
  }

  var i, j, cellIdx;
  var vptr = 0;
  var bptr = 0;
  var cptr = 0;
  var pts = [];
  var barycentric = [];
  var outCells = [];

  var c = 0;
  for (cellPtr = 0; cellPtr < cells.length; cellPtr+=3) {
    cellIdx = cells[cellPtr] * 3;
    pts[vptr++] = positions[cellIdx];
    pts[vptr++] = positions[cellIdx + 1];
    pts[vptr++] = positions[cellIdx + 2];

    cellIdx = cells[cellPtr + 1] * 3;
    pts[vptr++] = positions[cellIdx];
    pts[vptr++] = positions[cellIdx + 1];
    pts[vptr++] = positions[cellIdx + 2];

    cellIdx = cells[cellPtr + 2] * 3;
    pts[vptr++] = positions[cellIdx];
    pts[vptr++] = positions[cellIdx + 1];
    pts[vptr++] = positions[cellIdx + 2];

    barycentric[bptr++] = 0;
    barycentric[bptr++] = 0;
    barycentric[bptr++] = 1;
    barycentric[bptr++] = 0;
    barycentric[bptr++] = 0;
    barycentric[bptr++] = 1;

    outCells[cptr] = cptr++;
    outCells[cptr] = cptr++;
    outCells[cptr] = cptr++;

    if (vkeys) {
      for (j = 0; j < vkeys.length; j++) {
        var vkey = vkeys[j];
        for (i = 0; i < 3; i++) {
          for (k = 0; k < vsize[j]; k++) {
            vars[vkey][vptrs[j]++] = opts.attributes[vkey][cells[cellPtr + i] * vsize[j] + k];
          }
        }
      }
    }
  }

  var ret = {
    positions: pts,
    cells: outCells,
    attributes: vars,
    barycentric: barycentric
  };

  return ret;
};
