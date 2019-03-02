module.exports = Grid;

function Grid (regl) {
  this.regl = regl;

  this.referenceSize = 400;
  this.lines = [];
  this.props = [];
  this.n = 1000;
  this.octaves = 3;
  var lines = new Float32Array(this.n * 4);

  for (var j = 0; j < this.n; j++) {
    lines[4 * j + 0] = -1;
    lines[4 * j + 1] = j;
    lines[4 * j + 2] = 1;
    lines[4 * j + 3] = j;
  }
  var buffer = regl.buffer(lines);

  for (var i = 0; i < this.octaves * 2; i++) {
    this.props[i] = {
      buffer: buffer
    };
  }

  var el;
  this.xNumbers = [];
  this.yNumbers = [];
  var labelContainer = document.createElement('div');
  labelContainer.zIndex = 1;
  labelContainer.position = 'fixed';
  document.body.appendChild(labelContainer);
  for (var i = 0; i < 40; i++) {
    el = document.createElement('span');
    labelContainer.appendChild(el);
    this.xNumbers.push(el);
    el.style.position = 'fixed';
    el.style.opacity = 0;
    el.style.top = 0;
    el.style.left = 0;
    el.style.color = 'white';
    el.textContent = '';
    el.style.transform = 'translate3d(0,0,0)'
    el.style.fontFamily = '"Helvetica", sans-serif';
    el.style.fontWeight = 200;
    el.style.fontSize = '0.75em';

    el = document.createElement('span');
    labelContainer.appendChild(el);
    this.yNumbers.push(el);
    el.style.position = 'fixed';
    el.style.opacity = 0;
    el.style.top = 0;
    el.style.left = 0;
    el.style.color = 'white';
    el.textContent = '';
    el.style.transform = 'translate3d(0,0,0)'
    el.style.fontFamily = '"Helvetica", sans-serif';
    el.style.fontWeight = 200;
    el.style.fontSize = '0.75em';
  }


  this.drawLines = regl({
    vert: `
      precision highp float;
      attribute vec2 position;
      uniform mat4 view;
      uniform float step, offset;
      uniform bool swap;
      void main () {
        vec2 p = (view * vec4(((swap ? position.yx : position) + offset) * step, 0, 1)).xy;

        vec2 xy;
        if (swap) {
          xy = vec2(p.x, position.x);
        } else {
          xy = vec2(position.x, p.y);
        }

        gl_Position = vec4(xy, 0, 1);
      }
    `,
    frag: `
      precision highp float;
      uniform float opacity;
      void main () {
        gl_FragColor = vec4(vec3(1), 0.2 * opacity);
      }
    `,
    depth: {
      enable: false
    },
    blend: {
      enable: true,
      equation: {
        rgb: 'add',
        alpha: 'add',
      },
      func: {
        srcRGB: 'src alpha',
        srcAlpha: 'src alpha',
        dstRGB: 1,
        dstAlpha: 1,
      },
    },
    attributes: {
      position: regl.prop('buffer'),
    },
    uniforms: {
      step: regl.prop('step'),
      offset: regl.prop('offset'),
      swap: regl.prop('swap'),
      opacity: regl.prop('opacity'),
    },
    primitive: 'lines',
    count: function (ctx, props) {
      return props.count * 2;
    },
  });
}

function nearestDivision (base, center, range) {
  return Math.pow(base, Math.floor(Math.log(range) / Math.log(base)) + 1);
}

function step (i1, i2, i) {
  return Math.max(0, Math.min(1, (i - i1) / (i2 - i1)));
}

Grid.prototype = {
  draw: function (mView, padding) {
    var w = window.innerWidth;
    var h = window.innerHeight;

    var i1, i2, props;
    var xr = 1.0 / mView[0];
    var yr = 1.0 / mView[5];
    var xc = -mView[12] * xr;
    var yc = -mView[13] * yr;

    var base = 5;
    var scale = this.regl._gl.canvas.height / this.referenceSize;
    var pow = Math.log(yr * 2 * base / scale) / Math.log(base);
    var powFloor = Math.floor(pow);
    var div = Math.pow(base, powFloor);

    for (var i = 0; i < this.octaves; i++) {
      var props = this.props[i];
      props.step = div;
      i1 = Math.floor((yc - yr) / div);
      i2 = Math.ceil((yc + yr) / div);
      props.offset = i1;
      props.count = Math.max(0, Math.min((i2 - i1), 1000));
      props.swap = false;
    
      if (i === 0) {
        props.opacity = step(powFloor, powFloor + 1, pow);
      } else if (i === this.octaves - 1) {
        props.opacity = step(powFloor + 1, powFloor, pow);
      } else {
        props.opacity = 1;
      }

      div /= base;
    }

    var props = this.props[1];
    for (var i = 1; i < Math.min(props.count, 40); i++) {
      var y = (props.offset + i) * props.step;
      var yn = h * (0.5 - 0.5 * (mView[13] + mView[5] * y));
      var number = this.yNumbers[i];
      var opacity = (yn < padding.top || yn > h - padding.bottom) ? 0 : 1;
      if (opacity) {
        var s = (-y).toFixed(3);
        s = s.replace(/\.0*$/, '');
        if (/\./.test(s)) s = s.replace(/0+$/, '');
        number.textContent = s;
        number.style.transform = 'translate3d(-100%,-50%,0) translate3d('+(padding.left - 5)+'px,' + yn + 'px,0)';
      }
      number.style.opacity = opacity;
    }

    for(; i<40; i++) {
      this.yNumbers[i].style.opacity = 0;
    }

    var scale = this.regl._gl.canvas.width / this.referenceSize;
    var pow = Math.log(xr * 2 * base / scale) / Math.log(base);
    var powFloor = Math.floor(pow);
    var div = Math.pow(base, powFloor);

    for (var i = this.octaves; i < this.octaves * 2; i++) {
      props = this.props[i];
      i1 = Math.floor((xc - xr) / div);
      i2 = Math.ceil((xc + xr) / div);
      props.offset = i1;
      props.step = div;
      props.count = Math.max(0, Math.min((i2 - i1), 1000));
      props.swap = true;

      var i0 = i - this.octaves;
      if (i0 === 0) {
        props.opacity = step(powFloor, powFloor + 1, pow);
      } else if (i0 === this.octaves - 1) {
        props.opacity = step(powFloor + 1, powFloor, pow);
      } else {
        props.opacity = 1;
      }

      div /= base;
    }

    var props = this.props[this.octaves + 1];
    for (var i = 1; i < Math.min(props.count, 40); i++) {
      var x = (props.offset + i) * props.step;
      var xn = w * (0.5 + 0.5 * (mView[12] + mView[0] * x));
      var number = this.xNumbers[i];
      var opacity = (xn < padding.left || xn > w - padding.right) ? 0 : 1;
      if (opacity) {
        var s = x.toFixed(3);
        s = s.replace(/\.0*$/, '');
        if (/\./.test(s)) s = s.replace(/0+$/, '');
        number.textContent = s;
        number.style.transform = 'translate3d(-50%,0,0) translate3d(' + xn + 'px,'+(window.innerHeight - (padding.bottom - 5))+'px,0)';
      }
      number.style.opacity = opacity;
    }

    for(; i<40; i++) {
      this.xNumbers[i].style.opacity = 0;
    }

    this.drawLines(this.props);
  },
};
