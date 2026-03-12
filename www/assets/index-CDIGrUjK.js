import{d as s,_}from"./index-ByB2dbry.js";s({root:document.getElementById("cell-1251"),expanded:[],variables:[]},{id:1251,body:(e,a)=>e`This notebook visualizes the strange attractors of [Clifford Pickover](http://paulbourke.net/fractals/clifford/) and [Peter de Jong](http://paulbourke.net/fractals/peterdejong/). You can pan and zoom with the mouse or a touch screen. Clifford attractors are defined by

${a.block`\begin{aligned}
x_{n + 1} &= \sin(a y_n) + c \cos(a x_n) \\
y_{n + 1} &= \sin(b x_n) + d \cos(b y_n)
\end{aligned}`}

while de Jong attractors are defined by

${a.block`\begin{aligned}
x_{n + 1} &= \sin(a y_n) - c \cos(b x_n) \\
y_{n + 1} &= \sin(c x_n) - d \cos(d y_n).
\end{aligned}`}

A grid of points is randomly offset and iterated many times. The results are accumulated onto a WebGL texture, effectively computing a histogram of the attractor. Single precision isn't quite adequate, so you can switch to CPU mode for a final render if you're willing to wait a bit longer for it to converge. Point density is computed using the formula in [this notebook](https://observablehq.com/@rreusser/selecting-the-right-opacity-for-2d-point-clouds?collection=@rreusser/writeups).

Color comes from the distance traveled by the most recent iteration. Each pixel accumulates both the RGB color and a hit count. Lightness is computed in the [YUV color space](https://en.wikipedia.org/wiki/YUV) from the logarithm of the hit count, while the hue comes from the average accumulated color.

For more on computing attractors in WebGL, Mike Bostock's [Making WebGL Dance](https://observablehq.com/@mbostock/making-webgl-dance) is a great walkthrough. See also his [Clifford Attractor](https://observablehq.com/@mbostock/clifford-attractor) series and Yuri Vishnevsky's [Strange Attractors](https://observablehq.com/@twitter/strange-attractors).`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});s({root:document.getElementById("cell-1252"),expanded:[],variables:[]},{id:1252,body:async()=>{const[{reglCanvas:e},{default:a},{default:n},r]=await Promise.all([_(()=>import("./regl-canvas-4j8SAjSv.js"),[]).then(t=>{if(!("reglCanvas"in t))throw new SyntaxError("export 'reglCanvas' not found");return t}),_(()=>import("./fine-range-CNLDYXvU.js"),[]).then(t=>{if(!("default"in t))throw new SyntaxError("export 'default' not found");return t}),_(()=>import("https://cdn.jsdelivr.net/npm/regl@2.1.1/+esm"),[]).then(t=>{if(!("default"in t))throw new SyntaxError("export 'default' not found");return t}),_(()=>import("https://cdn.jsdelivr.net/npm/d3@7/+esm"),[])]);return{reglCanvas:e,FineRange:a,createREGL:n,d3:r}},inputs:[],outputs:["reglCanvas","FineRange","createREGL","d3"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-365"),expanded:[],variables:[]},{id:365,body:function(e,a,n){return e`\mathrm{accumulated\;points} = ${(a*n*n).toLocaleString()}`},inputs:["tex","accumulateCount","stateSize"],outputs:void 0,output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});s({root:document.getElementById("cell-81"),expanded:[],variables:[]},{id:81,body:(e,a,n,r)=>{const t=e(a.radio(["Clifford","de Jong"],{label:"Type",value:n.has("type")?n.get("type"):"Clifford"})),o=e(r(a.range,[-2.5,2.5],{value:n.has("a")?+n.get("a"):-1.85,label:"a",step:.001,width:400})),i=e(r(a.range,[-2.5,2.5],{value:n.has("b")?+n.get("b"):-2.5,label:"b",step:.001,width:400})),u=e(r(a.range,[-2.5,2.5],{value:n.has("c")?+n.get("c"):-1.05,label:"c",step:.001,width:400})),d=e(r(a.range,[-2.5,2.5],{value:n.has("d")?+n.get("d"):.585,label:"d",step:.001,width:400})),l=e(a.checkbox(["Simulate"],{value:["Simulate"]}));return{type:t,a:o,b:i,c:u,d,simulate:l}},inputs:["view","Inputs","parsedURL","FineRange"],outputs:["type","a","b","c","d","simulate"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-1253"),expanded:[],variables:[]},{id:1253,body:(e,a,n)=>({_regl:e(a(n,{attributes:{antialias:!1,depthStencil:!1,preserveDrawingBuffer:!0},extensions:["OES_texture_float","OES_texture_half_float"]}))}),inputs:["view","reglCanvas","createREGL"],outputs:["_regl"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-1254"),expanded:[],variables:[]},{id:1254,body:(e,a)=>({regl:function(){const r=e._gl.canvas,t=e.attachResize(a.width,a.height);return r.style.maxWidth="100%",r.style.height="auto",r.style.aspectRatio=`${a.width} / ${a.height}`,r.style.cursor="move",r.style.border="1px solid #ccc",t}()}),inputs:["_regl","viewport"],outputs:["regl"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-649"),expanded:[],variables:[]},{id:649,body:(e,a,n)=>{const r=e(a.checkbox(["Invert","Flip colorscale"],{value:[...n.get("invert")==="true"?["Invert"]:[],...n.get("flip")==="true"?["Flip colorscale"]:[]]})),t=e(a.range([-.5,1.5],{value:n.has("brightness")?+n.get("brightness"):.3,label:"Brightness"})),o=e(a.range([.1,2],{value:n.has("contrast")?+n.get("contrast"):1,label:"Contrast"})),i=e(a.range([0,1],{value:n.has("saturation")?+n.get("saturation"):.8,label:"Saturation"})),u=e(a.range([.1,1],{value:n.has("dynamicRange")?+n.get("dynamicRange"):.2,label:"Dynamic range compression",transform:Math.log})),d=e(a.range([.1,2],{value:n.has("colorSpeed")?+n.get("colorSpeed"):.22,label:"Color speed",transform:Math.log})),l=e(a.range([0,360],{value:n.has("colorPhase")?+n.get("colorPhase"):180,label:"Color phase"})),f=e(a.range([.1,10],{value:n.has("gamma")?+n.get("gamma"):2.2,label:"Gamma",transform:Math.log})),p=e(a.range([5e5,4e6],{value:5e5,label:"Batch size",transform:Math.log,step:2})),m=e(a.range([1,50],{value:25,label:"Iterations",step:1})),b=e(a.range([0,3],{value:1.5,label:"AA Jitter (pixels)",step:.1})),v=a.select(["256 × 256","512 × 512","1024 × 1024","2048 × 2048","1680 × 1050","page width"],{value:"page width",label:`Size (dpi = ${window.devicePixelRatio})`}),c=e(v),h=e(a.radio(["cpu","gpu"],{value:"gpu",label:"Computation mode"}));return{opts:r,brightness:t,contrast:o,saturation:i,dynamicRange:u,colorSpeed:d,colorPhase:l,gamma:f,batchSize:p,iterations:m,jitter:b,sizeInput:v,size:c,mode:h}},inputs:["view","Inputs","parsedURL"],outputs:["opts","brightness","contrast","saturation","dynamicRange","colorSpeed","colorPhase","gamma","batchSize","iterations","jitter","sizeInput","size","mode"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-650"),expanded:[],variables:[]},{id:650,body:(e,a,n,r)=>{const t=["float","half float"].filter(i=>e(a,i)),o=t.length>0?n(r.radio(t,{value:t[0],label:"Float format"})):(()=>{throw new Error("Neither float nor half-float framebuffers are supported on this device")})();return{supportedFormats:t,floatFormat:o}},inputs:["canWriteToFBOOfType","regl","view","Inputs"],outputs:["supportedFormats","floatFormat"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-651"),expanded:[],variables:[]},{id:651,body:function(e,a){return e==="half float"?a`<p><em><small>Note: Half-float precision may cause color banding in high-density regions. For best results, view on a device that supports single-precision float.</small></em></p>`:null},inputs:["floatFormat","html"],outputs:void 0,output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});s({root:document.getElementById("cell-1753"),expanded:[],variables:[]},{id:1753,body:function(a,n,r,t,o,i,u,d,l,f,p,m,b){const v=new URL(document.baseURI),c=v.searchParams;return c.set("type",a),c.set("a",n),c.set("b",r),c.set("c",t),c.set("d",o),c.set("brightness",i),c.set("contrast",u),c.set("gamma",d),c.set("saturation",l),c.set("colorSpeed",f),c.set("colorPhase",p),c.set("invert",!!~m.indexOf("Invert")),c.set("flip",!!~m.indexOf("Flip colorscale")),b`<a href="${v.toString()}">🔗 Link to this configuration</a>`},inputs:["type","a","b","c","d","brightness","contrast","gamma","saturation","colorSpeed","colorPhase","opts","html"],outputs:void 0,output:"link",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});s({root:document.getElementById("cell-1594"),expanded:[],variables:[]},{id:1594,body:function(e,a,n,r,t,o,i,u){const d=e.button("Download PNG"),l=`${a==="Clifford"?"clifford":"de-jong"}_a${n.toFixed(4)}_b${r.toFixed(4)}_c${t.toFixed(4)}_d${o.toFixed(4)}.png`;return d.addEventListener("input",()=>{i(u._gl.canvas.toDataURL(),l)}),d},inputs:["Inputs","type","a","b","c","d","downloadURI","regl"],outputs:void 0,output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});s({root:document.getElementById("cell-162"),expanded:[],variables:[]},{id:162,body:function(a){return a.button("Restart")},inputs:["Inputs"],outputs:void 0,output:"viewof$restart",assets:void 0,autodisplay:!0,autoview:!0,automutable:!1});s({root:document.getElementById("cell-157"),expanded:[],variables:[]},{id:157,body:function(){return 0},inputs:[],outputs:void 0,output:"mutable accumulateCount",assets:void 0,autodisplay:!0,autoview:!1,automutable:!0});s({root:document.getElementById("cell-865"),expanded:[],variables:[]},{id:865,body:function(){return!0},inputs:[],outputs:void 0,output:"mutable dirty",assets:void 0,autodisplay:!0,autoview:!1,automutable:!0});s({root:document.getElementById("cell-1767"),expanded:[],variables:[]},{id:1767,body:e=>({parsedURL:new Map(Object.entries(e(document.location.search)))}),inputs:["parseQueryString"],outputs:["parsedURL"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-1702"),expanded:[],variables:[]},{id:1702,body:(e,a)=>({shape:e==="page width"?[a,a]:e.split("×").map(r=>parseInt(r.trim(),10))}),inputs:["size","width"],outputs:["shape"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-1288"),expanded:[],variables:[]},{id:1288,body:function(e,a,n,r,t,o,i){i.value=!0},inputs:["opts","brightness","contrast","gamma","saturation","dynamicRange","mutable$dirty"],outputs:void 0,output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});s({root:document.getElementById("cell-1478"),expanded:[],variables:[]},{id:1478,body:e=>({iterationArray:new Array(e*4).fill(0)}),inputs:["batchSize"],outputs:["iterationArray"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-1485"),expanded:[],variables:[]},{id:1485,body:(e,a,n)=>({cpuPositionBuffer:function(){const t=e.buffer(a);return n.then(()=>t.destroy()),t}()}),inputs:["regl","iterationArray","invalidation"],outputs:["cpuPositionBuffer"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-1473"),expanded:[],variables:[]},{id:1473,body:(e,a,n,r,t)=>{function o(i){let u,d,l,f,p,m;e==="Clifford"?(u=a,d=n,l=a,f=r,p=t,m=r):(u=a,d=-1,l=r,f=n,p=-1,m=t);for(let b=0;b<i.length;b+=4){let v=i[b],c=i[b+1],h=Math.sin(u*c)+d*Math.cos(l*v),y=Math.sin(f*v)+p*Math.cos(m*c),w=h-v,g=y-c;i[b]=h,i[b+1]=y,i[b+2]=Math.sqrt(w*w+g*g),i[b+3]=b>>2}}return{iterate:o}},inputs:["type","a","c","b","d"],outputs:["iterate"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-1515"),expanded:[],variables:[]},{id:1515,body:(e,a,n,r,t,o)=>{function i(u){let d=Math.random()*2-1,l=Math.random()*2-1,f=Math.sqrt(e),p,m,b,v,c,h;a==="Clifford"?(p=n,m=r,b=n,v=t,c=o,h=t):(p=n,m=-1,b=t,v=r,c=-1,h=o);for(let y=0;y<u.length;y+=4){let w=u.length*Math.random(),g=4*(w/2%f)/f+d,x=4*w/2/f/f+l;for(let S=0;S<15;S++){let B=Math.sin(p*x)+m*Math.cos(b*g),I=Math.sin(v*g)+c*Math.cos(h*x);g=B,x=I}u[y]=g,u[y+1]=x}}return{cpuInitialize:i}},inputs:["batchSize","type","a","c","b","d"],outputs:["cpuInitialize"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-1496"),expanded:[],variables:[]},{id:1496,body:(e,a)=>({cpuAccumulate:e({vert:`
  precision highp float;
  attribute vec4 position;
  uniform mat3 view3;
  uniform float colorSpeed, colorPhase, pointSize, colorSign, jitter;
  uniform vec2 resolution;
  varying vec3 color;
  #define PI ${Math.PI}

  vec3 colorscale (float t) {
    return 0.5 + 0.5 * vec3(
      cos((2.0 * PI) * t - colorPhase),
      cos((2.0 * PI) * (t - 1.0 / 3.0) - colorPhase),
      cos((2.0 * PI) * (t - 2.0 / 3.0) - colorPhase)
    );
  }

  const float g = 1.32471795724474602596;
  const vec2 q = vec2(1.0 / g, 1.0/(g*g));
  vec2 qrand2(float n) {
    return fract(0.5 + q * n);
  }

  void main () {    
    color = colorscale(position.z * colorSpeed * colorSign);
    vec2 xy = (view3 * vec3(position.xy, 1)).xy;
    gl_Position = vec4(xy, 0, 1);
    gl_PointSize = pointSize;

    gl_Position.xy += jitter * (qrand2(position.w) - 0.5) / resolution;
  }`,frag:`
  precision lowp float;
  varying vec3 color;
  uniform highp float pointSize;
  void main () {
    gl_FragColor = vec4(1, color) / (pointSize * pointSize);
  }`,attributes:{position:e.prop("cpuBuffer")},uniforms:{resolution:({framebufferWidth:r,framebufferHeight:t})=>[r,t],colorSpeed:e.prop("colorSpeed"),colorPhase:e.prop("colorPhase"),colorSign:e.prop("colorSign"),pointSize:e.prop("pointSize"),jitter:e.prop("jitter")},blend:{enable:!0,func:{srcRGB:1,srcAlpha:1,dstRGB:1,dstAlpha:1},equation:{rgb:"add",alpha:"add"}},framebuffer:e.prop("dst"),primitive:"points",depth:{enable:!1},count:a})}),inputs:["regl","batchSize"],outputs:["cpuAccumulate"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-906"),expanded:[],variables:[]},{id:906,body:(e,a,n)=>({scales:function(){const t=e.width/e.height,o=a.scaleLinear().range([0,n._gl.canvas.offsetWidth]).domain([-2.2*t,2.2*t]),i=a.scaleLinear().range([n._gl.canvas.offsetWidth,0]).domain([-2.2,2.2]);return{x:o,y:i,xOriginal:o.copy(),yOriginal:i.copy()}}()}),inputs:["viewport","d3","regl"],outputs:["scales"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-824"),expanded:[],variables:[]},{id:824,body:(e,a,n,r)=>({attachZoom:function(){function o(i,u,d,l,f){return e.zoom().on("zoom",function({transform:p}){let m;m=i.range().map(p.invertX,p),i.domain(d.domain()),i.domain(m.map(i.invert,i)),m=u.range().map(p.invertY,p),u.domain(l.domain()),u.domain(m.map(u.invert,u))})}e.select(a._gl.canvas).call(o(n.x,n.y,n.xOriginal,n.yOriginal).on("zoom.clearAccumulator",()=>{a.poll(),r()}))}()}),inputs:["d3","regl","scales","clearAccumulator"],outputs:["attachZoom"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-41"),expanded:[],variables:[]},{id:41,body:e=>({stateSize:Math.floor(Math.sqrt(e))}),inputs:["batchSize"],outputs:["stateSize"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-754"),expanded:[],variables:[]},{id:754,body:e=>({viewport:{width:e[0],height:e[1],dpi:devicePixelRatio,margin:{t:0,r:0,b:0,l:0}}}),inputs:["shape"],outputs:["viewport"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-934"),expanded:[],variables:[]},{id:934,body:()=>{function e(a){const n=a.x.domain()[1]-a.x.domain()[0],r=a.xOriginal.domain()[1]-a.xOriginal.domain()[0],t=a.y.domain()[1]-a.y.domain()[0],o=a.yOriginal.domain()[1]-a.yOriginal.domain()[0];return n*t/(r*o)}return{scaleFactor:e}},inputs:[],outputs:["scaleFactor"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-875"),expanded:[],variables:[]},{id:875,body:function(a,n,r){return function(){a.use(()=>n.clear({color:[0,0,0,0]})),r.value=0}},inputs:["accumulator","regl","mutable$accumulateCount"],outputs:void 0,output:"clearAccumulator",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});s({root:document.getElementById("cell-166"),expanded:[],variables:[]},{id:166,body:function(a,n,r,t,o,i,u,d,l,f,p,m,b,v,c,h){m==="cpu"&&b(v),c.poll(),h()},inputs:["restart","iterations","batchSize","jitter","type","a","b","c","d","colorSpeed","colorPhase","mode","cpuInitialize","iterationArray","regl","clearAccumulator"],outputs:void 0,output:"performInitialization",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});s({root:document.getElementById("cell-71"),expanded:[],variables:[]},{id:71,body:function(a,n,r,t,o,i,u,d,l,f,p,m,b,v,c,h,y,w,g,x,S,B,I,P,E,R,k,C,z,M,O,V,q,T){const F=a.frame(({tick:W})=>{try{(~n.indexOf("Simulate")||r.value===0)&&(r.value===1&&t.use(()=>a.clear({color:[0,0,0,0]})),o==="cpu"&&((r.value+1)%i===0&&u(d),l(d),f.subdata(d)),p(m,A=>{b(v.x,v.y,j=>{(o==="cpu"?c:h)({a:y,b:w,c:g,d:x,cpuBuffer:f,dst:t,colorSpeed:S,jitter:B,colorPhase:I*Math.PI/180,colorSign:~P.indexOf("Flip colorscale")?-1:1,pointSize:r.value===0?2:1})})}),E.value=!0,r.value=r.value+1),E.value&&(R({src:t,opacity:1,brightness:k,contrast:C,accumulatorCount:Math.max(1,r.value),batchSize:z*z,gamma:M,dynamicRange:O,scaleFactor:V(v),invert:!!~P.indexOf("Invert"),saturation:q}),E.value=!1)}catch(A){console.error(A),F.cancel()}});T.then(()=>F.cancel())},inputs:["regl","simulate","mutable$accumulateCount","accumulator","mode","iterations","cpuInitialize","iterationArray","iterate","cpuPositionBuffer","configureViewport","viewport","configureScales","scales","cpuAccumulate","gpuAccumulate","a","b","c","d","colorSpeed","jitter","colorPhase","opts","mutable$dirty","copyToScreen","brightness","contrast","stateSize","gamma","dynamicRange","scaleFactor","saturation","invalidation"],outputs:void 0,output:"performIteration",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});s({root:document.getElementById("cell-1365"),expanded:[],variables:[]},{id:1365,body:(e,a,n)=>({randobuffer:function(){const t=Float32Array.from(Array.from(Array(e).keys())),o=a.buffer(t);return n.then(()=>o.destroy()),o}()}),inputs:["batchSize","regl","invalidation"],outputs:["randobuffer"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-59"),expanded:[],variables:[]},{id:59,body:(e,a,n,r,t)=>({gpuAccumulate:e({vert:`
  precision highp float;
  attribute float n;
  uniform mat3 view3;
  uniform float a, b, c, d, jitter;
  uniform float colorSpeed, colorPhase, pointSize, sqrtBatchSize, colorSign;
  uniform vec2 offset, resolution;
  varying vec3 color;
  #define PI ${Math.PI}

${a==="Clifford"?`
      vec2 iterate (vec2 state) {
        return vec2(
          sin(a * state.y) + c * cos(a * state.x),
          sin(b * state.x) + d * cos(b * state.y)
        );
      }
`:`
      vec2 iterate (vec2 state) {
        return vec2(
          sin(a * state.y) - cos(b * state.x),
          sin(c * state.x) - cos(d * state.y)
        );
      }
`}

  vec3 colorscale (float t) {
    return 0.5 + 0.5 * vec3(
      cos((2.0 * PI) * t - colorPhase),
      cos((2.0 * PI) * (t - 1.0 / 3.0) - colorPhase),
      cos((2.0 * PI) * (t - 2.0 / 3.0) - colorPhase)
    );
  }

  const float g = 1.32471795724474602596;
  const vec2 q = vec2(1.0 / g, 1.0/(g*g));
  vec2 qrand2(float n) {
    return fract(0.5 + q * n);
  }


  void main () {
    vec2 p = 4.0 * vec2(mod(n, sqrtBatchSize), floor(n / sqrtBatchSize)) / sqrtBatchSize + offset;

    for (int i = 0; i < ${n-1}; i++) {
      p = iterate(p);
    }
    vec2 pn = iterate(p);
    float dist = length(p - pn);

    color = colorscale(dist * colorSpeed * colorSign);
    vec2 xy = (view3 * vec3(pn, 1)).xy;
    gl_Position = vec4(xy, 0, 1);
    gl_PointSize = pointSize;
    gl_Position.xy += jitter * (qrand2(n) - 0.5) / resolution;
  }`,frag:`
  precision lowp float;
  varying vec3 color;
  uniform highp float pointSize;
  void main () {
    gl_FragColor = vec4(1, color) / (pointSize * pointSize);
  }`,attributes:{n:r},uniforms:{resolution:({framebufferWidth:i,framebufferHeight:u})=>[i,u],offset:()=>[Math.random()*2-1,Math.random()*2-1],colorSpeed:e.prop("colorSpeed"),colorPhase:e.prop("colorPhase"),pointSize:e.prop("pointSize"),colorSign:e.prop("colorSign"),a:e.prop("a"),b:e.prop("b"),c:e.prop("c"),d:e.prop("d"),jitter:e.prop("jitter"),sqrtBatchSize:Math.floor(Math.sqrt(t))},blend:{enable:!0,func:{srcRGB:1,srcAlpha:1,dstRGB:1,dstAlpha:1},equation:{rgb:"add",alpha:"add"}},framebuffer:e.prop("dst"),primitive:"points",depth:{enable:!1},count:t})}),inputs:["regl","type","iterations","randobuffer","batchSize"],outputs:["gpuAccumulate"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-90"),expanded:[],variables:[]},{id:90,body:e=>({copyToScreen:e({vert:`
  precision highp float;
  varying vec2 uv;
  attribute vec2 xy;
  void main () {
    uv = 0.5 + 0.5 * xy;
    gl_Position = vec4(xy, 0, 1);
  }`,frag:`
  precision highp float;
  varying vec2 uv;
  uniform sampler2D src;
  uniform float opacity, brightness, contrast, gamma, scale, saturation, dynamicRange;
  uniform bool invert;

  vec3 rgb2yuv(vec3 rgb) {
    float y = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
    return vec3(y, 0.493 * (rgb.b - y), 0.877 * (rgb.r - y));
  }

  vec3 yuv2rgb(vec3 yuv) {
    return vec3(
      yuv.x + (1.0 / 0.877) * yuv.z,
      yuv.x - 0.39393 * yuv.y - 0.58081 * yuv.z,
      yuv.x + (1.0 / 0.493) * yuv.y
    );
  }

  // power smooth min (k=8)
  float smoothLimit(float x, float k) {
      x = 2.0 * x - 1.0;
      float a = pow(abs(x), 1.0 / k);
      return sign(x) * pow(a / (a + 1.0), k) * 0.5 + 0.5;
  }


  void main () {
    vec4 state = texture2D(src, uv);
    float density = state.r / scale;

    float v = density == 0.0 ? -20.0 : (log(density) - log(1.0)) / (log(1000.0) - log(1.0));
    float value = contrast * v + brightness;
    value = smoothLimit(value, dynamicRange);
    if (!invert) value = 1.0 - value;

    vec3 rgb = state.gba / max(state.r, 1.0);
    vec3 yuv = rgb2yuv(rgb);

    // Use the lightness from the overall density
    yuv.x = value;

    // Fade the saturation to zero at white and black:
    yuv.yz *= saturation * value * (1.0 - value) * 4.0;

    rgb = yuv2rgb(yuv);

    gl_FragColor = vec4(pow(rgb, vec3(1.0 / gamma)), 1.0);
  }`,attributes:{xy:[-4,-4,4,-4,0,4]},uniforms:{src:e.prop("src"),scale:(n,r)=>{const t=n.framebufferWidth*n.framebufferHeight;return r.accumulatorCount*r.batchSize/t*r.scaleFactor},brightness:(n,r)=>r.invert?r.brightness:1-r.brightness,dynamicRange:e.prop("dynamicRange"),contrast:e.prop("contrast"),opacity:e.prop("opacity"),gamma:e.prop("gamma"),invert:e.prop("invert"),saturation:e.prop("saturation")},count:3,depth:{enable:!1}})}),inputs:["regl"],outputs:["copyToScreen"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-10"),expanded:[],variables:[]},{id:10,body:(e,a)=>({accumulator:e.framebuffer({width:e._gl.canvas.width,height:e._gl.canvas.height,colorType:a,colorFormat:"rgba",depthStencil:!1})}),inputs:["regl","floatFormat"],outputs:["accumulator"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-752"),expanded:[],variables:[]},{id:752,body:(e,a)=>({configureViewport:e(a)}),inputs:["createReglViewportConfiguration","regl"],outputs:["configureViewport"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-748"),expanded:[],variables:[]},{id:748,body:(e,a)=>({configureScales:e(a)}),inputs:["createReglLinearScaleConfiguration","regl"],outputs:["configureScales"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-21"),expanded:[],variables:[]},{id:21,body:()=>{function e(a,n,r){r=r||2;for(var t=a*n*r,o=new Float32Array(t),i=0,u=0;u<t;i++,u+=r)o[u]=(i%a+.5)/a,o[u+1]=((i/a|0)+.5)/n;return o}return{createTextureLookupTable:e}},inputs:[],outputs:["createTextureLookupTable"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-790"),expanded:[],variables:[]},{id:790,body:(e,a,n,r,t)=>{function o(i){const u={view3:e(),inverseView3:e(),view:a(),inverseView:a()},d=i({context:{view3:i.prop("view3"),inverseView3:i.prop("inverseView3"),view:i.prop("view"),inverseView:i.prop("inverseView")},uniforms:{view3:i.prop("view3"),inverseView3:i.prop("inverseView3"),view:i.prop("view"),inverseView:i.prop("inverseView")}});return function(l,f,p){n(u.view3,l,f),r(u.inverseView3,u.view3),t(u.view,u.view3),t(u.inverseView,u.inverseView3),d(u,p)}}return{createReglLinearScaleConfiguration:o}},inputs:["mat3create","mat4create","mat3fromLinearScales","mat3invert","mat4fromMat3"],outputs:["createReglLinearScaleConfiguration"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-780"),expanded:[],variables:[]},{id:780,body:e=>{function a(n){e();let r=n({scissor:{enable:!0,box:{x:(t,o)=>t.pixelRatio*o.margin.l,y:(t,o)=>t.pixelRatio*o.margin.b,width:(t,o)=>t.framebufferWidth-t.pixelRatio*(o.margin.r+o.margin.l),height:(t,o)=>t.framebufferHeight-t.pixelRatio*(o.margin.t+o.margin.b)}},viewport:{x:(t,o)=>t.pixelRatio*o.margin.l,y:(t,o)=>t.pixelRatio*o.margin.b,width:(t,o)=>t.framebufferWidth-t.pixelRatio*(o.margin.r+o.margin.l),height:(t,o)=>t.framebufferHeight-t.pixelRatio*(o.margin.t+o.margin.b)},uniforms:{viewportResolution:(t,o)=>[t.viewportWidth,t.viewportHeight],framebufferResolution:t=>[t.framebufferWidth,t.framebufferHeight],inverseViewportResolution:(t,o)=>[1/t.viewportWidth,1/t.viewportHeight],inverseFramebufferResolution:t=>[1/t.framebufferWidth,1/t.framebufferHeight]}});return function(t,o){r(t,o)}}return{createReglViewportConfiguration:a}},inputs:["mat3create"],outputs:["createReglViewportConfiguration"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-2118"),expanded:[],variables:[]},{id:2118,body:()=>{function e(){return new Float32Array([1,0,0,0,1,0,0,0,1])}function a(o,i){const u=i[0],d=i[1],l=i[2],f=i[3],p=i[4],m=i[5],b=i[6],v=i[7],c=i[8],h=c*p-m*v,y=-c*f+m*b,w=v*f-p*b;let g=u*h+d*y+l*w;return g?(g=1/g,o[0]=h*g,o[1]=(-c*d+l*v)*g,o[2]=(m*d-l*p)*g,o[3]=y*g,o[4]=(c*u-l*b)*g,o[5]=(-m*u+l*f)*g,o[6]=w*g,o[7]=(-v*u+d*b)*g,o[8]=(p*u-d*f)*g,o):null}function n(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}function r(o,i){return o[0]=i[0],o[1]=i[1],o[2]=i[2],o[3]=0,o[4]=i[3],o[5]=i[4],o[6]=i[5],o[7]=0,o[8]=i[6],o[9]=i[7],o[10]=i[8],o[11]=0,o[12]=0,o[13]=0,o[14]=0,o[15]=1,o}function t(o,i,u){let d=i.domain(),l=u.domain(),f=2/(d[1]-d[0]),p=2/(l[1]-l[0]);return o[0]=f,o[1]=0,o[2]=0,o[3]=0,o[4]=p,o[5]=0,o[6]=-1-f*d[0],o[7]=-1-p*l[0],o[8]=1,o}return{mat3create:e,mat3invert:a,mat4create:n,mat4fromMat3:r,mat3fromLinearScales:t}},inputs:[],outputs:["mat3create","mat3invert","mat4create","mat4fromMat3","mat3fromLinearScales"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});s({root:document.getElementById("cell-2119"),expanded:[],variables:[]},{id:2119,body:e=>{function a(t,o){const i=document.createElement("a");i.download=o,i.href=t,document.body.appendChild(i),i.click(),document.body.removeChild(i)}function n(t){return t?Object.fromEntries(new e(t.startsWith("?")?t.slice(1):t)):{}}function r(t,o){if(o=o||"float",!t.hasExtension(`oes_texture_${o.replace(" ","_")}`))return!1;let i,u,d,l;try{i=t.framebuffer({colorType:o,colorFormat:"rgba",radius:1,depthStencil:!1}),u=t.framebuffer({colorType:"uint8",colorFormat:"rgba",radius:1,depthStencil:!1}),d=t({vert:`
      precision highp float;
      attribute vec2 aXY;
      void main () {
        gl_Position = vec4(aXY, 0, 1);
      }`,frag:`
      precision highp float;
      void main () {
        gl_FragColor = vec4(0.5, 0, 0, 0.5);
      }`,primitive:"triangles",count:3,attributes:{aXY:[-4,-4,4,-4,0,4]},framebuffer:t.prop("dst"),depth:{enable:!1},blend:{enable:!0,func:{srcRGB:1,srcAlpha:1,dstRGB:1,dstAlpha:1},equation:{rgb:"add",alpha:"add"}}}),l=t({vert:`
      precision highp float;
      attribute vec2 aXY;
      void main () {
        gl_Position = vec4(aXY, 0, 1);
      }`,frag:`
      precision highp float;
      uniform sampler2D src;
      void main () {
        gl_FragColor = texture2D(src, vec2(0.5));
      }`,attributes:{aXY:[-4,-4,4,-4,0,4]},uniforms:{src:t.prop("src")},framebuffer:t.prop("dst"),count:3,primitive:"triangles",depth:{enable:!1}}),i.use(()=>t.clear({color:[0,0,0,0]})),d({dst:i}),d({dst:i}),l({src:i,dst:u});const f=t.read({framebuffer:u});return f[0]>150&&f[3]>150}catch{return!1}finally{i&&i.destroy(),u&&u.destroy(),d&&d.destroy(),l&&l.destroy()}}return{downloadURI:a,parseQueryString:n,canWriteToFBOOfType:r}},inputs:["URLSearchParams"],outputs:["downloadURI","parseQueryString","canWriteToFBOOfType"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});
