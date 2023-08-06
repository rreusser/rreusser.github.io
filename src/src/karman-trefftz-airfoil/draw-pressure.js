'use strict';

const glsl = require('glslify');

module.exports = function (regl, mesh, colorscale) {
  return regl({
    vert: `
      precision highp float;
      attribute vec2 rth;
      varying float cp;
      varying vec2 uv, xy, uvgrid;
      uniform mat4 modelview;
      uniform vec2 mu, gridSize;
      uniform float r0, theta0, n, circulation, scale, rsize, alpha, colorScale;
      #define OPI2 0.15915494309
      #define PI 3.14159265358979

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

      vec2 airfoil (vec2 rth, out float cp) {
        uv = rth;
        uv.x = pow(uv.x, 0.6666666);
        uv *= gridSize;
        uv.y *= OPI2;

        float r = 1.0 + rth.x * rsize;
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

        // Compute the jacobian:
        vec2 dzdzeta = 4.0 * n * n * cdiv(cmul(opzn, omzn), cmul(csqr(r0 * zeta + mu) - vec2(1, 0), csqr(opzn - omzn)));

        cp = 1.0 - cmag2(cdiv(wt, dzdzeta)) * colorScale;

        return z;
      }

      void main () {
        float dummy;
        vec2 z = airfoil(vec2(0, rth.y), cp);
        vec2 zm = airfoil(vec2(0, rth.y - 5.0e-4), dummy);
        vec2 zp = airfoil(vec2(0, rth.y + 5.0e-4), dummy);

        vec2 n = 0.5 * (normalize((zp - z).yx) * vec2(1, -1) + normalize((z - zm).yx) * vec2(1, -1));

        //vec2 n = normalize((zp - zm).yx);
        //n.y = -n.y;

        n *= max(0.0, 1.0 - (1.0 - cp) * 0.25);

        z += rth.x * n;
        uvgrid = rth * vec2(1.0, 20.0 / (2.0 * PI));

        gl_Position = modelview * vec4(z, 0, 1);
      }
    `,
    frag: glsl(`
      #extension GL_OES_standard_derivatives : enable
      precision highp float;
      varying float cp;
      varying vec2 uv, xy, uvgrid;
      uniform float cpAlpha, streamAlpha, gridAlpha;
      uniform vec2 mu;
      #pragma glslify: grid = require(glsl-solid-wireframe/cartesian/scaled)

      #define PI 3.14159265358979

      const float boundaryWidth = 2.0;

      void main () {
        float boundary = 1.0 - grid(uvgrid, boundaryWidth, 1.0);

        gl_FragColor = vec4(1, 0, 0, 0.4 + 0.4 * boundary);
      }
    `),
    attributes: {
      rth: mesh.positions,
    },
    depth: {
      enable: false
    },
    elements: mesh.cells,
    count: mesh.cells.length * 3,
    blend: {
      enable: true,
      func: {
        srcRGB: 'src alpha',
        srcAlpha: 1,
        dstRGB: 'one minus src alpha',
        dstAlpha: 1
      },
      equation: {
        rgb: 'add',
        alpha: 'add'
      },
    },

  });

};
