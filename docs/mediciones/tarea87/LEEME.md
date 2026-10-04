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
