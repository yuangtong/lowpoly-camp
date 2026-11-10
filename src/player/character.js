import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COLORS } from '../config.js';
import { flatMat, paintFaces, varied } from '../utils/geometry.js';

/**
 * Aspecto de un personaje de bloques.
 * @typedef {object} CharacterLook
 * @property {string} skin
 * @property {string | string[]} top Color del torso; una lista dibuja rayas verticales.
 * @property {string} sleeves
 * @property {boolean} [shortSleeves] Manga corta (se ve el brazo).
 * @property {string} legsUpper Pantalón o short.
 * @property {string} legsLower Pantalón o medias.
 * @property {string} boots
 * @property {'beanie' | 'hair'} headwear
 * @property {string} headColor Color del gorro o del pelo.
 * @property {string} [backpack] Color de la mochila (sin mochila si falta).
 * @property {string} [beard] Color de la barba (sin barba si falta).
 */

/** @type {CharacterLook} Aspecto del jugador: excursionista con gorro y mochila. */
export const HIKER_LOOK = {
  skin: COLORS.skin,
  top: COLORS.jacket,
  sleeves: COLORS.jacket,
  legsUpper: COLORS.pants,
  legsLower: COLORS.pants,
  boots: COLORS.boots,
  headwear: 'beanie',
  headColor: COLORS.beanie,
  backpack: COLORS.backpack,
};

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
 * Crea un personaje low-poly (estilo muñeco de bloques). Mira hacia +Z y sus
 * pies están en y = 0.
 * @param {CharacterLook} [look]
 * @returns {{ group: THREE.Group, animate: (walkPhase: number, moving: number, airborne: boolean, t: number, punch: number) => void }}
 *   `animate`: `walkPhase` avanza con la distancia recorrida, `moving` va de
 *   0 (quieto) a 1 (corriendo), `t` es el tiempo en segundos y `punch` va de
 *   1 (inicio del golpe) a 0 (sin golpe).
 */
export function createCharacter(look = HIKER_LOOK) {
  const group = new THREE.Group();

  // Cuerpo: torso + cabeza + pelo o gorro + ojos, todo en una sola malla
  const parts = [];
  const stripes = Array.isArray(look.top) ? look.top : [look.top];
  const stripeW = 0.72 / stripes.length;
  stripes.forEach((color, i) => {
    parts.push(box(stripeW, 0.75, 0.42, color, -0.36 + stripeW * (i + 0.5), 1.1, 0));
  });
  if (look.backpack) parts.push(box(0.5, 0.55, 0.22, look.backpack, 0, 1.12, -0.3));
  parts.push(box(0.56, 0.52, 0.52, look.skin, 0, 1.75, 0));
  if (look.headwear === 'beanie') {
    parts.push(box(0.62, 0.2, 0.58, look.headColor, 0, 2.06, 0));
    parts.push(box(0.16, 0.12, 0.16, look.headColor, 0, 2.2, 0));
  } else {
    parts.push(box(0.6, 0.16, 0.58, look.headColor, 0, 2.07, 0));
    parts.push(box(0.6, 0.34, 0.1, look.headColor, 0, 1.86, -0.27)); // nuca
    parts.push(box(0.4, 0.1, 0.3, look.headColor, 0, 2.18, 0.08)); // copete
  }
  if (look.beard) {
    parts.push(box(0.58, 0.2, 0.06, look.beard, 0, 1.58, 0.27));
    parts.push(box(0.05, 0.22, 0.4, look.beard, -0.285, 1.6, 0.07));
    parts.push(box(0.05, 0.22, 0.4, look.beard, 0.285, 1.6, 0.07));
  }
  parts.push(box(0.09, 0.12, 0.04, COLORS.eyes, -0.13, 1.8, 0.265));
  parts.push(box(0.09, 0.12, 0.04, COLORS.eyes, 0.13, 1.8, 0.265));
  const body = new THREE.Mesh(mergeGeometries(parts), flatMat);
  body.castShadow = true;
  group.add(body);

  const sleeve = look.shortSleeves ? 0.22 : 0.5;
  const arm = (x) => {
    const armParts = [
      box(0.22, sleeve, 0.26, look.sleeves, 0, -sleeve / 2, 0),
      box(0.2, 0.18, 0.22, look.skin, 0, -0.59, 0),
    ];
    if (look.shortSleeves) armParts.push(box(0.19, 0.5 - sleeve, 0.22, look.skin, 0, -(sleeve + 0.5) / 2, 0));
    return limb(armParts, x, 1.45);
  };
  const leg = (x) =>
    limb(
      [
        box(0.3, 0.26, 0.32, look.legsUpper, 0, -0.13, 0),
        box(0.28, 0.24, 0.3, look.legsLower, 0, -0.38, 0),
        box(0.32, 0.24, 0.4, look.boots, 0, -0.61, 0.03),
      ],
      x,
      0.73
    );
  const armL = arm(-0.48), armR = arm(0.48);
  const legL = leg(-0.18), legR = leg(0.18);
  group.add(armL, armR, legL, legR);

  function animate(walkPhase, moving, airborne, t, punch) {
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
    // Golpe o saludo: el brazo derecho sube y baja
    if (punch > 0) armR.rotation.x = -2.6 * Math.sin(punch * Math.PI);
  }

  return { group, animate };
}
