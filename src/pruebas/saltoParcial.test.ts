import { describe, expect, test } from 'vitest'
import fs from 'fs'
import path from 'path'
import { leerCorpus } from '../lib/repetidor'
import { tokenizarGuion, crearSeguidor } from '../lib/seguidor'
import { crearMotorDeAvance } from '../lib/avance'
import { procesarFinal, procesarParcial, Conduccion } from '../lib/conduccion'

// La toma a5bc922c de Javier -24-09-2026, guion de bienvenida, 7 s-: lo que oyo
// el reconocedor, tal cual. A los 2,3 s oyo a medias "le estan volviendo" por
// "Lee esto en voz alta", y el seguidor salto a "Se esta moviendo", palabra 19,
// del segundo parrafo. Ver SALTO_PARCIAL_SIN_EXACTAS en seguidor.ts.
const TOMA = fs.readFileSync(path.join(__dirname, 'corpus', 'toma-a5bc922c-salto.motor.txt'), 'utf8')

function repetir(texto: string) {
  const corpus = leerCorpus(texto)
  const tokens = tokenizarGuion(corpus.guion)
  const lm = new Map<string, number>(), bm = new Map<number, number>()
  tokens.forEach((t, i) => { lm.set(`${t.bloque}-${t.linea}`, i); bm.set(t.bloque, i) })
  const limitesDeLinea = [...lm.values()].sort((a, b) => a - b)
  const motor = crearMotorDeAvance(undefined, limitesDeLinea, [...bm.values()].sort((a, b) => a - b))
  const cond: Conduccion = { seguidor: crearSeguidor(tokens), motor, tokens, limitesDeLinea }
  const calces: Array<{ frase: string; calce: number | null }> = []
  const posiciones: number[] = []
  const oyos = corpus.eventos.filter((e: any) => e.tipo === 'oyo') as any[]
  let k = 0
  const fin = oyos[oyos.length - 1].ms + 16
  for (let t = 0; t <= fin; t += 16) {
    while (k < oyos.length && oyos[k].ms <= t) {
      const r = oyos[k].final ? procesarFinal(cond, oyos[k].texto, t) : procesarParcial(cond, oyos[k].texto, t)
      calces.push({ frase: oyos[k].texto, calce: r ? r.hastaToken : null })
      k++
    }
    posiciones.push(motor.estadoEn(t).posicion)
  }
  return { calces, posiciones }
}

describe('Un parcial no hace saltar la pantalla lejos con palabras solo parecidas', () => {
  test('LA TOMA DEL SALTO: "le estan volviendo" no la lleva al segundo parrafo, y la pantalla sigue la voz', () => {
    const { calces, posiciones } = repetir(TOMA)
    const salto = calces.find((c) => c.frase === 'le están volviendo')!
    expect(salto.calce === null || salto.calce < 10).toBe(true)
    // En toda la toma se leyo hasta "con o sin", la palabra 8. La pantalla nunca
    // se va al segundo parrafo -empieza en la palabra 12-.
    expect(Math.max(...posiciones)).toBeLessThan(12)
    // Y si sigue la voz: al final esta en el primer parrafo, pasado "voz alta".
    expect(posiciones[posiciones.length - 1]).toBeGreaterThan(5)
  })
})
