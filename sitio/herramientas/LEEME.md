# Capturas y revisión del sitio

Estas herramientas trabajan por HTTP local y no publican. Se trasladan del prototipo y
usan su misma dependencia `puppeteer-core`; no se cambia el package.json de la app.

1. En la raíz del worktree: `npm ci`. En esta carpeta: `npm ci --ignore-scripts`.
2. Definir `SIGO_APP_ROOT` con la raíz del worktree y ejecutar
   `node sitio/herramientas/servir-app-real.cjs` desde la raíz. Sirve React en 127.0.0.1:5199
   con caché en esta carpeta; no cambia src/.
3. En otra terminal, definir `SIGO_CAPTURAS` con una carpeta externa para los PNG y `PYTHON`
   con un intérprete que tenga Pillow. Ejecutar `node sitio/herramientas/capturar-app-real.cjs`.
   Chrome se puede indicar con `CHROME_PATH`; `CAPTURA_IDIOMA=es|en|pt` y `CAPTURA_TIPO`
   permiten una captura puntual. En cámara se muestra `persona-A.png` en vertical y
   `persona-C.png` en horizontal, desde `docs/play/ficha/herramientas/fuente/`, con la licencia
   comercial documentada en `LICENCIA-personas.txt`. Se usa `object-fit: cover` dentro del
   recuadro real y se verifica que los controles no cambien. No hay reconocimiento de voz
   ni grabación nativa. Antes: se admitía FAKE_VIDEO y la señal de prueba de Chrome.
   `--correccion` limita la ejecución a las cámaras EN/PT y las tres españolas autorizadas:
   phone-05, phone-06 y uso-ensayos. Estas conservan su medida anterior y usan un perfil
   limpio sin grabaciones de ejemplo. Nunca regenera las cámaras españolas aprobadas.
4. Armar con `node sitio/armar.mjs`. Con `SIGO_CAPTURAS` definido, ejecutar
   `node sitio/herramientas/revisar-sitio.cjs`. Sirve public con direcciones limpias, genera
   evidencia fuera del repo y cierra navegador/servidor. Los JSON registran peso, idioma,
   errores y límites; no son pruebas unitarias de posición de la app.
5. Desde el 04-11-2026 PLAY_PUBLICADO queda en true, porque Sigo ya está pública en Play: la
   revisión normal es la de la vista pública, con `--publicado`. Antes: «Para la vista pública:
   cambiar temporalmente PLAY_PUBLICADO a true, armar y ejecutar la revisión con `--publicado`.
   Volver a false y rearmar antes de guardar el commit.»

El recorte de phone-03 se repite desde la ficha de cada idioma con la caja
(192,514,888,1752), tamaño final 720 × 1280. La composición española anterior no tiene
un selector flotante equivalente en las fuentes EN/PT: no se simula esa interfaz.
Ver `sitio/fuente/activos/PROCEDENCIA.md` para la procedencia de cada imagen. No quedan imágenes provisionales. Las notas `.md` de activos no se copian al sitio público.
