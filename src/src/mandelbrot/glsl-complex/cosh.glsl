#pragma glslify: export(ccosh)

#pragma glslify: sinhcosh = require('./lib/sinhcosh)

vec2 ccosh (vec2 z) {
  return sinhcosh(z.x).yx * vec2(cos(z.y), sin(z.y));
}
