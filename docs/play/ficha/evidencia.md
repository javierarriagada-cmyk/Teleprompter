# Evidencia de la ficha de Sigo en Google Play — tarea 86

Cada cosa que dicen los textos, los titulares y el gráfico, con el lugar del código que la hace
hoy -rama main en 5efe959-. Si algo de aquí deja de ser cierto, se corrige la ficha.

## Lo que se dice y dónde está

| Lo que dice la ficha | Dónde está en el código |
|---|---|
| El texto sigue tu voz, en español y en inglés | `src/motor/MotorNativo.ts:46`, `:67` -asegurarVoz es/en- |
| Si haces una pausa, espera | `src/lib/avance.ts:43`, `:300` -motivoFreno 'silencio'- |
| Una línea bajo lo que lees | el seguidor, `src/lib/seguidor.ts`; se ve en las capturas 1 a 4 |
| Español sin internet desde la instalación | `android/model-es/build.gradle:18` -deliveryType 'install-time'- |
| Inglés: el modelo se baja de Play una vez y después funciona sin internet | `android/model-en/build.gradle:18` -'on-demand'- y `src/textos/es.ts:202` -vozSinConexion- |
| La voz se reconoce en el teléfono | `src/textos/es.ts:195` -microfonoExplicacion-; `sitio/fuente/textos/es.js:78` -privacidad- |
| No hay cuentas | `sitio/fuente/textos/es.js:80`; no hay inicio de sesión en `src/` |
| Leer arriba o al medio | `src/components/FichasListo.tsx:293` |
| La cámara detrás, en recuadro u oculta | `src/components/FichasListo.tsx:216-220`, `src/lib/camara.ts:39` -FondoToma-, `src/components/TeleprompterView.tsx:221`, `:315` |
| El recuadro se mueve | `src/components/RecuadroCamara.tsx:4`, `:9` -recuadroX/recuadroY- |
| La vista previa va detrás del texto | `src/lib/camara.ts:192-206` -CameraPreview.start, toBack, cover- |
| Cámara frontal o trasera | `src/components/FichasListo.tsx:248` -voltearCamara- |
| 1080p, 720p o 480p | `src/components/FichasListo.tsx:139`, `:356` |
| En vertical o de lado | `src/styles-horizontal.css:8`, `:117`; `src/hooks/useLayout.ts:19-20` |
| Subtítulos Amarillo, Rojo y Formal | `src/lib/subtitulos.ts:268-273` |
| Salen del guion y del tiempo de tu voz | `src/lib/subtitulos.ts:8-14` |
| Las acotaciones no van en los subtítulos | `src/lib/subtitulos.ts:107` |
| Quedan dentro del video al guardarlo | `android/.../CamaraNativaPlugin.java:390`, `:436-438` -Media3 Transformer, OverlayEffect-; `src/lib/archivosNativos.ts:105` |
| Guardar en la galería y compartir | `src/lib/archivosNativos.ts:88`, `:99`; `src/textos/es.ts:99` -Películas- |
| Negrita, tres colores y destacado | `src/components/EditorView.tsx:245-252`, `:511-513` |
| Acotaciones entre [ ] o ( ) | `src/lib/acotaciones.ts:1-12`; el seguidor las marca en `src/lib/seguidor.ts:126` |
| Pegar texto o abrir .txt, .md o .docx | `src/components/EditorView.tsx:200-201`, `:350`; `src/components/BarraEditorVacio.tsx:104`, `:129` |
| Guiones con su duración estimada | `src/datos/modelo.ts:190` -duracionDeLectura- |
| Tamaño, tipografía, ancho y colores de lectura | `src/components/PantallaAjustes.tsx:231`, `:238`, `:245`, `:252`; pasos de letra en `src/components/estiloLectura.ts:26` |
| Espejo para vidrio de teleprompter | `src/textos/es.ts:191` -espejoExplicacion-, `src/components/PantallaAjustes.tsx:260` |
| Tema claro u oscuro | `src/components/PantallaAjustes.tsx:291`, `:444` |
| La app en español y en inglés | `src/components/PantallaAjustes.tsx:297`, `:475` |

## Lo que NO se dice, y por qué

- **Que los guiones se respaldan con la copia de seguridad de Android.** El manifiesto tiene
  `android:allowBackup="true"` -`android/app/src/main/AndroidManifest.xml:14`-, pero no hay
  `dataExtractionRules` ni `fullBackupContent`: en `res/xml` solo están config, file_paths y
  locales_config. Sin reglas, Android respalda todo o nada, y con más de 25 MB -las tomas viven
  en files/- no respalda nada. No está comprobado en un teléfono; hasta que lo esté, no va.
- **"Sin internet" en inglés, a secas.** La voz en inglés se baja de Play una vez. Se dice así.
- Gestos, Bluetooth, nube, cuentas, tabletas, otros idiomas, iPhone, precios, "el mejor": nada de
  eso existe o corresponde -docs/tarea86.txt-.

## Lo que en las capturas no sale de la app

- **La imagen de la cámara.** En el teléfono la vista previa nativa va detrás del WebView y el
  navegador no la tiene. Se puso una foto donde el teléfono pone la vista previa -método de las
  láminas de la tarea 82-: pantalla completa con la cámara detrás, o el rectángulo del recuadro.
- **La toma del visor -captura 6-** es un video armado con la foto quieta, y su registro de voz es
  sintético: el formato real de `leerCorpus`, con horas de palabra inventadas. Los subtítulos que
  se ven son los que la app dibuja con ese registro.
- **La voz.** Un motor guiado -herramientas/vozGuiada.ts- entrega las palabras del guion como si
  alguien las leyera. El seguidor, el avance y la línea son los de la app.
- **Las fotos**: ver herramientas/fuente/LICENCIA-persona.txt.

## Documentación de Google Play que se siguió -consultada el 29-09-2026-

- Activos de vista previa: https://support.google.com/googleplay/android-developer/answer/9866151
  - Gráfico 1024 x 500, JPEG o PNG de 24 bits sin alfa; foco al centro; sin dispositivos; colores
    vivos, no blanco puro, negro ni gris oscuro.
  - Capturas PNG o JPEG sin alfa, lados entre 320 y 3840 px, el mayor no más del doble del menor;
    para las recomendaciones, al menos 4, en 9:16 -1080 x 1920- o 16:9 -1920 x 1080-.
  - Textos promocionales hasta el 20 % de la imagen; sin dispositivos ni dedos; la experiencia real.
  - Tabletas: al menos 4 capturas, entre 1080 y 7680 px, 16:9 o 9:16, sin texto fuera de la app.
  - Descripción breve: sin "mejor", "n.º 1", "gratis", "nuevo", llamados a la acción, emojis,
    puntuación repetida ni MAYÚSCULAS de énfasis.
- Política de metadatos: https://support.google.com/googleplay/android-developer/answer/9898842
- Límites de texto -nombre 30, breve 80, completa 4000-:
  https://support.google.com/googleplay/android-developer/answer/9859152
