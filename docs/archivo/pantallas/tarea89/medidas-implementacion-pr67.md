# Tarea 89 · defecto 2 · visor de lado (BOCETO APROBADO COMO PISO, sin código)

> **APROBADO COMO PISO (Claude, 04-10-2026, 11:26).** Claude revisó el PR #67 y aprueba el boceto como piso,
> con dos ajustes que hace la **cuarta versión**, abajo: el visor de lado siempre oscuro y los rótulos de
> la columna de 12 como mínimo, con toques de 48. La tercera versión se movió a
> `descartado/tercera-version/` (láminas, capturas y `medidas-de-lado.json`) y sus herramientas quedaron como
> `herramientas/*-descartado-3.*`. Su texto sigue abajo y vale salvo en esos dos puntos. Sigue sin código.

## Cuarta versión (APROBADA COMO PISO): visor siempre oscuro, rótulos de 12 y toques de 48

Lámina resumen: **`lamina-visor-de-lado-resumen.png`**. Son las mismas 24 láminas, con los mismos nombres
(`lamina-visor-de-lado-caso…-{oscuro,claro}.png`). Ahora «claro» quiere decir **la app en tema claro**: el visor
sale oscuro igual. Las herramientas son las mismas (`herramientas/boceto.{html,tsx}`, `capturas-de-lado.cjs`,
`laminas-de-lado.cjs`). `medidas-de-lado.json` trae además el tamaño de letra de los rótulos, la caja de la X y el
color de fondo medidos en Chrome.

### 1. El visor de lado es SIEMPRE OSCURO

- **Cómo:** todo el visor (también el recorte) va dentro de un elemento con `data-tema="oscuro"`. En `src/styles.css:109` el selector es `[data-tema="oscuro"]`, sin `:root`, así que vale en cualquier elemento y sus hijos heredan las superficies oscuras aunque el documento esté en claro. No hace falta ningún token nuevo. Además se pone `color-scheme: dark`.
- **Los tokens que usa**, del bloque `[data-tema="oscuro"]` de `src/styles.css`. Son los mismos valores que trae `:root`, en `:3-11`.

  | Token | Valor | Línea |
  |---|---|---|
  | `--bg-suelo` | `#151312` | `:110` |
  | `--bg-fila` | `#1E1B19` | `:111` |
  | `--bg-superficie` | `#221F1D` | `:112` |
  | `--bg-panel` | `#2D2927` | `:113` |
  | `--color-separador` | `#4B4643` | `:115` |
  | `--borde-tarjeta` | `rgba(255,255,255,.08)` | `:118` |
  | `--color-apagado` | `#CAC5C2` | `:120` |
  | `--color-texto` | `#E7E1DE` | `:121` |

  - **Caso 1:** la columna y la barra de avance son `--bg-superficie`, medido en Chrome como `rgb(34,31,29)` en los dos temas.
  - **Caso 2:** el fondo es `--bg-suelo`, la tarjeta es `--bg-superficie` y el panel de Subtítulos abierto es `--bg-panel`.
- **Lo de afuera del visor que cambia con el tema:**
  - **Las barras de Android.** `App.tsx:314-319` llama a `SystemBars.setStyle` con `oscuro = tema !== 'claro' || vista === 'lectura'`. Con la app en claro pone `SystemBarsStyle.Light`, y los íconos de la barra de tres botones salen oscuros sobre el visor oscuro: casi invisibles.
  - **Al implementar:** mientras el visor de lado esté abierto, `setStyle({ style: SystemBarsStyle.Dark })`, como ya se hace en la lectura. Al cerrarlo se vuelve al estilo del tema. En el boceto la barra se dibujó con íconos claros.
  - La barra de estado va oculta, así que su estilo no se ve.
  - Nada más de la app queda a la vista: el visor de lado ocupa toda la pantalla.
- **De pie, el visor sigue al tema como hoy.** Solo es siempre oscuro con `useLayout() === 'tel-h'`.

### 2. Rótulos de 12 como mínimo y toques de 48

- **Rótulos:** «Guardar» y el estilo elegido («Amarillo», etc.) pasan de `--texto-etiqueta` (11, `styles.css:34`) a **12**, solo dentro del visor de lado. No se cambia el token, porque lo usan otras pantallas. En la tarjeta del caso 2, «Guardar» también va en 12. «Subtítulos Amarillo» del caso 2 ya era de 16. Medido en Chrome: 12 px = 12 dp.
- **Toques:**
  - La X (`.cerrar-visor`) pasa de 44 a **48 × 48**.
  - Cada fila de acción tiene `min-height: 48` y todo el ancho de la columna.
  - El panel de Subtítulos ya tenía opciones de 68 de alto.
- **Las medidas nuevas.** Los dos giros dan lo mismo y la columna no cambia de ancho, porque su ancho lo fija el video.

  | | 915×411 | 800×360 |
  |---|---|---|
  | Columna | **178 × 411** | **153 × 360** |
  | Cabecera (8 de aire + X de 48) | **56** | **56** |
  | Alto para acciones | 411 − 56 = **355** | 360 − 56 = **304** |
  | 4 filas (Guardar, Subtítulos, Repetir, Borrar) | **88, 89, 89, 89** | **75, 76, 76, 76** |
  | Ancho de fila | 177 | 152 |
  | Toma guardada (Compartir, Borrar) | **176 y 177** | **151 y 152** |
  | Contenido de una fila con rótulo | 26 + 4 + ~15 = ~45 ≤ 48 | ~45 ≤ 48 |
  | Caso 2: tarjeta | **320 × 238** (era 236) | **320 × 238** |
  | Caso 2: fondo a cada lado | 128 | 85 |

  - Las filas del caso 1 no cambiaron: la cabecera ya medía 56 por el nombre y la duración.
  - **Todo cabe**, sin ajustes. Para que una fila bajara de 48, el alto tendría que ser menos de 56 + 4 × 48 = 248.
  - En la tercera versión, a 800×360, la toma guardada se anotó con filas de 142. Lo medido es 151 y 152.

### Lo que no calza o queda abierto (cuarta versión)

- **12 px no siempre son 12 sp.** En la WebView, `px` es `dp`. 12 px valen 12 sp con la escala de letra del sistema en 1,0. Si la WebView sigue la escala de letra del teléfono (`textZoom`), con 1,3 el rótulo mide ~16 y la fila llega a ~49: sigue cabiendo en 75. Hay que verificarlo en el g86.
- **La barra de avance** (`.boton-visor` y `.avance-visor`, de 44) no es de la columna y se dejó en 44, que es su medida de hoy. Si también tuviera que medir 48, la barra pasa a 52 y el video pierde 4 más: a 915, 641 × 359 y columna 182; a 800, 548 × 308 y columna 160. No se dibujó.
- **`SystemBars.setStyle` Dark** mientras el visor de lado esté abierto (ver arriba). Es una llamada más que se agrega a la propuesta, sin programarla.

## Verificación al implementar (Claude, en el moto g86)

Al programar el visor, Claude tiene que confirmar estas cuatro cosas en el moto g86 antes de dar el visor por bueno. Las líneas de registro van por la misma vía de los registros de la tarea 89: `anotar` de `src/lib/diagnostico.ts:89`, con un tipo nuevo en `EntradaDiagnostico` (`:18`), por ejemplo `{ tipo: 'visor-lado', evento, ... }`. Solo se anotan con el diagnóstico encendido. Abajo van escritas como saldrían en `comoTexto()`.

**(a) La barra de estado se vuelve a ocultar después de deslizar desde arriba.**
- Abrir el visor de lado, deslizar desde el borde de arriba, esperar 3 s y no tocar.
- Mirar si la barra se esconde sola. Si no se esconde, hay que fijar `systemBarsBehavior` en el lado nativo o volver a llamar a `hide`; eso se decide entonces.
- Registro:
  - `visor-lado barra-estado hide t=<ms>`, al llamar a `SystemBars.hide`.
  - `visor-lado insets top=<env(safe-area-inset-top)> t=<ms>`, en cada `resize` y cada `visualViewport` resize.
- Con el comportamiento por omisión, al deslizar `top` pasa de 0 a 24 y luego vuelve a 0 si la barra se oculta sola.

**(b) La barra de tres botones queda a la izquierda con el giro 270.**
- Girar a 90 y a 270 con el visor abierto.
- Registro: `visor-lado giro=<screen.orientation.angle> tipo=<screen.orientation.type> insets l=<left> r=<right> t=<top> b=<bottom>`, en `screen.orientation` `change` y en `resize`.
- Lo esperado:
  - giro 90: `l=44 r=48`;
  - giro 270: `l=48 r=44`.
- Si en 270 la barra va a la derecha (`l=0 r=92`, o el recorte en otro lado), las medidas igual suman 92, pero se dibuja en espejo distinto.

**(c) `videoWidth` y `videoHeight` llegan ya girados.**
- Abrir una toma grabada de pie y una grabada de lado. Sirven las 5 del corpus de la tarea 89: 1 a 3 de pie y 4 y 5 de lado.
- Registro: `visor-lado video nombre=<archivo> videoWidth=<w> videoHeight=<h> horizontal=<w>h> miniatura=<naturalWidth>x<naturalHeight>`, en el `loadedmetadata` de `ReproductorGrabacion.tsx:75-80` y en el `load` de la miniatura.
- Lo esperado: las de pie dan `horizontal=false`, como 1080x1920; las de lado `horizontal=true`; y la miniatura da la misma forma.

**(d) Los bordes que informa la WebView.**
- Registro: `visor-lado bordes css l=<..> r=<..> t=<..> b=<..> viewport=<innerWidth>x<innerHeight> dpr=<devicePixelRatio>`, leyendo `getComputedStyle` de un elemento con `padding: env(safe-area-inset-*)`.
- Si se puede, también las variables que inyecta Capacitor (`injectSafeAreaCSS` de `SystemBars.java`). Hay que registrarlo al abrir, al girar y después de `hide` y `show`.
- Lo esperado: viewport de 915x411 en el g86 (o el real), `dpr=2.8125` (450/160), `t=0` con la barra oculta, y 44 y 48 a los costados según el giro.
- Si los bordes no coinciden, mandan los medidos: la regla del boceto (útil = ancho − izquierda − derecha) los toma tal cual.

---

# TERCERA VERSIÓN, APROBADA COMO PISO CON AJUSTES; LA REEMPLAZA LA CUARTA (04-10-2026, 11:26)

> Sus láminas, capturas y `medidas-de-lado.json` están ahora en `descartado/tercera-version/`, y sus
> herramientas son `herramientas/{boceto,capturas-de-lado,laminas-de-lado}-descartado-3.*`. Donde abajo
> dice `lamina-…`, `boceto.html` o `capturas-de-lado.cjs`, se refiere a esos. Vale todo salvo el tema
> (ahora siempre oscuro) y los rótulos y toques (ahora 12 y 48).


> **SEGUNDA VERSIÓN, 04-10-2026 (10:53).** Javier y Claude descartaron la primera propuesta: dibujaba una
> toma VERTICAL vista de lado, así que el video quedaba angosto y chico, los controles ocupaban más de la
> mitad y sobraba un hueco. Esa propuesta se movió a `descartado/` (láminas y capturas) y su
> herramienta quedó como `herramientas/boceto-descartado.{html,tsx}`. El texto de la primera versión
> sigue más abajo, marcado **DESCARTADA**, sin borrar nada.

> **TERCERA VERSIÓN, 04-10-2026 (11:09).** Respuestas de Javier y Claude sobre la segunda: la barra de
> avance va bajo el video, a todo su ancho; se oculta la barra de estado con `SystemBars`, que Sigo ya
> usa; el recorte de la cámara está medido (44 dp) y se dibujan los dos giros; se aceptan los huecos del
> caso 2, sobre el fondo de la app y sin bordes; y se dibujan Subtítulos abierto y la toma guardada. La
> segunda versión se movió a `descartado/segunda-version/` (láminas, capturas y `medidas-de-lado.json`);
> sus herramientas quedaron como `herramientas/*-descartado-2.*`. Su texto sigue abajo, marcado
> **DESCARTADA**, sin borrar nada.

## Tercera versión: barra de avance bajo el video, sin barra de estado, dos giros

Lámina para aprobar: **`lamina-visor-de-lado-resumen.png`**. Una lámina por captura (24):
`lamina-visor-de-lado-caso{1-horizontal,2-vertical}-giro{90,270}[-subtitulos|-guardada]-{915x411,800x360}-{oscuro,claro}.png`
(Subtítulos abierto y toma guardada, en el caso 1 con giro 90), con sus capturas sueltas `visor-de-lado-caso…png`
y las cajas medidas en Chrome en `medidas-de-lado.json`. Herramientas: `herramientas/boceto.html` + `boceto.tsx`
(`?caso=1|2&giro=90|270&estado=normal|subtitulos|guardada&tema=claro|oscuro`), `capturas-de-lado.cjs`
(`node docs/pantallas/tarea89/herramientas/capturas-de-lado.cjs`, con un vite sirviendo el boceto) y
`laminas-de-lado.cjs`.

### La barra de estado: SystemBars de Capacitor 8 SÍ la oculta, sin plugin nuevo

- Sigo ya lo usa: `@capacitor/core` 8.5.1 (`package.json:24`); `App.tsx:2` importa `SystemBars, SystemBarsStyle` y `App.tsx:314-319` llama a `SystemBars.setStyle`. `capacitor.config` no lo configura (no hace falta).
- La API, en `node_modules/@capacitor/core/types/core-plugins.d.ts`:
  - `:348` `show(options?: SystemBarsVisibilityOptions): Promise<void>` y `:354` `hide(options?: SystemBarsVisibilityOptions): Promise<void>`.
  - `:304-312` `SystemBarsVisibilityOptions`: `bar?: SystemBarType` («the system bar to hide or show; if not specified, both bars will be affected») y `animation` (solo iOS).
  - `:271-284` `SystemBarType.StatusBar = 'StatusBar'` y `SystemBarType.NavigationBar = 'NavigationBar'`.
- El lado nativo, en `node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/plugin/SystemBars.java`: `show` (`:130-138`) y `hide` (`:140-148`) llaman a `setHidden` (`:302-324`), que hace `WindowInsetsControllerCompat.hide(WindowInsetsCompat.Type.statusBars())` (o `show`). Los insets que llegan al CSS se recalculan con `systemBars | displayCutout` (`calcSafeAreaInsets`, `:168-174`, e `injectSafeAreaCSS`): con la barra oculta, el borde de arriba queda en 0.
- **La llamada propuesta (NO se programa en este boceto):**
  - Al abrir el visor con el teléfono de lado (`useLayout() === 'tel-h'`, `App.tsx:267`): `SystemBars.hide({ bar: SystemBarType.StatusBar })`.
  - Al cerrar el visor, o si el teléfono vuelve a quedar de pie con el visor abierto: `SystemBars.show({ bar: SystemBarType.StatusBar })`. También al desmontar, para no dejarla oculta si el visor se cierra por otro camino.
  - **La barra de navegación (tres botones) NO se oculta:** sin ella no hay Atrás visible, y ocultarla pide decidir el gesto para recuperarla.
- El plugin no fija `systemBarsBehavior`, así que queda el comportamiento por omisión de Android: deslizar desde el borde de arriba muestra la barra. **Hay que verificar en el moto g86** si después se vuelve a ocultar sola o queda visible hasta la próxima llamada.

### Los bordes seguros de lado, por giro (moto g86, 450 dpi)

- **Recorte de la cámara: 125 px ÷ (450/160) = 44,4 → 44 dp.** De pie va arriba; de lado queda en el costado que era el de arriba.
- **Giro 90** (el borde de arriba del teléfono a la izquierda): recorte **44 a la izquierda**, barra de tres botones **48 a la derecha**.
- **Giro 270** (el borde de arriba a la derecha): barra de tres botones **48 a la izquierda**, recorte **44 a la derecha**. Es lo que hace AOSP en teléfonos (la barra va del lado de abajo del teléfono); hay que verificarlo en el g86.
- Barra de estado: **oculta**, 0 arriba. Abajo, 0.
- En los dos giros los costados suman 92: las medidas son las mismas, en espejo.
- La franja del recorte va sin contenido, pintada con el fondo vecino (el negro del visor en el caso 1, `--bg-suelo` en el caso 2).

### La barra de avance bajo el video

- Es la `.barra-visor` de hoy entera (`styles.css` ~:1405-1435): `.boton-visor` (44) y `.avance-visor` (44 de alto de toque), con el tiempo actual y el total, más el `padding-top` de `--aire-1` (4): **48 dp de alto**. El video pierde esos 48 de alto.
- Va a todo el ancho del video, debajo: no tapa los subtítulos (la decisión del 28-09 se mantiene) y el avance pasa de 96-120 dp a **unos 420 a 915 y 330 a 800** (el ancho del video menos el botón y los dos tiempos), preciso también en tomas largas.

### Caso 1: toma HORIZONTAL 16:9

Regla: `útil = ancho − 44 − 48`; `altoVideo = alto − 48`; `anchoVideo = round(altoVideo × 16/9)`; `columna = útil − anchoVideo`, con mínimo 112 (si bajara, se achica el video, en 16:9 y centrado; no pasa en ningún tamaño pedido).

| | 915×411 | 800×360 |
|---|---|---|
| Ancho útil | 915 − 92 = **823** | 800 − 92 = **708** |
| Alto del video | 411 − 48 = **363** | 360 − 48 = **312** |
| Video 16:9 | 363 × 16/9 = 645,3 → **645 × 363** | 312 × 16/9 = 554,7 → **555 × 312** |
| Barra de avance | **645 × 48**, bajo el video | **555 × 48** |
| Columna | 823 − 645 = **178 × 411** | 708 − 555 = **153 × 360** |
| ¿Cabe el riel de 124? | Sí, sobran 54 | Sí, sobran 29 |
| Giro 90 | recorte 0-44, video x 44, columna x 689, barra 867-915 | recorte 0-44, video x 44, columna x 599, barra 752-800 |
| Giro 270 | barra 0-48, video x 48, columna x 693, recorte 871-915 | barra 0-48, video x 48, columna x 603, recorte 756-800 |

- **La columna nunca baja de 112.** Queda más ancha que el riel de 124 porque ahora el video está limitado por el alto (perdió 48); los dp que sobran van a la columna. No se agranda el video: ya está a todo el alto que le queda.
- **Contenido de la columna**, con el fondo y el borde de los rieles (`--riel-fondo`, `--riel-borde`, `styles.css:61-62`): arriba el nombre (una línea, con puntos suspensivos) y la duración, con la X (`.cerrar-visor`, 44) a la derecha; abajo `.acciones-toma` en una fila por acción, que se reparten el alto: **Guardar** (con su palabra), **Subtítulos** (el `SelectorSubtitulos` vestido de `.accion-toma`: el CC y el estilo elegido), **Repetir** y **Borrar**. Cada fila mide ~89 de alto a 411 y ~76 a 360 (mínimo de toque 48).
- **Subtítulos abierto** (dibujado, giro 90): el panel de las cuatro opciones (No, Amarillo, Rojo, Formal) mide **320 × 124**, a 8 a la izquierda de la columna, a la altura del botón de Subtítulos, sobre el video. Es el ancho de los paneles de ficha de la 82 (`docs/tarea82.txt:90-93`). Tocar una opción la elige y lo cierra, como hoy.
- **Toma guardada** (dibujado, giro 90): Compartir y Borrar, solo con el símbolo, y sin selector de subtítulos, como hoy. Las dos filas se reparten la columna: **176** de alto a 411 y **142** a 360.

### Caso 2: toma VERTICAL 9:16

| | 915×411 | 800×360 |
|---|---|---|
| Video 9:16 a todo el alto | 411 × 9/16 = 231,2 → **231 × 411** | 360 × 9/16 = 202,5 → **203 × 360** |
| Tarjeta de controles | **320 × 236** | **320 × 236** |
| Grupo (video + 16 + tarjeta) | 567, centrado en 823 → **128** a cada lado | 539, centrado en 708 → **85** a cada lado (84,5) |
| Video, giro 90 / 270 | x **172** / **176** | x **129** / **133** |

- **Huecos aceptados (punto 4):** el grupo va centrado sobre el fondo de la app (`--bg-suelo`), sin bordes ni otro color que marquen el hueco. La tarjeta es la de hoy sin el video (nombre con la X, `.barra-visor`, `SelectorSubtitulos`, `.acciones-toma` en fila), centrada en el alto y sin estirarse.

### Cómo distingue el visor horizontal de vertical (igual que la segunda versión)

- El modelo no guarda la forma: `ResumenGrabacion` (`src/datos/modelo.ts:117-136`) no tiene ancho, alto ni orientación, y el sidecar trae `calidad: "1080p"`.
- Se lee del video: en el `alCargar` de `loadedmetadata` que ya existe (`ReproductorGrabacion.tsx:75-80`), `horizontal = video.videoWidth > video.videoHeight`.
- Antes de que cargue, la miniatura (`src/lib/tomaVideo.ts:222-224`) con `naturalWidth/naturalHeight`. Sin miniatura, el caso 2.
- Solo con el teléfono de lado (`useLayout() === 'tel-h'`, `App.tsx:267`). De pie, el visor queda como hoy.

### Lo que no calza o queda abierto (tercera versión)

- **Barra de estado oculta:** no está verificado en el g86 qué pasa al deslizar desde arriba (con el comportamiento por omisión aparece; falta ver si se vuelve a ocultar sola).
- **Giro 270:** que la barra de tres botones vaya a la izquierda es el comportamiento de AOSP para teléfonos; hay que verificarlo en el g86, igual que los insets que entrega la WebView en cada giro.
- **La columna (178 / 153) es más ancha que el riel de 124:** el video está limitado por el alto. Si se quisiera la columna de 124, el video no crece (quedaría negro a los lados); se dejó el ancho a la columna.
- **La franja del recorte (44)** va sin contenido, pintada con el fondo vecino.
- **La barra de navegación sigue visible** (48), a propósito.
- Falta verificar en el g86 que `videoWidth/videoHeight` vengan ya girados.
- El video es de mentira (un degradado con una silueta); la barra de tres botones y el recorte están dibujados, porque Chrome no los tiene.

---

# SEGUNDA VERSIÓN, DESCARTADA (04-10-2026, 11:09)

> Se deja como historia. Sus láminas, capturas y `medidas-de-lado.json` están ahora en
> `descartado/segunda-version/`, y sus herramientas son `herramientas/boceto-descartado-2.{html,tsx}`,
> `capturas-de-lado-descartado-2.cjs` y `laminas-de-lado-descartado-2.cjs`: donde abajo dice
> `lamina-…`, `boceto.html` o `capturas-de-lado.cjs`, se refiere a esos.

## Segunda versión: dos casos, según la forma del VIDEO

Lámina para aprobar: **`lamina-visor-de-lado-resumen.png`**. Una lámina por caso, tema y tamaño (8):
`lamina-visor-de-lado-caso{1-horizontal,2-vertical}-{915x411,800x360}-{oscuro,claro}.png`, con sus
capturas sueltas `visor-de-lado-caso…png` y las cajas medidas en Chrome en `medidas-de-lado.json`.
Las herramientas son `herramientas/boceto.html` + `boceto.tsx` (`?caso=1|2&tema=claro|oscuro`),
`capturas-de-lado.cjs` y `laminas-de-lado.cjs`.

### Los bordes seguros de lado (rotación 90, navegación de tres botones)

- Barra de tres botones: **48 dp a la derecha**. Viene de AOSP `frameworks/base/core/res/res/values/dimens.xml`, `navigation_bar_width` (48dp); `navigation_bar_height_landscape` también es 48dp.
- Barra de estado: **24 dp arriba**. Viene de `status_bar_height_landscape`, que es igual a `status_bar_height_portrait` (24dp); en un teléfono con recorte, Android usa el mayor entre 24 y el recorte.
- Con `targetSdkVersion = 36` (`android/variables.gradle:9`) el borde a borde es obligatorio: las dos barras quedan **encima** de la app y la WebView las informa como `env(safe-area-inset-right)` y `env(safe-area-inset-top)`. `index.html` ya trae `viewport-fit=cover`.
- Los íconos de sistema son claros siempre (`android/app/src/main/res/values/styles.xml`, `windowLightStatusBar=false`).
- Recorte de la cámara: de lado queda a la izquierda. **No se midió en el moto g86** y en el boceto vale 0. Si existe, se suma a la izquierda: en el caso 1 lo pierde el ancho del video y en el caso 2 el margen.
- A 800×360 también se dibujó la barra de tres botones, que es el peor caso. Sin barra, la columna del caso 1 sería de 160.

### El ancho de los rieles de la tarea 82

- `src/styles-horizontal.css:20`: `--riel-izq-leer: 112px`.
- `src/styles-horizontal.css:21`: `--riel-izq-grabar: 128px`.
- `src/styles-horizontal.css:22`: `--riel-der: 124px`. Es el riel de Empezar y Parar: «Más, el círculo de 72 y la pastilla de 100 con su aire» (comentario de :17-19).
- `docs/tarea82.txt:71` dice «ancho 112 en Leer, 128 en Grabar» y `:78` dice «Riel derecho -ancho 124-».
- Todos van SIN el borde seguro: cada regla lo suma aparte.

### Caso 1 (el principal): toma HORIZONTAL 16:9 con el teléfono de lado

Regla:
- `útil = ancho − inset izquierdo − inset derecho`
- `videoIdeal = alto × 16/9`
- `columna = máx(112, útil − videoIdeal)`
- `anchoVideo = útil − columna`
- `altoVideo = mín(alto, anchoVideo × 9/16)`, centrado.

| | 915×411 | 800×360 |
|---|---|---|
| Ancho útil (− barra 48) | 867 | 752 |
| 16:9 a todo el alto | 411 × 16/9 = 730,7 → **731** | 360 × 16/9 = **640** |
| Lo que queda para la columna | 867 − 731 = **136** | 752 − 640 = **112** |
| ¿Cabe el riel de 124? | **Sí**, sobran 12 y van a la columna | **No**, faltan 12 |
| Qué se ajusta | nada | la columna baja a **112** (el ancho del riel izquierdo de Leer, `:20`) y el video **sigue a todo el alto** |
| Video | 731 × 411, x 0 | 640 × 360, x 0 |
| Columna | 136 × 411, x 731 | 112 × 360, x 640 |
| Contenido de la columna | 296 dp en 387 útiles | 296 dp en 336 útiles |

- **El orden de los ajustes, si algún teléfono deja menos de 112:** primero la columna llega a 112. Después el que se achica es el video: sigue en 16:9, más bajo, centrado en el alto, con negro arriba y abajo. **No se recorta la imagen.** Así no pasa en ninguno de los dos tamaños pedidos.
- **El video** va pegado al borde izquierdo y a todo el alto, incluidos los 24 dp de la barra de estado, que queda encima del video como en cualquier reproductor de borde a borde. Encima lleva `.play-visor` y los subtítulos (`CapaSubtitulos`), como hoy. Tocarlo pausa o sigue.
- **La columna** tiene el fondo y el borde de los rieles de la 82 (`--riel-fondo` y `--riel-borde`, `styles.css:61-62`). Sus 24 dp de arriba van en el negro del visor (`#111111`, el fondo de hoy): ahí caen los íconos claros de la barra de estado, que en tema claro no se verían sobre `--riel-fondo`. Está repartida de arriba abajo, con `space-between`:
  1. La X (`.cerrar-visor`, 44×44, sin el `position: absolute` y del color del texto), a la derecha.
  2. El nombre de la toma (una línea, con puntos suspensivos) y la duración total (`.texto-meta`).
  3. `.avance-visor` a todo el ancho de la columna (32 de alto), y debajo `.boton-visor` (play o pausa, 44) con el tiempo actual. El total ya está en el punto 2: a 112 no caben los dos tiempos.
  4. `.acciones-toma` en dos filas de dos, con el borde de arriba de hoy:
     - Arriba, **Guardar** (con su palabra, como hoy) junto a **Subtítulos**. Subtítulos es el `SelectorSubtitulos` de verdad vestido como una `.accion-toma`: el CC arriba y el estilo elegido abajo, sin la palabra «Subtítulos» ni la flecha. Va junto a Guardar porque es lo que se quema al guardar.
     - Abajo, **Repetir** y **Borrar** (56 de alto).
     - Cada botón mide la mitad de la columna: 68 a 136 y 56 a 112. El mínimo de toque es 48.
- **Subtítulos abierto:** las cuatro opciones van en un panel a la izquierda de la columna, sobre el video, como los paneles de ficha de la 82 (`docs/tarea82.txt:90-93`, ancho 320). No está dibujado.
- **Toma guardada:** Compartir y Borrar en la primera fila; no hay selector.

### Caso 2: toma VERTICAL 9:16 con el teléfono de lado

| | 915×411 | 800×360 |
|---|---|---|
| Video 9:16 a todo el alto | 411 × 9/16 = 231,2 → **231 × 411** | 360 × 9/16 = **203 × 360** |
| Tarjeta de controles | **320 × 236** | **320 × 236** |
| Grupo (video + 16 + tarjeta) | 567, centrado en 867 → **150** a cada lado | 539, centrado en 752 → **107 / 106** |

- La tarjeta mide 320, el ancho de los paneles de ficha de lado (`docs/tarea82.txt:90-93`). Es la tarjeta de hoy sin el video: nombre y duración con la X a la derecha, `.barra-visor` entera, `SelectorSubtitulos` y `.acciones-toma` en fila.
- Su alto es el de su contenido, centrada en el alto bajo la barra de estado. **No se estira para llenar.**
- El fondo que sobra a los lados es el `#111111` del visor de hoy. Con una toma vertical de lado no hay forma de llenarlo sin achicar o recortar el video.

### Cómo distingue el visor horizontal de vertical

- **No viene en los metadatos guardados.** `ResumenGrabacion` (`src/datos/modelo.ts:117-136`) no tiene ancho, alto ni orientación. El sidecar `.json` tampoco: los de las 5 tomas traen `calidad: "1080p"`, que no dice la forma.
- **De dónde sale: del video.** En `ReproductorGrabacion.tsx:75-80`, el `alCargar` de `loadedmetadata` ya existe y lee `video.duration`. Ahí mismo se lee `video.videoWidth` y `video.videoHeight` y se guarda `horizontal = videoWidth > videoHeight`. `SubtitulosVisor.tsx:23-24` ya lee esos dos valores para ubicar los subtítulos.
- Chromium y la WebView entregan `videoWidth/videoHeight` ya girados según la matriz de rotación del mp4. **Hay que verificarlo en el moto g86 con una toma de cada forma**: si CameraPreview escribe la rotación de otra manera, la toma vertical se vería como horizontal.
- **Antes de `loadedmetadata`**, la miniatura (`rutaMiniatura`, sacada del mismo mp4, `src/lib/tomaVideo.ts:222-224`) da la misma forma con `naturalWidth/naturalHeight` al cargar la imagen. Si no hay miniatura, se usa el caso 2.
- **Opcional y para después:** anotar `ancho` y `alto` en el sidecar al cortar la toma, para no esperar al video. Cambia el modelo, así que no va en este boceto.
- **La disposición solo cambia con el teléfono de lado:** `useLayout()` dice `'tel-h'` (`App.tsx:267`, la misma media query de la 82). De pie, el visor queda como hoy, con el desplazamiento del defecto 3.

### Lo que no calza o queda abierto (segunda versión)

- **A 800×360 con la barra no cabe el riel de 124:** la columna queda en 112. Cabe todo (296 de 336), pero con 40 dp de aire repartido; a 915 hay 91.
- **El recorte de la cámara** del moto g86 no se midió. A 915: con 24 dp a la izquierda quedan 843 útiles, la columna baja de 136 a 112 y el video sigue en 731 × 411; con 32 dp quedan 835, la columna queda en 112 y el video baja a 723 × 407 (centrado, 2 de negro arriba y abajo). La regla de arriba ya lo hace.
- **La barra de estado queda encima del video** (24 dp). Se puede esconder solo con código nativo o un plugin (StatusBar), y eso es una dependencia nueva: no se propone.
- **El avance en la columna es corto:** 96 a 120 dp. Para una toma de varios minutos se arrastra con poca precisión. La otra opción sería la barra sobre el pie del video, como YouTube, pero contradice la decisión del 28-09 de no tapar los subtítulos (`ReproductorGrabacion.tsx`, comentario «LOS CONTROLES DEL VIDEO SON NUESTROS»). No se tomó.
- **Subtítulos abierto y la toma guardada** están descritos, no dibujados.
- El video es de mentira (un degradado con una silueta). La barra de estado y la de tres botones están dibujadas encima, porque Chrome no las tiene.

---

# PRIMERA VERSIÓN, DESCARTADA (04-10-2026, 10:53)


Estado: **boceto para Javier. Sin boceto aprobado no hay código.** Lo único que cambió en el visor en
esta tarea es lo del defecto 3, que vale de pie y de lado y no cambia la disposición: el padding con
`env(safe-area-inset-*)` y que la raíz se desplace si la tarjeta no cabe (`overflowY: auto` en la raíz,
`margin: auto` en la tarjeta). De lado, eso hace que lo cortado se pueda alcanzar desplazando
(`visor-de-lado-rama-desplazado-{oscuro,claro}.png`, ya desplazado hasta el final), pero sigue
siendo una tarjeta de 472 dp en 411: el arreglo de verdad es este boceto.

Las capturas `visor-de-lado-hoy-*` se sacaron con el visor de main 71166e5 (sin desplazamiento). Si se
vuelve a correr `capturas.cjs` en la rama, "hoy" muestra el visor de la rama.

## La causa del corte, con archivo:línea (main 71166e5)

- `src/components/ReproductorGrabacion.tsx:168` — la raíz del visor es `position: fixed; inset: 0`,
  `display: flex`, `alignItems: center`, `justifyContent: center`, `padding: var(--aire-4)`, **sin
  `overflow`**. Lo que no cabe se reparte por igual arriba y abajo y queda fuera de la pantalla, sin poder
  desplazarse.
- `:170` — la tarjeta es `width: min(720px, 100%)`, una sola columna que apila todo.
- `:181` — el video es `width: 100%; maxHeight: 70vh`. De lado, 70vh = 288 dp de 411.
- `:189-211` la barra de avance (44 dp), `:212-222` el selector de subtítulos (cuando hay registro),
  `:223-231` nombre y duración, `:237-290` `.acciones-toma` (64 dp de alto mínimo, `styles.css` `.accion-toma`).
- Suma medida en Chrome, a 915×411 y sin selector de subtítulos: la tarjeta va de **−30 a 441 dp
  (472 dp)** para una pantalla de 411. Se cortan la X de arriba y la fila Guardar / Repetir / Borrar
  abajo. Con el selector de subtítulos son ~50 dp más.
- La barra de tres botones de lado va al costado (derecha): en main, ese costado tampoco tenía su borde
  seguro (`padding` parejo en `:168`). Eso lo arregla el defecto 3.

## La propuesta

**DESCARTADA.** Láminas: `lamina-visor-de-lado-oscuro.png`, `lamina-visor-de-lado-claro.png` (hoy | propuesta). Capturas
sueltas: `visor-de-lado-{hoy,propuesta}-{oscuro,claro}.png`. -Desde la segunda versión están en `descartado/`, salvo las de hoy.-

- Solo de lado (`.layout-tel-h`, el mismo criterio de `useLayout`/styles-horizontal.css). De pie no cambia.
- La tarjeta pasa a dos columnas (`display: flex`, fila):
  - **Izquierda, el video** a todo el alto disponible: `alto = 100vh − bordes seguros − 2 × --aire-4`
    (379 dp en 411), ancho por su proporción (9:16 → 213 dp). Sin `maxHeight: 70vh`. El play grande y
    los subtítulos quedan sobre el video como hoy (`.play-visor`, `CapaSubtitulos`).
  - **Derecha, los controles**, en columna y con `overflowY: auto` por si no caben (nunca se desplaza el video):
    1. nombre y duración (como `:223-231`) con la **X a su derecha** (`.cerrar-visor` sin el `position:
       absolute` de la esquina del video; de lado la esquina del video queda angosta);
    2. `.barra-visor` (play, tiempo, `.avance-visor`, total) igual que hoy;
    3. `SelectorSubtitulos` cuando hay registro;
    4. un espaciador flexible;
    5. `.acciones-toma` al pie, con su borde de arriba, igual que hoy.
- Raíz: la de hoy más los bordes seguros del defecto 3 (la barra de tres botones de lado queda a la
  derecha y no tapa nada).
- Tarjeta: `width: min(820px, 100%)`.
- Piezas: todas existentes — `.tarjeta-elevada`, `.visor-video`, `.play-visor`, `.cerrar-visor`,
  `.barra-visor`, `.boton-visor`, `.avance-visor`, `SelectorSubtitulos`, `.acciones-toma`, `.accion-toma`,
  `IconoGuardar/IconoRepetir/IconoTacho/IconoCerrar/IconoEmpezar`, tokens `--bg-superficie`,
  `--color-texto`, `--color-apagado`, `--aire-*`, `--redondeo`. Nada nuevo.

## Lo que no calza o queda abierto

- Una toma **horizontal** (si algún día se graba de lado) en esta disposición quedaría chica a la
  izquierda; hoy todas las tomas son verticales. Si hace falta, la regla sería: toma horizontal → la
  disposición de hoy con desplazamiento.
- El video de mentira es un degradado; en el teléfono va el video real.
- La barra de tres botones está dibujada encima (Chrome no tiene); el ancho de 48 dp es el del emulador.

## Cómo se rehace

```
cd <repo> && npx vite --port 5182 --host 127.0.0.1     # (si node_modules es un enlace, con server.fs.strict=false)
node docs/pantallas/tarea89/herramientas/capturas.cjs  # puppeteer-core desde /workspace/tp-shot, fuera de package.json
node docs/pantallas/tarea89/herramientas/lamina.cjs
node docs/pantallas/tarea89/herramientas/rama.cjs      # el visor de la rama, desplazado al final
```

`herramientas/boceto.html` + `boceto.tsx` -desde la segunda versión, `boceto-descartado.html` + `boceto-descartado.tsx`-: `?modo=hoy` dibuja el `ReproductorGrabacion` de verdad;
`?modo=propuesta`, el boceto. `&tema=claro|oscuro`.
