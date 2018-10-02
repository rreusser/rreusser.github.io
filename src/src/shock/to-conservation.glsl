vec3 toConservation (vec3 state) {
  return vec3(
    state.x,
    state.x * state.y,
    state.z
  );
}

#pragma glslify: export(toConservation)
