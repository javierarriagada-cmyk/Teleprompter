# Tarea 87 · boceto del visor de la toma (BOCETO, sin código)

Estado: **segunda vuelta (04-10-2026)**, con las correcciones de la revisión de Claude. Va primero a
Claude y después a Javier para que lo apruebe. Sin lámina aprobada no se programa nada de lo visible
de las partes D y E (`docs/tarea87.txt`, parte A). La versión aprobada es el piso.

El boceto parte del visor **de pie** de main **c03d734**, que ya trae la tarea 89 (bordes seguros y
visor desplazable), y usa las piezas de Sigo de hoy.

## Qué cambió desde la primera vuelta

| Corrección | Antes (primera vuelta) | Ahora |
|---|---|---|
| (1) Acciones | Al final de la tarjeta. De pie, la tarjeta medía 1095 a 1114 dp, así que había que desplazar para llegar a las acciones | **Fila fija abajo**, completa sobre la barra del sistema. El video se achica para que lo demás quepa |
| (2) Posición | Bloque siempre a la vista bajo la ficha de Subtítulos | **Dentro del panel de Subtítulos**, que se abre al tocar la ficha, bajo los cuatro estilos |
| (3) Guías | Líneas punteadas sin rótulo | Rotuladas «GUÍAS DEL BOCETO · no van en la app», en la imagen y en las láminas |
| Guardando (estado 5, ahora 7) | Desactivados los dos botones de guardar | **Solo el apretado** muestra el avance. Los otros tres, y la ficha de Subtítulos, quedan desactivados (respuesta de Claude) |

Respuestas de Claude que también quedan aquí:

- El tiempo estimado se redondea hacia arriba.
- «1080×1920 con rotación» significa que el archivo viene en 1920×1080 con rotación 90/270 y se ve
  en 1080×1920. No cambia nada visible del boceto: las tomas verticales se ven igual.

## Qué mirar primero

Todas las láminas están a 412×915 dp, en claro y oscuro, con la barra de tres botones y con
navegación por gestos:

1. `lamina-resumen.png`
2. `lamina-aprobacion.png`: hoy | boceto, estado por estado, en las dos navegaciones y los dos temas.
3. `boceto-visor-{botones,gestos}-{oscuro,claro}.png`: los diez estados.
4. `app-hoy-{botones,gestos}-{oscuro,claro}.png`: la app de hoy en los estados 1, 5, 6 y 9.
5. Las sueltas: `boceto-estado-N-{nav}-{tema}.png`, `hoy-estado-N-{nav}-{tema}.png` y
   `guias-estado-{1,3}-{nav}-{tema}.png`.
6. `herramientas/medidas-capturas.json`: lo medido en cada captura.

## Las barras del sistema que se suponen

- **Barra de estado:** 24 dp arriba.
- **Barra de tres botones:** 48 dp abajo.
- **Navegación por gestos:** una franja de **24 dp** abajo. Es el alto que Android documenta para la
  barra de gestos, y es lo que vale el borde seguro de abajo con gestos. Se dibuja la píldora.
- Chrome no tiene barras. Las dibujo encima, y la raíz del visor suma esos bordes como lo hace en el
  teléfono con `env(safe-area-inset-*)`.
- **No medido en el moto g86:** la barra de estado real y la franja de gestos real. Si la barra de
  estado es más alta (por ejemplo, 30 dp por la cámara), el video pierde esa diferencia; las acciones
  no se mueven.

## (1) Las acciones fijas abajo, y cómo conviven con el visor desplazable de la 89

### La estructura que se propone, sobre `ReproductorGrabacion.tsx` de c03d734

- **La raíz** (`:176`) queda igual que en la 89: `position: fixed`, `inset: 0`, los cuatro bordes
  seguros más `--aire-4` (20 dp) y `overflowY: auto`. Además se vuelve una columna
  (`flexDirection: column`).
- **La tarjeta** (`:178`): `display: flex`, `flexDirection: column`, **`maxHeight: 100%`** del alto
  disponible y `overflow: hidden`. No pasa de lo que cabe entre las barras.
- **Dentro de la tarjeta, dos partes:**
  - **Arriba** (`data-testid="visor-arriba"`, nuevo): video, barra de avance, ficha de Subtítulos
    (con su panel) y nombre con duración y tiempo estimado. Lleva `flex: 1 1 auto`, `minHeight: 0` y
    `overflowY: auto`.
  - **Abajo**, `.acciones-toma` **fuera** de lo de arriba, con `flexShrink: 0`. Nunca se desplaza
    ni se achica.
- **El video** toma lo que queda:

  ```
  disponible = alto de la raíz − borde seguro de arriba − borde seguro de abajo − 2 × --aire-4
  resto      = lo de arriba sin el video + .acciones-toma (con su margin-top de --aire-3) + bordes de la tarjeta
  altoVideo  = máx(240, mín(70vh, disponible − resto))
  ```

  Va como `maxHeight` del `<video>`, con `width: 100%`. La imagen se ajusta sin recortar, como hoy.
  En la app, `resto` se mide con un `ResizeObserver`: cambia al abrir o cerrar el panel y al aparecer
  el tiempo estimado. El boceto lo hace así (`usarAltoDelVideo` en `herramientas/boceto.tsx`).

### Qué se desplaza y qué no

| Pieza | ¿Se desplaza? |
|---|---|
| Fila de acciones | **Nunca.** Siempre completa sobre la barra |
| Video, avance, ficha y panel, nombre | Solo si ni con el video en 240 dp cabe, o sea con menos de 240 + resto de alto disponible: unos 476 dp con el panel cerrado y 658 con el panel abierto (resto de 236 y 418). Ahí se desplaza **lo de arriba**, dentro de la tarjeta. En 412×915 no pasa en ningún estado: lo verificó `capturas.cjs` (`arribaSeDesplaza: false` en los 40 casos) |
| Raíz de la 89 (`overflowY: auto`) | Queda como red de seguridad. Como la tarjeta no pasa de `maxHeight: 100%`, la raíz solo se desplazaría si ni la fila de acciones (82 dp con su margen) cupiera. En 412×915 no se desplaza (`raizSeDesplaza: false` en los 40) |

### Medidas exactas, de pie a 412×915 (dp)

La tarjeta mide 372 de ancho (412 − 2 × 20). El alto disponible es 803 con tres botones
(915 − 44 − 68) y 827 con gestos (915 − 44 − 44).

| Estado | Tres botones: video (alto · imagen) | Gestos: video (alto · imagen) |
|---|---|---|
| Hoy, vertical con subtítulos | 641 · 360×641; **fila 851–920, bajo el borde** | 641 · 360×641; **fila 851–920, bajo el borde** |
| 1 y 4 · panel cerrado | **567 · 319×567** | **591 · 332×591** |
| 2 y 3 · panel abierto, con Posición | **385 · 217×385** | **409 · 230×409** |
| 5 · horizontal | 209 · 372×209 (no se achica) | 209 · 372×209 |
| 6 · sin subtítulos | 619 · 348×619 | 641 · 361×641 (tope de 70vh) |
| 7 · guardando, 5 min | 567 · 319×567 | 591 · 332×591 |
| 8 y 9 · guardada | 624 · 351×624 | 641 · 361×641 |
| 10 · tiempo estimado, 5 min | **549 · 309×549** | **573 · 322×573** |

**La fila de acciones** (de arriba a abajo; límite = donde empieza la barra):

| Variante | Fila | Límite | Aire sobre la barra |
|---|---|---|---|
| Tres botones | 777–846 | 867 | 21 dp: los 20 de `--aire-4` más el borde |
| Gestos | 801–870 | 891 | 21 dp |
| Guardada (dos acciones), tres botones | 782–846 | 867 | — |
| Guardada (dos acciones), gestos | 803–867 | 891 | — |

En el horizontal (estado 5) la tarjeta cabe entera y queda centrada: fila 598–667 con tres botones,
610–679 con gestos.

### Letra y toques: no bajan de lo de hoy (medido en cada captura)

| Pieza | Hoy | Boceto |
|---|---|---|
| Acciones (`.accion-toma`) | 69 alto (64 + etiqueta), 3 de ~124 ancho | 69 alto (64 con dos acciones); **4 de 93 ancho** |
| Letra de las etiquetas | 11 (`--texto-etiqueta`) | 11 |
| Avance y cerrar | 44 | 44 |
| Estilos del panel | 68 | 68 |
| Segmentado de Posición | — | 40, letra 13 (como en LISTO) |
| Texto meta | 13 | 13 |

## (2) Posición dentro del panel de Subtítulos

- **La ficha** usa el mismo marcado y clases que `SelectorSubtitulos` (`SubtitulosVisor.tsx:148`):
  la píldora `.boton-subtitulos`, que se despliega, y las cuatro `.opcion-subtitulos` (68 dp).
- **Lo nuevo va debajo de los cuatro estilos, dentro del panel:**
  - la cabeza `.panel-ficha-cabeza` (`styles-ajustes.css:85`): «POSICIÓN» a la izquierda y lo elegido
    a la derecha;
  - el `.segmentado` (`:105`) con dos `.segmentado-opcion` (`:111`, 40 dp); la activa es
    `.activa` (`:125`), con `--color-acento` y `--color-texto-acento`;
  - la línea `.texto-meta` con `--color-apagado`, alineada a la derecha: «Instagram, TikTok y
    YouTube Shorts». Es el único lugar donde se nombran redes.
- **Con el panel cerrado no se ve.** Si está en Para redes, la píldora lo resume:
  «Subtítulos · Amarillo · Para redes» (estado 4).
- **Propuesta:** elegir un estilo cierra el panel, como hoy. Elegir la posición **no** lo cierra,
  para ver subir el subtítulo en el video de arriba. Javier decide.
- **Cuándo hay Posición:** toma vertical recién grabada, con subtítulos y estilo distinto de No (D3).
  La horizontal (estado 5) abre el panel con sus cuatro estilos y sin Posición.
- **`data-testid`:** `selector-posicion-subtitulos`, `btn-posicion-normal` y `btn-posicion-redes`,
  con `aria-pressed`.

## (3) Las guías

- Están en `guias-estado-{1,3}-*.png` y en la lámina resumen.
- Son tres líneas, contadas sobre la imagen desde abajo: celeste en 0,125 (Normal), naranja en 0,35
  (Para redes) y gris en el 14 % de arriba (zona de Meta).
- Llevan el rótulo rojo «GUÍAS DEL BOCETO · no van en la app». **No son de la app.**
- El subtítulo de Para redes del boceto está a 0,35 a mano, sin el ajuste de D0 y D3 (contorno y
  medio interlineado). Eso se mide al implementar.

## Los diez estados

| # | Estado | Toma | Lo que se ve |
|---|--------|------|--------------|
| 1 | Vertical con subtítulos, panel cerrado | 0:50, amarillo | Ficha cerrada, «Guardar y compartir» |
| 2 | Panel abierto, Posición en Normal | 0:50 | Cuatro estilos y Posición |
| 3 | Panel abierto, Para redes | 0:50 | El subtítulo del visor a 0,35 |
| 4 | Panel cerrado, en Para redes | 0:50 | La ficha dice «Amarillo · Para redes» |
| 5 | Horizontal con subtítulos | 0:50, 16:9 | Sin Posición |
| 6 | Sin subtítulos (sin registro) | 0:50 | Sin ficha |
| 7 | Guardando | 5:00 | «Guardando… 37%» en «Guardar y compartir», el apretado. Guardar, Repetir, Borrar y la ficha desactivados (opacidad 0,7, `.accion-toma:disabled`, `styles.css:1493`). Sin el tiempo estimado |
| 8 | Guardada, pero compartir falló | 0:50 | Compartir y Borrar, más el aviso breve «Quedó guardada, pero no se pudo compartir» |
| 9 | Ya guardada | 0:50 | Como hoy |
| 10 | Toma de 5 min | 5:00 | «Guardar tarda alrededor de 1 min» bajo la duración |

## Las demás piezas (sin cambios desde la primera vuelta)

- **«Guardar y compartir»:** una `.accion-toma` más (`styles.css:1477`), con `IconoCompartir`
  (`IconosApp.tsx:333`), entre Guardar y Repetir. Lleva la etiqueta visible.
- **El aviso:** el `AvisoBreve` de verdad (`AvisoBreve.tsx:17`).
- **El tiempo estimado (E2):** una segunda línea `.texto-meta` con `--color-apagado` bajo la
  duración, `data-testid="tiempo-estimado-guardado"`. Texto: «Guardar tarda alrededor de {tiempo}».
  Duración × 11,2 s/min, redondeado hacia arriba de a 5 s, desde 1 minuto.
- **Textos propuestos que Javier confirma:** `guardarYCompartir`, `compartirTrasGuardar` y
  `tiempoEstimadoGuardado`.

## El visor de lado (#68, todavía no en main)

No se dibuja: en main, de lado sigue el visor de pie desplazable. Con el #68, las acciones van
fijas al pie de la columna de la derecha, que es la que se desplaza, nunca el video. Las mismas
piezas, en el mismo orden:

1. avance;
2. ficha con su panel (Posición adentro);
3. nombre, duración y tiempo estimado;
4. acciones.

Si el #68 entra antes de programar la 87, se saca la lámina de lado con esta herramienta
(`setViewport` 915×411).

## Lo que no calza, con las cifras

1. **Con el panel abierto, el video queda chico:** 385 dp de alto (imagen 217×385) con tres botones
   y 409 (230×409) con gestos. Hoy mide 641 (360×641): es el 60 % y el 64 %. El subtítulo del visor
   se dibuja a 1/32 del alto de la imagen, así que mientras el panel está abierto la letra baja de
   20 a **12 dp** (13 con gestos). La letra y los toques de la interfaz no bajan; la vista previa del
   subtítulo sí, mientras se elige. Si es demasiado, una salida sería esconder la línea del nombre
   con el panel abierto (+52 dp de video). No la dibujé: Javier y Claude deciden.
2. **Con el panel cerrado, el video baja de 641 a 567 dp** con tres botones (−74) y a 591 con gestos
   (−50). Es el precio de que se vean las acciones. Hoy, para verlas, hay que desplazar.
3. **Las cuatro acciones miden 93 dp de ancho;** hoy las tres miden ~124. Siguen sobre los 48 dp
   mínimos de Android, con la misma letra y el mismo alto.
4. **La barra de estado (24) y la franja de gestos (24) son supuestas,** no medidas en el moto g86.
5. **Guardando:** la X de cerrar sigue activa, como hoy. La respuesta de Claude habla de «los otros
   botones»; no la desactivé porque no sé si cerrar el visor cancela el guardado. Que lo confirmen.
6. **480p:** la forma no se midió, así que el boceto ofrece Posición en toda toma vertical (C1 y D3).
7. **Estado 8:** el `AvisoBreve` de la App va fijo a `--aire-5` (32 dp) más el borde seguro desde
   abajo (`AvisoBreve.tsx`). Con las acciones fijas abajo, tapa la fila de Compartir y Borrar durante
   los ~2 s que dura (`useAviso`, 2000 ms). Hoy pasa lo mismo cuando la fila queda a la vista. No lo
   moví porque es de la App, no del visor. Si molesta, que el aviso suba sobre la fila mientras el
   visor está abierto.

## Implementación (04-10-2026): las cuentas con la barra de estado de 45 dp

Claude aprobó el boceto (#63, ab86ccc) como piso, con cuatro respuestas:

1. **El nombre de la toma se esconde con el panel de Subtítulos abierto.** El video gana ~52 dp.
2. **Elegir Posición no cierra el panel.**
3. **La X mientras se guarda no cancela.** El guardado sigue y, al terminar, sale el aviso aunque el
   visor esté cerrado. El visor no se vuelve a abrir.
4. **La barra de estado del moto g86 mide 45 dp, no 24.** La franja de gestos la mide Claude en el
   teléfono: la app no la fija, usa los bordes seguros reales y deja la línea `evento=bordes`.

### El alto disponible, recalculado

- Tres botones: 915 − 45 − 48 − 2 × 20 = **782 dp** (antes 803).
- Gestos: 915 − 45 − gestos − 2 × 20 = 830 − gestos. Con los 24 dp que supone la captura,
  **806 dp** (antes 827). La cifra real sale de `evento=bordes abajo_dp=`.

Las acciones no se mueven: siguen pegadas a la barra de abajo. Lo que pierde los 21 dp es el video.

### Medido en la app (vite + Chrome headless, 412×915, barra de estado de 45)

| Estado | Tres botones: app · piso (boceto con 45) · boceto aprobado (24) | Gestos (24 supuestos): app · piso · aprobado |
|---|---|---|
| 1 · panel cerrado | **546** · 546 · 567 | **570** · 570 · 591 |
| 2 · panel abierto, sin Posición | **522** · 364 · 385 (+158: el nombre escondido y sin Posición) | **546** · 388 · 409 (+158) |
| 5 · horizontal | 209 · 209 · 209 | 209 · 209 · 209 |
| 6 · sin subtítulos | 598 · 598 · 619 | 622 · 622 · 641 |
| 7 · guardando, 5 min | 546 · 546 · 567 | 570 · 570 · 591 |
| 8 y 9 · guardada | 603 · 603 · 624 | 627 · 627 · 641 |

Los estados 3 y 4 (Para redes) y 10 (tiempo estimado) **se sacaron** (04-10-2026, Javier simplifica
la 87). Antes de sacar Posición, con el panel abierto: **416** con tres botones y **440** con gestos.
Sin Posición el panel se achica: pierde el segmentado de 40 dp y la línea de ayuda, y el video crece
106 dp, a **522** y **546**. Con el panel cerrado no cambia nada: 546 y 570.

Fila de acciones: 777–846 con tres botones y 801–870 con gestos, con el límite en 867 y 891. Quedan
completas sobre la barra en los 28 casos que quedan, y no se desplaza ni la raíz ni lo de arriba.

### El subtítulo a 1/6 (antes 1/8)

Una sola posición: el borde de abajo de la caja del subtítulo a 1/6 del alto de la imagen. Vale en
vertical y en horizontal, de pie y de lado, en el visor y en el archivo. Hay una constante por lado:

- `MARGEN_ABAJO_SUBTITULOS` en `src/lib/subtitulos.ts`, para el visor;
- `UbicacionSubtitulos.MARGEN_ABAJO` en Java, para el archivo.

Medido en las capturas:

- de pie, 91 dp sobre una imagen de 546 (95 sobre 570 con gestos);
- con el panel abierto, 87 sobre 522;
- horizontal, 34,8 sobre 209;
- de lado, caso 1: 59,8 sobre 358,9 (915×411);
- de lado, caso 2: 68,4 sobre 410,7.

Son las 24 capturas con subtítulo y ninguna queda fuera por más de 1 dp. En el archivo: 320 px en
1920 y 180 en 1080 (`RecetaExportacionTest`).

### De lado (mezcla con la tarea 90, main 900a982)

A 915×411, giro 90, el visor de lado es el de la 90 y no tiene la fila fija de abajo de la 87 (A4
aplica solo de pie):

- caso 1: video de 638×359 y columna de 130 (la del 70 %);
- caso 2: video de 231×411 y tarjeta de 320×250, que pasa a 320×326 con el panel abierto.

El panel de Subtítulos de lado no tiene Posición. La lámina es `implementacion/comparar-visor-lado.png`
y tiene tres columnas: el boceto aprobado de la 90, la app de main (a 1/8) y esta rama (a 1/6).

Ninguna medida queda bajo el piso. `laminas.cjs` lo comprueba caso por caso:

- acciones de 69 (64 con dos), letra 11;
- segmentado de 40, letra 13 (era el de Posición; se sacó);
- estilos de 68;
- avance y cerrar de 44;
- meta de 13.

Con el panel abierto hay una sola línea de meta, porque el nombre está escondido.

Comparado con el boceto **aprobado** (24 dp), el video mide 21 dp menos con el panel cerrado (14 a 21
con gestos, donde el tope de 70vh ya lo cortaba). Es la barra de estado real, no un cambio de diseño.
Con el panel abierto mide 137 más (antes de sacar Posición, 31).

### El subtítulo en la toma horizontal (04-10-2026, pedido de Javier)

Antes, la toma horizontal usaba las medidas de la vertical: renglones de 32 letras y la letra a
alto/32. Por eso se veía angosta y chica.

Ahora hay una constante por lado, con el mismo criterio:

- **Renglones:** hasta 47 letras en horizontal y 32 en vertical. Cuadrado cuenta como vertical.
  - TS: `LETRAS_POR_RENGLON` en `src/lib/subtitulos.ts`.
  - Java: `UbicacionSubtitulos.LETRAS_VERTICAL` y `LETRAS_HORIZONTAL`.
- **Letra:** el lado corto del cuadro / 18, o sea 1/32 de 1920 en una imagen de 1080.
  - TS: `LADO_CORTO_EN_LETRAS` y `letraSubtitulo`.
  - Java: `UbicacionSubtitulos.letra`.

| Cuadro | Letra antes | Letra después | Renglón máximo |
|---|---|---|---|
| 1920×1080 (horizontal) | 33,75 | **60** | 32 → **47** |
| 1280×720 (horizontal) | 22,5 | **40** | 32 → **47** |
| 1080×1920 (vertical) | 60 | 60 (igual al píxel) | 32 |
| 720×1280 (vertical) | 40 | 40 | 32 |
| Visor de pie, imagen 371,5×209 | 6,53 | **11,61** | 32 → 47 |
| Visor de lado caso 1, imagen 638×358,9 | 11,21 | **19,94** | 32 → 47 |

El subtítulo del corpus a los 3,5 s:

- antes: «que podríamos llamar / la concepción trágica», 20 y 21 letras;
- después: «que podríamos llamar la concepción / trágica de la naturaleza humana.», 34 y 32 letras;
- en el archivo de 1920 mide 976,7 px de 1689,6 disponibles, y cabe.

**Un renglón de 47 «MW»** (una sola palabra), medido con Roboto 700, la letra del sistema. Los
avances salen del ttf con fontTools y el canvas de Chrome mide lo mismo: M = 1793/2048 em y
W = 1792/2048 em, o sea 41,14 em.

| Dónde | Ancho a la letra nueva | Disponible (88 %) | Resultado |
|---|---|---|---|
| Archivo 1920×1080, letra 60 | 2468,2 px | 1689,6 | **No cabe** (+778,6). Lo resuelve el ajuste que ya tenía CapaDeSubtitulos, ahora en `UbicacionSubtitulos.letraQueCabe`: la letra de ese subtítulo baja a **41,07** y el renglón mide 1689,2 |
| Visor de pie, letra 11,61 | 477,6 | 327 | **Se sale 150,6** (46 %): pasa el borde de la imagen |
| Visor de lado caso 1, letra 19,94 | 819,5 | 561,4 | **Se sale 258,1**: pasa sobre la franja y la columna |

Antes, con 32 «MW», cabía en todos los casos: 945,3 de 1689,6 en el archivo, 182,5 de 327 de pie y
313,8 de 561,4 de lado. En vertical pasa lo mismo hoy: 32 «MW» a 60 px miden 1680 de 950,4, el
archivo achica la letra y el visor no.

Un renglón ancho con espacios, como «MW MW …» de 47 letras (31,7 em), mide en el archivo 1904 px:
la letra baja a 53,2. En el visor no se sale: se parte en dos líneas y el subtítulo queda de tres.

**Salida propuesta para el visor (NO aplicada):** que el visor haga lo mismo que el archivo. Se mide
el renglón más ancho con un canvas, con Roboto 700 a la letra calculada, y si pasa del 88 % de la
imagen se achica la letra de todo el subtítulo con la misma cuenta de `letraQueCabe`. Así el visor
mostraría lo mismo que queda guardado. La otra salida es partir antes, por ancho medido en vez de por
letras; esa cambiaría los renglones también en el archivo.

La lámina es `horizontal/lamina-horizontal.png`, con las sueltas `horizontal/{antes,despues}-*.png`.
Las herramientas están en `horizontal/herramientas/`: `capturas.cjs antes|despues`, `cuadro.tsx` (el
cuadro exportado simulado en canvas) y `laminas.cjs`.

### Las láminas

Están en `implementacion/`:

- `lamina-resumen.png`: la primera que se mira. Al final tiene el visor de lado.
- `comparar-visor-lado.png`: de lado, a 915×411, en el caso 1 y el caso 2, con el panel cerrado y abierto.
- `comparar-visor-{botones,gestos}-{oscuro,claro}.png`: al lado de cada `boceto-visor-…png`, con
  tres columnas por estado: el aprobado, el boceto con 45 (el piso) y la app.
- Las sueltas `app-estado-N-…png` y `boceto45-estado-N-…png`.
- `herramientas/medidas-app.json`.

Para rehacerlas:

1. El vite de la app en 5183, desde esta rama.
2. Antes, el del boceto en 5184, desde un worktree de main con `docs/pantallas/tarea87/herramientas`
   copiado. Ya no hace falta: el boceto no se vuelve a capturar y sus medidas quedan en
   `medidas-app.json`. De lado se usa la página de la 90 (`docs/pantallas/tarea90/herramientas/
   app-real.html`), servida por el mismo vite de 5183.
3. `sh herramientas/videos.sh` y `node implementacion/herramientas/capturas.cjs`.
4. `node implementacion/herramientas/laminas.cjs`.

### Lo que no está medido (lo mira Claude en el moto g86)

- **Franja de gestos y barra de estado reales:** `evento=bordes`.
- **Video y acciones contra el borde:** `evento=visor`.
- **La forma de 480p:** `evento=forma`.
- **Vista previa 4:3 contra 16:9:** `evento=camara`.
- **El 1920×1080 con rotación 90/270:** `evento=orientacion` (`vista=vertical`).
- **La posición de abajo del subtítulo en el archivo:** `caja_abajo_px` de `evento=capa`, en px.
  Se espera en alto/6: 320 en 1920 y 180 en 1080, con `guardado_inicio … margen=0.167`.
  `pintado_abajo_px` queda algo menor, por el contorno.
- **El subtítulo en el visor:** de pie, `subtitulo_abajo_dp` ≈ `imagen_alto_dp` / 6 en `evento=visor`.
  De lado, con una captura del caso 1 y del caso 2.
- Antes: tiempo estimado contra el real (`evento=tiempo_guardado`) y Para redes en el archivo
  (`margen=0.350`). Se sacaron los dos.

Las líneas están en `docs/mediciones/tarea87/LEEME.md`.
