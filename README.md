# Low Poly Camp 🏕️

Escena 3D low-poly nocturna (montañas nevadas, pinos, fogata, carpa y río) hecha **100 % con código** en [Three.js](https://threejs.org). No usa modelos externos: cada objeto se genera de forma procedural.

## Ejecutar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/ para producción
```

## Controles

| | Escritorio | Móvil |
|---|---|---|
| Moverse | WASD o flechas | Joystick (abajo a la izquierda) |
| Correr | Shift | Joystick a fondo |
| Saltar | Espacio | Botón SALTAR |
| Golpear árboles | E (o F) | Botón GOLPEAR |
| Mirar alrededor | Arrastrar con el ratón | Arrastrar con un dedo |
| Acercar / alejar | Rueda | Pellizcar |

El personaje se mueve en relación con la cámara, choca con árboles, rocas, montañas y el campamento, y no puede entrar al río ni salir del mapa.

## El juego

- **Objetivo:** seguir el camino de monedas desde el campamento hasta una fiesta sorpresa escondida en el bosque. Al llegar aparece «¡Feliz cumpleaños, Xian!», cae confeti y suena «Cumpleaños feliz».
- **Invitados:** en la fiesta esperan las gatas Mente y Lola (siguen al jugador con la mirada) y dos futbolistas de bloques que saludan y saltan. Sus nombres, frases, colores y posiciones están en `GUESTS` (`src/config.js`).
- **Mochila:** cuenta las monedas recogidas y la madera. Cada árbol suelta hasta 3 de madera al golpearlo.
- **Personalizar:** el nombre y la ubicación de la fiesta están en `PARTY` (`src/config.js`); las cantidades de monedas y madera, en `LOOT`.
- **Pruebas:** `?spawn=x,z` en la URL coloca al personaje en ese punto (por ejemplo `?spawn=-50,-26`, junto a la fiesta).

## Cómo se logra el estilo low-poly

| Técnica | Dónde |
|---|---|
| `flatShading: true` + color por cara (`paintFaces`) | todas las mallas |
| Geometrías con pocos segmentos + `jitter()` determinista | montañas, pinos, rocas, nubes |
| Nieve según la altura de cada cara | `src/world/mountains.js` |
| `PointLight` cálida que parpadea + halo aditivo | fogata |
| Niebla azul + luz hemisférica + luna direccional | ambiente |

## Estructura

```
index.html            → canvas + HUD
src/main.js           → renderer, cámara, controles y loop de animación
src/config.js         → semilla, medidas del mundo y paleta de colores
src/utils/
  rng.js              → RNG con semilla (mulberry32, rand, range, pick)
  noise.js            → hash3: ruido determinista por posición
  geometry.js         → jitter, paintFaces, varied, material y textura compartidos
  label.js            → cartelitos de texto (nombres y globos de diálogo)
src/player/
  character.js        → personaje low-poly procedural y su animación
  player.js           → movimiento, salto, colisiones y apoyo sobre el terreno
  input.js            → teclado + joystick y botón táctiles
  camera.js           → cámara en tercera persona que sigue al personaje
src/game/
  game.js             → reglas: mochila, golpear árboles y sorpresa de la fiesta
  collectibles.js     → monedas (camino hacia la fiesta + sueltas por el mapa)
  hud.js              → objetivo, mochila, avisos y mensaje de celebración
  audio.js            → sonidos con WebAudio (moneda, golpe, «Cumpleaños feliz»)
src/world/
  terrain.js          → terreno, groundHeight() y cauce del río
  water.js            → río con olas
  mountains.js        → montañas nevadas
  trees.js            → pinos (bosque + primer plano)
  rocks.js            → rocas
  camp.js             → carpa, fogata y asientos
  sky.js              → niebla, luces, nubes y estrellas
  party.js            → fiesta sorpresa: cartel, banderines, torta, regalos, globos, confeti
  guests.js           → invitados de la fiesta: las gatas Mente y Lola, y dos futbolistas
  colliders.js        → obstáculos circulares (árboles, rocas, montañas, campamento)
CLAUDE.md             → contexto del proyecto, referencias y roadmap
```

Cada módulo de `src/world/` exporta una función `create…(scene)`; los que se animan devuelven `{ update }`, que `main.js` llama en cada frame.

> Todos los módulos comparten un RNG con semilla, así que el **orden** en que `main.js` los construye define la escena. Añade lo nuevo al final para no alterar lo que ya existe.

## Próximos pasos

1. Dar uso a la mochila: gastar monedas y madera, más objetos que encontrar.
2. Menú, sonido y pantalla de game over.
3. Modelos propios en Blender exportados como `.glb` (`GLTFLoader`).
4. Multijugador con [Colyseus](https://colyseus.io): servidor Node aparte (Colyseus Cloud, Railway, Fly.io); el cliente se queda en Vercel.

## Deploy

Vercel detecta Vite automáticamente: build `vite build`, salida `dist/`.
