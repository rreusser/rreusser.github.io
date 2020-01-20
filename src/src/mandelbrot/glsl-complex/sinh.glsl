#pragma glslify: export(csinh)

#pragma glslify: sinhcosh = require('./lib/sinhcosh)

vec2 csinh (vec2 z) {
  return sinhcosh(z.x) * vec2(cos(z.y), sin(z.y));
}
