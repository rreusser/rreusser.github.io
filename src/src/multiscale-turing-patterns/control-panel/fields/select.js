'use strict';

var preact = require('preact');
var createClass = require('preact-compat/lib/create-react-class');
var h = preact.h;

module.exports = {
  createClass: function (className) {
    return createClass({
      onChange: function (event) {
        console.log(event.nativeEvent.target.value);
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
            }, label),
            h('select', {
              className: className('input'),
              id: className('input'),
              type: 'range',
              onChange: this.onChange,
              value: this.props.value,
            }, this.props.options.map((option, i) => 
              h('option', {value: option}, option)
            ))
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
        margin: 3px 0 3px 30%;
        width: 70%;
        display: inline-block;
        line-height: 20px;
        vertical-align: middle;

				-webkit-appearance: none;
				-moz-appearance: none;
				-o-appearance:none;
				appearance:none;


        background-color: ${colors.track};
        border: none;
        color: white;
        padding: 0 5px;
        border-radius: 0;
      }
      .${className('input')}:focus {
        outline: none;
      }
    `;
  }
};
