const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/lsao-simple-execute-DNkQQO8C.js","assets/lsao-simple-pipeline-BJYmQjK3.js","assets/lsao-execute-CJ42CoD8.js","assets/lsao-pipeline-DMZya29M.js"])))=>i.map(i=>d[i]);
import{d as b,_ as D}from"./index-ByB2dbry.js";b({root:document.getElementById("cell-2"),expanded:[],variables:[]},{id:2,body:async()=>{const[{getTerrainTile:s,readImageData:u,decodeTerrainData:p},{getTileSet:f},{createWebGPUContext:d},{createLightingPipeline:e},{computeTileLighting:t},{createSimpleLSAOPipeline:a},{computeSimpleLSAO:i},{computeSimpleLSAOCPU:n},{createLSAOPipeline:c,calculateLevelInfo:r},{computeLSAO:o},{computeLSAOCPU:g},{createNormalMapPipeline:v},{computeNormalMap:x}]=await Promise.all([D(()=>import("./main-D-GlyvSx.js"),[]).then(l=>{if(!("getTerrainTile"in l))throw new SyntaxError("export 'getTerrainTile' not found");if(!("readImageData"in l))throw new SyntaxError("export 'readImageData' not found");if(!("decodeTerrainData"in l))throw new SyntaxError("export 'decodeTerrainData' not found");return l}),D(()=>import("./tile-hierarchy-DpM0M6gN.js"),[]).then(l=>{if(!("getTileSet"in l))throw new SyntaxError("export 'getTileSet' not found");return l}),D(()=>import("./webgpu-context-C7RS1Jcc.js"),[]).then(l=>{if(!("createWebGPUContext"in l))throw new SyntaxError("export 'createWebGPUContext' not found");return l}),D(()=>import("./pipeline-c9KGe_7x.js"),[]).then(l=>{if(!("createLightingPipeline"in l))throw new SyntaxError("export 'createLightingPipeline' not found");return l}),D(()=>import("./execute-C0dM5fY0.js"),[]).then(l=>{if(!("computeTileLighting"in l))throw new SyntaxError("export 'computeTileLighting' not found");return l}),D(()=>import("./lsao-simple-pipeline-BJYmQjK3.js"),[]).then(l=>{if(!("createSimpleLSAOPipeline"in l))throw new SyntaxError("export 'createSimpleLSAOPipeline' not found");return l}),D(()=>import("./lsao-simple-execute-DNkQQO8C.js"),__vite__mapDeps([0,1])).then(l=>{if(!("computeSimpleLSAO"in l))throw new SyntaxError("export 'computeSimpleLSAO' not found");return l}),D(()=>import("./lsao-simple-cpu-Dlww0_AN.js"),[]).then(l=>{if(!("computeSimpleLSAOCPU"in l))throw new SyntaxError("export 'computeSimpleLSAOCPU' not found");return l}),D(()=>import("./lsao-pipeline-DMZya29M.js"),[]).then(l=>{if(!("createLSAOPipeline"in l))throw new SyntaxError("export 'createLSAOPipeline' not found");if(!("calculateLevelInfo"in l))throw new SyntaxError("export 'calculateLevelInfo' not found");return l}),D(()=>import("./lsao-execute-CJ42CoD8.js"),__vite__mapDeps([2,3])).then(l=>{if(!("computeLSAO"in l))throw new SyntaxError("export 'computeLSAO' not found");return l}),D(()=>import("./lsao-cpu-D5hqpa4b.js"),[]).then(l=>{if(!("computeLSAOCPU"in l))throw new SyntaxError("export 'computeLSAOCPU' not found");return l}),D(()=>import("./normal-map-pipeline-qrtDypef.js"),[]).then(l=>{if(!("createNormalMapPipeline"in l))throw new SyntaxError("export 'createNormalMapPipeline' not found");return l}),D(()=>import("./normal-map-execute-BbFluDZz.js"),[]).then(l=>{if(!("computeNormalMap"in l))throw new SyntaxError("export 'computeNormalMap' not found");return l})]);return{getTerrainTile:s,readImageData:u,decodeTerrainData:p,getTileSet:f,createWebGPUContext:d,createLightingPipeline:e,computeTileLighting:t,createSimpleLSAOPipeline:a,computeSimpleLSAO:i,computeSimpleLSAOCPU:n,createLSAOPipeline:c,calculateLevelInfo:r,computeLSAO:o,computeLSAOCPU:g,createNormalMapPipeline:v,computeNormalMap:x}},inputs:[],outputs:["getTerrainTile","readImageData","decodeTerrainData","getTileSet","createWebGPUContext","createLightingPipeline","computeTileLighting","createSimpleLSAOPipeline","computeSimpleLSAO","computeSimpleLSAOCPU","createLSAOPipeline","calculateLevelInfo","computeLSAO","computeLSAOCPU","createNormalMapPipeline","computeNormalMap"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-4"),expanded:[],variables:[]},{id:4,body:()=>({coords:{x:795,y:1594,z:12}}),inputs:[],outputs:["coords"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-5"),expanded:[],variables:[]},{id:5,body:(s,u,p,f)=>{const d=s(u),e=p`<div style="font-family: monospace; font-size: 13px;">
  <strong>Target tile:</strong> ${u.z}/${u.x}/${u.y}<br>
  <strong>Tiles needed for hierarchical computation:</strong><br>
  <ul style="margin: 8px 0; padding-left: 20px;">
    ${d.map(t=>p`<li>
      <span style="color: ${t.role==="target"?"#ca4747":"#666"}">
        ${t.role}
      </span>: ${t.z}/${t.x}/${t.y}
    </li>`)}
  </ul>
  <em style="color: #666;">Parent tiles at z-1 provide boundary data for edge handling</em>
</div>`;return f(e),{tiles:d,container:e}},inputs:["getTileSet","coords","html","display"],outputs:["tiles","container"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-7"),expanded:[],variables:[]},{id:7,body:(s,u,p)=>{const f=Math.min(s.z,4),d=u.range([-f,-1],{value:-1,step:1,label:"Δz (parent zoom offset)"}),e=p(d);return{maxDeltaZ:f,input:d,deltaZ:e}},inputs:["coords","Inputs","view"],outputs:["maxDeltaZ","input","deltaZ"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-8"),expanded:[],variables:[]},{id:8,body:async(s,u,p,f,d,e,t)=>{const{getParentTilesAtLevel:a,assembleParentTileBufferMultiLevel:i}=await D(()=>import("./parent-tile-assembly-multi-level-BPsu5Z-Z.js"),[]).then(l=>{if(!("getParentTilesAtLevel"in l))throw new SyntaxError("export 'getParentTilesAtLevel' not found");if(!("assembleParentTileBufferMultiLevel"in l))throw new SyntaxError("export 'assembleParentTileBufferMultiLevel' not found");return l}),n=a(s,u),c=s.z+u;p(f`<div style="font-family: sans-serif; font-size: 13px; color: #666; margin-bottom: 12px;">
  <strong>Parent zoom level:</strong> z${c} (Δz = ${u})<br>
  <strong>Fetching ${n.length} parent tiles...</strong>
</div>`);const r=[];for(const l of n){const m=await d(l),y=e(m.img),h=t(y);r.push({data:h,width:m.width,height:m.height,tileSize:m.tileSize,role:l.role})}const o=i({targetTile:s,parentTiles:r,deltaZ:u,tileSize:512}),{buffer:g,size:v,targetOffset:x}=o;return{getParentTilesAtLevel:a,assembleParentTileBufferMultiLevel:i,parentTileCoords:n,parentZ:c,parentTiles:r,assembled:o,parentBuffer:g,parentSize:v,targetOffset:x}},inputs:["coords","deltaZ","display","html","getTerrainTile","readImageData","decodeTerrainData"],outputs:["getParentTilesAtLevel","assembleParentTileBufferMultiLevel","parentTileCoords","parentZ","parentTiles","assembled","parentBuffer","parentSize","targetOffset"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-9"),expanded:[],variables:[]},{id:9,body:(s,u,p,f,d,e,t)=>{const a=document.createElement("canvas");a.width=s,a.height=s;const i=a.getContext("2d"),n=i.createImageData(s,s),c=Math.pow(2,Math.abs(u)),r=512/c;let o=1/0,g=-1/0;for(let l=0;l<p.length;l++)p[l]<o&&(o=p[l]),p[l]>g&&(g=p[l]);for(let l=0;l<s;l++)for(let m=0;m<s;m++){const y=l*s+m,h=(p[y]-o)/(g-o),S=Math.floor(h*180+75),E=Math.floor(h*140+80),I=Math.floor((1-h)*120+60);n.data[y*4]=S,n.data[y*4+1]=E,n.data[y*4+2]=I,n.data[y*4+3]=255}i.putImageData(n,0,0),i.strokeStyle="#ca4747",i.lineWidth=3,i.strokeRect(f[0],f[1],r,r),i.fillStyle="#ca4747",i.font="bold 14px sans-serif",i.fillText("Target Tile",f[0]+5,f[1]+20);const v=Math.round(s/(512/c)),x=d`<div>
  <div style="margin-bottom: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
    <strong>Parent Buffer Assembly (${s}×${s} at z${e.z+u} resolution)</strong><br>
    Red box shows target tile region (${r.toFixed(0)}×${r.toFixed(0)} at parent resolution)<br>
    Coverage: ${v}×${v} tiles at z${e.z} | Scale: ${c}:1<br>
    Elevation range: ${o.toFixed(1)}m to ${g.toFixed(1)}m
  </div>
  ${a}
  <div style="margin-top: 8px; font-family: sans-serif; font-size: 12px; color: #888;">
    <strong>Key insight:</strong> The ${s}×${s} parent buffer covers a ${v}×${v} block of z${e.z} tiles,
    providing terrain context for horizon initialization in all sweep directions.
    As Δz increases (coarser parents), coverage expands but resolution decreases.
  </div>
</div>`;return t(x),{canvas:a,ctx:i,imageData:n,scale:c,targetSizeAtParent:r,min:o,max:g,tileCoverage:v,container:x}},inputs:["parentSize","deltaZ","parentBuffer","targetOffset","html","coords","display"],outputs:["canvas","ctx","imageData","scale","targetSizeAtParent","min","max","tileCoverage","container"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-10"),expanded:[],variables:[]},{id:10,body:(s,u,p,f)=>{const d=document.createElement("canvas");d.width=800,d.height=400;const e=d.getContext("2d");e.fillStyle="#f9f9f9",e.fillRect(0,0,800,400),e.save(),e.translate(50,50);const t=300/768;e.fillStyle="#e0e0e0",e.fillRect(0,0,768*t,768*t),e.strokeStyle="#999",e.lineWidth=1,e.strokeRect(0,0,768*t,768*t),e.fillStyle="rgba(202, 71, 71, 0.2)",e.fillRect(s[0]*t,s[1]*t,256*t,256*t),e.strokeStyle="#ca4747",e.lineWidth=2,e.strokeRect(s[0]*t,s[1]*t,256*t,256*t),e.fillStyle="#333",e.font="bold 14px sans-serif",e.fillText("Parent Buffer",10,-10),e.font="12px sans-serif",e.fillText("768×768 @ z-1",10,8),e.fillStyle="#ca4747",e.font="bold 12px sans-serif",e.fillText("Target",s[0]*t+5,s[1]*t+20),e.font="11px sans-serif",e.fillText(`[${s[0]}, ${s[1]}]`,s[0]*t+5,s[1]*t+35),e.restore(),e.fillStyle="#666",e.font="20px sans-serif",e.fillText("→",370,230),e.font="12px sans-serif",e.fillText("×2 resolution",350,250),e.save(),e.translate(450,50);const a=300/512;e.fillStyle="rgba(202, 71, 71, 0.3)",e.fillRect(0,0,512*a,512*a),e.strokeStyle="#ca4747",e.lineWidth=2,e.strokeRect(0,0,512*a,512*a),e.fillStyle="#333",e.font="bold 14px sans-serif",e.fillText("Target Tile",10,-10),e.font="12px sans-serif",e.fillText(`512×512 @ z${u.z}`,10,8),e.restore(),e.save(),e.translate(50+768*t/2,50+768*t/2);const i=[{dx:1,dy:0,label:"E",color:"#e74c3c"},{dx:-1,dy:0,label:"W",color:"#3498db"},{dx:0,dy:1,label:"S",color:"#2ecc71"},{dx:0,dy:-1,label:"N",color:"#f39c12"}];i.forEach(({dx:c,dy:r,label:o,color:g})=>{e.beginPath(),e.moveTo(0,0),e.lineTo(c*40,r*40),e.strokeStyle=g,e.lineWidth=2,e.stroke(),e.fillStyle=g,e.font="bold 12px sans-serif",e.fillText(o,c*50-5,r*50+5)}),e.restore();const n=p`<div>
  <div style="margin-bottom: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
    <strong>Coordinate Mapping & Sweep Directions</strong>
  </div>
  ${d}
  <div style="margin-top: 8px; font-family: sans-serif; font-size: 12px; color: #888;">
    Each sweep starts at the parent buffer edge, builds the horizon through parent terrain,
    then continues through the target tile to compute ambient occlusion.
  </div>
</div>`;return f(n),{diagramCanvas:d,ctx:e,scale:t,targetScale:a,arrows:i,container:n}},inputs:["targetOffset","coords","html","display"],outputs:["diagramCanvas","ctx","scale","targetScale","arrows","container"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-12"),expanded:[],variables:[]},{id:12,body:async(s,u,p,f)=>{const d=await s(u),e=p`<div>
  <div style="margin-bottom: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
    Mapbox Terrain RGB encoding: ${d.width}×${d.height}
    (${d.tileSize}×${d.tileSize} + ${d.buffer}px buffer)
  </div>
  ${d.img}
</div>`;return f(e),{targetTile:d,container:e}},inputs:["getTerrainTile","coords","html","display"],outputs:["targetTile","container"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-14"),expanded:[],variables:[]},{id:14,body:(s,u,p,f,d)=>{const e=s(u.img),t=p(e),a=document.createElement("canvas");a.width=u.tileSize,a.height=u.tileSize;const i=a.getContext("2d"),n=i.createImageData(u.tileSize,u.tileSize);let c=1/0,r=-1/0;for(let m=0;m<t.length;m++){const y=t[m];y<c&&(c=y),y>r&&(r=y)}for(let m=0;m<u.tileSize;m++)for(let y=0;y<u.tileSize;y++){const h=(m+u.buffer)*u.width+(y+u.buffer),S=m*u.tileSize+y,E=(t[h]-c)/(r-c),I=Math.floor(E*180+75),w=Math.floor(E*140+80),M=Math.floor((1-E)*120+60);n.data[S*4]=I,n.data[S*4+1]=w,n.data[S*4+2]=M,n.data[S*4+3]=255}i.putImageData(n,0,0);const o=f`<div>
  <div style="margin-bottom: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
    Elevation range: ${c.toFixed(1)}m to ${r.toFixed(1)}m
  </div>
  ${a}
</div>`;d(o);const g=512,v=1,x=g+2*v,l=new Float32Array(x*x);for(let m=0;m<g;m++)for(let y=0;y<g;y++){const h=(m+u.buffer)*u.width+(y+u.buffer),S=(m+v)*x+(y+v);l[S]=t[h]}for(let m=0;m<x;m++)l[m]=l[x+m],l[(x-1)*x+m]=l[(x-2)*x+m];for(let m=0;m<x;m++)l[m*x]=l[m*x+1],l[m*x+(x-1)]=l[m*x+(x-2)];return{imageData:e,elevations:t,canvas:a,ctx:i,imgData:n,min:c,max:r,container:o,tileSize:g,buffer:v,bufferedSize:x,bufferedData:l}},inputs:["readImageData","targetTile","decodeTerrainData","html","display"],outputs:["imageData","elevations","canvas","ctx","imgData","min","max","container","tileSize","buffer","bufferedSize","bufferedData"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-16"),expanded:[],variables:[]},{id:16,body:async(s,u,p,f)=>{const{device:d,adapter:e}=await s(),t=u`<div style="font-family: monospace; font-size: 13px;">
  <strong>WebGPU Context:</strong><br>
  <ul style="margin: 8px 0; padding-left: 20px; list-style: none;">
    <li>✓ Adapter acquired</li>
    <li>✓ Device created</li>
    <li>✓ Ready for compute operations</li>
  </ul>
</div>`;return p(t),f.then(()=>d.destroy()),{device:d,adapter:e,info:t}},inputs:["createWebGPUContext","html","display","invalidation"],outputs:["device","adapter","info"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-17"),expanded:[],variables:[]},{id:17,body:(s,u,p,f)=>{const{pipeline:d,bindGroupLayout:e}=s(u,{tileSize:512,tileBuffer:1}),t=p`<div style="font-family: monospace; font-size: 13px;">
  <strong>Compute Pipeline:</strong><br>
  <ul style="margin: 8px 0; padding-left: 20px; list-style: none;">
    <li>✓ WGSL shader compiled</li>
    <li>✓ Bind group layout created (3 bindings)</li>
    <li>✓ Compute pipeline ready</li>
    <li style="margin-top: 4px; color: #666;">→ Workgroup size: 16×16</li>
    <li style="color: #666;">→ Algorithm: Normal-based directional lighting</li>
  </ul>
</div>`;return f(t),{pipeline:d,bindGroupLayout:e,info:t}},inputs:["createLightingPipeline","device","html","display"],outputs:["pipeline","bindGroupLayout","info"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-19"),expanded:[],variables:[]},{id:19,body:async(s,u,p,f,d,e,t,a)=>{const n=78271.517578125/Math.pow(2,s.z),c=await u({device:p,pipeline:f,bindGroupLayout:d,terrainData:e,tileSize:512,pixelSize:n});let r=1/0,o=-1/0,g=0;for(let l=0;l<c.length;l++){const m=c[l];m<r&&(r=m),m>o&&(o=m),g+=m}const v={min:r,max:o,mean:g/c.length},x=t`<div style="margin-bottom: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
  Lighting values: min=${v.min.toFixed(3)}, max=${v.max.toFixed(3)}, mean=${v.mean.toFixed(3)}<br>
  Pixel size: ${n.toFixed(3)}m (zoom ${s.z})
</div>`;return a(x),{EARTH_CIRCUMFERENCE:40075017,pixelSize:n,result:c,min:r,max:o,sum:g,stats:v,info:x}},inputs:["coords","computeTileLighting","device","pipeline","bindGroupLayout","bufferedData","html","display"],outputs:["EARTH_CIRCUMFERENCE","pixelSize","result","min","max","sum","stats","info"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-20"),expanded:[],variables:[]},{id:20,body:(s,u,p)=>{const f=document.createElement("canvas");f.width=512,f.height=512;const d=f.getContext("2d"),e=d.createImageData(512,512);for(let a=0;a<s.length;a++){const i=Math.floor(Math.min(Math.max(s[a],0),1)*255);e.data[a*4]=i,e.data[a*4+1]=i,e.data[a*4+2]=i,e.data[a*4+3]=255}d.putImageData(e,0,0);const t=u`<div>
  ${f}
  <div style="margin-top: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
    <em>Directional lighting from northwest at 45° elevation</em>
  </div>
</div>`;return p(t),{canvas:f,ctx:d,imageData:e,container:t}},inputs:["result","html","display"],outputs:["canvas","ctx","imageData","container"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-22"),expanded:[],variables:[]},{id:22,body:(s,u,p,f)=>{const{pipeline:d,bindGroupLayout:e}=s(u,{tileSize:512,tileBuffer:1,workgroupSize:128}),t=p`<div style="font-family: monospace; font-size: 13px;">
  <strong>LSAO Compute Pipeline:</strong><br>
  <ul style="margin: 8px 0; padding-left: 20px; list-style: none;">
    <li>✓ LSAO shader compiled</li>
    <li>✓ Bind group layout created</li>
    <li>✓ Pipeline ready for 4-direction sweep</li>
    <li style="margin-top: 4px; color: #666;">→ Workgroup size: 128 (scanline parallelism)</li>
    <li style="color: #666;">→ Algorithm: Line-sweep horizon tracking</li>
  </ul>
</div>`;return f(t),{lsaoPipeline:d,lsaoBindGroupLayout:e,info:t}},inputs:["createSimpleLSAOPipeline","device","html","display"],outputs:["lsaoPipeline","lsaoBindGroupLayout","info"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-23"),expanded:[],variables:[]},{id:23,body:async(s,u,p,f,d,e,t,a)=>{const n=78271.517578125/Math.pow(2,s.z),c=performance.now(),r=await u({device:p,pipeline:f,bindGroupLayout:d,terrainData:e,tileSize:512,pixelSize:n,workgroupSize:128,directions:[[1,0],[-1,0],[0,1],[0,-1]]}),o=performance.now()-c;let g=1/0,v=-1/0,x=0;for(let y=0;y<r.length;y++){const h=r[y];h<g&&(g=h),h>v&&(v=h),x+=h}const l={min:g,max:v,mean:x/r.length},m=t`<div style="margin-bottom: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
  LSAO values: min=${l.min.toFixed(3)}, max=${l.max.toFixed(3)}, mean=${l.mean.toFixed(3)}<br>
  Computation time: ${o.toFixed(1)}ms (4 direction sweeps)<br>
  Pixel size: ${n.toFixed(3)}m
</div>`;return a(m),{EARTH_CIRCUMFERENCE:40075017,pixelSize:n,startTime:c,lsaoResult:r,elapsed:o,min:g,max:v,sum:x,lsaoStats:l,info:m}},inputs:["coords","computeSimpleLSAO","device","lsaoPipeline","lsaoBindGroupLayout","bufferedData","html","display"],outputs:["EARTH_CIRCUMFERENCE","pixelSize","startTime","lsaoResult","elapsed","min","max","sum","lsaoStats","info"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-24"),expanded:[],variables:[]},{id:24,body:(s,u,p)=>{const f=document.createElement("canvas");f.width=512,f.height=512;const d=f.getContext("2d"),e=d.createImageData(512,512);for(let a=0;a<s.length;a++){const i=Math.floor(Math.min(Math.max(s[a],0),1)*255);e.data[a*4]=i,e.data[a*4+1]=i,e.data[a*4+2]=i,e.data[a*4+3]=255}d.putImageData(e,0,0);const t=u`<div>
  ${f}
  <div style="margin-top: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
    <em>Simple LSAO result (raw values, no normalization)</em>
  </div>
</div>`;return p(t),{canvas:f,ctx:d,imageData:e,container:t}},inputs:["lsaoResult","html","display"],outputs:["canvas","ctx","imageData","container"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-26"),expanded:[],variables:[]},{id:26,body:(s,u,p,f,d)=>{let e=1/0,t=-1/0;for(let r=0;r<s.length;r++){const o=s[r];o<e&&(e=o),o>t&&(t=o)}const a=document.createElement("canvas");a.width=512,a.height=512;const i=a.getContext("2d"),n=i.createImageData(512,512);for(let r=0;r<512;r++)for(let o=0;o<512;o++){const g=r*512+o,v=(r+1)*u.width+(o+1),x=(s[v]-e)/(t-e),l=Math.min(Math.max(p[g],0),1),m=x*l,y=Math.floor(m*180+75),h=Math.floor(m*140+80),S=Math.floor((1-m)*120+60);n.data[g*4]=y,n.data[g*4+1]=h,n.data[g*4+2]=S,n.data[g*4+3]=255}i.putImageData(n,0,0);const c=f`<div>
  ${a}
  <div style="margin-top: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
    <em>Shaded relief: LSAO × normalized elevation with terrain colors</em>
  </div>
</div>`;return d(c),{elevMin:e,elevMax:t,canvas:a,ctx:i,imageData:n,container:c}},inputs:["elevations","targetTile","lsaoResult","html","display"],outputs:["elevMin","elevMax","canvas","ctx","imageData","container"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-28"),expanded:[],variables:[]},{id:28,body:(s,u,p,f)=>{const{pipeline:d,bindGroupLayout:e}=s(u,{tileSize:512,tileBuffer:1}),t=p`<div style="font-family: monospace; font-size: 13px;">
  <strong>Normal Map Pipeline:</strong><br>
  <ul style="margin: 8px 0; padding-left: 20px; list-style: none;">
    <li>✓ Normal map shader compiled</li>
    <li>✓ Web Mercator distortion correction enabled</li>
    <li>✓ Physically-correct normal vectors</li>
    <li style="margin-top: 4px; color: #666;">→ Workgroup size: 16×16</li>
    <li style="color: #666;">→ Output: RGB (R=ny, G=reserved, B=nx)</li>
  </ul>
</div>`;return f(t),{normalPipeline:d,normalBindGroupLayout:e,info:t}},inputs:["createNormalMapPipeline","device","html","display"],outputs:["normalPipeline","normalBindGroupLayout","info"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-29"),expanded:[],variables:[]},{id:29,body:async(s,u,p,f,d,e,t,a)=>{const i=await s({device:u,pipeline:p,bindGroupLayout:f,terrainData:d,tileX:e.x,tileY:e.y,tileZ:e.z,tileSize:512}),n=t`<div style="margin-bottom: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
  Normal map computed (${i.length/4} pixels, vec3 per pixel with 16-byte alignment)
</div>`;return a(n),{normalMapData:i,info:n}},inputs:["computeNormalMap","device","normalPipeline","normalBindGroupLayout","bufferedData","coords","html","display"],outputs:["normalMapData","info"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-30"),expanded:[],variables:[]},{id:30,body:(s,u,p,f,d)=>{const e=document.createElement("canvas");e.width=512,e.height=512;const t=e.getContext("2d"),a=t.createImageData(512,512);for(let n=0;n<512*512;n++){const c=(s[n]-u.min)/(u.max-u.min),r=p[n*4+0],o=p[n*4+2],g=c;a.data[n*4+0]=Math.floor(Math.min(Math.max(r,0),1)*255),a.data[n*4+1]=Math.floor(Math.min(Math.max(g,0),1)*255),a.data[n*4+2]=Math.floor(Math.min(Math.max(o,0),1)*255),a.data[n*4+3]=255}t.putImageData(a,0,0);const i=f`<div>
  ${e}
  <div style="margin-top: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
    <strong>Final Lighting Map</strong><br>
    R: Normal Y (fy = 0.5 + 0.5×ny) | G: Ambient Occlusion | B: Normal X (fx = 0.5 - 0.5×nx)
  </div>
</div>`;return d(i),{canvas:e,ctx:t,imageData:a,container:i}},inputs:["lsaoResult","lsaoStats","normalMapData","html","display"],outputs:["canvas","ctx","imageData","container"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-32"),expanded:[],variables:[]},{id:32,body:(s,u,p,f,d)=>{const e=[],t=document.createElement("canvas");t.width=512,t.height=512;let a=t.getContext("2d"),i=a.createImageData(512,512);for(let o=0;o<512*512;o++){const g=Math.floor(s[o*4+0]*255);i.data[o*4+0]=g,i.data[o*4+1]=g,i.data[o*4+2]=g,i.data[o*4+3]=255}a.putImageData(i,0,0);const n=document.createElement("canvas");n.width=512,n.height=512,a=n.getContext("2d"),i=a.createImageData(512,512);for(let o=0;o<512*512;o++){const g=(u[o]-p.min)/(p.max-p.min),v=Math.floor(g*255);i.data[o*4+0]=v,i.data[o*4+1]=v,i.data[o*4+2]=v,i.data[o*4+3]=255}a.putImageData(i,0,0);const c=document.createElement("canvas");c.width=512,c.height=512,a=c.getContext("2d"),i=a.createImageData(512,512);for(let o=0;o<512*512;o++){const g=Math.floor(s[o*4+2]*255);i.data[o*4+0]=g,i.data[o*4+1]=g,i.data[o*4+2]=g,i.data[o*4+3]=255}a.putImageData(i,0,0);const r=f`<div>
  <div>
    ${t}
    <div style="margin-top: 4px; font-family: sans-serif; font-size: 12px; color: #e74c3c; text-align: center;">
      <strong>Red Channel</strong><br>
      Normal Y (fy)
    </div>
  </div>
  <div>
    ${n}
    <div style="margin-top: 4px; font-family: sans-serif; font-size: 12px; color: #27ae60; text-align: center;">
      <strong>Green Channel</strong><br>
      Ambient Occlusion
    </div>
  </div>
  <div>
    ${c}
    <div style="margin-top: 4px; font-family: sans-serif; font-size: 12px; color: #3498db; text-align: center;">
      <strong>Blue Channel</strong><br>
      Normal X (fx)
    </div>
  </div>
</div>`;return d(r),{canvases:e,canvasR:t,ctx:a,imgData:i,canvasG:n,canvasB:c,container:r}},inputs:["normalMapData","lsaoResult","lsaoStats","html","display"],outputs:["canvases","canvasR","ctx","imgData","canvasG","canvasB","container"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-34"),expanded:[],variables:[]},{id:34,body:(s,u)=>{function p(t){const a=new Float32Array(t*t);return a.fill(0),a}function f(){const a=new Float32Array(589824);for(let i=0;i<768;i++)for(let n=0;n<768;n++)if(n<128)a[i*768+n]=100;else if(n<256){const c=(n-128)/128;a[i*768+n]=100*(1-c)}else a[i*768+n]=0;return a}const d=p(514),e=f();return s(u`<div style="font-family: sans-serif; font-size: 13px; color: #666; margin-bottom: 12px;">
  ✓ Created synthetic test data<br>
  • Target: 514×514 flat terrain (z=0)<br>
  • Parent: 768×768 with elevated ridge to west (z=100)
</div>`),{createSyntheticTarget:p,createSyntheticParent768:f,syntheticTarget:d,syntheticParent:e}},inputs:["display","html"],outputs:["createSyntheticTarget","createSyntheticParent768","syntheticTarget","syntheticParent"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-35"),expanded:[],variables:[]},{id:35,body:(s,u,p)=>{const f=document.createElement("canvas");f.width=768,f.height=200;const d=f.getContext("2d"),e=d.createImageData(768,200);for(let t=0;t<200;t++)for(let a=0;a<768;a++){const n=s[t*768+a]/100,c=Math.floor(n*255);e.data[(t*768+a)*4]=c,e.data[(t*768+a)*4+1]=c,e.data[(t*768+a)*4+2]=c,e.data[(t*768+a)*4+3]=255}return d.putImageData(e,0,0),d.strokeStyle="#ca4747",d.lineWidth=2,d.strokeRect(128,0,512,200),u(p`<div>
  <div style="margin-bottom: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
    <strong>Parent Buffer Terrain</strong> (768×768, showing top 200 rows)<br>
    White = elevated (z=100), Black = flat (z=0), Red box = target tile region
  </div>
  ${f}
</div>`),{canvas:f,ctx:d,imageData:e}},inputs:["syntheticParent","display","html"],outputs:["canvas","ctx","imageData"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-36"),expanded:[],variables:[]},{id:36,body:async(s,u,p,f,d,e)=>{const{pipeline:t,bindGroupLayout:a}=s(u,{tileSize:512,tileBuffer:1,workgroupSize:128}),i=await p({device:u,pipeline:t,bindGroupLayout:a,terrainData:f,tileSize:512,pixelSize:19.1,workgroupSize:128,directions:[[1,0]]});let n=0;for(let v=0;v<512;v++)n+=i[v*512];const c=n/512;d(e`<div style="font-family: sans-serif; font-size: 13px; color: #666;">
  <strong>Simple LSAO (no parent data):</strong><br>
  West edge mean: ${c.toFixed(4)}<br>
  <em>Should be ~1.0 (no occlusion) since it can't see the elevated parent terrain</em>
</div>`);const r=document.createElement("canvas");r.width=512,r.height=200;const o=r.getContext("2d"),g=o.createImageData(512,200);for(let v=0;v<200;v++)for(let x=0;x<512;x++){const l=Math.floor(i[v*512+x]*255);g.data[(v*512+x)*4]=l,g.data[(v*512+x)*4+1]=l,g.data[(v*512+x)*4+2]=l,g.data[(v*512+x)*4+3]=255}return o.putImageData(g,0,0),d(r),{synthSimplePipeline:t,synthSimpleBindGroup:a,synthSimpleResult:i,westEdgeSum:n,westEdgeMean:c,canvasSimple:r,ctxSimple:o,imgSimple:g}},inputs:["createSimpleLSAOPipeline","device","computeSimpleLSAO","syntheticTarget","display","html"],outputs:["synthSimplePipeline","synthSimpleBindGroup","synthSimpleResult","westEdgeSum","westEdgeMean","canvasSimple","ctxSimple","imgSimple"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-37"),expanded:[],variables:[]},{id:37,body:async(s,u,p,f,d,e,t,a)=>{const i=[s(-1,512)],{pipeline:n,bindGroupLayout:c}=u(p,{tileSize:512,tileBuffer:1,numLevels:1,workgroupSize:128}),r=await f({device:p,pipeline:n,bindGroupLayout:c,targetData:d,parentLevels:[e],levelInfo:i,tileSize:512,pixelSize:19.1,workgroupSize:128,directions:[[1,0]]});let o=0;for(let m=0;m<512;m++)o+=r[m*512];const g=o/512;t(a`<div style="font-family: sans-serif; font-size: 13px; color: #666;">
  <strong>Multi-Level LSAO (with parent data):</strong><br>
  West edge mean: ${g.toFixed(4)}<br>
  <em>Should be significantly &lt; 1.0 (strong occlusion from elevated ridge)</em>
</div>`);const v=document.createElement("canvas");v.width=512,v.height=200;const x=v.getContext("2d"),l=x.createImageData(512,200);for(let m=0;m<200;m++)for(let y=0;y<512;y++){const h=Math.floor(r[m*512+y]*255);l.data[(m*512+y)*4]=h,l.data[(m*512+y)*4+1]=h,l.data[(m*512+y)*4+2]=h,l.data[(m*512+y)*4+3]=255}return x.putImageData(l,0,0),t(v),{synthLevelInfo:i,synthMultiPipeline:n,synthMultiBindGroup:c,synthMultiResult:r,westEdgeSum:o,westEdgeMean:g,canvasMulti:v,ctxMulti:x,imgMulti:l}},inputs:["calculateLevelInfo","createLSAOPipeline","device","computeLSAO","syntheticTarget","syntheticParent","display","html"],outputs:["synthLevelInfo","synthMultiPipeline","synthMultiBindGroup","synthMultiResult","westEdgeSum","westEdgeMean","canvasMulti","ctxMulti","imgMulti"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-38"),expanded:[],variables:[]},{id:38,body:(s,u,p,f)=>{const d=document.createElement("canvas");d.width=512,d.height=100;const e=d.getContext("2d"),t=e.createImageData(512,100);for(let a=0;a<100;a++)for(let i=0;i<512;i++){const n=a*512+i,c=s[n]-u[n],r=Math.floor(Math.min(Math.max(c*2,0),1)*255),o=Math.floor(Math.min(Math.max(-c*2,0),1)*255);t.data[n*4]=r,t.data[n*4+1]=0,t.data[n*4+2]=o,t.data[n*4+3]=255}return e.putImageData(t,0,0),p(f`<div>
  <div style="margin-bottom: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
    <strong>Difference Map (Simple - Multi)</strong> - Top 100 rows<br>
    <span style="color: #e74c3c;">■</span> Red = Multi-level shows MORE shadow (correct)<br>
    <span style="color: #3498db;">■</span> Blue = Multi-level shows LESS shadow (incorrect)
  </div>
  ${d}
  <div style="margin-top: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
    <strong>Expected:</strong> West edge (left) should be RED (multi-level sees elevated parent terrain)<br>
    <strong>If blue on west edge:</strong> Bug - multi-level is not correctly sampling parent data
  </div>
</div>`),{canvas:d,ctx:e,imageData:t}},inputs:["synthSimpleResult","synthMultiResult","display","html"],outputs:["canvas","ctx","imageData"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-40"),expanded:[],variables:[]},{id:40,body:(s,u)=>{const p=s.range([1,3],{value:2,step:1,label:"Number of parent levels"}),f=u(p);return{numLevelsInput:p,numLevels:f}},inputs:["Inputs","view"],outputs:["numLevelsInput","numLevels"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-41"),expanded:[],variables:[]},{id:41,body:async(s,u,p,f,d,e,t,a)=>{const{getParentTilesAtLevel:i,assembleParentTileBufferMultiLevel:n}=await D(()=>import("./parent-tile-assembly-multi-level-BPsu5Z-Z.js"),[]).then(o=>{if(!("getParentTilesAtLevel"in o))throw new SyntaxError("export 'getParentTilesAtLevel' not found");if(!("assembleParentTileBufferMultiLevel"in o))throw new SyntaxError("export 'assembleParentTileBufferMultiLevel' not found");return o});s(u`<div style="font-family: sans-serif; font-size: 13px; color: #666; margin-bottom: 12px;">
  <strong>Fetching parent tiles for ${p} level${p>1?"s":""}...</strong>
</div>`);const c=[],r=[];for(let o=1;o<=p;o++){const g=-o,v=i(f,g),x=[];for(const m of v){const y=await d(m),h=e(y.img),S=t(h);x.push({data:S,width:y.width,height:y.height,tileSize:y.tileSize,role:m.role})}const l=n({targetTile:f,parentTiles:x,deltaZ:g,tileSize:512});c.push(l.buffer),r.push(a(g,512))}return s(u`<div style="font-family: sans-serif; font-size: 13px; color: #666; margin-bottom: 12px;">
  ✓ Assembled ${p} parent level${p>1?"s":""}:<br>
  ${r.map((o,g)=>u`
    <span style="margin-left: 12px;">• Level ${g}: ${o.bufferSize}×${o.bufferSize} (Δz=${-(g+1)})</span><br>
  `)}
</div>`),{getParentTilesAtLevel:i,assembleParentTileBufferMultiLevel:n,parentLevelsData:c,levelInfo:r}},inputs:["display","html","numLevels","coords","getTerrainTile","readImageData","decodeTerrainData","calculateLevelInfo"],outputs:["getParentTilesAtLevel","assembleParentTileBufferMultiLevel","parentLevelsData","levelInfo"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-42"),expanded:[],variables:[]},{id:42,body:(s,u,p,f,d)=>{const{pipeline:e,bindGroupLayout:t}=s(u,{tileSize:512,tileBuffer:1,numLevels:p,workgroupSize:128});return f(d`<div style="font-family: sans-serif; font-size: 13px; color: #666; margin-bottom: 12px;">
  ✓ Created multi-level LSAO pipeline (${p} levels)
</div>`),{multiLevelPipeline:e,multiLevelBindGroupLayout:t}},inputs:["createLSAOPipeline","device","numLevels","display","html"],outputs:["multiLevelPipeline","multiLevelBindGroupLayout"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-43"),expanded:[],variables:[]},{id:43,body:async(s,u,p,f,d,e,t,a,i,n,c,r,o)=>{const v=78271.517578125/Math.pow(2,s.z),x=performance.now(),l=await u({device:p,pipeline:f,bindGroupLayout:d,targetData:e,parentLevels:t,levelInfo:a,tileSize:512,pixelSize:v,workgroupSize:128,directions:[[1,0],[-1,0],[0,1],[0,-1]]}),m=performance.now()-x;let y=1/0,h=-1/0,S=0;for(let L=0;L<l.length;L++){const z=l[L];z<y&&(y=z),z>h&&(h=z),S+=z}const E={min:y,max:h,mean:S/l.length};let I=0,w=0;for(let L=0;L<l.length;L++){const z=Math.abs(l[L]-i[L]);I+=z,w=Math.max(w,z)}const M=I/l.length,P=M/n.mean*100,C=c`<div style="margin-bottom: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
  <strong>Multi-Level LSAO Results:</strong><br>
  Values: min=${E.min.toFixed(3)}, max=${E.max.toFixed(3)}, mean=${E.mean.toFixed(3)}<br>
  Computation time: ${m.toFixed(1)}ms (4 direction sweeps × ${r} level${r>1?"s":""})<br>
  Status: ${y>=0&&h<=1.1?"✓ Values in expected range":"⚠️ Values outside expected range"}<br>
  <br>
  <strong>Comparison to Simple LSAO:</strong><br>
  Simple LSAO mean: ${n.mean.toFixed(3)}<br>
  Mean difference: ${M.toFixed(4)} (${P.toFixed(1)}%)<br>
  Max difference: ${w.toFixed(4)}<br>
  ${P>10?'<span style="color: #ca4747;">⚠️ Large difference suggests possible bug</span>':'<span style="color: #27ae60;">✓ Difference within expected range</span>'}
</div>`;return o(C),{EARTH_CIRCUMFERENCE:40075017,pixelSize:v,startTime:x,multiLevelResult:l,elapsed:m,min:y,max:h,sum:S,multiLevelStats:E,totalDiff:I,maxDiff:w,meanDiff:M,meanDiffPercent:P,info:C}},inputs:["coords","computeLSAO","device","multiLevelPipeline","multiLevelBindGroupLayout","bufferedData","parentLevelsData","levelInfo","lsaoResult","lsaoStats","html","numLevels","display"],outputs:["EARTH_CIRCUMFERENCE","pixelSize","startTime","multiLevelResult","elapsed","min","max","sum","multiLevelStats","totalDiff","maxDiff","meanDiff","meanDiffPercent","info"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-44"),expanded:[],variables:[]},{id:44,body:(s,u,p,f)=>{const d=document.createElement("canvas");d.width=512,d.height=512;const e=d.getContext("2d"),t=e.createImageData(512,512);for(let i=0;i<s.length;i++){const n=Math.floor(Math.min(Math.max(s[i],0),1)*255);t.data[i*4]=n,t.data[i*4+1]=n,t.data[i*4+2]=n,t.data[i*4+3]=255}e.putImageData(t,0,0);const a=u`<div>
  ${d}
  <div style="margin-top: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
    <em>Multi-level LSAO result (${p} parent level${p>1?"s":""}, raw values, no normalization)</em><br>
    <strong>Benefit:</strong> Parent tiles provide proper horizon initialization, eliminating boundary artifacts
  </div>
</div>`;return f(a),{canvas:d,ctx:e,imageData:t,container:a}},inputs:["multiLevelResult","html","numLevels","display"],outputs:["canvas","ctx","imageData","container"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-46"),expanded:[],variables:[]},{id:46,body:(s,u,p,f,d)=>{const e=document.createElement("canvas");e.width=512,e.height=512;let t=e.getContext("2d"),a=t.createImageData(512,512);for(let r=0;r<s.length;r++){const o=Math.floor(Math.min(Math.max(s[r],0),1)*255);a.data[r*4]=o,a.data[r*4+1]=o,a.data[r*4+2]=o,a.data[r*4+3]=255}t.putImageData(a,0,0);const i=document.createElement("canvas");i.width=512,i.height=512,t=i.getContext("2d"),a=t.createImageData(512,512);for(let r=0;r<u.length;r++){const o=Math.floor(Math.min(Math.max(u[r],0),1)*255);a.data[r*4]=o,a.data[r*4+1]=o,a.data[r*4+2]=o,a.data[r*4+3]=255}t.putImageData(a,0,0);const n=document.createElement("canvas");n.width=512,n.height=512,t=n.getContext("2d"),a=t.createImageData(512,512);for(let r=0;r<s.length;r++){const o=Math.abs(u[r]-s[r]),g=Math.floor(o*512);a.data[r*4]=Math.min(g,255),a.data[r*4+1]=Math.min(g,255),a.data[r*4+2]=Math.min(g,255),a.data[r*4+3]=255}t.putImageData(a,0,0);const c=p`<div style="display: flex; flex-direction: column; gap: 24px;">
  <div>
    <div style="margin-bottom: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
      <strong>Simple LSAO</strong> (target tile only)
    </div>
    ${e}
  </div>
  <div>
    <div style="margin-bottom: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
      <strong>Multi-Level LSAO</strong> (${f} parent level${f>1?"s":""})
    </div>
    ${i}
  </div>
  <div>
    <div style="margin-bottom: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
      <strong>Difference (×2)</strong> - Edge improvements highlighted
    </div>
    ${n}
  </div>
</div>`;return d(c),{canvasSimple:e,ctx:t,imgData:a,canvasMulti:i,canvasDiff:n,container:c}},inputs:["lsaoResult","multiLevelResult","html","numLevels","display"],outputs:["canvasSimple","ctx","imgData","canvasMulti","canvasDiff","container"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-48"),expanded:[],variables:[]},{id:48,body:(s,u,p,f,d,e)=>{const t=performance.now(),a=40075017,i=a/512/Math.pow(2,s.z),n=u({terrainData:p,tileSize:512,pixelSize:i,directions:[[1,0],[-1,0],[0,1],[0,-1]]}),c=performance.now()-t;let r=1/0,o=-1/0,g=0;for(let S=0;S<n.length;S++){const E=n[S];E<r&&(r=E),E>o&&(o=E),g+=E}const v={min:r,max:o,mean:g/n.length};let x=0,l=0,m=0;for(let S=0;S<n.length;S++){const E=Math.abs(n[S]-f[S]);x+=E,l=Math.max(l,E),E>.001&&m++}const y=x/n.length,h=d`<div style="margin-bottom: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
  <strong>Simple LSAO - CPU Implementation:</strong><br>
  Values: min=${v.min.toFixed(3)}, max=${v.max.toFixed(3)}, mean=${v.mean.toFixed(3)}<br>
  Computation time: ${c.toFixed(1)}ms<br>
  <br>
  <strong>CPU vs GPU Comparison:</strong><br>
  Mean absolute difference: ${y.toFixed(6)}<br>
  Max absolute difference: ${l.toFixed(6)}<br>
  Pixels with diff > 0.001: ${m} (${(m/n.length*100).toFixed(2)}%)<br>
  ${y<1e-4?'<span style="color: #27ae60;">✓ Excellent match - implementations are equivalent</span>':y<.001?'<span style="color: #f39c12;">⚠️ Small differences - likely floating-point precision</span>':'<span style="color: #ca4747;">⚠️ Large differences - possible bug!</span>'}
</div>`;return e(h),{cpuStartTime:t,EARTH_CIRCUMFERENCE:a,cpuPixelSize:i,cpuSimpleResult:n,cpuElapsed:c,min:r,max:o,sum:g,cpuStats:v,totalDiff:x,maxDiff:l,diffCount:m,meanDiff:y,info:h}},inputs:["coords","computeSimpleLSAOCPU","bufferedData","lsaoResult","html","display"],outputs:["cpuStartTime","EARTH_CIRCUMFERENCE","cpuPixelSize","cpuSimpleResult","cpuElapsed","min","max","sum","cpuStats","totalDiff","maxDiff","diffCount","meanDiff","info"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-49"),expanded:[],variables:[]},{id:49,body:(s,u,p,f)=>{const d=document.createElement("canvas");d.width=512,d.height=512;let e=d.getContext("2d"),t=e.createImageData(512,512);for(let n=0;n<s.length;n++){const c=Math.floor(Math.min(Math.max(s[n],0),1)*255);t.data[n*4]=c,t.data[n*4+1]=c,t.data[n*4+2]=c,t.data[n*4+3]=255}e.putImageData(t,0,0);const a=document.createElement("canvas");a.width=512,a.height=512,e=a.getContext("2d"),t=e.createImageData(512,512);for(let n=0;n<s.length;n++){const c=Math.abs(s[n]-u[n]),r=Math.floor(Math.min(c*1e3,1)*255);t.data[n*4]=r,t.data[n*4+1]=r,t.data[n*4+2]=r,t.data[n*4+3]=255}e.putImageData(t,0,0);const i=p`<div style="display: flex; flex-direction: column; gap: 24px;">
  <div>
    <div style="margin-bottom: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
      <strong>CPU Result</strong>
    </div>
    ${d}
  </div>
  <div>
    <div style="margin-bottom: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
      <strong>Absolute Difference (×1000)</strong> - White = larger difference
    </div>
    ${a}
  </div>
</div>`;return f(i),{canvasCPU:d,ctx:e,imgData:t,canvasDiff:a,container:i}},inputs:["cpuSimpleResult","lsaoResult","html","display"],outputs:["canvasCPU","ctx","imgData","canvasDiff","container"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-50"),expanded:[],variables:[]},{id:50,body:(s,u,p,f,d,e,t,a,i)=>{const n=performance.now(),c=40075017,r=c/512/Math.pow(2,s.z),o=u({targetData:p,parentLevels:f,levelInfo:d,tileSize:512,pixelSize:r,directions:[[1,0],[-1,0],[0,1],[0,-1]]}),g=performance.now()-n;let v=1/0,x=-1/0,l=0;for(let w=0;w<o.length;w++){const M=o[w];M<v&&(v=M),M>x&&(x=M),l+=M}const m={min:v,max:x,mean:l/o.length};let y=0,h=0,S=0;for(let w=0;w<o.length;w++){const M=Math.abs(o[w]-e[w]);y+=M,h=Math.max(h,M),M>.001&&S++}const E=y/o.length,I=t`<div style="margin-bottom: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
  <strong>Multi-Level LSAO - CPU Implementation (${a} levels):</strong><br>
  Values: min=${m.min.toFixed(3)}, max=${m.max.toFixed(3)}, mean=${m.mean.toFixed(3)}<br>
  Computation time: ${g.toFixed(1)}ms<br>
  <br>
  <strong>CPU vs GPU Comparison:</strong><br>
  Mean absolute difference: ${E.toFixed(6)}<br>
  Max absolute difference: ${h.toFixed(6)}<br>
  Pixels with diff > 0.001: ${S} (${(S/o.length*100).toFixed(2)}%)<br>
  ${E<1e-4?'<span style="color: #27ae60;">✓ Excellent match - implementations are equivalent</span>':E<.001?'<span style="color: #f39c12;">⚠️ Small differences - likely floating-point precision</span>':'<span style="color: #ca4747;">⚠️ Large differences - possible bug!</span>'}
</div>`;return i(I),{cpuMultiStartTime:n,EARTH_CIRCUMFERENCE:c,cpuMultiPixelSize:r,cpuMultiResult:o,cpuMultiElapsed:g,min:v,max:x,sum:l,cpuMultiStats:m,totalDiff:y,maxDiff:h,diffCount:S,meanDiff:E,info:I}},inputs:["coords","computeLSAOCPU","bufferedData","parentLevelsData","levelInfo","multiLevelResult","html","numLevels","display"],outputs:["cpuMultiStartTime","EARTH_CIRCUMFERENCE","cpuMultiPixelSize","cpuMultiResult","cpuMultiElapsed","min","max","sum","cpuMultiStats","totalDiff","maxDiff","diffCount","meanDiff","info"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});b({root:document.getElementById("cell-51"),expanded:[],variables:[]},{id:51,body:(s,u,p,f,d)=>{const e=document.createElement("canvas");e.width=512,e.height=512;let t=e.getContext("2d"),a=t.createImageData(512,512);for(let c=0;c<s.length;c++){const r=Math.floor(Math.min(Math.max(s[c],0),1)*255);a.data[c*4]=r,a.data[c*4+1]=r,a.data[c*4+2]=r,a.data[c*4+3]=255}t.putImageData(a,0,0);const i=document.createElement("canvas");i.width=512,i.height=512,t=i.getContext("2d"),a=t.createImageData(512,512);for(let c=0;c<s.length;c++){const r=Math.abs(s[c]-u[c]),o=Math.floor(Math.min(r*1e3,1)*255);a.data[c*4]=o,a.data[c*4+1]=o,a.data[c*4+2]=o,a.data[c*4+3]=255}t.putImageData(a,0,0);const n=p`<div style="display: flex; flex-direction: column; gap: 24px;">
  <div>
    <div style="margin-bottom: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
      <strong>CPU Result (${f} levels)</strong>
    </div>
    ${e}
  </div>
  <div>
    <div style="margin-bottom: 8px; font-family: sans-serif; font-size: 13px; color: #666;">
      <strong>Absolute Difference (×1000)</strong> - White = larger difference
    </div>
    ${i}
  </div>
</div>`;return d(n),{canvasCPU:e,ctx:t,imgData:a,canvasDiff:i,container:n}},inputs:["cpuMultiResult","multiLevelResult","html","numLevels","display"],outputs:["canvasCPU","ctx","imgData","canvasDiff","container"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});
