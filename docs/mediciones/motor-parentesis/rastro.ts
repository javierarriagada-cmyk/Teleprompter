// EL RASTRO DE UNA DETENCIÓN, EVENTO POR EVENTO -motor-parentesis, 15-10-2026-. No cambia el motor.
//
// Repite los 'oyo' de un registro -el de docs/mediciones/toma-25-min/herramientas/transcribir.py, o
// cualquier .motor.txt- por conduccion.ts -procesarParcial y procesarFinal, los de la app- y, entre
// <desde> y <hasta> segundos, imprime CADA parcial y final con:
//   - el estado del motor ANTES -posición, ultimoCalce = max(ultimaConfirmada, anclaTentativa),
//     tUltimoCalce, ppm- y la ventana de conduccion.ts que sale de él -ref, ref-10, ref+40-;
//   - lo que el seguidor usó para buscar: pos, posTentativa, posPredicha y basePos. pos y posTentativa
//     no se leen del seguidor -son internas-: se siguen desde afuera con lo que devuelven avanzar,
//     avanzarTentativo e irAToken -que conduccion.ts llama al devolver-; posPredicha repite la
//     cuenta de calcularPosPredicha -seguidor.ts- con esos valores;
//   - el resultado: calce del seguidor, si cayó en la ventana, y dónde queda el motor.
// mano=<s>:<token> mueve el texto a mano en ese segundo, como Javier. sin-parentesis quita ( y ).
//
// Uso: npx vite-node docs/mediciones/motor-parentesis/rastro.ts -- <registro> <desde s> <hasta s>
//        [mano=345:291 ...] [sin-parentesis] [solo-finales]
import fs from 'fs'
import { leerCorpus } from '../../../src/lib/repetidor'
import { tokenizarGuion, crearSeguidor } from '../../../src/lib/seguidor'
import { crearMotorDeAvance } from '../../../src/lib/avance'
import { procesarFinal, procesarParcial } from '../../../src/lib/conduccion'
import { detectarIdioma } from '../../../src/lib/detectarIdioma'

const args = process.argv.slice(2).filter((a) => a !== '--')
const [ruta, desde, hasta] = args
const manos = args.filter((x) => x.startsWith('mano=')).map((x) => x.slice(5).split(':').map(Number)).map(([s, t]) => ({ ms: s * 1000, token: t }))
const soloFinales = args.includes('solo-finales')
const c = leerCorpus(fs.readFileSync(ruta, 'utf8'))
if (args.includes('sin-parentesis')) c.guion = c.guion.replace(/[()]/g, ' ')
const tokens = tokenizarGuion(c.guion)
const lm = new Map<string, number>(); const bm = new Map<number, number>()
tokens.forEach((t, i) => { lm.set(`${t.bloque}-${t.linea}`, i); bm.set(t.bloque, i) })
const lineas = [...lm.values()].sort((a, b) => a - b)
const motor = crearMotorDeAvance(undefined, lineas, [...bm.values()].sort((a, b) => a - b))
const real = crearSeguidor(tokens, { idioma: detectarIdioma(c.guion) ?? undefined })
// El seguidor, envuelto para seguir pos y posTentativa desde afuera.
let pos = 0, posT = 0
const seg = {
  ...real,
  avanzar: (f: string, t?: number, p?: number, u?: number) => { const r = real.avanzar(f, t, p, u); if (r.movio) { pos = r.hastaToken; posT = r.hastaToken } return r },
  avanzarTentativo: (f: string, t?: number, p?: number, u?: number) => { const r = real.avanzarTentativo(f, t, p, u); if (r.movio) posT = Math.max(posT, r.hastaToken); return r },
  irAToken: (k: number) => { real.irAToken(k); pos = k; posT = k }
}
const cond = { seguidor: seg as any, motor, tokens, limitesDeLinea: lineas }
const a = Number(desde) * 1000, b = Number(hasta) * 1000
const pal = (i: number) => (tokens[i] ? (tokens[i].esAcotacion ? `(${tokens[i].palabra})` : tokens[i].palabra) : '-')
for (const e of c.eventos) {
  if (e.tipo !== 'oyo') continue
  while (manos.length && manos[0].ms <= e.ms) { const m = manos.shift()!; seg.irAToken(m.token); motor.irAToken(m.token, m.ms) }
  const st = motor.estadoEn(e.ms)
  const posActual = Math.max(pos, posT)
  const posPredicha = st.tUltimoCalceMs > 0 && e.ms >= st.tUltimoCalceMs ? posActual + (st.ppmEstimadas / 60) * ((e.ms - st.tUltimoCalceMs) / 1000) : posActual
  const antes = { pos, posT }
  const res = e.final ? procesarFinal(cond, e.texto, e.ms) : procesarParcial(cond, e.texto, e.ms)
  if (e.ms < a || e.ms > b || (soloFinales && !e.final)) continue
  const ref = Math.max(st.ultimoCalce, Math.floor(st.posicion))
  const st2 = motor.estadoSinAvanzar ? null : null
  const desp = motor.estadoEn(e.ms)
  console.log(`${(e.ms / 1000).toFixed(2)} ${e.final ? 'FINAL  ' : 'parcial'} «${e.texto}»`)
  console.log(`   antes: motor pos ${st.posicion.toFixed(1)} ultimoCalce ${st.ultimoCalce} ppm ${st.ppmEstimadas.toFixed(0)} | ventana ${Math.max(0, ref - 10)}..${ref + 40} | seguidor pos ${antes.pos} posTentativa ${antes.posT} posPredicha ${posPredicha.toFixed(1)} basePos ${Math.round(posPredicha)}`)
  console.log(`   -> ${res ? `calce ${res.hastaToken} «${pal(res.hastaToken)}»` : 'nada'} | después: seguidor pos ${pos} posTentativa ${posT} | motor pos ${desp.posicion.toFixed(1)} ultimoCalce ${desp.ultimoCalce} freno ${desp.motivoFreno}`)
  void st2
}
