# Tarea 89 · defecto 2 · visor de lado (BOCETO, sin código)

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

Láminas: `lamina-visor-de-lado-oscuro.png`, `lamina-visor-de-lado-claro.png` (hoy | propuesta). Capturas
sueltas: `visor-de-lado-{hoy,propuesta}-{oscuro,claro}.png`.

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

`herramientas/boceto.html` + `boceto.tsx`: `?modo=hoy` dibuja el `ReproductorGrabacion` de verdad;
`?modo=propuesta`, el boceto. `&tema=claro|oscuro`.
