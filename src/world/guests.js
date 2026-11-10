import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COLORS, GUESTS } from '../config.js';
import { createCharacter } from '../player/character.js';
import { flatMat, paintFaces, varied } from '../utils/geometry.js';
import { createLabel, createSpeaker } from '../utils/label.js';
import { hash3 } from '../utils/noise.js';
import { addCollider, removeCollider, resolveCollisions } from './colliders.js';
import { groundHeight } from './terrain.js';

const CAT_SCALE = 1.6;
/** Distancia a la que una gata sigue a quien tiene delante. */
const FOLLOW_GAP = 1.7;

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
 * - `bicolor`: lomo de un color; pecho y panza (por debajo de `bellyY`) blancos.
 * - `calico`: parches blancos, naranjas y negros.
 */
function furColor(coat, c, n, bellyY) {
  if (coat.pattern === 'calico') {
    if (n.z > 0.5) return varied(coat.white, 0.03); // pecho blanco
    const h = hash3(Math.round(c.x * 5), Math.round(c.y * 4), Math.round(c.z * 4));
    return varied(h < 0.4 ? coat.white : h < 0.72 ? coat.orange : coat.black, 0.04);
  }
  return varied(n.z > 0.5 || c.y < bellyY ? coat.white : coat.main, 0.04);
}

/**
 * Gata low-poly. Mira hacia +Z. Tiene dos cuerpos: el de reposo (`pose`:
 * 'sentada' o 'echada') y el de caminar, con patas que se balancean.
 * @returns {{ group: THREE.Group, head: THREE.Mesh, tail: THREE.Mesh, setWalking: (on: boolean) => void, stride: (phase: number, amount: number) => void }}
 */
function createCat({ coat, collar, tag, pose }) {
  const group = new THREE.Group();
  const sitting = pose === 'sentada';
  const restHead = sitting ? [0.74, 0.1] : [0.4, 0.4]; // [y, z]
  const walkHead = [0.62, 0.44];

  // Cuerpo en reposo
  const restParts = [];
  if (sitting) {
    const torso = new THREE.CylinderGeometry(0.17, 0.27, 0.6, 6);
    torso.translate(0, 0.3, 0);
    restParts.push(paintFaces(torso, (c, n) => furColor(coat, c, n, 0.12)));
    restParts.push(box(0.09, 0.36, 0.1, coat.white, -0.09, 0.18, 0.2));
    restParts.push(box(0.09, 0.36, 0.1, coat.white, 0.09, 0.18, 0.2));
  } else {
    const loaf = new THREE.BoxGeometry(0.44, 0.3, 0.74, 2, 1, 3);
    loaf.translate(0, 0.15, 0);
    restParts.push(paintFaces(loaf, (c, n) => furColor(coat, c, n, 0.12)));
    restParts.push(box(0.11, 0.08, 0.12, coat.white, -0.1, 0.04, 0.41));
    restParts.push(box(0.11, 0.08, 0.12, coat.white, 0.1, 0.04, 0.41));
  }
  restParts.push(box(0.26, 0.05, 0.24, collar, 0, restHead[0] - 0.17, restHead[1] - 0.03));
  restParts.push(box(0.09, 0.11, 0.03, tag, 0, restHead[0] - 0.25, restHead[1] + 0.1));
  const rest = mesh(restParts);
  group.add(rest);

  // Cuerpo al caminar: tronco horizontal + cuatro patas con pivote arriba
  const walk = new THREE.Group();
  walk.visible = false;
  const trunk = new THREE.BoxGeometry(0.4, 0.28, 0.76, 2, 1, 3);
  trunk.translate(0, 0.42, 0);
  walk.add(
    mesh([
      paintFaces(trunk, (c, n) => furColor(coat, c, n, 0.36)),
      box(0.26, 0.05, 0.1, collar, 0, 0.5, 0.36),
      box(0.09, 0.11, 0.03, tag, 0, 0.4, 0.43),
    ])
  );
  const legGeo = new THREE.BoxGeometry(0.09, 0.3, 0.09);
  legGeo.translate(0, -0.15, 0);
  const paintedLeg = paintFaces(legGeo, () => varied(coat.white, 0.03));
  const legs = [[-0.13, 0.27], [0.13, 0.27], [-0.13, -0.27], [0.13, -0.27]].map(([x, z]) => {
    const leg = new THREE.Mesh(paintedLeg, flatMat);
    leg.position.set(x, 0.3, z);
    leg.castShadow = true;
    walk.add(leg);
    return leg;
  });
  group.add(walk);

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
  group.add(head);

  // Cola (pivote en la base, para moverla)
  const tailGeo = new THREE.BoxGeometry(0.07, 0.07, 0.5);
  tailGeo.translate(0, 0, -0.25);
  const tail = new THREE.Mesh(paintFaces(tailGeo, () => varied(coat.tail, 0.04)), flatMat);
  tail.castShadow = true;
  group.add(tail);

  function setWalking(on) {
    rest.visible = !on;
    walk.visible = on;
    const [hy, hz] = on ? walkHead : restHead;
    head.position.set(0, hy, hz);
    if (on) {
      tail.position.set(0, 0.5, -0.36);
      tail.rotation.x = 1.0; // cola en alto
    } else {
      tail.position.set(0, sitting ? 0.06 : 0.12, sitting ? -0.2 : -0.36);
      tail.rotation.x = 0;
    }
  }
  setWalking(false);

  /** Balancea las patas: `phase` avanza con la distancia y `amount` va de 0 a 1. */
  function stride(phase, amount) {
    const swing = Math.sin(phase) * 0.7 * amount;
    legs[0].rotation.x = legs[3].rotation.x = swing;
    legs[1].rotation.x = legs[2].rotation.x = -swing;
  }

  group.scale.setScalar(CAT_SCALE);
  return { group, head, tail, setWalking, stride };
}

/** Diferencia de ángulos por el camino más corto, en [-π, π]. */
const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/**
 * Crea a los invitados de la fiesta: las gatas y los futbolistas.
 * @param {THREE.Scene} scene
 * @param {(lx: number, lz: number) => { x: number, z: number }} toWorld
 *   Convierte coordenadas locales de la fiesta a coordenadas del mundo.
 * @param {number} facing Ángulo hacia el que mira la fiesta.
 * @returns {{
 *   cats: { def: object, position: THREE.Vector3, adopted: boolean, say: (text: string) => void, adopt: (leader: THREE.Vector3) => void }[],
 *   footballers: { def: object, position: THREE.Vector3, talk: () => void, cheer: () => void }[],
 *   celebrate: () => void,
 *   update: (dt: number, t: number, playerPos: THREE.Vector3) => void,
 * }}
 */
export function createGuests(scene, toWorld, facing) {
  // ------------------------------------------------------------- Gatas
  const cats = GUESTS.cats.map((def, i) => {
    const model = createCat(def);
    const { x, z } = toWorld(def.at[0], def.at[1]);
    const pos = model.group.position;
    pos.set(x, groundHeight(x, z), z);
    model.group.rotation.y = facing + def.turn;
    scene.add(model.group);

    const label = createLabel(def.name, { height: 0.34 });
    scene.add(label);
    const speaker = createSpeaker(scene, [def.says, ...def.asks, def.thanks, ...def.purrs], 0.42);

    const cat = {
      ...model,
      def,
      position: pos,
      adopted: false,
      leader: null,
      collider: addCollider(x, z, 0.4),
      label,
      speaker,
      phase: i * 2.1,
      look: 0,
      facing: model.group.rotation.y,
      walk: 0,
      say: (text) => speaker.say(text),
      /** Empieza a seguir a `leader` (la posición del jugador o de otra gata). */
      adopt(leader) {
        cat.adopted = true;
        cat.leader = leader;
        removeCollider(cat.collider);
        model.setWalking(true);
      },
    };
    return cat;
  });

  // ------------------------------------------------------- Futbolistas
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

    // Puede decir sus frases y las respuestas a las frases del otro
    const other = GUESTS.footballers[1 - i];
    const replies = other.lines.filter((l) => l.reply).map((l) => l.reply);
    const speaker = createSpeaker(scene, [def.says, '¡GOOOL!', ...def.lines.map((l) => l.text), ...replies], 0.5);

    return {
      ...character,
      def,
      position: character.group.position,
      speaker,
      bubbleY: top + 0.85,
      baseY: y,
      facing,
      phase: i * 1.3,
      next: 0,
      cheering: 0,
      pendingReply: null,
      replyIn: 0,
    };
  });
  players.forEach((p, i) => {
    const other = players[1 - i];
    /** Dice su siguiente frase; si lleva respuesta, el otro contesta enseguida. */
    p.talk = () => {
      const line = p.def.lines[p.next];
      p.next = (p.next + 1) % p.def.lines.length;
      p.speaker.say(line.text);
      if (line.reply) {
        other.pendingReply = line.reply;
        other.replyIn = 1.4;
      }
    };
    /** Festeja un gol. */
    p.cheer = () => {
      p.cheering = 2.5;
      p.speaker.say(i === 0 ? p.def.says : '¡GOOOL!', 2.5);
    };
  });

  let partying = false;

  function update(dt, t, playerPos) {
    const ease = 1 - Math.exp(-6 * dt);
    const lazy = 1 - Math.exp(-1.2 * dt);

    for (const c of cats) {
      const g = c.group;
      const pos = c.position;
      let moving = 0;

      if (c.adopted) {
        // Sigue a su líder guardando distancia; acelera si se queda atrás
        const dx = c.leader.x - pos.x, dz = c.leader.z - pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 40) {
          pos.x = c.leader.x - 1; // demasiado lejos: reaparece junto al líder
          pos.z = c.leader.z - 1;
        } else if (dist > FOLLOW_GAP) {
          const speed = Math.min(12, (dist - FOLLOW_GAP) * 4 + 1.5);
          pos.x += (dx / dist) * speed * dt;
          pos.z += (dz / dist) * speed * dt;
          resolveCollisions(pos, 0.3);
          c.facing += angleDiff(Math.atan2(dx, dz), c.facing) * ease;
          c.walk += speed * dt * 5;
          moving = Math.min(1, speed / 4);
        }
        pos.y = groundHeight(pos.x, pos.z);
        g.rotation.y = c.facing;
        c.stride(c.walk, moving);
        c.tail.rotation.y = Math.sin(t * 3 + c.phase) * 0.35;
      } else {
        // En reposo: mueve la cola y se gira con calma hacia el jugador
        c.tail.rotation.y = Math.sin(t * 2.2 + c.phase) * 0.7;
        const toPlayer = Math.atan2(playerPos.x - pos.x, playerPos.z - pos.z);
        c.facing += angleDiff(toPlayer, c.facing) * lazy;
        g.rotation.y = c.facing;
      }

      // La cabeza sigue al jugador (salvo mientras corre)
      const want = moving > 0.3 ? 0 : angleDiff(Math.atan2(playerPos.x - pos.x, playerPos.z - pos.z), c.facing);
      c.look += (THREE.MathUtils.clamp(want, -1.1, 1.1) - c.look) * ease;
      c.head.rotation.y = c.look;
      c.head.rotation.z = Math.sin(t * 0.8 + c.phase) * 0.06;

      const top = pos.y + (c.adopted ? 1.6 : c.def.pose === 'sentada' ? 2.05 : 1.5);
      c.label.position.set(pos.x, top, pos.z);
      c.speaker.update(dt, pos.x, top + 0.48, pos.z);
    }

    // Los futbolistas se giran hacia el jugador; en la fiesta saludan y saltan
    for (const p of players) {
      const g = p.group;
      const want = Math.atan2(playerPos.x - g.position.x, playerPos.z - g.position.z);
      p.facing += angleDiff(want, p.facing) * ease;
      g.rotation.y = p.facing;

      if (p.pendingReply) {
        p.replyIn -= dt;
        if (p.replyIn <= 0) {
          p.speaker.say(p.pendingReply);
          p.pendingReply = null;
        }
      }
      if (p.cheering > 0) p.cheering -= dt;

      let wave = 0, hop = 0;
      if (p.cheering > 0) {
        wave = (t * 2.2 + p.phase) % 1;
        hop = Math.abs(Math.sin(t * 7 + p.phase)) * 0.8;
      } else if (partying) {
        wave = (t * 0.9 + p.phase) % 1;
        hop = Math.max(0, Math.sin(t * p.def.hopSpeed + p.phase)) * p.def.hopHeight;
      }
      g.position.y = p.baseY + hop;
      p.animate(0, 0, false, t + p.phase, wave);
      p.speaker.update(dt, g.position.x, p.bubbleY, g.position.z);
    }
  }

  return {
    cats,
    footballers: players,
    celebrate() {
      partying = true;
      for (const c of cats) c.say(c.def.says);
      for (const p of players) p.speaker.say(p.def.says, 6);
    },
    update,
  };
}
