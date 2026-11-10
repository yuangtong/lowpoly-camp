import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COLORS, WORLD } from '../config.js';
import { flatMat, jitter, paintFaces, varied } from '../utils/geometry.js';
import { pick, rand, range } from '../utils/rng.js';
import { addCollider } from './colliders.js';
import { groundHeight, riverZ } from './terrain.js';

const PINE_VARIANTS = 8;
const PINE_TIERS = 3;
const FOREST_ATTEMPTS = 260;

/** Pinos "héroe" en primer plano: [x, z, escala]. */
const HERO_PINES = [
  [17, 13, 2.1], [22, 9, 2.4], [14, 6, 1.7], [27, 15, 2.6], [32, 5, 2.2],
  [-31, 15, 1.8], [-29, 6, 2.0], [-21, 3, 1.4], [3, -2, 1.5], [7, -6, 1.6],
  [-2, -4, 1.3], [10, 1, 1.4],
];

/**
 * Geometría fusionada de un pino: tronco + pisos de conos.
 * @param {number} seed Varía el ruido y el verde base.
 * @returns {THREE.BufferGeometry}
 */
function makePineGeometry(seed) {
  const parts = [];
  const trunk = jitter(new THREE.CylinderGeometry(0.28, 0.4, 1.6, 6), 0.05, { salt: seed });
  trunk.translate(0, 0.8, 0);
  parts.push(paintFaces(trunk, () => varied(COLORS.trunk, 0.05)));
  const base = COLORS.pineGreens[seed % COLORS.pineGreens.length];
  for (let t = 0; t < PINE_TIERS; t++) {
    const r = 2.0 - t * 0.5;
    const h = 3.0 - t * 0.4;
    const cone = jitter(new THREE.ConeGeometry(r, h, 7, 1), 0.3, { keepTop: true, salt: seed + t });
    cone.translate(0, 1.2 + h / 2 + t * 1.55, 0);
    parts.push(paintFaces(cone, (c, n) => varied(n.y < 0 ? COLORS.pineUnderside : base, 0.09)));
  }
  return mergeGeometries(parts);
}

/**
 * Crea el bosque disperso y los pinos de primer plano. Las geometrías se
 * comparten entre pinos: solo hay `PINE_VARIANTS` geometrías distintas.
 * @param {THREE.Scene} scene
 */
export function createTrees(scene) {
  const variants = Array.from({ length: PINE_VARIANTS }, (_, i) => makePineGeometry(i * 7 + 3));

  const pine = (x, z, s = 1) => {
    const m = new THREE.Mesh(pick(variants), flatMat);
    m.position.set(x, groundHeight(x, z) - 0.2, z);
    m.scale.set(s * range(0.85, 1.15), s * range(0.9, 1.25), s * range(0.85, 1.15));
    m.rotation.y = rand() * Math.PI * 2;
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    addCollider(x, z, 0.45 * s); // solo el tronco
  };

  // Bosque disperso
  for (let i = 0; i < FOREST_ATTEMPTS; i++) {
    const x = range(-110, 110);
    const z = range(-55, 16);
    if (Math.hypot(x - WORLD.fire.x, z - WORLD.fire.z) < 10) continue;
    if (Math.hypot(x + 15, z - 12) < 8) continue; // frente a la carpa
    if (Math.abs(z - riverZ(x)) < 8) continue;
    if (Math.abs(x - 3) < 6 && z > 0) continue; // deja ver el campamento
    pine(x, z, range(0.8, 1.5) * (z < -25 ? 1.3 : 1));
  }

  for (const [x, z, s] of HERO_PINES) pine(x, z, s);
}
