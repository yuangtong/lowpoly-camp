import * as THREE from 'three';
import { COLORS, PARTY } from '../config.js';
import { glowTexture } from '../utils/geometry.js';
import { groundHeight } from './terrain.js';

const BURSTS = 6;
const PER_BURST = 70;
const LIFE = 1.7;
const GRAVITY = 3.2;

/**
 * Fuegos artificiales sobre la fiesta. Todas las chispas viven en una sola
 * nube de puntos aditiva; una chispa apagada simplemente es negra.
 * @param {THREE.Scene} scene
 * @returns {{ start: () => void, update: (dt: number) => void }}
 */
export function createFireworks(scene) {
  const total = BURSTS * PER_BURST;
  const pos = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  const vel = new Float32Array(total * 3);
  const baseY = groundHeight(PARTY.x, PARTY.z);
  const color = new THREE.Color();
  // Estado por estallido: edad (< 0 = esperando), color y si está encendido
  const age = new Float32Array(BURSTS);
  const tint = new Float32Array(BURSTS * 3);
  const live = new Uint8Array(BURSTS);
  let running = false;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      map: glowTexture(), vertexColors: true, size: 3.6, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false, fog: false,
    })
  );
  points.frustumCulled = false;
  points.visible = false;
  scene.add(points);

  /** Lanza el estallido `b` en un punto al azar sobre el claro. */
  function explode(b) {
    // En un anillo alrededor del claro, para verlos contra el cielo y no encima
    const ring = Math.random() * Math.PI * 2;
    const far = 38 + Math.random() * 26;
    const cx = PARTY.x + Math.cos(ring) * far;
    const cy = baseY + 13 + Math.random() * 12; // bajos: la cámara casi no mira hacia arriba
    const cz = PARTY.z + Math.sin(ring) * far;
    color.set(COLORS.festive[Math.floor(Math.random() * COLORS.festive.length)]);
    tint[b * 3] = color.r;
    tint[b * 3 + 1] = color.g;
    tint[b * 3 + 2] = color.b;
    const speed = 7 + Math.random() * 5;
    for (let i = 0; i < PER_BURST; i++) {
      const k = (b * PER_BURST + i) * 3;
      // Dirección uniforme sobre la esfera
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const s = speed * (0.75 + Math.random() * 0.25);
      pos[k] = cx;
      pos[k + 1] = cy;
      pos[k + 2] = cz;
      vel[k] = Math.cos(a) * r * s;
      vel[k + 1] = u * s;
      vel[k + 2] = Math.sin(a) * r * s;
    }
    age[b] = 0;
  }

  return {
    start() {
      running = true;
      points.visible = true;
      for (let b = 0; b < BURSTS; b++) age[b] = -b * 0.45; // escalonados
    },
    update(dt) {
      if (!running) return;
      for (let b = 0; b < BURSTS; b++) {
        age[b] += dt;
        if (age[b] < 0) continue;
        if (!live[b]) {
          explode(b); // terminó la espera
          live[b] = 1;
        } else if (age[b] >= LIFE) {
          // Se apaga y espera un rato al azar antes del siguiente
          live[b] = 0;
          age[b] = -0.3 - Math.random() * 1.6;
          col.fill(0, b * PER_BURST * 3, (b + 1) * PER_BURST * 3);
          continue;
        }
        // Más de 1 al inicio: con mezcla aditiva el centro del destello se satura
        const fade = (1 - age[b] / LIFE) * 3;
        const drag = Math.exp(-1.4 * dt);
        for (let i = 0; i < PER_BURST; i++) {
          const k = (b * PER_BURST + i) * 3;
          vel[k] *= drag;
          vel[k + 1] = vel[k + 1] * drag - GRAVITY * dt;
          vel[k + 2] *= drag;
          pos[k] += vel[k] * dt;
          pos[k + 1] += vel[k + 1] * dt;
          pos[k + 2] += vel[k + 2] * dt;
          col[k] = tint[b * 3] * fade;
          col[k + 1] = tint[b * 3 + 1] * fade;
          col[k + 2] = tint[b * 3 + 2] * fade;
        }
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}
