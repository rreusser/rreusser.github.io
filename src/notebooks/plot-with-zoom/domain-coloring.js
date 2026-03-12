export function createPolarDomainColoringShader({
  magnitudeOctaves = 8,
  phaseOctaves = 8,
  phaseMultiplier = 1,
  bias1 = 0.0,
  bias2 = 0.0
} = {}) {

  // prettier-ignore
  var shader = `
#ifndef PI
#define PI 3.141592653589793238
#endif

#ifndef HALF_PI_INV
#define HALF_PI_INV 0.15915494309
#endif

#ifndef GLSL_HYPOT
#define GLSL_HYPOT
float hypot (vec2 z) {
  float x = abs(z.x);
  float y = abs(z.y);
  float t = min(x, y);
  x = max(x, y);
  t = t / x;
  return x * sqrt(1.0 + t * t);
}
#endif

vec4 rainbow(vec2 p) {
  // A rainbow colorscale with p in [0, 1] x [0, 1]
  float theta = p.x * (2.0 * ${Math.PI});
  float c = cos(theta);
  float s = sin(theta);
  return vec4(
    mat3( 0.5230851 ,  0.56637411,  0.46725319,
          0.12769652,  0.14082407,  0.13691271,
         -0.25934743, -0.12121582,  0.2348705 ) *
    vec3(1.0, p.y * 2.0 - 1.0, s) +
    mat3( 0.3555664 , -0.11472876, -0.01250831,
          0.15243126, -0.03668075,  0.0765231 ,
         -0.00192128, -0.01350681, -0.0036526 ) *
    vec3(c, s * c, c * c - s * s),
    1.0
  );
}

float complexContouringGridFunction (float x) {
  return 4.0 * abs(fract(x - 0.5) - 0.5);
}
float domainColoringContrastFunction (float x, float power) {
  x = 2.0 * x - 1.0;
  return 0.5 + 0.5 * pow(abs(x), power) * sign(x);
}

vec4 domainColoring (vec4 f_df,
                     vec2 steps,
                     vec2 scale,
                     vec2 gridOpacity,
                     vec2 shadingOpacity,
                     float lineWidth,
                     float lineFeather,
                     vec3 gridColor,
                     float contrastPower
 ) {
  float invlog2base, logspacing, logtier, n, invSteps;

  vec2 res = scale * vec2(1.0, 1.0 / 6.28) * 20.0 * steps;

  // Complex argument, scaled to the range [0, 4]
  float carg = atan(f_df.y, f_df.x) * HALF_PI_INV * ${phaseMultiplier.toFixed(
    1
  )};

  // Reciprocal of the complex magnitude
  float cmagRecip = 1.0 / hypot(f_df.xy);

  // Normalize z before using it to compute the magnitudes. Without this we lose half
  // of the floating point range due to overflow.
  vec2 znorm = f_df.xy * cmagRecip;

  // Computed as d|f| / dz, evaluated in the +real direction (though any direction works)
  //float cmagGradientMag = hypot(f_df.zw);//hypot(vec2(dot(znorm, f_df.zw), dot(vec2(znorm.y, -znorm.x), f_df.zw)));
  // This is really just the following (thanks, @neozhaoliang!)
  float cmagGradientMag = hypot(f_df.zw);

  float cargGradientMag = cmagGradientMag * cmagRecip;
  
  // Shade at logarithmically spaced magnitudes
  float mappedCmag = -log2(cmagRecip);
  float mappedCmagGradientMag = cmagGradientMag * cmagRecip;

  // Magnitude steps
  invlog2base = 1.0 / log2(steps.x);
  logspacing = log2(mappedCmagGradientMag * res.x) * invlog2base;
  logspacing = clamp(logspacing, -50.0, 50.0);
  logtier = floor(logspacing);
  n = log2(abs(mappedCmag)) * invlog2base - logtier;

  invSteps = 1.0 / steps.x;
  float magOctave0 = pow(steps.x, n) * sign(mappedCmag);

  ${[...Array(magnitudeOctaves - 1).keys()]
    .map(i => `float magOctave${i + 1} = magOctave${i} * invSteps;`)
    .join('\n  ')}

  ${[...Array(magnitudeOctaves + 1).keys()]
    .map(
      i =>
        `float magWeight${i} = ${
          i === 0 || i === magnitudeOctaves
            ? '1e-4'
            : (1 + i * bias1 + bias2 * Math.pow(i, 2)).toFixed(2)
        };`
    )
    .join('\n  ')}
  
  float width1 = max(0.0, lineWidth - lineFeather);
  float width2 = lineWidth + lineFeather;

  float w, scaleFactor, value, gridValue;
  float totalWeight = 0.0;
  float magnitudeGrid = 0.0;
  float magnitudeShading = 0.0;
  scaleFactor = pow(steps.x, logtier) / cargGradientMag * 0.25;
  
  ${[...Array(magnitudeOctaves).keys()]
    .map(
      i =>
        `w = mix(magWeight${i}, magWeight${i + 1}, 1.0 - logspacing + logtier);
  totalWeight += w;
  gridValue = complexContouringGridFunction(magOctave${i}) * scaleFactor;
  magnitudeGrid += w * smoothstep(width1, width2, gridValue);
  value = fract(-magOctave${i});
  magnitudeShading += w * (0.5 + (domainColoringContrastFunction(value, contrastPower) - 0.5) * min(1.0, gridValue * 1.5));
  scaleFactor *= steps.x;
  `
    )
    .join('\n  ')}
  
  magnitudeGrid /= totalWeight;
  magnitudeShading /= totalWeight;

  // Phase steps
  invlog2base = 1.0 / log2(steps.y);
  logspacing = log2(cargGradientMag * ${phaseMultiplier.toFixed(
    1
  )} * res.y) * invlog2base;
  logspacing = clamp(logspacing, -50.0, 50.0);
  logtier = floor(logspacing);
  n = log2(abs(carg) + 1.0) * invlog2base - logtier;

  invSteps = 1.0 / steps.y;
  float phaseOctave0 = pow(steps.y, n) * sign(carg);

  ${[...Array(phaseOctaves - 1).keys()]
    .map(i => `float phaseOctave${i + 1} = phaseOctave${i} * invSteps;`)
    .join('\n  ')}

  ${[...Array(phaseOctaves + 1).keys()]
    .map(
      i =>
        `const float phaseWeight${i} = ${
          i === 0 || i === phaseOctaves
            ? '1e-4'
            : (1 + i * bias1 + bias2 * Math.pow(i, 2)).toFixed(4)
        };`
    )
    .join('\n  ')}
  
  totalWeight = 0.0;

  float phaseShading = 0.0;
  float phaseGrid = 0.0;
  scaleFactor = pow(steps.y, logtier) / (cargGradientMag * ${phaseMultiplier.toFixed(
    1
  )}) * 2.0;

  ${[...Array(phaseOctaves).keys()]
    .map(
      i =>
        `w = mix(phaseWeight${i}, phaseWeight${i +
          1}, 1.0 - logspacing + logtier);
  totalWeight += w;
  gridValue = complexContouringGridFunction(phaseOctave${i}) * scaleFactor;
  phaseGrid += w * smoothstep(width1, width2, gridValue);
  value = fract(phaseOctave${i});
  phaseShading += w * (0.5 + (domainColoringContrastFunction(value, contrastPower) - 0.5) * min(1.0, gridValue * 1.5));
  scaleFactor *= steps.y;
  `
    )
    .join('\n  ')}

  phaseGrid /= totalWeight;
  phaseShading /= totalWeight;

  float grid = 1.0;
  grid = min(grid, 1.0 - (1.0 - magnitudeGrid) * gridOpacity.x);
  grid = min(grid, 1.0 - (1.0 - phaseGrid) * gridOpacity.y);

  float shading = 0.5 + (shadingOpacity.y * (0.5 - phaseShading)) + shadingOpacity.x * (magnitudeShading - 0.5);

  vec3 result = mix(
    vec3(1),
    rainbow(vec2(carg / ${phaseMultiplier.toFixed(1)} - 0.25, shading)).rgb,
    uShadingOpacity
  );
  
  result = mix(gridColor, result, grid);

  return vec4(result, 1.0);
}`;
  return shader;
}
