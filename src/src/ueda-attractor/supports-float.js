module.exports = function supportsFloat (regl) {
  if (!regl.hasExtension('oes_texture_float')) {
    return false;
  }

  try {
    var floatTex = regl.texture({radius: 1, type: 'float'});
    var floatFbo = regl.framebuffer({color: floatTex});

    var uint8Tex = regl.texture({radius: 1, type: 'uint8'});
    var uint8Fbo = regl.framebuffer({color: uint8Tex});

    var cmd = regl({
      vert: `
        precision mediump float;
        attribute vec2 xy;
        void main () {
          gl_Position = vec4(xy, 0, 1);
        }
      `,
      frag: `
        precision mediump float;
        void main () {
          gl_FragColor = vec4(0.0, 0.33, 0.67, 1.0);
        }
      `,
      attributes: {xy: [-4, -4, 0, 4, 4, -4]},
      depth: {enable: false},
      count: 3
    });

    var cast = regl({
      vert: `
        precision mediump float;
        attribute vec2 xy;
        varying vec2 uv;
        void main () {
          uv = xy * 0.5 + 0.5;
          gl_Position = vec4(xy, 0, 1);
        }
      `,
      frag: `
        precision mediump float;
        varying vec2 uv;
        uniform sampler2D src;
        void main () {
          gl_FragColor = texture2D(src, uv);
        }
      `,
      attributes: {xy: [-4, -4, 0, 4, 4, -4]},
      uniforms: {src: regl.prop('src')},
      depth: {enable: false},
      count: 3
    });
    

    var data = new Uint8Array(4);
    floatFbo.use(() => {
      cmd();
    });
    uint8Fbo.use(() => {
      cast({src: floatTex});
      regl.read(data);
    });

    floatFbo.destroy();
    floatTex.destroy();
    uint8Fbo.destroy();
    uint8Tex.destroy();

    return data[0] === 0 && data[1] === 84 && data[2] === 171 && data[3] === 255;
  } catch (e) {
    console.warn(e);
    return false;
  }
}
