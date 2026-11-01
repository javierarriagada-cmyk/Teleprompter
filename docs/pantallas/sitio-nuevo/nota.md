# Nota del prototipo — sitio nuevo (ronda 3)

Prototipo en HTML estático para abrir con doble clic (`file://`). Nada de esto está publicado.
Rama `sitio-nuevo-prototipo`, solo `docs/pantallas/sitio-nuevo/`.

## Ronda 3 — fix crispness (`0ebde4b`, post-7d4b951)

- **Guiones:** UI nativa de `07.png` en marco `.proto-tel` (mismo canto/cuerpo que el héroe), opacidad 1, sin filtro. El póster Play «Continuar con Google» de 07 tiene texto suave/aberración en el PNG fuente; no se usa (queda como leftover).
- **Para qué:** cuatro momentos en marco de teléfono, mismo tamaño; Videos=cámara PiP+timer (02); Clases=lectura (01); Presentaciones=video con subtítulos (03); Ensayos=velocidad fija (06). Fade superior en Videos porque el mock del póster 02 arranca a media frase.
- **La app:** puntos + contador 1/6; caption 08 sin raya em: «De pie o de lado. Graba…».
- Capturas a **deviceScaleFactor: 2**.
- Peso página (assets enlazados, sin MP4): ~1.29 MiB.


## Peso medido (2026-10-31, red)

Sin contar `capturas-prototipo/`, `_tools/`, ni `escenas.fuente.js` (referencia, no se carga).
Medido con respuestas HTTP reales al cargar la página (imgs a eager).

| Bloque | Peso |
| --- | --- |
| HTML + CSS (proto + demo-real) | ~102 KiB |
| JS runtime (demo + prototipo, sin fuente) | ~50 KiB |
| Vendor (GSAP + ScrollTrigger + Lenis) | ~133 KiB |
| Fuentes (woff2) | ~87 KiB |
| Poster WebP (frame real del MP4) | ~50 KiB |
| Capturas WebP (usos + galería + guiones) | ~0,85 MiB |
| **Primera vista (hero+demo+libs, sin poster/caps/MP4)** | **~372 KiB** |
| **Página completa sin MP4 (navegador)** | **~1,29 MiB** |
| Video MP4 (solo al reproducir) | ~4,5 MiB |

**Meta ≤ 1,5 MiB sin video: cumplida (~1,29 MiB en assets enlazados).** En disco hay PNG fuente en `activos/capturas/` (~3,8 MiB) que la página no descarga; solo se sirven WebP.El video no se descarga hasta el toque (poster + botón).

## Ronda 3 — qué cambió

1. Ajustes en lo aprobado: sin textos laterales que repetían avisos; aire bajo E2 móvil equilibrado; chips E5 desk separados del borde y de la píldora.
2. Video vertical 9:16 con poster extraído del MP4 (frame ~5,2 s).
3. «Para qué»: cuatro momentos editoriales con **crops del UI real** (sin titulares de póster de Play). Línea corta de la ficha. No repite la galería (material distinto / recorte distinto).
4. «La app de verdad»: carrusel horizontal con snap (~80 % + peek) de phone-01…06; 08 landscape en momento ancho propio. **07 no está en la galería** (solo en Guiones).
5. «Tus guiones»: UI nativa de 07 en marco `.proto-tel` (mismo estilo héroe), opacidad plena. El card «Continuar con Google» del póster 07 queda fuera (texto suave en el PNG fuente).
6. Cierre: una acción (mailto), sin caja con borde.
7. Franja «Sigo está en prueba…» con **ES · EN · PT dentro de la franja** (ya no flota sobre el contenido). Pie con Ayuda/Soporte/Privacidad/Términos/Borrar cuenta + ES·EN·PT.

## Cómo portar a `sitio/`

1. No tocar el árbol publicado hasta textos en es / en / pt.
2. La demo ya es copia de `sitio/fuente`; al integrar, volver a un solo `escenas.js` y listar desvíos en PR.
3. Franja: reutilizar `sitio/fuente/franja.js` (el prototipo trae un subset en `prototipo.js`); el selector de idioma debe vivir en la franja o en zona propia, nunca fixed sobre capturas.
4. Activos: WebP + `srcset`; video con `preload="none"` + poster.
5. i18n: cadenas desde `sitio/fuente/textos/{es,en,pt}`; producto desde fichas aprobadas.

## Limitaciones honestas

- El poster del video sigue siendo un frame del trailer de Play (composición marketing con teléfono centrado), no un fotograma de app a pantalla completa; se ve contenido real, no un rectángulo negro.
- «Para qué» usa crops del UI / detalle de las capturas de ficha (no un motor demo con guion por vertical). Presentaciones muestra el frame de video+subtítulos (material real de la captura 03), no un teléfono con UI de teleprompter.
- Ensayos muestra Ajustes → Velocidad fija (UI real oscura); a primera vista puede leerse “apagado” si no se mira el toggle.
- La galería en móvil es carrusel con peek; en desk se ven varias a la vez + 08 ancho. Sigue siendo estático (sin scroll-scrub).
- El selector ES·EN·PT del prototipo es decorativo.
- En Guiones desk, el composite es alto y el marco redondeado puede rozar el borde superior del card «Continuar con Google» si el object-fit aprieta; en tel se ve entero tras el padding oscuro.
