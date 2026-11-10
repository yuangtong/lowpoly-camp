# lowpoly-camp

Juego arcade 3D low-poly que corre en el navegador. Hoy es solo una escena
(bosque nocturno con montañas nevadas, pinos, fogata, carpa y río), generada
100 % por código.

## Proyecto

- Stack: Vite + Three.js (ES modules, JavaScript). Sin modelos externos por ahora: todo es procedural.
- Archivos: `index.html` (canvas + HUD), `src/main.js` (setup + loop), `src/config.js`
  (semilla, medidas, jugador, cámara y paleta), `src/utils/` (rng, noise, geometry),
  `src/world/` (terrain, water, mountains, trees, rocks, camp, sky, party, guests,
  football, fireworks, colliders),
  `src/player/` (character, player, input, camera) y `src/game/` (game, collectibles,
  items, hud, audio). Cada módulo de `world`
  exporta `create…(scene)`; los animados devuelven `{ update }`.
- El RNG con semilla es compartido: el orden en que `main.js` construye los módulos
  define la escena. Añade lo nuevo al final de esa lista.
- Estilo visual low-poly: `flatShading: true`, un color por cara (función `paintFaces`),
  geometrías de pocos segmentos deformadas con `jitter()` (ruido determinista `hash3`),
  RNG con semilla (`mulberry32`), niebla azul, luz hemisférica, luna direccional y
  PointLight cálida en la fogata.
- Paleta: cielo `#16306a`, verdes `#3f9a3a`–`#58b544`, roca `#3a4566`–`#56628a`,
  nieve `#e3ecfa`, acento naranja `#f08a3c`.
- Jugador: personaje procedural de bloques, movimiento relativo a la cámara, cámara en
  tercera persona (OrbitControls siguiendo al personaje). Entrada por teclado y por
  joystick/botón táctiles definidos en `index.html` (visibles con `pointer: coarse`).
- Colisiones: círculos en XZ registrados con `addCollider()` desde cada módulo del mundo;
  el río y los límites del mapa se bloquean en `player.js`. Todo obstáculo nuevo debe
  registrar su collider.
- Juego: es una sorpresa de cumpleaños para Xian (hermano del autor). Un camino de monedas
  lleva del campamento a una fiesta escondida (`PARTY` en config); al entrar al claro se
  muestra «¡Feliz cumpleaños, Xian!», confeti, fuegos artificiales y la canción.
  La idea a futuro es "encontrar cosas", no craftear: inspirado en Minecraft pero sin
  construcción.
- Tecla de acción única (E / botón táctil que cambia de texto): `game.js` mantiene una
  lista de interactuables (`position`, `label()`, `verb()`, `act()`, `range` opcional);
  si no hay ninguno cerca, la acción golpea el árbol más próximo. Todo lo nuevo con lo
  que se pueda interactuar se añade a esa lista.
- Invitados (`GUESTS` en config, `src/world/guests.js`): las gatas Mente (gris y blanca)
  y Lola (tricolor) piden un objeto (`ITEMS`: ovillo, pescado) y al recibirlo siguen al
  jugador en fila; los futbolistas de bloques (Cristiano y Messi, `createCharacter(look)`)
  tienen frases que rotan y respuestas entre ellos. Pelota y arco en `football.js`.
- Textos en el mundo: `createLabel` y `createSpeaker` (`src/utils/label.js`) crean sus
  texturas al construir la escena; nunca dentro del loop.
- Cielo (`SKY` en config): cúpula con degradado que sigue a la cámara, luna, estrellas,
  estrellas fugaces y luciérnagas. Lo nuevo del cielo usa RNG propio para no alterar
  la escena.
- HUD en `index.html` (objetivo, mochila, avisos); sonidos generados con WebAudio.
- Para pruebas: `?spawn=x,z` coloca al personaje en ese punto e `?items=fish,yarn` le da
  esos objetos desde el inicio.
- Deploy: Vercel (framework Vite, build `vite build`, salida `dist`). Repo en GitHub.

## Referencias (consúltalas antes de implementar algo nuevo)

- Three.js docs: https://threejs.org/docs/ y ejemplos: https://threejs.org/examples/
- Colyseus (servidor multijugador, NO renderiza; el render lo hace Three.js en el cliente):
  https://docs.colyseus.io/ y https://colyseus.io/
  Se usará más adelante. El servidor de Colyseus NO puede vivir en Vercel; irá en
  Colyseus Cloud, Railway o Fly.io.
  El cliente se conecta con el SDK web `@colyseus/sdk` (verificado en npm en
  noviembre de 2026: es el paquete vigente; `colyseus.js` es el nombre anterior).
  Vuelve a comprobarlo en los docs antes de instalarlo.
- Referencia de MMO en navegador (revisar su arquitectura antes del paso de multijugador):
  https://github.com/tech-leads-club/nj-mmo
- Física (futuro): Rapier https://rapier.rs/
- Assets low-poly CC0: https://kenney.nl/assets, https://quaternius.com/, https://poly.pizza/
- Modelos propios: Blender → exportar .glb y cargar con GLTFLoader.
- Proyecto de referencia (escena low-poly interactiva con Three.js):
  https://github.com/1391819/interactive-low-poly-environment

## Roadmap

1. ~~Personaje controlable (WASD) + cámara en tercera persona.~~ Hecho (también táctil).
2. ~~Colisiones con árboles y rocas, y límites del mapa.~~ Hecho (círculos simples).
3. Mecánica arcade: hecho lo básico (monedas, madera, mochila, fiesta sorpresa, adoptar
   gatas, diálogos, fútbol). Falta dar uso a monedas y madera y, si se quiere,
   puntaje/tiempo.
4. Menú, sonido y pantalla de game over.
5. Multijugador con Colyseus.

## Convenciones

- Comentarios y textos de UI en español.
- Mantener el look low-poly en todo lo nuevo (flat shading y paleta).
- Rendimiento primero: reutiliza geometrías y materiales; no crees objetos dentro del loop de animación.
