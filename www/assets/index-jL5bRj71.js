import{d as a,_ as d}from"./index-ByB2dbry.js";a({root:document.getElementById("cell-2"),expanded:[],variables:[]},{id:2,body:async()=>{const{createWebGPUContext:t}=await d(()=>import("./webgpu-canvas-GARrWAyr.js"),[]).then(e=>{if(!("createWebGPUContext"in e))throw new SyntaxError("export 'createWebGPUContext' not found");return e});return{createWebGPUContext:t}},inputs:[],outputs:["createWebGPUContext"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});a({root:document.getElementById("cell-3"),expanded:[],variables:[]},{id:3,body:async(t,e)=>{const{device:n,canvasFormat:o}=await t();e.then(()=>n.destroy());const i=n.createShaderModule({label:"broken-shader",code:`
    @vertex fn vertexMain(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
      return positions[i]; // ERROR: 'positions' is not defined
    }
    @fragment fn fragmentMain() -> @location(0) vec4f {
      return vec4f(1.0, 0.0, 0.0, 1.0);
    }
  `});return{device:n,canvasFormat:o,brokenShader:i}},inputs:["createWebGPUContext","invalidation"],outputs:["device","canvasFormat","brokenShader"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});
