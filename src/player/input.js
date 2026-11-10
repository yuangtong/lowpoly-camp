// Entrada del jugador: teclado (WASD / flechas, Shift, Espacio) y controles
// táctiles (joystick virtual + botón de salto definidos en index.html).

const KEYS = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
  Space: 'jump',
};

/**
 * Conecta teclado y controles táctiles.
 * @returns {{ x: number, y: number, run: boolean, jump: boolean, update: () => void }}
 *   Tras `update()`: `x` (derecha +) e `y` (adelante +) en [-1, 1] con magnitud
 *   máxima 1; `run` y `jump` indican si esas acciones están pulsadas.
 */
export function createInput() {
  const held = { up: false, down: false, left: false, right: false, run: false, jump: false };
  const stick = { x: 0, y: 0, active: false };
  const state = { x: 0, y: 0, run: false, jump: false, update };

  // --- Teclado ---
  window.addEventListener('keydown', (e) => {
    const action = KEYS[e.code];
    if (!action) return;
    held[action] = true;
    e.preventDefault(); // evita que las flechas o el espacio muevan la página
  });
  window.addEventListener('keyup', (e) => {
    const action = KEYS[e.code];
    if (action) held[action] = false;
  });
  window.addEventListener('blur', () => {
    for (const k in held) held[k] = false;
  });

  // --- Joystick virtual ---
  const base = document.getElementById('joystick');
  const knob = document.getElementById('joystick-knob');
  if (base && knob) {
    let pointerId = null;
    const move = (e) => {
      const rect = base.getBoundingClientRect();
      const max = rect.width / 2;
      let dx = (e.clientX - (rect.left + max)) / max;
      let dy = (e.clientY - (rect.top + max)) / max;
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      stick.x = dx;
      stick.y = -dy; // arriba en pantalla = adelante
      knob.style.transform = `translate(${dx * max * 0.6}px, ${dy * max * 0.6}px)`;
    };
    const release = (e) => {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      stick.x = stick.y = 0;
      stick.active = false;
      knob.style.transform = '';
    };
    base.addEventListener('pointerdown', (e) => {
      pointerId = e.pointerId;
      base.setPointerCapture(pointerId);
      stick.active = true;
      move(e);
      e.preventDefault();
    });
    base.addEventListener('pointermove', (e) => {
      if (e.pointerId === pointerId) move(e);
    });
    base.addEventListener('pointerup', release);
    base.addEventListener('pointercancel', release);
  }

  // --- Botón de salto táctil ---
  const jumpBtn = document.getElementById('jump-btn');
  let touchJump = false;
  if (jumpBtn) {
    jumpBtn.addEventListener('pointerdown', (e) => { touchJump = true; e.preventDefault(); });
    const up = () => { touchJump = false; };
    jumpBtn.addEventListener('pointerup', up);
    jumpBtn.addEventListener('pointercancel', up);
    jumpBtn.addEventListener('pointerleave', up);
  }

  function update() {
    if (stick.active) {
      // El joystick es analógico: empujarlo a fondo equivale a correr.
      state.x = stick.x;
      state.y = stick.y;
      state.run = Math.hypot(stick.x, stick.y) > 0.9;
    } else {
      let x = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      let y = (held.up ? 1 : 0) - (held.down ? 1 : 0);
      if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; } // diagonal sin ventaja
      state.x = x;
      state.y = y;
      state.run = held.run;
    }
    state.jump = held.jump || touchJump;
  }

  return state;
}
