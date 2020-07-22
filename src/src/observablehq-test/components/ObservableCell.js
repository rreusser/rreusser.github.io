const getNotebook = require('./notebook-cache');

const React = require('react');

class ObservableCell extends React.Component {
  getRef (component) {
    console.log(this.props);
    this.ref = component;

    var notebook = getNotebook(this.props.notebook, this.props.version);

    notebook.pendingCells[this.props.cell] = {element: this.ref, visible: this.props.visible};

    notebook.loaded.then(() => notebook.initialize());
  }

  render () {
    return <div ref={this.getRef.bind(this)}/>;
  }
}

ObservableCell.defaultProps = {
  visible: true
};

module.exports = ObservableCell;
