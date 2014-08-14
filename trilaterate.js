(function (exports) {
  var p21 = new THREE.Vector3();
  var p31 = new THREE.Vector3();
  var c = new THREE.Vector3();
  var p31m = new THREE.Vector3();
  var p21m = new THREE.Vector3();
  var p31p21 = new THREE.Vector3();
  var u1 = new THREE.Vector3();
  var v = new THREE.Vector3();

  exports.trilaterate = function (p1, p2, p3, r) {
    var r1 = r,
        r2 = r1,
        r3 = r1;
    p21.subVectors(p2, p1);
    p31.subVectors(p3, p1);
    c.crossVectors(p21, p31);
    var c2 = c.lengthSq();
    p31m.copy(p31).multiplyScalar(p21.lengthSq() + r1*r1 - r2*r2);
    p21m.copy(p21).multiplyScalar(p31.lengthSq() + r1*r1 - r3*r3);
    p31p21.subVectors(p31m, p21m).divideScalar(2);
    u1.crossVectors(p31p21, c).divideScalar(c2);
    v.copy(c).multiplyScalar(Math.sqrt(r1*r1 - u1.lengthSq()) / Math.sqrt(c2));

    var i2 = new THREE.Vector3().addVectors(p1, u1).
      sub(v);

    return i2;
}

})(typeof(exports) != 'undefined' ? exports : window);
