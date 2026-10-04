# Tarea 87 · Paso 0 · Mediciones de exportación

Aquí van las cifras del paso 0 (`docs/tarea87.txt`, P0-6). Javier hace los ensayos con la APK
de prueba en el moto g86 y Claude arma esta carpeta con lo que Javier le mande.

| Archivo | Qué lleva |
|---|---|
| `registro-sigoexport.txt` | Las líneas tal cual, copiadas o descargadas del panel, o sacadas con `adb logcat -d -v time -s SigoExport "CameraPreview CameraXView"`. |
| `resumen.md` | Una tabla por ensayo con la forma, la rotación, msGuardado y los ms por minuto de toma. Además, las respuestas a vista-4x3, giro y acostado. |
| `captura-listo.png` | Captura de LISTO con la cámara encendida (ensayo vista-4x3). |
| `cuadro-v1080.png` | El primer cuadro de la toma v1080-10s, para compararlo con la captura. |

El formato de las líneas está en `docs/tarea87.txt` (P0-5), en `src/lib/medicionesExport.ts` y en
`android/app/src/main/java/com/sigoteleprompter/app/MedicionExport.java`.

Aquí no va ninguna APK ni ningún video.

## Tarea 87 · implementación (04-10-2026): las líneas nuevas

Estas líneas, como las del paso 0, salen solo con las herramientas encendidas. Van al panel de
mediciones y al logcat (etiqueta `SigoExport`). Se arman en `src/lib/medicionesTarea87.ts`.

| Línea | Cuándo sale | Qué mira Claude |
|---|---|---|
| `evento=orientacion` (`ancho_px alto_px rot_grados orientacion calidad_toma origen`) | Al cortar o recuperar una toma, y al abrir en el visor una toma vieja sin el dato | v1080, v720, v480 y h1080. Un 1920×1080 con `rot_grados=90` o `270` tiene que dar `orientacion=vertical` |
| `evento=bordes` (`arriba_dp abajo_dp … dpr`) | Al abrir el visor | La barra de estado real (se espera 45) y la franja de gestos real. **Anotarla aquí** |
| `evento=visor` (`panel disponible_dp video_alto_dp imagen_alto_dp … acciones_abajo_dp limite_abajo_dp … subtitulo_abajo_dp`) | Cada vez que el visor de pie se acomoda | `acciones_abajo_dp ≤ limite_abajo_dp`, con tres botones y con gestos, panel abierto y cerrado. **`subtitulo_abajo_dp` ≈ `imagen_alto_dp` / 6** (antes /8) |
| `guardado_inicio … margen=0.167` y `evento=capa` (`H_px … caja_abajo_px pintado_abajo_px`) | Al guardar con subtítulos, de pie o de lado, por cualquiera de los dos botones | **La posición de abajo en px: `caja_abajo_px` = `H_px` / 6**: 320 en 1920 (toma vertical), 180 en 1080 (horizontal), 213,3 en 1280. `pintado_abajo_px` algo menor, por el contorno. Antes `margen=0.125` y H/8 (240 y 135) |
| ~~`evento=tiempo_guardado`~~ | **Se sacó** (04-10-2026, Javier simplifica la 87: sin tiempo estimado) | — |
| ~~`guardado_inicio … modo=receta margen=0.350` (Para redes)~~ | **Se sacó** con «Normal / Para redes»: el subtítulo va en una sola posición | — |
| `evento=forma` y `evento=camara` (del paso 0) | Como en el paso 0 | La forma del 480p (¿9:16?) y la vista previa 4:3 contra el video 16:9 |

De lado (tarea 90) la línea `evento=visor` de la 87 no sale: el visor de lado anota en su propio
registro, `visor-lado`. Ahí el subtítulo a 1/6 se mira con una captura de pantalla, caso 1 y caso 2:
el borde de abajo del subtítulo a 1/6 del alto de la imagen. Una APK anterior a esta rama sigue
dibujando el archivo a 1/8.
