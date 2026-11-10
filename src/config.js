// Configuración central: semilla, medidas del mundo y paleta de colores.
// Cualquier valor "mágico" de la escena debería vivir aquí.

/** Semilla del RNG: cambiarla genera otro bosque. */
export const SEED = 1987;

/** Medidas y posiciones clave del mundo. */
export const WORLD = {
  /** Tamaño del terreno (ancho en X, fondo en Z). */
  width: 300,
  depth: 260,
  /** Altura del plano de agua. */
  waterY: -1.3,
  /** Centro de la fogata (x, z). */
  fire: { x: -8, z: 8 },
  /** Posición de la carpa (x, z). */
  tent: { x: -15, z: 9.5 },
};

/** Jugador: movimiento, salto y límites del mapa. */
export const PLAYER = {
  /** Posición inicial (x, z) y hacia dónde mira (radianes; π = hacia las montañas). */
  start: { x: -4, z: 13, facing: Math.PI },
  walkSpeed: 5.5,
  runSpeed: 9.5,
  /** Rapidez con la que acelera/frena y gira (mayor = más brusco). */
  acceleration: 12,
  turnSpeed: 12,
  jumpSpeed: 7.5,
  gravity: 22,
  /** Radio de colisión del personaje. */
  radius: 0.45,
  /** Límites caminables del mapa. */
  bounds: { minX: -118, maxX: 118, minZ: -62, maxZ: 40 },
};

/** Fiesta sorpresa escondida en el bosque. */
export const PARTY = {
  /** A quién se le celebra (aparece en el cartel y en el mensaje). */
  name: 'Xian',
  /** Centro del claro de la fiesta (x, z). */
  x: -60,
  z: -34,
  /** Radio de la zona decorada. */
  radius: 10,
  /** Radio sin árboles (más amplio, para que no tapen la cámara al llegar). */
  clearRadius: 17,
  /** Distancia a la que se activa la celebración. */
  triggerRadius: 9,
};

/** Objetos que se encuentran por el mundo. */
export const LOOT = {
  /** Monedas del camino entre el campamento y la fiesta. */
  trailCoins: 20,
  /** Monedas sueltas repartidas por el mapa. */
  scatteredCoins: 24,
  pickupRadius: 1.2,
  /** Madera que suelta cada árbol al golpearlo. */
  woodPerTree: 3,
  hitCooldown: 0.45,
};

/** Cámara en tercera persona. */
export const CAMERA = {
  /** Altura del punto que mira la cámara sobre los pies del personaje. */
  targetHeight: 1.7,
  /** Posición inicial relativa al personaje. */
  offset: { x: 0, y: 4.2, z: 10.5 },
  minDistance: 5,
  maxDistance: 28,
};

/** Paleta de la escena. */
export const COLORS = {
  // Ambiente
  sky: '#16306a',
  fog: '#1a3570',
  hemiSky: '#6d8fd6',
  hemiGround: '#132a1c',
  moon: '#a9c2ff',

  // Terreno
  grass: ['#3f9a3a', '#4daa3e', '#368a34', '#58b544'],
  slope: '#2f7a32',
  shore: '#2a4d3a',

  // Agua
  water: '#1d3f8f',
  waterEmissive: '#0b1a44',

  // Montañas
  mountainRock: ['#3a4566', '#4a5677', '#323b58', '#56628a'],
  snow: ['#e3ecfa', '#bfd0ee'],

  // Pinos
  pineGreens: ['#2f8f3a', '#3aa043', '#27803a', '#45b04a', '#1f6e33'],
  pineUnderside: '#14421f',
  trunk: '#8f4a2c',

  // Rocas
  rock: ['#3d4a6a', '#4f5d82'],

  // Campamento
  tentFront: '#f08a3c',
  tentCloth: '#2a3d82',
  log: '#7a3a1e',
  fireStone: '#5a6078',
  flames: ['#fff3a0', '#ffc933', '#ff8a1f'],
  fireLight: '#ffa040',
  spark: '#ffb347',
  seatTop: '#d9935c',
  seatSide: '#b5582b',

  // Personaje
  skin: '#f2c79a',
  jacket: '#f08a3c',
  pants: '#2a3d82',
  boots: '#3b2a22',
  beanie: '#c8443a',
  backpack: '#3f9a3a',
  eyes: '#1b2340',

  // Fiesta
  festive: ['#ff5d73', '#ffd23f', '#3fd0c9', '#7b6cff', '#f08a3c', '#6fdc6f'],
  bannerCloth: '#fff4dc',
  bannerText: '#16306a',
  cakeBase: '#ff8fb1',
  cakeTop: '#fff4dc',
  tablecloth: '#e3ecfa',
  partyLight: '#ffd9a0',
  bulb: '#ffe9a8',
  coin: '#ffcf3f',
  coinGlow: '#a86a00',

  // Cielo
  cloudTop: '#f2f5fc',
  cloudBottom: '#b7c4e0',
  cloudEmissive: '#55679a',
  star: '#ffffff',
};
