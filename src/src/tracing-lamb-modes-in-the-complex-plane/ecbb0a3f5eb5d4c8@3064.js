// https://observablehq.com/@rreusser/integration@3064
import define1 from "./42bad260749be706@203.js";
import define2 from "./9b324adc60e147f8@231.js";
import define3 from "./3d9d1394d858ca97@550.js";

function _1(md){return(
md`# Integration`
)}

function _2(md){return(
md`
- [adaptiveSimpson](#adaptiveSimpson): integrate a one-parameter scalar-valued function using adaptive Simpson's method
- [vectorAdaptiveSimpson](#vectorAdaptiveSimpson): integrate a one-parameter vector-valued function using adaptive Simpson's method
- [odeRK2](#odeRK2): integrate a system of ODEs using second order midpoint integration
- [odeRK4](#odeRK4): integrate a system of ODEs using fourth order Runge-Kutta integration
- [ode45](#ode45): integrate a system of ODEs using Runge-Kutta Order 5(4) (fifth order with a fourth order embedded error estimate. See example usage for n-body simulation [here](https://observablehq.com/d/bebbc3c2079d0940)) (***Experimental***. I believe it is correct and useful, but I have not ensured all of the failure modes corner cases are airtight. One should not, in general, implement or use nontrivial numerics without great consideration. Please do use and improve it if you'd like, but beware.) 

`
)}

function _adaptiveSimpsonSig(signature,adaptiveSimpson,md,$$,PINNED,almostEqual){return(
signature(adaptiveSimpson, {
  description: md`
Integrates a one-parameter scalar-valued function

${$$`\int_a^b f(x)\,dx`}

using [Adaptive Simpson's method](https://en.wikipedia.org/wiki/Adaptive_Simpson%27s_method) integration. Import using

\`\`\`js
import {adaptiveSimpson} from '${PINNED}'
\`\`\`

The method fits a quadratic polynomial to a function, then divides the interval in two and fits two quadratic curves. Based on a resulting error estimate, it either subdivides and recurses until the error tolerance is met or terminates recursion with [Richardson extrapolation](https://en.wikipedia.org/wiki/Richardson_extrapolation). It's simple and relatively robust but has been superseded by nested quadrature methods. See below for a word of warning about functions whose zeros accidentally coincide with sample points!

Options are:
- \`f\` \`{function}\`: function of one variable to be integrated
- \`a\` \`{number}\`: left integration bound
- \`b\` \`{number}\`: right integration bound
- \`tolerance\` \`{number}\`: integration tolerance (optional, default: \`1e-11\`)
- \`maxDepth\` \`{number}\`: maximum recursion depth (optional, default: \`8\`)
- \`minDepth\` \`{number}\`: minimum recursion depth (optional, default: \`0\`)

To avoid a long list of arguments, function also permits a configuration object for the optional arguments:

\`\`\`js
function adaptiveSimpson(f, a, b, {tolerance: number, minDepth: number, maxDepth: number})
\`\`\`
`,
  runTests: true,
  tests: {
    '∫ sin(x) dx for x = [0, π] ~ 2 ': assert =>
      assert(
        almostEqual(adaptiveSimpson(Math.sin, 0, Math.PI, 1e-11, 8), 2),
        '∫ sin(x) dx ~ 2'
      ),
    '∫ sin(x) dx without parameters': assert =>
      assert(almostEqual(adaptiveSimpson(Math.sin, 0, Math.PI), 2)),
    '∫ sin(x) dx with tolerance = 1e-11': assert =>
      almostEqual(adaptiveSimpson(Math.sin, 0, Math.PI, 1e-11), 2),
    'Step function, ∫ (x < 0 ? -1 : 1) dx': assert =>
      almostEqual(
        adaptiveSimpson(x => (x < 0 ? -1 : 1), -1, 1, 1e-2, 20),
        0,
        1e-6,
        1e-6
      ),
    'Incorrect answer when zeros coincide with samples': assert =>
      almostEqual(
        adaptiveSimpson(
          x => 256 * x * Math.sin(256 * x),
          0,
          Math.PI,
          1e-11,
          12,
          5
        ),
        0,
        1e-6,
        1e-6
      ),
    'minDepth forces correct answer when zeros coincide with samples': assert =>
      almostEqual(
        adaptiveSimpson(
          x => 256 * x * Math.sin(256 * x),
          0,
          Math.PI,
          1e-11,
          12,
          7
        ),
        -Math.PI,
        1e-6,
        1e-6
      )
  }
})
)}

function _adaptiveSimpson()
{
  var MAX_PERMITTED_DEPTH = 30;
  var Sri = new Float64Array(MAX_PERMITTED_DEPTH);
  var Sli = new Float64Array(MAX_PERMITTED_DEPTH);
  var fbi = new Float64Array(MAX_PERMITTED_DEPTH);
  var bi = new Float64Array(MAX_PERMITTED_DEPTH);
  var frmi = new Float64Array(MAX_PERMITTED_DEPTH);

  return function adaptiveSimpson(f, a, b, tolerance, maxDepth, minDepth) {
    if (typeof tolerance !== null && typeof tolerance === 'object') {
      minDepth = tolerance.minDepth;
      maxDepth = tolerance.maxDepth;
      tolerance = tolerance.tolerance;
    }
    tolerance = typeof tolerance === "undefined" ? 1e-11 : tolerance;
    maxDepth = typeof maxDepth === "undefined" ? 8 : maxDepth;
    minDepth = typeof minDepth === "undefined" ? 0 : minDepth;

    if (maxDepth > MAX_PERMITTED_DEPTH) {
      throw new Error(
        'Max depth (' +
          maxDepth +
          ') is greater than the maximum permitted depth of ' +
          MAX_PERMITTED_DEPTH
      );
    }
    if (minDepth < 0 || minDepth > MAX_PERMITTED_DEPTH) {
      throw new Error(
        'Min depth (' +
          minDepth +
          ') must be an integer between 0 and ' +
          MAX_PERMITTED_DEPTH
      );
    }

    var left, right, delta, lm, rm, flm, frm;

    // Initialize the position information. Our bitwise scheme works
    // like this: position indicates the x position in terms of an
    // integer from 0 to 2^maxDepth. Each bit can also be interpreted
    // as indicating whether we're currently on the left or right side
    // of the binary branch at the corresponding level.
    var level = maxDepth;
    var depthBit = 1;
    var position;

    var h0 = b - a;
    if (h0 === 0) return 0;
    var m = 0.5 * (b + a);
    var a0 = a;
    var h6 = (b - a) / 6;
    var res = h0 / (1 << maxDepth);
    var fa = f(a);
    var fm = f(m);
    var fb = f(b);
    var S = h6 * (fa + 4 * fm + fb);

    // We only ever compare against 15 * epsilon, so just premultiply
    tolerance *= 15;

    // The layout of points is:
    //     a    m    b
    //       lm   rm
    // We start at level = maxDepth which is the coarsest, then step
    // down into progressively finer levels.
    while (true) {
      h6 = (b - a) * (0.5 / 6);
      lm = 0.5 * (a + m);
      rm = 0.5 * (m + b);
      flm = f(lm);
      frm = f(rm);
      left = h6 * (fa + 4 * flm + fm);
      right = h6 * (fm + 4 * frm + fb);
      delta = left + right - S;

      // Are we at the finest level (level = 0)? Or did we otherwise meet our
      // tolerance? If so, then aggregate information and step back up to
      // coarser levels.
      if (
        level === 0 ||
        (level <= maxDepth - minDepth &&
          Math.abs(delta) * depthBit <= tolerance)
      ) {
        var sum = left + right + delta * 0.066666666666666667;

        // If we're not recursing down, either because we're at the finest level
        // (level = 0) or because the tolerance is met, then this section is an
        // aggregation of the values we computed before with a value we've just
        // computed. We exit this loop as soon as we can step right rather than
        // continuing to aggregate upward.
        while (true) {
          // Are we already on the right side of a split? If so, then aggregate, step
          // up, and then break out of this loop.
          if (position & (1 << level)) {
            // Step up
            position ^= 1 << level;
            depthBit >>>= 1;
            sum += Sli[level];
            level++;
            fb = fbi[level];
            fm = fb;
            m = b;
            b = bi[level];
            continue;
          }

          // The left side of the entire range is just the range itself, [a, b].
          // In this special case we're on the *right* side of this range (there
          // isn't one), which means we've completed the computation and can
          // return the result.
          if (level === maxDepth) return sum;

          // The remainder of this section steps right. That is, we compute a
          // left and right sum and compare it to a coarser sum over the same
          // range. The comparision indicates whether our tolerance is met or
          // not.
          position ^= 1 << level;

          // Update the bounds of the left/right bounds of the current range
          a = b;
          //b = a0 + res * (position + (1 << level))
          fa = fb;
          // Restore from values we computed on the way down
          b = bi[level + 1];
          fb = fbi[level + 1];
          fm = frmi[level + 1];
          S = Sri[level + 1];
          m = 0.5 * (a + b);
          // Store the sum for aggregation on the way back up
          Sli[level] = sum;
          break;
        }
        continue;
      }

      // Step down to a finer level (toward level = 0). Also store values for
      // aggregation on the way back up.
      bi[level] = b;
      fbi[level] = fb;
      Sri[level] = right;
      frmi[level] = frm;
      depthBit <<= 1;
      level--;
      b = m;
      m = lm;
      fb = fm;
      fm = flm;
      S = left;
    }
  };
}


function _5(md){return(
md`
### Notes and examples

The scalar implementation avoids recursive function calls by traversing the binary tree with bitwise operations. When not bound by the speed of the integrand, this cuts about 30% off of the run time which was, to be perfectly honest, not nearly as much as I'd hoped. But it's still consistently faster and numerically identical, so I've kept it.`
)}

function _6(md,$$){return(
md`To use, pass it a one-parameter function and bounds, e.g., ${$$`\int_0^\pi \sin x \,dx = 2`}`
)}

function _7(adaptiveSimpson){return(
adaptiveSimpson(Math.sin, 0, Math.PI)
)}

function _8(md){return(
md`Alternatively, specifying options via an object,`
)}

function _9(adaptiveSimpson){return(
adaptiveSimpson(Math.sin, 0, Math.PI, {
  tolerance: 1e-11,
  maxDepth: 8,
  minDepth: 2
})
)}

function _10(md,tex){return(
md`

Note that it is always possible to construct a function whose zeros will align exactly with the sample points. (Thank you, [Mark McClure](https://observablehq.com/@mcmcclur) for calling attention to this case!) Consider for integer values of ${tex`n`}, the integral

${tex.block`
\begin{aligned}
& \int_0^\pi \left(2^n x\right) \sin\left(2^n x\right) dx \\
&=2^{-n} \sin\left(2^n \pi \right) - \pi \cos\left(2^n \pi \right) \\
&= -\pi
\end{aligned}
`}
`
)}

function _11(md,tex){return(
md`However, the sample points fall precisely on power-of-two divisions of the interval ${tex`[0, \pi]`}, which for this function all happen to be precisely zero! Recursion immediately terminates and returns a final result of zero. Thus, we do not get the correct answer unless we set \`minDepth\` to at least ${tex`n - 1`} and introduce non-zero values which trigger recursion.`
)}

function _n(){return(
4
)}

function _13(adaptiveSimpson,n){return(
adaptiveSimpson(x => 2 ** n * x * Math.sin(2 ** n * x), 0, Math.PI, {
  tolerance: 1e-12,
  minDepth: n - 1,
  maxDepth: 12
})
)}

function _14(md){return(
md`The relative ease of constructing such a function is one downside of this method.`
)}

function _15(md){return(
md`
## vectorAdaptiveSimpson([out, ]f, a, b[, tolerance[, maxDepth[, n]]])`
)}

function _vectorAdaptiveSimpson()
{
  function createAdaptiveVectorIntegrator (n, outputs) {
    var i = cb => new Array(n).fill(0).map((d, ii) => cb(ii));
    var fa = i(i => `fa${i}`).join(', ')
    var fm = i(i => `fm${i}`).join(', ')
    var fb = i(i => `fb${i}`).join(', ')
    var fml = i(i => `fml${i}`).join(', ')
    var fmr = i(i => `fmr${i}`).join(', ')
    var S = i(i => `S${i}`).join(', ')
    var left = i(i => `left${i}`).join(', ')
    var right = i(i => `right${i}`).join(', ')
    
    var str = `
var tmp = new Array(${n})
var tmp2 = new Array(40).fill(0).map(() => new Array(${n}))
function adsimp (out, f, a, b, ${fa}, ${fm}, ${fb}, ${S}, epsilon, maxdepth) {
  var i, dx
  var h = (b - a) * 0.5
  var m = (a + b) * 0.5
  var h6 = h / 6
  ${outputs ? 'f(tmp, ' : 'tmp = f('}(a + m) * 0.5)
${i(i => `  var fml${i} = tmp[${i}]`).join('\n')}
${i(i => `  var left${i} = h6 * (fa${i} + 4 * fml${i} + fm${i})`).join('\n')}
  ${outputs ? 'f(tmp, ' : 'tmp = f('}(m + b) * 0.5)
${i(i => `  var fmr${i} = tmp[${i}]`).join('\n')}
${i(i => `  var right${i} = h6 * (fm${i} + 4 * fmr${i} + fb${i})`).join('\n')}
${i(i => `  var dx${i} = left${i} + right${i} - S${i}`).join('\n')}
  var l2err = Math.sqrt(${i(i => `dx${i} * dx${i}`).join('+')})
  if (maxdepth <= 0 || l2err <= 15 * epsilon) {
${i(i => `  out[${i}] = left${i} + right${i} + dx${i} / 15;`).join('\n')}
  } else {
    m = (a + b) * 0.5
    epsilon *= 0.5
    maxdepth--
    var dst = tmp2[maxdepth]
    adsimp(dst, f, a, m, ${fa}, ${fml}, ${fm}, ${left}, epsilon, maxdepth)
${i(i => `    out[${i}] = dst[${i}]`).join('\n')}
    adsimp(dst, f, m, b, ${fm}, ${fmr}, ${fb}, ${right}, epsilon, maxdepth)
${i(i => `    out[${i}] += dst[${i}]`).join('\n')}
  }
  return out
}
        
return function (result, f, fa, a, b, tolerance, maxdepth) {
  var i, n
  /*${outputs ? 'f(tmp, ' : 'tmp = f('}a);*/
${i(i => `  var fa${i} = fa[${i}]`).join('\n')}
  ${outputs ? 'f(tmp, ' : 'tmp = f('}0.5 * (a + b));
${i(i => `  var fm${i} = tmp[${i}]`).join('\n')}
  ${outputs ? 'f(tmp, ' : 'tmp = f('}b);
${i(i => `  var fb${i} = tmp[${i}]`).join('\n')}
  var h6 = (b - a) / 6
${i(i => `  var S${i} = (fa${i} + 4 * fm${i} + fb${i}) * h6`).join('\n')}
   return adsimp(result, f, a, b, ${fa}, ${fm}, ${fb}, ${S}, tolerance, maxdepth);
}`
    // Uncomment to view the generated code
    // console.log(str)
    return new Function(str)();
  }
    
  var integratorCache = new Map();
  
  return function integrateVectorFunctionAdaptiveSimpson (result, f, a, b, tolerance, maxDepth, n) {
    // Shift arguments if result not provided
    if (typeof result === 'function') {
      n = maxDepth; maxDepth = tolerance; tolerance = b; b = a; a = f; f = result
      result = []
    }
    // Perform one function evaluation up front to check the size of the output
    // if not explicitly specified. Either way, we do still make use of it.
    var outputs = f.length === 2
    var fa
    if (outputs) {
      fa = []
      f(fa, a)
    } else {
      fa = f(a)
    }
    if (n === undefined) n = fa.length
    var key = n.toString() + (outputs ? 'o' : '');
    var cachedIntegrator = integratorCache.get(key)
    if (!cachedIntegrator) {
      cachedIntegrator = createAdaptiveVectorIntegrator(n, outputs)
      integratorCache.set(n, cachedIntegrator)
    }
    
    if (tolerance === undefined) tolerance = 1e-11
    if (maxDepth === undefined) maxDepth = 8
    
    // Adjust the tolerance so that, all other things equal, it corresponds
    // to the scalar version. That is, integrating the same function twice
    // as a vector will behave the same as integrating it as a scalar.
    tolerance /= Math.sqrt(n)
    
    return cachedIntegrator(result, f, fa, a, b, tolerance, maxDepth)
  }
}


function _17(md,$$){return(
md`

\`\`\`js
import {vectorAdaptiveSimpson} from '@rreusser/integration'
\`\`\`

Integrates a one-parameter vector-valued function

${$$`\int_a^b \begin{bmatrix} f(x) \\ g(x) \\ \vdots \end{bmatrix}  \,dx`}

The vector version of this function uses the recursive function implementation and performs code generation to avoid allocating many tiny arrays or explicitly looping over dimensions in the inner loops.

To use, pass it a destination array, a dimension, and then parameters as you would for the single-parameter version above, e.g. ${$$`\int_0^\pi \begin{bmatrix} \sin x \\ \cos x \end{bmatrix} \,dx = \begin{bmatrix} 2 \\ 0 \end{bmatrix} `}
`
)}

function _18(vectorAdaptiveSimpson){return(
vectorAdaptiveSimpson(t => [Math.sin(t), Math.cos(t)], 0, Math.PI)
)}

function _19(md){return(
md`You may pass preallocated destination arguments for both the function and the overall output to avoid allocating many small arrays that must be garbage collected.`
)}

function _20(vectorAdaptiveSimpson){return(
vectorAdaptiveSimpson([],         // output destination (optional)
                      (out, t) => {out[0] = Math.sin(t); out[1] = Math.cos(t)},
                      0, Math.PI, // a, b
                      1e-11,      // tolerance (optional)
                      8,          // max recursion depth (optional)
                      2)
)}

function _21(test,almostEqual,vectorAdaptiveSimpson,arrayAlmostEqual){return(
test('Vector Adaptive Simpson\'s Method', t => {
  t.ok(almostEqual(
    vectorAdaptiveSimpson([], (out, x) => {
      out[0] = Math.sin(x)
    }, 0, Math.PI, 1e-11, 8, 1)[0], 2),
    '∫_0^π [sin(x)] dx ~ [2]'
  )
  
  t.ok(arrayAlmostEqual(
      vectorAdaptiveSimpson([], (out, x) => {
        out[0] = Math.sin(x)
        out[1] = Math.cos(x)
      }, 0, Math.PI, 1e-11, 8, 2),
      [2, 0]
    ),
    '∫_0^π [sin(x), cos(x)] dx ~ [2, 0]'
  )
  
  t.ok(arrayAlmostEqual(
      vectorAdaptiveSimpson([], (out, x) => {
        out[0] = Math.cos(x)
        out[1] = Math.sin(x)
      }, 0, Math.PI, 1e-11, 8, 2),
      [0, 2]
    ),
    '∫_0^π [cos(x), sin(x)] dx ~ [0, 2]'
  )
  
  t.ok(arrayAlmostEqual(
    vectorAdaptiveSimpson([], (out, t) => {out[0] = Math.sin(t); out[1] = Math.cos(t)}, 0, Math.PI, undefined, undefined, 2),
    [2, 0]
  ), 'with result output, a dimension, and a function which writes to out')
  
  t.ok(arrayAlmostEqual(
    vectorAdaptiveSimpson([], (out, t) => {out[0] = Math.sin(t); out[1] = Math.cos(t)}, 0, Math.PI),
    [2, 0]
  ), 'with result output and a function which writes to out')
  
  t.ok(arrayAlmostEqual(
    vectorAdaptiveSimpson((out, t) => {out[0] = Math.sin(t); out[1] = Math.cos(t)}, 0, Math.PI),
    [2, 0]
  ), 'with no output and a function which writes to out')
  
  t.ok(arrayAlmostEqual(
    vectorAdaptiveSimpson(t => [Math.sin(t), Math.cos(t)], 0, Math.PI),
    [2, 0]
  ), 'with no output and a function which outputs directly')
  
  t.ok(arrayAlmostEqual(
    vectorAdaptiveSimpson([], t => [Math.sin(t), Math.cos(t)], 0, Math.PI),
    [2, 0]
  ), 'with output and a function which outputs directly')
  
  t.ok(arrayAlmostEqual(
    vectorAdaptiveSimpson([], t => [Math.sin(t), Math.cos(t)], 0, Math.PI, undefined, undefined, 2),
    [2, 0]
  ), 'with output, a dimension, and a function which outputs directly')
  
})
)}

function _22(md){return(
md`## odeRK2 (out, y, f, dt[, t[, n]])`
)}

function _odeRK2(nextPow2)
{
  var scratch = new Float64Array(1024);
  var k1, work;
  return function odeRK2(out, y, f, dt, t, n) {
    var i;
    var inPlace = out === y;
    t = t === undefined ? 0 : t;
    n = n === undefined ? y.length : n;
    if (n * 2 > scratch.length) {
      scratch = new Float64Array(nextPow2(n * 2));
    }
    if (!work || work.length !== n) {
      work = scratch.subarray(0, n);
      k1 = scratch.subarray(n, 2 * n);
    }
    var w = inPlace ? work : out;
    var dt2 = dt * 0.5;

    var tmp = f(k1, y, t);
    var writesOutput = tmp !== undefined && tmp.length >= n;
    var k1tmp = writesOutput ? tmp : k1;
    for (i = 0; i < n; i++) {
      w[i] = y[i] + k1tmp[i] * dt2;
    }
    tmp = f(k1, w, t + dt2);
    k1tmp = writesOutput ? tmp : k1;
    for (i = 0; i < n; i++) {
      out[i] = y[i] + k1tmp[i] * dt;
    }

    return out;
  };
}


function _24(md,PINNED,$$,$){return(
md`

\`\`\`js
import {odeRK2} from '${PINNED}'
\`\`\`

Performs a single iteration of [second order Runge-Kutta](https://en.wikipedia.org/wiki/Runge–Kutta_methods) (midpoint) integration on the vector [ordinary differential equation](https://en.wikipedia.org/wiki/Ordinary_differential_equation) (ODE)

${$$`
\dot{y} = f(t, y),\quad y(t_0) = y_{initial}
`}

where ${`y`} is the state vector and ${$`y_{initial}`} represents the intial conditions. If ${$`t`} is not specified or not relevant (common for [time-invariant systems](https://en.wikipedia.org/wiki/Time-invariant_system)), it is assumed ${$`0`}.

The derivative function \`f(yp, y, t)\` may write the derivative \`yp\` to the first argument it receives. For example, to integrate the system
${$$`
\begin{aligned}
\frac{d}{dt}\begin{bmatrix}y_0 \\ y_1\end{bmatrix} =& \begin{bmatrix} y_1 \\ -y_0\end{bmatrix} \\
y(0) =& \begin{bmatrix}1 \\ 0 \end{bmatrix}, \end{aligned}
`}
you may write
`
)}

function _25(odeRK2)
{
  var y = [1, 0];
  var steps = 20;
  var dt = (Math.PI * 2) / steps;
  var t = 0;
  for (var i = 0; i < steps; i++) {
    odeRK2(
      y,
      y,
      (yp, y, t) => {
        yp[0] = y[1];
        yp[1] = -y[0];
      },
      dt
    );
    t += dt;
  }
  return y;
}


function _26(md){return(
md`The above should be preferred since it minimizes garbage collection of many small arrays, but for simplicity, if you ignore the first argument and return a new array, that will be used instead.`
)}

function _27(odeRK2)
{
  var y = [1, 0]
  var steps = 20
  var dt = Math.PI * 2 / steps
  for (var i = 0; i < steps; i++) {
    odeRK2(y, y, (_, y) => [y[1], -y[0]], dt)
  }
  return y
}


function _28(md){return(
md`## odeRK4 (out, y, f, dt[, t[, n]])`
)}

function _odeRK4(nextPow2)
{
  var scratch = new Float64Array(1024);
  var k1, k2, k3, k4, work;
  return function odeRK4(out, y, f, dt, t, n) {
    var i;
    var inPlace = out === y;
    t = t === undefined ? 0 : t;
    n = n === undefined ? y.length : n;
    if (n * 5 > scratch.length) {
      scratch = new Float64Array(nextPow2(n * 5));
    }
    if (!work || work.length !== n) {
      work = scratch.subarray(0, n);
      k1 = scratch.subarray(1 * n, 2 * n);
      k2 = scratch.subarray(2 * n, 3 * n);
      k3 = scratch.subarray(3 * n, 4 * n);
      k4 = scratch.subarray(4 * n, 5 * n);
    }
    var w = inPlace ? work : out;
    var dt6 = dt / 6.0;

    var tmp = f(k1, y, t);
    var returnsOutput = tmp !== undefined && tmp.length >= n;
    var k1tmp = returnsOutput ? tmp : k1;
    for (i = 0; i < n; i++) {
      w[i] = y[i] + k1tmp[i] * dt * 0.5;
    }
    tmp = f(k2, w, t + dt * 0.5);
    var k2tmp = returnsOutput ? tmp : k2;
    for (i = 0; i < n; i++) {
      w[i] = y[i] + k2tmp[i] * dt * 0.5;
    }
    tmp = f(k3, w, t + dt * 0.5);
    var k3tmp = returnsOutput ? tmp : k3;
    for (i = 0; i < n; i++) {
      w[i] = y[i] + k3tmp[i] * dt;
    }
    tmp = f(k4, w, t + dt);
    var k4tmp = returnsOutput ? tmp : k4;
    for (i = 0; i < n; i++) {
      out[i] = y[i] + dt6 * (k1tmp[i] + k4tmp[i] + 2 * (k2tmp[i] + k3tmp[i]));
    }

    return out;
  };
}


function _30(md,PINNED,$$,$){return(
md`

\`\`\`js
import {odeRK4} from '${PINNED}'
\`\`\`

Performs a single iteration of [fourth order Runge-Kutta](https://en.wikipedia.org/wiki/Runge–Kutta_methods) integration on the vector [ordinary differential equation](https://en.wikipedia.org/wiki/Ordinary_differential_equation) (ODE)

${$$`
\dot{y} = f(t, y),\quad y(t_0) = y_{initial}
`}

where ${`y`} is the state vector and ${$`y_{initial}`} represents the intial conditions. If ${$`t`} is not specified or not relevant (common for [time-invariant systems](https://en.wikipedia.org/wiki/Time-invariant_system)), it is assumed ${$`0`}.

The derivative function \`f(yp, y, t)\` may write the derivative \`yp\` to the first argument it receives. For example, to integrate the system
${$$`
\begin{aligned}
\frac{d}{dt}\begin{bmatrix}y_0 \\ y_1\end{bmatrix} =& \begin{bmatrix} y_1 \\ -y_0\end{bmatrix} \\
y(0) =& \begin{bmatrix}1 \\ 0 \end{bmatrix}, \end{aligned}
`}
you may write
`
)}

function _31(odeRK4)
{
  var y = [1, 0]
  var steps = 20
  var dt = Math.PI * 2 / steps
  var t = 0
  for (var i = 0; i < steps; i++){
    odeRK4(y, y, (yp, y, t) => {
      yp[0] = y[1];
      yp[1] = -y[0]
    }, dt)
    t += dt
  }
  return y
}


function _32(md){return(
md`The above should be preferred since it minimizes garbage collection of many small arrays, but for simplicity, if you ignore the first argument and return a new array, that will be used instead.`
)}

function _33(odeRK4)
{
  var y = [1, 0]
  var steps = 20
  var dt = Math.PI * 2 / steps
  for (var i = 0; i < steps; i++) {
    odeRK4(y, y, (_, y) => [y[1], -y[0]], dt)
  }
  return y
}


function _34(md){return(
md`To store the full history, pass a new output array for each iteration and store the resulting output.`
)}

function _35(odeRK4)
{
  var yn = [[1, 0]]
  var steps = 10
  var dt = Math.PI * 2 / steps
  for (var i = 0; i < steps; i++) {
    yn.push(odeRK4([], yn[i], (_, y) => [y[1], -y[0]], dt))
  }
  return yn
}


function _36(test,odeRK4,arrayAlmostEqual){return(
test('Fourth order Runge-Kutta', function (test) {
  test.test('y\' = t √y with y(0) = 1 integrated from t = 0 to t = 1', function (test) {
    var y = [1]
    var t = 0
    var steps = 50
    var dt = 1 / steps
    for (var i = 0; i < steps; i++) {
      odeRK4(y, y, (_, y, t) => [t * Math.sqrt(y[0])], dt, t)
      t += dt
    }
    test.ok(arrayAlmostEqual(y, [25 / 16], 1e-8), 'in-place output with f that returns a new array ~ 25 / 16')
    
    y = [1]
    t = 0
    for (i = 0; i < steps; i++) {
      odeRK4(y, y, (out, y, t) => {out[0] = t * Math.sqrt(y[0])}, dt, t)
      t += dt
    }
    test.ok(arrayAlmostEqual(y, [25 / 16], 1e-8), 'in-place output with f that writes to a derivative function ~ 25 / 16')
    
    var out = [1]
    y = [1]
    t = 0
    for (i = 0; i < steps; i++) {
      y[0] = out[0]
      odeRK4(out, y, (out, y, t) => {out[0] = t * Math.sqrt(y[0])}, dt, t)
      t += dt
    }
    test.ok(arrayAlmostEqual(out, [25 / 16], 1e-8), 'f that writes to a derivative function ~ 25 / 16')
    
    out = [1]
    y = [1]
    var t = 0
    var steps = 50
    var dt = 1 / steps
    for (var i = 0; i < steps; i++) {
      y[0] = out[0]
      odeRK4(out, y, (_, y, t) => [t * Math.sqrt(y[0])], dt, t)
      t += dt
    }
    test.ok(arrayAlmostEqual(out, [25 / 16], 1e-8), 'f that returns a new array ~ 25 / 16')
  })
  
})
)}

function _37(md){return(
md`## ode45([outputState, ]inputState, f[, options])`
)}

function _38(md){return(
md `### ***EXPERIMENTAL; IN DEVELOPMENT***`
)}

function _ode45(nextPow2)
{
  var EPSILON = 2.220446049250313e-16;

  function minMag(a, b) {
    return (a > 0 ? Math.min : Math.max)(a, b);
  }

  function maxMag(a, b) {
    return (a > 0 ? Math.max : Math.min)(a, b);
  }

  var scratch = new Float64Array(1024);
  var k1tmp, k2tmp, k3tmp, k4tmp, k5tmp, k6tmp, w;

  function ode45(outputState, inputState, f, options) {
    if (typeof f !== 'function') {
      options = f;
      f = inputState;
      inputState = outputState;
    }
    var i, tmp, k1, k2, k3, k4, k5, k6;
    options = options || {};
    var out = outputState || {};

    var tolerance = options.tolerance === undefined ? 1e-8 : +options.tolerance;
    let tolerance2 = tolerance * tolerance;
    var maxIncreaseFactor =
      options.maxIncreaseFactor === undefined ? 10 : options.maxIncreaseFactor;
    var maxDecreaseFactor =
      options.maxDecreaseFactor === undefined ? 10 : options.maxDecreaseFactor;
    var tLimit =
      options.tLimit === undefined
        ? inputState.dt > 0.0
          ? Infinity
          : -Infinity
        : options.tLimit;

    var safetyFactor = 0.9;
    var y = inputState.y;
    var n = y.length;
    var dt = inputState.dt === undefined ? 1.0 : +inputState.dt;
    var t = inputState.t === undefined ? 0.0 : +inputState.t;
    if (out.y === undefined) {
      out.y = new Float64Array(n);
    }
    var yOut = out.y;
    var inPlace = yOut === y;

    if (n * 7 > scratch.length) {
      scratch = new Float64Array(nextPow2(n * 7));
    }
    if (!w || w.length !== n) {
      w = scratch.subarray(0, n);
      k1tmp = scratch.subarray(1 * n, 2 * n);
      k2tmp = scratch.subarray(2 * n, 3 * n);
      k3tmp = scratch.subarray(3 * n, 4 * n);
      k4tmp = scratch.subarray(4 * n, 5 * n);
      k5tmp = scratch.subarray(5 * n, 6 * n);
      k6tmp = scratch.subarray(6 * n, 7 * n);
    }

    // Values from the Butcher tableau:
    // var a21 =  0.200000000000000000 // 1/5
    // var a31 =  0.075000000000000000 // 3/40
    // var a32 =  0.225000000000000000 // 9/40
    // var a41 =  0.300000000000000000 // 3/10
    // var a42 = -0.900000000000000000 // -9/10
    // var a43 =  1.200000000000000000 // 6/5
    // var a51 = -0.203703703703703703 // -11/54
    // var a52 =  2.500000000000000000 // 5/2
    // var a53 = -2.592592592592592592 // -70/27
    // var a54 =  1.296296296296296296 // 35/27
    // var a61 =  0.029495804398148148 // 1631/55296
    // var a62 =  0.341796875000000000 // 175/512
    // var a63 =  0.041594328703703703 // 575/13824
    // var a64 =  0.400345413773148148 // 44275/110592
    // var a65 =  0.061767578125000000 // 253/4096

    // var b1  =  0.000000000000000000 // 0
    // var b2  =  0.200000000000000000 // 1/5
    // var b3  =  0.300000000000000000 // 3/10
    // var b4  =  0.600000000000000000 // 3/5
    // var b5  =  1.000000000000000000 // 1
    // var b6  =  0.875000000000000000 // 7/8

    // Same for every step, so don't repeat:

    var w = inPlace ? w : out;

    tmp = f(k1tmp, y, t);
    var returnsOutput = tmp !== undefined && tmp.length >= n;
    k1 = returnsOutput ? tmp : k1tmp;

    var limitReached = false;
    var trialStep = 0;
    var thisDt = dt;
    while (true && trialStep++ < 1000) {
      thisDt = minMag(thisDt, tLimit - t);

      for (i = 0; i < n; i++) {
        w[i] = y[i] + thisDt * (0.2 * k1[i]);
      }

      tmp = f(k2tmp, w, t + dt * 0.2);
      k2 = returnsOutput ? tmp : k2tmp;

      for (i = 0; i < n; i++) {
        w[i] = y[i] + thisDt * (0.075 * k1[i] + 0.225 * k2[i]);
      }
      tmp = f(k3tmp, w, t + thisDt * 0.3);
      k3 = returnsOutput ? tmp : k3tmp;

      for (i = 0; i < n; i++) {
        w[i] = y[i] + thisDt * (0.3 * k1[i] + -0.9 * k2[i] + 1.2 * k3[i]);
      }

      tmp = f(k4tmp, w, t + thisDt * 0.6);
      k4 = returnsOutput ? tmp : k4tmp;

      for (i = 0; i < n; i++) {
        w[i] =
          y[i] +
          thisDt *
            (-0.203703703703703703 * k1[i] +
              2.5 * k2[i] +
              -2.592592592592592592 * k3[i] +
              1.296296296296296296 * k4[i]);
      }

      tmp = f(k5tmp, w, t + thisDt);
      var k5 = returnsOutput ? tmp : k5tmp;

      for (i = 0; i < n; i++) {
        w[i] =
          y[i] +
          thisDt *
            (0.029495804398148148 * k1[i] +
              0.341796875 * k2[i] +
              0.041594328703703703 * k3[i] +
              0.400345413773148148 * k4[i] +
              0.061767578125 * k5[i]);
      }

      tmp = f(k6tmp, w, t + thisDt * 0.875);
      var k6 = returnsOutput ? tmp : k6tmp;

      // Compute error:
      //var cs1 =  0.102177372685185185 // 2825/27648
      //var cs2 =  0.000000000000000000 // 0
      //var cs3 =  0.383907903439153439 // 18575/48384
      //var cs4 =  0.244592737268518518 // 13525/55296
      //var cs5 =  0.019321986607142857 // 277/14336
      //var cs6 =  0.250000000000000000 // 1/4

      //var dc1 =  0.004293774801587301 // cs1 - c1
      //var dc2 =  0.000000000000000000 // cs2 - c2
      //var dc3 = -0.018668586093857832 // cs3 - c3
      //var dc4 =  0.034155026830808080 // cs4 - c4
      //var dc5 =  0.019321986607142857 // cs5 - c5
      //var dc6 = -0.039102202145680406 // cs6 - c6

      var error2 = 0;
      for (var i = 0; i < n; i++) {
        let d =
          thisDt *
          (0.004293774801587301 * k1[i] +
            -0.018668586093857832 * k3[i] +
            0.034155026830808080 * k4[i] +
            0.019321986607142857 * k5[i] +
            -0.039102202145680406 * k6[i]);
        error2 += d * d;
      }

      if (error2 < tolerance2 || thisDt === 0.0) {
        break;
      }

      var nextDt = safetyFactor * thisDt * Math.pow(tolerance2 / error2, 0.1);
      thisDt = maxMag(thisDt / maxDecreaseFactor, nextDt);
    }

    // Perform the final update
    // var c1 = 0.097883597883597883 // 37/378
    // var c2 = 0.000000000000000000 // 0
    // var c3 = 0.402576489533011272 // 250/621
    // var c4 = 0.210437710437710437 // 125/594
    // var c5 = 0.000000000000000000 // 0
    // var c6 = 0.289102202145680406 // 512/1771

    for (var i = 0; i < n; i++) {
      y[i] +=
        thisDt *
        (0.097883597883597883 * k1[i] +
          0.402576489533011272 * k3[i] +
          0.210437710437710437 * k4[i] +
          0.289102202145680406 * k6[i]);
    }
    var previousDt = thisDt;
    out.t += thisDt;

    // Update dt for the next step (grow a bit if possible)
    nextDt = safetyFactor * thisDt * Math.pow(tolerance2 / error2, 0.125);
    out.dt = maxMag(
      thisDt / maxDecreaseFactor,
      minMag(thisDt * maxIncreaseFactor, nextDt)
    );
    out.dtPrevious = thisDt;
    out.limitReached =
      isFinite(tLimit) &&
      Math.abs((out.t - options.tLimit) / previousDt) < EPSILON;

    return out;
  }

  return ode45;
}


function _40(md,PINNED,$$,$){return(
md`

\`\`\`js
import {ode45} from '${PINNED}'
\`\`\`

Performs a single iteration of [fifth order Runge-Kutta with a fourth order embedded error estimate](https://en.wikipedia.org/wiki/Cash%E2%80%93Karp_method) on the vector [ordinary differential equation](https://en.wikipedia.org/wiki/Ordinary_differential_equation) (ODE)

${$$`
\dot{y} = f(t, y),\quad y(t_0) = y_{initial}
`}

where ${`y`} is the state vector and ${$`y_{initial}`} represents the intial conditions. If ${$`t`} is not specified or not relevant (common for [time-invariant systems](https://en.wikipedia.org/wiki/Time-invariant_system)), it is assumed ${$`0`}.

The derivative function \`f(outputState, inputState, y, options)\` may write the derivative \`yp\` to the first argument it receives. For example, to integrate the system
${$$`
\begin{aligned}
\frac{d}{dt}\begin{bmatrix}y_0 \\ y_1\end{bmatrix} =& \begin{bmatrix} y_1 \\ -y_0\end{bmatrix} \\
y(0) =& \begin{bmatrix}1 \\ 0 \end{bmatrix}, \end{aligned}
`}
from ${$`t = 0`} to ${$`t = 200\pi`}, you may write
`
)}

function _41(ode45)
{
  var state = {y: [1, 0], t: 0}
  var options = {tLimit: Math.PI * 2 * 100.0, tolerance: 1e-15}
  var t1 = performance.now();
  while (!state.limitReached) {
    ode45(state, (yp, y, t) => {yp[0] = y[1], yp[1] = -y[0]}, options)
  }
  var t2 = performance.now();
  console.log(t2 - t1)
  return state
}


function _42(test,ode45,almostEqual,arrayAlmostEqual){return(
test('Runge-Kutta order 5(4)', function (test) {
  test.test('y\' = [y1, -y0] integrated from t = 0 to t = 2π', function (test) {
    var state = {
      y: [1, 0],
      t: 0,
      dt: 1.0,
    };
    var options = {
      tLimit: Math.PI * 2.0,
      tolerance: 1e-8,
    }

    while (options.tLimit - state.t) {
      ode45(state, state, (out, y, t) => {
        out[0] = y[1]
        out[1] = -y[0]
      }, options)
      console.log(state)
    }
    
    test.ok(almostEqual(state.t, Math.PI * 2), 'integrated to 2π')
    test.ok(arrayAlmostEqual(state.y, [1, 0], 1e-7), 'y(t=2π) ~ [1, 0]')
  })
  
})
)}

function _43(md){return(
md`## Assorted explorations`
)}

function _instrumentedSine()
{
  var callCount = 0
  function f (x) {
    f.callCount++
    return Math.sin(x)
  }
  f.reset = function () { f.callCount = 0 }
  f.callCount = 0
  return f
}


function _45(instrumentedSine,adaptiveSimpson)
{
  instrumentedSine.reset()
  var integral = adaptiveSimpson(instrumentedSine, 0, Math.PI, 1e-4, 5)
  return {
    value: integral,
    callCount: instrumentedSine.callCount
  }
}


function _46(md){return(
md`## Imports`
)}

function _50(md){return(
md`## License

The code in this notebook is MIT Licensed.`
)}

function _LICENSE(){return(
"mit"
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["md"], _2);
  main.variable(observer("adaptiveSimpsonSig")).define("adaptiveSimpsonSig", ["signature","adaptiveSimpson","md","$$","PINNED","almostEqual"], _adaptiveSimpsonSig);
  main.variable(observer("adaptiveSimpson")).define("adaptiveSimpson", _adaptiveSimpson);
  main.variable(observer()).define(["md"], _5);
  main.variable(observer()).define(["md","$$"], _6);
  main.variable(observer()).define(["adaptiveSimpson"], _7);
  main.variable(observer()).define(["md"], _8);
  main.variable(observer()).define(["adaptiveSimpson"], _9);
  main.variable(observer()).define(["md","tex"], _10);
  main.variable(observer()).define(["md","tex"], _11);
  main.variable(observer("n")).define("n", _n);
  main.variable(observer()).define(["adaptiveSimpson","n"], _13);
  main.variable(observer()).define(["md"], _14);
  main.variable(observer()).define(["md"], _15);
  main.variable(observer("vectorAdaptiveSimpson")).define("vectorAdaptiveSimpson", _vectorAdaptiveSimpson);
  main.variable(observer()).define(["md","$$"], _17);
  main.variable(observer()).define(["vectorAdaptiveSimpson"], _18);
  main.variable(observer()).define(["md"], _19);
  main.variable(observer()).define(["vectorAdaptiveSimpson"], _20);
  main.variable(observer()).define(["test","almostEqual","vectorAdaptiveSimpson","arrayAlmostEqual"], _21);
  main.variable(observer()).define(["md"], _22);
  main.variable(observer("odeRK2")).define("odeRK2", ["nextPow2"], _odeRK2);
  main.variable(observer()).define(["md","PINNED","$$","$"], _24);
  main.variable(observer()).define(["odeRK2"], _25);
  main.variable(observer()).define(["md"], _26);
  main.variable(observer()).define(["odeRK2"], _27);
  main.variable(observer()).define(["md"], _28);
  main.variable(observer("odeRK4")).define("odeRK4", ["nextPow2"], _odeRK4);
  main.variable(observer()).define(["md","PINNED","$$","$"], _30);
  main.variable(observer()).define(["odeRK4"], _31);
  main.variable(observer()).define(["md"], _32);
  main.variable(observer()).define(["odeRK4"], _33);
  main.variable(observer()).define(["md"], _34);
  main.variable(observer()).define(["odeRK4"], _35);
  main.variable(observer()).define(["test","odeRK4","arrayAlmostEqual"], _36);
  main.variable(observer()).define(["md"], _37);
  main.variable(observer()).define(["md"], _38);
  main.variable(observer("ode45")).define("ode45", ["nextPow2"], _ode45);
  main.variable(observer()).define(["md","PINNED","$$","$"], _40);
  main.variable(observer()).define(["ode45"], _41);
  main.variable(observer()).define(["test","ode45","almostEqual","arrayAlmostEqual"], _42);
  main.variable(observer()).define(["md"], _43);
  main.variable(observer("instrumentedSine")).define("instrumentedSine", _instrumentedSine);
  main.variable(observer()).define(["instrumentedSine","adaptiveSimpson"], _45);
  main.variable(observer()).define(["md"], _46);
  const child1 = runtime.module(define1);
  main.import("test", child1);
  const child2 = runtime.module(define2);
  main.import("almostEqual", child2);
  main.import("arrayAlmostEqual", child2);
  main.import("$", child2);
  main.import("$$", child2);
  main.import("nextPow2", child2);
  const child3 = runtime.module(define3);
  main.import("signature", child3);
  main.import("PINNED", child3);
  main.variable(observer()).define(["md"], _50);
  main.variable(observer("LICENSE")).define("LICENSE", _LICENSE);
  return main;
}
