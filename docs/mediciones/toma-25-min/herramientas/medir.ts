// MEDIR LA TOMA DE 25 MIN SIN TELÉFONO -motor-investigacion, 15-10-2026-. NO cambia el motor.
//
// Toma el registro que arma transcribir.py -lo que Vosk oyó del audio.flac, como lo entrega
// VoskNativoPlugin- y lo pasa por el motor de la app con repetirLectura -lib/repetidor.ts, el
// mismo camino que `npm run banco`: conduccion.ts, seguidor.ts, avance.ts-, con el reloj de los
// cuadros -comoElTelefono-.
//
// LA VARA: dónde iba de verdad la voz. Las palabras de los finales, con su tiempo -palabras.json-,
// se alinean contra los tokens del guion del seguidor -tokenizarGuion, los mismos índices que usa el
// motor- con alinear de src/pruebas/alinearToma.js, la de medir-toma.mjs y el banco, pero CONTANDO
// las acotaciones: Javier las lee, y la vara tiene que decir dónde iba aunque sea dentro de un
// paréntesis.
//
// LAS DETENCIONES: tramos de al menos MS_DETENIDO en que el último calce del motor no avanza
// mientras la voz avanza al menos TOKENS_DETENIDO tokens. Como Javier, si la detención dura
// MS_A_MANO se mueve el texto a mano a donde va la voz -un cuadro con la posición nueva: repetirLectura
// lo toma como arrastre, igual que en las tomas del banco- y se sigue. LOS ADELANTOS: tramos en que
// la posición del motor va más de TOKENS_ADELANTO delante de la voz.
//
// Uso: npx vite-node docs/mediciones/toma-25-min/herramientas/medir.ts -- <registro.motor.txt>
//        <palabras.json> [sin-parentesis] [salida.json]
//   sin-parentesis: el mismo guion con los paréntesis quitados -el texto de adentro queda normal-.
import fs from 'fs'
import { leerCorpus, repetirLectura } from '../../../../src/lib/repetidor'
import { tokenizarGuion } from '../../../../src/lib/seguidor'
import { alinear } from '../../../../src/pruebas/alinearToma.js'

const MS_DETENIDO = 8000
const TOKENS_DETENIDO = 12
const MS_A_MANO = Number((process.argv.find((a) => a.startsWith('a-mano=')) || 'a-mano=20').slice(7)) * 1000
const TOKENS_ADELANTO = 8
const VENTANA = 40 // conduccion.ts: posMax = ref + 40

const args = process.argv.slice(2).filter((a) => a !== '--')
const [rutaRegistro, rutaPalabras] = args
const sinParentesis = args.includes('sin-parentesis')
const rutaSalida = args.find((a) => a.endsWith('.json') && a !== rutaPalabras)
// a-mano=<s>: cuántos segundos espera la persona antes de mover el texto con el dedo -por omisión 20-.

const texto = fs.readFileSync(rutaRegistro, 'utf8')
const corpus = leerCorpus(texto)
if (sinParentesis) corpus.guion = corpus.guion.replace(/[()]/g, ' ')
const tokens = tokenizarGuion(corpus.guion)
const oyos = corpus.eventos.filter((e: any) => e.tipo === 'oyo') as Array<{ ms: number; texto: string; final: boolean }>
const finMs = Math.max(...corpus.eventos.map((e) => e.ms))

// La vara.
const palabras: Array<{ word: string; start: number; end: number }> = JSON.parse(fs.readFileSync(rutaPalabras, 'utf8'))
const oidas = palabras.map((p) => ({ w: p.word, ini: Math.round(p.start * 1000), fin: Math.round(p.end * 1000), llegada: 0 }))
const pares = alinear(oidas as any, tokens.map((t) => ({ w: t.palabra, acot: false })), null)
const dicho: Array<[number, number]> = []
// Sin cercanía al calce -la vara no puede depender del motor que mide-, el alineamiento a veces
// empareja una palabra repetida muy adelante: se descarta el par que salta más de SALTO_VARA tokens.
const SALTO_VARA = 50
for (const [io, it] of pares) {
  const ult = dicho.length ? dicho[dicho.length - 1][1] : 0
  if (it > ult && it - ult <= SALTO_VARA) dicho.push([oidas[io].ini, it])
}
const vozEn = (t: number) => { let v = 0; for (const [ms, tok] of dicho) { if (ms > t) break; v = tok } return v }
const oidoEntre = (a: number, b: number) => oyos.filter((o) => o.final && o.ms >= a && o.ms <= b + 3000).map((o) => o.texto).join(' / ')
const textoDe = (desde: number, hasta: number) => tokens.slice(Math.max(0, desde), Math.max(0, hasta) + 1).map((t) => (t.esAcotacion ? `(${t.palabra})` : t.palabra)).join(' ')
const acotEntre = (a: number, b: number) => { let n = 0; for (let i = Math.max(0, a); i <= b && i < tokens.length; i++) if (tokens[i].esAcotacion) n++; return n }

function registroCon(manos: Array<{ ms: number; token: number }>): string {
  // Los cuadros vuelven a armarse: pos = el token puesto a mano desde ese ms -0 antes del primero-.
  const lineas = texto.split('\n').filter((l) => !/\tcuadro\t/.test(l))
  const cab = lineas.filter((l) => !/^\d+\t/.test(l))
  const ev = lineas.filter((l) => /^\d+\t/.test(l))
  const cuadros: string[] = []
  let k = 0
  for (let t = 0; t <= finMs; t += 16) {
    while (k < manos.length && manos[k].ms <= t) k++
    const p = k > 0 ? manos[k - 1].token : 0
    cuadros.push(`${t}\tcuadro\tpos=${p.toFixed(2)} calce=${p}`)
  }
  const todos = [...ev, ...cuadros].sort((a, b) => Number(a.split('\t')[0]) - Number(b.split('\t')[0]))
  let g = cab.join('\n')
  if (sinParentesis) g = g.replace(/^# \|(.*)$/gm, (l) => l.replace(/[()]/g, ' '))
  return g + '\n' + todos.join('\n') + '\n'
}

type Detencion = { desdeMs: number; hastaMs: number; aMano: boolean; tokMotor: number; vozDesde: number; vozHasta: number; delante: number; fueraDeVentana: boolean; acotacionesDichas: number; frenos: string[] }
let manos: Array<{ ms: number; token: number }> = []
let serie: ReturnType<typeof repetirLectura>['serie'] = []
let detenciones: Detencion[] = []
for (let vuelta = 0; vuelta < 30; vuelta++) {
  const r = repetirLectura(leerCorpus(registroCon(manos)), { comoElTelefono: true })
  serie = r.serie
  // Buscar detenciones.
  detenciones = []
  let i0 = 0
  let nueva: { ms: number; token: number } | null = null
  // -lo que ve la persona es la POSICIÓN, no el calce: el motor sigue de largo entre calces-.
  for (let i = 1; i <= serie.length; i++) {
    const cambio = i === serie.length || serie[i].pos - serie[i0].pos >= 1 || serie[i].aMano
    if (!cambio) continue
    const a = serie[i0].ms, b = serie[i - 1].ms
    const v0 = vozEn(a), v1 = vozEn(b)
    if (b - a >= MS_DETENIDO && v1 - v0 >= TOKENS_DETENIDO) {
      const frenos = [...new Set(serie.slice(i0, i).map((s) => s.freno || '-'))]
      const tokMotor = Math.floor(serie[i0].pos)
      const aMano = i < serie.length && !!serie[i].aMano
      detenciones.push({ desdeMs: a, hastaMs: b, aMano, tokMotor, vozDesde: v0, vozHasta: v1, delante: v1 - tokMotor, fueraDeVentana: v1 - tokMotor > VENTANA, acotacionesDichas: acotEntre(v0, v1), frenos })
      if (!aMano && !nueva && b - a >= MS_A_MANO && !manos.some((m) => m.ms > a)) nueva = { ms: a + MS_A_MANO, token: vozEn(a + MS_A_MANO) }
    }
    i0 = i
  }
  if (!nueva) break
  manos = [...manos, nueva].sort((x, y) => x.ms - y.ms)
}

// Adelantos.
const adelantos: Array<{ desdeMs: number; hastaMs: number; max: number; tokMotor: number; voz: number }> = []
let enAd: { desdeMs: number; hastaMs: number; max: number; tokMotor: number; voz: number } | null = null
for (const s of serie) {
  if (s.ms % 100 > 16) continue
  const d = s.pos - vozEn(s.ms)
  if (d > TOKENS_ADELANTO) {
    if (!enAd) enAd = { desdeMs: s.ms, hastaMs: s.ms, max: d, tokMotor: Math.floor(s.pos), voz: vozEn(s.ms) }
    enAd.hastaMs = s.ms
    if (d > enAd.max) { enAd.max = d; enAd.tokMotor = Math.floor(s.pos); enAd.voz = vozEn(s.ms) }
  } else if (enAd) { adelantos.push(enAd); enAd = null }
}
if (enAd) adelantos.push(enAd)

const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`
const totalAcot = tokens.filter((t) => t.esAcotacion).length
console.log(`guion ${sinParentesis ? 'SIN paréntesis' : 'tal cual'}: ${tokens.length} tokens, ${totalAcot} en acotación; vara: ${pares.length} palabras alineadas de ${oidas.length}`)
console.log(`movidas a mano: ${manos.length} ${manos.map((m) => `${mmss(m.ms)}→${m.token}`).join(', ')}`)
console.log(`posición final del motor: ${serie[serie.length - 1].pos.toFixed(1)} de ${tokens.length}; voz al final: ${vozEn(finMs)}`)
console.log('voz por minuto: ' + Array.from({ length: Math.ceil(finMs / 60000) }, (_, m) => `${m}:${vozEn(m * 60000)}/${Math.floor(serie.find((x) => x.ms >= m * 60000)?.pos ?? 0)}`).join(' '))
const total = detenciones.reduce((x, d) => x + d.hastaMs - d.desdeMs, 0)
const conAcot = detenciones.filter((d) => d.acotacionesDichas > 0)
console.log(`RESUMEN: ${detenciones.length} detenciones, ${(total / 1000).toFixed(0)} s quieto; ${conAcot.length} con acotación dicha (${(conAcot.reduce((x, d) => x + d.hastaMs - d.desdeMs, 0) / 1000).toFixed(0)} s); fuera de ventana: ${detenciones.filter((d) => d.fueraDeVentana).length}; movidas a mano: ${manos.length}`)
console.log('\nDETENCIONES')
for (const d of detenciones) {
  console.log(`- ${mmss(d.desdeMs)}–${mmss(d.hastaMs)} (${((d.hastaMs - d.desdeMs) / 1000).toFixed(0)} s)${d.aMano ? ' hasta moverlo a mano' : ''}: motor en ${d.tokMotor} «${textoDe(d.tokMotor - 4, d.tokMotor)}»; voz ${d.vozDesde}→${d.vozHasta}, ${d.delante} tokens delante -${d.fueraDeVentana ? 'FUERA' : 'dentro'} de la ventana de ${VENTANA}-; acotación dicha: ${d.acotacionesDichas} tokens; freno ${d.frenos.join(',')}`)
  console.log(`    texto del guion entre motor y voz: «${textoDe(d.tokMotor + 1, Math.min(d.vozHasta, d.tokMotor + 60))}»`)
  console.log(`    Vosk oyó: «${oidoEntre(d.desdeMs, d.hastaMs).slice(0, 400)}»`)
}
console.log('\nADELANTOS (> ' + TOKENS_ADELANTO + ' tokens delante de la voz)')
for (const a of adelantos) console.log(`- ${mmss(a.desdeMs)}–${mmss(a.hastaMs)}: hasta ${a.max.toFixed(1)} tokens; motor ${a.tokMotor} «${textoDe(a.tokMotor - 3, a.tokMotor)}», voz ${a.voz} «${textoDe(a.voz - 3, a.voz)}»; acotación entre medio: ${acotEntre(a.voz, a.tokMotor)}`)
if (rutaSalida) fs.writeFileSync(rutaSalida, JSON.stringify({ sinParentesis, tokens: tokens.length, acotacion: totalAcot, manos, detenciones, adelantos }, null, 1) + '\n')
