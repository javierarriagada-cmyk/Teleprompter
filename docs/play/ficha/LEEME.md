# Ficha de Sigo 1.1 -rama `fichas-1.1`, fase 2, 12-11-2026, en revisión-

> **Fase 2 -12-11-2026, t169u-:** las rutas canónicas -`capturas/`, `grafico-1024x500-*.png`, `textos-*.txt` y el CSV- son ahora la ficha 1.1, descrita en «Ficha 1.1, fase 2», al final. La ficha aprobada el 30-10 pasó con `git mv`, sin cambiar un byte, a `historial/ficha-1.0-20261030/`, y `verificar_ficha.py` la sigue comprobando allí con sus huellas aprobadas. **Nada de esto se subió a Play.**
>
> Antes -12-11-2026-: el título era «Ficha de Sigo aprobada el 30-10-2026» y esta nota decía: «Rama `fichas-1.1`, 12-11-2026: dirección de la fase 1 de la ficha 1.1, en revisión. Está en `direccion-1.1/` y se describe al final de este archivo. No reemplaza nada de lo aprobado el 30-10: las capturas, los gráficos, los textos, las tabletas, el ícono y el video canónicos siguen idénticos, y `verificar_ficha.py` los comprueba con las mismas huellas.»

Javier aprobó ocho imágenes de teléfono, un gráfico y los textos de cada idioma: es-419, en-US y pt-BR. Se conservan el ícono y las 24 imágenes de tabletas. Esta entrega se envió a revisión por API el 30-10-2026 con autorización de Javier; aún no se ha confirmado su aprobación ni publicación. Evidencia: `envio-20261030.json`.

## Material para Play

> Antes -12-11-2026-: esta lista describe la ficha 1.0. Desde la fase 2 esos archivos están en `historial/ficha-1.0-20261030/`, con las mismas rutas relativas; en las rutas de abajo está ahora la 1.1.

- `capturas/<idioma>/01.png` a `08.png`: teléfono, en ese orden.
- `grafico-1024x500-{es,en,pt}.png`: gráfico de cada idioma.
- `textos-<idioma>.txt`: nombre, descripción breve y completa entre `[[ ]]`.
- `Descripciones de las imagenes.csv`: textos alternativos aprobados.
- `capturas/tableta/<idioma>/{7,10}/`: las imágenes conservadas, cuatro por tamaño e idioma.
- Ícono conservado: `android/app/src/main/ic_launcher-playstore.png`.
- `video-youtube.json`: enlace de español entregado por Javier. Inglés y portugués en pausa; no asignarles el video español.

Orden del teléfono: voz, cámara, subtítulos, gestos, filtros, velocidad fija, guiones y respaldo opcional, horizontal/tabletas. Las fuentes de textos y titulares son `herramientas/contenidos.json`; los medios exactos, `herramientas/entradas/`.

## Regeneración reproducible

Requiere Python 3.12 y Pillow **12.0.0**, en un entorno de herramientas separado. No se agregan dependencias de la app. La versión 13 de Pillow cambia algunos píxeles al reducir las capturas nativas y no reproduce las huellas aprobadas.

Desde la raíz del repositorio, por ejemplo en PowerShell:

```powershell
python -m venv .herramientas/ficha-python
.herramientas/ficha-python/Scripts/python.exe -m pip install -r docs/play/ficha/herramientas/requirements.txt
.herramientas/ficha-python/Scripts/python.exe docs/play/ficha/herramientas/armar_ficha.py --salida .herramientas/ficha-revision
.herramientas/ficha-python/Scripts/python.exe docs/play/ficha/herramientas/verificar_ficha.py --generada .herramientas/ficha-revision
```

El generador produce un paquete de revisión; no sobreescribe la ficha canónica. Desde el 12-11-2026 acepta `--alcance 1.0`, `1.1` o `todo` -por defecto-. Lo mismo hace el comprobador. El comprobador exige igualdad SHA-256 de los 31 archivos aprobados: 24 capturas, tres gráficos, tres textos y el CSV alternativo; también verifica los originales utilizados, las tabletas y el ícono. El mapeo entre el paquete de aprobación y el repositorio está en `aprobacion-20261030/manifiesto-repositorio.json`.

Se reprodujeron los 31 archivos idénticos por huella con Pillow 12.0.0. Informe: `aprobacion-20261030/reproduccion-pillow12.json`. Antes de reemplazar material, generar aparte y comparar. Nunca recalcular la lista de aprobación para dar por válido un cambio no aprobado.

## Procedencia y fuentes

`aprobacion-20261030/` conserva la aprobación, validación y manifiesto originales del paquete; sus rutas absolutas son evidencia histórica. `procedencia-relativa.json` identifica las fuentes guardadas en el repositorio. La copia del Escritorio presenta una discrepancia en `comprobacion-recorte-cuenta.jpg`, un auxiliar fuera de la aprobación: los 31 archivos aprobados coinciden en ambas copias. Se usó el paquete del espacio de estética, cuyo SHA256SUMS completo coincide.

Las entradas de la ficha anterior usadas en recortes se conservaron antes de reemplazar la serie, en `herramientas/entradas/anteriores/`. Son entradas fijas, no la salida actual. Eso evita que regenerar recorte una composición nueva en lugar de la anterior. Se guardaron solo los originales utilizados, capturas nativas, logos, cuadro de video, palma y fuentes tipográficas necesarias, con sus licencias.

Voz, ajustes y guiones usan capturas nativas del Motorola. Cámara en español usa un cuadro del video real aprobado. Cámara en inglés/portugués, subtítulos, filtros y horizontal reutilizan composiciones anteriores con personas generadas; no son capturas nuevas del teléfono. La captura nueva de subtítulos quedó pendiente y no bloquea esta entrega.

## Video y medios externos

El MP4 publicitario no forma parte del repositorio ni de la app. Los originales permanecen en `C:/Users/56990/Desktop/Sigo - material aprobado para fichas` y en el paquete de revisión del Escritorio. El único video enviado para la ficha es el español: https://www.youtube.com/watch?v=dleH1xz_024 (36 segundos). No reemplazarlo ni volver a subirlo. Play aceptó el campo de video en el envío. No se comprobaron por separado la inserción ni las restricciones en YouTube Studio. El CSV de textos alternativos no fue cargado: la API utilizada no ofrece ese campo.

## Historia de las herramientas

Antes: `todo.sh`, `componer.cjs`, `armar-textos.cjs` y `lamina.cjs` capturaban o componían la ficha de 2026-10-25 y podían reemplazar la nueva con textos y escenas anteriores. Sus implementaciones se conservan identificadas como historia; los comandos que escribían están bloqueados, y `todo.sh` ahora llama al generador vigente sobre una salida de revisión. `comprobar.cjs` redirige al comprobador actual (variable `PYTHON` para elegir el entorno).

El LEEME y la evidencia anteriores se conservan en `historial/`. `lamina-ficha.png` pertenece a aquella serie y es histórica; no es la revisión de esta entrega. No usar `escenas.cjs`, `titulares.cjs` ni `textos.cjs` históricos como fuentes actuales del teléfono.

## Dirección 1.1, fase 1 -12-11-2026, en revisión-

Es la propuesta en español que Javier revisa antes de la fase 2. **No es material para subir a Play todavía.**

- `direccion-1.1/capturas/es-419/01.png`, `02.png`, `03.png` y `05.png`: 1080×1920, RGB de 24 bits sin alfa.
- `direccion-1.1/grafico-1024x500-es.png`: 1024×500, RGB sin alfa.
- `direccion-1.1/descripciones-breves-1.1.txt`: tres breves por idioma, como opciones. La canónica de `textos-*.txt` no cambia.
- `direccion-1.1/lamina-tamano-real.png`: las cuatro capturas y el gráfico, a tamaño real.
- `direccion-1.1/lamina-miniaturas-270.png`: las capturas a 270 px de ancho, junto a la 1.0 y a dos referentes.
- `direccion-1.1/procedencia.json`: de qué cruda, con su SHA-256, y de qué recorte sale cada píxel de interfaz.
- `direccion-1.1/medidas.json`: ancho del recorte, escala, % de texto por las cajas declaradas y % de interfaz.
- `direccion-1.1/huellas.json`: huellas propias de esta propuesta, aparte de la aprobación del 30-10.
- `estudio-referentes-1.1.md`: el estudio de seis fichas reales, hecho antes de componer.

**Fuentes:**
- Crudas: `herramientas/entradas/motorola-1.1/es/`, las 15 del primer ZIP copiadas tal cual. Las 07-guiones son RGBA en origen; las salidas son RGB.
- Textos y cajas: `contenidos.json`, clave `direccion-1.1`, agregada al final. La parte aprobada del archivo se comprueba byte a byte contra su huella del 30-10.
- Referentes de la lámina: `herramientas/entradas/referentes/`. Son capturas públicas de Play, solo para comparar; no van en la ficha.

**Regenerar y comprobar** -mismas huellas en Windows y en Linux, Pillow 12.0.0-:

```powershell
.herramientas/ficha-python/Scripts/python.exe docs/play/ficha/herramientas/armar_ficha.py --salida .herramientas/ficha-1.1 --alcance 1.1
.herramientas/ficha-python/Scripts/python.exe docs/play/ficha/herramientas/verificar_ficha.py --generada .herramientas/ficha-1.1 --alcance 1.1
```

- **Cómo se fijan las huellas:** las PNG de la 1.1 se escriben con el zlib clásico de Python y el filtro Up, para que su SHA-256 no dependa de la máquina. El zlib-ng de Pillow sí da bytes distintos según el equipo.
- **El comprobador 1.1 revisa:**
  - las huellas;
  - que cada recorte coincida píxel a píxel con la cruda escalada;
  - procedencia, formato y tamaño;
  - la regla del borde: cada recorte arranca en el margen izquierdo del texto de la app -`margen_texto_app`-, salvo excepción declarada en `excepcion_borde`, que sale como aviso;
  - recorte ≤ 820 px y escala ≥ 1,3 en las capturas 1 a 5; desde la corrección del 12-11, un recorte más ancho se acepta solo con `motivo_escala` y sale como aviso;
  - ninguna franja sin contenido de más de 15 % del alto;
  - texto < 20 % por las cajas de `contenidos.json`, e interfaz ≥ 50 % en 1 a 3;
  - titulares de dos renglones, la cara solo en 3, 4 y 5 y, donde sale, medida y por debajo de 25 %;
  - en el gráfico, el centro libre para el botón de reproducir y el recorte hasta el borde derecho;
  - las palabras prohibidas, los 80 caracteres de las breves y que la breve de control sea la publicada.

**Antes -12-11-2026-:**
- `font()` usaba la maquetación de texto de cada sistema. Ahora fija BASIC, la de Pillow en Windows, y no cambia ningún píxel aprobado.
- Los textos se escribían con el salto de línea del sistema. Ahora van con CRLF explícito, el de las huellas aprobadas.
- Con esto, en Linux la ficha 1.0 se regenera con textos idénticos por huella y PNG idénticos píxel a píxel (diferencia máxima 0), pero no por huella, por la compresión de Pillow. En Windows, donde se aprobó, la huella sigue siendo la referencia.

**Fase 1, qué es nuevo y qué queda igual:** la dirección cubre las capturas 1, 2, 3 y 5 en español, el gráfico en español y las breves. Sin tocar quedan:
- las ocho capturas canónicas de cada idioma;
- los gráficos en inglés y portugués;
- `textos-*.txt` y el CSV de textos alternativos;
- las tabletas, el ícono y el video.

Esa parte, de la 1.0, se reemplaza en la fase 2, después del visto bueno de Javier.

### Corrección de composición -12-11-2026, pedida por Javier-

La dirección quedó aprobada. Se rehicieron las cuatro capturas y el gráfico con seis arreglos; titulares, orden, paleta y tipografía no cambian. La bajada de la 3 ahora termina en punto.

- **Regla del borde:** el texto de la app solo se corta por la derecha. Las lecturas de la 1 y la 2 arrancan en el margen real -x 103 y 106 de la cruda-, así que el recorte mide 960 y 1028 px y se amplía 1,125 y 1,051 veces, no 1,3: con 820 px, «voz,» y «espera.» quedaban cortados.
- **1:** la lectura y el micrófono son dos recortes de 01-voz-b con el mismo ancho y la misma escala, uno debajo del otro, sin franja clara entre ellos.
- **2:** debajo de «Si me detengo a pensar, me espera.» va el micrófono quieto de 02-espera-a, con «00:18 / 00:28». 02-espera-a no tiene halo: el botón mide 75 px de alto, contra 85 en 02-espera-b y 91 en 01-voz-b.
- **3:** 03-flotante-a entera de ancho, reducida a 0,603×: la banda con el guion, el botón rojo de grabar y el tiempo 00:09 de la cámara, y la cara detrás.
- **5:** el panel de 05-d -«Subtítulos Rojo», «Filtro Natural», «Guardar», «Guardar y compartir»- y, encima, el video de 05-a con los subtítulos. 05-d está en pausa en 0:00 y no tiene subtítulos.
- **Gráfico:** 02-espera-a a sangre, de x 600 -el borde de la zona libre- a 1024. Arriba, la lectura con «me espera.»; abajo, el micrófono quieto. **Excepción a la regla del borde:** el recorte arranca en «pensar,», no en el margen. Desde el margen, el renglón mide 1028 px de cruda y en 424 px quedaría a 0,41×, ilegible a 270 px. Cada renglón visible empieza con palabra entera.

Las cifras están en `direccion-1.1/medidas.json`. Para la cara, una caja marcada a mano sobre la cruda; para las franjas, filas lisas seguidas.

### La crítica de la 1.0, repetida sobre la lámina de 270 px corregida

| Hallazgo de la 1.0 | En la dirección 1.1 corregida |
| --- | --- |
| 🔴 El diferencial -te espera y sigue contigo- no tenía captura | Captura 2: «Si me detengo a pensar, me espera.» se lee a 270 px; el micrófono quieto se ve, pero el tiempo «00:18 / 00:28» apenas. |
| 🔴 La pantalla entera dentro de un marco, ilegible en miniatura | Sin marco. A 270 px se leen la lectura de la 1 y la 2, los subtítulos y «Subtítulos Rojo» de la 5 y «pensar, me espera.» del gráfico. La 3 vuelve a ser casi la pantalla entera, para que entre la cámara: se reconoce la banda sobre una cámara que graba, pero su texto no se lee. |
| 🟡 La 02, con un recuadro de unos 60 px y una persona generada | No hay personas generadas. La cara real sale solo en la 3 -10,4 %- y en la 5 -6,6 %-, entera y nunca como lo más grande. |
| 🟡 La 06 y la 08 | Pasan a la descripción y a las tabletas en la fase 2. |
| 🔴 La ventana flotante no existía en la ficha | Captura 3, con el botón rojo de grabar a la vista. |
| El rótulo chico y la bajada | Sin rótulo. La bajada es opcional; el titular basta. |

**Qué queda débil:**
- En la 1 y la 2 el acercamiento es leve -1,125× y 1,051×-, por la regla del borde. Aun así, la prueba se lee mejor que en la 1.0.
- En la 2 hay tres franjas oscuras sin contenido: 270 px entre la bajada y la lectura, 283 entre la lectura y el micrófono y 283 bajo el micrófono. La más alta es el 14,7 % del alto, justo bajo el límite de 15 %. La pausa se nota sobre todo al compararla con la 1.
- En la 3 el texto de la banda no se lee en miniatura: la prueba es la escena, no las palabras.
- En la 5, la cara es lo primero que se mira, aunque el panel ocupa más.
- En el gráfico, el corte izquierdo en «pensar,» rompe la regla del borde, y en medio queda un hueco negro de 134 px, donde «el final.» cae fuera del recorte.

**Orden:** se mantiene el del encargo. Como propuesta, sin aplicar: probar la 2 como primera en un experimento de ficha -answer/6227309-. En Ads, «Te sales, vuelves y te sigue» dio 40,0 y «Te espera si te detienes» 33,8, contra 35,7 de «Tú hablas. Sigo te sigue.». Son datos en aprendizaje, así que se probaría una sola cosa a la vez.

## Ficha 1.1, fase 2 -12-11-2026, t169u, en revisión-

Javier aprobó la fase 1 tal como quedó en `1ec2fd7` y pidió la ficha completa en los tres idiomas. **No se subió nada a Play, no se tocó la app y el PR no se fusiona.**

**Qué hay y dónde:**
- `capturas/{es-419,en-US,pt-BR}/01.png` a `08.png`: 1080×1920, RGB de 24 bits sin alfa.
- `grafico-1024x500-{es,en,pt}.png`: 1024×500, RGB sin alfa. El de español es el aprobado, copiado byte a byte.
- `textos-<idioma>.txt`: nombre igual que en la 1.0; breve **B**; completa de la 1.0 con una sección nueva antes de «TU GUION Y TU IMAGEN»: «ENCIMA DE TU CÁMARA».
- `Descripciones de las imagenes.csv`: un texto alternativo por captura; también los de las tabletas, cuando estén.
- `registro-1.1/`:
  - `breves-1.1.txt`: la B, publicada; la C, guardada para un experimento después de publicar; la de control, sin publicar;
  - `lamina-<idioma>-tamano-real.png`, `lamina-miniaturas-270.png` y, con las tabletas, `lamina-tabletas.png`;
  - `procedencia.json`, `medidas.json` y `huellas.json`.
- Crudas nuevas: `herramientas/entradas/motorola-1.1/{en,pt}/` y `es/06-gestos-panel.png`, `es/07-idioma-menu.png`, copiadas tal cual del segundo ZIP; su LEEME, en `motorola-1.1/LEEME-segundo-zip.txt`.
- Textos, cajas y recortes: `contenidos.json`, clave `ficha-1.1`, agregada al final, después de `direccion-1.1`. La parte aprobada del 30-10 sigue idéntica byte a byte.

**Decisiones de Javier aplicadas:**
- Capturas 1, 2 y 3 en español y gráfico en español: las de la fase 1, copiadas byte a byte. El gráfico empieza en «pensar,».
- Captura 5, en los tres idiomas -t177u, 14-11-2026-: Javier no quiso el cuadro de 05-b -«quiero una en que me vea mejor»- y mandó por el chat un cuadro del video exportado, de la misma sesión: `herramientas/entradas/motorola-1.1/es/05-subtitulos-e-cuadro-video-javier.png`, copiado tal cual -842×1869, RGB, SHA-256 `5b94bc33…73de`-. Trae quemado el subtítulo «Y cuando retomo, sigue / conmigo hasta el final.», con «final» en rojo.
  - Va arriba a todo el ancho de la cruda, filas 463 a 1520, **reducido** -0,713×, sin ampliar- a 600×753 y centrado en [240, 480]. La caja vieja medía 682 de ancho desde x 199; lo que sobra queda con el fondo de la pieza.
  - La prueba que aprobó Javier empezaba en la fila 468. Se bajó 5 filas para dejar el mismo aire arriba del pelo -16 filas de cruda- que bajo el subtítulo -17-. El pelo empieza en la fila 479 y el subtítulo termina en la 1503: los dos quedan enteros.
  - El panel de 05-d, los titulares y las bajadas no cambian. La cara, medida a mano sobre la cruda en [210, 470, 710, 1115], ocupa el 7,9 % de la imagen.
  - El comprobador exige este cuadro, con su huella, arriba y 05-d abajo, en las tres 05.

  > Antes -14-11-2026-: «Captura 5, en los tres idiomas -t171u, 14-11-2026-: el video de arriba sale ahora de `05-subtitulos-b-video-guardado.png`, el mismo video a 0:04, con la boca cerrada y «forma» en rojo en «Hoy te quiero mostrar algo que me cambió la forma de grabar.». Mismo recorte -[130, 700, 1090, 1760]-, escala -0,710×- y posición -[199, 480]- que en la fase 1; el panel de 05-d queda igual. En 05-a se veía hablando, con la boca abierta. La 5 en español ya no es la copia de la fase 1: se arma igual que en inglés y portugués, con el titular y la bajada de la fase 1. La cara, medida con una caja nueva sobre 05-b -[400, 720, 850, 1310]-, ocupa el 6,45 %. El comprobador falla si una 5 vuelve a usar 05-a.»

  > Antes -14-11-2026-: «Capturas 1, 2, 3 y 5 en español y gráfico en español: las de la fase 1, copiadas byte a byte. El gráfico empieza en «pensar,».»
- Breve B en los tres idiomas. La C queda guardada; la de control no se publica.
- 3 en inglés: `en/03-flotante-a`, que no trae la fila en español.
- 5 en inglés y portugués -t170u-: la captura es la de español, píxel por píxel, y solo cambian el titular y la bajada, con el mismo tamaño, lugar y letra:
  - inglés: «Your video, / with subtitles.» y «With the words from your script, in time with your voice.»;
  - portugués: «Seu vídeo, / com legendas.» y «Com as palavras do seu roteiro, no ritmo da sua voz.».
  - Se arma con los mismos dos recortes de las crudas en español -`motorola-1.1/es`, el cuadro de Javier y 05-d; antes -14-11-2026-: «05-b y 05-d», y antes, «05-a y 05-d»- y se comprueba que la zona de la captura sea igual a `capturas/es-419/05.png`; dentro de la app se sigue viendo español -«Subtítulos Rojo», «Guardar»- y el texto alternativo lo dice.

  > Antes -12-11-2026-: «5 en inglés y portugués: la misma 05 aprobada en español. **Ojo:** su titular -«Tu video, con subtítulos.»- y el panel están en español dentro de las fichas en inglés y portugués. El texto alternativo lo dice.»
- 3 en portugués: la ventana recortada por encima de «Pausa / Volver a Sigo». Va a sangre por abajo y por la derecha. Los renglones salen enteros y no queda ni una línea de la fila en español: la caja de esa fila está declarada en `excluye`, y el generador y el comprobador fallan si el recorte la toca. El botón rojo de grabar queda fuera; la cámara se reconoce por el tiempo rojo 00:30. Si a Javier le parece cortada, se quita y la ficha portuguesa queda con siete capturas, sin usar la de otro idioma.
- Portadas, captura 8:
  - inglés: el recorte termina antes del guion «Hola»;
  - portugués: termina antes de «My video for today» y de «Hola».
  - La tarjeta «Continuar» queda entera en los tres idiomas, con título, Leer y Grabar, y se ve el primer guion de la lista, en el mismo idioma.
  - Las cajas excluidas están en `contenidos.json`.

**Composición de 4, 6, 7 y 8 -nuevas-:** misma tipografía, paleta, logo y posiciones de titular que la fase 1; fondo claro en las impares y oscuro en las pares.
- **4, «Graba mirando al lente.»:** lectura con el punto rojo, el recuadro chico y el micrófono, en tres piezas de la misma cruda, con la misma escala. En español, la cara sale entera en el recuadro: 1,0 % de la imagen, por una caja marcada a mano. En inglés y portugués, el recuadro muestra el techo.
- **6, «Pausa con un gesto.»:** el panel de la cámara con «Control por gestos».
- **7, «En tu idioma.»:** Ajustes con el menú de idioma abierto.
- **8, «Tus guiones, contigo.»:** la portada.
- Las cifras de cada una están en `registro-1.1/medidas.json`.

**Gráficos en inglés y portugués:** la misma dirección que el aprobado: 02-espera-pausa a sangre, de x 600 a 1024, y el micrófono quieto debajo.
- Titulares: «It waits. / It follows you.» y «Ele espera. / E segue você.».
- El renglón de arriba arranca en «it» y en «pensar,». Es la misma excepción a la regla del borde que en español, declarada; los de abajo arrancan en el margen.
- «E segue você.» y no «E segue com você.»: la segunda no cabía antes de la zona libre del botón de reproducir.

**Tabletas -12-11-2026, t170u-:** Javier decidió que no van portadas y que **el mismo juego va en los dos lugares de tableta de Play, 7 y 10 pulgadas**. Se suben los mismos archivos `capturas/tableta/<idioma>/NN.png` en los dos lugares.
- Plan de Javier, seis por idioma: 01 ← 10 pulgadas, lectura; 02 ← 10, antes de leer; 03 ← 10, editor; 04 ← 7, lectura; 05 ← 7, antes de leer; 06 ← 7, editor.
- Se entregan **15 de los 18**, cinco por idioma, numerados seguidos:
  - 01, 02 y 03: las de 10 pulgadas, **2528×1422**, los mismos píxeles y huellas que antes, sin escala;
  - 04 ← 7 pulgadas, lectura, y 05 ← 7 pulgadas, editor: **1920×1080**.
- **No se entrega la de 7 pulgadas «antes de leer»,** en ningún idioma. En el alto útil, 1044 filas, el 16:9 es de 1856 de ancho. El botón «Ventana flotante» empieza en la columna 16 y el borde del tiempo termina en la 1879: son 1864 columnas de Sigo. Cualquier recorte de 1856 corta un botón de Sigo, y eso no se hace. No se reemplazó con otra cruda. Si Javier acepta quitar 8 columnas de esos bordes, se agrega como 06.
- **Las de 7 pulgadas:** recorte 16:9 de **1856×1044**, columnas 32 a 1888 y filas 44 a 1088 -todo el alto útil entre la barra de estado y la de tareas-, y ampliación pareja con Lanczos a **1920×1080**, ×1080/1044 -cerca de 3,4 %-. Es la única ampliación permitida, y su motivo está en `contenidos.json`, en `escala.motivo_escala`. A los lados se quitan 32 columnas lisas de fondo por lado.
- **Las de 10 pulgadas:**
  - arriba, la barra de estado -íconos hasta la fila 53- y unas filas lisas de fondo;
  - abajo, la barra de tareas -desde la fila 1488- y unas filas lisas;
  - a los lados, 15 o 16 columnas lisas por lado.
  - Así quedan en 16:9 exacto sin escalar.
- Esquinas: las esquinas redondeadas de la ventana dejan ver el color de la barra de tareas, (17, 19, 24), y su borde suavizado, hasta 2 niveles de ese color. Es sistema: no queda ni un píxel dentro y no cuenta al medir si una franja cortada es lisa.
- No se usa Ajustes ni la portada.
- Crudas: `herramientas/entradas/emulador-1.1/tableta-{10,7}/{es,en,pt}/` y su `LEEME.txt`, copiados tal cual del ZIP (SHA-256 del ZIP `bd4dbcff…5defa7`). Son RGBA de alfa 255 en todos los píxeles: pasarlas a RGB no cambia ningún color.
- Lámina: `registro-1.1/lamina-tabletas.png`, con los 18 lugares del plan, una fila por idioma. La entregada va reducida, con su nombre, tamaño, tableta y escala; la que no se entrega, como cruda atenuada, con «NO SE ENTREGA» y el motivo.
- El CSV trae un texto alternativo por tableta entregada, `tableta/NN.png`, según su cruda.

<details><summary>Antes -12-11-2026-: el apartado de tabletas, antes de t170u.</summary>

**Tabletas -12-11-2026, crudas del emulador-:** se entregan **9 de los 24 lugares**: las de 10 pulgadas 01, 02 y 03 de cada idioma, a **2528×1422**. Los otros 15 no se pueden hacer sin romper una regla. No se reemplazaron con otra cruda ni con otro idioma.
- **Las 12 de 7 pulgadas:** en la cruda de 1920×1200, los íconos de estado llegan hasta la fila 43 y la barra de tareas empieza en la 1088. Entre ambas quedan 1044 filas, y un 16:9 de al menos 1080 de alto no cabe: habría que escalar hacia arriba o dejar una barra del sistema.
- **Las 6 portadas (04), también las de 10 pulgadas:** en la lista de guiones aparece uno en otro idioma:
  - en español, «Hi»;
  - en inglés, «Mi video de hoy»;
  - en portugués, «My video for today» y «Mi video de hoy».
  Esa tarjeta empieza 880 filas debajo de la barra de estado, así que ningún 16:9 de al menos 1080 filas la deja fuera.
  - La tarjeta «Continuar» sí queda entera en las crudas, pero eso no basta.
- El comprobador vuelve a medir estas dos imposibilidades en las crudas:
  - alto útil menor de 1080;
  - ninguna ventana de 1920×1080 entre las barras que esquive la caja del guion.
  Cada lugar sin entregar aparece como aviso, con su motivo.
- Crudas: `herramientas/entradas/emulador-1.1/tableta-{10,7}/{es,en,pt}/` y su `LEEME.txt`, copiados tal cual del ZIP (SHA-256 del ZIP `bd4dbcff…5defa7`). Son RGBA de alfa 255 en todos los píxeles: pasarlas a RGB no cambia ningún color.
- **Cómo se recortan las de 10 pulgadas:**
  - arriba, la barra de estado -íconos hasta la fila 53- y unas filas lisas de fondo;
  - abajo, la barra de tareas -desde la fila 1488- y unas filas lisas;
  - a los lados, 15 o 16 columnas lisas por lado.
  - Así quedan en 16:9 exacto sin escalar. Las esquinas redondeadas de la ventana dejan ver el color de la barra de tareas, (17, 19, 24), y no queda ni un píxel de ese color dentro.
  - Orden: 01 ← 4-lectura-avanza, 02 ← 3-antes-de-leer, 03 ← 2-editor-colores. No se usa Ajustes.
- Lámina: `registro-1.1/lamina-tabletas.png`, con los 24 lugares en el orden de la ficha. La entregada va reducida con su nombre y tamaño; la que no se entrega, como cruda atenuada, con «NO SE ENTREGA» y el motivo.
- El CSV trae los textos alternativos solo de las 9 entregadas.

</details>

> Antes -12-11-2026-: este punto decía «el comprobador ya exige 24 en `capturas/tableta/<idioma>/{7,10}/01-04.png`. Revisa: - 16:9 exacto y horizontal, lados entre 1080 y 7680, RGB sin alfa; - el ancho completo de la cruda, sin escalar; - sin barra de estado ni de tareas; - que solo se corten filas lisas; - las cajas excluidas; - que no se use Ajustes.  El ZIP `adjuntos-grok-tabletas-1.1.zip` no estaba en el equipo de trabajo, así que no hay crudas en `herramientas/entradas/emulador-1.1/` ni salidas.»

**Antes -12-11-2026-:**
- `armar_ficha.py` y `verificar_ficha.py` leían la ficha 1.0 en `capturas/`, `grafico-*`, `textos-*` y el CSV. Ahora la leen en `historial/ficha-1.0-20261030/`, con las mismas huellas.
- La breve de control se comparaba con `textos-*.txt`. Ahora se compara con la de la 1.0, en el historial.

**Regenerar y comprobar:**

```powershell
.herramientas/ficha-python/Scripts/python.exe docs/play/ficha/herramientas/armar_ficha.py --salida .herramientas/ficha-1.1 --alcance 1.1
.herramientas/ficha-python/Scripts/python.exe docs/play/ficha/herramientas/verificar_ficha.py --generada .herramientas/ficha-1.1 --alcance 1.1
```

El comprobador de la ficha 1.1 revisa:
- las huellas de `registro-1.1/huellas.json`, y que lo aprobado en la fase 1 sea idéntico a la dirección;
- cada recorte píxel a píxel contra la cruda escalada, y que esté en la procedencia;
- la regla del borde y las cajas excluidas;
- las franjas sin contenido, hasta el 15 % del alto;
- texto bajo 20 % e interfaz desde 50 % en 1 a 3;
- titulares de hasta dos renglones;
- la cara medida, bajo 25 %, y solo en 3 a 5;
- las palabras prohibidas en los tres idiomas, como palabras enteras -mejor, nuevo, gratis, precio, Sigo+, nunca, siempre, descarga y sus equivalentes-;
- la zona libre del gráfico y que llegue al borde derecho;
- los límites de los textos;
- que la breve sea la B y que no se publiquen ni la C ni la de control;
- que no haya voseo;
- en la 5 en inglés y portugués:
  - que cada caja de recorte sea igual, píxel por píxel, a la de `capturas/es-419/05.png`;
  - que fuera de esas cajas, del logo y de las cajas de texto no haya nada más que el fondo;
  - que cada caja de texto sea exactamente el texto declarado, dibujado de nuevo con la misma letra, tamaño y lugar;
  - que el titular y la bajada no lleven palabras del español de esa pieza;
- las tabletas:
  - el plan de Javier, 6 por idioma, cada lugar entregado o descartado con motivo, y los entregados numerados seguidos en `capturas/tableta/<idioma>/`;
  - 16:9, de 1080 a 7680, RGB sin alfa;
  - recorte exacto de la cruda de su tamaño, su idioma y su lugar; sin escala en 10 pulgadas;
  - en 7 pulgadas, solo la ampliación declarada: 1856×1044 → 1920×1080 con Lanczos, ×1080/1044, y que el archivo sea exactamente esa ampliación;
  - barras medidas en la cruda, no tomadas de `contenidos.json`;
  - que no quede ningún píxel de las esquinas de la ventana -el color de la barra de tareas, a 2 niveles-;
  - que las franjas cortadas sean lisas, ≤ 16 niveles, fuera de esas esquinas;
  - que no se use Ajustes ni la portada;
  - que los descartes sean de verdad imposibles: en la de 7 pulgadas «antes de leer», mide de nuevo en la cruda que el contenido de Sigo es más ancho que 1856.

  > Antes -12-11-2026-: «las tabletas: los 24 lugares, cada uno entregado o descartado con motivo; 16:9, de 1080 a 7680, RGB sin alfa; recorte exacto y sin escala de la cruda de su tamaño, su idioma y su orden; barras medidas en la cruda, no tomadas de `contenidos.json`; que no quede ningún píxel del color de la barra de tareas; que las franjas cortadas sean lisas, ≤ 16 niveles, fuera de ese color; que no se use Ajustes; que los descartes sean de verdad imposibles.»

### Crítica de diseño sobre la lámina de 270 px

| Captura | Qué funciona | Qué queda débil |
| --- | --- | --- |
| 1 y 2, los tres idiomas | La prueba se lee: el renglón ámbar en la 1 y el texto detenido con el micrófono quieto en la 2. | La 2 en inglés tiene tres franjas oscuras de 285 px, el 14,8 %, justo bajo el límite. La pausa se lee por contraste con la 1, no sola. |
| 3, inglés | La escena entera, como la aprobada en español: banda, tiempo rojo y botón de grabar. | El texto de la ventana no se lee a 270 px. |
| 3, portugués | Es la que más se lee de las tres: la ventana a 1,06×, con «avança com a minha voz» en ámbar. | No se ve el botón de grabar, y la ventana termina a sangre, no en su borde. Es la que más se aparta de la serie. |
| 4 | Se entiende «grabo mientras leo»: el punto rojo, el recuadro chico y el micrófono. | En español, la cara del recuadro es pequeña -1 %-. En inglés y portugués, el recuadro muestra un techo y se lee peor como cámara. |
| 5, inglés y portugués | La misma prueba fuerte de español, ahora con titular y bajada en su idioma. «Your video, with subtitles.» y «Seu vídeo, com legendas.» se leen a 270 px. | Dentro de la app sigue el español: los subtítulos «Hoy te quiero mostrar algo…», «Subtítulos Rojo», «Guardar» y «Mi video de hoy». A 270 px casi no se lee, pero a tamaño real sí. La bajada en inglés es la más larga -905 px de caja-. Antes -12-11-2026-: «El titular y el panel en español rompen la serie en esas fichas. Lo mejor sería una cruda en cada idioma.» |
| 6 | El panel completo con la palma y la ventana flotante. | Mucha interfaz chica: a 270 px, «Control por gestos» apenas se lee. Lo que comunica es el titular. |
| 7 | Se ve el menú abierto con los tres idiomas. | Es una pantalla de ajustes, la menos atractiva de la serie. En inglés asoma «Restore purcha…», recortado, sin precio ni Sigo+. |
| 8 | La tarjeta «Continuar» entera y legible, con Leer y Grabar. | Abajo quedan 271 px de fondo oscuro, el 14,1 %, porque la lista se corta antes del guion de otro idioma. |
| Gráficos en inglés y portugués | Siguen la dirección aprobada; el titular se lee a 540 px. | Igual que en español: el corte izquierdo en «it» o en «pensar,» rompe la regla del borde, aunque esté declarado. |

**Tabletas, sobre `lamina-tabletas.png`:**

| Tableta | Qué funciona | Qué queda débil |
| --- | --- | --- |
| 01, 10 pulgadas, la lectura | El renglón ámbar subrayado se lee bien. | El texto ocupa solo el cuarto de arriba; el resto es negro, salvo el micrófono y el tiempo, chicos, en la esquina. Es la más vacía. |
| 02, 10 pulgadas, antes de leer | La mejor: el guion con colores al centro y los controles reales a los lados -Voz, tamaño, Arriba, Auto, Ventana flotante, Más y reproducir-. | Los controles de los lados quedan a pocos píxeles del borde, porque solo había 15 columnas de fondo para cortar a cada lado. |
| 03, 10 pulgadas, el editor | Las palabras en colores se leen grandes. | La tarjeta del guion sigue bajo el borde inferior, como en la app, y el último renglón queda a 10 px del borde. «Leer / Grabar» flotan encima de un renglón, como en la app. |
| 04, 7 pulgadas, la lectura | El texto se ve más grande que en la 01 y llena más la imagen. | El primer renglón visible, «leer mirando hacia abajo.», queda pegado arriba: la lectura sigue sobre la barra de estado, como en la app. La ampliación de 3,4 % suaviza un poco la letra; a tamaño de tienda no se nota. |
| 05, 7 pulgadas, el editor | Igual que la 03, más grande. | Como en la 03, «Leer / Grabar» tapan un renglón y la tarjeta sigue bajo el borde. Es casi la misma imagen que la 03: en cada idioma hay dos parejas parecidas -01 y 04, 03 y 05-, porque es el mismo juego para los dos tamaños. |

- **Falta la de 7 pulgadas «antes de leer»** -lugar 05 del plan-: el contenido de Sigo mide 1864 columnas y el 16:9 de 1044 filas, 1856. Ver arriba.
- En Play, cada idioma tiene **5 capturas de tableta**, las mismas en los dos lugares. Google pide al menos 4 para pantallas grandes (answer/9866151).

<details><summary>Antes -12-11-2026-: la crítica de tabletas, antes de t170u.</summary>

| Tableta de 10 pulgadas | Qué funciona | Qué queda débil |
| --- | --- | --- |
| 01, la lectura | El renglón ámbar subrayado se lee bien. | El texto ocupa solo el cuarto de arriba; el resto es negro, salvo el micrófono y el tiempo, chicos, en la esquina. Es la más vacía de las tres. |
| 02, antes de leer | La mejor: el guion con colores al centro y los controles reales a los lados -Voz, tamaño, Arriba, Auto, Ventana flotante, Más y reproducir-. | Los controles de los lados quedan a pocos píxeles del borde, porque solo había 15 columnas de fondo para cortar a cada lado. |
| 03, el editor | Las palabras en colores se leen grandes. | La tarjeta del guion sigue bajo el borde inferior, como en la app, y el último renglón queda a 10 px del borde. «Leer / Grabar» flotan encima de un renglón, como en la app. |

- **Faltan las portadas y todas las de 7 pulgadas.** Para tenerlas hay que sacar crudas nuevas en el emulador:
  - portadas solo con guiones del mismo idioma;
  - en 7 pulgadas, una pantalla con al menos 1080 filas útiles, por ejemplo con la barra de tareas oculta o en modo de gestos.
- Mientras tanto, en Play, cada idioma tendría 3 capturas de tableta de 10 pulgadas y ninguna de 7. Google pide al menos 4 para pantallas grandes (answer/9866151).

</details>

**Orden:** se mantiene 1 a 8. La 7 es la más floja y podría ir al final si se sacara la 3 portuguesa.
