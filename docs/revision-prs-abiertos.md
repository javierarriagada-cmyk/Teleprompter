# Revisión de los PR abiertos

Revisión hecha el 25-10-2026 contra `main` en `84450b8ad2b5f5a07939bc3dc8bf204132c7a0f9`. La lista de GitHub tenía exactamente los 28 números solicitados; no había otro PR abierto ajeno que agregar. No se cambió el estado de ningún PR ni se escribió en sus ramas.

El estado «a medias» significa que una parte de la función o de las recomendaciones sí llegó a `main`, pero no el documento, el conjunto completo de cambios o la herramienta original del PR. Las referencias `archivo:línea` son del `main` revisado. Los documentos rectores describen la situación al 15-10; si una descripción antigua no coincide con el código actual, manda el código. Las capturas y afirmaciones sobre el aspecto en un teléfono quedan **[sin verificar]**: esta revisión no tuvo teléfono.

## Corrección del 2026-10-25

Javier pidió revisar este informe. Lo que cambió y por qué:

1. **Las cuentas.** `gh pr list --state open` da hoy 29 PR abiertos: este mismo #153 y los 28 revisados (#61, #65, #67, #70, #82, #89, #90, #91, #92, #93, #95, #96, #103, #104, #105, #106, #107, #108, #109, #111, #112, #113, #114, #115, #121, #125, #128 y #129). El #110 **no está abierto** (`gh pr view 110`: CLOSED), así que «#103 a #115» son 12 PR, no 13. La lista vieja de CERRAR tenía 26 números, no 27; 26 + #125 + #129 = 28. Las cuentas viejas cuadraban, pero escribir «#103 a #115» se prestaba a contar el #110.
2. **La regla nueva.** «Cerrar porque ya está en `main`» exige evidencia en `origin/main` (`84450b8`): archivo:línea o commit. Cuando el contenido propio del PR (su documento, su herramienta) no está en `main`, el PR queda **NO ESTÁ** y sale de CERRAR: si es texto que vale como historia o lo cita `main`, va a RESCATAR (solo el texto, como ya se hacía con #125 y #129); si es código o un recurso cuyo destino no está claro, va a DEJAR ABIERTO con pregunta para Javier.
3. **El #61.** `docs/investigacion/idiomas.md` **no está en `main`** (`git log origin/main -- docs/investigacion/idiomas.md` vacío), pero `main` lo cita como fuente en cuatro lugares: `docs/play/ANTES-DE-SUBIR.txt:67-68`, `scripts/bajar-modelo.mjs:24`, `src/lib/detectarIdioma.ts:35` y `src/pruebas/portuguesVoz.test.ts:55`; además el encargo lo pide como entregable (`docs/investigacion-idiomas.txt:116`). Pasa a RESCATAR, en la misma ruta que cita `main`.
4. **#125 y #129.** Se comprobaron archivo por archivo (tablas más abajo).

Todas las líneas citadas en la tabla se leyeron en `origin/main` (`84450b8`) el 2026-10-25, y todos los commits citados son ancestros de `origin/main`. «Sin verificar» marca lo que no se comprobó.

## Resumen corregido (2026-10-25)

| PR | Decisión | ¿Contenido del PR en `main`? | Evidencia en `main` (archivo:línea o commit corto) |
|---:|---|---|---|
| #61 | **RESCATAR** (antes CERRAR) | NO ESTÁ | `docs/investigacion/idiomas.md` ausente; lo citan `docs/play/ANTES-DE-SUBIR.txt:67`, `scripts/bajar-modelo.mjs:24`, `src/lib/detectarIdioma.ts:35`, `src/pruebas/portuguesVoz.test.ts:55` |
| #65 | **RESCATAR** (antes CERRAR) | NO ESTÁ (el documento); la función sí | `docs/tarea88.txt` del PR (encargo del 03-10, 1.067 líneas) es otra versión que `docs/archivo/tarea88.txt` (encargo del 04-10, 342 líneas). La función: `src/lib/pausaToma.ts:42`, `docs/decisiones-de-diseno.txt:988` |
| #67 | **RESCATAR** (antes CERRAR) | NO ESTÁ (completo) | En `docs/archivo/pantallas/tarea89/` hay 14 archivos, pero `docs/tarea89.txt` del PR trae 160 líneas más que `docs/archivo/tarea89.txt` y `medidas-implementacion.md` 317 más. El visor: `src/lib/visorDeLado.ts:26`, `docs/archivo/tarea90.txt` |
| #70 | CERRAR | Sí (el comportamiento) | `src/hooks/useSeguidor.ts:158`; prueba `src/pruebas/tarea89-tomas.test.tsx:125,174`; commit `c341f12`. La prueba propia del PR (`tarea89-registro-reinicio.test.tsx`) no está; la cubre la de tarea89-tomas |
| #82 | **RESCATAR** (antes CERRAR) | NO ESTÁ | `docs/peso/*`, `scripts/medir-peso.mjs` y `src/pruebas/tarea103-peso.test.ts` ausentes |
| #89 | CERRAR | Sí | `src/components/TeleprompterView.tsx:1850`; `src/pruebas/desplazarTextoListo.test.tsx:44,121`; `ebc0c43` |
| #90 | CERRAR | Sí | `src/lib/camara.ts:254`; `src/components/PanelAjustes.tsx:547`; `src/pruebas/estabilizacion.test.ts`; `27aaf4d` |
| #91 | CERRAR | Sí | `src/pruebas/expressive-botones.test.tsx:27`; `4bf5737` |
| #92 | CERRAR | Sí | `src/__tests__/entrada-a-tiempo.test.tsx:38`; `src/components/Entrada.tsx:168`; `12a0868` |
| #93 | CERRAR | Sí | `src/components/PantallaAjustes.tsx` ya no existe; `src/components/PanelAjustes.tsx:710`; `src/pruebas/pantallas.test.tsx:869`; `353fffa` |
| #95 | CERRAR | Sí | `src/App.tsx:60`; `src/lib/accesosDirectos.ts:23`; `src/pruebas/accesosDirectos.test.tsx:104`; `0c033a3` |
| #96 | CERRAR | Sí | `src/components/estiloLectura.ts:57`; `src/pruebas/lectura.test.tsx:944`; `src/pruebas/tarea72.test.tsx:87`; `4c04a73` |
| #103 | **RESCATAR** (antes CERRAR) | NO ESTÁ | `docs/estudios/sistema-visual/ESTUDIO-2-SISTEMA-VISUAL.md` ausente |
| #104 | **RESCATAR** (antes CERRAR) | NO ESTÁ | `docs/estudios/recorridos/informe.md` ausente |
| #105 | **RESCATAR** (antes CERRAR) | NO ESTÁ | `docs/estudios/accesibilidad/informe-accesibilidad.md` ausente |
| #106 | **RESCATAR** (antes CERRAR) | NO ESTÁ | `docs/estudios/textos/informe.md` ausente |
| #107 | **RESCATAR** (antes CERRAR) | NO ESTÁ | `docs/estudios/modernidad/informe.md` ausente |
| #108 | **RESCATAR** (antes CERRAR) | NO ESTÁ | `docs/estudios/motor/informe.md` ausente |
| #109 | CERRAR | Sí | `src/pruebas/usabilidad1.test.tsx:29,90`; `src/textos/es.ts:358`; `f33703a` |
| #111 | CERRAR | Sí | `src/pruebas/ritmoEsquinas.test.ts:15,29`; `88f98e6` |
| #112 | CERRAR | Sí | `src/styles-ajustes.css:166,1315`; `b3fc817` |
| #113 | CERRAR | Sí | `src/pruebas/accesibilidadEstudio3.test.tsx:48,96`; `72df550` |
| #114 | CERRAR | Sí | `src/pruebas/estudio5-textos.test.tsx:18`; `src/textos/es.ts:196`; `95acde8` |
| #115 | **DEJAR ABIERTO** (antes CERRAR) | NO ESTÁ | `docs/pantallas/portada/` ausente (SVG, PNG y `svg-de-pantalla.mjs`) |
| #121 | **DEJAR ABIERTO** (antes CERRAR) | NO ESTÁ | Faltan 6 de sus 11 archivos (`BancoLargo.java` debug y release, `scripts/banco-largo.mjs`, `useBancoLargo.ts`, `bancoLargo.ts`, `vigiaDetencion.ts`). El banco largo de `main` es otro: `613f257`, `d81c397` |
| #125 | RESCATAR | NO ESTÁ (el informe) | Arreglo posterior en `e62dec7`; `docs/mediciones/toma-25-min/` ausente |
| #128 | CERRAR | A medias: la parte funcional sí, la sonda no | `src/components/ReproductorGrabacion.tsx:110,352`; `ServidorLocal.java:32,71`; `PedidoLocalTest.java` existe; `c3b822f`. No están `MedirServidorPlugin.java`, `src/lib/medirServidor.ts` ni su prueba (ver dudas) |
| #129 | RESCATAR | NO ESTÁ (el informe) | Arreglo posterior en `0cea92a`; `docs/mediciones/toma-30-min/` ausente |

**Totales (28 PR revisados, sin contar este #153):** CERRAR 14 · RESCATAR 12 · DEJAR ABIERTO 2 · MEZCLAR 0.

## Listas para ejecutar (corregidas, 2026-10-25)

- **CERRAR (14), con evidencia en `main`:** #70, #89, #90, #91, #92, #93, #95, #96, #109, #111, #112, #113, #114 y #128.
- **MEZCLAR:** ninguno.
- **RESCATAR (12), solo texto; no se rescatan capturas, audio, binarios ni herramientas:**
  - #61: `docs/investigacion/idiomas.md` → misma ruta, `docs/investigacion/idiomas.md` (la ruta que ya cita `main`).
  - #65: `docs/tarea88.txt` → `docs/archivo/tarea88-encargo-03-10.txt` (no pisa el `docs/archivo/tarea88.txt` del 04-10).
  - #67: `docs/tarea89.txt` y `docs/pantallas/tarea89/medidas-implementacion.md` → junto a sus versiones en `docs/archivo/` (duda abajo: reemplazar o guardar al lado).
  - #82: `docs/peso/informe.txt`, `medicion-1d72aeb.txt` y `modelos.txt` → `docs/archivo/peso/` (las cifras son del AAB `1d72aeb`, no del actual).
  - #103: `ESTUDIO-2-SISTEMA-VISUAL.md` → `docs/archivo/estudios/sistema-visual/`.
  - #104: `informe.md` → `docs/archivo/estudios/recorridos/`.
  - #105: `informe-accesibilidad.md` → `docs/archivo/estudios/accesibilidad/`.
  - #106: `informe.md` → `docs/archivo/estudios/textos/`.
  - #107: `informe.md` → `docs/archivo/estudios/modernidad/`.
  - #108: `informe.md` → `docs/archivo/estudios/motor/`.
  - #125: `docs/mediciones/toma-25-min/INFORME.txt` → `docs/archivo/mediciones/toma-25-min/INFORME.txt`.
  - #129: `docs/mediciones/toma-30-min/INFORME.txt` → `docs/archivo/mediciones/toma-30-min/INFORME.txt`.
  - Los estudios #103 a #108 van a `docs/archivo/` y no a `docs/`, porque la guía los marca SIN VERIFICAR (`docs/lo-que-hay-que-saber.txt:211-212`) y `docs/archivo/LEEME.txt` dice que esa carpeta «ES HISTORIA».
- **DEJAR ABIERTO / preguntas para Javier (2):**
  - #115: ¿sirve todavía el SVG de la portada del 14-10, si la portada cambió el 20-10 (`8fbe883`)? Si sirve, se rescata; si no, se cierra.
  - #121: ¿se descarta la sonda de 35 min (`BancoLargo.java`, `vigiaDetencion.ts`) o se guarda? `main` la reemplazó por otro camino, pero el código no está.

## #125 y #129: qué se rescata y qué queda fuera

Destino: `docs/archivo/mediciones/` **no existe todavía en `main`**; se crea al rescatar. Las mediciones vigentes viven en `docs/mediciones/` (por ejemplo `docs/mediciones/motor-suelta/INFORME.txt`); estos dos informes van a `docs/archivo/` porque son registros anteriores al arreglo. El tipo de cada archivo sale de su extensión y de su contenido en la rama (`git cat-file -s`).

**#125 (rama `motor-investigacion`), 12 archivos:**

| Archivo (bajo `docs/mediciones/toma-25-min/`) | Tipo | Bytes | ¿Se rescata? |
|---|---|---:|---|
| `INFORME.txt` | texto, informe | 10.763 | **Sí** → `docs/archivo/mediciones/toma-25-min/INFORME.txt` |
| `LEEME.txt` | texto | 1.453 | No |
| `audio.flac` | audio (binario) | 20.203.835 | No |
| `guion.txt` | texto | 15.814 | No |
| `herramientas/detalle.ts` | código TS | 2.757 | No |
| `herramientas/medir.ts` | código TS | 9.832 | No |
| `herramientas/transcribir.py` | código Python | 3.584 | No |
| `resultados/medir-con-parentesis-a-mano-20.txt` | texto, resultado | 10.464 | No |
| `resultados/medir-con-parentesis-a-mano-60.txt` | texto, resultado | 12.588 | No |
| `resultados/medir-sin-parentesis-a-mano-20.txt` | texto, resultado | 7.705 | No |
| `resultados/medir-sin-parentesis-a-mano-60.txt` | texto, resultado | 10.684 | No |
| `resultados/palabras.json` | JSON, resultado | 146.591 | No |

**#129 (rama `motor-toma-30-min`), 13 archivos:**

| Archivo (bajo `docs/mediciones/toma-30-min/`) | Tipo | Bytes | ¿Se rescata? |
|---|---|---:|---|
| `INFORME.txt` | texto, informe | 11.695 | **Sí** → `docs/archivo/mediciones/toma-30-min/INFORME.txt` |
| `LEEME.txt` | texto | 2.190 | No |
| `audio.wav` | audio (binario) | 58.575.500 | No |
| `bitacora-telefono.motor.txt` | texto, bitácora (60.073 líneas) | 4.243.572 | No |
| `guion.txt` | texto | 15.814 | No |
| `herramientas/comparar.ts` | código TS | 8.408 | No |
| `resultados/comparar.txt` | texto, resultado | 2.300 | No |
| `resultados/medir-a-mano-20.json` | JSON, resultado | 5.849 | No |
| `resultados/medir-a-mano-20.txt` | texto, resultado | 10.228 | No |
| `resultados/medir-a-mano-60.json` | JSON, resultado | 5.702 | No |
| `resultados/medir-a-mano-60.txt` | texto, resultado | 11.013 | No |
| `resultados/palabras.json` | JSON, resultado | 188.205 | No |
| `resultados/rastro-finales.txt` | texto, resultado | 96.185 | No |

**Corrección:** lo que queda fuera **no son solo videos o binarios**. Ningún PR trae video. El único binario de cada uno es el audio (`audio.flac` en #125, `audio.wav` en #129); el resto es texto, código y JSON (LEEME, guion, herramientas, resultados y, en #129, la bitácora de 4,2 MB). Lo que queda fuera suma 20.425.307 bytes en #125 y 63.164.966 bytes en #129, igual que decía el informe. Si Javier quiere guardar además los LEEME, son 1.453 y 2.190 bytes (sin decidir).

## Dudas (2026-10-25)

- **#128:** se deja en CERRAR porque su parte funcional (servidor local, `PedidoLocal`, su prueba) está en `main` en `c3b822f` y el título del PR dice «no se mezcla». Pero la sonda de medición (`MedirServidorPlugin.java`, `medirServidor.ts`) **no está**. Si Javier quiere guardar la sonda, pasa a DEJAR ABIERTO.
- **#70:** el comportamiento y una prueba equivalente están en `main`, pero el archivo de prueba propio del PR no. Se tomó como «está».
- **#67:** las versiones de `tarea89.txt` y `medidas-implementacion.md` en `docs/archivo/` son más cortas que las del PR. No se comprobó cuál es la última ni si las líneas que faltan son solo las iteraciones descartadas: **sin verificar**. Las 119 PNG del PR no se rescatan.
- **#90:** la referencia vieja `src/pruebas/estabilizacion.test.ts:27-75` no se leyó línea por línea (sin verificar); sí el archivo y el commit.
- **Rutas de rescate** de #65, #82 y #103 a #108: son propuestas de esta revisión, no órdenes que ya existan.

## Detalle por PR

### #61 — Investigación de idiomas

- **Qué es:** estudio; rama `investigacion-idiomas`; abierto el 30-09-2026, actualizado hasta el 21-10; agrega `docs/investigacion/idiomas.md` (1.073 líneas).
- **¿En `main`?: A medias.** El informe no está en `main`, pero su recomendación principal —portugués de Brasil— ya está implementada: la orden vigente está en `docs/portugues.txt:2-5,13-14`; la app incluye `pt` en `src/lib/idioma.ts:29` y `src/textos/pt.ts:3-8,245-247`; la voz acepta el idioma en `src/motor/MotorNativo.ts:52-53,169-171`. También existen las órdenes posteriores de la app en portugués en `docs/portugues.txt:22-37`.
- **Recomendación corregida (2026-10-25): RESCATAR.** `docs/investigacion/idiomas.md` no está en `main`, y `main` lo cita (`docs/play/ANTES-DE-SUBIR.txt:67-68`, `scripts/bajar-modelo.mjs:24`, `src/lib/detectarIdioma.ts:35`, `src/pruebas/portuguesVoz.test.ts:55`). Va a su misma ruta.
- *Antes (2026-10-25), reemplazado porque el contenido del PR no está en `main`:* **Recomendación: CERRAR.** Lo que proponía ya se convirtió en órdenes específicas y código. El estudio incluye mediciones de computador, no del teléfono, y su lista de cosas por implementar quedó superada por las órdenes posteriores.

### #65 — Encargo de pausa con cortes

- **Qué es:** encargo/documento sin código; rama `tarea88-pausa-cortes`; abierto el 04-10-2026; agrega `docs/tarea88.txt`.
- **¿En `main`?: A medias.** El encargo completo del PR no es idéntico al archivo histórico `docs/archivo/tarea88.txt` (343 líneas frente a 1.068 en el PR). La función sí está hecha: `src/lib/pausaToma.ts:42-57` contiene la máquina de estados y `docs/decisiones-de-diseno.txt:988-997` da por cerradas la pausa con cortes y el control por gestos.
- **Recomendación corregida (2026-10-25): RESCATAR.** El `docs/tarea88.txt` del PR es el encargo del 03-10 (pausa sola, sin gestos) y no coincide con `docs/archivo/tarea88.txt`, que es el del 04-10 (pausa y gestos). La versión del PR NO ESTÁ en `main`; se guarda como historia en `docs/archivo/tarea88-encargo-03-10.txt`.
- *Antes (2026-10-25), reemplazado porque el contenido del PR no está en `main`:* **Recomendación: CERRAR.** El encargo ya se ejecutó y su decisión vigente quedó registrada; mantener abierta la versión larga del encargo no aporta una tarea pendiente.

### #67 — Boceto del visor de lado

- **Qué es:** boceto, sin código; rama `tarea89-tres-defectos`; abierto el 04-10-2026; 140 archivos bajo `docs/pantallas/tarea89/`: láminas e imágenes de varias iteraciones, más herramientas HTML/TSX/CJS y medidas JSON.
- **¿En `main`?: A medias.** El boceto aprobado como piso no está completo en `main`; quedaron algunos materiales históricos bajo `docs/archivo/pantallas/tarea89/`. El visor solicitado se implementó después: `docs/archivo/tarea90.txt:8-20` registra la implementación y `src/lib/visorDeLado.ts:26-36,83` contiene las medidas vigentes.
- **Recomendación corregida (2026-10-25): RESCATAR solo texto.** NO ESTÁ completo: `docs/tarea89.txt` del PR tiene 160 líneas más que `docs/archivo/tarea89.txt`, y `medidas-implementacion.md` 317 más que su versión archivada.
- *Antes (2026-10-25), reemplazado porque el contenido del PR no está en `main`:* **Recomendación: CERRAR.** El boceto ya cumplió su función de referencia y el código del visor está en `main`; no conviene añadir todas las iteraciones descartadas como material vigente.

### #70 — El reinicio del seguidor llega al registro

- **Qué es:** código y prueba; rama `tarea89-registro-reinicio`; abierto el 04-10-2026; `src/hooks/useSeguidor.ts`, `src/lib/diagnostico.ts` y `src/pruebas/tarea89-registro-reinicio.test.tsx`.
- **¿En `main`?: Sí.** El reinicio se registra en `src/hooks/useSeguidor.ts:158`; `src/pruebas/tarea89-tomas.test.tsx:125,174` comprueba las líneas de reinicio en el registro. La trayectoria posterior del cambio aparece en el trabajo de la tarea 89, incluido `c341f125`.
- **Recomendación: CERRAR.** El comportamiento y su prueba ya están en `main`.

### #82 — Estudio del peso de Sigo

- **Qué es:** informe y herramienta de medición; rama `tarea103-peso`; abierto el 06-10-2026; `docs/peso/informe.txt`, `docs/peso/medicion-1d72aeb.txt`, `docs/peso/modelos.txt`, `scripts/medir-peso.mjs`, `package.json` y `src/pruebas/tarea103-peso.test.ts`.
- **¿En `main`?: A medias.** El informe y la herramienta no están en `main`. La distribución de modelos que describe cambió: la nota vigente indica que en Play la voz se descarga al abrir por primera vez (`docs/lo-que-hay-que-saber.txt:49-50`), y el código ya contempla el modelo portugués (`android/app/build.gradle:153-204`). El estudio mide el AAB de `1d72aeb`, versión 0.9.0 y `versionCode` 630, no la versión actual. **[Sin verificar]** cuánto ocupa la versión actual instalada y descargada: el estudio no mide ese AAB.
- **Recomendación corregida (2026-10-25): RESCATAR los tres textos de `docs/peso/` a `docs/archivo/peso/` como historia del AAB `1d72aeb`; no se rescatan el script ni la prueba.** NO ESTÁ en `main`.
- *Antes (2026-10-25), reemplazado porque el contenido del PR no está en `main`:* **Recomendación: CERRAR.** Las cifras y las propuestas están amarradas a un AAB y a una configuración anteriores; no recomiendo conservarlas como descripción del producto actual.

### #89 — Desplazar texto en LISTO

- **Qué es:** código y pruebas; rama `listo-desplazar-texto-2910308724608170410`; abierto el 11-10-2026; `src/components/TeleprompterView.tsx`, `src/pruebas/desplazarTextoListo.test.tsx` y `src/pruebas/tarea66.test.tsx`.
- **¿En `main`?: Sí.** `src/components/TeleprompterView.tsx:1850-1851` conecta el arrastre del texto en LISTO; `src/pruebas/desplazarTextoListo.test.tsx:44,121` verifica tanto el arrastre como que la toma empiece desde el renglón elegido. El trabajo de LISTO quedó en `main` en `ebc0c435`.
- **Recomendación: CERRAR.** El comportamiento y la trayectoria de inicio ya están en `main`.

### #90 — Estabilización de video

- **Qué es:** código y prueba; rama `estabilizar-video-10624471644955333143`; abierto el 11-10-2026; `src/App.tsx`, `src/components/DockListo.tsx`, `src/components/PanelAjustes.tsx`, `src/components/TeleprompterView.tsx`, `src/lib/camara.ts`, `src/pruebas/estabilizacion.test.ts`, `src/textos/en.ts` y `src/textos/es.ts`.
- **¿En `main`?: Sí.** El ajuste y el reintento sin estabilización están en `src/lib/camara.ts:254-302`; el control está en `src/components/PanelAjustes.tsx:547-556`; la prueba cubre ambos modos y el reintento en `src/pruebas/estabilizacion.test.ts:27-75`. Main lo incorporó en `27aaf4d9`.
- **Recomendación: CERRAR.** Implementación, opción y prueba ya están en `main`.

### #91 — Material 3 Expressive en botones

- **Qué es:** código y prueba; rama `expressive-botones-17078490330619550806`; abierto el 11-10-2026; `src/App.tsx`, `src/components/DockListo.tsx`, `src/components/IconosApp.tsx`, `src/components/TeleprompterView.tsx`, `src/pruebas/expressive-botones.test.tsx`, `src/styles-ajustes.css` y `src/styles.css`.
- **¿En `main`?: Sí.** El flujo de Grabar y el indicador están comprobados en `src/pruebas/expressive-botones.test.tsx:27-96`; los estilos y recursos están en `src/styles.css` y `src/components/IconosApp.tsx`. Main lo incorporó en `4bf57377`.
- **Recomendación: CERRAR.** El cambio y sus pruebas ya están en `main`.

### #92 — Entrada a tiempo

- **Qué es:** código y pruebas; rama `entrada-a-tiempo-7283822201659797316`; abierto el 11-10-2026; `android/app/src/main/java/com/sigoteleprompter/app/ArranquePlugin.java`, `MainActivity.java`, `src/App.tsx`, `src/__tests__/entrada-a-tiempo.test.tsx`, `src/components/Entrada.tsx`, `src/pruebas/entradaATiempo.test.tsx`, `src/pruebas/tarea45.test.tsx` y `src/pruebas/tarea51.test.tsx`.
- **¿En `main`?: Sí.** La entrada existe desde el primer render y se cancela al salir de la portada: `src/__tests__/entrada-a-tiempo.test.tsx:38-50`; la capa y sus testid están en `src/components/Entrada.tsx:168,193,218`; el plugin está en `android/app/src/main/java/com/sigoteleprompter/app/ArranquePlugin.java`. Main lo incorporó en `12a08683`.
- **Recomendación: CERRAR.** La solución nativa y sus pruebas ya están en `main`.

### #93 — Borrar la pantalla completa de Ajustes

- **Qué es:** código y pruebas; rama `limpiar-pantalla-ajustes`; abierto el 11-10-2026; `src/components/FilasAjustesLectura.tsx`, `src/components/PanelAjustes.tsx`, `src/components/PantallaAjustes.tsx` y dos pruebas (`pantallas.test.tsx`, `tarea102.test.tsx`).
- **¿En `main`?: Sí.** `PantallaAjustes.tsx` fue eliminada y el panel actual está en `src/components/PanelAjustes.tsx:710-725`; `src/pruebas/pantallas.test.tsx:869-879` verifica que Ajustes se cierre como diálogo. Main lo incorporó en `353fffa0`.
- **Recomendación: CERRAR.** El reemplazo de la pantalla completa por el panel único ya está en `main`.

### #95 — Accesos directos del ícono

- **Qué es:** código y pruebas; rama `accesos-directos-12854503613669417726`; abierto el 11-10-2026; `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/java/com/sigoteleprompter/app/AccesosDirectosPlugin.java`, `android/app/src/main/java/com/sigoteleprompter/app/MainActivity.java`, `android/app/src/main/res/drawable/ic_acceso_grabar.xml`, `ic_acceso_nuevo.xml`, `android/app/src/main/res/values-en/strings.xml`, `android/app/src/main/res/values/strings.xml`, `android/app/src/main/res/xml/shortcuts.xml`, `src/App.tsx`, `src/components/BarraEditorVacio.tsx`, `EditorView.tsx`, `src/lib/accesosDirectos.ts`, `src/pruebas/accesosDirectos.test.tsx` y `src/textos/en.ts`, `src/textos/es.ts`.
- **¿En `main`?: Sí.** La integración de acciones está en `src/App.tsx:60` y `src/lib/accesosDirectos.ts:23`; `src/pruebas/accesosDirectos.test.tsx:104-172` comprueba las acciones Grabar/Nuevo y el caso de portapapeles vacío. Main lo incorporó en `0c033a37`.
- **Recomendación: CERRAR.** La integración nativa y la aplicación ya tienen los accesos directos.

### #96 — Formato Angosto con piso

- **Qué es:** código y pruebas; rama `angosto-con-piso-8616314203867213331`; abierto el 12-10-2026; `src/components/EditorGuion.tsx`, `src/components/TeleprompterView.tsx`, `src/components/estiloLectura.ts`, `src/pruebas.test.tsx`, `src/pruebas/editorAnchoTexto.test.tsx`, `src/pruebas/lectura.test.tsx`, `src/pruebas/tarea72.test.tsx` y `src/styles-horizontal.css`.
- **¿En `main`?: Sí.** La regla está en `src/components/estiloLectura.ts:57`; la prueba de lectura la verifica en `src/pruebas/lectura.test.tsx:944` y la guardiana en `src/pruebas/tarea72.test.tsx:87`. Main lo incorporó en `4c04a73c`.
- **Recomendación: CERRAR.** El formato y sus pruebas ya están en `main`.

### #103 — Estudio 2: inventario del sistema visual

- **Qué es:** estudio/documento; rama `estudio-sistema-visual-12125696355791508305`; abierto el 14-10-2026; `docs/estudios/sistema-visual/ESTUDIO-2-SISTEMA-VISUAL.md` y cuatro capturas.
- **¿En `main`?: A medias.** El informe y las capturas no están. Hay una parte verificable del trabajo de sistema visual en `src/styles.css:8-13` y en la prueba de espejo de variables `src/pruebas/ritmoEsquinas.test.ts:15,29-37`; eso no valida el resto del informe. La guía vigente marca los estudios de agente como «SIN VERIFICAR» (`docs/lo-que-hay-que-saber.txt:211-212`).
- **Recomendación corregida (2026-10-25): RESCATAR solo el informe a `docs/archivo/estudios/sistema-visual/`, como historia SIN VERIFICAR.** NO ESTÁ en `main`.
- *Antes (2026-10-25), reemplazado porque el contenido del PR no está en `main`:* **Recomendación: CERRAR.** No conviene sumar como documentación vigente un estudio completo que la guía del proyecto deja expresamente sin verificar; los cambios de código escogidos ya están en `main`.

### #104 — Estudio 1: recorridos y usabilidad

- **Qué es:** estudio/documento; rama `estudio-recorridos-8452463527262417957`; abierto el 14-10-2026; `docs/estudios/recorridos/informe.md` y 14 capturas de recorridos.
- **¿En `main`?: A medias.** El informe y las capturas no están. La guía de proyecto advierte que el estudio de usabilidad describió pantallas que ya no existían (`docs/lo-que-hay-que-saber.txt:9-14`) y que el primer estudio describía pantallas viejas (`:211-212`). Algunas acciones que motivaron el PR de código #109 sí están implementadas y probadas en `src/pruebas/usabilidad1.test.tsx:29,90-127,149-198`.
- **Recomendación corregida (2026-10-25): RESCATAR solo el informe a `docs/archivo/estudios/recorridos/`, como historia (describe pantallas viejas).** NO ESTÁ en `main`.
- *Antes (2026-10-25), reemplazado porque el contenido del PR no está en `main`:* **Recomendación: CERRAR.** La propia guía identifica el problema de vigencia; se conservan en `main` los arreglos verificados, no la lectura de pantallas antiguas.

### #105 — Estudio 3: accesibilidad

- **Qué es:** estudio/documento; rama `estudio-accesibilidad-137079158214291271`; abierto el 14-10-2026; `docs/estudios/accesibilidad/informe-accesibilidad.md` y 16 capturas.
- **¿En `main`?: A medias.** El informe no está; sí llegaron algunos cambios concretos, comprobables en `src/pruebas/accesibilidadEstudio3.test.tsx:48-58,96-107` (foco al abrir/cerrar Ajustes y títulos accesibles de Guiones/Videos). La guía todavía clasifica los informes de estudio como no verificados (`docs/lo-que-hay-que-saber.txt:211-212`).
- **Recomendación corregida (2026-10-25): RESCATAR solo el informe a `docs/archivo/estudios/accesibilidad/`.** NO ESTÁ en `main`.
- *Antes (2026-10-25), reemplazado porque el contenido del PR no está en `main`:* **Recomendación: CERRAR.** Los arreglos puntuales ya están en `main`; no hay evidencia que justifique mantener las capturas y las recomendaciones restantes como especificación vigente.

### #106 — Estudio 5: auditoría de textos

- **Qué es:** estudio/documento; rama `estudio-textos-9964884704506571781`; abierto el 14-10-2026; `docs/estudios/textos/informe.md` y 12 capturas.
- **¿En `main`?: A medias.** El informe no está. Parte de sus propuestas de mensajes y confirmaciones llegó en el PR de código #114: `src/pruebas/estudio5-textos.test.tsx:18-51,54-83` fija los mensajes actuales y `src/textos/es.ts:196` conserva la versión anterior como historia.
- **Recomendación corregida (2026-10-25): RESCATAR solo el informe a `docs/archivo/estudios/textos/`.** NO ESTÁ en `main`.
- *Antes (2026-10-25), reemplazado porque el contenido del PR no está en `main`:* **Recomendación: CERRAR.** Los cambios elegidos ya están en código y prueba; el informe y las capturas de octubre no son necesarios como guía actual de los textos.

### #107 — Estudio 4: modernidad y Material 3 Expressive

- **Qué es:** estudio/documento; rama `estudio-modernidad-14972090111194575149`; abierto el 14-10-2026; `docs/estudios/modernidad/informe.md` y ocho capturas.
- **¿En `main`?: A medias.** El informe no está. El redondeo de los segmentados sí aparece como cápsula en `src/styles-ajustes.css:166` y `.selector-modo` en `:1315`; el resto de recomendaciones no queda aprobado por la presencia de ese cambio. El estudio además se basa en capturas del 14-10, mientras `main` siguió cambiando después.
- **Recomendación corregida (2026-10-25): RESCATAR solo el informe a `docs/archivo/estudios/modernidad/`.** NO ESTÁ en `main`.
- *Antes (2026-10-25), reemplazado porque el contenido del PR no está en `main`:* **Recomendación: CERRAR.** Se conserva en `main` el cambio puntual ya incorporado; no se deben tratar las demás sugerencias del estudio como decisiones.

### #108 — Estudio 6: el motor

- **Qué es:** estudio/documento; rama `estudio-motor-3337322326932880658`; abierto el 14-10-2026; solo `docs/estudios/motor/informe.md`.
- **¿En `main`?: No.** El informe no está. Sus sugerencias no son cambios aplicados; por ejemplo, propone latencia dinámica, pero el valor vigente sigue definido como `MS_RETRASO_RECONOCEDOR = 400` en `src/lib/avance.ts:22`. La vara que sí manda es el banco sobre tomas reales (`docs/lo-que-hay-que-saber.txt:202-207`), y el informe está clasificado con los estudios sin verificar (`:211-212`).
- **Recomendación corregida (2026-10-25): RESCATAR solo el informe a `docs/archivo/estudios/motor/`, como historia SIN VERIFICAR; no reemplaza al banco.** NO ESTÁ en `main`.
- *Antes (2026-10-25), reemplazado porque el contenido del PR no está en `main`:* **Recomendación: CERRAR.** No corresponde incorporar como guía técnica un estudio no verificado en lugar de medir las propuestas sobre el banco establecido.

### #109 — Arreglos chicos de uso

- **Qué es:** código y prueba; rama `usabilidad-1-10455860742693246385`; abierto el 14-10-2026; `src/App.tsx`, `src/components/BarraEditorVacio.tsx`, `BibliotecaView.tsx`, `EditorView.tsx`, `TarjetaLectura.tsx`, `src/pruebas/usabilidad1.test.tsx` y `src/textos/en.ts`, `src/textos/es.ts`.
- **¿En `main`?: Sí.** `src/pruebas/usabilidad1.test.tsx:29-39` verifica el aviso al pegar sin texto y `:90-127` que tocar la tarjeta abra el editor; `src/textos/es.ts:358` contiene el aviso actual. Main lo incorporó en `f33703a8`.
- **Recomendación: CERRAR.** Código y pruebas ya están en `main`.

### #111 — Ritmo y esquinas

- **Qué es:** código y prueba; rama `ritmo-y-esquinas-13086327817676417635`; abierto el 14-10-2026; prueba `src/pruebas/ritmoEsquinas.test.ts` y cambios en `src/styles.css`, `src/styles-ajustes.css` y `src/styles-tableta.css`.
- **¿En `main`?: Sí.** `src/pruebas/ritmoEsquinas.test.ts:15,29-37` contrasta las variables CSS con las curvas y duraciones de movimiento; main contiene ambas partes. Cambio incorporado en `88f98e6a`.
- **Recomendación: CERRAR.** El espejo y la prueba ya están en `main`.

### #112 — Segmentados en cápsula

- **Qué es:** cambio de estilo; rama `modernidad-1`; abierto el 14-10-2026; `src/styles-ajustes.css`.
- **¿En `main`?: Sí.** El comentario de implementación y el estilo de cápsula están en `src/styles-ajustes.css:166`; el selector de modo también usa radio de cápsula en `:1315`. Main lo incorporó en `b3fc817a`.
- **Recomendación: CERRAR.** El cambio de estilo ya está en `main`.

### #113 — Tres arreglos de accesibilidad

- **Qué es:** código y pruebas; rama `accesibilidad-1-12132299406842949374`; abierto el 14-10-2026; `BibliotecaView.tsx`, `EditorView.tsx`, `PanelAjustes.tsx`, `TiraGrabaciones.tsx`, `src/pruebas/accesibilidadEstudio3.test.tsx`, `styles-ajustes.css` y `styles.css`.
- **¿En `main`?: Sí.** `src/pruebas/accesibilidadEstudio3.test.tsx:48-58,96-107` verifica el foco y los encabezados; la interfaz actual está en `src/components/PanelAjustes.tsx` y `src/components/BibliotecaView.tsx`. Main lo incorporó en `72df5503`.
- **Recomendación: CERRAR.** Los tres arreglos y sus pruebas ya están en `main`.

### #114 — Ajustar mensajes e independizar confirmaciones

- **Qué es:** código y pruebas; rama `textos-1-18065928902264704887`; abierto el 14-10-2026; `App.tsx`, `EditorView.tsx`, `IndicadorPrecarga.tsx`, `ReproductorGrabacion.tsx`, `usePrecargaModelo.ts`, pruebas y textos ES/EN.
- **¿En `main`?: Sí.** `src/pruebas/estudio5-textos.test.tsx:18-83` comprueba los mensajes y confirmaciones diferenciados; `src/textos/es.ts:17,196` contiene las cadenas actuales y la anterior histórica. Main lo incorporó en `95acde8e`.
- **Recomendación: CERRAR.** Los textos y la separación de confirmaciones ya están en `main`.

### #115 — Portada SVG para Penpot

- **Qué es:** recurso gráfico/boceto; rama `portada-svg`; abierto el 14-10-2026; `docs/pantallas/portada/portada-412x915.svg`, su PNG y `svg-de-pantalla.mjs`.
- **¿En `main`?: No.** No está ese recurso editable en `main`. La portada sí tuvo cambios posteriores, entre ellos el tamaño de la marca actualizado en `src/styles.css:2700` y el cambio de portada del 20-10 (`8fbe8836`); por eso el SVG del 14-10 no representa con seguridad la portada actual. **[Sin verificar]** si el SVG todavía se importa bien en Penpot; no se probó en esa aplicación.
- **Recomendación corregida (2026-10-25): DEJAR ABIERTO, con pregunta para Javier: NO ESTÁ en `main`, y no se sabe si el SVG del 14-10 todavía le sirve.** 
- *Antes (2026-10-25), reemplazado porque el contenido del PR no está en `main`:* **Recomendación: CERRAR.** Es un recurso de una captura anterior, no un entregable de la portada actual.

### #121 — Banco largo en la APK de prueba

- **Qué es:** instrumentación para medir, sin arreglar; rama `motor-largo`; abierto el 15-10-2026; `android/app/src/debug/java/com/sigoteleprompter/app/BancoLargo.java`, `android/app/src/main/java/com/sigoteleprompter/app/VoskNativoPlugin.java`, `android/app/src/release/java/com/sigoteleprompter/app/BancoLargo.java`, `scripts/banco-largo.mjs`, `src/App.tsx`, `src/hooks/useBancoLargo.ts`, `src/lib/bancoLargo.ts`, `src/lib/diagnostico.ts`, `src/lib/vigiaDetencion.ts`, `src/motor/MotorNativo.ts` y `src/pruebas/bancoLargo.test.ts`.
- **¿En `main`?: A medias.** El banco largo y sus pruebas evolucionaron en `main` por otro camino: `src/pruebas/bancoLargo.test.ts:90-99,135-149` cubre registros y resultados de tomas largas; la integración al banco actual quedó en `613f257b` y la medición de 34 min en `d81c397e`. No están la instrumentación de 35 min de `BancoLargo.java`, `useBancoLargo.ts` ni `vigiaDetencion.ts`. Esta rama no contiene audio ni informe independiente que rescatar; sus 11 archivos suman 296.221 bytes de código.
- **Recomendación corregida (2026-10-25): DEJAR ABIERTO, con pregunta para Javier: NO ESTÁ en `main` (faltan 6 de sus 11 archivos); el banco largo de `main` es otro (`613f257`, `d81c397`).** 
- *Antes (2026-10-25), reemplazado porque el contenido del PR no está en `main`:* **Recomendación: CERRAR.** Era una herramienta de medición, no un arreglo, y el banco actual ya tiene tomas largas reproducibles y trabajo posterior sobre las detenciones; no hay informe textual en el PR que justifique rescatar.

### #125 — Investigación de la toma de 25 min

- **Qué es:** medición e informe; rama `motor-investigacion`; abierto el 16-10-2026; `docs/mediciones/toma-25-min/INFORME.txt`, `LEEME.txt`, `audio.flac`, `guion.txt`, `herramientas/detalle.ts`, `herramientas/medir.ts`, `herramientas/transcribir.py`, `resultados/medir-con-parentesis-a-mano-20.txt`, `resultados/medir-con-parentesis-a-mano-60.txt`, `resultados/medir-sin-parentesis-a-mano-20.txt`, `resultados/medir-sin-parentesis-a-mano-60.txt` y `resultados/palabras.json`.
- **¿En `main`?: A medias.** El informe original no está, pero su problema central se corrigió y quedó documentado en `src/lib/avance.ts:164-194` y `src/pruebas/motorParentesis.test.ts:45-98`; la explicación de la corrección está en `docs/mediciones/motor-parentesis/EXPLICACION.txt`. Main incorporó el arreglo en `e62dec75`.
- **Recomendación: RESCATAR.** Guardar solo `docs/mediciones/toma-25-min/INFORME.txt` en `docs/archivo/mediciones/toma-25-min/INFORME.txt` como registro previo a la corrección. Dejar fuera el resto de los archivos de la rama: **20.425.307 bytes (19,48 MiB)**, incluido el audio de 20.203.835 bytes. No rescatar audio, guion, herramientas ni resultados crudos.

### #128 — Medir el servidor local

- **Qué es:** instrumentación de medición; rama `medir-servidor-local`; abierto el 16-10-2026; `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/java/com/sigoteleprompter/app/MainActivity.java`, `MedirServidorPlugin.java`, `PedidoLocal.java`, `ServidorLocal.java`, `android/app/src/main/res/xml/network_security_config.xml`, `android/app/src/test/java/com/sigoteleprompter/app/PedidoLocalTest.java`, `src/components/ReproductorGrabacion.tsx`, `src/lib/medirServidor.ts` y `src/pruebas/medirServidor.test.ts`.
- **¿En `main`?: A medias.** El visor actual sí sirve las tomas por el servidor local: `src/components/ReproductorGrabacion.tsx:110,352` y `android/app/src/main/java/com/sigoteleprompter/app/ServidorLocal.java:32,71,105-121`. Esa solución quedó en `main` en `c3b822f8`, con identificador opaco y prueba `PedidoLocalTest.java`; la instrumentación específica de medición del PR no está en la app actual. El PR contiene código (108.204 bytes), no audio ni informe.
- **Recomendación: CERRAR.** El comportamiento central se reimplementó y endureció en `main`; no hay informe que rescatar y la sonda original quedó reemplazada.

### #129 — Toma de 30 min

- **Qué es:** medición e informe; rama `motor-toma-30-min`; abierto el 16-10-2026; `docs/mediciones/toma-30-min/INFORME.txt`, `LEEME.txt`, `audio.wav`, `bitacora-telefono.motor.txt`, `guion.txt`, `herramientas/comparar.ts`, `resultados/comparar.txt`, `resultados/medir-a-mano-20.json`, `resultados/medir-a-mano-20.txt`, `resultados/medir-a-mano-60.json`, `resultados/medir-a-mano-60.txt`, `resultados/palabras.json` y `resultados/rastro-finales.txt`.
- **¿En `main`?: A medias.** El informe no está; los problemas del motor se investigaron y corrigieron después. `src/lib/avance.ts:243-250` conserva el ajuste del ancla; `src/pruebas/motorSuelta.test.ts:31-84` prueba que no se produzcan retrocesos al soltarla. El cambio quedó en `main` en `0cea92a8`.
- **Recomendación: RESCATAR.** Guardar solo `docs/mediciones/toma-30-min/INFORME.txt` en `docs/archivo/mediciones/toma-30-min/INFORME.txt` como registro anterior a la corrección. Excluir los demás archivos: **63.164.966 bytes (60,23 MiB)**, incluidos el audio WAV de 58.575.500 bytes y la bitácora de 4.243.572 bytes. No rescatar audio, bitácora, guion, herramientas ni resultados crudos.

## Antes: resumen original (reemplazado el 2026-10-25)

<!-- Antes (2026-10-25): esta tabla se reemplazó por el «Resumen corregido» de arriba. Porqué: 15 PR marcados CERRAR no tenían su contenido en main (NO ESTÁ) y el #61 lo cita main sin tenerlo. Se conserva completa. -->


| PR | Título corto | Tipo | ¿En `main`? | Recomendación |
|---:|---|---|---|---|
| #61 | Idiomas y motores | Estudio/documento | A medias | CERRAR |
| #65 | Encargo de pausa con cortes | Encargo/documento | A medias | CERRAR |
| #67 | Boceto del visor de lado | Boceto/documento | A medias | CERRAR |
| #70 | Registro de reinicio del seguidor | Código y prueba | Sí | CERRAR |
| #82 | Peso de Sigo | Estudio, informe y herramienta | A medias | CERRAR |
| #89 | Desplazar el texto en LISTO | Código y pruebas | Sí | CERRAR |
| #90 | Estabilización de video | Código y prueba | Sí | CERRAR |
| #91 | Botones Material 3 Expressive | Código y prueba | Sí | CERRAR |
| #92 | Entrada a tiempo | Código y pruebas | Sí | CERRAR |
| #93 | Eliminar la pantalla completa de Ajustes | Código y pruebas | Sí | CERRAR |
| #95 | Accesos directos del ícono | Código y pruebas | Sí | CERRAR |
| #96 | Ancho Angosto con piso | Código y pruebas | Sí | CERRAR |
| #103 | Inventario visual | Estudio/documento | A medias | CERRAR |
| #104 | Recorridos y usabilidad | Estudio/documento | A medias | CERRAR |
| #105 | Accesibilidad | Estudio/documento | A medias | CERRAR |
| #106 | Auditoría de textos | Estudio/documento | A medias | CERRAR |
| #107 | Modernidad y Material 3 | Estudio/documento | A medias | CERRAR |
| #108 | Estudio del motor | Estudio/documento | No | CERRAR |
| #109 | Arreglos de usabilidad | Código y pruebas | Sí | CERRAR |
| #111 | Ritmo y esquinas | Código y prueba | Sí | CERRAR |
| #112 | Segmentados en cápsula | Código | Sí | CERRAR |
| #113 | Arreglos de accesibilidad | Código y pruebas | Sí | CERRAR |
| #114 | Textos y confirmaciones | Código y pruebas | Sí | CERRAR |
| #115 | Portada SVG para Penpot | Boceto/recurso gráfico | No | CERRAR |
| #121 | Banco largo en la APK de prueba | Instrumentación de medición | A medias | CERRAR |
| #125 | Investigación de toma de 25 min | Medición e informe | A medias | RESCATAR |
| #128 | Medir el servidor local | Instrumentación de medición | A medias | CERRAR |
| #129 | Toma de 30 min | Medición e informe | A medias | RESCATAR |


## Antes: listas originales (reemplazadas el 2026-10-25)

<!-- Antes (2026-10-25): reemplazadas por las «Listas para ejecutar (corregidas)» de arriba. Porqué: la regla de evidencia en main sacó 12 PR de CERRAR (10 a RESCATAR, 2 a DEJAR ABIERTO). Se conserva completo. -->


- **CERRAR:** #61, #65, #67, #70, #82, #89, #90, #91, #92, #93, #95, #96, #103, #104, #105, #106, #107, #108, #109, #111, #112, #113, #114, #115, #121 y #128.
- **MEZCLAR:** ninguno.
- **RESCATAR:** #125, solo `docs/mediciones/toma-25-min/INFORME.txt` → `docs/archivo/mediciones/toma-25-min/INFORME.txt`; #129, solo `docs/mediciones/toma-30-min/INFORME.txt` → `docs/archivo/mediciones/toma-30-min/INFORME.txt`.
- **DEJAR ABIERTO / preguntas para Javier:** ninguno; no quedó una decisión pendiente que dependa solo de una respuesta suya.

Este archivo es un informe; no se cerró, mezcló, comentó ni editó ninguno de los PR revisados y no se borró ninguna rama.
