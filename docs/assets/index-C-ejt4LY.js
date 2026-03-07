import{d as x,_ as A}from"./index-ByB2dbry.js";x({root:document.getElementById("cell-2"),expanded:[],variables:[]},{id:2,body:(i,e)=>i`## First, CSS versus device pixels

First, let's recall the difference between [*CSS pixels*](https://developer.mozilla.org/en-US/docs/Glossary/CSS_pixel) and *device pixels*. A single CSS pixel corresponds to a nicely sized single dot on a screen, as seen by a human. Until retina displays became common, there was generally no confusion and a pixel was a pixel. In a retina display with a *device pixel ratio* of 2, however, each CSS pixel corresponds to a block of ${e`2 \times 2`} *device pixels*.

Therefore, so that WebGL points have a consistent CSS pixel size for everyone, we must multiply our \\\`gl_PointSize\\\` by the pixel ratio (which we may select slightly differently than the true *device* pixel ratio in case we want to downsample the canvas resolution just a bit and help things render a bit more quickly).`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});x({root:document.getElementById("cell-4"),expanded:[],variables:[]},{id:4,body:()=>{function i(t,s){const o=2/t.view[5],n=s.pointYAxisSize/o*t.viewportHeight;return e(n,s.pointScreenSize[0]*t.pixelRatio,s.pointScreenSize[1]*t.pixelRatio)}function e(t,s,o){return Math.max(s,Math.min(o,t))}return{pointSizeDevicePixels:i,clamp:e}},inputs:[],outputs:["pointSizeDevicePixels","clamp"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});x({root:document.getElementById("cell-5"),expanded:[],variables:[]},{id:5,body:(i,e)=>i`## Computing the opacity

Now we get to the fun part. If we view drawing points as depositing opacity, then in order to produce a constant look, we desire some consistent average fill of opacity per screen area. Let's call this fill density ${e`\rho`} and measure it in units of ${e`\mathrm{fill} / \mathrm{pixel}`}, where ${e`\mathrm{fill} = 1.0`} corresponds to a single full-opacity pixel.

Consider a single ${e`p \times p`}-pixel rasterized point with opacity ${e`\alpha`}. We'll assume for simplicity that all of our pixels have the same size and opacity. Then the total fill ${e`f_i`} of this point is ${e.block`f_i = \alpha p^2,`} and the total fill ${e`F`} of ${e`N`} such rasterized points is ${e.block`F \equiv \sum_{i = 1}^N f_i = N \alpha p^2.`}

If we have a canvas of size ${e`W \times H`} device pixels, then average fill is ${e.block`\rho = \frac{F}{W H} = \frac{N \alpha p^2}{W H}.`}

Solving for ${e`\alpha`}, we obtain ${e.block`\alpha = \frac{\rho W H}{N p^2}.`}

As we zoom in or out, consider that we see a smaller or larger fraction of the points. To account for this, we finally scale the density by the zoom factors ${e`Y_0 / Y`} and ${e`X_0 / X`} where ${e`X_0`} and ${e`Y_0`} are the initial axis dimensions while ${e`X`} and ${e`Y`} are the current axis dimensions. Thus our final expression for opacity is ${e.block`
\alpha = \left(\frac{\rho W H}{N p^2}\right)\left(\frac{X_0}{X}\right)\left(\frac{Y_0}{Y}\right)
`}

Note: One might think to simplify this using ${e`H^2`} instead of ${e`W H`} to eliminate aspect ratio dependence. However, when the plot maintains equal scaling in data units per pixel (aspect ratio = 1), resizing the container causes the data domain to adjust. The ${e`W H`} form correctly accounts for this and keeps opacity stable across resize operations.

Finally, we do some additional bookeeping in the function below to switch over to adjusting the opacity rather than the point size once we reach the minimum point size with respect to device pixels. These adjustments work together with corresponding modifications in the vertex and fragment shaders in the [\\\`drawPoints\\\`](#drawPoints) function below. The additional factors are:

- If we render circles rather than squares, adjust the opacity to account for the fact that the unit circle only covers 78% of the unit square.
- If the point size is smaller than the minimum permissible size, we multiply opacity by the square of the ratio between desired size and actual size so that we accumulate the correct amount of fill.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});x({root:document.getElementById("cell-6"),expanded:[],variables:[]},{id:6,body:(i,e)=>{function t(s,o){var c=i(s,o);const n=2/s.view[0],l=2/s.view[5],h=o.initialAxisDimensions[0],v=o.initialAxisDimensions[1],y=s.viewportWidth,a=s.viewportHeight,r=o.N;let d=o.rho*y*a/(r*c*c)*(h/n)*(v/l);d*=o.circularPoints?1/(.25*Math.PI):1;const p=Math.max(o.minimumPointDeviceSize,c)+.5;return d*=Math.pow(c/p,2),e(d,0,1)}return{pointOpacity:t}},inputs:["pointSizeDevicePixels","clamp"],outputs:["pointOpacity"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});x({root:document.getElementById("cell-7"),expanded:[],variables:[]},{id:7,body:(i,e)=>i`## Additional considerations

### Data types

There are a few extra considerations. First, the data type. If we render ten million points, the opacity of each point may be tiny, perhaps just ${e`\alpha = 0.001`}. For RGBA channels of type \\\`uint8\\\`, the smallest representable opacity is ${e`1 / 255 = ${(1/255).toFixed(4)}`}. If our opacities are barely representable, we expect heavy quantization of the colors at best and perhaps nothing on the screen at worst. A simple solution is to render to an offscreen \\\`float16\\\` or \\\`float32\\\` framebuffer, then transfer the colors to the screen.

### Gamma

Whether or not we render to a framebuffer with higher precision, since we've computed our colors in a linear colorspace by simply adding them up, we should convert to sRGB by applying gamma as a separate step. The input color from the color picker is in sRGB, so we convert it to linear for blending, then convert the accumulated result back to sRGB for display. I've used the standard sRGB gamma approximation of 2.2.

### Antialiasing

***Update***: I wasn't thinking! Thanks to [Kari Lavikka](https://twitter.com/KariLavikka) for [varying the opacity to accomplish antialiasing](https://observablehq.com/@tuner/selecting-the-right-opacity-for-2d-point-clouds-with-sdf-ant) and also clamping the minimum point size to a single pixel and then varying the opacity instead.

### Blending

I've used additive blending to overlay the points, with one exception. Since the points accumulate *toward black from white*, I've used \\\`reverse subtract\\\` with the color inverted so that we start with 1.0 and accumulate toward 0.0. This is equivalent to rendering the inverted image and then un-inverting at the end. [This tool helps me reason through it](https://www.andersriggelsen.dk/glblendfunc.php).

### Rendering optimization

[@dy has pointed out based on his regl-scatter2d module](https://twitter.com/DimaYv/status/1335914283406856192) that sorting the points, either with a space-filling curve or even just along a single axis, can also have a significant performance impact.

### Axes and interactions

Finally, I've used D3 for the linear scales and zoom interaction. This notebook uses the same zooming and Plot-based axis rendering approach as other notebooks in this collection.`,inputs:["md","tex"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});x({root:document.getElementById("cell-100"),expanded:[],variables:[]},{id:100,body:(i,e,t,s,o,c,n)=>{const l=i`<figure>
  ${e.element}
  <figcaption>Drag to pan, scroll to zoom.</figcaption>
</figure>`;return t(s(l,{width:Math.min(o,640),height:Math.min(480,o),toggleOffset:[-6,-33],controls:"#point-cloud-controls",onResize(h,v,y){e.resize(v,y),c.updateScales(e.elements.plot.scale("x"),e.elements.plot.scale("y")),n.dirty=!0}})),{figure:l}},inputs:["html","stack","display","expandable","width","axes","render"],outputs:["figure"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});x({root:document.getElementById("cell-101"),expanded:[],variables:[]},{id:101,body:async()=>{const[{default:i},{createElementStack:e},{reglElement:t,reglAxesViewport:s},{createZoomableAxes:o},{expandable:c}]=await Promise.all([A(()=>import("https://cdn.jsdelivr.net/npm/regl@2.1.1/+esm"),[]).then(n=>{if(!("default"in n))throw new SyntaxError("export 'default' not found");return n}),A(()=>import("./element-stack-BU40TvN2.js"),[]).then(n=>{if(!("createElementStack"in n))throw new SyntaxError("export 'createElementStack' not found");return n}),A(()=>import("./regl-canvas-4j8SAjSv.js"),[]).then(n=>{if(!("reglElement"in n))throw new SyntaxError("export 'reglElement' not found");if(!("reglAxesViewport"in n))throw new SyntaxError("export 'reglAxesViewport' not found");return n}),A(()=>import("./zoomable-axes-BfGyq1bg.js"),[]).then(n=>{if(!("createZoomableAxes"in n))throw new SyntaxError("export 'createZoomableAxes' not found");return n}),A(()=>import("./expandable-GAgQDSaE.js"),[]).then(n=>{if(!("expandable"in n))throw new SyntaxError("export 'expandable' not found");return n})]);return{createREGL:i,createElementStack:e,reglElement:t,reglAxesViewport:s,createZoomableAxes:o,expandable:c}},inputs:[],outputs:["createREGL","createElementStack","reglElement","reglAxesViewport","createZoomableAxes","expandable"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});x({root:document.getElementById("cell-102"),expanded:[],variables:[]},{id:102,body:(i,e,t,s,o)=>({stack:i({layers:[{id:"regl",element:e(t,{optionalExtensions:["OES_texture_float","OES_texture_half_float"],attributes:{depthStencil:!1,preserveDrawingBuffer:!0}})},{id:"plot",element:({width:n,height:l})=>s(n,l)},{id:"svg",element:({current:n,width:l,height:h})=>(n?o.select(n):o.create("svg")).attr("width",l).attr("height",h).style("cursor","grab").node()}]})}),inputs:["createElementStack","reglElement","createREGL","createPlot","d3"],outputs:["stack"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});x({root:document.getElementById("cell-103"),expanded:[],variables:[]},{id:103,body:(i,e,t)=>{function s(o,c,n=i,l=e){return t.plot({width:o,height:c,marginTop:5,marginRight:5,marginLeft:40,marginBottom:25,style:{backgroundColor:"transparent",maxWidth:"none",position:"absolute",pointerEvents:"none"},x:{domain:n,tickSpacing:100},y:{domain:l,tickSpacing:100},marks:[t.ruleX([0],{stroke:"currentColor",strokeOpacity:.12}),t.ruleY([0],{stroke:"currentColor",strokeOpacity:.12})]})}return{createPlot:s}},inputs:["initialXDomain","initialYDomain","Plot"],outputs:["createPlot"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});x({root:document.getElementById("cell-104"),expanded:[],variables:[]},{id:104,body:()=>{const i=[-12.5,12.5],e=[-12.5,12.5],t=[i[1]-i[0],e[1]-e[0]];return{initialXDomain:i,initialYDomain:e,initialAxisDimensions:t}},inputs:[],outputs:["initialXDomain","initialYDomain","initialAxisDimensions"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});x({root:document.getElementById("cell-105"),expanded:[],variables:[]},{id:105,body:(i,e,t,s,o)=>({axes:i({d3:e,element:t.elements.svg,xScale:t.elements.plot.scale("x"),yScale:t.elements.plot.scale("y"),aspectRatio:1,scaleExtent:[.01,1e4],onChange:({xDomain:n,yDomain:l})=>{s.dirty=!0;const h=o(t.width,t.height,n,l);t.elements.plot.replaceWith(h),t.elements.plot=h,t.dispatchEvent(new CustomEvent("update"))}})}),inputs:["createZoomableAxes","d3","stack","render","createPlot"],outputs:["axes"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});x({root:document.getElementById("cell-200"),expanded:[],variables:[]},{id:200,body:(i,e,t,s,o)=>{function c(T,D){try{return T.framebuffer({width:1,height:1,colorType:D}).destroy(),!0}catch{return!1}}const n=i.elements.regl.value,l=["uint8"];c(n,"half float")&&l.unshift("half float"),c(n,"float")&&l.unshift("float");const h=e.select(["Rössler attractor","Nose-Hoover attractor","TSUCS 2 attractor","Uniform grid","Random"],{label:"Plot data",value:"Rössler attractor"}),v=e.range([1e3,4e6],{step:1e3,value:1e6,label:"Point count (N)"}),y=e.range([0,1],{step:.01,value:.15,label:"Fill density (ρ)"}),a=e.range([1e-4,.1],{step:1e-4,value:.03,label:"Point size (y-axis units)"}),r=e.range([.5,10],{step:.1,value:1,label:"Min point size (CSS px)"}),d=e.range([1,40],{step:.1,value:20,label:"Max point size (CSS px)"}),p=e.range([1,4],{step:.1,value:1.5,label:"Min device pixel size"}),f=e.color({value:"#87aad4",label:"Point color"}),g=e.toggle({value:!0,label:"Circular points"}),u=e.range([.5,devicePixelRatio],{step:.5,value:devicePixelRatio,label:"Pixel ratio"}),m=e.select(l,{value:l[0],label:"Framebuffer type"}),w=t.input(h),b=t.input(v),S=t.input(y),R=t.input(a),M=t.input(r),P=t.input(d),k=t.input(p),B=t.input(f),_=t.input(g),z=t.input(u),C=t.input(m);return s(o`<div id="point-cloud-controls">
  ${h}
  ${v}
  ${y}
  ${a}
  ${r}
  ${d}
  ${p}
  ${f}
  ${g}
  ${u}
  ${m}
</div>`),{canWriteToFBOOfType:c,regl:n,colorTypeOptions:l,viewofPlotData:h,viewofN:v,viewofRho:y,viewofPointYAxisSize:a,viewofPointScreenSizeMin:r,viewofPointScreenSizeMax:d,viewofMinimumPointDeviceSize:p,viewofPointColor:f,viewofCircularPoints:g,viewofPixelRatio:u,viewofColorType:m,plotData:w,N:b,rho:S,pointYAxisSize:R,pointScreenSizeMin:M,pointScreenSizeMax:P,minimumPointDeviceSize:k,pointColor:B,circularPoints:_,pixelRatio:z,colorType:C}},inputs:["stack","Inputs","Generators","display","html"],outputs:["canWriteToFBOOfType","regl","colorTypeOptions","viewofPlotData","viewofN","viewofRho","viewofPointYAxisSize","viewofPointScreenSizeMin","viewofPointScreenSizeMax","viewofMinimumPointDeviceSize","viewofPointColor","viewofCircularPoints","viewofPixelRatio","viewofColorType","plotData","N","rho","pointYAxisSize","pointScreenSizeMin","pointScreenSizeMax","minimumPointDeviceSize","pointColor","circularPoints","pixelRatio","colorType"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});x({root:document.getElementById("cell-301"),expanded:[],variables:[]},{id:301,body:()=>{const i={dirty:!0};function e(o){const c=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(o);return c?[parseInt(c[1],16)/255,parseInt(c[2],16)/255,parseInt(c[3],16)/255]:[0,0,0]}const t=2.2;function s(o){return[Math.pow(o[0],t),Math.pow(o[1],t),Math.pow(o[2],t)]}return{render:i,hexToRgb:e,SRGB_GAMMA:t,sRGBToLinear:s}},inputs:[],outputs:["render","hexToRgb","SRGB_GAMMA","sRGBToLinear"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});x({root:document.getElementById("cell-302"),expanded:[],variables:[]},{id:302,body:()=>{function i(e,t,s){const o=new Float32Array(t*2),[c,n]=s.x,[l,h]=s.y,v=n-c,y=h-l;switch(e){case"Uniform grid":{const a=Math.floor(Math.sqrt(t));for(let r=0;r<t;r++)o[r*2]=(r%a/a-.5)*v,o[r*2+1]=(Math.floor(r/a)/a-.5)*y;break}case"Random":{for(let a=0;a<t;a++)o[a*2]=(Math.random()-.5)*v,o[a*2+1]=(Math.random()-.5)*y;break}case"Rössler attractor":{let a=2.644838333129883,r=4.060488700866699,d=2.8982460498809814;const p=.2,f=.2,g=5.7,u=.006;for(let m=0;m<t;m++){let w=-r-d,b=a+p*r,S=f+d*(a-g);const R=a+.5*u*w,M=r+.5*u*b,P=d+.5*u*S;w=-M-P,b=R+p*M,S=f+P*(R-g),a=a+u*w,r=r+u*b,d=d+u*S,o[m*2]=a,o[m*2+1]=r}break}case"Nose-Hoover attractor":{let a=2.644838333129883,r=4.060488700866699,d=2.8982460498809814;const p=.01;for(let f=0;f<t;f++){let g=r,u=-a+r*d,m=1.5-r*r;const w=a+.5*p*g,b=r+.5*p*u,S=d+.5*p*m;g=b,u=-w+b*S,m=1.5-b*b,a=a+p*g,r=r+p*u,d=d+p*m,o[f*2]=a,o[f*2+1]=r}break}case"TSUCS 2 attractor":{let a=5,r=5,d=5;const p=.001;for(let f=0;f<t;f++){let g=40*(r-a)+.16*a*d,u=55*a-a*d+20*r,m=1.833*d+a*r-.65*a*a;const w=a+.5*p*g,b=r+.5*p*u,S=d+.5*p*m;g=40*(b-w)+.16*w*S,u=55*w-w*S+20*b,m=1.833*S+w*b-.65*w*w,a=a+p*g,r=r+p*u,d=d+p*m,o[f*2]=a*.1,o[f*2+1]=d*.1}break}}return o}return{generatePoints:i}},inputs:[],outputs:["generatePoints"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});x({root:document.getElementById("cell-303"),expanded:[],variables:[]},{id:303,body:(i,e,t,s,o,c,n,l,h,v,y,a,r,d,p,f,g,u,m,w,b,S,R,M)=>{const P=`
  const float SRGB_GAMMA = 2.2;
  vec3 linearToSRGB(vec3 rgb) {
    return pow(clamp(rgb, vec3(0), vec3(1)), vec3(1.0 / SRGB_GAMMA));
  }`,k=i({vert:`
    precision highp float;
    attribute vec2 xy;
    void main () {
      gl_Position = vec4(xy, 0, 1);
    }`,frag:`
    precision highp float;
    uniform vec2 framebufferResolution;
    uniform sampler2D src;
    ${P}
    void main () {
      vec4 color = texture2D(src, gl_FragCoord.xy / framebufferResolution);
      float alpha = min(color.a, 1.0);
      vec3 rgb = alpha > 0.0 ? color.rgb / alpha : vec3(0.0);
      gl_FragColor = vec4(linearToSRGB(rgb) * alpha, alpha);
    }`,attributes:{xy:[-4,-4,4,-4,0,4]},uniforms:{src:i.prop("src"),framebufferResolution:E=>[E.framebufferWidth,E.framebufferHeight]},count:3,depth:{enable:!1}});function B(E){return i({vert:`
      precision highp float;
      attribute vec2 xy;
      uniform float pointSize, minimumPointDeviceSize;
      uniform mat4 view;
      void main () {
        gl_Position = view * vec4(xy, 0, 1);
        gl_PointSize = max(minimumPointDeviceSize, pointSize) + 0.5;
      }`,frag:`
      precision highp float;
      uniform float opacity, pointSize;
      uniform vec3 pointColor;

      float linearstep(float edge0, float edge1, float x) {
        return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
      }

      void main () {
        float alpha = opacity;
        vec2 c = gl_PointCoord * 2.0 - 1.0;
        #if ${E?"1":"0"}
        float sdf = length(c);
        #else
        float sdf = max(abs(c.x), abs(c.y));
        #endif
        alpha *= linearstep(pointSize + 0.5, pointSize - 0.5, sdf * pointSize);
        gl_FragColor = vec4(pointColor, alpha);
      }`,attributes:{xy:i.prop("pointsBuffer")},blend:{enable:!0,func:{srcRGB:"src alpha",dstRGB:1,srcAlpha:1,dstAlpha:1},equation:{rgb:"add",alpha:"add"}},uniforms:{view:i.prop("view"),pointColor:i.prop("pointColor"),minimumPointDeviceSize:i.prop("minimumPointDeviceSize"),opacity:i.prop("opacity"),pointSize:i.prop("pointSize")},primitive:"points",count:i.prop("N"),depth:{enable:!1},scissor:{enable:!0,box:i.prop("scissor")},viewport:i.prop("viewport")})}let _=i.buffer(e(t,s,{x:o,y:c})),z=i.framebuffer({width:Math.floor(n.width*l),height:Math.floor(n.height*l),colorType:h}),C=B(v),T=t,D=s,$=h,G=l,L=v;const F=i.frame(()=>{if((t!==T||s!==D)&&(_.destroy(),_=i.buffer(e(t,s,{x:o,y:c})),T=t,D=s,y.dirty=!0),(h!==$||l!==G)&&(z.destroy(),z=i.framebuffer({width:Math.floor(n.width*l),height:Math.floor(n.height*l),colorType:h}),$=h,G=l,y.dirty=!0),v!==L&&(C=B(v),L=v,y.dirty=!0),(a||r||d||p||f||g)&&(y.dirty=!0),!y.dirty)return;const E=Math.floor(n.width*l),O=Math.floor(n.height*l);(z.width!==E||z.height!==O)&&z.resize(E,O);const I={x:Math.min(u.xRange[0],u.xRange[1])*l,y:O-Math.max(u.yRange[0],u.yRange[1])*l,width:Math.abs(u.xRange[1]-u.xRange[0])*l,height:Math.abs(u.yRange[0]-u.yRange[1])*l},W={view:u.view,viewportWidth:I.width,viewportHeight:I.height,pixelRatio:l},H={N:s,pointYAxisSize:a,pointScreenSize:[d,p],minimumPointDeviceSize:f,rho:r,circularPoints:v,initialAxisDimensions:m},Y=w(g),X=b(Y);z.use(()=>{i.clear({color:[0,0,0,0]}),C({view:u.view,pointsBuffer:_,N:s,pointColor:X,minimumPointDeviceSize:f,opacity:S(W,H),pointSize:R(W,H),viewport:I,scissor:I})}),k({src:z}),y.dirty=!1});return M.then(()=>{F.cancel(),_.destroy(),z.destroy()}),{GLSL_SRGB_GAMMA:P,copyToScreen:k,createDrawPoints:B,pointsBuffer:_,fbo:z,drawPoints:C,currentPlotData:T,currentN:D,currentColorType:$,currentPixelRatio:G,currentCircularPoints:L,loop:F}},inputs:["regl","generatePoints","plotData","N","initialXDomain","initialYDomain","stack","pixelRatio","colorType","circularPoints","render","pointYAxisSize","rho","pointScreenSizeMin","pointScreenSizeMax","minimumPointDeviceSize","pointColor","axes","initialAxisDimensions","hexToRgb","sRGBToLinear","pointOpacity","pointSizeDevicePixels","invalidation"],outputs:["GLSL_SRGB_GAMMA","copyToScreen","createDrawPoints","pointsBuffer","fbo","drawPoints","currentPlotData","currentN","currentColorType","currentPixelRatio","currentCircularPoints","loop"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});x({root:document.getElementById("cell-400"),expanded:[],variables:[]},{id:400,body:async()=>{const{collapseCodeBlocks:i}=await A(()=>import("./collapsible-code-DxKx0ApL.js"),[]).then(e=>{if(!("collapseCodeBlocks"in e))throw new SyntaxError("export 'collapseCodeBlocks' not found");return e});return i({maxHeight:1e3}),{collapseCodeBlocks:i}},inputs:[],outputs:["collapseCodeBlocks"],output:void 0,assets:void 0,autodisplay:!1,autoview:void 0,automutable:void 0});
