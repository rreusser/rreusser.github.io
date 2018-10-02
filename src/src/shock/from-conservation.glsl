vec3 fromConservation (vec3 U) {
  return vec3(
    U.x,
    U.y / U.x,
    U.z / U.x
  );
}

#pragma glslify: export(fromConservation)
