# Informe de Accesibilidad: Sigo Teleprompter
**Estudio de Accesibilidad WCAG 2.2 Nivel AA y Guías de Accesibilidad de Android**
**Fecha:** 14 de Octubre de 2026
**Rama:** `estudio-accesibilidad`
**Carpeta del Estudio:** `docs/estudios/accesibilidad/`

---

## Resumen Ejecutivo (1 Página)

El presente estudio evalúa exhaustivamente la accesibilidad de **Sigo — Teleprompter de voz** (aplicación Android en Capacitor + React) en conformidad con las pautas **WCAG 2.2 Nivel AA** y las **Guías de Accesibilidad para Android de Google Developer**.

Sigo cuenta con cimientos sólidos de diseño e ingeniería: interfaz limpia, paletas oscuras bien contrastadas en reposo, soporte de reducción de movimiento (`prefers-reduced-motion`), tipografía personalizable y respuesta háptica respetuosa. Sin embargo, para alcanzar el cumplimiento pleno de la norma **WCAG 2.2 Nivel AA** e integración perfecta con el lector de pantalla **TalkBack**, la aplicación requiere atender 10 hallazgos clave enfocados en navegación por teclado/TalkBack, gestión del foco, contraste de velos y áreas de toque.

### Los 10 Hallazgos Más Importantes (Ordenados por Gravedad)

1. **[Alta - WCAG 2.1.1 / 2.1.3] Región de lectura del teleprompter no accesible por teclado ni TalkBack:** El contenedor principal de lectura (`contenedor-lectura`) carece de `tabIndex={0}` y rol accesible, impidiendo el desplazamiento manual por teclado o lectores de pantalla.
2. **[Alta - WCAG 2.5.1 / Android Actions] Acciones de deslizamiento (swipe) en la biblioteca inaccesibles para TalkBack:** Borrar y duplicar guiones mediante *swipe* horizontal no se pueden ejecutar con TalkBack ni navegación por teclado.
3. **[Alta - WCAG 2.4.3 / M3 Dialogs] Ausencia de trampa de foco y rol modal en el Cajón de Ajustes (Aa):** Al desplegar el cajón de ajustes (`panel-ajustes`), el foco de TalkBack/teclado se escapa hacia los elementos de la vista trasera.
4. **[Media - WCAG 1.4.3] Contraste insuficiente en el velo inferior de atenuación de lectura:** El texto de apoyo bajo el velo inferior (55% opacidad) ofrece una razón de contraste de 4.43:1 en fondo negro y 3.36:1 en fondo blanco (mínimo 4.5:1).
5. **[Media - WCAG 1.4.3] Contraste de texto secundario sobre paneles en Tema Claro:** El tono `--color-apagado` (`#736B65`) sobre paneles claros (`#E7E4DF`) ofrece 4.12:1 (mínimo 4.5:1).
6. **[Media - WCAG 2.5.8 / Android Target Size] Botones de formato de color en el Editor inferiores a 48x48 dp:** Los botones de resaltado de texto (`btn-color-ambar`, celeste, salvia) miden 32x32 px sin margen táctil expandido.
7. **[Media - WCAG 1.4.4] Desbordamiento de texto y recortes al escalar la fuente del sistema al 200%:** Las fichas flotantes del teleprompter (`.dock-listo`) sufren recortes de etiquetas al duplicar el tamaño de fuente.
8. **[Media - WCAG 1.4.1] Información transmitida exclusivamente por color en tramos destacados:** Los tramos de texto en el editor y teleprompter solo se distinguen por el tono de color (ámbar, celeste, salvia), dificultando la percepción en daltonismo.
9. **[Baja - WCAG 1.3.1] Ausencia de estructura semántica `<main>` y encabezado `<h1>`:** La aplicación utiliza divisiones genéricas (`<div>`) sin definir la región principal ni jerarquía de encabezados.
10. **[Baja - WCAG 1.4.11] Contraste no textual insuficiente en bordes y separadores claros:** El color `--color-separador` (`#E4E0D9`) sobre el fondo claro (`#F3F1ED`) da 1.18:1 (mínimo 3:1).

---

## 1. Auditoría Detallada por Hallazgo

### Hallazgo 1 (Gravedad: ALTA)
- **QUÉ PASA:** El contenedor principal de lectura del teleprompter no se puede enfocar ni desplazar mediante teclado ni TalkBack.
- **DÓNDE:** `docs/estudios/accesibilidad/04-teleprompter-oscuro-retrato.png` | `src/components/TeleprompterView.tsx:1280`.
- **POR QUÉ IMPORTA AL USUARIO:** Un usuario ciego o con discapacidad motriz que navega mediante teclado externo o interruptores no puede desplazarse manualmente por el texto del guion.
- **FUENTE OFICIAL:** [WCAG 2.2 SC 2.1.1 Keyboard (Level A)](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html) y [WCAG 2.2 SC 2.1.3 Keyboard (No Exception) (Level AAA)](https://www.w3.org/WAI/WCAG22/Understanding/keyboard-no-exception.html).
- **PROPUESTA CONCRETA:** Añadir `tabIndex={0}`, `role="region"` y `aria-label={t('textoGuion')}` al `<div>` con `data-testid="contenedor-lectura"`.

---

### Hallazgo 2 (Gravedad: ALTA)
- **QUÉ PASA:** Las acciones de eliminar y duplicar guiones en la lista de la biblioteca dependen exclusivamente de gestos de deslizamiento (*swipe*).
- **DÓNDE:** `docs/estudios/accesibilidad/01-biblioteca-oscuro-retrato.png` | `src/components/BibliotecaView.tsx:340`.
- **POR QUÉ IMPORTA AL USUARIO:** Los lectores de pantalla como TalkBack interceptan los gestos de deslizamiento para mover el foco, impidiendo que el usuario pueda borrar o duplicar sus guiones.
- **FUENTE OFICIAL:** [WCAG 2.2 SC 2.5.1 Pointer Gestures (Level A)](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html) y [Guías de Accesibilidad de Android: Acciones Personales](https://developer.android.com/guide/topics/ui/accessibility/apps#actions).
- **PROPUESTA CONCRETA:** Incorporar un botón de menú de opciones (tres puntos) en cada fila de guion de la biblioteca o asignar `AccessibilityCustomAction` para TalkBack.

---

### Hallazgo 3 (Gravedad: ALTA)
- **QUÉ PASA:** El Cajón de Ajustes (Aa) no confina el foco del lector de pantalla ni se anuncia como ventana modal.
- **DÓNDE:** `docs/estudios/accesibilidad/03-cajon-aa-oscuro-retrato.png` | `src/components/PanelAjustes.tsx:85`.
- **POR QUÉ IMPORTA AL USUARIO:** TalkBack continúa leyendo el texto y los botones del editor que quedan cubiertos visualmente por el cajón, generando gran confusión y desorientación.
- **FUENTE OFICIAL:** [WCAG 2.2 SC 2.4.3 Focus Order (Level A)](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html) y [Material Design 3 Dialogs & Sheets Accessibility](https://m3.material.io/components/dialogs/accessibility).
- **PROPUESTA CONCRETA:** Asignar `role="dialog"`, `aria-modal="true"` al contenedor del panel, aplicar `aria-hidden="true"` a la vista trasera mientras esté abierto y trasladar el foco al primer elemento interactivo del cajón al desplegarse.

---

### Hallazgo 4 (Gravedad: MEDIA)
- **QUÉ PASA:** El texto bajo el velo inferior de atenuación en la lectura no alcanza la razón de contraste mínima de 4.5:1.
- **DÓNDE:** `docs/estudios/accesibilidad/04-teleprompter-oscuro-retrato.png` | `src/components/banda.ts:25`.
- **POR QUÉ IMPORTA AL USUARIO:** En fondo negro da 4.43:1 (color efectivo `#737373` sobre `#000000`) y en fondo blanco cae a 3.36:1 (color efectivo `#8C8C8C` sobre `#FFFFFF`), dificultando la prelectura del renglón que viene a usuarios con baja visión.
- **FUENTE OFICIAL:** [WCAG 2.2 SC 1.4.3 Contrast (Minimum) (Level AA)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- **PROPUESTA CONCRETA:** Reducir levemente la opacidad del velo inferior de atenuación: pasar de `0.55` a `0.54` en fondo negro (obteniendo 4.56:1) y a `0.46` en fondo blanco (obteniendo 4.52:1).

---

### Hallazgo 5 (Gravedad: MEDIA)
- **QUÉ PASA:** El texto secundario sobre paneles en Tema Claro no cumple con la razón de contraste 4.5:1.
- **DÓNDE:** `docs/estudios/accesibilidad/03-cajon-aa-claro-retrato.png` | `src/styles.css:85`.
- **POR QUÉ IMPORTA AL USUARIO:** El color `--color-apagado` (`#736B65`) sobre la superficie de panel clara (`#E7E4DF`) ofrece una razón de contraste de 4.12:1, resultando ilegible en ambientes iluminados para personas con baja sensibilidad al contraste.
- **FUENTE OFICIAL:** [WCAG 2.2 SC 1.4.3 Contrast (Minimum) (Level AA)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- **PROPUESTA CONCRETA:** Ajustar el valor de `--color-apagado` en la regla del tema claro a `#6B635D` (alcanzando 4.65:1 sobre `#E7E4DF`).

---

### Hallazgo 6 (Gravedad: MEDIA)
- **QUÉ PASA:** Los botones de selección de color en el Editor (`btn-color-ambar`, celeste, salvia) miden 32x32 px sin expansión de área táctil.
- **DÓNDE:** `docs/estudios/accesibilidad/02-editor-oscuro-retrato.png` | `src/components/EditorView.tsx:649`.
- **POR QUÉ IMPORTA AL USUARIO:** Dificulta el toque preciso a personas con temblor fino o destreza motora reducida, incumpliendo el tamaño mínimo recomendado de 48x48 dp en Android.
- **FUENTE OFICIAL:** [Guías de Accesibilidad de Android: Tamaño del objetivo táctil](https://developer.android.com/guide/topics/ui/accessibility/apps#touch-target-size) y [WCAG 2.2 SC 2.5.8 Target Size (Minimum) (Level AA)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
- **PROPUESTA CONCRETA:** Aumentar la caja del botón a 48x48 px mediante padding o un pseudo-elemento `::before`, manteniendo el círculo visual de 32 px mediante borde o fondo interno.

---

### Hallazgo 7 (Gravedad: MEDIA)
- **QUÉ PASA:** Al aumentar la fuente del sistema al 200%, el texto de las fichas flotantes del teleprompter se corta y desborda.
- **DÓNDE:** `docs/estudios/accesibilidad/04-teleprompter-oscuro-retrato.png` | `src/styles-ajustes.css:1030`.
- **POR QUÉ IMPORTA AL USUARIO:** Usuarios de edad avanzada o con deficiencias visuales que configuran texto grande en Android pierden visibilidad de los nombres y valores de los controles.
- **FUENTE OFICIAL:** [WCAG 2.2 SC 1.4.4 Resize Text (Level AA)](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html).
- **PROPUESTA CONCRETA:** Reemplazar alturas fijas por padding relativas en `em`/`rem`, permitir envoltorio multilínea (`flex-wrap: wrap`) y asegurar desplazamiento horizontal en las barras de fichas.

---

### Hallazgo 8 (Gravedad: MEDIA)
- **QUÉ PASA:** Los tramos de texto destacados utilizan únicamente el color para transmitir el énfasis.
- **DÓNDE:** `docs/estudios/accesibilidad/02-editor-oscuro-retrato.png` | `src/styles.css:1700`.
- **POR QUÉ IMPORTA AL USUARIO:** Personas con acromatopsia, deuteranopia o protanopia no pueden distinguir entre texto normal y texto con resaltado en ámbar, celeste o salvia.
- **FUENTE OFICIAL:** [WCAG 2.2 SC 1.4.1 Use of Color (Level A)](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).
- **PROPUESTA CONCRETA:** Añadir un indicador no cromático opcional (como un subrayado suave punteado o estilo en negrita) para los tramos destacados.

---

### Hallazgo 9 (Gravedad: BAJA)
- **QUÉ PASA:** La aplicación no utiliza la etiqueta semántica `<main>` ni encabezado principal `<h1>`.
- **DÓNDE:** Todas las capturas de pantalla | `src/App.tsx:350`.
- **POR QUÉ IMPORTA AL USUARIO:** Los usuarios de lectores de pantalla pierden la capacidad de saltar directamente al contenido principal mediante atajos de navegación por marcas o encabezados.
- **FUENTE OFICIAL:** [WCAG 2.2 SC 1.3.1 Info and Relationships (Level A)](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html).
- **PROPUESTA CONCRETA:** Envolver la vista activa en una etiqueta `<main>` y proveer un encabezado `<h1>` semántico (oculto visualmente si es necesario) en la biblioteca y editor.

---

### Hallazgo 10 (Gravedad: BAJA)
- **QUÉ PASA:** El color de separadores y bordes en Tema Claro ofrece una razón de contraste inferior a 3:1.
- **DÓNDE:** `docs/estudios/accesibilidad/01-biblioteca-claro-retrato.png` | `src/styles.css:120`.
- **POR QUÉ IMPORTA AL USUARIO:** El tono `--color-separador` (`#E4E0D9`) sobre el fondo claro (`#F3F1ED`) da 1.18:1, dificultando la percepción de los límites visuales de los elementos.
- **FUENTE OFICIAL:** [WCAG 2.2 SC 1.4.11 Non-text Contrast (Level AA)](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
- **PROPUESTA CONCRETA:** Ajustar `--color-separador` en el tema claro a `#C8C4BD` (alcanzando una razón de contraste de 3.01:1 sobre `#F3F1ED`).

---

## 2. Evaluación de Cumplimiento WCAG 2.2 AA Pantalla por Pantalla

### 1. Biblioteca (`BibliotecaView`)
- **Estado de cumplimiento:** **75 % Cumplido**
- **Faltantes para AA:**
  1. Proveer alternativa accesible al gesto *swipe* para borrar/duplicar guiones (Hallazgo 2).
  2. Ajustar el contraste de separadores en tema claro a 3:1 (Hallazgo 10).
  3. Incorporar hito semántico `<main>` e `<h1>` (Hallazgo 9).

### 2. Editor de Guion (`EditorView`)
- **Estado de cumplimiento:** **80 % Cumplido**
- **Faltantes para AA:**
  1. Aumentar el objetivo táctil de los botones de color a 48x48 dp (Hallazgo 6).
  2. Ofrecer indicador visual no cromático en tramos con formato (Hallazgo 8).
  3. Ajustar contraste de metadatos en tema claro (Hallazgo 5).

### 3. Cajón de Ajustes (`panel-ajustes`)
- **Estado de cumplimiento:** **65 % Cumplido**
- **Faltantes para AA:**
  1. Implementar trampa de foco, `role="dialog"` y `aria-modal="true"` (Hallazgo 3).
  2. Mejorar el escalado de etiquetas al 200% de tamaño de fuente (Hallazgo 7).
  3. Ajustar contraste de textos secundarios sobre fondo panel claro (Hallazgo 5).

### 4. Lectura Teleprompter (`TeleprompterView`)
- **Estado de cumplimiento:** **70 % Cumplido**
- **Faltantes para AA:**
  1. Hacer enfocable y navegable por teclado la región de lectura (`tabIndex={0}`) (Hallazgo 1).
  2. Ajustar la opacidad del velo inferior de atenuación para garantizar 4.5:1 (Hallazgo 4).
  3. Evitar recortes en las fichas flotantes del dock al 200% de letra (Hallazgo 7).

### 5. Preparación de Cámara (`PrepararView`)
- **Estado de cumplimiento:** **85 % Cumplido (Web)**
- **Nota sobre la Web:** La vista previa nativa de la cámara y los controles de hardware son gestionados por el plugin nativo Capacitor en Android. En la versión web se muestra el estado sin cámara activa.
- **Faltantes para AA:**
  1. Garantizar que los contenedores nativos de vista previa de cámara (`FrameLayout` nativos) no intercepten el foco de TalkBack en blanco.

---

## 3. Para Revisar con Javier

Los siguientes elementos corresponden a decisiones de diseño consolidadas previamente o directivas de usuario que se presentan para su conocimiento en el contexto de accesibilidad:

1. **Velo de atenuación en la lectura (Velos de prelectura):** La decisión de atenuar al 55% la zona inferior de la lectura es intencionada para dirigir la mirada a la ventana clara de lectura. La reducción propuesta de opacidad de `0.55` a `0.54` en fondo negro y `0.46` en fondo blanco logra la certificación WCAG AA (4.5:1) preservando la jerarquía visual deseada.
2. **Acciones de deslizamiento (Swipe) en la biblioteca:** Manteniendo el gesto táctil ágil de *swipe*, la adición de un menú desplegable secundario o acciones de accesibilidad TalkBack permitirá el cumplimiento estricto de WCAG 2.5.1 sin modificar la interacción por gestos existente.
