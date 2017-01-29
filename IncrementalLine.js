var IncrementalLine = function (maxVertices, material) {
  var geometry = new THREE.BufferGeometry();

  var positionsAttr = new THREE.BufferAttribute( new Float32Array( maxVertices * 3 ), 3 );
  geometry.addAttribute( 'position', positionsAttr );

  var indicesAttr = new THREE.BufferAttribute( new Uint32Array( maxVertices * 2 ), 2 );
  geometry.setIndex( indicesAttr );

  if (material.vertexColors === THREE.VertexColors) {
    var colorsAttr = new THREE.BufferAttribute( new Float32Array( maxVertices * 3), 3 );
    geometry.addAttribute( 'color', colorsAttr );

    this.color = new THREE.Color(1, 1, 1);
  }

  geometry.addGroup(0, 0);

  this.vertexCount = 0;
  this.pieceCount = 0;

  this.addVertex = function (x, y, z, draw) {
    positionsAttr.setXYZ(this.vertexCount, x, y, z);
    positionsAttr.needsUpdate = true;

    if (material.vertexColors === THREE.VertexColors) {
      colorsAttr.setXYZ(this.vertexCount, this.color.r, this.color.g, this.color.b);
      colorsAttr.needsUpdate = true;
    }

    if(draw && this.vertexCount > 0) {
      indicesAttr.setXY(this.pieceCount++, this.vertexCount-1, this.vertexCount);
      indicesAttr.needsUpdate = true;
      geometry.groups[0].count = this.pieceCount * 2;
    }

    this.vertexCount++;
  }

  this.lineTo = function (x, y, z) {
    this.addVertex(x, y, z, true);
  };

  this.moveTo = function (x, y, z) {
    this.addVertex(x, y, z, false);
  };

  THREE.LineSegments.call(this, geometry, material);
};

IncrementalLine.prototype = Object.create(THREE.LineSegments.prototype);

