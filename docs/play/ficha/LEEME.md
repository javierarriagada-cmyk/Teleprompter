# La ficha de Sigo en Google Play — tarea 86

Todo lo que se sube a Play Console, listo para revisar. Nada de esto toca la app.

| Qué | Archivo | Para Play |
|---|---|---|
| Nombre, descripción breve -tres propuestas- y completa, con conteos | `textos-es-419.txt`, `textos-en-US.txt` | se copia lo que va entre dobles corchetes |
| Gráfico de funciones, tres propuestas por idioma | `grafico-1024x500-{es,en}-{A,B,C}.png` | se sube uno por idioma |
| 8 capturas de teléfono por idioma, en orden | `capturas/es-419/01..08.png`, `capturas/en-US/01..08.png` | en ese orden |
| Tabletas de 7" y 10", 4 por idioma | `capturas/tableta-provisional/…` | PROVISIONALES, ver abajo |
| La lámina para elegir | `lamina-ficha.png` | no se sube |
| De dónde sale cada cosa que se dice | `evidencia.md` | no se sube |

Ícono: `android/app/src/main/ic_launcher-playstore.png` -512 x 512-. `docs/ic-play-512.png` es viejo.

## Las capturas cuentan una historia

1. Tú hablas. El texto te sigue. · 2. Lee y grábate a la vez · 3. Mírate en un recuadro que mueves ·
4. Gira el teléfono: también de lado · 5. Marca lo importante de tu guion · 6. Tu video, con
subtítulos · 7. Todos tus guiones, a mano · 8. Lee a tu manera. Los titulares están en
`herramientas/titulares.cjs`.

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

La imagen de la cámara -una foto donde el teléfono pone la vista previa-, la toma del visor -foto
quieta con un registro de voz sintético- y la voz, que es guiada. Detalle en `evidencia.md`. Las
fotos y sus licencias: `herramientas/fuente/LICENCIA-persona.txt`.

## Video de YouTube -opcional, no se hizo-

Treinta segundos, grabados con Sigo en un teléfono de verdad: alguien abre el guion del pan, da
Grabar y habla mirando a la cámara; se ve el texto avanzar con su voz, detenerse cuando hace una
pausa y seguir cuando retoma. Corte a la toma guardada, con los subtítulos en Amarillo. Cierre con
la marca Sig●. Sin música encima de la voz: lo que vende es que el texto la sigue.
