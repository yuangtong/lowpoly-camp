# lowpoly-camp

Juego arcade 3D low-poly que corre en el navegador. Hoy es solo una escena
(bosque nocturno con montañas nevadas, pinos, fogata, carpa y río), generada
100 % por código.

## Proyecto

- Stack: Vite + Three.js (ES modules, JavaScript). Sin modelos externos por ahora: todo es procedural.
- Archivos: `index.html` (canvas + HUD) y `src/main.js` (escena completa).
- Estilo visual low-poly: `flatShading: true`, un color por cara (función `paintFaces`),
  geometrías de pocos segmentos deformadas con `jitter()` (ruido determinista `hash3`),
  RNG con semilla (`mulberry32`), niebla azul, luz hemisférica, luna direccional y
  PointLight cálida en la fogata.
- Paleta: cielo `#16306a`, verdes `#3f9a3a`–`#58b544`, roca `#3a4566`–`#56628a`,
  nieve `#e3ecfa`, acento naranja `#f08a3c`.
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
- Física (futuro): Rapier https://rapier.rs/
- Assets low-poly CC0: https://kenney.nl/assets, https://quaternius.com/, https://poly.pizza/
- Modelos propios: Blender → exportar .glb y cargar con GLTFLoader.
- Proyecto de referencia (escena low-poly interactiva con Three.js):
  https://github.com/1391819/interactive-low-poly-environment

## Roadmap

1. Personaje controlable (WASD) + cámara en tercera persona.
2. Colisiones con árboles y rocas, y límites del mapa.
3. Mecánica arcade (recolectar objetos, puntaje, tiempo).
4. Menú, sonido y pantalla de game over.
5. Multijugador con Colyseus.

## Convenciones

- Comentarios y textos de UI en español.
- Mantener el look low-poly en todo lo nuevo (flat shading y paleta).
- Rendimiento primero: reutiliza geometrías y materiales; no crees objetos dentro del loop de animación.
