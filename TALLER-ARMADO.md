# Taller de armado APK y AAB

Guía vigente desde el 30-10-2026. Antes: la guía describía una rama divergente, 14 Mbps y una APK gemela obligatoria; esa versión se conserva en `docs/archivo/taller-armado-hasta-20261030.md` como historia.

## Alcance y fuentes de verdad

- Antes de trabajar, leer AGENTS.md, los dos documentos de criterio y esta guía. La orden concreta de Javier manda sobre las reglas anteriores.
- Trabajar desde el commit y formato autorizados, en un worktree aislado; nunca armar en la copia del Escritorio de Javier.
- `scripts/apk.mjs` prepara APK debug; `scripts/play.mjs` prepara AAB release. Un armado no autoriza instalar, distribuir ni publicar.
- `scripts/parcharCamara.mjs` y el código de exportación fijan actualmente 12 Mbps, integrados en #160. No usar las cifras históricas de 14 Mbps.
- Cada worktree tiene su propio node_modules. Preservar los modelos y mediciones existentes; no copiar cientos de MB sin necesidad ni enlazar node_modules.

## Regla de eficiencia

Si una vía falla sin una corrección concreta identificada, detener esa vía, guardar lo avanzado y explicar el bloqueo. No encadenar reintentos a ciegas ni ampliar el encargo. No repetir compilaciones o baterías ya válidas cuando solo cambian documentos.

## APK de prueba

1. Ejecutar `npm run apk` solo si se pide APK. La APK debug incluye los modelos de voz y herramientas de diagnóstico; no es el paquete de Play.
2. No añadir `poner` ni `distribuir` salvo autorización expresa. Si se pide instalar, confirmar dispositivo y usar ADB con su serial; no desinstalar primero.
3. Conservar versión, commit y SHA-256 del paquete. Ante un rechazo de instalación, informar el error; no cambiar a otro teléfono.

## AAB de Play

1. Ejecutar `npm run play` sin argumentos cuando se pide AAB. Confirmar firma y modelos on-demand sin imprimir credenciales.
2. Comprobar el artefacto real con `scripts/revisarContenidoPlay.mjs`, `scripts/revisarR8.mjs`, `scripts/elf16k.mjs` y el checklist `docs/play/ANTES-DE-SUBIR.txt`: diagnóstico apagado, ausencia del motor web/VAD/service worker, clases conservadas, permisos y LOAD/RELRO de 16 KB.
3. Preservar AAB, mapping, SHA-256 y registros antes del siguiente armado. El ícono, los medios de la ficha y sus fuentes no van dentro de la app.
4. La entrega 0.11.2 ya se armó y se subió. Su detalle es `docs/play/entrega-0.11.2.md`. No reconstruirla al consolidar documentación ni exigir una APK gemela: Javier canceló ese armado.
5. `npm run play -- subir` solo conoce la prueba interna. La prueba cerrada existente es Alpha, API `alpha`; no crear otra, cambiar verificadores ni enviar a producción por inferencia.
6. No borrar automáticamente APK/AAB anteriores. Una limpieza requiere su propio alcance; conservar las mediciones de `docs/mediciones/banco-largo/`.

## Fichas y envío

- Fuentes vigentes: `docs/play/ficha/LEEME.md`, los tres textos, 24 capturas, tres gráficos y sus manifiestos de aprobación. Los generadores anteriores están identificados como historia.
- El AAB y la ficha son entregas separadas. El video es una URL de YouTube solo para es-419; no se empaqueta ni se asigna a en-US o pt-BR.
- No asumir que la API puede guardar como borrador: `scripts/ficha.mjs` documenta el rechazo de esa modalidad en esta app. Si el método utilizado envía a revisión al confirmar, debe estar autorizado ese envío.
- No ejecutar `npm run ficha -- subir --directo` como preparación: el script antiguo no incorpora video ni textos alternativos y también sustituye imágenes de tabletas. Para una carga nueva se debe comprobar el alcance exacto antes de ejecutar.
- El envío autorizado del 30-10-2026 verificó por API textos, video y SHA-256 de las 24 capturas en orden y los tres gráficos; íconos, tabletas y pistas se conservaron. Evidencia: `docs/play/ficha/envio-20261030.json`.
- Confirmación de envío no equivale a aprobación ni publicación. No cambiar países, precios, RevenueCat, verificadores o pistas fuera de la orden.

## Al entregar

Registrar qué se produjo y qué no se pudo comprobar. Abrir PR, esperar CI e integrar solo cuando esté autorizado. Sin coautores. Actualizar la copia principal conservando los cambios locales de Javier. Los archivos Gradle que genere cap sync solo por LF/CRLF no son cambios de configuración: comprobar la igualdad del contenido antes de descartarlos.
