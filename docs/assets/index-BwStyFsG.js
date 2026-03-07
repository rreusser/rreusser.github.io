import{d,_ as w}from"./index-ByB2dbry.js";d({root:document.getElementById("cell-2819"),expanded:[],variables:[]},{id:2819,body:async function(t,e,n,a){return t`<figure>
<div style="display: flex; gap: 2%; justify-content: center;">
  <img src="${await e(new URL("/notebooks/assets/old-CLf2rk4C.jpg",import.meta.url).href).url()}" style="width: 48%; height: auto;">
  <img src="${await e(new URL("/notebooks/assets/new-BqwmRspw.jpg",import.meta.url).href).url()}" style="width: 48%; height: auto;">
</div>
<figcaption>${n`A comparison of a Möbius transformation, ${a`f(z) = \frac{(z-a)(b-m)}{(z-b)(a-m)}`} with ${a`a = -\frac{3}{2} + \frac{i}{2}`}, ${a`b = \frac{3}{2} - \frac{i}{2}`}, and ${a`m = 0`}, using my [older method for domain coloring](https://github.com/rreusser/glsl-domain-coloring) (*left*) and [the techniques from this notebook](https://observablehq.com/@rreusser/complex-function-plotter) (*right*).`}</figcaption>
</figure>`},inputs:["html","FileAttachment","md","tex"],outputs:void 0,output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});d({root:document.getElementById("cell-3497"),expanded:[],variables:[]},{id:3497,body:(t,e)=>({complexSampleFunctionGLSL:t(e(`vec2 complexSampleFunction (vec2 z, vec2 zMouse) {
  return cmul(
    cdiv(z - vec2(1, 0), z + vec2(1, 0)),
    z - zMouse
  );
}`))}),inputs:["view","code"],outputs:["complexSampleFunctionGLSL"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-2288"),expanded:[],variables:[]},{id:2288,body:(t,e)=>({logStripesGLSL:t(e(`float logStripesColormap (float f, float spacing) {
  return 2.0 * (0.5 - abs(fract(log2(abs(f)) / spacing) - 0.5));
}`))}),inputs:["view","code"],outputs:["logStripesGLSL"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-2598"),expanded:[],variables:[]},{id:2598,body:(t,e,n,a)=>({regl0:t(function(){const i=e(n),u=a`
    <figure>
      ${i}
      <figcaption>Our starting point: the log of the magnitude of a function, plotted with a triangle-wave color map. Adjust the threshold below and observe non-uniform lines that result.</figcaption>
    </figure>`;return u.value=i.value,u}())}),inputs:["view","createREGLContext","smallCanvas","html"],outputs:["regl0"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-3022"),expanded:[],variables:[]},{id:3022,body:function(e){return e({min:0,max:1,value:[0,1],description:"Colorscale threshold"})},inputs:["rangeSlider"],outputs:void 0,output:"viewof$gradientThreshold",assets:void 0,autodisplay:!0,autoview:!0,automutable:!1});d({root:document.getElementById("cell-3625"),expanded:[],variables:[]},{id:3625,body:(t,e,n,a)=>({drawLoop0:function(){t.configureMouse.taint();const i=e.frame(()=>{t.configureView(()=>{t.configureBlit(()=>{t.configureMouse(u=>{u.dirty&&t.drawField({contourSpacing:1,gradientThreshold:n})})})})});a.then(()=>i.cancel())}()}),inputs:["drawCmds0","regl0","gradientThreshold","invalidation"],outputs:["drawLoop0"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-2601"),expanded:[],variables:[]},{id:2601,body:(t,e,n,a,o,i,u,r,s)=>({drawCmds0:{configureBlit:t(e),configureView:n(e),configureMouse:a(e,o),drawField:e({frag:`
      #extension GL_OES_standard_derivatives : enable
      precision highp float;
      uniform float contourSpacing;
      uniform vec2 mouse;
      uniform vec2 threshold;
      varying vec2 xy;

      ${i}
      ${u}
      ${r}
      ${s}

      // Equivalent to smoothstep, but with a hard edge
      float hardstep (float edge0, float edge1, float x) {
        return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
      }

      void main () {
        vec2 f = complexSampleFunction(xy, mouse);
        float contours = logStripesColormap(cabs(f), contourSpacing);
        contours = hardstep(threshold.x, threshold.y, contours);
        gl_FragColor = vec4(gammaCorrect(vec3(contours)), 1);
      }`,uniforms:{contourSpacing:e.prop("contourSpacing"),threshold:e.prop("gradientThreshold")}})}}),inputs:["createBlitCmd","regl0","createConfigureViewCmd","createAttachMouseCmd","invalidation","glslComplex","gammaCorrectGLSL","complexSampleFunctionGLSL","logStripesGLSL"],outputs:["drawCmds0"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-2940"),expanded:[],variables:[]},{id:2940,body:async(t,e,n)=>t`<figure style="text-align:center">
<img src="${await e(new URL("/notebooks/assets/fragments-CQSjwBqD.jpg",import.meta.url).href).url()}" style="max-width:300px;margin:auto">
<figcaption>${n`A block of four adjacent fragments (pixels), from which GPU shaders may request screen-space derivatives.`}</figcaption>
</figure>`,inputs:["html","FileAttachment","md"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-3596"),expanded:[],variables:[]},{id:3596,body:(t,e)=>t`GPUs evaluate fragments in ${e`2 \times 2`} blocks and offer horizontal and vertical differences between fragments as built-in functions. These differences are equivalent to first order [finite difference](https://en.wikipedia.org/wiki/Finite_difference) approximations of the derivative with units of *units per pixel*. Horizontal derivatives within a block are defined as
`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-3597"),expanded:[],variables:[]},{id:3597,body:(t,e)=>t`${e.block`
\begin{aligned}
& \left.\frac{\partial f}{\partial i}\right|_{i, j} = \left.\frac{\partial f}{\partial i}\right|_{i + 1, j} \approx f_{i + 1, j} - f_{i, j} \\

& \left.\frac{\partial f}{\partial i}\right|_{i, j + 1} = \left.\frac{\partial f}{\partial i}\right|_{i + 1, j + 1} \approx f_{i + 1, j + 1} - f_{i, j + 1}
\end{aligned}
`}
`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-3599"),expanded:[],variables:[]},{id:3599,body:(t,e)=>t`where ${e`i`} and ${e`j`} are pixel coordinates. Vertical derivatives are defined similarly. The screen-space gradient magnitude is then the sum of the squares of the ${e`i-`} and ${e`j-`}derivatives.
`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-3600"),expanded:[],variables:[]},{id:3600,body:(t,e)=>t`${e.block`\left| \nabla f \right| = \sqrt{ \left(\frac{\partial f}{\partial i}\right)^2 +  \left(\frac{\partial f}{\partial j}\right)^2}`}
`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-3602"),expanded:[],variables:[]},{id:3602,body:(t,e)=>t`${e.block`\frac{(\mathrm{units})}{(\frac{\mathrm{units}}{\mathrm{pixel}})} = \mathrm{pixels}`}
`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-26"),expanded:[],variables:[]},{id:26,body:(t,e)=>t`The function \`fwidth\` is often used as a square-root-free proxy for the gradient magnitude but results in about a 40% anisotropy in diagonal directions (i.e. ${e`\sqrt{2}`}), so that \`length(vec2(dFdx(f), dFdy(f)))\` is preferable for the best quality.
`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-220"),expanded:[],variables:[]},{id:220,body:(t,e)=>({logContoursGLSL:t(e(`float logContours (float f, float spacing, float width, float antialiasWidth) {
  float plotVar = log2(abs(f)) * spacing;
  float screenSpaceGradient = hypot(vec2(dFdx(f), dFdy(f))) / abs(f) * spacing;
  return linearstep(
    width + 0.5 * antialiasWidth,
    width - 0.5 * antialiasWidth,
    (0.5 - abs(fract(plotVar) - 0.5)) / screenSpaceGradient
  );
}`))}),inputs:["view","code"],outputs:["logContoursGLSL"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-3654"),expanded:[],variables:[]},{id:3654,body:(t,e,n,a,o,i,u,r)=>{const m=Array.from({length:401},(h,x)=>x/400*60),f=h=>.002*(20*h+.5*h*h),l=h=>.002*(20+h),p=m.map(h=>f(h)*t%1),c=m.map(h=>(.5-Math.abs(f(h)*t%1-.5))/l(h)/t),y=c.map(h=>Math.min(e,h)),v=m.map(h=>n(1+.5*Math.max(1e-4,a)/e,1-.5*Math.max(1e-4,a)/e,(.5-Math.abs(f(h)*t%1-.5))/l(h)/(e*t))),b=o.plot({width:i.width,height:120,x:{domain:[0,60]},y:{domain:[-.1,1.1]},marginTop:10,marginBottom:40,marks:[o.ruleY([.5],{stroke:"black"}),o.line(m.map((h,x)=>({x:h,y:p[x]})),{x:"x",y:"y",stroke:"#27c"})]}),S=o.plot({width:i.width,height:120,x:{domain:[0,60]},y:{domain:[0,5]},marginTop:10,marginBottom:30,marks:[o.line(m.map((h,x)=>({x:h,y:c[x]})),{x:"x",y:"y",stroke:"#27c"}),o.ruleY([e],{stroke:"black"}),o.ruleY([e-.5*a,e+.5*a],{stroke:"#bbb",strokeDasharray:"4,4"})]}),L=o.plot({width:i.width,height:120,x:{domain:[0,60]},y:{domain:[-.1,1.1]},marginTop:20,marginBottom:30,marks:[o.areaY(m.map((h,x)=>({x:h,y:v[x]})),{x:"x",y:"y",fill:"#27c",fillOpacity:.25}),o.line(m.map((h,x)=>({x:h,y:v[x]})),{x:"x",y:"y",stroke:"#27c"})]});return u(r`<figure id="contour-transformation-figure">
  ${b}
  ${S}
  ${L}
  <figcaption>The screen-space derivative transformation: (a) input function modulo 1, (b) triangle wave divided by the screen-space gradient with threshold lines, (c) the resulting antialiased contour signal.</figcaption>
</figure>`),{n:401,xmax:60,x:m,f,dFdx:l,phase:p,triangle:c,clippedTriangle:y,smooth:v,plotA:b,plotB:S,plotC:L}},inputs:["contourSpacing","lineWidth","linearstep","lineFeather","Plot","smallCanvas","display","html"],outputs:["n","xmax","x","f","dFdx","phase","triangle","clippedTriangle","smooth","plotA","plotB","plotC"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-508"),expanded:[],variables:[]},{id:508,body:(t,e)=>{const n=t(e.range([.5,10],{step:.01,value:1,label:"Contour spacing"})),a=t(e.range([.5,3],{step:.1,value:1,label:"Line width"})),o=t(e.range([0,2],{step:.1,value:1,label:"Antialiasing width"}));return{contourSpacing:n,lineWidth:a,lineFeather:o}},inputs:["view","Inputs"],outputs:["contourSpacing","lineWidth","lineFeather"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-98"),expanded:[],variables:[]},{id:98,body:(t,e,n,a)=>({regl1:t(function(){const i=e(n),u=a`
    <figure>
      ${i}
      <figcaption>Contours of the log-magnitude of a sample function computed in a WebGL fragment shader with the screen-space derivatives technique.</figcaption>
    </figure>`;return u.value=i.value,u}())}),inputs:["view","createREGLContext","smallCanvas","html"],outputs:["regl1"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-121"),expanded:[],variables:[]},{id:121,body:(t,e,n,a,o,i)=>({drawLoop1:function(){t.configureMouse.taint();const r=e.frame(()=>{t.configureView(()=>{t.configureBlit(()=>{t.configureMouse(s=>{s.dirty&&t.drawField({lineWidth:n,lineFeather:a,contourSpacing:o})})})})});i.then(()=>r.cancel())}()}),inputs:["drawCmds1","regl1","lineWidth","lineFeather","contourSpacing","invalidation"],outputs:["drawLoop1"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-358"),expanded:[],variables:[]},{id:358,body:(t,e,n,a,o,i,u,r,s,g)=>({drawCmds1:{configureBlit:t(e),configureView:n(e),configureMouse:a(e,o),drawField:e({frag:`
      #extension GL_OES_standard_derivatives : enable
      precision highp float;
      uniform float lineWidth, lineFeather, contourSpacing;
      uniform vec2 mouse;
      varying vec2 xy;

      ${i}
      ${u}
      ${r}
      ${s}
      ${g}

      void main () {
        vec2 f = complexSampleFunction(xy, mouse);

        float contours = logContours(cabs(f), contourSpacing, lineWidth, lineFeather);

        // Awhite background with black contours
        gl_FragColor = vec4(gammaCorrect(vec3(1.0 - contours)), 1);
      }`,uniforms:{contourSpacing:e.prop("contourSpacing"),lineWidth:(f,l)=>f.pixelRatio*l.lineWidth,lineFeather:(f,l)=>Math.max(1e-4,f.pixelRatio*l.lineFeather)}})}}),inputs:["createBlitCmd","regl1","createConfigureViewCmd","createAttachMouseCmd","invalidation","linearStepGLSL","glslComplex","gammaCorrectGLSL","logContoursGLSL","complexSampleFunctionGLSL"],outputs:["drawCmds1"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-3629"),expanded:[],variables:[]},{id:3629,body:(t,e)=>t`The approach is to partition the plane into regions we'll call *octaves*, where each octave draws contours at a different spacing. Within each octave, we draw ${e`D`} evenly spaced contours. When the contours in one octave get too close together, we switch to the next octave and draw ${e`D`} times fewer contours.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-3631"),expanded:[],variables:[]},{id:3631,body:(t,e)=>t`${e.block`
N_{\mathrm{octave}} = \left \lceil \log_{D}{\left( m \frac{\left|\nabla f\right|}{|f|} \right)} \right \rceil
`}`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-3633"),expanded:[],variables:[]},{id:3633,body:(t,e)=>t`where ${e`N_{\mathrm{octave}}`} is an integer indicating which octave a given region belongs to, ${e`D`} is the number of divisions per octave, and ${e`m`} is the minimum spacing, in pixels, between divisions.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-3658"),expanded:[],variables:[]},{id:3658,body:(t,e)=>t`Why ${e`|\nabla f| / |f|`} and not just ${e`|\nabla f|`}? The answer is that we want to place contours at evenly spaced values of ${e`\log|f|`}, not ${e`|f|`} itself. Logarithmic spacing places more contours near zeros and poles, which helps reveal the structure of the function. Since we're effectively plotting ${e`\log|f|`}, we need the gradient of ${e`\log|f|.`} By the [logarithmic derivative](https://en.wikipedia.org/wiki/Logarithmic_derivative),`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-3637"),expanded:[],variables:[]},{id:3637,body:(t,e)=>t`${e.block`
\left|\nabla \ln{f}\right| = \frac{|\nabla f|}{|f|}.
`}`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-3659"),expanded:[],variables:[]},{id:3659,body:(t,e)=>t`This is convenient because it means we don't have to compute the logarithm to get its gradient. We just divide the gradient of ${e`f`} by ${e`|f|`}.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-3634"),expanded:[],variables:[]},{id:3634,body:(t,e)=>t`Once we've determined the octave, we compute the contour spacing ${e`\delta`} as`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-3635"),expanded:[],variables:[]},{id:3635,body:(t,e)=>t`${e.block`
\delta = D^{N_{\mathrm{octave}}}.
`}`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});d({root:document.getElementById("cell-938"),expanded:[],variables:[]},{id:938,body:(t,e,n)=>({locallyScaledLogContoursGLSL:t(e(`float locallyScaledLogContours (float f,
                                float minSpacing,
                                float divisions,
                                float lineWidth,
                                float antialiasWidth
) {
  float screenSpaceGrad = hypot(vec2(dFdx(f), dFdy(f)))${n==="Linear"?"":" / abs(f)"};

  // Select which integer-valued octave a region falls into
  float localOctave = ceil(log2(screenSpaceGrad * minSpacing) / log2(divisions));

  // An integer power of the divisions per octave
  float contourSpacing = pow(divisions, localOctave);

  // Plot contours at each multiple of the contour spacing
  float plotVar = ${n==="Logarithmic"?"log2(abs(f))":"abs(f)"} / contourSpacing;

  // A magic width scale to make the lines uniform
  float widthScale = 2.0 * contourSpacing / screenSpaceGrad${n==="Logarithmic"?"":" * 2.0"};

  return linearstep(
    lineWidth + antialiasWidth,
    lineWidth - antialiasWidth,
    (0.5 - abs(fract(plotVar) - 0.5)) * widthScale
  );
}`))}),inputs:["view","code","scalingType2"],outputs:["locallyScaledLogContoursGLSL"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-3478"),expanded:[],variables:[]},{id:3478,body:(t,e)=>{const n=t(e.range([2,40],{step:1,value:15,label:"Minimum contour spacing, in pixels"})),a=t(e.range([2,8],{step:1,value:2,label:"Divisions per octave"})),o=t(e.radio(["Logarithmic","Linear"],{value:"Logarithmic"})),i=t(e.checkbox(["Visualize octave with color"],{value:["Visualize octave with color"]}));return{baselineSpacing:n,octaveDivisions:a,scalingType2:o,debugColor:i}},inputs:["view","Inputs"],outputs:["baselineSpacing","octaveDivisions","scalingType2","debugColor"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-927"),expanded:[],variables:[]},{id:927,body:(t,e,n,a)=>({regl2:t(function(){const i=e(n),u=a`
    <figure>
      ${i}
      <figcaption>Log-distributed contours with spacing scaled by the local relative gradient of the function.</figcaption>
    </figure>`;return u.value=i.value,u}())}),inputs:["view","createREGLContext","largeCanvas","html"],outputs:["regl2"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-932"),expanded:[],variables:[]},{id:932,body:(t,e,n,a,o,i,u)=>({drawLoop2:function(){t.configureMouse.taint();const s=e.frame(()=>{t.configureView(()=>{t.configureBlit(()=>{t.configureMouse(g=>{g.dirty&&t.drawField({lineWidth:1.5,lineFeather:1.5,contourSpacing:n,octaveDivisions:a,baselineSpacing:o,debugColor:i.includes("Visualize octave with color")})})})})});u.then(()=>s.cancel())}()}),inputs:["drawCmds2","regl2","contourSpacing","octaveDivisions","baselineSpacing","debugColor","invalidation"],outputs:["drawLoop2"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-929"),expanded:[],variables:[]},{id:929,body:(t,e,n,a,o,i,u,r,s,g,m)=>({drawCmds2:{configureBlit:t(e),configureView:n(e),configureMouse:a(e,o),drawField:e({frag:`
      #extension GL_OES_standard_derivatives : enable
      precision highp float;
      uniform float lineWidth, lineFeather, octaveDivisions, baselineSpacing;
      uniform bool debugColor;
      uniform vec2 mouse;
      varying vec2 xy;

      ${i}
      ${u}
      ${r}
      ${s}
      ${g}

      vec3 randomColor (float x) {
        return 0.5 + 0.5 * vec3(cos(x), cos(x - PI * 2.0 / 3.0), cos(x - PI * 4.0 / 3.0));
      }

      vec3 octaveColor (float f, float minSpacing, float divisions) {
        float screenSpaceGrad = hypot(vec2(dFdx(f), dFdy(f)))${m==="Linear"?"":" / abs(f)"};
        float localOctave = ceil(log2(screenSpaceGrad * minSpacing) / log2(divisions));
        return randomColor(localOctave);
      }

      void main () {
        vec2 f = complexSampleFunction(xy, mouse);
        vec3 color = mix(vec3(1), octaveColor(cabs(f), baselineSpacing, octaveDivisions), debugColor ? 0.3 : 0.0);

        gl_FragColor = vec4(gammaCorrect(color * vec3(
          1.0 - locallyScaledLogContours(
            cabs(f),
            baselineSpacing,
            octaveDivisions,
            lineWidth,
            lineFeather)
          )), 1);
      }`,uniforms:{debugColor:(l,p)=>!!p.debugColor,octaveDivisions:e.prop("octaveDivisions"),baselineSpacing:(l,p)=>p.baselineSpacing*l.pixelRatio,lineWidth:(l,p)=>l.pixelRatio*p.lineWidth,lineFeather:(l,p)=>Math.max(1e-4,l.pixelRatio*p.lineFeather)}})}}),inputs:["createBlitCmd","regl2","createConfigureViewCmd","createAttachMouseCmd","invalidation","linearStepGLSL","glslComplex","gammaCorrectGLSL","complexSampleFunctionGLSL","locallyScaledLogContoursGLSL","scalingType2"],outputs:["drawCmds2"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-1035"),expanded:[],variables:[]},{id:1035,body:function(e){return e`## Blending over octaves

We've made progress, except we have sharp transitions between successive contour spacings. The final major trick is to blend these contours over a number of octaves, starting at the finest spacing relative to pixels and increasing the size until contours would cover the entire image, at which point further octaves have no use.

This approach is not unlike a [Shepard tone](https://en.wikipedia.org/wiki/Shepard_tone), which appears to increase infinitely, fading out tones as they leave the upper end of the auditory range and replacing them with new tones at the bottom end of the auditory range. Similarly, we fade out contours as they leave the desirable range, becoming either too densely spaced or too spread out.`},inputs:["md"],outputs:void 0,output:"blending",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});d({root:document.getElementById("cell-1049"),expanded:[],variables:[]},{id:1049,body:(t,e,n,a)=>({blendedOctavesGLSL:t(e(`float blendedContours (float f, float minSpacing, float width, float antialiasing) {
  // Compile-time constants
  const int octaves = ${n};
  const float n = ${n.toFixed(1)};

  float screenSpaceGrad = hypot(vec2(dFdx(f), dFdy(f)))${a==="Linear"?"":" / abs(f)"};${a==="Linear"?"antialiasing /= 2.0;":""}

  float localOctave = log2(screenSpaceGrad * minSpacing) / log2(octaveDivisions);
  float contourSpacing = pow(octaveDivisions, ceil(localOctave));

  float plotVar = ${a==="Logarithmic"?"log2(abs(f))":"abs(f)"} / contourSpacing;
  float widthScale = contourSpacing / screenSpaceGrad;

  float contourSum = 0.0;
  for(int i = 0; i < octaves; i++) {
    // A weight which fades in the smallest octave and fades out the largest
    float t = float(i + 1) - fract(localOctave);
    float weight = smoothstep(0.0, 1.0, t) * smoothstep(n, n - 1.0, t);

    contourSum += weight * linearstep(
      0.5 * (width + antialiasing),
      0.5 * (width - antialiasing),
      (0.5 - abs(fract(plotVar) - 0.5)) * widthScale
    );

    // Rescale for the next octave
    widthScale *= octaveDivisions;
    plotVar /= octaveDivisions;
  }

  return contourSum / n;
}`))}),inputs:["view","code","octaveCount","scalingType3"],outputs:["blendedOctavesGLSL"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-1164"),expanded:[],variables:[]},{id:1164,body:(t,e)=>{const n=t(e.range([1,5],{step:.1,value:2,label:"Minimum contour spacing, in pixels"})),a=t(e.range([2,8],{step:1,value:6,label:"Divisons per octave"})),o=t(e.range([1,8],{step:1,value:4,label:"Octaves"})),i=t(e.radio(["Logarithmic","Linear"],{value:"Logarithmic"}));return{baselineSpacing2:n,octaveDivisions2:a,octaveCount:o,scalingType3:i}},inputs:["view","Inputs"],outputs:["baselineSpacing2","octaveDivisions2","octaveCount","scalingType3"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-1038"),expanded:[],variables:[]},{id:1038,body:(t,e,n,a)=>({regl3:t(function(){const i=e(n),u=a`
    <figure>
      ${i}
      <figcaption>Locally-scaled contours, blended across multiple octaves.</figcaption>
    </figure>`;return u.value=i.value,u}())}),inputs:["view","createREGLContext","largeCanvas","html"],outputs:["regl3"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-1043"),expanded:[],variables:[]},{id:1043,body:(t,e,n,a,o,i)=>({drawLoop3:function(){t.configureMouse.taint();const r=e.frame(()=>{t.configureView(()=>{t.configureBlit(()=>{t.configureMouse(s=>{s.dirty&&t.drawField({lineWidth:1.5,lineFeather:1.5,contourSpacing:n,octaveDivisions:a,baselineSpacing:o})})})})});i.then(()=>r.cancel())}()}),inputs:["drawCmds3","regl3","contourSpacing","octaveDivisions2","baselineSpacing2","invalidation"],outputs:["drawLoop3"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-1046"),expanded:[],variables:[]},{id:1046,body:(t,e,n,a,o,i,u,r,s,g)=>({drawCmds3:{configureBlit:t(e),configureView:n(e),configureMouse:a(e,o),drawField:e({frag:`
      #extension GL_OES_standard_derivatives : enable
      precision highp float;
      uniform float lineWidth, lineFeather, octaveDivisions, baselineSpacing;
      uniform vec2 mouse;
      varying vec2 xy;

      ${i}
      ${u}
      ${r}
      ${s}
      ${g}

      void main () {
        vec2 f = complexSampleFunction(xy, mouse);

        gl_FragColor = vec4(
          gammaCorrect(
            vec3(1.0 - 1.5 * blendedContours(hypot(f), baselineSpacing, lineWidth, lineFeather))
          ), 1);
      }`,uniforms:{octaveDivisions:e.prop("octaveDivisions"),baselineSpacing:(f,l)=>l.baselineSpacing*f.pixelRatio,lineWidth:(f,l)=>f.pixelRatio*l.lineWidth,lineFeather:(f,l)=>Math.max(1e-4,f.pixelRatio*l.lineFeather)}})}}),inputs:["createBlitCmd","regl3","createConfigureViewCmd","createAttachMouseCmd","invalidation","linearStepGLSL","glslComplex","gammaCorrectGLSL","complexSampleFunctionGLSL","blendedOctavesGLSL"],outputs:["drawCmds3"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-2634"),expanded:[],variables:[]},{id:2634,body:function(t){return t`<div style="padding-top: 5em"></div>`},inputs:["html"],outputs:void 0,output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});d({root:document.getElementById("cell-1208"),expanded:[],variables:[]},{id:1208,body:function(e){return e`## Shaded contouring

We've so far spent all of our time on line contours. Next, we repurpose the exact same concepts for shaded regions.

Since shading fills entire regions, it may at first appear that our screen-space trick for relating function values to pixel widths has no place here. However, if we smoothly shade regions from a value of zero to one with a sharp jump back to zero, we'll encounter aliasing at the threshold.

To antialias, we use the above screen-space derivative trick to produce a function that goes smoothly from zero to one then back to zero *over a given number of pixels*.`},inputs:["md"],outputs:void 0,output:"shading",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});d({root:document.getElementById("cell-3652"),expanded:[],variables:[]},{id:3652,body:(t,e,n,a,o)=>{const u=[{x:0,y:0},{x:30,y:1}],r=[{x:0,y:30/t},{x:30,y:0}],s=[{x:0,y:0},{x:30-t+t/30,y:1-t/30},{x:30,y:0}];return e(n`<figure id="antialiasing-ramp-figure">
  ${a.plot({width:o.width,height:300,y:{domain:[0,1.5]},marginTop:20,marginRight:20,marginBottom:40,marginLeft:40,marks:[a.areaY(s,{x:"x",y:"y",fill:"#27c",fillOpacity:.25}),a.line(u,{x:"x",y:"y",stroke:"#27c"}),a.dot(u,{x:"x",y:"y",fill:"#27c",r:3}),a.line(r,{x:"x",y:"y",stroke:"#27c",strokeDasharray:"4,4"})]})}
  <figcaption>The antialiasing ramp: the solid line shows the shading function going from 0 to 1, with a corner cut off (shaded region) to provide smooth antialiasing at the discontinuity.</figcaption>
</figure>`),{xmax:30,baseLine:u,dashedLine:r,areaShape:s}},inputs:["antialiasing4","display","html","Plot","smallCanvas"],outputs:["xmax","baseLine","dashedLine","areaShape"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-2386"),expanded:[],variables:[]},{id:2386,body:function(e){return e.range([0,2],{step:.1,value:1,label:"Antialiasing width"})},inputs:["Inputs"],outputs:void 0,output:"viewof$antialiasing4",assets:void 0,autodisplay:!0,autoview:!0,automutable:!1});d({root:document.getElementById("cell-2502"),expanded:[],variables:[]},{id:2502,body:function(t){return t`Of course we may not want our coloring to go *linearly* from zero to one. In the style of [unsharp masking](https://en.wikipedia.org/wiki/Unsharp_masking), we can distribute the slope toward the edges of the ramp to increase the perceived contrast. The plot below shows a simple single-parameter contrast ramp layered over multiple octaves.`},inputs:["md"],outputs:void 0,output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});d({root:document.getElementById("cell-2508"),expanded:[],variables:[]},{id:2508,body:(t,e)=>({contrastFunctionGLSL:t(e(`float contrastFunction(float x, float power) {
  x = 2.0 * x - 1.0;
  return 0.5 + 0.5 * pow(abs(x), power) * sign(x);
}`))}),inputs:["view","code"],outputs:["contrastFunctionGLSL"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-3649"),expanded:[],variables:[]},{id:3649,body:(t,e,n,a,o,i,u)=>{const g=Array.from({length:801},(p,c)=>c/800);function m(p,c){return p=2*p-1,.5+.5*Math.pow(Math.abs(p),c)*Math.sign(p)}function f(p){let c=1,y=0;for(let v=0;v<t;v++)y+=m(p*c%1,e),c*=n;return y/t}const l=g.map(p=>({x:p,y:f(p)}));return a(o`<figure id="contrast-ramp-figure">
  ${i.plot({width:u.width,height:300,y:{domain:[0,1]},marginTop:20,marginRight:20,marginBottom:40,marginLeft:40,marks:[i.areaY(l,{x:"x",y:"y",fill:"#27c",fillOpacity:.25}),i.line(l,{x:"x",y:"y",stroke:"#27c",strokeWidth:1})]})}
  <figcaption>The contrast ramp function blended across multiple octaves, creating a Shepard-tone-like pattern that maintains consistent visual density.</figcaption>
</figure>`),{n:801,xmax:1,x:g,ramp:m,f,data:l}},inputs:["octaveCount4","rampPower4","octaveDivisions4","display","html","Plot","smallCanvas"],outputs:["n","xmax","x","ramp","f","data"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-2498"),expanded:[],variables:[]},{id:2498,body:(t,e)=>{const n=t(e.range([1,4],{step:.01,value:2,label:"Contrast ramp power"})),a=t(e.range([1,8],{step:1,value:4,label:"Octaves"})),o=t(e.range([2,8],{step:1,value:5,label:"Divisons per octave"})),i=t(e.range([1,5],{step:.1,value:1,label:"Minimum contour spacing, in pixels"})),u=t(e.range([0,2],{step:.1,value:1,label:"Antialiasing width"}));return{rampPower4:n,octaveCount4:a,octaveDivisions4:o,contourSpacing4:i,antialiasing5:u}},inputs:["shadedCtrl","Inputs"],outputs:["rampPower4","octaveCount4","octaveDivisions4","contourSpacing4","antialiasing5"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-2499"),expanded:[],variables:[]},{id:2499,body:(t,e,n,a,o,i,u)=>{t.rampPower=e,t.octaveCount=n,t.octaveDivisions=a,t.contourSpacing=o,t.antialiasing=i,u.dirty=!0},inputs:["shadedParams","rampPower4","octaveCount4","octaveDivisions4","contourSpacing4","antialiasing5","shadedRegl"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-2329"),expanded:[],variables:[]},{id:2329,body:(t,e,n)=>{const a=t`<div class="plot-controls"></div>`;function o(u){return a.appendChild(u),e.input(u)}const i={rampPower:2,octaveCount:4,octaveDivisions:5,contourSpacing:1,antialiasing:1};return n(a),{shadedControlsContainer:a,shadedCtrl:o,shadedParams:i}},inputs:["html","Generators","display"],outputs:["shadedControlsContainer","shadedCtrl","shadedParams"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-2330"),expanded:[],variables:[]},{id:2330,body:(t,e,n,a)=>{const o=t({layers:[{id:"regl",element:e(n,{extensions:["OES_standard_derivatives"],attributes:{depthStencil:!1,preserveDrawingBuffer:!0}})},{id:"svg",element:({current:u,width:r,height:s})=>(u?a.select(u):a.create("svg")).attr("width",r).attr("height",s).node()}]});o.elements.regl.id="shaded-contours-canvas";const i=o.elements.regl.value;return i.dirty=!0,{shadedStack:o,shadedRegl:i}},inputs:["createElementStack","reglElement","createREGL","d3"],outputs:["shadedStack","shadedRegl"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-2331"),expanded:[],variables:[]},{id:2331,body:(t,e,n,a)=>({shadedAxes:t({d3:e,element:n.elements.svg,xScale:e.scaleLinear().domain([-2,2]).range([0,100]),yScale:e.scaleLinear().domain([-2,2]).range([100,0]),aspectRatio:1,scaleExtent:[.001,1e3],onChange:()=>{a.dirty=!0}})}),inputs:["createZoomableAxes","d3","shadedStack","shadedRegl"],outputs:["shadedAxes"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-3343"),expanded:[],variables:[]},{id:3343,body:(t,e,n,a,o,i,u,r)=>{const s=t`<figure>
  ${e.element}
  <figcaption>The line contouring code, repurposed for shading. Use mouse wheel to zoom, drag to pan. Hover to adjust the solution.</figcaption>
</figure>`;return n(a(s,{width:o.width,height:o.height,toggleOffset:[-6,-23],controls:".plot-controls:last-of-type",onResize(g,m,f){e.resize(m,f),i.updateScales(u.scaleLinear().domain(i.xDomain).range([0,m]),u.scaleLinear().domain(i.yDomain).range([f,0])),r.dirty=!0}})),{shadedFigure:s}},inputs:["html","shadedStack","display","expandable","largeCanvas","shadedAxes","d3","shadedRegl"],outputs:["shadedFigure"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-2325"),expanded:[],variables:[]},{id:2325,body:(t,e,n)=>({shadedOctavesGLSL:t(e(`float shadedContours (float f, float minSpacing, float antialiasWidth, float rampPower) {
  // Compile-time constants
  const int octaves = ${n};
  const float fOctaves = ${n.toFixed(1)};

  float screenSpaceGrad = hypot(vec2(dFdx(f), dFdy(f))) / abs(f);

  float localOctave = log2(screenSpaceGrad * minSpacing) / log2(octaveDivisions);
  float contourSpacing = pow(octaveDivisions, ceil(localOctave));

  float plotVar = log2(abs(f)) / contourSpacing;
  float widthScale = contourSpacing / screenSpaceGrad;

  float contourSum = 0.0;
  for(int i = 0; i < octaves; i++) {
    // A weight which fades in the smallest octave and fades out the largest
    float t = float(i + 1) - fract(localOctave);
    float weight = smoothstep(0.0, 1.0, t) * smoothstep(fOctaves, fOctaves - 1.0, t);

    // Shading for this octave is the contrast ramp with a chunk cut out of the corner for antialiasing
    float y = fract(plotVar);
    contourSum += weight * min(
      contrastFunction(y, rampPower),
      (1.0 - y) * 0.5 * widthScale / antialiasWidth
    );

    // Adjust scales for the next octave
    widthScale *= octaveDivisions;
    plotVar /= octaveDivisions;
  }

  return contourSum / fOctaves;
}`))}),inputs:["view","code","octaveCount4"],outputs:["shadedOctavesGLSL"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-2332"),expanded:[],variables:[]},{id:2332,body:(t,e,n)=>({shadedDrawLoop:function(){const o=t.frame(()=>{try{if(!t.dirty)return;e(),t.dirty=!1}catch{o?.cancel()}});n.then(()=>o?.cancel())}()}),inputs:["shadedRegl","drawShadedField","invalidation"],outputs:["shadedDrawLoop"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-2334"),expanded:[],variables:[]},{id:2334,body:(t,e,n,a,o,i,u,r,s,g,m)=>{const f={xy:new Float32Array([0,0]),dirty:!0};(function(){const c=t.elements.svg;function y(v){const b=c.getBoundingClientRect(),S=v.clientX-b.left,L=v.clientY-b.top;f.xy[0]=e.xScale.invert(S),f.xy[1]=e.yScale.invert(L),f.dirty=!0,n.dirty=!0}c.addEventListener("mousemove",y),a.then(()=>c.removeEventListener("mousemove",y))})();const l=n({vert:`
    precision highp float;
    attribute vec2 uv;
    varying vec2 xy;
    uniform mat4 viewInverse;
    void main () {
      xy = (viewInverse * vec4(uv, 0, 1)).xy;
      gl_Position = vec4(uv, 0, 1);
    }`,frag:`
    #extension GL_OES_standard_derivatives : enable
    precision highp float;
    uniform float antialiasWidth, octaveDivisions, baselineSpacing, rampPower;
    uniform vec2 mouse;
    varying vec2 xy;

    ${o}
    ${i}
    ${u}
    ${r}
    ${s}

    void main () {
      vec2 f = complexSampleFunction(xy, mouse);

      gl_FragColor = vec4(vec3(
        gammaCorrect(vec3(1.0 - shadedContours(hypot(f), baselineSpacing, antialiasWidth, rampPower)))
      ), 1);
    }`,uniforms:{viewInverse:()=>e.viewInverse,mouse:()=>f.xy,octaveDivisions:()=>g.octaveDivisions,rampPower:()=>g.rampPower,baselineSpacing:p=>g.contourSpacing*p.pixelRatio,antialiasWidth:()=>Math.max(1e-4,g.antialiasing)},attributes:{uv:[-4,-4,4,-4,0,4]},depth:{enable:!1},scissor:{enable:!0,box:m(e)},viewport:m(e),count:3});return{shadedMouse:f,drawShadedField:l}},inputs:["shadedStack","shadedAxes","shadedRegl","invalidation","glslComplex","gammaCorrectGLSL","contrastFunctionGLSL","complexSampleFunctionGLSL","shadedOctavesGLSL","shadedParams","reglAxesViewport"],outputs:["shadedMouse","drawShadedField"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-2649"),expanded:[],variables:[]},{id:2649,body:function(t){return t`<div style="padding-top: 5em"></div>`},inputs:["html"],outputs:void 0,output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});d({root:document.getElementById("cell-432"),expanded:[],variables:[]},{id:432,body:(t,e)=>{function n(a){function o(r,s,g){const m=t.canvas(Math.floor(r*g),Math.floor(s*g));return m.style.width=`${r}px`,m.style.height=`${s}px`,m}const i=o(a.width,a.height,a.pixelRatio),u=e({pixelRatio:a.pixelRatio,canvas:i,extensions:["OES_standard_derivatives"]});return i.value=u,i}return{createREGLContext:n}},inputs:["DOM","createREGL"],outputs:["createREGLContext"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-410"),expanded:[],variables:[]},{id:410,body:()=>({createBlitCmd:function(e){return e({vert:`
      precision highp float;
      attribute vec2 uv;
      varying vec2 xy;
      uniform mat3 view;
      void main () {
        xy = (view * vec3(uv, 1)).xy;
        gl_Position = vec4(uv, 0, 1);
      }`,attributes:{uv:[-4,-4,4,-4,0,4]},count:3,depth:{enable:!1}})}}),inputs:[],outputs:["createBlitCmd"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-340"),expanded:[],variables:[]},{id:340,body:(t,e)=>{function n(a){const o=t();return a({uniforms:{view:a.context("view")},context:{view:(i,u)=>{var r=i.framebufferWidth/i.framebufferHeight,s=!u||u.scale===void 0?2:u.scale;return e(o,-1/(s*r),1/(s*r),-1/s,1/s)}}})}return{createConfigureViewCmd:n}},inputs:["mat3create","mat3ortho"],outputs:["createConfigureViewCmd"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-381"),expanded:[],variables:[]},{id:381,body:t=>({createAttachMouseCmd:function(n,a){const o=n._gl.canvas;let i=!0;const u=[o.clientWidth/2,o.clientHeight/2],r=[0,0,1],s=new Float32Array([0,0]);function g(l){u[0]=l.offsetX,u[1]=l.offsetY,i=!0}const m=n({context:{dirty:()=>i,mouse:l=>{const p=2*l.pixelRatio;return r[0]=-1+p*(u[0]/l.viewportWidth),r[1]=1-p*(u[1]/l.viewportHeight),r[2]=1,t(r,l.view,r),s[0]=r[0],s[1]=r[1],s}},uniforms:{mouse:n.context("mouse")}});o.addEventListener("mousemove",g),a.then(()=>{o.removeEventListener("mousemove",g)});const f=function(p){m(p),i=!1};return f.taint=function(){i=!0},f.reset=function(){u[0]=o.clientWidth/2,u[1]=o.clientHeight/2},f}}),inputs:["mat3multiply"],outputs:["createAttachMouseCmd"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-255"),expanded:[],variables:[]},{id:255,body:t=>{const e={width:Math.min(640,t),height:Math.floor(Math.min(640,t)*.6),pixelRatio:devicePixelRatio},n={width:t,height:Math.max(300,Math.floor(t*.6)),pixelRatio:devicePixelRatio};return{smallCanvas:e,largeCanvas:n}},inputs:["width"],outputs:["smallCanvas","largeCanvas"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-2728"),expanded:[],variables:[]},{id:2728,body:()=>{function t(a,o,i){return Math.max(0,Math.min(1,(i-a)/(o-a)))}return{linearstep:t,linearStepGLSL:`
float linearstep(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}`,gammaCorrectGLSL:`
vec3 gammaCorrect(vec3 color) {
  // Quick approximate gamma correction
  return pow(color, vec3(0.454));
}`}},inputs:[],outputs:["linearstep","linearStepGLSL","gammaCorrectGLSL"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-92"),expanded:[],variables:[]},{id:92,body:async(t,e)=>{const[{default:n},{rangeSlider:a},{glslComplex:o},{mat3invert:i,mat3multiply:u,mat3create:r,mat3ortho:s},{createElementStack:g},{reglElement:m,reglAxesViewport:f},{createZoomableAxes:l},{expandable:p}]=await Promise.all([w(()=>import("https://cdn.jsdelivr.net/npm/regl@2.1.1/+esm"),[]).then(c=>{if(!("default"in c))throw new SyntaxError("export 'default' not found");return c}),w(()=>import("https://api.observablehq.com/@mootari/range-slider.js?v=4"),[]).then(c=>{const y={},v=t.module(c.default),b=t.module();if(!v.defines("rangeSlider"))throw new SyntaxError("export 'rangeSlider' not found");return b.variable(y.rangeSlider=e()).import("rangeSlider",v),y}),w(()=>import("https://api.observablehq.com/@rreusser/glsl-complex.js?v=4"),[]).then(c=>{const y={},v=t.module(c.default),b=t.module();if(!v.defines("glslComplex"))throw new SyntaxError("export 'glslComplex' not found");return b.variable(y.glslComplex=e()).import("glslComplex",v),y}),w(()=>import("https://api.observablehq.com/@rreusser/gl-mat3.js?v=4"),[]).then(c=>{const y={},v=t.module(c.default),b=t.module();if(!v.defines("mat3invert"))throw new SyntaxError("export 'mat3invert' not found");if(b.variable(y.mat3invert=e()).import("mat3invert",v),!v.defines("mat3multiply"))throw new SyntaxError("export 'mat3multiply' not found");if(b.variable(y.mat3multiply=e()).import("mat3multiply",v),!v.defines("mat3create"))throw new SyntaxError("export 'mat3create' not found");if(b.variable(y.mat3create=e()).import("mat3create",v),!v.defines("mat3ortho"))throw new SyntaxError("export 'mat3ortho' not found");return b.variable(y.mat3ortho=e()).import("mat3ortho",v),y}),w(()=>import("./element-stack-BU40TvN2.js"),[]).then(c=>{if(!("createElementStack"in c))throw new SyntaxError("export 'createElementStack' not found");return c}),w(()=>import("./regl-canvas-4j8SAjSv.js"),[]).then(c=>{if(!("reglElement"in c))throw new SyntaxError("export 'reglElement' not found");if(!("reglAxesViewport"in c))throw new SyntaxError("export 'reglAxesViewport' not found");return c}),w(()=>import("./zoomable-axes-BfGyq1bg.js"),[]).then(c=>{if(!("createZoomableAxes"in c))throw new SyntaxError("export 'createZoomableAxes' not found");return c}),w(()=>import("./expandable-GAgQDSaE.js"),[]).then(c=>{if(!("expandable"in c))throw new SyntaxError("export 'expandable' not found");return c})]);return{createREGL:n,rangeSlider:a,glslComplex:o,mat3invert:i,mat3multiply:u,mat3create:r,mat3ortho:s,createElementStack:g,reglElement:m,reglAxesViewport:f,createZoomableAxes:l,expandable:p}},inputs:["__ojs_runtime","__ojs_observer"],outputs:["createREGL","rangeSlider","glslComplex","mat3invert","mat3multiply","mat3create","mat3ortho","createElementStack","reglElement","reglAxesViewport","createZoomableAxes","expandable"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});d({root:document.getElementById("cell-3593"),expanded:[],variables:[]},{id:3593,body:t=>{function e(n,{language:a="glsl"}={}){const o=t`\`\`\`${a}\n${n}\n\`\`\``;return o.value=n,o.style.fontSize="0.9em",o}return{code:e}},inputs:["md"],outputs:["code"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});
