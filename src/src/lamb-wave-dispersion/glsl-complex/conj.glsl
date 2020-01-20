#pragma glslify: export(conj)

vec2 conj (vec2 z) {
  return vec2(z.x, -z.y);
}
