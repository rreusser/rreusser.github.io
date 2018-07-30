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

        var drawMesh = require('./lib/draw-mesh-with-grid')(regl);
        var drawVectors = require('./lib/draw-vectors')(regl);
        var drawNormals = require('./lib/draw-normals')(regl);

        this.camera = createCamera(regl, {
          center: [0, 0, 0],
          rotationCenter: [0, 0, 0],
          near: 0.01,
          far: 20,
          phi: 0.5,
          distance: 3.1,
          theta: 0.85,
        });

        this.interations = createInteractions(this.camera);

        this.spline = nurbs({
          points: [
            {y: -props.length * 0.5, r1: props.width, r2: props.depth, x: 0.0, rot: 0.0},
            {y: props.length * 0.5, r1: props.width, r2: props.depth, x: 0.0, rot: 0.0},
          ].map(s => [
            [s.x + s.r1, s.y - s.rot * s.r1, 0    ],
            [s.x,        s.y,                s.r2 ],
            [s.x - s.r1, s.y + s.rot * s.r1, 0    ],
            [s.x,        s.y,                -s.r2]
          ]),
          boundary: ['clamped', 'closed'],
          degree: [1, 4]
        });

        this.surface = meshNurbsSurface({}, this.spline, {
          computeNormals: true,
          computeUvs: true,
          divisions: [1, 50],
          unwrapV: true,
        });

        this.modelData = createBuffers(regl, unindex(this.surface), {
          borderWidth: 1.5,
          borderColor: [0.1, 0.2, 0.3, 1.0],
        });

        this.axes = createBuffers(regl, {vertices: this.getAxisVertices(props)}, {
          lineWidth: 1.5,
          lineColor: [0.8, 0.2, 0.3, 1.0],
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

            drawMesh(this.modelData);
            drawVectors(this.axes);
            //drawNormals(normalData);
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

  update(props) {
    this.spline = this.spline({
      points: [
        {y: -props.length * 0.5, r1: props.width, r2: props.depth, x: 0.0, rot: 0.0},
        {y: props.length * 0.5, r1: props.width, r2: props.depth, x: 0.0, rot: 0.0},
      ].map(s => [
        [s.x + s.r1, s.y - s.rot * s.r1, 0    ],
        [s.x,        s.y,                s.r2 ],
        [s.x - s.r1, s.y + s.rot * s.r1, 0    ],
        [s.x,        s.y,                -s.r2]
      ]),
      boundary: ['clamped', 'closed'],
      degree: [1, 4]
    });

    this.surface = meshNurbsSurface(this.surface, this.spline, {
      computeNormals: true,
      computeUvs: true,
      divisions: [1, 50],
      unwrapV: true,
    });

    var unindexed = unindex(this.surface);

    this.modelData.vertices = this.modelData.vertices(unindexed.vertices);
    this.modelData.normals = this.modelData.normals(unindexed.normals);
    this.modelData.uvs = this.modelData.uvs(unindexed.uvs);

    this.axes.vertices = this.axes.vertices(this.getAxisVertices(props));


    this.camera.taint();
  }

  getAxisVertices (props) {
    if (props.length > props.width && props.length > props.depth) {
      return [0, -1, 0,  0, 1, 0];
    } else if (props.width > props.depth) {
      return [-1, 0, 0,  1, 0, 0];
    } else {
      return [0, 0, -1,  0, 0, 1];
    }
  }

  isOnscreen () {
    if (!this.camera) return false;
    var rect = this.camera.element.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  componentWillReceiveProps (nextProps) {
    this.update(nextProps);
  }

  render() {
    let { className, style, onClick } = this.props;
    className = (className ? className : '') + ' regl';
    style = style || {};
    style.width = '100%';
    style.maxWidth = '350px';
    style.height = '350px';
    style.marginTop = '-60px';
    return React.createElement('div', {className, style, onClick});
  }
}

ReglComponent.defaultProps = {
  className: ''
};

module.exports = ReglComponent;
