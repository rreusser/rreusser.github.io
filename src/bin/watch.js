#!/usr/bin/env node

const getEntryFile = require('./util/get-entry-file');
const hyperstream = require('hyperstream');
const glslify = require('glslify');
const es2040 = require('es2040');
const assert = require('assert');
const mkdirp = require('mkdirp');
const Idyll = require('idyll');
const path = require('path');
const budo = require('budo');
const brfs = require('brfs');
const rmrf = require('rimraf');
const fs = require('fs');
const cp = require('cp');

var projectDir = process.argv[2];
if (!/^src\//.test(projectDir)) projectDir = path.join('src', projectDir);
const entryFile = getEntryFile(projectDir);

const port = process.env.port || 9966;
const host = process.env.host || 'localhost';

switch (entryFile.type) {
  case 'idl':
    console.log('Serving as Idyll');

    // Check for html template:
    var templatePath = path.join(__dirname, '..', projectDir, '_index.html');
    if (!fs.existsSync(templatePath)) {
      templatePath = path.join(__dirname, '..', 'templates', '_index.html');
    }

    console.log('templatePath:', templatePath);

    const outputDir = path.join(__dirname, '..', projectDir.replace(/^src\//, 'build/'));
    rmrf.sync(outputDir);
    mkdirp.sync(outputDir);

    cp.sync(path.join(__dirname, '..', 'lib', 'css', 'styles.css'), path.join(outputDir, 'styles.css'));
    cp.sync(path.join(__dirname, '..', 'lib', 'css', 'styles.css'), path.join(outputDir, '..', 'styles.css'));
    console.log(path.join(__dirname, '..', 'lib', 'css', 'styles.css'), path.join(outputDir, 'styles.css'));

    const idyll = Idyll({
      inputFile: path.join(__dirname, '..', projectDir, entryFile.name),
      defaultComponents: path.join(__dirname, '..', 'lib', 'default-idyll-components'),
      components: path.join(__dirname, '..', projectDir, 'components'),
      static: path.join(__dirname, '..', projectDir, 'static'),
      output: outputDir,
      template: templatePath,
      outputJS: '../index.js',
      port: port,
      watch: true,
      minify: false,
      ssr: true,
      theme: 'none',
      layout: 'none',
      transform: ['glslify']
    });

    idyll.build();
 
    break;
  case 'html':
    console.log('Serving as raw HTML');

    budo(null, {
      dir: path.join(__dirname, '..', projectDir),
      live: true,
      open: true,
      host: host,
      port: port,
      stream: process.stdout,
    });
    break;

  case 'js':
    console.log('Serving as JavaScript');
    var hasCss = fs.existsSync(path.join(__dirname, '..', projectDir, 'index.css'));
    budo(path.join(__dirname, '..', projectDir, entryFile.name), {
      dir: path.join(__dirname, '..', projectDir),
      live: true,
      open: true,
      //host: host,
      port: port,
      css: hasCss ? 'index.css' : null,
      stream: process.stdout,
      browserify: {
        transform: [
          glslify,
          es2040,
          brfs
        ]
      }
    });
    break;

  case 'md':
    console.log('Serving as Markdown');
    throw new Error('Markdown serving not yet implemented');
    break;

  default:
    assert(entryFile.type, 'Unknown filetype for file "' + entryFile.name + '"');
}
