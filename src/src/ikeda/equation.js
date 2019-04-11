var katex = require('katex');
var fs = require('fs');
var css = require('insert-css');
var katexCSS = fs.readFileSync(__dirname + '/../../node_modules/katex/dist/katex.min.css', 'utf8')
module.exports = function (preact) {
  css(katexCSS);

  var h = preact.h;

  return preact.createClass({
    init: function () {
      if (this.props.latex) {
        this.latexHTML = katex.renderToString(this.props.latex);
      }
    },

    componentWillReceiveProps: function (props) {
      if (props.latex && props.latex !== this.props.latex) {
        this.latexHTML = katex.renderToString(props.latex);
      }
    },

    render: function () {
      return h('span', {
        style: this.props.style,
        dangerouslySetInnerHTML: {__html: this.latexHTML}
      }, 'equation');
    }
  });
}
