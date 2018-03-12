const assert = require('assert');
const fs = require('fs');
const path = require('path');

const FILETYPE_PRIORITY = {
  idl: 4,
  md: 3,
  html: 2,
  js: 1
};

const getExt = filename => path.extname(filename).replace(/^\./,'').toLowerCase();

module.exports = function (projectDir) {
  assert(projectDir, 'Expected project directory but got ' + projectDir);

  const indexFiles = fs.readdirSync(path.join(__dirname, '..', '..', projectDir))
    .filter(filename => /^index\./.test(filename))
    .sort((a, b) => (FILETYPE_PRIORITY[getExt(b)] || 0) - (FILETYPE_PRIORITY[getExt(a)] || 0));

  assert(indexFiles.length, 'Expected to find index.(idl|md|html|js)');

  return {
    type: getExt(indexFiles[0]),
    name: indexFiles[0]
  }
};
