import * as THREE from 'three';
import { COLORS, LOOT, PARTY, PLAYER, SEED, WORLD } from '../config.js';
import { mulberry32 } from '../utils/rng.js';
import { resolveCollisions } from '../world/colliders.js';
import { groundHeight } from '../world/terrain.js';

/**
 * Crea las monedas: un camino que guía del campamento a la fiesta y otras
 * sueltas por el mapa. Todas comparten geometría y material.
 * @param {THREE.Scene} scene
 * @returns {{ total: number, update: (t: number, playerPos: THREE.Vector3) => number }}
 *   `update` anima las monedas y devuelve cuántas se recogieron en este frame.
 */
export function createCoins(scene) {
  const geo = new THREE.CylinderGeometry(0.34, 0.34, 0.08, 8).rotateX(Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color: COLORS.coin, emissive: COLORS.coinGlow, emissiveIntensity: 1.4,
    flatShading: true, roughness: 0.4, metalness: 0.3,
  });
  const coins = [];
  const spot = { x: 0, z: 0 };

  const add = (x, z) => {
    spot.x = x;
    spot.z = z;
    resolveCollisions(spot, 0.9); // que no queden dentro de un tronco o una roca
    const y = groundHeight(spot.x, spot.z);
    if (y < WORLD.waterY + 0.4) return; // nada de monedas en el río
    const m = new THREE.Mesh(geo, mat);
    m.position.set(spot.x, y + 1, spot.z);
    m.userData.baseY = y + 1;
    scene.add(m);
    coins.push(m);
  };

  // Camino serpenteante del campamento a la entrada de la fiesta
  const fromX = PLAYER.start.x - 4, fromZ = PLAYER.start.z - 8;
  const dx = PARTY.x - fromX, dz = PARTY.z - fromZ;
  const len = Math.hypot(dx, dz);
  const reach = 1 - (PARTY.radius - 2) / len; // termina en el borde del claro
  for (let i = 0; i < LOOT.trailCoins; i++) {
    const u = (i / (LOOT.trailCoins - 1)) * reach;
    const wiggle = Math.sin(u * Math.PI * 3) * 3.5;
    add(fromX + dx * u + (-dz / len) * wiggle, fromZ + dz * u + (dx / len) * wiggle);
  }

  // Monedas sueltas (RNG propio: no altera el resto de la escena)
  const rng = mulberry32(SEED + 101);
  const b = PLAYER.bounds;
  for (let i = 0; i < LOOT.scatteredCoins; i++) {
    add(b.minX + 8 + rng() * (b.maxX - b.minX - 16), -50 + rng() * 62);
  }

  const r2 = LOOT.pickupRadius * LOOT.pickupRadius;
  return {
    total: coins.length,
    update(t, playerPos) {
      let picked = 0;
      for (let i = 0; i < coins.length; i++) {
        const c = coins[i];
        if (!c.visible) continue;
        c.rotation.y = t * 2.5 + i;
        c.position.y = c.userData.baseY + Math.sin(t * 2 + i) * 0.12;
        const ddx = c.position.x - playerPos.x, ddz = c.position.z - playerPos.z;
        if (ddx * ddx + ddz * ddz < r2 && Math.abs(c.position.y - playerPos.y - 1) < 2) {
          c.visible = false;
          picked++;
        }
      }
      return picked;
    },
  };
}
