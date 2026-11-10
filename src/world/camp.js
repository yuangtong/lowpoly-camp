import * as THREE from 'three';
import { COLORS, WORLD } from '../config.js';
import { flatMat, glowTexture, jitter, paintFaces, varied } from '../utils/geometry.js';
import { rand } from '../utils/rng.js';
import { groundHeight } from './terrain.js';

const FIRE_INTENSITY = 160;
const SPARKS = 40;

/** Llamas: [x, z, radio, altura, índice de color en COLORS.flames]. */
const FLAMES = [
  [0, 0, 0.45, 1.5, 0],
  [0.22, 0.1, 0.32, 1.1, 1],
  [-0.2, -0.12, 0.3, 1.0, 1],
  [0.05, 0.25, 0.25, 0.8, 2],
  [-0.08, -0.25, 0.22, 0.75, 2],
];

/** Asientos (x, z): dos tocones y una caja (el último). */
const SEATS = [[-4.5, 9.5], [-9, 4.6], [-11.5, 10.5]];

/** Carpa: prisma triangular con el frente naranja. */
function createTent(scene) {
  let geo = new THREE.CylinderGeometry(1.9, 1.9, 4.2, 3);
  geo.rotateX(Math.PI / 2);
  geo.rotateZ(Math.PI);
  geo.translate(0, 0.95, 0);
  geo = paintFaces(geo, (c, n) => {
    if (n.z > 0.9) return new THREE.Color(COLORS.tentFront);
    return varied(COLORS.tentCloth, 0.04);
  });
  const tent = new THREE.Mesh(geo, flatMat);
  const { x, z } = WORLD.tent;
  tent.position.set(x, groundHeight(x, z), z);
  tent.rotation.y = 0.55;
  tent.castShadow = true;
  scene.add(tent);
}

/**
 * Fogata: troncos, piedras, llamas, luz, halo y chispas.
 * @returns {(t: number) => void} Animación de la fogata.
 */
function createFire(scene) {
  const { x, z } = WORLD.fire;
  const fire = new THREE.Group();
  fire.position.set(x, groundHeight(x, z), z);
  scene.add(fire);

  // Troncos cruzados
  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(
      paintFaces(new THREE.CylinderGeometry(0.16, 0.18, 1.6, 5), () => varied(COLORS.log, 0.05)),
      flatMat
    );
    const a = (i / 4) * Math.PI * 2;
    log.position.set(Math.cos(a) * 0.45, 0.22, Math.sin(a) * 0.45);
    log.rotation.set(0, -a, Math.PI / 2.6);
    log.rotation.order = 'YXZ';
    fire.add(log);
  }

  // Piedras alrededor
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const stone = new THREE.Mesh(
      paintFaces(jitter(new THREE.DodecahedronGeometry(0.22, 0), 0.08), () => varied(COLORS.fireStone, 0.06)),
      flatMat
    );
    stone.position.set(Math.cos(a) * 1.05, 0.1, Math.sin(a) * 1.05);
    fire.add(stone);
  }

  // Llamas
  const flameMats = COLORS.flames.map((c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
  const flames = FLAMES.map(([fx, fz, r, h, mi], i) => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5).translate(0, h / 2, 0), flameMats[mi]);
    f.position.set(fx, 0.25, fz);
    f.userData.phase = i * 1.7;
    fire.add(f);
    return f;
  });

  // Luz de la fogata
  const light = new THREE.PointLight(COLORS.fireLight, FIRE_INTENSITY, 34, 1.6);
  light.position.set(0, 1.6, 0);
  fire.add(light);

  // Halo de luz amarilla sobre el pasto (plano aditivo) y alrededor del fuego
  const glowTex = glowTexture();
  const groundGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      map: glowTex, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, opacity: 0.55, toneMapped: false,
    })
  );
  groundGlow.position.y = 0.6;
  fire.add(groundGlow);
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6, toneMapped: false,
    })
  );
  halo.scale.set(5, 5, 1);
  halo.position.y = 1;
  fire.add(halo);

  // Chispas
  const sparkGeo = new THREE.BufferGeometry();
  const sparkPos = new Float32Array(SPARKS * 3);
  const sparkLife = new Float32Array(SPARKS).map(() => Math.random());
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  fire.add(
    new THREE.Points(
      sparkGeo,
      new THREE.PointsMaterial({
        color: COLORS.spark, size: 0.12, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      })
    )
  );

  return (t) => {
    // Parpadeo
    const flicker = 0.75 + Math.sin(t * 13) * 0.1 + Math.sin(t * 7.3) * 0.1 + Math.random() * 0.08;
    light.intensity = FIRE_INTENSITY * flicker;
    groundGlow.material.opacity = 0.45 + flicker * 0.15;
    for (const f of flames) {
      const k = 0.85 + Math.sin(t * 9 + f.userData.phase) * 0.15 + Math.random() * 0.05;
      f.scale.set(1, k, 1);
      f.rotation.y = t * 1.5 + f.userData.phase;
    }

    // Chispas que suben y se reinician
    for (let i = 0; i < SPARKS; i++) {
      sparkLife[i] += 0.006 + (i % 5) * 0.001;
      if (sparkLife[i] > 1) sparkLife[i] = 0;
      const l = sparkLife[i];
      sparkPos[i * 3] = Math.sin(i * 12.3 + t) * 0.3 * l + Math.sin(i) * 0.2;
      sparkPos[i * 3 + 1] = 0.6 + l * 4;
      sparkPos[i * 3 + 2] = Math.cos(i * 7.1 + t) * 0.3 * l;
    }
    sparkGeo.attributes.position.needsUpdate = true;
  };
}

/** Tocones y caja para sentarse. */
function createSeats(scene) {
  SEATS.forEach(([x, z], i) => {
    const geo =
      i === SEATS.length - 1
        ? new THREE.BoxGeometry(0.9, 0.7, 0.9)
        : new THREE.CylinderGeometry(0.45, 0.5, 0.75, 6);
    const m = new THREE.Mesh(
      paintFaces(geo, (c, n) => varied(n.y > 0.9 ? COLORS.seatTop : COLORS.seatSide, 0.05)),
      flatMat
    );
    m.position.set(x, groundHeight(x, z) + 0.35, z);
    m.rotation.y = rand() * 3;
    m.castShadow = true;
    scene.add(m);
  });
}

/**
 * Crea el campamento: carpa, fogata y asientos.
 * @param {THREE.Scene} scene
 * @returns {{ update: (t: number) => void }} `update` anima la fogata.
 */
export function createCamp(scene) {
  createTent(scene);
  const update = createFire(scene);
  createSeats(scene);
  return { update };
}
