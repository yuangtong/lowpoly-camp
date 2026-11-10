import * as THREE from 'three';
import { COLORS } from '../config.js';
import { flatMat, jitter, paintFaces, varied } from '../utils/geometry.js';
import { rand } from '../utils/rng.js';
import { groundHeight } from './terrain.js';

/** Rocas: [x, z, escala, hundimiento en el suelo (0–1)]. */
const ROCKS = [
  [9, 25, 3.2, 0.2], // gran roca en el río
  [-14, 31, 4.5, 0.3],
  [-3, 30, 2.2, 0.3],
  [26, 22, 2.0, 0.3],
  [-30, 19, 1.6, 0.3],
  [-35, -10, 2.4, 0.3],
];

/**
 * Crea las rocas del río y del bosque.
 * @param {THREE.Scene} scene
 */
export function createRocks(scene) {
  for (const [x, z, s, sink] of ROCKS) {
    let geo = jitter(new THREE.DodecahedronGeometry(1, 0), 0.35, { salt: x + z });
    geo = paintFaces(geo, () => varied(COLORS.rock[rand() < 0.5 ? 0 : 1], 0.06));
    const m = new THREE.Mesh(geo, flatMat);
    m.position.set(x, groundHeight(x, z) + s * (1 - sink) * 0.5, z);
    m.scale.set(s * 1.4, s * 0.8, s);
    m.rotation.set(rand(), rand() * 6, rand() * 0.3);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  }
}
