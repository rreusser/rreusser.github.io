'use strict';

const glsl = require('glslify');

module.exports = function (regl, mesh, colorscale) {
  return regl({
    vert: `
      precision highp float;
      attribute vec2 rth;
      varying float psi, cp, rgrid;
      varying vec2 uv, xy;
      uniform mat4 modelview;
      uniform vec2 mu, gridSize;
      uniform float r0, theta0, n, circulation, scale, rsize, alpha, colorScale;
      #define OPI2 0.15915494309

      vec2 cdiv (vec2 a, vec2 b) {
        float e, f;
        float g = 1.0;
        float h = 1.0;

        if( abs(b.x) >= abs(b.y) ) {
          e = b.y / b.x;
          f = b.x + b.y * e;
          h = e;
        } else {
          e = b.x / b.y;
          f = b.x * e + b.y;
          g = e;
        }

        return (a * g + h * vec2(a.y, -a.x)) / f;
      }

      vec2 cmul (vec2 a, vec2 b) {
        return vec2(a.x * b.x - a.y * b.y, a.y * b.x + a.x * b.y);
      }

      vec2 csqr (vec2 a) {
        return vec2(a.x * a.x - a.y * a.y, 2.0 * a.x * a.y);
      }

      vec2 cinv (vec2 b) {
        float e, f;
        vec2 g = vec2(1, -1);

        if( abs(b.x) >= abs(b.y) ) {
          e = b.y / b.x;
          f = b.x + b.y * e;
          g.y = -e;
        } else {
          e = b.x / b.y;
          f = b.x * e + b.y;
          g.x = e;
        }

        return g / f;
      }

      float cmag2 (vec2 a) {
        return dot(a, a);
      }

      void main () {
        uv = rth;
        uv.x = pow(uv.x, 0.6666666);
        uv *= gridSize;
        uv.y *= OPI2;

        rgrid = rth.x;
        float r = 1.0 + rgrid * rsize;
        float theta = rth.y + theta0;
        vec2 rot = vec2(cos(alpha), sin(alpha));
        vec2 zeta = r * vec2(cos(theta), sin(theta));

        xy = (mu + r0 * zeta) - vec2(1, 0);

        // Compute 1 + 1 / zeta and 1 - 1 / zeta:
        vec2 oz = cinv(r0 * zeta + mu);
        vec2 opz = oz;
        vec2 omz = -oz;
        opz.x += 1.0;
        omz.x += 1.0;

        // Exponentiate both of the above:
        float opznarg = atan(opz.y, opz.x) * n;
        float opznmod = pow(dot(opz, opz), n * 0.5);

        // (1 + 1 / (zeta + mu)) ** n:
        vec2 opzn = opznmod * vec2(cos(opznarg), sin(opznarg));

        float omznarg = atan(omz.y, omz.x) * n;
        float omznmod = pow(dot(omz, omz), n * 0.5);

        // (1 - 1 / (zeta + mu)) ** n:
        vec2 omzn = omznmod * vec2(cos(omznarg), sin(omznarg));

        // Compute the potential:
        vec2 circ = vec2(0.0, circulation * OPI2);
        vec2 wt = rot - cdiv(csqr(cinv(zeta)), rot) + cdiv(circ, zeta);

        // Compute the final coordinate, z:
        vec2 z = n * cdiv(opzn + omzn, opzn - omzn);
        //vec2 z = mu + r0 * zeta;

        // Compute the jacobian:
        vec2 dzdzeta = 4.0 * n * n * cdiv(cmul(opzn, omzn), cmul(csqr(r0 * zeta + mu) - vec2(1, 0), csqr(opzn - omzn)));

        cp = 1.0 - cmag2(cdiv(wt, dzdzeta)) * colorScale;

        // Compute z^2 - 1
        psi = (r - 1.0 / r) * sin(theta + alpha) + circulation * OPI2 * log(r);

        gl_Position = modelview * vec4(z, 0, 1);
      }
    `,
    frag: glsl(`
      #extension GL_OES_standard_derivatives : enable
      precision highp float;
      varying float psi, cp, rgrid;
      varying vec2 uv, xy;
      uniform float cpAlpha, streamAlpha, gridAlpha;
      uniform vec2 mu;
      uniform sampler2D colorscale;

      #define PI 3.14159265358979
      #pragma glslify: grid = require(glsl-solid-wireframe/cartesian/scaled)

      float hypot (vec2 z) {
        float x = abs(z.x);
        float y = abs(z.y);
        float t = min(x, y);
        x = max(x, y);
        t = t / x;
        return x * sqrt(1.0 + t * t);
        //return (z.x == 0.0 && z.y == 0.0) ? 0.0 : x * sqrt(1.0 + t * t);
      }

      float linearstep(float edge0, float edge1, float x) {
        return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
      }

      const float octaveDivisions = 8.0;
      const int octaves = 4;
      const float n = float(octaves);

      float blendedContours (float f, float minSpacing, float width, float antialiasing) {
        float screenSpaceLogGrad = hypot(vec2(dFdx(f), dFdy(f)));
        float localOctave = log2(screenSpaceLogGrad * minSpacing) / log2(octaveDivisions);
        float contourSpacing = pow(octaveDivisions, ceil(localOctave));
        float plotVar = f / contourSpacing;
        float widthScale = contourSpacing / screenSpaceLogGrad;
        float contourSum = 0.0;
        for(int i = 0; i < octaves; i++) {
          float t = float(i + 1) - fract(localOctave);
          float weight = smoothstep(0.0, 1.0, t) * smoothstep(n, n - 1.0, t) * t;
          contourSum += weight * linearstep(
            0.5 * (width + antialiasing),
            0.5 * (width - antialiasing),
            (0.5 - abs(fract(plotVar) - 0.5)) * widthScale
          );

          // Rescale for the next octave
          widthScale *= octaveDivisions;
          plotVar /= octaveDivisions;
        }

        return contourSum / n;
      }

      const float feather = 1.0;
      const float streamWidth = 1.5;
      const float pressureWidth = 1.5;
      const float boundaryWidth = 3.0;

      void main () {
        float boundary = 1.0 - grid(rgrid * 0.5, boundaryWidth, feather);
        float pressure = (blendedContours(cp, 2.0, pressureWidth, feather)) * cpAlpha;
        float stream = blendedContours(psi, 1.0, streamWidth, feather) * streamAlpha;
        vec3 color = texture2D(colorscale, vec2(
          1.0 - pow(atan(8.0 * (1.0 - cp)) / (0.5 * PI), 2.0),
          0.5
        )).xyz;

        float gridLines = max(
          blendedContours(xy.x, 2.0, 1.25, feather),
          blendedContours(xy.y, 2.0, 1.25, feather)
        ) * gridAlpha;
        color = mix(color, vec3(1), max(max(max(gridLines, pressure), stream), boundary));

        gl_FragColor = vec4(color, 1);//vec4((color * pressure + stream) * boundary, 1);
      }
    `),
    uniforms: {
      colorscale
    },
    attributes: {
      rth: mesh.positions,
      //barycentric: mesh.barycentric,
    },
    depth: {
      enable: false
    },
    elements: mesh.cells,
    count: mesh.cells.length * 3
  });

};
