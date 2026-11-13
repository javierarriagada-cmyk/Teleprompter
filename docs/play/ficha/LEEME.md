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
- Capturas 1, 2, 3 y 5 en español y gráfico en español: las de la fase 1, copiadas byte a byte. El gráfico empieza en «pensar,».
- Breve B en los tres idiomas. La C queda guardada; la de control no se publica.
- 3 en inglés: `en/03-flotante-a`, que no trae la fila en español.
- 5 en inglés y portugués: la misma 05 aprobada en español. **Ojo:** su titular -«Tu video, con subtítulos.»- y el panel están en español dentro de las fichas en inglés y portugués. El texto alternativo lo dice.
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

**Tabletas -pendiente-:** el comprobador ya exige 24 en `capturas/tableta/<idioma>/{7,10}/01-04.png`. Revisa:
- 16:9 exacto y horizontal, lados entre 1080 y 7680, RGB sin alfa;
- el ancho completo de la cruda, sin escalar;
- sin barra de estado ni de tareas;
- que solo se corten filas lisas;
- las cajas excluidas;
- que no se use Ajustes.

El ZIP `adjuntos-grok-tabletas-1.1.zip` no estaba en el equipo de trabajo, así que no hay crudas en `herramientas/entradas/emulador-1.1/` ni salidas.

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
- las tabletas.

### Crítica de diseño sobre la lámina de 270 px

| Captura | Qué funciona | Qué queda débil |
| --- | --- | --- |
| 1 y 2, los tres idiomas | La prueba se lee: el renglón ámbar en la 1 y el texto detenido con el micrófono quieto en la 2. | La 2 en inglés tiene tres franjas oscuras de 285 px, el 14,8 %, justo bajo el límite. La pausa se lee por contraste con la 1, no sola. |
| 3, inglés | La escena entera, como la aprobada en español: banda, tiempo rojo y botón de grabar. | El texto de la ventana no se lee a 270 px. |
| 3, portugués | Es la que más se lee de las tres: la ventana a 1,06×, con «avança com a minha voz» en ámbar. | No se ve el botón de grabar, y la ventana termina a sangre, no en su borde. Es la que más se aparta de la serie. |
| 4 | Se entiende «grabo mientras leo»: el punto rojo, el recuadro chico y el micrófono. | En español, la cara del recuadro es pequeña -1 %-. En inglés y portugués, el recuadro muestra un techo y se lee peor como cámara. |
| 5, inglés y portugués | La misma prueba fuerte de español. | El titular y el panel en español rompen la serie en esas fichas. Lo mejor sería una cruda en cada idioma. |
| 6 | El panel completo con la palma y la ventana flotante. | Mucha interfaz chica: a 270 px, «Control por gestos» apenas se lee. Lo que comunica es el titular. |
| 7 | Se ve el menú abierto con los tres idiomas. | Es una pantalla de ajustes, la menos atractiva de la serie. En inglés asoma «Restore purcha…», recortado, sin precio ni Sigo+. |
| 8 | La tarjeta «Continuar» entera y legible, con Leer y Grabar. | Abajo quedan 271 px de fondo oscuro, el 14,1 %, porque la lista se corta antes del guion de otro idioma. |
| Gráficos en inglés y portugués | Siguen la dirección aprobada; el titular se lee a 540 px. | Igual que en español: el corte izquierdo en «it» o en «pensar,» rompe la regla del borde, aunque esté declarado. |

**Orden:** se mantiene 1 a 8. La 7 es la más floja y podría ir al final si se sacara la 3 portuguesa.
