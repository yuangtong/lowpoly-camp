import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COLORS, SEED, SKY } from '../config.js';
import { glowTexture, jitter, paintFaces, varied } from '../utils/geometry.js';
import { hash3 } from '../utils/noise.js';
import { mulberry32, rand, range } from '../utils/rng.js';
import { groundHeight } from './terrain.js';

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

const DOME_RADIUS = 460;

/**
 * Cúpula con degradado (más clara en el horizonte, casi negra en el cenit),
 * luna visible y estrellas por todo el cielo. Va en un grupo que sigue a la
 * cámara para que siempre quede "en el infinito". Usa su propio RNG, así no
 * altera el resto de la escena.
 * @returns {{ group: THREE.Group, stars: THREE.Points }}
 */
function createDome(scene) {
  const group = new THREE.Group();
  scene.add(group);

  // Degradado por vértice
  const geo = new THREE.SphereGeometry(DOME_RADIUS, 24, 14);
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const horizon = new THREE.Color(SKY.horizon), middle = new THREE.Color(SKY.middle), zenith = new THREE.Color(SKY.zenith);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const h = THREE.MathUtils.clamp(p.getY(i) / DOME_RADIUS, 0, 1);
    if (h < 0.3) c.lerpColors(horizon, middle, h / 0.3);
    else c.lerpColors(middle, zenith, (h - 0.3) / 0.7);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const dome = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false })
  );
  dome.renderOrder = -1;
  group.add(dome);

  // Luna facetada + halo
  const moonGeo = new THREE.IcosahedronGeometry(15, 1).toNonIndexed();
  const mp = moonGeo.attributes.position;
  const moonColors = new Float32Array(mp.count * 3);
  for (let i = 0; i < mp.count; i += 3) {
    c.set(COLORS.moonDisc).multiplyScalar(0.82 + hash3(mp.getX(i), mp.getY(i), mp.getZ(i)) * 0.18);
    for (let k = 0; k < 3; k++) moonColors.set([c.r, c.g, c.b], (i + k) * 3);
  }
  moonGeo.setAttribute('color', new THREE.BufferAttribute(moonColors, 3));
  const moon = new THREE.Mesh(moonGeo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, toneMapped: false }));
  // Misma dirección horizontal que la luz, pero baja, para que se vea sobre el río
  moon.position.set(60, 28, 30).normalize().multiplyScalar(400);
  group.add(moon);
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(), color: COLORS.moonHalo, blending: THREE.AdditiveBlending,
      opacity: 0.55, fog: false, depthWrite: false, toneMapped: false,
    })
  );
  halo.position.copy(moon.position);
  halo.scale.setScalar(110);
  group.add(halo);

  // Estrellas por toda la cúpula (titilan en conjunto)
  const rng = mulberry32(SEED + 202);
  const pos = new Float32Array(SKY.extraStars * 3);
  for (let i = 0; i < SKY.extraStars; i++) {
    const a = rng() * Math.PI * 2;
    const y = 0.08 + rng() * 0.92; // solo sobre el horizonte
    const r = Math.sqrt(1 - y * y);
    pos.set([Math.cos(a) * r * 430, y * 430, Math.sin(a) * r * 430], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: COLORS.star, size: 1.4, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.7 })
  );
  group.add(stars);

  return { group, stars };
}

/**
 * Estrella fugaz: una línea que cruza el cielo cada cierto tiempo.
 * @returns {(dt: number) => void} Función de animación.
 */
function createShootingStar(group) {
  const pts = new Float32Array(6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  const mat = new THREE.LineBasicMaterial({ color: COLORS.star, transparent: true, opacity: 0, fog: false });
  const line = new THREE.Line(geo, mat);
  line.frustumCulled = false;
  group.add(line);

  const head = new THREE.Vector3(), dir = new THREE.Vector3();
  const [minWait, maxWait] = SKY.shootingStarEvery;
  let wait = minWait, life = 0;
  const DURATION = 0.9;

  return (dt) => {
    if (life <= 0) {
      wait -= dt;
      if (wait > 0) return;
      // Nace en lo alto, en cualquier dirección, y cae en diagonal
      const a = Math.random() * Math.PI * 2;
      head.set(Math.cos(a) * 300, 230 + Math.random() * 90, Math.sin(a) * 300);
      dir.set(-Math.sin(a), -0.35 - Math.random() * 0.25, Math.cos(a)).normalize();
      life = DURATION;
      wait = minWait + Math.random() * (maxWait - minWait);
    }
    life -= dt;
    head.addScaledVector(dir, 260 * dt);
    pts[0] = head.x; pts[1] = head.y; pts[2] = head.z;
    pts[3] = head.x - dir.x * 34; pts[4] = head.y - dir.y * 34; pts[5] = head.z - dir.z * 34;
    geo.attributes.position.needsUpdate = true;
    mat.opacity = Math.max(0, Math.sin((life / DURATION) * Math.PI)) * 0.9;
  };
}

/**
 * Luciérnagas que flotan entre los pinos.
 * @returns {(t: number) => void} Función de animación.
 */
function createFireflies(scene) {
  const rng = mulberry32(SEED + 303);
  const n = SKY.fireflies;
  const base = new Float32Array(n * 3);
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = -95 + rng() * 135, z = -52 + rng() * 68;
    base.set([x, groundHeight(x, z) + 0.7 + rng() * 2.2, z], i * 3);
  }
  pos.set(base);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: COLORS.firefly, size: 0.2, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, toneMapped: false,
  });
  scene.add(new THREE.Points(geo, mat));

  return (t) => {
    for (let i = 0; i < n; i++) {
      const k = i * 3;
      pos[k] = base[k] + Math.sin(t * 0.5 + i * 1.7) * 1.4;
      pos[k + 1] = base[k + 1] + Math.sin(t * 0.9 + i) * 0.5;
      pos[k + 2] = base[k + 2] + Math.cos(t * 0.4 + i * 2.3) * 1.4;
    }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = 0.65 + Math.sin(t * 3) * 0.3;
  };
}

/**
 * Crea el cielo: cúpula con degradado, luna, nubes, estrellas, estrellas
 * fugaces y luciérnagas.
 * @param {THREE.Scene} scene
 * @returns {{ update: (dt: number, t: number, camera: THREE.Camera) => void }}
 */
export function createSky(scene) {
  // Un solo material para todas las nubes
  const cloudMat = new THREE.MeshStandardMaterial({
    vertexColors: true, flatShading: true, roughness: 1,
    emissive: COLORS.cloudEmissive, emissiveIntensity: 0.8, fog: false,
  });
  const clouds = CLOUDS.map(([x, y, z, s]) => cloud(scene, cloudMat, x, y, z, s));
  createStars(scene);
  const dome = createDome(scene);
  const shootingStar = createShootingStar(dome.group);
  const fireflies = createFireflies(scene);

  return {
    update(dt, t, camera) {
      for (const c of clouds) {
        c.position.x += c.userData.speed * 0.02;
        if (c.position.x > CLOUD_WRAP_X) c.position.x = -CLOUD_WRAP_X;
      }
      // La cúpula acompaña a la cámara
      dome.group.position.set(camera.position.x, 0, camera.position.z);
      dome.stars.material.opacity = 0.6 + Math.sin(t * 1.7) * 0.15;
      shootingStar(dt);
      fireflies(t);
    },
  };
}
