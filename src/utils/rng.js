import { SEED } from '../config.js';

/**
 * Generador pseudoaleatorio con semilla (mulberry32).
 * @param {number} seed Semilla entera.
 * @returns {() => number} Función que devuelve un número en [0, 1).
 */
export function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * RNG compartido por todo el mundo. La escena depende del ORDEN de las
 * llamadas: si cambias el orden en que se construyen los módulos, cambia el
 * resultado.
 * @type {() => number}
 */
export const rand = mulberry32(SEED);

/**
 * Número aleatorio en [a, b) usando el RNG compartido.
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export const range = (a, b) => a + rand() * (b - a);

/**
 * Elige un elemento al azar de una lista usando el RNG compartido.
 * @template T
 * @param {T[]} list
 * @returns {T}
 */
export const pick = (list) => list[Math.floor(rand() * list.length)];
