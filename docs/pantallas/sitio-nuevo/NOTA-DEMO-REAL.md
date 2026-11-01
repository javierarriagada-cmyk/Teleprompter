# Demo real en el prototipo (sitio-nuevo)

Copia de trabajo de `sitio/fuente/` para abrir el prototipo con doble clic (`file://`).

`escenas.fuente.js` es la referencia byte-a-byte del fuente; no se usa en runtime.
`demo-real/escenas.js` **no** es byte-idéntico al fuente: toda divergencia va listada abajo.

## Desvíos en `demo-real/escenas.js` (vs `sitio/fuente/escenas.js`)

1. **Cabecera de copia**  
   Comentario al tope: apunta a esta nota y a `escenas.fuente.js`.

2. **Línea de tiempo corta (solo «Cómo funciona»)**  
   - `ESCENAS`: solo E0 → E1 → E2 → E5 (ids 1/2/5 se conservan).  
   - `TOTAL = 5.1` (fuente: 8.5).  
   - `CAPITULOS = { 1: 1.15, 2: 2.7, 5: 4.2 }`.  
   - E3/E4/E6 fuera del scroll: `PINTA`/`GRABA`/`LENTE`/`SIN_*` con umbrales > TOTAL;  
     `VIDEO`/`ESTILOS` reubicados al tramo E5 del prototipo.

3. **E0 — medidas**  
   - Móvil: `s0` propio; Y más alto (`0.295*vh`), `rotationX: 6` (fuente peek abajo).  
   - Escritorio: teléfono a la derecha (`x: 0.28*vw`), `s0` propio, casi entero sobre el pliegue.

4. **E2 móvil — composición bajo el bajada**  
   - `scale = min(width-fit, height-fit)` con márgenes laterales ≥12 px y gutter 14 px.  
   - `phoneTop` anclado al bajada (~28 px hasta badges).  
   - Si el ancho limita y sobra alto, se reparte ~88 % del sobrante hacia abajo
     (`phoneTop += slack * 0.88`) para equilibrar el aire bajo la comparación
     (rótulos cerca de la píldora, sin vacío negro solo abajo).  
   - `--tel-scale` en `:root` para que los rótulos/avisos compensen el scale en CSS.

5. **E2 escritorio — composición producto**  
   - Teléfonos ~64% vh (`min(0.64*vh/800, 0.28*vw/380, 0.76)`), gutter 36–64.  
   - `phoneTop` bajo titular compacto + avisos; píldora liberada en la TL.  
   - También escribe `--tel-scale`.

6. **Timeline GSAP (tramos y saltos)**  
   - E1→E2 y E2→E5 con tiempos de la TL corta (sin E3/E4).  
   - Píldora se aparta en el pico E2 (`y: 72`, `autoAlpha: 0.25`) y vuelve.  
   - Reduced-motion: busca escena por tramo (`ESCENAS.find`), no por índice fijo.

7. **Onda en E2**  
   - `ondaE2` con `medio`/`alto` por teléfono; dos tramos alineados a la misma `t` de voz.

## Desvíos en `demo-real/onda.js` (vs fuente)

- Dibujo Apple/Sony: menos barras, `MS_POR_BARRA`/`PX_POR_BARRA` distintos.  
- Silencio = piso continuo (`SILENCIO` / `plano`), no fila de puntos.  
- Paleta crema/`#F0C070`; API `dibujar` acepta `color`, `colorAhora`, `barW`, `plano`.

## Onda — qué tomamos de Apple / Sony (t122u/t123u)

- **Apple Dynamic Island / AirPods product pages:** pocas barras redondeadas, amplitud suave;
  en silencio un piso continuo bajo (no cero, no línea punteada); el “ahora” se lee por
  el acento cálido de las barras cercanas, no por un playhead grueso.
- **Sony audio product pages:** EQ limpio monocromo + acento de producto; alineado al
  artefacto (aquí: al ancho de cada teléfono), sin decoración densa.
- **Historia E2:** misma `t` de voz bajo ambos → al callar, ambas ondas se aplanan;
  el común sigue escapando, Sigo espera; al volver la voz, la onda crece y el texto de Sigo sigue.

## CSS del prototipo (`estilo.css`, no es copia del fuente)

- Rótulos E2: counter-scale móvil (`transform: scale(1 / var(--tel-scale))`) para ≥14 px en pantalla.  
- Avisos crema/ámbar fuera del guion; z-index `telefonos` sobre el texto.  
- Titular E2 desk compacto; píldora más baja en E2.

8. **Sin tarjetas laterales E2**  
   - `tarjetasVisibles` ya no añade `espera`/`corre` (repetían los avisos del teléfono).  
   - Los nodos quedan en el HTML con `hidden`; CSS los oculta.

9. **E5 chips (CSS del prototipo)**  
   - En escritorio, `.estilos-subtitulo` lleva margen interior y `padding-bottom` para
     separarse del borde del bloque de texto y de la píldora de momentos.

## Prototipo file://
- `demo-real/estilo.css`: rutas de fuentes relativas (`fuentes/…`) en vez de `/fuentes/…` del sitio publicado, para que resuelvan al abrir con doble clic y en el servidor local del prototipo.
