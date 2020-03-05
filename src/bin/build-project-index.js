#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const getEntryFile = require('./util/get-entry-file');
const assert = require('assert');
const browserify = require('browserify');
const brfs = require('brfs');

const projectsRoot = path.join(__dirname, '..', 'src');
const ignorePattern = /(\.DS_Store|sketches|projects|about|books)/;
const projectDirListing = fs.readdirSync(projectsRoot).filter(path => !ignorePattern.test(path));

const projectsSrcPath = path.join(projectsRoot, 'sketches');
const thumbnailsPath = path.join(projectsSrcPath, 'static');

var projects = [];

projectDirListing.map(function (projectPath) {
  const projectRoot = path.join(projectsRoot, projectPath);
  var metaPath = path.join(projectRoot, 'metadata.json');

  if (!fs.existsSync(metaPath)) {
    return;
  } else {
    process.stderr.write('Processing project in "' + projectPath + '"\n');
  }

  var thumbnailFilename = fs.readdirSync(projectRoot).filter(filename => {
    return /^thumbnail\.(png|gif|jpe?g$)/i.test(filename);
  })[0];

  var meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  var projectMetadata = {
    id: projectPath,
    path: '../' + projectPath + '/',
    title: meta.title,
    order: meta.order,
    description: meta.description || meta.title,
  };

  if (thumbnailFilename) {
    const thumbnailPath = path.join(projectRoot, thumbnailFilename);
    const thumbnailOutputFilename = projectPath + '-' + thumbnailFilename
    const thumbnailOutputPath = path.join(thumbnailsPath, thumbnailOutputFilename);
    fs.createReadStream(thumbnailPath).pipe(fs.createWriteStream(thumbnailOutputPath));
    projectMetadata.thumbnailPath = path.join('static', thumbnailOutputFilename);
  }

  projects.push(projectMetadata);
});

projects = projects.sort(function (a, b) {
  return b.order - a.order;
  //var aDate = a.createdAt ? Date.parse(a.createdAt) : 0;
  //var bDate = b.createdAt ? Date.parse(b.createdAt) : 0;
  //return aDate - bDate;
});

process.stdout.write(JSON.stringify(projects));

function buildNav () {
  var b = browserify('lib/nav.js')
    .transform(brfs)
    .bundle()
    .pipe(fs.createWriteStream(path.join(__dirname, '../../nav.bundle.js')));
}

buildNav();
