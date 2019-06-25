vec3 yuv2rgb (vec3 yuv, float uvScale) {
  yuv.yz -= 0.5;
  yuv.yz /= uvScale;
  return vec3(
    yuv.x + yuv.z * 1.4,
    yuv.x + yuv.y * -0.343 + yuv.z * -0.711,
    yuv.x + yuv.y * 1.765
  );
}

#pragma glslify: export(yuv2rgb)
