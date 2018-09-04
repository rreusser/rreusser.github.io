var preact = require('preact');
var createClass = require('preact-classless-component');
var css = require('insert-css');

module.exports = createGui;

function createGui (state, extras) {
  var h = preact.h;
  var render = preact.render;

  var Section = createClass({
    render: function () {
      var field = this.props.field;
      return h('fieldset', {
        className: 'section'
      }, [
        h('legend', null, field.name),
        Object.keys(field.value).map(key =>
          h(Control, {field: field.value.$path[key].$field})
        )
      ]);
    }
  });

  var Select = createClass({
    render: function () {
      var field = this.props.field;
      return h('div', {
        className: 'control'
      }, [
        h('label', {htmlFor: field.path}, field.name),
        h('select', {
          name: field.path,
          id: field.path,
          onChange: event => this.props.field.value = event.target.value,
        }, field.options.map(option =>
          h('option', {
            value: option,
            selected: option === field.value
          }, option)
        ))
      ]);
    }
  });

  var TextInput = createClass({
    render: function () {
      var field = this.props.field;
      return h('div', {
        className: 'control'
      }, [
        h('label', {htmlFor: field.path}, field.name),
        h('input', {
          id: field.path,
          type: 'text',
          value: field.value,
          onInput: event => this.props.field.value = event.target.value,
        })
      ]);
    }
  });

  var Checkbox = createClass({
    render: function () {
      var field = this.props.field;
      return h('div', {
        className: 'control'
      }, [
        h('label', {htmlFor: field.path}, field.name),
        h('input', {
          id: field.path,
          type: 'checkbox',
          checked: field.value,
          onInput: event => this.props.field.value = event.target.checked,
        })
      ]);
    }
  });

  var Slider = createClass({
    render: function () {
      var field = this.props.field;
      return h('div', {
        className: 'control'
      }, [
        h('label', {htmlFor: field.path}, field.name),
        h('div', {className: 'control-container'}, [
          h('input', {
            id: field.path,
            type: 'range',
            min: field.min,
            max: field.max,
            step: field.step,
            value: field.value,
            onInput: event => this.props.field.value = parseFloat(event.target.value)
          }),
          h('span', {className: 'control-value'}, field.value.toFixed(4).replace(/\.?0*$/,'')) ])
      ]);
    }
  });

  var Container = createClass({
    getInitialState: function () {
      return {expanded: true};
    },
    toggle: function () {
      this.setState({expanded: !this.state.expanded});
    },
    render: function () {
      if (this.state.expanded) {
        return h('div', {className: 'container'}, [
          h('button', {className: 'control-heading', onClick: this.toggle}, 'Controls ▼'),
          this.props.children
        ]);
      } else {
        return h('div', {className: 'container'}, 
          h('button', {className: 'control-heading', onClick: this.toggle}, 'Controls ▲')
        );
      }
    }
  });

  var Control = createClass({
    render: function () {
      switch (this.props.field.type) {
        case 'checkbox':
          return h(Checkbox, {field: this.props.field});
        case 'textinput':
          return h(TextInput, {field: this.props.field});
        case 'slider':
          return h(Slider, {field: this.props.field});
        case 'select':
          return h(Select, {field: this.props.field});
        case 'section':
          return h(Section, {field: this.props.field});
        default:
          throw new Error('Unknown field type, "' + this.props.field.type + '"');
      }
    }
  });

  var Raw = createClass({
    getRef: function (c) {
      if (!c) return;
      if (!this.props.content) return;
      this.c = c;
      c.appendChild(this.props.content);
    },
    componentWillUnmount () {
      if (!this.c) return;
      this.c.removeChild(this.props.content);
    },
    render: function () {
      return h('div', {ref: this.getRef});
    }
  });

  var App = createClass({
    componentDidMount: function () {
      this.props.state.$field.onChanges(updates => {
        this.setState({foo: Math.random()});
      });
    },
    getRef: function (c) {
      var eventList = ['mousedown', 'mouseup', 'mousemove', 'touchstart', 'touchmove', 'touchend', 'wheel'];
      for (var i = 0; i < eventList.length; i++) {
        c.addEventListener(eventList[i], function (e) {
          e.stopPropagation();
        });
      }
    },
    render: function () {
      var children = Object.keys(this.props.state).map(key =>
        h(Control, {field: this.props.state.$path[key].$field})
      );
      if (this.props.extras) {
        children.push(h(Raw, {content: this.props.extras}));
      }
      return h('div', {
          className: 'control-panel',
          ref: this.getRef,
        }, h(Container, null, h('div', {className: 'controls'}, children)));
    }
  });

	var TRACK_COLOR = '#181818';
  var THUMB_COLOR = '#666'
  var SLIDER_HEIGHT = '22px';

  css(`
    .control-panel {
      background-color: rgba(50, 50, 50, 0.8);
      font-family: sans-serif;
      font-size: 13px;
      font-weight: 200;
      color: white;
      max-width: 350px;
      position: fixed;
      top: 0;
      left: 0;
      z-index: 10;
    }

    .control-panel a {
      color: #cde;
    }

    .control-panel .control-heading {
      background: transparent;
      border: none;
      border-radius: 0;
      outline: none;
      display: block;
      background-color: black;
      color: white;
      width: 100%;
      text-align: left;
      padding: 8px;
      cursor: pointer;
      font-weight: 700;
      font-style: italic;
    }
    .control-panel .control-heading:hover {
      background-color: rgba(30, 30, 30, 0.4);
    }

    .control-panel .controls {
      padding: 8px;
      width: 270px;
    }

    .control-panel p {
      line-height: 1.8;
    }

    .control-panel .control:not(:last-child) {
      margin-bottom: 10px;
    }

    .control-panel label {
      display: inline-block;
      width: 25%;
      line-height: 25px;
    }

    .control input[type="range"] {
      width: 100%;
    }

    .control-panel input,
    .control-panel select {
      margin: .4rem;
    }

    .control-panel legend {
      background-color: #000;
      color: #fff;
      padding: 3px 6px;
    }

    .control-panel fieldset:not(:last-child) {
      margin-bottom: 1.0rem;
    }

    .control-panel .control {
      display: flex;
      flex-direction: row;
    }

    .control-panel .control-container {
      flex: 1;
      position: relative;
      height: ${SLIDER_HEIGHT};
    }

    .control-panel .control-container {
      display: inline-block;
    }

    .control-panel .control-value {
      position: absolute;
      pointer-events: none;
      top: 0;
      z-index: 1;
      line-height: ${SLIDER_HEIGHT};
      right: 10px;
    }

		.control-panel input[type=range] {
			-webkit-appearance: none;
			width: 100%;
			margin: 0px 0;
		}

		.control-panel input[type=range]:focus {
			outline: none;
		}

		.control-panel input[type=range]::-webkit-slider-runnable-track {
			width: 100%;
			height: ${SLIDER_HEIGHT};
			cursor: ew-resize;
			background: ${ TRACK_COLOR };
		}

		.control-panel input[type=range]::-webkit-slider-thumb {
			height: ${SLIDER_HEIGHT};
			width: ${SLIDER_HEIGHT};
			background: ${ THUMB_COLOR };
			cursor: ew-resize;
			-webkit-appearance: none;
			margin-top: 0px;
		}

		.control-panel input[type=range]:focus::-webkit-slider-runnable-track {
			background: ${ TRACK_COLOR };
			outline: none;
		}

		.control-panel input[type=range]::-moz-range-track {
			width: 100%;
			height: ${SLIDER_HEIGHT};
			cursor: ew-resize;
			background: ${ TRACK_COLOR };
		}

		.control-panel input[type=range]::-moz-range-thumb {
			height: ${SLIDER_HEIGHT};
			width: 10px;
			background: ${ THUMB_COLOR };
			cursor: ew-resize;
		}

		.control-panel input[type=range]::-ms-track {
			width: 100%;
			height: ${SLIDER_HEIGHT};
			cursor: ew-resize;
			background: transparent;
			border-color: transparent;
			color: transparent;
		}

		.control-panel input[type=range]::-ms-fill-lower {
			background: ${ TRACK_COLOR };
		}

		.control-panel input[type=range]::-ms-fill-upper {
			background: ${ TRACK_COLOR };
		}

		.control-panel input[type=range]::-ms-thumb {
			width: 10px;
			border-radius: 0px;
			background: ${ THUMB_COLOR };
			cursor: ew-resize;
			height: ${SLIDER_HEIGHT};
		}

		.control-panel input[type=range]:focus::-ms-fill-lower {
			background: ${ TRACK_COLOR };
			outline: none;
		}

		.control-panel input[type=range]:focus::-ms-fill-upper {
			background: ${ TRACK_COLOR };
			outline: none;
		}

		.control-panel input[type=range] {
			-webkit-appearance: none;
			width: 100%;
			margin: 0px 0;
		}

		.control-panel input[type=range]:focus {
			outline: none;
		}

		.control-panel input[type=range]::-webkit-slider-runnable-track {
			width: 100%;
			height: ${SLIDER_HEIGHT};
			cursor: ew-resize;
			background: ${ TRACK_COLOR };
		}
  `);

  render(h(App, {
    state: state,
    extras: extras
  }), document.body);

  return state;
}
