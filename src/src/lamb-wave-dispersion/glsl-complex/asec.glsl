#pragma glslify: export(casec)

#pragma glslify: cacos = require(./acos)

vec2 casec (vec2 z) {
  float d = dot(z, z);
  return cacos(vec2(z.x, -z.y) / dot(z, z));
}
