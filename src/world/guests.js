import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COLORS, GUESTS } from '../config.js';
import { createCharacter } from '../player/character.js';
import { flatMat, paintFaces, varied } from '../utils/geometry.js';
import { createLabel } from '../utils/label.js';
import { hash3 } from '../utils/noise.js';
import { addCollider } from './colliders.js';
import { groundHeight } from './terrain.js';

const CAT_SCALE = 1.6;

/** Caja de un color fijo, centrada en (x, y, z). */
function box(w, h, d, color, x, y, z) {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(x, y, z);
  return paintFaces(geo, () => varied(color, 0.04));
}

/** Malla low-poly a partir de varias piezas. */
function mesh(parts) {
  const m = new THREE.Mesh(mergeGeometries(parts), flatMat);
  m.castShadow = true;
  return m;
}

/**
 * Pelaje de una cara según el patrón de la gata.
 * - `bicolor`: lomo de un color, pecho y frente blancos.
 * - `calico`: parches blancos, naranjas y negros.
 */
function furColor(coat, c, n) {
  if (coat.pattern === 'calico') {
    if (n.z > 0.5) return varied(coat.white, 0.03); // pecho blanco
    const h = hash3(Math.round(c.x * 5), Math.round(c.y * 4), Math.round(c.z * 4));
    return varied(h < 0.4 ? coat.white : h < 0.72 ? coat.orange : coat.black, 0.04);
  }
  return varied(n.z > 0.5 || c.y < 0.12 ? coat.white : coat.main, 0.04);
}

/**
 * Gata low-poly. Mira hacia +Z; `pose` puede ser 'sentada' o 'echada'.
 * @returns {{ group: THREE.Group, head: THREE.Mesh, tail: THREE.Mesh }}
 */
function createCat({ coat, collar, tag, pose }) {
  const group = new THREE.Group();
  const sitting = pose === 'sentada';
  const headY = sitting ? 0.74 : 0.4;
  const headZ = sitting ? 0.1 : 0.4;

  // Cuerpo
  const bodyParts = [];
  if (sitting) {
    const torso = new THREE.CylinderGeometry(0.17, 0.27, 0.6, 6);
    torso.translate(0, 0.3, 0);
    bodyParts.push(paintFaces(torso, (c, n) => furColor(coat, c, n)));
    bodyParts.push(box(0.09, 0.36, 0.1, coat.white, -0.09, 0.18, 0.2));
    bodyParts.push(box(0.09, 0.36, 0.1, coat.white, 0.09, 0.18, 0.2));
  } else {
    const loaf = new THREE.BoxGeometry(0.44, 0.3, 0.74, 2, 1, 3);
    loaf.translate(0, 0.15, 0);
    bodyParts.push(paintFaces(loaf, (c, n) => furColor(coat, c, n)));
    bodyParts.push(box(0.11, 0.08, 0.12, coat.white, -0.1, 0.04, 0.41));
    bodyParts.push(box(0.11, 0.08, 0.12, coat.white, 0.1, 0.04, 0.41));
  }
  // Collar y placa
  bodyParts.push(box(0.26, 0.05, 0.24, collar, 0, headY - 0.17, headZ - 0.03));
  bodyParts.push(box(0.09, 0.11, 0.03, tag, 0, headY - 0.25, headZ + 0.1));
  group.add(mesh(bodyParts));

  // Cabeza (malla aparte: gira para seguir al jugador)
  const left = coat.pattern === 'calico' ? coat.black : coat.main;
  const right = coat.pattern === 'calico' ? coat.orange : coat.main;
  const ear = (x, color) => {
    const g = new THREE.ConeGeometry(0.075, 0.15, 4);
    g.translate(x, 0.2, -0.02);
    return paintFaces(g, () => varied(color, 0.04));
  };
  const head = mesh([
    box(0.17, 0.26, 0.28, left, -0.085, 0, 0),
    box(0.17, 0.26, 0.28, right, 0.085, 0, 0),
    box(0.1, 0.2, 0.03, coat.white, 0, 0.02, 0.143), // mancha blanca de la frente
    box(0.2, 0.11, 0.07, coat.white, 0, -0.07, 0.16), // hocico
    box(0.05, 0.035, 0.03, COLORS.catNose, 0, -0.02, 0.2),
    box(0.055, 0.06, 0.03, COLORS.catEyes, -0.09, 0.04, 0.143),
    box(0.055, 0.06, 0.03, COLORS.catEyes, 0.09, 0.04, 0.143),
    ear(-0.11, left),
    ear(0.11, right),
  ]);
  head.position.set(0, headY, headZ);
  group.add(head);

  // Cola (pivote en la base, para moverla)
  const tailGeo = new THREE.BoxGeometry(0.07, 0.07, 0.5);
  tailGeo.translate(0, 0, -0.25);
  const tail = new THREE.Mesh(paintFaces(tailGeo, () => varied(coat.tail, 0.04)), flatMat);
  tail.castShadow = true;
  tail.position.set(0, sitting ? 0.06 : 0.12, sitting ? -0.2 : -0.36);
  group.add(tail);

  group.scale.setScalar(CAT_SCALE);
  return { group, head, tail };
}

/** Pelota de fútbol low-poly. */
function createBall() {
  const g = new THREE.IcosahedronGeometry(0.26, 1);
  return new THREE.Mesh(
    paintFaces(g, (c, n, i) => varied(i % 4 === 0 ? COLORS.eyes : COLORS.tablecloth, 0.03)),
    flatMat
  );
}

/** Diferencia de ángulos por el camino más corto, en [-π, π]. */
const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/**
 * Crea a los invitados de la fiesta: las gatas y los futbolistas.
 * @param {THREE.Scene} scene
 * @param {(lx: number, lz: number) => { x: number, z: number }} toWorld
 *   Convierte coordenadas locales de la fiesta a coordenadas del mundo.
 * @param {number} facing Ángulo hacia el que mira la fiesta.
 * @returns {{ celebrate: () => void, update: (dt: number, t: number, playerPos: THREE.Vector3) => void }}
 */
export function createGuests(scene, toWorld, facing) {
  const cats = GUESTS.cats.map((def, i) => {
    const cat = createCat(def);
    const { x, z } = toWorld(def.at[0], def.at[1]);
    cat.group.position.set(x, groundHeight(x, z), z);
    cat.group.rotation.y = facing + def.turn;
    scene.add(cat.group);
    addCollider(x, z, 0.4);

    const label = createLabel(def.name, { height: 0.34 });
    label.position.set(x, cat.group.position.y + (def.pose === 'sentada' ? 2.05 : 1.5), z);
    scene.add(label);
    const meow = createLabel(def.says, { bubble: true, height: 0.4 });
    meow.position.copy(label.position);
    meow.position.y += 0.45;
    meow.visible = false;
    scene.add(meow);
    return { ...cat, meow, phase: i * 2.1, look: 0, facing: cat.group.rotation.y };
  });

  const players = GUESTS.footballers.map((def, i) => {
    const character = createCharacter(def.look);
    const { x, z } = toWorld(def.at[0], def.at[1]);
    const y = groundHeight(x, z);
    character.group.position.set(x, y, z);
    character.group.rotation.y = facing;
    character.group.scale.setScalar(def.scale);
    scene.add(character.group);
    addCollider(x, z, 0.5);

    const top = y + 2.3 * def.scale;
    const label = createLabel(def.name, { height: 0.38 });
    label.position.set(x, top + 0.3, z);
    scene.add(label);
    const speech = createLabel(def.says, { bubble: true, height: 0.5 });
    speech.position.set(x, top + 0.85, z);
    speech.visible = false;
    scene.add(speech);
    return { ...character, def, speech, baseY: y, facing, phase: i * 1.3 };
  });

  // Pelota entre los dos futbolistas
  const ball = createBall();
  const bp = toWorld(GUESTS.ball[0], GUESTS.ball[1]);
  ball.position.set(bp.x, groundHeight(bp.x, bp.z) + 0.26, bp.z);
  ball.castShadow = true;
  scene.add(ball);

  let partying = false;

  return {
    celebrate() {
      partying = true;
      for (const c of cats) c.meow.visible = true;
      for (const p of players) p.speech.visible = true;
    },
    update(dt, t, playerPos) {
      const ease = 1 - Math.exp(-6 * dt);

      // Las gatas mueven la cola y siguen al jugador: primero con la cabeza y,
      // con calma, con todo el cuerpo
      const lazy = 1 - Math.exp(-1.2 * dt);
      for (const c of cats) {
        c.tail.rotation.y = Math.sin(t * 2.2 + c.phase) * 0.7;
        const g = c.group;
        const toPlayer = Math.atan2(playerPos.x - g.position.x, playerPos.z - g.position.z);
        c.facing += angleDiff(toPlayer, c.facing) * lazy;
        g.rotation.y = c.facing;
        const want = angleDiff(toPlayer, c.facing);
        c.look += (THREE.MathUtils.clamp(want, -1.1, 1.1) - c.look) * ease;
        c.head.rotation.y = c.look;
        c.head.rotation.z = Math.sin(t * 0.8 + c.phase) * 0.06;
      }

      // Los futbolistas se giran hacia el jugador; en la fiesta saludan y saltan
      for (const p of players) {
        const g = p.group;
        const want = Math.atan2(playerPos.x - g.position.x, playerPos.z - g.position.z);
        p.facing += angleDiff(want, p.facing) * ease;
        g.rotation.y = p.facing;
        let wave = 0, hop = 0;
        if (partying) {
          wave = (t * 0.9 + p.phase) % 1;
          hop = Math.max(0, Math.sin(t * p.def.hopSpeed + p.phase)) * p.def.hopHeight;
        }
        g.position.y = p.baseY + hop;
        p.animate(0, 0, false, t + p.phase, wave);
      }
    },
  };
}
