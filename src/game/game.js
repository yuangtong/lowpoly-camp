import { LOOT, PARTY, PLAYER } from '../config.js';
import { playBirthdaySong, playCoin, playHit } from './audio.js';
import { createCoins } from './collectibles.js';
import { createHud } from './hud.js';

const SHAKE_TIME = 0.4;

/**
 * Reglas del juego: mochila (monedas y madera), golpear árboles y la
 * sorpresa al llegar a la fiesta.
 * @param {import('three').Scene} scene
 * @param {{
 *   player: { position: import('three').Vector3, punch: () => void },
 *   input: { action: boolean },
 *   party: { celebrate: () => void },
 *   trees: { x: number, z: number, r: number, mesh: import('three').Mesh, wood: number }[],
 * }} deps
 * @returns {{ update: (dt: number, t: number) => void }}
 */
export function createGame(scene, { player, input, party, trees }) {
  const hud = createHud();
  const coins = createCoins(scene);
  const backpack = { coins: 0, wood: 0 };
  let cooldown = 0;
  let actionWasDown = false;
  let shaking = null; // árbol que se está sacudiendo
  let shakeLeft = 0;
  let arrived = false;

  hud.setObjective('Sigue las monedas… algo te espera en el bosque');
  hud.setBackpack(0, coins.total, 0);

  /** Golpea el árbol más cercano, si hay alguno al alcance. */
  function hitNearestTree() {
    const p = player.position;
    let best = null;
    let bestGap = 1.1; // alcance del brazo
    for (let i = 0; i < trees.length; i++) {
      const tree = trees[i];
      const gap = Math.hypot(tree.x - p.x, tree.z - p.z) - tree.r - PLAYER.radius;
      if (gap < bestGap) {
        bestGap = gap;
        best = tree;
      }
    }
    player.punch();
    if (!best) return;
    playHit();
    if (shaking) shaking.mesh.rotation.z = 0;
    shaking = best;
    shakeLeft = SHAKE_TIME;
    if (best.wood > 0) {
      best.wood--;
      backpack.wood++;
      hud.setBackpack(backpack.coins, coins.total, backpack.wood);
      hud.toast('+1 madera');
    } else {
      hud.toast('A este árbol ya no le quedan ramas sueltas');
    }
  }

  function update(dt, t) {
    // Monedas
    const picked = coins.update(t, player.position);
    if (picked > 0) {
      backpack.coins += picked;
      hud.setBackpack(backpack.coins, coins.total, backpack.wood);
      playCoin();
    }

    // Golpear (una vez por pulsación, con un pequeño descanso)
    cooldown -= dt;
    if (input.action && !actionWasDown && cooldown <= 0) {
      cooldown = LOOT.hitCooldown;
      hitNearestTree();
    }
    actionWasDown = input.action;

    // Sacudida del árbol golpeado
    if (shaking) {
      shakeLeft -= dt;
      if (shakeLeft <= 0) {
        shaking.mesh.rotation.z = 0;
        shaking = null;
      } else {
        shaking.mesh.rotation.z = Math.sin(shakeLeft * 45) * 0.06 * (shakeLeft / SHAKE_TIME);
      }
    }

    // ¡Sorpresa! al entrar al claro de la fiesta
    if (!arrived) {
      const d = Math.hypot(player.position.x - PARTY.x, player.position.z - PARTY.z);
      if (d < PARTY.triggerRadius) {
        arrived = true;
        party.celebrate();
        playBirthdaySong();
        hud.celebrate(`¡Feliz cumpleaños, ${PARTY.name}!`);
        hud.setObjective('¡Encontraste la fiesta! Sigue explorando el bosque');
      }
    }
  }

  return { update };
}
