const planFFT = require('./plan-fft.js');
const createFFTPassCommand = require('./fft-pass.js');

const constants = `
#ifndef PI
#define PI ${Math.PI}
#endif
#ifndef TWOPI
#define TWOPI ${Math.PI * 2}
#endif
`;

const grid = `
float grid(vec2 parameter, float width, float feather) {
  float w1 = width - feather * 0.5;
  vec2 d = fwidth(parameter);
  vec2 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
  vec2 a2 = smoothstep(d * (w1 + feather), d * w1, looped);
  return max(a2.x, a2.y);
}`;

const wavenumber = `
float wavenumber (float resolution, float dx) {
  float x = (gl_FragCoord.x - 0.5) * resolution;
  return ((x < 0.5) ? x : x - 1.0) * (TWOPI / dx);
}

vec2 wavenumber (vec2 resolution, vec2 dxy) {
  vec2 xy = (gl_FragCoord.xy - 0.5) * resolution;
  return vec2(
    (xy.x < 0.5) ? xy.x : xy.x - 1.0,
    (xy.y < 0.5) ? xy.y : xy.y - 1.0
  ) * TWOPI / dxy;
}`;

const cmul = `
vec2 cmul (vec2 a, vec2 b) {
  return vec2(
    a.x * b.x - a.y * b.y,
    a.y * b.x + a.x * b.y
  );
}`;

function cycleFBOs(array) {
  let tmp = array[0];
  for (var i = 0; i < array.length - 1; i++) {
    array[i] = array[i + 1];
  }
  array[array.length - 1] = tmp;
  return array;
}

module.exports = class KS {
  constructor (regl, {
    N = [256, 256],
    colorType = 'float',
    interpType = 'linear',
    dt = 0.15,
    nu = [0.001, 0.001], 
  } = {}) {
    this.N = N;
    this.colorType = colorType;
    this.interpType = interpType;
    this.regl = regl;
    this.dt = dt;
    this.nu = nu;

    this.allocateResources();
  }

  allocateResources () {
    const regl = this.regl;

    this.V = [0, 1].map(() =>
      regl.framebuffer({
        color: regl.texture({
          width: this.N[0],
          height: this.N[1],
          type: this.colorType,
          min: this.interpType,
          mag: this.interpType,
          wrapS: 'repeat',
          wrapT: 'repeat',
        })
      })
    );

    this.Vhat = [0, 1, 2].map(() =>
      regl.framebuffer({

        color: regl.texture({
          width: this.N[0],
          height: this.N[1],
          type: this.colorType,
          min: 'nearest',
          mag: 'nearest'
        })
      })
    );

    this.ABhat = [0, 1].map(() =>
      regl.framebuffer({
        
        color: regl.texture({
          width: this.N[0],
          height: this.N[1],
          type: this.colorType,
          min: 'nearest',
          mag: 'nearest'
        })
      })
    );

    this.tmp = [0, 1, 2, 3].map(() =>
      regl.framebuffer({
        color: regl.texture({
          width: this.N[0],
          height: this.N[1],
          type: this.colorType,
          min: 'nearest',
          mag: 'nearest'
        })
      })
    );


    this._forwardFFT = planFFT({
      forward: true,
      width: this.N[0],
      height: this.N[1],
      ping: this.tmp[0],
      pong: this.tmp[1],
      input: null,
      output: null,
      splitNormalization: true
    })

    this._inverseFFT = planFFT({
      forward: false,
      width: this.N[0],
      height: this.N[1],
      ping: this.tmp[0],
      pong: this.tmp[1],
      input: null,
      output: null,
      splitNormalization: true
    })

    this._fft = createFFTPassCommand(regl);
    this._performFFT = (plan, input, output) => {
      plan[0].input = input;
      plan[plan.length - 1].output = output;
      return this._fft(plan);
    };

    this._configureSimulation = regl({
      uniforms: {
        dx: (ctx, props) => [(2.0 * Math.PI) / this.N[0], (2.0 * Math.PI) / this.N[1]],
        dt: (ctx, props) => props.dt * (props.nu ? props.nu[0] : 0),
        nu: regl.prop('nu')
      }
    });
    
    this._blit = regl({
      vert: `
        precision highp float;
        attribute vec2 xy;
        void main () {
          gl_Position = vec4(xy, 0, 1);
        }`,
      attributes: {
        xy: [-4, -4, 4, -4, 0, 4]
      },
      uniforms: {
        uInverseResolution: ctx => [1 / this.N[0], 1 / this.N[1]]
      },
      depth: { enable: false },
      count: 3
    });

    this._initialize = regl({
      frag: `
        precision highp float;
        uniform vec2 uInverseResolution;
        uniform float n;
        ${constants}

        void main () {
          vec2 uv = (gl_FragCoord.xy - 0.5) * uInverseResolution;
          vec2 xy = uv * TWOPI;

          // A circular pulse instead:
          //float r = length(uv - 0.5);
          //float f = -2.0 * exp(-pow(r / 0.05, 8.0));

          float f = sin(n * (xy.x + xy.y)) + sin(n * xy.x) + sin(n * xy.y); //+ xy.x + xy.y * xy.x;
          //float f = 10.0 * sin(n * (xy.x)) * cos(n * (xy.y));
          gl_FragColor = vec4(f, 0, 0, 0);
        }`,
      uniforms: {
        n: regl.prop('n')
      }
    });

    // Following Eqn (F.9), we differentiate in the frequency domain via multiplication
    // by i * kx and i * ky, respectively.
    this._differentiateVhat = regl({
      frag: `
        precision highp float;
        uniform sampler2D VhatTex;
        uniform vec2 uInverseResolution, dx;

        ${constants}
        ${cmul}
        ${wavenumber}

        #define I vec2(0, 1)

        void main () {
          vec2 uv = gl_FragCoord.xy * uInverseResolution;
          vec2 Vhat = texture2D(VhatTex, uv).xy;

          vec2 k = wavenumber(uInverseResolution, dx);

          // x-derivative is (i * kx * Vhat)
          vec2 dVhatdx = cmul(vec2(0, k.x), Vhat);

          // y-derivative is (i * ky * Vhat)
          vec2 dVhatdy = cmul(vec2(0, k.y), Vhat);

          // We interleave the result as (i kx Vhat) + i * (i ky Vhat) so that
          // we recover the derivatives in the real domain as the real and
          // imaginary components. This could be greatly simplified to avoid
          // multiplications by one and zero.
          //
          // We also place Vhat in the final two components so that we recover
          // V along the way, for plotting!!!
          gl_FragColor = vec4(Vhat, dVhatdx + cmul(I, dVhatdy));
        }`,
      uniforms: {
        VhatTex: regl.prop('Vhat')
      },
      framebuffer: regl.prop('Vhat_VhatxVhaty')
    });

    // This step transforms A and B from the frequency to the spatial domain.
    this._ABfromVxVy = regl({
      frag: `
        precision highp float;
        uniform sampler2D V_VxVytex;
        uniform vec2 uInverseResolution;

        void main () {
          vec2 uv = gl_FragCoord.xy * uInverseResolution;
          vec2 VxVy = texture2D(V_VxVytex, uv).zw;

          // From Eqn (F.9), Ahat = -F(1/2 Vx^2). Here we compute the pre-FFT 1/2 Vx^2
          // and swizzle it into the proper components to end up with
          //   (-1/2 Vx^2, 0)
          //   (-1/2 Vy^2, 0)
          gl_FragColor = vec4(
            -0.5 * (VxVy * VxVy),
            vec2(0.0)
          ).xzyw;
        }`,
      uniforms: {
        V_VxVytex: regl.prop('V_VxVy')
      },
      framebuffer: regl.prop('AB')
    });

    /* Compute Ahat and Bhat given current Vhat. Since we have spare channels for the
     * initial inverse FFT, we place FFT^-1(Vhat) in V along the way.
     * @param {fbo} Vhat - input FFT(V)
     * @param {fbo} V - destination into which FFT^-1(V) is written
     * @param {fbo} ABhat - destination into which Ahat and Bhat are written into the first
     *                      two and last two channels of ABhat, respectively.
     */
    this._computeABhat = (Vhat, V, ABhat) => {
      let Vhat_VhatxVhaty = this.tmp[2];
      let V_VxVy = V;
      let AB = this.tmp[3];

      // Pass Vhat straight through unmodified, and (i kx Vhat) and (i ky Vhat) into the
      // last two channels, mixed together as [(i kx Vhat) + i * (i ky Vhat)] since for
      // real-valued V input the derivative remains separable and allows us to FFT them
      // at the same time.
      this._differentiateVhat({ Vhat, Vhat_VhatxVhaty });

      // Inverse-FFT Vhat -> (V, 0) into the first two channels, and derivatives
      // Vhatx -> Vx and Vhaty -> Vy into the last two channels. This is where the
      // separation of the mixed real and imaginary parts happens.
      this._performFFT(this._inverseFFT, Vhat_VhatxVhaty, V_VxVy);

      // Use Vx and Vy derivatives from the last two channels of V_VxVy to compute A and
      // B as -1/2 Vx^2 and -1/2 Vy^2, respectively.
      this._ABfromVxVy({ V_VxVy, AB });

      // Finally, transform ABhat <- FFT(AB)
      this._performFFT(this._forwardFFT, AB, ABhat);
    }

    this._stripImag = regl({
      frag: `
        precision highp float;
        uniform sampler2D src;
        uniform vec2 uInverseResolution;
        void main () {
          // Just drop everything except the first component :/
          gl_FragColor = vec4(texture2D(src, gl_FragCoord.xy * uInverseResolution).x, 0, 0, 0);
        }`,
      uniforms: {
        src: regl.prop('src')
      },
      framebuffer: regl.prop('dst')
    });

    this._copyToScreen = regl({
      frag: `
        #extension GL_OES_standard_derivatives : enable
        precision highp float;
        uniform vec2 uInverseResolution, range;
        uniform mat4 inverseView;
        uniform float invGamma, gridStrength;
        uniform sampler2D V, colorscale;
        uniform bool invert;

        ${constants}
        ${grid}

        float hardstep (float edge0, float edge1, float x) {
          //return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
          return (x - edge0) / (edge1 - edge0);
        }

        float ramp (float x) {
          return 0.5 + atan(PI * (x - 0.5)) / PI;
        }

        void main () {
          vec2 uv = (inverseView * vec4((-1.0 + 2.0 * gl_FragCoord.xy * uInverseResolution), 0, 1)).xy;
          float V = texture2D(V, uv).x;
          float f = hardstep(range.y, range.x, V);
          if (invert) f = 1.0 - f;
          f = ramp(f);
          vec3 color = texture2D(colorscale, vec2(f, 0.5)).rgb;
          gl_FragColor = vec4(color, 1.0);

          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1), grid(uv, 0.5, 0.5) * gridStrength);
        }`,
      uniforms: {
        uInverseResolution: ctx => [
          1 / ctx.framebufferWidth,
          1 / ctx.framebufferHeight
        ],
        view: regl.context('view'),
        inverseView: regl.context('inverseView'),
        invert: regl.prop('invert'),
        range: regl.prop('range'),
        V: regl.prop('V'),
        colorscale: regl.prop('colorscale'),
        gridStrength: regl.prop('grid'),
      }
    });

    this._bdfUpdate = regl({
      // A Backward Differentiation Formula (BDF) update for the frequency domain solution,
      // from Equation (F.8).
      frag: `
        precision highp float;

        uniform sampler2D Vhat0tex, Vhat1tex, ABhat0tex, ABhat1tex;
        uniform vec2 uInverseResolution, nu;
        uniform float dt;
        uniform vec2 dx;

        ${constants}
        ${cmul}
        ${wavenumber}

        void main () {
          vec2 k = wavenumber(uInverseResolution, dx);

          vec2 uv = gl_FragCoord.xy * uInverseResolution;
          vec2 Vhat0 = texture2D(Vhat0tex, uv).xy;
          vec2 Vhat1 = texture2D(Vhat1tex, uv).xy;

          // Equation (F.7)
          float c = 1.0 + 1.0 / nu.x;

          float cdt = c * dt;
          float nu21 = nu.y / nu.x;

          // Nonlinear terms via Eqn (F.9), as computed in the computeABhat method.
          vec4 ABhat0 = texture2D(ABhat0tex, uv);
          vec4 ABhat1 = texture2D(ABhat1tex, uv);

          // Eqn. (F.10). xi may be complex-valued, in general, but since we deal
          // only in even-numbered derivatives (0th, laplacian, biharmonic), it
          // happens to be strictly real. Note the extra factor of dt on the final
          // term, which seems to be missing in original source.
          float k1k2_2 = k.x * k.x + nu21 * k.y * k.y;
          float xi = 1.5 + cdt - dt * k1k2_2 + dt * nu.x * k1k2_2 * k1k2_2;

          // Eqn (F.8) for the update Vhat^{n + 2}.
          gl_FragColor.xy = (
            (2.0 + 2.0 * cdt) * Vhat1
            - (0.5 + cdt) * Vhat0
            + dt * (2.0 * (ABhat1.xy + nu21 * ABhat1.zw) - (ABhat0.xy + nu21 * ABhat0.zw))
          ) / xi;

          if (gl_FragCoord.x == 0.5 && gl_FragCoord.y == 0.5) {
            gl_FragColor.xy = vec2(0);
          }

          gl_FragColor.zw = vec2(0);
        }`,
      uniforms: {
        Vhat0tex: regl.prop('Vhat[0]'),
        Vhat1tex: regl.prop('Vhat[1]'),
        ABhat0tex: regl.prop('ABhat[0]'),
        ABhat1tex: regl.prop('ABhat[1]')
      },
      framebuffer: regl.prop('Vhat[2]')
    })
  }

  initialize (n = 1) {
    this.regl.poll();
    this._blit(() => {
      this._configureSimulation({ n }, () => {
        this.V.forEach((v, i) => {
          v.use(() => this._initialize({ n }));
          this._performFFT(this._forwardFFT, v, this.Vhat[i]);
          this._computeABhat(this.Vhat[i], this.V[i], this.ABhat[i]);
        });
      });
    });
  }

  iterate(ctx, {
    range = [-10, 10],
    invert = true,
    simulate = true,
    colorscale = null,
    grid,
    Linv,
    LxLy,
    contrast,
  } = {}) {
    let dirty = true;
    let isRender = ctx && ctx.render;
    let tick = 0;
    const nu = [
      (Math.PI * Linv)**2,
      (Math.PI * Linv * LxLy)**2
    ]
    this._blit(() => {
      this._configureSimulation({
        dt: this.dt,
        nu,
      }, () => {
        if (isRender || simulate) {
          this._computeABhat(this.Vhat[1], this.V[1], this.ABhat[1]);
          this._bdfUpdate({
            Vhat: this.Vhat,
            ABhat: this.ABhat,
            dt: this.dt
          });
          dirty = true;
        }

        if (dirty) {
          this._copyToScreen({
            V: this.V[1],
            range: [-10 / contrast**2, 10 / contrast**2],
            invert: !!invert,
            colorscale,
            grid,
          });
          dirty = false;
        }

        if (isRender || simulate) {
          cycleFBOs(this.Vhat);
          cycleFBOs(this.V);
          cycleFBOs(this.ABhat);

          // This step should be unnecessary! Its only purpose is to remove the imaginary
          // component from the solution. I tried to do this without an FFT by just enforcing
          // symmetry/conjugates in the FFT values, but it did not work. A Hartley transform
          // would be better and would cut the cost of the simulation in half.
          this._performFFT(this._inverseFFT, this.Vhat[1], this.tmp[3]);
          this._stripImag({ src: this.tmp[3], dst: this.tmp[2] });
          this._performFFT(this._forwardFFT, this.tmp[2], this.Vhat[1]);
        }
      });
    });
  }
}
