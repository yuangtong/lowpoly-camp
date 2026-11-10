import * as THREE from 'three';
import { COLORS, WORLD } from '../config.js';
import { flatMat, paintFaces, varied } from '../utils/geometry.js';
import { hash3 } from '../utils/noise.js';
import { pick } from '../utils/rng.js';

/**
 * Coordenada Z del centro del río para una X dada (el cauce serpentea).
 * @param {number} x
 * @returns {number}
 */
export const riverZ = (x) => 25 + Math.sin(x * 0.07) * 2.5;

/**
 * Altura del terreno en (x, z): colinas suaves, subida hacia las montañas,
 * cauce del río tallado y claro plano alrededor de la fogata.
 * Úsala para apoyar objetos (y más adelante al personaje) sobre el suelo.
 * @param {number} x
 * @param {number} z
 * @returns {number}
 */
export function groundHeight(x, z) {
  let h =
    Math.sin(x * 0.08) * 1.1 +
    Math.cos(z * 0.07 + 1.3) * 0.9 +
    Math.sin((x + z) * 0.15) * 0.45;
  h += Math.max(0, -z - 25) * 0.18; // sube hacia las montañas
  const d = Math.abs(z - riverZ(x)); // cauce del río
  if (d < 7) h -= (1 - d / 7) ** 1.5 * 4;
  const dc = Math.hypot(x - WORLD.fire.x, z - WORLD.fire.z); // claro plano
  if (dc < 11) h = THREE.MathUtils.lerp(0.4, h, THREE.MathUtils.smoothstep(dc, 4, 11));
  return h;
}

/**
 * Crea la malla del terreno y la añade a la escena.
 * @param {THREE.Scene} scene
 * @returns {THREE.Mesh} Malla del suelo (sirve para apoyar al personaje con un rayo).
 */
export function createTerrain(scene) {
  const geo = new THREE.PlaneGeometry(WORLD.width, WORLD.depth, 100, 90);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, groundHeight(x, z) + (hash3(x, 0, z) - 0.5) * 0.7);
    p.setX(i, x + (hash3(z, 1, x) - 0.5) * 1.2);
    p.setZ(i, z + (hash3(x, 2, z) - 0.5) * 1.2);
  }
  const ground = new THREE.Mesh(
    paintFaces(geo, (c, n) => {
      if (c.y < WORLD.waterY + 0.4) return varied(COLORS.shore, 0.05); // orilla
      if (n.y < 0.82) return varied(COLORS.slope, 0.06); // pendientes
      return varied(pick(COLORS.grass), 0.08);
    }),
    flatMat
  );
  ground.receiveShadow = true;
  scene.add(ground);
  return ground;
}
