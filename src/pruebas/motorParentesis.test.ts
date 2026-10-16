import { describe, expect, test } from 'vitest'
import { tokenizarGuion, crearSeguidor } from '../lib/seguidor'
import { crearMotorDeAvance } from '../lib/avance'
import { procesarFinal, procesarParcial, Conduccion } from '../lib/conduccion'

// -motor-parentesis, 15-10-2026-: la toma de 25 min de Javier en chico. Una acotación entre
// paréntesis cuyas palabras se repiten más abajo, fuera de ella -como la (1.) y "si tú me vieras por
// dentro"-. Ver docs/mediciones/motor-parentesis/EXPLICACION.txt.
const GUION = [
  'la casa estaba quieta cuando llegamos tarde',
  'y nadie quiso abrir la puerta del patio',
  '(si me vieras por dentro sabrías lo que busco)',
  'el orden primero viene de la costumbre',
  'después el miedo pide permiso para quedarse',
  'si me vieras por dentro sabrías lo que busco',
  'y la tarde se cerró sobre nosotros'
].join('\n')

function conduccion(): Conduccion {
  const tokens = tokenizarGuion(GUION)
  const lm = new Map<string, number>(), bm = new Map<number, number>()
  tokens.forEach((t, i) => { lm.set(`${t.bloque}-${t.linea}`, i); bm.set(t.bloque, i) })
  const limitesDeLinea = [...lm.values()].sort((a, b) => a - b)
  const motor = crearMotorDeAvance(undefined, limitesDeLinea, [...bm.values()].sort((a, b) => a - b))
  return { seguidor: crearSeguidor(tokens), motor, tokens, limitesDeLinea }
}
const indice = (c: Conduccion, palabra: string, desde = 0) => c.tokens.findIndex((t, i) => i >= desde && t.palabra === palabra)

// Las dos primeras líneas, frase por frase, como finales; el motor corre entre una y otra.
function leerHastaLaAcotacion(c: Conduccion): number {
  let t = 0
  for (const f of ['la casa estaba quieta', 'cuando llegamos tarde', 'y nadie quiso abrir', 'la puerta del patio']) {
    for (let k = 1; k < f.split(' ').length; k++) { t += 300; procesarParcial(c, f.split(' ').slice(0, k + 1).join(' '), t) }
    t += 300; procesarFinal(c, f, t)
    for (let k = 0; k < 10; k++) { t += 50; c.motor.estadoEn(t) }
  }
  return t
}

describe('motor-parentesis B: el parcial que ningún final confirma no deja la ventana adelante', () => {
  test('la acotación leída calza en su repetición como parcial; los finales que no calzan devuelven la ventana a lo confirmado y el final siguiente, detrás del parcial, calza', () => {
    const c = conduccion()
    let t = leerHastaLaAcotacion(c)
    const patio = indice(c, 'patio')
    expect(c.motor.estadoEn(t).ultimoCalce).toBe(patio)
    // Lee la acotación en voz alta: el seguidor no mira sus tokens y la calza en la línea 6.
    const dicho = 'si me vieras por dentro sabrías lo que busco'.split(' ')
    let adelante = 0
    for (let k = 2; k <= dicho.length; k++) {
      t += 250
      const r = procesarParcial(c, dicho.slice(0, k).join(' '), t)
      if (r) adelante = Math.max(adelante, r.hastaToken)
    }
    expect(adelante).toBeGreaterThan(indice(c, 'orden'))
    expect(c.motor.estadoEn(t).ultimoCalce).toBe(adelante)
    // Dos finales que no calzan en ningún lado: el ancla del parcial no se confirmó.
    t += 300; procesarFinal(c, 'y si yo hablara con vos de lo que nunca dije', t)
    t += 1500; procesarFinal(c, 'ruido sin nada que ver con nada', t)
    expect(c.motor.estadoEn(t).ultimoCalce).toBe(patio)
    // Y sigue leyendo: el final, detrás del parcial, calza y el motor lo confirma.
    t += 1500
    const r = procesarFinal(c, 'el orden primero viene de la costumbre', t)
    expect(r).not.toBeNull()
    expect(r!.hastaToken).toBe(indice(c, 'costumbre'))
    expect(c.motor.estadoEn(t).ultimoCalce).toBe(indice(c, 'costumbre'))
  })
})
