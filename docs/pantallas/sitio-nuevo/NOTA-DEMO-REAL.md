# Demo real en el prototipo

## Qué se reutiliza sin cambiar
Copias byte-idénticas de `sitio/fuente/` en `demo-real/`:

- `demo.js`, `lectura.js`, `pantalla.js`, `onda.js`, `franja.js`, `telefono.html`
- `escenas.fuente.js` = copia prístina de `escenas.js` (referencia; no se carga)
- vendor GSAP / ScrollTrigger / Lenis y fuentes woff2

«Cómo funciona» = escenas reales E1 (hablas → te sigue), E2 (pausa → te espera), E5 (video + subtítulos). Reduced-motion: el motor ya congela cada escena en su mejor cuadro (`ESCENAS[i][3]`).

## Adaptadores mínimos (file://)
1. `#demo-datos` inline en `index.html` (misma data que produce el build; evita fetch CORS en file://).
2. `demo-real/file-adapter.css`: solo `@font-face` con rutas relativas a `fuentes/`.
3. Scripts y CSS con rutas relativas (sin `/fuente/...` absolutos).

## Único desvío de lógica visual
`demo-real/escenas.js` vs `escenas.fuente.js`: solo las medidas de **E0** (móvil y escritorio). La portada publicada hace *peek* del teléfono y deja un hueco muerto entre frase y teléfono; el encargo pide marca + frase + demo juntos sobre el pliegue, teléfono legible. E1–E6, Reloj, Pantalla, reduced-motion: iguales a la fuente.

Diff exacto: `diff demo-real/escenas.fuente.js demo-real/escenas.js`.
