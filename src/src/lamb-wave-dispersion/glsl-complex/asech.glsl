#pragma glslify: export(casech)

#pragma glslify: cacosh = require(./acosh)

vec2 casech(vec2 z) {
  return cacosh(vec2(z.x, -z.y) / dot(z, z));
}
