#pragma glslify: export(csincos)
#pragma glslify: sinhcosh = require(./lib/sinhcosh)

vec4 csincos (vec2 z) {
  float c = cos(z.x);
  float s = sin(z.x);
  return sinhcosh(z.y).yxyx * vec4(s, c, c, -s);
}

