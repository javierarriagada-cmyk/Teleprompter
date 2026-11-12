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
  - recorte ≤ 820 px y escala ≥ 1,3 en las capturas 1 a 5;
  - texto < 20 % por las cajas de `contenidos.json`, e interfaz ≥ 50 % en 1 a 3;
  - titulares de dos renglones y la cara solo en 3, 4 y 5;
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

### La crítica de la 1.0, repetida sobre la dirección 1.1

| Hallazgo de la 1.0 | En la dirección 1.1 |
| --- | --- |
| 🔴 El diferencial -te espera y sigue contigo- no tenía captura | Captura 2, entre las tres primeras: la lectura detenida en «pensar, me espera.», con el subrayado quieto. |
| 🔴 La pantalla entera dentro de un marco, ilegible en miniatura | Sin marco. Recortes de 540 a 750 px de ancho de la cruda, ampliados de 1,44 a 2 veces. A 270 px se lee la prueba de cada titular: ver `lamina-miniaturas-270.png`. |
| 🟡 La 02, con un recuadro de unos 60 px y una persona generada | No hay personas generadas. La cara real sale solo en la 3 y la 5, nunca como lo más grande. La escena del recuadro -4- llega terminada en la fase 2. |
| 🟡 La 06, velocidad fija, era un panel denso | Sale del teléfono y pasa a la descripción, en la fase 2. |
| 🟡 La 08, horizontal, con una franja útil de 150 px | Sale del teléfono y pasa a las tabletas y a la descripción, en la fase 2. |
| 🔴 La ventana flotante no existía en la ficha | Captura 3, entre las tres primeras, sin rótulo de «nuevo». |
| El rótulo chico de arriba a la derecha | Eliminado. |
| La bajada gris no se leía en miniatura | Es opcional. La 1 no la lleva, y en las demás no hace falta para entender. |

**Lo que todavía se puede mejorar:**
- En la 2, la mitad de abajo es el negro real de la app.
- En la 3, la cámara se reconoce por la cara detrás de la ventana translúcida y la barba debajo. El botón de grabar no entra sin achicar la ventana.
- En el gráfico, el trozo de lectura corta palabras en los bordes, como en las capturas.

**Orden:** se mantiene el del encargo. Como propuesta, sin aplicar: probar la 2 como primera en un experimento de ficha -answer/6227309-. En Ads, «Te sales, vuelves y te sigue» dio 40,0 y «Te espera si te detienes» 33,8, contra 35,7 de «Tú hablas. Sigo te sigue.». Son datos en aprendizaje, así que se probaría una sola cosa a la vez.
