import { ITEMS, LOOT, PARTY, PLAYER } from '../config.js';
import { playBirthdaySong, playCoin, playHit, playMeow } from './audio.js';
import { createCoins } from './collectibles.js';
import { createHud } from './hud.js';
import { createItems } from './items.js';

const SHAKE_TIME = 0.4;
/** Distancia a la que se puede hablar con alguien. */
const TALK_RANGE = 2.6;
/** Alcance del brazo al golpear un árbol (medido desde el tronco). */
const HIT_REACH = 1.1;

/**
 * Reglas del juego: mochila, la tecla de acción (hablar, dar, acariciar,
 * golpear), adopción de las gatas, goles y la sorpresa de la fiesta.
 * @param {import('three').Scene} scene
 * @param {{
 *   player: { position: import('three').Vector3, punch: () => void },
 *   input: { action: boolean },
 *   party: { guests: any, football: any, onGoal: (() => void) | null, celebrate: () => void },
 *   trees: { x: number, z: number, r: number, mesh: import('three').Mesh, wood: number }[],
 * }} deps
 * @returns {{ update: (dt: number, t: number) => void }}
 */
export function createGame(scene, { player, input, party, trees }) {
  const hud = createHud();
  const coins = createCoins(scene);
  const items = createItems(scene);
  const backpack = { coins: 0, wood: 0, items: new Set(), goals: 0 };
  const { cats, footballers } = party.guests;
  const followers = []; // gatas adoptadas, en orden
  let cooldown = 0;
  let actionWasDown = false;
  let shaking = null; // árbol que se está sacudiendo
  let shakeLeft = 0;
  let arrived = false;

  hud.setObjective('Sigue las monedas… algo te espera en el bosque');
  hud.setBackpack(0, coins.total, 0);

  // Para pruebas: `?items=fish,yarn` en la URL empieza con esos objetos
  for (const id of (new URLSearchParams(location.search).get('items') ?? '').split(',')) {
    if (ITEMS[id]) backpack.items.add(id);
  }

  /** Actualiza la línea extra de la mochila. */
  function refreshExtras() {
    const parts = [];
    for (const id of backpack.items) parts.push(ITEMS[id].name);
    if (followers.length) parts.push(`Gatas ${followers.length}/${cats.length}`);
    if (backpack.goals) parts.push(`Goles ${backpack.goals}`);
    hud.setExtras(parts.join(' · '));
  }

  refreshExtras();

  // ------------------------------------------------------------ Personas y gatas
  // Cada interactuable: posición, texto de la indicación y qué pasa al pulsar.
  const interactables = [];

  for (const cat of cats) {
    const { def } = cat;
    const item = ITEMS[def.wants];
    let asked = 0;
    let purred = 0;
    interactables.push({
      position: cat.position,
      label: () =>
        cat.adopted ? `Acariciar a ${def.name}` : backpack.items.has(def.wants) ? `Dar ${item.name.toLowerCase()} a ${def.name}` : `Hablar con ${def.name}`,
      verb: () => (cat.adopted ? 'Acariciar' : backpack.items.has(def.wants) ? 'Dar' : 'Hablar'),
      act() {
        playMeow();
        if (cat.adopted) {
          cat.say(def.purrs[purred++ % def.purrs.length]);
        } else if (backpack.items.has(def.wants)) {
          // Se ganó su cariño: sigue al jugador (o a la gata que ya iba detrás)
          backpack.items.delete(def.wants);
          cat.adopt(followers.length ? followers[followers.length - 1].position : player.position);
          followers.push(cat);
          cat.say(def.thanks);
          hud.toast(`¡${def.name} ahora te sigue!`);
          refreshExtras();
          if (followers.length === cats.length) hud.setObjective('¡Las dos gatas te siguen! Llévalas a pasear');
        } else {
          cat.say(def.asks[asked++ % def.asks.length]);
        }
      },
    });
  }

  for (const f of footballers) {
    interactables.push({
      position: f.position,
      label: () => `Hablar con ${f.def.name}`,
      verb: () => 'Hablar',
      act: f.talk,
    });
  }

  // Pelota: se puede empujar caminando o patear con la tecla de acción
  const ball = party.football;
  interactables.push({
    position: ball.position,
    range: 1.5,
    label: () => 'Patear la pelota',
    verb: () => 'Patear',
    act() {
      player.punch();
      playHit();
      ball.kick(ball.position.x - player.position.x, ball.position.z - player.position.z, 11);
    },
  });

  party.onGoal = () => {
    backpack.goals++;
    refreshExtras();
    hud.toast('¡GOOOL!');
    playCoin();
  };

  /** Interactuable más cercano dentro del alcance, o `null`. */
  function nearestInteractable() {
    const p = player.position;
    let best = null;
    let bestDist = Infinity;
    for (let i = 0; i < interactables.length; i++) {
      const it = interactables[i];
      const d = Math.hypot(it.position.x - p.x, it.position.z - p.z);
      if (d < (it.range ?? TALK_RANGE) && d < bestDist) {
        bestDist = d;
        best = it;
      }
    }
    return best;
  }

  /** Árbol más cercano al alcance del brazo, o `null`. */
  function nearestTree() {
    const p = player.position;
    let best = null;
    let bestGap = HIT_REACH;
    for (let i = 0; i < trees.length; i++) {
      const tree = trees[i];
      const gap = Math.hypot(tree.x - p.x, tree.z - p.z) - tree.r - PLAYER.radius;
      if (gap < bestGap) {
        bestGap = gap;
        best = tree;
      }
    }
    return best;
  }

  function hitTree(tree) {
    player.punch();
    playHit();
    if (shaking) shaking.mesh.rotation.z = 0;
    shaking = tree;
    shakeLeft = SHAKE_TIME;
    if (tree.wood > 0) {
      tree.wood--;
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

    // Objetos especiales
    const found = items.update(t, player.position);
    if (found) {
      backpack.items.add(found);
      refreshExtras();
      playCoin();
      const cat = cats.find((c) => c.def.wants === found);
      hud.toast(`¡Encontraste: ${ITEMS[found].name}!${cat ? ` Llévaselo a ${cat.def.name}` : ''}`);
    }

    // Tecla de acción: lo que tengas delante decide qué hace
    const target = nearestInteractable();
    const tree = target ? null : nearestTree();
    if (target) hud.setPrompt(target.label(), target.verb());
    else if (tree) hud.setPrompt('Golpear árbol', 'Golpear');
    else hud.setPrompt(null);

    cooldown -= dt;
    if (input.action && !actionWasDown && cooldown <= 0) {
      cooldown = LOOT.hitCooldown;
      if (target) target.act();
      else if (tree) hitTree(tree);
      else player.punch();
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
        hud.setObjective('¡Encontraste la fiesta! Habla con los invitados: las gatas quieren algo');
      }
    }
  }

  return { update };
}
