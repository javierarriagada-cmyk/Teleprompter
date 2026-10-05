#!/bin/sh
# Los videos de mentira del boceto -tarea 87-. No van al repositorio -.gitignore-: se generan con
# ffmpeg, a 1 cuadro por segundo para que pesen poco. Vertical 9:16 de 50 s y de 5 min, horizontal
# 16:9 de 50 s. Uso: sh videos.sh
set -e
cd "$(dirname "$0")"
mkdir -p videos
hacer() { # $1 nombre, $2 tamaño, $3 segundos
  [ -f "videos/$1.mp4" ] || ffmpeg -loglevel error -y -f lavfi -i "gradients=s=$2:d=$3:r=1:c0=0x3a4a5a:c1=0x0d1114:x0=0:y0=0:x1=200:y1=640" -c:v libx264 -pix_fmt yuv420p -g 30 "videos/$1.mp4"
}
hacer vertical-50s 360x640 50
hacer vertical-5min 360x640 300
hacer horizontal-50s 640x360 50
