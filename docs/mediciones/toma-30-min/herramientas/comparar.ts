// ¿SE PUEDE CONFIAR EN LA REPETICIÓN? -toma de 30 min, 16-10-2026-. No cambia el motor.
//
// Compara, en los primeros <hasta> s de la bitácora, lo que pasó en el teléfono con lo que da repetir
// en el PC con el motor de este árbol -conduccion.ts, seguidor.ts, avance.ts-:
//   1. FINALES: los de la bitácora -'oyo FINAL:' y su 'calce token N' o 'NO CALZO'- contra los del
//      registro de transcribir.py, emparejados en orden por texto -LCS de las frases normalizadas-:
//      % con el mismo texto, desfase de tiempo -mediana, p90- y el desfase de reloj audio-bitácora.
//   2. CALCES Y MOTOR: los dos registros se repiten por la misma conducción con cuadros cada 16 ms
//      -como saltoParcial.test.ts-; en cada final emparejado: % con el mismo token de calce que el
//      teléfono, y la diferencia de posición del motor contra el 'cuadro' del teléfono de ese momento.
//   La bitácora repetida sola -sus propios 'oyo'- dice cuánto se aparta el motor del PC del teléfono
//   con la MISMA entrada; el registro de transcribir.py, cuánto se suma por la transcripción.
//
// Uso: npx vite-node docs/mediciones/toma-30-min/herramientas/comparar.ts -- <bitacora.motor.txt>
//        <registro-transcribir.motor.txt> [hasta=686.5] [desfase=<ms audio - bitácora, o 'auto'>]
import fs from 'fs'
import { leerCorpus } from '../../../../src/lib/repetidor'
import { tokenizarGuion, crearSeguidor, normalizar } from '../../../../src/lib/seguidor'
import { crearMotorDeAvance } from '../../../../src/lib/avance'
import { procesarFinal, procesarParcial } from '../../../../src/lib/conduccion'
import { detectarIdioma } from '../../../../src/lib/detectarIdioma'

const args = process.argv.slice(2).filter((a) => a !== '--')
const [rutaBit, rutaReg] = args
const opt = (k: string) => args.find((a) => a.startsWith(k + '='))?.slice(k.length + 1)
const hastaMs = Number(opt('hasta') ?? 686.5) * 1000
const textoBit = fs.readFileSync(rutaBit, 'utf8')

// Lo del teléfono: finales con su calce, y la posición de cada cuadro.
type FinalTel = { ms: number; texto: string; calce: number | null }
const finalesTel: FinalTel[] = []
const cuadros: Array<{ ms: number; pos: number }> = []
for (const l of textoBit.split('\n')) {
  const p = l.split('\t'); if (p.length < 3 || l.startsWith('#')) continue
  const ms = Number(p[0])
  if (p[1] === 'oyo' && p[2].startsWith('FINAL:')) finalesTel.push({ ms, texto: normalizar(p[2].slice(6)), calce: null })
  else if (p[1] === 'calce' && finalesTel.length && finalesTel[finalesTel.length - 1].calce === null && finalesTel[finalesTel.length - 1].ms >= ms - 50) {
    const m = /^token (\d+): (.*)$/.exec(p[2])
    if (m && normalizar(m[2]) === finalesTel[finalesTel.length - 1].texto) finalesTel[finalesTel.length - 1].calce = Number(m[1])
  } else if (p[1] === 'cuadro') { const m = /pos=([\d.]+)/.exec(p[2]); if (m) cuadros.push({ ms, pos: Number(m[1]) }) }
}
const posTel = (ms: number) => { let lo = 0, hi = cuadros.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (cuadros[mid].ms <= ms) lo = mid; else hi = mid - 1 } return cuadros[lo].pos }

// Repetir un registro por la conducción, con cuadros cada 16 ms. Devuelve cada final con su calce y
// la posición del motor en el primer cuadro después de él.
function repetir(texto: string, desfase: number, guion: string) {
  const c = leerCorpus(texto)
  const tokens = tokenizarGuion(guion)
  const lm = new Map<string, number>(), bm = new Map<number, number>()
  tokens.forEach((t, i) => { lm.set(`${t.bloque}-${t.linea}`, i); bm.set(t.bloque, i) })
  const L = [...lm.values()].sort((a, b) => a - b)
  const motor = crearMotorDeAvance(undefined, L, [...bm.values()].sort((a, b) => a - b))
  const cond = { seguidor: crearSeguidor(tokens, { idioma: detectarIdioma(guion) ?? undefined }), motor, tokens, limitesDeLinea: L }
  const oy = (c.eventos as any[]).filter((e) => e.tipo === 'oyo').map((e) => ({ ...e, ms: e.ms - desfase })).filter((e) => e.ms <= hastaMs)
  const finales: Array<{ ms: number; texto: string; calce: number | null; pos: number }> = []
  let k = 0, pend: number[] = []
  for (let t = 0; t <= hastaMs; t += 16) {
    while (k < oy.length && oy[k].ms <= t) {
      const o = oy[k]
      const r = o.final ? procesarFinal(cond, o.texto, t) : procesarParcial(cond, o.texto, t)
      if (o.final) { finales.push({ ms: o.ms, texto: normalizar(o.texto), calce: r ? r.hastaToken : null, pos: NaN }); pend.push(finales.length - 1) }
      k++
    }
    const pos = motor.estadoEn(t).posicion
    for (const i of pend) finales[i].pos = pos
    pend = []
  }
  return finales
}

function emparejar(a: { texto: string; ms: number }[], b: { texto: string; ms: number }[], tolMs: number) {
  // LCS por texto igual, con el tiempo a menos de tolMs.
  const n = a.length, m = b.length
  const d = Array.from({ length: n + 1 }, () => new Int32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    d[i][j] = a[i].texto === b[j].texto && Math.abs(a[i].ms - b[j].ms) <= tolMs ? d[i + 1][j + 1] + 1 : Math.max(d[i + 1][j], d[i][j + 1])
  const pares: Array<[number, number]> = []
  let i = 0, j = 0
  while (i < n && j < m) {
    if (a[i].texto === b[j].texto && Math.abs(a[i].ms - b[j].ms) <= tolMs && d[i][j] === d[i + 1][j + 1] + 1) { pares.push([i, j]); i++; j++ }
    else if (d[i + 1][j] >= d[i][j + 1]) i++
    else j++
  }
  return pares
}
const pct = (x: number, n: number) => `${x}/${n} (${n ? ((100 * x) / n).toFixed(1) : '-'}%)`
const cuantil = (xs: number[], q: number) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : NaN }
const f = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '-')

const guion = leerCorpus(textoBit).guion
const tel = finalesTel.filter((x) => x.ms <= hastaMs)
console.log(`teléfono: ${tel.length} finales hasta ${hastaMs / 1000} s; ${tel.filter((x) => x.calce !== null).length} con calce`)

function informar(nombre: string, finales: ReturnType<typeof repetir>) {
  const pares = emparejar(tel, finales, 5000)
  const dt = pares.map(([i, j]) => finales[j].ms - tel[i].ms)
  const conCalceTel = pares.filter(([i]) => tel[i].calce !== null)
  const mismoCalce = pares.filter(([i, j]) => tel[i].calce === finales[j].calce).length
  const mismoCalceSiTel = conCalceTel.filter(([i, j]) => tel[i].calce === finales[j].calce).length
  const difPos = pares.map(([i, j]) => Math.abs(finales[j].pos - posTel(tel[i].ms)))
  console.log(`\n== ${nombre}: ${finales.length} finales`)
  console.log(`  mismo texto: ${pct(pares.length, tel.length)} de los del teléfono; ${pct(pares.length, finales.length)} de los repetidos`)
  console.log(`  tiempo, repetido - teléfono: mediana ${f(cuantil(dt, 0.5))} ms, p10 ${f(cuantil(dt, 0.1))}, p90 ${f(cuantil(dt, 0.9))}`)
  console.log(`  mismo calce -o los dos sin calce-: ${pct(mismoCalce, pares.length)}; de los que calzaron en el teléfono: ${pct(mismoCalceSiTel, conCalceTel.length)}`)
  console.log(`  |posición del motor - teléfono| en esos finales: mediana ${f(cuantil(difPos, 0.5))}, p90 ${f(cuantil(difPos, 0.9))}, máx ${f(Math.max(...difPos))} tokens`)
  const malos = pares.filter(([i, j]) => tel[i].calce !== finales[j].calce || Math.abs(finales[j].pos - posTel(tel[i].ms)) > 5)
  for (const [i, j] of malos.slice(0, 25)) console.log(`    ${(tel[i].ms / 1000).toFixed(1)} s «${tel[i].texto.slice(0, 50)}» calce tel ${tel[i].calce} / pc ${finales[j].calce}; pos tel ${posTel(tel[i].ms).toFixed(1)} / pc ${finales[j].pos.toFixed(1)}`)
}

informar('la bitácora repetida -misma entrada que el teléfono-', repetir(textoBit, 0, guion))
if (rutaReg) {
  const textoReg = fs.readFileSync(rutaReg, 'utf8')
  let desfase = Number(opt('desfase'))
  if (!Number.isFinite(desfase)) {
    // auto: la mediana de las diferencias entre finales de texto idéntico, en ±10 s.
    const reg = (leerCorpus(textoReg).eventos as any[]).filter((e) => e.tipo === 'oyo' && e.final).map((e) => ({ ms: e.ms, texto: normalizar(e.texto) }))
    const p = emparejar(tel, reg.map((r) => ({ ...r, ms: r.ms - 2746 })), 10000)
    desfase = cuantil(p.map(([i, j]) => reg[j].ms - tel[i].ms), 0.5)
    console.log(`\ndesfase audio - bitácora, auto: ${desfase} ms con ${p.length} finales idénticos -el LEEME supone 2746-`)
  }
  informar(`la transcripción del PC -desfase ${desfase} ms-`, repetir(textoReg, desfase, guion))
}
