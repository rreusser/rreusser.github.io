import{d as l,_ as S}from"./index-ByB2dbry.js";l({root:document.getElementById("cell-4"),expanded:[],variables:[]},{id:4,body:(e,t,n,o,a,r,d)=>{const c=e`<figure>
  ${t.element}
  <figcaption>Drag points to adjust magnet positions. Use mouse wheel to zoom, drag background to pan.</figcaption>
</figure>`;return n(o(c,{width:Math.min(a,640),height:Math.min(640,a),toggleOffset:[-14,-32],controls:".magnetic-pendulum-controls",onResize(f,i,p){t.resize(i,p),r.updateScales(t.elements.plot.scale("x"),t.elements.plot.scale("y")),d.dirty=!0}})),{figure:c}},inputs:["html","stack","display","expandable","width","axes","renderState"],outputs:["figure"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-30"),expanded:[],variables:[]},{id:30,body:(e,t,n,o)=>{const a=e`<div class="magnetic-pendulum-controls"></div>`;function r(b){return a.appendChild(b),t.input(b)}const d=r(n.range([.001*0,1],{label:"pendulum height, h",value:.5})),c=r(n.range([1e-8,1],{label:"friction",value:.2})),f=r(n.range([1e-6,.01],{transform:Math.log,label:"tolerance",value:3e-4})),i=r(n.range([0,400],{label:"integration steps",value:120,step:1})),p=r(n.range([2,10],{label:"Magnet count",value:3,step:1})),y=r(n.checkbox(["Draw trajectory"],{value:["Draw trajectory"]}));return o(a),{controlsContainer:a,ctrl:r,h:d,b:c,tolerance:f,steps:i,N:p,opts:y}},inputs:["html","Generators","Inputs","display"],outputs:["controlsContainer","ctrl","h","b","tolerance","steps","N","opts"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-10"),expanded:[],variables:[]},{id:10,body:(e,t)=>e`For two-dimensional position ${t`\mathbf{x}`}, friction ${t`b`}, and magnets ${t`\mathbf{X}_n`}, the pendulum moves according to the equations`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});l({root:document.getElementById("cell-11"),expanded:[],variables:[]},{id:11,body:(e,t,n)=>e`${t.block`
\frac{d^2 \mathbf{x}}{dt^2} + b \frac{d\mathbf{x}}{dt} + \mathbf{x} = \sum_{n=1}^{${n}} \frac{\mathbf{X}_n - x}{\left(|\mathbf{X}_n - \mathbf{x}|^2 + h^2\right)^{5/2}}.
`}`,inputs:["md","tex","N"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});l({root:document.getElementById("cell-12"),expanded:[],variables:[]},{id:12,body:(e,t)=>e`Pendulum height ${t`h`} means the bottom of the pendulum is elevated slightly above the magnets so that it doesn't experience infinite acceleration when it gets close.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});l({root:document.getElementById("cell-49"),expanded:[],variables:[]},{id:49,body:e=>{const t=Array.from({length:e}).map((o,a)=>a),n=`vec4 deriv (vec4 y) {
  vec2 pos = y.xy;
  vec2 vel = y.zw;
  ${t.map(o=>`vec2 r${o} = p${o} - pos;`).join(`
  `)}
  ${t.map(o=>`float d${o} = dot(r${o}, r${o}) + h2;`).join(`
  `)}
  vec2 force = ${t.map(o=>`r${o} / (d${o} * d${o} * sqrt(d${o}))`).join(` +
               `)};
  return vec4(vel, force - b * vel - pos);
}`;return{iDeriv:t,glslDeriv:n}},inputs:["N"],outputs:["iDeriv","glslDeriv"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-55"),expanded:[],variables:[]},{id:55,body:(e,t)=>e`\`\`\`wgsl
${t}
\`\`\``,inputs:["md","wgslDeriv"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});l({root:document.getElementById("cell-43"),expanded:[],variables:[]},{id:43,body:(e,t)=>e`Given zero velocity and starting position \`xy\`, the final iteration loop is reproduced below. We start by packing the state into a \`vec4<f32>\`. We update the state ${t} times, overwriting the state and mutating \`dt\` on each step.`,inputs:["md","steps"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});l({root:document.getElementById("cell-45"),expanded:[],variables:[]},{id:45,body:(e,t)=>e`\`\`\`wgsl
var y = vec4<f32>(xy, 0.0, 0.0);
var dt = 0.01;
for (var i = 0; i < ${t}; i++) {
  let result = rk45(y, dt);
  y = result.y;
  dt = result.dt;
}
\`\`\``,inputs:["md","steps"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});l({root:document.getElementById("cell-67"),expanded:[],variables:[]},{id:67,body:e=>{const t=Array.from({length:e}).map((a,r)=>r),n=`float quasirandom (int n) {
  return fract(0.5 + ${1/1.618033988749895} * float(n));
}
vec3 palette(float t) {
  const vec3 a = vec3(0.5, 0.5, 0.5);
  const vec3 b = vec3(0.5, 0.5, 0.5);
  const vec3 c = vec3(1.0, 1.0, 1.0);
  const vec3 d = vec3(0.00, 0.33, 0.67);
  return a + b * cos(6.283185 * (c * t + d));
}`,o=`vec3 computeWeightedColor (vec2 y) {
  ${t.map(a=>`vec2 r${a} = y - p${a};`).join(`
  `)}
  ${t.map(a=>`float w${a} = 1.0 / dot(r${a}, r${a}); w${a} *= w${a};`).join(`
  `)}
  return (
    ${t.map(a=>`w${a} * mix(palette(0.63 + quasirandom(${a})), vec3(0.9), 0.35)`).join(` +
    `)}
  ) / (${t.map(a=>`w${a}`).join(" + ")});
}`;return{iPalette:t,glslPalette:n,glslScheme:o}},inputs:["N"],outputs:["iPalette","glslPalette","glslScheme"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-68"),expanded:[],variables:[]},{id:68,body:(e,t)=>e`\`\`\`wgsl
${t}
\`\`\``,inputs:["md","wgslPalette"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});l({root:document.getElementById("cell-69"),expanded:[],variables:[]},{id:69,body:(e,t)=>e`\`\`\`wgsl
${t}
\`\`\``,inputs:["md","wgslScheme"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});l({root:document.getElementById("cell-7"),expanded:[],variables:[]},{id:7,body:async(e,t)=>{const{ode45:n}=await S(()=>import("https://api.observablehq.com/@rreusser/integration.js?v=4"),[]).then(o=>{const a={},r=e.module(o.default),d=e.module();if(!r.defines("ode45"))throw new SyntaxError("export 'ode45' not found");return d.variable(a.ode45=t()).import("ode45",r),a});return{ode45:n}},inputs:["__ojs_runtime","__ojs_observer"],outputs:["ode45"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-2"),expanded:[],variables:[]},{id:2,body:async()=>{const[{createElementStack:e},{createWebGPUContext:t,webgpuElement:n,webgpuAxesViewport:o},{createZoomableAxes:a},{expandable:r}]=await Promise.all([S(()=>import("./element-stack-BU40TvN2.js"),[]).then(d=>{if(!("createElementStack"in d))throw new SyntaxError("export 'createElementStack' not found");return d}),S(()=>import("./webgpu-canvas-GARrWAyr.js"),[]).then(d=>{if(!("createWebGPUContext"in d))throw new SyntaxError("export 'createWebGPUContext' not found");if(!("webgpuElement"in d))throw new SyntaxError("export 'webgpuElement' not found");if(!("webgpuAxesViewport"in d))throw new SyntaxError("export 'webgpuAxesViewport' not found");return d}),S(()=>import("./zoomable-axes-BfGyq1bg.js"),[]).then(d=>{if(!("createZoomableAxes"in d))throw new SyntaxError("export 'createZoomableAxes' not found");return d}),S(()=>import("./expandable-GAgQDSaE.js"),[]).then(d=>{if(!("expandable"in d))throw new SyntaxError("export 'expandable' not found");return d})]);return{createElementStack:e,createWebGPUContext:t,webgpuElement:n,webgpuAxesViewport:o,createZoomableAxes:a,expandable:r}},inputs:[],outputs:["createElementStack","createWebGPUContext","webgpuElement","webgpuAxesViewport","createZoomableAxes","expandable"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-3"),expanded:[],variables:[]},{id:3,body:async(e,t)=>{const{device:n,canvasFormat:o}=await e();return t.then(()=>n.destroy()),{device:n,canvasFormat:o}},inputs:["createWebGPUContext","invalidation"],outputs:["device","canvasFormat"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-29"),expanded:[],variables:[]},{id:29,body:e=>{function t(n,o,a=[-3,3],r=[-3,3]){return e.plot({width:n,height:o,marginTop:10,marginRight:10,marginLeft:40,marginBottom:30,style:{backgroundColor:"transparent",maxWidth:"none",position:"absolute"},x:{domain:a,grid:!0,tickSpacing:100},y:{domain:r,grid:!0,tickSpacing:100}})}return{createPlot:t}},inputs:["Plot"],outputs:["createPlot"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-5"),expanded:[],variables:[]},{id:5,body:(e,t,n,o,a,r)=>({stack:e({layers:[{id:"webgpu",element:t(n,o,{alphaMode:"premultiplied"})},{id:"plot",element:({width:c,height:f})=>a(c,f)},{id:"svg",element:({current:c,width:f,height:i})=>(c?r.select(c):r.create("svg")).attr("width",f).attr("height",i).node()}]})}),inputs:["createElementStack","webgpuElement","device","canvasFormat","createPlot","d3"],outputs:["stack"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-8"),expanded:[],variables:[]},{id:8,body:(e,t,n,o,a)=>({axes:e({d3:t,element:n.elements.svg,xScale:n.elements.plot.scale("x"),yScale:n.elements.plot.scale("y"),aspectRatio:1,onChange:({xDomain:d,yDomain:c})=>{o.dirty=!0;const f=a(n.width,n.height,d,c);n.elements.plot.replaceWith(f),n.elements.plot=f,n.dispatchEvent(new CustomEvent("update"))}})}),inputs:["createZoomableAxes","d3","stack","renderState","createPlot"],outputs:["axes"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-18"),expanded:[],variables:[]},{id:18,body:e=>({gpuContext:e.elements.webgpu._gpuContext,renderState:{dirty:!0}}),inputs:["stack"],outputs:["gpuContext","renderState"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-27"),expanded:[],variables:[]},{id:27,body:e=>({magnets:Array.from({length:e}).map((n,o)=>({index:o,x:Math.sin(2*Math.PI*o/e),y:Math.cos(2*Math.PI*o/e)}))}),inputs:["N"],outputs:["magnets"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-24"),expanded:[],variables:[]},{id:24,body:(e,t,n,o,a)=>{function r(c,[f,i,p,y]){let b=0,m=0;for(let s=0;s<e.length;s++){const v=e[s].x-f,x=e[s].y-i,h=v*v+x*x+t*t,k=1/(h*h*Math.sqrt(h));b+=v*k,m+=x*k}c[0]=p,c[1]=y,c[2]=b-n*p-f,c[3]=m-n*y-i}function d([c,f]){if(!~o.indexOf("Draw trajectory")||isNaN(c))return[];const i={y:[c,f,0,0],t:0},p=[{x:i.y[0],y:i.y[1]}];for(let y=0;y<2e3&&!i.limitReached;y++)a(i,r,{tLimit:50,tolerance:2e-6}),p.push({x:i.y[0],y:i.y[1]});return p}return{deriv:r,computeTrajectory:d}},inputs:["magnets","h","b","opts","ode45"],outputs:["deriv","computeTrajectory"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-26"),expanded:[],variables:[]},{id:26,body:(e,t,n,o,a,r)=>{{let p=function(m){return e.line().x(({x:s})=>o.xScale(s)).y(({y:s})=>o.yScale(s))(m)},y=function(m){i.selectAll(".trajectorybg").data([m||[]]).join(s=>s.append("path").style("fill","none").style("stroke-width",5).style("stroke","rgba(255,255,255,0.6)").attr("class","trajectorybg").attr("d",p),s=>s.attr("d",p)),i.selectAll(".trajectory").data([m||[]]).join(s=>s.append("path").style("fill","none").style("stroke-width",2).style("stroke","blue").attr("class","trajectory").attr("d",p),s=>s.attr("d",p))},b=function(){const[m,s]=o.xRange,[v,x]=o.yRange;f.attr("x",Math.min(m,s)).attr("y",Math.min(v,x)).attr("width",Math.abs(s-m)).attr("height",Math.abs(x-v)),i.selectAll("circle.magnet").attr("cx",h=>o.xScale(h.x)).attr("cy",h=>o.yScale(h.y))};const d=e.select(t.elements.svg),f=d.selectAll("defs").data([0]).join("defs").selectAll("clipPath#viewport-clip").data([0]).join("clipPath").attr("id","viewport-clip").selectAll("rect").data([0]).join("rect"),i=d.selectAll("g.clipped").data([0]).join("g").attr("class","clipped").attr("clip-path","url(#viewport-clip)");d.on("mousemove",m=>{y(n([o.xScale.invert(m.offsetX),o.yScale.invert(m.offsetY)]))}),y([]),i.selectAll("circle.magnet").data(a).join(m=>m.append("circle").attr("class","magnet").attr("r",5).style("fill","black").style("stroke","white").style("stroke-width",2).style("cursor","move").call(e.drag().subject(function(s,v){return{x:o.xScale(v.x),y:o.yScale(v.y)}}).on("start",function(){e.select(this).attr("cursor","grabbing")}).on("drag",function(s,v){v.x=o.xScale.invert(s.x),v.y=o.yScale.invert(s.y),b(),y([]),r.dirty=!0}).on("end",function(){e.select(this).attr("cursor","move")}))),b(),t.addEventListener("update",()=>{b(),y([])})}},inputs:["d3","stack","computeTrajectory","axes","magnets","renderState"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-21"),expanded:[],variables:[]},{id:21,body:(e,t,n,o,a,r,d,c,f,i,p,y)=>{const b=`fn deriv(y: vec4<f32>) -> vec4<f32> {
  let pos = y.xy;
  let vel = y.zw;
  ${e.map(u=>`let r${u} = uniforms.magnets[${u}].xy - pos;`).join(`
      `)}
  ${e.map(u=>`let d${u} = dot(r${u}, r${u}) + uniforms.h2;`).join(`
      `)}
  let force = ${e.map(u=>`r${u} / (d${u} * d${u} * sqrt(d${u}))`).join(` +
                 `)};
  return vec4<f32>(vel, force - uniforms.b * vel - pos);
}`,m=`fn quasirandom(n: i32) -> f32 {
  return fract(0.5 + ${1/1.618033988749895} * f32(n));
}
fn palette(t: f32) -> vec3<f32> {
  let a = vec3<f32>(0.5, 0.5, 0.5);
  let b = vec3<f32>(0.5, 0.5, 0.5);
  let c = vec3<f32>(1.0, 1.0, 1.0);
  let d = vec3<f32>(0.00, 0.33, 0.67);
  return a + b * cos(6.283185 * (c * t + d));
}`,s=`fn computeWeightedColor(y: vec2<f32>) -> vec3<f32> {
  ${t.map(u=>`let r${u} = y - uniforms.magnets[${u}].xy;`).join(`
      `)}
  ${t.map(u=>`var w${u} = 1.0 / dot(r${u}, r${u}); w${u} *= w${u};`).join(`
      `)}
  return (
    ${t.map(u=>`w${u} * mix(palette(0.63 + quasirandom(${u})), vec3<f32>(0.9), 0.35)`).join(` +
        `)}
  ) / (${t.map(u=>`w${u}`).join(" + ")});
}`,v=`
  struct Uniforms {
    viewInverse: mat4x4<f32>,
    h2: f32,
    b: f32,
    tol2: f32,
    discardFails: u32,
    magnets: array<vec4<f32>, ${n}>,  // Only .xy used, but vec4 required for 16-byte alignment
  };

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) xy: vec2<f32>,
  };

  @vertex
  fn vertex(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    // Generate fullscreen triangle covering clip space
    // Vertices: (-1,-1), (3,-1), (-1,3)
    let x = f32((vertexIndex << 1u) & 2u) * 2.0 - 1.0;
    let y = f32(vertexIndex & 2u) * 2.0 - 1.0;

    var output: VertexOutput;
    // Transform through viewInverse to get data coordinates
    let dataCoord = uniforms.viewInverse * vec4<f32>(x, y, 0.0, 1.0);
    output.xy = dataCoord.xy;
    // WebGPU clips space has Y up, framebuffer has Y down - the viewport handles this
    output.position = vec4<f32>(x, y, 0.0, 1.0);
    return output;
  }

  ${b}

  const safety: f32 = 0.95;
  const maxDecrease: f32 = 0.02;
  const maxIncrease: f32 = 50.0;

  struct RK45Result {
    y: vec4<f32>,
    dt: f32,
  };

  fn rk45(y_in: vec4<f32>, dt_in: f32) -> RK45Result {
    var y = y_in;
    var dt = dt_in;

    // Fifth order estimate using constants for the Cash-Karp method
    let k1 = deriv(y);
    let k2 = deriv(y + dt * 0.2 * k1);
    let k3 = deriv(y + dt * (0.075 * k1 + 0.225 * k2));
    let k4 = deriv(y + dt * (0.3 * k1 - 0.9 * k2 + 1.2 * k3));
    let k5 = deriv(y + dt * (-0.203703703703703703 * k1 + 2.5 * k2 - 2.592592592592592592 * k3 + 1.296296296296296296 * k4));
    let k6 = deriv(y + dt * (0.029495804398148148 * k1 + 0.341796875 * k2 + 0.041594328703703703 * k3 + 0.400345413773148148 * k4 + 0.061767578125 * k5));

    // Estimate the error using the embedded fourth order method
    let tmp = dt * (0.004293774801587301 * k1 - 0.018668586093857832 * k3 + 0.034155026830808080 * k4 + 0.019321986607142857 * k5 - 0.039102202145680406 * k6);
    let err2 = dot(tmp, tmp);

    // Accept the step if error is within tolerance
    let accept = err2 <= uniforms.tol2;
    if (accept || uniforms.discardFails == 0u) {
      y = y + dt * (0.097883597883597883 * k1 + 0.402576489533011272 * k3 + 0.210437710437710437 * k4 + 0.289102202145680406 * k6);
    }

    // Adjust dt according to the estimate
    let exp = select(0.1, 0.125, accept);
    dt = dt * clamp(safety * pow(uniforms.tol2 / err2, exp), maxDecrease, maxIncrease);

    return RK45Result(y, dt);
  }

  ${m}
  ${s}

  @fragment
  fn fragment(@location(0) xy: vec2<f32>) -> @location(0) vec4<f32> {
    var y = vec4<f32>(xy, 0.0, 0.0);
    var dt = 0.01;
    for (var i = 0; i < ${o}; i++) {
      let result = rk45(y, dt);
      y = result.y;
      dt = result.dt;
    }
    return vec4<f32>(computeWeightedColor(y.xy), 1.0);
  }
`,x=a.createShaderModule({label:"magnetic-pendulum-shader",code:v}),h=a.createBindGroupLayout({label:"magnetic-pendulum-bind-group-layout",entries:[{binding:0,visibility:r.VERTEX|r.FRAGMENT,buffer:{type:"uniform"}}]}),k=a.createPipelineLayout({label:"magnetic-pendulum-pipeline-layout",bindGroupLayouts:[h]}),j=a.createRenderPipeline({label:"magnetic-pendulum-pipeline",layout:k,vertex:{module:x,entryPoint:"vertex"},fragment:{module:x,entryPoint:"fragment",targets:[{format:d}]},primitive:{topology:"triangle-list"}}),P=Math.ceil((80+n*16)/16)*16,A=a.createBuffer({label:"magnetic-pendulum-uniforms",size:P,usage:c.UNIFORM|c.COPY_DST}),C=a.createBindGroup({label:"magnetic-pendulum-bind-group",layout:h,entries:[{binding:0,resource:{buffer:A}}]});function R(u,I,w,_,g,L){const B=new ArrayBuffer(P),$=new Float32Array(B),F=new Uint32Array(B);$.set(u,0),$[16]=I*I,$[17]=w,$[18]=_*_,F[19]=L?1:0;for(let E=0;E<g.length;E++)$[20+E*4]=g[E].x,$[20+E*4+1]=g[E].y,$[20+E*4+2]=0,$[20+E*4+3]=0;a.queue.writeBuffer(A,0,B)}function M(u){R(u.viewInverse,u.h,u.b,u.tolerance,u.magnets,u.discard);const I=a.createCommandEncoder(),w=I.beginRenderPass({colorAttachments:[{view:f.getCurrentTexture().createView(),loadOp:"clear",storeOp:"store",clearValue:{r:0,g:0,b:0,a:0}}]}),_=i.elements.webgpu,g=p(y,devicePixelRatio,_.height);w.setViewport(g.x,g.y,g.width,g.height,0,1),w.setScissorRect(Math.floor(g.x),Math.floor(g.y),Math.floor(g.width),Math.floor(g.height)),w.setPipeline(j),w.setBindGroup(0,C),w.draw(3),w.end(),a.queue.submit([I.finish()])}return{wgslDeriv:b,wgslPalette:m,wgslScheme:s,shaderCode:v,shaderModule:x,bindGroupLayout:h,pipelineLayout:k,pipeline:j,uniformBufferSize:P,uniformBuffer:A,bindGroup:C,updateUniforms:R,drawField:M}},inputs:["iDeriv","iPalette","N","steps","device","GPUShaderStage","canvasFormat","GPUBufferUsage","gpuContext","stack","webgpuAxesViewport","axes"],outputs:["wgslDeriv","wgslPalette","wgslScheme","shaderCode","shaderModule","bindGroupLayout","pipelineLayout","pipeline","uniformBufferSize","uniformBuffer","bindGroup","updateUniforms","drawField"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-20"),expanded:[],variables:[]},{id:20,body:(e,t,n,o,a,r,d,c,f)=>{e.dirty=!0;let i=null;function p(){if(!e.dirty){i=requestAnimationFrame(p);return}try{t({viewInverse:n.viewInverse,h:o,b:a,magnets:r,tolerance:d,discard:!c.includes("Use steps which exceed tolerance")}),e.dirty=!1}catch(y){console.error(y),i=null;return}i=requestAnimationFrame(p)}return i=requestAnimationFrame(p),f.then(()=>{i!==null&&(cancelAnimationFrame(i),i=null)}),{animFrameId:i,renderLoop:p}},inputs:["renderState","drawField","axes","h","b","magnets","tolerance","opts","invalidation"],outputs:["animFrameId","renderLoop"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-59"),expanded:[],variables:[]},{id:59,body:()=>{function e(n){return n<=.04045?n/12.92:Math.pow((n+.055)/1.055,2.4)}function t(n){n=n.replace(/^#/,""),n.length===3&&(n=n.split("").map(d=>d+d).join(""));const o=e(parseInt(n.slice(0,2),16)/255),a=e(parseInt(n.slice(2,4),16)/255),r=e(parseInt(n.slice(4,6),16)/255);return[o,a,r]}return{srgbToLinear:e,hexToLinearRgb:t}},inputs:[],outputs:["srgbToLinear","hexToLinearRgb"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});l({root:document.getElementById("cell-60"),expanded:[],variables:[]},{id:60,body:(e,t)=>({colorScheme:e.schemeCategory10.map(t).map(([o,a,r])=>`vec3(${o},${a},${r})`)}),inputs:["d3","hexToLinearRgb"],outputs:["colorScheme"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});
