import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COLORS } from '../config.js';
import { glowTexture, jitter, paintFaces, varied } from '../utils/geometry.js';
import { rand, range } from '../utils/rng.js';

/** Nubes: [x, y, z, escala]. */
const CLOUDS = [
  [-28, 42, -45, 1.5],
  [42, 50, -40, 1.1],
  [8, 38, -55, 0.9],
  [80, 58, -70, 1.4],
];

/** Estrellas grandes: [x, y, z]. */
const BIG_STARS = [[-60, 120, -260], [20, 150, -280], [-40, 70, -250], [110, 140, -260]];

const STAR_COUNT = 160;
const STAR_RADIUS = 320;
/** Las nubes reaparecen al otro lado al pasar este límite en X. */
const CLOUD_WRAP_X = 130;

/**
 * Fondo, niebla y luces: cielo hemisférico + luna direccional con sombras.
 * No usa el RNG, así que puede llamarse en cualquier momento.
 * @param {THREE.Scene} scene
 */
export function createAtmosphere(scene) {
  scene.background = new THREE.Color(COLORS.sky);
  scene.fog = new THREE.Fog(COLORS.fog, 70, 230);

  scene.add(new THREE.HemisphereLight(COLORS.hemiSky, COLORS.hemiGround, 1.1));

  const moon = new THREE.DirectionalLight(COLORS.moon, 1.6);
  moon.position.set(60, 90, 30);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 1, far: 300 });
  moon.shadow.bias = -0.0008;
  scene.add(moon);
}

/** Nube low-poly: varias esferas facetadas y aplastadas, fusionadas. */
function cloud(scene, material, x, y, z, s) {
  const parts = [];
  const n = 5 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const r = range(2.2, 4.2) * (1 - Math.abs(i - n / 2) / n);
    const g = jitter(new THREE.IcosahedronGeometry(r, 1), 0.5, { salt: i + x });
    g.scale(1.3, 0.5, 1);
    g.translate((i - n / 2) * 3.0, range(-0.4, 0.8), range(-1, 1));
    parts.push(paintFaces(g, (c, nrm) => varied(nrm.y > 0.2 ? COLORS.cloudTop : COLORS.cloudBottom, 0.05)));
  }
  const m = new THREE.Mesh(mergeGeometries(parts), material);
  m.position.set(x, y, z);
  m.scale.setScalar(s);
  m.userData.speed = range(0.4, 0.9);
  scene.add(m);
  return m;
}

function createStars(scene) {
  const pos = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    const th = range(-1.2, 1.2);
    const ph = range(0.18, 1.2);
    pos[i * 3] = Math.sin(th) * Math.cos(ph) * STAR_RADIUS;
    pos[i * 3 + 1] = Math.sin(ph) * STAR_RADIUS;
    pos[i * 3 + 2] = -Math.cos(th) * Math.cos(ph) * STAR_RADIUS;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(
    new THREE.Points(
      g,
      new THREE.PointsMaterial({
        color: COLORS.star, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8,
      })
    )
  );

  // Unas pocas estrellas grandes
  const big = new THREE.SpriteMaterial({ map: glowTexture(), color: COLORS.star, fog: false, depthWrite: false });
  for (const [x, y, z] of BIG_STARS) {
    const s = new THREE.Sprite(big);
    s.position.set(x, y, z);
    s.scale.setScalar(5);
    scene.add(s);
  }
}

/**
 * Crea nubes y estrellas.
 * @param {THREE.Scene} scene
 * @returns {{ update: () => void }} `update` mueve las nubes un paso por frame.
 */
export function createSky(scene) {
  // Un solo material para todas las nubes
  const cloudMat = new THREE.MeshStandardMaterial({
    vertexColors: true, flatShading: true, roughness: 1,
    emissive: COLORS.cloudEmissive, emissiveIntensity: 0.8, fog: false,
  });
  const clouds = CLOUDS.map(([x, y, z, s]) => cloud(scene, cloudMat, x, y, z, s));
  createStars(scene);

  return {
    update() {
      for (const c of clouds) {
        c.position.x += c.userData.speed * 0.02;
        if (c.position.x > CLOUD_WRAP_X) c.position.x = -CLOUD_WRAP_X;
      }
    },
  };
}
