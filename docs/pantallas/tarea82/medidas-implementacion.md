# Sigo · hoja de medidas para implementar los layouts horizontales y de tableta

Bocetos del 29-09-2026 (hora de Chile). Todas las medidas van en **dp**. En el WebView de Android (Capacitor), 1 px CSS = 1 dp, así que se escriben tal cual en CSS.
El teléfono en vertical **no cambia**: sigue con el layout de hoy.

## 1. Qué layout se activa

Clases de tamaño de ventana de Material 3: **ancho** Compact <600, Medium 600–839, Expanded ≥840; **alto** Compact <480, Medium 480–899, Expanded ≥900.
Las clases se calculan sobre la **ventana** de la app, no sobre la pantalla física (importa en ventana dividida y en plegables).

| Layout | Ancho | Alto | Condición exacta | Media query (px = dp) |
|---|---|---|---|---|
| **Teléfono vertical** (el de hoy) | Compact | cualquiera | ancho < 600 | *(por omisión, sin consulta)* |
| **Teléfono horizontal** | Medium o Expanded | Compact | ancho ≥ 600 y alto < 480 | `(min-width: 600px) and (max-height: 479.98px)` |
| **Tableta vertical** | Medium | Medium o Expanded | 600 ≤ ancho < 840 y alto ≥ 480 y alto > ancho | `(min-width: 600px) and (max-width: 839.98px) and (min-height: 480px) and (orientation: portrait)` |
| **Tableta horizontal** | Expanded | Medium o Expanded | ancho ≥ 840 y alto ≥ 480 | `(min-width: 840px) and (min-height: 480px)` |

Ejemplos: 360×800 → teléfono vertical · 800×360 / 844×390 / 915×412 → teléfono horizontal · 820×1180 / 800×1280 → tableta vertical · 1180×820 / 1280×800 → tableta horizontal.

### Casos borde

| Caso | Tamaño típico | Resultado |
|---|---|---|
| Ancho Medium, alto Medium y apaisado (ventana dividida en tableta, plegable a medio abrir) | 700×520 | Rieles de **teléfono horizontal** (sus medidas), con letra 32 porque el alto es ≥ 480. Media query: `(min-width:600px) and (max-width:839.98px) and (min-height:480px) and (orientation:landscape)` |
| Ancho < 600 con alto Compact (ventana dividida chica, ventana flotante) | 560×400 | **Layout de hoy** (TeleprompterView tiene minHeight 360); no se fuerzan rieles |
| Plegable cerrado | pantalla externa | Es un teléfono: vertical u horizontal según las reglas de arriba |
| Plegable abierto | 673×841 / 841×673 | Tableta vertical / tableta horizontal |
| Tableta en ventana dividida a la mitad | 590×800 | ancho < 600 → layout de hoy |
| Rotación en plena toma | — | Se cambia de layout sin cortar la grabación ni mover el renglón vivo (la toma no depende del layout) |

### Cómo detectarlo en la app web/Capacitor

- **CSS**: las cuatro media queries de arriba, en ese orden, sobre clases de contenedor (`.layout-tel-h`, `.layout-tab-v`, `.layout-tab-h`).
- **JS** (para lo que no es CSS: pitch de las fichas, carril del recuadro, imán de esquinas): `window.matchMedia(<misma consulta>)` con listener `change`; un solo hook `useLayout()` que devuelve `'tel-v' | 'tel-h' | 'tab-v' | 'tab-h'`.
- `window.innerWidth/innerHeight` ya están en dp. No usar `screen.width` (es la pantalla, no la ventana).
- `index.html` ya trae `viewport-fit=cover`; las áreas seguras se leen con `env(safe-area-inset-*)`.

## 2. Teléfono horizontal (referencia 800×360 y 844×390)

| Pieza | Leer | Grabar |
|---|---|---|
| Riel izquierdo · ancho | **112** | **128** |
| Botón ‹ | 40×40, top 8, left 12 | 40×40, top 8, left 12 |
| Fichas | **3**: Aa · Arriba · Brillo (Auto) | **6**: Aa · Recuadro/Detrás · Arriba · Brillo · Calidad · Subtítulos |
| Ficha | alto 32, padding 0 12, radio 8, letra 13/500, separación 6 ícono-texto | igual |
| Pitch de las fichas | 48, primera en y = 60 | 48, primera en y = 60 |
| Zona de toque | 48 de alto (`::after` con inset −8px 0), sin pisarse | igual |
| Riel derecho · ancho | **124** | **124** |
| Más | arriba del riel derecho, top 12 | arriba del riel derecho, top 12 |
| Empezar / Parar | 72×72 al centro vertical del riel derecho | igual (rojo) |
| Pastilla de tiempo | afuera del riel, abajo: right (124−100)/2, bottom 14, ancho mínimo 100 | igual |
| Punto rojo | — | 10 px, 12 px a la izquierda de la pausa (top 23) |

- Cálculo del alto a 360: 52 + 7×48 = 388 > 352 → las 7 fichas no caben en un riel; 52 + 6×48 = 340 ≤ 352 (12 de holgura). Por eso Más sube al riel derecho.
- Columna de texto: letra **24**, interlineado 1,4, tope **56ch**, padding lateral 28 (20 con recuadro). Rinde unos 51 caracteres por renglón a 800 y 55 a 844; con el recuadro, 35 y 40.
- Recuadro: **144×81** (16:9), margen 12; la columna reserva un carril de **168** a la derecha. Por omisión abajo a la derecha, se imanta a las 4 esquinas de la zona libre y solo se arrastra en LISTO.

## 3. Tableta vertical (referencia 820×1180)

| Pieza | Medida |
|---|---|
| Barra superior | alto **72**, padding 0 20: ‹ (40) · título centrado (Source Serif 4, 18/600) · **Más** a la derecha |
| Dock inferior | alto **172**, padding-top 20 |
| Fichas en el dock | una fila centrada, **grandes**: alto 44, padding 0 16, radio 10, letra 15, separación 10. Leer: 3; Grabar: 6 |
| Empezar / Parar | 72×72, 16 debajo de la fila de fichas |
| Pastilla | a la derecha del dock: right 28, centrada en el alto del dock (bottom 172/2 − 22) |
| Columna | 56 por lado, letra **32**, tope **60ch** (~51 caracteres), padding-top 24 |
| En lectura | la columna termina encima del dock (bottom = 172) con fundido de 60 |
| Recuadro | **180×240** (3:4), right 32, 16 sobre el dock; la columna reserva una franja de 272 encima del dock |

Lógica de Más: igual que en el teléfono, arriba a la derecha (aquí, en la barra superior).

## 4. Tableta horizontal (referencia 1180×820)

| Pieza | Medida |
|---|---|
| Rieles | **168** cada uno, padding 20 |
| Riel izquierdo | ‹ (40) arriba; fichas **grandes** a lo ancho (`.ficha.grande.ancha`), separación 10, desde margin-top 32. Leer: 3; Grabar: 6 |
| Riel derecho | **Más** en top 18; Empezar/Parar 72×72 al centro; pausa en top 20 al grabar |
| Pastilla | abajo del riel derecho: right (168−128)/2, bottom 24, ancho 128 |
| Columna | letra **32**, tope **58ch** (~61 caracteres), padding-top 28 |
| Recuadro | **256×144** (16:9), margen 24; la columna reserva una franja de 192 abajo |

## 5. Áreas seguras (muesca, barra de 3 botones, barra de gestos)

- Los insets laterales (`env(safe-area-inset-left/right)`) **se suman** al ancho del riel de ese lado; el contenido del riel no se mueve respecto de su borde interior.
- Los insets de arriba y abajo se **restan** del alto útil para las fichas; Empezar se centra en el alto útil.
- Si el alto útil del riel izquierdo baja de **348** (52 + 6×48), el riel hace scroll vertical como último recurso; nunca se achican las zonas de toque de 48.
- La columna de texto no suma insets: ya queda entre los rieles.
- En tableta vertical, `safe-area-inset-bottom` se suma al alto del dock y `safe-area-inset-top` al de la barra superior.

## 6. Colores de este cierre

- **Empezar (Leer) en tema claro**: fondo **#1A1815** (el color del texto de la app) con ícono **#F3F1ED**. Da 15,7:1 sobre el riel #F3F1ED y 17,7:1 sobre blanco; el ícono, 15,7:1. Hoy (#E7E1DE) da 1,15:1 y 1,29:1. Alternativa más suave: #736B65 con ícono blanco (4,63:1 y 5,22:1). En el teléfono vertical Empezar flota sobre el lienzo, así que ahí depende de la pareja de lectura y no del tema.
- **Texto sobre la cámara: REGLA E (elegida por Javier el 29-09-2026)**: halo difuso de 10 sombras en el colorFondo de la pareja elegida por el usuario, **sin trazo y sin velo** (no se fuerza otra pareja). La letra conserva su peso.
  ```css
  .lectura-sobre-imagen {
    text-shadow:
      0 0 2px var(--fondo-lectura), 0 0 2px var(--fondo-lectura), 0 0 2px var(--fondo-lectura),
      0 0 2px var(--fondo-lectura), 0 0 2px var(--fondo-lectura),
      0 0 4px var(--fondo-lectura), 0 0 4px var(--fondo-lectura), 0 0 4px var(--fondo-lectura),
      0 0 8px var(--fondo-lectura), 0 0 8px var(--fondo-lectura);
  }
  .lectura-sobre-imagen .acotacion-lectura { opacity: 1; color: color-mix(in srgb, #aaa 50%, var(--fondo-lectura)); }
  .lectura-sobre-imagen .tramo-destacado { text-shadow: none; }
  ```
  `--fondo-lectura` = colorFondo de la pareja. Peor caso medido (pared blanca / gris 50 % / escena oscura; Chrome, DPR 2): Negro con blanco ≥ 9,56 con █ y ≥ 8,99 sobre un asta real «l»; Blanco con negro 5,02 (24 px) y 5,25 (32 px) con █, y 4,76 / 4,67 sobre la «l». A 2 px del borde: ≥ 2,96. Con menos capas no llega a 4,5. **Pendiente:** probar la fluidez de las 10 sombras en un teléfono de gama media (moto g86), con la cámara detrás y cinco minutos de lectura.
  *Plan B (variante D), si E traba la lectura en el teléfono*: trazo de ancho fijo con sombras apretadas. Contraste de la pareja en los tres videos (texto 21 / 20,65; celeste 10,08 / 5,84), pero se ve más pesada.
  ```css
  .lectura-sobre-imagen {
    -webkit-text-stroke: 2.6px var(--fondo-lectura); paint-order: stroke fill;
    text-shadow: 0 0 1px var(--fondo-lectura), 0 0 1px var(--fondo-lectura), 0 0 2px var(--fondo-lectura),
                 0 0 3px color-mix(in srgb, var(--fondo-lectura) 80%, transparent);
  }
  ```
  *E2 (7 sombras + velo de columna al 40 %)*: insuficiente; Blanco con negro queda en 4,50 (24) y 4,38 (32) sobre la «l» y necesitaría α 0,44.
  *A (trazo .16em)*: mismo contraste que D, pero rellena los ojos de las letras y las junta. *C (velo de columna)*: necesita α 0,73 / 0,90 y tapa el video. Descartadas.
  Ver `comparativa-contorno-BDE-tel-horizontal.png` (B / D / E / E2 con zoom y tablas) y `comparativa-contorno-variantes-tel-horizontal.png` (A / B / C / D).
- **Pastilla de tiempo**: con «Mostrar tiempo» encendido se ve siempre (en LISTO, leyendo y grabando); apagado, no hay pastilla y al grabar queda solo el punto rojo.
