import * as THREE from 'three';
import { hash3 } from './noise.js';
import { rand } from './rng.js';

/**
 * Desplaza los vértices un poco para quitar la perfección geométrica.
 * Modifica la geometría recibida.
 * @param {THREE.BufferGeometry} geo
 * @param {number} amount Desplazamiento máximo (en Y se aplica el 60 %).
 * @param {{ keepTop?: boolean, salt?: number }} [options] `keepTop` deja
 *   intactos los vértices más altos; `salt` varía el patrón de ruido.
 * @returns {THREE.BufferGeometry} La misma geometría.
 */
export function jitter(geo, amount, { keepTop = false, salt = 0 } = {}) {
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

/**
 * Convierte la geometría a no-indexada y pinta cada cara de un solo color
 * (look facetado). Requiere un material con `vertexColors: true`.
 * @param {THREE.BufferGeometry} geo
 * @param {(center: THREE.Vector3, normal: THREE.Vector3, face: number) => THREE.Color} colorFn
 *   Recibe el centro, la normal y el índice de la cara; devuelve su color.
 *   Los vectores se reutilizan entre llamadas: no los guardes.
 * @returns {THREE.BufferGeometry} Geometría no-indexada con atributo `color`.
 */
export function paintFaces(geo, colorFn) {
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

/**
 * Devuelve una variación aleatoria (tono y luminosidad) de un color base.
 * Consume dos valores del RNG compartido.
 * @param {string} hex Color base.
 * @param {number} [amt] Intensidad de la variación.
 * @returns {THREE.Color}
 */
export function varied(hex, amt = 0.06) {
  const col = new THREE.Color(hex);
  const hsl = {};
  col.getHSL(hsl);
  return new THREE.Color().setHSL(
    hsl.h + (rand() - 0.5) * amt * 0.3,
    hsl.s,
    THREE.MathUtils.clamp(hsl.l + (rand() - 0.5) * amt, 0, 1)
  );
}

/** Material low-poly compartido por casi todas las mallas (color por cara). */
export const flatMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  roughness: 0.95,
  metalness: 0,
});

let glowTex = null;

/**
 * Textura de resplandor radial cálido (se crea una sola vez y se comparte).
 * @returns {THREE.CanvasTexture}
 */
export function glowTexture() {
  if (glowTex) return glowTex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,230,120,0.9)');
  grd.addColorStop(0.35, 'rgba(255,190,60,0.35)');
  grd.addColorStop(1, 'rgba(255,150,40,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(cv);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}
