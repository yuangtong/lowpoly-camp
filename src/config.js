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

  // Cielo
  cloudTop: '#f2f5fc',
  cloudBottom: '#b7c4e0',
  cloudEmissive: '#55679a',
  star: '#ffffff',
};
