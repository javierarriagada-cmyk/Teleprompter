# Demo real en el prototipo (sitio-nuevo)

Copia de trabajo de `sitio/fuente/` para abrir el prototipo con doble clic (`file://`).

## Desvíos documentados (únicos)

1. **E0 (primera pantalla)**  
   - Móvil: marca + frase + teléfono juntos sobre el pliegue, con aire limpio entre frase y teléfono (el vivo hace peek).  
   - Escritorio: marca y frase a la vara del vivo a la izquierda; teléfono a la derecha, sin tapar «que sigue tu voz.», casi entero a la vista.

2. **Línea de tiempo corta (solo «Cómo funciona»)**  
   Solo E0 → E1 (hablas) → E2 (espera / comparación con un teleprompter común) → E5 (subtítulos).  
   E3 (formatos), E4 (lente/cámara) y E6 (sin internet) no aparecen en el scroll: umbrales > TOTAL.  
   Los ids de escena 1/2/5 se conservan para textos y píldora.

3. **E2 (comparación común vs Sigo)**  
   Presentación: dos teléfonos con gutter explícito; rótulos en coords de teléfono; avisos «Se te escapó» / «Te espera» fuera de la pantalla (hijos de `.telefono`, encima del marco), nunca tapando el guion.  
   Con onda de voz real (`onda.js`) en E1 y E2: mismas barras bajo ambos teléfonos;
   en silencio se aplanan a la vez — el común sigue escapando, Sigo espera.

4. **Onda rediseñada (Apple/Sony)**  
   Motor real `onda.js`: pocas barras redondeadas, paleta crema/`#F0C070`, silencio casi plano
   (sin líneas punteadas). E2 alinea una onda bajo cada teléfono a la misma `t` de voz.

El motor (`demo.js`, `pantalla.js`, `lectura.js`, `onda.js`, reduced-motion, teléfono) es el publicado.  
`escenas.fuente.js` es la referencia byte-a-byte del fuente; no se usa en runtime.
## Onda — qué tomamos de Apple / Sony (t122u/t123u)

- **Apple Dynamic Island / AirPods product pages:** pocas barras redondeadas, amplitud suave;
  en silencio un piso continuo bajo (no cero, no línea punteada); el “ahora” se lee por
  el acento cálido de las barras cercanas, no por un playhead grueso.
- **Sony audio product pages:** EQ limpio monocromo + acento de producto; alineado al
  artefacto (aquí: al ancho de cada teléfono), sin decoración densa.
- **Historia E2:** misma `t` de voz bajo ambos → al callar, ambas ondas se aplanan;
  el común sigue escapando, Sigo espera; al volver la voz, la onda crece y el texto de Sigo sigue.

## Onda + E2 composición (post-494342f)

- Silencio E2: cápsula continua (`plano` en pausa), no fila de puntos.
- Desk E2: teléfonos ~64% vh; titular compacto; píldora apartada en el pico;
  avisos crema/ámbar centrados; `telefonos` z-index sobre el texto.
- Móvil E2: empaquetado hacia la píldora; silencio = línea continua.
