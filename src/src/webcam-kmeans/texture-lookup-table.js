module.exports = function createTextureLUT (w, h, stride) {
  stride = stride || 2;
  var n = w * h * stride;

  var out = new Float32Array(n);

  for (var i = 0, iStride = 0; iStride < n; i++, iStride += stride) {
    out[iStride] = ((i % w) + 0.5) / w;
    out[iStride + 1] = (((i / w) | 0) + 0.5) / h;
  }

  return out;
};
