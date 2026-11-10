import * as THREE from 'three';
import { PLAYER } from './config.js';
import { createGame } from './game/game.js';
import { createFollowCamera } from './player/camera.js';
import { createInput } from './player/input.js';
import { createPlayer } from './player/player.js';
import { createCamp } from './world/camp.js';
import { createMountains } from './world/mountains.js';
import { createParty } from './world/party.js';
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

// ---------------------------------------------------------------------------
// Mundo
// OJO: todos los módulos comparten un RNG con semilla, así que el ORDEN de
// estas llamadas define la escena. Añade lo nuevo al final para no alterarla.
// ---------------------------------------------------------------------------
createAtmosphere(scene);
const terrain = createTerrain(scene);
const water = createWater(scene);
createMountains(scene);
const trees = createTrees(scene);
createRocks(scene);
const camp = createCamp(scene);
const sky = createSky(scene);
const party = createParty(scene);

// Jugador (después del mundo: así no altera la escena generada)
const input = createInput();
const player = createPlayer(scene, terrain, spawnPoint());
const followCamera = createFollowCamera(camera, renderer.domElement, player.position);
const game = createGame(scene, { player, input, party, trees });

/**
 * Punto de inicio. Para pruebas se puede pasar en la URL: `?spawn=x,z`.
 * @returns {{ x: number, z: number }}
 */
function spawnPoint() {
  const raw = new URLSearchParams(location.search).get('spawn');
  const [x, z] = raw ? raw.split(',').map(Number) : [];
  return Number.isFinite(x) && Number.isFinite(z) ? { x, z } : PLAYER.start;
}

// ---------------------------------------------------------------------------
// Animación
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
function animate() {
  // dt acotado: si la pestaña estuvo en segundo plano no hay saltos bruscos
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  input.update();
  player.update(dt, t, input, camera);
  followCamera.update();
  game.update(dt, t);

  camp.update(t);
  water.update(t);
  sky.update();
  party.update(dt, t, player.position);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
