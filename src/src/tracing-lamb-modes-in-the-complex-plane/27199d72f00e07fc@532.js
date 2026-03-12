function _1(md,tex){return(
md`# complex-auto-differentiation

This module implements math operations on complex numbers with [automatic differentiation](https://en.wikipedia.org/wiki/Automatic_differentiation). It implements operations for both regular complex numbers ${tex`a + b i`} as an ordered pair ${tex`[a, b]`} and with the differential attached, ${tex`[a, b, da, db]`}. The shorthand is \`D\` for dual numbers (a number and its derivative if you're like  me and don't mind being a bit sloppy with terminology) and \`S\` for regular scalars (single?) numbers. Binary operations require specification of both shorthand suffixes; unary operations require just one.

This module is still in development, though what's here is tested within reason. Not all basic arithmetic and trig functions have been implemented. Good accuracy and avoiding overflow is a strong desire but not an absolute priority. Use at your own risk. 
`
)}

function _complex(ccreateS,ccreateD,cfromValuesD,cfromValuesS,csetValuesD,csetValuesS,ccopyS,ccopyD,cscaleS,cscaleD,caddSS,caddSD,caddDS,caddDD,csubSS,csubSD,csubDS,csubDD,cmulSS,cmulSD,cmulDS,cmulDD,cinvS,cdivSS,cdivSD,cdivDS,cdivDD,csqrS,csqrD,csqrtD,csqrtS,cexpD,cexpS,csinhcoshD){return(
{
  createS: ccreateS,
  createD: ccreateD,
  fromValuesD: cfromValuesD,
  fromValuesS: cfromValuesS,
  setValuesD: csetValuesD,
  setValuesS: csetValuesS,
  copyS: ccopyS,
  copyD: ccopyD,
  scaleS: cscaleS,
  scaleD: cscaleD,
  addSS: caddSS,
  addSD: caddSD,
  addDS: caddDS,
  addDD: caddDD,
  subSS: csubSS,
  subSD: csubSD,
  subDS: csubDS,
  subDD: csubDD,
  mulSS: cmulSS,
  mulSD: cmulSD,
  mulDS: cmulDS,
  mulDD: cmulDD,
  invS: cinvS,
  divSS: cdivSS,
  divSD: cdivSD,
  divDS: cdivDS,
  divDD: cdivDD,
  sqrS: csqrS,
  sqrD: csqrD,
  sqrtD: csqrtD,
  sqrtS: csqrtS,
  expD: cexpD,
  expS: cexpS,
  sinhcoshD: csinhcoshD
}
)}

function _3(md){return(
md`## Aliases`
)}

function _ccreate(ccreateS){return(
ccreateS
)}

function _cfromValues(cfromValuesS){return(
cfromValuesS
)}

function _csetValues(csetValuesS){return(
csetValuesS
)}

function _ccopy(ccopyS){return(
ccopyS
)}

function _cscale(cscaleS){return(
cscaleS
)}

function _cadd(caddSS){return(
caddSS
)}

function _csub(csubSS){return(
csubSS
)}

function _cmul(cmulSS){return(
cmulSS
)}

function _cdiv(cdivSS){return(
cdivSS
)}

function _cinv(cinvS){return(
cinvS
)}

function _csqr(csqrS){return(
csqrS
)}

function _csqrt(csqrtS){return(
csqrtS
)}

function _creal(){return(
function creal (a) {
  return a[0];
}
)}

function _cimag(){return(
function cimag(a) {
  return a[1];
}
)}

function _18(md){return(
md`## Create a new number`
)}

function _ccreateS(){return(
function ccreateS () {
  return [0, 0]
}
)}

function _ccreateD(){return(
function ccreateD () {
  return [0, 0, 0, 0]
}
)}

function _21(md){return(
md`## Create a new number from values`
)}

function _cfromValuesD(){return(
function cfromValuesD (a, b, c, d) {
  return [a, b, c, d]
}
)}

function _cfromValuesS(){return(
function cfromValuesS (a, b) {
  return [a, b]
}
)}

function _24(md){return(
md`## Set the values of an existing number`
)}

function _csetValuesD(){return(
function csetValuesD (out, a, b, c, d) {
  out[0] = a
  out[1] = b
  out[2] = c
  out[3] = d
  return out
}
)}

function _csetValuesS(){return(
function csetValuesS (out, a, b) {
  out[0] = a
  out[1] = b
  return out
}
)}

function _27(md){return(
md`## Copy a number`
)}

function _ccopyS(){return(
function ccopyS (out, a) {
  out[0] = a[0]
  out[1] = a[1]
  return out
}
)}

function _ccopyD(){return(
function ccopyD (out, a) {
  out[0] = a[0]
  out[1] = a[1]
  out[2] = a[2]
  out[3] = a[3]
  return out
}
)}

function _30(md){return(
md`## Scale by a scalar`
)}

function _cscaleS(){return(
function cscaleS (out, a, s) {
  out[0] = a[0] * s
  out[1] = a[1] * s
  return out
}
)}

function _cscaleD(){return(
function cscaleD (out, a, s) {
  out[0] = a[0] * s
  out[1] = a[1] * s
  out[2] = a[2] * s
  out[3] = a[3] * s
  return out
}
)}

function _33(md){return(
md`## Addition`
)}

function _caddSS(){return(
function caddSS (out, a, b) {
  out[0] = a[0] + b[0]
  out[1] = a[1] + b[1]
  return out
}
)}

function _caddSD(){return(
function caddSD (out, a, b) {
  out[0] = a[0] + b[0]
  out[1] = a[1] + b[1]
  out[2] = b[2]
  out[3] = b[3]
  return out
}
)}

function _caddDS(){return(
function caddDS (out, a, b) {
  out[0] = a[0] + b[0]
  out[1] = a[1] + b[1]
  out[2] = a[2]
  out[3] = a[3]
  return out
}
)}

function _caddDD(){return(
function caddDD (out, a, b) {
  out[0] = a[0] + b[0]
  out[1] = a[1] + b[1]
  out[2] = a[2] + b[2]
  out[3] = a[3] + b[3]
  return out
}
)}

function _38(assertEqual,caddSS,caddSD,caddDS,caddDD)
{
  assertEqual(caddSS([], [0, 1], [4, 5]), [4, 6])
  assertEqual(caddSD([], [0, 1], [4, 5, 6, 7]), [4, 6, 6, 7])
  assertEqual(caddDS([], [0, 1, 2, 3], [4, 5]), [4, 6, 2, 3])
  assertEqual(caddDD([], [0, 1, 2, 3], [4, 5, 6, 7]), [4, 6, 8, 10])
  return '✔︎ addition tests passed'
}


function _39(md){return(
md`## Subtraction`
)}

function _csubSS(){return(
function csubSS (out, a, b) {
  out[0] = a[0] - b[0]
  out[1] = a[1] - b[1]
  return out
}
)}

function _csubSD(){return(
function csubSD (out, a, b) {
  out[0] = a[0] - b[0]
  out[1] = a[1] - b[1]
  out[2] = -b[2]
  out[3] = -b[3]
  return out
}
)}

function _csubDS(){return(
function csubDS (out, a, b) {
  out[0] = a[0] - b[0]
  out[1] = a[1] - b[1]
  out[2] = a[2]
  out[3] = a[3]
  return out
}
)}

function _csubDD(){return(
function csubDD (out, a, b) {
  out[0] = a[0] - b[0]
  out[1] = a[1] - b[1]
  out[2] = a[2] - b[2]
  out[3] = a[3] - b[3]
  return out
}
)}

function _44(assertEqual,csubSS,csubSD,csubDS,csubDD)
{
  assertEqual(csubSS([], [0, 1], [4, 5]), [-4, -4])
  assertEqual(csubSD([], [0, 1], [4, 5, 6, 7]), [-4, -4, -6, -7])
  assertEqual(csubDS([], [0, 1, 2, 3], [4, 5]), [-4, -4, 2, 3])
  assertEqual(csubDD([], [0, 1, 2, 3], [4, 5, 6, 7]), [-4, -4, -4, -4])
  return '✔︎ subtraction tests passed'
}


function _45(md){return(
md`## Multiplication`
)}

function _cmulSS(){return(
function cmulSS (out, a, b) {
  var ar = a[0], ai = a[1]
  var br = b[0], bi = b[1]
  out[0] = ar * br - ai * bi
  out[1] = ar * bi + ai * br
  return out
}
)}

function _cmulSD(){return(
function cmulSD (out, a, b) {
  var ar = a[0], ai = a[1]
  var br = b[0], bi = b[1], bu = b[2], bv = b[3]
  out[0] = ar * br - ai * bi
  out[1] = ar * bi + ai * br
  out[2] = ar * bu - ai * bv
  out[3] = ar * bv + ai * bu
  return out;
}
)}

function _cmulDS(){return(
function cmulDS (out, a, b) {
  var ar = a[0], ai = a[1], au = a[2], av = a[3]
  var br = b[0], bi = b[1]
  out[0] = ar * br - ai * bi
  out[1] = ar * bi + ai * br
  out[2] = au * br - av * bi
  out[3] = au * bi + av * br
  return out;
}
)}

function _cmulDD(){return(
function cmulDD (out, a, b) {
  var ar = a[0], ai = a[1], dar = a[2], av = a[3]
  var br = b[0], bi = b[1], bu = b[2], bv = b[3]
  out[0] = ar * br - ai * bi;
  out[1] = ar * bi + ai * br;
  out[2] = ar * bu - ai * bv + dar * br - av * bi;
  out[3] = ar * bv + ai * bu + dar * bi + av * br;
  return out;
}
)}

function _51(assertEqual,cmulSS,cmulSD,cmulDS,cmulDD)
{
  var a = [1, 2, 2, 3]
  var b = [3, -5, 1, -2]
  assertEqual(cmulSS([], a, b), [13, 1])
  assertEqual(cmulSD([], a, b), [13, 1, 5, 0])
  assertEqual(cmulDS([], a, b), [13, 1, 21, -1])
  assertEqual(cmulDD([], a, b), [13, 1, 26, -1])
  return '✔︎ multiplication tests passed'
}


function _52(md){return(
md`## Reciprocal`
)}

function _cinvS(){return(
function cinvS (out, b) {
  var br = b[0], bi = b[1]
  var e, f;
  if (Math.abs(br) >= Math.abs(bi)) {
    e = bi / br
    f = 1 / (br + bi * e)
    out[0] = f
    out[1] = -e * f
  } else {
    e = br / bi
    f = 1 / (br * e + bi)
    out[0] = e * f
    out[1] = -f
  }
  return out
}
)}

function _54(assertEqual,cinvS)
{
  var a = [1, 2]
  assertEqual(cinvS([], a), [0.2, -0.4])
  return '✔︎ reciprocal tests passed'
}


function _55(md){return(
md`## Division`
)}

function _cdivSS(){return(
function cdivSS (out, a, b) {
  var ar = a[0], ai = a[1]
  var br = b[0], bi = b[1]
  var e, f;
  if (Math.abs(br) >= Math.abs(bi)) {
    e = bi / br
    f = 1 / (br + bi * e)
    out[0] = (ar + ai * e) * f
    out[1] = (ai - ar * e) * f
  } else {
    e = br / bi
    f = 1 / (br * e + bi)
    out[0] = (ar * e + ai) * f
    out[1] = (ai * e - ar) * f
  }
  return out
}
)}

function _cdivSD(){return(
function cdivSD (out, a, b) {
  var ar = a[0], ai = a[1]
  var br = b[0], bi = b[1], dbr = b[2], dbi = b[3]
  var aobr, aobi
  var e, f
  var r = Math.abs(br) >= Math.abs(bi)
  if (r) {
    e = bi / br
    f = 1 / (br + bi * e)
    out[0] = aobr = (ar + ai * e) * f
    out[1] = aobi = (ai - ar * e) * f
  } else {
    e = br / bi
    f = 1 / (br * e + bi)
    out[0] = aobr = (ar * e + ai) * f
    out[1] = aobi = (ai * e - ar) * f
  }
  
  // Compute the differential - a * db / b^2 but instead as
  // -((a / b) * db) / b
  var numr = aobr * dbr - aobi * dbi
  var numi = aobr * dbi + aobi * dbr
  
  if (r) {
    e = bi / br
    f = 1 / (br + bi * e)
    out[2] = -(numr + numi * e) * f
    out[3] = -(numi - numr * e) * f
  } else {
    e = br / bi
    f = 1 / (br * e + bi)
    out[2] = -(numr * e + numi) * f
    out[3] = -(numi * e - numr) * f
  }
  return out
}
)}

function _cdivDS(){return(
function cdivDS (out, a, b) {
  var ar = a[0], ai = a[1], dar = a[2], dai = a[3]
  var br = b[0], bi = b[1]
  var aobr, aobi
  var e, f
  var r = Math.abs(br) >= Math.abs(bi)
  if (r) {
    e = bi / br
    f = 1 / (br + bi * e)
    out[0] = aobr = (ar + ai * e) * f
    out[1] = aobi = (ai - ar * e) * f
  } else {
    e = br / bi
    f = 1 / (br * e + bi)
    out[0] = aobr = (ar * e + ai) * f
    out[1] = aobi = (ai * e - ar) * f
  }
  
  // Compute the differential da / b
  if (r) {
    e = bi / br
    f = 1 / (br + bi * e)
    out[2] = (dar + dai * e) * f
    out[3] = (dai - dar * e) * f
  } else {
    e = br / bi
    f = 1 / (br * e + bi)
    out[2] = (dar * e + dai) * f
    out[3] = (dai * e - dar) * f
  }
  return out
}
)}

function _cdivDD(){return(
function cdivDD (out, a, b) {
  var ar = a[0], ai = a[1], au = a[2], av = a[3]
  var br = b[0], bi = b[1], bu = b[2], bv = b[3]
  var aobr, aobi
  var e, f
  var r = Math.abs(br) >= Math.abs(bi)
  if (r) {
    e = bi / br
    f = 1 / (br + bi * e)
    out[0] = aobr = (ar + ai * e) * f
    out[1] = aobi = (ai - ar * e) * f
  } else {
    e = br / bi
    f = 1 / (br * e + bi)
    out[0] = aobr = (ar * e + ai) * f
    out[1] = aobi = (ai * e - ar) * f
  }
  
  // Compute the differential (b * da - a * db) / b^2 but instead as
  // (da - (a / b) * db) / b so that we use the result we've already
  // computed and avoid floating point overflow
  var numr = au - aobr * bu + aobi * bv
  var numi = av - aobr * bv - aobi * bu
  
  if (r) {
    e = bi / br
    f = 1 / (br + bi * e)
    out[2] = (numr + numi * e) * f
    out[3] = (numi - numr * e) * f
  } else {
    e = br / bi
    f = 1 / (br * e + bi)
    out[2] = (numr * e + numi) * f
    out[3] = (numi * e - numr) * f
  }
  return out
}
)}

function _60(assertEqual,cdivSS,cdivSD,cdivDS,cdivDD)
{
  var a = [1, 2, 2, 3]
  var b = [3, -5, 1, -2]
  assertEqual(cdivSS([], a, b), [
    -0.20588235294117646,
    0.3235294117647059
  ])
  assertEqual(cdivSD([], a, b), [
    -0.20588235294117646,
    0.3235294117647059,
    0.06920415224913495,
    -0.12975778546712805
  ])
  assertEqual(cdivDS([], a, b), [
    -0.20588235294117646,
    0.3235294117647059,
    -0.2647058823529412,
    0.5588235294117647
  ])
  assertEqual(cdivDD([], a, b), [
    -0.20588235294117646,
    0.3235294117647059,
    -0.19550173010380623,
    0.42906574394463676
  ])
  
  return '✔︎ division tests passed'
}


function _61(md){return(
md`## Square`
)}

function _csqrS(){return(
function csqrS (out, a) {
  var ar = a[0]
  var ai = a[1]
  out[0] = ar * ar - ai * ai
  out[1] = 2.0 * ar * ai
  return out
}
)}

function _csqrD(){return(
function csqrD (out, a) {
  var ar = a[0], ai = a[1], au = a[2], av = a[3]
  out[0] = ar * ar - ai * ai
  out[1] = 2 * ar * ai
  out[2] = 2 * (ar * au - ai * av)
  out[3] = 2 * (ar * av + ai * au)
  return out;
}
)}

function _64(assertEqual,csqrS,csqrD)
{
  var a = [1, 2, 2, 3]
  assertEqual(csqrS([], a), [-3, 4])
  assertEqual(csqrD([], a), [-3, 4, -8, 14])
  return '✔︎ square tests passed'
}


function _65(md){return(
md`## Square root`
)}

function _csqrtD(){return(
function csqrtD (out, a) {
  var ar = a[0], ai = a[1], au = a[2], av = a[3]
  var mod = Math.hypot(ar, ai)
  var br, bi
  var c = Math.sqrt(2 * (mod + ar))
  var d = Math.sqrt(2 * (mod - ar))
  br = ar >= 0 ? 0.5 * c : Math.abs(ai) / d
  bi = ar <= 0 ? 0.5 * d : Math.abs(ai) / c
  bi = ai < 0 ? -bi : bi
  
  out[0] = br
  out[1] = bi
  
  var e, f;
  if (Math.abs(br) >= Math.abs(bi)) {
    e = bi / br
    f = 0.5 / (br + bi * e)
    out[2] = (au + av * e) * f
    out[3] = (av - au * e) * f
  } else {
    e = br / bi
    f = 0.5 / (br * e + bi)
    out[2] = (au * e + av) * f
    out[3] = (av * e - au) * f
  }
  
  return out
}
)}

function _csqrtAltD(){return(
function csqrtAltD(out, a) {
  var ar = -a[0],
    ai = -a[1],
    au = -a[2],
    av = -a[3];
  var mod = Math.hypot(ar, ai);
  var br, bi;
  var c = Math.sqrt(2 * (mod + ar));
  var d = Math.sqrt(2 * (mod - ar));
  br = ar >= 0 ? 0.5 * c : Math.abs(ai) / d;
  bi = ar <= 0 ? 0.5 * d : Math.abs(ai) / c;
  bi = ai < 0 ? -bi : bi;

  out[0] = -bi;
  out[1] = br;

  var e, f;
  if (Math.abs(br) >= Math.abs(bi)) {
    e = bi / br;
    f = 0.5 / (br + bi * e);
    out[2] = -(av - au * e) * f;
    out[3] = (au + av * e) * f;
  } else {
    e = br / bi;
    f = 0.5 / (br * e + bi);
    out[2] = -(av * e - au) * f;
    out[3] = (au * e + av) * f;
  }

  return out;
}
)}

function _csqrtS(){return(
function csqrtS (out, a) {
  var ar = a[0], ai = a[1], au = a[2], av = a[3]
  var mod = Math.hypot(ar, ai)
  var br, bi
  if (ar >= 0) {
    br = 0.5 * Math.sqrt(2 * (mod + ar))
  } else {
    br = Math.abs(ai) / Math.sqrt(2 * (mod - ar))
  }
  if (ar <= 0) {
    bi = 0.5 * Math.sqrt(2 * (mod - ar))
  } else {
    bi = Math.abs(ai) / Math.sqrt(2 * (mod + ar))
  }
  
  out[0] = br
  out[1] = bi = ai < 0 ? -bi : bi
  return out
}
)}

function _69(assertEqual,csqrtS,csqrtD)
{
  var a = [1, 2, 2, 3]
  assertEqual(csqrtS([], a), [1.272019649514069, 0.7861513777574233])
  assertEqual(csqrtD([], a), [1.272019649514069, 0.7861513777574233, 1.0962308573869974, 0.5017191372545318])
  return '✔︎ square root tests passed'
}


function _70(md){return(
md`## Exponential`
)}

function _cexpS(){return(
function cexpS (out, a) {
  var ai = a[1]
  var e = Math.exp(a[0])
  out[0] = e * Math.cos(ai)
  out[1] = e * Math.sin(ai)
  return out
}
)}

function _cexpD(){return(
function cexpD (out, a) {
  var ar = a[0], ai = a[1], au = a[2], av = a[3]
  var e = Math.exp(ar)
  var re = e * Math.cos(ai)
  var im = e * Math.sin(ai)
  out[0] = re
  out[1] = im
  out[2] = re * au - im * av
  out[3] = re * av + im * au
  return out
}
)}

function _73(assertEqual,cexpD)
{
  var a = [1, 2, 2, 3]
  assertEqual(cexpD([], a), [-1.1312043837568135, 2.4717266720048188, -9.677588783528083, 1.5498401927391967])
  return '✔︎ exponential tests passed'
}


function _74(md){return(
md`## Hyperbolic Trig`
)}

function _csinhcoshD(){return(
function csinhcoshD (sinhOut, coshOut, a) {
  var ar = a[0], ai = a[1], dar = a[2], dai = a[3]
  var e = Math.exp(ar)
  var c = 0.5 * Math.cos(ai)
  var s = 0.5 * Math.sin(ai)
  var epr = c * e
  var epi = s * e
  var emr = c / e
  var emi = -s / e
  var epu = epr * dar - epi * dai
  var epv = epr * dai + epi * dar
  var emu = emr * dar - emi * dai
  var emv = emr * dai + emi * dar
  var sr = sinhOut[0] = epr - emr
  var si = sinhOut[1] = epi - emi  
  var cr = coshOut[0] = epr + emr
  var ci = coshOut[1] = epi + emi  
  sinhOut[2] = cr * dar - ci * dai
  sinhOut[3] = cr * dai + ci * dar
  coshOut[2] = sr * dar - si * dai
  coshOut[3] = sr * dai + si * dar
}
)}

function _76(csinhcoshD,assertEqual)
{
  var a = [1, 2, 2, 3]
  var sinh = []
  var cosh = []
  csinhcoshD(sinh, cosh, a)
  assertEqual(sinh, [-0.4890562590412937, 1.4031192506220405, -4.490118513579374, 0.21077046861899662])
  assertEqual(cosh, [-0.64214812471552, 1.0686074213827783, -5.187470269948708, 1.3390697241201999])
  return '✔︎ hyperbolic trig tests passed'
}


function _77(md){return(
md`## Test helper`
)}

function _assertEqual(){return(
function assertEqual (a, b, tol) {
  tol = 1e-14
  if (a.length !== b.length) throw new Error('Expected a.length (='+a.length+') to equal b.length (='+b.length+')')
  for (var i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > tol) throw new Error('Expected a['+i+'] (='+a[i]+') to equal b['+i+'] (='+b[i]+')')
  }
}
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md","tex"], _1);
  main.variable(observer("complex")).define("complex", ["ccreateS","ccreateD","cfromValuesD","cfromValuesS","csetValuesD","csetValuesS","ccopyS","ccopyD","cscaleS","cscaleD","caddSS","caddSD","caddDS","caddDD","csubSS","csubSD","csubDS","csubDD","cmulSS","cmulSD","cmulDS","cmulDD","cinvS","cdivSS","cdivSD","cdivDS","cdivDD","csqrS","csqrD","csqrtD","csqrtS","cexpD","cexpS","csinhcoshD"], _complex);
  main.variable(observer()).define(["md"], _3);
  main.variable(observer("ccreate")).define("ccreate", ["ccreateS"], _ccreate);
  main.variable(observer("cfromValues")).define("cfromValues", ["cfromValuesS"], _cfromValues);
  main.variable(observer("csetValues")).define("csetValues", ["csetValuesS"], _csetValues);
  main.variable(observer("ccopy")).define("ccopy", ["ccopyS"], _ccopy);
  main.variable(observer("cscale")).define("cscale", ["cscaleS"], _cscale);
  main.variable(observer("cadd")).define("cadd", ["caddSS"], _cadd);
  main.variable(observer("csub")).define("csub", ["csubSS"], _csub);
  main.variable(observer("cmul")).define("cmul", ["cmulSS"], _cmul);
  main.variable(observer("cdiv")).define("cdiv", ["cdivSS"], _cdiv);
  main.variable(observer("cinv")).define("cinv", ["cinvS"], _cinv);
  main.variable(observer("csqr")).define("csqr", ["csqrS"], _csqr);
  main.variable(observer("csqrt")).define("csqrt", ["csqrtS"], _csqrt);
  main.variable(observer("creal")).define("creal", _creal);
  main.variable(observer("cimag")).define("cimag", _cimag);
  main.variable(observer()).define(["md"], _18);
  main.variable(observer("ccreateS")).define("ccreateS", _ccreateS);
  main.variable(observer("ccreateD")).define("ccreateD", _ccreateD);
  main.variable(observer()).define(["md"], _21);
  main.variable(observer("cfromValuesD")).define("cfromValuesD", _cfromValuesD);
  main.variable(observer("cfromValuesS")).define("cfromValuesS", _cfromValuesS);
  main.variable(observer()).define(["md"], _24);
  main.variable(observer("csetValuesD")).define("csetValuesD", _csetValuesD);
  main.variable(observer("csetValuesS")).define("csetValuesS", _csetValuesS);
  main.variable(observer()).define(["md"], _27);
  main.variable(observer("ccopyS")).define("ccopyS", _ccopyS);
  main.variable(observer("ccopyD")).define("ccopyD", _ccopyD);
  main.variable(observer()).define(["md"], _30);
  main.variable(observer("cscaleS")).define("cscaleS", _cscaleS);
  main.variable(observer("cscaleD")).define("cscaleD", _cscaleD);
  main.variable(observer()).define(["md"], _33);
  main.variable(observer("caddSS")).define("caddSS", _caddSS);
  main.variable(observer("caddSD")).define("caddSD", _caddSD);
  main.variable(observer("caddDS")).define("caddDS", _caddDS);
  main.variable(observer("caddDD")).define("caddDD", _caddDD);
  main.variable(observer()).define(["assertEqual","caddSS","caddSD","caddDS","caddDD"], _38);
  main.variable(observer()).define(["md"], _39);
  main.variable(observer("csubSS")).define("csubSS", _csubSS);
  main.variable(observer("csubSD")).define("csubSD", _csubSD);
  main.variable(observer("csubDS")).define("csubDS", _csubDS);
  main.variable(observer("csubDD")).define("csubDD", _csubDD);
  main.variable(observer()).define(["assertEqual","csubSS","csubSD","csubDS","csubDD"], _44);
  main.variable(observer()).define(["md"], _45);
  main.variable(observer("cmulSS")).define("cmulSS", _cmulSS);
  main.variable(observer("cmulSD")).define("cmulSD", _cmulSD);
  main.variable(observer("cmulDS")).define("cmulDS", _cmulDS);
  main.variable(observer("cmulDD")).define("cmulDD", _cmulDD);
  main.variable(observer()).define(["assertEqual","cmulSS","cmulSD","cmulDS","cmulDD"], _51);
  main.variable(observer()).define(["md"], _52);
  main.variable(observer("cinvS")).define("cinvS", _cinvS);
  main.variable(observer()).define(["assertEqual","cinvS"], _54);
  main.variable(observer()).define(["md"], _55);
  main.variable(observer("cdivSS")).define("cdivSS", _cdivSS);
  main.variable(observer("cdivSD")).define("cdivSD", _cdivSD);
  main.variable(observer("cdivDS")).define("cdivDS", _cdivDS);
  main.variable(observer("cdivDD")).define("cdivDD", _cdivDD);
  main.variable(observer()).define(["assertEqual","cdivSS","cdivSD","cdivDS","cdivDD"], _60);
  main.variable(observer()).define(["md"], _61);
  main.variable(observer("csqrS")).define("csqrS", _csqrS);
  main.variable(observer("csqrD")).define("csqrD", _csqrD);
  main.variable(observer()).define(["assertEqual","csqrS","csqrD"], _64);
  main.variable(observer()).define(["md"], _65);
  main.variable(observer("csqrtD")).define("csqrtD", _csqrtD);
  main.variable(observer("csqrtAltD")).define("csqrtAltD", _csqrtAltD);
  main.variable(observer("csqrtS")).define("csqrtS", _csqrtS);
  main.variable(observer()).define(["assertEqual","csqrtS","csqrtD"], _69);
  main.variable(observer()).define(["md"], _70);
  main.variable(observer("cexpS")).define("cexpS", _cexpS);
  main.variable(observer("cexpD")).define("cexpD", _cexpD);
  main.variable(observer()).define(["assertEqual","cexpD"], _73);
  main.variable(observer()).define(["md"], _74);
  main.variable(observer("csinhcoshD")).define("csinhcoshD", _csinhcoshD);
  main.variable(observer()).define(["csinhcoshD","assertEqual"], _76);
  main.variable(observer()).define(["md"], _77);
  main.variable(observer("assertEqual")).define("assertEqual", _assertEqual);
  return main;
}
