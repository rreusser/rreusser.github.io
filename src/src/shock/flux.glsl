vec3 flux (vec3 U, float gamma) {
  float rhoU2 = U.y * U.y / U.x;
  float p = (gamma - 1.0) * (U.z - 0.5 * rhoU2);
  return vec3(
    U.y,
    rhoU2 + p,
    U.y / U.x * (U.z + p)
  );
}

#pragma glslify: export(flux)
