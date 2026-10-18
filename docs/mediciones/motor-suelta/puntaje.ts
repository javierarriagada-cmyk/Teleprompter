// EL PUNTAJE DE UN FINAL -motor-suelta, 17-10-2026-. NO cambia el motor.
//
// El mejor puntaje que un final puede sacar en un tramo del guion, con la cuenta de seguidor.ts
// -buscarMejorOffset y puntuarEn: las últimas MAX_PALABRAS_FRASE (12) palabras, una por token desde un
// offset, parecidas con la misma tolerancia de similar, saltando o leyendo la acotación-, SIN la
// penalización por distancia a posPredicha: es una cota de arriba. Si no llega a MIN_COINCIDENCIA (0,5)
// el final no calza en ningún offset del tramo. Imprime el par palabra por palabra del mejor offset.
//
// Uso: npx vite-node docs/mediciones/motor-suelta/puntaje.ts -- <registro.motor.txt> <desde> <hasta> "<final>"
import fs from 'fs'
import leven from 'leven'
import { leerCorpus } from '../../../src/lib/repetidor'
import { tokenizarGuion, normalizar, MAX_PALABRAS_FRASE } from '../../../src/lib/seguidor'
const a = process.argv.slice(2).filter((x) => x !== '--')
const tokens = tokenizarGuion(leerCorpus(fs.readFileSync(a[0], 'utf8')).guion)
const desde = Number(a[1]), hasta = Number(a[2]), frase = normalizar(a[3]).split(' ').filter(Boolean).slice(-MAX_PALABRAS_FRASE)
const freq = new Map<string, number>(); for (const t of tokens) if (!t.esAcotacion) freq.set(t.palabra, (freq.get(t.palabra) || 0) + 1)
const similar = (x: string, y: string) => x === y || leven(x, y) <= Math.max(1, Math.floor(Math.min(x.length, y.length) / 4))
let mejor = { p: -1, off: -1, c: 0, r: 0, salta: true, pares: '' }
for (let off = desde; off <= hasta; off++) for (const salta of [true, false]) {
  let c = 0, ev = 0, idx = off, racha = 0, rmax = 0; const pares: string[] = []
  for (const w of frase) {
    while (salta && idx < tokens.length && tokens[idx].esAcotacion) idx++
    if (idx >= tokens.length) break
    const ok = similar(w, tokens[idx].palabra)
    pares.push(ok ? `${w}=${tokens[idx].palabra}` : `${w}≠${tokens[idx].palabra}`)
    if (ok) { c++; ev += 1 / Math.sqrt(freq.get(tokens[idx].palabra) || 1); racha++; rmax = Math.max(rmax, racha) } else racha = 0
    idx++
  }
  let p = c >= Math.min(3, frase.length) ? c / frase.length + ev * 0.02 : 0
  if (rmax < Math.min(3, frase.length)) p = 0
  if (p > mejor.p) mejor = { p, off, c, r: rmax, salta, pares: pares.join(' ') }
}
console.log(`«${frase.join(' ')}» (${frase.length} palabras): mejor ${mejor.p.toFixed(3)} en ${mejor.off}${mejor.salta ? '' : ' leyendo la acotación'}, ${mejor.c} parecidas, racha ${mejor.r}: ${mejor.pares}`)
