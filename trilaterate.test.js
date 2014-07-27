var assert = require('assert');
assert.almostEqual = function (actual, expected, message) {
  if (Math.abs(actual - expected) > 0.0001)
    assert.fail(actual, expected, message, '~=', assert.almostEqual);
};

global.self = {};
global.THREE = require('./three.min.js');
var trilaterate = require('./trilaterate.js').trilaterate;

function V(x, y, z) { return new THREE.Vector3(x, y, z); }

var result = trilaterate(V(1, 0, 0), V(0, 1, 0), V(0, 0, 1), 1);

assert.almostEqual(result.x, 0);
assert.almostEqual(result.y, 0);
assert.almostEqual(result.z, 0);
