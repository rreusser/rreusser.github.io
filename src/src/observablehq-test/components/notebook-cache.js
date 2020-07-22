function createNotebook (identifier) {
  const script = document.createElement('script');
  script.src = './static/loader.js';
  script.type = 'module';

  document.body.appendChild(script);

  var initialized = false;
  function initialize () {
    if (initialized) return;

    var o = window.observableNotebooks[identifier];
    console.log(o.define);
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

module.exports = getNotebook;
