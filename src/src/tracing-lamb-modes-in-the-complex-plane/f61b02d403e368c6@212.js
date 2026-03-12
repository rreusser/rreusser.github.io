// https://observablehq.com/@rreusser/glsl-complex@212
function _1(md){return(
md`# glsl-complex`
)}

function _glslComplex(constants,hypot,cadd,csub,cmod,csqrt,sinh,cosh,sinhcosh,cabs,clog,catan,catanh,cacos,cacosh,cacot,cacoth,casin,casinh,cacsch,casec,casech,cconj,ccos,ccosh,ccot,ccoth,ccsc,ccsch,cdiv,cexp,cinv,cmul,cpolar,cpow,csec,csech,csin,csincos,csinh,csqr,ctan,ctanh){return(
`${constants}
${hypot}
${cadd}
${csub}
${cmod} 
${csqrt}
${sinh}
${cosh}
${sinhcosh}
${cabs}
${clog}
${catan} 
${catanh} 
${cacos} 
${cacosh} 
${cacot} 
${cacoth} 
${casin} 
${casinh} 
${cacsch} 
${casec} 
${casech} 
${cconj} 
${ccos} 
${ccosh} 
${ccot} 
${ccoth} 
${ccsc} 
${ccsch} 
${cdiv} 
${cexp} 
${cinv} 
${cmul} 
${cpolar} 
${cpow} 
${csec} 
${csech} 
${csin} 
${csincos} 
${csinh} 
${csqr} 
${ctan} 
${ctanh}
`
)}

function _constants(){return(
`
#ifndef PI
#define PI 3.141592653589793238
#endif

#ifndef TO_RADIANS
#define TO_RADIANS 0.01745329251
#endif

#ifndef HALF_PI
#define HALF_PI 1.57079633
#endif

#ifndef HALF_PI_INV
#define HALF_PI_INV 0.15915494309
#endif

#ifndef PI_INV
#define PI_INV 0.31830988618
#endif

#ifndef TWO_PI
#define TWO_PI 6.28318530718
#endif
`
)}

function _hypot(){return(
`
#ifndef GLSL_HYPOT
#define GLSL_HYPOT
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
#endif`
)}

function _sinh(){return(
`float sinh (float x) {
  return 0.5 * (exp(x) - exp(-x));
}`
)}

function _cosh(){return(
`float cosh (float x) {
  return 0.5 * (exp(x) + exp(-x));
}`
)}

function _sinhcosh(){return(
`vec2 sinhcosh (float x) {
  vec2 ex = exp(vec2(x, -x));
  return 0.5 * (ex - vec2(ex.y, -ex.x));
}`
)}

function _cabs(){return(
`float cabs (vec2 z) {
  return cmod(z);
}`
)}

function _cacos(){return(
`vec2 cacos (vec2 z) {
  vec2 a = csqrt(vec2(
    z.y * z.y - z.x * z.x + 1.0,
    -2.0 * z.x * z.y
  ));

  vec2 b = clog(vec2(a.x - z.y, a.y + z.x));
  return vec2(HALF_PI - b.y, b.x);
}`
)}

function _cacosh(){return(
`vec2 cacosh (vec2 z) {
  vec2 a = cacos(z);

  if (a.y <= 0.0) {
    return vec2(-a.y, a.x);
  }

  return vec2(a.y, -a.x);
}`
)}

function _cacot(){return(
`vec2 cacot (vec2 z) {
  return catan(vec2(z.x, -z.y) / dot(z, z));
}`
)}

function _cacoth(){return(
`vec2 cacoth(vec2 z) {
  return catanh(vec2(z.x, -z.y) / dot(z, z));
}`
)}

function _cacsch(){return(
`vec2 cacsch(vec2 z) {
  return casinh(vec2(z.x, -z.y) / dot(z, z));
}`
)}

function _casec(){return(
`vec2 casec (vec2 z) {
  float d = dot(z, z);
  return cacos(vec2(z.x, -z.y) / dot(z, z));
}`
)}

function _casech(){return(
`vec2 casech(vec2 z) {
  return cacosh(vec2(z.x, -z.y) / dot(z, z));
}`
)}

function _casin(){return(
`vec2 casin (vec2 z) {
  vec2 a = csqrt(vec2(
    z.y * z.y - z.x * z.x + 1.0,
    -2.0 * z.x * z.y
  ));

  vec2 b = clog(vec2(
    a.x - z.y,
    a.y + z.x
  ));

  return vec2(b.y, -b.x);
}`
)}

function _casinh(){return(
`vec2 casinh (vec2 z) {
  vec2 res = casin(vec2(z.y, -z.x));
  return vec2(-res.y, res.x);
}`
)}

function _catan(){return(
`vec2 catan (vec2 z) {
  float a = z.x * z.x + (1.0 - z.y) * (1.0 - z.y);
  vec2 b = clog(vec2(1.0 - z.y * z.y - z.x * z.x, -2.0 * z.x) / a);
  return 0.5 * vec2(-b.y, b.x);
}`
)}

function _catanh(){return(
`vec2 catanh (vec2 z) {
  float oneMinus = 1.0 - z.x;
  float onePlus = 1.0 + z.x;
  float d = oneMinus * oneMinus + z.y * z.y;

  vec2 x = vec2(onePlus * oneMinus - z.y * z.y, z.y * 2.0) / d;

  vec2 result = vec2(log(hypot(x)), atan(x.y, x.x)) * 0.5;

  return result;
}`
)}

function _cconj(){return(
`vec2 cconj (vec2 z) {
  return vec2(z.x, -z.y);
}`
)}

function _ccos(){return(
`vec2 ccos (vec2 z) {
  return sinhcosh(z.y).yx * vec2(cos(z.x), -sin(z.x));
}`
)}

function _ccosh(){return(
`vec2 ccosh (vec2 z) {
  return sinhcosh(z.x).yx * vec2(cos(z.y), sin(z.y));
}`
)}

function _ccot(){return(
`vec2 ccot (vec2 z) {
  z *= 2.0;
  vec2 sch = sinhcosh(z.y);
  return vec2(-sin(z.x), sch.x) / (cos(z.x) - sch.y);
}`
)}

function _ccoth(){return(
`vec2 ccoth(vec2 z) {
  z *= 2.0;
  vec2 sch = sinhcosh(z.x);
  return vec2(sch.x, -sin(z.y)) / (sch.y - cos(z.y));
}`
)}

function _ccsc(){return(
`vec2 ccsc (vec2 z) {
  float d = 0.25 * (exp(2.0 * z.y) + exp(-2.0 * z.y)) - 0.5 * cos(2.0 * z.x);

  return sinhcosh(z.y).yx * vec2(sin(z.x), -cos(z.x)) / d;
}`
)}

function _ccsch(){return(
`vec2 ccsch (vec2 z) {
  vec2 sch = sinhcosh(z.x);
  float d = cos(2.0 * z.y) - (exp(2.0 * z.x) + exp(-2.0 * z.x)) * 0.5;
  return vec2(-cos(z.y), sin(z.y)) * sch / (0.5 * d);
}`
)}

function _csub(){return(
`vec2 csub (vec2 a, vec2 b) {
  return a - b;
}`
)}

function _cadd(){return(
`vec2 cadd (vec2 a, vec2 b) {
  return a + b;
}`
)}

function _cdiv(){return(
`vec2 cdiv (vec2 a, vec2 b) {
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
}`
)}

function _cexp(){return(
`vec2 cexp(vec2 z) {
  return vec2(cos(z.y), sin(z.y)) * exp(z.x);
}`
)}

function _cinv(){return(
`vec2 cinv (vec2 b) {
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
}`
)}

function _clog(){return(
`vec2 clog(vec2 z) {
  return vec2(
    log(hypot(z)),
    atan(z.y, z.x)
  );
}`
)}

function _cmod(){return(
`float cmod (vec2 z) {
  return hypot(z);
}`
)}

function _cmul(){return(
`vec2 cmul (vec2 a, vec2 b) {
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
}`
)}

function _cpolar(){return(
`vec2 cpolar (vec2 z) {
  return vec2(
    atan(z.y, z.x),
    hypot(z)
  );
}`
)}

function _cpow(){return(
`vec2 cpow (vec2 z, float x) {
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
}`
)}

function _csec(){return(
`vec2 csec (vec2 z) {
  float d = 0.25 * (exp(2.0 * z.y) + exp(-2.0 * z.y)) + 0.5 * cos(2.0 * z.x);
  return sinhcosh(z.y).yx * vec2(cos(z.x), sin(z.x)) / d;
}`
)}

function _csech(){return(
`vec2 csech(vec2 z) {
  float d = cos(2.0 * z.y) + 0.5 * (exp(2.0 * z.x) + exp(-2.0 * z.x));
  vec2 sch = sinhcosh(z.x);

  return vec2(cos(z.y), -sin(z.y)) * sch.yx / (0.5 * d);
}`
)}

function _csin(){return(
`vec2 csin (vec2 z) {
  return sinhcosh(z.y).yx * vec2(sin(z.x), cos(z.x));
}`
)}

function _csincos(){return(
`vec4 csincos (vec2 z) {
  float c = cos(z.x);
  float s = sin(z.x);
  return sinhcosh(z.y).yxyx * vec4(s, c, c, -s);
}`
)}

function _csinh(){return(
`vec2 csinh (vec2 z) {
  return sinhcosh(z.x) * vec2(cos(z.y), sin(z.y));
}`
)}

function _csqr(){return(
`vec2 csqr (vec2 z) {
  return vec2(
    z.x * z.x - z.y * z.y,
    2.0 * z.x * z.y
  );
}`
)}

function _csqrt(){return(
`vec2 csqrt (vec2 z) {
  float t = sqrt(2.0 * (cmod(z) + (z.x >= 0.0 ? z.x : -z.x)));
  vec2 f = vec2(0.5 * t, abs(z.y) / t);

  if (z.x < 0.0) f.xy = f.yx;
  if (z.y < 0.0) f.y = -f.y;

  return f;
}`
)}

function _ctan(){return(
`vec2 ctan (vec2 z) {
  vec2 e2iz = cexp(2.0 * vec2(-z.y, z.x));

  return cdiv(
    e2iz - vec2(1, 0),
    vec2(-e2iz.y, 1.0 + e2iz.x)
  );
}`
)}

function _ctanh(){return(
`vec2 ctanh (vec2 z) {
  z *= 2.0;
  vec2 sch = sinhcosh(z.x);
  return vec2(sch.x, sin(z.y)) / (sch.y + cos(z.y));
}`
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], _1);
  main.variable(observer("glslComplex")).define("glslComplex", ["constants","hypot","cadd","csub","cmod","csqrt","sinh","cosh","sinhcosh","cabs","clog","catan","catanh","cacos","cacosh","cacot","cacoth","casin","casinh","cacsch","casec","casech","cconj","ccos","ccosh","ccot","ccoth","ccsc","ccsch","cdiv","cexp","cinv","cmul","cpolar","cpow","csec","csech","csin","csincos","csinh","csqr","ctan","ctanh"], _glslComplex);
  main.variable(observer("constants")).define("constants", _constants);
  main.variable(observer("hypot")).define("hypot", _hypot);
  main.variable(observer("sinh")).define("sinh", _sinh);
  main.variable(observer("cosh")).define("cosh", _cosh);
  main.variable(observer("sinhcosh")).define("sinhcosh", _sinhcosh);
  main.variable(observer("cabs")).define("cabs", _cabs);
  main.variable(observer("cacos")).define("cacos", _cacos);
  main.variable(observer("cacosh")).define("cacosh", _cacosh);
  main.variable(observer("cacot")).define("cacot", _cacot);
  main.variable(observer("cacoth")).define("cacoth", _cacoth);
  main.variable(observer("cacsch")).define("cacsch", _cacsch);
  main.variable(observer("casec")).define("casec", _casec);
  main.variable(observer("casech")).define("casech", _casech);
  main.variable(observer("casin")).define("casin", _casin);
  main.variable(observer("casinh")).define("casinh", _casinh);
  main.variable(observer("catan")).define("catan", _catan);
  main.variable(observer("catanh")).define("catanh", _catanh);
  main.variable(observer("cconj")).define("cconj", _cconj);
  main.variable(observer("ccos")).define("ccos", _ccos);
  main.variable(observer("ccosh")).define("ccosh", _ccosh);
  main.variable(observer("ccot")).define("ccot", _ccot);
  main.variable(observer("ccoth")).define("ccoth", _ccoth);
  main.variable(observer("ccsc")).define("ccsc", _ccsc);
  main.variable(observer("ccsch")).define("ccsch", _ccsch);
  main.variable(observer("csub")).define("csub", _csub);
  main.variable(observer("cadd")).define("cadd", _cadd);
  main.variable(observer("cdiv")).define("cdiv", _cdiv);
  main.variable(observer("cexp")).define("cexp", _cexp);
  main.variable(observer("cinv")).define("cinv", _cinv);
  main.variable(observer("clog")).define("clog", _clog);
  main.variable(observer("cmod")).define("cmod", _cmod);
  main.variable(observer("cmul")).define("cmul", _cmul);
  main.variable(observer("cpolar")).define("cpolar", _cpolar);
  main.variable(observer("cpow")).define("cpow", _cpow);
  main.variable(observer("csec")).define("csec", _csec);
  main.variable(observer("csech")).define("csech", _csech);
  main.variable(observer("csin")).define("csin", _csin);
  main.variable(observer("csincos")).define("csincos", _csincos);
  main.variable(observer("csinh")).define("csinh", _csinh);
  main.variable(observer("csqr")).define("csqr", _csqr);
  main.variable(observer("csqrt")).define("csqrt", _csqrt);
  main.variable(observer("ctan")).define("ctan", _ctan);
  main.variable(observer("ctanh")).define("ctanh", _ctanh);
  return main;
}
