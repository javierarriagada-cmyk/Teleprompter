# Nota del prototipo — sitio nuevo (ronda 3)

Prototipo en HTML estático para abrir con doble clic (`file://`). Nada de esto está publicado.
Rama `sitio-nuevo-prototipo`, solo `docs/pantallas/sitio-nuevo/`.

## Ronda 3 — pantallas de la app real (post-0ebde4b)

**Problema:** los crops de pósters de Play cortaban glifos en los bordes («on calma», «uieres decir») y Guiones perdía la UI de cuenta/respaldo.

**Solución:** capturas de la app real (`src/` en `main`, Vite + Chrome headless, viewport 392×850, DPR 2). Salidas solo en esta carpeta; `src/` no se tocó.

### Procedencia de cada momento

| Uso / sección | Archivo | Origen |
| --- | --- | --- |
| Videos | `crops/uso-videos.webp` | **App real** — Grabar LISTO con `fondoToma=recuadro`, PiP y timer «dura aprox.». Cámara = still falso (`--use-file-for-fake-video-capture`); no hay cámara física en headless. |
| Clases | `crops/uso-clases.webp` | **App real** — pantalla Leer en marcha (texto + pastilla de tiempo). |
| Presentaciones | `crops/uso-presentaciones.webp` | **Play** — fotograma de video de `03.png` (mujer + subtítulos). Recorte al marco de video, líneas de subtítulo enteras. |
| Ensayos | `crops/uso-ensayos.webp` | **App real** — LISTO en modo Velocidad fija (ficha visible). |
| Guiones | `crops/guiones-ui.webp` | **App real** — Ajustes con tarjeta Cuenta: «Nunca pierdas un guion» + **Continuar con Google**. |

PNG fuente de esas capturas: `activos/capturas-app/`. Herramienta: `_tools/capturar-app-real.cjs` (+ worktree temporal de `main` en `/tmp/sigo-main-cap` al generar).

### Leftovers

- Pósters Play `activos/capturas/01–08.png` y crops viejos de marketing: ya no alimentan Para/Guiones (salvo Presentaciones desde el frame de video de 03).
- `uso-videos-listo.webp` experimental (si existe): no enlazado.
- Galería «La app» (`phone-01…06`, `phone-08`) sigue siendo material Play (ficha), no re-capturado en este paso.
- Cámara de Grabar: still sintético, no feed real.

### Capturas del prototipo

A **deviceScaleFactor: 2**: `capturas-prototipo/ronda-3/` (página completa tel/desk, secciones, como-e2/e5, `recorrido-telefono.mp4`).

### Peso

Meta ≤ 1,5 MiB sin video: ver medición en el commit / al abrir. Crops nuevos ~0,3 MiB juntos.

## Cómo portar a `sitio/`

1. No tocar el árbol publicado hasta textos en es / en / pt.
2. La demo ya es copia de `sitio/fuente`; al integrar, un solo `escenas.js` y desvíos en PR.
3. Franja: reutilizar `sitio/fuente/franja.js`; idioma en la franja, nunca fixed sobre capturas.
4. Activos: WebP; video con `preload="none"` + poster.
5. i18n desde `sitio/fuente/textos/{es,en,pt}`.
