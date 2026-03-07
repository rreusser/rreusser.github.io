import{createGPULines as we}from"https://cdn.jsdelivr.net/npm/webgpu-instanced-lines/+esm";import Ue from"https://cdn.jsdelivr.net/npm/earcut/+esm";const Q=1.324717957244746,Se=1/Q,Ge=1/(Q*Q);function Oe(e,a){return e[0]=(.5+Se*a)%1,e[1]=(.5+Ge*a)%1,e}const Ve=5e3,le=40,ce=`
const pi: f32 = 3.14159265359;

fn computeVelocity(xy: vec2f, panelCount: u32) -> vec2f {
  var vInduced = vec2f(0.0);
  var prev = uniforms.panelData[0];
  var rPrev = xy - prev.xy;

  for (var i = 1u; i <= panelCount; i++) {
    let next = uniforms.panelData[i];
    let rNext = xy - next.xy;
    let t = normalize(next.xy - prev.xy);
    let n = vec2f(-t.y, t.x);
    let bij = atan2(rPrev.x * rNext.y - rNext.x * rPrev.y, dot(rPrev, rNext));
    let lograt = 0.5 * log(dot(rNext, rNext) / dot(rPrev, rPrev));
    let source = next.z;
    let gamma = next.w;
    vInduced += source * (-lograt * t + bij * n);
    vInduced += gamma * (bij * t + lograt * n);
    prev = next;
    rPrev = rNext;
  }

  return uniforms.vInf + (0.5 / pi) * vInduced;
}

fn computePressureCoeff(v: vec2f) -> f32 {
  let vInfMag2 = dot(uniforms.vInf, uniforms.vInf);
  return 1.0 - dot(v, v) / vInfMag2;
}
`,Ce=`
fn linearstep(edge0: f32, edge1: f32, x: f32) -> f32 {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

fn contrastFunction(x: f32, power: f32) -> f32 {
  let x2 = 2.0 * x - 1.0;
  return 0.5 + 0.5 * pow(abs(x2), power) * sign(x2);
}

const octaveDivisions: f32 = 2.0;
const octaves: i32 = 8;
const fOctaves: f32 = 8.0;

fn shadedContours(f: f32, minSpacing: f32, antialiasWidth: f32, rampPower: f32, contourWidth: f32) -> vec2f {
  let screenSpaceGrad = length(vec2f(dpdx(f), dpdy(f))) / abs(f);
  let localOctave = log2(screenSpaceGrad * minSpacing) / log2(octaveDivisions);
  let contourSpacing = pow(octaveDivisions, ceil(localOctave));
  var plotVar = log2(abs(f)) / contourSpacing;
  var widthScale = contourSpacing / screenSpaceGrad;
  var contourSum: f32 = 0.0;
  var grid: f32 = 0.0;

  for (var i = 0; i < octaves; i++) {
    let t = f32(i + 1) - fract(localOctave);
    let weight = smoothstep(0.0, 1.0, t) * smoothstep(fOctaves, fOctaves - 1.0, t);
    let y = fract(plotVar);
    contourSum += weight * min(contrastFunction(y, rampPower), (1.0 - y) * 0.5 * widthScale / antialiasWidth);
    grid += weight * linearstep(
      contourWidth + antialiasWidth,
      contourWidth - antialiasWidth,
      (0.5 - abs(fract(plotVar) - 0.5)) * widthScale
    );
    widthScale *= octaveDivisions;
    plotVar /= octaveDivisions;
  }
  grid /= fOctaves;
  contourSum /= fOctaves;
  return vec2f(contourSum, grid);
}
`,de=`
fn sampleColorscale(t: f32) -> vec3f {
  let idx = clamp(t, 0.0, 1.0) * 255.0;
  let i0 = u32(floor(idx));
  let i1 = min(i0 + 1u, 255u);
  let frac = fract(idx);
  let c0 = uniforms.colorscale[i0];
  let c1 = uniforms.colorscale[i1];
  return mix(c0.rgb, c1.rgb, frac);
}
`;function Ie(e){return`
struct Uniforms {
  viewInverse: mat4x4f,
  vInf: vec2f,
  contourOpacity: f32,
  shadingOpacity: f32,
  panelCount: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
  panelData: array<vec4f, ${e+1}>,
  colorscale: array<vec4f, 256>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) xy: vec2f,
};

@vertex
fn vertex(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  let x = f32((vertexIndex << 1u) & 2u) * 2.0 - 1.0;
  let y = f32(vertexIndex & 2u) * 2.0 - 1.0;

  var output: VertexOutput;
  let dataCoord = uniforms.viewInverse * vec4f(x, y, 0.0, 1.0);
  output.xy = dataCoord.xy;
  output.position = vec4f(x, y, 0.0, 1.0);
  return output;
}

${ce}
${Ce}
${de}

@fragment
fn fragment(@location(0) xy: vec2f) -> @location(0) vec4f {
  let v = computeVelocity(xy, uniforms.panelCount);
  let cp = computePressureCoeff(v);

  // Map pressure coefficient to colorscale
  let colorT = exp((cp - 1.0) * 0.7);
  var color = sampleColorscale(colorT);

  // Apply contour shading
  if (uniforms.shadingOpacity > 1e-4 || uniforms.contourOpacity > 1e-4) {
    let contours = shadedContours(1.0 - cp, 8.0, 1.0, 3.0, 1.0);
    color *= 1.0 + uniforms.shadingOpacity * (contours.x - 0.5);
    color = mix(color, vec3f(0.0), contours.y * uniforms.contourOpacity);
  }

  return vec4f(color, 1.0);
}
`}function Fe(e,a){return`
struct Uniforms {
  view: mat4x4f,
  viewInverse: mat4x4f,
  vInf: vec2f,
  resolution: vec2f,
  lineWidth: f32,
  dt: f32,
  noise: f32,
  byPressure: f32,
  panelCount: u32,
  streamlineLength: u32,
  opacity: f32,
  _pad0: u32,
  panelData: array<vec4f, ${e+1}>,
  colorscale: array<vec4f, 256>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
  @location(0) seed: vec3f,
  @location(1) lineCoord: vec2f,
};

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
  @location(1) opacity: f32,
  @location(2) y: f32,
};

${ce}
${de}

@vertex
fn vertex(input: VertexInput, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
  var xy = (uniforms.viewInverse * vec4f(input.seed.xy, 0.0, 1.0)).xy;
  let tScale = vec2f(1.0 / f32(uniforms.streamlineLength - 1u), -0.5);
  let s = input.lineCoord.x * tScale.x + tScale.y;

  // Integrate streamline
  var v: vec2f;
  for (var j = 0u; j < uniforms.streamlineLength; j++) {
    v = computeVelocity(xy, uniforms.panelCount);
    xy += s * uniforms.dt * normalize(v) * 0.3;
  }

  let cp = computePressureCoeff(v);
  let colorT = exp((cp - 1.0) * 0.7);
  let pressureColor = sampleColorscale(colorT) * (1.0 - uniforms.noise * (input.seed.z - 0.5) * 2.0);
  let baseColor = vec3f(1.0 - input.seed.z * uniforms.noise);

  var output: VertexOutput;
  output.color = mix(baseColor, pressureColor, uniforms.byPressure);
  output.y = input.lineCoord.y;

  let spVel = uniforms.view * vec4f(v, 0.0, 0.0);
  output.position = uniforms.view * vec4f(xy, 0.0, 1.0);
  output.position = vec4f(
    output.position.xy + normalize(vec2f(-spVel.y, spVel.x) / uniforms.resolution) / uniforms.resolution * input.lineCoord.y * uniforms.lineWidth,
    output.position.zw
  );
  output.opacity = exp(-s * s * 10.0);

  return output;
}

@fragment
fn fragment(input: VertexOutput) -> @location(0) vec4f {
  let alpha = input.opacity * (1.0 - input.y * input.y) * uniforms.opacity;
  return vec4f(input.color * alpha, alpha);
}
`}function Ae(){return`
struct Uniforms {
  view: mat4x4f,
  color: vec4f,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
};

@vertex
fn vertex(@location(0) xy: vec2f) -> VertexOutput {
  var output: VertexOutput;
  output.position = uniforms.view * vec4f(xy, 0.0, 1.0);
  return output;
}

@fragment
fn fragment() -> @location(0) vec4f {
  return uniforms.color;
}
`}function Le(){return`
struct Uniforms {
  view: mat4x4f,
  color: vec4f,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
};

@vertex
fn vertex(@location(0) xy: vec2f) -> VertexOutput {
  var output: VertexOutput;
  output.position = uniforms.view * vec4f(xy, 0.0, 1.0);
  return output;
}

@fragment
fn fragment(input: VertexOutput) -> @location(0) vec4f {
  return uniforms.color;
}
`}function fe(){return`
struct Uniforms {
  view: mat4x4f,
  color: vec4f,
  pointSize: f32,
  _pad0: f32,
  resolution: vec2f,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> positions: array<vec2f>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vertex(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
  // Quad vertices: 0=(-1,-1), 1=(1,-1), 2=(-1,1), 3=(1,1)
  let x = f32((vertexIndex & 1u) * 2u) - 1.0;
  let y = f32((vertexIndex >> 1u) * 2u) - 1.0;

  let pos = positions[instanceIndex];
  let clipPos = uniforms.view * vec4f(pos, 0.0, 1.0);

  var output: VertexOutput;
  output.uv = vec2f(x, y);
  // Offset in normalized device coordinates
  let offset = vec2f(x, y) * uniforms.pointSize / uniforms.resolution;
  output.position = vec4f(clipPos.xy + offset, clipPos.zw);
  return output;
}

@fragment
fn fragment(input: VertexOutput) -> @location(0) vec4f {
  let dist = length(input.uv);
  // Antialiased circle
  let aa = 1.0 - smoothstep(0.7, 1.0, dist);
  if (aa < 0.01) { discard; }
  return vec4f(uniforms.color.rgb * aa, uniforms.color.a * aa);
}
`}function De(e,a){let d=null,s=null,i=null,h=-1,f=null,c=null,P=null,B=null,y=null,K=-1,Z=-1,H=null,ee=null,q=null,C=null,I=null,te=-1,re=-1,F=null,A=null,R=null,Y=null,oe=null,ne=-1,z=null,ie=null,X=null,L=null,ae=-1,j=null,ue=null,$=null,G=null,se=-1;const E=new Float32Array(3*Ve),J=[0,0];for(let t=0;t<E.length;t+=3)Oe(J,t/3),E[t]=(J[0]*2-1)*1.05+Math.random()*.05,E[t+1]=(J[1]*2-1)*1.05+Math.random()*.05,E[t+2]=Math.random();B=e.createBuffer({label:"streamline-seeds",size:E.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST}),e.queue.writeBuffer(B,0,E);const _=new Float32Array(le*4);for(let t=0;t<le;t++)_[t*4+0]=t,_[t*4+1]=-1,_[t*4+2]=t,_[t*4+3]=1;y=e.createBuffer({label:"streamline-coords",size:_.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST}),e.queue.writeBuffer(y,0,_);function pe(t){if(t===h&&d)return;h=t;const o=Ie(t),u=e.createShaderModule({label:"field-shader",code:o}),r=96+(t+1)*16+256*16;i=e.createBuffer({label:"field-uniforms",size:r,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});const n=e.createBindGroupLayout({label:"field-bind-group-layout",entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]});s=e.createBindGroup({label:"field-bind-group",layout:n,entries:[{binding:0,resource:{buffer:i}}]}),d=e.createRenderPipeline({label:"field-pipeline",layout:e.createPipelineLayout({bindGroupLayouts:[n]}),vertex:{module:u,entryPoint:"vertex"},fragment:{module:u,entryPoint:"fragment",targets:[{format:a}]},primitive:{topology:"triangle-list"}})}function me(t,o){if(t===K&&o===Z&&f)return;K=t,Z=o;const u=Fe(t),r=e.createShaderModule({label:"streamline-shader",code:u}),n=Math.ceil((176+(t+1)*16+256*16)/16)*16;P=e.createBuffer({label:"streamline-uniforms",size:n,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});const p=e.createBindGroupLayout({label:"streamline-bind-group-layout",entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]});c=e.createBindGroup({label:"streamline-bind-group",layout:p,entries:[{binding:0,resource:{buffer:P}}]}),f=e.createRenderPipeline({label:"streamline-pipeline",layout:e.createPipelineLayout({bindGroupLayouts:[p]}),vertex:{module:r,entryPoint:"vertex",buffers:[{arrayStride:12,stepMode:"instance",attributes:[{shaderLocation:0,offset:0,format:"float32x3"}]},{arrayStride:8,stepMode:"vertex",attributes:[{shaderLocation:1,offset:0,format:"float32x2"}]}]},fragment:{module:r,entryPoint:"fragment",targets:[{format:a,blend:{color:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"}}}]},primitive:{topology:"triangle-strip"}})}function ge(){if(H)return;const t=e.createShaderModule({label:"airfoil-shader",code:Ae()});q=e.createBuffer({label:"airfoil-uniforms",size:80,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});const o=e.createBindGroupLayout({label:"airfoil-bind-group-layout",entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]});ee=e.createBindGroup({label:"airfoil-bind-group",layout:o,entries:[{binding:0,resource:{buffer:q}}]}),H=e.createRenderPipeline({label:"airfoil-pipeline",layout:e.createPipelineLayout({bindGroupLayouts:[o]}),vertex:{module:t,entryPoint:"vertex",buffers:[{arrayStride:8,attributes:[{shaderLocation:0,offset:0,format:"float32x2"}]}]},fragment:{module:t,entryPoint:"fragment",targets:[{format:a,blend:{color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"}}}]},primitive:{topology:"triangle-list"}})}function ye(t,o){const u=t.length/2,r=o.length;u!==te&&(C&&C.destroy(),C=e.createBuffer({label:"airfoil-vertices",size:t.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST}),te=u),e.queue.writeBuffer(C,0,t),r!==re&&(I&&I.destroy(),I=e.createBuffer({label:"airfoil-indices",size:r*4,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST}),re=r);const n=new Uint32Array(o);e.queue.writeBuffer(I,0,n)}function xe(){if(F)return;F=we(e,{colorTargets:{format:a,blend:{color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"}}},join:"round",cap:"round",maxJoinResolution:8,maxCapResolution:8,vertexShaderBody:`
      @group(1) @binding(0) var<storage, read> positions: array<vec4f>;
      @group(1) @binding(1) var<uniform> viewMatrix: mat4x4f;
      @group(1) @binding(2) var<uniform> edgeUniforms: vec4f;  // xyz=color, w=lineWidth

      struct Vertex {
        position: vec4f,
        width: f32,
        lineWidth: f32,
      }

      fn getVertex(index: u32) -> Vertex {
        let p = positions[index];
        let projected = viewMatrix * vec4f(p.xyz, 1.0);
        let lw = edgeUniforms.w;
        return Vertex(vec4f(projected.xyz, p.w * projected.w), lw, lw);
      }
    `,fragmentShaderBody:`
      @group(1) @binding(2) var<uniform> edgeUniforms: vec4f;  // xyz=color, w unused (lineWidth comes from arg)

      fn getColor(lineCoord: vec2f, lineWidth: f32, instanceID: f32, triStripCoord: vec2f) -> vec4f {
        let color = edgeUniforms.xyz;

        // lineCoord.y is -1 to 1 across the line width
        let distFromCenter = abs(lineCoord.y);

        // Fade over 1 device pixel: 2/lineWidth in normalized coords
        let fadeWidth = 2.0 / max(lineWidth, 1.0);

        // Smoothstep antialiasing at edges
        let alpha = 1.0 - smoothstep(1.0 - fadeWidth, 1.0, distFromCenter);

        return vec4f(color * alpha, alpha);
      }
    `}),R=e.createBuffer({label:"edge-view-matrix",size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),Y=e.createBuffer({label:"edge-uniforms",size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})}function ve(t){const o=t.x.length;o!==ne&&(A&&A.destroy(),A=e.createBuffer({label:"edge-positions",size:o*16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),ne=o,F&&R&&(oe=e.createBindGroup({layout:F.getBindGroupLayout(1),entries:[{binding:0,resource:{buffer:A}},{binding:1,resource:{buffer:R}},{binding:2,resource:{buffer:Y}}]})));const u=new Float32Array(o*4);for(let r=0;r<o;r++)u[r*4+0]=t.x[r],u[r*4+1]=t.y[r],u[r*4+2]=0,u[r*4+3]=1;e.queue.writeBuffer(A,0,u)}function he(){z||(e.createShaderModule({label:"point-shader",code:fe()}),X=e.createBuffer({label:"point-uniforms",size:112,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}))}function be(t){const o=t.x.length;if(o!==ae){L&&L.destroy(),L=e.createBuffer({label:"point-positions",size:o*8,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),ae=o;const r=e.createBindGroupLayout({label:"point-bind-group-layout",entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:"read-only-storage"}}]});if(ie=e.createBindGroup({label:"point-bind-group",layout:r,entries:[{binding:0,resource:{buffer:X}},{binding:1,resource:{buffer:L}}]}),!z){const n=e.createShaderModule({label:"point-shader",code:fe()});z=e.createRenderPipeline({label:"point-pipeline",layout:e.createPipelineLayout({bindGroupLayouts:[r]}),vertex:{module:n,entryPoint:"vertex"},fragment:{module:n,entryPoint:"fragment",targets:[{format:a,blend:{color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"}}}]},primitive:{topology:"triangle-strip"}})}}const u=new Float32Array(o*2);for(let r=0;r<o;r++)u[r*2]=t.x[r],u[r*2+1]=t.y[r];e.queue.writeBuffer(L,0,u)}return{drawField(t,o){const{viewInverse:u,vInf:r,panelData:n,panelCount:p,colorscale:v,contourOpacity:l=.1,shadingOpacity:x=.15}=o;pe(p);const M=(p+1)*16,O=256*16,N=96+M+O,S=new ArrayBuffer(N),b=new Float32Array(S),V=new Uint32Array(S);b.set(u,0),b[16]=r[0],b[17]=r[1],b[18]=l,b[19]=x,V[20]=p;const w=24;b.set(n,w);const m=w+(p+1)*4;b.set(v,m),e.queue.writeBuffer(i,0,S),t.setPipeline(d),t.setBindGroup(0,s),t.draw(3)},drawStreamlines(t,o){const{view:u,viewInverse:r,vInf:n,resolution:p,panelData:v,panelCount:l,colorscale:x,lineWidth:M=2,dt:O=.1,noise:N=.2,byPressure:S=0,streamlineCount:b=500,streamlineLength:V=20,opacity:w=1}=o;if(b===0)return;me(l,V);const m=Math.ceil((176+(l+1)*16+256*16)/16)*16,U=new ArrayBuffer(m),g=new Float32Array(U),T=new Uint32Array(U);g.set(u,0),g.set(r,16),g[32]=n[0],g[33]=n[1],g[34]=p[0],g[35]=p[1],g[36]=M,g[37]=O,g[38]=N,g[39]=S,T[40]=l,T[41]=V,g[42]=w;const D=44;g.set(v,D);const W=D+(l+1)*4;g.set(x,W),e.queue.writeBuffer(P,0,U),t.setPipeline(f),t.setBindGroup(0,c),t.setVertexBuffer(0,B),t.setVertexBuffer(1,y),t.draw(V*2,b)},drawAirfoil(t,o){const{view:u,color:r,vertices:n,indices:p}=o;ge(),ye(n,p);const v=new ArrayBuffer(80),l=new Float32Array(v);l.set(u,0),l[16]=r[0],l[17]=r[1],l[18]=r[2],l[19]=r[3],e.queue.writeBuffer(q,0,v),t.setPipeline(H),t.setBindGroup(0,ee),t.setVertexBuffer(0,C),t.setIndexBuffer(I,"uint32"),t.drawIndexed(p.length)},drawPanelEdges(t,o){const{view:u,geometry:r,color:n,lineWidth:p=2,resolution:v}=o;xe(),ve(r),e.queue.writeBuffer(R,0,u);const l=new Float32Array(4);l[0]=n[0],l[1]=n[1],l[2]=n[2],l[3]=p,e.queue.writeBuffer(Y,0,l),F.draw(t,{vertexCount:r.x.length,resolution:v,joinResolution:4,capResolution:4},[oe])},drawVertexPoints(t,o){const{view:u,geometry:r,color:n,pointSize:p,resolution:v}=o;he(),be(r);const l=new ArrayBuffer(112),x=new Float32Array(l);x.set(u,0),x[16]=n[0],x[17]=n[1],x[18]=n[2],x[19]=n[3],x[20]=p,x[22]=v[0],x[23]=v[1],e.queue.writeBuffer(X,0,l),t.setPipeline(z),t.setBindGroup(0,ie),t.draw(4,r.x.length)},drawPressureDist(t,o){const{view:u,geometry:r,cpData:n,scale:p=.05,cpOffset:v=1,color:l=[.2,.5,1,.5]}=o;if(!n||n.cpValues.length===0)return;const x=n.cpValues.length,M=[];for(let m=0;m<x;m++){const U=n.cpValues[m],[g,T]=n.midpoints[m],[D,W]=n.normals[m],k=Math.max(0,(v+U)*p);M.push([g+D*k,T+W*k])}const O=[];for(let m=0;m<x-1;m++){const[U,g]=n.midpoints[m],[T,D]=M[m],[W,k]=n.midpoints[m+1],[Pe,Be]=M[m+1];O.push(U,g,W,k,T,D),O.push(W,k,Pe,Be,T,D)}const N=new Float32Array(O),S=O.length/2,b=N.byteLength;if((S!==se||!G)&&(G&&G.destroy(),G=e.createBuffer({label:"pressure-dist-vertices",size:Math.max(b,64),usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST}),se=S),e.queue.writeBuffer(G,0,N),!j){const m=e.createShaderModule({label:"pressure-dist-shader",code:Le()});$=e.createBuffer({label:"pressure-dist-uniforms",size:80,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});const U=e.createBindGroupLayout({label:"pressure-dist-bind-group-layout",entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]});ue=e.createBindGroup({label:"pressure-dist-bind-group",layout:U,entries:[{binding:0,resource:{buffer:$}}]}),j=e.createRenderPipeline({label:"pressure-dist-pipeline",layout:e.createPipelineLayout({bindGroupLayouts:[U]}),vertex:{module:m,entryPoint:"vertex",buffers:[{arrayStride:8,attributes:[{shaderLocation:0,offset:0,format:"float32x2"}]}]},fragment:{module:m,entryPoint:"fragment",targets:[{format:a,blend:{color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"}}}]},primitive:{topology:"triangle-list"}})}const V=new ArrayBuffer(80),w=new Float32Array(V);w.set(u,0),w[16]=l[0],w[17]=l[1],w[18]=l[2],w[19]=l[3],e.queue.writeBuffer($,0,V),t.setPipeline(j),t.setBindGroup(0,ue),t.setVertexBuffer(0,G),t.draw(S)},destroy(){i&&i.destroy(),P&&P.destroy(),B&&B.destroy(),y&&y.destroy(),q&&q.destroy(),C&&C.destroy(),I&&I.destroy(),F&&F.destroy(),A&&A.destroy(),R&&R.destroy(),Y&&Y.destroy(),z&&(z=null),X&&X.destroy(),L&&L.destroy(),j&&(j=null),$&&$.destroy(),G&&G.destroy()}}}function Re(e,a=256){const d=new Float32Array(a*4);for(let s=0;s<a;s++){const i=s/(a-1),h=e(i);let f,c,P;const B=h.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);if(B)f=parseInt(B[1])/255,c=parseInt(B[2])/255,P=parseInt(B[3])/255;else if(h.startsWith("#")){const y=h.slice(1);y.length===3?(f=parseInt(y[0]+y[0],16)/255,c=parseInt(y[1]+y[1],16)/255,P=parseInt(y[2]+y[2],16)/255):(f=parseInt(y.slice(0,2),16)/255,c=parseInt(y.slice(2,4),16)/255,P=parseInt(y.slice(4,6),16)/255)}else f=c=P=0;d[s*4+0]=f,d[s*4+1]=c,d[s*4+2]=P,d[s*4+3]=1}return d}function ze(e,a){const{x:d,y:s}=e,i=d.length-1,h=a.shape[0]>i,f=new Float32Array((i+1)*4);for(let c=0;c<i+1;c++)f[4*c]=d[c],f[4*c+1]=s[c];for(let c=0;c<i;c++)f[4*(c+1)+2]=a.get(c),f[4*(c+1)+3]=h?a.get(i):0;return f}function Ee(e,a){const d=new Float32Array(16);for(let s=0;s<4;s++)for(let i=0;i<4;i++)d[i*4+s]=e[s]*a[i*4]+e[4+s]*a[i*4+1]+e[8+s]*a[i*4+2]+e[12+s]*a[i*4+3];return d}function _e(e,a,d){const s=Math.cos(e),i=Math.sin(e),h=a*(1-s)+d*i,f=d*(1-s)-a*i;return new Float32Array([s,i,0,0,-i,s,0,0,0,0,1,0,h,f,0,1])}function Ne(e){const{x:a,y:d}=e,s=a.length,i=new Array(s*2);for(let f=0;f<s;f++)i[f*2]=a[f],i[f*2+1]=d[f];const h=Ue(i);return{vertices:new Float32Array(i),indices:new Uint16Array(h)}}export{De as createRenderer,_e as makeRotation,Ee as mat4mul,ze as preparePanelData,Re as quantizeColorscale,Ne as triangulateAirfoil};
