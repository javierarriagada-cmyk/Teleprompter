# ESTUDIO 5 — Los Textos de la Aplicación: Auditoría de Lenguaje, Términos y Traducciones

**Fecha:** 14 de octubre de 2026
**Rama:** `estudio-textos`
**Ubicación:** `docs/estudios/textos/`
**Autor:** Auditoría de Lenguaje y Producto (`javierarriagada-cmyk@users.noreply.github.com`)

---

## 1. RESUMEN EJECUTIVO (1 PÁGINA)

El presente estudio realiza una **auditoría integral y sistemática de todos los textos de pantalla** de la aplicación **Sigo — Teleprompter de Voz**, abarcando los archivos de recursos de cadenas (`src/textos/es.ts` y `src/textos/en.ts`), los textos incrustados directamente en componentes React (`src/components/`, `src/App.tsx`), el guion predeterminado de bienvenida ("Hola"), las notificaciones flotantes (*toasts*), los estados vacíos y los mensajes de error del sistema.

Sigo es un teleprompter inteligente de uso profesional diseñado para seguir automáticamente el ritmo de la voz del usuario mediante reconocimiento del habla en el propio dispositivo (*offline*). Por ello, **la claridad, consistencia y concisión del lenguaje en pantalla son críticas**: el usuario lee a golpes de vista mientras se graba frente a la cámara o expone en público, por lo que cualquier ambigüedad, inconsistencia terminológica o mensaje de error críptico interrumpe directamente su desempeño visual y emocional.

### Principios y Guías Oficiales Evaluadas
1. **Material Design Content Design Guide** ([m3.material.io/foundations/content-design](https://m3.material.io/foundations/content-design)): Enfoque centrado en la acción, etiquetas directas en botones, tono cercano pero profesional.
2. **Android Writing Guide** ([developer.android.com/design/ui/mobile/guides/writing](https://developer.android.com/design/ui/mobile/guides/writing)): Brevedad, sintaxis en voz activa (*sentence case*), orientación al problema y su solución humana.
3. **Español Neutro e Igualdad de Tonalidad (Tuteo Parejo)**: Eliminación de modismos regionales, manteniendo una segunda persona singular ("tú") coherente y respetuosa en toda la app.
4. **Inglés Natural de Estados Unidos (EE.UU.)**: Mantenimiento del estándar fijado en `docs/ingles.txt`, donde el texto en inglés no es una traducción literal, sino una redacción nativa fluida (*Script*, *Take*, *Record*, *Captions*, *Settings*).

---

### Los 10 Hallazgos más Importantes (Resumen)

1. **[GRAVEDAD ALTA] Exposición de errores técnicos con variables de excepción en crudo (`{detalle}`)**
   *Qué pasa:* Los mensajes de error al abrir o importar archivos y descargar el modelo de voz muestran cadenas técnicas o excepciones del sistema (`Error al abrir archivo: {detalle}`).
   *DÓNDE:* `src/textos/es.ts:109,117,120`, captura `01-biblioteca-portrait.png`.
   *POR QUÉ:* Confunde y atemoriza al usuario. Se debe explicar la causa comprensible y la acción concreta para solucionarlo.
   *PROPUESTA:* Cambiar a mensajes orientados al usuario (ej. "No se pudo abrir el archivo. Comprueba que sea .txt, .md o .docx e inténtalo de nuevo").

2. **[GRAVEDAD ALTA] Falla silenciosa y ausencia de aviso en el botón "Pegar texto" con portapapeles no textual**
   *Qué pasa:* En el editor vacío, presionar "Pegar texto" cuando el portapapeles está vacío o contiene imágenes no produce respuesta visual ni muestra aviso flotante.
   *DÓNDE:* `src/components/BarraEditorVacio.tsx:65`, `src/App.tsx:940`, captura `04-editor-vacio-portrait.png`.
   *POR QUÉ:* El usuario asume que el botón o la aplicación dejaron de responder.
   *PROPUESTA:* Crear la clave `portapapelesVacio` ("No hay texto en el portapapeles.") y mostrar una notificación flotante.

3. **[GRAVEDAD ALTA] Explicación incompleta en diálogos de permisos denegados (Micrófono y Cámara)**
   *Qué pasa:* Al denegar permisos, los diálogos explican para qué se usa el recurso, pero no indican cuál es el nombre exacto de la casilla que se debe activar al presionar "Abrir ajustes".
   *DÓNDE:* `src/textos/es.ts:167-172`, `src/components/DialogoMicrofono.tsx:45`.
   *POR QUÉ:* El usuario abre la pantalla del sistema de Android y no sabe qué interruptor activar.
   *PROPUESTA:* Incluir la indicación explícita: "Toca Abrir ajustes y activa el permiso de Micrófono / Cámara".

4. **[GRAVEDAD MEDIA] Inconsistencia en la capitalización (*Sentence Case*) en rótulos e indicadores de estado**
   *Qué pasa:* Varios estados e indicadores parten con minúscula en contextos independientes (`incompleta`, `sin audio`, `la cámara sigue encendida`, `dura aprox.`).
   *DÓNDE:* `src/textos/es.ts:40,41,134,192`, captura `06-preparar-listo-portrait.png`.
   *POR QUÉ:* El uso inconsistente de mayúsculas proyecta desprolijidad visual e incumple el estándar Android.
   *PROPUESTA:* Capitalizar la primera letra en todos los rótulos de estado (`Incompleta`, `Sin audio`, `La cámara sigue encendida`, `Dura aprox.`).

5. **[GRAVEDAD MEDIA] Texto extenso en aviso de almacenamiento que desborda en teléfonos de 412px de ancho**
   *Qué pasa:* La frase `Quedan menos de 2 minutos de espacio` resulta demasiado larga en pantallas pequeñas o con tamaño de fuente ampliado.
   *DÓNDE:* `src/textos/es.ts:138`, `src/components/PrepararView.tsx:180`, captura `06-preparar-listo-portrait.png`.
   *POR QUÉ:* Produce truncamiento o salto de línea en una zona crítica de monitoreo previo a grabar.
   *PROPUESTA:* Abreviar a "Quedan menos de 2 min de espacio".

6. **[GRAVEDAD MEDIA] Inconsistencia en los verbos de acción de botones principales y secundarios**
   *Qué pasa:* Se alternan sustantivos o infinitivos impersonales (`Voltear cámara`, `Mostrar tiempo`, `Repetir toma`) en lugar de verbos directos.
   *DÓNDE:* `src/textos/es.ts:50,133,140`.
   *POR QUÉ:* Las guías de Material 3 exigen etiquetas verbos de acción clara y concisa en segunda persona.
   *PROPUESTA:* Unificar a verbos de acción ("Grabar de nuevo" en lugar de "Repetir toma", "Cambiar cámara" o "Voltear" en fichas).

7. **[GRAVEDAD MEDIA] Tuteo irregular y alternancia con expresiones impersonales**
   *Qué pasa:* Se mezcla el tuteo explícito ("Escribe tu primer guion", "Tócalo si...") con fórmulas impersonales pasivas ("Para usar con un vidrio...").
   *DÓNDE:* `src/textos/es.ts:25,163,178`.
   *POR QUÉ:* Rompe el tono de voz unificado, cercano y profesional establecido para Sigo.
   *PROPUESTA:* Reformular a tuteo parejo en todas las explicaciones e instrucciones.

8. **[GRAVEDAD MEDIA] Variantes duplicadas en inglés para los mismos conceptos en el selector de ajustes**
   *Qué pasa:* Se utilizan traducciones distintas para el mismo término en inglés (`Behind the text` / `Behind`, `Small window` / `Window`, `Bone on dark gray` / `Bone`).
   *DÓNDE:* `src/textos/es.ts:130-131,148-149`, `src/textos/en.ts:130-131,148-149`, captura `02-biblioteca-ajustes-portrait.png`.
   *POR QUÉ:* Genera inconsistencia terminológica para usuarios de habla inglesa entre fichas rápidas y menús flotantes.
   *PROPUESTA:* Unificar las claves de inglés en `en.ts` a un solo término canónico corto y elegante.

9. **[GRAVEDAD BAJA] Confirmación descontextualizada en botones de dos pasos (`¿Seguro?`)**
   *Qué pasa:* El botón de segunda confirmación al borrar o descartar solo muestra `¿Seguro?`.
   *DÓNDE:* `src/textos/es.ts:4`, `src/components/DockListo.tsx:85`.
   *POR QUÉ:* Exige al usuario recordar el botón que presionó un segundo antes sin indicarle qué acción va a confirmar.
   *PROPUESTA:* Especificar la acción según el contexto (ej. "¿Borrar?", "¿Descartar?").

10. **[GRAVEDAD BAJA] Desalineación menor en la redacción del guion de bienvenida ("Hola")**
    *Qué pasa:* El guion predeterminado en español e inglés menciona explicaciones de control por gestos y formatos que pueden redactarse de forma aún más directa y precisa.
    *DÓNDE:* `src/App.tsx:bloqueDeBienvenida`, `src/App.tsx:bloqueDeBienvenidaEn`.
    *POR QUÉ:* Es el primer guion con el que el usuario interactúa al instalar Sigo; debe ser un modelo impecable de redacción y formato.
    *PROPUESTA:* Ajustar las oraciones para reflejar exactamente el comportamiento real de la app en ambos idiomas.

---

## 2. GLOSARIO DE TÉRMINOS Y NORMALIZACIÓN

Para garantizar que un mismo concepto tenga la misma denominación en toda la interfaz, se establece el siguiente glosario canónico. Las variantes encontradas en el código deben reemplazarse según esta recomendación:

| Concepto Canónico | Término Recomendado (ES) | Término Recomendado (EN) | Variantes Inconsistentes Encontradas en el Código | Razón de la Elección |
| :--- | :--- | :--- | :--- | :--- |
| **Documento de texto** | **Guion** | **Script** | *texto, escrito, documento, archivo, bloque* | Es la denominación oficial del producto ("Sigo — Teleprompter de voz"). Es el término profesional estándar en producción audiovisual. RAE (2010): sin tilde en español. |
| **Intento de grabación** | **Toma** | **Take** | *grabación, video, clip, toma de video* | Corresponde a cada intento individual registrado para un guion antes o después de detener la cámara. |
| **Archivo guardado** | **Video** | **Video** | *película, archivo de video, toma guardada* | Es el archivo MP4 exportado o almacenado en la galería del teléfono. |
| **Destruir recurso** | **Borrar** | **Delete** | *eliminar, remover, quitar, descartar, tacho* | Se unificó el 28-09-2026. "Borrar" es directo, claro y libre de tecnicismos. |
| **Abandonar grabación** | **Descartar toma** | **Discard take** | *borrar toma, cancelar, salir sin guardar* | Se utiliza exclusivamente al desechar una toma activa no finalizada. |
| **Acción de leer** | **Leer** | **Read** | *lectura, iniciar lectura, modo prompter* | Verbo imperativo corto y directo para el botón principal de lectura sin cámara. |
| **Acción de filmar** | **Grabar** | **Record** | *grabación, iniciar grabación, filmar* | Verbo imperativo corto y directo para el botón principal de lectura con cámara. |
| **Preferencias** | **Ajustes** | **Settings** | *configuración, opciones, preferencias* | Estándar oficial de Android y Material Design 3. Evita "Configuración". |
| **Subtítulos sobre video** | **Subtítulos** | **Captions** | *leyenda, transcripción, texto superpuesto* | Estándar en la industria de video e inglés estadounidense de EE.UU. |
| **Ajuste de color de video** | **Filtro** | **Filter** | *tono, efecto, estilo visual* | Cerrado en la tarea 96 (Javier): es el término más reconocido por creadores de contenido. |
| **Almacenamiento del SO** | **Portapapeles** | **Clipboard** | *texto copiado, memoria, portapapeles del sistema* | Denominación exacta del sistema operativo Android para el texto en memoria temporal. |
| **Carpeta del sistema** | **Galería (Películas)** | **Gallery (Movies)** | *almacenamiento, fotos, carrete* | Ubicación física exacta en Android donde el plugin nativo almacena los videos MP4. |

---

## 3. AUDITORÍA DETALLADA Y LISTA COMPLETA DE HALLAZGOS

Los hallazgos se presentan ordenados estrictamente por su nivel de gravedad (Alta, Media, Baja).

### HALLAZGOS DE GRAVEDAD ALTA

#### Hallazgo 1: Mensajes de error crípticos con variables de excepción del sistema
* **Qué pasa:** Se exponen mensajes de error con código o excepciones técnicas en crudo (`{detalle}`).
* **DÓNDE:** Captura `01-biblioteca-portrait.png` / `04-editor-vacio-portrait.png`; archivos `src/textos/es.ts:109,117,120` (`errorModelo`, `errorAbrirArchivo`, `archivoNoSeImporto`), `src/App.tsx:820`.
* **POR QUÉ importa al usuario:** Al ver cadenas de error técnico, el usuario siente que la aplicación se rompió o es inestable. No comprende qué salió mal ni sabe qué paso tomar para solucionarlo.
* **FUENTE oficial:** Material Design Content Design - Error Messages ([m3.material.io/foundations/content-design/verbiage#errors](https://m3.material.io/foundations/content-design/verbiage#errors)); Android Writing Guide - Error Messages ([developer.android.com/design/ui/mobile/guides/writing#error-messages](https://developer.android.com/design/ui/mobile/guides/writing#error-messages)).
* **PROPUESTA concreta:**
  * `errorAbrirArchivo`: ES: "No se pudo abrir el archivo. Comprueba que sea .txt, .md o .docx e inténtalo de nuevo." / EN: "Couldn’t open the file. Make sure it's a .txt, .md or .docx file and try again."
  * `errorModelo`: ES: "No se pudo descargar la voz de Sigo. Revisa tu conexión a internet e inténtalo de nuevo." / EN: "Couldn’t download the voice model. Check your internet connection and try again."
  * `archivoNoSeImporto`: ES: "No se pudo importar el archivo. Revisa que no esté dañado o protegido." / EN: "Couldn’t import the file. Check that it isn't corrupted or protected."
* **GRAVEDAD:** ALTA.

#### Hallazgo 2: Falla silenciosa al presionar "Pegar texto" con portapapeles vacío o no textual
* **Qué pasa:** En la pantalla de editor vacío, al tocar el botón "Pegar texto" con un portapapeles vacío o que contiene imágenes/archivos, la app no realiza ninguna acción ni emite un mensaje de aviso.
* **DÓNDE:** Captura `04-editor-vacio-portrait.png`; archivo `src/components/BarraEditorVacio.tsx:65`, `src/App.tsx:940`.
* **POR QUÉ importa al usuario:** La falta de retroalimentación inmediata genera la sensación de que el botón no funciona o que la interfaz está congelada.
* **FUENTE oficial:** Material Design Content Design - User Feedback ([m3.material.io/foundations/content-design/user-feedback](https://m3.material.io/foundations/content-design/user-feedback)); Android Writing Guide - Feedback ([developer.android.com/design/ui/mobile/guides/writing#feedback](https://developer.android.com/design/ui/mobile/guides/writing#feedback)).
* **PROPUESTA concreta:** Crear la clave `portapapelesVacio` (ES: "No hay texto en el portapapeles." / EN: "No text found in your clipboard.") y lanzar una notificación flotante (*toast*).
* **GRAVEDAD:** ALTA.

#### Hallazgo 3: Instrucciones incompletas en diálogos de permiso denegado
* **Qué pasa:** Al solicitar permisos de micrófono o cámara denegados previamente, el diálogo contextual explica la función pero no indica qué opción seleccionar tras abrir los ajustes de Android.
* **DÓNDE:** Captura `03-editor-bienvenida-portrait.png`; archivo `src/textos/es.ts:167-172`, `src/components/DialogoMicrofono.tsx:45`.
* **POR QUÉ importa al usuario:** El usuario aterriza en la pantalla de Configuración del sistema operativo y no sabe qué permiso específico debe habilitar.
* **FUENTE oficial:** Android Writing Guide - System Permissions ([developer.android.com/design/ui/mobile/guides/writing#permissions](https://developer.android.com/design/ui/mobile/guides/writing#permissions)).
* **PROPUESTA concreta:**
  * `microfonoExplicacion`: ES: "Sigo necesita acceso al micrófono para mover el texto mientras hablas. Toca Abrir ajustes y activa el permiso de Micrófono." / EN: "Sigo needs microphone access to scroll text as you speak. Tap Open settings and turn on the Microphone permission."
  * `camaraExplicacion`: ES: "Sigo necesita acceso a la cámara para filmarte mientras lees. Toca Abrir ajustes y activa el permiso de Cámara." / EN: "Sigo needs camera access to film while you read. Tap Open settings and turn on the Camera permission."
* **GRAVEDAD:** ALTA.

---

### HALLAZGOS DE GRAVEDAD MEDIA

#### Hallazgo 4: Capitalización inconsistente en rótulos de estado e indicadores
* **Qué pasa:** Se presentan rótulos que inician con letra minúscula en posiciones independientes (`incompleta`, `sin audio`, `la cámara sigue encendida`, `dura aprox.`).
* **DÓNDE:** Captura `06-preparar-listo-portrait.png`; archivo `src/textos/es.ts:40,41,134,192`.
* **POR QUÉ importa al usuario:** Rompe el patrón visual de *sentence case* de Android y resta profesionalismo a la aplicación.
* **FUENTE oficial:** Material Design - Sentence Case ([m3.material.io/foundations/content-design/verbiage#capitalization](https://m3.material.io/foundations/content-design/verbiage#capitalization)); Android Guidelines - Capitalization ([developer.android.com/design/ui/mobile/guides/writing#capitalization](https://developer.android.com/design/ui/mobile/guides/writing#capitalization)).
* **PROPUESTA concreta:** Capitalizar la letra inicial de todos los rótulos:
  * `incompleta`: `Incompleta` / EN: `Incomplete`
  * `sinAudio`: `Sin audio` / EN: `No audio`
  * `camaraSigueEncendida`: `La cámara sigue encendida` / EN: `The camera is still on`
  * `duraAprox`: `Dura aprox.` / EN: `Approx. duration`
* **GRAVEDAD:** MEDIA.

#### Hallazgo 5: Texto de espacio en disco demasiado largo para pantalla de 412px
* **Qué pasa:** La etiqueta de advertencia de espacio `Quedan menos de 2 minutos de espacio` resulta extensa para pantallas estándar o con escala de fuente grande.
* **DÓNDE:** Captura `06-preparar-listo-portrait.png`; archivo `src/textos/es.ts:138`, `src/components/PrepararView.tsx:180`.
* **POR QUÉ importa al usuario:** Provoca saltos de línea indeseados en la barra de información de preparación previa a la toma.
* **FUENTE oficial:** Android Writing Guide - Conciseness ([developer.android.com/design/ui/mobile/guides/writing#conciseness](https://developer.android.com/design/ui/mobile/guides/writing#conciseness)); WCAG 2.2 - Reflow 1.4.10 ([w3.org/TR/WCAG22/#reflow](https://www.w3.org/TR/WCAG22/#reflow)).
* **PROPUESTA concreta:** Abreviar la cadena manteniendo el significado exacto:
  * `menosDeDosMinutos`: ES: "Quedan menos de 2 min de espacio" / EN: "Less than 2 min of space left"
* **GRAVEDAD:** MEDIA.

#### Hallazgo 6: Verbos impersonales e infinitivos en botones de acción
* **Qué pasa:** Se usan expresiones impersonales o infinitivos pasivos en botones (`Voltear cámara`, `Repetir toma`, `Mostrar tiempo`).
* **DÓNDE:** Captura `02-biblioteca-ajustes-portrait.png`; archivo `src/textos/es.ts:50,133,140`.
* **POR QUÉ importa al usuario:** La acción es menos clara e imperativa. Los botones de acción deben comunicar exactamente lo que sucede al tocarlos.
* **FUENTE oficial:** Material Design Content Design - Action Labels ([m3.material.io/foundations/content-design/verbiage#action-labels](https://m3.material.io/foundations/content-design/verbiage#action-labels)).
* **PROPUESTA concreta:**
  * `repetirToma`: ES: "Grabar de nuevo" / EN: "Record again"
  * `voltearCamara`: ES: "Cambiar cámara" / EN: "Switch camera" (en fichas: "Voltear" / "Flip")
  * `mostrarTiempo`: ES: "Ver tiempo" / EN: "Show timer"
* **GRAVEDAD:** MEDIA.

#### Hallazgo 7: Tuteo irregular y presencia de frases impersonales pasivas
* **Qué pasa:** Se alternan instrucciones en tuteo ("Escribe tu primer guion", "Tócalo si...") con frases frías en voz pasiva ("Para usar con un vidrio de teleprompter").
* **DÓNDE:** Captura `05-editor-cajon-aa-portrait.png`; archivo `src/textos/es.ts:25,163,178`.
* **POR QUÉ importa al usuario:** Rompe la consistencia en el tono de voz de la aplicación y aleja la sensación de un asistente cercano.
* **FUENTE oficial:** Android Writing Guide - Tone and Voice ([developer.android.com/design/ui/mobile/guides/writing#tone-and-voice](https://developer.android.com/design/ui/mobile/guides/writing#tone-and-voice)).
* **PROPUESTA concreta:** Unificar a tuteo neutro:
  * `espejoExplicacion`: ES: "Refleja el texto para usarlo con un vidrio de teleprompter" / EN: "Flips the text for use with a teleprompter glass"
* **GRAVEDAD:** MEDIA.

#### Hallazgo 8: Traducciones duplicadas y divergentes en la versión en inglés
* **Qué pasa:** En `en.ts`, la misma opción en español tiene dos traducciones distintas según el lugar donde se renderiza (`Behind the text` en panel vs `Behind` en ficha; `Small window` vs `Window`).
* **DÓNDE:** Captura `02-biblioteca-ajustes-portrait.png` / `06-preparar-listo-portrait.png`; archivo `src/textos/es.ts:130-131,148-149`, `src/textos/en.ts:130-131,148-149`.
* **POR QUÉ importa al usuario:** Genera ambigüedad para usuarios en inglés, dando la impresión de que corresponden a configuraciones diferentes.
* **FUENTE oficial:** Material Design Content Design - Consistency ([m3.material.io/foundations/content-design/verbiage#consistency](https://m3.material.io/foundations/content-design/verbiage#consistency)).
* **PROPUESTA concreta:** Unificar la nomenclatura en inglés para que los chips y menús compartan términos canónicos exactos.
* **GRAVEDAD:** MEDIA.

---

### HALLAZGOS DE GRAVEDAD BAJA

#### Hallazgo 9: Botón de confirmación genérico descontextualizado (`¿Seguro?`)
* **Qué pasa:** La etiqueta del botón de confirmación en dos pasos muestra únicamente `¿Seguro?`.
* **DÓNDE:** Captura `06-preparar-listo-portrait.png`; archivo `src/textos/es.ts:4`, `src/components/DockListo.tsx:85`.
* **POR QUÉ importa al usuario:** Obliga al usuario a recordar qué acción presionó previamente.
* **FUENTE oficial:** Android Writing Guide - Dialogs ([developer.android.com/design/ui/mobile/guides/writing#dialogs](https://developer.android.com/design/ui/mobile/guides/writing#dialogs)).
* **PROPUESTA concreta:** contextualizar la etiqueta del botón de confirmación según la acción.
* **GRAVEDAD:** BAJA.

#### Hallazgo 10: Ajustes de redacción menores en el guion de bienvenida ("Hola")
* **Qué pasa:** Las oraciones explicativas del guion de bienvenida en español e inglés pueden sintetizarse para describir las funciones con mayor impacto visual.
* **DÓNDE:** Captura `03-editor-bienvenida-portrait.png`; archivo `src/App.tsx:bloqueDeBienvenida`, `src/App.tsx:bloqueDeBienvenidaEn`.
* **POR QUÉ importa al usuario:** Es el primer punto de contacto del usuario con el teleprompter al abrir la aplicación por primera vez.
* **FUENTE oficial:** Material Design - Onboarding Content ([m3.material.io/foundations/content-design/verbiage#onboarding](https://m3.material.io/foundations/content-design/verbiage#onboarding)).
* **PROPUESTA concreta:** Pulir ligeramente la redacción en español e inglés manteniendo intactas las marcas de formato aplicadas.
* **GRAVEDAD:** BAJA.

---

## 4. TABLA GENERAL DE CAMBIOS PROPUESTOS EN RECURSOS DE TEXTO

A continuación se detalla la propuesta completa de modificación para las claves de `src/textos/es.ts` y `src/textos/en.ts` (sin modificar los archivos de código):

| Clave | Texto de hoy (ES) | Texto propuesto (ES) | Texto de hoy (EN) | Texto propuesto (EN) | Razón |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `seguro` | `¿Seguro?` | `¿Confirmar?` | `Sure?` | `Confirm?` | Verbo explícito de acción que aclara el segundo toque en botones. |
| `incompleta` | `incompleta` | `Incompleta` | `incomplete` | `Incomplete` | *Sentence case* estándar en Android para rótulos y etiquetas de estado. |
| `sinAudio` | `sin audio` | `Sin audio` | `no audio` | `No audio` | *Sentence case* estándar en Android. |
| `repetirToma` | `Repetir toma` | `Grabar de nuevo` | `Retake` | `Record again` | Verbo de acción directa más natural en ambos idiomas. |
| `errorModelo` | `Error descargando modelo de voz Vosk: {detalle}.` | `No se pudo descargar la voz de Sigo. Revisa tu conexión a internet e inténtalo de nuevo.` | `Couldn’t download the Vosk voice model: {detalle}.` | `Couldn’t download the voice model. Check your internet connection and try again.` | Elimina tecnicismos y otorga una solución comprensible para el usuario. |
| `errorAbrirArchivo` | `Error al abrir archivo: {detalle}` | `No se pudo abrir el archivo. Comprueba que sea .txt, .md o .docx e inténtalo de nuevo.` | `Couldn’t open the file: {detalle}` | `Couldn’t open the file. Make sure it's a .txt, .md or .docx file and try again.` | Reemplaza la excepción técnica por instrucciones claras de resolución. |
| `archivoNoSeImporto` | `Error al importar el archivo` | `No se pudo importar el archivo. Revisa que no esté dañado o protegido.` | `Something went wrong importing it.` | `Couldn’t import the file. Make sure it isn't damaged or protected.` | Redacción orientada a la acción humana. |
| `voltearCamara` | `Voltear cámara` | `Cambiar cámara` | `Flip camera` | `Switch camera` | Verbo de acción más descriptivo para el control principal de cámara. |
| `camaraSigueEncendida` | `la cámara sigue encendida` | `La cámara sigue encendida` | `the camera is still on` | `The camera is still on` | *Sentence case* en indicadores flotantes. |
| `menosDeDosMinutos` | `Quedan menos de 2 minutos de espacio` | `Quedan menos de 2 min de espacio` | `Less than 2 minutes of space left` | `Less than 2 min of space left` | Evita truncamientos o desbordes en pantallas estrechas de 412px. |
| `espejoExplicacion` | `Para usar con un vidrio de teleprompter` | `Refleja el texto para usarlo con un vidrio de teleprompter` | `For use with a teleprompter glass` | `Flips text for use with a teleprompter glass` | Mantiene un tuteo activo y directo. |
| `microfonoExplicacion` | `Escucha tu voz para avanzar el texto al ritmo en que lees. La voz se reconoce en el teléfono, sin internet.` | `Escucha tu voz para mover el texto mientras hablas. Toca Abrir ajustes y activa el permiso de Micrófono.` | `It listens to your voice to move the text as you read. Your voice is recognized on the phone, offline.` | `Sigo needs microphone access to scroll text as you speak. Tap Open settings and turn on Microphone permission.` | Guía al usuario exactamente sobre el permiso a activar en Android. |
| `camaraExplicacion` | `La cámara filma mientras lees. La imagen y el video quedan en el teléfono.` | `La cámara te filma mientras lees. Toca Abrir ajustes y activa el permiso de Cámara.` | `The camera films while you read. The image and the video stay on the phone.` | `Sigo needs camera access to film while you read. Tap Open settings and turn on Camera permission.` | Explica el paso exacto en los Ajustes del sistema operativo. |
| `duraAprox` | `dura aprox.` | `Dura aprox.` | `approx.` | `Approx. duration` | *Sentence case* en la vista de preparación y lectura. |

---

## 5. TEXTOS QUE FALTAN (ESTADOS VACÍOS, ERRORES SILENCIOSOS Y AVISOS)

Durante la revisión se identificaron escenarios donde la interfaz carece de texto explicativo o falla en silencio:

1. **Portapapeles sin texto al presionar "Pegar texto"**
   *Falta:* Una clave `portapapelesVacio` (ES: "No hay texto en el portapapeles." / EN: "No text found in your clipboard.") para notificar que la acción no pudo ejecutarse.
2. **Búsqueda sin resultados en la vista de guiones archivados**
   *Falta:* La búsqueda actual aplica solo a la lista principal. Cuando el usuario busca dentro de Archivados y no encuentra coincidencias, se muestra el mensaje de la lista principal. Se propone independizar la clave `sinCoincidenciasArchivados` (ES: "No se encontraron guiones archivados que coincidan con \"{busqueda}\"." / EN: "No archived scripts match \"{busqueda}\".").
3. **Falla en el guardado de video en la Galería por falta de espacio**
   *Falta:* El error de almacenamiento recurre a una clave genérica. Se propone la clave `galeriaSinEspacio` (ES: "No hay espacio suficiente en el teléfono para guardar el video." / EN: "Not enough space on your phone to save the video.").
4. **Desconexión a internet durante la primera descarga del modelo de voz**
   *Falta:* Un aviso claro al perder la conexión mientras se descarga el modelo de voz en un nuevo idioma: `descargaInterrumpida` (ES: "Se interrumpió la descarga de la voz. Revisa tu conexión e inténtalo de nuevo." / EN: "Voice download interrupted. Check your connection and try again.").

---

## 6. AUDITORÍA DEL GUION DE BIENVENIDA ("HOLA")

El guion de bienvenida es el texto predeterminado cargado en la primera apertura de la aplicación (`src/App.tsx:bloqueDeBienvenida` y `bloqueDeBienvenidaEn`). Se auditaron sus contenidos para verificar el cumplimiento del tuteo neutro y la coherencia técnica:

### Evaluación del Guion en Español
* **Formato y Marcas:** Mantiene una demostración efectiva de negrita, colores (ámbar, celeste, verde), destacado amarillo y acotaciones entre corchetes (`[...]`).
* **Coherencia con las Funciones:** Explica correctamente que el texto se mueve al ritmo de la voz, que las acotaciones entre corchetes no se leen en voz alta, que la cámara te filma mientras miras al lente y que los gestos de la mano permiten pausar y seguir.
* **Sugerencia de Ajuste Menor:** En el párrafo sobre gestos, se propone ajustar la frase:
  *Texto actual:* `Y si grabas lejos del teléfono, enciende el Control por gestos en el panel de la cámara. Muestra la palma para pausar o seguir y, en pausa, haz la V para terminar.`
  *Texto propuesto:* `Y si grabas a distancia, activa el Control por gestos. Muestra la palma de la mano para pausar o seguir y, en pausa, haz la señal de V para terminar la toma.`

### Evaluación del Guion en Inglés (`bloqueDeBienvenidaEn`)
* **Redacción e Inglés Nativo:** Cumple plenamente con el glosario de `docs/ingles.txt` (*Script*, *Take*, *Record*, *Captions*, *Gesture control*).
* **Sugerencia de Ajuste Menor:**
  *Texto actual:* `When you want to record yourself, tap Record.`
  *Texto propuesto:* `When you're ready to record, tap Record.`

---

## 7. PARA REVISAR CON JAVIER

A continuación se listan únicamente los aspectos que rozan decisiones previamente cerradas o que requieren confirmación estratégica por parte de Javier:

1. **Confirmación en dos pasos en el botón flotante de descarte (`¿Seguro?` vs `¿Descartar?`)**
   *Razonamiento:* En la pantalla de lectura/grabación en pausa, al tocar el botón del tacho, este se transforma en `¿Seguro?`. Cambiarlo a `¿Descartar?` mejora la claridad del botón de 72px / 56px, evitando toques accidentales de eliminación.
2. **Denominación del permiso en diálogos de sistema**
   *Razonamiento:* Mencionar explícitamente "Permiso de Micrófono" y "Permiso de Cámara" en los diálogos ayuda directamente al usuario a orientarse en el menú de Ajustes nativo de Android.

---
