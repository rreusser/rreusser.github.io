'use strict';

var preact = require('preact');
var createClass = require('preact-compat/lib/create-react-class');
var h = preact.h;

function format (value, digits) {
  if (value === 0) return 0;
  var displayValue = Math.max(Math.abs(value), 1e-16);
  var digits = 3;
  var value10 = Math.log10(displayValue);
  var pow10 = Math.round(value10);
  var fixed = Math.max(0, digits - pow10);
  var str = value.toFixed(fixed);
  str = str.replace(/\.([0-9]*[1-9]+)0*$/, '.$1');
  str = str.replace(/\.0*$/, '');
  return str;
}

module.exports = {
  createClass: function (className) {
    return createClass({
      onInput: function (event) {
        this.props.update(parseFloat(event.nativeEvent.target.value));
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
                `${format(this.props.value, 3)}`
              )
            ]),
            h('input', {
              className: className('input'),
              id: className('input'),
              type: 'range',
              min: this.props.min,
              max: this.props.max,
              step: this.props.step,
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
        width: 70%;
        display: block;
      }
      .${className('input')}:focus {
        outline: none;
      }
      .${className('input')}::-webkit-slider-runnable-track {
        width: 100%;
        height: 20px;
        cursor: ew-resize;
        background: ${colors.track};
      }
      .${className('input')}::-webkit-slider-thumb {
        height: 20px;
        width: 20px;
        background: ${colors.thumb};
        cursor: ew-resize;
        -webkit-appearance: none;
        margin-top: 0px;
      }
      .${className('input')}:focus::-webkit-slider-runnable-track {
        background: ${colors.track};
        outline: none;
      }
      .${className('input')}::-moz-range-track {
        width: 100%;
        height: 20px;
        cursor: ew-resize;
        background: ${colors.track};
      }
      .${className('input')}::-moz-range-thumb {
        border: 0px solid rgba(0, 0, 0, 0);
        height: 20px;
        width: 20px;
        border-radius: 0px;
        background: ${colors.thumb};
        cursor: ew-resize;
      }
      .${className('input')}::-ms-track {
        width: 100%;
        height: 20px;
        cursor: ew-resize;
        background: transparent;
        border-color: transparent;
        color: transparent;
      }
      .${className('input')}::-ms-fill-lower {
        background: ${colors.track};
      }
      .${className('input')}::-ms-fill-upper {
        background: ${colors.track};
      }
      .${className('input')}::-ms-thumb {
        width: 20px;
        border-radius: 0px;
        background: ${colors.thumb};
        cursor: ew-resize;
        height: 20px;
      }
      .${className('input')}:focus::-ms-fill-lower {
        background: ${colors.track};
        outline: none;
      }
      .${className('input')}:focus::-ms-fill-upper {
        background: ${colors.track};
        outline: none;
      }
    `;
  }
};
