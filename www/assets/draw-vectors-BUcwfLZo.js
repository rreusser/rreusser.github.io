function r(t){return t({vert:`
      precision highp float;
      uniform mat4 projection, view;
      uniform float uLineWidth, uAspect;
      uniform vec2 uArrowheadShape;
      attribute vec3 aVertex, aNextVertex;
      attribute vec4 aLine;

      void main () {
        mat4 projView = projection * view;
        vec4 p = projView * vec4(aVertex, 1);
        vec4 n = projView * vec4(aNextVertex, 1);
        gl_Position = mix(p, n, aLine.y);

        vec2 unitVector = normalize((p.xy / p.w  - n.xy / n.w) * vec2(uAspect, 1));

        gl_Position.xy += (
            vec2(-unitVector.y, unitVector.x) * (aLine.x * uLineWidth + aLine.w * uArrowheadShape.y) +
            -unitVector * aLine.z * uArrowheadShape.x
          ) *
          vec2(1.0 / uAspect, 1) * gl_Position.w;
      }
    `,frag:`
      precision highp float;
      uniform vec4 uColor;
      void main () {
        gl_FragColor = uColor;
      }
    `,attributes:{aVertex:{buffer:t.prop("vertices"),divisor:1,stride:24},aNextVertex:{buffer:t.prop("vertices"),divisor:1,offset:12,stride:24},aLine:new Float32Array([-1,0,0,0,1,0,0,0,1,1,-1,0,-1,0,0,0,1,1,-1,0,-1,1,-1,0,0,1,-1,-1,0,1,-1,1,0,1,0,0])},depth:{enable:(e,i)=>i.depth!==!1},uniforms:{projection:t.context("projection"),view:t.context("view"),uLineWidth:(e,i)=>(i.lineWidth||1)/e.framebufferHeight*e.pixelRatio,uArrowheadShape:(e,i)=>[(i.arrowheadLength||14)/e.framebufferHeight*e.pixelRatio*2,(i.arrowheadWidth||8)/e.framebufferHeight*e.pixelRatio],uAspect:e=>e.framebufferWidth/e.framebufferHeight,uColor:(e,i)=>i.lineColor||[0,0,0,1]},primitive:"triangles",instances:(e,i)=>i.count,count:9})}export{r as createDrawVectors};
