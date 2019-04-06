#pragma glslify: export(sinh)

float sinh (float x) {
  return 0.5 * (exp(x) - exp(-x));
}
