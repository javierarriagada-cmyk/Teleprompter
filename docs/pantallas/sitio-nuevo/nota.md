# Nota del prototipo — sitio nuevo (ronda 3)

Prototipo en HTML estático para abrir con doble clic (`file://`). Nada de esto está publicado.
Rama `sitio-nuevo-prototipo`, solo `docs/pantallas/sitio-nuevo/`.

## Estado actual (pass zero-defect + revisión independiente)

### Escenario / Cómo funciona
- `.escenario { height: 610svh }` (antes 1160svh). JS `TOTAL=5.1` → altura viva `(TOTAL+1)*vh = 6.1*vh`. El «vacío» negro en captura full-page es la pista de scroll sticky de E1–E5, no un gap extra entre héroe y Video (`gapEscToVideo: 0`).
- E2 rótulos: `.rotulo { top: calc(100% + 52px) }` — aire bajo etiquetas (~57 px medidos). No se tocó el color del punto «Te espera».
- E5 bokeh / estilos: sin cambios (demo aprobada).

### Video
- Poster: fotograma completo 9:16 del MP4 (`f180` / ~18s): composición nativa, teléfono entero visible, texto sin cortes, PiP persona completo. `object-fit: contain` en `.video-caja` (mismo AR 9/16).
- `.video-nota { display: none }`.
- Títulos: kicker «El video» / «Del guion al video.» (sin choque con «Así se ve…»).

### Para qué
- Gaps: `.usos-editorial { gap: clamp(2.5rem, 5vw, 3.5rem) }`.
- Bajada ficha: «Lee tu guion a tu ritmo mientras grabas un video, preparas una clase o ensayas una presentación.»
- Videos: «…en un recuadro que puedes mover, u ocultarla mientras grabas.»
- Clases: `object-position: center 6%` (sin velo negro cortando la última línea legible; el fade del teleprompter es el de la app).
- Presentaciones: fotograma mujer + panel «Estilo de subtítulos» (chips Sin/Amarillo/Blanco/Fondo) cubriendo el disco Play; sin póster de Play disc.
- Ensayos: Ajustes real en español con «Velocidad fija» seleccionado + control Velocidad (barras); claramente ≠ Clases (Leer con la voz).

### La app
- Título «Lee, graba y exporta.»; bajada de producto (tamaño/tipografía/colores), no «Capturas reales de la ficha».
- Carrusel 6 pantallas de app real; `phone-08` landscape con `aspect-ratio: auto; object-fit: contain`; figcaption centrado «Graba de pie o de lado.» (sin fragmento duplicado).

### Guiones
- Ajustes + Continuar con Google (`guiones-ui.webp`); `object-position: center 4%`; sin media fila cortada arriba; sin «toño».

### Cierre
- Padding `clamp(3.25rem, 7vw, 5.5rem)`.
- Resplandor del punto: `opacity: 0.2`.

### Procedencia de assets

| Uso / sección | Archivo | Origen |
| --- | --- | --- |
| Videos / phone-02 | `uso-videos.webp`, `phone-02.webp` | App real Grabar LISTO + persona (fake cam y4m / still inyectado en recuadro) |
| Clases | `uso-clases.webp` | App real Leer |
| Presentaciones / phone-03 | `uso-presentaciones.webp`, `phone-03.webp` | Frame Play mujer + overlay UI estilo subtítulos |
| Ensayos / phone-06 | `uso-ensayos.webp`, `phone-06.webp` | App real Ajustes · Velocidad fija (es) |
| Guiones | `guiones-ui.webp` | App real Ajustes + cuenta Google |
| phone-08 | `phone-08.webp` | App real Grabar horizontal + persona en PiP |
| Poster | `activos/video/poster.webp` (+ `.jpg`) | Frame completo 9:16 del MP4 (teléfono + persona, sin zoom) |

PNG fuente: `activos/capturas-app/`. Herramientas: `_tools/capturar-app-real.cjs`, `_tools/capturar-ronda3.mjs`.

### Capturas de auditoría
`capturas-prototipo/ronda-3/` @ DPR 2:
- Tel 392×894: página completa, como-e2/e5, sec-video/para/app/guiones/cierre
- Desk 1440×900: página completa, como-e2/e5, sec-video/para/app/guiones/cierre

### Peso
Primera vista sin video (HTML+CSS+JS+fuentes+vendor, sin lazy imgs ni MP4): **~0,35 MiB** (meta ≤ 1,5 MiB).

### Límites honestos
- Cámara en headless: still/y4m inyectado (Capgo sopla viewport; neutramos `#capgo_video` + clip). Persona visible y natural en Grabar.
- Presentaciones: el disco Play del frame de marketing no se pudo inpaint sin artefactos; se cubre con la hoja de estilo de subtítulos (UI real del producto).
- El vacío negro de la captura full-page del escenario es la longitud de scroll de la coreografía (610svh), no un padding erróneo entre secciones.

## Cómo portar a `sitio/`
Copiar HTML/CSS/activos de esta carpeta; no publicar hasta revisión.
