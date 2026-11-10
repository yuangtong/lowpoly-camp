/**
 * Hash 3D determinista: la misma posición siempre da el mismo valor, así los
 * vértices compartidos no se "rompen" al deformar una malla.
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {number} Valor en [0, 1).
 */
export function hash3(x, y, z) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return s - Math.floor(s);
}
