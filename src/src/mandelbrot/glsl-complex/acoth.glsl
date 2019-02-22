#pragma glslify: export(cacoth)

#pragma glslify: catanh = require(./atanh)

vec2 cacoth(vec2 z) {
  return catanh(vec2(z.x, -z.y) / dot(z, z));
}
