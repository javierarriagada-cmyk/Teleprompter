// EL DETALLE DE UNA DETENCIÓN -motor-investigacion, 15-10-2026-. NO cambia el motor.
//
// Repite los 'oyo' del registro de transcribir.py por conduccion.ts -procesarParcial y procesarFinal,
// los de la app- y, para cada FINAL entre <desde> y <hasta> segundos, imprime qué calce dio, dónde
// queda el SEGUIDOR -posicionToken- y dónde el MOTOR -posición, último calce, freno-. Así se ve si
// la detención es del seguidor -no encuentra- o de la ventana del motor -encuentra y se rechaza-.
// mano=<s>:<token> mueve el texto a mano en ese segundo, como Javier -se pueden poner varios-.
//
// Uso: npx vite-node docs/mediciones/toma-25-min/herramientas/detalle.ts -- <registro.motor.txt>
//        <desde s> <hasta s> [mano=345:291 ...] [sin-parentesis]
import fs from 'fs'
import { leerCorpus } from '../../../../src/lib/repetidor'
import { tokenizarGuion, crearSeguidor } from '../../../../src/lib/seguidor'
import { crearMotorDeAvance } from '../../../../src/lib/avance'
import { procesarFinal, procesarParcial } from '../../../../src/lib/conduccion'
import { detectarIdioma } from '../../../../src/lib/detectarIdioma'
const args = process.argv.slice(2).filter((a) => a !== '--')
const [ruta, desde, hasta] = args
const manos = args.filter((x) => x.startsWith('mano=')).map((x) => x.slice(5).split(':').map(Number)).map(([s, t]) => ({ ms: s * 1000, token: t }))
const c = leerCorpus(fs.readFileSync(ruta, 'utf8'))
if (args.includes('sin-parentesis')) c.guion = c.guion.replace(/[()]/g, ' ')
const tokens = tokenizarGuion(c.guion)
const lm = new Map<string, number>(); const bm = new Map<number, number>()
tokens.forEach((t, i) => { lm.set(`${t.bloque}-${t.linea}`, i); bm.set(t.bloque, i) })
const motor = crearMotorDeAvance(undefined, [...lm.values()].sort((a, b) => a - b), [...bm.values()].sort((a, b) => a - b))
const seg = crearSeguidor(tokens, { idioma: detectarIdioma(c.guion) ?? undefined })
const cond = { seguidor: seg, motor, tokens, limitesDeLinea: [...lm.values()].sort((a, b) => a - b) }
const a = Number(desde) * 1000, b = Number(hasta) * 1000
for (const e of c.eventos) {
  if (e.tipo !== 'oyo') continue
  while (manos.length && manos[0].ms <= e.ms) { const m = manos.shift()!; seg.irAToken(m.token); motor.irAToken(m.token, m.ms) }
  const st0 = motor.estadoEn(e.ms)
  const res = e.final ? procesarFinal(cond as any, e.texto, e.ms) : procesarParcial(cond as any, e.texto, e.ms)
  if (e.ms >= a && e.ms <= b && e.final) {
    const st = motor.estadoEn(e.ms)
    console.log(`${(e.ms / 1000).toFixed(1)} FINAL «${e.texto}» -> ${res ? 'calce ' + res.hastaToken : 'nada'} | seguidor ${seg.posicionToken()} | motor pos ${st0.posicion.toFixed(1)}→${st.posicion.toFixed(1)} calce ${st.ultimoCalce} freno ${st.motivoFreno}`)
  }
}
