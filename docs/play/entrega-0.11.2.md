# Entrega 0.11.2 — 30-10-2026

## Artefacto y código

- AAB armado desde `930408924ff59612e5942ca00ce615eaf534e110`, basado en main `7a47b554f437de39dc30987056728c14f4c6b267`. Incluye los PR #157, #159, #160 y #161.
- Nombre visible 0.11.2; versionCode interno 780. Archivo entregado: `Sigo-0.11.2.aab`, 151.306.876 bytes.
- SHA-256: `7d93c394dcfc02fe660f31ef55bb475e294ff22ac51128b3d0ae06efe5faaba4`.
- Firma verificada, R8 y clases protegidas conservadas, permisos revisados (BILLING presente, AD_ID ausente), modelos es/en/pt on-demand y LOAD/RELRO de 16 KB comprobados en las seis bibliotecas arm64.
- El contenido real excluye paneles de diagnóstico, registro nuevo del motor, audio de diagnóstico, motor web, VAD y service worker; conserva el guardado y las palabras de subtítulos. El AAB anterior sirvió de contraprueba del detector de VAD.

Javier subió el AAB manualmente a la prueba cerrada Alpha. La lectura de API posterior al envío de las fichas conserva `alpha` con 0.11.2 / 780 y estado `completed`. Ese valor de la pista no certifica por sí solo la aprobación ni disponibilidad en el teléfono. No se modificaron pistas al cargar las fichas.

Antes: la propuesta exigía una APK gemela y decía que el AAB aún no estaba subido. Javier canceló la APK y realizó la subida manual. Esta consolidación no reconstruye ni instala paquetes.

## Fichas enviadas a revisión

Con autorización expresa de Javier, el 30-10-2026 a las 21:18 de America/Santiago (2026-10-31T00:18:27Z) se confirmó la carga por API de las fichas aprobadas:

- es-419, en-US y pt-BR: descripción completa, ocho imágenes de teléfono por idioma en orden 01–08 y gráfico correspondiente.
- Video español: https://www.youtube.com/watch?v=dleH1xz_024. Inglés y portugués permanecen sin video.
- Nombres, descripciones breves, íconos, 24 imágenes de tabletas y pistas conservados.
- Validación de Google antes de confirmar; lectura nueva posterior con igualdad de texto, video y SHA-256 de cada imagen en su orden.

Evidencia verificable en `ficha/envio-20261030.json`. El estado documentado es enviado a revisión; aprobación y publicación de Google no se han comprobado. La API utilizada no ofrece el campo de texto alternativo: el CSV aprobado permanece como material para una edición futura en la consola. No se verificaron inserción ni restricciones en YouTube Studio; Play aceptó el campo de video.

## Herramientas y documentación

- `scripts/play.mjs` excluye únicamente `dist/vad-processor.js` antes de cap sync; el original y la APK de diagnóstico se conservan.
- `scripts/revisarContenidoPlay.mjs` revisa el AAB real con control positivo y 16 KB.
- `src/pruebas/tarea47.test.tsx` aísla Remote Config para evitar solicitudes de Firebase fuera de jsdom, sin cambiar el código de la app.
- Las fuentes reproducibles, los medios aprobados y sus licencias se guardan en `ficha/`; `.gitattributes` conserva sus bytes para respetar las huellas aprobadas.
- Los generadores de la serie anterior están bloqueados o redirigidos para que no sobrescriban la serie vigente.

La revisión Motorola del PR #160 fue conforme en marca y subtítulos vertical/horizontal; no hubo comparación controlada para atribuir un porcentaje de mejora. No corresponde repetirla para consolidar archivos. Las mediciones locales de banco-largo se conservan.
