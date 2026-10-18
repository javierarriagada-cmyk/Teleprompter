// Medicion 132: arma palabras34.json y toma-34-min.repetir.motor.txt desde la bitacora del telefono de 34 min.
import fs from 'fs'
import path from 'path'
const R = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'))
const lineas = fs.readFileSync(path.join(R, 'bitacora34.motor.txt'), 'utf8').split('\n').map((l) => l.replace(/\r$/, ''))

// 1. palabras
const palabras = []
let filas = 0
for (const l of lineas) {
  const m = /^(\d+)\tpalabras\tFINAL: (.*)$/.exec(l)
  if (!m) continue
  filas++
  for (const t of m[2].trim().split(' ')) {
    const k = /^(.*)@(-?\d+)-(-?\d+)$/.exec(t)
    if (!k) { console.error('token raro en fila', m[1], JSON.stringify(t)); continue }
    palabras.push({ word: k[1], start: Number(k[2]) / 1000, end: Number(k[3]) / 1000 })
  }
}
fs.writeFileSync(path.join(R, 'palabras34.json'), JSON.stringify(palabras))
console.log('filas palabras:', filas, 'palabras:', palabras.length)
let desorden = 0
for (let i = 1; i < palabras.length; i++) if (palabras[i].start < palabras[i - 1].start) desorden++
console.log('start decreciente entre palabras consecutivas:', desorden)

// 2. registro: preambulo (hasta la fila de titulos 'ms tipo detalle') tal cual
const iTit = lineas.findIndex((l) => l === 'ms\ttipo\tdetalle')
if (iTit < 0) throw new Error('sin fila de titulos')
const pre = lineas.slice(0, iTit + 1)
let ultimoMs = 0, orden = 0
const reales = []
for (const l of lineas.slice(iTit + 1)) {
  const m = /^(\d+)\t(\S+)\t/.exec(l)
  if (!m) { if (l !== '') console.error('linea rara', JSON.stringify(l.slice(0, 80))); continue }
  const ms = Number(m[1])
  if (ms > ultimoMs) ultimoMs = ms
  if (m[2] === 'cuadro' || m[2] === 'cuadros') continue
  reales.push({ ms, orden: orden++, l })
}
console.log('ultimo ms:', ultimoMs, 'filas copiadas:', reales.length)
const cuadros = []
for (let ms = 0; ms <= ultimoMs; ms += 16) cuadros.push({ ms, orden: orden++, l: `${ms}\tcuadro\tpos=0.00 calce=0` })
// a igual ms, las filas originales primero y luego el cuadro (como en toma-30-min.motor.txt: 'oyo' y despues 'cuadro')
const todo = reales.concat(cuadros).sort((a, b) => a.ms - b.ms || a.orden - b.orden)
fs.writeFileSync(path.join(R, 'toma-34-min.repetir.motor.txt'), pre.concat(todo.map((f) => f.l)).join('\n') + '\n')
console.log('cuadros:', cuadros.length, 'filas totales:', todo.length)
