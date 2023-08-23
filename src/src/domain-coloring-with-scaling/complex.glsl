#ifndef PI
#define PI 3.141592653589793238
#endif

float hypot (vec2 z) {
  float x = abs(z.x);
  float y = abs(z.y);
  float t = min(x, y);
  x = max(x, y);
  t = t / x;
  return x * sqrt(1.0 + t * t);

  // This conditional seems unnecessary on the non-cpu version
  //return (z.x == 0.0 && z.y == 0.0) ? 0.0 : x * sqrt(1.0 + t * t);
}

vec2 cadd (vec2 a, vec2 b) {
  return a + b;
}

vec2 csub (vec2 a, vec2 b) {
  return a - b;
}

float cmod (vec2 z) {
  return hypot(z);
} 

vec2 csqrt (vec2 z) {
  float t = sqrt(2.0 * (cmod(z) + (z.x >= 0.0 ? z.x : -z.x)));
  vec2 f = vec2(0.5 * t, abs(z.y) / t);

  if (z.x < 0.0) f.xy = f.yx;
  if (z.y < 0.0) f.y = -f.y;

  return f;
}

float sinh (float x) {
  return 0.5 * (exp(x) - exp(-x));
}

float cosh (float x) {
  return 0.5 * (exp(x) + exp(-x));
}

vec2 sinhcosh (float x) {
  vec2 ex = exp(vec2(x, -x));
  return 0.5 * (ex - vec2(ex.y, -ex.x));
}

float cabs (vec2 z) {
  return cmod(z);
}

vec2 clog(vec2 z) {
  return vec2(
    log(hypot(z)),
    atan(z.y, z.x)
  );
}

vec2 catan (vec2 z) {
  float a = z.x * z.x + (1.0 - z.y) * (1.0 - z.y);
  vec2 b = clog(vec2(1.0 - z.y * z.y - z.x * z.x, -2.0 * z.x) / a);
  return 0.5 * vec2(-b.y, b.x);
} 

vec2 catanh (vec2 z) {
  float oneMinus = 1.0 - z.x;
  float onePlus = 1.0 + z.x;
  float d = oneMinus * oneMinus + z.y * z.y;

  vec2 x = vec2(onePlus * oneMinus - z.y * z.y, z.y * 2.0) / d;

  vec2 result = vec2(log(hypot(x)), atan(x.y, x.x)) * 0.5;

  return result;
} 

vec2 cacos (vec2 z) {
  vec2 a = csqrt(vec2(
    z.y * z.y - z.x * z.x + 1.0,
    -2.0 * z.x * z.y
  ));

  vec2 b = clog(vec2(a.x - z.y, a.y + z.x));
  return vec2((PI * 0.5) - b.y, b.x);
} 

vec2 cacosh (vec2 z) {
  vec2 a = cacos(z);

  if (a.y <= 0.0) {
    return vec2(-a.y, a.x);
  }

  return vec2(a.y, -a.x);
} 

vec2 cacot (vec2 z) {
  return catan(vec2(z.x, -z.y) / dot(z, z));
} 

vec2 cacoth(vec2 z) {
  return catanh(vec2(z.x, -z.y) / dot(z, z));
} 

vec2 casin (vec2 z) {
  vec2 a = csqrt(vec2(
    z.y * z.y - z.x * z.x + 1.0,
    -2.0 * z.x * z.y
  ));

  vec2 b = clog(vec2(
    a.x - z.y,
    a.y + z.x
  ));

  return vec2(b.y, -b.x);
} 

vec2 casinh (vec2 z) {
  vec2 res = casin(vec2(z.y, -z.x));
  return vec2(-res.y, res.x);
} 

vec2 cacsch(vec2 z) {
  return casinh(vec2(z.x, -z.y) / dot(z, z));
} 

vec2 casec (vec2 z) {
  float d = dot(z, z);
  return cacos(vec2(z.x, -z.y) / dot(z, z));
} 

vec2 casech(vec2 z) {
  return cacosh(vec2(z.x, -z.y) / dot(z, z));
} 

vec2 cconj (vec2 z) {
  return vec2(z.x, -z.y);
} 

vec2 ccos (vec2 z) {
  return sinhcosh(z.y).yx * vec2(cos(z.x), -sin(z.x));
} 

vec2 ccosh (vec2 z) {
  return sinhcosh(z.x).yx * vec2(cos(z.y), sin(z.y));
} 

vec2 ccot (vec2 z) {
  z *= 2.0;
  vec2 sch = sinhcosh(z.y);
  return vec2(-sin(z.x), sch.x) / (cos(z.x) - sch.y);
} 

vec2 ccoth(vec2 z) {
  z *= 2.0;
  vec2 sch = sinhcosh(z.x);
  return vec2(sch.x, -sin(z.y)) / (sch.y - cos(z.y));
} 

vec2 ccsc (vec2 z) {
  float d = 0.25 * (exp(2.0 * z.y) + exp(-2.0 * z.y)) - 0.5 * cos(2.0 * z.x);

  return sinhcosh(z.y).yx * vec2(sin(z.x), -cos(z.x)) / d;
} 

vec2 ccsch (vec2 z) {
  vec2 sch = sinhcosh(z.x);
  float d = cos(2.0 * z.y) - (exp(2.0 * z.x) + exp(-2.0 * z.x)) * 0.5;
  return vec2(-cos(z.y), sin(z.y)) * sch / (0.5 * d);
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

vec2 cexp(vec2 z) {
  return vec2(cos(z.y), sin(z.y)) * exp(z.x);
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

vec2 cmul (vec2 a, vec2 b) {
  return vec2(
    a.x * b.x - a.y * b.y,
    a.y * b.x + a.x * b.y
  );
}

vec2 cmul (vec2 a, vec2 b, vec2 c) {
  return cmul(cmul(a, b), c);
}

vec2 cmul (vec2 a, vec2 b, vec2 c, vec2 d) {
  return cmul(cmul(a, b), cmul(c, d));
}

vec2 cmul (vec2 a, vec2 b, vec2 c, vec2 d, vec2 e) {
  return cmul(cmul(a, b, c), cmul(d, e));
}

vec2 cmul (vec2 a, vec2 b, vec2 c, vec2 d, vec2 e, vec2 f) {
  return cmul(cmul(a, b, c), cmul(d, e, f));
} 

vec2 cpolar (vec2 z) {
  return vec2(
    atan(z.y, z.x),
    hypot(z)
  );
} 

vec2 cpow (vec2 z, float x) {
  float r = hypot(z);
  float theta = atan(z.y, z.x) * x;
  return vec2(cos(theta), sin(theta)) * pow(r, x);
}

vec2 cpow (vec2 a, vec2 b) {
  float aarg = atan(a.y, a.x);
  float amod = hypot(a);

  float theta = log(amod) * b.y + aarg * b.x;

  return vec2(
    cos(theta),
    sin(theta)
  ) * pow(amod, b.x) * exp(-aarg * b.y);
} 

vec2 csec (vec2 z) {
  float d = 0.25 * (exp(2.0 * z.y) + exp(-2.0 * z.y)) + 0.5 * cos(2.0 * z.x);
  return sinhcosh(z.y).yx * vec2(cos(z.x), sin(z.x)) / d;
} 

vec2 csech(vec2 z) {
  float d = cos(2.0 * z.y) + 0.5 * (exp(2.0 * z.x) + exp(-2.0 * z.x));
  vec2 sch = sinhcosh(z.x);

  return vec2(cos(z.y), -sin(z.y)) * sch.yx / (0.5 * d);
} 

vec2 csin (vec2 z) {
  return sinhcosh(z.y).yx * vec2(sin(z.x), cos(z.x));
} 

vec4 csincos (vec2 z) {
  float c = cos(z.x);
  float s = sin(z.x);
  return sinhcosh(z.y).yxyx * vec4(s, c, c, -s);
} 

vec2 csinh (vec2 z) {
  return sinhcosh(z.x) * vec2(cos(z.y), sin(z.y));
} 

vec2 csqr (vec2 z) {
  return vec2(
    z.x * z.x - z.y * z.y,
    2.0 * z.x * z.y
  );
} 

vec2 ctan (vec2 z) {
  vec2 e2iz = cexp(2.0 * vec2(-z.y, z.x));

  return cdiv(
    e2iz - vec2(1, 0),
    vec2(-e2iz.y, 1.0 + e2iz.x)
  );
} 

vec2 ctanh (vec2 z) {
  z *= 2.0;
  vec2 sch = sinhcosh(z.x);
  return vec2(sch.x, sin(z.y)) / (sch.y + cos(z.y));
}
