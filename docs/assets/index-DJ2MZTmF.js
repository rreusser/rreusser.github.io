import{d as l,_ as h}from"./index-ByB2dbry.js";import"./comments-I77vOiCB.js";l({root:document.getElementById("cell-4"),expanded:[],variables:[]},{id:4,body:(t,e,n,o,a,d,r)=>{const u=t`<figure>
  ${e.element}
  <figcaption>Drag points to adjust magnet positions. Use mouse wheel to zoom, drag background to pan.</figcaption>
</figure>`;return n(o(u,{width:Math.min(a,640),height:Math.min(640,a),toggleOffset:[-14,-32],controls:".magnetic-pendulum-controls",onResize(p,i,s){e.resize(i,s),d.updateScales(e.elements.plot.scale("x"),e.elements.plot.scale("y")),r.dirty=!0}})),{figure:u}},inputs:["html","stack","display","expandable","width","axes","regl"],outputs:["figure"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-30"),expanded:[],variables:[]},{id:30,body:(t,e,n,o)=>{const a=t`<div class="magnetic-pendulum-controls"></div>`;function d(y){return a.appendChild(y),e.input(y)}const r=d(n.range([.001*0,1],{label:"pendulum height, h",value:.5})),u=d(n.range([1e-8,1],{label:"friction",value:.2})),p=d(n.range([1e-6,.01],{transform:Math.log,label:"tolerance",value:3e-4})),i=d(n.range([0,200],{label:"integration steps",value:120,step:1})),s=d(n.range([2,10],{label:"Magnet count",value:3,step:1})),f=d(n.checkbox(["Draw trajectory"],{value:["Draw trajectory"]}));return o(a),{controlsContainer:a,ctrl:d,h:r,b:u,tolerance:p,steps:i,N:s,opts:f}},inputs:["html","Generators","Inputs","display"],outputs:["controlsContainer","ctrl","h","b","tolerance","steps","N","opts"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-10"),expanded:[],variables:[]},{id:10,body:(t,e)=>t`For two-dimensional position ${e`\mathbf{x}`}, friction ${e`b`}, and magnets ${e`\mathbf{X}_n`}, the pendulum moves according to the equations`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});l({root:document.getElementById("cell-11"),expanded:[],variables:[]},{id:11,body:(t,e,n)=>t`${e.block`
\frac{d^2 \mathbf{x}}{dt^2} + b \frac{d\mathbf{x}}{dt} + \mathbf{x} = \sum_{n=1}^{${n}} \frac{\mathbf{X}_n - x}{\left(|\mathbf{X}_n - \mathbf{x}|^2 + h^2\right)^{5/2}}.
`}`,inputs:["md","tex","N"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});l({root:document.getElementById("cell-12"),expanded:[],variables:[]},{id:12,body:(t,e)=>t`Pendulum height ${e`h`} means the bottom of the pendulum is elevated slightly above the magnets so that it doesn't experience infinite acceleration when it gets close.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});l({root:document.getElementById("cell-49"),expanded:[],variables:[]},{id:49,body:t=>{const e=Array.from({length:t}).map((o,a)=>a),n=`vec4 deriv (vec4 y) {
  vec2 pos = y.xy;
  vec2 vel = y.zw;
  ${e.map(o=>`vec2 r${o} = p${o} - pos;`).join(`
  `)}
  ${e.map(o=>`float d${o} = dot(r${o}, r${o}) + h2;`).join(`
  `)}
  vec2 force = ${e.map(o=>`r${o} / (d${o} * d${o} * sqrt(d${o}))`).join(` +
               `)};
  return vec4(vel, force - b * vel - pos);
}`;return{iDeriv:e,glslDeriv:n}},inputs:["N"],outputs:["iDeriv","glslDeriv"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-55"),expanded:[],variables:[]},{id:55,body:(t,e)=>t`\`\`\`glsl
${e}
\`\`\``,inputs:["md","glslDeriv"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});l({root:document.getElementById("cell-43"),expanded:[],variables:[]},{id:43,body:(t,e)=>t`Given zero velocity and starting position \`xy\`, the final iteration loop is reproduced below. We start by packing the state into a \`vec4\`. We update the state ${e} times, overwriting the state and mutating \`dt\` on each step. The iteration is quite straightfoward, but GLSL 1.00 does not permit loop bounds to be computed at runtime, so we have to hard-code the loop extents into the shader.`,inputs:["md","steps"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});l({root:document.getElementById("cell-45"),expanded:[],variables:[]},{id:45,body:(t,e)=>t`\`\`\`glsl
vec4 y = vec4(xy, vec2(0));
float dt = 0.01;
for (int i = 0; i < ${e}; i++) y = ode45(y, dt);
\`\`\``,inputs:["md","steps"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});l({root:document.getElementById("cell-67"),expanded:[],variables:[]},{id:67,body:t=>{const e=Array.from({length:t}).map((a,d)=>d),n=`float quasirandom (int n) {
  return fract(0.5 + ${1/1.618033988749895} * float(n));
}
vec3 palette(float t) {
  const vec3 a = vec3(0.5, 0.5, 0.5);
  const vec3 b = vec3(0.5, 0.5, 0.5);
  const vec3 c = vec3(1.0, 1.0, 1.0);
  const vec3 d = vec3(0.00, 0.33, 0.67);
  return a + b * cos(6.283185 * (c * t + d));
}`,o=`vec3 computeWeightedColor (vec2 y) {
  ${e.map(a=>`vec2 r${a} = y - p${a};`).join(`
  `)}
  ${e.map(a=>`float w${a} = 1.0 / dot(r${a}, r${a}); w${a} *= w${a};`).join(`
  `)}
  return (
    ${e.map(a=>`w${a} * mix(palette(0.63 + quasirandom(${a})), vec3(0.9), 0.35)`).join(` +
    `)}
  ) / (${e.map(a=>`w${a}`).join(" + ")});
}`;return{iPalette:e,glslPalette:n,glslScheme:o}},inputs:["N"],outputs:["iPalette","glslPalette","glslScheme"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-68"),expanded:[],variables:[]},{id:68,body:(t,e)=>t`\`\`\`glsl
${e}
\`\`\``,inputs:["md","glslPalette"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});l({root:document.getElementById("cell-69"),expanded:[],variables:[]},{id:69,body:(t,e)=>t`\`\`\`glsl
${e}
\`\`\``,inputs:["md","glslScheme"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});l({root:document.getElementById("cell-7"),expanded:[],variables:[]},{id:7,body:async(t,e)=>{const[{default:n},{ode45:o}]=await Promise.all([h(()=>import("https://cdn.jsdelivr.net/npm/regl/+esm"),[]).then(a=>{if(!("default"in a))throw new SyntaxError("export 'default' not found");return a}),h(()=>import("https://api.observablehq.com/@rreusser/integration.js?v=4"),[]).then(a=>{const d={},r=t.module(a.default),u=t.module();if(!r.defines("ode45"))throw new SyntaxError("export 'ode45' not found");return u.variable(d.ode45=e()).import("ode45",r),d})]);return{createREGL:n,ode45:o}},inputs:["__ojs_runtime","__ojs_observer"],outputs:["createREGL","ode45"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-2"),expanded:[],variables:[]},{id:2,body:async()=>{const[{createElementStack:t},{reglElement:e,reglAxesViewport:n},{createZoomableAxes:o},{expandable:a}]=await Promise.all([h(()=>import("./element-stack-BU40TvN2.js"),[]).then(d=>{if(!("createElementStack"in d))throw new SyntaxError("export 'createElementStack' not found");return d}),h(()=>import("./regl-canvas-4j8SAjSv.js"),[]).then(d=>{if(!("reglElement"in d))throw new SyntaxError("export 'reglElement' not found");if(!("reglAxesViewport"in d))throw new SyntaxError("export 'reglAxesViewport' not found");return d}),h(()=>import("./zoomable-axes-BfGyq1bg.js"),[]).then(d=>{if(!("createZoomableAxes"in d))throw new SyntaxError("export 'createZoomableAxes' not found");return d}),h(()=>import("./expandable-GAgQDSaE.js"),[]).then(d=>{if(!("expandable"in d))throw new SyntaxError("export 'expandable' not found");return d})]);return{createElementStack:t,reglElement:e,reglAxesViewport:n,createZoomableAxes:o,expandable:a}},inputs:[],outputs:["createElementStack","reglElement","reglAxesViewport","createZoomableAxes","expandable"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-29"),expanded:[],variables:[]},{id:29,body:t=>{function e(n,o,a=[-3,3],d=[-3,3]){return t.plot({width:n,height:o,marginTop:10,marginRight:10,marginLeft:40,marginBottom:30,style:{backgroundColor:"transparent",maxWidth:"none",position:"absolute"},x:{domain:a,grid:!0,tickSpacing:100},y:{domain:d,grid:!0,tickSpacing:100}})}return{createPlot:e}},inputs:["Plot"],outputs:["createPlot"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-5"),expanded:[],variables:[]},{id:5,body:(t,e,n,o,a)=>({stack:t({layers:[{id:"regl",element:e(n,{attributes:{depthStencil:!1,preserveDrawingBuffer:!0}})},{id:"plot",element:({width:r,height:u})=>o(r,u)},{id:"svg",element:({current:r,width:u,height:p})=>(r?a.select(r):a.create("svg")).attr("width",u).attr("height",p).node()}]})}),inputs:["createElementStack","reglElement","createREGL","createPlot","d3"],outputs:["stack"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-8"),expanded:[],variables:[]},{id:8,body:(t,e,n,o,a)=>({axes:t({d3:e,element:n.elements.svg,xScale:n.elements.plot.scale("x"),yScale:n.elements.plot.scale("y"),aspectRatio:1,onChange:({xDomain:r,yDomain:u})=>{o.dirty=!0;const p=a(n.width,n.height,r,u);n.elements.plot.replaceWith(p),n.elements.plot=p,n.dispatchEvent(new CustomEvent("update"))}})}),inputs:["createZoomableAxes","d3","stack","regl","createPlot"],outputs:["axes"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-18"),expanded:[],variables:[]},{id:18,body:t=>{const e=t.elements.regl.value;return e.dirty=!0,{regl:e}},inputs:["stack"],outputs:["regl"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-27"),expanded:[],variables:[]},{id:27,body:t=>({magnets:Array.from({length:t}).map((n,o)=>({index:o,x:Math.sin(2*Math.PI*o/t),y:Math.cos(2*Math.PI*o/t)}))}),inputs:["N"],outputs:["magnets"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-24"),expanded:[],variables:[]},{id:24,body:(t,e,n,o,a)=>{function d(u,[p,i,s,f]){let y=0,m=0;for(let c=0;c<t.length;c++){const v=t[c].x-p,b=t[c].y-i,g=v*v+b*b+e*e,x=1/(g*g*Math.sqrt(g));y+=v*x,m+=b*x}u[0]=s,u[1]=f,u[2]=y-n*s-p,u[3]=m-n*f-i}function r([u,p]){if(!~o.indexOf("Draw trajectory")||isNaN(u))return[];const i={y:[u,p,0,0],t:0},s=[{x:i.y[0],y:i.y[1]}];for(let f=0;f<2e3&&!i.limitReached;f++)a(i,d,{tLimit:50,tolerance:2e-6}),s.push({x:i.y[0],y:i.y[1]});return s}return{deriv:d,computeTrajectory:r}},inputs:["magnets","h","b","opts","ode45"],outputs:["deriv","computeTrajectory"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-26"),expanded:[],variables:[]},{id:26,body:(t,e,n,o,a,d)=>{{let s=function(m){return t.line().x(({x:c})=>o.xScale(c)).y(({y:c})=>o.yScale(c))(m)},f=function(m){i.selectAll(".trajectorybg").data([m||[]]).join(c=>c.append("path").style("fill","none").style("stroke-width",5).style("stroke","rgba(255,255,255,0.6)").attr("class","trajectorybg").attr("d",s),c=>c.attr("d",s)),i.selectAll(".trajectory").data([m||[]]).join(c=>c.append("path").style("fill","none").style("stroke-width",2).style("stroke","blue").attr("class","trajectory").attr("d",s),c=>c.attr("d",s))},y=function(){const[m,c]=o.xRange,[v,b]=o.yRange;p.attr("x",Math.min(m,c)).attr("y",Math.min(v,b)).attr("width",Math.abs(c-m)).attr("height",Math.abs(b-v)),i.selectAll("circle.magnet").attr("cx",g=>o.xScale(g.x)).attr("cy",g=>o.yScale(g.y))};const r=t.select(e.elements.svg),p=r.selectAll("defs").data([0]).join("defs").selectAll("clipPath#viewport-clip").data([0]).join("clipPath").attr("id","viewport-clip").selectAll("rect").data([0]).join("rect"),i=r.selectAll("g.clipped").data([0]).join("g").attr("class","clipped").attr("clip-path","url(#viewport-clip)");r.on("mousemove",m=>{f(n([o.xScale.invert(m.offsetX),o.yScale.invert(m.offsetY)]))}),f([]),i.selectAll("circle.magnet").data(a).join(m=>m.append("circle").attr("class","magnet").attr("r",5).style("fill","black").style("stroke","white").style("stroke-width",2).style("cursor","move").call(t.drag().subject(function(c,v){return{x:o.xScale(v.x),y:o.yScale(v.y)}}).on("start",function(){t.select(this).attr("cursor","grabbing")}).on("drag",function(c,v){v.x=o.xScale.invert(c.x),v.y=o.yScale.invert(c.y),y(),f([]),d.dirty=!0}).on("end",function(){t.select(this).attr("cursor","move")}))),y(),e.addEventListener("update",()=>{y(),f([])})}},inputs:["d3","stack","computeTrajectory","axes","magnets","regl"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-21"),expanded:[],variables:[]},{id:21,body:(t,e,n,o,a,d,r,u)=>{const p={};for(let s=0;s<t;s++)p[`p${s}`]=(f,{magnets:y})=>[y[s].x,y[s].y];const i=e({vert:`
    precision highp float;
    attribute vec2 uv;
    varying vec2 xy;
    uniform mat4 viewInverse;
    void main () {
      xy = (viewInverse * vec4(uv, 0, 1)).xy;
      gl_Position = vec4(uv, 0, 1);
    }`,frag:`
    precision highp float;
    varying vec2 xy;
    uniform float h2, b, tol2;
    uniform vec2 ${Object.keys(p).join(", ")};
    uniform bool discardFails;

    ${n}

    const float safety = 0.95;
    const float maxDecrease = 0.02;
    const float maxIncrease = 50.0;

    vec4 rk45 (vec4 y, inout float dt) {
      // Fifth order estimate using constants for the Cash-Karp method
      vec4 k1 = deriv(y);
      vec4 k2 = deriv(y + dt * 0.2 * k1);
      vec4 k3 = deriv(y + dt * (0.075 * k1 + 0.225 * k2));
      vec4 k4 = deriv(y + dt * (0.3 * k1 - 0.9 * k2 + 1.2 * k3));
      vec4 k5 = deriv(y + dt * (-0.203703703703703703 * k1 + 2.5 * k2 - 2.592592592592592592 * k3 + 1.296296296296296296 * k4));
      vec4 k6 = deriv(y + dt * (0.029495804398148148 * k1 + 0.341796875 * k2 + 0.041594328703703703 * k3 + 0.400345413773148148 * k4 + 0.061767578125 * k5));

      // Estimate the error using the embedded fourth order method
      vec4 tmp = dt * (0.004293774801587301 * k1 - 0.018668586093857832 * k3 + 0.034155026830808080 * k4 + 0.019321986607142857 * k5 - 0.039102202145680406 * k6);
      float err2 = dot(tmp, tmp);

      // Wasteful, but only accept the step if error is within tolerance
      bool accept = err2 <= tol2;
      if (accept || !discardFails) y += dt * (0.097883597883597883 * k1 + 0.402576489533011272 * k3 + 0.210437710437710437 * k4 + 0.289102202145680406 * k6);

      // Either way, adjust dt according to the estimate
      dt *= clamp(safety * pow(tol2 / err2, accept ? 0.125 : 0.1), maxDecrease, maxIncrease);

      return y;
    }

    ${o}
    ${a}

    void main () {
      vec4 y = vec4(xy, vec2(0));
      float dtCurrent = 0.01;
      for (int i = 0; i < ${d}; i++) y = rk45(y, dtCurrent);
      gl_FragColor = vec4(computeWeightedColor(y.xy), 1);
    }`,attributes:{uv:[-4,-4,4,-4,0,4]},uniforms:{viewInverse:e.prop("viewInverse"),h2:(s,{h:f})=>f*f,b:e.prop("b"),tol2:(s,{tolerance:f})=>f*f,discardFails:e.prop("discard"),...p},depth:{enable:!1},scissor:{enable:!0,box:r(u)},viewport:r(u),count:3});return{magnetUniforms:p,drawField:i}},inputs:["N","regl","glslDeriv","glslPalette","glslScheme","steps","reglAxesViewport","axes"],outputs:["magnetUniforms","drawField"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-20"),expanded:[],variables:[]},{id:20,body:(t,e,n,o,a,d,r,u,p)=>{t.dirty=!0;let i=t.frame(()=>{if(t.dirty)try{e({viewInverse:n.viewInverse,h:o,b:a,magnets:d,tolerance:r,discard:!u.includes("Use steps which exceed tolerance")}),t.dirty=!1}catch(s){console.error(s),i&&i.cancel(),i=null}});return p.then(()=>{i&&i.cancel(),i=null}),{loop:i}},inputs:["regl","drawField","axes","h","b","magnets","tolerance","opts","invalidation"],outputs:["loop"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-59"),expanded:[],variables:[]},{id:59,body:()=>{function t(n){return n<=.04045?n/12.92:Math.pow((n+.055)/1.055,2.4)}function e(n){n=n.replace(/^#/,""),n.length===3&&(n=n.split("").map(r=>r+r).join(""));const o=t(parseInt(n.slice(0,2),16)/255),a=t(parseInt(n.slice(2,4),16)/255),d=t(parseInt(n.slice(4,6),16)/255);return[o,a,d]}return{srgbToLinear:t,hexToLinearRgb:e}},inputs:[],outputs:["srgbToLinear","hexToLinearRgb"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-60"),expanded:[],variables:[]},{id:60,body:(t,e)=>({colorScheme:t.schemeCategory10.map(e).map(([o,a,d])=>`vec3(${o},${a},${d})`)}),inputs:["d3","hexToLinearRgb"],outputs:["colorScheme"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});
