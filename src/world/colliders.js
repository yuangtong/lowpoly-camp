// Colisiones simples: cada obstáculo es un círculo en el plano XZ.
// Los módulos del mundo registran los suyos al construirse.

/** @type {{ x: number, z: number, r: number }[]} */
const colliders = [];

/**
 * Registra un obstáculo circular.
 * @param {number} x
 * @param {number} z
 * @param {number} r Radio.
 * @returns {{ x: number, z: number, r: number }} El obstáculo (para poder quitarlo luego).
 */
export function addCollider(x, z, r) {
  const collider = { x, z, r };
  colliders.push(collider);
  return collider;
}

/**
 * Quita un obstáculo registrado (por ejemplo, una gata que empieza a seguirte).
 * @param {{ x: number, z: number, r: number }} collider El objeto que devolvió `addCollider`.
 */
export function removeCollider(collider) {
  const i = colliders.indexOf(collider);
  if (i !== -1) colliders.splice(i, 1);
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
