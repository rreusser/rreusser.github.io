const React = require('react');
const createRegl = require('regl');
const bunny = require('bunny');
const angleNormals = require('angle-normals');
const reglCamera = require('regl-camera');

class ReglDemo extends React.Component {
  getRef (node) {
    var w = Math.min(540, window.innerWidth - 30)
    node.style.width = w + 'px';
    node.style.height = Math.round(w * 0.7) + 'px';

    const regl = createRegl({
      container: node,
      pixelRatio: Math.min(window.devicePixelRatio, 1.5),
      attributes: {
        antialias: false,
        stencil: false,
        alpha: false
      }
    });

    const camera = reglCamera(regl, {
      distance: 30,
      phi: 0.7,
      theta: 1.5,
      center: [0, 5, 0],
      damping: 0
    });

    const drawBunny = regl({
      vert: `
        precision mediump float;
        attribute vec3 position, normal;
        uniform mat4 projection, view;
        varying vec3 surfaceNormal;
        void main () {
          surfaceNormal = normal;
          gl_Position = projection * view * vec4(position, 1);
        }
      `,
      frag: `
        precision mediump float;
        varying vec3 surfaceNormal;
        void main () {
          gl_FragColor = vec4(surfaceNormal, 1);
        }
      `,
      attributes: {
        position: bunny.positions,
        normal: angleNormals(bunny.cells, bunny.positions)
      },
      elements: bunny.cells
    });

    regl.frame(() => {
      camera(({dirty}) => {
        if (!dirty) return;
        regl.clear({color: [0.1, 0.1, 0.1, 1]});
        drawBunny();
      });
    });
  }

  render () {
    return <div ref={this.getRef}/>
  }
}

module.exports = ReglDemo;
