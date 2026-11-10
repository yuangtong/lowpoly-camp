import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COLORS, GOAL, GUESTS, PLAYER, WORLD } from '../config.js';
import { flatMat, paintFaces, varied } from '../utils/geometry.js';
import { addCollider, resolveCollisions } from './colliders.js';
import { groundHeight } from './terrain.js';

const RADIUS = 0.26;
const RESET_DELAY = 1.8;

/** Barra blanca entre dos puntos alineados con un eje. */
function bar(w, h, d, x, y, z) {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(x, y, z);
  return paintFaces(geo, () => varied(COLORS.tablecloth, 0.03));
}

/**
 * Pelota que se empuja al caminar contra ella y un arco donde meter goles.
 * @param {THREE.Scene} scene
 * @param {(lx: number, lz: number) => { x: number, z: number }} toWorld Local de la fiesta → mundo.
 * @param {(x: number, z: number, out: { x: number, z: number }) => void} toLocal Mundo → local de la fiesta (escribe en `out`).
 * @param {number} facing Ángulo de la fiesta.
 * @returns {{ position: THREE.Vector3, kick: (dx: number, dz: number, speed: number) => void, update: (dt: number, player: { position: THREE.Vector3, velocity: THREE.Vector3 }) => boolean }}
 *   `update` devuelve `true` en el frame en que se marca un gol.
 */
export function createFootball(scene, toWorld, toLocal, facing) {
  // --- Arco: postes, travesaño, marco trasero y red translúcida ---
  const { halfWidth: hw, depth, height } = GOAL;
  const t = 0.12;
  const frame = new THREE.Mesh(
    mergeGeometries([
      bar(t, height, t, 0, height / 2, -hw),
      bar(t, height, t, 0, height / 2, hw),
      bar(t, t, hw * 2 + t, 0, height, 0),
      bar(t, height * 0.55, t, depth, height * 0.275, -hw),
      bar(t, height * 0.55, t, depth, height * 0.275, hw),
      bar(t, t, hw * 2 + t, depth, height * 0.55, 0),
    ]),
    flatMat
  );
  const origin = toWorld(GOAL.x, GOAL.z);
  frame.position.set(origin.x, groundHeight(origin.x, origin.z), origin.z);
  frame.rotation.y = facing;
  frame.castShadow = true;
  scene.add(frame);

  const net = new THREE.Mesh(
    mergeGeometries([
      new THREE.PlaneGeometry(hw * 2, height * 0.55).rotateY(Math.PI / 2).translate(depth, height * 0.275, 0),
      new THREE.PlaneGeometry(Math.hypot(depth, height * 0.45), hw * 2)
        .rotateX(Math.PI / 2)
        .rotateZ(-Math.atan2(height * 0.45, depth))
        .translate(depth / 2, height * 0.775, 0),
    ]),
    new THREE.MeshBasicMaterial({ color: COLORS.tablecloth, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
  );
  net.position.copy(frame.position);
  net.rotation.y = facing;
  scene.add(net);

  for (const side of [-hw, hw]) {
    const p = toWorld(GOAL.x, GOAL.z + side);
    addCollider(p.x, p.z, 0.12);
  }

  // --- Pelota ---
  const ball = new THREE.Mesh(
    paintFaces(new THREE.IcosahedronGeometry(RADIUS, 1), (c, n, i) => varied(i % 4 === 0 ? COLORS.eyes : COLORS.tablecloth, 0.03)),
    flatMat
  );
  ball.castShadow = true;
  scene.add(ball);

  const home = toWorld(GUESTS.ball[0], GUESTS.ball[1]);
  const pos = ball.position;
  const vel = { x: 0, z: 0 };
  const spot = { x: 0, z: 0 };
  const local = { x: 0, z: 0 };
  let resetIn = 0;

  const reset = () => {
    pos.set(home.x, groundHeight(home.x, home.z) + RADIUS, home.z);
    vel.x = vel.z = 0;
  };
  reset();

  function update(dt, player) {
    if (resetIn > 0) {
      resetIn -= dt;
      if (resetIn <= 0) reset();
      return false;
    }

    // Empujón del jugador
    const dx = pos.x - player.position.x, dz = pos.z - player.position.z;
    const d = Math.hypot(dx, dz);
    const reach = RADIUS + PLAYER.radius;
    if (d < reach && d > 1e-4 && player.position.y - pos.y < 1) {
      const nx = dx / d, nz = dz / d;
      const kick = Math.hypot(player.velocity.x, player.velocity.z) * 1.3 + 1.5;
      pos.x = player.position.x + nx * reach;
      pos.z = player.position.z + nz * reach;
      vel.x = nx * kick;
      vel.z = nz * kick;
    }

    // Avance con rozamiento
    const px = pos.x, pz = pos.z;
    pos.x += vel.x * dt;
    pos.z += vel.z * dt;
    const drag = Math.exp(-0.9 * dt);
    vel.x *= drag;
    vel.z *= drag;

    // Rebote contra obstáculos
    spot.x = pos.x;
    spot.z = pos.z;
    resolveCollisions(spot, RADIUS);
    const ex = spot.x - pos.x, ez = spot.z - pos.z;
    const push = Math.hypot(ex, ez);
    if (push > 1e-5) {
      const nx = ex / push, nz = ez / push;
      const into = vel.x * nx + vel.z * nz;
      if (into < 0) {
        vel.x -= 1.6 * into * nx;
        vel.z -= 1.6 * into * nz;
      }
      pos.x = spot.x;
      pos.z = spot.z;
    }

    // No sale del mapa ni cae al río
    const b = PLAYER.bounds;
    const ground = groundHeight(pos.x, pos.z);
    if (pos.x < b.minX || pos.x > b.maxX || pos.z < b.minZ || pos.z > b.maxZ || ground < WORLD.waterY + 0.3) {
      pos.x = px;
      pos.z = pz;
      vel.x *= -0.5;
      vel.z *= -0.5;
    }
    pos.y = groundHeight(pos.x, pos.z) + RADIUS;
    ball.rotation.x += (vel.z * dt) / RADIUS;
    ball.rotation.z -= (vel.x * dt) / RADIUS;

    // ¿Gol? La pelota está dentro del arco
    toLocal(pos.x, pos.z, local);
    if (local.x > GOAL.x + 0.1 && local.x < GOAL.x + depth && Math.abs(local.z - GOAL.z) < hw - 0.1) {
      vel.x = vel.z = 0;
      resetIn = RESET_DELAY;
      return true;
    }
    return false;
  }

  /**
   * Patea la pelota en la dirección (dx, dz), que no hace falta normalizar.
   * @param {number} dx
   * @param {number} dz
   * @param {number} speed
   */
  function kick(dx, dz, speed) {
    const d = Math.hypot(dx, dz);
    if (d < 1e-4 || resetIn > 0) return;
    vel.x = (dx / d) * speed;
    vel.z = (dz / d) * speed;
  }

  return { position: pos, kick, update };
}
