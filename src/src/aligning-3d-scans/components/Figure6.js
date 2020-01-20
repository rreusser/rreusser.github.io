const React = require('react');
const ReactDOM = require('react-dom');
const createRegl = require('regl');
const resl = require('resl');
const IdyllComponent = require('idyll-component');
const mat4create = require('gl-mat4/create');
const mat4rotate = require('gl-mat4/rotate');
const nurbs = require('nurbs');
const unindex = require('./lib/unindex');
const createCamera = require('./lib/regl-turntable-camera');
const createInteractions = require('./lib/interactions');
const meshNurbsSurface = require('./lib/mesh-nurbs-surface');
const createBuffers = require('./lib/create-buffers');

class ReglComponent extends IdyllComponent {

  componentDidMount() {
    if (super.componentDidMount) {
      super.componentDidMount();
    }
    const node = ReactDOM.findDOMNode(this);
    this.initialize(node, this.props);
  }

  initialize (node, props) {
    this.regl = createRegl({
      pixelRatio: Math.min(window.devicePixelRatio, 2.0),
      container: node,
      extensions: [
        'oes_element_index_uint',
        'oes_standard_derivatives',
        'angle_instanced_arrays',
      ],
      attributes: {
        antialias: true
      },
      onDone: (err, regl) => {
        if (err) throw err;

        var drawMesh = require('./lib/draw-mesh')(regl);
        var drawVectors = require('./lib/draw-vectors')(regl);
        var drawNormals = require('./lib/draw-normals')(regl);

        this.camera = createCamera(regl, {
          center: [0.1, -0.1, 0],
          rotationCenter: [0, 0, 0],
          near: 0.01,
          far: 20,
          phi: 0.3,
          distance: 4.0,
          theta: 0.3,
        });

        this.interations = createInteractions(this.camera);

        var spline = nurbs({
          points: [
            {y: -1.0, r1: 1e-4, r2: 1e-4,  x: 0.05, rot: -0.2},
            {y: -1.0, r1: 0.45, r2: 0.45,  x: 0.05, rot: -0.2},
            {y: -0.3, r1: 0.55, r2: 0.55,  x: -0.05, rot: -0.1},
            {y:  0.1, r1: 0.69,  r2: 0.65,  x: -0.2, rot: 0.0},
            {y:  0.4, r1: 0.75,  r2: 0.7,  x: -0.1, rot: 0.2},
            {y:  0.8, r1: 0.8,  r2: 0.9,  x: 0.15, rot: 0.5},
          ].map(s => [
            [s.x + s.r1, s.y - s.rot * s.r1, 0    ],
            [s.x,        s.y,                s.r2 ],
            [s.x - s.r1, s.y + s.rot * s.r1, 0    ],
            [s.x,        s.y,                -s.r2]
          ]),
          boundary: ['clamped', 'closed'],
          degree: [3, 4]
        });


        var model = unindex(meshNurbsSurface({}, spline, {
          computeNormals: true,
          computeUvs: true,
          divisions: [50, 70],
          unwrapV: true,
        }));

        var subsampledModel = unindex(meshNurbsSurface({}, spline, {
          computeNormals: true,
          divisions: [6, 9],
        }));

        var modelData = createBuffers(regl, model, {
          borderWidth: 1.5,
          borderColor: [0.1, 0.2, 0.3, 1.0],
        });

        var normalData = createBuffers(regl, subsampledModel, {
          lineWidth: 1,
          arrowheadLength: 7,
          arrowheadWidth: 4,
          scale: 0.2,
        });

        var axes = createBuffers(regl, {
          vertices: [
            0.0, -1.4, 0,  0.0, 1.4, 0,
          ],
        }, {
          lineWidth: 2.5,
          lineColor: [0.8, 0.2, 0.3, 1.0],
          arrowheadWidth: 10,
          arrowheadLength: 20,
          depth: true,
        });

        regl.frame(({tick}) => {
          this.camera.tick({
            far: this.camera.params.distance + 10.0,
            near: Math.max(this.camera.params.distance - 10.0, 0.01),
          });
          if (!this.camera.state.dirty) return;
          this.camera.setUniforms(() => {
            regl.clear({color: [1, 1, 1, 1]});

            drawMesh(modelData);
            drawVectors(axes);
            drawNormals(normalData);
          });
        });
        window.addEventListener('scroll', () => {
          if (this.isOnscreen() && this.previousScrollPosition !== undefined) {
            var dScroll = window.scrollY - this.previousScrollPosition;
            this.camera.params.dTheta += dScroll * 0.0001;
            this.camera.taint();
          }
          this.previousScrollPosition = window.scrollY;
        }, false);
      }
    });
  }

  update() {
  }

  isOnscreen () {
    if (!this.camera) return false;
    var rect = this.camera.element.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  componentWillReceiveProps(nextProps) {
    this.update(nextProps);
  }

  render() {
    let { className, style, onClick } = this.props;
    className = (className ? className : '') + ' regl';
    style = style || {};
    style.width = '100%';
    style.maxWidth = '300px';
    style.height = '400px';
    return React.createElement('div', {className, style, onClick});
  }
}

ReglComponent.defaultProps = {
  className: ''
};

module.exports = ReglComponent;
