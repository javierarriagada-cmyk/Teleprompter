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

El motor (`demo.js`, `pantalla.js`, `lectura.js`, `onda.js`, reduced-motion, teléfono) es el publicado.  
`escenas.fuente.js` es la referencia byte-a-byte del fuente; no se usa en runtime.
