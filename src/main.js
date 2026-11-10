import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCamp } from './world/camp.js';
import { createMountains } from './world/mountains.js';
import { createRocks } from './world/rocks.js';
import { createAtmosphere, createSky } from './world/sky.js';
import { createTerrain } from './world/terrain.js';
import { createTrees } from './world/trees.js';
import { createWater } from './world/water.js';

// ---------------------------------------------------------------------------
// Renderer, escena, cámara
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 600);
camera.position.set(3, 6.5, 40);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 8, -10);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 20;
controls.maxDistance = 75;
controls.minPolarAngle = Math.PI * 0.3;
controls.maxPolarAngle = Math.PI * 0.52;
controls.minAzimuthAngle = -0.7;
controls.maxAzimuthAngle = 0.7;
controls.update();

// ---------------------------------------------------------------------------
// Mundo
// OJO: todos los módulos comparten un RNG con semilla, así que el ORDEN de
// estas llamadas define la escena. Añade lo nuevo al final para no alterarla.
// ---------------------------------------------------------------------------
createAtmosphere(scene);
createTerrain(scene);
const water = createWater(scene);
createMountains(scene);
createTrees(scene);
createRocks(scene);
const camp = createCamp(scene);
const sky = createSky(scene);

// ---------------------------------------------------------------------------
// Animación
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
function animate() {
  const t = clock.getElapsedTime();

  camp.update(t);
  water.update(t);
  sky.update();

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
