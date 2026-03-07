import{d as c,_ as Z}from"./index-ByB2dbry.js";c({root:document.getElementById("cell-3"),expanded:[],variables:[]},{id:3,body:function(){return async function(d,{label:v,code:m,compilationHints:u=[]}={}){const o=d.createShaderModule({label:v,code:m,compilationHints:u}),U=(await o.getCompilationInfo()).messages;if(U.length){const p=m.split(`
`),y=[];for(let a=0;a<U.length;a++){const{message:E,lineNum:T,linePos:b,length:$}=U[a];y.push(`:${T}:${b} error: ${E}
${p[T-1]}
${"".padStart($,"^").padStart(b+$-1," ")}`)}const h=new Error(`
`+y.join(`

`));throw h.name="Error while parsing WGSL",h}return o}},inputs:[],outputs:void 0,output:"createShaderModule",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-19"),expanded:[],variables:[]},{id:19,body:function(){return function(d,v){const m=d.createCommandEncoder();Array.isArray(v)?v.forEach(u=>u(m)):v(m),d.queue.submit([m.finish()])}},inputs:[],outputs:void 0,output:"queuePasses",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-1111"),expanded:[],variables:[]},{id:1111,body:function(){return Z(()=>import("https://unpkg.com/wgsl_reflect@1.2.3/wgsl_reflect.module.js"),[])},inputs:[],outputs:void 0,output:"WgslReflect",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-1113"),expanded:[],variables:[]},{id:1113,body:function(n){return d=>new n.WgslReflect(d)},inputs:["WgslReflect"],outputs:void 0,output:"reflect",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-1170"),expanded:[],variables:[]},{id:1170,body:function(n,d){return function(m,{width:u=Math.min(640,n),indent:o=35,spacing:r=40}={}){const p=d.schemeTableau10,y=d.create("svg");let h=0,a=0;const E={};function T(x){return E[x]||(E[x]=p[a++%p.length]),E[x]}function b(x,H=0,P=[],M=null){const w=[];for(const g of x){const I=H+(g.offset||0),L=[...P,g.name].join("."),k=g.name;if(g.type?.name==="array"&&g.type.format?.members){const f=g.type.count||1,z=g.type.stride||g.type.format.size||0;for(let A=0;A<f;A++){`${g.name}${A}`;const B=I+A*z;w.push(...b(g.type.format.members,B,[...P,`${g.name}[${A}]`],g.name))}}else g.type?.members?w.push(...b(g.type.members,I,[...P,g.name],g.name)):w.push({name:L,type:g.type?.name||"?",offset:I,size:g.size,topLevel:k})}return w}function $(x,H){const M=x.size??16,w=(u-o-1)/16,g=b(x.members||[]),I=y.append("g").attr("transform",`translate(0,${H})`),L=[];g.forEach(f=>{const z=T(f.topLevel),A=f.offset+f.size;let B=f.offset;for(;B<A;){const _=Math.floor(B/16),N=B%16,F=Math.min(16-N,A-B);I.append("rect").attr("x",N*w+o).attr("y",_*32+20).attr("width",F*w).attr("height",32).attr("fill",z).attr("stroke","black").attr("stroke-width",1).attr("opacity",.8),L.push({name:f.name,type:f.type,x:(N+F/2)*w+o,y:_*32+20+32/2}),B+=F}});const k=Math.ceil(M/16);for(let f=0;f<=k;f++)I.append("line").attr("x1",o).attr("y1",f*32+20).attr("x2",16*w+o).attr("y2",f*32+20).style("stroke",f===0||f===k?"black":"rgb(0 0 0 / 30%)");for(let f=0;f<k;f++)for(let z=0;z<=16;z++)I.append("line").attr("x1",z*w+o).attr("y1",f*32+20).attr("x2",z*w+o).attr("y2",(f+1)*32+20).style("stroke",z===0||z===16?"black":"rgb(0 0 0 / 8%)");L.forEach(f=>{I.append("text").attr("x",f.x).attr("y",f.y-6).text(f.name).style("fill","black").style("font-size",12).style("font-weight","bold").style("text-anchor","middle").style("font-family","monospace").style("dominant-baseline","middle").style("pointer-events","none"),I.append("text").attr("x",f.x).attr("y",f.y+10).text(f.type).style("fill","#222").style("font-size",10).style("font-style","italic").style("text-anchor","middle").style("font-family","monospace").style("dominant-baseline","middle").style("pointer-events","none")});for(let f=0;f<M;f+=16){const z=f/16;I.append("text").attr("x",10).attr("y",z*32+20+32/2).attr("dominant-baseline","middle").style("font-family","monospace").style("font-size",12).text(f)}return I.append("text").attr("x",o).attr("y",14).text(x.name).style("font-family","monospace").style("font-size",14).style("font-weight","bold"),k*32+r}for(const x of m)h+=$(x,h);return y.attr("height",h),y.attr("width",u),y.node()}},inputs:["width","d3"],outputs:void 0,output:"visualizeStruct",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-1118"),expanded:[],variables:[]},{id:1118,body:function(i,n){return i(n(`
struct PointLight {
  position: vec3f,
  color: vec4f,
}

struct Uniforms {
  xyz: vec3u,
  tileSize: u32,
  toXY: vec3f,
  terrainBuffer: u32,
  terrainSize: vec2u,
  globalDimension: u32,
  pixelSize: f32,
  lights: array<PointLight, 2>,
}`).structs)},inputs:["visualizeStruct","reflect"],outputs:void 0,output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-1151"),expanded:[],variables:[]},{id:1151,body:function(n){function d(m,u,o,r){switch(u){case"u":m.setUint32(o,r,!0);break;case"i":m.setInt32(o,r,!0);break;case"f":m.setFloat32(o,r,!0);break;case"h":m.setUint16(o,n(r),!0);break;default:throw new Error(`Unknown scalar type: ${u}`)}}function v(m){const u=m.match(/^vec([2-4])([uifh])$/),o=m.match(/^mat([2-4])x([2-4])([fh])$/);if(u)return{kind:"vec",len:parseInt(u[1]),scalarType:u[2]};if(o)return{kind:"mat",cols:parseInt(o[1]),rows:parseInt(o[2]),scalarType:o[3]};if(/^(u32|i32|f32|f16)$/.test(m))return{kind:"scalar",scalarType:{u32:"u",i32:"i",f32:"f",f16:"h"}[m]};throw new Error(`Unsupported type name: ${m}`)}return function(u,o,r){const U=new DataView(u);for(const p of r.members){const y=p.offset,h=o[p.name];if(h===void 0)continue;const a=v(p.type.name);let E=y;if(a.kind==="scalar")d(U,a.scalarType,E,h);else if(a.kind==="vec"){const T=a.scalarType==="h"?2:4;for(let b=0;b<a.len;b++)d(U,a.scalarType,E+b*T,h[b])}else if(a.kind==="mat"){const T=a.scalarType==="h"?2:4;for(let b=0;b<a.cols;b++)for(let $=0;$<a.rows;$++){const x=b*a.rows+$;d(U,a.scalarType,E+x*T,h[x])}}}}},inputs:["toFloat16"],outputs:void 0,output:"writeStruct",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-1264"),expanded:[],variables:[]},{id:1264,body:function(n,d){class v{constructor(u){this.code=u,this.meta=n(u).structs}toString(){return this.code}repr(){return d(this.meta)}}return function(u){const o=new v(u),r=o.repr();return r.value=o,r}},inputs:["reflect","visualizeStruct"],outputs:void 0,output:"WgslStruct",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-1267"),expanded:[],variables:[]},{id:1267,body:function(n){return n("struct Point { x: f32, y: f32, z: f32 }")},inputs:["WgslStruct"],outputs:void 0,output:"viewof$struct",assets:void 0,autodisplay:!0,autoview:!0,automutable:!1});c({root:document.getElementById("cell-1333"),expanded:[],variables:[]},{id:1333,body:function(i){return`
// My shader code
${i}
`},inputs:["struct"],outputs:void 0,output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-823"),expanded:[],variables:[]},{id:823,body:function(){return function(d){const v=(p,y)=>Math.ceil(p/y)*y,m=p=>{if(typeof p.size=="number"){const y=p.type;let h=y==="f16"?2:4,a=y==="f16"?2:4;if(p.size===1)return{align:h,size:a};if(p.size===2)return{align:h*2,size:a*2};if(p.size===3)return{align:h*4,size:a*4};if(p.size===4)return{align:h*4,size:a*4}}else if(Array.isArray(p.size)){const[y,h]=p.size;let a=4,E=a*4,T=a*4;return{align:E,size:y*T}}throw new Error("Unhandled type: "+JSON.stringify(p))};let u=0,o=1;const r=[];for(const p of d.members){let{align:y,size:h}=m(p.type);for(const a of p.attrs)a.value.value%2===0&&(a.value.value>=y&&(y=a.value.value),a.value.value>=h&&(h=a.value.value));u=v(u,y),r.push({name:p.name.value,offset:u,size:h,align:y}),u+=h,y>o&&(o=y)}const U=v(u,o);return{layout:r,size:U,align:o}}},inputs:[],outputs:void 0,output:"calculateLayout",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-32"),expanded:[],variables:[]},{id:32,body:function(n){class d{constructor(e){this.value=e}match(){return this.value.match(this.constructor.pattern)}isMatch(e=null,s=null){return e=k(e),s=k(s),(!e.length||e.includes(this.constructor))&&(!s.length||s.includes(this.value))}}class v extends d{static pattern=/^\/\/.*/;static name="Comment"}class m extends d{static pattern=/^(struct|size|align|array|bool|i32|u32|f32|f16|vec[234][iufh]?|mat[234]x[234][fh]?)\b/;static name="Keyword"}class u extends d{static pattern=/^(0[iu]?|[1-9][0-9]*[iu]?)/;static name="DecimalInt"}class o extends d{static pattern=/^[a-zA-Z_][a-zA-Z0-9_]*/;static name="Identifier"}class r extends d{static pattern=/^(\:|\,|\{|\}|@|\(|\)|>|<)/;static name="Punctuator"}class U extends d{static pattern=/^\S/;static name="Unknown"}const p=[v,m,u,o,r,U],y=/^\s+/;function h(t){const e=[];let s=0;for(;s<t.length;){const l=t.slice(s).match(y);if(l&&(s+=l[0].length),s>=t.length)break;const S=t.slice(s);let Y=!1;for(const O of p){const D=S.match(O.pattern);if(D&&D.index===0){const q=D[0];O!==v&&e.push(new O(q)),s+=q.length,Y=!0;break}}if(!Y)throw new Error(`Unrecognized token at index ${s}: "${S}"`)}return e}class a{constructor(){if(this.constructor==a)throw new Error("Abstract ASTNode class can't be instantiated.")}}class E extends a{constructor(e,s){super(),this.name=e,this.members=s}toString(){return`struct ${this.name} {
  ${this.members.join(`
  `)}
}`}computeLayout(){return n(this)}}class T extends a{constructor(e){super(),this.value=e}toString(){return`@align(${this.value})`}}class b extends a{constructor(e){super(),this.value=e}toString(){return`@size(${this.value})`}}class $ extends a{constructor(e){super(),this.value=e}toString(){return`array<${this.value}>`}}class x extends a{constructor(e,s){super(),this.value=e,this.size=s}toString(){return`array<${this.value},${this.size}>`}}class H extends a{constructor(e,s,l=l){super(),this.name=e,this.type=s,this.attrs=l}toString(){return`${this.attrs.length?`${this.attrs.map(e=>e.toString()).join(" ")} `:""}${this.name}: ${this.type},`}}class P extends a{constructor(e){super(),this.value=e}toString(){return this.value}}class M extends a{constructor(e){super(),this.type=e}toString(){return this.type.name.toString()}}class w extends a{constructor(e){super(),this.type=e}toString(){return this.type}get alignOf(){switch(this.type){case"bool":case"i32":case"u32":case"f32":return 4;case"f16":return 2}}get sizeOf(){switch(this.type){case"bool":case"i32":case"u32":case"f32":return 4;case"f16":return 2}}}class g extends a{constructor(e,s){super(),this.type=e,this.size=s}toString(){return`vec${this.size}<${this.type}>`}}class I extends a{constructor(e,s){super(),this.type=e,this.size=s}toString(){return`mat${this.size[0]}x${this.size[1]}<${this.type}>`}}class L extends a{constructor(e){super(),this.value=parseInt(e.value.replace(/[ui]$/,""))}toString(){return this.value}}function k(t){return t===null?[]:Array.isArray(t)?t:[t]}class f{constructor(e,s=[]){this.currentIndex=0,this.tokens=e,this.knownTypes=new Map;for(const l of s)this.knownTypes.set(l.name.value,l)}get next(){return this.tokens[this.currentIndex]}peek(e=null,s=null){const l=this.tokens[this.currentIndex];return l.isMatch(e,s)?l:null}consume(e=null,s=null){const l=this.tokens[this.currentIndex++];if(!l)throw new Error("Unexpected end of input");if(l.isMatch(e,s))return l;throw s?.length?new Error(`Expected ${k(e).map(S=>S.name).join(", ")} ${k(s).map(S=>JSON.stringify(S)).join(", ")} but found ${l.constructor.name} "${l?.value}"`):new Error(`Expected ${k(e).map(S=>S.name).join(", ")} but found ${l.constructor.name} "${l?.value}"`)}}function z(t){t.peek(m,"struct")&&t.consume();const e=t.consume(o);t.consume(r,"{");const s=[];for(;;){const l=_(t);if(!l)break;if(s.push(l),t.peek(r,","))t.consume();else break}return t.consume(r,"}"),new E(new P(e.value),s)}function A(t){const e=[];for(;t.peek(r,"@");){t.consume();const s=t.consume(m,["align","size"]);switch(t.consume(r,"("),s.value){case"align":e.push(new T(B(t)));break;case"size":e.push(new b(B(t)));break}t.consume(r,")")}return e}function B(t){return new L(t.consume(u))}function _(t){const e=A(t);if(!t.peek(o))return null;const s=t.consume();t.consume(r,":");const l=R(t);return new H(new P(s.value),l,e)}const N=/^(bool|i32|u32|f32|f16\b)/,F=/^(vec([234])([iufh])?)\b/,K=/^(mat([234])x([234])([fh])?)\b/,C={h:"f16",f:"f32",i:"i32",u:"u32"},X=["h","f","i","u"],J=["h","f"];function W(t){t.consume(r,"<");const e=R(t);return t.consume(r,">"),e}function V(t){t.consume(r,"<");const e=R(t);if(t.peek(r,",")){t.consume();const s=new L(t.consume(u));return t.consume(r,">"),new x(e,s)}else return t.consume(r,">"),new $(e)}function R(t){let e,s;const l=t.consume([m,o]);if(l instanceof m){if(l.value==="array")return V(t);if(s=l.value.match(N))return new w(s[0]);if(s=l.value.match(F)){const S=parseInt(s[2]);if(s[3]){if(!X.includes(s[3]))throw new Error(`Invalid vector type specifier "${l.value}"`);e=new w(C[s[3]])}else e=W(t);return new g(e,S)}else if(s=l.value.match(K)){const S=[parseInt(s[2]),parseInt(s[3])];if(s[4]){if(!J.includes(s[4]))throw new Error(`Invalid matrix type specifier "${l.value}"`);e=new w(C[s[4]])}else e=W(t);return new I(e,S)}}else if(l instanceof o){const S=t.knownTypes.get(l.value);if(!S)throw new Error(`Unknown type "${l.value}" in type specifier. Did you supply it as a known type?`);return new M(S)}}function j(t,e=[]){return z(new f(h(t),e))}return j.TOKENS=p,j},inputs:["calculateLayout"],outputs:void 0,output:"Struct",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-412"),expanded:[],variables:[]},{id:412,body:function(){var n=new Float32Array(1),d=new Int32Array(n.buffer);return function(m){n[0]=m;var u=d[0],o=u>>16&32768,r=(u&2147483647)+4096;return r>=1199570944?(u&2147483647)>=1199570944?r<2139095040?o|31744:o|31744|(u&8388607)>>13:o|31743:r>=947912704?o|r-939524096>>13:r<855638016?o:(r=(u&2147483647)>>23,o|(u&8388607|8388608)+(8388608>>>r-102)>>126-r)}},inputs:[],outputs:void 0,output:"toFloat16",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-441"),expanded:[],variables:[]},{id:441,body:function(n){return n(`struct Uniforms {
  a: bool,
  b: u32,
  c: i32,
  d: f32,
  e: f16
}`).toString()},inputs:["Struct"],outputs:void 0,output:"scalarUniforms",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-1020"),expanded:[],variables:[]},{id:1020,body:function(n){return n(`Uniforms {
  a: array<array<f32,2>>
}`).toString()},inputs:["Struct"],outputs:void 0,output:"arrayUniforms",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-362"),expanded:[],variables:[]},{id:362,body:function(n){return n(`Uniforms {
  b: vec3u,
  a: vec2<f16>,
  c: mat4x4f,
}`).toString()},inputs:["Struct"],outputs:void 0,output:"vectorShorthandUnsignedUniforms",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-405"),expanded:[],variables:[]},{id:405,body:function(i){return i.toString()},inputs:["vectorShorthandUnsignedUniforms"],outputs:void 0,output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-378"),expanded:[],variables:[]},{id:378,body:function(n){return n(`Uniforms {
  a: vec2<u32>,
  b: vec3<u32>,
  c: vec4<u32>,
}`)},inputs:["Struct"],outputs:void 0,output:"vectorUnsignedUniforms",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-360"),expanded:[],variables:[]},{id:360,body:function(n){return n(`Uniforms {
  a: vec2i,
  b: vec3i,
  c: vec4i,
}`).members[0]},inputs:["Struct"],outputs:void 0,output:"vectorShorthandSignedUniforms",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-386"),expanded:[],variables:[]},{id:386,body:function(n){return n(`Uniforms {
  a: vec2<i32>,
  b: vec3<i32>,
  c: vec4<i32>,
}`).members[0]},inputs:["Struct"],outputs:void 0,output:"vectorSignedUniforms",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-352"),expanded:[],variables:[]},{id:352,body:function(n){return n(`struct Uniforms {
  a: vec2f,
  b: vec3f,
  c: vec4f,
}`)},inputs:["Struct"],outputs:void 0,output:"vectorShorthandFloatUniforms",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-389"),expanded:[],variables:[]},{id:389,body:function(n){return n(`struct Uniforms {
  a: vec2<f32>,
  b: vec3<f32>,
  c: vec4<f32>,
}`)},inputs:["Struct"],outputs:void 0,output:"vectorFloatUniforms",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-357"),expanded:[],variables:[]},{id:357,body:function(n){return n(`struct Uniforms {
  a: vec2h,
  b: vec3h,
  c: vec4h,
}`)},inputs:["Struct"],outputs:void 0,output:"vectorShorthandHalfFloatUniforms",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-392"),expanded:[],variables:[]},{id:392,body:function(n){return n(`struct Uniforms {
  a: vec2<f16>,
  b: vec3<f16>,
  c: vec4<f16>,
}`)},inputs:["Struct"],outputs:void 0,output:"vectorHalfFloatUniforms",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-33"),expanded:[],variables:[]},{id:33,body:function(n){return n(`struct Uniforms {
  a: mat2x2f,
  b: mat2x3f,
  c: mat3x4f,
  d: mat3x2f,
  e: mat3x3f,
  f: mat3x4f,
  g: mat4x2f,
  h: mat4x3f,
  i: mat4x4f,
}`)},inputs:["Struct"],outputs:void 0,output:"matrixShorthandFloatUniforms",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-395"),expanded:[],variables:[]},{id:395,body:function(n){return n(`struct Uniforms {
  a: mat2x2<f32>,
  b: mat2x3<f32>,
  c: mat3x4<f32>,
  d: mat3x2<f32>,
  e: mat3x3<f32>,
  f: mat3x4<f32>,
  g: mat4x2<f32>,
  h: mat4x3<f32>,
  i: mat4x4<f32>,
}`)},inputs:["Struct"],outputs:void 0,output:"matrixFloatUniforms",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-350"),expanded:[],variables:[]},{id:350,body:function(n){return n(`struct Uniforms {
  a: mat2x2h,
  b: mat2x3h,
  c: mat3x4h,
  d: mat3x2h,
  e: mat3x3h,
  f: mat3x4h,
  g: mat4x2h,
  h: mat4x3h,
  i: mat4x4h,
}`)},inputs:["Struct"],outputs:void 0,output:"matrixShorthandHalfFloatUniforms",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-399"),expanded:[],variables:[]},{id:399,body:function(n){return n(`struct Uniforms {
  a: mat2x2<f16>,
  b: mat2x3<f16>,
  c: mat3x4<f16>,
  d: mat3x2<f16>,
  e: mat3x3<f16>,
  f: mat3x4<f16>,
  g: mat4x2<f16>,
  h: mat4x3<f16>,
  i: mat4x4<f16>,
}`)},inputs:["Struct"],outputs:void 0,output:"matrixHalfFloatUniforms",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-585"),expanded:[],variables:[]},{id:585,body:function(n){return n(`struct PointLight {
  position: vec3f,
  color: vec3f,
}`)},inputs:["Struct"],outputs:void 0,output:"PointLight",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-1092"),expanded:[],variables:[]},{id:1092,body:function(n,d){return`
${n}
${d}
...
`},inputs:["PointLight","Lighting"],outputs:void 0,output:"myShader",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-1082"),expanded:[],variables:[]},{id:1082,body:function(n,d){return n(`struct Lighting {
  ambientColor: vec3f,
  pointLights: array<PointLight>,
}`,[d])},inputs:["Struct","PointLight"],outputs:void 0,output:"Lighting",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-592"),expanded:[],variables:[]},{id:592,body:function(n){return n(`struct A {
  u: f32,         // offset(0)   align(4)  size(4)
  v: f32,         // offset(4)   align(4)  size(4)
  w: vec2<f32>,   // offset(8)   align(8)  size(8)
  x: f32 
}`)},inputs:["Struct"],outputs:void 0,output:"A",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-600"),expanded:[],variables:[]},{id:600,body:function(n,d){return n(`
struct B {                                   //             align(16) size(160)
  a: vec2<f32>,                              // offset(0)   align(8)  size(8)
  // -- implicit member alignment padding -- // offset(8)             size(8)
  b: vec3<f32>,                              // offset(16)  align(16) size(12)
  c: f32,                                    // offset(28)  align(4)  size(4)
  d: f32,                                    // offset(32)  align(4)  size(4)
  // -- implicit member alignment padding -- // offset(36)            size(4)
  e: A,                                      // offset(40)  align(8)  size(24)
  f: vec3<f32>,                              // offset(64)  align(16) size(12)
  // -- implicit member alignment padding -- // offset(76)            size(4)
  g: array<A, 3>,    // element stride 24       offset(80)  align(8)  size(72)
  h: i32                                     // offset(152) align(4)  size(4)
  // -- implicit struct size padding --      // offset(156)           size(4)
}`,[d])},inputs:["Struct","A"],outputs:void 0,output:"B",assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-639"),expanded:[],variables:[]},{id:639,body:function(i){return i.toString()},inputs:["B"],outputs:void 0,output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});c({root:document.getElementById("cell-1096"),expanded:[],variables:[]},{id:1096,body:function(i){const n=i(`PointLight {
  position: vec3f,
  color: vec3f,
}`);return i(`struct Lighting {
  ambient: vec3f,
  pointLights: array<PointLight>,
}`,[n])},inputs:["Struct"],outputs:void 0,output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:!1});
