function o(r){const t=[.095,.1176,.13799999999999998,1];return r({vert:`
      precision highp float;
      uniform mat4 projection, view;
      uniform float uLineWidth, uAspect, uScale;
      uniform vec2 uArrowheadShape;
      attribute vec3 aVertex, aNormal;
      attribute vec4 aLine;

      void main () {
        mat4 projView = projection * view;
        vec4 p = projView * vec4(aVertex, 1);
        vec4 pn = projView * vec4(aVertex + uScale * aNormal, 1);
        gl_Position = mix(p, pn, aLine.y);

        vec2 unitVector = normalize((pn.xy / pn.w  - p.xy / p.w) * vec2(uAspect, 1));

        gl_Position.xy += (
            vec2(-unitVector.y, unitVector.x) * (aLine.x * uLineWidth + aLine.w * uArrowheadShape.y) +
            + unitVector * aLine.z * uArrowheadShape.x
          ) *
          vec2(1.0 / uAspect, 1) * gl_Position.w;

      }
    `,frag:`
      precision highp float;
      uniform vec4 uColor;
      void main () {
        gl_FragColor = uColor;
      }
    `,attributes:{aVertex:{buffer:r.prop("vertices"),divisor:2,stride:12},aNormal:{buffer:r.prop("normals"),divisor:2,stride:12},aLine:new Float32Array([-1,0,0,0,1,0,0,0,1,1,-1,0,-1,0,0,0,1,1,-1,0,-1,1,-1,0,0,1,-1,-1,0,1,-1,1,0,1,0,0])},depth:{enable:(e,i)=>i.depth!==!1},uniforms:{projection:r.context("projection"),view:r.context("view"),uLineWidth:(e,i)=>(i.lineWidth||1)/e.framebufferHeight*e.pixelRatio,uArrowheadShape:(e,i)=>[(i.arrowheadLength||14)/e.framebufferHeight*e.pixelRatio*2,(i.arrowheadWidth||8)/e.framebufferHeight*e.pixelRatio],uAspect:e=>e.framebufferWidth/e.framebufferHeight,uColor:(e,i)=>i.lineColor||t,uScale:(e,i)=>i.scale||1},primitive:"triangles",instances:(e,i)=>i.count*2,count:9})}export{o as createDrawNormals};
