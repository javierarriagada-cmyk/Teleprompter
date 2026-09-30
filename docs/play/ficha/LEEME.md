# La ficha de Sigo en Google Play — tarea 86

Todo lo que se sube a Play Console, listo para revisar. Nada de esto toca la app.

| Qué | Archivo | Para Play |
|---|---|---|
| Nombre, descripción breve y completa, con conteos | `textos-es-419.txt`, `textos-en-US.txt` | se copia lo que va entre dobles corchetes |
| Gráfico de funciones | `grafico-1024x500-es.png`, `grafico-1024x500-en.png` | uno por idioma |
| 8 capturas de teléfono por idioma, en orden | `capturas/es-419/01..08.png`, `capturas/en-US/01..08.png` | en ese orden |
| Tabletas de 7" y 10", 4 por idioma | `capturas/tableta-provisional/…` | PROVISIONALES, ver abajo |
| La lámina para elegir | `lamina-ficha.png` | no se sube |
| De dónde sale cada cosa que se dice | `evidencia.md` | no se sube |

Ícono: `android/app/src/main/ic_launcher-playstore.png` -512 x 512-. `docs/ic-play-512.png` es viejo.

## Las capturas cuentan una historia

Empiezan por la persona y lo que le cuesta -revisión de Javier, 29-09-2026-:
1. Tú hablas. El texto te sigue. · 2. Mira a la cámara, sin memorizar · 3. Mírate sin perder el
hilo · 4. ¿Grabas de lado? También funciona. · 5. Lo importante, a la vista · 6. Tu video sale con
subtítulos · 7. Todos tus guiones, a mano · 8. Letra y colores, a tu manera.
Los titulares están en `herramientas/titulares.cjs`.

## Lo elegido -Javier, 29-09-2026-

- Nombre: se queda igual en los dos idiomas.
- Descripción breve: la A. En es-419 se le sacó "sin internet": el uso sin conexión es una
  posibilidad y va al final de la completa, no en el titular.
- Gráfico: el A, en ámbar -Javier lo dejó a criterio-. La bajada ya no dice "sin internet".
- Las propuestas que no quedaron están en la historia del PR #60.

## Cómo se rehace

    bash docs/play/ficha/herramientas/todo.sh

Levanta vite si no está andando, captura la app real con Chrome sin ventana, compone, arma los
textos y la lámina, y termina con `comprobar.cjs`, que imprime OK o FALLA de cada imagen -tamaño,
proporción, sin alfa, peso- y de cada texto -conteos, emojis, puntuación, palabras que Play no
quiere-. Si algo falla, el guion sale con error. Se necesitan Node 22, ffmpeg, Chrome y
puppeteer-core -variables CHROME y PUPPETEER si no están donde el guion las busca-.

Para cambiar un texto: `herramientas/textos.cjs` y `node herramientas/armar-textos.cjs`. Para cambiar
un titular: `herramientas/titulares.cjs` y `node herramientas/componer.cjs tel`.

## Las tabletas, provisionales

La tarea 83 -el diseño de tableta- no está en main: `src/hooks/useLayout.ts` solo devuelve
'tel-v' o 'tel-h'. Las capturas de tableta muestran la app tal como se ve HOY en una tableta, el
diseño de teléfono más grande, con la letra en 32 -un paso de Ajustes-. Van a pantalla completa y
sin titulares: para pantallas grandes Play pide no agregar texto que no sea de la app.

Se eligieron Leer, Grabar con la cámara detrás, de lado y el editor. Lo que se ve menos bien, y
por qué no se arregló: en Leer vertical el cuarto de arriba queda vacío -el renglón que se lee va al
medio de la pantalla, así es la app-; en el editor, los botones Leer y Grabar tapan el final del
texto, igual que en el teléfono. De lado se probó el ancho Angosto y se descartó: la columna queda
sola al medio de la tableta.

Cuando la 83 esté fusionada, basta con:

    bash docs/play/ficha/herramientas/todo.sh tab

y, si ya hay titulares o escenas nuevas, pasar las capturas de `capturas/tableta-provisional/` a
`capturas/tableta/`.

## Lo que no es de la app en las capturas

La imagen de la cámara -una imagen puesta donde el teléfono pone la vista previa-, la toma del
visor -una imagen quieta con un registro de voz sintético- y la voz, que es guiada. Detalle en
`evidencia.md`.

## Las personas de las capturas: generadas, no fotos

Javier pidió imágenes aptas para publicidad, con licencia comercial y autorización de modelo
cuando la persona se reconoce. Los bancos gratuitos -Unsplash, Pexels, Burst, Wikimedia- no
garantizan esa autorización, y las fotos CC0 de la primera versión se descartaron. La herramienta
GenerateImage no estaba disponible en esta sesión, así que las cinco se generaron en la box con
**FLUX.1 [schnell]** -Black Forest Labs, licencia Apache 2.0, que permite el uso comercial de lo
generado-, cuantizado por city96 -Apache 2.0-, con stable-diffusion.cpp -MIT-. No son personas
reales, así que no hay a quién pedirle una autorización de modelo.

| | Quién | Dónde sale |
|---|---|---|
| A | mujer de unos 30, pelo oscuro largo, suéter crema | captura 2 -Grabar, cámara detrás- |
| B | hombre de unos 60, barba gris, lentes | captura 3 -recuadro- y tableta 7" Grabar |
| C | hombre de unos 25, pelo negro, polera verde oliva | tabletas de lado, 7" y 10" |
| D | mujer de unos 55, pelo gris corto, delantal, en la cocina | captura 6 -visor- y tableta 10" Grabar |
| E | mujer de unos 40, polera mostaza, en el sofá | captura 4 -de lado- |

Se revisó cada una: manos, ojos, dientes, orejas y el fondo, que no tuviera texto. Se rehicieron
dos -la C, dos veces, y la E-, y se recortaron tres -A y C por manos mal dibujadas, E por un
borde que distraía-. La C recortada es la más blanda: en las tabletas de lado se nota un poco. El modelo, la semilla y el prompt de cada una, y
qué se rehizo, están en `herramientas/fuente/LICENCIA-personas.txt`. Para cambiar una persona, se
reemplaza `fuente/persona-X.png`, con el mismo tamaño, y se corre `todo.sh`.

## Video de YouTube -opcional, no se hizo-

Treinta segundos, grabados con Sigo en un teléfono de verdad: alguien abre el guion del pan, da
Grabar y habla mirando a la cámara; se ve el texto avanzar con su voz, detenerse cuando hace una
pausa y seguir cuando retoma. Corte a la toma guardada, con los subtítulos en Amarillo. Cierre con
la marca Sig●. Sin música encima de la voz: lo que vende es que el texto la sigue.
