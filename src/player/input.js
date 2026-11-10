// Entrada del jugador: teclado (WASD / flechas, Shift, Espacio, E) y controles
// táctiles (joystick virtual + botones definidos en index.html).

const KEYS = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
  Space: 'jump',
  KeyE: 'action', KeyF: 'action',
};

/**
 * Conecta teclado y controles táctiles.
 * @returns {{ x: number, y: number, run: boolean, jump: boolean, action: boolean, update: () => void }}
 *   Tras `update()`: `x` (derecha +) e `y` (adelante +) en [-1, 1] con magnitud
 *   máxima 1; `run`, `jump` y `action` (golpear) indican si están pulsadas.
 */
export function createInput() {
  const held = { up: false, down: false, left: false, right: false, run: false, jump: false, action: false };
  const stick = { x: 0, y: 0, active: false };
  // Pulsaciones pendientes: un toque más corto que un frame no se pierde
  const tapped = { jump: false, action: false };
  const state = { x: 0, y: 0, run: false, jump: false, action: false, update };

  // --- Teclado ---
  window.addEventListener('keydown', (e) => {
    const action = KEYS[e.code];
    if (!action) return;
    held[action] = true;
    if (action in tapped && !e.repeat) tapped[action] = true;
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

  // --- Botones táctiles (saltar y golpear) ---
  const touch = { jump: false, action: false };
  const bindButton = (id, name) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const up = () => { touch[name] = false; };
    btn.addEventListener('pointerdown', (e) => { touch[name] = true; tapped[name] = true; e.preventDefault(); });
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('pointerleave', up);
  };
  bindButton('jump-btn', 'jump');
  bindButton('action-btn', 'action');

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
    state.jump = held.jump || touch.jump || tapped.jump;
    state.action = held.action || touch.action || tapped.action;
    tapped.jump = tapped.action = false;
  }

  return state;
}
