#pragma glslify: export(casinh)

#pragma glslify: casin = require(./asin)

vec2 casinh (vec2 z) {
  vec2 res = casin(vec2(z.y, -z.x));
  return vec2(-res.y, res.x);
}
