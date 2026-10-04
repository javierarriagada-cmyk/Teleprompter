# Tarea 87 · boceto del visor de la toma (BOCETO, sin código)

Estado: **boceto para que Claude lo revise, y después Javier lo apruebe.** Sin lámina aprobada no se
programa nada de lo que se ve en las partes D y E (`docs/tarea87.txt`, parte A). La versión aprobada,
con los cambios de Javier anotados aquí con su fecha, es el piso.

Hecho el 04-10-2026 sobre el visor **de pie** de main **c03d734** (ya con la tarea 89: bordes seguros
y visor desplazable), con las piezas de Sigo de hoy, al estilo de `docs/pantallas/tarea89/`.

## Qué mirar primero

1. `lamina-resumen.png`: hoy, Normal y Para redes con guías, el tiempo estimado y el guardando, en
   los dos temas.
2. `lamina-aprobacion.png`: hoy | boceto, estado por estado, los dos temas.
3. `boceto-visor-oscuro.png`, `boceto-visor-claro.png`: los ocho estados del boceto en una hoja.
4. `app-hoy-oscuro.png`, `app-hoy-claro.png`: la app real de hoy en los estados 1, 3, 4 y 7.
5. Las sueltas: `boceto-estado-N-{tema}.png`, `hoy-estado-N-{tema}.png` y
   `guias-estado-{1,2}-{tema}.png`.

## Cómo se hizo (herramientas/)

- `vite.boceto.config.mjs`: el servidor del boceto, que no es el de la app. Cambia
  `src/lib/archivosNativos` por `archivosNativosFingido.ts`, para que el `ReproductorGrabacion` de
  verdad arme sus subtítulos en Chrome con el registro de la toma del corpus
  `toma-008a7133-palabras.motor.txt`, el mismo de las pruebas.
- `videos.sh`: videos de mentira hechos con ffmpeg (vertical 9:16 de 50 s y de 5 min, horizontal
  16:9 de 50 s). No se suben al repositorio (`.gitignore`).
- `boceto.tsx` y `boceto.html`:
  - `modo=hoy` muestra el `ReproductorGrabacion` de verdad;
  - `modo=propuesta` arma la misma tarjeta con las mismas clases, más lo nuevo.
- `capturas.cjs`: saca las capturas con puppeteer-core desde `/workspace/tp-shot` (fuera del repo) y
  Chrome headless.
  - Teléfono de pie de 412×915 dp, a 2 px por dp.
  - Las barras del sistema van dibujadas encima: la de estado arriba (24 dp) y la de tres botones
    abajo (48 dp). La raíz del visor suma esos bordes como lo hace en el teléfono con
    `env(safe-area-inset-*)`, que en Chrome vale 0.
  - Si la tarjeta no cabe, se captura entera, y la raya roja marca el fin de la pantalla (915 dp).
  - El video está en el segundo 3,5, donde aparece el subtítulo de dos renglones «que podríamos
    llamar / la concepción trágica».
  - `--resumen` saca las de guías.
- `laminas.cjs`: arma las láminas.
- Cómo correrlo, desde la raíz del repo:
  1. `sh docs/pantallas/tarea87/herramientas/videos.sh`
  2. `npx vite --config docs/pantallas/tarea87/herramientas/vite.boceto.config.mjs --port 5182 --host 127.0.0.1`
  3. `node capturas.cjs && node capturas.cjs --resumen && node laminas.cjs`

## Los estados (A2 más el 8, que se agregó el 04-10)

| # | Estado | Toma | Qué se ve nuevo |
|---|--------|------|-----------------|
| 1 | Vertical recién grabada con subtítulos, en Normal | 0:50, amarillo | Posición (Normal activo), la línea de las redes, «Guardar y compartir» |
| 2 | La misma, en Para redes | 0:50 | Para redes activo, el subtítulo del visor a 0,35 |
| 3 | Horizontal con subtítulos | 0:50, 16:9 | **sin** Posición; con «Guardar y compartir» |
| 4 | Sin subtítulos (sin registro) | 0:50 | sin selector de subtítulos ni Posición; con «Guardar y compartir» |
| 5 | Guardando | 5:00 | «Guardando… 37%» en el botón que se tocó («Guardar y compartir»); los dos de guardar deshabilitados; el tiempo estimado ya no está |
| 6 | Guardada, pero compartir falló | 0:50 | visor de toma guardada (Compartir y Borrar) y el aviso breve «Quedó guardada, pero no se pudo compartir» |
| 7 | Ya guardada | 0:50 | como hoy: Compartir y Borrar, sin selector, sin «Guardar y compartir» |
| 8 | Vertical de 5 min con subtítulos | 5:00 | «Guardar tarda alrededor de 1 min» bajo la duración |

## Las piezas, con su origen (main c03d734)

### Posición: Normal / Para redes (A1, D3)

- **Dónde:** debajo del bloque del `SelectorSubtitulos` (`ReproductorGrabacion.tsx:220-230`), en un
  bloque propio con el mismo `padding: var(--aire-3) var(--aire-3) 0`.
- **Cuándo se ve:**
  `!guardada && subtitulos.length > 0 && estilo !== 'no' && orientacion === 'vertical'`, y además
  que el APK tenga `exportarToma`. Lo del 480p queda pendiente: ver «Lo que no calza».
- **La cabeza:** `.panel-ficha-cabeza` (`styles-ajustes.css:85`).
  - A la izquierda «POSICIÓN»: 12 px, 700, mayúsculas, `--color-apagado`.
  - A la derecha lo elegido: 13 px, 500, `--color-texto` (`:97`).
  - Es la cabeza del panel de subtítulos de las fichas de LISTO (`FichasListo.tsx`,
    `panelAbierto === 'subtitulos'`).
- **El control:** `.segmentado` (`:105`), con borde `--borde-tarjeta` y radio 10.
  - Dos `.segmentado-opcion` (`:111`): alto 40, 13 px, 500.
  - La activa es `.segmentado-opcion.activa` (`:125`): fondo `--color-acento`, letra
    `--color-texto-acento`.
  - Lleva `role="group"`, `aria-label` «Posición» y `aria-pressed` en cada botón, como el de
    subtítulos de LISTO.
  - Para la implementación: `data-testid` `selector-posicion-subtitulos`, `btn-posicion-normal` y
    `btn-posicion-redes`.
- **La línea de las redes:** `.texto-meta` (`styles.css:238`, `--texto-meta` 13), `--color-apagado`,
  `margin-top: var(--aire-1)`, alineada a la derecha para que termine bajo «Para redes», en un solo
  renglón a 412 dp. Es el único lugar donde se nombran redes.
- **Por qué el segmentado y no el patrón del SelectorSubtitulos:**
  - Son dos opciones fijas y conviene ver las dos a la vez. El desplegable esconde la otra.
  - Además, `.opcion-subtitulos` tiene colores fijos (#1c1a19, #CFC8C3). El segmentado no tiene
    ninguno: todo sale de variables.
  - Javier elige (A1).

### El subtítulo «Para redes» en el visor (D3)

- Hoy `CapaSubtitulos` (`SubtitulosVisor.tsx:105`) usa `marginBottom: rect.h * 0.125`. En el boceto
  se sube a mano a `rect.h * 0.35`; en la app lo hará la prop `margenAbajo`.
- La letra sigue en `rect.h / 32` (`:102`).
- Las guías de la lámina resumen, contadas sobre la imagen y no sobre el elemento:
  - celeste: 0,125 desde abajo;
  - naranja: 0,35;
  - gris: el 14 % de arriba (zona de Meta).
- En 1080×1920, el bloque de dos renglones queda a ~817 px desde abajo, muy lejos del 14 % de
  arriba, como dice D0.
- El boceto **no** resta el medio interlineado ni `extraAbajo`. Eso se mide primero (D0 y D3) y
  puede mover el visor unos píxeles.

### Guardar y compartir (E1)

- Es una `.accion-toma` más (`styles.css:1477`: `min-height` 64, `--texto-etiqueta` 11,
  `gap var(--aire-1)`; deshabilitado en `:1493`, opacidad 0,7).
- Va dentro de `.acciones-toma` (`:1472`), **entre Guardar y Repetir**, con `IconoCompartir`
  (`IconosApp.tsx:333`) de 26.
- Lleva la etiqueta visible «Guardar y compartir», igual que Guardar lleva la suya.
- Con cuatro acciones, cada una mide ~95 dp de ancho a 412 dp. Hoy son tres de ~127. La etiqueta
  entra en un renglón.
- **Mientras guarda:** el botón que se tocó muestra el texto de hoy, `guardandoAvance`
  («Guardando… 37%», `es.ts:75`), y los dos de guardar quedan deshabilitados (E1).
- Solo en toma recién grabada (`!guardada`). Con la toma guardada siguen Compartir y Borrar, como hoy.

### El aviso cuando compartir falla (E1, estado 6)

Es el `AvisoBreve` de verdad (`AvisoBreve.tsx:17`): `--bg-superficie`, borde `--color-borde`,
`--redondeo-pildora`, `--texto-cuerpo` 15, 600, sobre la barra. Dice «Quedó guardada, pero no se pudo
compartir» (`compartirTrasGuardar`, propuesta). El visor queda como toma guardada.

### El tiempo estimado antes de guardar (E2, estado 8)

- **Dónde:** segunda línea `.texto-meta`, `--color-apagado`, bajo la duración, en el bloque del
  nombre (`ReproductorGrabacion.tsx:231-239`). `data-testid` `tiempo-estimado-guardado`.
- **Texto:** «Guardar tarda alrededor de {tiempo}» (`tiempoEstimadoGuardado`, propuesta). En inglés,
  «Saving takes about {tiempo}».
- **Fórmula:** `duracionMs × 11 200 / 60 000`, redondeado hacia arriba de a 5 s.
  - 1 min → 15 s;
  - 5 min → «1 min»;
  - 20 min → «3 min 45 s».
- **Umbral:** desde 1 minuto de toma. Solo con subtítulos y estilo distinto de No, sin guardar, y
  se oculta mientras guarda.
- Agrega ~19 dp a la tarjeta (1095 → 1114).

## Medidas (Chrome, 412×915 dp, barras de 24 y 48 dp)

| Captura | Alto de la raíz con la tarjeta (dp) | ¿Cabe en 915? |
|---------|------------------------------|---------------|
| hoy · 1 (vertical con subtítulos) | 989 | no: Guardar, Repetir y Borrar quedan bajo la barra y se alcanzan desplazando |
| boceto · 1, 2 y 5 | 1095 | no (+106 dp: el bloque de Posición) |
| boceto · 8 (con el tiempo estimado) | 1114 | no (+19 dp más) |
| hoy y boceto · 3 (horizontal) | 915 | sí |
| hoy y boceto · 4 (sin subtítulos) | 937 | casi: 22 dp bajo el borde |
| hoy y boceto · 6 y 7 (guardada) | 932 | casi: 17 dp bajo el borde |

Lo nuevo no cambia el video (380×640 dp de pie, `maxHeight: 70vh`) ni las piezas de hoy.

## El visor de lado (#68, todavía no en main)

El boceto no lo dibuja, porque en main el visor de lado sigue siendo el de pie desplazable. Con el #68
(video a la izquierda y controles en una columna a la derecha, que se desplaza), lo nuevo va **en la
misma columna y en el mismo orden**:

1. el selector de subtítulos;
2. Posición, con su línea de redes;
3. nombre, duración y tiempo estimado;
4. las acciones, con «Guardar y compartir» entre Guardar y Repetir.

El subtítulo «Para redes» se dibuja sobre el video igual, a 0,35 del alto de la imagen. Si se fusiona
el #68 antes de programar la 87, se saca una lámina de lado con esta misma herramienta
(`setViewport` 915×411).

## Lo que no calza o queda para decidir

1. **A2, estado 5, dice «los demás deshabilitados»; E1 dice «los dos botones de guardar».** Hoy, mientras
   se guarda, Repetir y Borrar siguen activos. El boceto sigue E1 (solo los dos de guardar). Javier
   decide.
2. **La tarjeta de pie crece 106 dp (125 con el tiempo estimado),** y ya hoy no cabe en 915: las
   acciones quedan bajo la barra y se llega desplazando (tarea 89). Una alternativa más baja sería
   poner Posición dentro del desplegable de subtítulos, pero esconde la elección y usa
   `.opcion-subtitulos`, con sus colores fijos. No se dibujó: se describe para que Javier elija.
3. **480p:** no se midió la forma (paso 0). El boceto ofrece Posición en toda toma vertical. Si al
   probar sale que el 480p no es 9:16, se oculta ahí (C1 y D3).
4. **El subtítulo «Para redes» del boceto** está a 0,35 sin el ajuste del medio interlineado ni del
   contorno (D0 y D3). La posición final se mide.
5. **Textos propuestos que Javier confirma en la lámina:** `guardarYCompartir`,
   `compartirTrasGuardar` y `tiempoEstimadoGuardado`.
6. **El texto de la cabeza:** el encargo dice `posicionSubtitulos` «Posición». La cabeza lo muestra en
   mayúsculas porque `.panel-ficha-cabeza` hace `text-transform: uppercase`, como en LISTO.
