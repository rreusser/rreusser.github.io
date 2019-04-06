#define HALF_PI_INV 0.15915494309

#pragma glslify: hypot = require(./hypot)
#pragma glslify: cubehelixRainbow = require(./cubehelix-rainbow)

float gridFactor (float parameter) {
  const float width = 1.0;
  const float feather = 1.0;
  float w1 = width - feather * 0.5;
  float d = fwidth(parameter);
  float looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
  return 1.0 - smoothstep(d * w1, d * (w1 + feather), looped);
}

float loop (float x) {
  float y = fract(x);
  y *= y;
  return 1.0 - y * y;
}

float screenDeriv (float f) {
  //return hypot(vec2(dFdx(f), dFdy(f)));
  return fwidth(f);
}

vec3 domainColoring (vec2 f,
                     bool polar,
                     vec2 steps,
                     vec2 scale,
                     vec2 fieldStrength,
                     vec2 gridStrength,
                     float viewportHeight
 ) {
  float carg = atan(f.y, f.x) * HALF_PI_INV;
  float cmag = hypot(f);
  float dx = 10.0 / viewportHeight;

  vec2 inputValue = polar ? vec2(cmag, carg) : f;
  float phaseOffset = polar ? 0.5 : 0.0;

  float c = 0.0;

  float invlog2base, logspacing, logtier, n;

  // Magnitude steps
  invlog2base = 1.0 / log2(steps.x);
  logspacing = (log2(screenDeriv(inputValue.x)) - log2(dx / scale.x)) * invlog2base;
  logspacing = clamp(logspacing, -2e1, 1e10);
  logtier = floor(logspacing);
  n = log2(abs(inputValue.x)) * invlog2base - logtier;

  float magFadeIn = smoothstep(logtier, logtier + 1.0, logspacing);
  float magFadeOut = smoothstep(logtier + 1.0, logtier, logspacing);

  float magOctave0 = pow(steps.x, n);
  float magOctave1 = magOctave0 * steps.x;
  float magOctave2 = magOctave1 * steps.x;
  float magOctave3 = magOctave2 * steps.x;
  float magOctave4 = magOctave3 * steps.x;

  c += fieldStrength.x * (
    magFadeIn * loop(magOctave0) +
    loop(magOctave1) +
    loop(magOctave2) +
    loop(magOctave3) +
    magFadeOut * loop(magOctave4)
  ) / 5.0;

  // Phase steps
  invlog2base = 1.0 / log2(steps.y);
  logspacing = (log2(screenDeriv(inputValue.y)) - log2(dx / scale.y)) * invlog2base;
  logspacing = clamp(logspacing, -2e1, 1e10);
  logtier = floor(logspacing);
  n = log2(abs(inputValue.y + phaseOffset)) * invlog2base - logtier;

  float phaseFadeIn = smoothstep(logtier, logtier + 1.0, logspacing);
  float phaseFadeOut = smoothstep(logtier + 1.0, logtier, logspacing);

  float phaseOctave0 = pow(steps.y, n);
  float phaseOctave1 = phaseOctave0 * steps.y;
  float phaseOctave2 = phaseOctave1 * steps.y;
  //float phaseOctave3 = phaseOctave2 * steps.y;

  c += fieldStrength.y * (
    phaseFadeIn * loop(phaseOctave0) +
    loop(phaseOctave1) +
    phaseFadeOut * loop(phaseOctave2)
  ) / 3.0;


  vec3 color = (0.24 + 0.74 * cubehelixRainbow(carg)) * (0.9 - (fieldStrength.x + fieldStrength.y) * 0.7 + c);

  float magGrid = 1.0 - gridStrength.x * (
    mix(0.0, gridFactor(magOctave0), magFadeIn) +
    gridFactor(magOctave1) +
    gridFactor(magOctave2) +
    gridFactor(magOctave3) +
    mix(0.0, gridFactor(magOctave4), magFadeOut)
  ) / 5.0;

  float phaseGrid = 1.0 - gridStrength.y * (
    mix(1.0, gridFactor(phaseOctave0), phaseFadeIn) *
    gridFactor(phaseOctave1) *
    mix(1.0, gridFactor(phaseOctave2), phaseFadeOut)
  ) / 3.0;

  return color * min(magGrid, phaseGrid);
}

#pragma glslify: export(domainColoring)
