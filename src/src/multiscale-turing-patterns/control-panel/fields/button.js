'use strict';

var preact = require('preact');
var createClass = require('preact-compat/lib/create-react-class');
var h = preact.h;

module.exports = {
  createClass: function (className) {
    return createClass({
      render: function () {
        return h('div', {
          className: className('field'),
        }, [
          h('button', {
            onClick: this.props.action,
            className: className('button')
          }, this.props.label || this.props.name),
        ]);
      }
    });
  },
  createCss: function (className, colors) {
    console.log('colors:', colors);
    return `
      .${className('button')} {
        margin: 3px 0 3px 30%;
        width: 70%;
        display: block;
        border: 0;
        background-color: ${colors.track};
        color: white;
        padding: 3px;
      }
    `;
  }
};
