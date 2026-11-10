// Interfaz del juego: objetivo, mochila, avisos, indicación de acción y
// mensaje de celebración. Los elementos viven en index.html; aquí solo se
// actualiza su contenido (y solo cuando cambia).

/**
 * @returns {{
 *   setObjective: (text: string) => void,
 *   setBackpack: (coins: number, totalCoins: number, wood: number) => void,
 *   setExtras: (text: string) => void,
 *   setPrompt: (text: string | null, verb?: string) => void,
 *   toast: (text: string) => void,
 *   celebrate: (text: string) => void,
 * }}
 */
export function createHud() {
  const objective = document.getElementById('objective');
  const coinsEl = document.getElementById('coins');
  const woodEl = document.getElementById('wood');
  const extrasEl = document.getElementById('extras');
  const promptEl = document.getElementById('prompt');
  const promptText = document.getElementById('prompt-text');
  const actionBtn = document.getElementById('action-btn');
  const toastEl = document.getElementById('toast');
  const celebration = document.getElementById('celebration');
  let toastTimer = 0;
  let shownPrompt = '';

  return {
    setObjective(text) {
      objective.textContent = text;
    },
    setBackpack(coins, totalCoins, wood) {
      coinsEl.textContent = `${coins}/${totalCoins}`;
      woodEl.textContent = String(wood);
    },
    /** Línea extra de la mochila: objetos especiales, gatas y goles. */
    setExtras(text) {
      extrasEl.textContent = text;
      extrasEl.hidden = !text;
    },
    /**
     * Muestra qué hace la tecla de acción ahora mismo (o lo oculta con `null`).
     * `verb` es la versión corta para el botón táctil.
     */
    setPrompt(text, verb = 'GOLPEAR') {
      const key = text ?? '';
      if (key === shownPrompt) return; // se llama en cada frame: evita tocar el DOM
      shownPrompt = key;
      promptEl.classList.toggle('show', !!text);
      if (text) promptText.textContent = text;
      actionBtn.textContent = text ? verb.toUpperCase() : 'GOLPEAR';
    },
    toast(text) {
      toastEl.textContent = text;
      toastEl.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
    },
    celebrate(text) {
      celebration.textContent = text;
      celebration.classList.add('show');
      // A los pocos segundos se retira para dejar ver la fiesta
      setTimeout(() => celebration.classList.add('done'), 7000);
    },
  };
}
