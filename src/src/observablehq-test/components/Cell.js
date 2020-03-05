const React = require('react');

function createNotebook (identifier) {
  const script = document.createElement('script');
  script.src = './static/loader.js';
  script.type = 'module';

  document.body.appendChild(script);

  var initialized = false;
  function initialize () {
    if (initialized) return;

    var o = window.observableNotebooks[identifier];
    o.main = o.runtime.module(o.define, name => {
      var cell = state.pendingCells[name];
      if (!cell) return;
      var element = cell.visible ? cell.element : document.createElement('div');
      return new o.Inspector(element);
    });
    initialized = true;
    return state;
  }

  var state = {
    pendingCells: {},
    loaded: new Promise((resolve, reject) => script.onload = () => resolve(state)),
    initialize: initialize,
  };
  return state;
}

var states = {};
function getNotebook (notebookId, version) {
  var identifier = `${notebookId}@${version}`
  if (!states[identifier]) {
    states[identifier] = createNotebook(identifier);
  }
  return states[identifier];
}

class ObservableNotebookCell extends React.Component {
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

ObservableNotebookCell.defaultProps = {
  visible: true
};

module.exports = ObservableNotebookCell;
