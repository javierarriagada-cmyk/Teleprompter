# Propuesta 0.11.2 para la prueba cerrada existente

Preparada el 30-10-2026 desde main `7a47b554f437de39dc30987056728c14f4c6b267`.
Los PR #157, #159, #160 y #161 ya están integrados. Esta entrega conserva esos cambios.

## Estado consultado, sin publicar cambios

- Play: segmento **Prueba cerrada - Alpha**, activo; versión **730 (0.11.1)**, disponible para verificadores específicos. ID del segmento: `4699753757475321939`; API: `alpha`.
- Mayor versionCode subido, consultando bundles y APK: **730**. El número propuesto se obtiene del commit de armado y debe superar ese valor; no procede de una APK de diagnóstico instalada.
- Publicación administrada: **desactivada**. Última publicación: 26-10-2026.
- Verificadores: lista **Grupo Int.**, **19** usuarios, seleccionada; correo de comentarios `hola@sigoteleprompter.com`. No modificar listas, verificadores, países ni segmentos.
- Ficha publicada: es-419, en-US y pt-BR. El diff de aprobación está en `ficha/aprobacion-20261030/`; ícono y 24 imágenes de tabletas conservados.
- Las ediciones de consulta de API se borraron con HTTP 204; una consulta posterior respondió HTTP 400, edición inexistente. Los informes completos se conservan localmente junto a la entrega, sin credenciales.

## Contenido y comprobación del paquete

`scripts/play.mjs` excluye `dist/vad-processor.js` después de Vite y antes de cap sync. Antes: ese sobrante entraba al AAB aunque no viaja el motor web. `public/vad-processor.js` y la APK de diagnóstico lo conservan.

Después de `npm run play`, revisar el AAB real:

```powershell
node scripts/revisarContenidoPlay.mjs android/app/build/outputs/bundle/release/app-release.aab .herramientas/revision-0112
```

Exige JavaScript no vacío, ausencia de los cinco identificadores de paneles, trabajador del motor web, VAD y service worker, y presencia de `guardando-toma`. Verifica el audio de diagnóstico apagado, la ausencia de la cabecera del registro nuevo y LOAD/RELRO de cada biblioteca arm64 con `elf16k.mjs`. El lector y los datos de palabras de subtítulos se conservan. La lectura de `.motor.txt` antiguos no implica escribir medición nueva.

Además: firma de subida, R8, clases protegidas del checklist, permisos (BILLING presente y AD_ID ausente), modelos on-demand y medidas de bundletool. Ningún medio de la ficha, video, documento ni banco se copia a los assets de la app.

Se conserva como contraprueba el AAB anterior: el nuevo comprobador lo rechaza por `base/assets/public/vad-processor.js`, con `guardando-toma` presente y audio de diagnóstico apagado. El informe del nuevo AAB debe quedar correcto antes de aprobar la subida.

## Archivos de revisión

- Fuentes y huellas de la ficha: `ficha/LEEME.md` y `ficha/aprobacion-20261030/`.
- Notas propuestas: `notas-version.txt`, tres bloques menores de 500 caracteres. Describen Sigo+, gestión e idioma de oferta, avisos/menús, bienvenida y guardado. Javier revisa el texto final.
- AAB, APK gemela debug y mapping: se preservan juntos en una carpeta de entrega identificada por versión y commit, con SHA-256 y logs. Ambos paquetes salen del mismo commit, sin teléfonos conectados al armar la APK. No limpiar los paquetes anteriores del Escritorio.
- La suite detectó una petición real de Firebase que sobrevivía al entorno de una prueba antigua. Se aisló únicamente Remote Config en `tarea47.test.tsx`, manteniendo sus comprobaciones y sin cambiar el código de la app.

Las pruebas Motorola de #160 fueron conformes para marca y subtítulos vertical/horizontal. No hubo comparación controlada de la misma toma: no se atribuye porcentaje de mejora ni se exige repetirlas para preparar esta entrega.

## Plan exacto tras la autorización final de Javier

1. Revisar y mezclar el PR de esta entrega; si hay cambios de código posteriores, volver a identificar qué commit y artefactos se van a subir.
2. Confirmar otra vez Alpha activo, 19 verificadores y la misma lista/correo; confirmar publicación administrada y ausencia de otra entrega pendiente. No crear ni pausar segmentos.
3. Confirmar en YouTube Studio que el video español permite inserción y no tiene restricciones incompatibles. Enlace aprobado: `https://www.youtube.com/watch?v=dleH1xz_024`, 36 segundos. Mantener inglés y portugués sin ese video. Falta verificar aceptación final de Play; no reemplazar ni volver a subir el video.
4. **Ficha principal, por separado del AAB:** en Fichas de Play Store, cargar los tres textos aprobados, los ocho PNG de teléfono en orden y su gráfico por idioma. Conservar ícono y tabletas. Añadir el enlace de video solo a es-419 y las descripciones alternativas aprobadas donde la consola las admita. Revisar el diff contra las huellas antes de guardar/enviar. Con publicación administrada apagada, guardar/enviar puede llevar a revisión y publicar al aprobarse: esperar la autorización final. No ejecutar `npm run ficha -- subir --directo` durante preparación; ese script envía la ficha a revisión y no incorpora por sí solo video y textos alternativos.
5. **AAB:** Probar y lanzar → Pruebas → Prueba cerrada → Administrar segmento **Alpha** → Crear una versión nueva. Subir el AAB verificado y confirmar 0.11.2 y un código mayor que 730. Pegar exactamente los tres bloques de notas aprobados. Guardar como borrador y revisar el resumen. Cualquier advertencia nueva se revisa; la falta de símbolos de Vosk es conocida. El mapping viaja en el AAB.
6. Con autorización sobre la entrega concreta, iniciar lanzamiento/enviar para revisión según la consola. No usar `npm run play -- subir`: solo conoce la prueba interna.
7. Verificar la aprobación/publicación de ficha y app por separado; confirmar Alpha activo y los mismos verificadores. Javier instala desde Play y realiza la comprobación del paquete con R8, incluida cuenta Google, compra/restauración/gestión y la toma larga del checklist. La APK gemela debug no sustituye esa comprobación.

Esta propuesta no autoriza merge ni publicación. No cambia precios, países ni RevenueCat.
