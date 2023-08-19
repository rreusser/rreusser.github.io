module.exports = function mat3fromLinearScales(out, scales) {
  let xDomain = scales.x.domain();
  let yDomain = scales.y.domain();
  let xs = 2 / (xDomain[1] - xDomain[0]);
  let ys = 2 / (yDomain[1] - yDomain[0]);

  out[0] = xs;
  out[1] = 0;
  out[2] = 0;

  out[3] = 0;
  out[4] = ys;
  out[5] = 0;

  out[6] = -1 - xs * xDomain[0];
  out[7] = -1 - ys * yDomain[0];
  out[8] = 1;

  return out;
}
