#pragma glslify: export(casinh)

#pragma glslify: cacos = require(./acos)

vec2 casinh (vec2 z) {
  vec2 a = cacos(z);

  if (a.y <= 0.0) {
    return vec2(-a.y, a.x);
  }

  return vec2(a.y, -a.x);
}
