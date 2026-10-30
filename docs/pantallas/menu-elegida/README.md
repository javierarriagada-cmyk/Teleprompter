# Menú: opción elegida resaltada

Boceto aprobado: fondo cálido suave detrás de `.fila-menu-adjunto.elegida`, conservando el ✓.

## Capturas

**Provisorias (Vite en navegador headless, viewport teléfono).** No sustituyen las del teléfono.
Javier arma la APK, la instala y revisa en el teléfono; las capturas de teléfono quedan a su cargo.

- `antes/` — sin el fondo de elegida (solo ✓)
- `despues/` — con `--menu-elegida-fondo` (::before inset 6 dp, radio 8 dp)
- `programado/cap-menus.cjs` — script de captura contra `npm run dev`

Menús cubiertos: tipografía, tema, idioma de la app, tamaño, ancho, colores, modo de lectura, tipografía en tema claro (menús de Ajustes siguen oscuros → crema), idioma del guion en oscuro y en claro (11-idioma-guion-claro).
Calidad de video: misma clase; en Vite de biblioteca no apareció `fila-calidad` (solo con contexto de video). Pendiente Android / teléfono para Javier.

Herencia: `--menu-elegida-fondo` está en `:root` (crema), `[data-tema="claro"]` (marrón #A4471E 11 %) y `[data-tema="oscuro"]` (crema #ECE6E0 11 %). Sin la de oscuro, los menús en `menus-dock` heredaban el marrón del html en tema claro.
