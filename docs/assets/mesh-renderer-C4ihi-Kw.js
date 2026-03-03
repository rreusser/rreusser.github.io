const y=new WeakMap;function k(i){let n=y.get(i);if(n&&n.vertexCount===i.vertexCount&&n.edgeCount===i.edgeCount)return n;const o=i.extractFaces();let t=0;for(const l of o)l.length>=3&&(t+=l.length-2);const a=new Uint32Array(t*3),e=new Float32Array(t*3);let r=0;for(const l of o){if(l.length<3)continue;const d=l.length,c=l[0];for(let v=1;v<l.length-1;v++){const s=r*3;a[s]=c,a[s+1]=l[v],a[s+2]=l[v+1],e[s]=d,e[s+1]=d,e[s+2]=d,r++}}const u=new Float32Array(t*9),f=new Float32Array(t*9);return n={vertexCount:i.vertexCount,edgeCount:i.edgeCount,triangleCount:t,triangleVertexIndices:a,triangleEdgeCounts:e,triangleData:u,normalData:f},y.set(i,n),n}function A(i,n){const{triangleVertexIndices:o,triangleData:t,normalData:a,triangleCount:e}=n,r=i.positions,u=i.computeVertexNormals();for(let f=0;f<e;f++){const l=f*3,d=f*9;for(let c=0;c<3;c++){const s=o[l+c]*3,g=d+c*3;t[g]=r[s],t[g+1]=r[s+1],t[g+2]=r[s+2],a[g]=u[s],a[g+1]=u[s+1],a[g+2]=u[s+2]}}return{triangleData:t,normalData:a,edgeCounts:n.triangleEdgeCounts,triangleCount:e}}function T(i,n){const o=G(i,n),t=j(i),a=z(i),e=i.buffer({usage:"dynamic",data:new Float32Array(65536)}),r=i.buffer({usage:"dynamic",data:new Float32Array(65536)}),u=i.buffer({usage:"dynamic",data:new Float32Array(65536)}),f=i.buffer({usage:"dynamic",data:new Float32Array(65536)}),l=i.buffer({usage:"dynamic",data:new Float32Array(65536)}),d=i.buffer(new Uint16Array(Array.from({length:65536},(c,v)=>v)));return{render(c,v,s={}){const{pointSize:g=3,edgeWidth:p=2,strainColoring:b=1.5,selectedVertexIndex:F=-1,hoverVertexIndex:w=-1,selectedEdgeIndex:I=-1,hoverEdgeIndex:P=-1,showFaces:_=!0,faceOpacity:S=.3,faceShading:m=!1,cameraPosition:D=[0,0,20],depthFalloff:B=!1,depthFalloffWidth:H=7,focusCenter:W=[0,0,0],background:x=[1,1,1],foreground:R=[0,0,0]}=s,h={depthFalloff:B?1:0,depthFalloffWidth:H,focusCenter:W};e.subdata(c.positions.subarray(0,c.vertexCount*3));const N=M(c);if(r.subdata(N),_){const C=k(c);if(C.triangleCount>0){const{triangleData:E,normalData:L,edgeCounts:O,triangleCount:V}=A(c,C);u.subdata(E),f.subdata(L),l.subdata(O),a({faceBuffer:u,faceNormalBuffer:f,faceEdgeCountBuffer:l,count:V,faceOpacity:S,faceShading:m,cameraPosition:D,...h})}}p>0&&t({vertexBuffer:r,count:c.edgeCount,edgeWidth:p,strainColoring:b,l0:v.l0,selectedIndex:I,hoverIndex:P,faceShading:m,background:x,foreground:R,...h}),o({vertexBuffer:e,indexBuffer:d,count:c.vertexCount,pointSize:g,selectedIndex:F,hoverIndex:w,background:x,...h})},destroy(){e.destroy(),r.destroy(),u.destroy(),f.destroy(),l.destroy(),d.destroy()}}}function M(i){const n=new Float32Array(i.edgeCount*6),o=i.positions,t=i.edges;for(let a=0,e=0;a<i.edgeCount;a++,e+=6){const r=a*2,u=t[r],f=t[r+1],l=u*3,d=f*3;n[e]=o[l],n[e+1]=o[l+1],n[e+2]=o[l+2],n[e+3]=o[d],n[e+4]=o[d+1],n[e+5]=o[d+2]}return n}function z(i){const n=`
    precision highp float;
    attribute vec3 position;
    attribute vec3 normal;
    attribute float edgeCount;
    uniform mat4 projectionView;
    uniform vec3 uFocusCenter;
    varying float vEdgeCount;
    varying float vRadialDist;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vEdgeCount = edgeCount;
      vRadialDist = length(position - uFocusCenter);
      vNormal = normal;
      vPosition = position;
      gl_Position = projectionView * vec4(position, 1);
    }
  `,o={position:(e,r)=>({buffer:r.faceBuffer,offset:0,stride:12}),normal:(e,r)=>({buffer:r.faceNormalBuffer,offset:0,stride:12}),edgeCount:(e,r)=>({buffer:r.faceEdgeCountBuffer,offset:0,stride:4})},t=i({vert:n,frag:`
      precision highp float;
      uniform float opacity;
      uniform float uDepthFalloff, uDepthFalloffWidth, uMinOpacity;
      varying float vEdgeCount;
      varying float vRadialDist;


      vec3 getFaceColor(float edges) {
        if (edges < 3.5) return vec3(1.0, 0.65, 0.25);     // Triangle: bright yellow
        if (edges < 4.5) return vec3(1.0, 0.7, 0.45);      // Quad: tangerine
        if (edges < 5.5) return vec3(0.45, 0.75, 1.0);     // Pentagon: candy blue
        if (edges < 6.5) return vec3(1.0, 0.75, 0.35);     // Hexagon: bright orange
        if (edges < 7.5) return vec3(1.0, 0.5, 0.55);      // Heptagon: candy pink
        return vec3(0.75, 0.6, 1.0);                        // Octagon+: bright lavender
      }

      float depthFalloffFactor() {
        if (uDepthFalloff < 0.5) return 1.0;
        return mix(uMinOpacity, 1.0, 1.0 - smoothstep(0.5 * uDepthFalloffWidth, uDepthFalloffWidth, vRadialDist));
      }

      void main() {
        vec3 color = getFaceColor(vEdgeCount);
        float falloff = depthFalloffFactor();
        gl_FragColor = vec4(color, opacity * falloff);
      }
    `,attributes:o,uniforms:{opacity:(e,r)=>r.faceOpacity??.3,uDepthFalloff:(e,r)=>r.depthFalloff??0,uFocusCenter:(e,r)=>r.focusCenter??[0,0,0],uDepthFalloffWidth:(e,r)=>r.depthFalloffWidth??3,uMinOpacity:(e,r)=>r.minOpacity??.1},blend:{enable:!0,equation:"add",func:{srcRGB:"src alpha",dstRGB:"one minus src alpha",srcAlpha:"one",dstAlpha:"one minus src alpha"}},depth:{enable:!0,mask:!1},cull:{enable:!1},primitive:"triangles",count:(e,r)=>r.count*3}),a=i({vert:n,frag:`
      precision highp float;
      uniform vec3 uCameraPos;
      uniform vec3 uLightOffset;
      varying float vEdgeCount;
      varying vec3 vNormal;
      varying vec3 vPosition;

      // Bright candy/plastic colors for a fun cartoony look
      vec3 getFaceColor(float edges) {
        if (edges < 3.5) return vec3(1.0, 0.65, 0.25);     // Triangle: bright yellow
        if (edges < 4.5) return vec3(1.0, 0.7, 0.45);      // Quad: tangerine
        if (edges < 5.5) return vec3(0.45, 0.75, 1.0);     // Pentagon: candy blue
        if (edges < 6.5) return vec3(1.0, 0.75, 0.35);     // Hexagon: bright orange
        if (edges < 7.5) return vec3(1.0, 0.5, 0.55);      // Heptagon: candy pink
        return vec3(0.75, 0.6, 1.0);                        // Octagon+: bright lavender
      }

      // sRGB to linear conversion
      vec3 toLinear(vec3 srgb) {
        return pow(srgb, vec3(2.2));
      }

      // Linear to sRGB conversion
      vec3 toSRGB(vec3 linear) {
        return pow(linear, vec3(1.0 / 2.2));
      }

      void main() {
        // Convert base color to linear space for lighting calculations
        vec3 baseColor = toLinear(getFaceColor(vEdgeCount));

        vec3 N = normalize(vNormal);
        vec3 V = normalize(uCameraPos - vPosition);

        // Light offset relative to camera (key light above and to the right)
        vec3 lightPos = uCameraPos + uLightOffset;
        vec3 L = normalize(lightPos - vPosition);

        float NdotL = abs(dot(N, L));
        float NdotV = abs(dot(N, V));

        // Lighting in linear space - bright for candy/plastic look
        float ambient = 0.4;
        float diffuse = 0.5 * NdotL;

        // Specular (Blinn-Phong) - bright highlights
        vec3 H = normalize(L + V);
        float NdotH = abs(dot(N, H));
        float specular = 0.6 * pow(NdotH, 64.0);

        // Multi-layer fresnel rim lighting for a glowing effect
        float fresnel1 = pow(1.0 - NdotV, 2.0);   // Soft wide glow
        float fresnel2 = pow(1.0 - NdotV, 4.0);   // Tighter bright rim
        float fresnel3 = pow(1.0 - NdotV, 8.0);   // Very tight highlight

        // Glow colors - warm tinted
        vec3 glowColor = mix(baseColor, vec3(1.0), 0.5);  // Blend base with white
        vec3 rimColor = vec3(1.0, 0.95, 0.9);             // Warm white

        float lighting = ambient + diffuse;
        vec3 color = baseColor * lighting;

        // Layered rim/glow effect
        color += glowColor * fresnel1 * 0.35;     // Soft colored glow
        color += rimColor * fresnel2 * 0.5;       // Bright rim
        color += vec3(1.0) * fresnel3 * 0.4;      // Hot edge highlight
        color += vec3(1.0) * specular;            // Specular highlight

        // Convert back to sRGB for display
        color = toSRGB(clamp(color, 0.0, 1.0));

        gl_FragColor = vec4(color, 1.0);
      }
    `,attributes:o,uniforms:{uCameraPos:(e,r)=>r.cameraPosition??[0,0,20],uFocusCenter:(e,r)=>r.focusCenter??[0,0,0],uLightOffset:[5,8,2]},blend:{enable:!1},depth:{enable:!0,mask:!0},cull:{enable:!1},primitive:"triangles",count:(e,r)=>r.count*3});return e=>{e.faceShading?a(e):t(e)}}function G(i,n){const o=i.buffer(n.positions),t=i.elements(n.cells);return i({vert:`
      precision highp float;
      attribute vec3 icoPosition;
      attribute vec3 vertex;
      attribute float index;
      uniform mat4 projectionView;
      uniform vec3 uFocusCenter;
      uniform float pointSize;
      uniform float selectedIndex, hoverIndex;
      varying float vIsSelected, vIsHover;
      varying float vRadialDist;

      void main() {
        vIsSelected = index == selectedIndex ? 1.0 : 0.0;
        vIsHover = index == hoverIndex ? 1.0 : 0.0;
        vRadialDist = length(vertex - uFocusCenter);
        vec4 p0 = projectionView * vec4(vertex, 1);
        float size = p0.z * pointSize;
        gl_Position = projectionView * vec4(vertex + icoPosition * size, 1);
      }
    `,frag:`
      precision highp float;
      uniform float uDepthFalloff, uDepthFalloffWidth, uMinOpacity;
      uniform vec3 uBackground;
      varying float vIsSelected, vIsHover;
      varying float vRadialDist;

      float depthFalloffFactor() {
        if (uDepthFalloff < 0.5) return 1.0;
        return mix(uMinOpacity, 1.0, 1.0 - smoothstep(0.5 * uDepthFalloffWidth, uDepthFalloffWidth, vRadialDist));
      }

      void main() {
        vec3 baseColor = vec3(0.14, 0.37, 0.69);
        vec3 hoverColor = vec3(0.0, 0.5, 0.0);
        vec3 selectColor = vec3(1.0, 0.0, 0.0);
        // Highlighted vertices (selected or hovered) always show at full opacity
        float isHighlighted = max(vIsSelected, vIsHover);
        // Use select color if selected, hover color if hovered, base color otherwise
        vec3 highlightColor = mix(hoverColor, selectColor, vIsSelected);
        vec3 color = mix(baseColor, highlightColor, isHighlighted);
        float falloff = mix(depthFalloffFactor(), 1.0, isHighlighted);
        // Fade toward background color based on radial distance
        color = mix(uBackground, color, falloff);
        gl_FragColor = vec4(color, 1.0);
      }
    `,attributes:{icoPosition:o,vertex:(a,e)=>({buffer:e.vertexBuffer,divisor:1}),index:(a,e)=>({buffer:e.indexBuffer,divisor:1})},elements:t,cull:{enable:!0,face:"back"},uniforms:{pointSize:(a,e)=>a.pixelRatio*e.pointSize/a.viewportHeight,selectedIndex:(a,e)=>e.selectedIndex,hoverIndex:(a,e)=>e.hoverIndex,uDepthFalloff:(a,e)=>e.depthFalloff??0,uFocusCenter:(a,e)=>e.focusCenter??[0,0,0],uDepthFalloffWidth:(a,e)=>e.depthFalloffWidth??3,uMinOpacity:(a,e)=>e.minOpacity??.2,uBackground:(a,e)=>e.background??[1,1,1]},primitive:"triangles",count:n.cells.length*3,instances:(a,e)=>e.count})}function j(i){const n=i.buffer({usage:"dynamic",data:new Float32Array(65536)});return i({vert:`
      precision highp float;

      uniform mat4 projectionView;
      uniform vec3 uFocusCenter;
      uniform float uAspect, uScaleFactor, uPixelRatio, uL0, uStrainColoring;
      uniform float uBorderWidth, uLineWidth;
      uniform vec4 uForeground;
      uniform float uSelectedIndex, uHoverIndex;
      attribute vec3 aPosition, aNextPosition;
      attribute vec2 aLinePosition;
      attribute float aEdgeIndex;

      varying float vOffset;
      varying vec2 vStrokeEdges;
      varying vec3 vColor;
      varying float vRadialDist;
      varying float vIsSelected, vIsHover;

      vec2 lineNormal(vec4 p, vec4 n, float aspect) {
        return normalize((p.yx / p.w - n.yx / n.w) * vec2(1, aspect));
      }

      const float PI = 3.14159265359;

      vec3 colormap(float x) {
        float cx = clamp(x, 0.0, 1.0);
        return vec3(
          cos(PI * cx),
          cos(PI * (cx - 0.5)),
          cos(PI * (cx - 1.0))
        );
      }

      void main() {
        vIsSelected = aEdgeIndex == uSelectedIndex ? 1.0 : 0.0;
        vIsHover = aEdgeIndex == uHoverIndex ? 1.0 : 0.0;

        vec4 currentPoint = projectionView * vec4(aPosition, 1);
        vec4 nextPoint = projectionView * vec4(aNextPosition, 1);

        // Compute radial distance at the midpoint of the edge
        vec3 midpoint = mix(aPosition, aNextPosition, 0.5);
        vRadialDist = length(midpoint - uFocusCenter);

        float strain = (length(aNextPosition - aPosition) / uL0 - 1.0);
        vec3 strainColor = colormap(0.5 + strain * uStrainColoring * 2.0) * 0.8;
        vColor = uStrainColoring > 0.0 ? strainColor : uForeground.rgb;

        // Increase width for selected/hovered edges
        float widthMultiplier = 1.0 + vIsSelected * 0.5 + vIsHover * 0.25;
        float totalWidth = (uLineWidth + uBorderWidth * 2.0) * widthMultiplier;

        gl_Position = mix(currentPoint, nextPoint, aLinePosition.y);

        vec2 vn = lineNormal(currentPoint, nextPoint, uAspect);
        gl_Position.xy += vn / vec2(-uAspect, 1) * aLinePosition.x * totalWidth * gl_Position.w * uScaleFactor;

        vOffset = aLinePosition.x * totalWidth;
        vStrokeEdges = uBorderWidth < 1e-3 ? vec2(-100, -101) : (uLineWidth * widthMultiplier + vec2(-1, 1) / uPixelRatio);
      }
    `,frag:`
      precision highp float;

      uniform vec4 uBorderColor;
      uniform vec4 uForeground;
      uniform float uDepthFalloff, uDepthFalloffWidth, uMinOpacity;
      varying float vOffset;
      varying vec3 vColor;
      varying vec2 vStrokeEdges;
      varying float vRadialDist;
      varying float vIsSelected, vIsHover;

      float depthFalloffFactor() {
        if (uDepthFalloff < 0.5) return 1.0;
        return mix(uMinOpacity, 1.0, 1.0 - smoothstep(0.5 * uDepthFalloffWidth, uDepthFalloffWidth, vRadialDist));
      }

      void main() {
        // Highlighted edges (selected or hovered) always show at full opacity
        float isHighlighted = max(vIsSelected, vIsHover);
        float falloff = mix(depthFalloffFactor(), 1.0, isHighlighted);

        float t = smoothstep(vStrokeEdges.y, vStrokeEdges.x, vOffset) *
                  smoothstep(-vStrokeEdges.y, -vStrokeEdges.x, vOffset);

        // Color selected edges red, hovered edges green
        vec3 selectColor = vec3(1.0, 0.0, 0.0);
        vec3 hoverColor = vec3(0.0, 0.5, 0.0);
        vec3 baseColor = vColor;
        vec3 highlightColor = mix(hoverColor, selectColor, vIsSelected);
        vec3 innerColor = mix(baseColor, highlightColor, isHighlighted);

        vec3 color = mix(uBorderColor.rgb, innerColor, t);
        float alpha = mix(uBorderColor.a, uForeground.a, t) * falloff;
        gl_FragColor = vec4(color, alpha);
      }
    `,blend:{enable:!0,func:{srcRGB:"src alpha",srcAlpha:"one",dstRGB:"one minus src alpha",dstAlpha:"one"}},polygonOffset:{enable:!0,offset:{factor:(o,t)=>t.faceShading?-1:2,units:(o,t)=>t.faceShading?-100:2}},attributes:{aLinePosition:[[-1,0],[1,0],[-1,1],[1,1]],aPosition:(o,t)=>({buffer:t.vertexBuffer,offset:0,stride:24,divisor:1}),aNextPosition:(o,t)=>({buffer:t.vertexBuffer,offset:12,stride:24,divisor:1}),aEdgeIndex:(o,t)=>{const a=new Float32Array(t.count);for(let e=0;e<t.count;e++)a[e]=e;return n.subdata(a),{buffer:n,divisor:1}}},elements:[[0,1,2],[1,3,2]],uniforms:{uL0:(o,t)=>t.l0??1,uStrainColoring:(o,t)=>t.strainColoring??0,uBorderColor:(o,t)=>[...t.background??[1,1,1],.8],uForeground:(o,t)=>t.foreground??[0,0,0,1],uLineWidth:(o,t)=>t.edgeWidth??2,uBorderWidth:(o,t)=>t.faceShading?0:1,uAspect:o=>o.viewportWidth/o.viewportHeight,uScaleFactor:o=>o.pixelRatio/o.viewportHeight,uPixelRatio:i.context("pixelRatio"),uDepthFalloff:(o,t)=>t.depthFalloff??0,uFocusCenter:(o,t)=>t.focusCenter??[0,0,0],uDepthFalloffWidth:(o,t)=>t.depthFalloffWidth??3,uMinOpacity:.2,uSelectedIndex:(o,t)=>t.selectedIndex??-1,uHoverIndex:(o,t)=>t.hoverIndex??-1},primitive:"triangles",instances:(o,t)=>t.count,count:6})}export{T as createMeshRenderer,T as default};
