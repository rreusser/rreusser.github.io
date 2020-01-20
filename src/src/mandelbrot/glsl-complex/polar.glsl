#pragma glslify: export(cpolar)
#pragma glslify: hypot = require(glsl-hypot)

vec2 cpolar (vec2 z) {
  return vec2(
    atan(z.y, z.x),
    hypot(z)
  );
}

