# Ficha de Sigo aprobada el 30-10-2026

> **Rama `fichas-1.1`, 12-11-2026: dirección de la fase 1 de la ficha 1.1, en revisión.** Está en `direccion-1.1/` y se describe al final de este archivo. No reemplaza nada de lo aprobado el 30-10: las capturas, los gráficos, los textos, las tabletas, el ícono y el video canónicos siguen idénticos, y `verificar_ficha.py` los comprueba con las mismas huellas.

Javier aprobó ocho imágenes de teléfono, un gráfico y los textos de cada idioma: es-419, en-US y pt-BR. Se conservan el ícono y las 24 imágenes de tabletas. Esta entrega se envió a revisión por API el 30-10-2026 con autorización de Javier; aún no se ha confirmado su aprobación ni publicación. Evidencia: `envio-20261030.json`.

## Material para Play

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
