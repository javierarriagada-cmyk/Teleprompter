# Tarea 89 · defecto 2 · visor de lado (BOCETO, sin código)

> **SEGUNDA VERSIÓN, 04-10-2026 (10:53).** Javier y Claude descartaron la primera propuesta: dibujaba una
> toma VERTICAL vista de lado, así que el video quedaba angosto y chico, los controles ocupaban más de la
> mitad y sobraba un hueco. Esa propuesta se movió a `descartado/` (láminas y capturas) y su
> herramienta quedó como `herramientas/boceto-descartado.{html,tsx}`. El texto de la primera versión
> sigue más abajo, marcado **DESCARTADA**, sin borrar nada.

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
