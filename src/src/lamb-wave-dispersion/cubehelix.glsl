#define PI 3.141592653589793238
#define TO_RADIANS 0.01745329251

// https://github.com/d3/d3-color
vec3 cubehelix(vec3 c) {
  float a = c.y * c.z * (1.0 - c.z);
  float cosh = cos(c.x + PI / 2.0);
  float sinh = sin(c.x + PI / 2.0);
  return vec3(
    (c.z + a * (1.78277 * sinh - 0.14861 * cosh)),
    (c.z - a * (0.29227 * cosh + 0.90649 * sinh)),
    (c.z + a * (1.97294 * cosh))
  );
}

#pragma glslify: export(cubehelix)
