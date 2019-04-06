#pragma glslify: export(catanh)

#pragma glslify: hypot = require(glsl-hypot)

vec2 catanh (vec2 z) {
  float oneMinus = 1.0 - z.x;
  float onePlus = 1.0 + z.x;
  float d = oneMinus * oneMinus + z.y * z.y;

  vec2 x = vec2(onePlus * oneMinus - z.y * z.y, z.y * 2.0) / d;

  vec2 result = vec2(log(hypot(x)), atan(x.y, x.x)) * 0.5;

  /*
  if (z.x >= 1.0 && z.y == 0.0) {
    result.y = -result.y;
  }
  */

  return result;
}
