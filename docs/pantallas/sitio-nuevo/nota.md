# Nota del prototipo — sitio nuevo

Prototipo en HTML estático para abrir con doble clic (`file://`). Nada de esto está publicado.

## Peso (carpeta del prototipo, sin `capturas-prototipo/`)

| Bloque | Peso |
| --- | --- |
| HTML + CSS + JS | ~37 KiB |
| Fuentes (4 woff2) | ~71 KiB |
| Poster del video | ~149 KiB |
| Gráfico 1024×500 | ~24 KiB |
| 8 capturas PNG | ~3,8 MiB |
| **Primera vista (sin MP4)** | **~4,05 MiB** |
| Video MP4 (solo al reproducir) | ~4,5 MiB |
| **Todo con video** | **~8,5 MiB** |

El cuello de botella son las capturas PNG a resolución de ficha. El video no se descarga hasta el clic (poster + botón).

## Cómo portar a `sitio/` sin romper es / en / pt

1. **No tocar** el árbol publicado hasta tener textos en los tres idiomas. Este prototipo solo prueba layout, ritmo y demo en español.
2. Extraer la demo del teléfono a un módulo compartido (hoy vive en `prototipo.js`; en el sitio real conviene reutilizar `sitio/fuente` `demo.js` / `escenas.js` / `lectura.js` o un subset sin GSAP para la portada).
3. CSS: llevar tokens (`--hondo`, `--rojo`, tipografías) al sistema de `sitio/fuente/estilo` y mapear secciones a clases existentes; evitar duplicar la hoja entera.
4. i18n: cada cadena de UI sale de `sitio/fuente/textos/{es,en,pt}` (o el mecanismo actual de `armar.mjs`). Las afirmaciones de producto deben seguir saliendo de las fichas aprobadas (`docs/play/ficha/textos-*.txt`), no inventar.
5. Activos: servir video y capturas desde `sitio/public/` (o CDN) con nombres estables; convertir capturas a WebP/AVIF y `srcset`; mantener `preload`/`loading` correctos en http(s) (en `file://` el lazy falla).
6. El selector ES · EN · PT del prototipo es decorativo; en producción enlaza a las rutas/locales ya armadas.
7. Pie: reutilizar los mismos href de Ayuda, Soporte, Privacidad, Términos y Borrar cuenta del sitio actual.
8. Propuesta técnica al integrar: IntersectionObserver (ya), posible scroll-linked demo más rica (GSAP/ScrollTrigger como en el sitio actual) solo si no empeora el LCP del hero; video con `preload="none"` + poster.

## Limitaciones vistas en las capturas

- El peso de primera vista (~4 MiB) no es aceptable en producción sin comprimir capturas.
- La captura `08.png` de la ficha es apaisada; en el carril se muestra más ancha (`cap-ancha`).
- La demo del hero es un ciclo ligero (hablar → pausa → subtítulos), no el guion completo de `escenas.js`.
- En pantallas muy bajas el teléfono del hero se reduce; conviene probar en 667–844 de alto.
- El GIF de scroll (~2,9 MiB) es pesado; para revisar el ritmo preferir `scroll-telefono.mp4` (~650 KiB).
