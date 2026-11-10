import * as THREE from 'three';
import { COLORS, WORLD } from '../config.js';

/**
 * Crea el río y devuelve su animación de olas.
 * @param {THREE.Scene} scene
 * @returns {{ update: (t: number) => void }} `update` recibe el tiempo en segundos.
 */
export function createWater(scene) {
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.width, 18, 80, 8).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: COLORS.water,
      flatShading: true,
      roughness: 0.75,
      metalness: 0,
      emissive: COLORS.waterEmissive,
    })
  );
  water.position.set(0, WORLD.waterY, 25);
  water.receiveShadow = true;
  scene.add(water);

  const wp = water.geometry.attributes.position;
  const base = wp.array.slice(); // posiciones en reposo

  return {
    update(t) {
      for (let i = 0; i < wp.count; i++) {
        const x = base[i * 3], z = base[i * 3 + 2];
        wp.setY(i, Math.sin(x * 0.25 + t * 1.2) * 0.12 + Math.cos(z * 0.6 + x * 0.1 + t) * 0.1);
      }
      wp.needsUpdate = true;
      water.geometry.computeVertexNormals();
    },
  };
}
