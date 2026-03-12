import{d as y,_ as X}from"./index-ByB2dbry.js";y({root:document.getElementById("cell-1761"),expanded:[],variables:[]},{id:1761,body:async()=>{const[{default:t},{reglCanvas:n},{default:e},i]=await Promise.all([X(()=>import("https://cdn.jsdelivr.net/npm/regl@2.1.1/+esm"),[]).then(o=>{if(!("default"in o))throw new SyntaxError("export 'default' not found");return o}),X(()=>import("./regl-canvas-4j8SAjSv.js"),[]).then(o=>{if(!("reglCanvas"in o))throw new SyntaxError("export 'reglCanvas' not found");return o}),X(()=>import("https://cdn.jsdelivr.net/npm/simplify-js@1.2.4/+esm"),[]).then(o=>{if(!("default"in o))throw new SyntaxError("export 'default' not found");return o}),X(()=>import("https://cdn.jsdelivr.net/npm/d3@7/+esm"),[])]),d=i.quantize(i.interpolateRdBu,256).map(o=>(o=i.rgb(o),[o.r,o.g,o.b,1]));return{createREGL:t,reglCanvas:n,simplify:e,d3:i,colorscale:d}},inputs:[],outputs:["createREGL","reglCanvas","simplify","d3","colorscale"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-1762"),expanded:[],variables:[]},{id:1762,body:(t,n)=>t`This notebook demonstrates computation of winding numbers in two dimensions based on Jacobson *et al.'s* *[Robust Inside-Outside Segmentation using Generalized Winding Numbers](https://www.cs.utah.edu/~ladislav/jacobson13robust/jacobson13robust.html)* as well as the subsequent optimization of Barill *et al.* in *[Fast Winding Numbers for Soups and Clouds](https://www.dgp.toronto.edu/projects/fast-winding-numbers/)*.

The winding number of a curve relative to a point is a straightforward concept. We trace the curve, add up the angle swept out relative to the point—positive for counterclockwise motion and negative for clockwise—and divide by ${n`2\pi`}. For any point not on the curve itself, this procedure counts count how many times the curve encircles the point, ${n`+1`} for each counterclockwise encircling, ${n`-1`} for each clockwise encircling, and ${n`0`} for points entirely outside the curve.

`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});y({root:document.getElementById("cell-1763"),expanded:[],variables:[]},{id:1763,body:async(t,n,e,i)=>{t(n`<figure>
${await e(new URL("/notebooks/assets/winding@6-BKxWZbKA.svg",import.meta.url).href).image()}
<figcaption>A winding number is computed by adding up the angle swept out as the curve is traced and dividing by ${i`2\pi`}. Inside a counterclockwise-oriented curve, this adds up to ${i`+1`}; for points outside, the angles cancel and add up to ${i`0`}. </figcaption>
</figure>`)},inputs:["view","html","FileAttachment","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-240"),expanded:[],variables:[]},{id:240,body:(t,n)=>t`Stating this procedure mathematically, we write the winding number relative to point ${n`\mathbf{q}`} as the integral
${n.block`w(\mathbf{q}) = \frac{1}{2\pi} \oint_C d\theta.`}
For a curve comprised of discrete line segments, the integral becomes the summation
${n.block`w(\mathbf{q}) = \frac{1}{2\pi} \sum_{i=1}^{n} \theta_i.`}
Jacobson *et al.* offer a formula for computing the angle swept out relative to point ${n`\mathbf{p}`} by the line segment with endpoints ${n`\mathbf{c}_i`} and ${n`\mathbf{c}_{i+1}`}. Defining ${n`\mathbf{a} = \mathbf{c}_i - \mathbf{q}`} and ${n`\mathbf{b} = \mathbf{c}_{i+1} - \mathbf{q}`}, the angle swept out by the segment is
${n.block`
\tan\left(\theta_i(\mathbf{q})\right) = \frac{a_x b_y - a_y b_x}{a_x b_x + a_y b_y}.
`}
The curve does not need to be closed to use the above equation. The figure below plots the winding number induced by a single segment of length ${n`l`}. Color represents this generalized winding number. (The contours are scaled by ${n`1/l`} to better represent the shape of the field.) The winding number is exactly ${n`+1/2`} on one side of the segment, ${n`-1/2`} on the other, and varying shades between as we move around the segment from one side to the other.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});y({root:document.getElementById("cell-2168"),expanded:[],variables:[]},{id:2168,body:(t,n,e,i)=>{const d=t(n,{pixelRatio:devicePixelRatio,extensions:["OES_standard_derivatives"]}),o=d.value.attachResize(Math.min(640,e),Math.min(640,e)*.6),p=o.texture({data:[i],min:"linear",mag:"linear"});return o.drawField=o({vert:`
  precision highp float;
  attribute vec2 xy;
  void main () {
    gl_Position = vec4(xy, 0, 1);
  }`,frag:`
  #extension GL_OES_standard_derivatives : enable
  precision highp float;
  uniform vec2 res;
  uniform float rad;
  uniform sampler2D colorscale;

  float gridFactor (float parameter, float width, float feather) {
    float w1 = width - feather * 0.5;
    float d = length(vec2(dFdx(parameter), dFdy(parameter)));
    float looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
    return smoothstep(d * (w1 + feather), d * w1, looped);
  }

  float field (vec2 p1, vec2 p2, vec2 q) {
    vec2 a = p1 - q;
    vec2 b = p2 - q;
    return atan(a.x * b.y - a.y * b.x, dot(a, b)) / (3.14159 * 2.0);
  }

  const int count = 64;
  vec2 pt (int i) {
    float theta = float(i) / float(count - 1) * (3.14159 * 2.0) * rad;
    return 0.5 * vec2(cos(theta), sin(theta));
  }

  float contrast (float x) {
    return 0.5 + atan(x * 5.0) / 3.14159;
  }

  void main () {
    vec2 q = (gl_FragCoord.xy / res - 0.5) * 2.0 * vec2(res.x / res.y, 1);
    float f = field(vec2(-rad, 0), vec2(rad, 0), q);
    const float wid = ${(devicePixelRatio/2).toFixed(1)};
    float contours = 1.0 - gridFactor(6.0 * f / rad, wid, 2.0) * 0.15;

    vec3 color = mix(vec3(0), texture2D(colorscale, vec2(0.5 + f, 0.5)).rgb, contours);
    gl_FragColor = vec4(color, 1);
  }`,attributes:{xy:[-4,-4,4,-4,0,4]},uniforms:{res:c=>[c.framebufferWidth,c.framebufferHeight],colorscale:p,rad:o.prop("radius")},count:3}),{_reglCanvas0:d,regl0:o,texture0:p}},inputs:["reglCanvas","createREGL","width","colorscale"],outputs:["_reglCanvas0","regl0","texture0"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-2172"),expanded:[],variables:[]},{id:2172,body:(t,n,e,i,d)=>{const o=t.range([.01,1],{step:.001,value:.75,label:n`Segment length, ${e`l`}`}),p=i(o);function c(){d.poll(),d.drawField({radius:o.value})}return o.addEventListener("input",c),c(),{segmentLengthInput:o,segmentLength:p,drawRegl0:c}},inputs:["Inputs","html","tex","view","regl0"],outputs:["segmentLengthInput","segmentLength","drawRegl0"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-2173"),expanded:[],variables:[]},{id:2173,body:(t,n,e)=>{t(n`<figure>
  ${e}
  <figcaption>The integrated winding number field of a single segment with positive winding numbers <span style="color:#12c">blue</span> and negative winding numbers <span style="color:#c12">red</span>.</figcaption>
</figure>`)},inputs:["view","html","_reglCanvas0"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-1790"),expanded:[],variables:[]},{id:1790,body:(t,n,e,i)=>{const d=t(n,{pixelRatio:devicePixelRatio,extensions:["OES_standard_derivatives"]}),o=d.value.attachResize(Math.min(640,e),Math.min(640,e)*.6),p=o.texture({data:[i],min:"linear",mag:"linear"});return o.drawField=o({vert:`
  precision highp float;
  attribute vec2 xy;
  void main () {
    gl_Position = vec4(xy, 0, 1);
  }`,frag:`
  #extension GL_OES_standard_derivatives : enable
  precision highp float;
  uniform vec2 res;
  uniform float progress, sides, offset;
  uniform sampler2D colorscale;
  uniform bool threshold;

  float gridFactor (float parameter, float width, float feather) {
    float w1 = width - feather * 0.5;
    float d = length(vec2(dFdx(parameter), dFdy(parameter)));
    float looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
    return smoothstep(d * (w1 + feather), d * w1, looped);
  }

  float G (vec2 p1, vec2 p2, vec2 q) {
    vec2 a = p1 - q;
    vec2 b = p2 - q;
    return atan(a.x * b.y - a.y * b.x, dot(a, b)) / (3.14159 * 2.0);
  }

  vec2 pt (int i) {
    float t = min(float(i), progress * float(sides));
    float t0 = floor(t);
    float theta0 = (t0 - 0.5) * 3.1415926 * 2.0 / float(sides);
    float theta1 = (t0 + 0.5) * 3.1415926 * 2.0 / float(sides);
    vec2 p0 = vec2(cos(theta0), sin(theta0)) * 0.7;
    vec2 p1 = vec2(cos(theta1), sin(theta1)) * 0.7;
    return mix(p0, p1, clamp(t - t0, 0.0, 1.0));
  }

  void main () {
    vec2 q = (gl_FragCoord.xy / res - 0.5) * 2.0 * vec2(res.x / res.y, 1);

    float f = 0.0;
    vec2 prev;
    const int count = 32;
    for (int i = 0; i <= count; i++) {
      if (i > int(sides)) continue;
      vec2 next = pt(i);
      vec2 t = normalize(next - prev);
      vec2 n = dot(t, t) > 0.0 ? vec2(t.y, -t.x) : vec2(0);
      vec2 p1 = prev + n * offset;
      vec2 p2 = next + n * offset;
      if (i > 0) f += G(p1, p2, q);
      prev = next;
    }

    float contours = 1.0 - gridFactor(16.0 * f, ${(devicePixelRatio/2).toFixed(1)}, 2.0) * smoothstep(1.0, 0.95, progress * smoothstep(0.01, 0.0, abs(offset))) * 0.25;

    vec3 fieldColor = texture2D(colorscale, vec2(0.5 + 0.5 * f, 0.5)).rgb;
    vec3 thresholdColor = mix(vec3(1), vec3(0), smoothstep(-1.0, 1.0, (f - 0.5) / fwidth(f)));
    vec3 color = mix(vec3(0), threshold ? thresholdColor : fieldColor, contours);
    gl_FragColor = vec4(color, 1);
  }`,attributes:{xy:[-4,-4,4,-4,0,4]},uniforms:{res:c=>[c.framebufferWidth,c.framebufferHeight],colorscale:p,progress:o.prop("progress"),sides:o.prop("sides"),offset:o.prop("offset"),threshold:o.prop("threshold")},count:3}),{_reglCanvas1:d,regl1:o,texture1:p}},inputs:["reglCanvas","createREGL","width","colorscale"],outputs:["_reglCanvas1","regl1","texture1"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-1829"),expanded:[],variables:[]},{id:1829,body:(t,n,e,i)=>{const d=t.range([.001,1],{step:.001,value:.4,label:"Progress"}),o=t.range([3,32],{step:1,value:32,label:"Sides"}),p=t.range([-.3,.3],{step:.01,value:0,label:"Offset"}),c=t.checkbox(["Threshold"]);function l(){n.poll(),n.drawField({progress:d.value,sides:o.value,offset:p.value,threshold:!!~c.value.indexOf("Threshold")})}return[d,o,c,p].forEach(s=>s.addEventListener("input",l)),l(),e(i`${d}${o}${p}${c}`),{progressInput:d,sidesInput:o,offsetInput:p,thresholdInput1:c,drawRegl1:l}},inputs:["Inputs","regl1","view","html"],outputs:["progressInput","sidesInput","offsetInput","thresholdInput1","drawRegl1"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-2220"),expanded:[],variables:[]},{id:2220,body:(t,n,e)=>{t(n`<figure>
  ${e}
  <figcaption>32 discrete line segments form a circular arc.</figcaption>
</figure>`)},inputs:["view","html","_reglCanvas1"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-1874"),expanded:[],variables:[]},{id:1874,body:(t,n,e,i)=>{const d=t(n,{pixelRatio:devicePixelRatio,extensions:["OES_standard_derivatives"]}),o=d.value.attachResize(Math.min(640,e),Math.min(640,e)*.6),p=o.texture({data:[i],min:"linear",mag:"linear"});return o.drawField=o({vert:`
  precision highp float;
  attribute vec2 xy;
  void main () {
    gl_Position = vec4(xy, 0, 1);
  }`,frag:`
  #extension GL_OES_standard_derivatives : enable
  precision highp float;
  uniform vec2 res;
  uniform float rad;
  uniform sampler2D colorscale;

  float gridFactor (float parameter, float width, float feather) {
    float w1 = width - feather * 0.5;
    float d = length(vec2(dFdx(parameter), dFdy(parameter)));
    float looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
    return smoothstep(d * (w1 + feather), d * w1, looped);
  }

  float field (vec2 p1, vec2 p2, vec2 q) {
    vec2 a = p1 - q;
    vec2 b = p2 - q;
    return atan(a.x * b.y - a.y * b.x, dot(a, b)) / (3.14159 * 2.0);
  }

  const int count = 32;
  vec2 pt (int i) {
    float x = float(i) / float(count - 1) * 2.0 - 1.0;
    return vec2(x, sin(x * 3.14159) * 0.5 + sin(x * 3.14159 * 2.0) * 0.55) * rad;
  }

  float contrast (float x) {
    return 0.5 + atan(x * 15.0) / 3.14159;
  }

  void main () {
    vec2 q = (gl_FragCoord.xy / res - 0.5) * 2.0 * vec2(res.x / res.y, 1);

    float f = 0.0;
    vec2 prev;
    for (int i = 0; i < count; i++) {
      vec2 next = pt(i);
      if (i > 0) f += field(prev, next, q);
      prev = next;
    }
    f *= 0.5;

    float contours = 1.0 - gridFactor(10.0 * f / rad, ${(devicePixelRatio/2).toFixed(1)}, 2.0) * 0.15;

    vec3 color = mix(vec3(0), texture2D(colorscale, vec2(contrast(f), 0.5)).rgb, contours);
    gl_FragColor = vec4(color, 1);
  }`,attributes:{xy:[-4,-4,4,-4,0,4]},uniforms:{res:c=>[c.framebufferWidth,c.framebufferHeight],colorscale:p,rad:o.prop("radius")},count:3}),{_reglCanvas2:d,regl2:o,texture2:p}},inputs:["reglCanvas","createREGL","width","colorscale"],outputs:["_reglCanvas2","regl2","texture2"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-1877"),expanded:[],variables:[]},{id:1877,body:(t,n,e)=>{const i=t.range([.01,1],{step:.001,value:.75,label:"Scale"}),d=n(i);function o(){e.poll(),e.drawField({radius:i.value})}return i.addEventListener("input",o),o(),{radius2Input:i,radius2:d,drawRegl2:o}},inputs:["Inputs","view","regl2"],outputs:["radius2Input","radius2","drawRegl2"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-2221"),expanded:[],variables:[]},{id:2221,body:(t,n,e)=>{t(n`<figure>
  ${e}
  <figcaption>Adjust the scale and observe that from far away, internal structure disappears and we're left with a dipole.</figcaption>
</figure>`)},inputs:["view","html","_reglCanvas2"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-1757"),expanded:[],variables:[]},{id:1757,body:(t,n)=>t`This suggests a hierarchical approximation: nearby, we iterate over all geometry explicitly; far away, we treat the geometry in aggregate. This method of iterating over a tree of clustered geometry is called the [Barnes-Hut](https://en.wikipedia.org/wiki/Barnes%E2%80%93Hut_simulation) approximation. Barnes-Hut can be a somewhat harsh approximation, but with respect to the number of segments ${n`n`}, its ${n`\mathcal{O}(\log n)`} performance for a single evaluation is such a speedup compared to the naive ${n`\mathcal{O}(n^2)`} that we consider ourselves lucky to get so far with relatively little effort.

(The [Fast Multipole Method](https://en.wikipedia.org/wiki/Fast_multipole_method) (FMM) performs a more careful and accurate expansion, though it's a lot more complicated and I've never tried it. Barill *et al.* mention that it didn't prove advantageous for this particular problem.)

For a deeper dive into the Barnes-Hut approximation, see Jeffrey Heer's excellent notebook [The Barnes-Hut Approximation](https://observablehq.com/@jheer/the-barnes-hut-approximation).`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});y({root:document.getElementById("cell-2434"),expanded:[],variables:[]},{id:2434,body:(t,n,e)=>{t(n`<details>
  <summary>Lots of mathematical details</summary>
  ${n`

We haven't precisely called it such here, but the [plots above](#regl0) are closely related to the [Green's function](https://en.wikipedia.org/wiki/Green%27s_function) of [Laplace's equation](https://en.wikipedia.org/wiki/Laplace%27s_equation) (think electrostatics). A Green's function in the general sense is the response of a system to an impulse. For electrostatics, the impulse is usually a point charge. In our case, rather than point charges, we're dealing with point dipoles.

Defining ${e`\mathbf{r} \equiv \mathbf{q} - \mathbf{p}`} where ${e`\mathbf{q}`} is the point we're querying and ${e`\mathbf{p}`} is the location of a source, the Green's function for Laplace's equation in two dimensions is

${e.block`
G(\mathbf{q}, \mathbf{p}) = \frac{\ln ||\mathbf{q} - \mathbf{p}||}{2\pi} = \frac{\ln r}{2\pi}.
`}
The field of a dipole at point ${e`\mathbf{p}`} with unit normal ${e`\mathbf{n}`} and strength (corresponding to the segment length) ${e`a`} is

${e.block`
a \hat{\mathbf{n}} \cdot \nabla G(\mathbf{q}, \mathbf{p}).
`}

The field we seek is ultimately just the sum a many such dipoles, positioned along our line segments and oriented normal to them. There's a lot of vector calculus going on here which I won't repeat since if you're still interested you should really just read the above papers which explain it better than I intend to.

What I will say is that I struggled a bit to evaluate the tensor products in the Taylor series expansion given by Barill *et al.* Specifically,

${e.block`
\begin{aligned}
w(\mathbf{q}) \approx & \left( \sum_{i=1}^m a_i \hat{\mathbf{n}}_i\right) \cdot \nabla G(\mathbf{q}, \tilde{\mathbf{p}}) \\
& + \left( \sum_{i=1}^m a_i (\mathbf{p}_i - \tilde{\mathbf{p}}) \otimes \hat{\mathbf{n}}_i \right) \cdot \nabla^2 G(\mathbf{q}, \tilde{\mathbf{p}}) \\
& + \frac{1}{2} \left( \sum_{i=1}^m a_i (\mathbf{p}_i - \tilde{\mathbf{p}}) \otimes (\mathbf{p}_i - \tilde{\mathbf{p}}) \otimes \hat{\mathbf{n}}_i \right) \cdot \nabla^3 G(\mathbf{q}, \tilde{\mathbf{p}})
\end{aligned}
`}

The summations represent an aggregation of clustered geometry, and ${e`G`} is the Green's function representing the effect that cluster has on its surroundings. Thus, ${e`i`} corresponds to the index of the geometry over which we're summing, ${e`\tilde{\mathbf{p}}`} represents the area-weighted position of our aggregated geometry. I got a bit confused by the tensor products and gradients and had to fall back on [Einstein summation notation](https://en.wikipedia.org/wiki/Einstein_notation) for their evaluation. So let's compute some gradients.

First, we compute ${e`\nabla G`}. We can write this as ${e`\frac{\partial G}{\partial x_i}`} or use the shorthand ${e`\partial_i G`}. Then we have

${e.block`
\nabla G \equiv \partial_i G = \partial_i \frac{\ln r}{2\pi}
`}

Using ${e`\mathbf{r} = \mathbf{x} - \mathbf{p}`} and therefore ${e`r = ||\mathbf{x} - \mathbf{p}||`}, then we seek

${e.block`
\partial_i G = \partial_i \frac{\ln r}{2\pi} = \partial_i \frac{\ln \sqrt{r^2}}{2\pi} = \partial_i \frac{\ln \sqrt{r_i r_i}}{2\pi}
`}
where ${e`r_i r_i`} uses [Einstein summation notation](https://en.wikipedia.org/wiki/Einstein_notation) and represents the sum ${e`r^2 = r_i r_i = r_0 r_0 + r_1 r_1 + r_2 r_2`}. Then we compute the gradient

${e.block`
\begin{aligned}
\partial_i G &= \frac{1}{4\pi} \partial_i (\ln r_j r_j) \\
&= \frac{1}{4\pi r^2} \partial_i(r_j r_j) \\
&= \frac{1}{4\pi r^2} (\partial_i r_j r_j + r_j \partial_i r_j) \\
&= \frac{1}{2\pi r^2} r_j \partial_i r_j \\
&= \frac{1}{2\pi r^2} r_j \partial_i (x_j - q_j) \\
&= \frac{1}{2\pi r^2} r_j \delta_{ij} \\
\partial_i G &= \frac{r_i}{2\pi r^2} \\
\end{aligned}
`}
Here I've used the fact that ${e`\mathbf{q}`} is constant and that ${e`\partial_i x_j = \delta_{ij}`}, where ${e`\delta_{ij}`} is the [Kronecker delta](https://en.wikipedia.org/wiki/Kronecker_delta). Translating back to vector notation, this is just ${e.block`\nabla G = \frac{\mathbf{r}}{2\pi r^2}.`}

Next is the second order gradient, ${e`\partial_{ij} G`}. A similar process yields

${e.block`
\begin{aligned}
\partial_{ij} G &= \partial_j \left(\frac{r_i}{2\pi r^2}\right) \\
&= \frac{1}{2\pi}\left[ \frac{r^2 \delta_{ij} - r_i \partial_j r^2}{r^4} \right] \\
&= \frac{1}{2\pi r^2}\left[ \delta_{ij} - \frac{r_i 2 r_j}{r^2} \right] \\
\partial_{ij} G &= \frac{\delta_{ij}}{2\pi r^2} - \frac{r_i r_j}{\pi r^4} \\
\end{aligned}
`}
We can translate this into vector (well, tensor) notation as well, yielding
${e.block`
\nabla^2 G = \frac{\mathbf{I}}{2\pi r^2} - \frac{\mathbf{r} \otimes \mathbf{r}}{\pi r^4}.
`}
(${e`\nabla^2 G`} denotes the second-order tensor gradient rather than the Laplacian.) The two forms are equivalent, but personally I find tensor notation much harder to reason about, compared to summation notation which directly describes how to compute the values. I probably need to spend more time with tensors.

Finally, ${e`\nabla^3 G`}. It's similar again, just more tedious. We differentiate the previous result, yielding

${e.block`
\begin{aligned}
\partial_{ijk} G = \partial_{k} (\partial_{ij} G) &= \partial_k \left(\frac{\delta_{ij}}{2\pi r^2} - \frac{r_i r_j}{\pi r^4}\right) \\
\end{aligned}
`}
It's tedious and had to do this about four times before finally getting a consistent answer, but when I did, I got the result
${e.block`
\partial_{ijk} G = -\frac{\delta_{ij} r_k + \delta_{ik} r_j + \delta_{jk} r_i}{\pi r^4} + \frac{4 r_i r_j r_k}{\pi r^6}.
`}

Finally, using the superscript ${e`i`} to denote geometry index and ${e`j`}, ${e`k`}, and ${e`l`} as summation indices, I wrote the correction as

${e.block`
\begin{aligned}
w(\mathbf{q}) \approx & \left( \sum_{i=1}^m a_i \hat{n}^i_j \right) \partial_j G(\mathbf{q}, \tilde{\mathbf{p}}) \\
& + \left( \sum_{i=1}^m a_i (p^i_j - \tilde{p}_j) \hat{n}^i_k \right) \partial_{jk} G(\mathbf{q}, \tilde{\mathbf{p}}) \\
& + \frac{1}{2} \left( \sum_{i=1}^m a_i (p^i_j - \tilde{p}_j) (p^i_k - \tilde{p}_k) \hat{n}^i_l \right) \cdot \partial_{jkl} G (\mathbf{q}, \tilde{\mathbf{p}})
\end{aligned}
`}

Finally, this is something we can compute! I found that this correction helped, sometimes significantly _until_ I improved my implementation to use the Green's function of a finite-length segment instead of just a point dipole. In the end, I started to think that unless I back up and more correctly compute the gradient of the finite-length segment Green's function, this is all probably a lot of effort for nothing.
`}
</details>`)},inputs:["view","md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-1541"),expanded:[],variables:[]},{id:1541,body:(t,n)=>{const e=t.range([0,5],{value:0,step:.1,label:"Line simplification"}),i=t.range([5,100],{label:"Max items per BVH node",value:10,step:1,transform:Math.log}),d=t.range([0,1],{label:"Recursion threshold",value:.5,step:.01}),o=t.range([1,16],{value:2,transform:Math.log,step:.5,label:"Render downsampling"}),p=t.checkbox(["Debug","Live update","Point dipoles for clusters","1st order correction","2nd order correction"],{value:["Live update","Point dipoles for clusters","1st order correction"]}),c=t.radio(["Color","Threshold (CCW)","Threshold (CW)"],{value:"Color"}),l=t.form({lineSimplification:e,maxItemsPerNode:i,recursionThreshold:d,downsampling:o,config:p,threshold:c}),s=n(l);return{lineSimplificationInput:e,maxItemsPerNodeInput:i,recursionThresholdInput:d,downsamplingInput:o,configInput:p,thresholdInput:c,controlsForm:l,controls:s}},inputs:["Inputs","view"],outputs:["lineSimplificationInput","maxItemsPerNodeInput","recursionThresholdInput","downsamplingInput","configInput","thresholdInput","controlsForm","controls"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-1542"),expanded:[],variables:[]},{id:1542,body:t=>{const n=t.lineSimplification,e=t.maxItemsPerNode,i=t.recursionThreshold,d=t.downsampling,o=t.config,p=t.threshold;return{lineSimplification:n,maxItemsPerNode:e,recursionThreshold:i,downsampling:d,config:o,threshold:p}},inputs:["controls"],outputs:["lineSimplification","maxItemsPerNode","recursionThreshold","downsampling","config","threshold"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-2435"),expanded:[],variables:[]},{id:2435,body:(t,n)=>{const e=document.createElement("canvas"),i=devicePixelRatio;e.width=t[0]*i,e.height=t[1]*i,e.style.width=t[0]+"px",e.style.height=t[1]+"px";const d=e.getContext("2d");return d.scale(i,i),e.style.position="relative",e.value=d,e.style.cursor="pointer",d.strokeStyle="black",d.lineWidth=2,n(e),{ctxCanvas:e,dpi:i,ctx:d}},inputs:["shape","view"],outputs:["ctxCanvas","dpi","ctx"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-64"),expanded:[],variables:[]},{id:64,body:(t,n)=>{const e=t.button("Reset"),i=n(e);return{resetInput:e,reset:i}},inputs:["Inputs","view"],outputs:["resetInput","reset"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-186"),expanded:[],variables:[]},{id:186,body:(t,n)=>{const e=t.button("Undo"),i=n(e);return{undoInput:e,undo:i}},inputs:["Inputs","view"],outputs:["undoInput","undo"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-1473"),expanded:[],variables:[]},{id:1473,body:()=>({timing:{render:0,bvhConstruction:0}}),inputs:[],outputs:["timing"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-2639"),expanded:[],variables:[]},{id:2639,body:t=>({segmentCount:t.reduce((e,i)=>e+i.length,0)}),inputs:["lines"],outputs:["segmentCount"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-2620"),expanded:[],variables:[]},{id:2620,body:()=>({lines:[]}),inputs:[],outputs:["lines"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-2621"),expanded:[],variables:[]},{id:2621,body:(t,n)=>({linesReady:function(){if(t.length>0)return!0;function i(p,c,l,s,r=!1){const a=[],h=r?1:-1;for(let f=0;f<=s;f++){const m=h*f/s*Math.PI*2;a.push({x:p+l*Math.cos(m),y:c+l*Math.sin(m)})}return a}function d(p,c,l,s,r,a=!1){const h=[],m=l/2,u=s/2,j=a?[{cx:p+m-r,cy:c-u+r,startAngle:-Math.PI/2,endAngle:0},{cx:p+m-r,cy:c+u-r,startAngle:0,endAngle:Math.PI/2},{cx:p-m+r,cy:c+u-r,startAngle:Math.PI/2,endAngle:Math.PI},{cx:p-m+r,cy:c-u+r,startAngle:Math.PI,endAngle:Math.PI*1.5}]:[{cx:p+m-r,cy:c-u+r,startAngle:0,endAngle:-Math.PI/2},{cx:p-m+r,cy:c-u+r,startAngle:-Math.PI/2,endAngle:-Math.PI},{cx:p-m+r,cy:c+u-r,startAngle:Math.PI,endAngle:Math.PI/2},{cx:p+m-r,cy:c+u-r,startAngle:Math.PI/2,endAngle:0}];for(const _ of j)for(let k=0;k<=8;k++){const P=_.startAngle+(_.endAngle-_.startAngle)*k/8;h.push({x:_.cx+r*Math.cos(P),y:_.cy+r*Math.sin(P)})}return h.push(h[0]),h}const o=[d(200,300,280,340,40,!1),d(200,300,140,180,20,!0),i(450,200,70,24,!1),i(450,400,50,20,!0),i(520,300,40,12,!1).slice(0,8),[]];for(const p of o)t.push(p.map(({x:c,y:l})=>({x:c+n/2-300,y:l})));return!0}()}),inputs:["lines","width"],outputs:["linesReady"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-334"),expanded:[],variables:[]},{id:334,body:()=>{function t(n){const e=[];for(const i of n)for(let d=0;d<i.length-1;d++){const o=i[d].x-i[d+1].x,p=i[d].y-i[d+1].y;o*o+p*p!==0&&e.push([i[d].x,i[d].y,i[d+1].x,i[d+1].y])}return new Float64Array(e.flat())}return{toSegmentCloud:t}},inputs:[],outputs:["toSegmentCloud"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-408"),expanded:[],variables:[]},{id:408,body:()=>{function t(n){const e=new Float64Array(n.length);for(let i=0;i<n.length;i+=4)e[i+0]=Math.min(n[i+0],n[i+2]),e[i+1]=Math.min(n[i+1],n[i+3]),e[i+2]=Math.max(n[i+0],n[i+2]),e[i+3]=Math.max(n[i+1],n[i+3]);return e}return{toAabbs:t}},inputs:[],outputs:["toAabbs"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-490"),expanded:[],variables:[]},{id:490,body:()=>({BVH:function(){function n(c,l,s){this.aabb=new s(4),this.startIndex=c,this.endIndex=l,this.node0=null,this.node1=null}const e=[],i=[],d=[],o=[];class p{constructor(l,{epsilon:s=1e-6,maxItemsPerNode:r=10}={}){this._aabbs=l;const a=this._aabbs.length/4;this._epsilon=s,this._maxItemsPerNode=r,this._aabbTypeCtor=Float64Array;const h=Uint32Array;this._idArray=new h(a);for(var f=0;f<a;f++)this._idArray[f]=f;this.root=new n(0,a,this._aabbTypeCtor),this.computeExtents(this.root),this._nodeSplitPtr=0,e.length=0,e[0]=this.root;let m=0;for(;this._nodeSplitPtr>=0&&m++<1e6;)this.splitNode(e[this._nodeSplitPtr--]);if(m>1e6)throw new Error("Uh-oh, it seems like BVH construction ran into an infinite loop.");e.length=0}computeExtents(l){const s=l.aabb;let r=1/0,a=1/0,h=-1/0,f=-1/0;for(let k=l.startIndex*4,P=l.endIndex*4;k<P;k+=4)r=Math.min(this._aabbs[k],r),a=Math.min(this._aabbs[k+1],a),h=Math.max(this._aabbs[k+2],h),f=Math.max(this._aabbs[k+3],f);const m=(h+r)*.5,u=(f+a)*.5,j=Math.max((h-r)*.5,this._epsilon)*(1+this._epsilon),_=Math.max((f-a)*.5,this._epsilon)*(1+this._epsilon);s[0]=m-j,s[1]=u-_,s[2]=m+j,s[3]=u+_}splitNode(l){let s,r,a;const h=l.startIndex,f=l.endIndex,m=f-h;if(m<=this._maxItemsPerNode||m===0)return;const u=this._aabbs,j=this._idArray;d[0]=l.aabb[0]+l.aabb[2],d[1]=l.aabb[1]+l.aabb[3];let _=0,k=0,P=0,R=0;for(s=h*4,r=f*4;s<r;s+=4)u[s]+u[s+2]<d[0]?_++:P++,u[s+1]+u[s+3]<d[1]?k++:R++;if(i[0]=_===0||P===0,i[1]=k===0||R===0,i[0]&&i[1])return;const A=l.aabb[2]-l.aabb[0];let G=l.aabb[3]-l.aabb[1]>A?1:0;i[G]&&(G=1-G);let I,x,v,E,$=1/0,w=1/0,M=-1/0,C=-1/0,B=1/0,F=1/0,q=-1/0,T=-1/0;const O=d[G];for(I=h*4,v=(f-1)*4,x=h,E=f-1;I<=v;I+=4,x++)u[I+G]+u[I+G+2]>=O?(a=j[x],j[x]=j[E],j[E]=a,a=u[I],B=Math.min(B,a),u[I]=u[v],u[v]=a,a=u[I+1],F=Math.min(F,a),u[I+1]=u[v+1],u[v+1]=a,a=u[I+2],q=Math.max(q,a),u[I+2]=u[v+2],u[v+2]=a,a=u[I+3],T=Math.max(T,a),u[I+3]=u[v+3],u[v+3]=a,x--,E--,I-=4,v-=4):($=Math.min($,u[I]),w=Math.min(w,u[I+1]),M=Math.max(M,u[I+2]),C=Math.max(C,u[I+3]));l.startIndex=l.endIndex=-1;const b=l.node0=new n(h,x,this._aabbTypeCtor),g=l.node1=new n(x,f,this._aabbTypeCtor);let H,D,N,J;const W=this._epsilon;H=(M+$)*.5,D=(C+w)*.5,N=Math.max((M-$)*.5,W)*(1+W),J=Math.max((C-w)*.5,W)*(1+W),b.aabb[0]=H-N,b.aabb[1]=D-J,b.aabb[2]=H+N,b.aabb[3]=D+J,H=(q+B)*.5,D=(T+F)*.5,N=Math.max((q-B)*.5,W)*(1+W),J=Math.max((T-F)*.5,W)*(1+W),g.aabb[0]=H-N,g.aabb[1]=D-J,g.aabb[2]=H+N,g.aabb[3]=D+J,x-h>this._maxItemsPerNode&&(e[++this._nodeSplitPtr]=l.node0),f-x>this._maxItemsPerNode&&(e[++this._nodeSplitPtr]=l.node1)}test(l,s){o.length=0;var r=0;for(o[0]=this.root;r>=0;){var a=o[r--];if(l(a.aabb)){a.node0&&(o[++r]=a.node0),a.node1&&(o[++r]=a.node1);for(var h=a.startIndex;h<a.endIndex;h++)s(this._idArray[h])}}o.length=0}traversePreorder(l){const s=[];let r=this.root;for(;s.length||r;){for(;r;){const a=l(r)!==!1;a&&r.node1&&s.push(r.node1),r=a&&r.node0}s.length&&(r=s.pop())}}traverseInorder(l){const s=[];let r=this.root;for(;r||s.length;){for(;r;)s.push(r),r=r.node0;r=s[s.length-1],s.pop(),l(r),r=r.node1}}traversePostorder(l){const s=[this.root];let r=null;for(;s.length;){const a=s[s.length-1];!r||r.node0===a||r.node1===a?a.node0?s.push(a.node0):a.node1?s.push(a.node1):(s.pop(),l(a)):a.node0===r?a.node0?s.push(a.node1):(s.pop(),l(a)):a.node1===r&&(s.pop(),l(a)),r=a}}}return p}()}),inputs:[],outputs:["BVH"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-784"),expanded:[],variables:[]},{id:784,body:(t,n,e)=>({createEvaluator:function(){return function(o,{maxItemsPerNode:p=10}={}){const c=performance.now(),l=new t(n(o),{maxItemsPerNode:p});l.traversePostorder(function(a){if(a.node0){const{a:h,an_x:f,an_y:m,ap_x:u,ap_y:j}=a.node0,{a:_,an_x:k,an_y:P,ap_x:R,ap_y:A}=a.node1,S=h+_,G=u/h,I=j/h,x=R/_,v=A/_,E=(u+R)/S,$=(j+A)/S,w=G-E,M=I-$,C=x-E,B=v-$;a.a=h+_,a.an_x=f+k,a.an_y=m+P,a.ap_x=u+R,a.ap_y=j+A,a.apn_xx=w*f+C*k,a.apn_xy=w*m+C*P,a.apn_yx=M*f+B*k,a.apn_yy=M*m+B*P,a.appn_xxx=w*w*f+C*C*k,a.appn_xxy=w*w*m+C*C*P,a.appn_xyx=w*M*f+C*B*k,a.appn_xyy=w*M*m+C*B*P,a.appn_yyx=M*M*f+B*B*k,a.appn_yyy=M*M*m+B*B*P}else{let h=0,f=0,m=0,u=0,j=0;for(let w=a.startIndex;w<a.endIndex;w++){const M=l._idArray[w]*4,C=o[M],B=o[M+1],F=o[M+2],q=o[M+3],T=Math.hypot(F-C,q-B);h+=T,u+=T*.5*(C+F),j+=T*.5*(B+q),f+=q-B,m+=C-F}const _=u/h,k=j/h;let P=0,R=0,A=0,S=0,G=0,I=0,x=0,v=0,E=0,$=0;for(let w=a.startIndex;w<a.endIndex;w++){const M=l._idArray[w]*4,C=o[M],B=o[M+1],F=o[M+2],q=o[M+3],T=q-B,O=C-F,b=.5*(C+F)-_,g=.5*(B+q)-k;P+=b*T,R+=b*O,A+=g*T,S+=g*O,G+=b*b*T,I+=b*b*O,x+=b*g*T,v+=b*g*O,E+=g*g*T,$+=g*g*O}a.a=h,a.an_x=f,a.an_y=m,a.ap_x=u,a.ap_y=j,a.apn_xx=P,a.apn_xy=R,a.apn_yx=A,a.apn_yy=S,a.appn_xxx=G,a.appn_xxy=I,a.appn_xyx=x,a.appn_xyy=v,a.appn_yyx=E,a.appn_yyy=$}});const s=performance.now();e.bvhConstruction=s-c;const r=function(a,h,f=2,m=!1,u=!1,j=!1){let _=0;return l.traversePreorder(function({node0:k,startIndex:P,endIndex:R,aabb:A,a:S,an_x:G,an_y:I,ap_x:x,ap_y:v,apn_xx:E,apn_xy:$,apn_yx:w,apn_yy:M,appn_xxx:C,appn_xxy:B,appn_xyx:F,appn_xyy:q,appn_yyx:T,appn_yyy:O}){if(S===0)return 0;const b=x/S-a,g=v/S-h,H=b*b+g*g,D=A[2]-A[0],N=A[3]-A[1];if(.25*(D*D+N*N)/H<Math.pow(f,2)){if(j)_+=(b*G+g*I)/(b*b+g*g)/(2*Math.PI);else{const L=b+I*.5,U=g-G*.5,K=b-I*.5,Q=g+G*.5;_+=Math.atan2(L*Q-U*K,L*K+U*Q)/(2*Math.PI)}const V=b*b+g*g,z=1/(Math.PI*V*V);if(m){const L=(.5*V-b*b)*z,U=-b*g*z,K=(.5*V-g*g)*z;_+=L*E+U*($+w)+K*M}if(u){const L=4/V,U=L*b*b*b-3*b,K=L*b*b*g-g,Q=L*b*g*g-b,Y=L*g*g*g-3*g;_+=.5*z*(U*C+K*(B+2*F)+Q*(2*q+T)+Y*O)}return!1}else if(!k)for(let V=P;V<R;V++){const z=l._idArray[V]*4,L=o[z]-a,U=o[z+1]-h,K=o[z+2]-a,Q=o[z+3]-h;_+=Math.atan2(L*Q-U*K,L*K+U*Q)/(2*Math.PI)}}),_};return r.bvh=l,r}}()}),inputs:["BVH","toAabbs","timing"],outputs:["createEvaluator"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-187"),expanded:[],variables:[]},{id:187,body:()=>({buttonState:{lastUndo:0,lastReset:0}}),inputs:[],outputs:["buttonState"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-188"),expanded:[],variables:[]},{id:188,body:(t,n,e,i)=>{(function(){t!==n.lastUndo&&(n.lastUndo=t,e.pop(),e.pop(),e.push([]),i())})()},inputs:["undo","buttonState","lines","repaint"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-66"),expanded:[],variables:[]},{id:66,body:(t,n,e,i)=>{(function(){t!==n.lastReset&&(n.lastReset=t,e.length=0,e.push([]),i())})()},inputs:["reset","buttonState","lines","repaint"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-224"),expanded:[],variables:[]},{id:224,body:()=>({options:{}}),inputs:[],outputs:["options"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-227"),expanded:[],variables:[]},{id:227,body:(t,n,e)=>{(function(){t.threshold=n,e()})()},inputs:["options","threshold","repaint"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-20"),expanded:[],variables:[]},{id:20,body:(t,n,e,i,d,o,p,c)=>{(function(){let s=[];function r({offsetX:f,offsetY:m}){s.push({x:f,y:m}),window.addEventListener("mouseup",h),t.addEventListener("mousemove",a),n.moveTo(f,m)}function a({offsetX:f,offsetY:m}){s.push({x:f,y:m}),~e.indexOf("Live update")?(i[i.length-1]=d(s,o,{highQuality:!0}),p()):(n.beginPath(),n.strokeStyle="red",n.moveTo(s[s.length-2].x,s[s.length-2].y),n.lineTo(s[s.length-1].x,s[s.length-1].y),n.stroke())}function h(){window.removeEventListener("mouseup",h),t.removeEventListener("mousemove",a),s.length>1?(i[i.length-1]=d(s,o,{highQuality:!0}),s=[],i.push(s)):s.length=0,p()}t.addEventListener("mousedown",r),c.then(()=>{t.removeEventListener("mousedown",r)})})()},inputs:["ctxCanvas","ctx","config","lines","simplify","lineSimplification","repaint","invalidation"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-7"),expanded:[],variables:[]},{id:7,body:t=>({shape:function(){const e=Math.min(640,t);return[t,e]}()}),inputs:["width"],outputs:["shape"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-1551"),expanded:[],variables:[]},{id:1551,body:(t,n)=>({renderCtx:function(){const i=document.createElement("canvas");return i.width=Math.floor(t[0]/n),i.height=Math.floor(t[1]/n),i.getContext("2d")}()}),inputs:["shape","downsampling"],outputs:["renderCtx"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});y({root:document.getElementById("cell-46"),expanded:[],variables:[]},{id:46,body:(t,n,e,i,d,o,p,c,l,s,r,a)=>{function h(){t.clearRect(0,0,...n);let f;const m=[0,0,0,1],u=[255,255,255,1],j=e(i(d),{maxItemsPerNode:o}),_=[p.canvas.width,p.canvas.height],k=p.getImageData(0,0,..._),P=k.data,R=~c.indexOf("1st order correction"),A=~c.indexOf("2nd order correction"),S=~c.indexOf("Point dipoles for clusters"),G=performance.now();for(let x=0;x<_[0];x++)for(let v=0;v<_[1];v++){let E=j((x+.5)*n[0]/_[0],(v+.5)*n[1]/_[1],l,R,A,S);const $=4*(x+v*_[0]);if(s.threshold!=="Color"){const w=s.threshold==="Threshold (CCW)"?-1:1;f=E*w>.5?m:u}else f=r[Math.max(0,Math.min(r.length,Math.floor((.5-.5*Math.atan(4*E)*2/Math.PI)*r.length)))];P[$]=f[0],P[$+1]=f[1],P[$+2]=f[2],P[$+3]=f[3]*255}const I=performance.now();a.render=I-G,p.putImageData(k,0,0),t.drawImage(p.canvas,0,0,...n),~c.indexOf("Debug")&&(t.strokeStyle="black",t.beginPath(),j.bvh.traversePostorder(function(x){const[v,E,$,w]=x.aabb;t.moveTo(v,E),t.lineTo($,E),t.lineTo($,w),t.lineTo(v,w),t.lineTo(v,E)}),t.stroke()),t.strokeStyle=s.threshold==="Color"?"black":"red";for(const x of d)if(x.length){t.beginPath(),t.moveTo(x[0].x,x[0].y);for(let v=1;v<x.length;v++)t.lineTo(x[v].x,x[v].y);t.stroke()}if(~c.indexOf("Debug")){for(const[x,v]of[["red",-1],["blue",1]])for(const E of d)if(E.length){t.beginPath(),t.moveTo(E[0].x,E[0].y);for(let $=0;$<E.length;$++){const w=Math.max(0,$-1),M=Math.min(E.length-1,$+1),{x:C,y:B}=E[w],{x:F,y:q}=E[$],{x:T,y:O}=E[M];let b=T-C,g=O-B;const H=Math.hypot(b,g);b/=H,g/=H,t.strokeStyle=x,t.moveTo(F,q),t.lineTo(F+v*10*g,q-v*10*b)}t.stroke()}}}return{repaint:h}},inputs:["ctx","shape","createEvaluator","toSegmentCloud","lines","maxItemsPerNode","renderCtx","config","recursionThreshold","options","colorscale","timing"],outputs:["repaint"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});
