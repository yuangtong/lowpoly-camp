import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------------------
// Utilidades: aleatorio con semilla + ruido determinista por posición
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(1987);
const range = (a, b) => a + rand() * (b - a);

// Hash 3D: el mismo vértice siempre recibe el mismo desplazamiento,
// así las caras compartidas no se "rompen" al deformar la malla.
function hash3(x, y, z) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

// Desplaza vértices un poco para quitar la perfección geométrica
function jitter(geo, amount, { keepTop = false, salt = 0 } = {}) {
  const p = geo.attributes.position;
  let maxY = -Infinity;
  for (let i = 0; i < p.count; i++) maxY = Math.max(maxY, p.getY(i));
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (keepTop && Math.abs(y - maxY) < 1e-4) continue;
    p.setXYZ(
      i,
      x + (hash3(x + salt, y, z) - 0.5) * amount,
      y + (hash3(y, z + salt, x) - 0.5) * amount * 0.6,
      z + (hash3(z, x, y + salt) - 0.5) * amount
    );
  }
  p.needsUpdate = true;
  return geo;
}

// Convierte a no-indexada y pinta cada cara de un color (look facetado)
function paintFaces(geo, colorFn) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.computeVertexNormals();
  const p = g.attributes.position;
  const n = g.attributes.normal;
  const colors = new Float32Array(p.count * 3);
  const c = new THREE.Vector3();
  const nn = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    c.set(
      (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3,
      (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3,
      (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3
    );
    nn.set(n.getX(i), n.getY(i), n.getZ(i));
    const col = colorFn(c, nn, i / 3);
    for (let k = 0; k < 3; k++) {
      colors[(i + k) * 3] = col.r;
      colors[(i + k) * 3 + 1] = col.g;
      colors[(i + k) * 3 + 2] = col.b;
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

const varied = (hex, amt = 0.06) => {
  const col = new THREE.Color(hex);
  const hsl = {};
  col.getHSL(hsl);
  return new THREE.Color().setHSL(
    hsl.h + (rand() - 0.5) * amt * 0.3,
    hsl.s,
    THREE.MathUtils.clamp(hsl.l + (rand() - 0.5) * amt, 0, 1)
  );
};

const flatMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  roughness: 0.95,
  metalness: 0,
});

// ---------------------------------------------------------------------------
// Renderer, escena, cámara
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const SKY = new THREE.Color('#16306a');
const scene = new THREE.Scene();
scene.background = SKY;
scene.fog = new THREE.Fog('#1a3570', 70, 230);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 600);
camera.position.set(3, 6.5, 40);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 8, -10);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 20;
controls.maxDistance = 75;
controls.minPolarAngle = Math.PI * 0.3;
controls.maxPolarAngle = Math.PI * 0.52;
controls.minAzimuthAngle = -0.7;
controls.maxAzimuthAngle = 0.7;
controls.update();

// ---------------------------------------------------------------------------
// Luces: luna fría + cielo + fogata cálida
// ---------------------------------------------------------------------------
scene.add(new THREE.HemisphereLight('#6d8fd6', '#132a1c', 1.1));

const moon = new THREE.DirectionalLight('#a9c2ff', 1.6);
moon.position.set(60, 90, 30);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
Object.assign(moon.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 1, far: 300 });
moon.shadow.bias = -0.0008;
scene.add(moon);

// ---------------------------------------------------------------------------
// Terreno: colinas suaves + río tallado + claro para el campamento
// ---------------------------------------------------------------------------
const FIRE = new THREE.Vector3(-8, 0, 8);
const WATER_Y = -1.3;
const riverZ = (x) => 25 + Math.sin(x * 0.07) * 2.5;

function groundHeight(x, z) {
  let h =
    Math.sin(x * 0.08) * 1.1 +
    Math.cos(z * 0.07 + 1.3) * 0.9 +
    Math.sin((x + z) * 0.15) * 0.45;
  h += Math.max(0, -z - 25) * 0.18; // sube hacia las montañas
  const d = Math.abs(z - riverZ(x)); // cauce del río
  if (d < 7) h -= (1 - d / 7) ** 1.5 * 4;
  const dc = Math.hypot(x - FIRE.x, z - FIRE.z); // claro plano
  if (dc < 11) h = THREE.MathUtils.lerp(0.4, h, THREE.MathUtils.smoothstep(dc, 4, 11));
  return h;
}

{
  const geo = new THREE.PlaneGeometry(300, 260, 100, 90);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, groundHeight(x, z) + (hash3(x, 0, z) - 0.5) * 0.7);
    p.setX(i, x + (hash3(z, 1, x) - 0.5) * 1.2);
    p.setZ(i, z + (hash3(x, 2, z) - 0.5) * 1.2);
  }
  const grass = ['#3f9a3a', '#4daa3e', '#368a34', '#58b544'];
  const ground = new THREE.Mesh(
    paintFaces(geo, (c, n) => {
      if (c.y < WATER_Y + 0.4) return varied('#2a4d3a', 0.05); // orilla
      if (n.y < 0.82) return varied('#2f7a32', 0.06); // pendientes
      return varied(grass[Math.floor(rand() * grass.length)], 0.08);
    }),
    flatMat
  );
  ground.receiveShadow = true;
  scene.add(ground);
}

// Río
const water = new THREE.Mesh(
  new THREE.PlaneGeometry(300, 18, 80, 8).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({
    color: '#1d3f8f',
    flatShading: true,
    roughness: 0.75,
    metalness: 0.0,
    emissive: '#0b1a44',
  })
);
water.position.set(0, WATER_Y, 25);
water.receiveShadow = true;
scene.add(water);
const waterBase = water.geometry.attributes.position.array.slice();

// ---------------------------------------------------------------------------
// Montañas con nieve
// ---------------------------------------------------------------------------
function mountain(x, z, radius, height, snowLine = 0.55) {
  let geo = new THREE.ConeGeometry(radius, height, 9, 7);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i);
    if (vy >= height / 2 - 1e-4) continue; // cima afilada
    const k = 1 + (hash3(vx, vy, vz) - 0.5) * 0.45;
    p.setXYZ(i, vx * k, vy + (hash3(vz, vx, vy) - 0.5) * height * 0.09, vz * k);
  }
  geo.translate(0, height / 2 - 3, 0);
  const rock = ['#3a4566', '#4a5677', '#323b58', '#56628a'];
  geo = paintFaces(geo, (c) => {
    const t = c.y / height + (rand() - 0.5) * 0.12;
    if (t > snowLine) return varied(rand() < 0.5 ? '#e3ecfa' : '#bfd0ee', 0.05);
    return varied(rock[Math.floor(rand() * rock.length)], 0.05);
  });
  const m = new THREE.Mesh(geo, flatMat);
  m.position.set(x, 0, z);
  m.rotation.y = rand() * Math.PI;
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
}
mountain(4, -70, 30, 52, 0.62); // pico central
mountain(62, -62, 42, 90, 0.5); // gigante a la derecha
mountain(30, -105, 30, 60, 0.55);
mountain(-48, -95, 26, 30, 0.6);
mountain(-80, -70, 22, 24, 0.6);
mountain(-25, -120, 30, 42, 0.58);
mountain(100, -110, 40, 75, 0.5);

// ---------------------------------------------------------------------------
// Pinos (geometría fusionada: tronco + 3 pisos de conos)
// ---------------------------------------------------------------------------
const pineGreens = ['#2f8f3a', '#3aa043', '#27803a', '#45b04a', '#1f6e33'];
function makePineGeometry(seed) {
  const parts = [];
  const trunk = jitter(new THREE.CylinderGeometry(0.28, 0.4, 1.6, 6), 0.05, { salt: seed });
  trunk.translate(0, 0.8, 0);
  parts.push(paintFaces(trunk, () => varied('#8f4a2c', 0.05)));
  const tiers = 3;
  const base = pineGreens[seed % pineGreens.length];
  for (let t = 0; t < tiers; t++) {
    const r = 2.0 - t * 0.5;
    const h = 3.0 - t * 0.4;
    const cone = jitter(new THREE.ConeGeometry(r, h, 7, 1), 0.3, { keepTop: true, salt: seed + t });
    cone.translate(0, 1.2 + h / 2 + t * 1.55, 0);
    parts.push(paintFaces(cone, (c, n) => varied(n.y < 0 ? '#14421f' : base, 0.09)));
  }
  return mergeGeometries(parts);
}
const pineVariants = Array.from({ length: 8 }, (_, i) => makePineGeometry(i * 7 + 3));

function pine(x, z, s = 1) {
  const m = new THREE.Mesh(pineVariants[Math.floor(rand() * pineVariants.length)], flatMat);
  m.position.set(x, groundHeight(x, z) - 0.2, z);
  m.scale.set(s * range(0.85, 1.15), s * range(0.9, 1.25), s * range(0.85, 1.15));
  m.rotation.y = rand() * Math.PI * 2;
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
}

// Bosque disperso
for (let i = 0; i < 260; i++) {
  const x = range(-110, 110);
  const z = range(-55, 16);
  if (Math.hypot(x - FIRE.x, z - FIRE.z) < 10) continue;
  if (Math.hypot(x + 15, z - 12) < 8) continue; // frente a la carpa
  if (Math.abs(z - riverZ(x)) < 8) continue;
  if (Math.abs(x - 3) < 6 && z > 0) continue; // deja ver el campamento
  pine(x, z, range(0.8, 1.5) * (z < -25 ? 1.3 : 1));
}
// Pinos "héroe" en primer plano, como en la referencia
[
  [17, 13, 2.1], [22, 9, 2.4], [14, 6, 1.7], [27, 15, 2.6], [32, 5, 2.2],
  [-31, 15, 1.8], [-29, 6, 2.0], [-21, 3, 1.4], [3, -2, 1.5], [7, -6, 1.6],
  [-2, -4, 1.3], [10, 1, 1.4],
].forEach(([x, z, s]) => pine(x, z, s));

// ---------------------------------------------------------------------------
// Rocas
// ---------------------------------------------------------------------------
function rock(x, z, s, sink = 0.3) {
  let geo = jitter(new THREE.DodecahedronGeometry(1, 0), 0.35, { salt: x + z });
  geo = paintFaces(geo, () => varied(rand() < 0.5 ? '#3d4a6a' : '#4f5d82', 0.06));
  const m = new THREE.Mesh(geo, flatMat);
  m.position.set(x, groundHeight(x, z) + s * (1 - sink) * 0.5, z);
  m.scale.set(s * 1.4, s * 0.8, s);
  m.rotation.set(rand(), rand() * 6, rand() * 0.3);
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
}
rock(9, 25, 3.2, 0.2); // gran roca en el río
rock(-14, 31, 4.5, 0.3);
rock(-3, 30, 2.2);
rock(26, 22, 2.0);
rock(-30, 19, 1.6);
rock(-35, -10, 2.4);

// ---------------------------------------------------------------------------
// Campamento: carpa, fogata, troncos
// ---------------------------------------------------------------------------
{
  // Carpa: prisma triangular, frente naranja
  let geo = new THREE.CylinderGeometry(1.9, 1.9, 4.2, 3);
  geo.rotateX(Math.PI / 2);
  geo.rotateZ(Math.PI);
  geo.translate(0, 0.95, 0);
  geo = paintFaces(geo, (c, n) => {
    if (n.z > 0.9) return new THREE.Color('#f08a3c');
    return varied('#2a3d82', 0.04);
  });
  const tent = new THREE.Mesh(geo, flatMat);
  const tx = -15, tz = 9.5;
  tent.position.set(tx, groundHeight(tx, tz), tz);
  tent.rotation.y = 0.55;
  tent.castShadow = true;
  scene.add(tent);
}

const fireY = groundHeight(FIRE.x, FIRE.z);
const fire = new THREE.Group();
fire.position.set(FIRE.x, fireY, FIRE.z);
scene.add(fire);

// Troncos cruzados
for (let i = 0; i < 4; i++) {
  const log = new THREE.Mesh(
    paintFaces(new THREE.CylinderGeometry(0.16, 0.18, 1.6, 5), () => varied('#7a3a1e', 0.05)),
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
  const st = new THREE.Mesh(
    paintFaces(jitter(new THREE.DodecahedronGeometry(0.22, 0), 0.08), () => varied('#5a6078', 0.06)),
    flatMat
  );
  st.position.set(Math.cos(a) * 1.05, 0.1, Math.sin(a) * 1.05);
  fire.add(st);
}
// Llamas
const flameMats = ['#fff3a0', '#ffc933', '#ff8a1f'].map(
  (c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false })
);
const flames = [];
[
  [0, 0, 0.45, 1.5, 0],
  [0.22, 0.1, 0.32, 1.1, 1],
  [-0.2, -0.12, 0.3, 1.0, 1],
  [0.05, 0.25, 0.25, 0.8, 2],
  [-0.08, -0.25, 0.22, 0.75, 2],
].forEach(([x, z, r, h, mi], i) => {
  const f = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5).translate(0, h / 2, 0), flameMats[mi]);
  f.position.set(x, 0.25, z);
  f.userData = { h, phase: i * 1.7 };
  fire.add(f);
  flames.push(f);
});

// Luz de la fogata
const fireLight = new THREE.PointLight('#ffa040', 160, 34, 1.6);
fireLight.position.set(0, 1.6, 0);
fire.add(fireLight);

// Halo de luz amarilla sobre el pasto (sprite aditivo)
function glowTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,230,120,0.9)');
  grd.addColorStop(0.35, 'rgba(255,190,60,0.35)');
  grd.addColorStop(1, 'rgba(255,150,40,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
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
const fireHalo = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6, toneMapped: false,
  })
);
fireHalo.scale.set(5, 5, 1);
fireHalo.position.y = 1;
fire.add(fireHalo);

// Chispas
const SPARKS = 40;
const sparkGeo = new THREE.BufferGeometry();
const sparkPos = new Float32Array(SPARKS * 3);
const sparkLife = new Float32Array(SPARKS).map(() => Math.random());
sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
const sparks = new THREE.Points(
  sparkGeo,
  new THREE.PointsMaterial({
    color: '#ffb347', size: 0.12, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  })
);
fire.add(sparks);

// Tocones y cajas para sentarse
[[-4.5, 9.5], [-9, 4.6], [-11.5, 10.5]].forEach(([x, z], i) => {
  const geo =
    i === 2
      ? new THREE.BoxGeometry(0.9, 0.7, 0.9)
      : new THREE.CylinderGeometry(0.45, 0.5, 0.75, 6);
  const m = new THREE.Mesh(paintFaces(geo, (c, n) => varied(n.y > 0.9 ? '#d9935c' : '#b5582b', 0.05)), flatMat);
  m.position.set(x, groundHeight(x, z) + 0.35, z);
  m.rotation.y = rand() * 3;
  m.castShadow = true;
  scene.add(m);
});

// ---------------------------------------------------------------------------
// Nubes low-poly
// ---------------------------------------------------------------------------
const clouds = [];
function cloud(x, y, z, s) {
  const parts = [];
  const n = 5 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const r = range(2.2, 4.2) * (1 - Math.abs(i - n / 2) / n);
    const g = jitter(new THREE.IcosahedronGeometry(r, 1), 0.5, { salt: i + x });
    g.scale(1.3, 0.5, 1);
    g.translate((i - n / 2) * 3.0, range(-0.4, 0.8), range(-1, 1));
    parts.push(paintFaces(g, (c, nrm) => varied(nrm.y > 0.2 ? '#f2f5fc' : '#b7c4e0', 0.05)));
  }
  const m = new THREE.Mesh(
    mergeGeometries(parts),
    new THREE.MeshStandardMaterial({
      vertexColors: true, flatShading: true, roughness: 1,
      emissive: '#55679a', emissiveIntensity: 0.8, fog: false,
    })
  );
  m.position.set(x, y, z);
  m.scale.setScalar(s);
  m.userData.speed = range(0.4, 0.9);
  scene.add(m);
  clouds.push(m);
}
cloud(-28, 42, -45, 1.5);
cloud(42, 50, -40, 1.1);
cloud(8, 38, -55, 0.9);
cloud(80, 58, -70, 1.4);

// ---------------------------------------------------------------------------
// Estrellas
// ---------------------------------------------------------------------------
{
  const N = 160;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const th = range(-1.2, 1.2);
    const ph = range(0.18, 1.2);
    const R = 320;
    pos.set([Math.sin(th) * Math.cos(ph) * R, Math.sin(ph) * R, -Math.cos(th) * Math.cos(ph) * R], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(
    new THREE.Points(
      g,
      new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 })
    )
  );
  // Unas pocas estrellas grandes, como en la imagen
  const big = new THREE.SpriteMaterial({ map: glowTex, color: '#ffffff', fog: false, depthWrite: false });
  [[-60, 120, -260], [20, 150, -280], [-40, 70, -250], [110, 140, -260]].forEach(([x, y, z]) => {
    const s = new THREE.Sprite(big);
    s.position.set(x, y, z);
    s.scale.setScalar(5);
    scene.add(s);
  });
}

// ---------------------------------------------------------------------------
// Animación
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
function animate() {
  const t = clock.getElapsedTime();

  // Fogata parpadeante
  const flicker = 0.75 + Math.sin(t * 13) * 0.1 + Math.sin(t * 7.3) * 0.1 + Math.random() * 0.08;
  fireLight.intensity = 160 * flicker;
  groundGlow.material.opacity = 0.45 + flicker * 0.15;
  flames.forEach((f) => {
    const k = 0.85 + Math.sin(t * 9 + f.userData.phase) * 0.15 + Math.random() * 0.05;
    f.scale.set(1, k, 1);
    f.rotation.y = t * 1.5 + f.userData.phase;
  });

  // Chispas
  for (let i = 0; i < SPARKS; i++) {
    sparkLife[i] += 0.006 + (i % 5) * 0.001;
    if (sparkLife[i] > 1) sparkLife[i] = 0;
    const l = sparkLife[i];
    sparkPos[i * 3] = Math.sin(i * 12.3 + t) * 0.3 * l + Math.sin(i) * 0.2;
    sparkPos[i * 3 + 1] = 0.6 + l * 4;
    sparkPos[i * 3 + 2] = Math.cos(i * 7.1 + t) * 0.3 * l;
  }
  sparkGeo.attributes.position.needsUpdate = true;

  // Olas suaves en el río
  const wp = water.geometry.attributes.position;
  for (let i = 0; i < wp.count; i++) {
    const x = waterBase[i * 3], z = waterBase[i * 3 + 2];
    wp.setY(i, Math.sin(x * 0.25 + t * 1.2) * 0.12 + Math.cos(z * 0.6 + x * 0.1 + t) * 0.1);
  }
  wp.needsUpdate = true;
  water.geometry.computeVertexNormals();

  // Nubes a la deriva
  clouds.forEach((c) => {
    c.position.x += c.userData.speed * 0.02;
    if (c.position.x > 130) c.position.x = -130;
  });

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
