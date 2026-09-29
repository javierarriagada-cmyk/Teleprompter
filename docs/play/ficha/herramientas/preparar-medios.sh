#!/usr/bin/env bash
# LO QUE LA CÁMARA "VE" EN LAS CAPTURAS -tarea 86-. Sale de fuente/persona-v.jpg -vertical- y
# fuente/persona-h.jpg -horizontal-, con ffmpeg:
#   medios/persona-v.jpg y -h.jpg      la imagen de la cámara, ya recortada a 9:16 y 16:9
#   medios/toma-es.mp4 y toma-en.mp4    la toma de ejemplo del visor -captura 6-, con sonido mudo
#   medios/miniatura-*.jpg              su miniatura
# medios/ no va al repositorio -.gitignore-: se rearma con este guion.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p medios
# Dos fotos y no una: la vertical es 2:3 y, recortada a 16:9 para el teléfono de lado, dejaba
# solo la cara, más cerca de lo que se ve nunca con la cámara frontal. La horizontal es 3:2.
ffmpeg -loglevel error -y -i fuente/persona-v.jpg -vf "crop=ih*9/16:ih,scale=1080:1920" -q:v 2 medios/persona-v.jpg
ffmpeg -loglevel error -y -i fuente/persona-h.jpg -vf "crop=iw:iw*9/16,scale=1920:1080" -q:v 2 medios/persona-h.jpg
for l in es en; do
  ffmpeg -loglevel error -y -loop 1 -i medios/persona-v.jpg -f lavfi -i anullsrc=r=44100:cl=mono -t 42 -r 30 \
    -vf "scale=1080:1920,format=yuv420p" -c:v libx264 -preset veryfast -crf 28 -c:a aac -shortest medios/toma-$l.mp4
  cp medios/persona-v.jpg medios/miniatura-$l.jpg
done
ls -la medios
