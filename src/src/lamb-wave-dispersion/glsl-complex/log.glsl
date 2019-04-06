#pragma glslify: export(clog)

#pragma glslify: hypot = require(glsl-hypot)

vec2 clog(vec2 z) {
  return vec2(
    log(hypot(z)),
    atan(z.y, z.x)
  );
}
