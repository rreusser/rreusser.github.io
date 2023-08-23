function createPolarDomainColoringShader(opts) {
  opts = opts || {};
  const maxMagnitudeOctaves =
    opts.maxMagnitudeOctaves === undefined ? 4 : +opts.maxMagnitudeOctaves;
  const maxPhaseOctaves = opts.maxPhaseOctaves === undefined ? 3 : +opts.maxPhaseOctaves;
  const phaseMultiplier =
    opts.phaseMultiplier === undefined ? 4 : +opts.phaseMultiplier;
  const bias = opts.bias === undefined ? 0.0 : +opts.bias;

  // prettier-ignore
  var shader = `
  #ifndef PI
  #define PI 3.141592653589793238
  #endif

  #ifndef HALF_PI_INV
  #define HALF_PI_INV 0.15915494309
  #endif

  /*
  float hypot (vec2 z) {
    float x = abs(z.x);
    float y = abs(z.y);
    float t = min(x, y);
    x = max(x, y);
    t = t / x;
    return x * sqrt(1.0 + t * t);
  }
  */

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

  // https://github.com/d3/d3-color
  vec3 cubehelix(vec3 c) {
    float a = c.y * c.z * (1.0 - c.z);
    float cosh = cos(c.x + PI / 2.0);
    float sinh = sin(c.x + PI / 2.0);
    return vec3(
      (c.z + a * (1.78277 * sinh - 0.14861 * cosh)),
      (c.z - a * (0.29227 * cosh + 0.90649 * sinh)),
      (c.z + a * (1.97294 * cosh))
    );
  }

  // https://github.com/d3/d3-scale-chromatic
  vec3 cubehelixRainbow(float t) {
    float ts = 0.25 - 0.25 * cos((t - 0.5) * PI * 2.0);
    return cubehelix(vec3(
      (360.0 * t - 100.0) * TO_RADIANS,
      1.5 - 1.5 * ts,
      (0.8 - 0.9 * ts)
    ));
  }


  float complexContouringGridFunction (float x) {
    return 4.0 * abs(fract(x - 0.5) - 0.5);
  }

  float domainColoringContrastFunction (float x, float power) {
    x = 2.0 * x - 1.0;
    return 0.5 + 0.5 * pow(abs(x), power) * sign(x);
  }

  vec4 domainColoring (vec4 f_df,
                       vec2 octaves,
                       vec2 steps,
                       vec2 scale,
                       vec2 gridOpacity,
                       vec2 shadingOpacity,
                       float lineWidth,
                       float lineFeather,
                       vec3 gridColor,
                       float contrastPower,
                       float saturation,
                       float bias
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

    int iMagnitudeOctaves = int(octaves.x);
    ${[...Array(maxMagnitudeOctaves - 1).keys()]
      .map(i => `float magOctave${i + 1} = magOctave${i} * invSteps;`)
      .join('\n  ')}

    ${[...Array(maxMagnitudeOctaves + 1).keys()]
      .map(
        i =>
          `float magWeight${i} = ${i == 0 ? '1e-4' : `(${i} == 0 || ${i} >= iMagnitudeOctaves) ? 0.0 : magWeight${i-1} * bias`};`
      )
      .join('\n  ')}
    
    float width1 = max(0.0, lineWidth - lineFeather);
    float width2 = lineWidth + lineFeather;

    float w, scaleFactor, value, gridValue;
    float totalWeight = 0.0;
    float magnitudeGrid = 0.0;
    float magnitudeShading = 0.0;
    scaleFactor = pow(steps.x, logtier) / cargGradientMag * 0.25;
    
    ${[...Array(maxMagnitudeOctaves).keys()]
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

    ${[...Array(maxPhaseOctaves - 1).keys()]
      .map(i => `float phaseOctave${i + 1} = phaseOctave${i} * invSteps;`)
      .join('\n  ')}

    int iPhaseOctaves = int(octaves.y);
    ${[...Array(maxPhaseOctaves + 1).keys()]
      .map(
        i =>
          `float phaseWeight${i} = ${i === 0 ? '1e-4' : `(${i} == 0 || ${i} >= iPhaseOctaves) ? 0.0 : phaseWeight${i-1} * bias`};`
      )
      .join('\n  ')}
    
    totalWeight = 0.0;

    float phaseShading = 0.0;
    float phaseGrid = 0.0;
    scaleFactor = pow(steps.y, logtier) / (cargGradientMag * ${phaseMultiplier.toFixed(
      1
    )}) * 2.0;

    ${[...Array(maxPhaseOctaves).keys()]
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

    float shading = 1.0 - 0.5 * (mix(0.5, 1.0 - phaseShading, shadingOpacity.y) + mix(0.5, 1.0 - magnitudeShading, shadingOpacity.x));

    vec3 result = mix(vec3(pow(max(0.0, shading), 1./2.2)), rainbow(
      vec2(carg / ${phaseMultiplier.toFixed(1)} - 0.25, shading)
    ).rgb, saturation);
    //vec2 uv = vec2(carg / ${phaseMultiplier.toFixed(1)} - 0.25, shading);
    //vec3 result = cubehelixRainbow(0.25 - uv.x).rgb * mix(0.6, 1.0, uv.y);
    
    result = mix(gridColor, result, grid);

    return vec4(result, 1.0);
  }`;
  return shader;
}

module.exports = createPolarDomainColoringShader;
