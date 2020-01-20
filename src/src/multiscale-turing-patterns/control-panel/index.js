'use strict';

var preact = require('preact');
var h = preact.h;
var createClass = require('preact-compat/lib/create-react-class');
var css = require('insert-css');

module.exports = function (fields, options) {
  options = options || {};
  var root = options.root || document.body;
  var rootClassName = options.class || 'controlPanel';
	var uuid = Math.random().toString(36).substring(7);
  var state = {};

  function className (str) {
    return `${rootClassName}-${uuid}${str ? `-${str}` : ''}`;
  }

  function createClassName (baseName) {
    return function classNameProxy (str) {
      return className(baseName + (str ? `-${str}` : ''));
    }
  }

  var colors = {
    track: '#222',
    thumb: '#666',
  };

  var fieldTypes = {
    color: require('./fields/color'),
    range: require('./fields/range'),
    heading: require('./fields/heading'),
    select: require('./fields/select'),
    button: require('./fields/button'),
  };

  var fieldNames = Object.keys(fieldTypes);

  fieldNames.forEach(function (fieldName) {
    fieldTypes[fieldName].className = fieldTypes[fieldName].createClass(
      createClassName(fieldName)
    );
  });

  css(`
    .${className()} {
      position: absolute;
      top: 0;
      left: 0;
      background-color: #444;
      color: #ccc;
      padding: 8px;
      font-family: sans-serif;
      font-size: 12px;
      width: 200px;
    }
    ${Object.keys(fieldTypes).map(function (fieldName) {
      return fieldTypes[fieldName].createCss(
        createClassName(fieldName),
        colors
      );
    }).join('\n')}
  `);

  var setState;

  function renderField (field, index) {
    if (state[field.name] === undefined) {
      state[field.name] = field.initial;
    }
    return h(fieldTypes[field.type].className, Object.assign({
      value: state[field.name],
      update: value => this.setField(field.name, value),
    }, field));
  }

  var controlPanel = createClass({
    componentDidMount: function () {
      setState = () => this.setState({counter: this.state.counter + 1});
    },
    getRef: function (el) {
      this._el = el;
      ['click', 'mousedown', 'mouseup', 'mousemove', 'touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach((eventName) => {
        this._el.addEventListener(eventName, event => event.stopPropagation());
      });
    },
    getInitialState: function () {
      return {counter: 0};
    },
    setField: function (name, value) {
      state[name] = value;
      options && options.onInput(state);
      this.setState({counter: this.state.counter + 1});
    },
    render: function () {
      return h('div',
        {className: className(), ref: this.getRef},
        fields.map(renderField.bind(this))
      );
    }
  });

  preact.render(
    h(controlPanel),
    root
  );

  function update (values) {
    Object.assign(state, values);
    setState();
  }

  return {
    root: root,
    state: state,
    update: update
  }
}
