import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COLORS } from '../config.js';
import { flatMat, paintFaces, varied } from '../utils/geometry.js';

/**
 * Caja pintada de un color (con ligera variación por cara).
 * @param {number} w
 * @param {number} h
 * @param {number} d
 * @param {string} color
 * @param {number} x Centro de la caja.
 * @param {number} y
 * @param {number} z
 * @returns {THREE.BufferGeometry}
 */
function box(w, h, d, color, x, y, z) {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(x, y, z);
  return paintFaces(geo, () => varied(color, 0.04));
}

/**
 * Extremidad con el pivote arriba (hombro o cadera) para poder balancearla.
 * @param {THREE.BufferGeometry[]} parts Geometrías ya colocadas colgando de y = 0.
 * @param {number} x
 * @param {number} y
 * @returns {THREE.Mesh}
 */
function limb(parts, x, y) {
  const m = new THREE.Mesh(mergeGeometries(parts), flatMat);
  m.position.set(x, y, 0);
  m.castShadow = true;
  return m;
}

/**
 * Crea el personaje low-poly (estilo muñeco de bloques). Mira hacia +Z y sus
 * pies están en y = 0.
 * @returns {{ group: THREE.Group, animate: (walkPhase: number, moving: number, airborne: boolean, t: number) => void }}
 *   `animate`: `walkPhase` avanza con la distancia recorrida, `moving` va de
 *   0 (quieto) a 1 (corriendo), `t` es el tiempo en segundos.
 */
export function createCharacter() {
  const group = new THREE.Group();

  // Cuerpo: torso + mochila + cabeza + gorro + ojos, todo en una sola malla
  const body = new THREE.Mesh(
    mergeGeometries([
      box(0.72, 0.75, 0.42, COLORS.jacket, 0, 1.1, 0),
      box(0.5, 0.55, 0.22, COLORS.backpack, 0, 1.12, -0.3),
      box(0.56, 0.52, 0.52, COLORS.skin, 0, 1.75, 0),
      box(0.62, 0.2, 0.58, COLORS.beanie, 0, 2.06, 0),
      box(0.16, 0.12, 0.16, COLORS.beanie, 0, 2.2, 0),
      box(0.09, 0.12, 0.04, COLORS.eyes, -0.13, 1.78, 0.265),
      box(0.09, 0.12, 0.04, COLORS.eyes, 0.13, 1.78, 0.265),
    ]),
    flatMat
  );
  body.castShadow = true;
  group.add(body);

  const arm = (x) =>
    limb(
      [box(0.22, 0.5, 0.26, COLORS.jacket, 0, -0.25, 0), box(0.2, 0.18, 0.22, COLORS.skin, 0, -0.59, 0)],
      x,
      1.45
    );
  const leg = (x) =>
    limb(
      [box(0.3, 0.5, 0.32, COLORS.pants, 0, -0.25, 0), box(0.32, 0.24, 0.4, COLORS.boots, 0, -0.61, 0.03)],
      x,
      0.73
    );
  const armL = arm(-0.48), armR = arm(0.48);
  const legL = leg(-0.18), legR = leg(0.18);
  group.add(armL, armR, legL, legR);

  function animate(walkPhase, moving, airborne, t) {
    if (airborne) {
      // En el aire: brazos arriba y piernas recogidas
      armL.rotation.x = armR.rotation.x = -2.4;
      legL.rotation.x = 0.5;
      legR.rotation.x = -0.3;
      body.position.y = 0;
      return;
    }
    const swing = Math.sin(walkPhase) * (0.35 + moving * 0.55) * Math.min(1, moving * 4);
    legL.rotation.x = swing;
    legR.rotation.x = -swing;
    armL.rotation.x = -swing * 0.9;
    armR.rotation.x = swing * 0.9;
    // Rebote al caminar + respiración en reposo
    body.position.y = Math.abs(Math.cos(walkPhase)) * 0.06 * moving + Math.sin(t * 2) * 0.012;
  }

  return { group, animate };
}
