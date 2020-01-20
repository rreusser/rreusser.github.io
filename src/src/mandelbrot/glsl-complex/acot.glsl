#pragma glslify: export(cacot)

#pragma glslify: hypot = require(glsl-hypot)
#pragma glslify: catan = require(./atan)

vec2 cacot (vec2 z) {
  return catan(vec2(z.x, -z.y) / dot(z, z));
}
