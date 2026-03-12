// Mesh rendering for trivalent graphs using regl
// Draws vertices as instanced icospheres, edges as thick lines, and faces as filled polygons

// Cache for mesh topology - avoids re-triangulating every frame
const meshTopologyCache = new WeakMap();

function getOrUpdateTopologyCache(mesh) {
  let cache = meshTopologyCache.get(mesh);

  // Check if cache is valid (topology unchanged)
  if (cache && cache.vertexCount === mesh.vertexCount && cache.edgeCount === mesh.edgeCount) {
    return cache;
  }

  // Rebuild cache - topology changed
  const faces = mesh.extractFaces();

  // Count triangles
  let totalTriangles = 0;
  for (const face of faces) {
    if (face.length >= 3) totalTriangles += face.length - 2;
  }

  // Build triangle vertex indices (which mesh vertex each expanded triangle vertex maps to)
  const triangleVertexIndices = new Uint32Array(totalTriangles * 3);
  const triangleEdgeCounts = new Float32Array(totalTriangles * 3);

  let triIdx = 0;
  for (const face of faces) {
    if (face.length < 3) continue;
    const edgeCount = face.length;
    const v0 = face[0];

    for (let i = 1; i < face.length - 1; i++) {
      const idx = triIdx * 3;
      triangleVertexIndices[idx] = v0;
      triangleVertexIndices[idx + 1] = face[i];
      triangleVertexIndices[idx + 2] = face[i + 1];

      triangleEdgeCounts[idx] = edgeCount;
      triangleEdgeCounts[idx + 1] = edgeCount;
      triangleEdgeCounts[idx + 2] = edgeCount;

      triIdx++;
    }
  }

  // Preallocate reusable data arrays
  const triangleData = new Float32Array(totalTriangles * 9);
  const normalData = new Float32Array(totalTriangles * 9);

  cache = {
    vertexCount: mesh.vertexCount,
    edgeCount: mesh.edgeCount,
    triangleCount: totalTriangles,
    triangleVertexIndices,
    triangleEdgeCounts,
    triangleData,
    normalData
  };

  meshTopologyCache.set(mesh, cache);
  return cache;
}

function updateFaceBuffers(mesh, cache) {
  const { triangleVertexIndices, triangleData, normalData, triangleCount } = cache;
  const positions = mesh.positions;

  // Recompute vertex normals (positions changed, but this uses cached faces)
  const vertexNormals = mesh.computeVertexNormals();

  // Fill in position and normal data using cached indices
  for (let t = 0; t < triangleCount; t++) {
    const triBase = t * 3;
    const dataBase = t * 9;

    for (let v = 0; v < 3; v++) {
      const meshVertex = triangleVertexIndices[triBase + v];
      const srcIdx = meshVertex * 3;
      const dstIdx = dataBase + v * 3;

      // Position
      triangleData[dstIdx] = positions[srcIdx];
      triangleData[dstIdx + 1] = positions[srcIdx + 1];
      triangleData[dstIdx + 2] = positions[srcIdx + 2];

      // Normal
      normalData[dstIdx] = vertexNormals[srcIdx];
      normalData[dstIdx + 1] = vertexNormals[srcIdx + 1];
      normalData[dstIdx + 2] = vertexNormals[srcIdx + 2];
    }
  }

  return { triangleData, normalData, edgeCounts: cache.triangleEdgeCounts, triangleCount };
}

export function createMeshRenderer(regl, icosphere) {
  const drawVertices = createDrawVertices(regl, icosphere);
  const drawEdges = createDrawEdges(regl);
  const drawFaces = createDrawFaces(regl);

  // Preallocated buffers
  const vertexBuffer = regl.buffer({ usage: 'dynamic', data: new Float32Array(65536) });
  const edgeBuffer = regl.buffer({ usage: 'dynamic', data: new Float32Array(65536) });
  const faceBuffer = regl.buffer({ usage: 'dynamic', data: new Float32Array(65536) });
  const faceNormalBuffer = regl.buffer({ usage: 'dynamic', data: new Float32Array(65536) });
  const faceEdgeCountBuffer = regl.buffer({ usage: 'dynamic', data: new Float32Array(65536) });
  const indexBuffer = regl.buffer(new Uint16Array(Array.from({ length: 65536 }, (_, i) => i)));

  return {
    render(mesh, physics, opts = {}) {
      const {
        pointSize = 3,
        edgeWidth = 2,
        strainColoring = 1.5,
        selectedVertexIndex = -1,
        hoverVertexIndex = -1,
        selectedEdgeIndex = -1,
        hoverEdgeIndex = -1,
        showFaces = true,
        faceOpacity = 0.3,
        faceShading = false,
        cameraPosition = [0, 0, 20],
        depthFalloff = false,
        depthFalloffWidth = 7,
        focusCenter = [0, 0, 0],
        background = [1, 1, 1],
        foreground = [0, 0, 0]
      } = opts;

      const depthParams = {
        depthFalloff: depthFalloff ? 1.0 : 0.0,
        depthFalloffWidth,
        focusCenter,
      };

      // Update vertex buffer
      vertexBuffer.subdata(mesh.positions.subarray(0, mesh.vertexCount * 3));

      // Update edge buffer (interleaved pairs)
      const edgeData = flattenEdges(mesh);
      edgeBuffer.subdata(edgeData);

      // Draw faces first (behind everything)
      if (showFaces) {
        const cache = getOrUpdateTopologyCache(mesh);
        if (cache.triangleCount > 0) {
          const { triangleData, normalData, edgeCounts, triangleCount } = updateFaceBuffers(mesh, cache);
          faceBuffer.subdata(triangleData);
          faceNormalBuffer.subdata(normalData);
          faceEdgeCountBuffer.subdata(edgeCounts);
          drawFaces({
            faceBuffer,
            faceNormalBuffer,
            faceEdgeCountBuffer,
            count: triangleCount,
            faceOpacity,
            faceShading,
            cameraPosition,
            ...depthParams
          });
        }
      }

      // Draw edges (skip if width is 0)
      if (edgeWidth > 0) {
        drawEdges({
          vertexBuffer: edgeBuffer,
          count: mesh.edgeCount,
          edgeWidth,
          strainColoring,
          l0: physics.l0,
          selectedIndex: selectedEdgeIndex,
          hoverIndex: hoverEdgeIndex,
          faceShading,
          background,
          foreground,
          ...depthParams
        });
      }

      // Draw vertices on top
      drawVertices({
        vertexBuffer,
        indexBuffer,
        count: mesh.vertexCount,
        pointSize,
        selectedIndex: selectedVertexIndex,
        hoverIndex: hoverVertexIndex,
        background,
        ...depthParams
      });

    },

    destroy() {
      vertexBuffer.destroy();
      edgeBuffer.destroy();
      faceBuffer.destroy();
      faceNormalBuffer.destroy();
      faceEdgeCountBuffer.destroy();
      indexBuffer.destroy();
    }
  };
}

function flattenEdges(mesh) {
  const data = new Float32Array(mesh.edgeCount * 6);
  const positions = mesh.positions;
  const edges = mesh.edges;

  for (let i = 0, j = 0; i < mesh.edgeCount; i++, j += 6) {
    const i2 = i * 2;
    const v0 = edges[i2];
    const v1 = edges[i2 + 1];
    const p0 = v0 * 3;
    const p1 = v1 * 3;

    data[j] = positions[p0];
    data[j + 1] = positions[p0 + 1];
    data[j + 2] = positions[p0 + 2];
    data[j + 3] = positions[p1];
    data[j + 4] = positions[p1 + 1];
    data[j + 5] = positions[p1 + 2];
  }

  return data;
}

function createDrawFaces(regl) {
  const faceVert = `
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
  `;

  const faceAttributes = {
    position: (_, props) => ({
      buffer: props.faceBuffer,
      offset: 0,
      stride: 3 * 4
    }),
    normal: (_, props) => ({
      buffer: props.faceNormalBuffer,
      offset: 0,
      stride: 3 * 4
    }),
    edgeCount: (_, props) => ({
      buffer: props.faceEdgeCountBuffer,
      offset: 0,
      stride: 4
    })
  };

  // Transparent flat-shaded faces (original)
  const drawFacesTransparent = regl({
    vert: faceVert,
    frag: `
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
    `,
    attributes: faceAttributes,
    uniforms: {
      opacity: (_, props) => props.faceOpacity ?? 0.3,
      uDepthFalloff: (_, props) => props.depthFalloff ?? 0,
      uFocusCenter: (_, props) => props.focusCenter ?? [0, 0, 0],
      uDepthFalloffWidth: (_, props) => props.depthFalloffWidth ?? 3,
      uMinOpacity: (_, props) => props.minOpacity ?? 0.1
    },
    blend: {
      enable: true,
      equation: 'add',
      func: { srcRGB: 'src alpha', dstRGB: 'one minus src alpha', srcAlpha: 'one', dstAlpha: 'one minus src alpha' }
    },
    depth: { enable: true, mask: false },
    cull: { enable: false },
    primitive: 'triangles',
    count: (_, props) => props.count * 3
  });

  // Opaque lit-shaded faces
  const drawFacesOpaque = regl({
    vert: faceVert,
    frag: `
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
    `,
    attributes: faceAttributes,
    uniforms: {
      uCameraPos: (_, props) => props.cameraPosition ?? [0, 0, 20],
      uFocusCenter: (_, props) => props.focusCenter ?? [0, 0, 0],
      // Light offset relative to camera (above and to the right)
      uLightOffset: [5, 8, 2]
    },
    blend: { enable: false },
    depth: { enable: true, mask: true },
    cull: { enable: false },
    primitive: 'triangles',
    count: (_, props) => props.count * 3
  });

  // Return a function that picks the right draw command
  return (props) => {
    if (props.faceShading) {
      drawFacesOpaque(props);
    } else {
      drawFacesTransparent(props);
    }
  };
}

function createDrawVertices(regl, icosphere) {
  const positions = regl.buffer(icosphere.positions);
  const cells = regl.elements(icosphere.cells);

  return regl({
    vert: `
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
    `,
    frag: `
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
    `,
    attributes: {
      icoPosition: positions,
      vertex: (_, props) => ({
        buffer: props.vertexBuffer,
        divisor: 1
      }),
      index: (_, props) => ({
        buffer: props.indexBuffer,
        divisor: 1
      })
    },
    elements: cells,
    cull: { enable: true, face: 'back' },
    uniforms: {
      pointSize: (ctx, props) => (ctx.pixelRatio * props.pointSize) / ctx.viewportHeight,
      selectedIndex: (_, props) => props.selectedIndex,
      hoverIndex: (_, props) => props.hoverIndex,
      uDepthFalloff: (_, props) => props.depthFalloff ?? 0,
      uFocusCenter: (_, props) => props.focusCenter ?? [0, 0, 0],
      uDepthFalloffWidth: (_, props) => props.depthFalloffWidth ?? 3,
      uMinOpacity: (_, props) => props.minOpacity ?? 0.2,
      uBackground: (_, props) => props.background ?? [1, 1, 1]
    },
    primitive: 'triangles',
    count: icosphere.cells.length * 3,
    instances: (_, props) => props.count
  });
}

function createDrawEdges(regl) {
  // Create edge index buffer
  const edgeIndexBuffer = regl.buffer({ usage: 'dynamic', data: new Float32Array(65536) });

  return regl({
    vert: `
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
    `,
    frag: `
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
    `,
    blend: {
      enable: true,
      func: {
        srcRGB: 'src alpha',
        srcAlpha: 'one',
        dstRGB: 'one minus src alpha',
        dstAlpha: 'one'
      }
    },
    polygonOffset: {
      enable: true,
      offset: {
        factor: (_, props) => props.faceShading ? -1 : 2,
        units: (_, props) => props.faceShading ? -100 : 2
      }
    },
    attributes: {
      aLinePosition: [[-1, 0], [1, 0], [-1, 1], [1, 1]],
      aPosition: (_, props) => ({
        buffer: props.vertexBuffer,
        offset: 0,
        stride: 6 * 4,
        divisor: 1
      }),
      aNextPosition: (_, props) => ({
        buffer: props.vertexBuffer,
        offset: 3 * 4,
        stride: 6 * 4,
        divisor: 1
      }),
      aEdgeIndex: (_, props) => {
        // Update edge index buffer with sequential indices
        const indices = new Float32Array(props.count);
        for (let i = 0; i < props.count; i++) indices[i] = i;
        edgeIndexBuffer.subdata(indices);
        return {
          buffer: edgeIndexBuffer,
          divisor: 1
        };
      }
    },
    elements: [[0, 1, 2], [1, 3, 2]],
    uniforms: {
      uL0: (_, props) => props.l0 ?? 1,
      uStrainColoring: (_, props) => props.strainColoring ?? 0,
      uBorderColor: (_, props) => [...(props.background ?? [1, 1, 1]), 0.8],
      uForeground: (_, props) => props.foreground ?? [0, 0, 0, 1],
      uLineWidth: (_, props) => props.edgeWidth ?? 2,
      uBorderWidth: (_, props) => props.faceShading ? 0 : 1,
      uAspect: ctx => ctx.viewportWidth / ctx.viewportHeight,
      uScaleFactor: ctx => ctx.pixelRatio / ctx.viewportHeight,
      uPixelRatio: regl.context('pixelRatio'),
      uDepthFalloff: (_, props) => props.depthFalloff ?? 0,
      uFocusCenter: (_, props) => props.focusCenter ?? [0, 0, 0],
      uDepthFalloffWidth: (_, props) => props.depthFalloffWidth ?? 3,
      uMinOpacity: 0.2,
      uSelectedIndex: (_, props) => props.selectedIndex ?? -1,
      uHoverIndex: (_, props) => props.hoverIndex ?? -1
    },
    primitive: 'triangles',
    instances: (_, props) => props.count,
    count: 6
  });
}

export default createMeshRenderer;
