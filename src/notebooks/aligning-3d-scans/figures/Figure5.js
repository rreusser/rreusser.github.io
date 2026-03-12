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
const align = require('./lib/calculatePrincipalAxesAndCentroid');
const angleNormals = require('./lib/angle-normals');
const randn = require('gauss-random');

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
          distance: 4.3,
          theta: 0.3,
        });

        this.interations = createInteractions(this.camera);

        var spline = this.getSpline(props);

        this.surface = meshNurbsSurface(this.surface, spline, {
          computeNormals: true,
          computeUvs: true,
          divisions: [50, 70],
          unwrapV: false,
        });

        var model = unindex(this.surface);

        /*var subsampledModel = unindex(meshNurbsSurface({}, spline, {
          computeNormals: true,
          divisions: [6, 9],
        }));*/

        this.modelData = createBuffers(regl, model, {
          borderWidth: 1.5,
          borderColor: [0.1, 0.2, 0.3, 1.0],
        });

        /*var normalData = createBuffers(regl, subsampledModel, {
          lineWidth: 1,
          arrowheadLength: 7,
          arrowheadWidth: 4,
          scale: 0.25,
        });*/

        this.axes = createBuffers(regl, {
          vertices: [
            0, 0, 0,  0, 0, 0,
            0, 0, 0,  0, 0, 0,
            0, 0, 0,  0, 0, 0,
          ],
        }, {
          lineWidth: 1.5,
          lineColor: [0.8, 0.2, 0.3, 1.0],
          depth: true,
        });

        this.update(props);

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
            this.camera.params.dTheta -= dScroll * 0.0001;
            this.camera.taint();
          }
          this.previousScrollPosition = window.scrollY;
        }, false);
      }
    });
  }


  getSpline (props) {
    var xscale = 1.0;
    var yscale = props.aspect;
    var l = Math.sqrt(xscale * xscale + yscale * yscale) / Math.sqrt(2);
    xscale /= l;
    yscale /= l;

    var rx = props.radius * xscale;
    var ry = props.radius * yscale;
    var length = props.length;
    var curvature = props.curvature * 1.5 * length;

    return nurbs({
      points: [
        {y: -1.0 * length, r1: 1e-4, r2: 1e-4,  x: 0.05 * curvature, rot: -0.2 * curvature},
        {y: -1.0 * length, r1: 0.45 * rx, r2: 0.45 * ry,  x: 0.05 * curvature, rot: -0.2 * curvature},
        {y: -0.3 * length, r1: 0.55 * rx, r2: 0.55 * ry,  x: -0.05 * curvature, rot: -0.1 * curvature},
        {y:  0.1 * length, r1: 0.69 * rx,  r2: 0.65 * ry,  x: -0.2 * curvature, rot: 0.0 * curvature},
        {y:  0.4 * length, r1: 0.75 * rx,  r2: 0.7 * ry,  x: -0.1 * curvature, rot: 0.2 * curvature},
        {y:  0.8 * length, r1: 0.8 * rx,  r2: 0.9 * ry,  x: 0.15 * curvature, rot: 0.5 * curvature},
      ].map(s => [
        [s.x + s.r1, s.y - s.rot * s.r1, 1e-4    ],
        [s.x,        s.y,                s.r2 ],
        [s.x - s.r1, s.y + s.rot * s.r1, 0    ],
        [s.x,        s.y,                -s.r2]
      ]),
      boundary: ['clamped', 'closed'],
      degree: [3, 4]
    });
  }

  update(props) {
    var spline = this.getSpline(props);

    this.surface = meshNurbsSurface(this.surface, spline, {
      computeNormals: true,
      computeUvs: true,
      divisions: [50, 70],
      unwrapV: false,
    });

    if (!this.noise) {
      this.noise = new Float32Array(this.surface.vertices.length).map(() => randn() * 0.02);
    }

    for (var i = 0; i < this.surface.vertices.length; i++) {
      this.surface.vertices[i] += this.noise[i] * props.noise;
    }

    this.surface.normals = angleNormals(this.surface.faces, this.surface.vertices);

    this.surface.count = this.surface.faces.length / 3;

    var alignment = align([this.surface]);

    var m = alignment.matrix;
    var c = alignment.centroid;
    var s0 = Math.pow(alignment.strengths[0], 2);
    var s1 = Math.pow(alignment.strengths[1], 2);
    var s2 = Math.pow(alignment.strengths[2], 2);

    var smax = Math.max(s0, s1, s2);
    s0 *= -1.4 / smax;
    s1 *= -1.4 / smax;
    s2 *= -1.4 / smax;

    this.axes.vertices = this.axes.vertices([
      c[0] - m[0] * s0, c[1] - m[1] * s0, c[2] - m[2] * s0,
      c[0] + m[0] * s0, c[1] + m[1] * s0, c[2] + m[2] * s0,
      c[0] - m[4] * s1, c[1] - m[5] * s1, c[2] - m[6] * s1,
      c[0] + m[4] * s1, c[1] + m[5] * s1, c[2] + m[6] * s1,
      c[0] - m[8] * s2, c[1] - m[9] * s2, c[2] - m[10] * s2,
      c[0] + m[8] * s2, c[1] + m[9] * s2, c[2] + m[10] * s2
    ]);


    var model = unindex(this.surface);

    this.modelData.vertices = this.modelData.vertices(model.vertices);
    this.modelData.normals = this.modelData.normals(model.normals);
    this.modelData.uvs = this.modelData.uvs(model.uvs);

    this.camera.taint();
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
    style.maxWidth = '400px';
    style.height = '500px';
    style.marginTop = '-60px';
    return React.createElement('div', {className, style, onClick});
  }
}

ReglComponent.defaultProps = {
  className: ''
};

module.exports = ReglComponent;
