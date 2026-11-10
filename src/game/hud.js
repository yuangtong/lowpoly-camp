// Interfaz del juego: objetivo, mochila, avisos y mensaje de celebración.
// Los elementos viven en index.html; aquí solo se actualiza su contenido.

/**
 * @returns {{
 *   setObjective: (text: string) => void,
 *   setBackpack: (coins: number, totalCoins: number, wood: number) => void,
 *   toast: (text: string) => void,
 *   celebrate: (text: string) => void,
 * }}
 */
export function createHud() {
  const objective = document.getElementById('objective');
  const coinsEl = document.getElementById('coins');
  const woodEl = document.getElementById('wood');
  const toastEl = document.getElementById('toast');
  const celebration = document.getElementById('celebration');
  let toastTimer = 0;

  return {
    setObjective(text) {
      objective.textContent = text;
    },
    setBackpack(coins, totalCoins, wood) {
      coinsEl.textContent = `${coins}/${totalCoins}`;
      woodEl.textContent = String(wood);
    },
    toast(text) {
      toastEl.textContent = text;
      toastEl.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1400);
    },
    celebrate(text) {
      celebration.textContent = text;
      celebration.classList.add('show');
    },
  };
}
