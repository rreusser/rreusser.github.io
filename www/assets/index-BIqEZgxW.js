import{d as u,_ as G}from"./index-ByB2dbry.js";u({root:document.getElementById("cell-23"),expanded:[],variables:[]},{id:23,body:(a,t)=>a`The [scalar wave equation](https://en.wikipedia.org/wiki/Wave_equation) in general is given by

${t.block`\frac{\partial^2 u}{\partial t^2} = c^2 \nabla^2 u.`}`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-24"),expanded:[],variables:[]},{id:24,body:(a,t)=>a`For one dimension, we have

${t.block`\frac{\partial^2 u}{\partial t^2} = c^2 \frac{\partial^2 u}{\partial x^2}.`}`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-2"),expanded:[],variables:[]},{id:2,body:(a,t)=>a`We could apply PML to this equation, but it works better to start out with what’s probably a less familiar but strictly equivalent form containing only first-order derivatives,

${t.block`\begin{aligned}
\frac{\partial u}{\partial t} &= c \frac{\partial v}{\partial x} \\[10pt]
\frac{\partial v}{\partial t} &= c \frac{\partial u}{\partial x}.
\end{aligned}`}

Here, ${t`u`} is the state variable (e.g. pressure) while ${t`v`} functions like a velocity.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-26"),expanded:[],variables:[]},{id:26,body:(a,t)=>a`We begin by transforming to the Fourier time domain, replacing ${t`\frac{\partial}{\partial t}`} with ${t`-i\omega,`}

${t.block`\begin{aligned}
-i\omega u &= c \frac{\partial v}{\partial x} \\[10pt]
-i\omega v &= c \frac{\partial u}{\partial x}.
\end{aligned}`}`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-27"),expanded:[],variables:[]},{id:27,body:(a,t)=>a`The PML technique replaces spatial derivatives with a complex coordinate mapping

${t.block`\frac{\partial}{\partial x} \rightarrow \frac{1}{1 + i\frac{\sigma}{\omega}} \frac{\partial}{\partial x}`}`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-28"),expanded:[],variables:[]},{id:28,body:(a,t)=>a`where ${t`\sigma(x) \geq 0`} is the absorption strength. This stretching causes waves to decay exponentially in regions where ${t`\sigma > 0`}. Notice that for ${t`\sigma = 0`} (no absorption), this reduces to ${t`\frac{\partial}{\partial x}`}.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-29"),expanded:[],variables:[]},{id:29,body:(a,t)=>a`Applying this mapping gives

${t.block`\begin{aligned}
-i\omega u &= c \frac{1}{1 + i\frac{\sigma}{\omega}} \frac{\partial v}{\partial x} \\[10pt]
-i\omega v &= c \frac{1}{1 + i\frac{\sigma}{\omega}} \frac{\partial u}{\partial x}
\end{aligned}`}
`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-30"),expanded:[],variables:[]},{id:30,body:(a,t)=>a`Multiplying both sides by ${t`1 + i\frac{\sigma}{\omega}`} gives

${t.block`\begin{aligned}
-i\omega u - \sigma u &= c \frac{\partial v}{\partial x} \\[10pt]
-i\omega v - \sigma v &= c \frac{\partial u}{\partial x}.
\end{aligned}`}
`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-31"),expanded:[],variables:[]},{id:31,body:(a,t)=>a`Transforming back to the time domain gives the final 1D PML equations

${t.block`\begin{aligned}
\frac{\partial u}{\partial t} &= c \frac{\partial v}{\partial x} - \sigma u \\[10pt]
\frac{\partial v}{\partial t} &= c \frac{\partial u}{\partial x} - \sigma v.
\end{aligned}`}
`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-3"),expanded:[],variables:[]},{id:3,body:(a,t)=>a`In the interior where ${t`\sigma = 0`}, these reduce to the original wave equation. In the PML regions, ${t`\sigma > 0`} causes exponential absorption.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-4"),expanded:[],variables:[]},{id:4,body:(a,t)=>a`The plot below shows a 1D wave propagating with PML absorbing boundaries on both ends. The shaded regions indicate where ${t`\sigma > 0`}. Notice how waves exit the domain smoothly without reflecting.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-5"),expanded:[],variables:[]},{id:5,body:()=>({params_1d:{pmlWidth:6,pmlStrength:2,frequency:.1}}),inputs:[],outputs:["params_1d"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});u({root:document.getElementById("cell-6"),expanded:[],variables:[]},{id:6,body:(a,t)=>{const o=a(t.range([1,40],{label:"PML width (grid points)",step:1,value:6})),P=a(t.range([.1,5],{label:"PML strength",step:.1,value:2})),I=a(t.range([.025,.2],{label:"Oscillator frequency",step:.005,value:.1}));return{pmlWidth1d:o,pmlStrength1d:P,frequency1d:I}},inputs:["view","Inputs"],outputs:["pmlWidth1d","pmlStrength1d","frequency1d"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});u({root:document.getElementById("cell-7"),expanded:[],variables:[]},{id:7,body:(a,t,o,P)=>{a.pmlWidth=t,a.pmlStrength=o,a.frequency=P},inputs:["params_1d","pmlWidth1d","pmlStrength1d","frequency1d"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});u({root:document.getElementById("cell-8"),expanded:[],variables:[]},{id:8,body:async(a,t,o,P,I)=>{const T=await G(()=>import("https://cdn.jsdelivr.net/npm/@observablehq/plot/+esm"),[]),e=200,S=1,A=1,B=1,g=.1*B/A,h=4,F=10,s=new Float64Array(e),b=new Float64Array(e);let y=0;function C(r){const n=r,x=e-1-r;let d=0;return n<a.pmlWidth&&(d=Math.max(d,Math.pow((a.pmlWidth-n)/a.pmlWidth,S)*a.pmlStrength)),x<a.pmlWidth&&(d=Math.max(d,Math.pow((a.pmlWidth-x)/a.pmlWidth,S)*a.pmlStrength)),d}function p(r){return C(r)}function N(r){return C(r+.5)}function l(r,n){const d=Math.exp(-Math.pow(Math.abs((n%300-150)/40),4)),c=5,R=A*Math.PI*a.frequency,m=.1/a.frequency;let O=0;for(let q=0;q<c;q++){const w=(q-c*.5)/c*20,i=e/2+w,_=Math.abs(r-i),$=Math.exp(-Math.pow(_/3,2)),H=Math.sin(R*n/(q+1));O+=H*$*h*m*d}return O}function E(r,n,x){const d=new Float64Array(e);for(let m=1;m<e-1;m++){const O=(n[m]-n[m-1])/B;d[m]=A*O-p(m)*r[m]}const c=(n[1]-n[0])/B;d[0]=A*c-p(0)*r[0];const R=(n[e-2]-n[e-3])/B;return d[e-1]=A*R-p(e-1)*r[e-1],d}function v(r,n,x){const d=new Float64Array(e);for(let c=0;c<e-1;c++){const R=(r[c+1]-r[c])/B,m=l(c+.5,x);d[c]=A*R-N(c)*n[c]+m}return d}function k(){const r=new Float64Array(e),n=new Float64Array(e),x=E(s,b),d=v(s,b,y);for(let i=0;i<e;i++)r[i]=s[i]+.5*g*x[i],n[i]=b[i]+.5*g*d[i];const c=E(r,n),R=v(r,n,y+.5*g);for(let i=0;i<e;i++)r[i]=s[i]+.5*g*c[i],n[i]=b[i]+.5*g*R[i];const m=E(r,n),O=v(r,n,y+.5*g);for(let i=0;i<e;i++)r[i]=s[i]+g*m[i],n[i]=b[i]+g*O[i];const q=E(r,n),w=v(r,n,y+g);for(let i=1;i<e-1;i++)s[i]+=g/6*(x[i]+2*c[i]+2*m[i]+q[i]),b[i]+=g/6*(d[i]+2*R[i]+2*O[i]+w[i]);y+=g}const M=t`<div></div>`;let U=0,f,L=!1;function X(){if(L){for(let r=0;r<5;r++)k();if(U++,U%2===0){const r=Array.from({length:e},(d,c)=>({x:c,u:s[c],sigma:p(c)})),n=50,x=T.plot({width:640,height:300,marginLeft:50,x:{label:"Position",domain:[0,e]},y:{label:"u(x,t)",domain:[-n,n]},marks:[T.ruleX(r,{x:"x",y1:-n,y2:n,stroke:"#DDA0DD",strokeWidth:3,strokeOpacity:d=>d.sigma>0?.3:0}),T.dot(r,{x:"x",y:"u",fill:"steelblue",r:2})]});M.replaceChildren(x)}f=requestAnimationFrame(X)}}const D=new o(r=>{r.forEach(n=>{L=n.isIntersecting,L?f||X():f&&(cancelAnimationFrame(f),f=null)})});return D.observe(M),P.then(()=>{f&&cancelAnimationFrame(f),D.disconnect()}),I(M),{Plot:T,N:e,PML_EXPONENT:S,C:A,DX:B,DT:g,OSCILLATOR_STRENGTH:h,OSCILLATOR_WAVELENGTH:F,u:s,v:b,t:y,sigma_at_position:C,sigma:p,sigma_v:N,forcing:l,dudt:E,dvdt:v,step:k,container:M,frameCount:U,animationId:f,isVisible:L,animate:X,observer:D}},inputs:["params_1d","html","IntersectionObserver","invalidation","display"],outputs:["Plot","N","PML_EXPONENT","C","DX","DT","OSCILLATOR_STRENGTH","OSCILLATOR_WAVELENGTH","u","v","t","sigma_at_position","sigma","sigma_v","forcing","dudt","dvdt","step","container","frameCount","animationId","isVisible","animate","observer"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});u({root:document.getElementById("cell-9"),expanded:[],variables:[]},{id:9,body:(a,t)=>a`The 2D case follows the same principles but with a key difference: we need separate absorption coefficients ${t`\sigma_x`} and ${t`\sigma_y`} for each spatial direction. When we apply the complex coordinate mapping independently to both ${t`x`} and ${t`y`} derivatives, cross-terms emerge that don't appear in 1D. These cross-terms require an auxiliary field ${t`\psi`} to handle the coupling between the two spatial directions within the PML regions.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-54"),expanded:[],variables:[]},{id:54,body:(a,t)=>a`The derivation below shows how these auxiliary variables arise naturally from the Fourier domain analysis. In regions where only one direction has absorption (e.g., ${t`\sigma_x > 0`} but ${t`\sigma_y = 0`}), the equations simplify. The full complexity only appears in corner regions where both directions have non-zero absorption.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-38"),expanded:[],variables:[]},{id:38,body:(a,t)=>a`We start with the scalar wave equation in first-order form,

${t.block`\begin{aligned}
\frac{\partial u}{\partial t} &= c (\nabla \cdot \mathbf{v}) \\[10pt]
\frac{\partial v_x}{\partial t} &= c \frac{\partial u}{\partial x} \\[10pt]
\frac{\partial v_y}{\partial t} &= c \frac{\partial u}{\partial y}.
\end{aligned}`}`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-39"),expanded:[],variables:[]},{id:39,body:(a,t)=>a`Following the same approach as in 1D, we transform to the Fourier time domain, replacing ${t`\frac{\partial}{\partial t}`} with ${t`-i\omega`}

${t.block`\begin{aligned}
-i\omega u &= c \frac{\partial v_x}{\partial x} + c \frac{\partial v_y}{\partial y} \\[10pt]
-i\omega v_x &= c \frac{\partial u}{\partial x} \\[10pt]
-i\omega v_y &= c \frac{\partial u}{\partial y}.
\end{aligned}`}`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-40"),expanded:[],variables:[]},{id:40,body:(a,t)=>a`The PML technique replaces spatial derivatives with complex coordinate mappings

${t.block`\frac{\partial}{\partial x} \rightarrow \frac{1}{1 + i\frac{\sigma_x}{\omega}} \frac{\partial}{\partial x}, \quad \frac{\partial}{\partial y} \rightarrow \frac{1}{1 + i\frac{\sigma_y}{\omega}} \frac{\partial}{\partial y}`}`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-41"),expanded:[],variables:[]},{id:41,body:(a,t)=>a`Applying the mapping to the velocity equations and multiplying through by the denominators yields

${t.block`\begin{aligned}
-i\omega v_x - \sigma_x v_x &= c \frac{\partial u}{\partial x} \\[10pt]
-i\omega v_y - \sigma_y v_y &= c \frac{\partial u}{\partial y}
\end{aligned}`}`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-42"),expanded:[],variables:[]},{id:42,body:(a,t)=>a`Transforming back to the time domain immediately gives

${t.block`\begin{aligned}
\frac{\partial v_x}{\partial t} &= c \frac{\partial u}{\partial x} - \sigma_x v_x \\[10pt]
\frac{\partial v_y}{\partial t} &= c \frac{\partial u}{\partial y} - \sigma_y v_y.
\end{aligned}`}`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-43"),expanded:[],variables:[]},{id:43,body:(a,t)=>a`The equation for ${t`u`} is more involved. Applying the PML mapping gives

${t.block`-i\omega u = c \left(\frac{1}{1 + i\frac{\sigma_x}{\omega}} \frac{\partial v_x}{\partial x} + \frac{1}{1 + i\frac{\sigma_y}{\omega}} \frac{\partial v_y}{\partial y}\right)`}`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-44"),expanded:[],variables:[]},{id:44,body:(a,t)=>a`Expanding and collecting terms yields

${t.block`\begin{aligned}
-i\omega u &= c \left(\frac{\partial v_x}{\partial x} + \frac{\partial v_y}{\partial y}\right) - (\sigma_x + \sigma_y) u \\
&\quad + \left(\frac{ic\sigma_x}{\omega} \frac{\partial v_y}{\partial y} + \frac{ic\sigma_y}{\omega} \frac{\partial v_x}{\partial x} - \frac{i}{\omega} \sigma_x \sigma_y u\right)
\end{aligned}`}`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-45"),expanded:[],variables:[]},{id:45,body:(a,t)=>a`Except for the last term, we can transform this back into the time domain to obtain an equation analogous to the 1D case. However, the term in parentheses contains factors of ${t`\frac{i}{\omega}`} which correspond to time integration. In other words, the equation mostly translates back into the time domain just fine, but we end up with one additional quantity we need to track and integrate along with the other state variables. We define the term in parentheses as the auxiliary quantity ${t`\psi,`}`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-46"),expanded:[],variables:[]},{id:46,body:(a,t)=>a`${t.block`\psi = \frac{ic\sigma_x}{\omega} \frac{\partial v_y}{\partial y} + \frac{ic\sigma_y}{\omega} \frac{\partial v_x}{\partial x} - \frac{i}{\omega} \sigma_x \sigma_y u`}`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-47"),expanded:[],variables:[]},{id:47,body:(a,t)=>a`Multiplying through by ${t`-i\omega`} and transforming back to the time domain gives

${t.block`\frac{d\psi}{dt} = c \sigma_x \frac{\partial v_y}{\partial y} + c \sigma_y \frac{\partial v_x}{\partial x} - \sigma_x \sigma_y u`}`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-48"),expanded:[],variables:[]},{id:48,body:(a,t)=>a`The update equation for ${t`u`} then becomes

${t.block`\frac{du}{dt} = c (\nabla \cdot \mathbf{v}) - (\sigma_x + \sigma_y) u + \psi.`}`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-11"),expanded:[],variables:[]},{id:11,body:(a,t)=>a`Together with the velocity equations, we have the complete 2D PML system

${t.block`\begin{aligned}
\frac{\partial u}{\partial t} &= c (\nabla \cdot \mathbf{v}) - (\sigma_x + \sigma_y) u + \psi \\[10pt]
\frac{\partial \psi}{\partial t} &= c \sigma_x \frac{\partial v_y}{\partial y} + c \sigma_y \frac{\partial v_x}{\partial x} - \sigma_x \sigma_y u \\[10pt]
\frac{\partial v_x}{\partial t} &= c \frac{\partial u}{\partial x} - \sigma_x v_x \\[10pt]
\frac{\partial v_y}{\partial t} &= c \frac{\partial u}{\partial y} - \sigma_y v_y
\end{aligned}`}`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-49"),expanded:[],variables:[]},{id:49,body:(a,t)=>a`These equations require tracking three fields: the scalar field ${t`u`}, the auxiliary field ${t`\psi`}, and the vector field ${t`\mathbf{v} = (v_x, v_y)`}. In practice, this naturally lends itself to a two-buffer implementation: one storing ${t`(u, \psi)`} and the other storing ${t`(v_x, v_y)`}. The two buffers are offset by half a timestep to avoid some of the common instabilities encountered when simulating wave equations.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-50"),expanded:[],variables:[]},{id:50,body:(a,t)=>a`The following WebGL implementation simulates these equations on the GPU using fragment shaders. Use the controls below to pause/resume the simulation, adjust contrast, and visualize the PML absorption regions (red for ${t`\sigma_x`}, green for ${t`\sigma_y`}).`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-63"),expanded:[],variables:[]},{id:63,body:(a,t)=>a`Note also that we add a slider for the PML width and exponent. As a baseline, we ease the strength of ${t`\sigma`} from 0 to 1 over the width of the layer, then tack on an exponent on top of that so that we can ease it quadratically or even just set it (nearly) constant as the exponent approaches zero. In a perfect world, the layer is perfectly matched and we could just let it be constant. However, we’ve chosen a second order scheme with significant truncation error, which means that the impedance of the absorbing layer is not actually perfectly matched and still introduces spurious reflections. Easing the strength of the layer more gently reduces these reflections, though it also requires a thicker absorbing layer.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});u({root:document.getElementById("cell-17"),expanded:[],variables:[]},{id:17,body:a=>{const t=a`<canvas width="640" height="640" style="width: 100%; height: auto; display: block; image-rendering: pixelated; touch-action: none;"></canvas>`,o=t.getContext("webgl2");if(!o)throw new Error("WebGL 2 is not supported");const P=o.getExtension("EXT_color_buffer_float");if(!P)throw new Error("EXT_color_buffer_float extension is not supported");const I=o.getExtension("OES_texture_float_linear"),T=I!==null,e=12,S=2,A=1,B=4,g=10,h=1,F=.5,s=1,b=`#version 300 es
    in vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `,y=`
    const float PML_WIDTH = ${e.toFixed(1)};
    const float PML_STRENGTH = ${A.toFixed(1)};
    const float OSCILLATOR_STRENGTH = ${B.toFixed(1)};
    const float OSCILLATOR_WAVELENGTH = ${g.toFixed(1)};
    const float C = ${h.toFixed(1)};
    const float DT = ${F.toFixed(1)};
    const float DX = ${s.toFixed(1)};
    const float PI = 3.14159265358979;

    float linearstep(float a, float b, float x) {
      return clamp((x - a) / (b - a), 0.0, 1.0);
    }
  `,C=`#version 300 es
    precision highp float;
    ${y}
    uniform sampler2D u_bufferA;
    uniform sampler2D u_bufferB;
    uniform vec2 u_resolution;
    uniform float u_pmlWidth;
    uniform float u_pmlExponent;
    uniform float u_usePsi;
    uniform float u_mouseX;
    uniform float u_mouseY;
    uniform float u_mouseMoving;
    uniform float u_mouseActive;
    out vec4 fragColor;

    vec2 sigmaCompute(vec2 coord, vec2 res, float pmlWidth, float pmlExponent) {
      return pow(
        abs(vec2(
          linearstep(pmlWidth, 0.0, coord.x) + linearstep(res.x - pmlWidth, res.x, coord.x),
          linearstep(pmlWidth, 0.0, coord.y) + linearstep(res.y - pmlWidth, res.y, coord.y)
        )),
        vec2(pmlExponent)
      ) * PML_STRENGTH;
    }

    void main() {
      ivec2 p = ivec2(gl_FragCoord.xy);
      vec4 state = texelFetch(u_bufferA, p, 0);
      float u = state.x, psi = state.y, t = state.z;

      float vx1 = texelFetch(u_bufferB, p + ivec2(1, 0), 0).x;
      float vx0 = texelFetch(u_bufferB, p + ivec2(-1, 0), 0).x;
      float vy1 = texelFetch(u_bufferB, p + ivec2(0, 1), 0).y;
      float vy0 = texelFetch(u_bufferB, p + ivec2(0, -1), 0).y;

      float dvxdx = (vx1 - vx0) / (2.0 * DX);
      float dvydy = (vy1 - vy0) / (2.0 * DX);

      vec2 s = sigmaCompute(gl_FragCoord.xy, u_resolution, u_pmlWidth, u_pmlExponent);

      // When usePsi is disabled, use naive 2D extension (which won't work well)
      float psiContribution = u_usePsi > 0.5 ? psi : 0.0;
      float psiUpdate = u_usePsi > 0.5 ? (s.x * dvydy + s.y * dvxdx - u * s.x * s.y) : 0.0;

      fragColor.xyz = state.xyz + DT * vec3(
        C * (dvxdx + dvydy) - u * (s.x + s.y) + psiContribution,
        C * psiUpdate,
        1.0
      );

      // Apply forcing term: mouse if moving, automatic if not active, none otherwise
      if (u_mouseMoving > 0.5) {
        // Mouse-based forcing with Gaussian profile (only when actually moving)
        float mouseForceWidth = 8.0;
        float mouseDist = length(gl_FragCoord.xy - vec2(u_mouseX, u_mouseY));
        float mouseMask = exp(-pow(mouseDist / mouseForceWidth, 2.0));
        float omega = C * PI / OSCILLATOR_WAVELENGTH;
        float mouseForce = sin(omega * t) * mouseMask * OSCILLATOR_STRENGTH * 0.4;
        fragColor.x += mouseForce;
      } else if (u_mouseActive < 0.5) {
        // Automatic periodic oscillators (only when mouse not active)
        float pulseInterval = 600.0;
        float pulse = exp(-pow(abs((mod(t - pulseInterval, pulseInterval * 0.7) - pulseInterval * 0.5) / 40.0), 4.0));
        int COUNT = 5;
        for (int i = 0; i < COUNT; i++) {
          vec2 r = (float(i) - float(COUNT) * 0.5) / float(COUNT) * vec2(80.0, 0.0);
          float omega = C * PI / OSCILLATOR_WAVELENGTH;
          float oscillatorMask = smoothstep(3.0, 2.0, length(gl_FragCoord.xy - u_resolution * 0.5 + r));
          float u0 = sin(omega * t / float(i + 1));
          fragColor.x += u0 * oscillatorMask * OSCILLATOR_STRENGTH * pulse;
        }
      }
      // When mouse is active but not moving: no forcing, just let waves propagate
    }
  `,p=`#version 300 es
    precision highp float;
    ${y}
    uniform sampler2D u_bufferA;
    uniform sampler2D u_bufferB;
    uniform vec2 u_resolution;
    uniform float u_pmlWidth;
    uniform float u_pmlExponent;
    out vec4 fragColor;

    vec2 sigmaCompute(vec2 coord, vec2 res, float pmlWidth, float pmlExponent) {
      return pow(
        abs(vec2(
          linearstep(pmlWidth, 0.0, coord.x) + linearstep(res.x - pmlWidth, res.x, coord.x),
          linearstep(pmlWidth, 0.0, coord.y) + linearstep(res.y - pmlWidth, res.y, coord.y)
        )),
        vec2(pmlExponent)
      ) * PML_STRENGTH;
    }

    void main() {
      ivec2 p = ivec2(gl_FragCoord.xy);
      vec4 state = texelFetch(u_bufferB, p, 0);
      vec2 v = state.xy;

      float u1x = texelFetch(u_bufferA, p + ivec2(1, 0), 0).x;
      float u0x = texelFetch(u_bufferA, p + ivec2(-1, 0), 0).x;
      float u1y = texelFetch(u_bufferA, p + ivec2(0, 1), 0).x;
      float u0y = texelFetch(u_bufferA, p + ivec2(0, -1), 0).x;

      vec2 ugrad = vec2(u1x - u0x, u1y - u0y) / (2.0 * DX);
      vec2 s = sigmaCompute(gl_FragCoord.xy, u_resolution, u_pmlWidth, u_pmlExponent);

      fragColor.xy = state.xy + DT * (C * ugrad - s * v);
    }
  `,N=`#version 300 es
    precision highp float;
    ${y}
    uniform sampler2D u_bufferA;
    uniform vec2 u_canvasResolution;
    uniform vec2 u_simResolution;
    uniform float u_showSigma;
    uniform float u_contrast;
    uniform float u_pmlWidth;
    uniform float u_pmlExponent;
    out vec4 fragColor;

    vec2 sigmaDisplay(vec2 coord, vec2 res, float pmlWidth, float pmlExponent) {
      return pow(
        abs(vec2(
          linearstep(pmlWidth, 0.0, coord.x) + linearstep(res.x - pmlWidth, res.x, coord.x),
          linearstep(pmlWidth, 0.0, coord.y) + linearstep(res.y - pmlWidth, res.y, coord.y)
        )),
        vec2(pmlExponent)
      ) * PML_STRENGTH;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_canvasResolution;
      vec4 state = texture(u_bufferA, uv);
      float u = state.x * u_contrast;  // Apply contrast amplification

      // White background with colored waves
      vec3 white = vec3(1.0);
      vec3 cyanColor = vec3(0.0, 0.65, 0.75);    // Darker cyan
      vec3 yellowColor = vec3(0.85, 0.75, 0.0);  // Darker yellow

      // Blend from white to color based on wave amplitude
      float intensity = clamp(abs((2.0 / ${Math.PI}) * u), 0.0, 1.0);
      vec3 targetColor = u > 0.0 ? yellowColor : cyanColor;
      fragColor = vec4(mix(white, targetColor, intensity), 1.0) * abs(intensity);

      if (u_showSigma > 0.5) {
        // Map canvas coords to sim coords for PML visualization
        vec2 simCoord = gl_FragCoord.xy * u_simResolution / u_canvasResolution;
        vec2 s = sigmaDisplay(simCoord, u_simResolution, u_pmlWidth, u_pmlExponent);  // sqrt for better low-value contrast
        fragColor = mix(fragColor, vec4(1.0, 0.0, 0.0, 1.0), s.x * 0.7);  // Pink for x-direction
        fragColor = mix(fragColor, vec4(0.0, 1.0, 0.0, 1.0), s.y * 0.7);  // Green for y-direction
      }
    }
  `;function l(w,i){const _=o.createShader(i);if(o.shaderSource(_,w),o.compileShader(_),!o.getShaderParameter(_,o.COMPILE_STATUS)){const W=o.getShaderInfoLog(_);throw console.error("Shader compilation error:",W),console.error("Shader source:",w),o.deleteShader(_),new Error("Shader compilation failed: "+W)}return _}function E(w,i){const _=l(w,o.VERTEX_SHADER),W=l(i,o.FRAGMENT_SHADER),$=o.createProgram();if(o.attachShader($,_),o.attachShader($,W),o.linkProgram($),!o.getProgramParameter($,o.LINK_STATUS)){const H=o.getProgramInfoLog($);throw console.error("Program linking error:",H),new Error("Program linking failed: "+H)}return $}const v=E(b,C),k=E(b,p),M=E(b,N),U=o.createBuffer();o.bindBuffer(o.ARRAY_BUFFER,U),o.bufferData(o.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),o.STATIC_DRAW);function f(w,i){const _=o.createTexture();o.bindTexture(o.TEXTURE_2D,_),o.texImage2D(o.TEXTURE_2D,0,o.RGBA32F,w,i,0,o.RGBA,o.FLOAT,null);const W=T?o.LINEAR:o.NEAREST;o.texParameteri(o.TEXTURE_2D,o.TEXTURE_MIN_FILTER,W),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_MAG_FILTER,W),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_WRAP_S,o.CLAMP_TO_EDGE),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_WRAP_T,o.CLAMP_TO_EDGE);const $=o.createFramebuffer();return o.bindFramebuffer(o.FRAMEBUFFER,$),o.framebufferTexture2D(o.FRAMEBUFFER,o.COLOR_ATTACHMENT0,o.TEXTURE_2D,_,0),{fbo:$,texture:_}}const L=t.width,X=t.height,D={pixelRatio:.5},r=()=>Math.floor(L*D.pixelRatio),n=()=>Math.floor(X*D.pixelRatio),x=[f(r(),n()),f(r(),n())],d=[f(r(),n()),f(r(),n())];let c=0;const R=[],m={x:-1e3,y:-1e3,lastMoveTime:-1e4,isMoving:!1,isActive:!1};t.addEventListener("pointerenter",w=>{const i=t.getBoundingClientRect(),_=(w.clientX-i.left)*r()/i.width,W=n()-(w.clientY-i.top)*n()/i.height;R.push({x:_,y:W,time:performance.now()})}),t.addEventListener("pointermove",w=>{const i=t.getBoundingClientRect(),_=(w.clientX-i.left)*r()/i.width,W=n()-(w.clientY-i.top)*n()/i.height;R.push({x:_,y:W,time:performance.now()})}),t.addEventListener("pointerleave",w=>{m.x=-1e3,m.y=-1e3,m.lastMoveTime=-1e4,m.isMoving=!1,m.isActive=!1});const O={usePsi:1,showSigma:0,contrast:.454,pmlWidth:12,pmlExponent:2,mouseX:-1e3,mouseY:-1e3,mouseMoving:0,mouseActive:0};return{canvas:t,gl:o,ext:P,linearExt:I,useLinearFiltering:T,PML_WIDTH:e,PML_EXPONENT:S,PML_STRENGTH:A,OSCILLATOR_STRENGTH:B,OSCILLATOR_WAVELENGTH:g,C:h,DT:F,DX:s,vertexShaderSource:b,commonSource:y,bufferASource:C,bufferBSource:p,displaySource:N,compileShader:l,createProgram:E,bufferAProgram:v,bufferBProgram:k,displayProgram:M,quadBuffer:U,createFramebuffer:f,canvasWidth:L,canvasHeight:X,params:D,getSimWidth:r,getSimHeight:n,bufferA:x,bufferB:d,currentBuffer:c,pointerQueue:R,mouseState:m,uniforms:O,webgl_setup:{canvas:t,gl:o,canvasWidth:L,canvasHeight:X,params:D,getSimWidth:r,getSimHeight:n,bufferAProgram:v,bufferBProgram:k,displayProgram:M,quadBuffer:U,bufferA:x,bufferB:d,mouseState:m,uniforms:O,pointerQueue:R}}},inputs:["html"],outputs:["canvas","gl","ext","linearExt","useLinearFiltering","PML_WIDTH","PML_EXPONENT","PML_STRENGTH","OSCILLATOR_STRENGTH","OSCILLATOR_WAVELENGTH","C","DT","DX","vertexShaderSource","commonSource","bufferASource","bufferBSource","displaySource","compileShader","createProgram","bufferAProgram","bufferBProgram","displayProgram","quadBuffer","createFramebuffer","canvasWidth","canvasHeight","params","getSimWidth","getSimHeight","bufferA","bufferB","currentBuffer","pointerQueue","mouseState","uniforms","webgl_setup"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});u({root:document.getElementById("cell-18"),expanded:[],variables:[]},{id:18,body:(a,t,o,P,I,T)=>{a.uniforms.usePsi=t?1:0,a.uniforms.showSigma=o?1:0,a.uniforms.contrast=Math.max(100**P,.1),a.uniforms.pmlWidth=I,a.uniforms.pmlExponent=T},inputs:["webgl_setup","usePsi","showSigma","contrast","pmlWidth","pmlExponent"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});u({root:document.getElementById("cell-19"),expanded:[],variables:[]},{id:19,body:(a,t,o,P,I)=>{const{canvas:T,gl:e,canvasWidth:S,canvasHeight:A,getSimWidth:B,getSimHeight:g,bufferAProgram:h,bufferBProgram:F,displayProgram:s,quadBuffer:b,bufferA:y,bufferB:C,mouseState:p,pointerQueue:N,uniforms:l}=a;let E=0,v,k=!1;function M(){if(!k)return;const f=B(),L=g(),X=performance.now();for(;N.length>0;){const n=N.shift();p.x=n.x,p.y=n.y,p.lastMoveTime=n.time}const D=X-p.lastMoveTime;if(p.isMoving=D<100,p.isActive=D<6e3,l.mouseX=p.x,l.mouseY=p.y,l.mouseMoving=p.isMoving?1:0,l.mouseActive=p.isActive?1:0,!t){e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,S,A),e.useProgram(s);const n=e.getAttribLocation(s,"a_position");e.bindBuffer(e.ARRAY_BUFFER,b),e.enableVertexAttribArray(n),e.vertexAttribPointer(n,2,e.FLOAT,!1,0,0),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,y[E].texture),e.uniform1i(e.getUniformLocation(s,"u_bufferA"),0),e.uniform2f(e.getUniformLocation(s,"u_canvasResolution"),S,A),e.uniform2f(e.getUniformLocation(s,"u_simResolution"),f,L),e.uniform1f(e.getUniformLocation(s,"u_showSigma"),l.showSigma),e.uniform1f(e.getUniformLocation(s,"u_contrast"),l.contrast),e.uniform1f(e.getUniformLocation(s,"u_pmlWidth"),l.pmlWidth),e.uniform1f(e.getUniformLocation(s,"u_pmlExponent"),l.pmlExponent),e.drawArrays(e.TRIANGLE_STRIP,0,4),v=requestAnimationFrame(M);return}for(let n=0;n<2;n++){const x=E,d=1-E;e.bindFramebuffer(e.FRAMEBUFFER,y[d].fbo),e.viewport(0,0,f,L),e.useProgram(h);const c=e.getAttribLocation(h,"a_position");e.bindBuffer(e.ARRAY_BUFFER,b),e.enableVertexAttribArray(c),e.vertexAttribPointer(c,2,e.FLOAT,!1,0,0),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,y[x].texture),e.uniform1i(e.getUniformLocation(h,"u_bufferA"),0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,C[x].texture),e.uniform1i(e.getUniformLocation(h,"u_bufferB"),1),e.uniform2f(e.getUniformLocation(h,"u_resolution"),f,L),e.uniform1f(e.getUniformLocation(h,"u_pmlWidth"),l.pmlWidth),e.uniform1f(e.getUniformLocation(h,"u_pmlExponent"),l.pmlExponent),e.uniform1f(e.getUniformLocation(h,"u_usePsi"),l.usePsi),e.uniform1f(e.getUniformLocation(h,"u_mouseX"),l.mouseX),e.uniform1f(e.getUniformLocation(h,"u_mouseY"),l.mouseY),e.uniform1f(e.getUniformLocation(h,"u_mouseMoving"),l.mouseMoving),e.uniform1f(e.getUniformLocation(h,"u_mouseActive"),l.mouseActive),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.bindFramebuffer(e.FRAMEBUFFER,C[d].fbo),e.useProgram(F);const R=e.getAttribLocation(F,"a_position");e.bindBuffer(e.ARRAY_BUFFER,b),e.enableVertexAttribArray(R),e.vertexAttribPointer(R,2,e.FLOAT,!1,0,0),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,y[d].texture),e.uniform1i(e.getUniformLocation(F,"u_bufferA"),0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,C[x].texture),e.uniform1i(e.getUniformLocation(F,"u_bufferB"),1),e.uniform2f(e.getUniformLocation(F,"u_resolution"),f,L),e.uniform1f(e.getUniformLocation(F,"u_pmlWidth"),l.pmlWidth),e.uniform1f(e.getUniformLocation(F,"u_pmlExponent"),l.pmlExponent),e.drawArrays(e.TRIANGLE_STRIP,0,4),E=d}e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,S,A),e.useProgram(s);const r=e.getAttribLocation(s,"a_position");e.bindBuffer(e.ARRAY_BUFFER,b),e.enableVertexAttribArray(r),e.vertexAttribPointer(r,2,e.FLOAT,!1,0,0),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,y[E].texture),e.uniform1i(e.getUniformLocation(s,"u_bufferA"),0),e.uniform2f(e.getUniformLocation(s,"u_canvasResolution"),S,A),e.uniform2f(e.getUniformLocation(s,"u_simResolution"),f,L),e.uniform1f(e.getUniformLocation(s,"u_showSigma"),l.showSigma),e.uniform1f(e.getUniformLocation(s,"u_contrast"),l.contrast),e.uniform1f(e.getUniformLocation(s,"u_pmlWidth"),l.pmlWidth),e.uniform1f(e.getUniformLocation(s,"u_pmlExponent"),l.pmlExponent),e.drawArrays(e.TRIANGLE_STRIP,0,4),v=requestAnimationFrame(M)}const U=new o(f=>{f.forEach(L=>{k=L.isIntersecting,k?v||(v=requestAnimationFrame(M)):v&&(cancelAnimationFrame(v),v=null)})});return U.observe(T),P.then(()=>{v&&cancelAnimationFrame(v),U.disconnect()}),T.style.border="1px solid #eee",I(T),{canvas:T,gl:e,canvasWidth:S,canvasHeight:A,getSimWidth:B,getSimHeight:g,bufferAProgram:h,bufferBProgram:F,displayProgram:s,quadBuffer:b,bufferA:y,bufferB:C,mouseState:p,pointerQueue:N,uniforms:l,currentBuffer:E,animationId:v,isVisible:k,render:M,observer:U}},inputs:["webgl_setup","simulate","IntersectionObserver","invalidation","display"],outputs:["canvas","gl","canvasWidth","canvasHeight","getSimWidth","getSimHeight","bufferAProgram","bufferBProgram","displayProgram","quadBuffer","bufferA","bufferB","mouseState","pointerQueue","uniforms","currentBuffer","animationId","isVisible","render","observer"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});u({root:document.getElementById("cell-20"),expanded:[],variables:[]},{id:20,body:(a,t)=>{const o=a(t.toggle({label:"Simulate",value:!0})),P=a(t.toggle({label:"Use auxiliary ψ equation",value:!0})),I=a(t.toggle({label:"Show absorption regions",value:!1})),T=a(t.range([0,1],{label:"Contrast",step:.01,value:0})),e=a(t.range([4,40],{label:"PML width (pixels)",step:1,value:8})),S=a(t.range([.1,2],{label:"PML exponent",step:.1,value:2}));return{simulate:o,usePsi:P,showSigma:I,contrast:T,pmlWidth:e,pmlExponent:S}},inputs:["view","Inputs"],outputs:["simulate","usePsi","showSigma","contrast","pmlWidth","pmlExponent"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});
