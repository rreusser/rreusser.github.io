#pragma glslify: export(ccos)
#pragma glslify: sinhcosh = require(./lib/sinhcosh)

vec2 ccos (vec2 z) {
  return sinhcosh(z.y) * vec2(cos(z.x), -sin(z.x));
}
