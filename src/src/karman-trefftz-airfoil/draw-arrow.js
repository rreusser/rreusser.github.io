'use strict';

module.exports = function (regl) {
  return regl({
    vert: `
      precision highp float;
      uniform mat4 modelview;
      uniform float uTailWidth, uAspect, uScale, uForeshortening, uInset;
      uniform vec2 uArrowheadShape;
      attribute vec2 aVertex, aNormal;
      attribute vec4 aArrow;
  
      void main () {
        vec4 vp = vec4(aVertex, 0, 1);
        vec4 vpn = vec4(aVertex + uScale * aNormal, 0, 1);

        // Project the vertex into homogeneous coordinates
        vec4 p = modelview * vp;

        // Project the vertex + normal into homogeneous coordinates
        vec4 pn = modelview * vpn;

        float foreshortening = max(0.1, sqrt(1.0 - uForeshortening * abs((vp - vpn).z) / length((vp - vpn).xyz)));
        
        // Use the y component of aArrow to select either p or pn
        gl_Position = mix(p, pn, aArrow.y);

        // Compute a screen-space vector parallel to the arrow.
        // This step includes "perspective division" to convert homogeneous
        // 4D coordinates into screen space coordinates.
        // NB: it also includes an aspect ratio to scale x and y equally. This could be
        // done more cleanly.
        vec2 unitVector = normalize((pn.xy / pn.w - p.xy / p.w) * vec2(uAspect, 1));
        
        // Rotate 90 degrees to get a perpendicular vector
        vec2 perpUnitVector = vec2(-unitVector.y, unitVector.x);

        // Perturb the point according to the aArrow instance data
        gl_Position.xy += (
            // Offset perpendicular to the length of the arrow:
            perpUnitVector * (aArrow.x * (uTailWidth - uInset) + aArrow.w * (uArrowheadShape.y - 1.5 * uInset)) +

            // and parallel to the length of the arrow:
            + unitVector * (aArrow.z * (uArrowheadShape.x - 3.5 * uInset) - 2.5 * uInset * aArrow.y) * foreshortening

          // This final step is just a bit tricky, but we need to pull the aspect
          // ratio back out and then multiply by w to get the arrow scaled correctly
          ) / vec2(uAspect, 1) * gl_Position.w;

      }
    `,
    frag: `
      precision highp float;
      uniform vec4 uColor;
      void main () {
        gl_FragColor = uColor;
      }
    `,
    attributes: {
      aVertex: {
        buffer: regl.prop('vertices'),
        divisor: 1, // Advance the mesh vertex once per instance
        stride: 8 // each instance advances 3 floats (= 12 bytes)
      },
      aNormal: {
        buffer: regl.prop('normals'),
        divisor: 1,
        stride: 8
      },
      // prettier-ignore
      aArrow: new Float32Array([
        // The per-instance triangles are defined in terms of four pieces of data which tell where
        // on the arrow we are, using the mesh vertex and mesh normal as inputs. The components are:
        //    x: selects the position perpendicular to the length of the arrow in screen space
        //    y: selects either the (vertex) or (vertex + normal) in 3D space
        //    z: selects the arrowhead length-wise offset in screen space
        //    w: selects the arrowhead width-wise offset in screen space
        // The first triangle of the tail:
        -1, 0, 0, 0,
        1, 0, 0, 0,
        1, 1, -1, 0,

        // The second triangle of the tail:
        -1, 0, 0, 0,
        1, 1, -1, 0,
        -1, 1,-1, 0,

        // The arrowhead:
        0, 1, -1, -1,
        0, 1, -1, 1,
        0, 1, 0, 0
      ])
    },
    uniforms: {
      // Define the screen-space line width in terms of a property but also
      // scaled by the pixel ratio so that it remains constant at different
      // pixel ratios. (The framebuffer height is just for proper screen-space
      // scaling)
      uTailWidth: (ctx, props) =>
        (props.arrowTailWidth / ctx.framebufferHeight) * ctx.pixelRatio,
      // Define the shape of the arrowhead. This just the scale factor
      // for the ones and zeros above.
      uArrowheadShape: (ctx, props) => [
        (props.arrowheadLength / ctx.framebufferHeight) * ctx.pixelRatio * 2.0,
        (props.arrowheadWidth / ctx.framebufferHeight) * ctx.pixelRatio
      ],
      uInset: (ctx, props) => (props.inset || 0) / ctx.framebufferWidth * ctx.pixelRatio,

      // The aspect ratio affects computation of offsets for the screen-space
      // lines.
      uAspect: ctx => ctx.framebufferWidth / ctx.framebufferHeight,
      uColor: regl.prop('arrowColor'),
      uForeshortening: (ctx, props) => (props.foreshortening ? 1 : 0),

      // Not really necessary, but an overall scale factor for the normals
      uScale: regl.prop('arrowScale')
    },
    primitive: 'triangles',
    instances: (ctx, props) => props.vertexCount, // One instance per vertex
    count: 9 // Nine vertices per instance
  });
};
