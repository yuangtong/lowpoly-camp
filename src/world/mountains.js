import * as THREE from 'three';
import { COLORS } from '../config.js';
import { flatMat, paintFaces, varied } from '../utils/geometry.js';
import { hash3 } from '../utils/noise.js';
import { pick, rand } from '../utils/rng.js';

/** Montañas del fondo: [x, z, radio, altura, línea de nieve (0–1)]. */
const MOUNTAINS = [
  [4, -70, 30, 52, 0.62], // pico central
  [62, -62, 42, 90, 0.5], // gigante a la derecha
  [30, -105, 30, 60, 0.55],
  [-48, -95, 26, 30, 0.6],
  [-80, -70, 22, 24, 0.6],
  [-25, -120, 30, 42, 0.58],
  [100, -110, 40, 75, 0.5],
];

/**
 * Crea una montaña (cono deformado) con nieve por encima de `snowLine`.
 * @param {THREE.Scene} scene
 * @param {number} x
 * @param {number} z
 * @param {number} radius
 * @param {number} height
 * @param {number} snowLine Fracción de la altura donde empieza la nieve.
 */
function mountain(scene, x, z, radius, height, snowLine) {
  let geo = new THREE.ConeGeometry(radius, height, 9, 7);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i);
    if (vy >= height / 2 - 1e-4) continue; // cima afilada
    const k = 1 + (hash3(vx, vy, vz) - 0.5) * 0.45;
    p.setXYZ(i, vx * k, vy + (hash3(vz, vx, vy) - 0.5) * height * 0.09, vz * k);
  }
  geo.translate(0, height / 2 - 3, 0);
  geo = paintFaces(geo, (c) => {
    const t = c.y / height + (rand() - 0.5) * 0.12;
    if (t > snowLine) return varied(COLORS.snow[rand() < 0.5 ? 0 : 1], 0.05);
    return varied(pick(COLORS.mountainRock), 0.05);
  });
  const m = new THREE.Mesh(geo, flatMat);
  m.position.set(x, 0, z);
  m.rotation.y = rand() * Math.PI;
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
}

/**
 * Crea la cordillera nevada del fondo.
 * @param {THREE.Scene} scene
 */
export function createMountains(scene) {
  for (const [x, z, radius, height, snowLine] of MOUNTAINS) {
    mountain(scene, x, z, radius, height, snowLine);
  }
}
