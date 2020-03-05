import define from "./index.js";
import {Runtime, Library, Inspector} from "./runtime.js";

const notebookId = '5f7ba4d775a49df0'
const notebookVersion = '213'
const notebookIdentifier = `${notebookId}@${notebookVersion}`

window.observableNotebooks = window.observableNotebooks || {};
var notebook = window.observableNotebooks[notebookIdentifier] = window.observableNotebooks[notebookIdentifier] || {};

const runtime = new Runtime(Object.assign(new Library, {
  width: 640
}));

Object.assign(notebook, {
  runtime: runtime,
  define: define,
  Inspector: Inspector,
  Runtime: Runtime,
  Library: Library
});
