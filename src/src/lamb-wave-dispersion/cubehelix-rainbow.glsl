#define PI 3.141592653589793238
#define TO_RADIANS 0.01745329251

#pragma glslify: cubehelix = require(./cubehelix)

// https://github.com/d3/d3-scale-chromatic
vec3 cubehelixRainbow(float t) {
  float ts = 0.25 - 0.25 * cos((t - 0.5) * PI * 2.0);
  return cubehelix(vec3(
    (360.0 * t - 100.0) * TO_RADIANS,
    1.5 - 1.5 * ts,
    (0.8 - 0.9 * ts)
  ));
}

#pragma glslify: export(cubehelixRainbow)
