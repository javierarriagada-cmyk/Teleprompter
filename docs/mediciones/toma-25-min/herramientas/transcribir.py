# TRANSCRIBIR LA TOMA COMO EL TELÉFONO -motor-investigacion, 15-10-2026-.
#
# Pasa audio.flac por Vosk -el mismo modelo de la app, vosk-model-small-es-0.42 con
# --frames-per-chunk=3 en conf/model.conf, como lo deja scripts/bajar-modelo.mjs- imitando el lazo
# de VoskNativoPlugin.java -Oido.run-:
#   - trozos de 20 ms -SEGUNDOS_POR_TROZO 0.02, 320 muestras a 16 kHz-;
#   - acceptWaveForm por trozo; si cierra, getResult -final-, si no, getPartialResult;
#   - se entrega si cerró, si el parcial CAMBIÓ o cada 5 trozos -TROZOS_POR_ENTREGA-;
#   - setWords(true) -palabras con tiempo solo en los finales-; sin gramática;
#   - al terminar, getFinalResult como final.
# Lo que llega a JavaScript es el texto: "partial" de los parciales y "text" de los finales
# -MotorNativo.ts, textoDe-; los vacíos no pasan. El milisegundo de cada 'oyo' es el fin del trozo
# en el reloj del audio -audioFinMs-: en el teléfono llega unas decenas de ms después.
#
# Escribe un registro con el formato de los .motor.txt -el guion en la cabecera, líneas 'oyo' y
# 'cuadro' cada 16 ms con pos=0 para que repetirLectura use el reloj de los cuadros sin arrastres a
# mano-, y aparte las palabras de los finales con su tiempo -palabras.json-.
#
# Uso: python3 transcribir.py <modelo> <audio.flac> <guion.txt> <salida.motor.txt> <palabras.json>
# Necesita Python 3 con vosk, soundfile y numpy -pip install --user vosk soundfile numpy-: es una
# herramienta de la caja, no una dependencia del repositorio.
import sys, json
import soundfile as sf, numpy as np
from vosk import Model, KaldiRecognizer, SetLogLevel

SetLogLevel(-1)
modelo, audio, guion, salida, palabras_json = sys.argv[1:6]
a, sr = sf.read(audio, dtype='int16')
assert sr == 16000, sr
rec = KaldiRecognizer(Model(modelo), 16000)
rec.SetWords(True)
PASO = 320
eventos = []      # (ms, 'parcial'|'FINAL', texto)
palabras = []
ultimo = None
sin_entregar = 0
for i in range(0, len(a), PASO):
    trozo = a[i:i + PASO]
    cerro = rec.AcceptWaveform(trozo.tobytes())
    js = rec.Result() if cerro else rec.PartialResult()
    ms = (i + len(trozo)) * 1000 // 16000
    sin_entregar += 1
    if cerro or js != ultimo or sin_entregar >= 5:
        o = json.loads(js)
        texto = (o.get('text') if cerro else o.get('partial')) or ''
        if texto.strip():
            eventos.append((ms, 'FINAL' if cerro else 'parcial', texto))
        if cerro:
            palabras += o.get('result', [])
        ultimo = None if cerro else js
        sin_entregar = 0
o = json.loads(rec.FinalResult())
fin = len(a) * 1000 // 16000
if (o.get('text') or '').strip():
    eventos.append((fin, 'FINAL', o['text']))
    palabras += o.get('result', [])

with open(salida, 'w', encoding='utf-8') as f:
    f.write('# REGISTRO DEL MOTOR DE UNA TOMA\n# toma: toma-25-min, transcrita en la caja\n# motor de voz: nativo\n')
    f.write('# ---------- GUION, TAL CUAL SE LEYO ----------\n')
    for l in open(guion, encoding='utf-8').read().split('\n'):
        f.write('# | ' + l + '\n')
    f.write('# ---------------------------------------------\n\nms\ttipo\tdetalle\n')
    k = 0
    for t in range(0, fin + 16, 16):
        while k < len(eventos) and eventos[k][0] <= t:
            ms, tipo, texto = eventos[k]
            f.write(f'{ms}\toyo\t{tipo}: {texto}\n')
            k += 1
        f.write(f'{t}\tcuadro\tpos=0.00 calce=0\n')
json.dump(palabras, open(palabras_json, 'w', encoding='utf-8'), ensure_ascii=False)
print('eventos', len(eventos), 'finales', sum(1 for e in eventos if e[1] == 'FINAL'), 'palabras', len(palabras), 'audio s', fin / 1000)
