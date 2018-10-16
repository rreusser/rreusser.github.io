'use strict';

module.exports = function (a) {
  var tmp = a[0];
  a[0] = a[1];
  a[1] = tmp;
  return a;
}
