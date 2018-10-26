'use strict';

var preact = require('preact');
var createClass = require('preact-compat/lib/create-react-class');
var h = preact.h;

module.exports = {
  createClass: function (className) {
    return createClass({
      onInput: function (event) {
        this.props.update(parseFloat(event.nativeEvent.target.value));
      },
      render: function () {
        return h('div', {
          className: className('field'),
        }, [
          h('h3', {
            className: className('heading')
          }, this.props.label),
        ]);
      }
    });
  },
  createCss: function (className, colors) {
    return `
      .${className('heading')} {
        margin: 3px 0;
      }
    `;
  }
};
