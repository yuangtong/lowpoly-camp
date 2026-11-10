import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COLORS, PARTY, PLAYER } from '../config.js';
import { flatMat, paintFaces, varied } from '../utils/geometry.js';
import { pick, rand, range } from '../utils/rng.js';
import { addCollider } from './colliders.js';
import { createGuests } from './guests.js';
import { groundHeight } from './terrain.js';

const POLES = 6;
const POLE_RING = 8.5;
const POLE_HEIGHT = 4.2;
const FLAGS_PER_SPAN = 9;
const CONFETTI = 320;
const CONFETTI_TOP = 9;
const PARTY_LIGHT = 70;

// La fiesta "mira" hacia el campamento: su eje +Z local apunta al punto de inicio.
const ANGLE = Math.atan2(PLAYER.start.x - PARTY.x, PLAYER.start.z - PARTY.z);
const COS = Math.cos(ANGLE), SIN = Math.sin(ANGLE);

/** Convierte coordenadas locales de la fiesta a (x, z) del mundo. */
const worldX = (lx, lz) => PARTY.x + lx * COS + lz * SIN;
const worldZ = (lx, lz) => PARTY.z - lx * SIN + lz * COS;

/** Caja de un color, centrada en (x, y, z). */
function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(x, y, z);
  return paintFaces(geo, () => varied(color, 0.04));
}

/** Cilindro de un color con la base en y. */
function cyl(rTop, rBottom, h, sides, color, x = 0, y = 0, z = 0) {
  const geo = new THREE.CylinderGeometry(rTop, rBottom, h, sides);
  geo.translate(x, y + h / 2, z);
  return paintFaces(geo, () => varied(color, 0.04));
}

/**
 * Añade a la escena una malla low-poly apoyada en el suelo, en coordenadas
 * locales de la fiesta.
 */
function place(scene, geometries, lx, lz, { collider = 0, material = flatMat } = {}) {
  const m = new THREE.Mesh(mergeGeometries(geometries), material);
  const x = worldX(lx, lz), z = worldZ(lx, lz);
  m.position.set(x, groundHeight(x, z), z);
  m.rotation.y = ANGLE;
  m.castShadow = true;
  scene.add(m);
  if (collider) addCollider(x, z, collider);
  return m;
}

/** Textura del cartel con el mensaje de cumpleaños (letras de colores). */
function bannerTexture() {
  const cv = document.createElement('canvas');
  cv.width = 2048;
  cv.height = 320;
  const g = cv.getContext('2d');
  g.fillStyle = COLORS.bannerCloth;
  g.fillRect(0, 0, cv.width, cv.height);
  g.strokeStyle = COLORS.festive[0];
  g.lineWidth = 18;
  g.strokeRect(9, 9, cv.width - 18, cv.height - 18);

  const text = `¡FELIZ CUMPLEAÑOS ${PARTY.name.toUpperCase()}!`;
  g.font = '900 190px system-ui, "Segoe UI", Arial, sans-serif';
  g.textBaseline = 'middle';
  // Ajusta el tamaño si el nombre es largo
  const scale = Math.min(1, (cv.width - 120) / g.measureText(text).width);
  g.font = `900 ${Math.floor(190 * scale)}px system-ui, "Segoe UI", Arial, sans-serif`;
  let x = (cv.width - g.measureText(text).width) / 2;
  let colorIndex = 0;
  for (const ch of text) {
    if (ch !== ' ') {
      g.fillStyle = COLORS.bannerText;
      g.fillText(ch, x + 6, cv.height / 2 + 14);
      g.fillStyle = COLORS.festive[colorIndex++ % COLORS.festive.length];
      g.fillText(ch, x, cv.height / 2 + 8);
    }
    x += g.measureText(ch).width;
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Cartel entre dos postes, legible por delante y por detrás. */
function createBanner(scene) {
  const width = 12.8, height = 2, lz = -6.5, baseY = 3.6;
  const x = worldX(0, lz), z = worldZ(0, lz);
  const y = groundHeight(x, z);
  const mat = new THREE.MeshBasicMaterial({ map: bannerTexture(), toneMapped: false, fog: false });
  const geo = new THREE.PlaneGeometry(width, height);
  for (const flip of [0, Math.PI]) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y + baseY + height / 2, z);
    m.rotation.y = ANGLE + flip;
    scene.add(m);
  }
  for (const side of [-1, 1]) {
    place(scene, [cyl(0.14, 0.18, baseY + height + 0.3, 6, COLORS.log)], side * (width / 2 + 0.15), lz, { collider: 0.3 });
  }
}

/**
 * Postes en círculo con banderines y luces colgando entre ellos.
 * @returns {THREE.Points} Las bombillas (para hacerlas titilar).
 */
function createBunting(scene) {
  const tops = [];
  for (let i = 0; i < POLES; i++) {
    const a = (i / POLES) * Math.PI * 2 + Math.PI / POLES;
    const lx = Math.sin(a) * POLE_RING, lz = Math.cos(a) * POLE_RING;
    const pole = place(scene, [cyl(0.1, 0.14, POLE_HEIGHT, 6, COLORS.log)], lx, lz, { collider: 0.25 });
    tops.push(new THREE.Vector3(pole.position.x, pole.position.y + POLE_HEIGHT - 0.1, pole.position.z));
  }

  // Banderines: triángulos sueltos con color por cara + una bombilla entre cada dos
  const positions = [];
  const colors = [];
  const bulbs = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), color = new THREE.Color();
  const pointOnString = (from, to, u, out) => {
    out.lerpVectors(from, to, u);
    out.y -= Math.sin(u * Math.PI) * 0.9; // la cuerda cuelga
    return out;
  };
  for (let i = 0; i < POLES; i++) {
    const from = tops[i], to = tops[(i + 1) % POLES];
    for (let f = 0; f < FLAGS_PER_SPAN; f++) {
      const u0 = (f + 0.15) / FLAGS_PER_SPAN, u1 = (f + 0.85) / FLAGS_PER_SPAN;
      pointOnString(from, to, u0, a);
      pointOnString(from, to, u1, b);
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z, (a.x + b.x) / 2, (a.y + b.y) / 2 - 0.65, (a.z + b.z) / 2);
      color.set(COLORS.festive[(i * FLAGS_PER_SPAN + f) % COLORS.festive.length]);
      for (let k = 0; k < 3; k++) colors.push(color.r, color.g, color.b);
      pointOnString(from, to, (f + 1) / FLAGS_PER_SPAN, a);
      bulbs.push(a.x, a.y - 0.08, a.z);
    }
  }
  const flagGeo = new THREE.BufferGeometry();
  flagGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  flagGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  flagGeo.computeVertexNormals();
  scene.add(
    new THREE.Mesh(
      flagGeo,
      new THREE.MeshStandardMaterial({
        vertexColors: true, flatShading: true, side: THREE.DoubleSide, roughness: 0.9,
        emissive: '#ffffff', emissiveIntensity: 0.12,
      })
    )
  );

  const bulbGeo = new THREE.BufferGeometry();
  bulbGeo.setAttribute('position', new THREE.Float32BufferAttribute(bulbs, 3));
  const lights = new THREE.Points(
    bulbGeo,
    new THREE.PointsMaterial({ color: COLORS.bulb, size: 0.32, toneMapped: false, fog: false })
  );
  scene.add(lights);
  return lights;
}

/** Mesa con mantel, torta de dos pisos con velas y regalos alrededor. */
function createTableAndGifts(scene) {
  const top = 1.0;
  const flames = new THREE.MeshBasicMaterial({ color: COLORS.flames[1], toneMapped: false });
  const parts = [
    box(3.2, 0.14, 1.7, COLORS.tablecloth, 0, top, 0),
    box(3.3, 0.3, 1.8, COLORS.tablecloth, 0, top - 0.2, 0),
    cyl(0.75, 0.75, 0.45, 8, COLORS.cakeBase, 0, top + 0.07, 0),
    cyl(0.5, 0.5, 0.38, 8, COLORS.cakeTop, 0, top + 0.52, 0),
    // Platos y vasos
    cyl(0.28, 0.2, 0.05, 6, COLORS.festive[2], -1.1, top + 0.07, 0.3),
    cyl(0.28, 0.2, 0.05, 6, COLORS.festive[1], 1.1, top + 0.07, 0.3),
    cyl(0.11, 0.08, 0.26, 5, COLORS.festive[0], -1.15, top + 0.07, -0.4),
    cyl(0.11, 0.08, 0.26, 5, COLORS.festive[3], 1.2, top + 0.07, -0.35),
  ];
  for (const sx of [-1.4, 1.4]) for (const sz of [-0.65, 0.65]) parts.push(box(0.14, top, 0.14, COLORS.log, sx, top / 2, sz));
  const flameParts = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const cx = Math.cos(a) * 0.3, cz = Math.sin(a) * 0.3;
    parts.push(cyl(0.03, 0.03, 0.28, 4, COLORS.festive[i % COLORS.festive.length], cx, top + 0.9, cz));
    flameParts.push(new THREE.ConeGeometry(0.06, 0.18, 4).translate(cx, top + 1.28, cz));
  }
  const table = place(scene, parts, 0, -2.2, { collider: 1.8 });
  table.receiveShadow = true;
  const candleFlames = place(scene, flameParts, 0, -2.2, { material: flames });
  candleFlames.castShadow = false;

  // Regalos: caja + cinta en cruz + lazo
  const GIFTS = [[-3.2, -3.4, 0.9], [-4.1, -2.5, 0.65], [3.3, -3.2, 0.8], [4.0, -2.2, 1.0], [3.1, -1.9, 0.55]];
  GIFTS.forEach(([lx, lz, s], i) => {
    const wrap = COLORS.festive[i % COLORS.festive.length];
    const ribbon = COLORS.festive[(i + 3) % COLORS.festive.length];
    place(
      scene,
      [
        box(s, s * 0.8, s, wrap, 0, s * 0.4, 0),
        box(s * 1.03, s * 0.82, s * 0.18, ribbon, 0, s * 0.4, 0),
        box(s * 0.18, s * 0.82, s * 1.03, ribbon, 0, s * 0.4, 0),
        box(s * 0.3, s * 0.16, s * 0.3, ribbon, 0, s * 0.86, 0),
      ],
      lx,
      lz,
      { collider: s * 0.7 }
    ).rotation.y = ANGLE + rand() * 0.8;
  });
}

/**
 * Racimos de globos atados al suelo.
 * @returns {THREE.Mesh[]} Los racimos (para mecerlos).
 */
function createBalloons(scene) {
  const SPOTS = [[-6.8, -5.5], [6.8, -5.5], [-5.6, 2.8], [5.6, 2.8], [-2.3, -2.4], [2.3, -2.4]];
  const shiny = new THREE.MeshStandardMaterial({
    vertexColors: true, flatShading: true, roughness: 0.45,
    emissive: '#ffffff', emissiveIntensity: 0.08,
  });
  return SPOTS.map(([lx, lz]) => {
    const parts = [];
    const count = 3 + Math.floor(rand() * 2);
    for (let i = 0; i < count; i++) {
      const color = pick(COLORS.festive);
      const bx = range(-0.6, 0.6), bz = range(-0.6, 0.6), by = range(2.6, 3.7);
      const g = new THREE.IcosahedronGeometry(0.48, 1);
      g.scale(1, 1.2, 1);
      g.translate(bx, by, bz);
      parts.push(paintFaces(g, () => varied(color, 0.05)));
      // Hilo hasta el suelo
      const str = new THREE.CylinderGeometry(0.012, 0.012, by - 0.5, 3);
      str.translate(bx * 0.5, (by - 0.5) / 2, bz * 0.5);
      str.rotateZ(-bx * 0.16);
      str.rotateX(bz * 0.16);
      parts.push(paintFaces(str, () => new THREE.Color(COLORS.tablecloth)));
    }
    const cluster = place(scene, parts, lx, lz, { material: shiny });
    cluster.userData.phase = rand() * 6;
    return cluster;
  });
}

/**
 * Confeti que cae sobre el claro (oculto hasta que empieza la celebración).
 * @returns {{ points: THREE.Points, update: (dt: number) => void }}
 */
function createConfetti(scene) {
  const pos = new Float32Array(CONFETTI * 3);
  const col = new Float32Array(CONFETTI * 3);
  const fall = new Float32Array(CONFETTI);
  const baseY = groundHeight(PARTY.x, PARTY.z);
  const c = new THREE.Color();
  for (let i = 0; i < CONFETTI; i++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * PARTY.radius;
    pos[i * 3] = PARTY.x + Math.cos(a) * r;
    pos[i * 3 + 1] = baseY + rand() * CONFETTI_TOP;
    pos[i * 3 + 2] = PARTY.z + Math.sin(a) * r;
    fall[i] = range(1.2, 2.6);
    c.set(pick(COLORS.festive));
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ vertexColors: true, size: 0.2, toneMapped: false })
  );
  points.visible = false;
  points.frustumCulled = false;
  scene.add(points);

  return {
    points,
    update(dt) {
      for (let i = 0; i < CONFETTI; i++) {
        const iy = i * 3 + 1;
        pos[iy] -= fall[i] * dt;
        pos[i * 3] += Math.sin(pos[iy] * 2 + i) * 0.4 * dt; // zigzag al caer
        if (pos[iy] < baseY) pos[iy] = baseY + CONFETTI_TOP;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

/**
 * Crea la fiesta sorpresa: cartel, banderines, luces, torta, regalos, globos,
 * confeti e invitados.
 * @param {THREE.Scene} scene
 * @returns {{ celebrate: () => void, update: (dt: number, t: number, playerPos: THREE.Vector3) => void }}
 *   `celebrate` suelta el confeti y anima a los invitados; `update` anima la fiesta.
 */
export function createParty(scene) {
  createBanner(scene);
  const bulbs = createBunting(scene);
  createTableAndGifts(scene);
  const balloons = createBalloons(scene);
  const confetti = createConfetti(scene);
  const guests = createGuests(scene, (lx, lz) => ({ x: worldX(lx, lz), z: worldZ(lx, lz) }), ANGLE);

  // Luz cálida que ilumina el claro
  const light = new THREE.PointLight(COLORS.partyLight, PARTY_LIGHT, 30, 1.6);
  light.position.set(PARTY.x, groundHeight(PARTY.x, PARTY.z) + 4.5, PARTY.z);
  scene.add(light);

  return {
    celebrate() {
      confetti.points.visible = true;
      guests.celebrate();
    },
    update(dt, t, playerPos) {
      guests.update(dt, t, playerPos);
      for (const b of balloons) {
        b.rotation.z = Math.sin(t * 0.9 + b.userData.phase) * 0.05;
        b.rotation.x = Math.cos(t * 0.7 + b.userData.phase) * 0.04;
      }
      bulbs.material.opacity = 0.8 + Math.sin(t * 5) * 0.2;
      light.intensity = PARTY_LIGHT + Math.sin(t * 3.1) * 6;
      if (confetti.points.visible) confetti.update(dt);
    },
  };
}
