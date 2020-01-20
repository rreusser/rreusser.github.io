#pragma glslify: export(csin)
#pragma glslify: sinhcosh = require(./lib/sinhcosh)

vec2 csin (vec2 z) {
  return sinhcosh(z.y).yx * vec2(sin(z.x), cos(z.x));
}
