THREE.Object3D.DefaultUp = new THREE.Vector3(0, 0, 1);

var scene = new THREE.Scene();

var renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setClearColor(0xffffff);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

var partMaterial = new THREE.MeshLambertMaterial({color: 0x7777ff,
  transparent: true,
  opacity: 0.9
});
var rodMaterial = new THREE.MeshPhongMaterial({color: 0x222222,
  shininess: 100});
var bedMaterial = new THREE.MeshPhongMaterial({
  color: 0xffffff,
  specular: 0xeeeeff,
  shininess: 10,
  transparent: true,
  opacity: 0.8
});
var lineMaterial = new THREE.LineBasicMaterial({vertexColors:THREE.VertexColors});
var metalMaterial = new THREE.MeshPhongMaterial( {
  color: 0xdddddd,
  specular: 0x999999,
  shininess: 30,
  shading: THREE.SmoothShading
} );

var towerRadius = 8;
var towerHeight = 600;
var pushRodRadius = 3;
var pushRodLength = 214;
var rodSeparation = 23;
var effectorOffset = 20;

var bedRadius = 85;
var bedThickness = 4;
var bedHeight = 50;

var towerDistance = 116;

function zCylinderGeometry(radius, length, facets) {
  var geometry = new THREE.CylinderGeometry(radius, radius, length, facets || 8);

  geometry.applyMatrix(new THREE.Matrix4()
    .makeRotationFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))
    .setPosition(new THREE.Vector3(0, 0, length / 2))
  );

  return geometry;
}

var towerAngles = [0,1,2].map(function (n) {
  return n * 2 * Math.PI / 3;
});

var towerDirections = towerAngles.map(function (angle) {
  return new THREE.Vector2( Math.cos(angle), Math.sin(angle) );
});

var towerPositions = towerDirections.map(function (dir) {
  return dir.clone().multiplyScalar(towerDistance);
});

var bed = function() {
  var geometry = zCylinderGeometry(bedRadius, bedThickness, 64);
  var bed = new THREE.Mesh(geometry, bedMaterial);
  bed.position.z = -bedThickness;
  return bed;
}();

scene.add(bed);

var rodEnd = new THREE.Mesh(
  new THREE.SphereGeometry(pushRodRadius * 1.2, 16, 16),
  metalMaterial
);

function pushRod() {
  var rod = new THREE.Object3D();
  rod.add(new THREE.Mesh(
    zCylinderGeometry(pushRodRadius, pushRodLength),
    rodMaterial));
  rod.add(rodEnd.clone());
  rod.add(function(end) { end.position.z = pushRodLength; return end; }(rodEnd.clone()));
  return rod;
}

var pushRods = towerDirections.map(function (dir) {
  var push = pushRod();

  push.offset = new THREE.Vector3(-dir.y, dir.x, 0).multiplyScalar(rodSeparation);

  scene.add(push);

  scene.add(push.other = pushRod());

  return push;
});

var carriages = towerDirections.map(function (dir, i) {
  var carriage = new THREE.Object3D();
  carriage.position.set(dir.x, dir.y, 0).multiplyScalar(towerDistance + effectorOffset);
  carriage.rotation.z = towerAngles[i];
  return carriage;
});

scene.add.apply(scene, carriages);

var light = new THREE.PointLight( 0xffffff );
light.position.set( 500, -500, 500 );
scene.add( light );

scene.add( new THREE.AmbientLight( 0x101010 ) );

var camera = new THREE.PerspectiveCamera(75,
                                         window.innerWidth/window.innerHeight,
                                         10, 2000);

camera.position.x = 150;
camera.position.y = -150;
camera.position.z = 200;

var controls = new THREE.OrbitControls( camera, renderer.domElement );

controls.enableZoom = true;
controls.zoomSpeed = 1.0;

controls.enableRotate = true;
controls.rotateSpeed = 1.0;

controls.enablePan = true;
controls.keyPanSpeed = 7.0;

//controls.autoRotate = true;
controls.autoRotateSpeed = 1.0;

controls.enableDamping = true;
controls.dampingFactor = 0.25;

controls.target.set(0, 0, 50);

var time = 0;

var headHeight = 62;
var hotendZOffset = 5;

var head = new THREE.Object3D();
scene.add(head);

var line = new IncrementalLine(1000000, lineMaterial);
scene.add(line);

var gcode = '';

var gcodeLines = [];
var currentGcodeLine = 0;

function cart2delta(v) {
  var dt = new THREE.Vector2();
  return towerPositions.map(function (p) {
    dt.subVectors(p, v);

    return new THREE.Vector3().set(p.x, p.y, Math.sqrt( pushRodLength * pushRodLength - dt.lengthSq()  ) + v.z + headHeight);
  });
}

function addVertex(v, draw) {
  line.addVertex(v.x, v.y, v.z, draw);
}

var cartesianTarget = new THREE.Vector3();

function splitGcode(gcodeLine) {
  var result = {};

  gcodeLine.replace(/([A-Z])([-0-9.]+)/g, function(lettervalue, letter, value) {
    result[letter] = parseFloat(value);
    return '';
  });

  return result;
}

var gcodeColors = {
  // Cura-style comments
  'TYPE:FILL': 0x0000dd,
  'TYPE:WALL-OUTER': 0x00aa00,
  'TYPE:WALL-INNER': 0x00ff00,
  'TYPE:SKIRT': 0xcc0000,
  // Slic3r-style comments
  'skirt': 0xcc0000,
  'brim': 0xcc00cc,
  'support material': 0x0000cc,
};

var orienter = new THREE.Object3D();
var middle = new THREE.Vector3();

function moveCarriages() {
  if(currentGcodeLine >= gcodeLines.length)
    return;
  gcodeLine = gcodeLines[currentGcodeLine];
  codes = splitGcode(gcodeLine);

  if(gcodeLine.match(/;\s*(.*)/)) {
    line.color.set(gcodeColors[RegExp.$1] || 0xffffff);
  }

  if(codes.G <= 1) {
    if(codes.X) cartesianTarget.x = codes.X;
    if(codes.Y) cartesianTarget.y = codes.Y;
    if(codes.Z) cartesianTarget.z = codes.Z;

    var deltaPositions = cart2delta(cartesianTarget);

    var headPos = trilaterate(deltaPositions[0],
                              deltaPositions[1],
                              deltaPositions[2],
                              pushRodLength);
    head.position.copy(headPos);

    deltaPositions.forEach(function (pos, i) {
      carriages[i].position.z = pos.z;
    });

    pushRods.forEach(function (rod, i) {
      orienter.position.copy(deltaPositions[i]);
      orienter.lookAt(headPos);
      middle.copy(towerDirections[i])
        .multiplyScalar(towerDistance + effectorOffset)
        .setZ(deltaPositions[i].z);
      rod.rotation.copy(orienter.rotation);
      rod.position.copy(middle).add(rod.offset);
      rod.other.position.copy(middle).sub(rod.offset);
      rod.other.rotation.copy(orienter.rotation);
    });

    line.addVertex(headPos.x, headPos.y, headPos.z - headHeight, codes.E);
  }
  
  currentGcodeLine++;
}

var render = function () {
  requestAnimationFrame(render);

  for(var i=0;i<5;i++)
    moveCarriages();

  renderer.render(scene, camera);
  controls.update();

  time += 0.1;
};

function loadGcode(path) {
  var loader = new THREE.FileLoader();
  loader.load(path, function (text) {
    gcodeLines = text.split('\n');
    console.log("loaded " + gcodeLines.length + " lines");
    render();
  });
}

loadGcode('logo_ut7.gcode');

function loadStl(name, fn) {
  var loader = new THREE.STLLoader();
  loader.load( 'kossel/' + name + '.stl', fn);
}

loadStl('effector', function(effectorGeometry) {
  effectorGeometry.computeBoundingBox();
  effectorGeometry.applyMatrix(new THREE.Matrix4()
    .makeRotationFromEuler(new THREE.Euler(Math.PI, 0, Math.PI / 2))
    .setPosition(new THREE.Vector3(0, 0, effectorGeometry.boundingBox.getCenter().z))
  );

  var effector = new THREE.Mesh(effectorGeometry, partMaterial);

  head.add(effector);
});

loadStl('E3D_V6_1.75mm_Universal_HotEnd_Mockup', function(hotendGeometry) {
  hotendGeometry.computeBoundingBox();
  hotendGeometry.applyMatrix(new THREE.Matrix4()
    .makeRotationFromEuler(new THREE.Euler(Math.PI/2, 0, 0))
    .setPosition(new THREE.Vector3(0, 0, hotendGeometry.boundingBox.min.x - hotendZOffset))
  );

  var hotend = new THREE.Mesh(hotendGeometry, metalMaterial);

  head.add(hotend);
});

loadStl('carriage', function(geometry) {
  geometry.applyMatrix(new THREE.Matrix4()
    .makeRotationFromEuler(new THREE.Euler(Math.PI / 2, 0, -Math.PI / 2, 'ZXY'))
    .setPosition(new THREE.Vector3(7, 0, -16))
  );

  carriages.forEach(function (carriage) {
    carriage.add(new THREE.Mesh(geometry, partMaterial));
  });
});

loadStl('frame_top', function(topVertexGeometry) {
  loadStl('frame_motor', function(bottomVertexGeometry) {
    loadStl('openbeam', function(beamGeometry) {
      var towers = towerDirections.map(function (dir, i) {
        var tower = new THREE.Object3D();

        var verticalBeam = new THREE.Mesh(beamGeometry, metalMaterial);
        verticalBeam.scale.z = towerHeight;

        var horizontalBeams = new THREE.Object3D();
        horizontalBeams.position.x = 19.5;
        horizontalBeams.position.y = 1.5;

        var horizontalBeam = new THREE.Mesh(beamGeometry, metalMaterial);
        horizontalBeam.scale.z = 240;
        horizontalBeam.rotation.set(Math.PI / 2, 0, 5 * Math.PI / 6, 'ZXY');

        horizontalBeam.position.z = 7.5;

        var horizontalBeam2 = horizontalBeam.clone();
        horizontalBeam2.position.z = 37.5;

        var horizontalBeam3 = horizontalBeam.clone();
        horizontalBeam3.position.z = towerHeight - 7.5;

        horizontalBeams.add(horizontalBeam);
        horizontalBeams.add(horizontalBeam2);
        horizontalBeams.add(horizontalBeam3);

        var bottomVertex = new THREE.Mesh(bottomVertexGeometry, partMaterial);

        var topVertex = new THREE.Mesh(topVertexGeometry, partMaterial);
        topVertex.position.z = towerHeight - 15;

        tower.add(verticalBeam);
        tower.add(bottomVertex);
        tower.add(topVertex);
        tower.add(horizontalBeams);

        tower.rotation.z = towerAngles[i] + Math.PI / 2;
        tower.position.set(dir.x, dir.y, 0)
          .multiplyScalar(towerDistance + effectorOffset + 15)
          .setZ(-bedHeight);

        return tower;
      });

      scene.add.apply(scene, towers);
    });
  });
});
