vec2 ikeda (vec2 xy, float u) {
  float t = 0.4 - 6.0 / (1.0 + dot(xy, xy));
  float ct = cos(t);
  float st = sin(t);
  return vec2(
    1.0 + u * dot(xy, vec2(ct, -st)),
    u * dot(xy, vec2(st, ct))
  );
}

#pragma glslify: export(ikeda)
