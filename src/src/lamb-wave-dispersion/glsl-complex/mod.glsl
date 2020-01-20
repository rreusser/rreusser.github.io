#pragma glslify: export(cmod)

#pragma glslify: hypot = require(glsl-hypot)

float cmod (vec2 z) {
  return hypot(z);
}
