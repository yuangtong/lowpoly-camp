// Colisiones simples: cada obstáculo es un círculo en el plano XZ.
// Los módulos del mundo registran los suyos al construirse.

/** @type {{ x: number, z: number, r: number }[]} */
const colliders = [];

/**
 * Registra un obstáculo circular.
 * @param {number} x
 * @param {number} z
 * @param {number} r Radio.
 */
export function addCollider(x, z, r) {
  colliders.push({ x, z, r });
}

/**
 * Empuja una posición fuera de los obstáculos que toca. Modifica `pos`.
 * @param {{ x: number, z: number }} pos
 * @param {number} radius Radio del objeto que se mueve.
 */
export function resolveCollisions(pos, radius) {
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    const dx = pos.x - c.x;
    const dz = pos.z - c.z;
    const min = c.r + radius;
    const d2 = dx * dx + dz * dz;
    if (d2 >= min * min) continue;
    const d = Math.sqrt(d2);
    if (d < 1e-5) {
      pos.x = c.x + min; // justo en el centro: sal por un lado cualquiera
    } else {
      pos.x = c.x + (dx / d) * min;
      pos.z = c.z + (dz / d) * min;
    }
  }
}
