// ARMAR LOS REGISTROS DE LAS TOMAS LARGAS -banco-largo, 17-10-2026-.
//
//   node docs/registros/largas/armar.mjs <salida de transcribir.py> <palabras.json> <bitacora.motor.txt> <destino>
//
// transcribir.py -rama motor-investigacion, docs/mediciones/toma-25-min/herramientas/- pasa el audio de
// una toma por Vosk como el teléfono y escribe un registro con los 'oyo' y un 'cuadro' cada 16 ms en
// pos=0 -el reloj de los cuadros para repetirLectura-; las palabras de los finales, con su tiempo, las
// deja aparte en palabras.json. El banco necesita las dos cosas en el mismo registro, y la letra y los
// renglones de la pantalla para el renglón vivo. Esto agrega, sin cambiar nada de lo que escribió
// transcribir.py:
//   - una fila 'palabras FINAL' tras cada 'oyo FINAL', con las palabras de ese final -en palabras.json
//     van seguidas, en el orden de los finales, y cada final tiene tantas como su texto-, en ms;
//   - de la bitácora del teléfono, las líneas de cabecera de la pantalla -letra, columna, donde lees,
//     diseño, idioma- y su fila 'renglones', puesta en el ms 0.
import fs from 'fs'

const [rutaTranscrita, rutaPalabras, rutaBitacora, destino] = process.argv.slice(2)
if (!destino) {
  console.error('uso: node armar.mjs <salida de transcribir.py> <palabras.json> <bitacora.motor.txt> <destino>')
  process.exit(1)
}
const transcrita = fs.readFileSync(rutaTranscrita, 'utf8').split('\n')
const palabras = JSON.parse(fs.readFileSync(rutaPalabras, 'utf8'))
const bitacora = fs.readFileSync(rutaBitacora, 'utf8').split('\n')

const cabeceraPantalla = bitacora.filter((l) => /^# (letra|columna|donde lees|diseño|idioma): /.test(l))
const renglones = bitacora.find((l) => /^\d+\trenglones\t/.test(l))
if (!renglones) throw new Error('la bitácora no trae fila renglones')

const salida = []
let k = 0
let finales = 0
for (const l of transcrita) {
  if (l === 'ms\ttipo\tdetalle') {
    salida.push(l, `0\trenglones\t${renglones.split('\t')[2]}`)
    continue
  }
  salida.push(l)
  if (l.startsWith('# motor de voz:')) {
    salida.push(...cabeceraPantalla, `# armado: docs/registros/largas/armar.mjs, la pantalla y los renglones de ${rutaBitacora.split('/').pop()}`)
    continue
  }
  const c = l.split('\t')
  if (c[1] === 'oyo' && c[2].startsWith('FINAL: ')) {
    const n = c[2].slice(7).split(' ').filter(Boolean).length
    const suyas = palabras.slice(k, k + n)
    if (suyas.length !== n) throw new Error(`faltan palabras para el final de ${c[0]} ms`)
    k += n
    finales++
    salida.push(`${c[0]}\tpalabras\tFINAL: ${suyas.map((p) => `${p.word}@${Math.round(p.start * 1000)}-${Math.round(p.end * 1000)}`).join(' ')}`)
  }
}
if (k !== palabras.length) throw new Error(`sobran palabras: ${palabras.length - k}`)
fs.writeFileSync(destino, salida.join('\n'))
console.log(`${destino}: ${finales} finales, ${k} palabras`)
