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
  // -revisión del PR #126- ocho palabras más: el ancla se suelta solo si va más de 40 adelante.
  'después el miedo pide permiso para quedarse un rato largo entre las cosas de siempre',
  'si tú me vieras por dentro tú encuentras lo que busco',
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
// -revisión del PR #126- con soloParciales, desde esa frase no hay finales: el ancla queda más de 40
// adelante de lo confirmado, que es lo que suelta B.
function leerHastaLaAcotacion(c: Conduccion, soloParciales = Infinity): number {
  let t = 0
  const frases = ['la casa estaba quieta', 'cuando llegamos tarde', 'y nadie quiso abrir', 'la puerta del patio']
  for (const [i, f] of frases.entries()) {
    for (let k = 1; k < f.split(' ').length; k++) { t += 300; procesarParcial(c, f.split(' ').slice(0, k + 1).join(' '), t) }
    // Antes: t += 300; procesarFinal(c, f, t)
    if (i < soloParciales) { t += 300; procesarFinal(c, f, t) }
    for (let k = 0; k < 10; k++) { t += 50; c.motor.estadoEn(t) }
  }
  return t
}

describe('motor-parentesis B: el parcial que ningún final confirma no deja la ventana adelante', () => {
  test('un parcial calza en la repetición, más abajo; los finales que no calzan devuelven la ventana a lo confirmado y el final siguiente, detrás del parcial, calza', () => {
    const c = conduccion()
    // Antes: let t = leerHastaLaAcotacion(c) y lo confirmado era patio.
    let t = leerHastaLaAcotacion(c, 2)
    const tarde = indice(c, 'tarde')
    expect(c.motor.estadoEn(t).ultimoCalce).toBeGreaterThan(tarde)
    // Un parcial que se parece más a la repetición de la línea 6 que a la acotación -lo que el
    // reconocedor entendió mal, como «no lo encuentra» por «yo no encuentro» en la toma- la calza allá.
    const dicho = 'si tú me vieras por dentro tú encuentras'.split(' ')
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
    expect(c.motor.estadoEn(t).ultimoCalce).toBe(tarde)
    // Y sigue leyendo: el final, detrás del parcial, calza y el motor lo confirma.
    t += 1500
    const r = procesarFinal(c, 'el orden primero viene de la costumbre', t)
    expect(r).not.toBeNull()
    // Antes: hastaToken y ultimoCalce en costumbre. Desde tarde el motor avanza con el tope de renglón
    // de conduccion.ts; el seguidor sí queda en costumbre.
    expect(c.seguidor.posicionToken()).toBe(indice(c, 'costumbre'))
    expect(c.motor.estadoEn(t).ultimoCalce).toBeGreaterThan(tarde)
  })
})

describe('motor-parentesis A: la acotación leída se sigue como texto', () => {
  test('leer la acotación en voz alta y seguir deja al seguidor y al motor en el texto que sigue, no en la repetición', () => {
    const c = conduccion()
    let t = leerHastaLaAcotacion(c)
    let maximo = 0
    for (const f of ['si me vieras por dentro', 'sabrías lo que busco', 'el orden primero viene', 'de la costumbre']) {
      const palabras = f.split(' ')
      for (let k = 2; k <= palabras.length; k++) { t += 250; procesarParcial(c, palabras.slice(0, k).join(' '), t) }
      t += 300
      const r = procesarFinal(c, f, t)
      expect(r).not.toBeNull()
      for (let k = 0; k < 10; k++) { t += 50; maximo = Math.max(maximo, c.motor.estadoEn(t).ultimoCalce) }
    }
    const costumbre = indice(c, 'costumbre')
    expect(c.seguidor.posicionToken()).toBe(costumbre)
    expect(c.motor.estadoEn(t).ultimoCalce).toBe(costumbre)
    // El motor nunca tomó la repetición de la línea 6 por calce.
    expect(maximo).toBe(costumbre)
  })

  test('si la acotación no se lee, se salta como siempre', () => {
    const c = conduccion()
    let t = leerHastaLaAcotacion(c)
    t += 300
    expect(procesarFinal(c, 'el orden primero viene de la costumbre', t)).not.toBeNull()
    expect(c.seguidor.posicionToken()).toBe(indice(c, 'costumbre'))
  })
})
