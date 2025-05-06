module.exports = function mat4fromMat3(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = 0;
  out[3] = a[2];

  out[4] = a[3];
  out[5] = a[4];
  out[6] = 0;
  out[7] = a[5];

  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;

  out[12] = a[6];
  out[13] = a[7];
  out[14] = 0;
  out[15] = a[8];
}
