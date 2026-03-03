import{d as C,_ as T}from"./index-ByB2dbry.js";C({root:document.getElementById("cell-2"),expanded:[],variables:[]},{id:2,body:async i=>{const{createWebGPUContext:s}=await T(()=>import("./webgpu-canvas-C7AS78hn.js"),[]).then(a=>{if(!("createWebGPUContext"in a))throw new SyntaxError("export 'createWebGPUContext' not found");return a}),{device:d,canvasFormat:g}=await s({optionalFeatures:["shader-f16"]});return i.then(()=>d.destroy()),{createWebGPUContext:s,device:d,canvasFormat:g}},inputs:["invalidation"],outputs:["createWebGPUContext","device","canvasFormat"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});C({root:document.getElementById("cell-3"),expanded:[],variables:[]},{id:3,body:async(i,s,d,g,a,h,l)=>{const u=i.hostname==="rreusser.github.io"?"https://raw.githubusercontent.com/rreusser/notebooks/main/src/visualizing-sloan-digital-sky-survey-data":".",r=await fetch(`${u}/objects.json`).then(t=>t.json());function c(t){const f=t>>15&1,o=t>>10&31,n=t&1023;return o===0?(f?-1:1)*Math.pow(2,-14)*(n/1024):o===31?n?NaN:f?-1/0:1/0:(f?-1:1)*Math.pow(2,o-15)*(1+n/1024)}const x=1,e=100,y={queue:[],inFlight:new Set,promises:new Map,chunks:new Array(r.chunks.length).fill(null),loadedCount:0,distanceHistogram:new Uint32Array(e),maxDistance:0,request(t){if(this.chunks[t])return Promise.resolve(this.chunks[t]);if(this.promises.has(t))return this.promises.get(t).promise;let f,o;const n=new Promise((m,w)=>{f=m,o=w});return this.promises.set(t,{promise:n,resolve:f,reject:o}),this.queue.push(t),this.processQueue(),n},processQueue(){for(;this.queue.length>0&&this.inFlight.size<x;){const t=this.queue.shift();this.chunks[t]||this.inFlight.has(t)||(this.inFlight.add(t),this.loadChunk(t))}},async loadChunk(t){const f=r.chunks[t];try{const o=await fetch(`${u}/${f.file}`);let n;if(f.file.endsWith(".gz")&&u!=="."){const p=new s("gzip"),R=o.body.pipeThrough(p);n=await new d(R).arrayBuffer()}else n=await o.arrayBuffer();const m=new Uint16Array(n),w=g.createBuffer({label:`galaxy-chunk-${t}`,size:n.byteLength,usage:a.VERTEX|a.COPY_DST});g.queue.writeBuffer(w,0,m);const z=Math.max(Math.abs(r.bounds.min[0]),Math.abs(r.bounds.max[0]),Math.abs(r.bounds.min[1]),Math.abs(r.bounds.max[1]),Math.abs(r.bounds.min[2]),Math.abs(r.bounds.max[2]))*1.5;z>this.maxDistance&&(this.maxDistance=z);for(let p=0;p<m.length;p+=4){const R=c(m[p]),D=c(m[p+1]),I=c(m[p+2]),q=Math.sqrt(R*R+D*D+I*I),E=Math.min(e-1,Math.floor(q/z*e));this.distanceHistogram[E]++}const S={buffer:w,count:f.count};this.chunks[t]=S,this.loadedCount+=S.count,this.inFlight.delete(t);const{resolve:b}=this.promises.get(t);b(S),h.dirty=!0;const P=f.objectClass==="QSO"?"QSOs":"galaxies";console.log(`Loaded chunk ${t+1}/${r.chunks.length}: ${S.count.toLocaleString()} ${P} (z=${f.redshiftRange[0]}-${f.redshiftRange[1]})`),this.processQueue()}catch(o){this.inFlight.delete(t);const{reject:n}=this.promises.get(t);n(o),this.processQueue()}}};function v(t){for(let o=0;o<r.chunks.length;o++){const[n]=r.chunks[o].redshiftRange;n<t-.001&&y.request(o)}}const M={get loadedCount(){return y.loadedCount},get totalCount(){return r.totalCount},get chunks(){return y.chunks},get loadingIndices(){return y.inFlight}};return v(.3),l.then(()=>{for(const t of y.chunks)t&&t.buffer.destroy()}),{dataBaseUrl:u,metadata:r,decodeFloat16:c,CONCURRENCY:x,NUM_DISTANCE_BINS:e,chunkLoader:y,loadChunksForRedshift:v,loadState:M}},inputs:["location","DecompressionStream","Response","device","GPUBufferUsage","renderState","invalidation"],outputs:["dataBaseUrl","metadata","decodeFloat16","CONCURRENCY","NUM_DISTANCE_BINS","chunkLoader","loadChunksForRedshift","loadState"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});C({root:document.getElementById("cell-4"),expanded:[],variables:[]},{id:4,body:async(i,s,d,g,a,h)=>{const{expandable:l}=await T(()=>import("./expandable-BCrxs32f.js"),[]).then(o=>{if(!("expandable"in o))throw new SyntaxError("export 'expandable' not found");return o}),u=window.devicePixelRatio||1,r=1200,c=Math.min(r,window.innerWidth-40),x=Math.round(c*.7),e=document.createElement("canvas");e.id="sdss-canvas",e.width=Math.floor(c*u),e.height=Math.floor(x*u),e.style.width=`${c}px`,e.style.height=`${x}px`,e.style.maxWidth="none",e.style.height="auto",e.style.aspectRatio=`${c} / ${x}`,e.style.background="var(--theme-background)";const y=e.getContext("webgpu");y.configure({device:i,format:s,alphaMode:"premultiplied"});const v={dirty:!0},M=d`<figure style="margin: 0; max-width: none;" id="sdss-figure">
  ${e}
</figure>`;function t(){const o=window.innerWidth,n=Math.min(r,o-40),m=Math.round(n*.7),z=((document.querySelector(".observablehq--cell")?.offsetWidth||840)-n)/2;M.style.width=n+"px",M.style.marginLeft=z+"px",e.style.width=n+"px",e.style.height=m+"px"}t(),window.addEventListener("resize",t),g.then(()=>window.removeEventListener("resize",t)),a(l(M,{width:c,height:x,controls:".sdss-controls",onResize(o,n,m){e.width=Math.floor(n*u),e.height=Math.floor(m*u),e.style.width=`${n}px`,e.style.height=`${m}px`,y.configure({device:i,format:s,alphaMode:"premultiplied"}),v.dirty=!0}}));const f=new h(o=>{for(const n of o){const m=n.contentRect,w=Math.floor(m.width),z=Math.floor(m.height);w>0&&z>0&&(e.width=Math.floor(w*u),e.height=Math.floor(z*u),y.configure({device:i,format:s,alphaMode:"premultiplied"}),v.dirty=!0)}});return f.observe(e),g.then(()=>f.disconnect()),{expandable:l,dpr:u,maxWidth:r,initialWidth:c,initialHeight:x,canvas:e,gpuContext:y,renderState:v,figure:M,updateFigureLayout:t,resizeObserver:f}},inputs:["device","canvasFormat","html","invalidation","display","ResizeObserver"],outputs:["expandable","dpr","maxWidth","initialWidth","initialHeight","canvas","gpuContext","renderState","figure","updateFigureLayout","resizeObserver"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});C({root:document.getElementById("cell-5"),expanded:[],variables:[]},{id:5,body:async()=>{const{interval:i}=await T(()=>import("./range-slider-C5fsCnfn.js"),[]).then(s=>{if(!("interval"in s))throw new SyntaxError("export 'interval' not found");return s});return{interval:i}},inputs:[],outputs:["interval"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});C({root:document.getElementById("cell-6"),expanded:[],variables:[]},{id:6,body:(i,s,d,g,a,h)=>{const l=i`<div class="sdss-controls"></div>`;function u(n){return l.appendChild(n),s.input(n)}const r=1,c=Math.min(d.galaxyRedshiftRange[0],d.qsoRedshiftRange[0]),x=d.qsoRedshiftRange[1],e=g([+c.toFixed(2),+x.toFixed(1)],{value:[+c.toFixed(2),.3],step:.001,label:"Redshift (z)",transform:Math.log}),y=u(e),v=25,M=a.checkbox(["Galaxies","QSOs"],{value:["Galaxies"],label:"Show"}),t=u(M),f=a.range([.001,1],{value:.02,label:"Exposure",step:.001,transform:Math.log}),o=u(f);return h(l),{controlsContainer:l,ctrl:u,pointSize:r,zMin:c,zMax:x,redshiftRangeInput:e,redshiftRange:y,whitePoint:v,objectTypesInput:M,objectTypes:t,exposureInput:f,exposure:o}},inputs:["html","Generators","metadata","interval","Inputs","display"],outputs:["controlsContainer","ctrl","pointSize","zMin","zMax","redshiftRangeInput","redshiftRange","whitePoint","objectTypesInput","objectTypes","exposureInput","exposure"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});C({root:document.getElementById("cell-7"),expanded:[],variables:[]},{id:7,body:(i,s,d,g)=>{const a=[[0,0],[.02,85],[.05,212],[.1,421],[.15,627],[.2,828],[.25,1025],[.3,1219],[.4,1596],[.5,1960],[.6,2311],[.7,2650],[.8,2977],[1,3395],[2,5765],[5,8715],[10,1e4],[1100,46500]];function h(o){for(let n=1;n<a.length;n++)if(o<=a[n][0]){const[m,w]=a[n-1],[z,S]=a[n],b=(o-m)/(z-m);return w+b*(S-w)}return a[a.length-1][1]}const l=[[0,0],[.02,.27],[.05,.67],[.1,1.29],[.2,2.45],[.3,3.45],[.4,4.32],[.5,5.08],[.6,5.75],[.7,6.34],[.8,6.87],[1,7.79],[2,10.4],[3,11.5],[4,12.1],[5,12.5],[6,12.8],[7,13],[10,13.3],[1100,13.8]];function u(o){for(let n=1;n<l.length;n++)if(o<=l[n][0]){const[m,w]=l[n-1],[z,S]=l[n],b=(o-m)/(z-m);return w+b*(S-w)}return l[l.length-1][1]}const r=13.8,[c,x]=i.range,e=h(c),y=h(x),v=u(c),M=u(x),t=o=>o>=1e3?`${(o/1e3).toFixed(2)} Gpc`:`${o.toFixed(0)} Mpc`,f=o=>o.toFixed(2);return s(d`<p style="font-size: 14px; color: var(--theme-foreground-muted); line-height: 1.6; max-width: 640px;">
<strong>Current selection:</strong> ${g`z = ${c.toFixed(2)}`} to ${g`z = ${x.toFixed(2)}`}<br>
<strong>Comoving distance:</strong> ${t(e)} to ${t(y)}<br>
<strong>Lookback time:</strong> ${f(v)} to ${f(M)} billion years ago
</p>`),{comovingDistanceTable:a,zToComovingDistance:h,lookbackTimeTable:l,zToLookbackTime:u,UNIVERSE_AGE:r,zLo:c,zHi:x,dLo:e,dHi:y,tLo:v,tHi:M,formatDist:t,formatTime:f}},inputs:["redshiftRange","display","html","tex"],outputs:["comovingDistanceTable","zToComovingDistance","lookbackTimeTable","zToLookbackTime","UNIVERSE_AGE","zLo","zHi","dLo","dHi","tLo","tHi","formatDist","formatTime"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});C({root:document.getElementById("cell-8"),expanded:[],variables:[]},{id:8,body:(i,s)=>{s(i.range[1])},inputs:["redshiftRange","loadChunksForRedshift"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});C({root:document.getElementById("cell-9"),expanded:[],variables:[]},{id:9,body:(i,s,d,g,a)=>{const h=i`<div style="font-size: 14px; color: var(--theme-foreground-muted); margin-top: 8px;"></div>`;s(h);let l=0,u=0;const r=setInterval(()=>{const c=d.loadingIndices.size>0;(d.loadedCount!==l||d.loadingIndices.size!==u)&&(l=d.loadedCount,u=d.loadingIndices.size,c?h.textContent=`Loading... ${d.loadedCount.toLocaleString()} objects loaded`:h.textContent=`Loaded ${d.loadedCount.toLocaleString()} objects (${g.galaxyCount.toLocaleString()} galaxies, ${g.qsoCount.toLocaleString()} QSOs)`)},100);return a.then(()=>clearInterval(r)),{progressEl:h,lastLoaded:l,lastLoadingSize:u,updateInterval:r}},inputs:["html","display","loadState","metadata","invalidation"],outputs:["progressEl","lastLoaded","lastLoadingSize","updateInterval"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});C({root:document.getElementById("cell-10"),expanded:[],variables:[]},{id:10,body:(i,s,d,g,a,h)=>{const l=i`<div id="histogram-container" style="max-width: 640px;"></div>`;s(l);let u=0;const r=setInterval(()=>{if(d.loadedCount===u)return;u=d.loadedCount;const c=d.maxDistance/g,x=Array.from(d.distanceHistogram,(e,y)=>({distance:(y+.5)*c,count:e})).filter(e=>e.count>0);l.innerHTML="",l.appendChild(a.plot({width:640,height:200,marginLeft:60,x:{label:"Distance (Mpc)",tickFormat:e=>e>=1e3?`${(e/1e3).toFixed(1)}k`:e},y:{label:"Object count",tickFormat:e=>e>=1e3?`${(e/1e3).toFixed(0)}k`:e},marks:[a.rectY(x,{x1:e=>e.distance-c/2,x2:e=>e.distance+c/2,y:"count",fill:"#4a9eff"}),a.ruleY([0])]}))},200);return h.then(()=>clearInterval(r)),{histogramContainer:l,lastCount:u,histogramInterval:r}},inputs:["html","display","chunkLoader","NUM_DISTANCE_BINS","Plot","invalidation"],outputs:["histogramContainer","lastCount","histogramInterval"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});C({root:document.getElementById("cell-11"),expanded:[],variables:[]},{id:11,body:async(i,s,d)=>{const{createCameraController:g}=await T(()=>import("./camera-controller-DnDb9jMf.js"),[]).then(r=>{if(!("createCameraController"in r))throw new SyntaxError("export 'createCameraController' not found");return r}),a=i.bounds,h=Math.max(a.max[0]-a.min[0],a.max[1]-a.min[1],a.max[2]-a.min[2]),l=[0,0,0],u=g(s,{center:l,distance:h*.1,phi:1.2,theta:0,fov:Math.PI/4,near:h*.001,far:h*10});return d.then(()=>u.destroy()),{createCameraController:g,bounds:a,dataRange:h,center:l,cameraController:u}},inputs:["metadata","canvas","invalidation"],outputs:["createCameraController","bounds","dataRange","center","cameraController"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});C({root:document.getElementById("cell-12"),expanded:[],variables:[]},{id:12,body:(i,s,d,g,a,h)=>{const l=`
struct Uniforms {
  projectionView: mat4x4f,
  pointSize: f32,
  brightness: f32,
  aspectRatio: f32,
  cameraDistance: f32,
  referenceDistance: f32,
  referencePointSize: f32,
  minRedshift: f32,      // User-selected min z for filtering
  maxRedshift: f32,      // User-selected max z for filtering
  galaxyZMin: f32,       // Galaxy z range for decoding color_param
  galaxyZMax: f32,
  qsoZMin: f32,          // QSO z range for decoding color_param
  qsoZMax: f32,
  showGalaxies: f32,     // 1.0 = show, 0.0 = hide
  showQSOs: f32,         // 1.0 = show, 0.0 = hide
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) redshift: f32,
  @location(1) uv: vec2f,
}

// Quad vertices for triangle strip: 4 vertices make a quad
const quadVertices = array<vec2f, 4>(
  vec2f(-1.0, -1.0),
  vec2f( 1.0, -1.0),
  vec2f(-1.0,  1.0),
  vec2f( 1.0,  1.0)
);

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  // Instance data: float16x4 (x, y, z, normalized_redshift)
  @location(0) instanceData: vec4<f32>
) -> VertexOutput {
  var output: VertexOutput;

  // Get quad corner from vertex index
  let corner = quadVertices[vertexIndex];

  // Transform galaxy position to clip space
  let worldPos = vec4f(instanceData.xyz, 1.0);
  let clipPos = uniforms.projectionView * worldPos;

  // Expand quad in screen space (size in pixels)
  let size = uniforms.pointSize / vec2f(uniforms.aspectRatio, 1.0);
  let offset = corner * size * clipPos.w * 0.001;

  output.position = clipPos + vec4f(offset, 0.0, 0.0);
  output.redshift = instanceData.w;
  output.uv = corner;

  return output;
}

// Color by object type and redshift using the precomputed color_param:
// [0, 0.5): galaxies — warm white (nearby) → red (distant)
// [0.5, 1.0]: quasars — bright blue (nearby) → orange-red (distant)
fn objectColor(colorParam: f32) -> vec3f {
  if (colorParam < 0.5) {
// Galaxies: warm off-white to red (original brightness)
let t = colorParam * 2.0;
let white = vec3f(1.0, 0.95, 0.9);
let red = vec3f(1.0, 0.15, 0.05);
return mix(white, red, sqrt(t));
  } else {
// Quasars: bright blue to orange-red (10x brighter to stand out)
let t = (colorParam - 0.5) * 2.0;
let blue = vec3f(4.0, 7.0, 10.0);
let red = vec3f(10.0, 4.0, 1.0);
return mix(blue, red, sqrt(t));
  }
}

// Decode color_param back to actual redshift for filtering
fn decodeRedshift(colorParam: f32) -> f32 {
  if (colorParam < 0.5) {
// Galaxy: decode from [0, 0.5) range
let t = colorParam * 2.0;
return uniforms.galaxyZMin + t * (uniforms.galaxyZMax - uniforms.galaxyZMin);
  } else {
// QSO: decode from [0.5, 1.0] range
let t = (colorParam - 0.5) * 2.0;
return uniforms.qsoZMin + t * (uniforms.qsoZMax - uniforms.qsoZMin);
  }
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  // Filter by object type (colorParam < 0.5 = galaxy, >= 0.5 = QSO)
  let isGalaxy = input.redshift < 0.5;
  if (isGalaxy && uniforms.showGalaxies < 0.5) { discard; }
  if (!isGalaxy && uniforms.showQSOs < 0.5) { discard; }

  // Decode color_param to actual redshift and filter
  let z = decodeRedshift(input.redshift);
  if (z < uniforms.minRedshift || z > uniforms.maxRedshift) {
discard;
  }

  // For sub-pixel points, skip shape calculations
  var falloff = 1.0;
  if (uniforms.pointSize >= 1.0) {
let dist2 = dot(input.uv, input.uv);
if (dist2 > 1.0) {
  discard;
}
let t = 1.0 - dist2;
falloff = t * t;
  }

  // Scale brightness by camera distance and point size
  let distanceScale = uniforms.referenceDistance / uniforms.cameraDistance;
  let sizeScale = uniforms.referencePointSize / uniforms.pointSize;

  let color = objectColor(input.redshift);
  let intensity = uniforms.brightness * falloff * distanceScale * sizeScale;

  return vec4f(color * intensity, intensity);
}
`,u=i.createShaderModule({label:"galaxy-shader",code:l}),r=i.createBuffer({label:"galaxy-uniforms",size:128,usage:s.UNIFORM|s.COPY_DST}),c=i.createBindGroupLayout({entries:[{binding:0,visibility:d.VERTEX|d.FRAGMENT,buffer:{type:"uniform"}}]}),x=i.createBindGroup({layout:c,entries:[{binding:0,resource:{buffer:r}}]}),e=i.createPipelineLayout({bindGroupLayouts:[c]}),y=i.createRenderPipeline({label:"galaxy-quad-pipeline",layout:e,vertex:{module:u,entryPoint:"vertexMain",buffers:[{arrayStride:8,stepMode:"instance",attributes:[{shaderLocation:0,offset:0,format:"float16x4"}]}]},fragment:{module:u,entryPoint:"fragmentMain",targets:[{format:"rgba16float",blend:{color:{srcFactor:"src-alpha",dstFactor:"one",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one",operation:"add"}}}]},primitive:{topology:"triangle-strip"}}),v=`
struct Uniforms {
  projectionView: mat4x4f,
  pointSize: f32,
  brightness: f32,
  aspectRatio: f32,
  cameraDistance: f32,
  referenceDistance: f32,
  referencePointSize: f32,
  minRedshift: f32,
  maxRedshift: f32,
  galaxyZMin: f32,
  galaxyZMax: f32,
  qsoZMin: f32,
  qsoZMax: f32,
  showGalaxies: f32,
  showQSOs: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) redshift: f32,
}

@vertex
fn vertexMain(@location(0) data: vec4<f32>) -> VertexOutput {
  var output: VertexOutput;
  output.position = uniforms.projectionView * vec4f(data.xyz, 1.0);
  output.redshift = data.w;
  return output;
}

fn objectColor(colorParam: f32) -> vec3f {
  if (colorParam < 0.5) {
let t = colorParam * 2.0;
let white = vec3f(1.0, 0.95, 0.9);
let red = vec3f(1.0, 0.15, 0.05);
return mix(white, red, sqrt(t));
  } else {
let t = (colorParam - 0.5) * 2.0;
let blue = vec3f(4.0, 7.0, 10.0);
let red = vec3f(10.0, 4.0, 1.0);
return mix(blue, red, sqrt(t));
  }
}

fn decodeRedshift(colorParam: f32) -> f32 {
  if (colorParam < 0.5) {
let t = colorParam * 2.0;
return uniforms.galaxyZMin + t * (uniforms.galaxyZMax - uniforms.galaxyZMin);
  } else {
let t = (colorParam - 0.5) * 2.0;
return uniforms.qsoZMin + t * (uniforms.qsoZMax - uniforms.qsoZMin);
  }
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let isGalaxy = input.redshift < 0.5;
  if (isGalaxy && uniforms.showGalaxies < 0.5) { discard; }
  if (!isGalaxy && uniforms.showQSOs < 0.5) { discard; }

  let z = decodeRedshift(input.redshift);
  if (z < uniforms.minRedshift || z > uniforms.maxRedshift) { discard; }

  let distanceScale = uniforms.referenceDistance / uniforms.cameraDistance;
  let sizeScale = uniforms.referencePointSize / uniforms.pointSize;

  let color = objectColor(input.redshift);
  let intensity = uniforms.brightness * distanceScale * sizeScale;

  return vec4f(color * intensity, intensity);
}
`,M=i.createShaderModule({label:"galaxy-point-shader",code:v}),t=i.createRenderPipeline({label:"galaxy-point-pipeline",layout:e,vertex:{module:M,entryPoint:"vertexMain",buffers:[{arrayStride:8,stepMode:"vertex",attributes:[{shaderLocation:0,offset:0,format:"float16x4"}]}]},fragment:{module:M,entryPoint:"fragmentMain",targets:[{format:"rgba16float",blend:{color:{srcFactor:"src-alpha",dstFactor:"one",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one",operation:"add"}}}]},primitive:{topology:"point-list"}}),f=`
@group(0) @binding(0) var hdrTexture: texture_2d<f32>;
@group(0) @binding(1) var texSampler: sampler;
@group(0) @binding(2) var<uniform> tonemapParams: vec4f;  // x=exposure, y=whitePoint, z/w unused

const backgroundColor = vec3f(0.106, 0.090, 0.078);  // #1B1714

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  // Fullscreen triangle
  var pos = array<vec2f, 3>(
vec2f(-1.0, -1.0),
vec2f( 3.0, -1.0),
vec2f(-1.0,  3.0)
  );
  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.uv = (pos[vertexIndex] + 1.0) * 0.5;
  output.uv.y = 1.0 - output.uv.y;  // Flip Y for texture coordinates
  return output;
}

// Extended Reinhard tonemap on scalar: x * (1 + x/white²) / (1 + x)
fn reinhardExtendedLuminance(x: f32, white: f32) -> f32 {
  let white2 = white * white;
  return x * (1.0 + x / white2) / (1.0 + x);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let hdr = textureSample(hdrTexture, texSampler, input.uv);

  let exposure = tonemapParams.x;
  let whitePoint = tonemapParams.y;

  // Apply exposure
  let exposed = hdr.rgb * exposure;

  // Compute luminance (Rec. 709 coefficients)
  let luminance = dot(exposed, vec3f(0.2126, 0.7152, 0.0722));

  // Tonemap luminance only, then scale color to preserve saturation
  let tonemappedLum = reinhardExtendedLuminance(luminance, whitePoint);
  let scale = select(tonemappedLum / luminance, 0.0, luminance < 0.0001);
  let ldr = exposed * scale;

  // Add tonemapped light over background
  return vec4f(backgroundColor + ldr, 1.0);
}
`,o=i.createShaderModule({label:"tonemap-shader",code:f}),n=i.createBuffer({label:"tonemap-uniforms",size:16,usage:s.UNIFORM|s.COPY_DST}),m=i.createBindGroupLayout({entries:[{binding:0,visibility:d.FRAGMENT,texture:{sampleType:"float"}},{binding:1,visibility:d.FRAGMENT,sampler:{type:"filtering"}},{binding:2,visibility:d.FRAGMENT,buffer:{type:"uniform"}}]}),w=i.createPipelineLayout({bindGroupLayouts:[m]}),z=i.createRenderPipeline({label:"tonemap-pipeline",layout:w,vertex:{module:o,entryPoint:"vertexMain"},fragment:{module:o,entryPoint:"fragmentMain",targets:[{format:g}]},primitive:{topology:"triangle-list"}}),S=i.createSampler({magFilter:"linear",minFilter:"linear"}),b={texture:null,bindGroup:null,width:0,height:0};function P(p,R){b.width===p&&b.height===R&&b.texture||(b.texture&&b.texture.destroy(),b.texture=i.createTexture({label:"hdr-texture",size:[p,R],format:"rgba16float",usage:a.RENDER_ATTACHMENT|a.TEXTURE_BINDING}),b.bindGroup=i.createBindGroup({layout:m,entries:[{binding:0,resource:b.texture.createView()},{binding:1,resource:S},{binding:2,resource:{buffer:n}}]}),b.width=p,b.height=R)}return h.then(()=>{r.destroy(),n.destroy(),b.texture&&b.texture.destroy()}),{shaderCode:l,shaderModule:u,uniformBuffer:r,bindGroupLayout:c,bindGroup:x,pipelineLayout:e,quadPipeline:y,pointShaderCode:v,pointShaderModule:M,pointPipeline:t,tonemapShaderCode:f,tonemapShaderModule:o,tonemapUniformBuffer:n,tonemapBindGroupLayout:m,tonemapPipelineLayout:w,tonemapPipeline:z,hdrSampler:S,hdrState:b,ensureHdrTexture:P}},inputs:["device","GPUBufferUsage","GPUShaderStage","canvasFormat","GPUTextureUsage","invalidation"],outputs:["shaderCode","shaderModule","uniformBuffer","bindGroupLayout","bindGroup","pipelineLayout","quadPipeline","pointShaderCode","pointShaderModule","pointPipeline","tonemapShaderCode","tonemapShaderModule","tonemapUniformBuffer","tonemapBindGroupLayout","tonemapPipelineLayout","tonemapPipeline","hdrSampler","hdrState","ensureHdrTexture"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});C({root:document.getElementById("cell-13"),expanded:[],variables:[]},{id:13,body:async(i,s,d,g,a,h,l,u,r,c,x,e,y,v,M,t,f,o,n,m,w,z,S)=>{const{createFrameLoop:b}=await T(()=>import("./frame-loop-QkwpdSbZ.js"),[]).then(F=>{if(!("createFrameLoop"in F))throw new SyntaxError("export 'createFrameLoop' not found");return F});h.dirty=!0;const P=new ArrayBuffer(128),p=new Float32Array(P),[R,D]=l.galaxyRedshiftRange,[I,q]=l.qsoRedshiftRange,E=new Float32Array(4),B=u*.8,$=b(()=>{const F=r.width/r.height,{projectionView:N,dirty:Z}=c.update(F);if(!h.dirty&&!Z||!x.chunks.some(L=>L!==null))return;e(r.width,r.height),p.set(N,0),p[16]=i*y,p[17]=.5,p[18]=F,p[19]=c.state.distance,p[20]=B,p[21]=2*y,p[22]=g.range[0],p[23]=g.range[1],p[24]=R,p[25]=D,p[26]=I,p[27]=q,p[28]=a.includes("Galaxies")?1:0,p[29]=a.includes("QSOs")?1:0,v.queue.writeBuffer(M,0,P);const G=v.createCommandEncoder(),k=G.beginRenderPass({colorAttachments:[{view:t.texture.createView(),loadOp:"clear",storeOp:"store",clearValue:{r:0,g:0,b:0,a:0}}]}),A=i*y<1;k.setPipeline(A?f:o),k.setBindGroup(0,n);const[W,Q]=g.range,U=a.includes("Galaxies"),H=a.includes("QSOs");for(let L=0;L<x.chunks.length;L++){const O=x.chunks[L];if(!O)continue;const V=l.chunks[L],[Y,X]=V.redshiftRange;if(X<W||Y>Q)continue;const j=V.objectClass==="GALAXY";j&&!U||!j&&!H||(k.setVertexBuffer(0,O.buffer),A?k.draw(O.count):k.draw(4,O.count))}k.end(),E[0]=s,E[1]=d,v.queue.writeBuffer(m,0,E);const _=G.beginRenderPass({colorAttachments:[{view:w.getCurrentTexture().createView(),loadOp:"clear",storeOp:"store",clearValue:{r:.106,g:.09,b:.078,a:1}}]});_.setPipeline(z),_.setBindGroup(0,t.bindGroup),_.draw(3),_.end(),v.queue.submit([G.finish()]),h.dirty=!1});return S.then(()=>$.cancel()),{createFrameLoop:b,uniformData:P,uniformF32:p,galaxyZMin:R,galaxyZMax:D,qsoZMin:I,qsoZMax:q,tonemapData:E,referenceDistance:B,loop:$}},inputs:["pointSize","exposure","whitePoint","redshiftRange","objectTypes","renderState","metadata","dataRange","canvas","cameraController","loadState","ensureHdrTexture","dpr","device","uniformBuffer","hdrState","pointPipeline","quadPipeline","bindGroup","tonemapUniformBuffer","gpuContext","tonemapPipeline","invalidation"],outputs:["createFrameLoop","uniformData","uniformF32","galaxyZMin","galaxyZMax","qsoZMin","qsoZMax","tonemapData","referenceDistance","loop"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});C({root:document.getElementById("cell-14"),expanded:[],variables:[]},{id:14,body:(i,s)=>i`## Data and methods

Data was fetched from [SDSS DR18](https://skyserver.sdss.org/dr18/) using [astroquery](https://astroquery.readthedocs.io/). The query selects spectroscopically-confirmed objects from the SpecObj table, filtered by object class with \`zWarning=0\`. Queries are split into redshift bins to stay under SDSS's 500k row limit. The query looks roughly like:

\`\`\`
from astroquery.sdss import SDSS
from astropy.cosmology import Planck18 as cosmo

result = SDSS.query_sql("""
  SELECT s.ra, s.dec, s.z FROM SpecObj s
  WHERE s.class = 'GALAXY'
AND s.z BETWEEN 0.02 AND 0.08
AND s.zWarning = 0
""")
distance = cosmo.comoving_distance(result['z']).to('Mpc').value
\`\`\`

Obtaining the data was surprisingly easy.

Redshifts are converted to 3D Cartesian coordinates using [Astropy](https://www.astropy.org/)'s [Planck 2018](https://arxiv.org/abs/1807.06209) cosmology. Comoving distance ${s`d`} in Mpc is computed from redshift ${s`z`}, then projected: ${s`x = d \cos(\delta)\cos(\alpha)`}, ${s`y = d \cos(\delta)\sin(\alpha)`}, ${s`z = d \sin(\delta)`}, where ${s`\alpha`} and ${s`\delta`} are right ascension and declination.

Each object is stored as four float16 values (x, y, z, color_param). The color parameter encodes both object type and redshift: galaxies map to [0, 0.5) and QSOs to [0.5, 1.0], allowing the shader to distinguish types and interpolate colors. Data is gzip-compressed and loaded progressively by redshift range. It would probably be more efficient to work out positions in the browser, but I opted instead to do the work up front and transfer data in a format that would allow directly uploading to the GPU and piping to the screen.

Rendering uses WebGPU with HDR accumulation and tonemapping. Points are rendered as single-pixel point primitives (there was some quad sprite rendering in place for larger points, but single points seem fine when you have 3M points!). To maintain consistent perceived brightness across zoom levels and point sizes, the shader scales intensity inversely with both camera distance and point size. Without this correction, zooming out would cause the image to blow out as millions of points overlap, while zooming in would make sparse regions too dim.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});
