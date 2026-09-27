import { describe, test, expect } from 'vitest'
import { bloqueDeBienvenida } from '../App'

// EL GUION "HOLA" MUESTRA LO QUE EXPLICA -24-09-2026-: la negrita, los tres colores y el
// destacado caen sobre las mismas palabras que los nombran.
describe('Guion de bienvenida', () => {
  test('B1 Cada formato cae sobre la palabra que lo nombra, y estan los cinco.', () => {
    const b = bloqueDeBienvenida()
    const pintado = (b.tramos || []).map((t) => [b.texto.slice(t.desde, t.hasta), t.negrita ? 'negrita' : t.destacado ? 'destacado' : t.color])
    // Desde el 26-09-2026 el Hola lleva mas formatos -para la grabacion de prueba-: los cinco
    // que nombran su formato tienen que seguir estando, entre los demas.
    expect(pintado).toEqual(expect.arrayContaining([
      ['negrita', 'negrita'],
      ['ámbar', 'ambar'],
      ['celeste', 'celeste'],
      ['verde', 'salvia'],
      ['destacado amarillo', 'destacado']
    ]))
    expect(pintado.length).toBeGreaterThan(5)
  })

  test('B3 Los tramos van en orden y ninguno pisa al siguiente.', () => {
    const t = bloqueDeBienvenida().tramos || []
    for (let i = 1; i < t.length; i++) expect(t[i].desde).toBeGreaterThanOrEqual(t[i - 1].hasta)
  })

  test('B2 Empieza igual que siempre y termina invitando a escribir.', () => {
    const b = bloqueDeBienvenida()
    expect(b.texto.startsWith('Hola. Lee esto en voz alta')).toBe(true)
    expect(b.texto).toContain('Escríbenos a hola@sigoteleprompter.com')
  })
})
