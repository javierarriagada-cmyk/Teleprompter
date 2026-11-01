# Procedencia de imágenes

## Español

Copias exactas de `875acb1`, `docs/pantallas/sitio-nuevo/activos/capturas-webp/crops/`,
con el póster del mismo prototipo, excepto las tres capturas españolas autorizadas en la
corrección del PR #168: `phone-05`, `phone-06` y `uso-ensayos`. Estas se repitieron con
el perfil aislado y limpio de Guiones, sin grabaciones de ejemplo, con el mismo contenido
de Ajustes y las mismas dimensiones anteriores. El foco se retira antes de fotografiar.
La galería phone-03 conserva la composición anterior aprobada.

Antes: phone-05 conservaba el marco de foco, el 0:42 y una sombra de la biblioteca;
phone-06 y uso-ensayos traían la misma sombra. Esos rastros se eliminaron al recapturar.
Las cámaras españolas `uso-videos`, `phone-02` y `phone-08` permanecen idénticas.

## Inglés y portugués de Brasil

- `guiones-ui`, `uso-clases`, `uso-presentaciones`, `uso-ensayos`, `phone-01`, `phone-04`,
  `phone-05`: interfaz React de la app en cada idioma, capturada con
  `sitio/herramientas/capturar-app-real.cjs`. Texto ampliado a la vista no se retoca.
- `uso-videos` y `phone-02`: interfaz React en Grabar LISTO, en el idioma correspondiente,
  con `docs/play/ficha/herramientas/fuente/persona-A.png` en el recuadro.
- `phone-08`: la misma interfaz en horizontal, con `persona-C.png`.
  Ambas personas son imágenes generadas, autorizadas para uso comercial según
  `docs/play/ficha/herramientas/fuente/LICENCIA-personas.txt`. No son capturas españolas.
  La herramienta muestra la imagen solo dentro del hueco real de cámara, con
  `object-fit: cover` y la cara visible; comprueba que no cambien botones ni etiquetas.
  Se conserva el límite del adaptador CameraPreview para evitar desbordes del viewport.
  Antes: se mostraba la señal de prueba de Chrome. Ya no quedan imágenes provisionales.
  Estas siguen siendo capturas React, no tomas Android ni prueba de cámara nativa.
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


## Notas internas

Este archivo y `google-play/ORIGEN.md` permanecen solo en la fuente. El filtro del armado
excluye todos los `.md` de `public/activos/`; los medios y SVG sí se copian.
