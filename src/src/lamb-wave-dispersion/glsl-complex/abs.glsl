#pragma glslify: export(cabs)

#pragma glslify: cmod = require(./mod)

float cabs (vec2 z) {
  return cmod(z);
}
