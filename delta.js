var scene = new THREE.Scene();

//var renderer = new THREE.CanvasRenderer();
var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

var towerRadius = 8;
var towerHeight = 600;

function zCylinderGeometry(radius, length, facets) {
  var geometry = new THREE.CylinderGeometry(radius, radius, length, facets || 8);

  geometry.applyMatrix(new THREE.Matrix4()
    .makeRotationFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))
    .setPosition(new THREE.Vector3(0, 0, length / 2))
  );

  return geometry;
}

function tower() {
  return new THREE.Mesh(
    zCylinderGeometry(towerRadius, towerHeight),
    new THREE.MeshLambertMaterial({color: 0x00ff00, wireframe:false}));
}

var towerDistance = 100;

var towerPositions = [];
for (var n=0; n<3; n++) {
  var angle = n * 2 * Math.PI / 3;
  towerPositions.push(new THREE.Vector2(
    towerDistance * Math.cos(angle),
    towerDistance * Math.sin(angle)
  ));
}

towerPositions.forEach(function (pos) {
  var aTower = tower();

  aTower.position.set(pos.x, pos.y, 0);
  scene.add(aTower);
});

var bedRadius = 85;
var bedThickness = 5;

scene.add(function() {
  var geometry = zCylinderGeometry(bedRadius, bedThickness, 32);
  var bed = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({color: 0xddddff}));
  bed.position.z = -bedThickness;
  return bed;
}());

var pushRodRadius = 3;
var pushRodLength = 214;

function pushRod() {
  return new THREE.Mesh(
    zCylinderGeometry(pushRodRadius, pushRodLength),
    new THREE.MeshLambertMaterial({color: 0xff0000}));
}

var pushRods = [];

towerPositions.forEach(function (pos) {
  var push = pushRod();

  pushRods.push(push);

  push.position.set(pos.x * 0.9, pos.y * 0.9, towerHeight / 2);

  scene.add(push);
});

var light = new THREE.PointLight( 0xffffff );
light.position.set( 500, -500, 500 );
scene.add( light );

scene.add( new THREE.AmbientLight( 0x404040 ) );

var camera = new THREE.PerspectiveCamera(75,
                                         window.innerWidth/window.innerHeight,
                                         1, 2000);

camera.up = new THREE.Vector3(0, 0, 1);
camera.position.x = 200;
camera.position.y = -400;
camera.position.z = 400;

var controls = new THREE.TrackballControls( camera, renderer.domElement );

controls.rotateSpeed = 1.0;
controls.zoomSpeed = 1.2;
controls.panSpeed = 0.8;

controls.noZoom = false;
controls.noPan = false;

controls.staticMoving = true;
controls.dynamicDampingFactor = 0.3;

controls.target.set(0, 0, 300);

var time = 0;

var headHeight = 30;

function makeHead() {
  return new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1),
                               new THREE.Vector3(0,0,0),
                               headHeight);
}

var head = makeHead();
scene.add(head);

var lineGeo = new THREE.Geometry();
var lineMaterial = new THREE.LineBasicMaterial({vertexColors:false});
var line = new THREE.Line(lineGeo, lineMaterial);
scene.add(line);


function moveCarriages() {
  pushRods.forEach(function (push, i) {
    push.position.z = 250 + i + 30*Math.cos(time*i*i + 9*i) + time;
  });
  var headPos = trilaterate(pushRods[0].position,
                            pushRods[1].position,
                            pushRods[2].position,
                            pushRodLength);
  head.position.copy(headPos);

  scene.remove(line);
  line.geometry.dispose();

  var geom2 = new THREE.Geometry();
  geom2.vertices = line.geometry.vertices;
  geom2.vertices.push(new THREE.Vector3(headPos.x, headPos.y, headPos.z - headHeight));
  scene.add(line = new THREE.Line(geom2, lineMaterial));

  pushRods.forEach(function (push) {
    push.lookAt(headPos);
  });
}

var render = function () {
  requestAnimationFrame(render);

  moveCarriages();

  renderer.render(scene, camera);
  controls.update();

  time += 0.1;
};

render();
