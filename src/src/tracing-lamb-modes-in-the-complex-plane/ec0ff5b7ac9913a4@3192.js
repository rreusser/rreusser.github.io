import define1 from "./ecbb0a3f5eb5d4c8@3064.js";
import define2 from "./a82f06f54ea1d92b@1679.js";
import define3 from "./ab07a49dc1b41864@288.js";
import define4 from "./cd031a35d971578a@1768.js";
import define5 from "./27199d72f00e07fc@532.js";
import define6 from "./8f43e61e794de5e1@1781.js";
import define7 from "./71528f76392e620f@170.js";
import define8 from "./b1c1bcfaa4edd969@153.js";
import define9 from "./f61b02d403e368c6@212.js";
import define10 from "./2ef1e084af5636f7@102.js";
import define11 from "./2f20d5b55f4d0b31@205.js";

function _1(md){return(
md`# Tracing Lamb Wave Modes in the Complex Plane`
)}

function _2(tex,md){return(
md`Elastic waves traveling through a flat plate are called [Lamb waves](https://en.wikipedia.org/wiki/Lamb_waves). They exist in discrete symmetric and antisymmetric modes. The combination of the governing PDE together with stress-free boundary conditions gives the dispersion relation,

${tex.block`\displaystyle {\frac {\tanh(\beta d/2)}{\tanh(\alpha d/2)}}=\left[{\frac {4\alpha \beta k^{2}}{(k^{2}+\beta ^{2})^{2}}}\right]^{\pm 1}`}

where symmetric modes correspond to exponent ${tex`+1`} and antisymmetric modes to ${tex`-1`}. Here, ${tex`d`} is the plate thickness and ${tex`\alpha`} and ${tex`\beta`} are given by

${tex.block`\alpha^2 = k^2 - \frac{\omega^2}{c_l^2}`}
${tex.block`\beta^2 = k^2 - \frac{\omega^2}{c_t^2}.`}

In the above equations, ${tex`k`} is the wavenumber and ${tex`\omega`} is the temporal frequency. ${tex`c_l`} and ${tex`c_t`} are the longitudinal and transverse wave speeds (p- and s-wave speeds), respectively.

And that's everything! From here it's as simple as finding roots to determine the modes. Which turns out to be relatively complicated.
`
)}

function _3(tex,md){return(
md`First, the above function is meromorphic. It has poles, zeros, and branch cuts. Gross. We can cross-multiply and rewrite the function to remove poles. For symmetric modes,

${tex.block`\displaystyle 

\begin{aligned}
f(\omega, k) = &\;
{\sinh(\beta d/2) \cosh(\alpha d/2) (k^{2}+\beta ^{2})^{2}}\\
& -
\sinh(\alpha d/2) \cosh(\beta d/2) 4\alpha \beta k^{2}
\end{aligned}
`}

 We can construct an equivalent relation for antisymmetric modes. We'll still have branch cuts via ${tex`\alpha`} and ${tex`\beta`}, but this is a significant improvement.

The above equation is solved when

${tex.block`f(\omega, k) = 0.`}`
)}

function _4(md){return(
md`## Computation method

The plots above illustrate solutions of this equation in the complex wavenumber plane, tabulated over a range of frequencies. All math is performed using automatic differentiation to compute derivatives together with values. This is implemented in [@rreusser/complex-auto-differentiation](https://observablehq.com/@rreusser/complex-auto-differentiation). Derivative-free methods exist, but this makes some tasks like Newton iteration somewhat easier.
`
)}

function _5(md){return(
md`
### Roots for a single frequency slice

First, we compute roots for a single frequency slice.

- Roots are computed using the Delves-Lyness method via contour integration. I've written up an explanation in [Finding Roots in the Complex Plane](https://observablehq.com/@rreusser/finding-roots-in-the-complex-plane)
- Roots are refined using Newton iteration.
`
)}

function _6(tex,md){return(
md`
### Tracing roots over frequency

Once computed, roots are traced through varying frequency. If we ran the above method over and over, independently for each frequency slice, we'd find two things. First, it would take a long time. Second, we'd have discrete sets of roots at each frequency. We could match them greedily and construct continuous paths, but this is slow. Instead, we trace them.

Given a root at ${tex`(\omega_0, k_0),`} the basic method is to perfom a Taylor series expansion,

${tex.block`f(\omega_0+\Delta \omega, k_0 + \Delta k) = \frac{\partial f}{\partial \omega} \Delta \omega + \frac{\partial f}{\partial k} \Delta k.`}

For brevity, evaluation of derivatives at ${tex`(\omega_0, k_0)`} is implied. When tracing roots, we seek to maintain ${tex`f(\omega, k) = 0,`} so that we set the ${tex`f`} term above to zero and rearrange, yielding

${tex.block`\frac{\partial f}{\partial \omega} \Delta \omega = -\frac{\partial f}{\partial k} \Delta k.`}

The direction ${tex`(\Delta \omega, \Delta k)`} represents the tangent direction at which ${tex`f(\omega, k) = 0`} is maintained. Thus, we frame this as an ODE and integrate.

I've used my adaptive ODE45 implementation from [@rreusser/integration](https://observablehq.com/@rreusser/integration).

There is some trickiness, for example when two roots meet along the complex axis and then immediately diverge along the real axis. If we're not careful, we'll follow the wrong branch for one or the other. To work around this, I've added a very small amount of viscoelasticity to bias roots toward one direction or the other. 

Finally, since exact equality with zero is not maintained, I've used a couple passes of complex Newton iteration.`
)}

function _7(tex,md){return(
md`## Material properties

Without loss of generality, I've chosen unit properties, with the exception of [Poisson's ratio](https://en.wikipedia.org/wiki/Poisson%27s_ratio), ${tex`\nu`}, which is non-dimensional.`
)}

function _E(scifmt){return(
scifmt`E = ${1} Pa`
)}

function _ρ(fmt){return(
fmt`ρ = ${1} kg/m³`
)}

function _ν(fmt){return(
fmt`ν = ${0.3}`
)}

function _d(fmt){return(
fmt`d = ${1} m`
)}

function _12(md){return(
md`## Roots for a single frequency slice`
)}

function _f(Inputs){return(
Inputs.range([0.005, 4], {
  step: 0.0001,
  value: 1,
  label: "Frequency, f, Hz"
})
)}

function _radius(Inputs){return(
Inputs.range([1, 60], {
  label: "Initial search radius",
  value: 40
})
)}

function _parity(Inputs){return(
Inputs.radio(["symmetric", "antisymmetric"], {
  value: "symmetric",
  label: "Parity"
})
)}

function _pl(plot,DomainColoringLayer,fLambDispersion,domainColoringConfig,wd,cl,ct,roots,parity,ComplexVariable,html)
{
  const pl = plot([
    DomainColoringLayer(fLambDispersion, "z", {
      ...domainColoringConfig,
      shadeRange: [20, 55]
    }),
    ...[wd, cl, ct],
    ...roots[parity].map((r) => ComplexVariable({ value: r }))
  ]);
  const el = html`<figure>${pl}<figcaption>Constant-frequency slice of the Lamb wave dispersion relation.</figure>`;
  el.value = pl.value;
  return el;
}


function _17(md){return(
md`## Roots traced through varying frequency`
)}

function _viewOpts(Inputs){return(
Inputs.checkbox(
  ["symmetric", "antisymmetric", "pure real", "pure imaginary", "complex"],
  {
    value: [
      "symmetric",
      "antisymmetric",
      "pure real",
      "pure imaginary",
      "complex"
    ]
  }
)
)}

function _θ(Inputs){return(
Inputs.range([1e-8, Math.PI], {
  step: 0.00001,
  value: 1e-8,
  label: "Viscoelastic loss angle, radians",
  transform: Math.log
})
)}

function _regl(reglCanvas,viewport,html)
{
  const regl = reglCanvas(null, {
    width: viewport.width,
    height: viewport.height,
    pixelRatio: viewport.pixelRatio,
    attributes: {
      preserveDrawingBuffer: true
    },
    extensions: [
      "OES_standard_derivatives",
      "ANGLE_instanced_arrays",
      "OES_texture_float"
    ],
    optionalExtensions: ["OES_vertex_array_object"]
  });
  regl.value._gl.canvas.style.cursor = "crosshair";
  const el = html`<figure>${regl}<figcaption>Symmetric (red) and antisymmetric (blue) Lamb wave modes. Click to select/deselect a mode.</figure>`;
  el.value = regl.value;
  return el;
}


function _regl2(reglCanvas,viewport,html)
{
  const regl = reglCanvas(null, {
    width: viewport.width,
    height: Math.round(viewport.width * 0.2),
    pixelRatio: viewport.pixelRatio,
    attributes: {
      preserveDrawingBuffer: true
    },
    extensions: [
      "OES_standard_derivatives",
      "ANGLE_instanced_arrays",
      "OES_texture_float",
      "OES_element_index_uint"
    ],
    optionalExtensions: ["OES_vertex_array_object"]
  });

  const el = html`<figure>${regl}<figcaption>Displacement visualized along the plate cross section.</figure>`;
  el.value = regl.value;
  return el;
}


function _mag(Inputs){return(
Inputs.range([0.01, 1], {
  transform: Math.log,
  label: "Magnitude"
})
)}

function _speed(Inputs){return(
Inputs.range([0.1, 10], {
  transform: Math.log,
  label: "Speed",
  value: 1
})
)}

function _animate(Inputs){return(
Inputs.checkbox(["animate"], { value: ["animate"] })
)}

function _selectedMode(){return(
{
  type: null,
  frequency: NaN,
  wavenumber: [NaN, NaN],
  locked: false
}
)}

function _drawMode(glslComplex,regl2){return(
new Map(
  ((regl) =>
    [
      {
        type: "symmetric",
        func: `vec2 lambDisplacement(vec2 position, float time, vec2 k, float omega, out float fade) {      
        vec2 wt = vec2(omega * time, 0.0);
        vec2 psi = cexp(cmul(vec2(0, 1), k * position.x - wt));
        fade = smoothstep(4.0, 1.0, length(psi));
        vec2 k2 = csqr(k);
        vec2 a2 = cinv(csqr(cl)) * (omega * omega) - k2;
        vec2 b2 = cinv(csqr(ct)) * (omega * omega) - k2;
        vec2 a = csqrt(a2);
        vec2 b = csqrt(b2);
        vec2 B = cmul(csqr(k) - b2, csin(b * 0.5));
        vec2 C = 2.0 * cmul(k, a, csin(a * 0.5));
        float mag = max(length(B), length(C)) * length(k) * omega;
        B /= mag;
        C /= mag;
        float y = position.y;
        vec2 ux = cmul( cmul(B, k, ccos(a * y)) + cmul(C, b, ccos(b * y)), psi, vec2(0, 1));
        vec2 uy = cmul(-cmul(B, a, csin(a * y)) + cmul(C, k, csin(b * y)), psi);
      
        return vec2(ux.x, uy.x);
      }`
      },
      {
        type: "antisymmetric",
        func: `vec2 lambDisplacement(vec2 position, float time, vec2 k, float omega, out float fade) {
      
        vec2 wt = vec2(omega * time, 0.0);
        vec2 psi = cexp(cmul(vec2(0, 1), k * position.x - wt));
        fade = smoothstep(4.0, 1.0, length(psi));
        vec2 k2 = csqr(k);
        vec2 a2 = cinv(csqr(cl)) * (omega * omega) - k2;
        vec2 b2 = cinv(csqr(ct)) * (omega * omega) - k2;
        vec2 a = csqrt(a2);
        vec2 b = csqrt(b2);
        vec2 A = 2.0 * cmul(k, b, csin(b * 0.5));
        vec2 D = cmul(csqr(k) - b2, csin(a * 0.5));
        float mag = max(length(A), length(D)) * length(k) * omega;
        A /= mag;
        D /= mag;
        float y = position.y;
        vec2 ux = cmul(cmul(A, k, csin(a * y)) - cmul(D, b, csin(b * y)), psi, vec2(0, 1));
        vec2 uy = cmul(cmul(A, a, ccos(a * y)) + cmul(D, k, ccos(b * y)), psi);
      
        return vec2(ux.x, uy.x);
      }`
      }
    ].map(({ type, func }) => [
      type,
      regl({
        vert: `
      precision highp float;
      ${glslComplex}
      attribute vec2 position;
      uniform vec2 aspect, k, cl, ct;
      uniform float time, magnitude, omega, speed;
      uniform bool symmetric;
      varying vec2 uv;
      varying float fade;

      ${func}

      void main () {
        uv = position * aspect;
        vec2 displacement = lambDisplacement(uv, time * 2.0 * speed / omega, k, omega, fade);
        gl_Position = vec4(position + magnitude * displacement / aspect, 0, 1);
      }`,
        frag: `
      #extension GL_OES_standard_derivatives : enable
      precision highp float;
      varying vec2 uv;
      varying float fade;
      
      float gridFactor (vec2 parameter, float width, float feather) {
        float w1 = width - feather * 0.5;
        vec2 d = fwidth(parameter);
        vec2 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
        vec2 a2 = smoothstep(d * w1, d * (w1 + feather), looped);
        return min(a2.x, a2.y);
      }
      
      void main () {
        gl_FragColor = vec4(vec3(0), (1.0 - gridFactor(uv * 16.0, 0.75, 2.0)) * fade);
      }`,
        attributes: {
          position: regl.prop("positionsBuffer")
        },
        uniforms: {
          aspect: ({ viewportWidth, viewportHeight }) => [
            viewportWidth / viewportHeight,
            1
          ],
          time: regl.context("time"),
          k: regl.prop("wavenumber"),
          cl: regl.prop("cl"),
          ct: regl.prop("ct"),
          omega: regl.prop("omega"),
          magnitude: regl.prop("mag"),
          speed: regl.prop("speed"),
          symmetric: (ctx, props) => props.type === "symmetric"
        },
        blend: {
          enable: true,
          func: {
            srcRGB: "src alpha",
            srcAlpha: 1,
            dstRGB: "one minus src alpha",
            dstAlpha: 1
          },
          equation: {
            rgb: "add",
            alpha: "add"
          }
        },
        depth: { enable: false },
        primitive: "triangles",
        elements: regl.prop("cellsBuffer")
      })
    ]))(regl2)
)
)}

function _drawLoop2(animate,regl2,selectedMode,drawMode,mesh,cl,ct,mag,speed,invalidation)
{
  if (!~animate.indexOf("animate")) return;
  let frame = regl2.frame(() => {
    try {
      if (["symmetric", "antisymmetric"].indexOf(selectedMode.type) === -1)
        return;
      regl2.clear({ color: [1, 1, 1, 1], depth: 1 });
      drawMode.get(selectedMode.type)({
        ...mesh,
        wavenumber: selectedMode.wavenumber,
        omega: selectedMode.frequency * 2.0 * Math.PI,
        cl: cl.getValue(),
        ct: ct.getValue(),
        mag,
        speed
      });
    } catch (e) {
      console.error(e);
      if (frame) frame.cancel();
      frame = null;
      throw e;
    }
  });
  invalidation.then(() => {
    if (frame) frame.cancel();
    frame = null;
  });
}


function _mesh(meshFromFunction,regl2,invalidation)
{
  const mesh = meshFromFunction((u, v) => [u, v], {
    uDomain: [-1.5, 1.5],
    vDomain: [-0.5, 0.5],
    resolution: [201, 40],
    uPeriodic: false,
    vPeriodic: false
  });
  mesh.positionsBuffer = regl2.buffer(mesh.positions);
  mesh.cellsBuffer = regl2.elements(mesh.cells);
  invalidation.then(() => {
    mesh.positionsBuffer.destroy();
    mesh.cellsBuffer.destroy();
  });
  return mesh;
}


function _meshFromFunction(){return(
function meshFromFunction(surfaceFn, opts) {
  let i, j, u, v;
  opts = opts || {};

  const res = opts.resolution === undefined ? 11 : opts.resolution;
  const nbUFaces = Array.isArray(opts.resolution) ? opts.resolution[0] : res;
  const nbVFaces = Array.isArray(opts.resolution) ? opts.resolution[1] : res;

  const uDomain = opts.uDomain === undefined ? [0, 1] : opts.uDomain;
  const vDomain = opts.vDomain === undefined ? [0, 1] : opts.vDomain;

  let nbBoundaryAdjustedUFaces = nbUFaces;
  let nbBoundaryAdjustedVFaces = nbVFaces;
  if (!opts.vPeriodic) nbBoundaryAdjustedUFaces += 1;
  if (!opts.uPeriodic) nbBoundaryAdjustedVFaces += 1;

  const positions = [];
  const cells = [];

  for (i = 0; i < nbBoundaryAdjustedUFaces; i++) {
    u = uDomain[0] + ((uDomain[1] - uDomain[0]) * i) / nbUFaces;
    for (j = 0; j < nbBoundaryAdjustedVFaces; j++) {
      v = vDomain[0] + ((vDomain[1] - vDomain[0]) * j) / nbVFaces;
      positions.push(surfaceFn(u, v));
    }
  }

  var faceIndex = 0;
  for (i = 0; i < nbUFaces; i++) {
    var iPlusOne = i + 1;
    if (opts.vPeriodic) iPlusOne = iPlusOne % nbUFaces;
    for (j = 0; j < nbVFaces; j++) {
      var jPlusOne = j + 1;
      if (opts.uPeriodic) jPlusOne = jPlusOne % nbVFaces;

      cells.push([
        i * nbBoundaryAdjustedVFaces + j,
        iPlusOne * nbBoundaryAdjustedVFaces + j,
        iPlusOne * nbBoundaryAdjustedVFaces + jPlusOne
      ]);

      cells.push([
        i * nbBoundaryAdjustedVFaces + j,
        iPlusOne * nbBoundaryAdjustedVFaces + jPlusOne,
        i * nbBoundaryAdjustedVFaces + jPlusOne
      ]);
    }
  }

  return { positions, cells };
}
)}

function _updateIndex(mat4equals,index,modelViewProjection,mat4copy,makeIndex,antisymmetricLociData,symmetricLociData,regl){return(
function updateIndex(matrix) {
  if (
    mat4equals(index.matrix, modelViewProjection)
    //||    !index.antisymmetric.projectedVerticesBuffer
  ) {
    return;
  }

  mat4copy(index.matrix, matrix);
  index.antisymmetric = makeIndex(antisymmetricLociData, matrix);
  index.symmetric = makeIndex(symmetricLociData, matrix);

  index.antisymmetric.projectedVerticesBuffer = (
    index.antisymmetric.projectedVerticesBuffer || regl.buffer
  )(index.antisymmetric.projectedVertices);

  index.symmetric.projectedVerticesBuffer = (
    index.symmetric.projectedVerticesBuffer || regl.buffer
  )(index.symmetric.projectedVertices);
}
)}

function _selectedPointsBuffer(regl){return(
regl.buffer([0, 0, 0])
)}

function _computeSelectedPoint(regl,$0,viewOpts,index,antisymmetricLociData,symmetricLociData,selectedPointsBuffer,camera,invalidation)
{
  const DEPTH_BIAS = 10;
  const el = regl._gl.canvas;
  function onMove(event) {
    if ($0.value.locked) return;
    const x = (2 * event.offsetX) / el.offsetWidth - 1;
    const y = 1 - (2 * event.offsetY) / el.offsetHeight;
    const dx = (40 / el.offsetWidth) * 2;
    const dy = (40 / el.offsetHeight) * 2;
    const antiNear = ~viewOpts.indexOf("antisymmetric")
      ? index.antisymmetric.index.range(x - dx, y - dy, x + dx, y + dy)
      : [];
    const symmNear = ~viewOpts.indexOf("symmetric")
      ? index.symmetric.index.range(x - dx, y - dy, x + dx, y + dy)
      : [];
    const data = new Float32Array((antiNear.length + symmNear.length) * 3);
    let c = 0;
    let minDist = Infinity;
    let minSet = null;
    let minIdx = -1;
    for (let i = 0; i < antiNear.length; i++) {
      const idx = antiNear[i] * 3;
      const kx = antisymmetricLociData[idx];
      const ky = antisymmetricLociData[idx + 1];
      if (!~viewOpts.indexOf("pure real") && Math.abs(ky) < 1e-4) continue;
      if (!~viewOpts.indexOf("pure imaginary") && Math.abs(kx) < 1e-4) continue;
      if (
        !~viewOpts.indexOf("complex") &&
        Math.abs(kx) > 1e-4 &&
        Math.abs(ky) > 1e-4
      )
        continue;
      const px = index.antisymmetric.projectedVertices[idx];
      const py = index.antisymmetric.projectedVertices[idx + 1];
      const pz = index.antisymmetric.projectedVertices[idx + 2];
      const dx = px - x;
      const dy = py - y;
      const r = Math.hypot(dx, dy) + pz * DEPTH_BIAS;
      if (r < minDist) {
        minDist = r;
        minSet = "antisymmetric";
        minIdx = idx;
      }
      //data[c] = antisymmetricLociData[idx];
      //data[c + 1] = antisymmetricLociData[idx + 2];
      //data[c + 2] = antisymmetricLociData[idx + 1];
      c += 3;
    }
    for (let i = 0; i < symmNear.length; i++) {
      const idx = symmNear[i] * 3;
      const kx = symmetricLociData[idx];
      const ky = symmetricLociData[idx + 1];
      if (!~viewOpts.indexOf("pure real") && Math.abs(kx) < 1e-4) continue;
      if (!~viewOpts.indexOf("pure imaginary") && Math.abs(ky) < 1e-4) continue;
      if (
        !~viewOpts.indexOf("complex") &&
        Math.abs(kx) > 1e-4 && Math.abs(ky) > 1e-4
      )
        continue;
      const px = index.symmetric.projectedVertices[idx];
      const py = index.symmetric.projectedVertices[idx + 1];
      const pz = index.symmetric.projectedVertices[idx + 2];
      const dx = px - x;
      const dy = py - y;
      const r = Math.hypot(dx, dy) + pz * DEPTH_BIAS;
      if (r < minDist) {
        minDist = r;
        minSet = "symmetric";
        minIdx = idx;
      }
      //data[c] = symmetricLociData[idx];
      //data[c + 1] = symmetricLociData[idx + 2];
      //data[c + 2] = symmetricLociData[idx + 1];
      c += 3;
    }
    if (minIdx !== -1) {
      const lociData =
        minSet === "antisymmetric" ? antisymmetricLociData : symmetricLociData;
      data[0] = lociData[minIdx];
      data[1] = lociData[minIdx + 2];
      data[2] = lociData[minIdx + 1];
      selectedPointsBuffer._count = 1;
    } else {
      selectedPointsBuffer._count = 0;
    }
    //selectedPointsBuffer._count = antiNear.length + symmNear.length;

    let modeChanged = false;
    const freq = data[1];
    const kx = data[0];
    const ky = data[2];
    if (
      minSet !== $0.value.type ||
      freq !== $0.value.frequency ||
      kx !== $0.value.wavenumber[0] ||
      ky !== $0.value.wavenumber[1]
    ) {
      $0.value = $0.value;
      $0.value.type = minSet;
      $0.value.frequency = freq;
      $0.value.wavenumber[0] = kx;
      $0.value.wavenumber[1] = ky;
    }

    selectedPointsBuffer(data);
    camera.taint();
  }

  const p = [NaN, NaN];
  function onClick(event) {
    p[0] = event.offsetX;
    p[1] = event.offsetY;
  }

  function onMouseUp(event) {
    const dx = p[0] - event.offsetX;
    const dy = p[1] - event.offsetY;
    const r = Math.hypot(dx, dy);
    if (r > 5) return;
    $0.value.locked = !$0.value.locked;
    $0.value = $0.value;
  }

  el.addEventListener("mousemove", onMove);
  el.addEventListener("mousedown", onClick);
  el.addEventListener("mouseup", onMouseUp);
  el.addEventListener("wheel", onMove);
  invalidation.then(() => {
    el.removeEventListener("mousemove", onMove);
    el.removeEventListener("mousedown", onClick);
    el.removeEventListener("mouseup", onMouseUp);
    el.removeEventListener("wheel", onMove);
  });
}


function _makeIndex(KDBush,vec3transformMat4){return(
function makeIndex(verts, matrix) {
  const index = new KDBush(verts.length / 3);
  const p = new Float32Array(3);
  const pp = new Float32Array(3);
  const projectedVertices = new Float32Array(verts.length);
  for (let i = 0; i < verts.length; i += 3) {
    p[0] = verts[i];
    p[1] = verts[i + 2];
    p[2] = verts[i + 1];
    vec3transformMat4(pp, p, matrix);
    if (isFinite(pp[0]) && pp[2] <= 1 && pp[2] >= -1) {
      index.add(pp[0], pp[1]);
      projectedVertices[i] = pp[0];
      projectedVertices[i + 1] = pp[1];
      projectedVertices[i + 2] = pp[2];
    } else {
      index.add(-2, -2);
      projectedVertices[i] = -2;
      projectedVertices[i + 1] = -2;
    }
  }
  index.finish();
  return { index, projectedVertices };
}
)}

function _index(mat4create){return(
{
  matrix: mat4create(),
  antisymmetric: {},
  symmetric: {}
}
)}

async function _KDBush(){return(
(await import("https://cdn.skypack.dev/kdbush")).default
)}

function _f0(){return(
0.006
)}

function _rootsTimeMS(){return(
0
)}

function _traceTimeMS(){return(
0
)}

function _39(md){return(
md`## Viscoelastic properties`
)}

function _wd(ComplexVariable,f,d){return(
ComplexVariable({
  name: "wd",
  value: [2.0 * Math.PI * f * d, 0],
  visible: false
}).show()
)}

function _cl(cscaleS,θ,E,csqrtS,ν,ρ,ComplexVariable)
{
  const Ev = cscaleS([], [Math.cos(-θ), Math.sin(-θ)], E);
  const cl = cscaleS(
    [],
    csqrtS([], Ev),
    Math.sqrt((1 - ν) / ρ / (1 + ν) / (1 - 2 * ν))
  );
  return ComplexVariable({ name: "c_l", value: cl, visible: false }).show();
}


function _ct(cscaleS,θ,E,csqrtS,ρ,ν,ComplexVariable)
{
  const Ev = cscaleS([], [Math.cos(-θ), Math.sin(-θ)], E);
  const ct = cscaleS([], csqrtS([], Ev), 1 / Math.sqrt(2 * ρ * (1 + ν)));
  return ComplexVariable({ name: "c_t", value: ct, visible: false }).show();
}


function _43(md){return(
md`## Implementation`
)}

function _lambDispersion(ccreateD,csqrS,cdivSS,cl,ct,cinvS,csetValuesD,csqrD,csubDS,cmulSS,csqrtAltD,cscaleD,csinhcoshD,caddDD,cmulDD,csubDD){return(
function (ω, parity) {
  const tmp = ccreateD();
  const k2 = ccreateD();
  const alpha2 = ccreateD();
  const beta2 = ccreateD();
  const alpha = ccreateD();
  const beta = ccreateD();
  const alphahalf = ccreateD();
  const betahalf = ccreateD();
  const sinha = ccreateD();
  const cosha = ccreateD();
  const sinhb = ccreateD();
  const coshb = ccreateD();
  const ab4k2 = ccreateD();
  const k2b22 = ccreateD();
  const γ2 = csqrS([], cdivSS([], cl.getValue(), ct.getValue()));
  const cl2inv = cinvS([], csqrS([], cl.getValue()));
  const ct2inv = cinvS([], csqrS([], ct.getValue()));
  const ω2 = csqrS([], ω);
  const lhs = ccreateD();
  const rhs = ccreateD();
  const symm = parity === "symmetric";

  return function fLamb(out, kx, ky) {
    // k2 := k * k
    csetValuesD(k2, kx, ky, 1, 0);
    csqrD(k2, k2);

    // alpha2 := k2 - w2/cl2
    csubDS(alpha2, k2, cmulSS(tmp, ω2, cl2inv));

    // beta2 := k2 - w2/ct2
    csubDS(beta2, k2, cmulSS(tmp, ω2, ct2inv));

    // Use a sqrt which places the branch cut opposite of most of the roots. This increases
    // root-finding performance since we otherwise can only overcome the branch cut by
    // excessively subdividing.
    csqrtAltD(alpha, alpha2);
    csqrtAltD(beta, beta2);
    cscaleD(alphahalf, alpha, 0.5);
    cscaleD(betahalf, beta, 0.5);

    csinhcoshD(sinha, cosha, alphahalf);
    csinhcoshD(sinhb, coshb, betahalf);

    // k2b22 := (k2 + beta2)^2
    csqrD(k2b22, caddDD(tmp, k2, beta2));

    // ab4k2 := 4 * alpha * beta * k2
    cscaleD(ab4k2, cmulDD(tmp, cmulDD(tmp, alpha, beta), k2), 4.0);

    cmulDD(lhs, cmulDD(tmp, sinhb, cosha), symm ? k2b22 : ab4k2);
    cmulDD(rhs, cmulDD(tmp, sinha, coshb), symm ? ab4k2 : k2b22);
    return csubDD(out, lhs, rhs);
  };
}
)}

function _lambDiffK(ccreateD,cinvS,csqrS,cl,ct,ccreateS,csetValuesD,csqrD,csubDS,cmulSS,csqrtAltD,cscaleD,csinhcoshD,caddDD,cmulDD,csubDD){return(
function (parity) {
  const tmp = ccreateD();
  const k2 = ccreateD();
  const alpha2 = ccreateD();
  const beta2 = ccreateD();
  const alpha = ccreateD();
  const beta = ccreateD();
  const alphahalf = ccreateD();
  const betahalf = ccreateD();
  const sinha = ccreateD();
  const cosha = ccreateD();
  const sinhb = ccreateD();
  const coshb = ccreateD();
  const ab4k2 = ccreateD();
  const k2b22 = ccreateD();
  const cl2inv = cinvS([], csqrS([], cl.getValue()));
  const ct2inv = cinvS([], csqrS([], ct.getValue()));
  const ω2 = ccreateS();
  const lhs = ccreateD();
  const rhs = ccreateD();
  const symm = parity === "symmetric";

  return function fLamb(out, wx, wy, kx, ky) {
    // k2 := k * k
    csetValuesD(k2, kx, ky, 1, 0);
    csqrD(k2, k2);

    csqrS(ω2, [wx, wy]);

    // alpha2 := k2 - w2/cl2
    csubDS(alpha2, k2, cmulSS(tmp, ω2, cl2inv));

    // beta2 := k2 - w2/ct2
    csubDS(beta2, k2, cmulSS(tmp, ω2, ct2inv));

    // Use a sqrt which places the branch cut opposite of most of the roots. This increases
    // performance since we overcome the branch cut by excessively subdividing.
    csqrtAltD(alpha, alpha2);
    csqrtAltD(beta, beta2);
    cscaleD(alphahalf, alpha, 0.5);
    cscaleD(betahalf, beta, 0.5);

    csinhcoshD(sinha, cosha, alphahalf);
    csinhcoshD(sinhb, coshb, betahalf);

    // k2b22 := (k2 + beta2)^2
    csqrD(k2b22, caddDD(tmp, k2, beta2));

    // ab4k2 := 4 * alpha * beta * k2
    cscaleD(ab4k2, cmulDD(tmp, cmulDD(tmp, alpha, beta), k2), 4.0);

    cmulDD(lhs, cmulDD(tmp, sinhb, cosha), symm ? k2b22 : ab4k2);
    cmulDD(rhs, cmulDD(tmp, sinha, coshb), symm ? ab4k2 : k2b22);
    return csubDD(out, lhs, rhs);
  };
}
)}

function _lambDiffW(ccreateD,ccreateS,cinvS,csqrS,cl,ct,csetValuesS,csetValuesD,csqrD,csubSD,cmulDS,csqrtAltD,cscaleD,csinhcoshD,caddSD,cmulSD,cmulDD,csubDD){return(
function (parity) {
  const tmp = ccreateD();
  const k2 = ccreateS();
  const alpha2 = ccreateD();
  const beta2 = ccreateD();
  const alpha = ccreateD();
  const beta = ccreateD();
  const alphahalf = ccreateD();
  const betahalf = ccreateD();
  const sinha = ccreateD();
  const cosha = ccreateD();
  const sinhb = ccreateD();
  const coshb = ccreateD();
  const ab4k2 = ccreateD();
  const k2b22 = ccreateD();
  const cl2inv = cinvS([], csqrS([], cl.getValue()));
  const ct2inv = cinvS([], csqrS([], ct.getValue()));
  const ω = ccreateD();
  const ω2 = ccreateD();
  const lhs = ccreateD();
  const rhs = ccreateD();
  const symm = parity === "symmetric";

  return function fLamb(out, ωx, ωy, kx, ky) {
    // k2 := k * k
    csetValuesS(k2, kx, ky);
    csqrS(k2, k2);

    csetValuesD(ω, ωx, ωy, 1, 0);
    csqrD(ω2, ω);

    // alpha2 := k2 - w2/cl2
    csubSD(alpha2, k2, cmulDS(tmp, ω2, cl2inv));

    // beta2 := k2 - w2/ct2
    csubSD(beta2, k2, cmulDS(tmp, ω2, ct2inv));

    // Use a sqrt which places the branch cut opposite of most of the roots. This increases
    // performance since we overcome the branch cut by excessively subdividing.
    csqrtAltD(alpha, alpha2);
    csqrtAltD(beta, beta2);
    cscaleD(alphahalf, alpha, 0.5);
    cscaleD(betahalf, beta, 0.5);

    csinhcoshD(sinha, cosha, alphahalf);
    csinhcoshD(sinhb, coshb, betahalf);

    // k2b22 := (k2 + beta2)^2
    csqrD(k2b22, caddSD(tmp, k2, beta2));

    // ab4k2 := 4 * alpha * beta * k2
    cscaleD(ab4k2, cmulSD(tmp, k2, cmulDD(tmp, alpha, beta)), 4.0);

    cmulDD(lhs, cmulDD(tmp, sinhb, cosha), symm ? k2b22 : ab4k2);
    cmulDD(rhs, cmulDD(tmp, sinha, coshb), symm ? ab4k2 : k2b22);
    return csubDD(out, lhs, rhs);
  };
}
)}

function _fLambDispersion(parity)
{
  const ɑ2 = `z^2 - (wd/c_l)^2`;
  const β2 = `z^2 - (wd/c_t)^2`;
  const ɑ = `(i * sqrt(-(${ɑ2})))`;
  const β = `(i * sqrt(-(${β2})))`;
  const k2b22 = `((z^2 + ${β2})^2)`;
  const ab4k2 = `(4 * ${ɑ} * ${β} * z^2)`;
  return `
sinh(${β}/2) * cosh(${ɑ}/2) * ${parity === "symmetric" ? k2b22 : `-${ab4k2}`} -
sinh(${ɑ}/2) * cosh(${β}/2) * ${parity === "symmetric" ? ab4k2 : `-${k2b22}`}`;
}


function _findComplexRoots(adaptiveSimpson,vectorAdaptiveSimpson,findRoots)
{
  function newtonsIdentities(er, ei, M, p) {
    var i, j, j2, sgn, sgn2;
    // Use Newton's Identities to construct a polynomial, the roots of
    // which match our complex analytic function:
    er[0] = 1;
    ei[0] = 0;
    er[1] = p[0];
    ei[1] = p[1];

    for (i = 2, sgn = -1; i <= M; i++, sgn = -sgn) {
      er[i] = p[2 * i - 2] * sgn;
      ei[i] = p[2 * i - 1] * sgn;
      for (j = 1, sgn2 = -sgn; j < i; j++, sgn2 = -sgn2) {
        j2 = 2 * (i - j - 1);
        er[i] += (er[j] * p[j2] - ei[j] * p[j2 + 1]) * sgn2;
        ei[i] += (er[j] * p[j2 + 1] + ei[j] * p[j2]) * sgn2;
      }
      er[i] /= i;
      ei[i] /= i;
    }

    sgn = M % 2 === 0 ? 1 : -1;
    for (i = 0; i <= M; i++, sgn = -sgn) {
      er[i] *= sgn;
      ei[i] *= sgn;
    }
    er.reverse();
    ei.reverse();
  }

  var out = new Array(2);
  var params = {};

  function cmod(a, b) {
    var c;
    var aa = Math.abs(a);
    var ab = Math.abs(b);
    if (aa === 0 && ab === 0) return 0;
    if (aa >= ab) {
      c = b / a;
      return aa * Math.sqrt(1 + c * c);
    }
    c = a / b;
    return ab * Math.sqrt(1 + c * c);
  }

  function cdiv(out, a, b, c, d) {
    var e, f;
    if (Math.abs(c) >= Math.abs(d)) {
      e = d / c;
      f = 1 / (c + d * e);
      out[0] = (a + b * e) * f;
      out[1] = (b - a * e) * f;
    } else {
      e = c / d;
      f = 1 / (c * e + d);
      out[0] = (a * e + b) * f;
      out[1] = (b * e - a) * f;
    }
    return out;
  }

  var dzrsub = [
    0, 0.81, 0.5727564927611035, 0, -0.5727564927611035, -0.81,
    -0.5727564927611035, 0, 0.5727564927611035
  ];

  var dzisub = [
    0, 0, 0.5727564927611035, 0.81, 0.5727564927611035, 0, -0.5727564927611035,
    -0.81, -0.5727564927611035
  ];

  var rsub = [
    0.5, 0.4166666666666667, 0.4166666666666667, 0.4166666666666667,
    0.4166666666666667, 0.4166666666666667, 0.4166666666666667,
    0.4166666666666667, 0.4166666666666667
  ];

  function s0Integrand(theta) {
    var c, s, a, b, rtmp, itmp;

    c = Math.cos(theta);
    s = Math.sin(theta);
    a = params.z0r + c * params.r;
    b = params.z0i + s * params.r;

    // tmp <- f(z)
    params.f(out, a, b);
    rtmp = out[0];
    itmp = out[1];

    // out <- f'(z)
    out[0] = out[2];
    out[1] = out[3];

    // out /= f(z)
    cdiv(out, out[0], out[1], rtmp, itmp);

    // re(tmp * dz / (2 pi i))
    return out[0] * c - out[1] * s;
  }

  function smIntegrand(out, theta) {
    var c, s, a, b, rtmp, itmp;

    c = Math.cos(theta);
    s = Math.sin(theta);

    // out <- f(z)
    params.f(out, params.z0r + c * params.r, params.z0i + s * params.r);

    // out <- f'(z) / f(z)
    cdiv(out, out[2], out[3], out[0], out[1]);

    // out *= dz   (/ (2 pi) but leave this part until outside the loop)
    rtmp = out[0];
    out[0] = out[0] * c - out[1] * s;
    out[1] = rtmp * s + out[1] * c;

    // out *= z
    rtmp = out[0];
    out[0] = out[0] * c - out[1] * s;
    out[1] = rtmp * s + out[1] * c;

    // Recursively multiply by z to compute successive moments z^N:
    //   out[i] = out[i - 1] * z
    for (var i = 2; i < 2 * params.M; i += 2) {
      out[i] = out[i - 2] * c - out[i - 1] * s;
      out[i + 1] = out[i - 2] * s + out[i - 1] * c;
    }
    return out;
  }

  function locateZeros(
    qr,
    qi,
    f,
    zr,
    zi,
    r,
    z0r,
    z0i,
    r0,
    tol,
    maxIntegrationDepth,
    s0IntegrationTolerance,
    s0IntegrationDepth,
    curDepth,
    maxRootsPerCircle,
    searchCircleOutput
  ) {
    var p, s0, er, ei, i, j, qri, qii, qmod, qC, M, rr;
    var qNr, qNi, tmp, qNew, success;

    // Exit if we've reached the recursion limit:
    if (curDepth <= 0) {
      return false;
    }

    // Exit early if this circle is completely outside the search region
    if (cmod(zr - z0r, zi - z0i) - r > r0) {
      return true;
    }

    params.z0r = zr;
    params.z0i = zi;
    params.r = r;
    params.f = f;

    s0 =
      adaptiveSimpson(
        s0Integrand,
        0,
        Math.PI * 2,
        s0IntegrationTolerance,
        s0IntegrationDepth
      ) *
      r *
      (0.5 / Math.PI);
    M = Math.round(s0);

    qC = 0;
    for (i = qr.length - 1; i >= 0; i--) {
      // Count this zero if it's inside the circle:
      if (cmod(qr[i] - zr, qi[i] - zi) < r) qC++;
    }

    if (M - qC <= 0.9 || s0 < 0.9) {
    } else if (Math.abs(s0 - M) > 1e-1 || M - qC > maxRootsPerCircle) {
      // If this happens, then we had a pretty inaccurate integration:
      for (i = 0, success = true; i < 9; i++) {
        rr = r * rsub[i];
        success =
          locateZeros(
            qr,
            qi,
            f,
            zr + r * dzrsub[i],
            zi + r * dzisub[i],
            rr,
            z0r,
            z0i,
            r0,
            tol,
            maxIntegrationDepth,
            s0IntegrationTolerance,
            s0IntegrationDepth,
            curDepth - 1,
            maxRootsPerCircle,
            searchCircleOutput
          ) && success;
      }
    } else {
      // Compute the zeros:
      params.M = M - qC;
      var p = vectorAdaptiveSimpson(
        [],
        smIntegrand,
        0,
        Math.PI * 2,
        tol,
        maxIntegrationDepth,
        2 * params.M
      );

      // post-multiply the integral by this constant factor
      var f = (r * 0.5) / Math.PI;
      for (var i = 2 * params.M - 1; i >= 0; i--) {
        p[i] *= f;
      }

      // Deflate the result by known zeros inside the current circle:
      for (i = qr.length - 1; i >= 0; i--) {
        // Scale to the unit circle in which we're working
        qri = (qr[i] - zr) / r;
        qii = (qi[i] - zi) / r;
        if (cmod(qri, qii) < 1) {
          // Initialize the powers of qN
          var qNr = qri;
          var qNi = qii;

          for (j = 0, qNr = 1, qNi = 0; j < p.length; j += 2) {
            tmp = qNr;
            qNr = tmp * qri - qNi * qii;
            qNi = tmp * qii + qNi * qri;

            // Subtract off the power of the zero:
            p[j] -= qNr;
            p[j + 1] -= qNi;
          }
        }
      }

      // Apply Newton's Identities, constructing a polynomial sharing the roots
      // of the analytic function:
      er = [];
      ei = [];
      newtonsIdentities(er, ei, params.M, p);

      // Compute the roots of the constructed polynomial:
      qNew = findRoots(er, ei, 100 * params.M * params.M, tol);

      // Append and filter to zeros inside the original contour:
      for (i = qNew[0].length - 1; i >= 0; i--) {
        var qrRescaled = zr + qNew[0][i] * r;
        var qiRescaled = zi + qNew[1][i] * r;
        //if (cmod(qrRescaled - z0r, qiRescaled - z0i) < r0) {
        qr.push(qrRescaled);
        qi.push(qiRescaled);
        //}
      }
    }

    if (searchCircleOutput) {
      searchCircleOutput.push({
        z: [zr, zi],
        r: r,
        text:
          "s₀ = " +
          s0
            .toFixed(5)
            .toString()
            .replace(/(\.[0-9]*[1-9]|\.0)0*$/, "$1")
            .replace(/\.0$/, "")
            .replace(/^-0$/, "0")
      });
    }

    return [qr, qi];
  }

  return function delvesLyness(
    f,
    z0,
    r,
    {
      s0IntegrationDepth = 13,
      s0IntegrationTolerance = 1e-6,
      maxIntegrationDepth = 12,
      integrationTolerance = 1e-8,
      maxSearchDepth = 6,
      maxRootsPerCircle = 3,
      searchOutput = null
    } = {}
  ) {
    if (searchOutput) searchOutput.length = 0;
    var foundRoots = locateZeros(
      [],
      [],
      f,
      z0[0],
      z0[1],
      r,
      z0[0],
      z0[1],
      r,
      integrationTolerance,
      maxIntegrationDepth,
      s0IntegrationTolerance,
      s0IntegrationDepth,
      maxSearchDepth,
      maxRootsPerCircle,
      searchOutput
    );

    var output = [];
    for (var i = 0; i < foundRoots[0].length; i++) {
      if (cmod(foundRoots[0][i] - z0[0], foundRoots[1][i] - z0[1]) <= r) {
        output.push([foundRoots[0][i], foundRoots[1][i]]);
      }
    }
    return output;
  };
}


function _complexNewtonRaphson(cdivSS){return(
function complexNewtonRaphson(
  out,
  f,
  z0,
  { tolerance = 1e-5, maxIterations = 50 } = {}
) {
  var iteration = maxIterations;
  var delta = 1,
    previousDelta = 0;
  var tmp = [0, 0, 0, 0];
  var zre = z0[0];
  var zim = z0[1];
  while (delta / previousDelta > tolerance && --iteration > 0) {
    previousDelta = delta;

    // Compute the function and its derivative tmp <- [f_re, f_im, f'_re, f'_im]
    f(tmp, zre, zim);

    // Divide tmp <- f / f'
    cdivSS(tmp, [tmp[0], tmp[1]], [tmp[2], tmp[3]]);

    // Update the current guess
    zre -= tmp[0];
    zim -= tmp[1];

    // Check convergence
    delta = Math.hypot(tmp[0], tmp[1]);
  }
  // Return the answer if converged
  if (iteration > 0 || delta / previousDelta <= tolerance) {
    out[0] = zre;
    out[1] = zim;
  } else {
    // Well, even if not converged, still just return the best we got
    out[0] = zre;
    out[1] = zim;
  }
  return out;
}
)}

function _computeRoots(d,lambDispersion,findComplexRoots,complexNewtonRaphson,$0){return(
function computeRoots(f0, { r0 = 3, z0 = [0, 0] } = {}) {
  const wd = [2.0 * Math.PI * f0 * d, 0];
  function computeRoots(parity) {
    const t0 = performance.now();
    const dispersion = lambDispersion(wd, parity);
    let roots = findComplexRoots(dispersion, z0, r0, {
      s0IntegrationDepth: 10,
      s0IntegrationTolerance: 1e-4,
      maxIntegrationDepth: 12,
      integrationTolerance: 1e-7,
      maxSearchDepth: 12,
      maxRootsPerCircle: 2
    });

    if (true) {
      for (let i = 0; i < roots.length; i++) {
        complexNewtonRaphson(roots[i], dispersion, roots[i], {
          tolerance: 1e-5,
          multiplicity: 2
        });
      }
    }
    roots = roots.filter(([a, b]) => !isNaN(a) && !isNaN(b));
    roots.sort(([ar, ai], [br, bi]) => ar - br);
    const t1 = performance.now();
    $0.value = t1 - t0;
    return roots;
  }
  return {
    symmetric: computeRoots("symmetric"),
    antisymmetric: computeRoots("Antisymmetric")
  };
}
)}

function _roots(computeRoots,f,radius){return(
computeRoots(f, { r0: radius })
)}

function _rootSeeds(computeRoots,f0,radius){return(
computeRoots(f0, { r0: radius })
)}

function _traceRoots(f0,d,lambDiffW,lambDiffK,ccreateS,cdivSS,ode45,complexNewtonRaphson,$0){return(
function traceRoots(
  roots,
  parity,
  { tolerance = 1e-8, maxIterations = 3, fmax = 4 } = {}
) {
  const t0 = performance.now();
  const wr0 = 2.0 * Math.PI * f0 * d;
  const wi0 = 0;
  const diffW = lambDiffW(parity);
  const diffK = lambDiffK(parity);
  const dw = ccreateS();
  const dk = ccreateS();
  const deltaK = ccreateS();
  const integrationOptions = { tolerance: 1e-6 };
  const ans = roots.map((root) => {
    let wr = f0 * 2.0 * Math.PI * d;
    let wi = 0;
    let kr = root[0];
    let ki = root[1];

    const path = [[kr, ki, f0]];

    const state = { y: [kr, ki, wr], t: 0, dt: 0.01 };

    for (let i = 0; i < 400; i++) {
      const deriv = (yp, y, t) => {
        const kr = y[0];
        const ki = y[1];
        const wr = y[2];
        const wi = 0;
        diffK(dk, wr, wi, kr, ki);
        diffW(dw, wr, wi, kr, ki);
        cdivSS(deltaK, [-dw[2], -dw[3]], [dk[2], dk[3]]);
        const l = Math.sqrt(1 + deltaK[0] * deltaK[0] + deltaK[1] * deltaK[1]);
        const ds = 0.001 / l;
        yp[0] = deltaK[0] * ds;
        yp[1] = deltaK[1] * ds;
        yp[2] = ds;
      };
      ode45(state, deriv, integrationOptions);

      const cur = [state.y[0], state.y[1]];
      complexNewtonRaphson(
        cur,
        (out, kr, ki) => diffK(out, state.y[2], 0, kr, ki),
        cur,
        {
          tolerance,
          maxIterations
        }
      );
      state.y[0] = cur[0];
      state.y[1] = cur[1];

      const f = state.y[2] / (2.0 * Math.PI * d);

      path.push([state.y[0], state.y[1], f]);

      if (f > fmax) break;
    }
    path.unshift([0, 0, -1]);
    path.push([0, 0, -1]);
    return path;
  });
  const t1 = performance.now();
  $0.value = t1 - t0;
  return ans;
}
)}

function _symmetricRootsLoci(traceRoots,rootSeeds){return(
traceRoots(rootSeeds.symmetric, "symmetric")
)}

function _symmetricLociData(symmetricRootsLoci){return(
new Float32Array(symmetricRootsLoci.flat().flat())
)}

function _symmetricLociBuffer(regl,symmetricLociData,invalidation)
{
  const buf = regl.buffer(symmetricLociData);
  invalidation.then(() => buf.destroy());
  return buf;
}


function _antisymmetricRootsLoci(traceRoots,rootSeeds){return(
traceRoots(rootSeeds.antisymmetric, "antisymmetric")
)}

function _antisymmetricLociData(antisymmetricRootsLoci){return(
new Float32Array(antisymmetricRootsLoci.flat().flat())
)}

function _antisymmetricLociBuffer(regl,antisymmetricLociData,invalidation)
{
  const buf = regl.buffer(antisymmetricLociData);
  invalidation.then(() => buf.destroy());
  return buf;
}


function _viewportSizing(Inputs){return(
Inputs.radio(["Display", "Export"], {
  value: "Display",
  label: "Size viewport for:"
})
)}

function _model(mat4fromScaling,mat4create){return(
mat4fromScaling(mat4create(), [0.1, 0.8, 0.1])
)}

function _modelViewProjection(mat4create){return(
mat4create()
)}

function _plot(PlotContext,width){return(
PlotContext({
  yrange: [-20, 20],
  width: width,
  height: Math.max(400, Math.floor(width * 0.8))
})
)}

function _camera(createReglCamera,regl,createInteractions)
{
  const camera = createReglCamera(regl, {
    distance: 3,
    near: 0.01,
    far: 100,
    phi: 0.1,
    theta: 0.6,
    center: [0, 0.75, 0]
  });
  camera.interactions = createInteractions(camera);
  return camera;
}


function _drawLines(reglLines,regl){return(
reglLines(regl, {
  vert: `
    precision highp float;
    
    #pragma lines: attribute vec3 position;
    #pragma lines: attribute float orientation;
    #pragma lines: position = projectPoint(position);
    #pragma lines: width = pointWidth();
    #pragma lines: varying float computedWidth = pointWidth();

    uniform mat4 uProjectionView, model, modelViewProjection;
    uniform float width;
    uniform vec3 types;

    vec4 projectPoint (vec3 point) {
    const float tol = 1e-2;
      if (point.z < 0.0) return vec4(0);
      if ((abs(point.x) < tol && types.y == 0.0) ||
        (abs(point.y) < tol && types.x == 0.0) ||
        (abs(point.x) > tol && abs(point.y) > tol && types.z == 0.0)) {
        return vec4(0);
      }

      return modelViewProjection * vec4(point.xzy, 1);
    }

    float pointWidth () {
      return width;
    }`,
  frag: `
    precision highp float;
    varying vec3 lineCoord;
    varying float computedWidth;
    uniform vec2 borderWidth;
    uniform vec4 borderColor, color;
    float linearstep(float x0, float x1, float x) {
      return clamp((x - x0) / (x1 - x0), 0.0, 1.0);
    }
    void main() {
      float sdf = length(lineCoord.xy);
      vec2 borderThreshold = 1.0 - borderWidth / computedWidth;
      float isBorder = linearstep(borderThreshold.x, borderThreshold.y, sdf);
      gl_FragColor = vec4(mix(color.rgb, borderColor.rgb, isBorder * borderColor.a * color.a), 1);
    }`,
  uniforms: {
    modelViewProjection: regl.prop("modelViewProjection"),
    borderColor: regl.prop("borderColor"),
    width: (ctx, props) => props.width * ctx.pixelRatio,
    color: regl.prop("color"),
    borderWidth: (ctx, props) => [
      2.0 * props.borderWidth * ctx.pixelRatio + 0.75,
      2.0 * props.borderWidth * ctx.pixelRatio - 0.75
    ],
    types: (ctx, { viewOpts }) => [
      ~viewOpts.indexOf("pure real"),
      ~viewOpts.indexOf("pure imaginary"),
      ~viewOpts.indexOf("complex")
    ]
  },
  cull: { enable: false }
})
)}

function _drawPoints(regl,mat4create){return(
regl({
  vert: `
precision highp float;
attribute vec3 position;
uniform mat4 matrix;
uniform float pointSize;
void main () {
  gl_Position = matrix * vec4(position, 1);
  gl_PointSize = pointSize;
}`,
  frag: `
precision highp float;
uniform vec3 color;
uniform float pointSize;
void main () {
float r = length(gl_PointCoord.xy - 0.5) * pointSize * 2.0;
float alpha = smoothstep(pointSize, pointSize - 1.0, r);
  gl_FragColor = vec4(color, alpha);

}`,
  attributes: {
    position: regl.prop("position")
  },
  uniforms: {
    color: regl.prop("color"),
    matrix: (ctx, props) => props.matrix || mat4create(),
    pointSize: (ctx, props) => ctx.pixelRatio * (props.pointSize || 10)
  },
  blend: {
    enable: true,
    func: {
      srcRGB: "src alpha",
      srcAlpha: 1,
      dstRGB: "one minus src alpha",
      dstAlpha: 1
    },
    equation: {
      rgb: "add",
      alpha: "add"
    }
  },
  count: regl.prop("count"),
  primitive: "point",
  depth: {
    enable: false
  }
})
)}

function _renderFrame(camera,model,viewOpts,mat4multiply,modelViewProjection,updateIndex,regl,drawFancyAxes,index,drawPoints,drawLines,symmetricLociData,symmetricLociBuffer,antisymmetricLociData,antisymmetricLociBuffer,selectedPointsBuffer,selectedMode){return(
function renderFrame({ dTheta = 0, tick = 0 } = {}) {
  if (dTheta) camera.params.dTheta = dTheta;
  const lineProps = {
    insertCaps: true,
    join: "round",
    cap: "round",
    width: 3,
    borderWidth: 0.75,
    borderColor: [1, 1, 1, 1],
    model,
    viewOpts
  };
  camera(({ dirty }) => {
    if (!dirty) return;

    mat4multiply(
      modelViewProjection,
      camera.state.projection,
      mat4multiply(modelViewProjection, camera.state.view, model)
    );
    updateIndex(modelViewProjection);

    camera.params.rotationCenter = camera.params.center;
    regl.clear({ color: [1, 1, 1, 1], depth: 1 });

    drawFancyAxes();

    if (
      false &&
      index.antisymmetric &&
      index.antisymmetric.projectedVerticesBuffer
    ) {
      drawPoints([
        {
          position: index.antisymmetric.projectedVerticesBuffer,
          count: index.antisymmetric.projectedVertices.length / 3,
          color: [45 / 255, 160 / 255, 211 / 255]
        },
        {
          position: index.symmetric.projectedVerticesBuffer,
          count: index.symmetric.projectedVertices.length / 3,
          color: [211 / 255, 45 / 255, 160 / 255]
        }
      ]);
    }

    if (~viewOpts.indexOf("symmetric")) {
      drawLines({
        ...lineProps,
        modelViewProjection,
        color: [211 / 255, 45 / 255, 160 / 255, 1],
        vertexCount: symmetricLociData.length / 3,
        vertexAttributes: {
          position: symmetricLociBuffer
        }
      });
    }
    if (~viewOpts.indexOf("antisymmetric")) {
      drawLines({
        ...lineProps,
        modelViewProjection,
        color: [45 / 255, 160 / 255, 211 / 255, 1],
        vertexCount: antisymmetricLociData.length / 3,
        vertexAttributes: {
          position: antisymmetricLociBuffer
        }
      });
    }

    drawPoints({
      position: selectedPointsBuffer,
      color:
        selectedMode.type === "antisymmetric"
          ? [45 / 255, 160 / 255, 211 / 255]
          : [211 / 255, 45 / 255, 160 / 255],
      count: selectedPointsBuffer._count || 0,
      matrix: modelViewProjection
    });
  });
}
)}

function _drawLoop(camera,regl,renderFrame,invalidation)
{
  camera.taint();
  let frame = regl.frame(({ tick }) => {
    try {
      renderFrame({ tick });
    } catch (e) {
      console.error(e);
      frame && frame.cancel();
      frame = null;
    }
  });
  invalidation.then(() => {
    frame && frame.cancel();
    frame = null;
  });
}


function _drawFancyAxes(regl,invalidation,mat4create,mat3create,mat4scale,mat4fromTranslation,mat3normalFromMat4,mat4translate)
{
  const boxVertices = regl.buffer(
    [0, 1, 2].map(() => [
      [-1, -1, -1],
      [1, -1, -1],
      [1, 1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, 1],
      [-1, 1, 1]
    ])
  );
  const boxFaceNormal = regl.buffer(
    [0, 1, 2].map((i) =>
      [...Array(8).keys()].map(() =>
        [0, 1, 2].map((j) => (i === (5 - j) % 3 ? 1 : 0))
      )
    )
  );
  const boxFaceTangent = regl.buffer(
    [0, 1, 2].map((i) =>
      [...Array(8).keys()].map(() =>
        [0, 1, 2].map((j) => (i === (3 - j) % 3 ? 1 : 0))
      )
    )
  );
  const boxFaceBitangent = regl.buffer(
    [0, 1, 2].map((i) =>
      [...Array(8).keys()].map(() =>
        [0, 1, 2].map((j) => (i === (4 - j) % 3 ? 1 : 0))
      )
    )
  );
  // prettier-ignore
  const boxFaceElements = regl.elements([
    [0, 1, 2],
    [0, 2, 3],
    [6, 4, 7],
    [6, 5, 4],
    
    [0, 4, 5].map(i => i + 8),
    [0, 5, 1].map(i => i + 8),
    [2, 7, 3].map(i => i + 8),
    [2, 6, 7].map(i => i + 8),
    
    [1, 5, 2].map(i => i + 16),
    [2, 5, 6].map(i => i + 16),
    [0, 3, 7].map(i => i + 16),
    [0, 7, 4].map(i => i + 16),
  ]);
  invalidation.then(() => {
    boxVertices.destroy();
    boxFaceElements.destroy();
    boxFaceNormal.destroy();
    boxFaceTangent.destroy();
    boxFaceBitangent.destroy();
  });

  const transform = mat4create();
  const normalMatrix = mat3create();

  const drawFaces = regl({
    vert: `
    precision highp float;
    uniform mat4 uProjectionView, transform;
    uniform mat3 normalMatrix;
    attribute vec3 position, tangent, bitangent, normal;
    varying vec2 coord;
    varying vec3 p, n, t, b;

    
    void main () {
      p = (transform * vec4(position, 1)).xyz;
      n = normalMatrix * normal;
      t = normalMatrix * tangent;
      b = normalMatrix * bitangent;
      coord = vec2(dot(position, b), dot(position, t));
      gl_Position = uProjectionView * vec4(p, 1);
    }`,
    frag: `
    #extension GL_OES_standard_derivatives : enable
    precision mediump float;
    varying vec2 coord;
    varying vec3 p, n, t, b;
    uniform vec3 eye;

    float gridFactor (vec2 parameter, float width) {
      vec2 d = fwidth(parameter);
      vec2 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
      vec2 a2 = smoothstep(d * (width + 0.5), d * (width - 0.5), looped);
      return max(a2.x, a2.y);
    }

    void main () {
      float vDotN = dot(normalize(p - eye), n);
      float fade = smoothstep(0.01, 0.05, abs(vDotN));
      float alpha = fade * 0.25 * (
        gridFactor(coord * 10.0, 0.5) + 
        0.2 * gridFactor(coord * 10.0 * 10.0, 0.5)
      );
      gl_FragColor = vec4(vec3(0), alpha);
      if (alpha < 0.001) discard;
    }`,
    attributes: {
      position: boxVertices,
      normal: boxFaceNormal,
      tangent: boxFaceTangent,
      bitangent: boxFaceBitangent
    },
    uniforms: {
      transform: mat4scale(
        mat4create(),
        mat4fromTranslation(transform, [0, 10, 0]),
        [10, 10, 10]
      ),
      normalMatrix: mat3normalFromMat4(
        normalMatrix,
        mat4scale(
          mat4create(),
          mat4translate(mat4create(), mat4create(), [0, 10, 0]),
          [10, 10, 10]
        )
      ),
      eye: regl.context("eye")
    },
    depth: { enable: true, mask: false },
    cull: { enable: true, face: "back" },
    blend: {
      enable: true,
      func: {
        srcRGB: "src alpha",
        dstRGB: "one minus src alpha",
        srcAlpha: 1,
        dstAlpha: 1
      },
      equation: { rgb: "add", alpha: "add" }
    },
    primitive: "triangles",
    elements: boxFaceElements
  });

  function labelMaker() {}

  return function () {
    drawFaces();
  };
}


function _70(md){return(
md`## Imports`
)}

function _reglLines(require){return(
require("https://unpkg.com/regl-gpu-lines@2.2.0/dist/regl-gpu-lines.js")
)}

function _figureWidth(width){return(
width
)}

function _viewport(figureWidth)
{
  const width = figureWidth;
  return {
    width,
    height: Math.max(400, width * 0.7),
    pixelRatio: devicePixelRatio
  };
}


async function _findRoots(){return(
(await import("https://cdn.skypack.dev/durand-kerner")).default
)}

function _fmt(createFmt){return(
createFmt(".3~f")
)}

function _scifmt(createFmt,sci){return(
createFmt(sci(".3f"))
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["tex","md"], _2);
  main.variable(observer()).define(["tex","md"], _3);
  main.variable(observer()).define(["md"], _4);
  main.variable(observer()).define(["md"], _5);
  main.variable(observer()).define(["tex","md"], _6);
  main.variable(observer()).define(["tex","md"], _7);
  main.variable(observer("viewof E")).define("viewof E", ["scifmt"], _E);
  main.variable(observer("E")).define("E", ["Generators", "viewof E"], (G, _) => G.input(_));
  main.variable(observer("viewof ρ")).define("viewof ρ", ["fmt"], _ρ);
  main.variable(observer("ρ")).define("ρ", ["Generators", "viewof ρ"], (G, _) => G.input(_));
  main.variable(observer("viewof ν")).define("viewof ν", ["fmt"], _ν);
  main.variable(observer("ν")).define("ν", ["Generators", "viewof ν"], (G, _) => G.input(_));
  main.variable(observer("viewof d")).define("viewof d", ["fmt"], _d);
  main.variable(observer("d")).define("d", ["Generators", "viewof d"], (G, _) => G.input(_));
  main.variable(observer()).define(["md"], _12);
  main.variable(observer("viewof f")).define("viewof f", ["Inputs"], _f);
  main.variable(observer("f")).define("f", ["Generators", "viewof f"], (G, _) => G.input(_));
  main.variable(observer("viewof radius")).define("viewof radius", ["Inputs"], _radius);
  main.variable(observer("radius")).define("radius", ["Generators", "viewof radius"], (G, _) => G.input(_));
  main.variable(observer("viewof parity")).define("viewof parity", ["Inputs"], _parity);
  main.variable(observer("parity")).define("parity", ["Generators", "viewof parity"], (G, _) => G.input(_));
  main.variable(observer("viewof pl")).define("viewof pl", ["plot","DomainColoringLayer","fLambDispersion","domainColoringConfig","wd","cl","ct","roots","parity","ComplexVariable","html"], _pl);
  main.variable(observer("pl")).define("pl", ["Generators", "viewof pl"], (G, _) => G.input(_));
  main.variable(observer()).define(["md"], _17);
  main.variable(observer("viewof viewOpts")).define("viewof viewOpts", ["Inputs"], _viewOpts);
  main.variable(observer("viewOpts")).define("viewOpts", ["Generators", "viewof viewOpts"], (G, _) => G.input(_));
  main.variable(observer("viewof θ")).define("viewof θ", ["Inputs"], _θ);
  main.variable(observer("θ")).define("θ", ["Generators", "viewof θ"], (G, _) => G.input(_));
  main.variable(observer("viewof regl")).define("viewof regl", ["reglCanvas","viewport","html"], _regl);
  main.variable(observer("regl")).define("regl", ["Generators", "viewof regl"], (G, _) => G.input(_));
  main.variable(observer("viewof regl2")).define("viewof regl2", ["reglCanvas","viewport","html"], _regl2);
  main.variable(observer("regl2")).define("regl2", ["Generators", "viewof regl2"], (G, _) => G.input(_));
  main.variable(observer("viewof mag")).define("viewof mag", ["Inputs"], _mag);
  main.variable(observer("mag")).define("mag", ["Generators", "viewof mag"], (G, _) => G.input(_));
  main.variable(observer("viewof speed")).define("viewof speed", ["Inputs"], _speed);
  main.variable(observer("speed")).define("speed", ["Generators", "viewof speed"], (G, _) => G.input(_));
  main.variable(observer("viewof animate")).define("viewof animate", ["Inputs"], _animate);
  main.variable(observer("animate")).define("animate", ["Generators", "viewof animate"], (G, _) => G.input(_));
  main.define("initial selectedMode", _selectedMode);
  main.variable(observer("mutable selectedMode")).define("mutable selectedMode", ["Mutable", "initial selectedMode"], (M, _) => new M(_));
  main.variable(observer("selectedMode")).define("selectedMode", ["mutable selectedMode"], _ => _.generator);
  main.variable(observer("drawMode")).define("drawMode", ["glslComplex","regl2"], _drawMode);
  main.variable(observer("drawLoop2")).define("drawLoop2", ["animate","regl2","selectedMode","drawMode","mesh","cl","ct","mag","speed","invalidation"], _drawLoop2);
  main.variable(observer("mesh")).define("mesh", ["meshFromFunction","regl2","invalidation"], _mesh);
  main.variable(observer("meshFromFunction")).define("meshFromFunction", _meshFromFunction);
  main.variable(observer("updateIndex")).define("updateIndex", ["mat4equals","index","modelViewProjection","mat4copy","makeIndex","antisymmetricLociData","symmetricLociData","regl"], _updateIndex);
  main.variable(observer("selectedPointsBuffer")).define("selectedPointsBuffer", ["regl"], _selectedPointsBuffer);
  main.variable(observer("computeSelectedPoint")).define("computeSelectedPoint", ["regl","mutable selectedMode","viewOpts","index","antisymmetricLociData","symmetricLociData","selectedPointsBuffer","camera","invalidation"], _computeSelectedPoint);
  main.variable(observer("makeIndex")).define("makeIndex", ["KDBush","vec3transformMat4"], _makeIndex);
  main.variable(observer("index")).define("index", ["mat4create"], _index);
  main.variable(observer("KDBush")).define("KDBush", _KDBush);
  main.variable(observer("f0")).define("f0", _f0);
  main.define("initial rootsTimeMS", _rootsTimeMS);
  main.variable(observer("mutable rootsTimeMS")).define("mutable rootsTimeMS", ["Mutable", "initial rootsTimeMS"], (M, _) => new M(_));
  main.variable(observer("rootsTimeMS")).define("rootsTimeMS", ["mutable rootsTimeMS"], _ => _.generator);
  main.define("initial traceTimeMS", _traceTimeMS);
  main.variable(observer("mutable traceTimeMS")).define("mutable traceTimeMS", ["Mutable", "initial traceTimeMS"], (M, _) => new M(_));
  main.variable(observer("traceTimeMS")).define("traceTimeMS", ["mutable traceTimeMS"], _ => _.generator);
  main.variable(observer()).define(["md"], _39);
  main.variable(observer("viewof wd")).define("viewof wd", ["ComplexVariable","f","d"], _wd);
  main.variable(observer("wd")).define("wd", ["Generators", "viewof wd"], (G, _) => G.input(_));
  main.variable(observer("viewof cl")).define("viewof cl", ["cscaleS","θ","E","csqrtS","ν","ρ","ComplexVariable"], _cl);
  main.variable(observer("cl")).define("cl", ["Generators", "viewof cl"], (G, _) => G.input(_));
  main.variable(observer("viewof ct")).define("viewof ct", ["cscaleS","θ","E","csqrtS","ρ","ν","ComplexVariable"], _ct);
  main.variable(observer("ct")).define("ct", ["Generators", "viewof ct"], (G, _) => G.input(_));
  main.variable(observer()).define(["md"], _43);
  main.variable(observer("lambDispersion")).define("lambDispersion", ["ccreateD","csqrS","cdivSS","cl","ct","cinvS","csetValuesD","csqrD","csubDS","cmulSS","csqrtAltD","cscaleD","csinhcoshD","caddDD","cmulDD","csubDD"], _lambDispersion);
  main.variable(observer("lambDiffK")).define("lambDiffK", ["ccreateD","cinvS","csqrS","cl","ct","ccreateS","csetValuesD","csqrD","csubDS","cmulSS","csqrtAltD","cscaleD","csinhcoshD","caddDD","cmulDD","csubDD"], _lambDiffK);
  main.variable(observer("lambDiffW")).define("lambDiffW", ["ccreateD","ccreateS","cinvS","csqrS","cl","ct","csetValuesS","csetValuesD","csqrD","csubSD","cmulDS","csqrtAltD","cscaleD","csinhcoshD","caddSD","cmulSD","cmulDD","csubDD"], _lambDiffW);
  main.variable(observer("fLambDispersion")).define("fLambDispersion", ["parity"], _fLambDispersion);
  main.variable(observer("findComplexRoots")).define("findComplexRoots", ["adaptiveSimpson","vectorAdaptiveSimpson","findRoots"], _findComplexRoots);
  main.variable(observer("complexNewtonRaphson")).define("complexNewtonRaphson", ["cdivSS"], _complexNewtonRaphson);
  main.variable(observer("computeRoots")).define("computeRoots", ["d","lambDispersion","findComplexRoots","complexNewtonRaphson","mutable rootsTimeMS"], _computeRoots);
  main.variable(observer("roots")).define("roots", ["computeRoots","f","radius"], _roots);
  main.variable(observer("rootSeeds")).define("rootSeeds", ["computeRoots","f0","radius"], _rootSeeds);
  main.variable(observer("traceRoots")).define("traceRoots", ["f0","d","lambDiffW","lambDiffK","ccreateS","cdivSS","ode45","complexNewtonRaphson","mutable traceTimeMS"], _traceRoots);
  main.variable(observer("symmetricRootsLoci")).define("symmetricRootsLoci", ["traceRoots","rootSeeds"], _symmetricRootsLoci);
  main.variable(observer("symmetricLociData")).define("symmetricLociData", ["symmetricRootsLoci"], _symmetricLociData);
  main.variable(observer("symmetricLociBuffer")).define("symmetricLociBuffer", ["regl","symmetricLociData","invalidation"], _symmetricLociBuffer);
  main.variable(observer("antisymmetricRootsLoci")).define("antisymmetricRootsLoci", ["traceRoots","rootSeeds"], _antisymmetricRootsLoci);
  main.variable(observer("antisymmetricLociData")).define("antisymmetricLociData", ["antisymmetricRootsLoci"], _antisymmetricLociData);
  main.variable(observer("antisymmetricLociBuffer")).define("antisymmetricLociBuffer", ["regl","antisymmetricLociData","invalidation"], _antisymmetricLociBuffer);
  main.variable(observer("viewof viewportSizing")).define("viewof viewportSizing", ["Inputs"], _viewportSizing);
  main.variable(observer("viewportSizing")).define("viewportSizing", ["Generators", "viewof viewportSizing"], (G, _) => G.input(_));
  main.variable(observer("model")).define("model", ["mat4fromScaling","mat4create"], _model);
  main.variable(observer("modelViewProjection")).define("modelViewProjection", ["mat4create"], _modelViewProjection);
  main.variable(observer("plot")).define("plot", ["PlotContext","width"], _plot);
  main.variable(observer("camera")).define("camera", ["createReglCamera","regl","createInteractions"], _camera);
  main.variable(observer("drawLines")).define("drawLines", ["reglLines","regl"], _drawLines);
  main.variable(observer("drawPoints")).define("drawPoints", ["regl","mat4create"], _drawPoints);
  main.variable(observer("renderFrame")).define("renderFrame", ["camera","model","viewOpts","mat4multiply","modelViewProjection","updateIndex","regl","drawFancyAxes","index","drawPoints","drawLines","symmetricLociData","symmetricLociBuffer","antisymmetricLociData","antisymmetricLociBuffer","selectedPointsBuffer","selectedMode"], _renderFrame);
  main.variable(observer("drawLoop")).define("drawLoop", ["camera","regl","renderFrame","invalidation"], _drawLoop);
  main.variable(observer("drawFancyAxes")).define("drawFancyAxes", ["regl","invalidation","mat4create","mat3create","mat4scale","mat4fromTranslation","mat3normalFromMat4","mat4translate"], _drawFancyAxes);
  main.variable(observer()).define(["md"], _70);
  const child1 = runtime.module(define1);
  main.import("ode45", child1);
  main.variable(observer("reglLines")).define("reglLines", ["require"], _reglLines);
  const child2 = runtime.module(define2);
  main.import("createReglCamera", child2);
  main.import("createInteractions", child2);
  const child3 = runtime.module(define3);
  main.import("reglCanvas", child3);
  main.variable(observer("figureWidth")).define("figureWidth", ["width"], _figureWidth);
  main.variable(observer("viewport")).define("viewport", ["figureWidth"], _viewport);
  const child4 = runtime.module(define4);
  main.import("PlotContext", child4);
  main.import("DomainColoringLayer", child4);
  main.import("ComplexVariable", child4);
  main.import("domainColoringConfig", child4);
  const child5 = runtime.module(define1);
  main.import("adaptiveSimpson", child5);
  main.import("vectorAdaptiveSimpson", child5);
  main.variable(observer("findRoots")).define("findRoots", _findRoots);
  const child6 = runtime.module(define5);
  main.import("ccreateD", child6);
  main.import("ccreateS", child6);
  main.import("csetValuesD", child6);
  main.import("csetValuesS", child6);
  main.import("csqrD", child6);
  main.import("csubDS", child6);
  main.import("csubSD", child6);
  main.import("cmulSS", child6);
  main.import("cmulDS", child6);
  main.import("cmulSD", child6);
  main.import("csqrtD", child6);
  main.import("csqrtAltD", child6);
  main.import("caddDD", child6);
  main.import("caddSD", child6);
  main.import("cmulDD", child6);
  main.import("csubDD", child6);
  main.import("cscaleD", child6);
  main.import("cscaleS", child6);
  main.import("csqrtS", child6);
  main.import("csqrS", child6);
  main.import("cinvS", child6);
  main.import("cdivSS", child6);
  main.import("csinhcoshD", child6);
  const child7 = runtime.module(define6);
  main.import("fmt", "createFmt", child7);
  main.import("sci", child7);
  const child8 = runtime.module(define7);
  main.import("vec3transformMat4", child8);
  const child9 = runtime.module(define8);
  main.import("mat4fromScaling", child9);
  main.import("mat4scale", child9);
  main.import("mat4create", child9);
  main.import("mat4fromTranslation", child9);
  main.import("mat4translate", child9);
  main.import("mat4invert", child9);
  main.import("mat4rotateX", child9);
  main.import("mat4rotateY", child9);
  main.import("mat4rotateZ", child9);
  main.import("mat4multiply", child9);
  main.import("mat4rotate", child9);
  main.import("mat4copy", child9);
  main.import("mat4equals", child9);
  const child10 = runtime.module(define9);
  main.import("glslComplex", child10);
  const child11 = runtime.module(define10);
  main.import("mat3normalFromMat4", child11);
  main.import("mat3create", child11);
  const child12 = runtime.module(define11);
  main.import("vec2normalize", child12);
  main.import("vec2length", child12);
  main.import("vec2scale", child12);
  main.variable(observer("fmt")).define("fmt", ["createFmt"], _fmt);
  main.variable(observer("scifmt")).define("scifmt", ["createFmt","sci"], _scifmt);
  return main;
}
