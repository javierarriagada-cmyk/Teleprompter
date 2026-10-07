# Evidencia de la ficha de Sigo en Google Play — tarea 86

Cada cosa que dicen los textos, los titulares y el gráfico, con el lugar del código que la hace
hoy -rama main en 5efe959; lo sumado el 05-10-2026, en beb2522-. Si algo de aquí deja de ser
cierto, se corrige la ficha.

## Lo que se dice y dónde está

| Lo que dice la ficha | Dónde está en el código |
|---|---|
| El texto sigue tu voz, en español y en inglés | `src/motor/MotorNativo.ts:46`, `:67` -asegurarVoz es/en- |
| Si haces una pausa, espera | `src/lib/avance.ts:43`, `:300` -motivoFreno 'silencio'- |
| Una línea bajo lo que lees | el seguidor, `src/lib/seguidor.ts`; se ve en las capturas 1 a 4 |
| ~~Español sin internet desde la instalación~~ -ya no es cierto desde la tarea 104- | ~~`android/model-es/build.gradle:18` -deliveryType 'install-time'-~~ |
| ~~Inglés: el modelo se baja de Play una vez y después funciona sin internet~~ | ~~`android/model-en/build.gradle:18` -'on-demand'- y `src/textos/es.ts:202` -vozSinConexion-~~ |
| La voz de tu idioma se descarga sola la primera vez que abres Sigo; después funciona sin internet -tarea 104- | `android/model-es/build.gradle` y `android/model-en/build.gradle` -los dos 'on-demand'-; `src/lib/vozAPedido.ts` -se pide en silencio al abrir-; `src/textos/es.ts`, vozSinConexion |
| La voz se reconoce en el teléfono | `src/textos/es.ts:195` -microfonoExplicacion-; `sitio/fuente/textos/es.js:78` -privacidad- |
| No hay cuentas | `sitio/fuente/textos/es.js:80`; no hay inicio de sesión en `src/` |
| Leer arriba o al medio | `src/components/FichasListo.tsx:293` |
| La cámara detrás, en recuadro u oculta | `src/components/FichasListo.tsx:216-220`, `src/lib/camara.ts:39` -FondoToma-, `src/components/TeleprompterView.tsx:221`, `:315` |
| El recuadro se mueve | `src/components/RecuadroCamara.tsx:4`, `:9` -recuadroX/recuadroY- |
| La vista previa va detrás del texto | `src/lib/camara.ts:192-206` -CameraPreview.start, toBack, cover- |
| Cámara frontal o trasera | `src/components/FichasListo.tsx:248` -voltearCamara- |
| 1080p, 720p o 480p | `src/components/FichasListo.tsx:139`, `:356` |
| En vertical o de lado | `src/styles-horizontal.css:8`, `:117`; `src/hooks/useLayout.ts:19-20` |
| En teléfono o tableta -05-10- | `src/hooks/useLayout.ts:28`, `:72` -'tab-v' y 'tab-h'-; `src/styles-tableta.css`; decisión T1, tarea 83 |
| Lo que pasa en la pausa no queda en el video -05-10- | `src/lib/pausaToma.ts:57-63` -Pausa abre el corte-; `src/lib/tramos.ts:18` -tramosACortar-, `:79` -duracionFinal-; decisión F10 |
| Palma para pausar o seguir; la V para terminar -05-10- | `src/lib/confirmadorGestos.ts:26-27` -Open_Palm y Victory de MediaPipe-; `src/lib/pausaToma.ts:65-74` -la palma pausa; la V grabando no hace nada-, `:95` -en pausa, la V termina-; `src/App.tsx:1850` -solo con la cámara frontal-; decisión F11 |
| Seis filtros: Natural, Cálido, Frío, Vivo, Suave y B/N -05-10- | `src/lib/filtros.ts:25-32` -TONOS-; `src/textos/es.ts:88-93`, `src/textos/en.ts:78-83` |
| Se eligen mirando el video; lo que ves es lo que se guarda -05-10- | `src/components/SelectorFiltro.tsx` -la tira en el visor-; la misma matriz al `<video>` -`src/lib/filtros.ts:141`, valoresFeColorMatrix- y al archivo -`:162`, matrizParaMedia3; `MatrizDeColor.java`-; `src/components/ReproductorGrabacion.tsx:449-462` -con filtro se guarda por la receta- |
| Cinco combinaciones de colores de lectura -05-10- | `src/datos/modelo.ts:63-69` -PAREJAS_COLOR-; `src/components/PantallaAjustes.tsx:37-44` |
| Los gestos se reconocen en el teléfono; ninguna imagen sale de él -05-10- | `android/.../GestosPlugin.java:29-39` -el cuadro de la vista previa se reconoce con MediaPipe y el modelo de assets, en un hilo del teléfono- |
| Sigo no envía estadísticas de uso -05-10- | `android/app/src/main/AndroidManifest.xml:62-77` -se quita el backend cct de datatransport-; `android/app/build.gradle:256-275`; decisión F11 |
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
| Guiones y ajustes en la copia de seguridad de Android; vuelven al reinstalar | ver "La copia de seguridad", abajo |
| Los videos no entran en la copia | `android/app/src/release/res/xml/reglas_respaldo.xml`: solo se incluyen IndexedDB, Local Storage, sharedprefs y el archivo de idioma; `files/grabaciones` no se nombra |

## La copia de seguridad -tarea 84, E1 y E2-

**Corrección.** La primera versión de esta ficha decía que el respaldo no estaba comprobado, porque
solo miré `android/app/src/main/res/xml`. Me equivoqué: las reglas están en el conjunto `release`,
que es la versión de Play, y la tarea 84 sí las probó.

- `android/app/src/release/AndroidManifest.xml:8-9`: `android:dataExtractionRules="@xml/reglas_respaldo"`
  -Android 12 o más- y `android:fullBackupContent="@xml/respaldo_completo"` -Android 10 y 11-.
- `android/app/src/release/res/xml/reglas_respaldo.xml` y `respaldo_completo.xml`: incluyen solo
  `app_webview/Default/IndexedDB/` -los guiones-, `app_webview/Default/Local Storage/` -los ajustes-,
  las sharedprefs y el archivo de idioma de AppCompat. Dejan fuera los blobs de IndexedDB, los
  modelos de voz, las tomas -`files/grabaciones`- y los cachés. El comentario del XML dice qué se
  comprobó, y lo dejó así el commit 14b955e.
- **Prueba con bmgr, 29-09-2026**, emulador con Android 15 y LocalTransport. Está en el PR #58,
  sección E2:
  `bmgr enable true` → `bmgr transport …LocalTransport` → abrir la app → `bmgr backupnow
  com.sigoteleprompter.app` (Success) → `adb uninstall` → `bmgr autorestore true` → reinstalar con
  bundletool (restoreAtInstall). El log `FullBackup_native` de la copia -se guardó en la box como
  bmgr2.log- muestra que entraron `Local Storage/leveldb/*`,
  `IndexedDB/https_localhost_0.indexeddb.leveldb/000003.log` y `shared_prefs/*`, y la carpeta
  `.blob` no. Según el PR #58, al reinstalar volvieron la base y el localStorage con su contenido.
- Tarea 85, commit 1e5fabf: después de restaurar, las tomas cuyo video no volvió no aparecen.

**Qué dice la ficha, y qué no.** Dice que los guiones y los ajustes entran en la copia de seguridad
de Android, que vuelven al reinstalar si la copia de seguridad de Google está activada, y que los
videos no entran. No promete el paso de un teléfono a otro. Las reglas de `device-transfer` existen,
pero no se probaron.

**Salvedades:**
- La prueba fue en el emulador de la box. Ahí el WebView se caía al dibujar, así que la base
  IndexedDB se puso a mano con `adb root`; la carpeta Local Storage sí la creó el WebView.
- El PR #58 anota que falta verlo con guiones reales en el moto g86.
- El log de la restauración no quedó guardado en un archivo: el que hay, bmgr3.log, es un intento
  fallido de reinstalación. El resultado bueno está escrito en el PR #58 y en el comentario del XML.
- La copia en la nube depende de que la persona tenga activada la copia de seguridad de Google en
  su teléfono. La ficha lo dice.

## Lo que NO se dice, y por qué

- **Que el paso a otro teléfono conserva los guiones.** No se probó; ver arriba.
- **"Sin internet" como titular.** Javier pidió que sea una posibilidad, no el titular. Va al final
  de la completa, con el detalle del inglés: la voz se baja de Play una vez.
- Bluetooth, nube propia, cuentas, otros idiomas, iPhone, precios, "el mejor": nada de eso existe o
  corresponde -docs/tarea86.txt-.
- **Que la V termina grabando.** Solo termina en pausa -`src/lib/pausaToma.ts:74`-. La línea que
  pidió Javier dice "muestra la palma para pausar o seguir, y la V para terminar", sin el "en pausa".
- **Que los gestos funcionan con la cámara trasera.** Solo con la frontal -F11-; la ficha no lo dice
  ni lo niega.
- Antes del 05-10-2026 esta lista decía también "gestos" y "tabletas": la tarea 88 trajo los gestos
  y la 83 la tableta, y ya están en main.

## Lo que en las capturas no sale de la app

- **La imagen de la cámara.** En el teléfono la vista previa nativa va detrás del WebView y el
  navegador no la tiene. Se puso una foto donde el teléfono pone la vista previa -método de las
  láminas de la tarea 82-: pantalla completa con la cámara detrás, o el rectángulo del recuadro.
- **La toma del visor -capturas 5 y 6, y la cuarta de cada tableta-** es un video armado con la
  foto quieta, y su registro de voz es sintético: el formato real de `leerCorpus`, con horas de
  palabra inventadas. Los subtítulos que se ven son los que la app dibuja con ese registro. Antes
  -29-09-2026- era la captura 6.
- **Las miniaturas de la tira de filtros -captura 6-.** En el teléfono el cuadro lo saca el nativo
  -`extraerMiniatura`-; en el navegador ese plugin no existe y la app usa la miniatura de la toma
  -`SelectorFiltro.tsx`, "Si el nativo falla, queda el poster"-. Como la toma es una imagen quieta,
  es el mismo cuadro. El filtro de cada miniatura y del video lo pone la app, con la misma matriz.
- **La pausa -captura 4-** sale sin el punto rojo que parpadea. Lo enciende `grabandoVideo`, que
  solo es cierto si arrancó el grabador nativo -`src/lib/tomaVideo.ts:144`-; en el navegador no hay
  grabador y no se finge. Lo demás es la app: Seguir al lado de Parar, y el tacho.
- **La app es la versión de Play.** Vite se levanta con `--mode play` -`.env.play`,
  `VITE_HERRAMIENTAS=0`-: sin panel de diagnóstico ni de corpus, como la que baja la gente.
- **La voz.** Un motor guiado -herramientas/vozGuiada.ts- entrega las palabras del guion como si
  alguien las leyera. El seguidor, el avance y la línea son los de la app.
- **Las personas**: las cinco fueron generadas por computador. No son fotos ni personas reales,
  así que no hace falta autorización de modelo. Origen, modelo, licencia y prompt de cada una:
  `herramientas/fuente/LICENCIA-personas.txt`.

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
