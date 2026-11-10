# Low Poly Camp 🏕️

Escena 3D low-poly nocturna (montañas nevadas, pinos, fogata, carpa y río) hecha **100 % con código** en [Three.js](https://threejs.org). No usa modelos externos: cada objeto se genera de forma procedural.

## Ejecutar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/ para producción
```

## Cómo se logra el estilo low-poly

| Técnica | Dónde |
|---|---|
| `flatShading: true` + color por cara (`paintFaces`) | todas las mallas |
| Geometrías con pocos segmentos + `jitter()` determinista | montañas, pinos, rocas, nubes |
| Nieve según la altura de cada cara | `mountain()` |
| `PointLight` cálida que parpadea + halo aditivo | fogata |
| Niebla azul + luz hemisférica + luna direccional | ambiente |

## Estructura

```
index.html      → canvas + HUD
src/main.js     → escena completa (terreno, río, montañas, bosque, campamento, cielo)
```

## Próximos pasos para convertirlo en juego

1. Personaje controlable (WASD) + cámara que lo sigue.
2. Colisiones con [Rapier](https://rapier.rs) o detección simple por distancia.
3. Modelos propios en Blender exportados como `.glb` (`GLTFLoader`).
4. Multijugador con [Colyseus](https://colyseus.io): servidor Node aparte (Colyseus Cloud, Railway, Fly.io); el cliente se queda en Vercel.

## Deploy

Vercel detecta Vite automáticamente: build `vite build`, salida `dist/`.
