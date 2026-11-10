import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ITEMS, LOOT } from '../config.js';
import { flatMat, glowTexture, jitter, paintFaces, varied } from '../utils/geometry.js';
import { resolveCollisions } from '../world/colliders.js';
import { groundHeight } from '../world/terrain.js';

/** Pescado low-poly: cuerpo afilado + cola. */
function fishGeometry(color) {
  const body = new THREE.OctahedronGeometry(0.3, 0);
  body.scale(1.6, 0.75, 0.4);
  const tail = new THREE.ConeGeometry(0.2, 0.3, 4);
  tail.rotateZ(-Math.PI / 2);
  tail.scale(1, 1, 0.3);
  tail.translate(-0.58, 0, 0);
  return mergeGeometries([paintFaces(body, () => varied(color, 0.08)), paintFaces(tail, () => varied(color, 0.08))]);
}

/** Ovillo de lana: esfera facetada algo irregular. */
function yarnGeometry(color) {
  return paintFaces(jitter(new THREE.IcosahedronGeometry(0.3, 1), 0.06), () => varied(color, 0.1));
}

const SHAPES = { fish: fishGeometry, yarn: yarnGeometry };

/**
 * Crea los objetos especiales del mundo (los que piden las gatas). Cada uno
 * flota, gira y tiene un haz de luz para verlo de lejos.
 * @param {THREE.Scene} scene
 * @returns {{ update: (t: number, playerPos: THREE.Vector3) => string | null }}
 *   `update` devuelve la clave del objeto recogido en este frame, o `null`.
 */
export function createItems(scene) {
  const spot = { x: 0, z: 0 };
  const beaconMat = new THREE.SpriteMaterial({
    map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false,
    opacity: 0.5, toneMapped: false, fog: false,
  });

  const items = Object.entries(ITEMS).map(([id, def]) => {
    spot.x = def.at[0];
    spot.z = def.at[1];
    resolveCollisions(spot, 1);
    const y = groundHeight(spot.x, spot.z) + 1;
    const mesh = new THREE.Mesh(SHAPES[id](def.color), flatMat);
    mesh.position.set(spot.x, y, spot.z);
    mesh.castShadow = true;
    scene.add(mesh);
    const beacon = new THREE.Sprite(beaconMat);
    beacon.position.set(spot.x, y + 3.2, spot.z);
    beacon.scale.set(1.6, 9, 1);
    scene.add(beacon);
    return { id, mesh, beacon, baseY: y, taken: false };
  });

  const r2 = (LOOT.pickupRadius + 0.2) ** 2;
  return {
    update(t, playerPos) {
      let picked = null;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.taken) continue;
        it.mesh.rotation.y = t * 1.6 + i;
        it.mesh.position.y = it.baseY + Math.sin(t * 2 + i) * 0.15;
        const dx = it.mesh.position.x - playerPos.x, dz = it.mesh.position.z - playerPos.z;
        if (dx * dx + dz * dz < r2) {
          it.taken = true;
          it.mesh.visible = false;
          it.beacon.visible = false;
          picked = it.id;
        }
      }
      return picked;
    },
  };
}
