# Ficha de Sigo aprobada el 30-10-2026

Javier aprobó ocho imágenes de teléfono, un gráfico y los textos de cada idioma: es-419, en-US y pt-BR. Se conservan el ícono y las 24 imágenes de tabletas. Esta entrega está preparada para revisión final: no está publicada.

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

El generador produce un paquete de revisión; no sobreescribe la ficha canónica. El comprobador exige igualdad SHA-256 de los 31 archivos aprobados: 24 capturas, tres gráficos, tres textos y el CSV alternativo; también verifica los originales utilizados, las tabletas y el ícono. El mapeo entre el paquete de aprobación y el repositorio está en `aprobacion-20261030/manifiesto-repositorio.json`.

Se reprodujeron los 31 archivos idénticos por huella con Pillow 12.0.0. Informe: `aprobacion-20261030/reproduccion-pillow12.json`. Antes de reemplazar material, generar aparte y comparar. Nunca recalcular la lista de aprobación para dar por válido un cambio no aprobado.

## Procedencia y fuentes

`aprobacion-20261030/` conserva la aprobación, validación y manifiesto originales del paquete; sus rutas absolutas son evidencia histórica. `procedencia-relativa.json` identifica las fuentes guardadas en el repositorio. La copia del Escritorio presenta una discrepancia en `comprobacion-recorte-cuenta.jpg`, un auxiliar fuera de la aprobación: los 31 archivos aprobados coinciden en ambas copias. Se usó el paquete del espacio de estética, cuyo SHA256SUMS completo coincide.

Las entradas de la ficha anterior usadas en recortes se conservaron antes de reemplazar la serie, en `herramientas/entradas/anteriores/`. Son entradas fijas, no la salida actual. Eso evita que regenerar recorte una composición nueva en lugar de la anterior. Se guardaron solo los originales utilizados, capturas nativas, logos, cuadro de video, palma y fuentes tipográficas necesarias, con sus licencias.

Voz, ajustes y guiones usan capturas nativas del Motorola. Cámara en español usa un cuadro del video real aprobado. Cámara en inglés/portugués, subtítulos, filtros y horizontal reutilizan composiciones anteriores con personas generadas; no son capturas nuevas del teléfono. La captura nueva de subtítulos quedó pendiente y no bloquea esta entrega.

## Video y medios externos

El MP4 publicitario no forma parte del repositorio ni de la app. Los originales permanecen en `C:/Users/56990/Desktop/Sigo - material aprobado para fichas` y en el paquete de revisión del Escritorio. El único video propuesto para la ficha es el español: https://www.youtube.com/watch?v=dleH1xz_024 (36 segundos). No reemplazarlo ni volver a subirlo. Antes de publicar falta confirmar la aceptación de Play, la inserción y las restricciones en YouTube Studio.

## Historia de las herramientas

Antes: `todo.sh`, `componer.cjs`, `armar-textos.cjs` y `lamina.cjs` capturaban o componían la ficha de 2026-10-25 y podían reemplazar la nueva con textos y escenas anteriores. Sus implementaciones se conservan identificadas como historia; los comandos que escribían están bloqueados, y `todo.sh` ahora llama al generador vigente sobre una salida de revisión. `comprobar.cjs` redirige al comprobador actual (variable `PYTHON` para elegir el entorno).

El LEEME y la evidencia anteriores se conservan en `historial/`. `lamina-ficha.png` pertenece a aquella serie y es histórica; no es la revisión de esta entrega. No usar `escenas.cjs`, `titulares.cjs` ni `textos.cjs` históricos como fuentes actuales del teléfono.
