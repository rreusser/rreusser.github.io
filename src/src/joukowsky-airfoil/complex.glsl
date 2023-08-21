float cmod (vec2 z) {
  float x = abs(z.x);
  float y = abs(z.y);
  float t = min(x, y);
  x = max(x, y);
  t = t / x;
  return x * sqrt(1.0 + t * t);
}

vec2 cinv (vec2 b) {
  float e, f;
  vec2 g = vec2(1, -1);
  if( abs(b.x) >= abs(b.y) ) {
    e = b.y / b.x;
    f = b.x + b.y * e;
    g.y = -e;
  } else {
    e = b.x / b.y;
    f = b.x * e + b.y;
    g.x = e;
  }
  return g / f;
}

vec2 cinvsqr_fast(vec2 a) {
  float den = dot(a, a);
  return vec2(a.x * a.x - a.y * a.y, -2.0 * a.x * a.y) / (den * den);
}

vec2 cdiv (vec2 a, vec2 b) {
  float e, f;
  float g = 1.0;
  float h = 1.0;
  if( abs(b.x) >= abs(b.y) ) {
    e = b.y / b.x;
    f = b.x + b.y * e;
    h = e;
  } else {
    e = b.x / b.y;
    f = b.x * e + b.y;
    g = e;
  }
  return (a * g + h * vec2(a.y, -a.x)) / f;
}
vec2 cdiv_fast(vec2 a, vec2 b) {
  return vec2(dot(a, b), a.y * b.x - a.x * b.y) / dot(b, b);
}

vec2 cdiv_fast(float ay, vec2 b) {
  return ay * b.yx / dot(b, b);
}

vec2 cmul (vec2 a, vec2 b) {
  return vec2(
    a.x * b.x - a.y * b.y,
    a.y * b.x + a.x * b.y
  );
}

vec2 csqr (vec2 z) {
  return vec2(
    z.x * z.x - z.y * z.y,
    2.0 * z.x * z.y
  );
}

vec2 csqrt (vec2 z) {
  float t = sqrt(2.0 * (cmod(z) + (z.x >= 0.0 ? z.x : -z.x)));
  vec2 f = vec2(0.5 * t, abs(z.y) / t);
  if (z.x < 0.0) f.xy = f.yx;
  if (z.y < 0.0) f.y = -f.y;
  return f;
}

vec2 csqrt_fast(vec2 z) {
  float t = sqrt(2.0 * (length(z) + (z.x >= 0.0 ? z.x : -z.x)));
  vec2 f = vec2(0.5 * t, abs(z.y) / t);
  if (z.x < 0.0) f.xy = f.yx;
  if (z.y < 0.0) f.y = -f.y;
  return f;
}

vec2 cexp(vec2 z) {
  return vec2(cos(z.y), sin(z.y)) * exp(z.x);
}
vec2 cexp(float b) {
  return vec2(cos(b), sin(b));
}
