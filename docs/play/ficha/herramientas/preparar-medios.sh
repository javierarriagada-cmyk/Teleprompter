#!/usr/bin/env bash
# LO QUE LA CÁMARA "VE" EN LAS CAPTURAS -tarea 86-. Sale de las cinco personas de fuente/ -todas
# generadas por computador, ver fuente/LICENCIA-personas.txt-, con ffmpeg:
#   medios/persona-{A,B,D}.jpg          verticales, 1080 x 1920
#   medios/persona-{C,E}.jpg            horizontales, 1920 x 1080
#   medios/toma-es.mp4 y toma-en.mp4    la toma de ejemplo del visor -captura 6-, con sonido mudo
#   medios/miniatura-*.jpg              su miniatura
# medios/ no va al repositorio -.gitignore-: se rearma con este guion.
#
# Qué persona va en qué captura está en capturar.cjs -LISTA-. Varias y no una sola -Javier,
# 29-09-2026-: mujeres y hombres de distintas edades, repartidos entre teléfono y tableta.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p medios
# Las fuentes ya vienen en 9:16 -576 x 1024- o 16:9 -1024 x 576-, como salieron del generador: se
# agrandan, y tres se recortan antes -abajo-. Van detrás del texto, con el velo de la app encima,
# o en el recuadro chico, así que la ampliación casi no se nota; en el visor -la 6- se ve más, y
# ahí va la D, que no se recorta.
# La A se recorta antes -444 x 790, sigue en 9:16-: abajo a la derecha el generador dibujó una mano
# que no calzaba con el brazo. Se revisaron las cinco una por una: se recortaron esta, la C y la E.
declare -A RECORTE=([A]="crop=444:790:78:0," [B]="" [D]="")
for p in A B D; do
  ffmpeg -loglevel error -y -i fuente/persona-$p.png -vf "${RECORTE[$p]}scale=1080:1920:flags=lanczos" -q:v 2 medios/persona-$p.jpg
done
# La C y la E también se recortan, y siguen en 16:9. A la C, 747 x 420, se le quitan las manos
# abiertas hacia la cámara: la izquierda no salió bien dibujada. A la E, 942 x 530, un borde gris
# desenfocado abajo, como un objeto delante de la cámara, que distraía.
RECORTE[C]="crop=747:420:117:0,"
RECORTE[E]="crop=942:530:41:0,"
for p in C E; do
  ffmpeg -loglevel error -y -i fuente/persona-$p.png -vf "${RECORTE[$p]}scale=1920:1080:flags=lanczos" -q:v 2 medios/persona-$p.jpg
done
# La toma del visor es la D -la cocinera-, que calza con el guion del pan.
# En VP9 con Opus dentro del MP4, no en H.264 -05-10-2026, puesta al día de la 86-: el Chromium que
# instala Playwright no trae H.264 -canPlayType('video/mp4; codecs="avc1.42E01E"') da ''- y el visor
# se quedaba esperando el cuadro. VP9 en MP4 lo abren ese Chromium y Chrome. Lo que se ve es lo
# mismo: una imagen quieta. Antes: -c:v libx264 -preset veryfast -crf 28 -c:a aac.
for l in es en; do
  ffmpeg -loglevel error -y -loop 1 -i medios/persona-D.jpg -f lavfi -i anullsrc=r=48000:cl=mono -t 42 -r 30 \
    -vf "scale=1080:1920,format=yuv420p" -c:v libvpx-vp9 -deadline realtime -cpu-used 8 -crf 40 -b:v 0 -c:a libopus -shortest medios/toma-$l.mp4
  cp medios/persona-D.jpg medios/miniatura-$l.jpg
done
ls -la medios
