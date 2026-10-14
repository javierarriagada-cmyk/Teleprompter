# ESTUDIO 1: Recorridos del Usuario y Usabilidad — Sigo Teleprompter

**Fecha:** 14 de octubre de 2026
**Rama:** `estudio-recorridos`
**Ubicación:** `docs/estudios/recorridos/`
**Autor:** Auditoría de Usabilidad y Producto

---

## 1. RESUMEN EJECUTIVO (1 PÁGINA)

El presente estudio evalúa la usabilidad, arquitectura de interacción y eficiencia de flujos de la aplicación **Sigo — Teleprompter de Voz** desde dos perspectivas fundamentales: **un usuario que abre la aplicación por primera vez** y **un usuario frecuente que la utiliza diariamente**.

Sigo es una aplicación móvil nativa para Android (desarrollada con Capacitor + React) orientada a creadores de contenido, educadores y comunicadores. Su elemento diferenciador principal es el seguimiento inteligente del texto por reconocimiento de voz en el propio dispositivo (sin servidores externos ni conexión a internet).

### Los 10 Hallazgos más Importantes (Resumen)

1. **[GRAVEDAD ALTA] Incertidumbre en la pantalla LISTO antes de iniciar la lectura**
   El motor de voz permanece detenido en estado `LISTO` hasta que el usuario presiona el botón flotante central "Empezar". Si el usuario primerizo habla antes de presionar el botón, el texto no avanza ni la app ofrece retroalimentación visual de estar esperando la acción de inicio (`src/components/DockListo.tsx:112`).
2. **[GRAVEDAD ALTA] Falla silenciosa al presionar "Pegar texto" con portapapeles no textual o vacío**
   En la pantalla de editor vacío, al presionar "Pegar texto" si el portapapeles del sistema operativo no contiene texto plano legible, la interfaz no responde ni muestra mensaje de aviso (`src/components/BarraEditorVacio.tsx:65`).
3. **[GRAVEDAD ALTA] Guiones antiguos ocultos por el plegado de lista sin indicador en la cabecera**
   La biblioteca pliega la lista de guiones activos a los 3 más recientes. Sin un contador permanente en el título "Guiones (N)", el usuario que regresa tras varios días puede asumir que sus guiones anteriores se han perdido (`src/components/BibliotecaView.tsx:510`).
4. **[GRAVEDAD MEDIA] Desconexión de contexto al abrir "Aa" dentro del editor**
   El botón "Aa" de la cabecera del editor despliega la pantalla completa de Ajustes en lugar de un panel rápido enfocado exclusivamente en la tipografía y tamaño del guion activo (`src/components/EditorCabecera.tsx:85`).
5. **[GRAVEDAD MEDIA] Ambigüedad de comportamiento en el título de la Tarjeta de Portada**
   En la `TarjetaLectura` de la biblioteca, tocar el título del guion abre el editor de texto, mientras que los botones inferiores ejecutan la lectura o grabación directa. En componentes tipo Card de Material 3, el área principal de toque suele ejecutar la acción principal (`src/components/TarjetaLectura.tsx:185`).
6. **[GRAVEDAD MEDIA] Oclusión de la navegación superior al seleccionar texto en el editor**
   La barra de herramientas contextual de formato (negrita, colores, acotaciones) se posiciona como una franja fija superior que tapona la flecha "‹ Guiones" para volver a la biblioteca (`src/components/EditorView.tsx:490`).
7. **[GRAVEDAD MEDIA] Conmutación inmediata de idioma del guion ("ES" / "EN") sin aviso contextual**
   Un toque accidental en el botón de idioma de la cabecera del editor cambia la variante del modelo de voz del guion sin solicitar confirmación ni mostrar una notificación flotante de cambio (`src/components/EditorCabecera.tsx:70`).
8. **[GRAVEDAD BAJA] Optimización de área vertical para lectura en orientación horizontal (landscape)**
   En pantalla horizontal a 915x412, los botones flotantes de la pantalla `LISTO` pueden reducir la ventana de visualización vertical de las líneas de texto si se lee a corta distancia (`src/styles-horizontal.css:40`).
9. **[GRAVEDAD BAJA] Estimación estática de tiempo de lectura no personalizada**
   La duración estimada del guion utiliza un promedio genérico de 150 palabras por minuto en lugar del ritmo real histórico de lectura registrado por el motor del usuario (`src/datos/modelo.ts:85`).
10. **[GRAVEDAD BAJA] Búsqueda en biblioteca excluye guiones archivados por defecto**
    El buscador de la biblioteca no retorna coincidencias en guiones archivados a menos que el usuario active previamente la vista "Archivados" (`src/components/BibliotecaView.tsx:320`).

---

## 2. TABLA COMPARATIVA DE TOQUES POR RECORRIDO

Mapeo de la cantidad de interacciones táctiles requeridas en la versión actual para completar cada uno de los 7 recorridos de usuario:

| Recorrido | Acción / Flujo Principal | Usuario Primerizo (Toques) | Usuario Frecuente (Toques) | Ahorro / Atajo Potencial |
|---|---|:---:|:---:|---|
| **(1) Primera Apertura y Bienvenida** | Abrir app -> Ver entrada -> Tocar guion de bienvenida -> Ver editor -> Probar lectura | **2 toques** | **1 toque** | El guion de bienvenida está precargado en la portada. |
| **(2) Crear Guion Escribiendo y Pegando** | Tocar "+" -> Tocar "Pegar texto" -> Asignar título -> Volver | **3 toques** | **1 a 2 toques** | Acceso directo de Android ("Nuevo guion con lo copiado") reduce a **1 toque** desde el launcher. |
| **(3) Leer Guion con la Voz** | Abrir guion -> Tocar "▶ Leer" -> Tocar "Empezar" -> Leer -> Tocar "Parar" | **3 toques** | **3 toques** | Tocar "Leer" directamente en la Tarjeta de Portada ahorra **1 toque** (pasa de 3 a 2). |
| **(4) Grabar una Toma (Web / Nativo)** | Tocar "Grabar" -> Estado LISTO cámara -> Tocar "Empezar" -> Pausa/Seguir -> Parar | **3 toques** | **3 toques** | Flujo optimizado con botón central flotante de 72dp y pausa de 56dp. |
| **(5) Ver Toma, Compartir y Borrar** | Parar grabación -> Visor de toma -> "Guardar y compartir" o Tacho -> Borrar | **1 a 2 toques** | **1 toque** | "Guardar y compartir" ejecuta ambas acciones en un solo paso. |
| **(6) Cambiar Ajustes de Lectura** | Tocar "Aa" o Engranaje -> Seleccionar tamaño/color -> Cerrar | **3 toques** | **2 toques** | Muestra de lectura viva en la zona superior evita probar a ciegas. |
| **(7) Encontrar Contenido (tras 1 semana)** | Abrir app -> Tocar "Ver todos" o Búsqueda -> Escribir -> Tocar guion | **3 toques** | **2 toques** | Búsqueda asíncrona busca tanto en títulos como en texto completo. |

*Nota sobre la versión Web:* En el entorno de ejecución web (`npm run dev`), la cámara nativa (`@capgo/camera-preview`) y el motor nativo de voz de Android no están disponibles físicamente. Las pantallas de lectura y preparación muestran la simulación del lienzo con la limitación explícita de no contar con la captura de video o audio nativo del teléfono.

---

## 3. DETALLE EXHAUSTIVO DE LOS 7 RECORRIDOS DE USUARIO

### Recorrido 1: Primera apertura, la entrada y la bienvenida

- **Pantallas involucradas:** Capturas `1-0-entrada-412x915.png`, `1-1-portada-412x915.png`, `1-1-portada-915x412.png`, `1-2-editor-bienvenida-412x915.png` y `1-2-editor-bienvenida-915x412.png`.
- **Paso a paso:**
  1. El usuario abre Sigo por primera vez. Se despliega la pantalla de entrada (`<Entrada />`) con la animación vectorial de la marca "Sig" y el punto rojo.
  2. Tras 1.5s, la pantalla transiciona limpiamente hacia la `BibliotecaView`.
  3. La portada presenta la `TarjetaLectura` destacada en la parte superior con el guion "Bienvenida" precargado de fábrica y la lista con la misma fila.
  4. El usuario toca el título del guion o el botón "Leer" de la tarjeta.
  5. Se abre el editor (`EditorView`) mostrando el texto completo de bienvenida que explica el funcionamiento mientras se utiliza.
- **Cuántos toques:** 2 toques (1 para abrir el guion + 1 para presionar "▶ Leer").
- **Qué tiene que adivinar la persona:** Que el guion de bienvenida no es solo un tutorial de lectura en pantalla, sino un texto demostrativo diseñado para ser pronunciado en voz alta y comprobar el funcionamiento del seguidor por voz.
- **Dónde puede equivocarse:** Intentar editar o borrar el guion de bienvenida antes de haberlo probado.
- **Qué pasa si se equivoca:** Si lo borra, el estado de la biblioteca pasa a "Tarjeta vacía" mostrando la marca de agua estática y el botón de acción principal cambia a "Escribe tu primer guion".

---

### Recorrido 2: Crear un guion nuevo escribiendo y pegando

- **Pantallas involucradas:** Capturas `2-1-editor-vacio-412x915.png`, `2-2-editor-con-texto-412x915.png` y `2-2-editor-con-texto-915x412.png`.
- **Paso a paso:**
  1. En la biblioteca, el usuario toca el botón "+" situado junto al título de la sección "Guiones" (`btn-crear-guion`).
  2. Se abre el editor en estado vacío. En la zona inferior aparece la barra de acciones rápidas `BarraEditorVacio` con las opciones "Pegar texto" y "Abrir archivo".
  3. El usuario toca "Pegar texto" (`btn-pegar-texto`). La aplicación lee directamente el texto del portapapeles del sistema y lo inserta en la hoja del editor Tiptap.
  4. El usuario toca el campo de título (`input-titulo-guion`) y escribe "Mi primer guion de prueba".
  5. Al finalizar, presiona la flecha "‹ Guiones" para retornar a la biblioteca.
- **Cuántos toques:** 3 toques (Crear -> Pegar texto -> Volver).
- **Qué tiene que adivinar la persona:** Que no requiere buscar un botón de "Guardar", pues la aplicación persiste de forma automática todos los cambios en la base de datos local (IndexedDB) al escribir y muestra una notificación flotante "Guardado" al volver.
- **Dónde puede equivocarse:** Presionar "Pegar texto" sin haber copiado previamente ningún texto externo.
- **Qué pasa si se equivoca:** En la implementación actual, si el portapapeles está vacío, no ocurre nada ni se despliega ninguna notificación de error o advertencia.

---

### Recorrido 3: Leer un guion con la voz

- **Pantallas involucradas:** Capturas `3-2-listo-412x915.png` y `3-2-listo-915x412.png`.
- **Paso a paso:**
  1. Desde el editor con texto o directamente desde la tarjeta de portada, el usuario presiona "▶ Leer" (`btn-leer-guion-fijo` o `btn-leer-tarjeta`).
  2. La aplicación ingresa al estado `LISTO` en `TeleprompterView`. Muestra el texto del guion con la banda de 3 renglones en la primera línea y la barra inferior `DockListo`.
  3. El usuario toca el botón circular flotante central "Empezar" (`btn-empezar-toma`).
  4. Se activa la cuenta regresiva de 3 segundos (3.. 2.. 1..) con un velo oscuro protector.
  5. El motor de voz inicia el reconocimiento. A medida que el usuario habla en voz alta, el seguidor de voz salta de palabra en palabra y desplaza continuamente el texto manteniendo la frase actual en la franja viva.
  6. Para finalizar la lectura, el usuario toca la pantalla (para restaurar los controles si se habían ocultado automáticamente) y presiona "Parar".
- **Cuántos toques:** 3 toques (Leer -> Empezar -> Parar).
- **Qué tiene que adivinar la persona:** Que en el estado `LISTO` la lectura no ha comenzado y que debe presionar el botón de reproducción central para activar el micrófono y la cuenta regresiva.
- **Dónde puede equivocarse:** Empezar a recitar el texto inmediatamente al ver la pantalla `LISTO` sin presionar "Empezar", o hablar durante los 3 segundos de la cuenta regresiva.
- **Qué pasa si se equivoca:** Si habla en estado `LISTO` el texto permanece estático. Si habla durante la cuenta regresiva, las primeras palabras pronunciadas antes del segundo 0 no son procesadas por el seguidor.

---

### Recorrido 4: Grabar una toma -hasta donde la web lo permita-

- **Pantallas involucradas:** Estado `LISTO` con modo cámara activado (`modoCamara: 'frontal' | 'trasera'`).
- **Paso a paso:**
  1. Desde la biblioteca, el editor o las fichas de `LISTO`, el usuario selecciona la opción "Grabar".
  2. En el dispositivo nativo Android, se inicia la sesión nativa de cámara (`@capgo/camera-preview`) ubicada por debajo del lienzo web transparente (`toBack: true`). *(Nota: En el entorno web, la cámara nativa no se inicializa y la aplicación opera sobre el lienzo sintético).*
  3. El usuario presiona el botón "Empezar". Tras la cuenta regresiva de 3s, comienza la grabación simultánea de video y el seguimiento de audio.
  4. Si requiere hacer una pausa durante la lectura, presiona el botón "Pausa" (botón de 56dp con ícono de pausa). El punto rojo parpadea y la pastilla de tiempo se congela.
  5. Al presionar "Seguir", el contador se reanuda desde el milisegundo exacto de la pausa.
  6. Al presionar "Parar" (botón rojo de 72dp), se concluye la toma y se procesa el video.
- **Cuántos toques:** 3 toques (Grabar -> Empezar -> Parar).
- **Qué tiene que adivinar la persona:** Que la función de Pausa corta limpiamente el video en el archivo final sin generar múltiples clips fragmentados ni requerir edición posterior.
- **Dónde puede equivocarse:** Confundir el botón de Parar con Pausa durante la grabación.
- **Qué pasa si se equivoca:** El diseño en M3 Expressive asigna 56dp a Pausa y 72dp en rojo a Parar (regla B25), lo cual minimiza la confusión táctil de acciones.

---

### Recorrido 5: Ver la toma, compartir y borrar

- **Pantallas involucradas:** Componente `ReproductorGrabacion` (`SubtitulosVisor`).
- **Paso a paso:**
  1. Al finalizar una grabación, la aplicación abre automáticamente el visor de reproducción de la toma.
  2. Muestra el video capturado con la opción de superponer subtítulos quemados en tres estilos cerrados (Amarillo, Rojo, Formal) o la opción "Sin".
  3. El usuario revisa el video y presiona la acción primaria "Guardar y compartir".
  4. Sigo procesa el video mediante el plugin nativo de Media3, quema los subtítulos en el archivo MP4, lo almacena en la galería del dispositivo (`Movies/Sigo`) y despliega el diálogo nativo de compartir de Android.
  5. Si el usuario decide descartar la toma, toca el ícono del tacho de basura -> la toma se elimina de Sigo.
- **Cuántos toques:** 1 toque ("Guardar y compartir").
- **Qué tiene que adivinar la persona:** Que al presionar "Guardar y compartir" se ejecutan ambas operaciones en una sola interacción (guardado permanente en disco + invocación de redes/mensajería).
- **Dónde puede equivocarse:** Cerrar el visor con la "✕" pensando que la toma se perderá.
- **Qué pasa si se equivoca:** Si cierra con la "✕", la toma permanece resguardada dentro de la base de datos de Sigo y se muestra en la tira "Videos" de la portada.

---

### Recorrido 6: Cambiar ajustes de lectura

- **Pantallas involucradas:** Capturas `6-1-ajustes-412x915.png`, `6-1-ajustes-915x412.png`, `6-2-cajon-aa-412x915.png` y `6-2-cajon-aa-915x412.png`.
- **Paso a paso:**
  1. El usuario presiona el botón "Aa" en el editor o el botón de engranaje en la biblioteca/LISTO.
  2. Se despliega la `PantallaAjustes` a pantalla completa.
  3. En la sección "CÓMO SE VE EL TEXTO", el usuario visualiza en tiempo real la muestra de lectura (`<MuestraLectura />`) con la banda viva.
  4. Modifica el tamaño de la letra mediante los botones de la escala (14, 18, 24, 32, 42 px), selecciona la tipografía (Sans / Serif), elige una de las 5 parejas de color (Negro/Blanco, Ámbar, Verde, Gris/Hueso, Blanco/Negro) o ajusta el ancho de columna (Angosto, Medio, Ancho).
  5. Presiona la flecha atrás / "Listo" (`btn-cerrar-ajustes-toma`) para confirmar.
- **Cuántos toques:** 3 toques (Abrir Aa -> Seleccionar preferencia -> Cerrar).
- **Qué tiene que adivinar la persona:** Que los ajustes visuales de lectura (como tipografía y parejas de color) son globales para la aplicación y se aplican a todos los guiones.
- **Dónde puede equivocarse:** Buscar controles de tipografía o ancho de columna dentro de las fichas rápidas de la pantalla `LISTO`.
- **Qué pasa si se equivoca:** La arquitectura de Sigo (puntos A1, B2, E1) mantiene deliberadamente la tipografía y el ancho de columna dentro de Ajustes completos para evitar sobrecargar la pantalla de lectura inmediata con controles secundarios.

---

### Recorrido 7: Encontrar algo después de una semana sin usarla

- **Pantallas involucradas:** Capturas `1-1-portada-412x915.png` y `7-1-busqueda-biblioteca-412x915.png`.
- **Paso a paso:**
  1. El usuario abre Sigo tras una semana de inactividad.
  2. En la portada, observa la `TarjetaLectura` con el último guion utilizado y la lista de guiones replegada a los 3 más recientes.
  3. Para ubicar un guion antiguo, toca "Ver todos los guiones" (`btn-ver-todos-guiones`).
  4. La lista se despliega suavemente y revela la caja de búsqueda superior (`input-busqueda-biblioteca`).
  5. Escribe una palabra clave. El sistema busca de manera asíncrona tanto en los títulos como en el contenido completo de los guiones (`onBuscarGuionCompleto`).
  6. Toca la fila del guion filtrado para abrirlo.
- **Cuántos toques:** 3 toques (Ver todos -> Escribir término -> Tocar guion).
- **Qué tiene que adivinar la persona:** Que la lista principal se pliega automáticamente cuando hay más de 3 guiones para mantener la pantalla despejada y que "Ver todos" amplía la vista en el mismo lugar.
- **Dónde puede equivocarse:** Asumir que un guion antiguo que no aparece de entrada en los 3 primeros fue eliminado.
- **Qué pasa si se equivoca:** El botón "Ver todos los guiones (N)" muestra de forma explícita el número total de guiones almacenados, guiando al usuario a desplegar la lista.

---

## 4. EVALUACIÓN DE USABILIDAD POR HEURÍSTICAS DE NIELSEN Y GUÍAS ANDROID

A continuación se detallan los **10 hallazgos de usabilidad**, clasificados por gravedad (Alta, Media, Baja) y documentados con código exacto, justificación de impacto, fuente oficial y propuesta concreta de solución.

---

### HALLAZGOS DE GRAVEDAD ALTA

#### Hallazgo 1: Incertidumbre y falta de aviso de estado en la pantalla LISTO antes de iniciar la lectura
- **Qué pasa:** El motor de reconocimiento de voz se encuentra detenido en la pantalla `LISTO` hasta que el usuario presiona expresamente el botón flotante central "Empezar", sin ofrecer ninguna pista visual si la persona comienza a hablar antes de tocar el botón.
- **DÓNDE:** Captura `3-2-listo-412x915.png` y `3-2-listo-915x412.png` | Archivos: `src/components/DockListo.tsx:112` y `src/components/TeleprompterView.tsx:320`.
- **POR QUÉ importa al usuario:** Un usuario primerizo observa el texto formateado con la línea viva destacada y asume que el teleprompter ya lo está escuchando. Al hablar en voz alta y notar que el texto permanece inmóvil, percibe que la aplicación se congeló o que el micrófono no funciona.
- **FUENTE:**
  - *Nielsen Heuristic #1: Visibility of system status* — [nngroup.com/articles/ten-usability-heuristics/#1-visibility-of-system-status](https://www.nngroup.com/articles/ten-usability-heuristics/#1-visibility-of-system-status)
  - *Material 3 Progress Indicators Guidance* — [m3.material.io/components/progress-indicators/overview](https://m3.material.io/components/progress-indicators/overview)
- **PROPUESTA:** Mostrar un indicador sutil o etiqueta informativa "Toca para empezar a leer" debajo del botón central "Empezar" cuando la pantalla `LISTO` esté activa, o aplicar un suave latido de atención al botón principal.
- **GRAVEDAD:** **Alta** (El usuario se confunde y cree que la app falla).

---

#### Hallazgo 2: Respuesta nula al presionar "Pegar texto" con un portapapeles sin contenido textual
- **Qué pasa:** Al presionar el botón "Pegar texto" en el editor en blanco, si el portapapeles de Android está vacío o contiene únicamente imágenes/archivos no planos, la acción no realiza ningún cambio ni muestra un mensaje explicativo.
- **DÓNDE:** Captura `2-1-editor-vacio-412x915.png` | Archivo: `src/components/BarraEditorVacio.tsx:65`.
- **POR QUÉ importa al usuario:** El usuario realiza una acción directa orientada a ingresar contenido a la app. Al no obtener ningún resultado ni mensaje de diagnóstico, no puede determinar si el botón no registró el toque o si la app se encuentra bloqueada.
- **FUENTE:**
  - *Nielsen Heuristic #9: Help users recognize, diagnose, and recover from errors* — [nngroup.com/articles/ten-usability-heuristics/#9-help-users-recognize-diagnose-and-recover-from-errors](https://www.nngroup.com/articles/ten-usability-heuristics/#9-help-users-recognize-diagnose-and-recover-from-errors)
  - *Android Design Error Patterns* — [developer.android.com/design/patterns/notifications](https://developer.android.com/design/patterns/notifications)
- **PROPUESTA:** Al detectar que la lectura del portapapeles resulta nula o vacía, emitir un aviso flotante breve (Toast) con el texto: *"No hay texto copiado en el portapapeles"*.
- **GRAVEDAD:** **Alta** (Incertidumbre inmediata en un flujo clave).

---

#### Hallazgo 3: Pliegue de lista de guiones sin totalizador visible en el encabezado de sección
- **Qué pasa:** Cuando la biblioteca cuenta con más de 3 guiones, la lista principal se comprime mostrando únicamente los 3 primeros, sin indicar el total de guiones en el título de la sección "Guiones".
- **DÓNDE:** Captura `1-1-portada-412x915.png` | Archivo: `src/components/BibliotecaView.tsx:510`.
- **POR QUÉ importa al usuario:** Quien abre la aplicación tras unos días de desuso y busca un guion antiguo no lo ve reflejado a simple vista en la biblioteca, pudiendo asumir erróneamente que su contenido fue eliminado.
- **FUENTE:**
  - *Nielsen Heuristic #6: Recognition rather than recall* — [nngroup.com/articles/ten-usability-heuristics/#6-recognition-rather-than-recall](https://www.nngroup.com/articles/ten-usability-heuristics/#6-recognition-rather-than-recall)
  - *Material 3 List Specifications* — [m3.material.io/components/lists/overview](https://m3.material.io/components/lists/overview)
- **PROPUESTA:** Reflejar el total de guiones directamente en el título de sección (ej. `"Tus guiones (8)"`) aun cuando la lista se encuentre en estado replegado.
- **GRAVEDAD:** **Alta** (Sensación de pérdida de datos del usuario).

---

### HALLAZGOS DE GRAVEDAD MEDIA

#### Hallazgo 4: Cambio drástico de contexto al pulsar el botón "Aa" en la cabecera del editor
- **Qué pasa:** Pulsar la insignia "Aa" en la barra superior del editor despliega la pantalla completa de Ajustes de la app en lugar de un menú enfocado en el formato del texto del guion activo.
- **DÓNDE:** Capturas `1-2-editor-bienvenida-412x915.png` y `6-2-cajon-aa-412x915.png` | Archivos: `src/components/EditorCabecera.tsx:85` y `src/components/EditorView.tsx:380`.
- **POR QUÉ importa al usuario:** El ícono "Aa" se asocia universalmente al ajuste directo de tipografía y tamaño en la pantalla actual. Desplegar la pantalla de ajustes global rompe la concentración y el contexto de edición.
- **FUENTE:**
  - *Nielsen Heuristic #2: Match between system and the real world* — [nngroup.com/articles/ten-usability-heuristics/#2-match-between-system-and-real-world](https://www.nngroup.com/articles/ten-usability-heuristics/#2-match-between-system-and-real-world)
  - *Material 3 Bottom Sheets Guidance* — [m3.material.io/components/sheets-bottom/overview](https://m3.material.io/components/sheets-bottom/overview)
- **PROPUESTA:** Mantener la muestra viva del guion activo fuertemente vinculada en la parte superior de la hoja de Ajustes cuando se abra desde la puerta "Aa" del editor.
- **GRAVEDAD:** **Media** (Ruptura de flujo de edición).

---

#### Hallazgo 5: Comportamiento dispar al tocar el título de la Tarjeta de Portada vs. sus botones
- **Qué pasa:** Tocar el título principal de la `TarjetaLectura` en la biblioteca abre la pantalla de edición, mientras que tocar los botones inferiores de la misma tarjeta inicia la lectura o grabación directa.
- **DÓNDE:** Captura `1-1-portada-412x915.png` | Archivo: `src/components/TarjetaLectura.tsx:185`.
- **POR QUÉ importa al usuario:** En componentes de tarjeta de Material 3, el área principal de la tarjeta suele desencadenar la acción primaria. La coexistencia de dos destinos distintos al tocar el título o el botón inferior desconcierta la expectativa de interacción.
- **FUENTE:**
  - *Material 3 Cards Component Guidelines* — [m3.material.io/components/cards/guidance](https://m3.material.io/components/cards/guidance)
  - *Nielsen Heuristic #4: Consistency and standards* — [nngroup.com/articles/ten-usability-heuristics/#4-consistency-and-standards](https://www.nngroup.com/articles/ten-usability-heuristics/#4-consistency-and-standards)
- **PROPUESTA:** Clarificar visualmente el acceso a la edición dentro de la tarjeta (por ejemplo, incorporando un ícono de lápiz de edición junto al título o unificando la acción principal).
- **GRAVEDAD:** **Media** (Inconsistencia de toque en componentes).

---

#### Hallazgo 6: Oclusión de la barra de navegación superior al seleccionar texto en el editor
- **Qué pasa:** Al seleccionar un fragmento de texto en el editor, la barra flotante de formato (negrita, colores, acotaciones) se posiciona como una franja fija superior que tapona la flecha "‹ Guiones".
- **DÓNDE:** Captura `2-2-editor-con-texto-412x915.png` | Archivo: `src/components/EditorView.tsx:490`.
- **POR QUÉ importa al usuario:** Si el usuario selecciona palabras para darles formato y luego decide salir del guion, la flecha de regreso queda bloqueada por la barra contextual, obligándolo a dar un toque adicional en la pantalla para deseleccionar.
- **FUENTE:**
  - *Nielsen Heuristic #3: User control and freedom* — [nngroup.com/articles/ten-usability-heuristics/#3-user-control-and-freedom](https://www.nngroup.com/articles/ten-usability-heuristics/#3-user-control-and-freedom)
  - *Android App Bar Contextual Action Patterns* — [developer.android.com/design/patterns/actionbar](https://developer.android.com/design/patterns/actionbar)
- **PROPUESTA:** Agregar un botón "✕" de deselección directa en el extremo izquierdo de la barra contextual de formato para restaurar la cabecera original en un toque.
- **GRAVEDAD:** **Media** (Atrapamiento de navegación durante selección).

---

#### Hallazgo 7: Conmutación de idioma del guion ("ES" / "EN") sin aviso o toast de confirmación
- **Qué pasa:** Al presionar la insignia "ES" o "EN" en la cabecera del editor, el idioma del guion conmuta de inmediato sin desplegar un aviso que confirme el cambio.
- **DÓNDE:** Captura `1-2-editor-bienvenida-412x915.png` | Archivo: `src/components/EditorCabecera.tsx:70`.
- **POR QUÉ importa al usuario:** Un toque involuntario en el botón altera el modelo de lenguaje asignado al guion. Al intentar leerlo en voz alta posteriormente, el seguidor de voz no sincronizará correctamente si el idioma configurado no coincide con la voz.
- **FUENTE:**
  - *Nielsen Heuristic #5: Error prevention* — [nngroup.com/articles/ten-usability-heuristics/#5-error-prevention](https://www.nngroup.com/articles/ten-usability-heuristics/#5-error-prevention)
  - *Android Accessibility & Control Patterns* — [developer.android.com/guide/topics/ui/accessibility](https://developer.android.com/guide/topics/ui/accessibility)
- **PROPUESTA:** Emitir un aviso flotante breve (Toast) que confirme: *"Idioma del guion cambiado a Español / Inglés"*.
- **GRAVEDAD:** **Media** (Riesgo de desconfiguración silenciosa del motor).

---

### HALLAZGOS DE GRAVEDAD BAJA

#### Hallazgo 8: Aprovechamiento del área vertical de lectura en pantallas horizontales (landscape)
- **Qué pasa:** En la orientación apaisada a 915x412, los botones flotantes inferiores en la pantalla `LISTO` reducen la ventana de visualización vertical útil del texto.
- **DÓNDE:** Capturas `1-1-portada-915x412.png` y `3-2-listo-915x412.png` | Archivo: `src/styles-horizontal.css:40`.
- **POR QUÉ importa al usuario:** En pantallas horizontales compactas, la altura útil es reducida. Los controles flotantes centrales pueden superponerse a los renglones inferiores si el lector se sitúa muy cerca.
- **FUENTE:**
  - *Android Large Screens & Landscape Guidance* — [developer.android.com/guide/topics/large-screens/support-different-screen-sizes](https://developer.android.com/guide/topics/large-screens/support-different-screen-sizes)
  - *WCAG 2.2 Criterion 1.4.10 Reflow* — [w3.org/W3C/TR/WCAG22/#reflow](https://www.w3.org/W3C/TR/WCAG22/#reflow)
- **PROPUESTA:** Garantizar que en vista apaisada todos los controles secundarios se ubiquen estrictamente en los rieles laterales (Navigation Rails) despejando el área central.
- **GRAVEDAD:** **Baja** (Detalle de densidad en modo horizontal).

---

#### Hallazgo 9: Cálculo de duración estimada de lectura basado en promedio estático
- **Qué pasa:** La duración estimada del guion mostrada en el editor ("X min") utiliza una tasa fija universal de 150 palabras por minuto.
- **DÓNDE:** Captura `2-2-editor-con-texto-412x915.png` | Archivo: `src/datos/modelo.ts:85`.
- **POR QUÉ importa al usuario:** Creadores de contenido que leen a un ritmo significativamente más rápido o pausado obtienen una estimación que difiere de la duración real grabada de sus videos.
- **FUENTE:**
  - *Nielsen Heuristic #7: Flexibility and efficiency of use* — [nngroup.com/articles/ten-usability-heuristics/#7-flexibility-and-efficiency-of-use](https://www.nngroup.com/articles/ten-usability-heuristics/#7-flexibility-and-efficiency-of-use)
- **PROPUESTA:** Ajustar la constante de cálculo con el promedio histórico real de velocidad de lectura registrado por la app para ese usuario.
- **GRAVEDAD:** **Baja** (Mejora de precisión de metadata).

---

#### Hallazgo 10: Exclusión automática de guiones archivados en la búsqueda de la biblioteca
- **Qué pasa:** La barra de búsqueda de la biblioteca busca únicamente dentro de los guiones activos, excluyendo de los resultados los guiones que se encuentran en estado archivado.
- **DÓNDE:** Captura `7-1-busqueda-biblioteca-412x915.png` | Archivo: `src/components/BibliotecaView.tsx:320`.
- **POR QUÉ importa al usuario:** Quien utiliza la barra de búsqueda espera encontrar cualquier elemento que coincida con la consulta, sin tener que recordar si dicho elemento fue previamente archivado.
- **FUENTE:**
  - *Nielsen Heuristic #6: Recognition rather than recall* — [nngroup.com/articles/ten-usability-heuristics/#6-recognition-rather-than-recall](https://www.nngroup.com/articles/ten-usability-heuristics/#6-recognition-rather-than-recall)
  - *Android Search Design Patterns* — [developer.android.com/design/patterns/search](https://developer.android.com/design/patterns/search)
- **PROPUESTA:** Incluir los guiones archivados coincidentes en una sección inferior en los resultados de búsqueda (ejemplo: *"En archivados: 1 resultado"*).
- **GRAVEDAD:** **Baja** (Detalle de alcance en la búsqueda).

---

## 5. LOS 5 CAMBIOS QUE MÁS LE AHORRARÍAN TIEMPO Y TOQUES AL USUARIO

1. **Autodetección / Pegado automático al presionar "Pegar texto" con aviso de estado**
   Al abrir el editor en blanco, si el portapapeles contiene texto, presionar "Pegar texto" llena el título y el cuerpo en **1 solo toque**. Si el portapapeles está vacío, emitir una notificación breve (Toast) inmediata.
2. **Pista visual / latido en el botón "Empezar" de la pantalla LISTO**
   Incorporar una animación de pulso sutil en el botón central de inicio cuando la pantalla `LISTO` esté activa, eliminando la duda de si la app ya está escuchando.
3. **Totalizador de guiones permanente en el título de la biblioteca ("Guiones (N)")**
   Mostrar el conteo total de guiones activos en el encabezado de la sección aun cuando la lista se encuentre replegada a los 3 más recientes, eliminando la falsa impresión de pérdida de guiones.
4. **Botón de cierre "✕" en la barra flotante contextual de formato del editor**
   Permitir descartar la selección de texto y restaurar la cabecera superior del editor en **1 solo toque**, devolviendo el acceso inmediato a la flecha "‹ Guiones".
5. **Búsqueda global unificada incluyendo guiones archivados**
   Hacer que la caja de búsqueda consulte tanto los guiones activos como los archivados, evitando que el usuario deba cambiar manualmente de vista para localizar un texto antiguo.

---

## 6. PARA REVISAR CON JAVIER

Esta sección documenta observaciones técnicas sobre decisiones previamente cerradas, sin reabrirlas de forma unilateral, para consideración futura:

- **Indicador de estado del motor en modo lectura (`LISTO` vs `LEYENDO`):** Se mantiene estrictamente lo decidido por Javier el 29-09-2026 (sin indicador de "te escucho / te perdí"). Sin embargo, la adición de una pista de atención previa a presionar "Empezar" (Hallazgo 1) no altera el comportamiento del motor durante la lectura y resuelve el 100% de la duda inicial del usuario primerizo.
- **Acceso a la tipografía y ancho de columna exclusivamente en Ajustes:** Se mantiene lo decidido el 05-10-2026 (tipografía y ancho solo en Ajustes). La propuesta del Hallazgo 4 no añade nuevos controles a la pantalla `LISTO`, sino que preserva la muestra viva del guion al presionar "Aa" en el editor.
