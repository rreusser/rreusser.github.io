'use strict';

var preact = require('preact');
var createClass = require('preact-compat/lib/create-react-class');
var h = preact.h;

module.exports = {
  createClass: function (className) {
    return createClass({
      onInput: function (event) {
        this.props.update(event.nativeEvent.target.value);
      },
      render: function () {
        var label = this.props.label || this.props.name;
        return h('div', {
          className: className('field'),
        }, [
          h('div', {className: className('container')}, [
            h('label', {
              className: className('label'),
              htmlFor: className('input'),
            }, [
              h('span', {className: className('label-prefix')}, label),
              h('span',
                {className: className('label-value')},
                this.props.value,
              )
            ]),
            h('input', {
              className: className('input'),
              id: className('input'),
              type: 'color',
              value: this.props.value,
              onInput: this.onInput
            })
          ])
        ]);
      }
    });
  },
  createCss: function (className, colors) {
    return `
      .${className('container')} {
        position: relative;
      }
      .${className('label')} {
        pointer-events: none;
        position: absolute;
        line-height: 20px;
        top: 0;
        right: 5px;
        bottom: 0;
        left: 5px;
        display: flex;
        flex-direction: row;
      }
      .${className('label-prefix')} {
        flex: 1;
      }
      .${className('label-suffix')} {
      }
      .${className('input')} {
        -webkit-appearance: none;
        margin: 3px 0 3px 30%;
        width: 20px;
        height: 20px;
        display: block;
        padding: 0;
      }
      .${className('input')}:focus {
        outline: none;
      }
      .${className('input')}::-webkit-color-swatch-wrapper {
        padding: 0;
      }
    `;
  }
};
