# Nota del prototipo — sitio nuevo (ronda 3)

Prototipo en HTML estático para abrir con doble clic (`file://`). Nada de esto está publicado.
Rama `sitio-nuevo-prototipo`, solo `docs/pantallas/sitio-nuevo/`.

## Peso medido (2026-10-31)

Sin contar `capturas-prototipo/`, `_tools/`, ni `escenas.fuente.js` (referencia, no se carga).

| Bloque | Peso |
| --- | --- |
| HTML + CSS (proto + demo-real) | ~101 KiB |
| JS runtime (demo + prototipo, sin fuente) | ~69 KiB |
| Vendor (GSAP + ScrollTrigger + Lenis) | ~134 KiB |
| Fuentes (woff2, una copia en red) | ~73 KiB |
| Poster WebP (frame real del MP4) | ~50 KiB |
| 8 capturas WebP + crop guiones | ~370 KiB |
| **Primera vista (hero+demo+libs, sin poster/caps/MP4)** | **~378 KiB** |
| **Página completa sin MP4 (lo que descarga el navegador)** | **~0,78 MiB** |
| Video MP4 (solo al reproducir) | ~4,5 MiB |

**Meta ≤ 1,5 MiB sin video: cumplida (~0,78 MiB en red).** En disco las fuentes están duplicadas (`activos/fuentes` + `demo-real/fuentes`); el navegador solo baja una. Capturas en WebP con `loading="lazy"`. El video no se descarga hasta el toque (poster + botón).

## Ronda 3 — qué cambió

1. Ajustes en lo aprobado: sin textos laterales que repetían avisos; aire bajo E2 móvil equilibrado; chips E5 desk separados del borde y de la píldora.
2. Video vertical 9:16 con poster extraído del MP4 (frame ~5,2 s).
3. «Para qué» en cuatro paneles con capturas reales (no lista de filas).
4. «La app de verdad»: galería con ritmo; 08 landscape a ancho completo.
5. «Tus guiones»: captura 07 real (editor + respaldo), no el gráfico claro.
6. Cierre: una acción (mailto), sin caja con borde.
7. Franja «Sigo está en prueba…» + pie Ayuda/Soporte/Privacidad/Términos/Borrar cuenta + ES·EN·PT.

## Cómo portar a `sitio/`

1. No tocar el árbol publicado hasta textos en es / en / pt.
2. La demo ya es copia de `sitio/fuente`; al integrar, volver a un solo `escenas.js` y listar desvíos en PR.
3. Franja: reutilizar `sitio/fuente/franja.js` (el prototipo trae un subset en `prototipo.js`).
4. Activos: WebP + `srcset`; video con `preload="none"` + poster.
5. i18n: cadenas desde `sitio/fuente/textos/{es,en,pt}`; producto desde fichas aprobadas.

## Limitaciones honestas

- El poster del video es un frame del trailer de Play (composición marketing con teléfono centrado), no un fotograma “de app a pantalla completa”; se ve contenido real, no un rectángulo negro.
- «Para qué» reutiliza capturas de la ficha (01/02/03/06); no hay clips de uso distintos por vertical.
- La galería en móvil es 2 columnas + 08 ancho; en desk el ritmo es asimétrico pero sigue siendo estático (sin scroll-scrub).
- El selector ES·EN·PT del prototipo es decorativo.
