const React = require('react');
const getNotebook = require('./notebook-cache');


class ObservableOutput extends React.Component {
  getRef (component) {
    console.log(this.props);
    this.ref = component;

    var notebook = getNotebook(this.props.notebook, this.props.version);

    notebook.pendingCells[this.props.cell] = {};

    notebook.loaded.then(() => notebook.initialize());
  }

  render () {
    return <span/>;
  }
}

ObservableOutput.defaultProps = {
  visible: true
};

module.exports = ObservableOutput;
