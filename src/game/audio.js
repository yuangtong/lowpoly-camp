// Sonidos generados con WebAudio (sin archivos). El navegador solo permite
// audio tras una interacción del usuario, así que el contexto se crea al
// primer sonido.

/** @type {AudioContext | null} */
let ctx = null;

/** @returns {AudioContext | null} */
function audio() {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/**
 * Toca una nota corta.
 * @param {number} freq Frecuencia en Hz.
 * @param {number} start Segundos desde ahora.
 * @param {number} duration Segundos.
 * @param {OscillatorType} [type]
 * @param {number} [volume]
 */
function note(freq, start, duration, type = 'triangle', volume = 0.12) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/** Sonido al recoger una moneda. */
export function playCoin() {
  note(988, 0, 0.09, 'square', 0.05);
  note(1319, 0.08, 0.22, 'square', 0.05);
}

/** Sonido al golpear un árbol. */
export function playHit() {
  note(140, 0, 0.12, 'sawtooth', 0.09);
  note(90, 0.03, 0.16, 'triangle', 0.12);
}

// "Cumpleaños feliz": [frecuencia, duración en tiempos]
const G4 = 392, A4 = 440, B4 = 493.88, C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99;
const BIRTHDAY = [
  [G4, 0.75], [G4, 0.25], [A4, 1], [G4, 1], [C5, 1], [B4, 2],
  [G4, 0.75], [G4, 0.25], [A4, 1], [G4, 1], [D5, 1], [C5, 2],
  [G4, 0.75], [G4, 0.25], [G5, 1], [E5, 1], [C5, 1], [B4, 1], [A4, 2],
  [F5, 0.75], [F5, 0.25], [E5, 1], [C5, 1], [D5, 1], [C5, 2.5],
];

/**
 * Toca "Cumpleaños feliz".
 * @returns {number} Duración de la canción en segundos.
 */
export function playBirthdaySong() {
  const beat = 0.42;
  let time = 0.1;
  for (const [freq, beats] of BIRTHDAY) {
    note(freq, time, beats * beat * 0.95, 'triangle', 0.14);
    note(freq / 2, time, beats * beat * 0.95, 'sine', 0.06);
    time += beats * beat;
  }
  return time;
}
