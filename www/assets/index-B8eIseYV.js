import{d as n,_ as x}from"./index-ByB2dbry.js";n({root:document.getElementById("cell-137"),expanded:[],variables:[]},{id:137,body:async()=>{const[{default:e},{reglCanvas:A}]=await Promise.all([x(()=>import("https://cdn.jsdelivr.net/npm/regl@2.1.1/+esm"),[]).then(t=>{if(!("default"in t))throw new SyntaxError("export 'default' not found");return t}),x(()=>import("./regl-canvas-4j8SAjSv.js"),[]).then(t=>{if(!("reglCanvas"in t))throw new SyntaxError("export 'reglCanvas' not found");return t})]);return{createREGL:e,reglCanvas:A}},inputs:[],outputs:["createREGL","reglCanvas"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-169"),expanded:[],variables:[]},{id:169,body:(e,A)=>{const t=e.radio(["Photo","Color random","Grayscale random"],{value:"Photo",label:"Image"}),u=A(t),a=A(e.checkbox(["Contours"],{label:"Display options",value:[]}));return{inputControl:t,input:u,contours:a}},inputs:["Inputs","view"],outputs:["inputControl","input","contours"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-12"),expanded:[],variables:[]},{id:12,body:(e,A,t,u)=>{const a=e(A,{pixelRatio:devicePixelRatio,extensions:["OES_standard_derivatives"]}),r=a.value;return t(u`<figure style="text-align:center">
  ${a}
  <figcaption>Rendered shader output using selected method.</figcaption>
</figure>`),{_reglCanvas:a,_regl:r}},inputs:["reglCanvas","createREGL","view","html"],outputs:["_reglCanvas","_regl"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-170"),expanded:[],variables:[]},{id:170,body:(e,A)=>({regl:e.attachResize(Math.min(A,384),Math.min(A,384))}),inputs:["_regl","width"],outputs:["regl"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-77"),expanded:[],variables:[]},{id:77,body:(e,A)=>{const t=e.radio(["Nearest","Linear (1 fetch)","Linear (4 fetches)","Bicubic (4 fetches)","Bicubic (16 fetches)"],{label:"Interpolation",value:"Bicubic (4 fetches)"}),u=A(t);return{interpolationInput:t,interpolation:u}},inputs:["Inputs","view"],outputs:["interpolationInput","interpolation"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-499"),expanded:[],variables:[]},{id:499,body:(e,A,t)=>({basis:e(function(){const a=A==="Bicubic (4 fetches)"||A==="Bicubic (16 fetches)",r=A==="Bicubic (16 fetches)"?["B-spline","Catmull-Rom"]:["B-spline"];return t.radio(r,{label:"Basis",value:"B-spline",disabled:!a})}())}),inputs:["view","interpolation","Inputs"],outputs:["basis"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-198"),expanded:[],variables:[]},{id:198,body:(e,A,t,u,a,r,l,o)=>function(){let i="",s="";switch(e){case"Nearest":i="Uses hardware nearest-neighbor filtering directly with a single texture fetch.",s=`// Hardware nearest-neighbor filtering:
texture2D(sampler, texCoord)`;break;case"Linear (1 fetch)":i="Uses hardware bilinear filtering directly with a single texture fetch.",s=`// Hardware bilinear filtering:
texture2D(sampler, texCoord)`;break;case"Linear (4 fetches)":i="Reconstructs bilinear filtering in the shader from a nearest-neighbor sampled texture using 4 texture fetches.",s=A;break;case"Bicubic (4 fetches)":i="Achieves bicubic filtering using only 4 texture fetches by leveraging hardware linear filtering to blend between sample points. Uses the B-spline basis.",s=t+`

`+u;break;case"Bicubic (16 fetches)":i=`Performs bicubic filtering from a nearest-neighbor sampled texture using 16 texture fetches. Uses the ${a} basis${a==="Catmull-Rom"?", which passes through control points for a sharper appearance":""}.`,s=(a==="Catmull-Rom"?r:t)+`
`+l;break}return o`${i}

\`\`\`glsl
${s}
\`\`\``}(),inputs:["interpolation","glslTextureLinear","glslCubic","glslTextureBicubic","basis","glslHermite","glslTextureBicubicFromNearest","md"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-17"),expanded:[],variables:[]},{id:17,body:()=>({textureShape:{width:8,height:8}}),inputs:[],outputs:["textureShape"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-88"),expanded:[],variables:[]},{id:88,body:async(e,A,t)=>({textureData:await async function(){switch(e){case"Color random":return new Uint8ClampedArray(Array(A.width*A.height).fill(0).map(()=>[Math.random()*256,Math.random()*256,Math.random()*256,255]).flat());case"Grayscale random":return new Uint8ClampedArray(Array(A.width*A.height).fill(0).map(()=>{const a=Math.random()*256;return[a,a,a,255]}).flat());case"Photo":return t(new URL("data:image/jpeg;base64,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",import.meta.url).href).image()}}()}),inputs:["input","textureShape","FileAttachment"],outputs:["textureData"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-102"),expanded:[],variables:[]},{id:102,body:()=>({glslCubic:`vec4 cubic (float v) {
  vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
  vec4 s = n * n * n;
  float x = s.x;
  float y = s.y - 4.0 * s.x;
  float z = s.z - 4.0 * s.y + 6.0 * s.x;
  float w = 6.0 - x - y - z;
  return vec4(x, y, z, w) * (1.0 / 6.0);
}`}),inputs:[],outputs:["glslCubic"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-504"),expanded:[],variables:[]},{id:504,body:()=>({glslHermite:`vec4 catmull_rom (float v) {
  float v2 = v * v;
  float v3 = v2 * v;
  return 0.5 * vec4(
    v * (-v2 + 2.0 * v - 1.0),
    3.0 * v3 - 5.0 * v2 + 2.0,
    -3.0 * v3 + 4.0 * v2 + v,
    v3 - v2);
}`}),inputs:[],outputs:["glslHermite"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-107"),expanded:[],variables:[]},{id:107,body:()=>({glslTextureBicubic:`vec4 textureBicubic(sampler2D sampler, vec2 texCoord, vec2 texResolution) {
  vec2 invTexSize = 1.0 / texResolution;
  texCoord = texCoord * texResolution - 0.5;
  vec2 fxy = fract(texCoord);
  texCoord -= fxy;
  vec4 xcubic = cubic(fxy.x);
  vec4 ycubic = cubic(fxy.y);
  vec4 c = texCoord.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 s = vec4(xcubic.xz + xcubic.yw, ycubic.xz + ycubic.yw);
  vec4 offset = c + vec4(xcubic.yw, ycubic.yw) / s;
  offset *= invTexSize.xxyy;
  vec4 sample0 = texture2D(sampler, offset.xz);
  vec4 sample1 = texture2D(sampler, offset.yz);
  vec4 sample2 = texture2D(sampler, offset.xw);
  vec4 sample3 = texture2D(sampler, offset.yw);
  float sx = s.x / (s.x + s.y);
  float sy = s.z / (s.z + s.w);
  return mix(mix(sample3, sample2, sx), mix(sample1, sample0, sx), sy);
}`}),inputs:[],outputs:["glslTextureBicubic"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-260"),expanded:[],variables:[]},{id:260,body:()=>({glslTextureLinear:`vec4 textureLinear(sampler2D sampler, vec2 texCoord, vec2 texResolution) {
  texCoord = texCoord * texResolution - 0.5;
  vec2 fxy = fract(texCoord);
  texCoord -= fxy;
  vec4 c = (texCoord.xxyy + vec2(1.5, 0.5).xyxy) / texResolution.xxyy;
  vec4 t00 = texture2D(sampler, c.yz);
  vec4 t10 = texture2D(sampler, c.xz);
  vec4 t01 = texture2D(sampler, c.yw);
  vec4 t11 = texture2D(sampler, c.xw);
  return mix(mix(t01, t11, fxy.x), mix(t00, t10, fxy.x), fxy.y);
}`}),inputs:[],outputs:["glslTextureLinear"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-349"),expanded:[],variables:[]},{id:349,body:e=>({glslTextureBicubicFromNearest:function(){const t=e==="Catmull-Rom"?"catmull_rom":"cubic";return`
vec4 bicubicX(sampler2D sampler, float xOff, vec4 xcub, vec2 uv) {
  return mat4(
    texture2D(sampler, vec2(uv.x - xOff, uv.y)),
    texture2D(sampler, uv),
    texture2D(sampler, vec2(uv.x + xOff, uv.y)),
    texture2D(sampler, vec2(uv.x + 2.0 * xOff, uv.y))
  ) * xcub;
}

vec4 textureBicubicFromNearest(sampler2D sampler, vec2 texCoord, vec2 texResolution) {
  vec2 invRes = 1.0 / texResolution;
  texCoord = texCoord * texResolution - 0.5;
  vec2 xy = fract(texCoord);
  texCoord = invRes * (texCoord - xy + 0.5);
  vec4 xcub = ${t}(xy.x);
  return mat4(
    bicubicX(sampler, invRes.x, xcub, vec2(texCoord.x, texCoord.y - invRes.y)),
    bicubicX(sampler, invRes.x, xcub, texCoord),
    bicubicX(sampler, invRes.x, xcub, vec2(texCoord.x, texCoord.y + invRes.y)),
    bicubicX(sampler, invRes.x, xcub, vec2(texCoord.x, texCoord.y + 2.0 * invRes.y))
  ) * ${t}(xy.y);
}`}()}),inputs:["basis"],outputs:["glslTextureBicubicFromNearest"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-191"),expanded:[],variables:[]},{id:191,body:()=>({glslGrid:`float grid (float parameter, float width, float feather) {
  float w1 = width - feather * 0.5;
  float d = length(vec2(dFdx(parameter), dFdy(parameter)));
  if (d == 0.0) return 0.0;
  float looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
  return smoothstep(d * (w1 + feather), d * w1, looped);
}`}),inputs:[],outputs:["glslGrid"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-15"),expanded:[],variables:[]},{id:15,body:(e,A,t,u,a)=>({texture:function(){const l=e==="Nearest"||e==="Linear (4 fetches)"||e==="Bicubic (16 fetches)",o=A.texture({flipY:!0,...t,mag:l?"nearest":"linear",min:l?"nearest":"linear",data:u});return a.then(()=>o.destroy()),o}()}),inputs:["interpolation","regl","textureShape","textureData","invalidation"],outputs:["texture"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-56"),expanded:[],variables:[]},{id:56,body:(e,A,t,u,a,r,l,o,i)=>({drawTexture:e({vert:`
    precision highp float;
    attribute vec2 xy;
    void main () {
      gl_Position = vec4(xy, 0, 1);
    }`,frag:`
    #extension GL_OES_standard_derivatives : enable
    precision highp float;
    uniform vec2 resolution, texResolution;
    uniform sampler2D tex;

    ${A}
    ${t}
    ${u}
    ${a}
    ${r}
    ${l}

    void main () {
      ${o==="Bicubic (4 fetches)"?"gl_FragColor = textureBicubic(tex, gl_FragCoord.xy / resolution, texResolution);":o==="Linear (4 fetches)"?"gl_FragColor = textureLinear(tex, gl_FragCoord.xy / resolution, texResolution);":o==="Bicubic (16 fetches)"?"gl_FragColor = textureBicubicFromNearest(tex, gl_FragCoord.xy / resolution, texResolution);":"gl_FragColor = texture2D(tex, gl_FragCoord.xy / resolution);"}

      ${~i.indexOf("Contours")?`
gl_FragColor.rgb = vec3(
  mix(gl_FragColor.r, 1.0, grid(gl_FragColor.r * 10.0, 1.0, 1.0)),
  mix(gl_FragColor.g, 1.0, grid(gl_FragColor.g * 10.0, 1.0, 1.0)),
  mix(gl_FragColor.b, 1.0, grid(gl_FragColor.b * 10.0, 1.0, 1.0))
);
`:""}
    }`,uniforms:{resolution:d=>[d.framebufferWidth,d.framebufferHeight],texResolution:(d,c)=>[c.texture.width,c.texture.height],tex:e.prop("texture")},attributes:{xy:[-4,-4,4,-4,0,4]},count:3,depth:{enable:!1}})}),inputs:["regl","glslCubic","glslHermite","glslTextureBicubic","glslTextureLinear","glslTextureBicubicFromNearest","glslGrid","interpolation","contours"],outputs:["drawTexture"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});n({root:document.getElementById("cell-39"),expanded:[],variables:[]},{id:39,body:(e,A,t)=>{e.poll(),A({texture:t})},inputs:["regl","drawTexture","texture"],outputs:[],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});
