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
- Ajuste final: desde 900 px, texto a la izquierda y tarjeta a la derecha en una cuadrícula centrada de 1080 px. En teléfono la envoltura usa `display: contents`: comparación de la sección completa contra 1297c70 idéntica por píxeles (`comparacion-video-movil.json`).
- Títulos: kicker «El video» / «Del guion al video.» (sin choque con «Así se ve…»).

### Para qué
- Gaps: `.usos-editorial { gap: clamp(2.5rem, 5vw, 3.5rem) }`.
- Bajada ficha: «Lee tu guion a tu ritmo mientras grabas un video, preparas una clase o ensayas una presentación.»
- Videos: «…en un recuadro que puedes mover, u ocultarla mientras grabas.»
- Clases: captura nueva de Leer LISTO con el guion «El ciclo del agua». Texto sobre preparar una clase y leer al propio ritmo; el desvanecimiento es el de la app, sin retoque.
- Presentaciones: captura nueva de Leer LISTO con «Resultados del trimestre», un guion de prueba con resultados y prioridades de un equipo. La bajada trata del ensayo sin grabar y seguimiento de voz. Antes: mostraba a una mujer en una cocina y una hoja de subtítulos que no correspondían al uso.
- Ensayos: Ajustes real en español con «Velocidad fija» seleccionado + control Velocidad (barras); claramente ≠ Clases (Leer con la voz).

### La app
- Título «Lee, graba y exporta.»; bajada de producto (tamaño/tipografía/colores), no «Capturas reales de la ficha».
- Carrusel 6 pantallas de app real; `phone-08` landscape con `aspect-ratio: auto; object-fit: contain`; figcaption centrado «Graba de pie o de lado.» (sin fragmento duplicado).

### Guiones
- Nueva captura de Ajustes + «Nunca pierdas un guion» (`guiones-ui.webp`), con la tarjeta de cuenta a la vista mediante desplazamiento real del panel. Perfil vacío de grabaciones, foco retirado antes de capturar, sin ocultar componentes ni retocar píxeles. Se eliminaron el recuadro de foco, el 0:42 y la mancha a la derecha que venían en la captura anterior.

### Cierre
- Padding `clamp(3.25rem, 7vw, 5.5rem)`.
- Resplandor del punto: `opacity: 0.2`.

### Procedencia de assets

| Uso / sección | Archivo | Origen |
| --- | --- | --- |
| Videos / phone-02 | `uso-videos.webp`, `phone-02.webp` | App real Grabar LISTO + persona (fake cam y4m / still inyectado en recuadro) |
| Clases | `uso-clases.webp` | Interfaz real de Leer LISTO, guion de prueba «El ciclo del agua» |
| Presentaciones | `uso-presentaciones.webp` | Interfaz real de Leer LISTO, guion de prueba «Resultados del trimestre» |
| phone-03 (galería conservada) | `phone-03.webp` | Composición anterior; no se modifica la galería en esta entrega |
| Ensayos / phone-06 | `uso-ensayos.webp`, `phone-06.webp` | App real Ajustes · Velocidad fija (es) |
| Guiones | `guiones-ui.webp` | Interfaz real de Ajustes + cuenta Google, sin foco ni grabaciones de ejemplo detrás |
| phone-08 | `phone-08.webp` | App real Grabar horizontal + persona en PiP |
| Poster | `activos/video/poster.webp` (+ `.jpg`) | Frame completo 9:16 del MP4 (teléfono + persona, sin zoom) |

PNG fuente de estos tres ajustes: `activos/capturas-app/{guiones-cuenta-final,uso-clases-final,uso-presentaciones-final}.png`. Capturados con `_tools/capturar-app-real.cjs --finales`. Interfaz React servida desde la copia local de la app en main, sin modificarla; no son capturas Android ni se ejecutó reconocimiento de voz. Las tres exportaciones WebP son sin pérdida para conservar la nitidez del texto.

### Capturas de auditoría
`capturas-prototipo/ronda-3/` @ DPR 2:
- Tel 392×894: página completa, como-e2/e5, sec-video/para/app/guiones/cierre
- Desk 1440×900: página completa, como-e2/e5, sec-video/para/app/guiones/cierre

### Peso
Primera carga medida en ambos viewports: **373.600 bytes** (~0,374 MB), con HTML, CSS, JS, fuentes y recursos solicitados. El MP4 no se descarga hasta tocar reproducir. Meta < 1,5 MB; los tres WebP modificados siguen siendo lazy. Informe: `capturas-prototipo/ronda-3/revision-final.json`.

### Límites honestos
- Cámara en headless: still/y4m inyectado (Capgo sopla viewport; neutramos `#capgo_video` + clip). Persona visible y natural en Grabar.
- Antes: Presentaciones usaba un frame de marketing y una hoja de subtítulos para cubrir Play. Ahora tiene una captura real del guion de presentación y no se ha hecho inpainting.
- El vacío negro de la captura full-page del escenario es la longitud de scroll de la coreografía (610svh), no un padding erróneo entre secciones.

## Cómo portar a `sitio/`
Copiar HTML/CSS/activos de esta carpeta; no publicar hasta revisión.

## Comprobación final del 01-11-2026

- Imágenes nativas revisadas a 784×1700 (100 %). Dentro de la página, inspección en viewport 392×894 y 1440×900, zoom 100 %, DPR 1: Guiones, Clases, Presentaciones y video. No se aprecia el foco, 0:42, mancha ni otros restos en las tres imágenes nuevas.
- Evidencia nueva: `capturas-prototipo/ronda-3/final-{video,para,clases,presentaciones,guiones}-{tel,desk}.png`. Los PNG son recortes de sección tomados desde esos viewports; por eso su altura puede exceder la ventana. Los de `final-primera-vista-*` son la ventana completa.
- `base-video-tel.png` y `final-video-http-tel.png`: la sección del video en teléfono es idéntica por píxeles contra 1297c70. Esta es una comparación puntual de entrega, no una prueba que fije posiciones en la app.
- Las fuentes, imágenes y código de la portada, Cómo funciona, galería, horizontal y cierre no se cambiaron. Videos y Ensayos conservan sus imágenes y textos.
- Límite previo comprobado: en Chrome estándar, abrir `index.html` con doble clic bloquea por CORS `demo-real/demo.js` (módulo ES) y la precarga de Source Serif 4. El HTML y las secciones estáticas abren, pero la coreografía no arranca. Por HTTP local sí arranca. La etiqueta de módulo y esas fuentes ya estaban en 1297c70 y quedan intactas porque la portada y Cómo funciona están fuera del encargo. Los mensajes exactos están en `revision-final.json`; no se ha relajado la seguridad del navegador para ocultarlos. No se certifica una demo animada completa por file://.
- No se publicó ni se preparó nada en `sitio/`, `src/` o `android/`.

### Repetir las tres capturas (Windows)

En `_tools/`, instalar lo declarado en su package.json con `npm install --ignore-scripts`. Desde esta carpeta del prototipo, definir `SIGO_APP_ROOT` con la copia de la app que ya tiene node_modules y ejecutar `node _tools/servir-app-real.cjs`. Su caché queda en `_tools/.cache-vite/`, no en la app.

En otra terminal definir `APP_URL=http://127.0.0.1:5199/`, `PYTHON` con el intérprete que tiene Pillow y, si hace falta, `CHROME_PATH`. Ejecutar `node _tools/capturar-app-real.cjs --finales`. El modo `--finales` no regenera Videos, Ensayos ni la galería. `CAPTURA_TIPO=cuenta`, `clases` o `presentaciones` limita una captura durante el trabajo; para el registro final completo se ejecuta sin esa variable.

`node _tools/revisar-finales.cjs` abre un servidor efímero solo en 127.0.0.1 para medir el peso y comparar el video móvil; luego documenta la apertura file:// sin exigir ni fingir que la demo animada esté disponible. Cierra su navegador y servidor al terminar.
