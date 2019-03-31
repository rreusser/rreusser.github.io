// https://github.com/substack/shared-edge-angle
//
// Copyright (c) 2017 James Halliday
// 
// Redistribution and use in source and binary forms, with or without modification,
// are permitted provided that the following conditions are met:
// 
// Redistributions of source code must retain the above copyright notice, this list
// of conditions and the following disclaimer.
// 
// Redistributions in binary form must reproduce the above copyright notice, this
// list of conditions and the following disclaimer in the documentation and/or
// other materials provided with the distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
// ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
// ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
// SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

var findAngle = require('shared-edge-angle')
var copy = require('gl-vec3/copy')

var A = [[0,0,0],[0,0,0],[0,0,0]]
var B = [[0,0,0],[0,0,0],[0,0,0]]

module.exports = function (wire, mesh, opts) {
  if (!opts) opts = {}
  wire = wire || {};

  var pts = wire.positions = wire.positions || [];
  var npts = wire.nextPositions = wire.nextPositions || [];
  var dirs = wire.directions = wire.directions || [];
  var cells = wire.cells = wire.cells || [];
  var angles = wire.angles = wire.angles || [];

  pts.length = 0;
  npts.length = 0;
  dirs.length = 0;
  cells.length = 0;
  angles.length = 0;

  var vars = opts.attributes ? {} : null
  var vkeys = vars && Object.keys(opts.attributes)
  if (vars) {
    for (var k = 0; k < vkeys.length; k++) {
      vars[vkeys[k]] = []
    }
  }
  var mcells = mesh.cells || []
  var edges = {}
  for (var i = 0; i < mcells.length; i++) {
    var c = mcells[i]
    if (c.length === 3) {
      for (var j = 0; j < 3; j++) {
        var c0 = c[j], c1 = c[(j+1)%3]
        var ek = edgeKey(c0,c1)
        if (edges[ek] === undefined) edges[ek] = [i]
        else edges[ek].push(i)
      }
    } else if (c.length === 2) {
      var c0 = c[0], c1 = c[1]
      var ek = edgeKey(c0,c1)
      if (edges[ek] === undefined) edges[ek] = [i]
      else edges[ek].push(i)
    }
  }
  for (var i = 0; i < mcells.length; i++) {
    var c = mcells[i]
    var len = c.length
    for (var j = 0; j < len; j++) {
      var c0 = c[j], c1 = c[(j+1)%len]
      var ek = edgeKey(c0,c1)
      var e = edges[ek]
      var theta = Math.PI
      var k = pts.length
      if (e.length >= 2) {
        var ce0 = mcells[e[0]]
        var ce1 = mcells[e[1]]
        copy(A[0], mesh.positions[ce0[0]])
        copy(A[1], mesh.positions[ce0[1]])
        copy(A[2], mesh.positions[ce0[2]])
        copy(B[0], mesh.positions[ce1[0]])
        copy(B[1], mesh.positions[ce1[1]])
        copy(B[2], mesh.positions[ce1[2]])
        theta = findAngle(A,B)
      }
      pts.push(mesh.positions[c0], mesh.positions[c0])
      pts.push(mesh.positions[c1], mesh.positions[c1])
      npts.push(pts[k+2],pts[k+3],pts[k],pts[k+1])
      dirs.push(1,-1,1,-1)
      angles.push(theta,theta,theta,theta)
      if (vars) {
        for (var k = 0; k < vkeys.length; k++) {
          var vkey = vkeys[k]
          vars[vkey].push(opts.attributes[vkey][c0[0]])
          vars[vkey].push(opts.attributes[vkey][c0[1]])
          vars[vkey].push(opts.attributes[vkey][c1[0]])
          vars[vkey].push(opts.attributes[vkey][c1[1]])
        }
      }
      cells.push([k,k+1,k+2],[k,k+2,k+3])
    }
  }
  var medges = mesh.edges || []
  for (var i = 0; i < medges.length; i++) {
    var j = pts.length
    var c = medges[i]
    pts.push(mesh.positions[c[0]])
    pts.push(mesh.positions[c[0]])
    pts.push(mesh.positions[c[1]])
    pts.push(mesh.positions[c[1]])
    if (vars) {
      for (var k = 0; k < vkeys.length; k++) {
        var vkey = vkeys[k]
        vars[vkey].push(opts.attributes[vkey][c[0]])
        vars[vkey].push(opts.attributes[vkey][c[0]])
        vars[vkey].push(opts.attributes[vkey][c[1]])
        vars[vkey].push(opts.attributes[vkey][c[1]])
      }
    }
    npts.push(pts[j+2],pts[j+3],pts[j],pts[j+1])
    dirs.push(1,-1,1,-1)
    cells.push([j,j+1,j+2],[j,j+2,j+3])
  }

  window.wire = wire;
  return wire;
}

function edgeKey (a, b) {
  return a < b ? a+','+b : b+','+a
}
