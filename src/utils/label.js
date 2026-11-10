import * as THREE from 'three';

/**
 * Crea un cartelito de texto que siempre mira a la cámara (nombres y
 * globos de diálogo). Cada llamada crea su propia textura: úsalo al construir
 * la escena, nunca dentro del loop.
 * @param {string} text
 * @param {{ bubble?: boolean, height?: number }} [options] `bubble` lo dibuja
 *   como globo de diálogo claro; `height` es su alto en unidades del mundo.
 * @returns {THREE.Sprite}
 */
export function createLabel(text, { bubble = false, height = 0.42 } = {}) {
  const fontSize = 56;
  const padX = 34, padY = 22;
  const font = `800 ${fontSize}px system-ui, "Segoe UI", Arial, sans-serif`;
  const cv = document.createElement('canvas');
  const g = cv.getContext('2d');
  g.font = font;
  cv.width = Math.ceil(g.measureText(text).width) + padX * 2;
  cv.height = fontSize + padY * 2;

  g.font = font; // cambiar el tamaño del canvas reinicia el contexto
  g.fillStyle = bubble ? '#fffdf5' : 'rgba(16, 35, 74, 0.82)';
  g.beginPath();
  g.roundRect(3, 3, cv.width - 6, cv.height - 6, bubble ? 30 : cv.height / 2);
  g.fill();
  if (bubble) {
    g.strokeStyle = '#16306a';
    g.lineWidth = 6;
    g.stroke();
  }
  g.fillStyle = bubble ? '#16306a' : '#ffffff';
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  g.fillText(text, cv.width / 2, cv.height / 2 + 4);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, toneMapped: false, fog: false, depthWrite: false })
  );
  sprite.scale.set((height * cv.width) / cv.height, height, 1);
  return sprite;
}

/**
 * Voz de un personaje: prepara un globo por cada frase posible y muestra uno
 * a la vez durante unos segundos. Las texturas se crean aquí, una sola vez.
 * @param {THREE.Scene} scene
 * @param {string[]} texts Todas las frases que puede decir.
 * @param {number} [height] Alto del globo en unidades del mundo.
 * @returns {{ say: (text: string, seconds?: number) => void, update: (dt: number, x: number, y: number, z: number) => void }}
 *   `update` coloca el globo activo en (x, y, z) y lo oculta al acabar su tiempo.
 */
export function createSpeaker(scene, texts, height = 0.5) {
  const bubbles = new Map();
  for (const text of new Set(texts)) {
    const sprite = createLabel(text, { bubble: true, height });
    sprite.visible = false;
    scene.add(sprite);
    bubbles.set(text, sprite);
  }
  let current = null;
  let left = 0;

  return {
    say(text, seconds = 4.5) {
      if (current) current.visible = false;
      current = bubbles.get(text) ?? null;
      if (!current) return;
      current.visible = true;
      left = seconds;
    },
    update(dt, x, y, z) {
      if (!current) return;
      current.position.set(x, y, z);
      left -= dt;
      if (left <= 0) {
        current.visible = false;
        current = null;
      }
    },
  };
}
