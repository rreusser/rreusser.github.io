// https://observablehq.com/@rreusser/glsl-complex-auto-differentiation@159
import define1 from "./f61b02d403e368c6@212.js";

function _1(md){return(
md`# glsl-complex-auto-differentiation`
)}

function _glslComplexAutoDifferentiation(glslComplex,cmul,csqr,cdiv,csub,cadd,cinv,cexp,csqrt,cpow,clog,csin,ccos,ctan,casin,cacos,catan,csinh,ccosh,ctanh,casinh,cacosh,catanh){return(
`
${glslComplex}
${cmul}
${csqr}
${cdiv}
${csub}
${cadd}
${cinv}
${cexp}
${csqrt}
/*${cpow}*/
${clog}

${csin}
${ccos}
${ctan}

${casin}
${cacos}
${catan}

${csinh}
${ccosh}
${ctanh}

${casinh}
${cacosh}
${catanh}
`
)}

function _cmul(){return(
`
vec4 cmul (vec4 a, vec4 b) {
  return vec4(
    cmul(a.xy, b.xy),
    cmul(a.xy, b.zw) + cmul(a.zw, b.xy)
  );
}

vec4 cmul (vec2 a, vec4 b) {
  return vec4(
    cmul(a.xy, b.xy),
    cmul(a.xy, b.zw)
  );
}

vec4 cmul (vec4 a, vec2 b) {
  return vec4(
    cmul(a.xy, b.xy),
    cmul(a.zw, b.xy)
  );
}

vec4 cmul (vec4 a, vec4 b, vec4 c) { return cmul(cmul(a, b), c); }
vec4 cmul (vec2 a, vec4 b, vec4 c) { return cmul(cmul(a, b), c); }
vec4 cmul (vec4 a, vec2 b, vec4 c) { return cmul(cmul(a, b), c); }
vec4 cmul (vec4 a, vec4 b, vec2 c) { return cmul(cmul(a, b), c); }
vec4 cmul (vec4 a, vec2 b, vec2 c) { return cmul(cmul(a, b), c); }
vec4 cmul (vec2 a, vec4 b, vec2 c) { return cmul(cmul(a, b), c); }
vec4 cmul (vec2 a, vec2 b, vec4 c) { return cmul(cmul(a, b), c); }

`
)}

function _csqr(){return(
`vec4 csqr (vec4 a) {
  return vec4(
    csqr(a.xy),
    2.0 * cmul(a.xy, a.zw)
  );
}`
)}

function _cdiv(){return(
`vec4 cdiv (vec4 a, vec4 b) {
  return vec4(
    cdiv(a.xy, b.xy),
    cdiv(cmul(b.xy, a.zw) - cmul(a.xy, b.zw), csqr(b.xy))
  );
}

vec4 cdiv (vec2 a, vec4 b) {
  return vec4(
    cdiv(a.xy, b.xy),
    cdiv(-cmul(a.xy, b.zw), csqr(b.xy))
  );
}

vec4 cdiv (vec4 a, vec2 b) {
  return vec4(
    cdiv(a.xy, b.xy),
    cdiv(cmul(b.xy, a.zw), csqr(b.xy))
  );
}`
)}

function _csub(){return(
`
vec4 csub(vec4 a, vec4 b) {
  return a - b;
}

vec4 csub(vec2 a, vec4 b) {
  return vec4(a.xy - b.xy, -b.zw);
}

vec4 csub(vec4 a, vec2 b) {
  return vec4(a.xy - b.xy, a.zw);
}`
)}

function _cadd(){return(
`
vec4 cadd(vec4 a, vec4 b) {
  return a + b;
}

vec4 cadd(vec2 a, vec4 b) {
  return vec4(a.xy + b.xy, b.zw);
}

vec4 cadd(vec4 a, vec2 b) {
  return vec4(a.xy + b.xy, a.zw);
}
`
)}

function _cinv(){return(
`
vec4 cinv(vec4 a) {
  vec2 ainv = cinv(a.xy);
  return vec4(ainv, cmul(a.zw, -csqr(ainv)));
}`
)}

function _csin(){return(
`vec4 csin(vec4 a) {
  vec4 asincos = csincos(a.xy);
  return vec4(asincos.xy, cmul(asincos.zw, a.zw));
}`
)}

function _ccos(){return(
`vec4 ccos(vec4 a) {
  vec4 asincos = csincos(a.xy);
  return vec4(asincos.zw, cmul(-asincos.xy, a.zw));
}`
)}

function _ctan(){return(
`vec4 ctan(vec4 a) {
  return cdiv(csin(a), ccos(a));
}`
)}

function _cexp(){return(
`vec4 cexp(vec4 a) {
  vec2 expa = cexp(a.xy);
  return vec4(expa, cmul(expa, a.zw));
}`
)}

function _csqrt(){return(
`vec4 csqrt(vec4 a) {
  float r = hypot(a.xy);
  float b = sqrt(2.0 * (r + a.x));
  float c = sqrt(2.0 * (r - a.x));
  float re = a.x >= 0.0 ? 0.5 * b : abs(a.y) / c;
  float im = a.x <= 0.0 ? 0.5 * c : abs(a.y) / b;
  vec2 s = vec2(re, a.y < 0.0 ? -im : im);
  return vec4(s, cmul(a.zw, 0.5 * cinv(s)));
}`
)}

function _cpow(){return(
`vec4 cpow(vec4 a, float n) {
  float theta = atan(a.y, a.x);
  float r = hypot(a.xy);
  float tn = theta * n;
  float rn = pow(r, n);
  vec2 s = rn * vec2(sin(tn), cos(tn));
  float rn1 = pow(r, n - 1.0);
  float tn1 = theta * (n - 1.0);
  return vec4(s, cmul(a.zw, n * rn1 * vec2(sin(tn1), cos(tn1))));
}`
)}

function _clog(){return(
`vec4 clog(vec4 z) {
  return vec4(
    log(hypot(z.xy)),
    atan(z.y, z.x),
    cdiv(z.zw, z.xy)
  );
}`
)}

function _catan(){return(
`vec4 catan(vec4 z) {
  vec2 s = clog(cdiv(cadd(vec2(0, 1), z.xy), csub(vec2(0, 1), z.xy)));
  return vec4(
     0.5 * vec2(-s.y, s.x),
     cmul(z.zw, cinv(cadd(vec2(1, 0), csqr(z))))
  );
}`
)}

function _csinh(){return(
`vec4 csinh(vec4 z) {
  vec4 ez = cexp(z);
  return 0.5 * (ez - cinv(ez));
}`
)}

function _ccosh(){return(
`vec4 ccosh(vec4 z) {
  vec4 ez = cexp(z);
  return 0.5 * (ez + cinv(ez));
}`
)}

function _ctanh(){return(
`vec4 ctanh(vec4 z) {
  vec4 ez = cexp(z);
  vec4 ezinv = cinv(ez);
  return 0.5 * cdiv(ez - ezinv, ez + ezinv);
}`
)}

function _casinh(){return(
`vec4 casinh(vec4 z) {
  return clog(cadd(z, csqrt(cadd(vec2(1, 0), csqr(z)))));
}`
)}

function _cacosh(){return(
`vec4 cacosh(vec4 z) {
  return clog(z + cmul(csqrt(cadd(z, vec2(1, 0))), csqrt(csub(z, vec2(1, 0)))));
}`
)}

function _catanh(){return(
`vec4 catanh(vec4 z) {
  return 0.5 * clog(cdiv(cadd(z, vec2(1,  0)), csub(vec2(1, 0), z)));
}`
)}

function _casin(){return(
`vec4 casin(vec4 z) {
  vec4 s = clog(vec4(-z.y, z.x, -z.w, z.z) + csqrt(csub(vec2(1, 0), csqr(z))));
  return vec4(s.y, -s.x, s.w, -s.z);
}`
)}

function _cacos(){return(
`vec4 cacos(vec4 z) {
  vec4 s = -casin(z);
  s.x += HALF_PI;
  return s;
}`
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], _1);
  const child1 = runtime.module(define1);
  main.import("glslComplex", child1);
  main.variable(observer("glslComplexAutoDifferentiation")).define("glslComplexAutoDifferentiation", ["glslComplex","cmul","csqr","cdiv","csub","cadd","cinv","cexp","csqrt","cpow","clog","csin","ccos","ctan","casin","cacos","catan","csinh","ccosh","ctanh","casinh","cacosh","catanh"], _glslComplexAutoDifferentiation);
  main.variable(observer("cmul")).define("cmul", _cmul);
  main.variable(observer("csqr")).define("csqr", _csqr);
  main.variable(observer("cdiv")).define("cdiv", _cdiv);
  main.variable(observer("csub")).define("csub", _csub);
  main.variable(observer("cadd")).define("cadd", _cadd);
  main.variable(observer("cinv")).define("cinv", _cinv);
  main.variable(observer("csin")).define("csin", _csin);
  main.variable(observer("ccos")).define("ccos", _ccos);
  main.variable(observer("ctan")).define("ctan", _ctan);
  main.variable(observer("cexp")).define("cexp", _cexp);
  main.variable(observer("csqrt")).define("csqrt", _csqrt);
  main.variable(observer("cpow")).define("cpow", _cpow);
  main.variable(observer("clog")).define("clog", _clog);
  main.variable(observer("catan")).define("catan", _catan);
  main.variable(observer("csinh")).define("csinh", _csinh);
  main.variable(observer("ccosh")).define("ccosh", _ccosh);
  main.variable(observer("ctanh")).define("ctanh", _ctanh);
  main.variable(observer("casinh")).define("casinh", _casinh);
  main.variable(observer("cacosh")).define("cacosh", _cacosh);
  main.variable(observer("catanh")).define("catanh", _catanh);
  main.variable(observer("casin")).define("casin", _casin);
  main.variable(observer("cacos")).define("cacos", _cacos);
  return main;
}
