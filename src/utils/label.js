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
