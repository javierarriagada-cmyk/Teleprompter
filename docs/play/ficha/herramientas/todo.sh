#!/usr/bin/env bash
# REHACE TODA LA FICHA DE PLAY -tarea 86-. bash docs/play/ficha/herramientas/todo.sh [filtro]
#
# 1. preparar-medios.sh   las fotos de la cámara y la toma de ejemplo -medios/-
# 2. vite                 sirve la app real en 127.0.0.1:5186, si no está ya andando
# 3. capturar.cjs         las pantallas de la app -crudas/-; el filtro elige cuáles, p. ej. "tab"
# 4. componer.cjs         marcos, tabletas y gráficos, en PNG sin alfa
# 5. armar-textos.cjs     los .txt con sus conteos
# 6. lamina.cjs           la lámina de revisión
# 7. comprobar.cjs        OK / FALLA de todo; si algo falla, el guion sale con error
#
# Necesita Node 22, ffmpeg, Chrome o Chromium -CHROME=...- y puppeteer-core
# -PUPPETEER=/ruta/a/puppeteer-core, como en docs/pantallas/tarea82/herramientas-.
#
# -05-10-2026- Sin CHROME y sin /usr/bin/google-chrome, usa el Chromium que instala Playwright
# -/opt/pw-browsers/chromium-*/chrome-linux/chrome, el de las sesiones en la nube-. puppeteer-core lo
# maneja igual: los dos hablan el mismo protocolo. Ese Chromium no trae H.264: por eso la toma de
# ejemplo va en VP9 -preparar-medios.sh-.
set -euo pipefail
cd "$(dirname "$0")"
RAIZ="$(cd ../../../.. && pwd)"
if [ -z "${CHROME:-}" ] && [ ! -x /usr/bin/google-chrome ]; then
  for c in /opt/pw-browsers/chromium-*/chrome-linux/chrome; do
    [ -x "$c" ] && export CHROME="$c"
  done
fi
bash preparar-medios.sh
if ! curl -s -o /dev/null http://127.0.0.1:5186/; then
  # Se levanta aparte y se apaga al final: no queda nada andando.
  # Se llama al vite.js directo -con exec, sin npx- para que el kill del final lo apague a él.
  # -05-10-2026- CON --mode play: la app de las capturas es la versión de Google Play -.env.play,
  # VITE_HERRAMIENTAS=0-, sin panel de diagnóstico ni de corpus. Antes, sin --mode: la del navegador,
  # con las herramientas de prueba a un toque. Si vite ya está andando, tiene que ser en modo play.
  (cd "$RAIZ" && exec node node_modules/vite/bin/vite.js --mode play --host 127.0.0.1 --port 5186 --strictPort > /tmp/sigo-ficha-vite.log 2>&1) &
  VITE=$!
  trap 'kill $VITE 2>/dev/null || true' EXIT
  for _ in $(seq 60); do curl -s -o /dev/null http://127.0.0.1:5186/ && break; sleep 1; done
fi
node capturar.cjs "${1:-}"
node componer.cjs
node armar-textos.cjs
node lamina.cjs
node comprobar.cjs
