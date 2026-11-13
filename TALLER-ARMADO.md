# Taller de armado APK y AAB

Guía vigente desde el 30-10-2026, al día el 12-11-2026 con lo que Javier decidió después de la 1.1 (808). Dice lo mismo que el paso a paso de `docs/play/ANTES-DE-SUBIR.txt`. Antes: la guía describía una rama divergente, 14 Mbps y una APK gemela obligatoria; esa versión se conserva en `docs/archivo/taller-armado-hasta-20261030.md` como historia.

## Alcance y fuentes de verdad

- Antes de trabajar, leer AGENTS.md, los dos documentos de criterio y esta guía. La orden concreta de Javier manda sobre las reglas anteriores.
- Trabajar desde el commit y formato autorizados, en un worktree aislado en una ruta sin uuid. La primera vez se prueba en el próximo armado real. Si la comprobación de licencias falla ahí -en el scratchpad fallaba porque `npm ls` tapa con `***` la ruta con el uuid de la sesión-, se anota el error exacto, sin reintentar en bucle, y el AAB se arma en la copia del Escritorio de Javier, en `main` y sin cambiar de rama; al cerrar, `git diff --stat` tiene que salir vacío. Antes -hasta el 12-11-2026-: «nunca armar en la copia del Escritorio de Javier». La 0.11.0, la 0.11.1 y la 1.1 (808) se armaron ahí.
- `scripts/apk.mjs` prepara APK debug; `scripts/play.mjs` prepara AAB release. Un armado no autoriza instalar, distribuir ni publicar.
- `scripts/parcharCamara.mjs` y el código de exportación fijan actualmente 12 Mbps, integrados en #160. No usar las cifras históricas de 14 Mbps.
- El AAB de Play sale de una copia con su propio `npm ci`, desde `package-lock.json`, sin nada heredado de otra copia. Las APK de prueba pueden enlazar el node_modules del repo, por velocidad. Preservar los modelos y mediciones existentes; no copiar cientos de MB sin necesidad. Antes -hasta el 12-11-2026-: «Cada worktree tiene su propio node_modules. […] ni enlazar node_modules».

## Regla de eficiencia

Si una vía falla sin una corrección concreta identificada, detener esa vía, guardar lo avanzado y explicar el bloqueo. No encadenar reintentos a ciegas ni ampliar el encargo. No repetir compilaciones o baterías ya válidas cuando solo cambian documentos.

## APK de prueba

1. Ejecutar `npm run apk` solo si se pide APK. La APK debug incluye los modelos de voz y herramientas de diagnóstico; no es el paquete de Play.
2. No añadir `poner` ni `distribuir` salvo autorización expresa. Si se pide instalar, confirmar dispositivo y usar ADB con su serial; no desinstalar primero.
3. Conservar versión, commit y SHA-256 del paquete. Ante un rechazo de instalación, informar el error; no cambiar a otro teléfono.

## AAB de Play

1. Ejecutar `npm run play` sin argumentos cuando se pide AAB. Confirmar firma y modelos on-demand sin imprimir credenciales.
2. Comprobar el artefacto real con `scripts/revisarContenidoPlay.mjs`, `scripts/revisarR8.mjs`, `scripts/elf16k.mjs` y el checklist `docs/play/ANTES-DE-SUBIR.txt`: diagnóstico apagado, ausencia del motor web/VAD/service worker, clases conservadas, permisos y LOAD/RELRO de 16 KB. `npm run play` todavía no llama a `revisarContenidoPlay.mjs`: se corre a mano, `node scripts/revisarContenidoPlay.mjs <aab> <carpeta de entrega>\revisarContenidoPlay`; conectarlo queda para una orden. `revisarR8.mjs` es una función que usa `play.mjs`: correrlo suelto no revisa nada. Antes de darlo por bueno, la APK universal sacada del AAB se corre en teléfonos de Test Lab con los recorridos de `pruebas-agente/build-de-play`, como dice el paso A3 de `ANTES-DE-SUBIR.txt`. La APK gemela no sirve para esto: es debug y R8 no la toca. El 12-11-2026, la 1.1 (808) pasó todas las comprobaciones y se cerraba al abrir en todos los teléfonos.
3. Cada entrega va entera a `C:\Users\56990\Desktop\teleprom\06-entregas\<versión>-<versionCode>\` antes del siguiente armado -Javier, 13-11-2026: «debería estar dentro de teleprom»; antes, `C:\Users\56990\Sigo-entregas`-: AAB, APK, SHA-256, commit, registros, `mapping.txt` y los demás informes de R8, notas, la revisión de contenido y un LEEME con el estado en cinco pasos -armado, verificado, instalado, enviado a revisión y publicado-, cada uno solo con evidencia. Esa carpeta nunca se limpia. El ícono, los medios de la ficha y sus fuentes no van dentro de la app. Antes -hasta el 12-11-2026-: «Preservar AAB, mapping, SHA-256 y registros antes del siguiente armado.»
4. La APK gemela: cuando se arma para Play, AAB y APK del mismo commit y con el mismo versionCode, siempre, con `adb kill-server` antes de armar las dos. Para probar un arreglo, solo APK. La entrega 0.11.2 ya se armó y se subió, y su detalle es `docs/play/entrega-0.11.2.md`: no se reconstruye, y su APK gemela no se exige, porque Javier canceló ese armado. Antes -hasta el 12-11-2026-: «No reconstruirla al consolidar documentación ni exigir una APK gemela: Javier canceló ese armado.»
5. `npm run play -- subir` solo conoce la prueba interna. La prueba cerrada existente es Alpha, API `alpha`; no crear otra, cambiar verificadores ni enviar a producción por inferencia.
6. En el Escritorio queda solo la versión nueva: con la entrega ya copiada a `teleprom\06-entregas` y revisada, cada AAB o APK anterior del Escritorio va a la Papelera de Windows, nunca borrado para siempre -Javier, 26-10-2026-. Conservar las mediciones de `docs/mediciones/banco-largo/`. Antes -hasta el 12-11-2026-: «No borrar automáticamente APK/AAB anteriores. Una limpieza requiere su propio alcance».

## Fichas y envío

- Fuentes vigentes: `docs/play/ficha/LEEME.md`, los tres textos, 24 capturas, tres gráficos y sus manifiestos de aprobación. Los generadores anteriores están identificados como historia.
- El AAB y la ficha son entregas separadas. El video es una URL de YouTube solo para es-419; no se empaqueta ni se asigna a en-US o pt-BR.
- No asumir que la API puede guardar como borrador: `scripts/ficha.mjs` documenta el rechazo de esa modalidad en esta app. Si el método utilizado envía a revisión al confirmar, debe estar autorizado ese envío.
- No ejecutar `npm run ficha -- subir --directo` como preparación: el script antiguo no incorpora video ni textos alternativos y también sustituye imágenes de tabletas. Para una carga nueva se debe comprobar el alcance exacto antes de ejecutar.
- El envío autorizado del 30-10-2026 verificó por API textos, video y SHA-256 de las 24 capturas en orden y los tres gráficos; íconos, tabletas y pistas se conservaron. Evidencia: `docs/play/ficha/envio-20261030.json`.
- Confirmación de envío no equivale a aprobación ni publicación. No cambiar países, precios, RevenueCat, verificadores o pistas fuera de la orden.

## Al entregar

Registrar qué se produjo y qué no se pudo comprobar. Abrir PR, esperar CI e integrar solo cuando esté autorizado. Sin coautores. Actualizar la copia principal conservando los cambios locales de Javier. Los archivos Gradle que genere cap sync solo por LF/CRLF no son cambios de configuración: comprobar la igualdad del contenido antes de descartarlos.
