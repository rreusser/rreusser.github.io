vec3 rgb2yuv (vec3 rgb, float uvScale) {
  return vec3 (
    rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114,
    uvScale * (rgb.r * -0.169 + rgb.g * -0.331 + rgb.b * 0.5) + 0.5,
    uvScale * (rgb.r * 0.5 + rgb.g * -0.419 + rgb.b * -0.081) + 0.5
  );
}

#pragma glslify: export(rgb2yuv)
