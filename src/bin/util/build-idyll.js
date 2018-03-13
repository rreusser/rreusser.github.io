var path = require('path');
var Idyll = require('idyll');

var baseDir = path.join(__dirname, 'src', 'schwarzschild');

var idyll = Idyll({
  inputFile: path.join(baseDir, 'index.idl'),
  output: path.join(baseDir, 'build'),
  htmlTemplate: path.join(baseDir, '_index.html'),
  components: path.join(baseDir, 'components'),
  datasets: path.join(baseDir, 'data'),
  layout: 'centered',
  css: path.join(baseDir, 'styles.css'),
  compilerOptions: {
    spellcheck: false
  },
  minify: false
});

idyll.build()

