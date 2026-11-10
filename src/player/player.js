import * as THREE from 'three';
import { PLAYER, WORLD } from '../config.js';
import { resolveCollisions } from '../world/colliders.js';
import { groundHeight } from '../world/terrain.js';
import { createCharacter } from './character.js';

/**
 * Indica si el personaje puede pisar (x, z): dentro del mapa y fuera del agua.
 * @param {number} x
 * @param {number} z
 * @returns {boolean}
 */
function walkable(x, z) {
  const b = PLAYER.bounds;
  if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) return false;
  return groundHeight(x, z) > WORLD.waterY + 0.25;
}

/**
 * Crea el personaje controlable.
 * @param {THREE.Scene} scene
 * @param {THREE.Mesh} terrain Malla del suelo, para apoyar los pies con un rayo.
 * @param {{ x: number, z: number }} [start] Posición inicial.
 * @returns {{ position: THREE.Vector3, velocity: THREE.Vector3, punch: () => void, update: (dt: number, t: number, input: { x: number, y: number, run: boolean, jump: boolean }, camera: THREE.Camera) => void }}
 */
export function createPlayer(scene, terrain, start = PLAYER.start) {
  const { group, animate } = createCharacter();
  scene.add(group);

  // Todo lo que usa el loop se crea una sola vez aquí
  const pos = group.position;
  const velocity = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const wish = new THREE.Vector3();
  const rayOrigin = new THREE.Vector3();
  const down = new THREE.Vector3(0, -1, 0);
  const raycaster = new THREE.Raycaster();
  const hits = [];
  let facing = PLAYER.start.facing;
  let walkPhase = 0;
  let grounded = true;
  let punchTime = 0; // 1 → 0 mientras dura el golpe

  /** Altura real del suelo bajo (x, z), medida sobre la malla facetada. */
  function floorY(x, z) {
    rayOrigin.set(x, 100, z);
    raycaster.set(rayOrigin, down);
    hits.length = 0;
    raycaster.intersectObject(terrain, false, hits);
    return hits.length ? hits[0].point.y : groundHeight(x, z);
  }

  pos.set(start.x, floorY(start.x, start.z), start.z);
  group.rotation.y = facing;

  function update(dt, t, input, camera) {
    // Dirección deseada, relativa a hacia dónde mira la cámara
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    wish.set(
      forward.x * input.y - forward.z * input.x,
      0,
      forward.z * input.y + forward.x * input.x
    );
    const amount = Math.min(1, wish.length());
    const speed = (input.run ? PLAYER.runSpeed : PLAYER.walkSpeed) * amount;
    if (amount > 0) wish.normalize();

    // Aceleración suave hacia la velocidad deseada
    const k = 1 - Math.exp(-PLAYER.acceleration * dt);
    velocity.x += (wish.x * speed - velocity.x) * k;
    velocity.z += (wish.z * speed - velocity.z) * k;

    // Mover por ejes separados para deslizarse a lo largo de bordes y orillas
    const nx = pos.x + velocity.x * dt;
    if (walkable(nx, pos.z)) pos.x = nx; else velocity.x = 0;
    const nz = pos.z + velocity.z * dt;
    if (walkable(pos.x, nz)) pos.z = nz; else velocity.z = 0;
    resolveCollisions(pos, PLAYER.radius);

    // Salto y gravedad
    const floor = floorY(pos.x, pos.z);
    if (grounded && input.jump) {
      velocity.y = PLAYER.jumpSpeed;
      grounded = false;
    }
    if (grounded) {
      pos.y = floor;
    } else {
      velocity.y -= PLAYER.gravity * dt;
      pos.y += velocity.y * dt;
      if (pos.y <= floor) {
        pos.y = floor;
        velocity.y = 0;
        grounded = true;
      }
    }

    // Girar hacia donde camina (por el camino más corto)
    const planar = Math.hypot(velocity.x, velocity.z);
    if (amount > 0.05) {
      const target = Math.atan2(wish.x, wish.z);
      let diff = target - facing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      facing += diff * (1 - Math.exp(-PLAYER.turnSpeed * dt));
      group.rotation.y = facing;
    }

    walkPhase += planar * dt * 1.9;
    if (punchTime > 0) punchTime = Math.max(0, punchTime - dt * 3.2);
    animate(walkPhase, Math.min(1, planar / PLAYER.runSpeed), !grounded, t, punchTime);
  }

  /** Lanza la animación de golpe. */
  function punch() {
    punchTime = 1;
  }

  return { position: pos, velocity, punch, update };
}
