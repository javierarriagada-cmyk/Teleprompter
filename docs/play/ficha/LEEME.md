# La ficha de Sigo en Google Play — tarea 86

Todo lo que se sube a Play Console, listo para revisar. Nada de esto toca la app.

| Qué | Archivo | Para Play |
|---|---|---|
| Nombre, descripción breve y completa, con conteos | `textos-es-419.txt`, `textos-en-US.txt` | se copia lo que va entre dobles corchetes |
| Gráfico de funciones | `grafico-1024x500-es.png`, `grafico-1024x500-en.png` | uno por idioma |
| 7 capturas de teléfono por idioma, en orden | `capturas/es-419/01..07.png`, `capturas/en-US/01..07.png` | en ese orden |
| Tabletas de 7" y 10", 4 por idioma | `capturas/tableta/{es-419,en-US}/{7,10}/01..04-*.png` | en ese orden, ver abajo |
| La lámina para elegir | `lamina-ficha.png` | no se sube |
| De dónde sale cada cosa que se dice | `evidencia.md` | no se sube |

Ícono: `android/app/src/main/ic_launcher-playstore.png` -512 x 512-. `docs/ic-play-512.png` es viejo.

## Las capturas, en orden

Puesta al día del 05-10-2026, con la app de hoy -main beb2522- y las escenas que pidió Javier:
1. leer siguiendo la voz -Tú hablas. El texto te sigue.- · 2. el guion con formatos -Lo importante,
a la vista- · 3. grabar con la cámara detrás -Mira a la cámara, sin memorizar- · 4. la pausa -Las
pausas no quedan en tu video- · 5. los subtítulos en el visor -Tu video sale con subtítulos- · 6. la
tira de filtros abierta -Elige el filtro mirando tu video- · 7. de lado -¿Grabas de lado? También
funciona.-. El orden y los archivos están en `herramientas/escenas.cjs`; los titulares, en
`herramientas/titulares.cjs`.

Antes -29-09-2026-, ocho, empezando por la persona y lo que le cuesta: 1. Tú hablas. El texto te
sigue. · 2. Mira a la cámara, sin memorizar · 3. Mírate sin perder el hilo · 4. ¿Grabas de lado?
También funciona. · 5. Lo importante, a la vista · 6. Tu video sale con subtítulos · 7. Todos tus
guiones, a mano · 8. Letra y colores, a tu manera. El recuadro, la portada y los ajustes salieron.

## Lo elegido -Javier, 29-09-2026-

- Nombre: se queda igual en los dos idiomas.
- Descripción breve: la A. En es-419 se le sacó "sin internet": el uso sin conexión es una
  posibilidad y va al final de la completa, no en el titular.
- Gráfico: el A, en ámbar -Javier lo dejó a criterio-. La bajada ya no dice "sin internet".
- Las propuestas que no quedaron están en la historia del PR #60.

## La puesta al día -Javier, 05-10-2026-

- La descripción completa suma la tableta, la pausa, los gestos, los seis filtros, las cinco
  combinaciones de colores y que los gestos se reconocen en el teléfono y Sigo no envía
  estadísticas. Lo demás quedó igual. Con eso pasa de 2500 -lo ideal del encargo-: 2813 en es-419 y
  2779 en en-US, de 4000. `comprobar.cjs` lo marca como AVISO, no como falla.
- Capturas nuevas con la app de hoy: 7 de teléfono y 4 por tableta, ya con el diseño de tableta.
- Las capturas se toman de la versión de Play -`vite --mode play`-: sin panel de diagnóstico.

## Cómo se rehace

    bash docs/play/ficha/herramientas/todo.sh

Levanta vite si no está andando -en modo play-, captura la app real con Chrome sin ventana, compone,
arma los textos y la lámina, y termina con `comprobar.cjs`, que imprime OK o FALLA de cada imagen
-tamaño, proporción, lados, sin alfa, peso, que no sobre ninguna, y el aire entre los renglones del
titular, medido en los píxeles con `herramientas/aire.cjs`- y de cada texto -conteos, emojis,
puntuación, palabras que Play no quiere-. Si algo falla, el guion sale con error. Se necesitan
Node 22, ffmpeg, Chrome o Chromium y puppeteer-core -variables CHROME y PUPPETEER si no están donde
el guion las busca-. Sin Chrome, usa el Chromium que instala Playwright -/opt/pw-browsers-; ese no
trae H.264 y por eso la toma de ejemplo va en VP9. Si vite ya está andando en el puerto 5186, tiene
que ser con `--mode play`.

Para cambiar un texto: `herramientas/textos.cjs` y `node herramientas/armar-textos.cjs`. Para cambiar
un titular: `herramientas/titulares.cjs` y `node herramientas/componer.cjs tel`.

## Las tabletas

La tarea 83 está en main: `src/hooks/useLayout.ts` devuelve 'tab-v' y 'tab-h' desde 600 dp de
ancho. Las capturas van en `capturas/tableta/`, con el diseño de tableta: el 7" en 612 x 1088 dp y
el 10" en 810 x 1440 dp, los dos en 9:16 justo -1440 x 2560 y 2160 x 3840-; de lado, girados. La
letra la pone la app: 32 en tableta. A pantalla completa y sin titulares: para pantallas grandes
Play pide no agregar texto que no sea de la app.

Cuatro por tamaño: de pie, leer, grabar con la cámara detrás y el visor con la tira de filtros; de
lado, grabar con la cámara detrás. Se probaron y quedaron fuera leer de lado -casi igual a leer de
pie-, el editor -la barra de formato tapa la cabecera y Leer y Grabar tapan el final del texto- y
el visor de lado -con la toma vertical la tarjeta queda chica junto al video-.

Antes -29-09-2026-, PROVISIONALES en `capturas/tableta-provisional/`: la 83 no estaba en main y se
mostraba el diseño de teléfono más grande, en 576 x 1024 y 720 x 1280 dp, con la letra en 32 a mano.
Eran Leer, Grabar con la cámara detrás, de lado y el editor.

## Lo que no es de la app en las capturas

La imagen de la cámara -una imagen puesta donde el teléfono pone la vista previa-, la toma del
visor -una imagen quieta con un registro de voz sintético- y la voz, que es guiada. En la pausa no
sale el punto rojo que parpadea: lo enciende el grabador nativo, que el navegador no tiene. Las
miniaturas de la tira de filtros son la miniatura de la toma: en el teléfono las saca el nativo del
mismo cuadro. Detalle en `evidencia.md`.

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
| A | mujer de unos 30, pelo oscuro largo, suéter crema | captura 3 -Grabar, cámara detrás- |
| B | hombre de unos 60, barba gris, lentes | captura 4 -la pausa- y tableta 7" Grabar |
| C | hombre de unos 25, pelo negro, polera verde oliva | tabletas de lado, 7" y 10" |
| D | mujer de unos 55, pelo gris corto, delantal, en la cocina | capturas 5 y 6 -el visor-, tableta 10" Grabar y el visor de las dos tabletas |
| E | mujer de unos 40, polera mostaza, en el sofá | captura 7 -de lado- |

Antes del 05-10-2026: A en la 2, B en la 3 -recuadro-, D en la 6 y E en la 4.

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
