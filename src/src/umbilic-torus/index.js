const glsl = require('glslify');
const meshSurface = require('../../lib/mesh-surface');

require('resl')({
  manifest: {matcap: {type: 'image', src: 'static/00029.png'}},
  onError: console.error,
  onDone: function (assets) {
    require('regl')({
      pixelRatio: Math.min(1.5, window.devicePixelRatio),
      extensions: ['oes_standard_derivatives'],
      onDone: require('fail-nicely')(regl => run(regl, assets))
    });
  },
});

function run (regl, assets) {
  const matcap = regl.texture({data: assets.matcap, flipY: true});

  const mesh = meshSurface({}, (out, u, v) => {
		out[0] = Math.sin(u) * (7 + Math.cos(u / 3 - 2 * v) + 2 * Math.cos(u / 3 + v));
		out[1] = Math.cos(u) * (7 + Math.cos(u / 3 - 2 * v) + 2 * Math.cos(u / 3 + v));
		out[2] = Math.sin(u / 3 - 2 * v) + 2 * Math.sin(u / 3 + v);
  }, {
    resolution: [90, 30],
    uClosed: false,
    vClosed: false,
    uDomain: [-Math.PI, Math.PI],
    vDomain: [-Math.PI, Math.PI],
    computeNormals: true,
    attributes: {
      uv: (out, u, v) => {
        out[0] = u * 12.0 / Math.PI * 0.5;
        out[1] = v * 9.0 / Math.PI * 0.5 + 0.5;
      }
    },
  });

  const drawBg =  regl({
    vert: `
      precision highp float;
      attribute vec2 xy;
      varying vec2 uv;
      void main () {
        uv = xy;
        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: `
      precision highp float;
      varying vec2 uv;
      uniform sampler2D src;
      void main () {
        gl_FragColor = vec4(vec3(0.95, 0.98, 1.0) * vec3(1.0 - 0.2 * dot(uv, uv)), 1);
      }
    `,
    attributes: {xy: [-4, -4, 0, 4, 4, -4]},
    depth: {enable: false},
    count: 3
  });

  const drawMesh = regl({
    vert: `
      precision highp float;
      attribute vec3 position, normal;
      attribute vec2 uv;
      uniform mat4 projection, view;
      uniform vec3 eye;
      varying vec3 vNormal, vEye;
      varying vec2 vUv;
      void main () {
        vUv = uv;
        vNormal = mat3(view) * normal;
        vEye = mat3(view) * normalize(position - eye);
        gl_Position = projection * view * vec4(position, 1);
      }
    `,
    frag: glsl`
      precision highp float;
      #extension GL_OES_standard_derivatives : enable
      #pragma glslify: cartesian = require(glsl-solid-wireframe/cartesian/scaled)
      #pragma glslify: matcap = require(matcap)
      uniform sampler2D tex;
      varying vec3 vNormal, vEye;
      varying vec2 vUv;
      void main () {
        vec2 uv = matcap(vEye, vNormal);
        vec3 col = texture2D(tex, uv).rgb;
        gl_FragColor = vec4(mix(vec3(0.0), col, 0.6 + 0.4 * cartesian(vUv, 0.5, 2.0)), 1);
      }
    `,
    uniforms: {tex: matcap},
    attributes: {
      position: mesh.positions,
      normal: mesh.normals,
      uv: mesh.attributes.uv,
    },
    elements: mesh.cells,
    count: mesh.cells.length
  });

  const camera = require('./camera-2d')(regl);

  window.addEventListener('resize', camera.resize);

  regl.frame(() => {
    camera.draw(({dirty}) => {
      if (!dirty) return;
      drawBg();
      drawMesh();
    });
  });
}

