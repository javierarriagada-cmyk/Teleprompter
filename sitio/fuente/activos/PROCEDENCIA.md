# Procedencia de imágenes

## Español

Copias exactas de `875acb1`, `docs/pantallas/sitio-nuevo/activos/capturas-webp/crops/`,
con el póster del mismo prototipo. No se regeneran las imágenes ya aprobadas.
La galería phone-03 es una composición anterior; phone-05 conserva un foco antiguo.

## Inglés y portugués de Brasil

- `guiones-ui`, `uso-clases`, `uso-presentaciones`, `uso-ensayos`, `phone-01`, `phone-04`,
  `phone-05`: interfaz React de la app en cada idioma, capturada con
  `sitio/herramientas/capturar-app-real.cjs`. Texto ampliado a la vista no se retoca.
- `uso-videos`, `phone-02`, `phone-08`: misma interfaz React en Grabar LISTO; cámara con
  la señal estándar de prueba de Chrome, sin reutilizar una captura española como cámara.
  Se limita el adaptador web de CameraPreview al recuadro real: no se cambian controles.
  Son provisionales por calidad visual, no tomas Android ni videos de personas.
- `phone-06`: copia del Ajuste de velocidad fija capturado (`uso-ensayos`).
- `phone-03`: recortes de `docs/play/ficha/capturas/{en-US,pt-BR}/03.png`,
  caja `(192,514,888,1752)`, exportada a 720 × 1280 en WebP. El origen es la ficha de
  su idioma. El selector flotante de la composición española no existe en estas fuentes;
  no se falsifica ni se copia en español.

Los guiones de clase y presentación están en `herramientas/guiones-capturas.json`:
The water cycle, Quarterly results, O ciclo da água y Resultados do trimestre.
Son datos de prueba de una clase/presentación, no publicidad. Los perfiles de captura son
aislados; no borran datos de un usuario. Los PNG originales, el texto visible y la
verificación del foco quedan en la carpeta externa de revisión.

## Video

El único MP4 viene de `docs/play/ficha/video/sigo-version-google-play-es.mp4` al armar.
No se duplica aquí ni se asigna a EN/PT. Las licencias de su música permanecen junto a la
fuente en docs/play/ficha/video/.
