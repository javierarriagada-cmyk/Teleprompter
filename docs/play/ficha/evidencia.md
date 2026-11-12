# Evidencia vigente de la ficha — 30-10-2026

La referencia de código de esta consolidación es main `7a47b554f437de39dc30987056728c14f4c6b267`, con los PR #159, #160 y #161 integrados. Las imágenes y traducciones son las aprobadas por Javier; esta lista sitúa las funciones anunciadas sin reinterpretar la historia como estado actual.

| Afirmación aprobada | Fuente vigente |
| --- | --- |
| Sigue la voz y espera cuando el lector se detiene | `src/lib/seguidor.ts`, `src/lib/avance.ts`, `src/hooks/useSeguidor.ts`; motor nativo Vosk |
| Reconocimiento en español, inglés y portugués; funcionamiento local tras descargar el modelo | `src/motor/MotorNativo.ts`, `src/lib/vozAPedido.ts`, `android/model-es`, `android/model-en`, `android/model-pt` |
| Cámara frontal/trasera, detrás del texto, recuadro móvil u oculta; vertical y horizontal | `src/lib/camara.ts`, `src/components/FichasListo.tsx`, `src/components/RecuadroCamara.tsx`, `src/components/TeleprompterView.tsx` |
| Subtítulos del guion y tiempos de voz, tres estilos, exportación y filtros | `src/lib/registro.ts`, `src/lib/subtitulos.ts`, `src/lib/filtros.ts`, `android/app/src/main/java/com/sigoteleprompter/app/CapaDeSubtitulos.java`, `ExportadorDeTomas.java` |
| Pausas fuera del video; palma para pausar/seguir y V en pausa para terminar con cámara frontal | `src/lib/pausaToma.ts`, `src/lib/tramos.ts`, `src/lib/confirmadorGestos.ts` |
| Velocidad fija, tamaño, tipografía, ancho, colores y espejo | `src/lib/velocidadFija.ts`, `src/components/PanelAjustes.tsx`, `src/components/estiloLectura.ts` |
| Edición e importación TXT, MD y DOCX; acotaciones fuera de lectura y subtítulos | `src/lib/importar.ts`, `src/lib/acotaciones.ts`, `src/components/EditorView.tsx`, `src/components/BarraEditorVacio.tsx` |
| Uso sin iniciar sesión y respaldo opcional de guiones con Google | `src/lib/cuenta.ts`, `src/lib/respaldo.ts`, `src/components/PanelAjustes.tsx` (TarjetaCuenta) |
| Gratis con límites por sesión y marca; Sigo+ elimina límites y marca | `src/lib/limites.ts`, `src/lib/suscripcion.ts`, `src/lib/oferta.ts`, `src/App.tsx`, `android/app/src/main/java/com/sigoteleprompter/app/CapaDeMarca.java` |
| Planes mensual y anual y condiciones visibles antes de contratar | Oferta y Customer Center de RevenueCat; productos configurados en Google Play. La ficha no fija precios ni promete elegibilidad de prueba universal. |

Antes: la evidencia decía «no hay cuentas» y trataba el respaldo propio como inexistente. Esa afirmación es histórica desde la incorporación de la cuenta opcional y el respaldo con Google; se conserva en `historial/evidencia-hasta-20261025.md`. También es historia la sección sobre portugués aún fuera de main.

La procedencia visual exacta está en `aprobacion-20261030/procedencia-relativa.json`: las composiciones con personas generadas no se presentan como capturas nativas nuevas. El ícono y las 24 imágenes de tabletas están conservados por SHA-256, sin nueva afirmación de pruebas sobre ellas. Las mediciones del PR #160 no establecen un porcentaje de mejora respecto del guardado anterior: no hubo comparación controlada de la misma toma.

Video español: `video-youtube.json`. La reproducción se comprobó en el navegador y Play aceptó el campo en la carga. El envío autorizado y su lectura posterior se registran en `envio-20261030.json`; la aceptación de la revisión y la publicación no están verificadas. La inserción y las restricciones de YouTube Studio no se comprobaron por separado. El CSV alternativo está conservado, pero no se cargó por API porque esa interfaz no ofrece el campo.

## Dirección 1.1, fase 1 -12-11-2026-

Referencia de código: main `fe422ee`. Afirmaciones nuevas de las capturas 1, 2, 3 y 5, del gráfico y de las descripciones breves propuestas. La tabla de arriba, del 30-10, se conserva tal cual.

| Afirmación | Dónde aparece | Fuente en fe422ee |
| --- | --- | --- |
| El texto avanza mientras lees en voz alta -«Tú hablas. Sigo te sigue.»- | Captura 1, breves B | `src/lib/seguidor.ts`, `src/lib/avance.ts`, `src/hooks/useSeguidor.ts` |
| Si te detienes o te sales del guion, el texto espera; al volver, sigue contigo sin tocar la pantalla | Captura 2, gráfico, breves B y C | `src/lib/seguidor.ts`, `src/lib/avance.ts`, `src/hooks/useSeguidor.ts`. La cruda 02-espera-a es una pausa real de 3,3 s. |
| La ventana flotante: lees encima de la cámara u otra app | Captura 3 | `src/flotante/PaginaFlotante.tsx`, que usa `useSeguidor`. La bajada es literal de `src/textos/es.ts`: consecuenciaFlotante, «Lees encima de la cámara u otra app». En la captura lleva punto final, por pedido de Javier del 12-11. |
| Video con subtítulos de las palabras de tu guion, al ritmo de tu voz | Captura 5 | `src/lib/subtitulos.ts` -calza lo oído con el guion palabra por palabra-, `src/lib/registro.ts`, `android/app/src/main/java/com/sigoteleprompter/app/CapaDeSubtitulos.java` |
| El micrófono verde se mueve con tu voz mientras Sigo escucha | Captura 1, solo la imagen | Cruda 01-voz-b. La captura no lo rotula como aviso de «te escucho» ni de «te perdí». |

Lo que no se afirma: ni exclusividad -PromptSmart+ anuncia también la espera al improvisar y el uso local-, ni «nunca» o «siempre», ni comparaciones. La breve de control es la publicada hoy, sin cambios.
